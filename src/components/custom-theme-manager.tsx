"use client";

import { useEffect, useState } from "react";

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
  uiStyle?: "default" | "brutalism" | "new-brutalism" | "morphism" | "glassmorphism" | "flowerism";
  bevelStrength?: "none" | "light" | "medium" | "heavy";
  glowEnabled?: boolean;
  borderRadius?: "none" | "small" | "medium" | "large" | "full";
};

export function CustomThemeManager() {
  const [config, setConfig] = useState<ThemeConfig>({});

  const loadTheme = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("hz_custom_theme");
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom theme config", e);
      }
    } else {
      setConfig({});
    }
  };

  useEffect(() => {
    loadTheme();

    const handleUpdate = () => {
      loadTheme();
    };

    window.addEventListener("hz-theme-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("hz-theme-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let styleEl = document.getElementById("hz-custom-theme-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "hz-custom-theme-styles";
      document.head.appendChild(styleEl);
    }

    let css = "";

    // 0. Preset Style overrides
    if (config.uiStyle === "brutalism") {
      css += `
        /* Brutalism Overrides */
        :root, .dark {
          --radius: 0px !important;
        }
        .card, .beveled-card, .glass-card, [class*="glass-card"], [class*="beveled-card"] {
          background-color: var(--card) !important;
          background: var(--card) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border: 3.5px solid #000000 !important;
          border-radius: 0px !important;
          box-shadow: 6px 6px 0px #000000 !important;
          transition: transform 0.1s ease, box-shadow 0.1s ease !important;
        }
        .dark .card, .dark .beveled-card, .dark .glass-card, .dark [class*="glass-card"], .dark [class*="beveled-card"] {
          border: 3.5px solid #ffffff !important;
          box-shadow: 6px 6px 0px #ffffff !important;
        }
        .card:hover, .beveled-card:hover, .glass-card:hover {
          box-shadow: 8px 8px 0px #000000 !important;
          transform: translate(-2px, -2px) !important;
        }
        .dark .card:hover, .dark .beveled-card:hover, .dark .glass-card:hover {
          box-shadow: 8px 8px 0px #ffffff !important;
        }
        .card:active, .beveled-card:active, .glass-card:active {
          box-shadow: 2px 2px 0px #000000 !important;
          transform: translate(4px, 4px) !important;
        }
        .dark .card:active, .dark .beveled-card:active, .dark .glass-card:active {
          box-shadow: 2px 2px 0px #ffffff !important;
        }
        button, .button, .beveled-button, button[class*="beveled-button"], [role="button"] {
          border-radius: 0px !important;
          border: 3px solid #000000 !important;
          box-shadow: 4px 4px 0px #000000 !important;
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          transition: transform 0.1s ease, box-shadow 0.1s ease !important;
        }
        .dark button, .dark .button, .dark .beveled-button, .dark button[class*="beveled-button"], .dark [role="button"] {
          border: 3px solid #ffffff !important;
          box-shadow: 4px 4px 0px #ffffff !important;
        }
        button:hover, .button:hover, .beveled-button:hover {
          box-shadow: 6px 6px 0px #000000 !important;
          transform: translate(-2px, -2px) !important;
        }
        .dark button:hover, .dark .button:hover, .dark .beveled-button:hover {
          box-shadow: 6px 6px 0px #ffffff !important;
        }
        button:active, .button:active, .beveled-button:active {
          box-shadow: 1px 1px 0px #000000 !important;
          transform: translate(3px, 3px) !important;
        }
        .dark button:active, .dark .button:active, .dark .beveled-button:active {
          box-shadow: 1px 1px 0px #ffffff !important;
        }
        input, select, textarea {
          border-radius: 0px !important;
          border: 3px solid #000000 !important;
          background-color: var(--background) !important;
          box-shadow: 3px 3px 0px #000000 !important;
        }
        .dark input, .dark select, .dark textarea {
          border: 3px solid #ffffff !important;
          box-shadow: 3px 3px 0px #ffffff !important;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary) !important;
          box-shadow: 4px 4px 0px var(--primary) !important;
          outline: none !important;
        }
      `;
    } else if (config.uiStyle === "new-brutalism") {
      css += `
        /* New Brutalism (Neo-Brutalism) Overrides */
        :root, .dark {
          --radius: 12px !important;
        }
        .card, .beveled-card, .glass-card, [class*="glass-card"], [class*="beveled-card"] {
          background-color: var(--card) !important;
          background: var(--card) !important;
          border: 2px solid #18181b !important;
          border-radius: 12px !important;
          box-shadow: 4px 4px 0px #18181b !important;
          transition: transform 0.1s ease, box-shadow 0.1s ease !important;
        }
        .dark .card, .dark .beveled-card, .dark .glass-card {
          border: 2px solid #ffffff !important;
          box-shadow: 4px 4px 0px #ffffff !important;
        }
        .card:hover, .beveled-card:hover, .glass-card:hover {
          box-shadow: 6px 6px 0px #18181b !important;
          transform: translate(-2px, -2px) !important;
        }
        .dark .card:hover, .dark .beveled-card:hover, .dark .glass-card:hover {
          box-shadow: 6px 6px 0px #ffffff !important;
        }
        .card:active, .beveled-card:active, .glass-card:active {
          box-shadow: 1px 1px 0px #18181b !important;
          transform: translate(3px, 3px) !important;
        }
        .dark .card:active, .dark .beveled-card:active, .dark .glass-card:active {
          box-shadow: 1px 1px 0px #ffffff !important;
        }
        button, .button, .beveled-button, button[class*="beveled-button"], [role="button"] {
          border-radius: 10px !important;
          border: 2px solid #18181b !important;
          box-shadow: 3px 3px 0px #18181b !important;
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
          font-weight: 600 !important;
          transition: transform 0.1s ease, box-shadow 0.1s ease !important;
        }
        .dark button, .dark .button, .dark .beveled-button {
          border: 2px solid #ffffff !important;
          box-shadow: 3px 3px 0px #ffffff !important;
        }
        button:hover, .button:hover, .beveled-button:hover {
          box-shadow: 5px 5px 0px #18181b !important;
          transform: translate(-2px, -2px) !important;
        }
        .dark button:hover, .dark .button:hover, .dark .beveled-button:hover {
          box-shadow: 5px 5px 0px #ffffff !important;
        }
        button:active, .button:active, .beveled-button:active {
          box-shadow: 1px 1px 0px #18181b !important;
          transform: translate(2px, 2px) !important;
        }
        .dark button:active, .dark .button:active, .dark .beveled-button:active {
          box-shadow: 1px 1px 0px #ffffff !important;
        }
        input, select, textarea {
          border-radius: 10px !important;
          border: 2px solid #18181b !important;
          box-shadow: 2px 2px 0px #18181b !important;
        }
        .dark input, .dark select, .dark textarea {
          border: 2px solid #ffffff !important;
          box-shadow: 2px 2px 0px #ffffff !important;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary) !important;
          box-shadow: 3px 3px 0px var(--primary) !important;
          outline: none !important;
        }
      `;
    } else if (config.uiStyle === "morphism") {
      css += `
        /* Neumorphism (Morphism) Overrides */
        :root {
          --background: #e5e7eb !important;
          --card: #e5e7eb !important;
          --radius: 20px !important;
        }
        .dark {
          --background: #1e1e1e !important;
          --card: #1e1e1e !important;
          --radius: 20px !important;
        }
        body {
          background-color: var(--background) !important;
          background-image: none !important;
        }
        .card, .beveled-card, .glass-card, [class*="glass-card"], [class*="beveled-card"] {
          background: var(--background) !important;
          border: none !important;
          border-radius: 20px !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow:
            -10px -10px 20px white,
            10px 10px 20px rgb(153, 161, 175),
            inset -10px -10px 20px rgb(209, 213, 220) !important;
        }
        .dark .card, .dark .beveled-card, .dark .glass-card, .dark [class*="glass-card"], .dark [class*="beveled-card"] {
          box-shadow:
            -10px -10px 20px rgba(255, 255, 255, 0.03),
            10px 10px 20px rgba(0, 0, 0, 0.5),
            inset -10px -10px 20px rgba(255, 255, 255, 0.02) !important;
        }
        .card:hover, .beveled-card:hover, .glass-card:hover {
          box-shadow:
            -12px -12px 24px white,
            12px 12px 24px rgb(153, 161, 175),
            inset -6px -6px 12px rgb(209, 213, 220) !important;
        }
        .dark .card:hover, .dark .beveled-card:hover, .dark .glass-card:hover {
          box-shadow:
            -12px -12px 24px rgba(255, 255, 255, 0.04),
            12px 12px 24px rgba(0, 0, 0, 0.6),
            inset -6px -6px 12px rgba(255, 255, 255, 0.03) !important;
        }
        .card .size-6, .card .size-8, .beveled-card .size-9, .card .size-9, .card .size-7 {
          box-shadow: -2px -2px 4px white, 2px 2px 4px rgb(153, 161, 175) !important;
        }
        .dark .card .size-6, .dark .card .size-8, .dark .beveled-card .size-9, .dark .card .size-9, .dark .card .size-7 {
          box-shadow: -2px -2px 4px rgba(255, 255, 255, 0.03), 2px 2px 4px rgba(0, 0, 0, 0.5) !important;
        }
        button, .button, .beveled-button, button[class*="beveled-button"], [role="button"] {
          border-radius: 12px !important;
          border: none !important;
          background: var(--background) !important;
          color: var(--foreground) !important;
          box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.7) !important;
          transition: box-shadow 0.15s ease !important;
        }
        .dark button, .dark .button, .dark .beveled-button {
          box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.04) !important;
          color: var(--foreground) !important;
        }
        button:hover, .button:hover, .beveled-button:hover {
          box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1), -5px -5px 10px rgba(255, 255, 255, 0.8) !important;
        }
        button:active, .button:active, .beveled-button:active {
          box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.08), inset -3px -3px 6px rgba(255, 255, 255, 0.6) !important;
        }
        .dark button:active, .dark .button:active, .dark .beveled-button:active {
          box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.03) !important;
        }
        input, select, textarea {
          border-radius: 12px !important;
          border: none !important;
          background: var(--background) !important;
          box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.06), inset -3px -3px 6px rgba(255, 255, 255, 0.6) !important;
        }
        .dark input, .dark select, .dark textarea {
          box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 0.03) !important;
        }
      `;
    } else if (config.uiStyle === "glassmorphism") {
      css += `
        /* Glassmorphism Overrides */
        :root, .dark {
          --radius: 16px !important;
        }
        .card, .beveled-card, .glass-card, [class*="glass-card"], [class*="beveled-card"] {
          background: rgba(255, 255, 255, 0.38) !important;
          backdrop-filter: blur(20px) saturate(160%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
          border-radius: 16px !important;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.06) !important;
        }
        .dark .card, .dark .beveled-card, .dark .glass-card {
          background: rgba(20, 20, 20, 0.45) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25) !important;
        }
        button, .button, .beveled-button, button[class*="beveled-button"], [role="button"] {
          background: rgba(255, 255, 255, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          color: var(--foreground) !important;
          box-shadow: 0 4px 12px 0 rgba(31, 38, 135, 0.04) !important;
        }
        .dark button, .dark .button, .dark .beveled-button {
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
        }
        button:hover, .button:hover, .beveled-button:hover {
          background: rgba(255, 255, 255, 0.45) !important;
          box-shadow: 0 4px 16px 0 rgba(31, 38, 135, 0.08) !important;
        }
        .dark button:hover, .dark .button:hover, .dark .beveled-button:hover {
          background: rgba(255, 255, 255, 0.15) !important;
        }
        input, select, textarea {
          background: rgba(255, 255, 255, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(5px) !important;
          -webkit-backdrop-filter: blur(5px) !important;
        }
        .dark input, .dark select, .dark textarea {
          background: rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
      `;
    } else if (config.uiStyle === "flowerism") {
      css += `
        /* Flowerism Overrides */
        :root {
          --radius: 24px !important;
          --font-serif: 'Playfair Display', Lora, Georgia, serif !important;
          --primary: #f43f5e !important; /* Rose accent */
          --ring: #f43f5e !important;
        }
        .dark {
          --radius: 24px !important;
          --font-serif: 'Playfair Display', Lora, Georgia, serif !important;
          --primary: #fda4af !important;
          --ring: #fda4af !important;
        }
        .card, .beveled-card, .glass-card, [class*="glass-card"], [class*="beveled-card"] {
          background: rgba(253, 244, 245, 0.82) !important; /* Pastel Blossom */
          border: 1.5px solid rgba(244, 63, 94, 0.16) !important;
          border-radius: 24px !important;
          box-shadow: 0 10px 24px rgba(244, 63, 94, 0.06) !important;
          backdrop-filter: blur(6px) !important;
        }
        .dark .card, .dark .beveled-card, .dark .glass-card {
          background: rgba(32, 22, 25, 0.85) !important;
          border: 1.5px solid rgba(244, 63, 94, 0.08) !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2) !important;
        }
        button, .button, .beveled-button, button[class*="beveled-button"], [role="button"] {
          border-radius: 16px !important;
          background: linear-gradient(135deg, #f43f5e, #ec4899) !important;
          color: #ffffff !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25) !important;
        }
        .dark button, .dark .button, .dark .beveled-button {
          background: linear-gradient(135deg, #fda4af, #f472b6) !important;
          color: #1e1b1c !important;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.1) !important;
        }
        button:hover, .button:hover, .beveled-button:hover {
          box-shadow: 0 6px 16px rgba(244, 63, 94, 0.35) !important;
          transform: translateY(-1px) !important;
        }
        input, select, textarea {
          border-radius: 16px !important;
          border: 1.5px solid rgba(244, 63, 94, 0.15) !important;
          background-color: rgba(255, 255, 255, 0.9) !important;
        }
        .dark input, .dark select, .dark textarea {
          border: 1.5px solid rgba(244, 63, 94, 0.08) !important;
          background-color: rgba(25, 20, 22, 0.9) !important;
        }
      `;
    }

    // Bevel Strength overrides
    if (config.bevelStrength && config.bevelStrength !== "none") {
      let bevelCss = "";
      if (config.bevelStrength === "light") {
        bevelCss = `
          box-shadow: inset 0 0.5px 0px 0px rgba(255,255,255,0.15), inset 0 -0.5px 0px 0px rgba(0,0,0,0.15) !important;
        `;
      } else if (config.bevelStrength === "medium") {
        bevelCss = `
          box-shadow: inset 0 1.5px 0px 0px rgba(255,255,255,0.2), inset 0 -1.5px 0px 0px rgba(0,0,0,0.2) !important;
          border-top: 1px solid rgba(255,255,255,0.15) !important;
          border-bottom: 1.5px solid rgba(0,0,0,0.2) !important;
        `;
      } else if (config.bevelStrength === "heavy") {
        bevelCss = `
          box-shadow: inset 0 3px 0px 0px rgba(255,255,255,0.35), inset 0 -3px 0px 0px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.1) !important;
          border-top: 2px solid rgba(255,255,255,0.25) !important;
          border-bottom: 3px solid rgba(0,0,0,0.4) !important;
        `;
      }
      
      css += `
        .beveled-button, .beveled-card, button[class*="beveled-button"], [class*="beveled-card"] {
          ${bevelCss}
        }
      `;
    }

    // Border Radius overrides
    if (config.borderRadius) {
      let radiusVal = "12px";
      if (config.borderRadius === "none") radiusVal = "0px";
      else if (config.borderRadius === "small") radiusVal = "6px";
      else if (config.borderRadius === "medium") radiusVal = "12px";
      else if (config.borderRadius === "large") radiusVal = "20px";
      else if (config.borderRadius === "full") radiusVal = "9999px";

      css += `
        :root, .dark {
          --radius: ${radiusVal} !important;
        }
        .card, .beveled-card, .glass-card, [class*="glass-card"], [class*="beveled-card"], .kpi-card {
          border-radius: ${radiusVal} !important;
        }
      `;
    }

    // Glow Effect overrides
    if (config.glowEnabled) {
      css += `
        /* Glow Effect Overrides */
        button[class*="bg-primary"], .bg-primary, .beveled-button, button[class*="bg-indigo"] {
          box-shadow: 0 0 10px var(--primary) !important;
        }
        .card, .beveled-card, .glass-card {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05), 0 0 15px rgba(99, 102, 241, 0.1) !important;
        }
        .dark .card, .dark .beveled-card, .dark .glass-card {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 0 15px rgba(99, 102, 241, 0.15) !important;
        }
      `;
    }

    // 1. Material UI overrides
    if (config.isMaterialUI) {
      css += `
        /* Material UI Mode Overrides */
        :root, .dark {
          --radius: 4px !important;
          --font-sans: Roboto, Inter, system-ui, -apple-system, sans-serif !important;
        }

        /* Material UI Page Background */
        body {
          background-image: none !important;
          background-color: var(--background) !important;
        }

        /* Material UI Cards - Elevation 1 */
        .card, .beveled-card, .glass-card, [class*="glass-card"], [class*="beveled-card"] {
          background-color: var(--card) !important;
          background: var(--card) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border: none !important;
          border-radius: 4px !important;
          box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12) !important;
        }

        /* Material UI Hover Elevation 4 */
        .card:hover, .beveled-card:hover, .glass-card:hover {
          box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12) !important;
        }

        /* Material UI Raised Buttons */
        .button, .beveled-button, button[class*="beveled-button"], button[class*="bg-primary"], button[class*="bg-indigo-600"], [role="button"][class*="bg-primary"] {
          border-radius: 4px !important;
          text-transform: uppercase !important;
          font-weight: 500 !important;
          letter-spacing: 0.02857em !important;
          box-shadow: 0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12) !important;
          border: none !important;
        }
        .button:active, .beveled-button:active {
          box-shadow: 0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12) !important;
        }

        /* Material UI Form Fields - OutlinedInput style */
        input, select, textarea {
          border: 1px solid rgba(0,0,0,0.23) !important;
          border-radius: 4px !important;
          background-color: transparent !important;
          transition: border-color 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms !important;
        }
        .dark input, .dark select, .dark textarea {
          border: 1px solid rgba(255,255,255,0.23) !important;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary) !important;
          border-width: 2px !important;
          box-shadow: none !important;
          outline: none !important;
        }

        /* Material App Bar / Header */
        header {
          background-color: var(--card) !important;
          border-bottom: none !important;
          box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12) !important;
        }

        /* Material Sidebar */
        .sidebar {
          background-color: var(--card) !important;
          border-right: none !important;
          box-shadow: 0px 8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 6px 30px 5px rgba(0,0,0,0.12) !important;
        }

        button, [role="button"] {
          position: relative;
          overflow: hidden;
        }
      `;
    }

    // 1. Accent / Primary Color
    if (config.primaryColor) {
      css += `
        :root, .dark {
          --primary: ${config.primaryColor} !important;
          --ring: ${config.primaryColor} !important;
          --sidebar-primary: ${config.primaryColor} !important;
          --loader-color: ${config.primaryColor} !important;
        }
        .text-primary {
          color: ${config.primaryColor} !important;
        }
        .bg-primary {
          background-color: ${config.primaryColor} !important;
        }
        .border-primary {
          border-color: ${config.primaryColor} !important;
        }
      `;
    }

    // 2. Background Color
    if (config.backgroundColor) {
      css += `
        :root, .dark {
          --background: ${config.backgroundColor} !important;
          --sidebar: ${config.backgroundColor} !important;
        }
        body {
          background-color: ${config.backgroundColor} !important;
        }
      `;
    }

    // 3. Text Color
    if (config.textColor) {
      css += `
        :root, .dark {
          --foreground: ${config.textColor} !important;
          --card-foreground: ${config.textColor} !important;
          --popover-foreground: ${config.textColor} !important;
          --sidebar-foreground: ${config.textColor} !important;
        }
        body {
          color: ${config.textColor} !important;
        }
        /* Custom text color overrides hardcoded classes */
        .text-black, 
        .text-zinc-950, .text-zinc-900, .text-zinc-800, .text-zinc-700,
        .text-slate-950, .text-slate-900, .text-slate-800, .text-slate-700,
        .text-neutral-950, .text-neutral-900, .text-neutral-800, .text-neutral-700,
        .text-gray-950, .text-gray-900, .text-gray-800, .text-gray-700 {
          color: ${config.textColor} !important;
        }
      `;
    }

    // 4. Font Family
    if (config.fontFamily) {
      css += `
        :root, .dark {
          --font-sans: ${config.fontFamily} !important;
        }
        body, html, button, input, select, textarea {
          font-family: ${config.fontFamily} !important;
        }
      `;
    }

    // 5. Base Font Size
    if (config.fontSize) {
      css += `
        html {
          font-size: ${config.fontSize} !important;
        }
      `;
    }

    // 6. Density / Sizing
    if (config.density) {
      if (config.density === "compact") {
        css += `
          .p-4, .p-5, .p-6 {
            padding: 0.65rem !important;
          }
          .p-3 {
            padding: 0.5rem !important;
          }
          .space-y-6 > * + * {
            margin-top: 0.75rem !important;
          }
          .space-y-5 > * + * {
            margin-top: 0.5rem !important;
          }
          .space-y-4 > * + * {
            margin-top: 0.5rem !important;
          }
          .beveled-card, .glass-card, [class*="glass-card"] {
            padding: 0.65rem !important;
          }
        `;
      } else if (config.density === "cozy") {
        css += `
          .p-4, .p-5, .p-6 {
            padding: 1.5rem !important;
          }
          .space-y-6 > * + * {
            margin-top: 2rem !important;
          }
          .space-y-5 > * + * {
            margin-top: 1.75rem !important;
          }
          .space-y-4 > * + * {
            margin-top: 1.5rem !important;
          }
          .beveled-card, .glass-card, [class*="glass-card"] {
            padding: 1.5rem !important;
          }
        `;
      }
    }

    // 7. Background Image Overlay
    if (config.bgImage) {
      const opacity = config.bgImageOpacity !== undefined ? config.bgImageOpacity : 0.1;
      css += `
        body::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -10;
          background-image: url('${config.bgImage}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: ${opacity};
          pointer-events: none;
        }
      `;
    }

    styleEl.innerHTML = css;
  }, [config]);

  return null;
}
