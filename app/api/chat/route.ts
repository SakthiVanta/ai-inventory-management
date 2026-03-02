import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { Pool } from 'pg';

export const maxDuration = 30;

// Dynamic schema cache
let schemaCache: any = null;
let schemaCacheTime = 0;

async function getDatabaseSchema() {
    // Cache schema for 5 minutes
    if (schemaCache && Date.now() - schemaCacheTime < 5 * 60 * 1000) {
        return schemaCache;
    }

    let pool = null;
    try {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            return { error: 'No database connection', tables: [] };
        }

        pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });

        // Get all tables
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

            // Get columns
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

        schemaCache = { tables };
        schemaCacheTime = Date.now();
        return schemaCache;
    } catch (error) {
        return { error: 'Failed to fetch schema', tables: [] };
    } finally {
        if (pool) await pool.end();
    }
}

async function queryDatabase(action: string, table: string, data?: any, id?: string) {
    let pool = null;
    try {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            return { error: 'Database not connected' };
        }

        pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });

        let result;

        switch (action) {
            case 'select':
                if (id) {
                    result = await pool.query(`SELECT * FROM "${table}" WHERE id = $1`, [id]);
                } else {
                    result = await pool.query(`SELECT * FROM "${table}" ORDER BY "createdAt" DESC`);
                }
                return { data: result.rows };

            case 'insert':
                const columns = Object.keys(data);
                const values = Object.values(data);
                const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

                result = await pool.query(
                    `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`,
                    values
                );
                return { data: result.rows[0] };

            case 'update':
                if (!id) return { error: 'ID required for update' };
                const updateColumns = Object.keys(data);
                const updateValues = Object.values(data);
                const updateSet = updateColumns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');

                result = await pool.query(
                    `UPDATE "${table}" SET ${updateSet} WHERE id = $${updateValues.length + 1} RETURNING *`,
                    [...updateValues, id]
                );
                return { data: result.rows[0] };

            case 'delete':
                if (!id) return { error: 'ID required for delete' };
                result = await pool.query(`DELETE FROM "${table}" WHERE id = $1 RETURNING *`, [id]);
                return { data: result.rows[0] };

            default:
                return { error: 'Unknown action' };
        }
    } catch (error: any) {
        return { error: error.message };
    } finally {
        if (pool) await pool.end();
    }
}

export async function POST(req: Request) {
    try {
        const { messages, apiKey, pendingAction } = await req.json();

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

        // Get dynamic schema
        const schema = await getDatabaseSchema();

        // Handle pending confirmation
        if (pendingAction) {
            if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage.includes('delete')) {
                const result = await queryDatabase('delete', pendingAction.table, null, pendingAction.id);

                const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
                const result2 = streamText({
                    model: google('gemini-2.5-flash'),
                    system: `The deletion was ${result.error ? 'failed' : 'successful'}. Inform the user.` +
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
        const isQuery = /\b(how many|what|show|list|get|find|check|count|total|do i have|search)\b/i.test(lastUserMessage);

        // Execute queries immediately
        let queryResult = null;
        if (isQuery && !isAdd && !isUpdate && !isDelete) {
            const searchMatch = lastUserMessage.match(/(?:find|search for|look for)\s+(.+)/i);
            const searchTerm = searchMatch ? searchMatch[1] : null;

            queryResult = await queryDatabase('select', 'InventoryItem');

            if (searchTerm && queryResult.data) {
                queryResult.data = queryResult.data.filter((item: any) =>
                    item.data?.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
        }

        // Build dynamic system prompt
        let systemPrompt = `You are ASD PHARR, a pharmaceutical inventory AI assistant with FULL database access.

DATABASE SCHEMA (Dynamic):
${JSON.stringify(schema.tables, null, 2)}

AVAILABLE OPERATIONS:
1. QUERY: Answer inventory questions using real data
2. ADD: Insert new items with JSON payload
3. UPDATE: Modify existing items  
4. DELETE: Remove items (always ask for confirmation first)

CURRENT INVENTORY DATA:
${queryResult?.data ? JSON.stringify(queryResult.data, null, 2) : 'Not queried yet'}`;

        if (queryResult?.error) {
            systemPrompt += `\n\n⚠️ DATABASE ERROR: ${queryResult.error}`;
        }

        systemPrompt += `\n\nINSTRUCTIONS:
- For ADD operations: Include JSON payload \`\`\`json {"action": "insert", "table": "InventoryItem", "data": {...}}\`\`\`
- For UPDATE operations: Include JSON payload with id: \`\`\`json {"action": "update", "table": "InventoryItem", "id": "...", "data": {...}}\`\`\`
- For DELETE operations: DO NOT execute immediately. Instead, respond: "I'll delete [item]. Please confirm by typing 'yes' or 'confirm'."
- For QUERY operations: Answer directly using the CURRENT INVENTORY DATA provided above. Be specific with numbers and names.

COMPLIANCE FIELDS (Required for medical items):
- batch_number (DSCSA)
- expiry_date
- ndc_code`;

        const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
        const result = streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages,
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
