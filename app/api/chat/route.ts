import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { Pool } from 'pg';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const maxDuration = 30;

// Internal app tables the AI is ALLOWED to access
const INTERNAL_ALLOWED_TABLES = new Set(["InventoryItem", "SchemaField"]);

// Blocked tables from AI access
const BLOCKED_TABLES = new Set([
    "User",
    "Session",
    "AuditLog",
    "AIProviderConfig",
    "ChatSession",
    "ChatMessage",
    "TokenUsage",
    "ExternalDBConnection",
    "_prisma_migrations",
]);

function isValidTableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

// Schema cache
const schemaCaches = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getInternalSchema(userId: string) {
    const cacheKey = `internal_${userId}`;
    const cached = schemaCaches.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return cached.data;
    }

    try {
        // Get user's schema fields from database
        const schemaFields = await prisma.schemaField.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });

        const result = {
            tables: [
                {
                    name: "InventoryItem",
                    columns: schemaFields.map(f => ({
                        column_name: f.name,
                        data_type: f.type,
                        is_nullable: f.isRequired ? 'NO' : 'YES',
                        badges: f.badges,
                    })),
                }
            ]
        };

        schemaCaches.set(cacheKey, { data: result, time: Date.now() });
        return result;
    } catch (error) {
        return { error: 'Failed to fetch schema', tables: [] };
    }
}

async function getExternalSchema(customDbUrl: string) {
    const cacheKey = `ext_${customDbUrl.slice(-20)}`;
    const cached = schemaCaches.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return cached.data;
    }

    let pool = null;
    try {
        pool = new Pool({
            connectionString: customDbUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });

        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        const tables = [];
        for (const row of tablesResult.rows) {
            const tableName = row.table_name;

            const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

            tables.push({
                name: tableName,
                columns: columnsResult.rows
            });
        }

        const result = { tables, isExternal: true };
        schemaCaches.set(cacheKey, { data: result, time: Date.now() });
        return result;
    } catch (error: any) {
        return { error: `Failed to connect to external DB: ${error.message}`, tables: [] };
    } finally {
        if (pool) await pool.end();
    }
}

type QuerySource = 'internal' | 'external';

