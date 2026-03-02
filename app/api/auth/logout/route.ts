import { NextRequest } from "next/server";
import { deleteSession, clearSessionCookie, getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session-token")?.value;

        if (token) {
            await deleteSession(token);
        }

        await clearSessionCookie();

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("Logout error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
