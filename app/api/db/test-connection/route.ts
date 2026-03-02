import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(req: Request) {
    let pool: Pool | null = null;

    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json(
                { error: 'Database URL is required' },
                { status: 400 }
            );
        }

        // Create a new pool with the provided URL
        pool = new Pool({
            connectionString: url,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 5000,
        });

        // Test the connection
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, current_database() as database');
        client.release();

        return NextResponse.json({
            success: true,
            message: 'Database connected successfully',
            database: result.rows[0].database,
            timestamp: result.rows[0].current_time,
        });
    } catch (error: any) {
        console.error('Database Connection Error:', error);
        return NextResponse.json(
            { error: 'Failed to connect to database: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}
