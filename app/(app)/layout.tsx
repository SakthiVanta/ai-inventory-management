"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrainCircuit, Database, ShieldAlert, Activity, Settings, TableProperties, User, LogOut } from "lucide-react";
import { useAppStore, fetchCurrentUser } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const {
        activeModel,
        tokenUsage,
        projectContext,
        user,
        isAuthenticated,
        is2FAEnabled,
        setUser,
        setIsAuthenticated,
        logout
    } = useAppStore();

    // Check auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            const currentUser = await fetchCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);
            } else {
                // Redirect to login if not authenticated
                router.push("/login");
            }
            setIsLoading(false);
        };
        checkAuth();
    }, [router, setUser, setIsAuthenticated]);

    const handleLogout = async () => {
        await logout();
        toast.success("Logged out successfully");
        router.push("/login");
    };

    const navItems = [
        { name: "Orchestrator", href: "/orchestrator", icon: BrainCircuit },
        { name: "Inventory", href: "/inventory", icon: Database },
        { name: "Schema", href: "/schema", icon: TableProperties },
        { name: "Risk Monitor", href: "/risk-monitor", icon: ShieldAlert },
        { name: "Audit Log", href: "/audit-log", icon: Activity },
        { name: "Settings", href: "/settings/providers", icon: Settings },
    ];

    const getInitials = (name: string) => {
        return name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect to login
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            {/* App Shell Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/30 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-lg tracking-tight text-foreground flex items-center gap-2">
                        <div className="w-8 h-8 rounded shrink-0 bg-primary/10 flex items-center justify-center p-1 shadow-sm overflow-hidden">
                            <img src="/logo.png" alt="PHARR Logo" className="w-full h-full object-contain" />
                        </div>
                        PHARR
                    </div>
                    <div className="h-4 w-[1px] bg-border mx-2" />
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span>{projectContext}</span>
                        <span className="text-border">/</span>
                        <span className="text-foreground capitalize">{pathname.split('/')[1] || 'Dashboard'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Token sparkline */}
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Token Usage</div>
                        <div className="text-xs font-mono text-secondary flex items-center gap-2">
                            <div className="flex gap-0.5 items-end h-3">
                                {[1, 3, 2, 4, 3, 5, 4, 6].map((h, i) => (
                                    <div key={i} className="w-1 bg-secondary/80 rounded-[1px]" style={{ height: `${h * 16}%` }} />
                                ))}
                            </div>
                            {tokenUsage.toLocaleString()} / 128k
                        </div>
                    </div>

                    {/* Model Switcher */}
                    <div className="px-3 py-1.5 rounded-md border border-border bg-background text-sm flex items-center gap-2 font-mono shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        {activeModel}
                    </div>

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative ">
                                <div className="w-8  h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-background hover:bg-primary/30 transition-colors">
                                    {getInitials(user?.name || 'User')}
                                </div>
                                {is2FAEnabled && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-background" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <div className="flex items-center justify-start gap-2 p-2">
                                <div className="rounded-full bg-primary/10 p-1">
                                    <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col space-y-0.5">
                                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user?.email || 'user@example.com'}</p>
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/profile" className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings/providers" className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Slim Sidebar */}
                <aside className="w-16 border-r border-border bg-card/10 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`p-3 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-primary/10 text-primary scale-110 shadow-sm ring-1 ring-primary/20'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                                title={item.name}
                            >
                                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                            </Link>
                        );
                    })}
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
