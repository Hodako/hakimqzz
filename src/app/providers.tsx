"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/hooks/use-theme";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { SpeedLoader } from "@/components/speed-loader";
import { CustomThemeManager } from "@/components/custom-theme-manager";

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
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }
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
