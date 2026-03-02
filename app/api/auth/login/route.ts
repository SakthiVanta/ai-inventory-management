import { NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: "Email and password are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user || user.password !== hashPassword(password)) {
            return new Response(
                JSON.stringify({ error: "Invalid email or password" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create session
        const token = await createSession(user.id);
        await setSessionCookie(token);

        return new Response(
            JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    company: user.company,
                    name: user.email.split("@")[0],
                },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("Login error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
