"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Snowflake, Lock, Plus, Hash, Calendar, Thermometer, Pill, Package, Database, Loader2, Link2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

interface Column {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
}

interface Relation {
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
}

interface TableInfo {
    table_name: string;
    columns: Column[];
    relations: Relation[];
}

// Define which tables are MEDICAL/INVENTORY related vs APPLICATION tables
const MEDICAL_INVENTORY_TABLES = ['InventoryItem', 'Product', 'Batch', 'Supplier', 'StockMovement', 'Category'];
const APPLICATION_TABLES = ['User', 'Session', 'AIProviderConfig', 'AuditLog', 'SchemaField'];

const getColumnIcon = (columnName: string, dataType: string) => {
    if (columnName.includes('batch')) return Hash;
    if (columnName.includes('date') || columnName.includes('time')) return Calendar;
    if (columnName.includes('temp')) return Thermometer;
    if (columnName.includes('ndc') || columnName.includes('drug') || columnName.includes('medicine')) return Pill;
    if (columnName.includes('quantity') || columnName.includes('item') || columnName.includes('stock')) return Package;
    if (dataType === 'jsonb' || dataType === 'json') return Database;
    return Table2;
};

const getComplianceBadges = (columnName: string) => {
    const badges = [];
    if (columnName === 'batch_number') {
        badges.push({ label: "Required by DSCSA", icon: ShieldAlert, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" });
    }
    if (columnName === 'expiry_date') {
        badges.push({ label: "Required by DSCSA", icon: ShieldAlert, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" });
    }
    if (columnName === 'ndc_code') {
        badges.push({ label: "National Drug Code", icon: Pill, color: "text-purple-400 border-purple-500/30 bg-purple-500/10" });
    }
    if (columnName === 'storage_temperature') {
        badges.push({ label: "Cold Chain", icon: Snowflake, color: "text-sky-400 border-sky-500/30 bg-sky-500/10" });
    }
    return badges;
};

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function SchemaPage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { dbConnection } = useAppStore();

    useEffect(() => {
        fetchSchema();
    }, []);

    const fetchSchema = async () => {
        setIsLoading(true);
        try {
            // Always use default schema for medical inventory view
            const response = await fetch('/api/schema');
            if (!response.ok) throw new Error('Failed to fetch default schema');
            const data = await response.json();

            // Filter to show ONLY medical/inventory related tables
            // NOT application tables like User, Session, AuditLog, etc.
            const medicalTables = (data.tables || []).filter((table: TableInfo) => {
                // Include only inventory/medical tables
                return MEDICAL_INVENTORY_TABLES.includes(table.table_name);
            });

            setTables(medicalTables);
        } catch (error) {
            console.error('Error fetching schema:', error);
            toast.error('Failed to load schema.');
            setTables([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Schema Registry</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Medical Inventory Schema - {tables.length} table{tables.length !== 1 ? 's' : ''} defined
                    </p>
                </div>
                <Button className="gap-2 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Field via AI
                </Button>
            </div>

            {/* Additive-Only Banner */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
                <Lock className="w-5 h-5 text-primary shrink-0" />
                <span className="text-muted-foreground">
                    <strong className="text-foreground">Additive-Only Policy Active.</strong> Schema fields can only be added, never removed or type-changed. This ensures immutable data lineage for DSCSA compliance.
                </span>
            </div>

            {/* Schema Tables - ONLY Medical/Inventory Tables */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Database className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No inventory schema defined</p>
                    <p className="text-sm">Connect a database or add fields to see your medical inventory schema</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {tables.map((table) => (
                        <div key={table.table_name} className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Table2 className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">{table.table_name}</h2>
                                <Badge variant="outline" className="text-[10px]">
                                    {table.columns.length} fields
                                </Badge>
                                {table.relations.length > 0 && (
                                    <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary bg-secondary/10">
                                        <Link2 className="w-3 h-3 mr-1" />
                                        {table.relations.length} relations
                                    </Badge>
                                )}
                            </div>

                            {/* Relations */}
                            {table.relations.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {table.relations.map((rel, idx) => (
                                        <div key={idx} className="text-[10px] px-2 py-1 rounded border border-secondary/20 bg-secondary/5 text-muted-foreground flex items-center gap-1">
                                            <Link2 className="w-3 h-3" />
                                            {rel.column_name} → {rel.foreign_table_name}.{rel.foreign_column_name}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Columns Grid */}
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                                variants={container}
                                initial="hidden"
                                animate="show"
                            >
                                {table.columns.map((column) => {
                                    const Icon = getColumnIcon(column.column_name, column.data_type);
                                    const badges = getComplianceBadges(column.column_name);
                                    const isRequired = column.is_nullable === 'NO';

                                    return (
                                        <motion.div
                                            key={column.column_name}
                                            variants={item}
                                            className="group relative rounded-xl border border-border bg-card/40 backdrop-blur-sm p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground group-hover:text-primary transition-colors">
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-mono font-semibold text-foreground text-sm">{column.column_name}</h3>
                                                        <span className="font-mono text-xs text-muted-foreground">{column.data_type}</span>
                                                    </div>
                                                </div>
                                                {isRequired && (
                                                    <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary bg-secondary/10">
                                                        Required
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Compliance Badges */}
                                            {badges.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {badges.map((badge) => (
                                                        <div key={badge.label} className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md border ${badge.color}`}>
                                                            <badge.icon className="w-3 h-3" />
                                                            {badge.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Default value */}
                                            {column.column_default && (
                                                <div className="mt-3 text-[10px] text-muted-foreground font-mono">
                                                    Default: {column.column_default}
                                                </div>
                                            )}

                                            {/* Lock icon for additive-only */}
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
