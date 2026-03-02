import { NextResponse } from 'next/server';
import { Pool } from 'pg';

interface TableInfo {
    table_name: string;
    columns: {
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
    }[];
    relations: {
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
    }[];
}

export async function POST(req: Request) {
    let pool: Pool | null = null;

    try {
        const { url } = await req.json();

        // Use provided URL or fallback to environment variable
        const connectionString = url || process.env.DATABASE_URL;

        if (!connectionString) {
            return NextResponse.json(
                { error: 'No database URL provided' },
                { status: 400 }
            );
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

        const tables: TableInfo[] = [];

        for (const row of tablesResult.rows) {
            const tableName = row.table_name;

            // Get columns for this table
            const columnsResult = await pool.query(`
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);

            // Get foreign key relations
            const relationsResult = await pool.query(`
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.constraint_column_usage ccu
                    ON ccu.constraint_name = kcu.constraint_name
                JOIN information_schema.table_constraints tc
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND kcu.table_schema = 'public'
                AND kcu.table_name = $1
            `, [tableName]);

            tables.push({
                table_name: tableName,
                columns: columnsResult.rows,
                relations: relationsResult.rows,
            });
        }

        return NextResponse.json({ tables });
    } catch (error: any) {
        console.error('Schema Fetch Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch schema: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// GET - Return default schema structure
export async function GET() {
    // Return the default pharmaceutical schema
    const defaultSchema = {
        tables: [
            {
                table_name: 'User',
                columns: [
                    { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
                    { column_name: 'email', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'company', data_type: 'text', is_nullable: 'YES', column_default: null },
                    { column_name: 'password', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'createdAt', data_type: 'timestamp', is_nullable: 'NO', column_default: 'now()' },
                ],
                relations: [
                    { column_name: 'userId', foreign_table_name: 'Session', foreign_column_name: 'id' }
                ]
            },
            {
                table_name: 'Session',
                columns: [
                    { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
                    { column_name: 'userId', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'token', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'createdAt', data_type: 'timestamp', is_nullable: 'NO', column_default: 'now()' },
                    { column_name: 'expiresAt', data_type: 'timestamp', is_nullable: 'NO', column_default: null },
                ],
                relations: [
                    { column_name: 'userId', foreign_table_name: 'User', foreign_column_name: 'id' }
                ]
            },
            {
                table_name: 'InventoryItem',
                columns: [
                    { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
                    { column_name: 'data', data_type: 'jsonb', is_nullable: 'NO', column_default: null },
                    { column_name: 'createdAt', data_type: 'timestamp', is_nullable: 'NO', column_default: 'now()' },
                    { column_name: 'updatedAt', data_type: 'timestamp', is_nullable: 'NO', column_default: null },
                ],
                relations: []
            },
            {
                table_name: 'AIProviderConfig',
                columns: [
                    { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
                    { column_name: 'name', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'apiKey', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'modelName', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'maxContextTokens', data_type: 'integer', is_nullable: 'NO', column_default: null },
                    { column_name: 'isActive', data_type: 'boolean', is_nullable: 'NO', column_default: 'false' },
                    { column_name: 'createdAt', data_type: 'timestamp', is_nullable: 'NO', column_default: 'now()' },
                ],
                relations: []
            },
            {
                table_name: 'AuditLog',
                columns: [
                    { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
                    { column_name: 'timestamp', data_type: 'timestamp', is_nullable: 'NO', column_default: 'now()' },
                    { column_name: 'userEmail', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'rawNLPrompt', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'aiModelUsed', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'cost', data_type: 'float', is_nullable: 'NO', column_default: null },
                    { column_name: 'zodValidationResult', data_type: 'text', is_nullable: 'YES', column_default: null },
                    { column_name: 'transactionId', data_type: 'text', is_nullable: 'NO', column_default: null },
                    { column_name: 'actionType', data_type: 'text', is_nullable: 'NO', column_default: null },
                ],
                relations: []
            },
        ]
    };

    return NextResponse.json(defaultSchema);
}
