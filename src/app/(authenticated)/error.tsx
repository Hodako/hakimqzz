"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AuthenticatedError]", error);

    // Auto-recovery for chunk loading failures (new deployment or stale client cache)
    const msg = error?.message || String(error || "");
    if (
      msg.includes("ChunkLoadError") ||
      msg.includes("Loading chunk") ||
      msg.includes("Failed to fetch") ||
      msg.includes("dynamically imported module")
    ) {
      if (typeof window !== "undefined") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((reg) => reg.unregister());
          });
        }
        if (typeof caches !== "undefined") {
          caches.keys().then((keys) => {
            keys.forEach((k) => caches.delete(k));
          });
        }
        const lastReload = sessionStorage.getItem("last_chunk_reload");
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 5000) {
          sessionStorage.setItem("last_chunk_reload", String(now));
          window.location.reload();
        }
      }
    }
  }, [error]);

  const handleHardRefresh = () => {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
      }
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
        });
      }
      window.location.href = window.location.pathname + "?t=" + Date.now();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-2xl text-center space-y-5">
        <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="size-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            অ্যাপ আপডেট হয়েছে / Reload Required
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            একটি নতুন আপডেট পাওয়া গেছে। দয়া করে রিফ্রেশ বাটনে চাপ দিন।
            <br />
            (A new update is available. Please reload to continue.)
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={handleHardRefresh}
            className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
          >
            <RefreshCw className="size-4" />
            <span>রিফ্রেশ ও আপডেট করুন (Reload Page)</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => reset()}
            className="w-full h-9 rounded-xl text-xs text-muted-foreground"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
