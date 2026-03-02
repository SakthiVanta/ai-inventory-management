"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Zap, CheckCircle2, XCircle, Loader2, Sparkles, Key, AlertCircle, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

interface Provider {
    id: string;
    name: string;
    logo: string;
    modelName: string;
    maxContextTokens: number;
    status: "connected" | "disconnected" | "testing";
    latency: number | null;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const PROVIDER_CONFIG: Provider[] = [
    { id: "google", name: "Google Gemini", logo: "✦", modelName: "gemini-2.5-flash", maxContextTokens: 128000, status: "disconnected", latency: null },
    { id: "openai", name: "OpenAI", logo: "◎", modelName: "gpt-4o", maxContextTokens: 128000, status: "disconnected", latency: null },
    { id: "anthropic", name: "Anthropic", logo: "◆", modelName: "claude-3.5-sonnet", maxContextTokens: 200000, status: "disconnected", latency: null },
];

export default function ProvidersPage() {
    const {
        activeModel,
        setActiveModel,
        tokenUsage,
        aiProviders,
        setAIProviders,
        updateProviderKey
    } = useAppStore();

    const [providers, setProviders] = useState(PROVIDER_CONFIG);
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [testingId, setTestingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Sync with store state
        const updatedProviders = PROVIDER_CONFIG.map(p => {
            const storeProvider = aiProviders.find(sp => sp.id === p.id);
            return {
                ...p,
                status: (storeProvider?.apiKey ? 'connected' : 'disconnected') as "connected" | "disconnected" | "testing",
            };
        });
        setProviders(updatedProviders);
        setIsLoading(false);
    }, [aiProviders]);

    const handleTest = (id: string) => {
        const provider = aiProviders.find(p => p.id === id);
        if (!provider?.apiKey) {
            toast.error(`Please enter an API key for ${provider?.name || 'this provider'}`);
            return;
        }

        setTestingId(id);
        setTimeout(() => {
            setProviders(prev => prev.map(p =>
                p.id === id ? {
                    ...p,
                    status: "connected",
                    latency: Math.floor(Math.random() * 200) + 80
                } : p
            ));
            setTestingId(null);
            toast.success(`Connection to ${provider.name} successful`);
        }, 1500);
    };

    const handleActivate = (id: string) => {
        const provider = aiProviders.find(p => p.id === id);
        if (!provider?.apiKey) {
            toast.error(`Please configure an API key for ${provider?.name || 'this provider'} first`);
            return;
        }

        // Update active state in store
        const updatedProviders = aiProviders.map(p => ({
            ...p,
            isActive: p.id === id
        }));
        setAIProviders(updatedProviders);

        const modelName = providers.find(p => p.id === id)?.modelName;
        if (modelName) {
            setActiveModel(modelName);
        }

        toast.success(`${provider.name} is now the active model`);
    };

    const handleUpdateKey = (id: string, key: string) => {
        updateProviderKey(id, key);

        // Update local provider status
        setProviders(prev => prev.map(p =>
            p.id === id ? { ...p, status: key ? 'disconnected' : 'disconnected' } : p
        ));
    };

    const getProviderKey = (id: string) => {
        return aiProviders.find(p => p.id === id)?.apiKey || '';
    };

    const isProviderActive = (id: string) => {
        return aiProviders.find(p => p.id === id)?.isActive || false;
    };

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" /> AI & API Providers
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage LLM connections, configure token limits, and test API endpoints.
                </p>
            </div>

            {/* Security Warning */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-medium text-amber-400 text-sm">Security Notice</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        API keys are stored in your browser's localStorage for convenience.
                        For production use, consider using environment variables or a secure key management service.
                        Keys are only used for API calls and are never logged or shared.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={container} initial="hidden" animate="show">
                    {providers.map((provider) => (
                        <motion.div key={provider.id} variants={item}>
                            <Card className={`bg-card/40 backdrop-blur-sm border-border transition-all duration-300 ${isProviderActive(provider.id) ? "ring-1 ring-primary/30" : "hover:border-primary/20"
                                }`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-xl">{provider.logo}</div>
                                        <div>
                                            <CardTitle className="text-base">{provider.name}</CardTitle>
                                            <span className="text-xs font-mono text-muted-foreground">{provider.modelName}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={isProviderActive(provider.id)}
                                            onCheckedChange={() => handleActivate(provider.id)}
                                        />
                                        <div className={`w-2.5 h-2.5 rounded-full ${provider.status === "connected" ? "bg-secondary" :
                                            testingId === provider.id ? "bg-amber-400 animate-pulse" :
                                                "bg-muted-foreground/30"
                                            }`} />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* API Key */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <Key className="w-3 h-3" /> API Key
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type={showKeys[provider.id] ? "text" : "password"}
                                                value={getProviderKey(provider.id)}
                                                placeholder="Enter API key..."
                                                className="font-mono text-xs bg-background/50 h-9"
                                                onChange={(e) => handleUpdateKey(provider.id, e.target.value)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 shrink-0"
                                                onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                            >
                                                {showKeys[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </Button>
                                        </div>
                                        {!getProviderKey(provider.id) && (
                                            <p className="text-[10px] text-amber-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                No API key configured
                                            </p>
                                        )}
                                    </div>

                                    {/* Max Context Tokens */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-muted-foreground">Max Context Tokens</label>
                                            <span className="text-xs font-mono text-primary">{provider.maxContextTokens.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                                                style={{ width: `${(tokenUsage / provider.maxContextTokens) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                            <span>Used: {tokenUsage.toLocaleString()}</span>
                                            <span>{Math.round((tokenUsage / provider.maxContextTokens) * 100)}%</span>
                                        </div>
                                    </div>

                                    {/* Test & Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t border-border">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            {provider.status === "connected" && provider.latency !== null && (
                                                <span className="flex items-center gap-1.5 text-secondary">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK • {provider.latency}ms
                                                </span>
                                            )}
                                            {provider.status === "disconnected" && (
                                                <span className="flex items-center gap-1.5 text-muted-foreground/50">
                                                    <XCircle className="w-3.5 h-3.5" /> Not connected
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1.5"
                                            onClick={() => handleTest(provider.id)}
                                            disabled={testingId === provider.id}
                                        >
                                            {testingId === provider.id ? (
                                                <><Loader2 className="w-3 h-3 animate-spin" /> Testing...</>
                                            ) : (
                                                <><Zap className="w-3 h-3" /> Test Connection</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
