"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Collection to React Query key mappings for real-time synchronization
const REALTIME_COLLECTIONS: { collection: string; queryKeys: string[][] }[] = [
  { collection: "sales", queryKeys: [["sales"], ["products"], ["cashbox"]] },
  { collection: "expenses", queryKeys: [["expenses"], ["cashbox"]] },
  { collection: "cashbox_entries", queryKeys: [["cashbox"]] },
  { collection: "purchases", queryKeys: [["purchases"], ["products"], ["cashbox"]] },
  { collection: "somiti", queryKeys: [["somiti"], ["cashbox"]] },
  { collection: "somiti_entries", queryKeys: [["somiti"], ["cashbox"]] },
  { collection: "withdrawals", queryKeys: [["withdrawals"], ["owner_wallet"], ["cashbox"]] },
  { collection: "owner_wallet", queryKeys: [["owner_wallet"], ["withdrawals"], ["cashbox"]] },
  { collection: "parties", queryKeys: [["parties"], ["all-party-receivables"], ["all-party-payables"]] },
  { collection: "party_receivables", queryKeys: [["all-party-receivables"], ["party-receivables"], ["parties"]] },
  { collection: "party_payables", queryKeys: [["all-party-payables"], ["party-payables"], ["parties"]] },
  { collection: "payments", queryKeys: [["all-payments"], ["payments"], ["all-party-receivables"], ["cashbox"], ["parties"]] },
  { collection: "bank_transactions", queryKeys: [["bank_accounts"], ["cashbox"]] },
  { collection: "bank_loan_payments", queryKeys: [["bank_loans"], ["cashbox"]] },
  { collection: "products", queryKeys: [["products"]] },
  { collection: "customers", queryKeys: [["customers"]] },
  { collection: "employee_expenses", queryKeys: [["employee_expenses"], ["expenses"], ["cashbox"]] },
  { collection: "employee_salaries", queryKeys: [["employee_salaries"], ["expenses"], ["cashbox"]] },
  { collection: "employee_shoppings", queryKeys: [["employee_shoppings"]] },
  { collection: "returns", queryKeys: [["returns"], ["sales"], ["products"]] },
  { collection: "reminders", queryKeys: [["reminders"]] },
];

/**
 * Global Real-Time Sync Manager for Dream Fashion POS.
 * Connects Firestore's native onSnapshot real-time listeners across all devices
 * and coordinates cross-tab and local write invalidations via BroadcastChannel and window events.
 */
export function RealtimeSyncManager() {
  const qc = useQueryClient();
  const unsubsRef = useRef<(() => void)[]>([]);
  const lastInvalidateRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // 1. Cross-tab & local write invalidation via window events & BroadcastChannel
    const handleLocalInvalidate = (e: any) => {
      const keys: string[] = e.detail?.keys || [];
      keys.forEach((k) => {
        qc.invalidateQueries({ queryKey: [k] });
      });
    };

    window.addEventListener("df-data-invalidated", handleLocalInvalidate);
    window.addEventListener("cw-data-invalidated", handleLocalInvalidate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("df-realtime-channel");
        bc.onmessage = (event) => {
          const keys: string[] = event.data?.keys || [];
          keys.forEach((k) => {
            qc.invalidateQueries({ queryKey: [k] });
          });
        };
      }
    } catch (_) {}

    // 2. Real-time Firestore snapshot listeners
    const invalidateThrottled = (queryKeys: string[][]) => {
      const now = Date.now();
      queryKeys.forEach((qk) => {
        const keyStr = qk.join(":");
        const last = lastInvalidateRef.current[keyStr] || 0;
        if (now - last > 1000) {
          lastInvalidateRef.current[keyStr] = now;
          qc.invalidateQueries({ queryKey: qk });
        }
      });
    };

    REALTIME_COLLECTIONS.forEach(({ collection: colName, queryKeys }) => {
      try {
        const colRef = collection(db, colName);
        let isInitial = true;
        const unsub = onSnapshot(
          colRef,
          () => {
            if (isInitial) {
              isInitial = false;
              return;
            }
            invalidateThrottled(queryKeys);
          },
          (err) => {
            console.warn(`[DreamFashion Realtime] Listener paused for ${colName}:`, err?.message || err);
          }
        );
        unsubsRef.current.push(unsub);
      } catch (err) {
        console.warn(`[DreamFashion Realtime] Setup error for ${colName}:`, err);
      }
    });

    return () => {
      window.removeEventListener("df-data-invalidated", handleLocalInvalidate);
      window.removeEventListener("cw-data-invalidated", handleLocalInvalidate);
      if (bc) {
        try {
          bc.close();
        } catch (_) {}
      }
      unsubsRef.current.forEach((u) => {
        try {
          u();
        } catch (_) {}
      });
      unsubsRef.current = [];
    };
  }, [qc]);

  return null;
}
