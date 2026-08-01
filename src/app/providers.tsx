"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/hooks/use-theme";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { SpeedLoader } from "@/components/speed-loader";
import { CustomThemeManager } from "@/components/custom-theme-manager";
import { AutoCameraTrigger } from "@/components/auto-camera-trigger";
import { CameraPermissionChecker } from "@/components/camera-permission-checker";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Global Auto-Recovery for Stale Chunk / Service Worker Load Errors
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const msg = (event as ErrorEvent).message || String((event as PromiseRejectionEvent).reason || "");
      if (
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch") ||
        msg.includes("400") ||
        msg.includes("503")
      ) {
        console.warn("[AutoRecovery] Stale chunk/cache detected. Clearing ServiceWorker caches...");
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((reg) => reg.unregister());
          });
        }
        if (typeof caches !== "undefined") {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalError);

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    let appBackButtonListener: any = null;
    const initBackButton = async () => {
      try {
        const { App } = await import("@capacitor/app");
        appBackButtonListener = await App.addListener("backButton", (info) => {
          const overlayBackdrop = document.querySelector('[role="dialog"], [data-state="open"], .fixed.inset-0');
          if (overlayBackdrop) {
            const escapeEvent = new KeyboardEvent("keydown", {
              key: "Escape",
              code: "Escape",
              keyCode: 27,
              which: 27,
              bubbles: true,
              cancelable: true
            });
            document.dispatchEvent(escapeEvent);
            return;
          }
          if (info.canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch (err) {
        console.warn("Capacitor App plugin not available or not running on native device.", err);
      }
    };
    initBackButton();

    return () => {
      if (appBackButtonListener) {
        appBackButtonListener.remove();
      }
    };
  }, []);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === "INPUT") {
        const name = (target.name || "").toLowerCase();
        const id = (target.id || "").toLowerCase();
        const type = (target.type || "").toLowerCase();
        
        // If it is a number, tel, or has phone/mobile in its attributes, force correct numeric inputmode
        if (
          type === "number" ||
          type === "tel" ||
          name.includes("phone") ||
          name.includes("mobile") ||
          id.includes("phone") ||
          id.includes("mobile")
        ) {
          if (!target.hasAttribute("inputmode")) {
            const isPhone = type === "tel" || name.includes("phone") || name.includes("mobile") || id.includes("phone") || id.includes("mobile");
            target.setAttribute("inputmode", isPhone ? "numeric" : "decimal");
          }
        }
      }
    };
    document.addEventListener("focusin", handleFocus, true);
    return () => {
      document.removeEventListener("focusin", handleFocus, true);
    };
  }, []);

  if (!mounted) {
    return <SpeedLoader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <CustomThemeManager />
            {children}
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
