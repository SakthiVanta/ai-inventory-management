import { AuthCard } from "@/components/auth/AuthCard";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Left side: Animated/Visual Side */}
            <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/10 border-r border-border relative overflow-hidden">
                {/* Glow Effects */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 p-12 max-w-lg text-center flex flex-col items-center">
                    <h1 className="text-5xl font-bold mb-4 tracking-tight drop-shadow-sm text-foreground">ASD PHARR</h1>
                    <p className="text-muted-foreground text-xl mb-12 max-w-sm">
                        AI-Powered Inventory Orchestration & Compliance Monitoring.
                    </p>
                    <div className="w-72 h-72 mx-auto bg-card/40 rounded-2xl border border-border flex items-center justify-center backdrop-blur-md shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative z-10 text-center space-y-2">
                            <div className="text-primary font-mono text-xs opacity-70">DATA PIPELINE SECURE</div>
                            <div className="text-muted-foreground font-mono text-sm leading-relaxed">
                                {"{\n  status: 'active',\n  nodes: 1042,\n  encryption: 'AES-256-GCM'\n}"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: Glassmorphic Auth Card */}
            <div className="flex-1 flex items-center justify-center p-8 relative z-10 bg-background/50">
                <AuthCard />
            </div>
        </div>
    );
}
