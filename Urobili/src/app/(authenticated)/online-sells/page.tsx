"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useDeferredValue, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getSales, type Sale } from "@/lib/queries";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useT } from "@/lib/i18n";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { FAB } from "@/components/ui/fab";
import { SaleDialog } from "@/components/sale-dialog";
import { OrderInfoDialog } from "@/components/order-info-dialog";
import {
  Truck,
  PackageCheck,
  RotateCcw,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  ShieldCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveCourierPaymentFn,
  cancelCourierOrderFn,
  steadfastCheckBalanceFn,
  steadfastFraudCheckFn,
  steadfastCreateOrderFn,
  steadfastCheckStatusFn,
} from "@/lib/rpc";
import { getBusinessSettingsFn } from "@/lib/rpc-admin";
import { printPwaInvoice } from "@/lib/invoice-printer";
import { useAuth } from "@/hooks/use-auth";
import { buildOrderWhatsAppMessage, sendDesktopWhatsAppMessage } from "@/lib/desktop-whatsapp";
import { MessageCircle } from "lucide-react";

export default function OnlineSellsPage() {
  const { lang, t } = useT();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data = [] } = useCachedQuery(["sales"], getSales);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const bizSettings = useQuery({ queryKey: ["business-settings"], queryFn: getBusinessSettingsFn });
  const steadfastEnabled = Boolean((bizSettings.data?.business as any)?.steadfast_enabled);
  const [sfBalance, setSfBalance] = useState<number | null>(null);
  const [sfSyncingAll, setSfSyncingAll] = useState(false);

  // SteadFast Dispatch Modal State
  const [sfModalOrder, setSfModalOrder] = useState<any | null>(null);
  const [sfName, setSfName] = useState("");
  const [sfPhone, setSfPhone] = useState("");
  const [sfAddress, setSfAddress] = useState("");
  const [sfCod, setSfCod] = useState("");
  const [sfNote, setSfNote] = useState("");
  const [sfBusy, setSfBusy] = useState(false);
  const [sfFraudResult, setSfFraudResult] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const q = p.get("search") || p.get("tracking") || p.get("q");
      if (q) {
        setSearch(q);
      }
    }
  }, []);

  // Filter for online sales only (strictly online courier orders)
  const onlineSales = useMemo(() => {
    return (data ?? []).filter((s) => s.type === "online");
  }, [data]);

  // Group by cart_id if multi-item cart
  const groupedOnlineSales = useMemo(() => {
    const groups: { [key: string]: Sale[] } = {};
    const singles: Sale[] = [];

    onlineSales.forEach((s) => {
      if (s.cart_id) {
        if (!groups[s.cart_id]) groups[s.cart_id] = [];
        groups[s.cart_id].push(s);
      } else {
        singles.push(s);
      }
    });

    const parseTs = (dateInput: any): number => {
      if (!dateInput) return 0;
      if (typeof dateInput === "number") return dateInput;
      if (typeof dateInput?.toDate === "function") return dateInput.toDate().getTime();
      if (dateInput?.seconds !== undefined) return dateInput.seconds * 1000;
      const t = typeof dateInput === "string" ? Date.parse(dateInput) : new Date(dateInput).getTime();
      return isNaN(t) ? 0 : t;
    };

    const result = [
      ...singles.map((s) => ({
        id: s.id,
        items: [s],
        product_name: s.product_name,
        qty: s.qty,
        sell_price: Number(s.sell_price) * s.qty,
        profit: s.profit,
        paid_amount: s.paid_amount,
        due_amount: s.due_amount,
        courier_status: (s as any).courier_status || "pending",
        courier_name: (s as any).courier_name || "Courier Delivery",
        tracking_code: (s as any).tracking_code || (s as any).tracking_id || (s as any).consignment_id || null,
        consignment_id: (s as any).consignment_id || null,
        steadfast_status: (s as any).steadfast_status || null,
        recipient_name: (s as any).recipient_name || s.parties?.name || "",
        recipient_phone: (s as any).recipient_phone || (s.parties as any)?.phone || "",
        recipient_address: (s as any).recipient_address || (s.parties as any)?.address || "",
        note: s.note,
        returned: (s as any).returned || false,
        created_at: s.created_at,
        _ts: parseTs(s.created_at),
        parties: s.parties,
        party_id: s.party_id,
      })),
      ...Object.entries(groups).map(([cartId, items]) => {
        const first = items[0];
        const totalQty = items.reduce((sum, x) => sum + x.qty, 0);
        const totalSellPrice = items.reduce((sum, x) => sum + Number(x.sell_price) * x.qty, 0);
        const totalProfit = items.reduce((sum, x) => sum + (Number(x.profit) || 0), 0);
        const totalPaid = items.reduce((sum, x) => sum + (Number(x.paid_amount) || 0), 0);
        const totalDue = items.reduce((sum, x) => sum + (Number(x.due_amount) || 0), 0);
        const names = items.map((x) => `${x.product_name} (×${x.qty})`).join(", ");

        const foundTracking = (first as any).tracking_code ||
          items.find((x) => (x as any).tracking_code || (x as any).tracking_id || (x as any).consignment_id)?.tracking_code ||
          null;

        return {
          id: cartId ? `cart-${cartId}` : first.id,
          cart_id: cartId,
          items,
          product_name: names,
          qty: totalQty,
          sell_price: totalSellPrice,
          profit: totalProfit,
          paid_amount: totalPaid,
          due_amount: totalDue,
          courier_status: (first as any).courier_status || items.find((x) => (x as any).courier_status)?.courier_status || "pending",
          courier_name: (first as any).courier_name || items.find((x) => (x as any).courier_name)?.courier_name || "Courier Delivery",
          tracking_code: foundTracking,
          consignment_id: (first as any).consignment_id || (items.find((x) => (x as any).consignment_id) as any)?.consignment_id || null,
          steadfast_status: (first as any).steadfast_status || (items.find((x) => (x as any).steadfast_status) as any)?.steadfast_status || null,
          recipient_name: (first as any).recipient_name || first.parties?.name || "",
          recipient_phone: (first as any).recipient_phone || (first.parties as any)?.phone || "",
          recipient_address: (first as any).recipient_address || (first.parties as any)?.address || "",
          note: first.note,
          returned: (first as any).returned || false,
          created_at: first.created_at,
          _ts: parseTs(first.created_at),
          parties: first.parties,
          party_id: first.party_id,
        };
      }),
    ];

    result.sort((a, b) => b._ts - a._ts);
    return result;
  }, [onlineSales]);

  // Tab & Tracking Search Filtering - Always matches tracking codes across all tabs and records
  const filteredList = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-zA-Z0-9]/g, "");

    return groupedOnlineSales.filter((item) => {
      // 1. Search query
      if (q) {
        const itemTrack = (item.tracking_code ?? "").toLowerCase();
        const cleanTrack = itemTrack.replace(/[^a-zA-Z0-9]/g, "");
        const matchTrack = (itemTrack && (itemTrack.includes(q) || (cleanQ && cleanTrack.includes(cleanQ)))) ||
                           item.items.some((x) => {
                             const t = ((x as any).tracking_code || (x as any).tracking_id || (x as any).consignment_id || "").toLowerCase();
                             return t && (t.includes(q) || (cleanQ && t.replace(/[^a-zA-Z0-9]/g, "").includes(cleanQ)));
                           });

        // If tracking code matches, immediately show across all tabs!
        if (matchTrack) return true;

        const matchProd = item.product_name.toLowerCase().includes(q);
        const matchCust = (item.parties?.name ?? "").toLowerCase().includes(q) ||
                          ((item as any).parties?.phone ?? "").includes(q) ||
                          ((item as any).customer?.phone ?? "").includes(q);
        const matchCourier = (item.courier_name ?? "").toLowerCase().includes(q);
        const matchNote = (item.note ?? "").toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);

        if (!matchProd && !matchCust && !matchCourier && !matchNote && !matchId) return false;
      }

      // 2. Tab Filter
      if (tab === "pending") {
        if (item.courier_status === "collected" || item.courier_status === "cancelled" || item.returned) return false;
      } else if (tab === "collected") {
        if (item.courier_status !== "collected") return false;
      } else if (tab === "cancelled") {
        if (item.courier_status !== "cancelled" && !item.returned) return false;
      }

      return true;
    });
  }, [groupedOnlineSales, tab, deferredSearch]);

  // Fast single-pass financial counters for online sales
  const { pendingAmount, collectedAmount, onlineProfitTotal } = useMemo(() => {
    let pending = 0;
    let collected = 0;
    let profit = 0;

    for (const s of groupedOnlineSales) {
      if (s.courier_status === "collected") {
        collected += s.sell_price;
      } else if (s.courier_status !== "cancelled" && !s.returned) {
        pending += s.sell_price;
      }
      if (s.courier_status !== "cancelled" && !s.returned) {
        profit += s.profit;
      }
    }

    return { pendingAmount: pending, collectedAmount: collected, onlineProfitTotal: profit };
  }, [groupedOnlineSales]);

  async function handleApprove(id: string) {
    setActionBusyId(id);
    try {
      await approveCourierPaymentFn({ data: { id } });
      toast.success(lang === "bn" ? "কুরিয়ার পেমেন্ট সফলভাবে ক্যাশবক্সে জমা হয়েছে!" : "Courier payment collected and deposited into Cashbox!");
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    setActionBusyId(id);
    try {
      await cancelCourierOrderFn({ data: { id } });
      toast.success(lang === "bn" ? "কুরিয়ার অর্ডার বাতিল এবং স্টক ফিরিয়ে দেওয়া হয়েছে!" : "Courier order cancelled and stock restored!");
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setActionBusyId(null);
    }
  }

  function openSteadfastModal(item: any) {
    setSfModalOrder(item);
    setSfName(item.recipient_name || item.parties?.name || "");
    setSfPhone(item.recipient_phone || item.parties?.phone || "");
    setSfAddress(item.recipient_address || item.parties?.address || "");
    setSfCod(String(Math.round(Number(item.sell_price) || 0)));
    setSfNote(item.note || "");
    setSfFraudResult(null);
  }

  async function handleSteadfastFraudCheck(phoneToCheck?: string) {
    const p = (phoneToCheck ?? sfPhone).trim();
    if (!p) return toast.error(lang === "bn" ? "ফোন নম্বর দিন" : "Enter phone number");
    setSfBusy(true);
    try {
      const res = await steadfastFraudCheckFn({ data: { phone: p } });
      setSfFraudResult(res);
    } catch (err: any) {
      toast.error(err?.message || "Fraud check failed");
    } finally {
      setSfBusy(false);
    }
  }

  async function handleDispatchSteadfast(e: React.FormEvent) {
    e.preventDefault();
    if (!sfModalOrder) return;
    setSfBusy(true);
    try {
      const res = await steadfastCreateOrderFn({
        data: {
          saleId: sfModalOrder.items[0]?.id || sfModalOrder.id,
          recipient_name: sfName.trim() || "Customer",
          recipient_phone: sfPhone.trim(),
          recipient_address: sfAddress.trim(),
          cod_amount: Number(sfCod) || 0,
          note: sfNote.trim() || undefined,
        },
      });
      toast.success(
        lang === "bn"
          ? `SteadFast অর্ডার তৈরি হয়েছে! Tracking: ${res?.consignment?.tracking_code}`
          : `SteadFast parcel booked! Tracking: ${res?.consignment?.tracking_code}`
      );
      setSfModalOrder(null);
      qc.invalidateQueries({ queryKey: ["sales"] });
    } catch (err: any) {
      toast.error(err?.message || "SteadFast dispatch failed");
    } finally {
      setSfBusy(false);
    }
  }

  async function handleTrackSteadfast(item: any) {
    const saleId = item.items[0]?.id || item.id;
    setActionBusyId(saleId);
    try {
      const res = await steadfastCheckStatusFn({
        data: {
          saleId,
          trackingCode: item.tracking_code || undefined,
          consignmentId: item.consignment_id || undefined,
        },
      });
      if (res?.autoCompleted) {
        toast.success(lang === "bn" ? `ডেলিভার্ড! Cashbox-এ টাকা জমা হয়েছে (${res.delivery_status})` : `Delivered! Auto-completed and deposited to Cashbox.`);
        qc.invalidateQueries({ queryKey: ["cashbox"] });
      } else {
        toast.info(lang === "bn" ? `SteadFast স্ট্যাটাস: ${res?.delivery_status}` : `SteadFast status: ${res?.delivery_status}`);
      }
      qc.invalidateQueries({ queryKey: ["sales"] });
    } catch (err: any) {
      toast.error(err?.message || "Tracking check failed");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleSyncAllSteadfast() {
    const toTrack = groupedOnlineSales.filter(
      (s: any) => s.courier_status !== "collected" && s.courier_status !== "cancelled" && !s.returned && (s.tracking_code || s.consignment_id)
    );
    if (toTrack.length === 0) {
      return toast.info(lang === "bn" ? "সিঙ্ক করার মতো কোনো SteadFast অর্ডার নেই" : "No dispatched SteadFast orders to sync");
    }
    setSfSyncingAll(true);
    let completed = 0;
    try {
      for (const item of toTrack) {
        try {
          const res = await steadfastCheckStatusFn({
            data: {
              saleId: item.items[0]?.id || item.id,
              trackingCode: item.tracking_code || undefined,
              consignmentId: (item as any).consignment_id || undefined,
            },
          });
          if (res?.autoCompleted) completed++;
        } catch {}
      }
      qc.invalidateQueries({ queryKey: ["sales"] });
      if (completed > 0) qc.invalidateQueries({ queryKey: ["cashbox"] });
      toast.success(
        lang === "bn"
          ? `${toTrack.length}টি অর্ডার সিঙ্ক হয়েছে (${completed}টি ডেলিভার্ড ও ক্যাশবক্সে জমা)`
          : `Synced ${toTrack.length} orders (${completed} delivered & settled to Cashbox)`
      );
    } finally {
      setSfSyncingAll(false);
    }
  }

  async function handleCheckSteadfastBalance() {
    try {
      const res = await steadfastCheckBalanceFn({});
      setSfBalance(Number(res?.current_balance ?? 0));
      toast.success(`SteadFast Balance: ৳${res?.current_balance ?? 0}`);
    } catch (err: any) {
      toast.error(err?.message || "Could not fetch SteadFast balance");
    }
  }

  async function handlePrint(item: any) {
    const custName = item.parties?.name || (lang === "bn" ? "সাধারণ কাস্টমার" : "Online Customer");
    const invNo = item.cart_id ? `INV-${item.cart_id.slice(-6).toUpperCase()}` : `INV-${item.id.slice(-6).toUpperCase()}`;

    try {
      await printPwaInvoice({
        businessName: user?.business_name || "Dream Fashion",
        userEmail: user?.business_emails || user?.email || "",
        shopAddress: user?.business_address || "",
        shopPhoneNumbers: user?.business_phone_numbers || "",
        pageSize: user?.invoice_page_size || "58mm",
        terms: user?.invoice_terms || "",
        invoiceNo: invNo,
        invoiceDate: fmtDateTime(item.created_at),
        customerName: custName,
        paymentMode: `COURIER [${item.courier_name || "Courier"}]`,
        items: item.items.map((it: any) => ({
          product: { id: it.product_id || undefined, name: it.product_name },
          qty: Number(it.qty) || 1,
          sellPrice: Number(it.sell_price) || 0,
        })),
        subtotal: item.sell_price + item.items.reduce((acc: number, it: any) => acc + (Number(it.discount) || 0), 0),
        discountAmount: item.items.reduce((acc: number, it: any) => acc + (Number(it.discount) || 0), 0),
        total: item.sell_price,
        paidAmount: item.courier_status === "collected" ? item.sell_price : (Number(item.paid_amount) || 0),
        due: item.courier_status === "collected" ? 0 : (Number(item.due_amount) || item.sell_price),
      });
      toast.success(lang === "bn" ? "ইনভয়েস প্রিন্ট প্রস্তুত হচ্ছে!" : "Opening invoice print view!");
    } catch (err: any) {
      toast.error(err?.message || "Print failed");
    }
  }

  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const toggleOrder = (id: string) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [infoOrder, setInfoOrder] = useState<any | null>(null);
  const [infoItemId, setInfoItemId] = useState<string | null>(null);

  return (
    <div className="space-y-3 pb-12 font-hind">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-card p-2.5 sm:p-3 rounded-2xl border-[0.5px] border-black/75 dark:border-white/30 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 sm:size-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <Truck className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold font-hind text-zinc-800 dark:text-zinc-200 tracking-tight truncate">
                {lang === "bn" ? "অনলাইন ও কুরিয়ার ডেলিভারি" : "Online & Courier Delivery"}
              </h1>
              <p className="text-[10.5px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-hind truncate max-w-[210px] sm:max-w-none">
                {lang === "bn" ? "কুরিয়ার ক্যাশ অন ডেলিভারি ও রেমিট্যান্স ট্র্যাকিং" : "Track courier remittances & orders"}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setOpen(true)}
            size="sm"
            style={{ backgroundColor: "#ADFF2F" }}
            className="sm:hidden h-7.5 px-2.5 text-xs font-bold font-hind rounded-lg text-zinc-950 gap-1 shrink-0 border border-black/20 hover:brightness-95 transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>{lang === "bn" ? "নতুন এন্ট্রি" : "New Entry"}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap font-hind">
          {steadfastEnabled && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckSteadfastBalance}
                className="h-8 px-2.5 text-xs font-bold rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 gap-1 cursor-pointer"
              >
                <Truck className="size-3.5" />
                <span>{sfBalance !== null ? `SteadFast: ৳${sfBalance}` : "SteadFast Balance"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sfSyncingAll}
                onClick={handleSyncAllSteadfast}
                className="h-8 px-2.5 text-xs font-bold rounded-xl border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 gap-1 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${sfSyncingAll ? "animate-spin" : ""}`} />
                <span>{lang === "bn" ? "সব ট্র্যাক সিঙ্ক" : "Sync Tracking"}</span>
              </Button>
            </>
          )}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-7.5 h-8 text-xs rounded-xl font-hind"
              placeholder={lang === "bn" ? "কুরিয়ার, ট্র্যাকিং বা কাস্টমার খুঁজুন..." : "Search courier orders..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            onClick={() => setOpen(true)}
            size="sm"
            style={{ backgroundColor: "#ADFF2F" }}
            className="hidden sm:flex h-8 px-3 text-xs font-bold font-hind rounded-xl text-zinc-950 border border-black/20 hover:brightness-95 transition-all shadow-2xs gap-1.5 cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>{lang === "bn" ? "নতুন এন্ট্রি (New Entry)" : "New Entry"}</span>
          </Button>
        </div>
      </div>

      {/* KPI Info Boxes Grid (#98FB98 background) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center">
        <Card
          className="p-2 sm:p-2.5 rounded-xl border-[0.5px] border-black/75 dark:border-white/30 shadow-2xs text-zinc-950 font-hind transition-all"
          style={{ backgroundColor: "#98FB98" }}
        >
          <div className="flex items-center justify-between text-zinc-800">
            <span className="text-[10.5px] sm:text-xs font-bold font-hind uppercase tracking-tight">{lang === "bn" ? "মোট অর্ডার" : "Total Orders"}</span>
            <Truck className="size-3.5 sm:size-4 text-zinc-800" />
          </div>
          <p className="text-base sm:text-lg font-extrabold font-serif text-zinc-950 mt-0.5">{groupedOnlineSales.length}</p>
        </Card>

        <Card
          className="p-2 sm:p-2.5 rounded-xl border-[0.5px] border-black/75 dark:border-white/30 shadow-2xs text-zinc-950 font-hind transition-all"
          style={{ backgroundColor: "#98FB98" }}
        >
          <div className="flex items-center justify-between text-zinc-800">
            <span className="text-[10.5px] sm:text-xs font-bold font-hind uppercase tracking-tight">{lang === "bn" ? "কুরিয়ার পেন্ডিং" : "Pending Courier"}</span>
            <Clock className="size-3.5 sm:size-4 text-zinc-800" />
          </div>
          <p className="text-base sm:text-lg font-extrabold font-serif text-zinc-950 mt-0.5">{fmtMoney(pendingAmount)}</p>
          <span className="text-[9.5px] sm:text-[10px] text-zinc-700 font-hind block truncate">{lang === "bn" ? "ক্যাশবক্সে জমা বাকি" : "Awaiting collection"}</span>
        </Card>

        <Card
          className="p-2 sm:p-2.5 rounded-xl border-[0.5px] border-black/75 dark:border-white/30 shadow-2xs text-zinc-950 font-hind transition-all"
          style={{ backgroundColor: "#98FB98" }}
        >
          <div className="flex items-center justify-between text-zinc-800">
            <span className="text-[10.5px] sm:text-xs font-bold font-hind uppercase tracking-tight">{lang === "bn" ? "কালেক্টেড (ক্যাশবক্স)" : "Collected"}</span>
            <CheckCircle2 className="size-3.5 sm:size-4 text-zinc-800" />
          </div>
          <p className="text-base sm:text-lg font-extrabold font-serif text-zinc-950 mt-0.5">{fmtMoney(collectedAmount)}</p>
          <span className="text-[9.5px] sm:text-[10px] text-zinc-700 font-hind block truncate">{lang === "bn" ? "টাকা ক্যাশবক্সে যুক্ত" : "Deposited in cashbox"}</span>
        </Card>

        <Card
          className="p-2 sm:p-2.5 rounded-xl border-[0.5px] border-black/75 dark:border-white/30 shadow-2xs text-zinc-950 font-hind transition-all"
          style={{ backgroundColor: "#98FB98" }}
        >
          <div className="flex items-center justify-between text-zinc-800">
            <span className="text-[10.5px] sm:text-xs font-bold font-hind uppercase tracking-tight">{lang === "bn" ? "অনলাইন মোট লাভ" : "Online Profit"}</span>
            <ArrowUpRight className="size-3.5 sm:size-4 text-zinc-800" />
          </div>
          <p className="text-base sm:text-lg font-extrabold font-serif text-zinc-950 mt-0.5">{fmtMoney(onlineProfitTotal)}</p>
          <span className="text-[9.5px] sm:text-[10px] text-zinc-700 font-hind block truncate">{lang === "bn" ? "নিট অর্জিত লাভ" : "Net profit recorded"}</span>
        </Card>
      </div>

      {/* Tabs Filter */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full text-xs font-bold font-hind p-0.5 sm:p-1 h-8 sm:h-8.5 bg-muted/80 rounded-xl gap-0.5 sm:gap-1">
          <TabsTrigger value="all" className="rounded-lg text-[10.5px] sm:text-xs font-bold h-7 sm:h-7.5">
            {lang === "bn" ? `সব (${groupedOnlineSales.length})` : `All (${groupedOnlineSales.length})`}
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg text-[10.5px] sm:text-xs font-bold h-7 sm:h-7.5 text-amber-800 dark:text-amber-300">
            ⏳ {lang === "bn" ? "অপেক্ষমাণ" : "Pending"}
          </TabsTrigger>
          <TabsTrigger value="collected" className="rounded-lg text-[10.5px] sm:text-xs font-bold h-7 sm:h-7.5 text-emerald-800 dark:text-emerald-300">
            ✓ {lang === "bn" ? "কালেক্টেড" : "Collected"}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg text-[10.5px] sm:text-xs font-bold h-7 sm:h-7.5 text-rose-800 dark:text-rose-300">
            ✕ {lang === "bn" ? "বাতিল" : "Cancelled"}
          </TabsTrigger>
        </TabsList>

        <div className="pt-2.5 space-y-1.5 sm:space-y-2">
          {filteredList.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center rounded-2xl border-dashed border-border text-muted-foreground">
              <Truck className="size-7 sm:size-8 mx-auto mb-1.5 text-muted-foreground/40" />
              <p className="text-xs font-medium font-hind">
                {lang === "bn" ? "নির্বাচিত ক্যাটাগরিতে কোন অনলাইন অর্ডার পাওয়া যায়নি।" : "No online orders found for the selected view."}
              </p>
            </Card>
          ) : (
            filteredList.map((item) => {
              const isPending = item.courier_status !== "collected" && item.courier_status !== "cancelled" && !item.returned;
              const isCollected = item.courier_status === "collected";
              const isCancelled = item.courier_status === "cancelled" || item.returned;
              const isExpanded = expandedOrders[item.id] || false;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border-[0.5px] transition-all duration-150 ${
                    isExpanded
                      ? "border-black dark:border-white bg-primary/[0.02] shadow-xs"
                      : "border-black/70 dark:border-white/30 hover:border-black dark:hover:border-white bg-card"
                  }`}
                >
                  {/* Compact 2-Line Clickable Summary */}
                  <div
                    onClick={() => toggleOrder(item.id)}
                    className="p-2 sm:p-2.5 cursor-pointer select-none space-y-0.5"
                  >
                    {/* Line 1: Product Name & Count | Total Amount & Courier Status Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className={`font-bold font-hind text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 truncate ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                          {item.product_name}
                        </span>
                        {item.items.length > 1 && (
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0 font-hind font-bold">
                            {item.items.length}টি
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPending ? (
                          <span className="text-[9.5px] sm:text-[10px] font-bold font-hind px-1.5 py-0.2 rounded border-[0.5px] border-amber-500/40 uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 animate-pulse">
                            ⏳ {lang === "bn" ? "পেন্ডিং" : "Pending"}
                          </span>
                        ) : isCollected ? (
                          <span className="text-[9.5px] sm:text-[10px] font-bold font-hind px-1.5 py-0.2 rounded border-[0.5px] border-emerald-500/40 uppercase tracking-wider bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                            ✓ {lang === "bn" ? "পেইড" : "Paid"}
                          </span>
                        ) : (
                          <span className="text-[9.5px] sm:text-[10px] font-bold font-hind px-1.5 py-0.2 rounded border-[0.5px] border-rose-500/40 uppercase tracking-wider bg-rose-500/15 text-rose-800 dark:text-rose-300 line-through">
                            ✕ {lang === "bn" ? "বাতিল" : "Cancelled"}
                          </span>
                        )}

                        <span className={`text-xs sm:text-sm font-extrabold font-serif text-zinc-900 dark:text-zinc-100 ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                          {fmtMoney(item.sell_price)}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Customer / Date | Profit & Reveal Trigger */}
                    <div className="flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-hind">
                      <div className="min-w-0 flex-1 truncate flex items-center gap-1">
                        {item.parties?.name ? (
                          <>
                            <span className="font-bold font-charukola text-zinc-700 dark:text-zinc-300 truncate max-w-[120px] sm:max-w-[200px]">
                              {item.parties.name}
                            </span>
                            <span>·</span>
                          </>
                        ) : null}
                        <span className="font-mono text-[10px] sm:text-[10.5px]">
                          {fmtDateTime(item.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] sm:text-[10.5px] font-bold font-hind text-emerald-700 dark:text-emerald-300">
                          {lang === "bn" ? "লাভ:" : "Profit:"} {isCancelled ? "৳০" : fmtMoney(item.profit)}
                        </span>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoOrder(item);
                            setInfoItemId(item.items[0]?.id || null);
                          }}
                          className="h-6 px-1.5 text-[10px] font-bold rounded-md bg-background hover:bg-muted text-foreground border border-black/30 dark:border-white/20 gap-1 cursor-pointer shrink-0"
                          title={lang === "bn" ? "অর্ডারের পূর্ণ বিবরণ দেখুন" : "View Order Info"}
                        >
                          <Info className="size-3 text-primary" />
                          <span>{lang === "bn" ? "বিবরণ" : "Info"}</span>
                        </Button>

                        <span className="p-0.5 rounded text-muted-foreground/70 hover:text-foreground">
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Revealable Action & Order Details Drawer */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-1 border-t-[0.5px] border-black/40 dark:border-white/20 space-y-2 bg-muted/10 rounded-b-xl animate-in fade-in-50 duration-150 font-hind">
                      {/* Courier Information Bar */}
                      <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10 border-[0.5px] border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Truck className="size-3.5 text-purple-600 shrink-0" />
                          <span className="font-bold text-purple-900 dark:text-purple-200">{item.courier_name || "Courier Delivery"}</span>
                          {item.tracking_code && (
                            <span className="font-mono text-[10px] bg-background text-foreground px-1.5 py-0.2 rounded border-[0.5px] border-black/30 dark:border-white/30">
                              ID: {item.tracking_code}
                            </span>
                          )}
                          {(item as any).steadfast_status && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              {(item as any).steadfast_status}
                            </span>
                          )}
                        </div>

                        {item.note && (
                          <span className="text-[10.5px] text-muted-foreground italic">
                            {item.note}
                          </span>
                        )}
                      </div>

                      {/* Multi-Item Breakdown List if Group */}
                      {item.items.length > 1 && (
                        <div className="space-y-1 bg-background/90 p-2 rounded-xl border border-border/70">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block font-hind">
                              {lang === "bn" ? "অর্ডার আইটেম সমূহ (ক্লিক করে বিবরণ দেখুন):" : "Order Items (Click to view info):"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {item.items.length} {lang === "bn" ? "টি আইটেম" : "items"}
                            </span>
                          </div>
                          {item.items.map((it: any, idx: number) => {
                            const itTrack = it.tracking_code || it.tracking_id || it.consignment_id;
                            const q = deferredSearch.trim().toLowerCase();
                            const matchesSearch = Boolean(q) && (
                              (itTrack && itTrack.toLowerCase().includes(q)) ||
                              (it.product_name && it.product_name.toLowerCase().includes(q))
                            );

                            return (
                              <div
                                key={it.id || idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInfoOrder(item);
                                  setInfoItemId(it.id);
                                }}
                                className={`flex justify-between items-center text-xs p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-primary/5 active:scale-[0.99] font-hind ${
                                  matchesSearch
                                    ? "bg-purple-500/10 border-purple-500/40"
                                    : "bg-card border-border/50 hover:border-primary/40"
                                }`}
                              >
                                <div className="truncate mr-2 flex items-center gap-1.5 min-w-0">
                                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                    {idx + 1}. {it.product_name}
                                  </span>
                                  <span className="text-muted-foreground font-mono text-[10px] shrink-0 font-bold">
                                    ×{it.qty}
                                  </span>
                                  {itTrack && (
                                    <span className="font-mono text-[9px] bg-purple-500/15 text-purple-700 dark:text-purple-300 px-1 py-0.2 rounded shrink-0">
                                      {itTrack}
                                    </span>
                                  )}
                                  {matchesSearch && (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1 py-0.2 rounded shrink-0">
                                      ✓ মিলছে
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                    {fmtMoney(Number(it.sell_price) * it.qty)}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInfoOrder(item);
                                      setInfoItemId(it.id);
                                    }}
                                    className="h-6 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md gap-0.5 cursor-pointer"
                                  >
                                    <Info className="size-3" />
                                    <span>{lang === "bn" ? "বিবরণ" : "Info"}</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Actions Toolbar */}
                      <div className="flex items-center justify-between gap-2 pt-0.5 font-hind">
                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={(e) => { e.stopPropagation(); handlePrint(item); }}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-bold rounded-lg gap-1 cursor-pointer bg-background hover:bg-muted border-[0.5px] border-black/50 dark:border-white/30"
                          >
                            <Printer className="size-3 text-primary" />
                            <span>{lang === "bn" ? "রসিদ প্রিন্ট" : "Print Invoice"}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const phone = (item as any).recipient_phone || (item.parties as any)?.phone || "";
                              if (!phone) {
                                return toast.error(lang === "bn" ? "কাস্টমারের ফোন নম্বর নেই" : "No customer phone number");
                              }
                              const msg = buildOrderWhatsAppMessage({
                                shopName: user?.business_name,
                                customerName: (item as any).recipient_name || item.parties?.name || "Customer",
                                itemsSummary: item.product_name,
                                amount: Math.round(item.sell_price),
                                trackingCode: item.tracking_code,
                                status: (item as any).steadfast_status || item.courier_status,
                                type: "tracking",
                              });
                              const res = await sendDesktopWhatsAppMessage(phone, msg);
                              if (res.sent) {
                                toast.success("WhatsApp message sent from Desktop!");
                              } else {
                                const clean = phone.replace(/[^0-9]/g, "");
                                const bd = clean.startsWith("0") ? `88${clean}` : clean;
                                window.open(`https://wa.me/${bd}?text=${encodeURIComponent(msg)}`, "_blank");
                              }
                            }}
                            className="h-7 px-2 text-xs font-bold rounded-lg gap-1 cursor-pointer border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                          >
                            <MessageCircle className="size-3" />
                            <span>WhatsApp</span>
                          </Button>
                        </div>

                        {isPending && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {steadfastEnabled && !item.tracking_code && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); openSteadfastModal(item); }}
                                className="h-7 px-2 text-xs font-bold rounded-lg gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
                              >
                                <Send className="size-3" />
                                <span>{lang === "bn" ? "SteadFast পাঠান" : "Send SteadFast"}</span>
                              </Button>
                            )}
                            {steadfastEnabled && item.tracking_code && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleTrackSteadfast(item); }}
                                disabled={actionBusyId === item.id || (item.items[0] && actionBusyId === item.items[0].id)}
                                className="h-7 px-2 text-xs font-bold rounded-lg gap-1 border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer"
                              >
                                <RefreshCw className="size-3" />
                                <span>{lang === "bn" ? "ট্র্যাক" : "Track"}</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              style={{ backgroundColor: "#ADFF2F" }}
                              onClick={(e) => { e.stopPropagation(); handleApprove(item.items[0]?.id || item.id); }}
                              disabled={actionBusyId === item.id || (item.items[0] && actionBusyId === item.items[0].id)}
                              className="h-7 px-2.5 text-xs font-bold rounded-lg text-zinc-950 gap-1 border border-black/20 hover:brightness-95 transition-all shadow-2xs cursor-pointer"
                            >
                              <PackageCheck className="size-3 text-zinc-950" />
                              <span>{lang === "bn" ? "✓ গ্রহণ" : "Accept"}</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => { e.stopPropagation(); handleCancel(item.items[0]?.id || item.id); }}
                              disabled={actionBusyId === item.id || (item.items[0] && actionBusyId === item.items[0].id)}
                              className="h-7 px-2 text-xs font-bold rounded-lg gap-1 cursor-pointer"
                            >
                              <RotateCcw className="size-3" />
                              <span>{lang === "bn" ? "বাতিল" : "Cancel"}</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Tabs>

      <FAB onClick={() => setOpen(true)} />
      <SaleDialog open={open} onOpenChange={setOpen} presetType="online" />
      <OrderInfoDialog
        order={infoOrder}
        open={!!infoOrder}
        onOpenChange={(v) => {
          if (!v) setInfoOrder(null);
        }}
        initialSelectedItemId={infoItemId}
      />

      {/* SteadFast Parcel Dispatch & Fraud Check Dialog */}
      <Dialog open={!!sfModalOrder} onOpenChange={(v) => { if (!v) setSfModalOrder(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Truck className="size-5 text-emerald-600" />
              <span>{lang === "bn" ? "SteadFast কুরিয়ারে অর্ডার পাঠান" : "Dispatch Order to SteadFast"}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDispatchSteadfast} className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "কাস্টমারের নাম" : "Recipient Name"} *</Label>
              <Input value={sfName} onChange={(e) => setSfName(e.target.value)} required className="h-9 rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "১১ ডিজিটের মোবাইল নম্বর" : "Recipient Phone (11 digits)"} *</Label>
              <div className="flex gap-2">
                <Input
                  value={sfPhone}
                  onChange={(e) => setSfPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  required
                  className="h-9 rounded-xl text-xs font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sfBusy}
                  onClick={() => handleSteadfastFraudCheck()}
                  className="h-9 px-3 rounded-xl text-xs font-bold gap-1 shrink-0"
                >
                  <ShieldCheck className="size-3.5 text-amber-600" />
                  <span>{lang === "bn" ? "ফ্রড চেক" : "Fraud Check"}</span>
                </Button>
              </div>
              {sfFraudResult && (
                <div className="p-2.5 rounded-xl bg-muted/60 border border-border text-[11px] flex items-center justify-between gap-2">
                  <span>Total: <strong>{sfFraudResult.total_parcels}</strong></span>
                  <span className="text-emerald-600">Delivered: <strong>{sfFraudResult.total_delivered}</strong></span>
                  <span className="text-rose-600">Cancelled: <strong>{sfFraudResult.total_cancelled}</strong></span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{lang === "bn" ? "ডেলিভারি ঠিকানা" : "Delivery Address"} *</Label>
              <Input
                value={sfAddress}
                onChange={(e) => setSfAddress(e.target.value)}
                placeholder="House, Road, Area, District"
                required
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">COD Amount (৳) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={sfCod}
                  onChange={(e) => setSfCod(e.target.value)}
                  required
                  className="h-9 rounded-xl text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{lang === "bn" ? "নোট (ঐচ্ছিক)" : "Delivery Note"}</Label>
                <Input
                  value={sfNote}
                  onChange={(e) => setSfNote(e.target.value)}
                  placeholder="Optional note"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setSfModalOrder(null)} className="h-9 rounded-xl text-xs">
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button type="submit" disabled={sfBusy} className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5">
                <Send className="size-3.5" />
                <span>{sfBusy ? "..." : (lang === "bn" ? "SteadFast-এ পাঠান" : "Send Parcel")}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
