"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, History, AlertTriangle, Search, Loader2, Database, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

interface InventoryItem {
    id: string;
    data: {
        item_name: string;
        batch_number?: string;
        ndc_code?: string;
        quantity: number;
        unit: string;
        expiry_date?: string;
        storage_temperature?: number;
    };
    createdAt: string;
}

// Sample medical inventory seed data (includes expired, expiring soon, and low-stock items)
const SEED_DATA = [
    // Normal items
    { item_name: "Paracetamol 500mg", batch_number: "BATCH-2026-A1", ndc_code: "12345-678-01", quantity: 500, unit: "boxes", expiry_date: "2026-12-15", storage_temperature: null },
    { item_name: "Metformin 500mg", batch_number: "BATCH-2026-D2", ndc_code: "12345-678-04", quantity: 1000, unit: "tablets", expiry_date: "2027-08-30", storage_temperature: null },
    { item_name: "Ibuprofen 400mg", batch_number: "BATCH-2026-F8", ndc_code: "12345-678-06", quantity: 750, unit: "bottles", expiry_date: "2026-11-20", storage_temperature: null },
    { item_name: "Aspirin 81mg", batch_number: "BATCH-2026-G2", ndc_code: "12345-678-07", quantity: 1200, unit: "tablets", expiry_date: "2027-02-28", storage_temperature: null },
    { item_name: "Omeprazole 20mg", batch_number: "BATCH-2026-H9", ndc_code: "12345-678-08", quantity: 320, unit: "capsules", expiry_date: "2027-05-15", storage_temperature: null },
    // Cold-chain items
    { item_name: "Insulin Glargine", batch_number: "BATCH-2026-C7", ndc_code: "12345-678-03", quantity: 50, unit: "vials", expiry_date: "2026-06-20", storage_temperature: 4 },
    { item_name: "mRNA Vaccine Dose", batch_number: "BATCH-2026-K1", ndc_code: "12345-678-11", quantity: 200, unit: "doses", expiry_date: "2026-09-01", storage_temperature: -20 },
    // EXPIRED items (past dates)
    { item_name: "Amoxicillin 250mg", batch_number: "BATCH-2025-B3", ndc_code: "12345-678-02", quantity: 45, unit: "bottles", expiry_date: "2025-11-30", storage_temperature: null },
    { item_name: "Ciprofloxacin 500mg", batch_number: "BATCH-2025-J4", ndc_code: "12345-678-10", quantity: 120, unit: "tablets", expiry_date: "2026-01-15", storage_temperature: null },
    // EXPIRING SOON (within 30 days)
    { item_name: "Epinephrine Auto-Injector", batch_number: "BATCH-2026-E5", ndc_code: "12345-678-05", quantity: 25, unit: "injectors", expiry_date: "2026-03-20", storage_temperature: 8 },
    { item_name: "Lorazepam 1mg", batch_number: "BATCH-2026-L6", ndc_code: "12345-678-12", quantity: 60, unit: "tablets", expiry_date: "2026-03-15", storage_temperature: null },
    // LOW STOCK items
    { item_name: "Naloxone Nasal Spray", batch_number: "BATCH-2026-I3", ndc_code: "12345-678-09", quantity: 3, unit: "kits", expiry_date: "2027-01-10", storage_temperature: null },
];

