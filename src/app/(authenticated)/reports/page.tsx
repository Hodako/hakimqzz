"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar, Printer, ArrowLeft, Download,
  TrendingUp, ShoppingCart, Receipt, PiggyBank,
  Banknote, Users, RefreshCw, ListOrdered, BarChart3,
  FileCheck2, CheckCircle2, CircleDot
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useCashboxQuery } from "@/hooks/use-cashbox-query";
import {
  getSales, getPurchases, getExpenses,
  getSomiti, getParties
} from "@/lib/queries";
import { getBusinessSettingsFn } from "@/lib/rpc-admin";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { playTapSound } from "@/lib/audio";

interface GroupedSale {
  id: string;
  isGroup: boolean;
  cart_id?: string | null;
  product_name: string;
  qty: number;
  sell_price: number;
  profit: number;
  due_amount: number;
  paid_amount: number;
  type: "cash" | "credit" | "online";
  created_at: string;
  parties?: { name: string } | null;
  items: any[];
}

function groupSales(sales: any[]): GroupedSale[] {
  const grouped: GroupedSale[] = [];
  const cartGroups: Record<string, any[]> = {};

  sales.forEach(s => {
    if (s.cart_id) {
      if (!cartGroups[s.cart_id]) {
        cartGroups[s.cart_id] = [];
      }
      cartGroups[s.cart_id].push(s);
    } else {
      grouped.push({
        id: s.id,
        isGroup: false,
        cart_id: null,
        product_name: s.product_name,
        qty: s.qty,
        sell_price: Number(s.sell_price) * s.qty,
        profit: s.profit,
        due_amount: s.due_amount,
        paid_amount: s.paid_amount,
        type: s.type,
        created_at: s.created_at,
        parties: s.parties,
        items: [s]
      });
    }
  });

  Object.entries(cartGroups).forEach(([cartId, items]) => {
    items.sort((a, b) => a.product_name.localeCompare(b.product_name));
    
    const firstItem = items[0];
    const totalQty = items.reduce((sum, x) => sum + x.qty, 0);
    const totalSellPrice = items.reduce((sum, x) => sum + Number(x.sell_price) * x.qty, 0);
    const totalProfit = items.reduce((sum, x) => sum + x.profit, 0);
    const totalDue = items.reduce((sum, x) => sum + x.due_amount, 0);
    const totalPaid = items.reduce((sum, x) => sum + x.paid_amount, 0);
    
    const names = items.map(x => `${x.product_name} (×${x.qty})`).join(", ");

    grouped.push({
      id: firstItem.id,
      isGroup: true,
      cart_id: cartId,
      product_name: names,
      qty: totalQty,
      sell_price: totalSellPrice,
      profit: totalProfit,
      due_amount: totalDue,
      paid_amount: totalPaid,
      type: firstItem.type,
      created_at: firstItem.created_at,
      parties: firstItem.parties,
      items: items
    });
  });

  grouped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return grouped;
}

