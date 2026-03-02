import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "./prisma";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "session-token";
const SESSION_DURATION_DAYS = 7;

export interface SessionUser {
    id: string;
    email: string;
    company: string | null;
    name: string;
}

export async function createSession(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await prisma.session.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });

    return token;
}

export async function validateSession(token: string): Promise<SessionUser | null> {
    const session = await prisma.session.findUnique({
        where: { token },
        include: { User: true },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } });
        return null;
    }

    return {
        id: session.User.id,
        email: session.User.email,
        company: session.User.company,
        name: session.User.email.split("@")[0], // Default name from email
    };
}

export async function getUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return validateSession(token);
}

export async function getUserFromCookies(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return validateSession(token);
}

export async function deleteSession(token: string): Promise<void> {
    await prisma.session.deleteMany({
        where: { token },
    });
}

export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
        path: "/",
    });
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

// Helper for API route authentication
export async function requireAuth(req: NextRequest): Promise<SessionUser | Response> {
    const user = await getUserFromRequest(req);
    if (!user) {
        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }
    return user;
}
