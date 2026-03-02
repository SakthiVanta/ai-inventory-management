import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    company: string;
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

    // AI Provider API Keys
    aiProviders: AIProvider[];
    setAIProviders: (providers: AIProvider[]) => void;
    updateProviderKey: (id: string, apiKey: string) => void;
    getActiveProviderKey: () => string | null;

    // Project State
    projectContext: string;
    setProjectContext: (context: string) => void;

    // Database Connection
    dbConnection: DBConnection;
    setDBConnection: (connection: DBConnection) => void;

    // Authentication
    user: User | null;
    isAuthenticated: boolean;
    is2FAEnabled: boolean;
    login: (user: User) => void;
    logout: () => void;
    set2FAEnabled: (enabled: boolean) => void;

    // Inventory (real data)
    inventory: any[];
    setInventory: (items: any[]) => void;
    addInventoryItem: (item: any) => void;

    // Audit Log
    auditLogs: any[];
    addAuditLog: (log: any) => void;

    // Chat Sessions
    chatSessions: ChatSession[];
    currentSessionId: string | null;
    createNewSession: () => string;
    addMessageToSession: (sessionId: string, message: ChatMessage) => void;
    updateSessionTitle: (sessionId: string, title: string) => void;
    deleteSession: (sessionId: string) => void;
    setCurrentSession: (sessionId: string | null) => void;
    getCurrentSession: () => ChatSession | null;
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
                { id: 'google', name: 'Google Gemini', apiKey: '', isActive: true },
                { id: 'openai', name: 'OpenAI', apiKey: '', isActive: false },
                { id: 'anthropic', name: 'Anthropic', apiKey: '', isActive: false },
            ],
            setAIProviders: (providers) => set({ aiProviders: providers }),
            updateProviderKey: (id, apiKey) => set((state) => ({
                aiProviders: state.aiProviders.map(p => p.id === id ? { ...p, apiKey } : p)
            })),
            getActiveProviderKey: () => {
                const state = get();
                const activeProvider = state.aiProviders.find(p => p.isActive);
                return activeProvider?.apiKey || null;
            },

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
            login: (user) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false, is2FAEnabled: false, chatSessions: [], currentSessionId: null }),
            set2FAEnabled: (enabled) => set({ is2FAEnabled: enabled }),

            // Inventory
            inventory: [],
            setInventory: (items) => set({ inventory: items }),
            addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),

            // Audit Logs
            auditLogs: [],
            addAuditLog: (log) => set((state) => ({ auditLogs: [log, ...state.auditLogs] })),

            // Chat Sessions
            chatSessions: [],
            currentSessionId: null,
            createNewSession: () => {
                const newSession: ChatSession = {
                    id: crypto.randomUUID(),
                    title: 'New Conversation',
                    messages: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => ({
                    chatSessions: [newSession, ...state.chatSessions],
                    currentSessionId: newSession.id,
                }));
                return newSession.id;
            },
            addMessageToSession: (sessionId, message) => set((state) => ({
                chatSessions: state.chatSessions.map((session) =>
                    session.id === sessionId
                        ? {
                            ...session,
                            messages: [...session.messages, message],
                            updatedAt: new Date().toISOString(),
                            title: session.messages.length === 0 && message.role === 'user'
                                ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
                                : session.title
                        }
                        : session
                ),
            })),
            updateSessionTitle: (sessionId, title) => set((state) => ({
                chatSessions: state.chatSessions.map((session) =>
                    session.id === sessionId ? { ...session, title } : session
                ),
            })),
            deleteSession: (sessionId) => set((state) => ({
                chatSessions: state.chatSessions.filter((session) => session.id !== sessionId),
                currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
            })),
            setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
            getCurrentSession: () => {
                const state = get();
                return state.chatSessions.find((s) => s.id === state.currentSessionId) || null;
            },
        }),
        {
            name: 'asd-pharr-storage',
        }
    )
);
