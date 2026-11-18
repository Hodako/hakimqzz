"use client";

import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import {
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
import { saveLocalBackgroundImage } from "@/lib/local-media-db";
import { EmeraldGlassStudio } from "@/components/emerald-glass-studio";
import { Eye, Layers, Settings2, Upload } from "lucide-react";

/**
 * Compact PC-only quick trigger for adjusting Emerald Glass material or opening
 * the live GlassWorkspace studio when Emerald Mode is active.
 */
export function PcEmeraldQuickButton() {
  const { lang } = useT();
  const { user } = useAuth();
  const [config, setConfig] = useState<ThemeConfig>({});
  const [studioOpen, setStudioOpen] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const isOwner =
    !user ||
    (user.role !== "employee" &&
      !(
        typeof window !== "undefined" &&
        Boolean(window.localStorage.getItem("cw_active_employee_session"))
      ));

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

  const emeraldActive = isEmeraldModeEnabled(config);
  const glass = normalizeEmeraldGlass(config.emeraldGlass);

  const updateGlass = (patch: Partial<EmeraldGlassConfig>) => {
    const next = writeCustomThemeConfig({
      emeraldMode: true,
      uiStyle: "emerald",
      emeraldGlass: normalizeEmeraldGlass({ ...glass, ...patch }),
    });
    setConfig(next);
  };

  const handleQuickBgUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isOwner) return;
    setUploadingBg(true);
    try {
      const localRef = await saveLocalBackgroundImage(file, "emerald_backdrop");
      updateGlass({ backdropImage: localRef });
      toast.success(
        lang === "bn"
          ? "ব্যাকগ্রাউন্ড লোকাল ডিবিতে সেভ হয়েছে"
          : "Backdrop saved to Local DB",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save backdrop");
    } finally {
      setUploadingBg(false);
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`hidden md:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
              emeraldActive
                ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-700 dark:text-emerald-300"
                : "bg-muted/60 hover:bg-emerald-500/10 border-border text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300"
            }`}
            title={
              lang === "bn"
                ? "এমেরাল্ড গ্লাস ও ব্যাকগ্রাউন্ড কন্ট্রোল"
                : "Adjust Emerald Glass & UI"
            }
          >
            <Settings2
              className={`size-3 ${
                emeraldActive ? "text-emerald-600 dark:text-emerald-400" : ""
              }`}
            />
            <span>
              {emeraldActive
                ? lang === "bn"
                  ? "গ্লাস ইউআই"
                  : "Adjust Glass"
                : lang === "bn"
                  ? "এমেরাল্ড গ্লাস"
                  : "Glass UI"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-4 space-y-3 rounded-2xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-foreground">
                {lang === "bn" ? "এমেরাল্ড গ্লাস মোড" : "Emerald Glass UI"}
              </span>
            </div>
            <Switch
              checked={emeraldActive}
              onCheckedChange={(checked) => setConfig(toggleEmeraldMode(checked))}
              aria-label="Toggle Emerald Mode"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {EMERALD_GLASS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateGlass(preset.values)}
                className="py-1.5 px-2 rounded-lg border border-border/80 bg-background/60 hover:bg-emerald-500/10 text-[10px] font-semibold cursor-pointer text-foreground"
              >
                {lang === "bn" ? preset.labelBn : preset.labelEn}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{lang === "bn" ? "ব্লার (Blur)" : "Blur"}</span>
              <span className="font-mono">{Math.round(glass.blur)}px</span>
            </div>
            <Slider
              min={0}
              max={40}
              step={1}
              value={[glass.blur]}
              onValueChange={(v) => updateGlass({ blur: v[0] })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{lang === "bn" ? "অপাসিটি (Opacity)" : "Opacity"}</span>
              <span className="font-mono">{Math.round(glass.opacity * 100)}%</span>
            </div>
            <Slider
              min={0.08}
              max={0.9}
              step={0.02}
              value={[glass.opacity]}
              onValueChange={(v) => updateGlass({ opacity: v[0] })}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {lang === "bn" ? "গ্লাস টিন্ট" : "Glass tint"}
            </span>
            <input
              type="color"
              value={glass.tint}
              onChange={(e) => updateGlass({ tint: e.target.value })}
              className="w-9 h-6 rounded border border-border cursor-pointer bg-transparent p-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {isOwner && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingBg}
                  onClick={() => bgFileRef.current?.click()}
                  className="w-full h-8 text-[11px] font-semibold rounded-xl gap-1.5 cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>
                    {uploadingBg
                      ? lang === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : lang === "bn"
                        ? "ব্যাকগ্রাউন্ড ছবি (Local DB)"
                        : "Upload Backdrop (Local DB)"}
                  </span>
                </Button>
                <input
                  ref={bgFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQuickBgUpload}
                  className="hidden"
                />
              </>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => setStudioOpen(true)}
              className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 cursor-pointer"
            >
              <Eye className="size-3.5" />
              <span>
                {lang === "bn" ? "গ্লাস ওয়ার্কস্পেস খুলুন" : "Open Glass Workspace"}
              </span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <EmeraldGlassStudio open={studioOpen} onOpenChange={setStudioOpen} />
    </>
  );
}
