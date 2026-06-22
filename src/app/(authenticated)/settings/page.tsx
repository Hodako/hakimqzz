"use client";


import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  getBusinessSettingsFn,
  updateBusinessSettingsFn,
  createEmployeeLicenseFn,
  updateEmployeePermissionsFn,
  deleteLicenseFn,
} from "@/lib/rpc-admin";
import { Trash2, Lock, Unlock, ShieldAlert, Database, FileSpreadsheet, Key, RefreshCw, AlertTriangle } from "lucide-react";
import type { PermissionSet } from "@/lib/permissions";
import { DEFAULT_EMPLOYEE_PERMISSIONS } from "@/lib/permissions";
import {
  uploadImageFn,
  verifyOwnerPasswordFn,
  emptyCashboxFn,
  resetProductsFn,
  resetSalesFn,
  resetPurchasesFn,
  resetAllDataFn,
  bulkExportToGoogleSheetsFn,
  resetSomitiFn,
  resetExpensesFn,
  changeMyPasswordFn,
} from "@/lib/rpc";
import { useTheme, type ThemeMode, type AccentColor, type BgStyle } from "@/hooks/use-theme";
import { SpeedLoader } from "@/components/speed-loader";
import { useIsMobile } from "@/hooks/use-mobile";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";



const BUSINESS_TYPES = ["retail", "wholesale", "fashion", "grocery", "services"];

