import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Pharmaceutical inventory schema field definitions
const SCHEMA_FIELDS = [
    { name: "item_name", type: "text", isRequired: true, badges: ["DSCSA"] },
    { name: "batch_number", type: "text", isRequired: true, badges: ["DSCSA", "Serialization"] },
    { name: "ndc_code", type: "text", isRequired: true, badges: ["NDC", "FDA"] },
    { name: "quantity", type: "integer", isRequired: true, badges: [] },
    { name: "unit", type: "text", isRequired: false, badges: [] },
    { name: "expiry_date", type: "date", isRequired: true, badges: ["DSCSA", "Compliance"] },
    { name: "storage_temperature", type: "float", isRequired: false, badges: ["Cold Chain", "GDP"] },
];

// Sample pharma inventory with diverse scenarios
const INVENTORY_ITEMS = [
    // Normal stock
    { item_name: "Paracetamol 500mg", batch_number: "BATCH-2026-A1", ndc_code: "12345-678-01", quantity: 500, unit: "boxes", expiry_date: "2026-12-15", storage_temperature: null },
    { item_name: "Metformin 500mg", batch_number: "BATCH-2026-D2", ndc_code: "12345-678-04", quantity: 1000, unit: "tablets", expiry_date: "2027-08-30", storage_temperature: null },
    { item_name: "Ibuprofen 400mg", batch_number: "BATCH-2026-F8", ndc_code: "12345-678-06", quantity: 750, unit: "bottles", expiry_date: "2026-11-20", storage_temperature: null },
    { item_name: "Aspirin 81mg", batch_number: "BATCH-2026-G2", ndc_code: "12345-678-07", quantity: 1200, unit: "tablets", expiry_date: "2027-02-28", storage_temperature: null },
    { item_name: "Omeprazole 20mg", batch_number: "BATCH-2026-H9", ndc_code: "12345-678-08", quantity: 320, unit: "capsules", expiry_date: "2027-05-15", storage_temperature: null },
    // Cold-chain
    { item_name: "Insulin Glargine", batch_number: "BATCH-2026-C7", ndc_code: "12345-678-03", quantity: 50, unit: "vials", expiry_date: "2026-06-20", storage_temperature: 4 },
    { item_name: "mRNA Vaccine Dose", batch_number: "BATCH-2026-K1", ndc_code: "12345-678-11", quantity: 200, unit: "doses", expiry_date: "2026-09-01", storage_temperature: -20 },
    // EXPIRED
    { item_name: "Amoxicillin 250mg", batch_number: "BATCH-2025-B3", ndc_code: "12345-678-02", quantity: 45, unit: "bottles", expiry_date: "2025-11-30", storage_temperature: null },
    { item_name: "Ciprofloxacin 500mg", batch_number: "BATCH-2025-J4", ndc_code: "12345-678-10", quantity: 120, unit: "tablets", expiry_date: "2026-01-15", storage_temperature: null },
    // EXPIRING SOON (within 30 days of March 2026)
    { item_name: "Epinephrine Auto-Injector", batch_number: "BATCH-2026-E5", ndc_code: "12345-678-05", quantity: 25, unit: "injectors", expiry_date: "2026-03-20", storage_temperature: 8 },
    { item_name: "Lorazepam 1mg", batch_number: "BATCH-2026-L6", ndc_code: "12345-678-12", quantity: 60, unit: "tablets", expiry_date: "2026-03-15", storage_temperature: null },
    // LOW STOCK
    { item_name: "Naloxone Nasal Spray", batch_number: "BATCH-2026-I3", ndc_code: "12345-678-09", quantity: 3, unit: "kits", expiry_date: "2027-01-10", storage_temperature: null },
];

export async function POST() {
    let pool: Pool | null = null;

    try {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            return NextResponse.json(
                { error: 'DATABASE_URL not configured' },
                { status: 400 }
            );
        }

        pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });

        // 1. Seed SchemaField (upsert — skip if already exists)
        let schemaCount = 0;
        for (const field of SCHEMA_FIELDS) {
            try {
                await pool.query(
                    `INSERT INTO "SchemaField" (id, name, type, "isRequired", badges, "createdAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
                     ON CONFLICT (name) DO NOTHING`,
                    [field.name, field.type, field.isRequired, field.badges]
                );
                schemaCount++;
            } catch (e: any) {
                console.error(`[SEED] SchemaField "${field.name}" failed:`, e.message);
            }
        }

        // 2. Seed InventoryItem
        let inventoryCount = 0;
        for (const item of INVENTORY_ITEMS) {
            try {
                await pool.query(
                    `INSERT INTO "InventoryItem" (id, data, "createdAt", "updatedAt")
                     VALUES (gen_random_uuid(), $1, NOW(), NOW())
                     RETURNING *`,
                    [JSON.stringify(item)]
                );
                inventoryCount++;
            } catch (e: any) {
                console.error(`[SEED] InventoryItem "${item.item_name}" failed:`, e.message);
            }
        }

        console.log(`[SEED] Complete: ${schemaCount} schema fields, ${inventoryCount} inventory items`);

        return NextResponse.json({
            success: true,
            schemaFields: schemaCount,
            inventoryItems: inventoryCount,
            message: `Seeded ${schemaCount} schema fields and ${inventoryCount} inventory items`,
        });
    } catch (error: any) {
        console.error('[SEED] Error:', error.message);
        return NextResponse.json(
            { error: 'Seed failed: ' + error.message },
            { status: 500 }
        );
    } finally {
        if (pool) await pool.end();
    }
}
