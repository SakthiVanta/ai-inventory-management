import { NextRequest } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const { email, password, company, name } = await req.json();

        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: "Email and password are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return new Response(
                JSON.stringify({ error: "User already exists" }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashPassword(password),
                company: company || null,
            },
        });

        // Create default AI provider config
        await prisma.aIProviderConfig.create({
            data: {
                userId: user.id,
                name: "Google Gemini",
                apiKey: "",
                modelName: "gemini-2.5-flash",
                maxContextTokens: 128000,
                isActive: true,
            },
        });

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
                    name: name || user.email.split("@")[0],
                },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("Signup error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