export default function SettingsPage() {
  const { t } = useT();
  const { user, refresh } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor, bgStyle, setBgStyle } = useTheme();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["business-settings"], queryFn: getBusinessSettingsFn });
  const [busy, setBusy] = useState(false);

  // Safety settings states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Sheets sync states
  const [isSheetsSaving, setIsSheetsSaving] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);

  // Reset states
  const [resetType, setResetType] = useState<"cashbox" | "products" | "sales" | "purchases" | "somiti" | "expenses" | "all" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [pwBusy, setPwBusy] = useState(false);

  async function handleUpdateMyPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") || "").trim();
    const newPassword = String(fd.get("newPassword") || "").trim();
    const confirmPassword = String(fd.get("confirmPassword") || "").trim();

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setPwBusy(true);
    try {
      await changeMyPasswordFn({ data: { currentPassword, newPassword } });
      toast.success("Password updated successfully!");
      e.currentTarget.reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPwBusy(false);
    }
  }

  const biz = settings.data?.business;
  const isOwner = settings.data?.role === "owner";

  async function handleVerifyPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUnlockLoading(true);
    try {
      await verifyOwnerPasswordFn({ data: { password: unlockPassword } });
      setIsUnlocked(true);
      setIsUnlockDialogOpen(false);
      setUnlockPassword("");
      toast.success("Safety settings unlocked successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Incorrect owner password.");
    } finally {
      setUnlockLoading(false);
    }
  }

  async function saveGoogleSheetsConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isOwner) return;
    const fd = new FormData(e.currentTarget);
    setIsSheetsSaving(true);
    try {
      await updateBusinessSettingsFn({
        data: {
          google_sheets_spreadsheet_id: String(fd.get("google_sheets_spreadsheet_id") || "").trim(),
          google_sheets_credentials_json: String(fd.get("google_sheets_credentials_json") || "").trim(),
        },
      });
      qc.invalidateQueries({ queryKey: ["business-settings"] });
      toast.success("Google Sheets config saved successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSheetsSaving(false);
    }
  }

  async function handleBulkExport() {
    if (!isOwner) return;
    setIsBulkExporting(true);
    try {
      await bulkExportToGoogleSheetsFn();
      toast.success("Successfully synchronized all data to Google Sheets!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBulkExporting(false);
    }
  }

  async function handleResetAction() {
    if (!resetType || !isOwner) return;
    if (confirmText !== "CONFIRM") {
      toast.error("Please type CONFIRM to authorize the reset.");
      return;
    }
    setResetLoading(true);
    try {
      if (resetType === "cashbox") {
        await emptyCashboxFn();
        toast.success("Cashbox entries emptied successfully!");
      } else if (resetType === "products") {
        await resetProductsFn();
        toast.success("Products data reset successfully!");
      } else if (resetType === "sales") {
        await resetSalesFn();
        toast.success("Sales and Returns data reset successfully!");
      } else if (resetType === "purchases") {
        await resetPurchasesFn();
        toast.success("Purchases data reset successfully!");
      } else if (resetType === "somiti") {
        await resetSomitiFn();
        toast.success("Samity data reset successfully!");
      } else if (resetType === "expenses") {
        await resetExpensesFn();
        toast.success("Expenses data reset successfully!");
      } else if (resetType === "all") {
        await resetAllDataFn();
        toast.success("All business data reset to factory settings!");
      }
      qc.invalidateQueries({ queryKey: ["business-settings"] });
      setResetType(null);
      setConfirmText("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setResetLoading(false);
    }
  }

  async function saveBusiness(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isOwner) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await updateBusinessSettingsFn({
        data: {
          name: String(fd.get("name") || "HakimEzy"),
          logo_url: String(fd.get("logo_url") || "/logo.png"),
          business_type: String(fd.get("business_type") || "retail"),
          theme: "green",
          employee_limit: Number(fd.get("employee_limit")) || 5,
          invoice_watermark: String(fd.get("invoice_watermark") || ""),
          invoice_watermark_enabled: fd.get("invoice_watermark_enabled") === "true",
          invoice_terms: String(fd.get("invoice_terms") || ""),
          invoice_color: String(fd.get("invoice_color") || "black"),
        },
      });
      await refresh();
      qc.invalidateQueries({ queryKey: ["business-settings"] });
      toast.success(t("save"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const { url } = await uploadImageFn({ data: { base64, fileName: file.name } });
        await updateBusinessSettingsFn({ data: { logo_url: url } });
        await refresh();
        qc.invalidateQueries({ queryKey: ["business-settings"] });
        toast.success(t("save"));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsDataURL(file);
  }

  if (settings.isLoading && !settings.data) return <SpeedLoader fullScreen={false} />;

  return (
    <div className={`space-y-6 pb-8 ${isMobile ? "max-w-lg" : "max-w-5xl"} mx-auto`}>
      <div>
        <h1 className="text-2xl font-serif font-bold">{t("settings")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
      </div>

      {isOwner && biz && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card className="glass-card p-5 space-y-4">
          <h2 className="font-semibold">Business Profile</h2>
          <form onSubmit={saveBusiness} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Company Name</Label>
              <Input name="name" defaultValue={biz.name} placeholder="HakimEzy" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Logo URL</Label>
              <Input name="logo_url" defaultValue={biz.logo_url} placeholder="/logo.png" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Upload Logo</Label>
              <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Business Type</Label>
              <select name="business_type" defaultValue={biz.business_type} className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm">
                {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee License Limit</Label>
              <Input name="employee_limit" type="number" min={1} defaultValue={biz.employee_limit} placeholder="5" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("appearance")}</Label>
              <select
                name="theme_mode"
                value={theme}
                onChange={e => setTheme(e.target.value as ThemeMode)}
                className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm"
              >
                <option value="light">{t("theme_light")}</option>
                <option value="dark">{t("theme_dark")}</option>
                <option value="system">{t("theme_system")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("accent_color")}</Label>
              <select
                value={accentColor}
                onChange={e => setAccentColor(e.target.value as AccentColor)}
                className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm capitalize"
              >
                <option value="emerald">emerald (green)</option>
                <option value="indigo">indigo</option>
                <option value="violet">violet</option>
                <option value="blue">blue</option>
                <option value="rose">rose (red)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("bg_style")}</Label>
              <select
                value={bgStyle}
                onChange={e => setBgStyle(e.target.value as BgStyle)}
                className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm capitalize"
              >
                <option value="default">default gradient</option>
                <option value="warm">warm glow</option>
                <option value="cool">cool glow</option>
                <option value="clean">solid clean</option>
                <option value="glass">glassmorphism</option>
              </select>
            </div>
            <div className="border-t border-border pt-3 mt-3 space-y-3">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Invoice Customize Settings</h3>
              <div className="space-y-1">
                <Label className="text-xs">Invoice Watermark Text</Label>
                <Input name="invoice_watermark" defaultValue={biz.invoice_watermark || ""} placeholder="PAID" />
              </div>
              <div className="space-y-1 flex items-center justify-between">
                <Label className="text-xs">Enable Watermark</Label>
                <select name="invoice_watermark_enabled" defaultValue={String(biz.invoice_watermark_enabled)} className="h-8 rounded border border-input bg-input px-2 text-xs w-28">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Invoice Terms & Conditions / Footer Notes</Label>
                <textarea name="invoice_terms" defaultValue={biz.invoice_terms || ""} className="w-full min-h-[60px] rounded-md border border-input bg-input p-2 text-xs" placeholder="e.g. No refund after 7 days" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Invoice Print Theme Color</Label>
                <select name="invoice_color" defaultValue={biz.invoice_color || "black"} className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs capitalize">
                  <option value="black">black</option>
                  <option value="emerald">emerald (green)</option>
                  <option value="indigo">indigo</option>
                  <option value="rose">rose (red)</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? "…" : t("save")}</Button>
          </form>
        </Card>

          {!isUnlocked ? (
            <Card className="glass-card p-5 space-y-4 border-amber-500/20 bg-amber-500/5 relative overflow-hidden flex flex-col justify-between min-h-[350px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-amber-500">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Lock className="size-6 animate-pulse" />
                  </div>
                  <h2 className="font-semibold text-lg">Safety & API Settings</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  Configure Google Sheets integration, generate employee license keys, and perform data resets. Password verification is required.
                </p>
                <div className="flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mt-4">
                  <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                  <span>Only the business owner can access safety controls. Access is locked by default.</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-6 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
                onClick={() => setIsUnlockDialogOpen(true)}
              >
                Unlock Safety Settings
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="glass-card p-5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2.5 text-emerald-500">
                  <FileSpreadsheet className="size-5" />
                  <h2 className="font-semibold">Google Sheets Integration</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Synchronize your transactions, products, sales, expenses, and purchases to Google Sheets in real-time.
                </p>
                <form onSubmit={saveGoogleSheetsConfig} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Spreadsheet ID</Label>
                    <Input
                      name="google_sheets_spreadsheet_id"
                      defaultValue={biz.google_sheets_spreadsheet_id}
                      placeholder="e.g. 1a2b3c4d5e6f7g..."
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Service Account Credentials JSON</Label>
                    <Textarea
                      name="google_sheets_credentials_json"
                      defaultValue={biz.google_sheets_credentials_json}
                      placeholder='{ "type": "service_account", ... }'
                      className="font-mono text-xs min-h-[100px] h-[120px] bg-transparent"
                    />
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <Button type="submit" disabled={isSheetsSaving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isSheetsSaving ? "Saving..." : "Save Config"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBulkExport}
                      disabled={isBulkExporting || !biz.google_sheets_spreadsheet_id || !biz.google_sheets_credentials_json}
                      size="sm"
                      className="border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {isBulkExporting ? (
                        <>
                          <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        "Sync All Existing Data"
                      )}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2.5 text-blue-500">
                  <Key className="size-5" />
                  <h2 className="font-semibold">Employee Licenses</h2>
                </div>
                <p className="text-xs text-muted-foreground">1 license = 1 employee. Share the generated key during their signup/activation.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 hover:bg-blue-600/20"
                  onClick={async () => {
                    try {
                      const res = await createEmployeeLicenseFn({ data: { permissions: DEFAULT_EMPLOYEE_PERMISSIONS } });
                      toast.success(`Employee key generated: ${res.key}`);
                      qc.invalidateQueries({ queryKey: ["business-settings"] });
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : String(err));
                    }
                  }}
                >
                  Generate Employee License
                </Button>
                <div className="divide-y divide-border rounded-md border overflow-hidden bg-background/50 max-h-[200px] overflow-y-auto">
                  {(settings.data?.employeeLicenses ?? []).length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">No license keys generated yet.</div>
                  ) : (
                    (settings.data?.employeeLicenses ?? []).map(l => (
                      <div key={l.id} className="p-2 flex items-center justify-between gap-2 text-xs">
                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] truncate">{l.id}</code>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={l.used ? "text-muted-foreground" : "text-emerald-500 font-semibold"}>
                            {l.used ? "Used" : "Open"}
                          </span>
                          {!l.used && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={t("delete_license")}
                              onClick={async () => {
                                try {
                                  await deleteLicenseFn({ data: { licenseKey: l.id } });
                                  qc.invalidateQueries({ queryKey: ["business-settings"] });
                                  toast.success("License deleted");
                                } catch (err: unknown) {
                                  toast.error(err instanceof Error ? err.message : String(err));
                                }
                              }}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {isOwner && (settings.data?.employees ?? []).length > 0 && (
        <Card className="glass-card p-5 space-y-4">
          <h2 className="font-semibold">Team & Privileges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(settings.data?.employees ?? []).map(emp => (
            <EmployeePermissions
              key={emp.id}
              employee={emp}
              onSave={async perms => {
                await updateEmployeePermissionsFn({ data: { employeeId: emp.id, permissions: perms } });
                qc.invalidateQueries({ queryKey: ["business-settings"] });
                toast.success(t("save"));
              }}
            />
          ))}
          </div>
        </Card>
      )}

      {isOwner && isUnlocked && (
        <Card className="glass-card p-5 space-y-4 border-red-500/20 bg-red-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2.5 text-red-500">
            <ShieldAlert className="size-5 animate-pulse" />
            <h2 className="font-semibold text-lg">Danger Zone</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Perform administrative resets on specific modules or clear all data. These actions are irreversible and will affect both local and synced spreadsheet data.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-lg border border-border bg-background/40 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cashbox</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Delete all cash inflow/outflow history and reset balance to 0.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => {
                  setResetType("cashbox");
                  setConfirmText("");
                }}
              >
                Reset Cashbox
              </Button>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background/40 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Products</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Clear catalog list, categories, stock levels, and item configurations.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => {
                  setResetType("products");
                  setConfirmText("");
                }}
              >
                Reset Products
              </Button>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background/40 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales, Profits & Losses</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Delete all invoice histories, returns records, and accumulated profit & loss logs.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => {
                  setResetType("sales");
                  setConfirmText("");
                }}
              >
                Reset Sales & Profits
              </Button>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background/40 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchases</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Delete all purchase records, stock intakes, and supplier purchases logs.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => {
                  setResetType("purchases");
                  setConfirmText("");
                }}
              >
                Reset Purchases
              </Button>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background/40 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Samity / Somiti</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Delete all samity contribution/withdrawal records and reset samity ledger.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => {
                  setResetType("somiti");
                  setConfirmText("");
                }}
              >
                Reset Samity
              </Button>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-background/40 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Delete all business expense history and related category logs.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => {
                  setResetType("expenses");
                  setConfirmText("");
                }}
              >
                Reset Expenses
              </Button>
            </div>

            <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/10 flex flex-col justify-between space-y-3 sm:col-span-2 md:col-span-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Factory Reset</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Reset everything. Wipes all data: products, sales, purchases, parties, expenses, cashbox, and more.</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  setResetType("all");
                  setConfirmText("");
                }}
              >
                Factory Reset All Data
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!isOwner && (
        <Card className="glass-card p-5 text-sm text-muted-foreground max-w-2xl">
          Employee account — contact your business owner for settings changes.
        </Card>
      )}

      {/* Change Password Card for all users */}
      <Card className="glass-card p-5 space-y-4 max-w-md">
        <div className="flex items-center gap-2.5 text-primary">
          <Key className="size-5" />
          <h2 className="font-semibold text-base">Change Account Password</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Update your login password. Your new password must be at least 6 characters long.
        </p>
        <form onSubmit={handleUpdateMyPassword} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Current Password</Label>
            <Input name="currentPassword" type="password" required placeholder="••••••••" className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">New Password</Label>
            <Input name="newPassword" type="password" required placeholder="New password" className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Confirm New Password</Label>
            <Input name="confirmPassword" type="password" required placeholder="Confirm new password" className="h-9 text-xs" />
          </div>
          <Button type="submit" disabled={pwBusy} className="w-full mt-2 h-9 text-xs beveled-button">
            {pwBusy ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>

      {/* Password Verification Dialog */}
      <Dialog open={isUnlockDialogOpen} onOpenChange={setIsUnlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="size-5 text-amber-500" />
              Verify Owner Password
            </DialogTitle>
            <DialogDescription>
              Please enter your login password to unlock Safety & API settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifyPassword} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Password</Label>
              <Input
                type="password"
                required
                value={unlockPassword}
                onChange={e => setUnlockPassword(e.target.value)}
                placeholder="Enter owner password"
                className="text-sm"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsUnlockDialogOpen(false)} disabled={unlockLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={unlockLoading}>
                {unlockLoading ? "Verifying..." : "Verify & Unlock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Double Confirmation Reset Dialog */}
      <Dialog open={resetType !== null} onOpenChange={open => !open && setResetType(null)}>
        <DialogContent className="max-w-md border-red-500/20 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-5" />
              Confirm Data Reset
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is <span className="font-semibold text-red-500">permanent</span>. All selected files and entries will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground leading-relaxed">
              You are about to reset:{" "}
              <span className="font-bold text-foreground capitalize">
                {resetType === "all"
                  ? "All Business Data (Factory Reset)"
                  : resetType === "sales"
                  ? "Sales, Returns, Profits & Losses"
                  : resetType === "somiti"
                  ? "Samity (Somiti) Entries"
                  : resetType === "expenses"
                  ? "Expenses"
                  : resetType}
              </span>.
              This will erase all related database records for your business.
            </div>
            <div className="space-y-2 bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-[11px] text-red-700 dark:text-red-400">
              Please type <strong className="font-mono bg-red-500/20 px-1 py-0.5 rounded text-xs select-all text-red-600 dark:text-red-300">CONFIRM</strong> in the box below to authorize the deletion.
            </div>
            <div className="space-y-1">
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM here"
                className="text-sm text-center font-bold tracking-wider"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setResetType(null)} disabled={resetLoading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={confirmText !== "CONFIRM" || resetLoading}
                onClick={handleResetAction}
              >
                {resetLoading ? "Deleting..." : "Erase Data"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeePermissions({
  employee,
  onSave,
}: {
  employee: { id: string; email: string; full_name: string; permissions: PermissionSet };
  onSave: (p: PermissionSet) => Promise<void>;
}) {
  const [perms, setPerms] = useState<PermissionSet>(employee.permissions || DEFAULT_EMPLOYEE_PERMISSIONS);

  const modules: (keyof PermissionSet)[] = ["dashboard", "products", "sales", "parties", "purchases", "expenses", "settings", "reports"];

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="font-medium text-sm">{employee.full_name || employee.email}</div>
      <div className="grid grid-cols-2 gap-2">
        {modules.map(m => (
          <label key={m} className="flex items-center justify-between text-xs capitalize">
            {m}
            <Switch checked={perms[m]} onCheckedChange={v => setPerms(p => ({ ...p, [m]: v }))} />
          </label>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => onSave(perms)}>Save permissions</Button>
    </div>
  );
}
