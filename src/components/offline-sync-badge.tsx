"use client";

import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, CheckCircle2, ArrowUpCircle } from "lucide-react";
import { getPendingOfflineCount, triggerManualSync, getIsSyncing } from "@/lib/offline-sync";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function OfflineSyncBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  const updateState = useCallback(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    setPendingCount(getPendingOfflineCount());
    setIsSyncing(getIsSyncing());
    setIsDesktop(!!(window as any).electronPOS?.isDesktopApp);
  }, []);

  useEffect(() => {
    updateState();

    const handleOnline = () => {
      setIsOnline(true);
      updateState();
    };
    const handleOffline = () => {
      setIsOnline(false);
      updateState();
    };

    const handleQueueChanged = (e: any) => {
      setPendingCount(e?.detail?.count ?? getPendingOfflineCount());
    };

    const handleSyncActive = (e: any) => {
      setIsSyncing(!!e?.detail?.syncing);
      if (typeof e?.detail?.pending === "number") {
        setPendingCount(e.detail.pending);
      }
    };

    const handleSyncComplete = () => {
      setIsSyncing(false);
      setPendingCount(getPendingOfflineCount());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("df-offline-queue-changed", handleQueueChanged);
    window.addEventListener("df-sync-active", handleSyncActive);
    window.addEventListener("df-sync-complete", handleSyncComplete);

    // Periodic check every 5 seconds
    const interval = setInterval(updateState, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("df-offline-queue-changed", handleQueueChanged);
      window.removeEventListener("df-sync-active", handleSyncActive);
      window.removeEventListener("df-sync-complete", handleSyncComplete);
      clearInterval(interval);
    };
  }, [updateState]);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error("Offline: Reconnect to internet to sync changes to cloud.");
      return;
    }
    toast.info("Syncing offline changes to cloud...");
    setIsSyncing(true);
    const res = await triggerManualSync();
    setIsSyncing(false);
    setPendingCount(res.remaining);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 shadow-2xs border ${
            !isOnline
              ? "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/35 text-rose-700 dark:text-rose-400"
              : isSyncing
              ? "bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/35 text-sky-700 dark:text-sky-400"
              : pendingCount > 0
              ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-700 dark:text-amber-400"
              : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
          }`}
          title={
            !isOnline
              ? `Offline Mode (${pendingCount} pending)`
              : isSyncing
              ? "Syncing to Cloud..."
              : pendingCount > 0
              ? `${pendingCount} offline changes pending sync`
              : isDesktop
              ? "POS Connected to https://hakim.qzz.io"
              : "Cloud Connected"
          }
        >
          {!isOnline ? (
            <>
              <WifiOff className="size-3 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="hidden min-[480px]:inline font-medium">Offline</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                  {pendingCount}
                </span>
              )}
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="size-3 text-sky-600 dark:text-sky-400 shrink-0 animate-spin" />
              <span className="hidden min-[480px]:inline font-medium">Syncing...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <ArrowUpCircle className="size-3 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              <span className="hidden min-[480px]:inline font-medium">Pending</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                {pendingCount}
              </span>
            </>
          ) : (
            <>
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
              <span className="hidden min-[480px]:inline font-medium">
                {isDesktop ? "POS Cloud" : "Cloud"}
              </span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-3 rounded-2xl shadow-xl border-border/80 bg-card">
        <DropdownMenuLabel className="p-0 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">POS Cloud Connection</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isOnline
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-normal mt-0.5 truncate">
            Target: https://hakim.qzz.io
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-2" />

        <div className="space-y-2 py-1 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Offline Queue:</span>
            <span className="font-semibold text-foreground font-mono">
              {pendingCount} item{pendingCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>Desktop Hardware:</span>
            <span className="font-semibold text-foreground">
              {isDesktop ? "Native POS Driver" : "Web Browser"}
            </span>
          </div>

          <p className="text-[10.5px] text-muted-foreground leading-relaxed pt-1">
            {isOnline
              ? "All POS sales and stock changes are actively synchronized with your cloud database."
              : "Working offline. You can continue recording sales and printing receipts normally. Data will auto-sync when network returns."}
          </p>
        </div>

        {isOnline && pendingCount > 0 && (
          <div className="pt-3">
            <Button
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full h-8 text-xs gap-1.5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing to Cloud..." : `Sync ${pendingCount} Pending Changes`}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
