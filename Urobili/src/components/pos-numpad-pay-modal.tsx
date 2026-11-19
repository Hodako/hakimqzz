"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote, CreditCard, Smartphone, Delete, CheckCircle2, Printer, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n";

export interface PosPayResult {
  paymentMethod: "cash" | "card" | "bkash" | "nagad" | "split";
  tendered: number;
  changeDue: number;
  splitCash: number;
  splitDigital: number;
  autoPrint: boolean;
}

interface PosNumpadPayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  title?: string;
  busy?: boolean;
  onConfirm: (result: PosPayResult) => Promise<void> | void;
}

export function PosNumpadPayModal({
  open,
  onOpenChange,
  totalAmount,
  title,
  busy = false,
  onConfirm,
}: PosNumpadPayModalProps) {
  const { lang } = useT();
  const [method, setMethod] = useState<"cash" | "card" | "bkash" | "nagad" | "split">("cash");
  const [tenderStr, setTenderStr] = useState("");
  const [splitCashStr, setSplitCashStr] = useState("");

  useEffect(() => {
    if (open) {
      setTenderStr(String(Math.round(totalAmount)));
      setSplitCashStr(String(Math.round(totalAmount / 2)));
      setMethod("cash");
    }
  }, [open, totalAmount]);

  const tendered = Math.max(0, Number(tenderStr) || 0);
  const splitCash = Math.min(totalAmount, Math.max(0, Number(splitCashStr) || 0));
  const splitDigital = Math.max(0, totalAmount - splitCash);
  const changeDue = method === "cash" ? Math.max(0, tendered - totalAmount) : 0;
  const remaining = method === "cash" ? Math.max(0, totalAmount - tendered) : 0;

  function pressKey(k: string) {
    if (method === "split") {
      if (k === "C") setSplitCashStr("");
      else if (k === "BKSP") setSplitCashStr((s) => s.slice(0, -1));
      else setSplitCashStr((s) => (s === "0" ? k : s + k));
      return;
    }
    if (k === "C") setTenderStr("");
    else if (k === "BKSP") setTenderStr((s) => s.slice(0, -1));
    else setTenderStr((s) => (s === "0" ? k : s + k));
  }

  function submit(autoPrint: boolean) {
    void onConfirm({
      paymentMethod: method,
      tendered: method === "cash" ? tendered : totalAmount,
      changeDue,
      splitCash: method === "split" ? splitCash : method === "cash" ? totalAmount : 0,
      splitDigital: method === "split" ? splitDigital : method !== "cash" ? totalAmount : 0,
      autoPrint,
    });
  }

  const quickNotes = [totalAmount, 100, 500, 1000, 2000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5 bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center justify-between pr-6">
            <span>{title || (lang === "bn" ? "পেমেন্ট ও ক্যাশ চেঞ্জ" : "Payment & Change Calculator")}</span>
            <span className="text-primary font-black text-lg">৳ {Math.round(totalAmount).toLocaleString()}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Payment Method Selector (NexoPOS + PharmaSpot Multi-Tender) */}
        <div className="grid grid-cols-5 gap-1.5 text-[11px]">
          {(
            [
              { id: "cash", label: lang === "bn" ? "নগদ" : "Cash", icon: Banknote },
              { id: "bkash", label: "bKash", icon: Smartphone },
              { id: "nagad", label: "Nagad", icon: Smartphone },
              { id: "card", label: lang === "bn" ? "কার্ড" : "Card", icon: CreditCard },
              { id: "split", label: lang === "bn" ? "স্প্লিট" : "Split", icon: Banknote },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`h-11 rounded-xl border font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Amount Readout */}
        {method === "split" ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-muted/50 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">
                {lang === "bn" ? "নগদ অংশ" : "Cash Portion"}
              </div>
              <div className="text-lg font-black text-foreground">৳ {splitCash.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25">
              <div className="text-[10px] text-primary uppercase font-bold">
                {lang === "bn" ? "ডিজিটাল / কার্ড" : "bKash / Card"}
              </div>
              <div className="text-lg font-black text-primary">৳ {splitDigital.toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-muted/50 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">
                {lang === "bn" ? "প্রাপ্ত টাকা" : "Cash Received"}
              </div>
              <div className="text-xl font-black text-foreground">
                ৳ {(method === "cash" ? tendered : totalAmount).toLocaleString()}
              </div>
            </div>
            <div className={`p-3 rounded-2xl border ${remaining > 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className={`text-[10px] uppercase font-bold ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {remaining > 0
                  ? (lang === "bn" ? "বাকি আছে" : "Still Due")
                  : (lang === "bn" ? "ফেরত দিন (চেঞ্জ)" : "Change Due")}
              </div>
              <div className={`text-xl font-black ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ৳ {(remaining > 0 ? remaining : changeDue).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Quick Cash Pills */}
        {method === "cash" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {quickNotes.map((amt, i) => (
              <button
                key={`${amt}-${i}`}
                type="button"
                onClick={() => setTenderStr(String(Math.round(amt)))}
                className="h-9 px-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-xs whitespace-nowrap hover:opacity-90 cursor-pointer"
              >
                {i === 0 ? (lang === "bn" ? "সঠিক টাকা" : "Exact") : `৳${amt}`}
              </button>
            ))}
          </div>
        )}

        {/* Touch-First 44px+ Numpad */}
        {(method === "cash" || method === "split") && (
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "BKSP"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => pressKey(k)}
                className={`h-12 rounded-2xl font-bold text-base border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                  k === "C"
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-600"
                    : k === "BKSP"
                      ? "bg-muted border-border text-foreground"
                      : "bg-background hover:bg-muted/70 border-border text-foreground shadow-2xs"
                }`}
              >
                {k === "BKSP" ? <Delete className="size-5" /> : k}
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={busy || (method === "cash" && remaining > 0)}
            onClick={() => submit(false)}
            className="h-12 rounded-2xl font-bold text-xs gap-1.5 cursor-pointer"
          >
            {busy ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
            <span>{lang === "bn" ? "পেমেন্ট সম্পন্ন" : "Confirm Pay"}</span>
          </Button>
          <Button
            type="button"
            disabled={busy || (method === "cash" && remaining > 0)}
            onClick={() => submit(true)}
            className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer"
          >
            {busy ? <RefreshCw className="size-4 animate-spin" /> : <Printer className="size-4" />}
            <span>{lang === "bn" ? "পে ও প্রিন্ট" : "Pay & Print"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
