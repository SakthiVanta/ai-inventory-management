"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Copy, Loader2, Shield, AlertCircle, SkipForward, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export function TwoFactorSetupCard() {
    const router = useRouter();
    const { setIs2FAEnabled, user } = useAppStore();
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [token, setToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Generate 2FA secret when component mounts
        generateSecret();
    }, []);

    const generateSecret = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/auth/2fa/generate', {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to generate 2FA');

            const data = await response.json();
            setQrCodeUrl(data.qrCodeUrl);
            setSecret(data.secret);
        } catch (err) {
            setError("Failed to generate 2FA setup. Please refresh and try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Secret copied to clipboard");
    };

    const handleVerify = async () => {
        if (token.length !== 6) {
            setError("Please enter a 6-digit code");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, secret }),
            });

            if (!response.ok) throw new Error('Invalid token');

            setIs2FAEnabled(true);
            toast.success("2FA enabled successfully!");
            router.push("/onboarding");
        } catch (err) {
            setError("Invalid verification code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        toast.info("2FA setup skipped. You can enable it later in profile settings.");
        router.push("/onboarding");
    };

    return (
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" />
            <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary" />
                    <CardTitle className="text-2xl font-bold tracking-tight">Protect Your Account</CardTitle>
                </div>
                <CardDescription className="text-base text-muted-foreground font-medium">
                    Set up 2-Factor Authentication with Google Authenticator for enhanced security.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Generating secure key...</p>
                    </div>
                ) : (
                    <>
                        {/* QR Code */}
                        <div className="flex justify-center p-4 bg-card rounded-lg border border-border">
                            {qrCodeUrl ? (
                                <img
                                    src={qrCodeUrl}
                                    alt="2FA QR Code"
                                    className="w-48 h-48"
                                />
                            ) : (
                                <div className="w-48 h-48 bg-muted flex items-center justify-center border border-dashed border-border">
                                    <span className="text-gray-500 font-mono text-xs text-center">Failed to load QR code</span>
                                </div>
                            )}
                        </div>

                        {/* Manual Entry */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Or enter code manually</label>
                            <div className="flex space-x-2">
                                <Input
                                    readOnly
                                    value={secret}
                                    className="font-mono bg-background text-primary text-xs tracking-wider"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={handleCopySecret}
                                >
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Open Google Authenticator, tap the + button, and select "Enter setup key"
                            </p>
                        </div>

                        {/* Verification Code */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Verification Code</label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="000000"
                                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                                maxLength={6}
                                value={token}
                                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                            />
                            <p className="text-[10px] text-muted-foreground text-center">
                                Enter the 6-digit code from Google Authenticator
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
            <CardFooter className="flex-col gap-3">
                <Button
                    className="w-full"
                    size="lg"
                    disabled={isLoading || isGenerating || token.length !== 6}
                    onClick={handleVerify}
                >
                    {isLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                    ) : (
                        'Verify & Continue'
                    )}
                </Button>

                <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    size="sm"
                    onClick={handleSkip}
                >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip for Now
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                    Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
                </p>
            </CardFooter>
        </Card>
    );
}
