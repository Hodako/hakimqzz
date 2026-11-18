"use client";

import { useEffect, useState } from "react";
import {
  THEME_UPDATED_EVENT,
  isEmeraldModeEnabled,
  normalizeEmeraldGlass,
  readCustomThemeConfig,
  type ThemeConfig,
} from "@/lib/emerald-theme";
import { useResolvedMediaUrl } from "@/lib/local-media-db";

/**
 * Renders the full-bleed atmospheric glass backdrop on desktop screens (>= 768px)
 * whenever Emerald Mode is enabled in UI Settings.
 */
export function PcEmeraldBackdrop() {
  const [config, setConfig] = useState<ThemeConfig>({});
  const [imgFailed, setImgFailed] = useState(false);

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

  const enabled = isEmeraldModeEnabled(config);
  const glass = normalizeEmeraldGlass(config.emeraldGlass);
  const rawBackdrop = glass.backdropImage?.trim() || "/glass-refresh-bg.jpg";
  const backdropUrl = useResolvedMediaUrl(rawBackdrop, "/glass-refresh-bg.jpg");

  useEffect(() => {
    setImgFailed(false);
  }, [backdropUrl]);

  if (!enabled) return null;

  return (
    <div
      className="pc-emerald-backdrop hidden md:block pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Pure CSS botanical emerald atmosphere (offline-safe base layer) */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 12% 8%, color-mix(in srgb, var(--gw-tint, #10b981) 36%, transparent), transparent 62%), radial-gradient(ellipse 70% 60% at 88% 92%, color-mix(in srgb, var(--primary, #059669) 32%, transparent), transparent 65%), linear-gradient(140deg, var(--background) 0%, color-mix(in srgb, var(--background) 82%, #10b981) 50%, var(--background) 100%)",
        }}
      />

      {/* Full-bleed Unsplash or user-chosen room/nature glass wallpaper */}
      {backdropUrl && !imgFailed && (
        <img
          src={backdropUrl}
          alt=""
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-45 dark:opacity-35 transition-opacity duration-500 scale-[1.02]"
        />
      )}

      {/* Tint scrim so sidebar, cards, and foreground numbers always stay sharp */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--background) 42%, transparent) 0%, color-mix(in srgb, var(--background) 28%, transparent) 55%, color-mix(in srgb, var(--background) 48%, transparent) 100%)",
        }}
      />
    </div>
  );
}
