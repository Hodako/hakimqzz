"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Type, Image as ImageIcon, Sparkles, RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/hooks/use-theme";
import {
  EMERALD_BACKDROP_PRESETS,
  readCustomThemeConfig,
  writeCustomThemeConfig,
  type ThemeConfig,
  type UiStylePreset,
} from "@/lib/emerald-theme";
import { toast } from "sonner";

const UI_PRESETS: { id: UiStylePreset; labelEn: string; labelBn: string; emeraldMode: boolean; primary: string; bg?: string; text?: string }[] = [
  { id: "emerald", labelEn: "Emerald Glass", labelBn: "এমেরাল্ড গ্লাস", emeraldMode: true, primary: "#059669" },
  { id: "glassmorphism", labelEn: "Frosted Glass", labelBn: "ফ্রস্টেড গ্লাস", emeraldMode: true, primary: "#1d63dc" },
  { id: "minimalist", labelEn: "Warm Paper", labelBn: "ওয়ার্ম পেপার", emeraldMode: false, primary: "#0f766e", bg: "#faf8f5", text: "#14211d" },
  { id: "luxury", labelEn: "Midnight Ink", labelBn: "মিডনাইট ইঙ্ক", emeraldMode: false, primary: "#d97706", bg: "#090d16", text: "#f8fafc" },
  { id: "brutalism", labelEn: "Bold Brutalism", labelBn: "বোল্ড ব্রুটালিজম", emeraldMode: false, primary: "#111827" },
  { id: "default", labelEn: "Classic Clean", labelBn: "ক্লাসিক ক্লিন", emeraldMode: false, primary: "#059669" },
];

const FONT_OPTIONS = [
  { id: "", label: "Default System" },
  { id: "Schibsted Grotesk, sans-serif", label: "Schibsted Grotesk" },
  { id: "Plus Jakarta Sans, sans-serif", label: "Plus Jakarta Sans" },
  { id: "Instrument Sans, sans-serif", label: "Instrument Sans" },
  { id: "Hind Siliguri, sans-serif", label: "Hind Siliguri (বাংলা)" },
  { id: "DM Mono, monospace", label: "DM Mono (Tabular)" },
];

const COLOR_SWATCHES = [
  "#059669",
  "#1d63dc",
  "#6366f1",
  "#d97706",
  "#e11d48",
  "#0f172a",
];

const TEXT_COLOR_SWATCHES = [
  { val: "", labelEn: "Auto", labelBn: "স্বয়ংক্রিয়" },
  { val: "#0f172a", labelEn: "Deep Slate", labelBn: "গাঢ় স্লেট" },
  { val: "#14261f", labelEn: "Forest Ink", labelBn: "সবুজ কালি" },
  { val: "#1e1b4b", labelEn: "Indigo Ink", labelBn: "নীল কালি" },
  { val: "#f8fafc", labelEn: "Crisp White", labelBn: "সাদা" },
];

export function PcThemeQuickStudio({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { lang } = useT();
  const { setTheme } = useTheme();
  const [cfg, setCfg] = useState<ThemeConfig>({});

  useEffect(() => {
    if (open) {
      setCfg(readCustomThemeConfig());
    }
  }, [open]);

  function applyPatch(patch: Partial<ThemeConfig>) {
    const next: ThemeConfig = { ...cfg, ...patch };
    setCfg(next);
    writeCustomThemeConfig(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-4 text-primary" />
            <span>
              {lang === "bn"
                ? "পিসি ড্যাশবোর্ড UI স্টুডিও (ব্যাকগ্রাউন্ড, ফন্ট ও রঙ)"
                : "PC Dashboard UI Studio (Designs, Backgrounds, Fonts & Colors)"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* 1. Design Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Palette className="size-3.5 text-primary" />
              <span>{lang === "bn" ? "ডিজাইন প্রিসেট" : "UI Design Presets"}</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {UI_PRESETS.map((p) => {
                const active = cfg.uiStyle === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.id === "luxury") setTheme("dark");
                      else if (p.id === "minimalist") setTheme("light");
                      applyPatch({
                        uiStyle: p.id,
                        emeraldMode: p.emeraldMode,
                        primaryColor: p.primary,
                        backgroundColor: p.bg || "",
                        textColor: p.text || "",
                      });
                    }}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                      active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span>{lang === "bn" ? p.labelBn : p.labelEn}</span>
                    <span className="size-3.5 rounded-full shrink-0" style={{ background: p.primary }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Glass & Dashboard Backgrounds */}
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <ImageIcon className="size-3.5 text-primary" />
              <span>{lang === "bn" ? "ব্যাকগ্রাউন্ড ওয়ালপেপার" : "Backdrop & Background Image"}</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMERALD_BACKDROP_PRESETS.slice(0, 6).map((b) => {
                const active = (cfg.emeraldGlass?.backdropImage || cfg.bgImage) === b.url;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      applyPatch({
                        emeraldMode: true,
                        bgImage: b.url,
                        emeraldGlass: { ...cfg.emeraldGlass, backdropImage: b.url },
                      })
                    }
                    className={`p-2 rounded-2xl border text-left text-[11px] font-semibold transition cursor-pointer space-y-1.5 ${
                      active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <img src={b.url} alt={b.labelEn} className="w-full h-14 object-cover rounded-xl bg-muted" />
                    <div className="truncate">{lang === "bn" ? b.labelBn : b.labelEn}</div>
                  </button>
                );
              })}
            </div>
            <Input
              value={cfg.emeraldGlass?.backdropImage || cfg.bgImage || ""}
              onChange={(e) =>
                applyPatch({
                  bgImage: e.target.value,
                  emeraldGlass: { ...cfg.emeraldGlass, backdropImage: e.target.value },
                })
              }
              placeholder={lang === "bn" ? "কাস্টম ব্যাকগ্রাউন্ড URL দিন..." : "Custom background image URL..."}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* 3. Font Family */}
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Type className="size-3.5 text-primary" />
              <span>{lang === "bn" ? "ফন্ট স্টাইল" : "Typography & Font Family"}</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => applyPatch({ fontFamily: f.id })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer text-left ${
                    (cfg.fontFamily || "") === f.id ? "border-primary bg-primary/10" : "border-border"
                  }`}
                  style={f.id ? { fontFamily: f.id } : undefined}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Accent Color & Text Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {lang === "bn" ? "প্রাইমারি অ্যাকসেন্ট রঙ" : "Primary Accent Color"}
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => applyPatch({ primaryColor: c })}
                    className={`size-8 rounded-full border-2 cursor-pointer ${
                      cfg.primaryColor === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={cfg.primaryColor || "#059669"}
                  onChange={(e) => applyPatch({ primaryColor: e.target.value })}
                  className="size-8 rounded-lg cursor-pointer border border-border bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {lang === "bn" ? "টেক্সট রঙ" : "Text Color"}
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {TEXT_COLOR_SWATCHES.map((tc) => (
                  <button
                    key={tc.labelEn}
                    type="button"
                    onClick={() => applyPatch({ textColor: tc.val })}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                      (cfg.textColor || "") === tc.val ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    {lang === "bn" ? tc.labelBn : tc.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                writeCustomThemeConfig({});
                setCfg({});
                toast.success(lang === "bn" ? "ডিফল্ট থিমে ফিরে এসেছে" : "Reset to default theme");
              }}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>{lang === "bn" ? "ডিফল্ট রিসেট" : "Reset Theme"}</span>
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)} className="rounded-xl text-xs px-5 cursor-pointer">
              {lang === "bn" ? "সম্পন্ন" : "Done"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