export default function ReportsGeneratorPage() {
  const { lang, t } = useT();

  // Date range state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayStr);

  // Section toggle state
  const [showSales, setShowSales] = useState(true);
  const [showPurchases, setShowPurchases] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showCashbox, setShowCashbox] = useState(true);
  const [showSomiti, setShowSomiti] = useState(true);
  const [showParties, setShowParties] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Queries
  const { data: bizSettings } = useQuery({ queryKey: ["business-settings"], queryFn: getBusinessSettingsFn });
  const salesQuery = useCachedQuery(["sales"], getSales);
  const purchasesQuery = useCachedQuery(["purchases"], getPurchases);
  const expensesQuery = useCachedQuery(["expenses"], getExpenses);
  const somitiQuery = useCachedQuery(["somiti"], getSomiti);
  const cashboxQuery = useCashboxQuery();
  const partiesQuery = useCachedQuery(["parties"], getParties);

  const bizName = bizSettings?.business?.name || "Dream Fashion";

  // Date Range Presets
  const setPreset = (type: "today" | "week" | "month") => {
    const end = new Date();
    const start = new Date();
    if (type === "today") {
      // today only
    } else if (type === "week") {
      start.setDate(end.getDate() - 7);
    } else if (type === "month") {
      start.setDate(end.getDate() - 30);
    }
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  };

  // Helper date filtering
  const inDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    return d >= from && d <= to;
  };

  // Filtered datasets
  const filteredSales = useMemo(() => (salesQuery.data ?? []).filter(s => !s.returned && inDateRange(s.created_at)), [salesQuery.data, from, to]);
  const groupedSalesList = useMemo(() => {
    return groupSales(filteredSales);
  }, [filteredSales]);
  const filteredPurchases = useMemo(() => (purchasesQuery.data ?? []).filter(p => inDateRange(p.created_at)), [purchasesQuery.data, from, to]);
  const filteredExpenses = useMemo(() => (expensesQuery.data ?? []).filter(e => inDateRange(e.created_at)), [expensesQuery.data, from, to]);
  const filteredCashbox = useMemo(() => (cashboxQuery.data ?? []).filter(c => inDateRange(c.created_at)), [cashboxQuery.data, from, to]);
  const filteredSomiti = useMemo(() => (somitiQuery.data ?? []).filter(s => inDateRange(s.created_at)), [somitiQuery.data, from, to]);
  const filteredParties = useMemo(() => (partiesQuery.data ?? []).filter(p => inDateRange(p.created_at)), [partiesQuery.data, from, to]);

  // Totals calculations
  const salesTotalVal = useMemo(() => filteredSales.reduce((a, s) => a + Number(s.sell_price) * s.qty, 0), [filteredSales]);
  const salesProfitVal = useMemo(() => filteredSales.reduce((a, s) => a + Number(s.profit), 0), [filteredSales]);
  const totalSalesDueVal = useMemo(() => filteredSales.reduce((a, s) => a + Number(s.due_amount || 0), 0), [filteredSales]);
  const purchaseTotalVal = useMemo(() => filteredPurchases.reduce((a, p) => a + Number(p.total), 0), [filteredPurchases]);
  const expenseTotalVal = useMemo(() => filteredExpenses.reduce((a, e) => a + Number(e.amount), 0), [filteredExpenses]);

  const somitiNetVal = useMemo(() => {
    return filteredSomiti.reduce((a, s) => {
      return s.kind === "deposit" ? a + Number(s.amount) : a - Number(s.amount);
    }, 0);
  }, [filteredSomiti]);

  const cashboxNetVal = useMemo(() => {
    return filteredCashbox.reduce((a, c) => {
      if (c.kind === "deposit" || c.kind === "sale") return a + Number(c.amount);
      return a - Number(c.amount);
    }, 0);
  }, [filteredCashbox]);

  // Index sections count builder
  const indexItems = useMemo(() => {
    const list: { id: string; num: number; titleBn: string; titleEn: string; count: number; active: boolean }[] = [
      { id: "index", num: 1, titleBn: "সূচিপত্র ও রিপোর্ট পরিচিতি", titleEn: "Table of Contents & Overview", count: 1, active: true },
      { id: "stats", num: 2, titleBn: "সার্বিক অর্থনৈতিক পরিসংখ্যান ও অ্যানালিটিক্স", titleEn: "Executive Financial Statistics & Analytics", count: 1, active: true },
      { id: "chart", num: 3, titleBn: "রাজস্ব, ক্রয় ও ব্যয়ের ভিজ্যুয়াল চার্ট", titleEn: "Revenue vs Expenses Visual Analytics", count: chartData.length > 0 ? 1 : 0, active: showSales || showPurchases || showExpenses },
    ];

    let currentNum = 4;
    if (showSales) {
      list.push({ id: "sales", num: currentNum++, titleBn: "বিক্রয় ফলাফল বিবরণী শীট", titleEn: "Sales Results Sheet", count: filteredSales.length, active: true });
    }
    if (showPurchases) {
      list.push({ id: "purchases", num: currentNum++, titleBn: "মাল ক্রয় ফলাফল বিবরণী শীট", titleEn: "Purchase Results Sheet", count: filteredPurchases.length, active: true });
    }
    if (showExpenses) {
      list.push({ id: "expenses", num: currentNum++, titleBn: "খরচ ও পরিচালন ব্যয় ফলাফল শীট", titleEn: "Overhead Expenses Results Sheet", count: filteredExpenses.length, active: true });
    }
    if (showCashbox) {
      list.push({ id: "cashbox", num: currentNum++, titleBn: "ক্যাশবক্স লেনদেন ফলাফল শীট", titleEn: "Cashbox Action Results Sheet", count: filteredCashbox.length, active: true });
    }
    if (showSomiti) {
      list.push({ id: "somiti", num: currentNum++, titleBn: "সমিতি সঞ্চয় ফলাফল শীট", titleEn: "Somiti Savings Results Sheet", count: filteredSomiti.length, active: true });
    }
    if (showParties) {
      list.push({ id: "parties", num: currentNum++, titleBn: "পার্টি ও গ্রাহক ডিরেক্টরি শীট", titleEn: "Parties & Customer Directory Sheet", count: filteredParties.length, active: true });
    }

    return list;
  }, [showSales, showPurchases, showExpenses, showCashbox, showSomiti, showParties, filteredSales.length, filteredPurchases.length, filteredExpenses.length, filteredCashbox.length, filteredSomiti.length, filteredParties.length]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; Sales: number; Purchases: number; Expenses: number }> = {};
    const start = new Date(from);
    const end = new Date(to);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key, Sales: 0, Purchases: 0, Expenses: 0 };
    }

    filteredSales.forEach(s => {
      const key = s.created_at.slice(0, 10);
      if (map[key]) map[key].Sales += Number(s.sell_price) * s.qty;
    });

    filteredPurchases.forEach(p => {
      const key = p.created_at.slice(0, 10);
      if (map[key]) map[key].Purchases += Number(p.total);
    });

    filteredExpenses.forEach(e => {
      const key = e.created_at.slice(0, 10);
      if (map[key]) map[key].Expenses += Number(e.amount);
    });

    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        date: item.date.slice(5) // e.g. "06-12"
      }));
  }, [filteredSales, filteredPurchases, filteredExpenses, from, to]);

  const handlePrint = () => {
    playTapSound();
    setIsGeneratingPDF(true);
    setTimeout(() => {
      setIsGeneratingPDF(false);
      window.print();
    }, 1200);
  };

  const handleDownloadPDF = () => {
    playTapSound();
    setIsGeneratingPDF(true);

    const runHtml2Pdf = () => {
      const element = document.getElementById("print-report-content");
      if (!element) {
        setIsGeneratingPDF(false);
        return;
      }

      element.classList.remove("hidden");
      element.classList.remove("print:block");
      element.style.display = "block";

      const opt = {
        margin:       0.3,
        filename:     `business_report_${from}_to_${to}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // @ts-ignore
      window.html2pdf().set(opt).from(element).save().then(() => {
        element.classList.add("hidden");
        element.classList.add("print:block");
        element.style.display = "";
        setIsGeneratingPDF(false);
        toast.success(lang === "bn" ? "পিডিএফ ডাউনলোড শুরু হয়েছে!" : "PDF download completed!");
      }).catch((err: any) => {
        console.error("PDF download error", err);
        element.classList.add("hidden");
        element.classList.add("print:block");
        element.style.display = "";
        setIsGeneratingPDF(false);
        toast.error(lang === "bn" ? "পিডিএফ তৈরি করতে ব্যর্থ হয়েছে" : "Failed to generate PDF");
      });
    };

    // @ts-ignore
    if (window.html2pdf) {
      runHtml2Pdf();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        runHtml2Pdf();
      };
      script.onerror = () => {
        setIsGeneratingPDF(false);
        toast.error(lang === "bn" ? "লাইব্রেরি লোড করতে ব্যর্থ হয়েছে" : "Failed to load PDF library");
      };
      document.body.appendChild(script);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-12 font-sans">
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/85 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card shadow-lg max-w-xs text-center beveled-card">
            <RefreshCw className="size-8 text-primary animate-spin" />
            <h3 className="font-semibold text-sm">
              {lang === "bn" ? "পিডিএফ রিপোর্ট তৈরি হচ্ছে" : "Generating PDF Report"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "অনুগ্রহ করে অপেক্ষা করুন, প্রিন্ট প্রিভিউ প্রস্তুত করা হচ্ছে..."
                : "Please wait, preparing print preview..."}
            </p>
          </div>
        </div>
      )}

      {/* ── SCREEN VIEW (hidden when printing) ────────────────────────────────── */}
      <div className="print:hidden space-y-6">
        {/* Screen Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print border-b pb-3.5">
          <div className="flex items-center gap-2">
            <Link href="/more">
              <Button size="icon" variant="ghost" className="size-8 rounded-lg">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileCheck2 className="size-5 text-primary" />
                <span>{lang === "bn" ? "ব্যবসায়িক রিপোর্ট ও অ্যানালিটিক্স" : "Reports & Business Analytics"}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "bn" ? "সূচিপত্র, পরিসংখ্যান ও বিবরণী সমন্বিত প্রফেশনাল পিডিএফ রিপোর্ট" : "Professional PDF report generator with Table of Contents & Statistics"}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="bg-primary hover:bg-primary/90 font-bold shadow-md">
              <Printer className="size-4 mr-1.5" />
              {lang === "bn" ? "প্রিন্ট রিপোর্ট" : "Print Report"}
            </Button>
            <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/5 font-semibold">
              <Download className="size-4 mr-1.5" />
              {lang === "bn" ? "ডাউনলোড পিডিএফ" : "Download PDF"}
            </Button>
          </div>
        </div>

        {/* Control Panel (no-print) */}
        <Card className="p-4 no-print space-y-4 bg-card border-border/80 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date range picker */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {lang === "bn" ? "তারিখের সীমা নির্বাচন করুন" : "Select Date Range"}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">{lang === "bn" ? "হতে" : "From"}</span>
                  <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">{lang === "bn" ? "পর্যন্ত" : "To"}</span>
                  <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
              <div className="flex gap-1.5 pt-1">
                <Button size="sm" variant="outline" className="text-[11px] h-7 px-3 font-medium" onClick={() => setPreset("today")}>
                  {lang === "bn" ? "আজ" : "Today"}
                </Button>
                <Button size="sm" variant="outline" className="text-[11px] h-7 px-3 font-medium" onClick={() => setPreset("week")}>
                  {lang === "bn" ? "৭ দিন" : "7 Days"}
                </Button>
                <Button size="sm" variant="outline" className="text-[11px] h-7 px-3 font-medium" onClick={() => setPreset("month")}>
                  {lang === "bn" ? "৩০ দিন" : "30 Days"}
                </Button>
              </div>
            </div>

            {/* Section selections */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ListOrdered className="size-3.5" />
                {lang === "bn" ? "রিপোর্টে সূচিপত্র ও ফলাফল অন্তর্ভুক্ত করুন" : "Include in Report Index"}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="checkbox" checked={showSales} onChange={e => setShowSales(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-4" />
                  <span>{lang === "bn" ? "বিক্রয় ফলাফল" : "Sales Results"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="checkbox" checked={showPurchases} onChange={e => setShowPurchases(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-4" />
                  <span>{lang === "bn" ? "মাল ক্রয় ফলাফল" : "Purchase Results"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="checkbox" checked={showExpenses} onChange={e => setShowExpenses(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-4" />
                  <span>{lang === "bn" ? "খরচ / ব্যয় ফলাফল" : "Expense Results"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="checkbox" checked={showCashbox} onChange={e => setShowCashbox(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-4" />
                  <span>{lang === "bn" ? "ক্যাশবক্স লেনদেন" : "Cashbox Action"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="checkbox" checked={showSomiti} onChange={e => setShowSomiti(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-4" />
                  <span>{lang === "bn" ? "সমিতি সঞ্চয়" : "Somiti Ledger"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="checkbox" checked={showParties} onChange={e => setShowParties(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-4" />
                  <span>{lang === "bn" ? "পার্টি ডিরেক্টরি" : "Parties Log"}</span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* ── TIER 1: INDEX / TABLE OF CONTENTS (সূচিপত্র) ────────────────────────── */}
        <Card className="p-4 space-y-3 border-primary/20 bg-gradient-to-r from-primary/5 via-card to-transparent rounded-2xl shadow-xs">
          <div className="flex items-center justify-between border-b border-primary/15 pb-2">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ListOrdered className="size-4 text-primary" />
              <span>{lang === "bn" ? "রিপোর্ট সূচিপত্র ও সূচক নির্দেশিকা (Index & Contents)" : "Table of Contents & Report Index"}</span>
            </h2>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {from} - {to}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {indexItems.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                  item.active
                    ? "bg-card border-border/80 shadow-xs"
                    : "bg-muted/30 border-dashed border-border/50 text-muted-foreground opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] grid place-items-center shrink-0">
                    {item.num}
                  </span>
                  <span className="font-medium text-foreground truncate">
                    {lang === "bn" ? item.titleBn : item.titleEn}
                  </span>
                </div>
                {item.active && item.count > 0 && (
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                    {item.count} {lang === "bn" ? "টি" : "items"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* ── TIER 2: EXECUTIVE FINANCIAL STATISTICS (পরিসংখ্যান) ──────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4.5 text-primary" />
            <h2 className="font-bold text-sm tracking-wide text-foreground uppercase">
              {lang === "bn" ? "২. সার্বিক অর্থনৈতিক পরিসংখ্যান (Financial Statistics)" : "2. Executive Financial Statistics"}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {showSales && (
              <Card className="p-3.5 space-y-1 bg-emerald-500/10 border-emerald-500/20 rounded-2xl shadow-xs">
                <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                  <span>{lang === "bn" ? "মোট বিক্রি" : "Total Sales"}</span>
                  <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(salesTotalVal)}</div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {lang === "bn" ? `${filteredSales.length} টি বিক্রি (লাভ ৳${salesProfitVal})` : `${filteredSales.length} sales (profit ৳${salesProfitVal})`}
                </div>
              </Card>
            )}

            {showPurchases && (
              <Card className="p-3.5 space-y-1 bg-blue-500/10 border-blue-500/20 rounded-2xl shadow-xs">
                <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                  <span>{lang === "bn" ? "মোট মাল ক্রয়" : "Total Purchases"}</span>
                  <ShoppingCart className="size-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmtMoney(purchaseTotalVal)}</div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {lang === "bn" ? `${filteredPurchases.length} টি ক্রয় ভাউচার` : `${filteredPurchases.length} purchase records`}
                </div>
              </Card>
            )}

            {showExpenses && (
              <Card className="p-3.5 space-y-1 bg-rose-500/10 border-rose-500/20 rounded-2xl shadow-xs">
                <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                  <span>{lang === "bn" ? "মোট খরচ" : "Total Overhead"}</span>
                  <Receipt className="size-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{fmtMoney(expenseTotalVal)}</div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {lang === "bn" ? `${filteredExpenses.length} টি খরচ বিবরণী` : `${filteredExpenses.length} expense entries`}
                </div>
              </Card>
            )}

            {showCashbox && (
              <Card className="p-3.5 space-y-1 bg-amber-500/10 border-amber-500/20 rounded-2xl shadow-xs">
                <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                  <span>{lang === "bn" ? "ক্যাশ নিট প্রবাহ" : "Cashbox Net"}</span>
                  <Banknote className="size-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className={`text-lg font-bold ${cashboxNetVal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {lang === "bn" ? `${filteredCashbox.length} টি ক্যাশ এন্ট্রি` : `${filteredCashbox.length} cash entries`}
                </div>
              </Card>
            )}

            {showSomiti && (
              <Card className="p-3.5 space-y-1 bg-indigo-500/10 border-indigo-500/20 rounded-2xl shadow-xs col-span-2 md:col-span-1">
                <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                  <span>{lang === "bn" ? "সমিতি সঞ্চয়" : "Somiti Balance"}</span>
                  <PiggyBank className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className={`text-lg font-bold ${somitiNetVal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {lang === "bn" ? `${filteredSomiti.length} টি লেনদেন` : `${filteredSomiti.length} transactions`}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Visual Chart Section */}
        {(showSales || showPurchases || showExpenses) && chartData.length > 0 && (
          <Card className="p-4 space-y-3 bg-card border-border/80 rounded-2xl shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <span>{lang === "bn" ? "৩. রাজস্ব বনাম ক্রয় বনাম খরচ বিশ্লেষণ চার্ট" : "3. Sales vs Purchases vs Expenses Comparison Chart"}</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {showSales && <Bar dataKey="Sales" name={lang === "bn" ? "বিক্রয়" : "Sales"} fill="#10b981" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                  {showPurchases && <Bar dataKey="Purchases" name={lang === "bn" ? "ক্রয়" : "Purchases"} fill="#3b82f6" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                  {showExpenses && <Bar dataKey="Expenses" name={lang === "bn" ? "খরচ" : "Expenses"} fill="#ef4444" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* ── TIER 3: DETAILED RESULTS SHEETS (ফলাফল বিবরণী শীট) ──────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <FileCheck2 className="size-4.5 text-primary" />
            <h2 className="font-bold text-sm tracking-wide text-foreground uppercase">
              {lang === "bn" ? "ফলাফল বিবরণী শীটসমূহ (Detailed Results Sheets)" : "Detailed Results Sheets"}
            </h2>
          </div>

          {/* Sales Results Sheet */}
          {showSales && filteredSales.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide text-foreground flex items-center gap-2">
                  <span className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-bold grid place-items-center">1</span>
                  <span>{lang === "bn" ? "বিক্রয় ফলাফল বিবরণী শীট (Sales Results Sheet)" : "Sales Results Sheet"}</span>
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {filteredSales.length} {lang === "bn" ? "টি বিক্রয় রেকর্ড" : "records"}
                </span>
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/80 text-muted-foreground uppercase text-[11px] font-bold">
                      <th className="p-3">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                      <th className="p-3">{lang === "bn" ? "পণ্যের বিবরণ" : "Product Details"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "বিক্রয় মূল্য" : "Sell Price"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Mode"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "লাভ" : "Profit"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {groupedSalesList.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(s.created_at)}</td>
                        <td className="p-3 font-semibold text-foreground">
                          {s.isGroup ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
                                {lang === "bn" ? "কার্ট" : "Cart"}
                              </span>
                              <span>{s.product_name}</span>
                            </div>
                          ) : (
                            s.product_name
                          )}
                        </td>
                        <td className="p-3 text-center font-bold">{s.qty}</td>
                        <td className="p-3 text-right font-bold text-foreground">{fmtMoney(s.sell_price)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            s.type === "cash"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : s.type === "credit"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}>
                            {s.type === "credit" ? (lang === "bn" ? "বকেয়া" : "Credit") : s.type === "online" ? (lang === "bn" ? "অনলাইন" : "Online") : (lang === "bn" ? "ক্যাশ" : "Cash")}
                          </span>
                        </td>
                        <td className="p-3 text-right text-rose-600 font-bold">{s.due_amount > 0 ? fmtMoney(s.due_amount) : "—"}</td>
                        <td className="p-3 text-right text-emerald-600 font-bold">{fmtMoney(s.profit)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border text-xs">
                      <td colSpan={2} className="p-3 uppercase">{lang === "bn" ? "সর্বমোট বিক্রয় ফলাফল" : "Total Sales Results"}</td>
                      <td className="p-3 text-center">{filteredSales.reduce((a, s) => a + s.qty, 0)}</td>
                      <td className="p-3 text-right text-foreground">{fmtMoney(salesTotalVal)}</td>
                      <td className="p-3 text-center">—</td>
                      <td className="p-3 text-right text-rose-600">{fmtMoney(totalSalesDueVal)}</td>
                      <td className="p-3 text-right text-emerald-600">{fmtMoney(salesProfitVal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Purchase Results Sheet */}
          {showPurchases && filteredPurchases.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide text-foreground flex items-center gap-2">
                  <span className="size-5 rounded-full bg-blue-500/15 text-blue-600 text-xs font-bold grid place-items-center">2</span>
                  <span>{lang === "bn" ? "মাল ক্রয় ফলাফল বিবরণী শীট (Purchase Results Sheet)" : "Purchase Results Sheet"}</span>
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {filteredPurchases.length} {lang === "bn" ? "টি ক্রয় রেকর্ড" : "records"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/80 text-muted-foreground uppercase text-[11px] font-bold">
                      <th className="p-3">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                      <th className="p-3">{lang === "bn" ? "পণ্যের বিবরণ" : "Product Name"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "একক ক্রয় মূল্য" : "Unit Cost"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Mode"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "মোট ক্রয় খরচ" : "Total Cost"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPurchases.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(p.created_at)}</td>
                        <td className="p-3 font-semibold text-foreground">{p.product_name}</td>
                        <td className="p-3 text-center font-bold">{p.qty}</td>
                        <td className="p-3 text-right text-muted-foreground">{fmtMoney(p.unit_cost)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            p.payment_type === "credit"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {p.payment_type === "credit" ? (lang === "bn" ? "বকেয়া" : "Credit") : (lang === "bn" ? "ক্যাশ" : "Cash")}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-foreground">{fmtMoney(p.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border text-xs">
                      <td colSpan={2} className="p-3 uppercase">{lang === "bn" ? "সর্বমোট মাল ক্রয় খরচ" : "Total Purchase Expense"}</td>
                      <td className="p-3 text-center">{filteredPurchases.reduce((a, p) => a + p.qty, 0)}</td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3 text-center">—</td>
                      <td className="p-3 text-right text-foreground">{fmtMoney(purchaseTotalVal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense Results Sheet */}
          {showExpenses && filteredExpenses.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide text-foreground flex items-center gap-2">
                  <span className="size-5 rounded-full bg-rose-500/15 text-rose-600 text-xs font-bold grid place-items-center">3</span>
                  <span>{lang === "bn" ? "পরিচালন খরচ ও ব্যয় শীট (Expense Results Sheet)" : "Expense Results Sheet"}</span>
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {filteredExpenses.length} {lang === "bn" ? "টি খরচ এন্ট্রি" : "records"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/80 text-muted-foreground uppercase text-[11px] font-bold">
                      <th className="p-3">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                      <th className="p-3">{lang === "bn" ? "খরচের খাত / বিবরণ" : "Expense Head / Title"}</th>
                      <th className="p-3">{lang === "bn" ? "মন্তব্য" : "Notes"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "খরচের পরিমাণ" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(e.created_at)}</td>
                        <td className="p-3 font-semibold text-foreground">{e.title}</td>
                        <td className="p-3 text-muted-foreground">{e.note || "—"}</td>
                        <td className="p-3 text-right font-bold text-rose-600">{fmtMoney(e.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border text-xs">
                      <td colSpan={3} className="p-3 uppercase">{lang === "bn" ? "সর্বমোট পরিচালন খরচ" : "Total Overhead Expenses"}</td>
                      <td className="p-3 text-right text-rose-600">{fmtMoney(expenseTotalVal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cashbox Results Sheet */}
          {showCashbox && filteredCashbox.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide text-foreground flex items-center gap-2">
                  <span className="size-5 rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold grid place-items-center">4</span>
                  <span>{lang === "bn" ? "ক্যাশবক্স লেনদেন শীট (Cashbox Action Sheet)" : "Cashbox Action Sheet"}</span>
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {filteredCashbox.length} {lang === "bn" ? "টি বিবরণী" : "records"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/80 text-muted-foreground uppercase text-[11px] font-bold">
                      <th className="p-3">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                      <th className="p-3">{lang === "bn" ? "টাইপ" : "Action Type"}</th>
                      <th className="p-3">{lang === "bn" ? "মন্তব্য" : "Note"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredCashbox.map(c => {
                      const isPlus = c.kind === "deposit" || c.kind === "sale";
                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(c.created_at)}</td>
                          <td className="p-3 capitalize font-medium">{c.kind}</td>
                          <td className="p-3 text-muted-foreground">{c.note || "—"}</td>
                          <td className={`p-3 text-right font-bold ${isPlus ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPlus ? "+" : "−"}{fmtMoney(c.amount)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border text-xs">
                      <td colSpan={3} className="p-3 uppercase">{lang === "bn" ? "নিট ক্যাশ ব্যালেন্স প্রবাহ" : "Net Cashbox Flow"}</td>
                      <td className={`p-3 text-right ${cashboxNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Somiti Results Sheet */}
          {showSomiti && filteredSomiti.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide text-foreground flex items-center gap-2">
                  <span className="size-5 rounded-full bg-indigo-500/15 text-indigo-600 text-xs font-bold grid place-items-center">5</span>
                  <span>{lang === "bn" ? "সমিতি সঞ্চয় বিবরণী শীট (Somiti Savings Sheet)" : "Somiti Savings Sheet"}</span>
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {filteredSomiti.length} {lang === "bn" ? "টি লেনদেন" : "records"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/80 text-muted-foreground uppercase text-[11px] font-bold">
                      <th className="p-3">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                      <th className="p-3">{lang === "bn" ? "ধরন" : "Action"}</th>
                      <th className="p-3">{lang === "bn" ? "মন্তব্য" : "Remarks"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSomiti.map(s => {
                      const isPlus = s.kind === "deposit";
                      return (
                        <tr key={s.id} className="hover:bg-muted/30 transition">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(s.created_at)}</td>
                          <td className="p-3 capitalize font-medium">{s.kind}</td>
                          <td className="p-3 text-muted-foreground">{s.note || "—"}</td>
                          <td className={`p-3 text-right font-bold ${isPlus ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPlus ? "+" : "−"}{fmtMoney(s.amount)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border text-xs">
                      <td colSpan={3} className="p-3 uppercase">{lang === "bn" ? "সমিতি নিট সঞ্চয় ফান্ড" : "Net Somiti Balance"}</td>
                      <td className={`p-3 text-right ${somitiNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Parties Results Sheet */}
          {showParties && filteredParties.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide text-foreground flex items-center gap-2">
                  <span className="size-5 rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold grid place-items-center">6</span>
                  <span>{lang === "bn" ? "পার্টি ও গ্রাহক ডিরেক্টরি শীট (Parties Directory Sheet)" : "Parties Directory Sheet"}</span>
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {filteredParties.length} {lang === "bn" ? "জন পার্টি" : "parties"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/80 text-muted-foreground uppercase text-[11px] font-bold">
                      <th className="p-3">{lang === "bn" ? "নিবন্ধন তারিখ" : "Registered Date"}</th>
                      <th className="p-3">{lang === "bn" ? "পার্টির নাম" : "Name"}</th>
                      <th className="p-3">{lang === "bn" ? "ফোন নম্বর" : "Phone"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "আর্কাইভ অবস্থা" : "Archived Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredParties.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(p.created_at)}</td>
                        <td className="p-3 font-semibold text-foreground">{p.name}</td>
                        <td className="p-3 font-mono">{p.phone || "—"}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${p.archived ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                            {p.archived ? (lang === "bn" ? "আর্কাইভড" : "Archived") : (lang === "bn" ? "সক্রিয়" : "Active")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile sticky action bar ── */}
        <div className="sm:hidden fixed bottom-16 left-0 right-0 z-40 print:hidden">
          <div className="mx-4 flex gap-2 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-lg p-2.5">
            <Button
              onClick={handlePrint}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-xs h-10 font-bold"
            >
              <Printer className="size-4 mr-1.5" />
              {lang === "bn" ? "প্রিন্ট করুন" : "Print Report"}
            </Button>
            <Button
              onClick={handleDownloadPDF}
              size="sm"
              variant="outline"
              className="flex-1 border-primary/40 text-primary hover:bg-primary/5 text-xs h-10 font-semibold"
            >
              <Download className="size-4 mr-1.5" />
              {lang === "bn" ? "ডাউনলোড" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── DEDICATED PRINT VIEW (visible only when printing or exporting PDF) ── */}
      <div id="print-report-content" className="hidden print:block print-color-exact w-full max-w-4xl mx-auto bg-white text-zinc-900 p-8 font-sans space-y-6 text-xs">
        
        {/* REPORT COVER & HEADER */}
        <div className="space-y-6">
          <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-5">
            <div className="flex items-center gap-4">
              <img
                src={bizSettings?.business?.logo_url || "/logo.png"}
                alt={bizName}
                className="h-14 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
              />
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900">{bizName}</h1>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider">{lang === "bn" ? "অফিসিয়াল ব্যবসায়িক আর্থিক রিপোর্ট" : "Official Business Financial Audit Report"}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200">
                {lang === "bn" ? "ব্যবসায়িক বিশ্লেষণ রিপোর্ট" : "Business Financial Audit Report"}
              </h2>
              <p className="text-zinc-600 text-[10px] mt-1.5 font-semibold">
                {lang === "bn" ? `সময়কাল: ${from} থেকে ${to}` : `Period: ${from} to ${to}`}
              </p>
              <p className="text-zinc-500 text-[9px] mt-0.5">
                {lang === "bn" ? `তৈরি হয়েছে: ${new Date().toLocaleString()}` : `Generated: ${new Date().toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* ── TIER 1 PRINT: TABLE OF CONTENTS / INDEX (সূচিপত্র) ────────────────────── */}
          <div className="border border-zinc-300 rounded-lg p-4 bg-zinc-50/60 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1.5 flex items-center gap-2">
              <span>📋</span>
              <span>{lang === "bn" ? "১. রিপোর্ট সূচিপত্র ও উপাদান তালিকা (Table of Contents & Index)" : "1. Table of Contents & Report Index"}</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              {indexItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-zinc-200/60 pb-1">
                  <span className="font-semibold text-zinc-800">
                    {item.num}. {lang === "bn" ? item.titleBn : item.titleEn}
                  </span>
                  <span className="font-mono text-zinc-500 text-[10px]">
                    {item.active ? (item.count > 0 ? `${item.count} ${lang === "bn" ? "রেকর্ড" : "records"}` : (lang === "bn" ? "অন্তর্ভুক্ত" : "Included")) : (lang === "bn" ? "অনুপস্থিত" : "Excluded")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── TIER 2 PRINT: FINANCIAL STATISTICS & KEY METRICS (পরিসংখ্যান) ──────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1 flex items-center gap-2">
              <span>📊</span>
              <span>{lang === "bn" ? "২. সার্বিক অর্থনৈতিক পরিসংখ্যান (Executive Financial Statistics)" : "2. Executive Financial Statistics"}</span>
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              {showSales && (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1">
                  <div className="text-[10px] text-emerald-900 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "মোট বিক্রি" : "Total Sales"}
                  </div>
                  <div className="text-lg font-bold text-emerald-800">{fmtMoney(salesTotalVal)}</div>
                  <div className="text-[9px] text-emerald-700 font-semibold">
                    {lang === "bn" ? `${filteredSales.length} টি বিক্রি (মোট লাভ ৳${salesProfitVal})` : `${filteredSales.length} sales (profit ৳${salesProfitVal})`}
                  </div>
                </div>
              )}

              {showPurchases && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 space-y-1">
                  <div className="text-[10px] text-blue-900 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "মোট মাল ক্রয়" : "Total Purchases"}
                  </div>
                  <div className="text-lg font-bold text-blue-800">{fmtMoney(purchaseTotalVal)}</div>
                  <div className="text-[9px] text-blue-700 font-semibold">
                    {lang === "bn" ? `${filteredPurchases.length} টি ক্রয় ভাউচার` : `${filteredPurchases.length} purchase vouchers`}
                  </div>
                </div>
              )}

              {showExpenses && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 space-y-1">
                  <div className="text-[10px] text-rose-900 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "মোট খরচ / ব্যয়" : "Total Overhead"}
                  </div>
                  <div className="text-lg font-bold text-rose-800">{fmtMoney(expenseTotalVal)}</div>
                  <div className="text-[9px] text-rose-700 font-semibold">
                    {lang === "bn" ? `${filteredExpenses.length} টি খরচ বিবরণী` : `${filteredExpenses.length} other expenses`}
                  </div>
                </div>
              )}

              {showCashbox && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1">
                  <div className="text-[10px] text-amber-900 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "ক্যাশ নিট প্রবাহ" : "Cashbox Net"}
                  </div>
                  <div className={`text-lg font-bold ${cashboxNetVal >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                    {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
                  </div>
                  <div className="text-[9px] text-amber-700 font-semibold">
                    {lang === "bn" ? `${filteredCashbox.length} টি ক্যাশ বিবরণী` : `${filteredCashbox.length} cash box actions`}
                  </div>
                </div>
              )}

              {showSomiti && (
                <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-1">
                  <div className="text-[10px] text-indigo-900 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "সমিতি সঞ্চয়" : "Somiti Net"}
                  </div>
                  <div className={`text-lg font-bold ${somitiNetVal >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                    {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
                  </div>
                  <div className="text-[9px] text-indigo-700 font-semibold">
                    {lang === "bn" ? `${filteredSomiti.length} টি লেনদেন` : `${filteredSomiti.length} somiti activities`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Graph Comparison Section */}
          {(showSales || showPurchases || showExpenses) && chartData.length > 0 && (
            <div className="space-y-2 border border-zinc-200 bg-zinc-50/40 rounded-lg p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                {lang === "bn" ? "৩. রাজস্ব বনাম ক্রয় বনাম খরচ বিশ্লেষণ চার্ট" : "3. Sales vs Purchases vs Expenses Comparison Chart"}
              </h3>
              <div className="w-full flex justify-center">
                <BarChart width={700} height={240} data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#3f3f46" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#3f3f46" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {showSales && <Bar dataKey="Sales" name={lang === "bn" ? "বিক্রয়" : "Sales"} fill="#10b981" isAnimationActive={false} radius={[2, 2, 0, 0]} />}
                  {showPurchases && <Bar dataKey="Purchases" name={lang === "bn" ? "ক্রয়" : "Purchases"} fill="#3b82f6" isAnimationActive={false} radius={[2, 2, 0, 0]} />}
                  {showExpenses && <Bar dataKey="Expenses" name={lang === "bn" ? "খরচ" : "Expenses"} fill="#ef4444" isAnimationActive={false} radius={[2, 2, 0, 0]} />}
                </BarChart>
              </div>
            </div>
          )}
        </div>

        {/* ── TIER 3 PRINT: RESULTS SHEETS (ফলাফল বিবরণী শীটসমূহ) ────────────────── */}
        <div className="print-page-break pt-6 space-y-6">
          <h2 className="text-xs font-bold text-zinc-900 border-b-2 border-zinc-900 pb-1.5 tracking-wider uppercase">
            {lang === "bn" ? "ফলাফল বিবরণী শীটসমূহ (Detailed Results Sheets)" : "Detailed Results Sheets"}
          </h2>

          {/* Sales Results Sheet */}
          {showSales && filteredSales.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-zinc-900 flex items-center justify-between border-b border-zinc-300 pb-1">
                <span>১. বিক্রয় ফলাফল বিবরণী শীট (Sales Results Sheet)</span>
                <span className="text-[10px] font-normal text-zinc-600">{filteredSales.length} {lang === "bn" ? "টি এন্ট্রি" : "entries"}</span>
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 uppercase text-zinc-800 font-bold">
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "পণ্যের বিবরণ" : "Product"}</th>
                    <th className="p-2 border-r border-zinc-300 text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                    <th className="p-2 border-r border-zinc-300 text-right">{lang === "bn" ? "বিক্রয় মূল্য" : "Sell Price"}</th>
                    <th className="p-2 border-r border-zinc-300 text-center">{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Mode"}</th>
                    <th className="p-2 border-r border-zinc-300 text-right">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                    <th className="p-2 text-right">{lang === "bn" ? "লাভ" : "Profit"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {groupedSalesList.map(s => (
                    <tr key={s.id} className="print-avoid-break even:bg-zinc-50/70">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap text-zinc-700">{fmtDateTime(s.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-semibold text-zinc-900">
                        {s.isGroup ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 rounded border border-emerald-300 shrink-0">
                              {lang === "bn" ? "কার্ট" : "Cart"}
                            </span>
                            <span>{s.product_name}</span>
                          </div>
                        ) : (
                          s.product_name
                        )}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center font-bold">{s.qty}</td>
                      <td className="p-2 border-r border-zinc-200 text-right font-bold">{fmtMoney(s.sell_price)}</td>
                      <td className="p-2 border-r border-zinc-200 text-center uppercase font-bold text-[8px]">
                        {s.type === "credit" ? (lang === "bn" ? "বকেয়া" : "Credit") : s.type === "online" ? (lang === "bn" ? "অনলাইন" : "Online") : (lang === "bn" ? "ক্যাশ" : "Cash")}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right text-rose-700 font-bold">{s.due_amount > 0 ? fmtMoney(s.due_amount) : "—"}</td>
                      <td className="p-2 text-right text-emerald-700 font-bold">{fmtMoney(s.profit)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400">
                    <td colSpan={2} className="p-2 border-r border-zinc-300 uppercase">{lang === "bn" ? "সর্বমোট বিক্রয় ফলাফল" : "Total Sales Results"}</td>
                    <td className="p-2 border-r border-zinc-300 text-center">{filteredSales.reduce((a, s) => a + s.qty, 0)}</td>
                    <td className="p-2 border-r border-zinc-300 text-right">{fmtMoney(salesTotalVal)}</td>
                    <td className="p-2 border-r border-zinc-300 text-center">—</td>
                    <td className="p-2 border-r border-zinc-300 text-right text-rose-700">{fmtMoney(totalSalesDueVal)}</td>
                    <td className="p-2 text-right text-emerald-700">{fmtMoney(salesProfitVal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Results Sheet */}
          {showPurchases && filteredPurchases.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-zinc-900 flex items-center justify-between border-b border-zinc-300 pb-1">
                <span>২. মাল ক্রয় ফলাফল বিবরণী শীট (Purchase Results Sheet)</span>
                <span className="text-[10px] font-normal text-zinc-600">{filteredPurchases.length} {lang === "bn" ? "টি এন্ট্রি" : "entries"}</span>
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 uppercase text-zinc-800 font-bold">
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "পণ্যের বিবরণ" : "Product Name"}</th>
                    <th className="p-2 border-r border-zinc-300 text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                    <th className="p-2 border-r border-zinc-300 text-right">{lang === "bn" ? "একক ক্রয় মূল্য" : "Unit Cost"}</th>
                    <th className="p-2 border-r border-zinc-300 text-center">{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Mode"}</th>
                    <th className="p-2 text-right">{lang === "bn" ? "মোট ক্রয় খরচ" : "Total Cost"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredPurchases.map(p => (
                    <tr key={p.id} className="print-avoid-break even:bg-zinc-50/70">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap text-zinc-700">{fmtDateTime(p.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-semibold text-zinc-900">{p.product_name}</td>
                      <td className="p-2 border-r border-zinc-200 text-center font-bold">{p.qty}</td>
                      <td className="p-2 border-r border-zinc-200 text-right font-medium">{fmtMoney(p.unit_cost)}</td>
                      <td className="p-2 border-r border-zinc-200 text-center uppercase font-bold text-[8px]">
                        {p.payment_type === "credit" ? (lang === "bn" ? "বকেয়া" : "Credit") : (lang === "bn" ? "ক্যাশ" : "Cash")}
                      </td>
                      <td className="p-2 text-right font-bold">{fmtMoney(p.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400">
                    <td colSpan={2} className="p-2 border-r border-zinc-300 uppercase">{lang === "bn" ? "সর্বমোট মাল ক্রয় খরচ" : "Total Purchase Expense"}</td>
                    <td className="p-2 border-r border-zinc-300 text-center">{filteredPurchases.reduce((a, p) => a + p.qty, 0)}</td>
                    <td className="p-2 border-r border-zinc-300 text-center">—</td>
                    <td className="p-2 border-r border-zinc-300 text-center">—</td>
                    <td className="p-2 text-right font-bold">{fmtMoney(purchaseTotalVal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Expense Results Sheet */}
          {showExpenses && filteredExpenses.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-zinc-900 flex items-center justify-between border-b border-zinc-300 pb-1">
                <span>৩. পরিচালন খরচ ও ব্যয় শীট (Expense Results Sheet)</span>
                <span className="text-[10px] font-normal text-zinc-600">{filteredExpenses.length} {lang === "bn" ? "টি এন্ট্রি" : "entries"}</span>
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 uppercase text-zinc-800 font-bold">
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "খরচের খাত / বিবরণ" : "Expense Head / Title"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "মন্তব্য" : "Notes"}</th>
                    <th className="p-2 text-right">{lang === "bn" ? "খরচের পরিমাণ" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredExpenses.map(e => (
                    <tr key={e.id} className="print-avoid-break even:bg-zinc-50/70">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap text-zinc-700">{fmtDateTime(e.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-semibold text-zinc-900">{e.title}</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-600">{e.note || "—"}</td>
                      <td className="p-2 text-right font-bold text-rose-700">{fmtMoney(e.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400">
                    <td colSpan={3} className="p-2 border-r border-zinc-300 uppercase">{lang === "bn" ? "সর্বমোট পরিচালন খরচ" : "Total Overhead Expenses"}</td>
                    <td className="p-2 text-right font-bold text-rose-700">{fmtMoney(expenseTotalVal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cashbox Action Sheet */}
          {showCashbox && filteredCashbox.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-zinc-900 flex items-center justify-between border-b border-zinc-300 pb-1">
                <span>৪. ক্যাশবক্স লেনদেন শীট (Cashbox Action Sheet)</span>
                <span className="text-[10px] font-normal text-zinc-600">{filteredCashbox.length} {lang === "bn" ? "টি এন্ট্রি" : "entries"}</span>
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 uppercase text-zinc-800 font-bold">
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "টাইপ" : "Action Type"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "মন্তব্য" : "Note"}</th>
                    <th className="p-2 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredCashbox.map(c => {
                    const isPlus = c.kind === "deposit" || c.kind === "sale";
                    return (
                      <tr key={c.id} className="print-avoid-break even:bg-zinc-50/70">
                        <td className="p-2 border-r border-zinc-200 whitespace-nowrap text-zinc-700">{fmtDateTime(c.created_at)}</td>
                        <td className="p-2 border-r border-zinc-200 font-medium capitalize text-zinc-900">{c.kind}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-600">{c.note || "—"}</td>
                        <td className={`p-2 text-right font-bold ${isPlus ? "text-emerald-700" : "text-rose-700"}`}>
                          {isPlus ? "+" : "−"}{fmtMoney(c.amount)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400">
                    <td colSpan={3} className="p-2 border-r border-zinc-300 uppercase">{lang === "bn" ? "নিট ক্যাশ ব্যালেন্স প্রবাহ" : "Net Cashbox Flow"}</td>
                    <td className={`p-2 text-right font-bold ${cashboxNetVal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Somiti Savings Sheet */}
          {showSomiti && filteredSomiti.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-zinc-900 flex items-center justify-between border-b border-zinc-300 pb-1">
                <span>৫. সমিতি সঞ্চয় বিবরণী শীট (Somiti Savings Sheet)</span>
                <span className="text-[10px] font-normal text-zinc-600">{filteredSomiti.length} {lang === "bn" ? "টি এন্ট্রি" : "entries"}</span>
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 uppercase text-zinc-800 font-bold">
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "তারিখ ও সময়" : "Date & Time"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "ধরন" : "Action"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "মন্তব্য" : "Remarks"}</th>
                    <th className="p-2 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredSomiti.map(s => {
                    const isPlus = s.kind === "deposit";
                    return (
                      <tr key={s.id} className="print-avoid-break even:bg-zinc-50/70">
                        <td className="p-2 border-r border-zinc-200 whitespace-nowrap text-zinc-700">{fmtDateTime(s.created_at)}</td>
                        <td className="p-2 border-r border-zinc-200 font-medium capitalize text-zinc-900">{s.kind}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-600">{s.note || "—"}</td>
                        <td className={`p-2 text-right font-bold ${isPlus ? "text-emerald-700" : "text-rose-700"}`}>
                          {isPlus ? "+" : "−"}{fmtMoney(s.amount)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400">
                    <td colSpan={3} className="p-2 border-r border-zinc-300 uppercase">{lang === "bn" ? "সমিতি নিট সঞ্চয় ফান্ড" : "Net Somiti Balance"}</td>
                    <td className={`p-2 text-right font-bold ${somitiNetVal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Parties Directory Sheet */}
          {showParties && filteredParties.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-zinc-900 flex items-center justify-between border-b border-zinc-300 pb-1">
                <span>৬. পার্টি ও গ্রাহক ডিরেক্টরি শীট (Parties Directory Sheet)</span>
                <span className="text-[10px] font-normal text-zinc-600">{filteredParties.length} {lang === "bn" ? "জন পার্টি" : "parties"}</span>
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 uppercase text-zinc-800 font-bold">
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "নিবন্ধন তারিখ" : "Registered Date"}</th>
                    <th className="p-2 border-r border-zinc-300">{lang === "bn" ? "পার্টির নাম" : "Name"}</th>
                    <th className="p-2 border-r border-zinc-300 text-center">{lang === "bn" ? "ফোন নম্বর" : "Phone"}</th>
                    <th className="p-2 text-center">{lang === "bn" ? "অবস্থা" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredParties.map(p => (
                    <tr key={p.id} className="print-avoid-break even:bg-zinc-50/70">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap text-zinc-700">{fmtDateTime(p.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-semibold text-zinc-900">{p.name}</td>
                      <td className="p-2 border-r border-zinc-200 font-mono text-center">{p.phone || "—"}</td>
                      <td className="p-2 text-center uppercase font-bold text-[8px]">
                        {p.archived ? (lang === "bn" ? "আর্কাইভড" : "Archived") : (lang === "bn" ? "সক্রিয়" : "Active")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}