async function queryDatabase(
    action: string,
    table: string,
    source: QuerySource,
    connectionUrl: string,
    userId: string,
    data?: any,
    id?: string
) {
    if (!isValidTableName(table)) {
        return { error: `Invalid table name: "${table}"` };
    }

    // Security: Enforce access control
    if (source === 'internal') {
        if (!INTERNAL_ALLOWED_TABLES.has(table)) {
            return { error: `Access denied: table "${table}" is restricted.` };
        }
    }

    if (source === 'external' && action !== 'select') {
        return { error: `External databases are read-only.` };
    }

    let pool = null;
    try {
        pool = new Pool({
            connectionString: connectionUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });

        let result;

        switch (action) {
            case 'select':
                if (source === 'internal') {
                    // Filter by userId for internal queries
                    if (id) {
                        result = await pool.query(
                            `SELECT * FROM "${table}" WHERE "userId" = $1 AND id = $2`,
                            [userId, id]
                        );
                    } else {
                        result = await pool.query(
                            `SELECT * FROM "${table}" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
                            [userId]
                        );
                    }
                } else {
                    // External DB - no user filter
                    if (id) {
                        result = await pool.query(`SELECT * FROM "${table}" WHERE id = $1`, [id]);
                    } else {
                        result = await pool.query(`SELECT * FROM "${table}" ORDER BY "createdAt" DESC`);
                    }
                }
                return { data: result.rows };

            case 'insert':
                if (source === 'internal') {
                    const columns = Object.keys(data);
                    const values = Object.values(data);
                    const placeholders = values.map((_, i) => `$${i + 2}`).join(', ');

                    result = await pool.query(
                        `INSERT INTO "${table}" ("userId", ${columns.map(c => `"${c}"`).join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`,
                        [userId, ...values]
                    );
                    return { data: result.rows[0] };
                }
                return { error: 'Cannot insert into external DB' };

            case 'update':
                if (!id) return { error: 'ID required for update' };
                if (source === 'internal') {
                    const updateColumns = Object.keys(data);
                    const updateValues = Object.values(data);
                    const updateSet = updateColumns.map((col, i) => `"${col}" = $${i + 2}`).join(', ');

                    result = await pool.query(
                        `UPDATE "${table}" SET ${updateSet} WHERE "userId" = $1 AND id = $${updateValues.length + 2} RETURNING *`,
                        [userId, ...updateValues, id]
                    );
                    return { data: result.rows[0] };
                }
                return { error: 'Cannot update external DB' };

            case 'delete':
                if (!id) return { error: 'ID required for delete' };
                if (source === 'internal') {
                    result = await pool.query(
                        `DELETE FROM "${table}" WHERE "userId" = $1 AND id = $2 RETURNING *`,
                        [userId, id]
                    );
                    return { data: result.rows[0] };
                }
                return { error: 'Cannot delete from external DB' };

            default:
                return { error: 'Unknown action' };
        }
    } catch (error: any) {
        return { error: error.message };
    } finally {
        if (pool) await pool.end();
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { messages, apiKey, pendingAction, customDbUrl, sessionId } = await req.json();

        const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
        const lowerMessage = lastUserMessage.toLowerCase();

        // Check for API key
        const googleApiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!googleApiKey) {
            return new Response(
                JSON.stringify({ error: 'Google API key missing. Configure in Settings.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Determine DB source
        const isExternal = !!customDbUrl;
        const source: QuerySource = isExternal ? 'external' : 'internal';
        const connectionUrl = isExternal ? customDbUrl : process.env.DATABASE_URL!;

        // Get schema
        const schema = isExternal
            ? await getExternalSchema(customDbUrl)
            : await getInternalSchema(auth.id);

        // Handle pending confirmation
        if (pendingAction && !isExternal) {
            if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage.includes('delete')) {
                if (!INTERNAL_ALLOWED_TABLES.has(pendingAction.table)) {
                    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
                    const result = streamText({
                        model: google('gemini-2.5-flash'),
                        system: 'The deletion was blocked because the table is restricted. Inform the user.',
                        messages: [{ role: 'user', content: 'Confirm the deletion status' }],
                    });
                    return result.toTextStreamResponse();
                }

                const result = await queryDatabase('delete', pendingAction.table, 'internal', connectionUrl, auth.id, null, pendingAction.id);

                const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
                const result2 = streamText({
                    model: google('gemini-2.5-flash'),
                    system: `The deletion was ${result.error ? 'failed' : 'successful'}.` +
                        (result.error ? ` Error: ${result.error}` : ` Deleted: ${JSON.stringify(result.data)}`),
                    messages: [{ role: 'user', content: 'Confirm the deletion status' }],
                });
                return result2.toTextStreamResponse();
            } else if (lowerMessage.includes('no') || lowerMessage.includes('cancel')) {
                const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
                const result = streamText({
                    model: google('gemini-2.5-flash'),
                    system: 'The user cancelled the deletion. Acknowledge this.',
                    messages: [{ role: 'user', content: 'Cancelled' }],
                });
                return result.toTextStreamResponse();
            }
        }

        // Detect intent
        const isAdd = /\b(add|create|insert|new)\b/i.test(lastUserMessage);
        const isUpdate = /\b(update|modify|change|edit)\b/i.test(lastUserMessage);
        const isDelete = /\b(delete|remove|destroy)\b/i.test(lastUserMessage);
        const isQuery = /\b(how many|what|show|list|get|find|check|count|total|do i have|search|is there|are there|any|which|expired|expiring|low stock|out of stock|available|status|tell me|give me)\b/i.test(lastUserMessage);

        // Pre-fetch inventory data
        let queryResult = null;
        const isMutationOnly = (isAdd || isUpdate || isDelete) && !isQuery;

        if (!isMutationOnly) {
            const searchMatch = lastUserMessage.match(/(?:find|search for|look for)\s+(.+)/i);
            const searchTerm = searchMatch ? searchMatch[1] : null;

            if (isExternal) {
                const tableNames = schema.tables?.map((t: any) => t.name) || [];
                const matchedTable = tableNames.find((name: string) =>
                    lowerMessage.includes(name.toLowerCase())
                );

                if (matchedTable) {
                    queryResult = await queryDatabase('select', matchedTable, 'external', connectionUrl, auth.id);
                }
            } else {
                queryResult = await queryDatabase('select', 'InventoryItem', 'internal', connectionUrl, auth.id);

                if (searchTerm && queryResult.data) {
                    queryResult.data = queryResult.data.filter((item: any) =>
                        item.data?.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
            }
        }

        // Build system prompt
        const allowedTableNames = schema.tables?.map((t: any) => t.name) || [];

        let systemPrompt: string;

        if (isExternal) {
            systemPrompt = `You are ASD PHARR, a pharmaceutical inventory AI assistant.
The current date/time is: ${new Date().toISOString()}

You are connected to the user's EXTERNAL database (read-only access).

ABSOLUTE RULES:
1. NEVER output raw SQL queries or code blocks with SQL.
2. ALWAYS analyze the CURRENT QUERY DATA below to answer questions directly.
3. Format answers as clear text with bullet points, tables, or numbered lists.

DATABASE SCHEMA (External):
${JSON.stringify(schema.tables, null, 2)}

CURRENT QUERY DATA:
${queryResult?.data ? JSON.stringify(queryResult.data, null, 2) : 'Not queried yet'}`;
        } else {
            systemPrompt = `You are ASD PHARR, a pharmaceutical inventory AI assistant.

You are connected to the internal inventory database with RESTRICTED access.
The current date/time is: ${new Date().toISOString()}

DATABASE SCHEMA:
${JSON.stringify(schema.tables, null, 2)}

AUTHORIZED TABLES: ${Array.from(INTERNAL_ALLOWED_TABLES).join(', ')}

ABSOLUTE RULES:
1. NEVER output raw SQL queries or code blocks with SQL.
2. ALWAYS analyze the CURRENT INVENTORY DATA below to answer questions directly.
3. If asked about expired items, compare "expiry_date" against today's date.
4. Format answers as clear text with bullet points, tables, or numbered lists.

SECURITY RESTRICTIONS:
- You can ONLY access these tables: ${Array.from(INTERNAL_ALLOWED_TABLES).join(', ')}
- You do NOT have access to: user accounts, sessions, audit logs, API configurations, chat data

CURRENT INVENTORY DATA:
${queryResult?.data ? JSON.stringify(queryResult.data, null, 2) : 'No inventory data found.'}

RESPONSE INSTRUCTIONS:
- For QUERY operations: Analyze the data above and answer in plain language.
- For ADD operations: Include JSON payload \`\`\`json {"action": "insert", "table": "InventoryItem", "data": {...}}\`\`\`
- For UPDATE operations: Include JSON payload: \`\`\`json {"action": "update", "table": "InventoryItem", "id": "...", "data": {...}}\`\`\`
- For DELETE operations: Ask for confirmation first.

COMPLIANCE FIELDS (Required for medical items):
- batch_number (DSCSA)
- expiry_date
- ndc_code`;
        }

        if (queryResult?.error) {
            systemPrompt += `\n\nDATABASE ERROR: ${queryResult.error}`;
        }

        // Record token usage after streaming completes
        const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
        const result = streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages,
            onFinish: async (completion) => {
                // Record token usage asynchronously
                try {
                    await prisma.tokenUsage.create({
                        data: {
                            userId: auth.id,
                            amount: completion.usage?.totalTokens || 0,
                            model: 'gemini-2.5-flash',
                            action: 'chat',
                            sessionId: sessionId || null,
                        },
                    });
                } catch (e) {
                    console.error('Failed to record token usage:', e);
                }
            },
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
