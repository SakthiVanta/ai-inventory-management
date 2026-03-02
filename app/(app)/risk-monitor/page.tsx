"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldOff, AlertTriangle, HeartPulse, XOctagon, CheckCircle2, Activity, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface Violation {
    id: string;
    type: "BLOCKED" | "WARNING" | "RESOLVED";
    message: string;
    model: string;
    timestamp: string;
    severity: "critical" | "warning" | "info";
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function RiskMonitorPage() {
    const { auditLogs, tokenUsage } = useAppStore();
    const [metrics, setMetrics] = useState({
        blockedActions: 0,
        missingBatches: 0,
        tokenHealth: 0,
    });
    const [violations, setViolations] = useState<Violation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Calculate metrics from real audit logs
        const blocked = auditLogs.filter((log: any) => log.zodValidationResult === 'BLOCKED').length;
        const missingBatch = auditLogs.filter((log: any) =>
            log.zodValidationResult === 'CLARIFICATION' &&
            log.payload?.missing_fields?.includes('batch_number')
        ).length;

        setMetrics({
            blockedActions: blocked,
            missingBatches: missingBatch,
            tokenHealth: Math.round(((128000 - tokenUsage) / 128000) * 100),
        });

        // Convert audit logs to violations format
        const recentViolations: Violation[] = auditLogs
            .filter((log: any) => log.zodValidationResult !== 'PASS')
            .slice(0, 10)
            .map((log: any, idx: number) => ({
                id: log.id || `v-${idx}`,
                type: log.zodValidationResult === 'BLOCKED' ? 'BLOCKED' :
                    log.zodValidationResult === 'CLARIFICATION' ? 'WARNING' : 'RESOLVED',
                message: log.payload?.reason || log.rawNLPrompt || 'Unknown action',
                model: log.aiModelUsed || 'unknown',
                timestamp: log.timestamp || new Date().toISOString(),
                severity: log.zodValidationResult === 'BLOCKED' ? 'critical' :
                    log.zodValidationResult === 'CLARIFICATION' ? 'warning' : 'info',
            }));

        setViolations(recentViolations.length > 0 ? recentViolations : []);
        setIsLoading(false);
    }, [auditLogs, tokenUsage]);

    const metricCards = [
        {
            title: "Blocked Destructive Actions",
            value: metrics.blockedActions.toString(),
            subtitle: "Schema deletions / type changes intercepted",
            icon: ShieldOff,
            color: "text-destructive",
            bgGlow: ""
        },
        {
            title: "Missing Batch Numbers",
            value: metrics.missingBatches.toString(),
            subtitle: "Items pending compliance fields",
            icon: AlertTriangle,
            color: "text-amber-400",
            bgGlow: ""
        },
        {
            title: "Token Health",
            value: `${metrics.tokenHealth}%`,
            subtitle: "Context window utilization",
            icon: HeartPulse,
            color: "text-primary",
            bgGlow: ""
        },
    ];

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-primary" /> Risk & Compliance Monitor
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Real-time validation failures, policy violations, and system health.</p>
            </div>

            {/* Metric Cards */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                variants={container}
                initial="hidden"
                animate="show"
            >
                {metricCards.map((metric) => (
                    <motion.div key={metric.title} variants={item}>
                        <Card className={`bg-card/40 backdrop-blur-sm border-border hover:border-primary/20 transition-all ${metric.bgGlow}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                                <metric.icon className={`w-5 h-5 ${metric.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-4xl font-bold font-mono ${metric.color}`}>{metric.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Violation Feed */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Policy Violation Feed</h2>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : violations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Activity className="w-12 h-12 mb-4 opacity-30" />
                        <p className="text-lg font-medium">No violations detected</p>
                        <p className="text-sm">All actions are passing compliance checks</p>
                    </div>
                ) : (
                    <motion.div
                        className="space-y-3"
                        variants={container}
                        initial="hidden"
                        animate="show"
                    >
                        {violations.map((v) => (
                            <motion.div
                                key={v.id}
                                variants={item}
                                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${v.severity === "critical"
                                    ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
                                    : v.severity === "warning"
                                        ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40"
                                        : "border-border bg-card/20 hover:border-secondary/30"
                                    }`}
                            >
                                <div className="pt-0.5">
                                    {v.type === "BLOCKED" ? (
                                        <XOctagon className="w-5 h-5 text-destructive" />
                                    ) : v.type === "WARNING" ? (
                                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-secondary" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] ${v.type === "BLOCKED"
                                                ? "border-destructive/40 text-destructive bg-destructive/10"
                                                : v.type === "WARNING"
                                                    ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                                    : "border-secondary/40 text-secondary bg-secondary/10"
                                                }`}
                                        >
                                            {v.type}
                                        </Badge>
                                        <span className="text-xs font-mono text-muted-foreground">{v.model}</span>
                                    </div>
                                    <p className="text-sm text-foreground">{v.message}</p>
                                    <span className="text-[11px] font-mono text-muted-foreground/60 mt-1 block">
                                        {new Date(v.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
