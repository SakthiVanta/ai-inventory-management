"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle2, ShieldAlert, Database, Loader2, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export function OnboardingCard() {
    const router = useRouter();
    const { setDBConnection, user } = useAppStore();
    const [selectedOption, setSelectedOption] = useState<'default' | 'custom' | null>(null);
    const [dbUrl, setDbUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleDefaultSetup = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Simulate database setup with default schema
            await new Promise(resolve => setTimeout(resolve, 1500));

            setDBConnection({
                type: 'default',
                connected: true,
            });

            toast.success("Default schema loaded successfully!");
            router.push("/orchestrator");
        } catch (err) {
            setError("Failed to setup default schema. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomDBConnect = async () => {
        if (!dbUrl.trim()) {
            setError("Please enter a database URL");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            // Test the connection
            const response = await fetch('/api/db/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: dbUrl }),
            });

            if (!response.ok) {
                throw new Error('Connection failed');
            }

            setDBConnection({
                type: 'custom',
                url: dbUrl,
                connected: true,
            });

            toast.success("Database connected successfully!");
            router.push("/orchestrator");
        } catch (err) {
            setError("Failed to connect to database. Please check your URL and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-lg bg-card/50 backdrop-blur-xl border-border shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" />
            <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-bold tracking-tight">Database Setup</CardTitle>
                <CardDescription className="text-base text-muted-foreground font-medium">
                    Choose how you want to set up your pharmaceutical inventory database.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Option 1: Default Schema */}
                <div
                    onClick={() => setSelectedOption('default')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedOption === 'default'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/30 hover:bg-muted/20'
                        }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${selectedOption === 'default' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-sm">Use Default Pharma Schema</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Pre-configured with DSCSA compliance fields: batch tracking, expiry limits, NDC codes, and cold chain support.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {['batch_number', 'expiry_date', 'ndc_code', 'storage_temperature'].map((field) => (
                                    <span key={field} className="text-[10px] font-mono px-2 py-0.5 bg-muted rounded">
                                        {field}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {selectedOption === 'default' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                </div>

                {/* Option 2: Custom PostgreSQL */}
                <div
                    onClick={() => setSelectedOption('custom')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedOption === 'custom'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/30 hover:bg-muted/20'
                        }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${selectedOption === 'custom' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Database className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-sm">Connect Your PostgreSQL Database</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Use your own PostgreSQL database. We'll automatically detect your schema and tables.
                            </p>
                        </div>
                        {selectedOption === 'custom' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                </div>

                {/* Custom DB URL Input */}
                {selectedOption === 'custom' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-sm font-medium text-foreground">PostgreSQL Connection URL</label>
                        <Input
                            type="password"
                            placeholder="postgresql://user:password@host:port/database"
                            value={dbUrl}
                            onChange={(e) => setDbUrl(e.target.value)}
                            className="font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Format: postgresql://username:password@hostname:port/database_name
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex gap-4">
                <Button
                    variant="outline"
                    className="flex-1"
                    size="lg"
                    onClick={() => router.push('/orchestrator')}
                >
                    Skip for Now
                </Button>
                <Button
                    className="flex-1 shadow-sm bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-md transition-all disabled:opacity-50"
                    size="lg"
                    disabled={!selectedOption || isLoading}
                    onClick={selectedOption === 'default' ? handleDefaultSetup : handleCustomDBConnect}
                >
                    {isLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                    ) : (
                        'Continue'
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
