"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RiSparklingLine } from "react-icons/ri";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_EMERALD_GLASS,
  EMERALD_BACKDROP_PRESETS,
  EMERALD_GLASS_PRESETS,
  THEME_UPDATED_EVENT,
  isEmeraldModeEnabled,
  normalizeEmeraldGlass,
  readCustomThemeConfig,
  toggleEmeraldMode,
  writeCustomThemeConfig,
  type EmeraldGlassConfig,
  type ThemeConfig,
} from "@/lib/emerald-theme";
import {
  deleteLocalMedia,
  isLocalMediaRef,
  saveLocalBackgroundImage,
  useResolvedMediaUrl,
} from "@/lib/local-media-db";
import { persistStoreLogo } from "@/lib/store-branding";
import { EmeraldGlassStudio } from "@/components/emerald-glass-studio";
import { AppLogo } from "@/components/app-logo";
import {
  Database,
  Eye,
  ImagePlus,
  Layers,
  Monitor,
  RotateCcw,
  Store,
  Trash2,
  Upload,
} from "lucide-react";

/**
 * UI Switcher, Emerald Glass Material & Local DB Background / Store Logo controls.
 * Works on both /more (UI Settings) and /settings (Appearance tab).
 */
export function EmeraldUiSettings() {
  const { lang } = useT();
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();

  const [config, setConfig] = useState<ThemeConfig>({});
  const [studioOpen, setStudioOpen] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState(user?.business_name || "");

  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStoreNameInput(user?.business_name || "");
  }, [user?.business_name]);

  useEffect(() => {
    const sync = () => setConfig(readCustomThemeConfig());
    sync();
    window.addEventListener(THEME_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isOwner =
    !user ||
    (user.role !== "employee" &&
      !(
        typeof window !== "undefined" &&
        Boolean(window.localStorage.getItem("cw_active_employee_session"))
      ));

  const emeraldActive = isEmeraldModeEnabled(config);
  const glass = normalizeEmeraldGlass(config.emeraldGlass);
  const resolvedBackdropPreview = useResolvedMediaUrl(glass.backdropImage, "");
  const isLocalBackdrop = isLocalMediaRef(glass.backdropImage);

  const handleToggleEmerald = (checked: boolean) => {
    const next = toggleEmeraldMode(checked);
    setConfig(next);
    toast.success(
      checked
        ? lang === "bn"
          ? "পিসি এমেরাল্ড গ্লাস মোড চালু হয়েছে"
          : "PC Emerald Glass Mode enabled"
        : lang === "bn"
          ? "ক্লাসিক ডিফল্ট ইউআই চালু হয়েছে"
          : "Switched back to Classic Default UI",
    );
  };

  const updateGlass = (patch: Partial<EmeraldGlassConfig>) => {
    const merged = normalizeEmeraldGlass({ ...glass, ...patch });
    const next = writeCustomThemeConfig({
      emeraldMode: true,
      uiStyle: "emerald",
      isMaterialUI: false,
      emeraldGlass: merged,
    });
    setConfig(next);
  };

  const handleUploadBackdrop = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isOwner) {
      toast.error(
        lang === "bn"
          ? "শুধুমাত্র ওনার ড্যাশবোর্ডের ব্যাকগ্রাউন্ড পরিবর্তন করতে পারবেন"
          : "Only the store owner can customize the dashboard background",
      );
      return;
    }

    setUploadingBg(true);
    const toastId = toast.loading(
      lang === "bn"
        ? "লোকাল ডাটাবেসে ব্যাকগ্রাউন্ড সংরক্ষণ হচ্ছে..."
        : "Saving background to Local DB...",
    );
    try {
      const localRef = await saveLocalBackgroundImage(file, "emerald_backdrop");
      updateGlass({ backdropImage: localRef });
      toast.success(
        lang === "bn"
          ? "ড্যাশবোর্ড ব্যাকগ্রাউন্ড লোকাল ডিবিতে সংরক্ষিত হয়েছে!"
          : "Custom background saved in Local DB & applied!",
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          (lang === "bn"
            ? "ব্যাকগ্রাউন্ড সংরক্ষণ ব্যর্থ হয়েছে"
            : "Failed to save background"),
        { id: toastId },
      );
    } finally {
      setUploadingBg(false);
    }
  };

  const handleClearLocalBackdrop = async () => {
    if (!isOwner) return;
    if (isLocalBackdrop) {
      await deleteLocalMedia(glass.backdropImage);
    }
    updateGlass({ backdropImage: DEFAULT_EMERALD_GLASS.backdropImage });
    toast.success(
      lang === "bn"
        ? "ডিফল্ট গ্লাস ব্যাকগ্রাউন্ড ফিরিয়ে আনা হয়েছে"
        : "Restored default Emerald backdrop",
    );
  };

  const handleUploadStoreLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isOwner) {
      toast.error(
        lang === "bn"
          ? "শুধুমাত্র ওনার স্টোর লোগো সেট করতে পারবেন"
          : "Only the store owner can update the store logo",
      );
      return;
    }

    setUploadingLogo(true);
    const toastId = toast.loading(
      lang === "bn"
        ? "দোকানের লোগো সংরক্ষণ হচ্ছে..."
        : "Saving store logo...",
    );
    try {
      await persistStoreLogo({
        input: file,
        fileName: file.name,
        businessName: storeNameInput.trim() || user?.business_name,
        fallbackName: user?.business_name,
        updateUser,
        qc,
      });
      toast.success(
        lang === "bn"
          ? "দোকানের লোগো সফলভাবে আপডেট হয়েছে!"
          : "Store logo saved & updated across the app!",
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update store logo", {
        id: toastId,
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveStoreNameOnly = async () => {
    const clean = storeNameInput.trim();
    if (!isOwner || !clean) return;
    setUploadingLogo(true);
    try {
      await persistStoreLogo({
        logoUrl: user?.logo_url || "/logo.png",
        businessName: clean,
        fallbackName: clean,
        updateUser,
        qc,
      });
      toast.success(
        lang === "bn"
          ? "দোকানের নাম সংরক্ষিত হয়েছে!"
          : "Store name updated!",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update store name");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleResetDefaultLogo = async () => {
    if (!isOwner) return;
    setUploadingLogo(true);
    try {
      await persistStoreLogo({
        logoUrl: "/logo.png",
        businessName: storeNameInput.trim() || user?.business_name,
        fallbackName: user?.business_name,
        updateUser,
        qc,
      });
      toast.success(
        lang === "bn"
          ? "ডিফল্ট লোগো ফিরিয়ে আনা হয়েছে"
          : "Store logo reset to default",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <>
      <Card className="p-4 sm:p-5 bg-card/75 backdrop-blur-md border-border beveled-card space-y-4">
        {/* Header & Master Switch */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Layers className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">
                  {lang === "bn"
                    ? "ইউআই সুইচার ও এমেরাল্ড গ্লাস (PC)"
                    : "UI Switcher & Emerald Glass (PC)"}
                </h3>
                <Badge
                  variant="outline"
                  className={
                    emeraldActive
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                      : "text-[10px]"
                  }
                >
                  {emeraldActive
                    ? lang === "bn"
                      ? "এমেরাল্ড চালু"
                      : "Emerald ON"
                    : lang === "bn"
                      ? "ক্লাসিক মোড"
                      : "Classic"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {lang === "bn"
                  ? "পিসি সংস্করণে ফ্রস্টেড গ্লাস ব্যাকগ্রাউন্ড ও এমেরাল্ড কার্ড কালার পরিবর্তন করুন — মূল সিস্টেম অপরিবর্তিত থাকবে।"
                  : "Switch between Classic POS UI and frosted Emerald Glass background & card styling on PC."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <Switch
              checked={emeraldActive}
              onCheckedChange={handleToggleEmerald}
              aria-label="Toggle Emerald Mode"
            />
          </div>
        </div>

        {/* Visual UI Mode Switcher Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleToggleEmerald(false)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              !emeraldActive
                ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-xs"
                : "border-border/80 bg-muted/25 hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Monitor className="size-3.5 text-muted-foreground" />
                {lang === "bn" ? "ক্লাসিক ইউআই" : "Classic UI"}
              </span>
              {!emeraldActive && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {lang === "bn"
                ? "মূল ক্লিন বেভেল ও ডিফল্ট লেআউট"
                : "Original Urobili surfaces & layout"}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleToggleEmerald(true)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              emeraldActive
                ? "border-emerald-500 bg-emerald-500/12 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-border/80 bg-emerald-500/5 hover:bg-emerald-500/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <RiSparklingLine className="size-3.5 text-emerald-500" />
                {lang === "bn" ? "এমেরাল্ড গ্লাস" : "Emerald Mode"}
              </span>
              {emeraldActive && (
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {lang === "bn"
                ? "গ্লাস ব্যাকগ্রাউন্ড + এমেরাল্ড ডিভ ও কার্ড"
                : "Frosted glass backdrop + emerald surfaces"}
            </p>
          </button>
        </div>

        {/* Owner Custom Background Image (Local DB Storage) */}
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {lang === "bn"
                    ? "কাস্টম ড্যাশবোর্ড ব্যাকগ্রাউন্ড (লোকাল ডিবি)"
                    : "Custom Dashboard Background (Local DB)"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {lang === "bn"
                    ? "কম্পিউটার থেকে ছবি আপলোড করুন — লোকাল ডাটাবেসে অফলাইনেও সেভ থাকবে"
                    : "Owner can upload any photo as the Glassy UI backdrop — stored offline in Local DB"}
                </p>
              </div>
            </div>

            {isLocalBackdrop && (
              <Badge
                variant="outline"
                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 text-[10px]"
              >
                {lang === "bn" ? "লোকাল ডিবি সেভড" : "Saved in Local DB"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-20 h-12 rounded-xl border border-border/80 bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
              {resolvedBackdropPreview ? (
                <img
                  src={resolvedBackdropPreview}
                  alt="Dashboard backdrop preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImagePlus className="size-4 text-muted-foreground/60" />
              )}
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!isOwner || uploadingBg}
                onClick={() => bgInputRef.current?.click()}
                className="h-8 px-3 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
              >
                <Upload className="size-3.5" />
                <span>
                  {uploadingBg
                    ? lang === "bn"
                      ? "সংরক্ষণ হচ্ছে..."
                      : "Saving..."
                    : lang === "bn"
                      ? "ছবি আপলোড (Local DB)"
                      : "Upload Photo (Local DB)"}
                </span>
              </Button>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadBackdrop}
                className="hidden"
              />

              {isLocalBackdrop && isOwner && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClearLocalBackdrop}
                  className="h-8 px-2.5 rounded-xl text-[11px] text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 gap-1 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>{lang === "bn" ? "মুছে ফেলুন" : "Remove"}</span>
                </Button>
              )}
            </div>
          </div>

          {!isOwner && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              {lang === "bn"
                ? "শুধুমাত্র স্টোরের ওনার কাস্টম ব্যাকগ্রাউন্ড পরিবর্তন করতে পারবেন।"
                : "Only the store owner can upload or change the custom store wallpaper."}
            </p>
          )}
        </div>

        {/* Adjustable Glass Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[11px] font-bold text-foreground">
              {lang === "bn" ? "গ্লাস প্রিসেট" : "Glass Material Presets"}
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setStudioOpen(true)}
              className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg border-emerald-500/35 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Eye className="size-3.5" />
              <span>
                {lang === "bn"
                  ? "গ্লাস ওয়ার্কস্পেস প্রিভিউ"
                  : "Open Glass Workspace"}
              </span>
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {EMERALD_GLASS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateGlass(preset.values)}
                className="py-1.5 px-2 rounded-lg border border-border/80 bg-background/60 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-[10px] font-semibold transition-all cursor-pointer text-foreground"
              >
                {lang === "bn" ? preset.labelBn : preset.labelEn}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <Label>{lang === "bn" ? "ব্লার (Blur)" : "Blur"}</Label>
                <span className="font-mono">{Math.round(glass.blur)}px</span>
              </div>
              <Slider
                min={0}
                max={40}
                step={1}
                value={[glass.blur]}
                onValueChange={(v) => updateGlass({ blur: v[0] })}
                className="py-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <Label>{lang === "bn" ? "অপাসিটি (Opacity)" : "Opacity"}</Label>
                <span className="font-mono">
                  {Math.round(glass.opacity * 100)}%
                </span>
              </div>
              <Slider
                min={0.08}
                max={0.9}
                step={0.02}
                value={[glass.opacity]}
                onValueChange={(v) => updateGlass({ opacity: v[0] })}
                className="py-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <Label>
                  {lang === "bn" ? "স্যাচুরেশন (Saturation)" : "Saturation"}
                </Label>
                <span className="font-mono">
                  {Math.round(glass.saturation * 100)}%
                </span>
              </div>
              <Slider
                min={0.5}
                max={2}
                step={0.05}
                value={[glass.saturation]}
                onValueChange={(v) => updateGlass({ saturation: v[0] })}
                className="py-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <Label>
                  {lang === "bn" ? "এজ লাইট (Edge Light)" : "Edge Highlight"}
                </Label>
                <span className="font-mono">
                  {Math.round(glass.edge * 100)}%
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[glass.edge]}
                onValueChange={(v) => updateGlass({ edge: v[0] })}
                className="py-1.5"
              />
            </div>
          </div>

          {/* Tint & Wallpaper URL / Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">
                {lang === "bn" ? "গ্লাস টিন্ট রং" : "Glass Tint"}
              </Label>
              <div className="flex items-center gap-2 border border-border rounded-lg px-2 h-8 bg-background/70">
                <input
                  type="color"
                  value={glass.tint}
                  onChange={(e) => updateGlass({ tint: e.target.value })}
                  className="size-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-[10px] font-mono text-foreground">
                  {glass.tint}
                </span>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">
                {lang === "bn"
                  ? "পিসি ব্যাকগ্রাউন্ড ওয়ালপেপার URL"
                  : "PC Backdrop Wallpaper URL"}
              </Label>
              <Input
                value={isLocalBackdrop ? "" : glass.backdropImage}
                onChange={(e) => updateGlass({ backdropImage: e.target.value })}
                placeholder={
                  isLocalBackdrop
                    ? lang === "bn"
                      ? "লোকাল ডাটাবেসের ছবি সক্রিয় আছে"
                      : "Using custom photo from Local DB"
                    : "https://images.unsplash.com/..."
                }
                disabled={!isOwner}
                className="h-8 text-xs bg-background/70"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground">
                {lang === "bn"
                  ? "ব্যাকগ্রাউন্ড প্রিসেট (Unsplash ও লোকাল)"
                  : "Backdrop Presets"}
              </Label>
              <button
                type="button"
                onClick={() => updateGlass(DEFAULT_EMERALD_GLASS)}
                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                {lang === "bn" ? "রিসেট গ্লাস" : "Reset Glass"}
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {EMERALD_BACKDROP_PRESETS.map((bp) => {
                const active = glass.backdropImage === bp.url;
                return (
                  <button
                    key={bp.id}
                    type="button"
                    disabled={!isOwner}
                    onClick={() => updateGlass({ backdropImage: bp.url })}
                    className={`h-11 rounded-lg border text-[9px] font-bold px-1 flex items-center justify-center text-center transition-all cursor-pointer overflow-hidden bg-cover bg-center disabled:opacity-50 ${
                      active
                        ? "border-emerald-500 ring-1 ring-emerald-500 text-emerald-950 dark:text-white shadow-xs"
                        : "border-border/80 text-foreground/90 hover:border-emerald-500/40"
                    }`}
                    style={
                      bp.url
                        ? {
                            backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.24), rgba(6, 78, 59, 0.32)), url('${bp.url}')`,
                            color: "#ffffff",
                            textShadow: "0 1px 2px rgba(0,0,0,0.65)",
                          }
                        : undefined
                    }
                  >
                    {lang === "bn" ? bp.labelBn : bp.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Owner Store Logo & Identity */}
        <div className="rounded-2xl border border-border/80 bg-muted/25 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <Store className="size-4 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {lang === "bn"
                    ? "স্টোরের লোগো ও ব্র্যান্ড (ওনার)"
                    : "Store Logo & Branding (Owner)"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {lang === "bn"
                    ? "দোকানের নিজস্ব লোগো সাইডবার, গ্লাস ড্যাশবোর্ড ও রসিদে দেখা যাবে"
                    : "Custom store logo appears in sidebar, header, Glass Workspace, and POS profile"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="h-14 min-w-14 max-w-[140px] px-2 rounded-xl border border-border/80 bg-background/80 flex items-center justify-center overflow-hidden shrink-0">
              <AppLogo size="md" className="max-h-11" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!isOwner || uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="h-8 px-3 rounded-xl text-[11px] font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>
                    {uploadingLogo
                      ? lang === "bn"
                        ? "আপলোড হচ্ছে..."
                        : "Saving Logo..."
                      : lang === "bn"
                        ? "লোগো সেট করুন"
                        : "Set Store Logo"}
                  </span>
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadStoreLogo}
                  className="hidden"
                />

                {isOwner && user?.logo_url && user.logo_url !== "/logo.png" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploadingLogo}
                    onClick={handleResetDefaultLogo}
                    className="h-8 px-2.5 rounded-xl text-[11px] gap-1 cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    <span>{lang === "bn" ? "ডিফল্ট" : "Reset"}</span>
                  </Button>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <Input
                    value={storeNameInput}
                    onChange={(e) => setStoreNameInput(e.target.value)}
                    placeholder={lang === "bn" ? "দোকানের নাম" : "Store Name"}
                    className="h-7 text-xs bg-background/75 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploadingLogo || !storeNameInput.trim()}
                    onClick={handleSaveStoreNameOnly}
                    className="h-7 px-2.5 text-[11px] rounded-lg font-semibold cursor-pointer shrink-0"
                  >
                    {lang === "bn" ? "নাম সেভ" : "Save Name"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <EmeraldGlassStudio open={studioOpen} onOpenChange={setStudioOpen} />
    </>
  );
}
