"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Lock, ShieldCheck, Settings2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PolicyToggle {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    locked: boolean;
    badge?: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function PoliciesPage() {
    const [policies, setPolicies] = useState<PolicyToggle[]>([
        { id: "additive-only", label: "Enforce Additive-Only Schema", description: "Schema fields can only be added, never removed or type-changed. Required for DSCSA compliance.", enabled: true, locked: true, badge: "DSCSA Required" },
        { id: "batch-approval", label: "Require Approval for Batches > 10,000 units", description: "Any insertion exceeding 10,000 units will pause and require manual approval before committing.", enabled: true, locked: false },
        { id: "fallback-correction", label: "Enable Fallback Auto-Correction", description: "When AI generates invalid tool output, retry up to 3 times with error feedback before failing.", enabled: true, locked: false },
        { id: "non-negative", label: "Enforce Non-Negative Quantities", description: "All quantity fields must be ≥ 0. Negative values are blocked by the policy engine.", enabled: true, locked: true, badge: "Safety Critical" },
        { id: "expiry-required", label: "Require Expiry Date on Medical Items", description: "All pharmaceutical inventory items must have an expiry date before insertion.", enabled: true, locked: false },
        { id: "audit-logging", label: "Full Audit Logging", description: "Record every AI action including prompt, model, cost, validation result, and payload.", enabled: true, locked: true, badge: "Compliance" },
    ]);

    const handleToggle = (policyId: string) => {
        const policy = policies.find(p => p.id === policyId);
        if (policy?.locked) {
            toast.info(`${policy.label} is locked and cannot be disabled due to compliance requirements.`);
            return;
        }

        setPolicies(prev => prev.map(p =>
            p.id === policyId ? { ...p, enabled: !p.enabled } : p
        ));

        const updatedPolicy = policies.find(p => p.id === policyId);
        if (updatedPolicy) {
            toast.success(`${updatedPolicy.label} ${updatedPolicy.enabled ? 'disabled' : 'enabled'}`);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Settings2 className="w-6 h-6 text-primary" /> Project Settings & Policy Control
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Configure compliance policies, safety rules, and AI execution parameters.</p>
            </div>

            <motion.div className="space-y-3" variants={container} initial="hidden" animate="show">
                {policies.map((policy) => (
                    <motion.div key={policy.id} variants={item}>
                        <Card className={`bg-card/40 backdrop-blur-sm border-border transition-all ${policy.locked ? "border-primary/10" : "hover:border-primary/20"}`}>
                            <CardContent className="flex items-center justify-between py-4 px-5">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className={`p-2 rounded-lg mt-0.5 ${policy.locked ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                                        {policy.locked ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm text-foreground">{policy.label}</span>
                                            {policy.badge && (
                                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">{policy.badge}</Badge>
                                            )}
                                            {policy.locked && (
                                                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    Locked
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{policy.description}</p>
                                    </div>
                                </div>
                                <div className="ml-4 shrink-0">
                                    <Switch
                                        checked={policy.enabled}
                                        onCheckedChange={() => handleToggle(policy.id)}
                                        disabled={policy.locked}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
