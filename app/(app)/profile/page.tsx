"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User,
    KeyRound,
    Monitor,
    ShieldCheck,
    Loader2,
    LogOut,
    AlertCircle,
    Save,
    Smartphone,
    Mail,
    Building2
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function ProfilePage() {
    const router = useRouter();
    const { user, logout, is2FAEnabled, setIs2FAEnabled } = useAppStore();
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDisabling2FA, setIsDisabling2FA] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        company: user?.company || '',
    });

    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: '',
    });

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setError("");

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success("Profile updated successfully");
        } catch (err) {
            setError("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.new !== passwordData.confirm) {
            setError("New passwords do not match");
            return;
        }

        if (passwordData.new.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsChangingPassword(true);
        setError("");

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success("Password updated successfully");
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (err) {
            setError("Failed to update password");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleLogout = () => {
        logout();
        toast.success("Logged out successfully");
        router.push("/login");
    };

    const handleDisable2FA = async () => {
        setIsDisabling2FA(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setIs2FAEnabled(false);
            toast.success("2FA disabled successfully");
        } catch (err) {
            toast.error("Failed to disable 2FA");
        } finally {
            setIsDisabling2FA(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <User className="w-6 h-6 text-primary" /> User Profile
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your account, security, and preferences.</p>
                </div>
                <Button variant="destructive" onClick={handleLogout} className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
                {/* Personal Info */}
                <motion.div variants={item}>
                    <Card className="bg-card/40 backdrop-blur-sm border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" /> Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <User className="w-3 h-3" /> Full Name
                                    </label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-background/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> Work Email
                                    </label>
                                    <Input
                                        value={formData.email}
                                        disabled
                                        className="bg-background/50 opacity-60"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Company
                                </label>
                                <Input
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="bg-background/50"
                                />
                            </div>
                            <Button
                                size="sm"
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="gap-2"
                            >
                                {isSaving ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Save Changes</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Password Reset */}
                <motion.div variants={item}>
                    <Card className="bg-card/40 backdrop-blur-sm border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <KeyRound className="w-4 h-4 text-primary" /> Change Password
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Current Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••••••"
                                    className="bg-background/50"
                                    value={passwordData.current}
                                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">New Password</label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••••••"
                                        className="bg-background/50"
                                        value={passwordData.new}
                                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••••••"
                                        className="bg-background/50"
                                        value={passwordData.confirm}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleChangePassword}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                                ) : (
                                    'Update Password'
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 2FA Status */}
                <motion.div variants={item}>
                    <Card className="bg-card/40 backdrop-blur-sm border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-primary" /> Two-Factor Authentication
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Smartphone className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-foreground font-medium">Google Authenticator</p>
                                        <p className="text-xs text-muted-foreground">
                                            {is2FAEnabled
                                                ? '2FA is enabled on your account'
                                                : '2FA is not enabled - your account is less secure'}
                                        </p>
                                    </div>
                                </div>
                                {is2FAEnabled ? (
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                                            Enabled
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive"
                                            onClick={handleDisable2FA}
                                            disabled={isDisabling2FA}
                                        >
                                            {isDisabling2FA ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Disable'
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => router.push('/setup-2fa')}
                                    >
                                        Enable 2FA
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Active Sessions - Static for now */}
                <motion.div variants={item}>
                    <Card className="bg-card/40 backdrop-blur-sm border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-primary" /> Active Session
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-3">
                                    <Monitor className="w-4 h-4 text-primary" />
                                    <div>
                                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                            Current Browser Session
                                            <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Active</Badge>
                                        </div>
                                        <div className="text-xs font-mono text-muted-foreground">
                                            {new Date().toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Logout Section */}
                <motion.div variants={item}>
                    <Card className="bg-destructive/5 border-destructive/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2 text-destructive">
                                <LogOut className="w-4 h-4" /> Sign Out
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Sign out from your account on this device. You will need to log in again to access your data.
                            </p>
                            <Button variant="destructive" onClick={handleLogout} className="gap-2">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}
