import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Helper to get database pool
function getPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL not configured');
    }

    return new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
}

// GET - Fetch all inventory items
export async function GET() {
    let pool = null;

    try {
        pool = getPool();
        const result = await pool.query(`
            SELECT * FROM "InventoryItem" 
            ORDER BY "createdAt" DESC
        `);

        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Inventory Fetch Error:', error);
        // Return empty array if table doesn't exist yet
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
            return NextResponse.json([]);
        }
        return NextResponse.json(
            { error: 'Failed to fetch inventory: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    } finally {
        if (pool) await pool.end();
    }
}

// POST - Create new inventory item
export async function POST(req: Request) {
    let pool = null;

    try {
        const body = await req.json();

        // Validate required fields for pharmaceutical compliance
        const { item_name, batch_number, expiry_date, ndc_code, quantity, unit, storage_temperature } = body;

        if (!item_name || quantity === undefined) {
            return NextResponse.json(
                { error: 'Item name and quantity are required' },
                { status: 400 }
            );
        }

        // Enforce non-negative quantity policy
        if (quantity < 0) {
            return NextResponse.json(
                { error: 'Quantity cannot be negative - Policy violation' },
                { status: 400 }
            );
        }

        pool = getPool();

        // Create the inventory item with all data stored as JSON
        const result = await pool.query(`
            INSERT INTO "InventoryItem" (id, data, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), $1, NOW(), NOW())
            RETURNING *
        `, [JSON.stringify({
            item_name,
            batch_number: batch_number || null,
            expiry_date: expiry_date || null,
            ndc_code: ndc_code || null,
            quantity,
            unit: unit || 'units',
            storage_temperature: storage_temperature || null,
        })]);

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        console.error('Inventory Create Error:', error);
        // If table doesn't exist, return error with instructions
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
            return NextResponse.json(
                { error: 'Database not initialized. Please complete onboarding first.' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to create inventory item: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    } finally {
        if (pool) await pool.end();
    }
}
