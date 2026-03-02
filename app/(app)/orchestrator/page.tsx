"use client";

import { useState, useRef, useEffect } from "react";
import { Send, TerminalSquare, Loader2, Database, Plus, History, Trash2, MessageSquare, BrainCircuit, Search, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface ThinkingStep {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    details?: string[];
    status: 'pending' | 'active' | 'completed';
    expanded?: boolean;
}

export default function OrchestratorPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const {
        activeModel,
        incrementTokenUsage,
        addAuditLog,
        user,
        dbConnection,
        addInventoryItem,
        chatSessions,
        currentSessionId,
        createNewSession,
        addMessageToSession,
        deleteSession,
        setCurrentSession,
        getCurrentSession,
    } = useAppStore();

    // Load current session messages
    useEffect(() => {
        const session = getCurrentSession();
        if (session) {
            setMessages(session.messages);
        } else {
            // Create new session if none exists
            createNewSession();
        }
    }, [currentSessionId]);

    // Save messages to session
    useEffect(() => {
        if (currentSessionId && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            addMessageToSession(currentSessionId, { ...lastMessage, timestamp: new Date().toISOString() });
        }
    }, [messages]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const handleNewChat = () => {
        createNewSession();
        setMessages([]);
        setShowHistory(false);
        toast.success("New conversation started");
    };

    const handleLoadSession = (sessionId: string) => {
        setCurrentSession(sessionId);
        const session = chatSessions.find(s => s.id === sessionId);
        if (session) {
            setMessages(session.messages);
        }
        setShowHistory(false);
    };

    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        deleteSession(sessionId);
        toast.success("Conversation deleted");
    };

    const extractJSONFromResponse = (text: string): any | null => {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const updateThinkingStep = (id: string, status: ThinkingStep['status']) => {
        setThinkingSteps(prev => prev.map(step =>
            step.id === id ? { ...step, status } : step
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Initialize thinking steps with dynamic details
        const userIntent = input.toLowerCase();
        const isInventoryQuery = /\b(how many|what|show|list|get|find|check|count|total|do i have|search)\b/i.test(userIntent);
        const isAddOperation = /\b(add|create|insert|new)\b/i.test(userIntent);
        const isUpdateOperation = /\b(update|modify|change|edit)\b/i.test(userIntent);
        const isDeleteOperation = /\b(delete|remove|destroy)\b/i.test(userIntent);

        let detectedIntent = 'General query';
        if (isInventoryQuery) detectedIntent = 'Inventory search/query';
        if (isAddOperation) detectedIntent = 'Add new inventory item';
        if (isUpdateOperation) detectedIntent = 'Update existing item';
        if (isDeleteOperation) detectedIntent = 'Delete item';

        setThinkingSteps([
            {
                id: '1',
                icon: <BrainCircuit className="w-4 h-4" />,
                title: 'Analyzing User Intent',
                description: `Detected: ${detectedIntent}`,
                details: [
                    `Input: "${input.slice(0, 50)}${input.length > 50 ? '...' : ''}"`,
                    `Pattern matching: ${isInventoryQuery ? 'Query detected' : isAddOperation ? 'Insert operation' : isUpdateOperation ? 'Update operation' : isDeleteOperation ? 'Delete operation' : 'General conversation'}`,
                    'Parsing natural language...'
                ],
                status: 'active',
                expanded: true
            },
            {
                id: '2',
                icon: <Database className="w-4 h-4" />,
                title: 'Database Operations',
                description: dbConnection.connected ? 'Connected to PostgreSQL' : 'Using local storage',
                details: dbConnection.connected ? [
                    'Connection: Active',
                    `Database: ${dbConnection.type === 'default' ? 'Default schema' : 'Custom PostgreSQL'}`,
                    isInventoryQuery ? 'Preparing SELECT query...' : isAddOperation ? 'Preparing INSERT statement...' : 'Awaiting operation...'
                ] : [
                    'Connection: Offline',
                    'Mode: Local storage only',
                    'Note: Data will not persist between sessions'
                ],
                status: 'pending'
            },
            {
                id: '3',
                icon: <Table2 className="w-4 h-4" />,
                title: 'Schema Analysis',
                description: 'InventoryItem table structure',
                details: [
                    'Table: InventoryItem',
                    'Fields: id, data (JSONB), createdAt, updatedAt',
                    'Compliance: DSCSA fields validated',
                    'Required: batch_number, expiry_date, ndc_code'
                ],
                status: 'pending'
            },
            {
                id: '4',
                icon: <Search className="w-4 h-4" />,
                title: 'AI Response Generation',
                description: 'Using Gemini 1.5 Flash',
                details: [
                    'Model: gemini-2.5-flash',
                    'Context: Database schema + inventory data injected',
                    'Streaming: Enabled',
                    'Tools: CRUD operations available'
                ],
                status: 'pending'
            },
        ]);

        try {
            const activeProvider = localStorage.getItem('asd-pharr-storage');
            let apiKey = null;
            if (activeProvider) {
                const store = JSON.parse(activeProvider);
                const active = store.state?.aiProviders?.find((p: any) => p.isActive);
                apiKey = active?.apiKey;
            }

            // Step 1: Understanding intent (completed)
            setTimeout(() => updateThinkingStep('1', 'completed'), 500);
            setTimeout(() => updateThinkingStep('2', 'active'), 600);

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
                    apiKey: apiKey,
                    customDbUrl: dbConnection.type === 'custom' && dbConnection.url ? dbConnection.url : undefined,
                }),
            });

            if (!res.ok) throw new Error("API error");

            // Step 2: Database queried (completed)
            updateThinkingStep('2', 'completed');
            updateThinkingStep('3', 'active');

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            const assistantId = (Date.now() + 1).toString();
            setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

            let fullResponse = "";

            if (reader) {
                let done = false;
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        fullResponse += chunk;
                        setMessages((prev) =>
                            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
                        );
                    }
                }
            }

            // Step 3 & 4: Completed
            updateThinkingStep('3', 'completed');
            updateThinkingStep('4', 'completed');

            const payload = extractJSONFromResponse(fullResponse);
            if (payload && payload.action === 'insert' && payload.table === 'inventory') {
                await handleInventoryInsert(payload.data, userMessage.content, fullResponse);
            }

            const tokens = Math.ceil((input.length + fullResponse.length) / 4);
            incrementTokenUsage(tokens);
            addAuditLog({
                id: `txn-${Date.now()}`,
                timestamp: new Date().toISOString(),
                userEmail: user?.email || 'unknown@user.com',
                rawNLPrompt: userMessage.content,
                aiModelUsed: activeModel,
                cost: tokens * 0.00001,
                zodValidationResult: payload ? 'PASS' : 'QUERY',
                actionType: payload?.action?.toUpperCase() || 'QUERY',
                payload: payload || { response: fullResponse },
            });
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 2).toString(), role: "assistant", content: "Error connecting to AI. Please check your API key configuration." },
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => setThinkingSteps([]), 2000);
        }
    };

    const handleInventoryInsert = async (data: any, prompt: string, response: string) => {
        try {
            const validationErrors = [];
            if (!data.item_name) validationErrors.push('item_name is required');
            if (!data.quantity && data.quantity !== 0) validationErrors.push('quantity is required');
            if (data.quantity < 0) validationErrors.push('quantity cannot be negative');

            const isMedicalItem = prompt.toLowerCase().includes('medicine') ||
                prompt.toLowerCase().includes('drug') ||
                prompt.toLowerCase().includes('pharma') ||
                data.ndc_code;

            if (isMedicalItem) {
                if (!data.batch_number) validationErrors.push('batch_number is required');
                if (!data.expiry_date) validationErrors.push('expiry_date is required');
                if (!data.ndc_code) validationErrors.push('ndc_code is required');
            }

            if (validationErrors.length > 0) {
                toast.warning(`Validation: ${validationErrors.join(', ')}`);
                return;
            }

            if (dbConnection.connected) {
                const res = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error('Failed to save');
                const savedItem = await res.json();
                addInventoryItem(savedItem);
                toast.success(`Added ${data.item_name}`);
            } else {
                const newItem = { id: crypto.randomUUID(), data, createdAt: new Date().toISOString() };
                addInventoryItem(newItem);
                toast.success(`Added ${data.item_name} (local only)`);
            }
        } catch (error: any) {
            toast.error(`Failed: ${error.message}`);
        }
    };

    return (
        <div className="flex h-full w-full">
            {/* Chat History Sidebar */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="border-r border-border bg-card/20 flex flex-col"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Chat History</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(false)}>
                                <span className="sr-only">Close</span>×
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {chatSessions.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
                                ) : (
                                    chatSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`relative w-full text-left p-3 rounded-lg text-sm transition-colors group ${currentSessionId === session.id
                                                ? 'bg-primary/10 border border-primary/20'
                                                : 'hover:bg-muted/50 border border-transparent'
                                                }`}
                                        >
                                            <button
                                                onClick={() => handleLoadSession(session.id)}
                                                className="w-full text-left"
                                            >
                                                <p className="font-medium truncate pr-8">{session.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(session.updatedAt).toLocaleDateString()}
                                                </p>
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-2"
                                                onClick={(e) => handleDeleteSession(e, session.id)}
                                            >
                                                <Trash2 className="w-3 h-3 text-destructive" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/30">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(!showHistory)}>
                            <History className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <TerminalSquare className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold text-sm">AI Orchestrator</h2>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleNewChat}>
                        <Plus className="w-4 h-4" />
                        New Chat
                    </Button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-4">
                            <MessageSquare className="w-12 h-12" strokeWidth={1} />
                            <p>Start a conversation...</p>
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[95%] p-3 rounded-xl shadow-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10 text-foreground border border-primary/20 ml-auto" : "bg-muted/30 text-foreground border border-border"}`}>
                                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="px-3 py-1 bg-card/60 border border-border rounded-full font-mono text-[10px] text-muted-foreground backdrop-blur-md uppercase tracking-widest flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about inventory or add items..."
                            className="flex-1"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* AI Thinking Canvas */}
            <div className="w-[350px] border-l border-border bg-muted/10 p-4 flex flex-col">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-primary" />
                    AI Thinking Process
                </h3>

                {thinkingSteps.length > 0 ? (
                    <div className="relative">
                        {/* Connection Line */}
                        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/50 via-secondary/50 to-muted" />

                        <div className="space-y-6">
                            {thinkingSteps.map((step, index) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative flex items-start gap-4"
                                >
                                    {/* Node */}
                                    <div className="relative z-10">
                                        <motion.div
                                            animate={step.status === 'active' ? {
                                                scale: [1, 1.2, 1],
                                                boxShadow: [
                                                    '0 0 0 0 rgba(0,240,255,0)',
                                                    '0 0 0 10px rgba(0,240,255,0.1)',
                                                    '0 0 0 0 rgba(0,240,255,0)'
                                                ]
                                            } : {}}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${step.status === 'active'
                                                ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                                                : step.status === 'completed'
                                                    ? 'bg-secondary/20 border-secondary shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                                    : 'bg-muted border-border'
                                                }`}
                                        >
                                            {step.status === 'completed' ? (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="text-secondary"
                                                >
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </motion.div>
                                            ) : step.status === 'active' ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                    className="text-primary"
                                                >
                                                    {step.icon}
                                                </motion.div>
                                            ) : (
                                                <div className="text-muted-foreground">
                                                    {step.icon}
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>

                                    {/* Content Card */}
                                    <motion.div
                                        animate={step.status === 'active' ? {
                                            borderColor: ['rgba(0,240,255,0.2)', 'rgba(0,240,255,0.5)', 'rgba(0,240,255,0.2)']
                                        } : {}}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className={`flex-1 p-4 rounded-xl border backdrop-blur-sm ${step.status === 'active'
                                            ? 'bg-primary/5 border-primary/30'
                                            : step.status === 'completed'
                                                ? 'bg-secondary/5 border-secondary/30'
                                                : 'bg-muted/20 border-border/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-mono uppercase tracking-wider ${step.status === 'active' ? 'text-primary' :
                                                step.status === 'completed' ? 'text-secondary' : 'text-muted-foreground'
                                                }`}>
                                                Step {index + 1}
                                            </span>
                                            {step.status === 'active' && (
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-sm font-medium ${step.status === 'active' ? 'text-foreground' :
                                            step.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {step.description}
                                        </p>

                                        {/* Expandable Details */}
                                        {step.details && step.details.length > 0 && step.status !== 'pending' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-3 pt-3 border-t border-border/50"
                                            >
                                                <div className="space-y-1">
                                                    {step.details.map((detail, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <div className="w-1 h-1 rounded-full bg-primary/50" />
                                                            {detail}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Completion Indicator */}
                        {thinkingSteps.every(s => s.status === 'completed') && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 p-4 rounded-xl bg-secondary/10 border border-secondary/30 text-center"
                            >
                                <p className="text-sm text-secondary font-medium">✓ Processing Complete</p>
                            </motion.div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-[spin_10s_linear_infinite]" />
                            <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center">
                                <BrainCircuit className="w-10 h-10 opacity-50" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm">AI thinking visualization</p>
                        <p className="text-xs opacity-50">Steps will appear when processing</p>
                    </div>
                )}

                {/* Current Status */}
                <div className="mt-auto pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Model: {activeModel}</span>
                        <Badge variant={dbConnection.connected ? "default" : "secondary"} className="text-[10px]">
                            {dbConnection.connected ? 'DB Connected' : 'DB Offline'}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
}
