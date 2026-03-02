import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

export async function POST(req: Request) {
    try {
        const { token, secret } = await req.json();

        if (!token || !secret) {
            return NextResponse.json(
                { error: 'Token and secret are required' },
                { status: 400 }
            );
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2, // Allow 2 time steps of drift (±1 minute)
        });

        if (!verified) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: '2FA verified successfully',
        });
    } catch (error) {
        console.error('2FA Verification Error:', error);
        return NextResponse.json(
            { error: 'Failed to verify 2FA token' },
            { status: 500 }
        );
    }
}
