"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronDown, ChevronRight, CheckCircle2, XOctagon, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function statusIcon(result: string) {
    if (result === "PASS") return <CheckCircle2 className="w-4 h-4 text-secondary" />;
    if (result === "BLOCKED") return <XOctagon className="w-4 h-4 text-destructive" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
}

function statusColor(result: string) {
    if (result === "PASS") return "border-secondary/30 text-secondary bg-secondary/10";
    if (result === "BLOCKED") return "border-destructive/30 text-destructive bg-destructive/10";
    return "border-amber-500/30 text-amber-400 bg-amber-500/10";
}

export default function AuditLogPage() {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { auditLogs } = useAppStore();

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Activity className="w-6 h-6 text-primary" /> Immutable Audit Log
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {auditLogs.length > 0
                        ? `Showing ${auditLogs.length} recorded action${auditLogs.length !== 1 ? 's' : ''} with full data lineage.`
                        : 'Every AI action recorded with full data lineage. Non-deletable.'
                    }
                </p>
            </div>

            {/* Timeline */}
            {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <FileText className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No audit logs yet</p>
                    <p className="text-sm">Actions performed through the AI orchestrator will appear here</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-border" />

                    <div className="space-y-4">
                        {auditLogs.map((entry: any, i: number) => (
                            <motion.div
                                key={entry.id || i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08, duration: 0.4 }}
                                className="relative pl-14"
                            >
                                {/* Timeline dot */}
                                <div className="absolute left-[18px] top-4 w-3 h-3 rounded-full border-2 border-background bg-muted-foreground/40 z-10" />

                                <div
                                    className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 ${expandedId === entry.id
                                        ? "border-primary/30 bg-primary/5"
                                        : "border-border bg-card/20 hover:border-primary/20 hover:bg-card/30"
                                        }`}
                                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                >
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            {statusIcon(entry.zodValidationResult || 'PASS')}
                                            <Badge variant="outline" className={`text-[10px] ${statusColor(entry.zodValidationResult || 'PASS')}`}>
                                                {entry.zodValidationResult || 'PASS'}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                                {entry.actionType || 'ACTION'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <span className="text-[10px] font-mono">{entry.id || `txn-${String(i + 1).padStart(4, '0')}`}</span>
                                            {expandedId === entry.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </div>
                                    </div>

                                    {/* Summary Row */}
                                    <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
                                        <div>
                                            <p className="text-sm text-foreground leading-relaxed">"{entry.rawNLPrompt || 'No prompt recorded'}"</p>
                                            <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-muted-foreground/70">
                                                <span>{entry.userEmail || 'unknown@user.com'}</span>
                                                <span>•</span>
                                                <span>{entry.aiModelUsed || 'unknown-model'}</span>
                                                <span>•</span>
                                                <span>${(entry.cost || 0).toFixed(4)}</span>
                                                <span>•</span>
                                                <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : new Date().toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded JSON Payload */}
                                    <AnimatePresence>
                                        {expandedId === entry.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 pt-4 border-t border-border">
                                                    <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-wider">Payload</div>
                                                    <pre className="text-xs font-mono text-foreground/80 bg-muted/30 p-3 rounded-lg overflow-x-auto">
                                                        {JSON.stringify(entry.payload || {}, null, 2)}
                                                    </pre>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
