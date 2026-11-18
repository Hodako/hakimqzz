import type { CSSProperties } from "react";
import type { GlassSettings } from "@/components/ui/adjustable-glass-dashboard";

export type UiStylePreset =
  | "default"
  | "brutalism"
  | "new-brutalism"
  | "morphism"
  | "glassmorphism"
  | "flowerism"
  | "cyberpunk"
  | "minimalist"
  | "forest"
  | "luxury"
  | "feather"
  | "emerald";

export type EmeraldGlassConfig = GlassSettings & {
  backdropImage: string;
};

export type ThemeConfig = {
  primaryColor?: string;
  backgroundColor?: string;
  bgImage?: string;
  bgImageOpacity?: number;
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  density?: "compact" | "standard" | "cozy";
  widgetOrder?: string[];
  isMaterialUI?: boolean;
  uiStyle?: UiStylePreset;
  emeraldMode?: boolean;
  emeraldGlass?: Partial<EmeraldGlassConfig>;
  bevelStrength?: "none" | "light" | "medium" | "heavy";
  glowEnabled?: boolean;
  glowIntensity?: number;
  borderRadius?: "none" | "small" | "medium" | "large" | "full";
  productBoxSize?: "small" | "standard" | "large";
  borderWidth?: "none" | "thin" | "medium" | "thick" | "heavy";
  shadowStyle?: "none" | "soft" | "medium" | "deep" | "brutal";
  cardOpacity?: number;
  cardBlur?: number;
  animationSpeed?: "none" | "fast" | "normal" | "slow";
  cardDarkness?: number;
  kpiStyle?: "default" | "glass" | "neon" | "borderless";
  customFontUrl?: string;
  customFontName?: string;
};

export const THEME_STORAGE_KEY = "hz_custom_theme";
export const THEME_UPDATED_EVENT = "hz-theme-updated";

export const DEFAULT_EMERALD_GLASS: EmeraldGlassConfig = {
  blur: 22,
  opacity: 0.34,
  saturation: 1.25,
  tint: "#10b981",
  edge: 0.65,
  backdropImage: "/glass-refresh-bg.jpg",
};

export const EMERALD_BACKDROP_PRESETS: Array<{
  id: string;
  labelEn: string;
  labelBn: string;
  url: string;
}> = [
  {
    id: "refreshing-aurora",
    labelEn: "Refreshing Mint Aurora",
    labelBn: "রিফ্রেশিং মিন্ট অরোরা",
    url: "/glass-refresh-bg.jpg",
  },
  {
    id: "emerald-leaves",
    labelEn: "Emerald Botanical",
    labelBn: "এমেরাল্ড বোটানিক্যাল",
    url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "warm-glass",
    labelEn: "Warm Abstract",
    labelBn: "ওয়ার্ম অ্যাবস্ট্রাক্ট",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: "silk-mesh",
    labelEn: "Silk Mesh",
    labelBn: "সিল্ক মেশ",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: "studio-bg",
    labelEn: "Soft Studio",
    labelBn: "সফট স্টুডিও",
    url: "/background.avif",
  },
  {
    id: "glass-local",
    labelEn: "Offline Glass",
    labelBn: "অফলাইন গ্লাস",
    url: "/glassmorphism_preset.png",
  },
  {
    id: "pure-gradient",
    labelEn: "Pure Gradient",
    labelBn: "পিওর গ্রেডিয়েন্ট",
    url: "",
  },
];

export const EMERALD_GLASS_PRESETS: Array<{
  id: string;
  labelEn: string;
  labelBn: string;
  values: Partial<EmeraldGlassConfig>;
}> = [
  {
    id: "clear",
    labelEn: "Clear",
    labelBn: "স্বচ্ছ",
    values: { blur: 10, opacity: 0.16, saturation: 1.15, edge: 0.85, tint: "#10b981" },
  },
  {
    id: "frosted",
    labelEn: "Emerald Frosted",
    labelBn: "এমেরাল্ড ফ্রস্টেড",
    values: { blur: 22, opacity: 0.34, saturation: 1.25, edge: 0.65, tint: "#10b981" },
  },
  {
    id: "solid",
    labelEn: "Deep Glass",
    labelBn: "ডিপ গ্লাস",
    values: { blur: 32, opacity: 0.78, saturation: 1.05, edge: 0.4, tint: "#059669" },
  },
  {
    id: "warm",
    labelEn: "Sage Warm",
    labelBn: "সেজ ওয়ার্ম",
    values: { blur: 22, opacity: 0.32, saturation: 1.2, edge: 0.6, tint: "#eadbc7" },
  },
];

