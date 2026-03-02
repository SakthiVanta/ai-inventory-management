import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Fetch all inventory items for the authenticated user
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const items = await prisma.inventoryItem.findMany({
            where: { userId: auth.id },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(items);
    } catch (error: any) {
        console.error('Inventory Fetch Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}

// POST - Create new inventory item
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

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

        const item = await prisma.inventoryItem.create({
            data: {
                userId: auth.id,
                data: {
                    item_name,
                    batch_number: batch_number || null,
                    expiry_date: expiry_date || null,
                    ndc_code: ndc_code || null,
                    quantity,
                    unit: unit || 'units',
                    storage_temperature: storage_temperature || null,
                },
            },
        });

        return NextResponse.json(item);
    } catch (error: any) {
        console.error('Inventory Create Error:', error);
        return NextResponse.json(
            { error: 'Failed to create inventory item: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}

// PUT - Update inventory item
export async function PUT(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { id, ...updates } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }

        // Verify the item belongs to the user
        const existing = await prisma.inventoryItem.findFirst({
            where: { id, userId: auth.id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Item not found or access denied' },
                { status: 404 }
            );
        }

        // Merge new data with existing data
        const currentData = existing.data as any;
        const newData = { ...currentData, ...updates };

        // Validate quantity
        if (newData.quantity < 0) {
            return NextResponse.json(
                { error: 'Quantity cannot be negative - Policy violation' },
                { status: 400 }
            );
        }

        const item = await prisma.inventoryItem.update({
            where: { id },
            data: { data: newData },
        });

        return NextResponse.json(item);
    } catch (error: any) {
        console.error('Inventory Update Error:', error);
        return NextResponse.json(
            { error: 'Failed to update inventory item: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}

// DELETE - Delete inventory item
export async function DELETE(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }

        // Verify the item belongs to the user
        const existing = await prisma.inventoryItem.findFirst({
            where: { id, userId: auth.id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Item not found or access denied' },
                { status: 404 }
            );
        }

        await prisma.inventoryItem.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Inventory Delete Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete inventory item: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}
