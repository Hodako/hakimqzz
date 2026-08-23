"use client";


import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
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
import Link from "next/link";
import { Trash2, Lock, Unlock, ShieldAlert, Database, FileSpreadsheet, Key, RefreshCw, AlertTriangle, LayoutGrid, Printer, MessageSquare, Store, Sparkles } from "lucide-react";
import { getPosPaperConfig, savePosPaperConfig, DEFAULT_POS_CONFIG, type PosPaperSettings } from "@/lib/pos-print";
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
  resetPartiesFn,
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
  const { lang, t } = useT();
  const { user, refresh, updateUser } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor, bgStyle, setBgStyle } = useTheme();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["business-settings"], queryFn: getBusinessSettingsFn });
  const [busy, setBusy] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "appearance" | "printing" | "sheets" | "security">("profile");

  // KPI Configuration state
  const [kpiConfig, setKpiConfig] = useState({
    align: "left",
    size: "small",
    columns: 2,
    variant: "glass",
    shadow: "glow",
    borderStyle: "subtle",
    curve: "none",
  });

  useEffect(() => {
    const saved = localStorage.getItem("hz_kpi_config");
    if (saved) {
      try {
        setKpiConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // POS Thermal Printer Paper Configuration state
  const [posConfig, setPosConfig] = useState<PosPaperSettings>(DEFAULT_POS_CONFIG);

  useEffect(() => {
    setPosConfig(getPosPaperConfig());
  }, []);

  const updatePosConfig = (updates: Partial<PosPaperSettings>) => {
    const updated = savePosPaperConfig(updates);
    setPosConfig(updated);
    toast.success(lang === "bn" ? "প্রিন্টার পেপার সাইজ সংরক্ষিত হয়েছে!" : "POS Printer Paper Settings Saved!");
  };

  const updateKpiConfig = (newSettings: Partial<typeof kpiConfig>) => {
    setKpiConfig(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("hz_kpi_config", JSON.stringify(updated));
      window.dispatchEvent(new Event("hz-kpi-config-updated"));
      toast.success(t("save") || "Saved!");
      return updated;
    });
  };

  // Safety settings states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Sheets sync states
  const [isSheetsSaving, setIsSheetsSaving] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);

  // Reset states
  const [resetType, setResetType] = useState<"cashbox" | "products" | "sales" | "purchases" | "somiti" | "expenses" | "parties" | "all" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [pwBusy, setPwBusy] = useState(false);

  const biz = settings.data?.business;
  const isOwner = settings.data?.role === "owner";

  const [logoUrl, setLogoUrl] = useState("");
  const [fontSize, setFontSize] = useState("22px");
  const [fontScale, setFontScale] = useState("100%");
  const [lineSpacing, setLineSpacing] = useState("6px");

  useEffect(() => {
    if (biz?.logo_url) {
      setLogoUrl(biz.logo_url);
    }
    if (biz?.invoice_font_size) {
      setFontSize(biz.invoice_font_size);
    }
    if (biz?.invoice_scale) {
      setFontScale(biz.invoice_scale);
    }
    if (biz?.invoice_line_spacing) {
      setLineSpacing(biz.invoice_line_spacing);
    }
  }, [biz?.logo_url, biz?.invoice_font_size, biz?.invoice_scale, biz?.invoice_line_spacing]);

  // Cropper states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropImageName, setCropImageName] = useState<string>("");
  const [cropImageType, setCropImageType] = useState<string>("image/png");

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 256, height: 256 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchDragStart, setTouchDragStart] = useState({ x: 0, y: 0 });
  const [touchPanStart, setTouchPanStart] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    let w = 256;
    let h = 256;
    if (natW > natH) {
      w = (natW / natH) * 256;
    } else {
      h = (natH / natW) * 256;
    }

    setImgSize({ width: w, height: h });
    setPan({ x: (256 - w) / 2, y: (256 - h) / 2 });
    setZoom(1);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: pan.x, y: pan.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsTouchDragging(true);
    setTouchDragStart({ x: touch.clientX, y: touch.clientY });
    setTouchPanStart({ x: pan.x, y: pan.y });
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan({
        x: panStart.x + dx,
        y: panStart.y + dy,
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, panStart]);

  useEffect(() => {
    if (!isTouchDragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - touchDragStart.x;
      const dy = touch.clientY - touchDragStart.y;
      setPan({
        x: touchPanStart.x + dx,
        y: touchPanStart.y + dy,
      });
    };
    const handleTouchEnd = () => {
      setIsTouchDragging(false);
    };
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isTouchDragging, touchDragStart, touchPanStart]);

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
      } else if (resetType === "parties") {
        await resetPartiesFn();
        toast.success("Customer, Party, and Debt data reset successfully!");
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
          name: String(fd.get("name") || "HakimQzz"),
          address: String(fd.get("address") || ""),
          phone_numbers: String(fd.get("phone_numbers") || ""),
          emails: String(fd.get("emails") || ""),
          invoice_page_size: String(fd.get("invoice_page_size") || "80mm"),
          invoice_page_width: String(fd.get("invoice_page_width") || ""),
          invoice_page_height: String(fd.get("invoice_page_height") || ""),
          logo_url: logoUrl || "/logo.png",
          business_type: String(fd.get("business_type") || "retail"),
          theme: "green",
          employee_limit: Number(fd.get("employee_limit")) || 5,
          invoice_watermark: String(fd.get("invoice_watermark") || ""),
          invoice_watermark_enabled: fd.get("invoice_watermark_enabled") === "true",
          invoice_terms: String(fd.get("invoice_terms") || ""),
          invoice_color: String(fd.get("invoice_color") || "black"),
          invoice_font_size: (() => {
            const raw = String(fd.get("invoice_font_size") || "22px").trim();
            if (!raw) return "22px";
            return raw.toLowerCase().endsWith("px") ? raw : `${raw}px`;
          })(),
          invoice_scale: (() => {
            const raw = String(fd.get("invoice_scale") || "100%").trim();
            if (!raw) return "100%";
            return raw.endsWith("%") ? raw : `${raw}%`;
          })(),
          invoice_line_spacing: (() => {
            const raw = String(fd.get("invoice_line_spacing") || "6px").trim();
            if (!raw) return "6px";
            return raw.toLowerCase().endsWith("px") ? raw : `${raw}px`;
          })(),
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
        // Immediately update the logo in auth context so AppLogo re-renders right away
        updateUser({ logo_url: url });
        setLogoUrl(url);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (PNG, JPG, WEBP, GIF, SVG).");
      return;
    }

    setCropImageName(file.name);
    setCropImageType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropSave = () => {
    const img = imageRef.current;
    const viewport = viewportRef.current;
    if (!img || !viewport) return;

    const imgRect = img.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (cropImageType === "image/jpeg" || cropImageType === "image/jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
    }

    const S = 512 / viewportRect.width;
    const dx = (imgRect.left - viewportRect.left) * S;
    const dy = (imgRect.top - viewportRect.top) * S;
    const dw = imgRect.width * S;
    const dh = imgRect.height * S;

    ctx.drawImage(img, dx, dy, dw, dh);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], cropImageName, { type: cropImageType });
      setCropImageSrc(null);
      void uploadLogo(file);
    }, cropImageType);
  };

  if (settings.isLoading && !settings.data) return <SpeedLoader fullScreen={false} />;

  return (
    <div className={`space-y-6 pb-8 ${isMobile ? "max-w-lg" : "max-w-5xl"} mx-auto`}>
      <div>
        <h1 className="text-2xl font-serif font-bold">{t("settings")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
      </div>

      {/* Top Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 border border-border/80 rounded-2xl overflow-x-auto scrollbar-none">
        {[
          { id: "profile", label: lang === "bn" ? "দোকান প্রোফাইল" : "Shop Profile", icon: Store },
          { id: "appearance", label: lang === "bn" ? "থিম ও ডিসপ্লে" : "Appearance & UI", icon: Sparkles },
          { id: "printing", label: lang === "bn" ? "প্রিন্ট ও ইনভয়েস" : "POS & Invoice", icon: Printer },
          { id: "sheets", label: lang === "bn" ? "ক্লাউড ব্যাকআপ" : "Cloud & Sheets", icon: FileSpreadsheet },
          { id: "security", label: lang === "bn" ? "নিরাপত্তা ও রিসেট" : "Security & Reset", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = settingsTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSettingsTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className={`size-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isOwner && biz && (
        <div className="space-y-6">
          {/* TAB 1: SHOP PROFILE */}
          {settingsTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Store className="size-4 text-primary" />
                      <span>{lang === "bn" ? "দোকানের মূল তথ্য" : "Business Profile & Contact"}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === "bn" ? "দোকানের নাম, ঠিকানা এবং যোগাযোগের তথ্য পরিচালনা করুন" : "Manage company identity, phone numbers, and official address"}
                    </p>
                  </div>
                </div>

                <form onSubmit={saveBusiness} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Company / Shop Name</Label>
                      <Input name="name" defaultValue={biz.name} placeholder="HakimQzz" className="h-10 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Business Category</Label>
                      <select name="business_type" defaultValue={biz.business_type} className="w-full h-10 rounded-xl border border-input bg-input px-3 text-xs capitalize">
                        {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{lang === "bn" ? "দোকানের ঠিকানা (Shop Address)" : "Official Shop Address"}</Label>
                    <Textarea name="address" defaultValue={biz.address || ""} placeholder={lang === "bn" ? "দোকানের ঠিকানা লিখুন..." : "e.g., House 12, Road 4, Dhanmondi, Dhaka"} className="text-xs min-h-[70px] rounded-xl" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{lang === "bn" ? "দোকানের ফোন নম্বরসমূহ (Phone Numbers)" : "Shop Phone Numbers"}</Label>
                      <Input name="phone_numbers" defaultValue={biz.phone_numbers || ""} placeholder="+8801700000000, +8801800000000" className="h-10 rounded-xl text-xs" />
                      <p className="text-[10px] text-muted-foreground">{lang === "bn" ? "একাধিক নম্বর কমা (,) দিয়ে আলাদা করুন" : "Separate multiple numbers with commas"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{lang === "bn" ? "দোকানের ইমেইলসমূহ (Emails)" : "Shop Emails"}</Label>
                      <Input name="emails" defaultValue={biz.emails || user?.email || ""} placeholder="info@shop.com" className="h-10 rounded-xl text-xs" />
                      <p className="text-[10px] text-muted-foreground">{lang === "bn" ? "ইনভয়েসে দেখানোর জন্য কমা (,) ব্যবহার করুন" : "Displayed in invoice headers"}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={busy} className="h-10 px-6 rounded-xl beveled-button">
                      {busy ? "Saving..." : t("save")}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Logo Card */}
              <Card className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Shop Branding & Logo</span>
                  </h3>
                  <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-2xl bg-muted/30 text-center space-y-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="size-24 rounded-2xl object-cover border border-border/80 shadow-xs bg-white" />
                    ) : (
                      <div className="size-24 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                        <Store className="size-10" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">Upload Custom Logo</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                      Choose File & Crop
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Direct URL:</p>
                  <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="/logo.png" className="h-8 text-xs font-mono" />
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: APPEARANCE & UI THEME */}
          {settingsTab === "appearance" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 rounded-3xl bg-card border-border/80 shadow-xs space-y-3">
                  <Label className="text-xs font-bold">{t("appearance")}</Label>
                  <select
                    value={theme}
                    onChange={e => setTheme(e.target.value as ThemeMode)}
                    className="w-full h-10 rounded-xl border border-input bg-input px-3 text-xs"
                  >
                    <option value="light">{t("theme_light")}</option>
                    <option value="dark">{t("theme_dark")}</option>
                    <option value="system">{t("theme_system")}</option>
                  </select>
                </Card>

                <Card className="p-5 rounded-3xl bg-card border-border/80 shadow-xs space-y-3">
                  <Label className="text-xs font-bold">{t("accent_color")}</Label>
                  <select
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value as AccentColor)}
                    className="w-full h-10 rounded-xl border border-input bg-input px-3 text-xs capitalize"
                  >
                    <option value="emerald">emerald (green)</option>
                    <option value="indigo">indigo</option>
                    <option value="violet">violet</option>
                    <option value="blue">blue</option>
                    <option value="rose">rose (red)</option>
                  </select>
                </Card>

                <Card className="p-5 rounded-3xl bg-card border-border/80 shadow-xs space-y-3">
                  <Label className="text-xs font-bold">{t("bg_style")}</Label>
                  <select
                    value={bgStyle}
                    onChange={e => setBgStyle(e.target.value as BgStyle)}
                    className="w-full h-10 rounded-xl border border-input bg-input px-3 text-xs capitalize"
                  >
                    <option value="default">default gradient</option>
                    <option value="warm">warm glow</option>
                    <option value="cool">cool glow</option>
                    <option value="clean">solid clean</option>
                    <option value="glass">glassmorphism</option>
                  </select>
                </Card>
              </div>

              {/* KPI & Dashboard Customizer */}
              <Card className="p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                  <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <LayoutGrid className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-foreground">{lang === "bn" ? "কেপিআই এবং ড্যাশবোর্ড কাস্টমাইজেশন" : "KPI & Dashboard Layout Customizer"}</h2>
                    <p className="text-xs text-muted-foreground">{lang === "bn" ? "ড্যাশবোর্ড কার্ডের উচ্চতা, শার্পনেস এবং বর্ডার শৈলী পরিবর্তন করুন" : "Customize dashboard card height, corner curves, and borders"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Box Height / Size</Label>
                    <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl text-xs">
                      {["small", "standard", "large"].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => updateKpiConfig({ size: sz as any })}
                          className={`py-1.5 rounded-lg text-center text-xs font-bold capitalize transition-all ${
                            kpiConfig.size === sz ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Corner Curvature</Label>
                    <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl text-xs">
                      {["none", "md", "full"].map(cr => (
                        <button
                          key={cr}
                          type="button"
                          onClick={() => updateKpiConfig({ curve: cr as any })}
                          className={`py-1.5 rounded-lg text-center text-xs font-bold capitalize transition-all ${
                            (kpiConfig.curve || "none") === cr ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Card Border Theme</Label>
                    <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-xl text-xs">
                      {["subtle", "bold", "emerald", "none"].map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => updateKpiConfig({ borderStyle: b as any })}
                          className={`py-1 rounded-lg text-center text-xs font-bold capitalize transition-all ${
                            kpiConfig.borderStyle === b ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Card Theme Style</Label>
                    <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-xl text-xs">
                      {["glass", "flat", "bordered", "gradient"].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => updateKpiConfig({ variant: v as any })}
                          className={`py-1 rounded-lg text-center text-xs font-bold capitalize transition-all ${
                            kpiConfig.variant === v ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: POS & INVOICE PRINTING */}
          {settingsTab === "printing" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Printer className="size-4 text-primary" />
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    {lang === "bn" ? "পিওএস থার্মাল প্রিন্টার পেপার কনফিগ" : "POS Thermal Printer Settings"}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Paper Width (mm)</Label>
                    <Input
                      type="number"
                      className="h-10 rounded-xl text-xs"
                      value={posConfig.widthMm}
                      onChange={(e) => updatePosConfig({ widthMm: Number(e.target.value) || 58 })}
                      placeholder="58"
                    />
                    <p className="text-[10px] text-muted-foreground">Standard: 58mm or 80mm</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Paper Height (mm)</Label>
                    <Input
                      type="number"
                      className="h-10 rounded-xl text-xs"
                      value={posConfig.heightMm === "auto" ? 40 : posConfig.heightMm}
                      onChange={(e) => updatePosConfig({ heightMm: Number(e.target.value) || 40 })}
                      placeholder="40"
                    />
                    <p className="text-[10px] text-muted-foreground">Continuous roll default: 40</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Canvas Width (mm)</Label>
                    <Input
                      type="number"
                      className="h-10 rounded-xl text-xs"
                      value={posConfig.canvasWidthMm}
                      onChange={(e) => updatePosConfig({ canvasWidthMm: Number(e.target.value) || 82 })}
                      placeholder="82"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Side Margin (mm)</Label>
                    <Input
                      type="number"
                      className="h-10 rounded-xl text-xs"
                      value={posConfig.marginMm}
                      onChange={(e) => updatePosConfig({ marginMm: Number(e.target.value) ?? 1 })}
                      placeholder="1"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-foreground border-b border-border/60 pb-3">
                  Invoice Header & Watermark
                </h3>
                <form onSubmit={saveBusiness} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Watermark Text</Label>
                      <Input name="invoice_watermark" defaultValue={biz.invoice_watermark || ""} placeholder="PAID" className="h-10 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Enable Watermark</Label>
                      <select name="invoice_watermark_enabled" defaultValue={String(biz.invoice_watermark_enabled)} className="w-full h-10 rounded-xl border border-input bg-input px-3 text-xs">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Invoice Terms & Conditions (Footer)</Label>
                    <Textarea name="invoice_terms" defaultValue={biz.invoice_terms || ""} className="min-h-[70px] rounded-xl text-xs" placeholder="e.g. Sold items are exchangeable within 7 days with invoice." />
                  </div>

                  <Button type="submit" disabled={busy} className="h-10 px-6 rounded-xl beveled-button">
                    {busy ? "Saving..." : "Save Invoice Settings"}
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* TAB 4: CLOUD BACKUP & GOOGLE SHEETS */}
          {settingsTab === "sheets" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 border-b border-border/60 pb-3">
                  <FileSpreadsheet className="size-5" />
                  <h2 className="font-bold text-base text-foreground">Google Sheets Real-Time Sync</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Synchronize your transactions, products, sales, expenses, and purchases directly to Google Sheets.
                </p>
                <form onSubmit={saveGoogleSheetsConfig} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Spreadsheet ID</Label>
                    <Input
                      name="google_sheets_spreadsheet_id"
                      defaultValue={biz.google_sheets_spreadsheet_id}
                      placeholder="e.g. 1a2b3c4d5e6f7g..."
                      className="font-mono text-xs h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Service Account JSON</Label>
                    <Textarea
                      name="google_sheets_credentials_json"
                      defaultValue={biz.google_sheets_credentials_json}
                      placeholder='{ "type": "service_account", ... }'
                      className="font-mono text-xs min-h-[110px] rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <Button type="submit" disabled={isSheetsSaving} className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isSheetsSaving ? "Saving..." : "Save Google Config"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBulkExport}
                      disabled={isBulkExporting || !biz.google_sheets_spreadsheet_id || !biz.google_sheets_credentials_json}
                      className="h-10 rounded-xl border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
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

              {/* SMS Gateway Panel Shortcut */}
              <Card className="p-5 sm:p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                      <MessageSquare className="size-6" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-foreground">{lang === "bn" ? "এসএমএস সিস্টেম ও বার্তা প্যানেল" : "SMS Gateway & Campaigns"}</h2>
                      <p className="text-xs text-muted-foreground">{lang === "bn" ? "বাল্ক এসএমএস ও অটোমেটিক বার্তা" : "Broadcast SMS and purchase auto-notifications"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {lang === "bn"
                      ? "এসএমএস গেটওয়ের মাধ্যমে আপনার ব্যবসায়ের সকল কাস্টমার ও সাপ্লায়ারদের এসএমএস পাঠান এবং বিক্রির পর অটোমেটিক বার্তা সক্রিয় করুন।"
                      : "Send marketing campaigns, check SMS balance, and configure automatic customer purchase receipts."}
                  </p>
                </div>
                <Link href="/sms">
                  <Button type="button" className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {lang === "bn" ? "এসএমএস প্যানেল খুলুন" : "Open SMS Panel"}
                  </Button>
                </Link>
              </Card>
            </div>
          )}

          {/* TAB 5: SECURITY & FACTORY RESET */}
          {settingsTab === "security" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Change Password */}
              <Card className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-border/60 pb-3">
                  <Key className="size-5" />
                  <h2 className="font-bold text-base text-foreground">Change Account Password</h2>
                </div>
                <form onSubmit={handleUpdateMyPassword} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Current Password</Label>
                    <Input name="currentPassword" type="password" required placeholder="••••••••" className="h-10 rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">New Password</Label>
                    <Input name="newPassword" type="password" required placeholder="Min 6 characters" className="h-10 rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Confirm New Password</Label>
                    <Input name="confirmPassword" type="password" required placeholder="Re-enter password" className="h-10 rounded-xl text-xs" />
                  </div>
                  <Button type="submit" disabled={pwBusy} className="w-full h-10 rounded-xl beveled-button mt-2">
                    {pwBusy ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Card>

              {/* Danger Zone & Reset */}
              <div className="lg:col-span-7">
                {!isUnlocked ? (
                  <Card className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 shadow-xs space-y-4 flex flex-col justify-between h-full">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-amber-500">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                          <Lock className="size-6 animate-pulse" />
                        </div>
                        <h2 className="font-bold text-base text-foreground">Administrative Reset Controls</h2>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        To protect your business data against accidental deletion, dangerous reset operations require your owner password.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        <ShieldAlert className="size-4 shrink-0" />
                        <span>Owner authentication required to access reset actions.</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 rounded-xl border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
                      onClick={() => setIsUnlockDialogOpen(true)}
                    >
                      Unlock Danger Zone
                    </Button>
                  </Card>
                ) : (
                  <Card className="p-5 sm:p-6 rounded-3xl bg-red-500/5 border border-red-500/20 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 text-red-500 border-b border-red-500/20 pb-3">
                      <ShieldAlert className="size-5 animate-pulse" />
                      <h2 className="font-bold text-base text-foreground">Danger Zone: Selective Data Resets</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { type: "cashbox", title: "Cashbox", desc: "Clear all cash ledger history" },
                        { type: "products", title: "Products", desc: "Clear catalog & inventory items" },
                        { type: "sales", title: "Sales & Invoices", desc: "Clear sales, returns, and profits" },
                        { type: "purchases", title: "Purchases", desc: "Clear purchase intake records" },
                        { type: "somiti", title: "Samity", desc: "Clear samity ledger records" },
                        { type: "expenses", title: "Expenses", desc: "Clear all expense entries" },
                        { type: "parties", title: "Customers & Debts", desc: "Clear customer dues & profiles" },
                        { type: "all", title: "Factory Reset", desc: "Wipe all business data completely" },
                      ].map((item) => (
                        <div key={item.type} className="p-3 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-2">
                          <div>
                            <p className="font-bold text-xs text-foreground">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-full h-7.5 rounded-lg text-xs font-semibold"
                            onClick={() => {
                              setResetType(item.type as any);
                              setConfirmText("");
                            }}
                          >
                            Reset {item.title}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!isOwner && (
        <Card className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs text-sm text-muted-foreground max-w-xl">
          {lang === "bn"
            ? "কর্মচারী একাউন্ট — সেটিংস পরিবর্তনের জন্য আপনার দোকান মালিকের সাথে যোগাযোগ করুন।"
            : "Staff employee account — please contact your shop owner to update business settings."}
        </Card>
      )}

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
                  : resetType === "parties"
                  ? "Customers, Parties & Debts"
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

      {/* Crop Business Logo Dialog */}
      <Dialog open={cropImageSrc !== null} onOpenChange={open => !open && setCropImageSrc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Business Logo</DialogTitle>
            <DialogDescription className="text-xs">
              Drag the logo to pan and use the slider to zoom so it fits inside the square.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center">
            <div
              ref={viewportRef}
              className="w-64 h-64 relative overflow-hidden bg-muted border rounded-lg cursor-move select-none shadow-inner"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {cropImageSrc && (
                <img
                  ref={imageRef}
                  src={cropImageSrc}
                  alt="Crop preview"
                  className="absolute max-w-none pointer-events-none origin-center"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    width: `${imgSize.width}px`,
                    height: `${imgSize.height}px`,
                  }}
                  onLoad={handleImageLoad}
                />
              )}
            </div>
            
            <div className="w-full max-w-xs mt-6 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.05"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCropImageSrc(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCropSave}>
              Crop & Upload
            </Button>
          </DialogFooter>
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

  const modules: (keyof PermissionSet)[] = ["dashboard", "products", "sales", "parties", "purchases", "expenses", "cashbox", "settings", "reports"];

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
