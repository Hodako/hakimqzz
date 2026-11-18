"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Global Real-Time Sync Manager (PostgreSQL + Cross-Tab BroadcastChannel).
 * Coordinates instant local and cross-tab React Query cache invalidation
 * without opening legacy Firestore listeners.
 */
export function RealtimeSyncManager() {
  const qc = useQueryClient();

  useEffect(() => {
    const handleLocalInvalidate = (e: any) => {
      const keys: string[] = e.detail?.keys || [];
      keys.forEach((k) => {
        qc.invalidateQueries({ queryKey: [k] });
      });
    };

    window.addEventListener("cw-data-invalidated", handleLocalInvalidate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("cw-realtime-channel");
        bc.onmessage = (event) => {
          const keys: string[] = event.data?.keys || [];
          keys.forEach((k) => {
            qc.invalidateQueries({ queryKey: [k] });
          });
        };
      }
    } catch (_) {}

    return () => {
      window.removeEventListener("cw-data-invalidated", handleLocalInvalidate);
      try {
        if (bc) bc.close();
      } catch (_) {}
    };
  }, [qc]);

  return null;
}
