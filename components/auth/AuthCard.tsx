"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Building2, Mail, Loader2, AlertCircle, User, LogIn, UserPlus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

export function AuthCard() {
    const router = useRouter();
    const { login } = useAppStore();
    const [mode, setMode] = useState<AuthMode>("login");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        company: "",
        password: "",
        name: "",
    });

    const strength = Math.min(
        100,
        (formData.password.length > 8 ? 25 : 0) +
        (/[A-Z]/.test(formData.password) ? 25 : 0) +
        (/[0-9]/.test(formData.password) ? 25 : 0) +
        (/[^A-Za-z0-9]/.test(formData.password) ? 25 : 0)
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        setError("");
    };

    const toggleMode = () => {
        setMode(prev => prev === "login" ? "signup" : "login");
        setError("");
        setFormData({ email: "", company: "", password: "", name: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === "signup" && strength < 50) {
            setError("Password is too weak. Please add symbols, numbers, and uppercase letters.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const user = {
                id: crypto.randomUUID(),
                email: formData.email,
                company: mode === "signup" ? formData.company : formData.email.split('@')[1]?.split('.')[0] || "Unknown",
                name: mode === "signup" ? (formData.name || formData.email.split('@')[0]) : formData.email.split('@')[0],
            };

            login(user);

            if (mode === "login") {
                toast.success("Welcome back!");
                router.push("/");
            } else {
                toast.success("Account created successfully!");
                router.push("/setup-2fa");
            }
        } catch (err) {
            setError(mode === "login" ? "Invalid email or password. Please try again." : "Failed to create account. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const isLogin = mode === "login";

    return (
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" />

            {/* Mode Toggle Tabs */}
            <div className="flex border-b border-border">
                <button
                    type="button"
                    onClick={() => { setMode("login"); setError(""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all duration-200 ${isLogin
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`}
                >
                    <LogIn className="h-4 w-4" />
                    Sign In
                </button>
                <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all duration-200 ${!isLogin
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`}
                >
                    <UserPlus className="h-4 w-4" />
                    Sign Up
                </button>
            </div>

            <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                    {isLogin ? "Welcome Back" : "Secure Access"}
                </CardTitle>
                <CardDescription className="text-base font-medium">
                    {isLogin
                        ? "Sign in to the ASD PHARR Inventory Platform."
                        : "Sign up to the ASD PHARR Inventory Platform."
                    }
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Full Name - Sign Up Only */}
                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Dr. John Smith"
                                    className="pl-10 h-11 bg-background"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* Work Email - Both Modes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Work Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                name="email"
                                required
                                placeholder="dr.smith@pharma.corp"
                                className="pl-10 h-11 bg-background"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Company Name - Sign Up Only */}
                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Company Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    name="company"
                                    required
                                    placeholder="PharmaCorp Inc."
                                    className="pl-10 h-11 bg-background"
                                    value={formData.company}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* Password - Both Modes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••••••••••"
                                className="pl-10 pr-10 h-11 bg-background"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {/* Password Strength Meter - Sign Up Only */}
                        {!isLogin && formData.password.length > 0 && (
                            <div className="pt-2">
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${strength < 50 ? "bg-destructive" : strength < 100 ? "bg-yellow-500" : "bg-primary"
                                            }`}
                                        style={{ width: `${strength}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 text-right">
                                    {strength < 50 ? "Weak - Add symbols & numbers" : strength < 100 ? "Good" : "Strong - Compliant"}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex-col gap-4">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={isLoading}
                        className="w-full mt-2 font-semibold shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isLogin ? "Signing In..." : "Creating Account..."}</>
                        ) : (
                            isLogin ? "Sign In" : "Create Account"
                        )}
                    </Button>
                    <p className="text-sm text-center text-muted-foreground">
                        {isLogin ? (
                            <>Don&apos;t have an account? <button type="button" onClick={toggleMode} className="text-primary hover:underline">Sign up</button></>
                        ) : (
                            <>Already have an account? <button type="button" onClick={toggleMode} className="text-primary hover:underline">Sign in</button></>
                        )}
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}
