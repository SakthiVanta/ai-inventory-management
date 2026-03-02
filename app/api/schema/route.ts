import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
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

// GET - Return user's schema fields
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        // Get user's schema fields
        const schemaFields = await prisma.schemaField.findMany({
            where: { userId: auth.id },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ schemaFields });
    } catch (error: any) {
        console.error('Schema Fetch Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch schema: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}

// POST - Connect to external database and get its schema
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

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

        // Save external DB connection if URL was provided
        if (url) {
            await prisma.externalDBConnection.upsert({
                where: { userId: auth.id },
                update: {
                    url,
                    name: 'Custom Connection',
                    isActive: true,
                },
                create: {
                    userId: auth.id,
                    name: 'Custom Connection',
                    url,
                    isActive: true,
                },
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

// PUT - Update or create a schema field
export async function PUT(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { name, type, isRequired, badges } = await req.json();

        if (!name || !type) {
            return NextResponse.json(
                { error: 'Name and type are required' },
                { status: 400 }
            );
        }

        const field = await prisma.schemaField.upsert({
            where: {
                userId_name: {
                    userId: auth.id,
                    name,
                },
            },
            update: {
                type,
                isRequired: isRequired ?? false,
                badges: badges || [],
            },
            create: {
                userId: auth.id,
                name,
                type,
                isRequired: isRequired ?? false,
                badges: badges || [],
            },
        });

        return NextResponse.json(field);
    } catch (error: any) {
        console.error('Schema Update Error:', error);
        return NextResponse.json(
            { error: 'Failed to update schema: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}

// DELETE - Delete a schema field
export async function DELETE(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json(
                { error: 'Field name is required' },
                { status: 400 }
            );
        }

        await prisma.schemaField.deleteMany({
            where: {
                userId: auth.id,
                name,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Schema Delete Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete schema field: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}
