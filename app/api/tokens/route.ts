import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Get token usage statistics for the user
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        // Get total usage
        const totalUsage = await prisma.tokenUsage.aggregate({
            where: { userId: auth.id },
            _sum: { amount: true },
            _count: true,
        });

        // Get recent usage (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentUsage = await prisma.tokenUsage.findMany({
            where: {
                userId: auth.id,
                createdAt: { gte: thirtyDaysAgo },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Get usage by model
        const usageByModel = await prisma.tokenUsage.groupBy({
            by: ['model'],
            where: { userId: auth.id },
            _sum: { amount: true },
        });

        return NextResponse.json({
            totalTokens: totalUsage._sum.amount || 0,
            totalRequests: totalUsage._count || 0,
            recentUsage,
            usageByModel,
        });
    } catch (error: any) {
        console.error('Token Usage Fetch Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch token usage' },
            { status: 500 }
        );
    }
}

// POST - Record token usage
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { amount, model, cost, action, sessionId } = await req.json();

        if (!amount || !model) {
            return NextResponse.json(
                { error: 'Amount and model are required' },
                { status: 400 }
            );
        }

        const usage = await prisma.tokenUsage.create({
            data: {
                userId: auth.id,
                amount,
                model,
                cost: cost || null,
                action: action || 'chat',
                sessionId: sessionId || null,
            },
        });

        return NextResponse.json(usage);
    } catch (error: any) {
        console.error('Token Usage Record Error:', error);
        return NextResponse.json(
            { error: 'Failed to record token usage' },
            { status: 500 }
        );
    }
}
