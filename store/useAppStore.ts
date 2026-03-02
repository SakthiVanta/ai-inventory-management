import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    company: string | null;
    name: string;
}

export interface DBConnection {
    type: 'default' | 'custom';
    url?: string;
    connected: boolean;
}

export interface AIProvider {
    id: string;
    name: string;
    apiKey: string;
    isActive: boolean;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    metadata?: any;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

interface AppState {
    // AI Model State
    activeModel: string;
    setActiveModel: (model: string) => void;
    tokenUsage: number;
    incrementTokenUsage: (amount: number) => void;

    // AI Providers
    aiProviders: Array<{ id: string; name: string; apiKey: string; modelName: string; isActive: boolean }>;
    setAIProviders: (providers: any[]) => void;
    updateProviderKey: (providerId: string, apiKey: string) => void;

    // Project State
    projectContext: string;
    setProjectContext: (context: string) => void;

    // Database Connection
    dbConnection: DBConnection;
    setDBConnection: (connection: DBConnection) => void;

    // Authentication (synced with server session)
    user: User | null;
    isAuthenticated: boolean;
    is2FAEnabled: boolean;
    setUser: (user: User | null) => void;
    setIsAuthenticated: (value: boolean) => void;
    setIs2FAEnabled: (enabled: boolean) => void;
    logout: () => Promise<void>;

    // Inventory (now loaded from server)
    inventory: any[];
    setInventory: (items: any[]) => void;
    addInventoryItem: (item: any) => void;

    // Chat Sessions (now loaded from server)
    chatSessions: ChatSession[];
    currentSessionId: string | null;
    setCurrentSession: (sessionId: string | null) => void;
    addMessageToCurrentSession: (message: ChatMessage) => void;
    createNewSession: () => Promise<void>;
    addMessageToSession: (sessionId: string, message: ChatMessage) => void;
    deleteSession: (sessionId: string) => Promise<void>;
    getCurrentSession: () => ChatSession | undefined;

    // Audit Logs (immutable records)
    auditLogs: any[];
    setAuditLogs: (logs: any[]) => void;
    addAuditLog: (log: any) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // AI Model
            activeModel: 'gemini-2.5-flash',
            setActiveModel: (model) => set({ activeModel: model }),
            tokenUsage: 0,
            incrementTokenUsage: (amount) => set((state) => ({ tokenUsage: state.tokenUsage + amount })),

            // AI Providers
            aiProviders: [
                { id: "google", name: "Google Gemini", apiKey: "", modelName: "gemini-2.5-flash", isActive: true },
                { id: "openai", name: "OpenAI", apiKey: "", modelName: "gpt-4o", isActive: false },
                { id: "anthropic", name: "Anthropic", apiKey: "", modelName: "claude-3.5-sonnet", isActive: false },
            ],
            setAIProviders: (providers) => set({ aiProviders: providers }),
            updateProviderKey: (providerId, apiKey) => set((state) => ({
                aiProviders: state.aiProviders.map(p =>
                    p.id === providerId ? { ...p, apiKey } : p
                )
            })),

            // Project
            projectContext: 'New Project',
            setProjectContext: (context) => set({ projectContext: context }),

            // Database
            dbConnection: {
                type: 'default',
                connected: false,
            },
            setDBConnection: (connection) => set({ dbConnection: connection }),

            // Auth
            user: null,
            isAuthenticated: false,
            is2FAEnabled: false,
            setUser: (user) => set({ user }),
            setIsAuthenticated: (value) => set({ isAuthenticated: value }),
            setIs2FAEnabled: (enabled) => set({ is2FAEnabled: enabled }),
            logout: async () => {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                    console.error('Logout error:', e);
                }
                set({
                    user: null,
                    isAuthenticated: false,
                    is2FAEnabled: false,
                    chatSessions: [],
                    currentSessionId: null,
                    inventory: [],
                    auditLogs: [],
                });
            },

            // Inventory
            inventory: [],
            setInventory: (items) => set({ inventory: items }),
            addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),

            // Chat Sessions (client-side cache only - server is source of truth)
            chatSessions: [],
            currentSessionId: null,
            setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
            addMessageToCurrentSession: (message) => set((state) => {
                if (!state.currentSessionId) return state;

                return {
                    chatSessions: state.chatSessions.map((session) =>
                        session.id === state.currentSessionId
                            ? {
                                ...session,
                                messages: [...session.messages, message],
                                updatedAt: new Date().toISOString(),
                            }
                            : session
                    ),
                };
            }),
            createNewSession: async () => {
                const response = await fetch('/api/chat/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Conversation' }),
                });
                if (response.ok) {
                    const session = await response.json();
                    // Ensure messages array exists
                    const newSession = { ...session, messages: session.messages || [] };
                    set((state) => ({
                        chatSessions: [newSession, ...state.chatSessions],
                        currentSessionId: newSession.id,
                    }));
                }
            },
            addMessageToSession: async (sessionId, message) => {
                const response = await fetch('/api/chat/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...message, sessionId }),
                });
                if (response.ok) {
                    const savedMessage = await response.json();
                    set((state) => ({
                        chatSessions: state.chatSessions.map((session) =>
                            session.id === sessionId
                                ? {
                                    ...session,
                                    messages: [...(session.messages || []), savedMessage],
                                    updatedAt: new Date().toISOString(),
                                }
                                : session
                        ),
                    }));
                }
            },
            deleteSession: async (sessionId) => {
                await fetch(`/api/chat/sessions?id=${sessionId}`, { method: 'DELETE' });
                set((state) => ({
                    chatSessions: state.chatSessions.filter((s) => s.id !== sessionId),
                    currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
                }));
            },
            getCurrentSession: () => {
                const state = get();
                return state.chatSessions.find((s) => s.id === state.currentSessionId);
            },

            // Audit Logs - using a simple state approach; will batch-sync when API is ready
            auditLogs: [],
            setAuditLogs: (logs) => set({ auditLogs: logs }),
            addAuditLog: (log) => set((state) => ({ auditLogs: [log, ...state.auditLogs] })),
        }),
        {
            name: 'asd-pharr-storage',
            // Don't persist sensitive auth data - rely on HTTP-only cookie
            partialize: (state) => ({
                activeModel: state.activeModel,
                projectContext: state.projectContext,
                dbConnection: state.dbConnection,
                is2FAEnabled: state.is2FAEnabled,
                aiProviders: state.aiProviders,
                // Don't persist: user, isAuthenticated, inventory, chatSessions
            }),
        }
    )
);

// Helper to fetch current user on app load
export async function fetchCurrentUser(): Promise<User | null> {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
        return null;
    } catch (e) {
        console.error('Failed to fetch current user:', e);
        return null;
    }
}
