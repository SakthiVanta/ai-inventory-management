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
    const { setUser, setIsAuthenticated } = useAppStore();
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
            const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    company: formData.company,
                    name: formData.name,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Authentication failed");
            }

            // Update client state
            setUser(data.user);
            setIsAuthenticated(true);

            if (mode === "login") {
                toast.success("Welcome back!");
                router.push("/orchestrator");
                router.refresh();
            } else {
                toast.success("Account created successfully!");
                router.push("/setup-2fa");
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed. Please try again.");
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
                        ? "Sign in to the PHARR Inventory Platform."
                        : "Sign up to the PHARR Inventory Platform."
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
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="pl-10 bg-background/50 border-border focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                name="email"
                                required
                                placeholder="you@company.com"
                                value={formData.email}
                                onChange={handleChange}
                                className="pl-10 bg-background/50 border-border focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Company - Sign Up Only */}
                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Company</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    name="company"
                                    required
                                    placeholder="Your Company Ltd"
                                    value={formData.company}
                                    onChange={handleChange}
                                    className="pl-10 bg-background/50 border-border focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>
                    )}

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                className="pl-10 pr-10 bg-background/50 border-border focus:border-primary focus:ring-primary"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {/* Password Strength Bar */}
                        {!isLogin && (
                            <div className="space-y-1">
                                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${strength < 50 ? 'bg-destructive' : strength < 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${strength}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Password strength: {strength < 50 ? 'Weak' : strength < 75 ? 'Fair' : 'Strong'}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isLogin ? "Signing in..." : "Creating account..."}
                            </>
                        ) : (
                            <>
                                {isLogin ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                {isLogin ? "Sign In" : "Create Account"}
                            </>
                        )}
                    </Button>

                    <p className="text-sm text-muted-foreground text-center">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-primary hover:underline font-medium"
                        >
                            {isLogin ? "Sign up" : "Sign in"}
                        </button>
                    </p>

                    {isLogin && (
                        <Link
                            href="#"
                            className="text-sm text-muted-foreground hover:text-foreground text-center"
                        >
                            Forgot password?
                        </Link>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}
