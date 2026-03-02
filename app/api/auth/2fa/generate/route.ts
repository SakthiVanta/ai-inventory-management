import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function POST() {
    try {
        // Generate a new secret
        const secret = speakeasy.generateSecret({
            name: 'ASD PHARR',
            length: 32,
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

        return NextResponse.json({
            secret: secret.base32,
            qrCodeUrl,
        });
    } catch (error) {
        console.error('2FA Generation Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate 2FA secret' },
            { status: 500 }
        );
    }
}