function daysUntilExpiry(dateStr?: string) {
    if (!dateStr) return null;
    const now = new Date();
    const expiry = new Date(dateStr);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const { dbConnection, addInventoryItem, inventory } = useAppStore();

    useEffect(() => {
        // Use items from store if available, otherwise fetch
        if (inventory && inventory.length > 0) {
            setItems(inventory);
            setIsLoading(false);
        } else {
            fetchInventory();
        }
    }, [inventory]);

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/inventory');
            if (!response.ok) throw new Error('Failed to fetch inventory');
            const data = await response.json();
            setItems(data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            // Don't show error toast - empty state is fine
        } finally {
            setIsLoading(false);
        }
    };

    const handleSeedData = async () => {
        setIsSeeding(true);
        try {
            const res = await fetch('/api/seed', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Seed failed');
            }

            toast.success(data.message || `Seeded ${data.inventoryItems} items and ${data.schemaFields} schema fields`);
            fetchInventory();
        } catch (error: any) {
            toast.error(error.message || 'Failed to seed data');
        } finally {
            setIsSeeding(false);
        }
    };

    const filtered = items.filter(item =>
        item.data?.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.data?.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.data?.ndc_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Master Inventory</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {dbConnection.connected
                            ? `Connected to ${dbConnection.type === 'default' ? 'default schema' : 'custom database'}`
                            : 'Database not connected - data stored locally'
                        }
                    </p>
                </div>
                <div className="flex gap-2">
                    {items.length === 0 && (
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleSeedData}
                            disabled={isSeeding}
                        >
                            {isSeeding ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Seed Sample Data</>
                            )}
                        </Button>
                    )}
                    <Button className="gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Add via AI
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search items or batch numbers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card/40 border-border"
                />
            </div>

            {/* Data Table */}
            <div className="rounded-xl border border-border overflow-hidden bg-card/20 backdrop-blur-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Database className="w-12 h-12 mb-4 opacity-30" />
                        <p className="text-lg font-medium">No inventory items found</p>
                        <p className="text-sm mb-4">Add items using the AI orchestrator or seed sample data</p>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleSeedData}
                            disabled={isSeeding}
                        >
                            {isSeeding ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Seed Sample Data</>
                            )}
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="text-xs font-mono uppercase text-muted-foreground">Item</TableHead>
                                <TableHead className="text-xs font-mono uppercase text-muted-foreground">Batch #</TableHead>
                                <TableHead className="text-xs font-mono uppercase text-muted-foreground">NDC</TableHead>
                                <TableHead className="text-xs font-mono uppercase text-muted-foreground text-right">Qty</TableHead>
                                <TableHead className="text-xs font-mono uppercase text-muted-foreground">Expiry</TableHead>
                                <TableHead className="text-xs font-mono uppercase text-muted-foreground">Temp</TableHead>
                                <TableHead className="text-xs font-mono uppercase text-muted-foreground text-right">Lineage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((row, i) => {
                                const days = daysUntilExpiry(row.data?.expiry_date);
                                const isExpiringSoon = days !== null && days < 30 && days >= 0;
                                const isExpired = days !== null && days < 0;

                                return (
                                    <motion.tr
                                        key={row.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05, duration: 0.3 }}
                                        onMouseEnter={() => setHoveredRow(row.id)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        className={`border-border transition-colors duration-200 cursor-default ${isExpired ? "bg-destructive/5 hover:bg-destructive/10" :
                                            isExpiringSoon ? "bg-amber-500/5 hover:bg-amber-500/10" :
                                                "hover:bg-muted/20"
                                            }`}
                                    >
                                        <TableCell className="font-medium text-foreground">{row.data?.item_name || 'Unknown'}</TableCell>
                                        <TableCell className="font-mono text-sm text-muted-foreground">{row.data?.batch_number || '-'}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{row.data?.ndc_code || '-'}</TableCell>
                                        <TableCell className="text-right font-mono font-semibold">{(row.data?.quantity || 0).toLocaleString()} {row.data?.unit}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono text-sm ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-400" : "text-muted-foreground"}`}>
                                                    {row.data?.expiry_date || '-'}
                                                </span>
                                                {(isExpiringSoon || isExpired) && (
                                                    <Badge variant="outline" className={`text-[10px] ${isExpired ? "border-destructive/40 text-destructive bg-destructive/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"}`}>
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        {isExpired ? "EXPIRED" : `${days}d`}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {row.data?.storage_temperature !== null && row.data?.storage_temperature !== undefined ? (
                                                <span className="font-mono text-sm text-sky-400">{row.data.storage_temperature}°C</span>
                                            ) : (
                                                <span className="text-muted-foreground/30 text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {hoveredRow === row.id ? (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="inline-block"
                                                >
                                                    <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 h-7">
                                                        <History className="w-3 h-3" /> Lineage
                                                    </Button>
                                                </motion.div>
                                            ) : (
                                                <span className="text-muted-foreground/20 text-xs">•••</span>
                                            )}
                                        </TableCell>
                                    </motion.tr>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
