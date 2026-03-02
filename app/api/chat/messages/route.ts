import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Fetch messages for a session
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Verify session belongs to user
        const session = await prisma.chatSession.findFirst({
            where: { id: sessionId, userId: auth.id },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        const messages = await prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' },
        });

        return NextResponse.json(messages);
    } catch (error: any) {
        console.error('Chat Messages Fetch Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}

// POST - Add a message to a session
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { sessionId, role, content } = await req.json();

        if (!sessionId || !role || !content) {
            return NextResponse.json(
                { error: 'Session ID, role, and content are required' },
                { status: 400 }
            );
        }

        // Verify session belongs to user
        const session = await prisma.chatSession.findFirst({
            where: { id: sessionId, userId: auth.id },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // Create message
        const message = await prisma.chatMessage.create({
            data: {
                sessionId,
                role,
                content,
            },
        });

        // Update session's updatedAt
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
        });

        // Update session title if this is the first user message
        if (role === 'user') {
            const messageCount = await prisma.chatMessage.count({
                where: { sessionId },
            });

            if (messageCount === 1) {
                await prisma.chatSession.update({
                    where: { id: sessionId },
                    data: {
                        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
                    },
                });
            }
        }

        return NextResponse.json(message);
    } catch (error: any) {
        console.error('Chat Message Create Error:', error);
        return NextResponse.json(
            { error: 'Failed to create message' },
            { status: 500 }
        );
    }
}