export const EMERALD_WORKSPACE_PALETTE = {
  "--gw-ink": "light-dark(#1a2b23,#eef6f0)",
  "--gw-muted": "light-dark(#385245,#b7d0c2)",
  "--gw-accent": "light-dark(#296249,#6ee7b7)",
  "--gw-line": "light-dark(#29624926,#91d5b02b)",
  "--gw-background": "light-dark(#d7e6dc,#091911)",
  "--gw-shade": "light-dark(#e9f2ec1f,#07120c85)",
  "--gw-surface": "light-dark(#f6fbf8,#11241b)",
  "--gw-panel": "light-dark(#ffffff,#142b20)",
  "--gw-brand": "light-dark(#1f513b,#34d399)",
  "--gw-brand-ink": "light-dark(#ffffff,#071a11)",
  "--gw-avatar": "light-dark(#d8ebdf,#264d3a)",
  "--gw-rail-active": "light-dark(#ffffffcc,#6ee7b72b)",
  "--gw-positive-surface": "light-dark(#d6eee0,#1f4935)",
  "--gw-account-surface": "light-dark(#d4e8dc7a,#2d554055)",
  "--gw-account-action": "light-dark(#ffffff99,#91d5b024)",
  "--gw-segment": "light-dark(#244f3b14,#e7f6ed16)",
  "--gw-segment-active": "light-dark(#ffffffeb,#34d39933)",
  "--gw-transaction-surface": "light-dark(#dcebe290,#91d5b021)",
  "--gw-income-surface": "light-dark(#c6e6d399,#6ee7b726)",
  "--gw-pending": "light-dark(#8a6220,#f2cb7d)",
  "--gw-goal-surface": "light-dark(#d2e5d980,#91d5b022)",
  "--gw-dock": "light-dark(#eef7f170,#0d2117d6)",
  "--gw-dock-active": "light-dark(#fffffff2,#e6f6ec)",
  "--gw-button": "light-dark(#1f513b,#6ee7b7)",
  "--gw-button-ink": "light-dark(#ffffff,#082115)",
  "--gw-search": "light-dark(#ffffff66,#10261b88)",
  "--gw-savings-orb": "light-dark(#cde5d799,#6ee7b72b)",
  "--gw-popover": "light-dark(#f3faf6f2,#0f2319f5)",
  "--gw-notification": "light-dark(#f4fbf7f5,#0f2319f5)",
  "--gw-fallback": "light-dark(#ebf5ee,#13271d)",
  "--gw-mobile-dock": "light-dark(#ffffff66,#0d2117a8)",
  "--gw-shadow": "#0c241748",
  "--gw-panel-shadow": "#0c241740",
  "--gw-soft-shadow": "#10281b14",
  "--gw-segment-shadow": "#0d221712",
  "--gw-dock-shadow": "#0d221716",
  "--gw-popover-shadow": "#0a1c1238",
  "--gw-sample-shadow": "#0c2e1c78",
  "--gw-toast-shadow": "#0003",
  "--gw-toast": "#18422f",
  "--gw-dock-ink": "#1a3c2b",
  "--gw-selection": "#34d39955",
  "--gw-scrollbar": "#6fa68a",
  "--gw-hover": "#ffffff33",
  "--gw-dock-hover": "#ffffff40",
  "--gw-control-hover": "#ffffff44",
  "--gw-strong-edge": "#ffffffb3",
  "--gw-soft-edge": "#ffffff88",
  "--gw-toast-ink": "#ffffff",
  "--gw-highlight": "#ffffff",
} as CSSProperties;

export function isEmeraldModeEnabled(config?: ThemeConfig | null): boolean {
  if (!config) return false;
  return Boolean(config.emeraldMode || config.uiStyle === "emerald");
}

export function normalizeEmeraldGlass(
  partial?: Partial<EmeraldGlassConfig>,
): EmeraldGlassConfig {
  const num = (v: unknown, min: number, max: number, fb: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(max, Math.max(min, v))
      : fb;

  return {
    blur: num(partial?.blur, 0, 40, DEFAULT_EMERALD_GLASS.blur),
    opacity: num(partial?.opacity, 0.08, 0.9, DEFAULT_EMERALD_GLASS.opacity),
    saturation: num(
      partial?.saturation,
      0.5,
      2,
      DEFAULT_EMERALD_GLASS.saturation,
    ),
    edge: num(partial?.edge, 0, 1, DEFAULT_EMERALD_GLASS.edge),
    tint:
      typeof partial?.tint === "string" && /^#[0-9a-f]{6}$/i.test(partial.tint)
        ? partial.tint
        : DEFAULT_EMERALD_GLASS.tint,
    backdropImage:
      typeof partial?.backdropImage === "string"
        ? partial.backdropImage
        : DEFAULT_EMERALD_GLASS.backdropImage,
  };
}

export function readCustomThemeConfig(): ThemeConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ThemeConfig) : {};
  } catch {
    return {};
  }
}

export function writeCustomThemeConfig(
  patch: Partial<ThemeConfig>,
  replace = false,
): ThemeConfig {
  if (typeof window === "undefined") return patch as ThemeConfig;
  const current = replace ? {} : readCustomThemeConfig();
  const next: ThemeConfig = { ...current, ...patch };
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(THEME_UPDATED_EVENT));
  return next;
}

export function toggleEmeraldMode(
  enabled: boolean,
  glassPatch?: Partial<EmeraldGlassConfig>,
): ThemeConfig {
  const current = readCustomThemeConfig();
  const mergedGlass = normalizeEmeraldGlass({
    ...current.emeraldGlass,
    ...glassPatch,
  });

  if (enabled) {
    return writeCustomThemeConfig({
      emeraldMode: true,
      uiStyle: "emerald",
      isMaterialUI: false,
      emeraldGlass: mergedGlass,
      borderRadius: current.borderRadius || "large",
    });
  }

  return writeCustomThemeConfig({
    emeraldMode: false,
    uiStyle: current.uiStyle === "emerald" ? "default" : current.uiStyle,
  });
}
