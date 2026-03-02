import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Fetch all chat sessions for the user
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const sessions = await prisma.chatSession.findMany({
            where: { userId: auth.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                ChatMessage: {
                    orderBy: { timestamp: 'asc' }
                }
            },
        });

        // Map ChatMessage to messages for frontend compatibility
        const mappedSessions = sessions.map(session => ({
            ...session,
            messages: session.ChatMessage || []
        }));

        return NextResponse.json(mappedSessions);
    } catch (error: any) {
        console.error('Chat Sessions Fetch Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat sessions' },
            { status: 500 }
        );
    }
}

// POST - Create a new chat session
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { title = 'New Conversation' } = await req.json();

        const session = await prisma.chatSession.create({
            data: {
                userId: auth.id,
                title,
            },
        });

        return NextResponse.json({ ...session, messages: [] });
    } catch (error: any) {
        console.error('Chat Session Create Error:', error);
        return NextResponse.json(
            { error: 'Failed to create chat session' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a chat session
export async function DELETE(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Verify ownership
        const session = await prisma.chatSession.findFirst({
            where: { id, userId: auth.id },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        await prisma.chatSession.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Chat Session Delete Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete chat session' },
            { status: 500 }
        );
    }
}
