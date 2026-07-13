"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar, Printer, ArrowLeft, FileText, Download,
  TrendingUp, ShoppingCart, Receipt, PiggyBank,
  Banknote, Users, CheckSquare, Square, RefreshCw
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
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

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
        // Shorten date format for chart XAxis
        date: item.date.slice(5) // e.g. "06-12"
      }));
  }, [filteredSales, filteredPurchases, filteredExpenses, from, to]);

  const handlePrint = () => {
    playTapSound();
    setIsGeneratingPDF(true);
    setTimeout(() => {
      setIsGeneratingPDF(false);
      window.print();
    }, 1500);
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

      // Temporarily show the element for rendering
      element.classList.remove("hidden");
      element.classList.remove("print:block");
      element.style.display = "block";

      const opt = {
        margin:       0.4,
        filename:     `report-${from}-to-${to}.pdf`,
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
        toast.success(lang === "bn" ? "পিডিএফ ডাউনলোড শুরু হয়েছে!" : "PDF download started!");
      }).catch((err: any) => {
        console.error("PDF download error", err);
        element.classList.add("hidden");
        element.classList.add("print:block");
        element.style.display = "";
        setIsGeneratingPDF(false);
        toast.error(lang === "bn" ? "পিডিএফ তৈরি করতে ব্যর্থ হয়েছে" : "Failed to generate PDF");
      });
    };

    // Load html2pdf script dynamically from CDN
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
    <div className="space-y-6 pb-12">
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
      {/* SCREEN VIEW (hidden when printing) */}
      <div className="print:hidden space-y-6">
        {/* Screen Controls Header (hidden during printing) */}
        <div className="flex flex-wrap items-start justify-between gap-3 no-print border-b pb-3">
          <div className="flex items-center gap-2">
            <Link href="/more">
              <Button size="icon" variant="ghost" className="size-8">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-serif">
                {lang === "bn" ? "রিপোর্ট ও বিশ্লেষণ" : "Reports & Analytics"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "bn" ? "কাস্টম পিডিএফ রিপোর্ট জেনারেটর" : "Custom PDF Report Generator"}
              </p>
            </div>
          </div>

          {/* Desktop action buttons — hidden on mobile (mobile uses sticky bottom bar) */}
          <div className="hidden sm:flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="bg-primary hover:bg-primary/90">
              <Printer className="size-4 mr-1.5" />
              {lang === "bn" ? "প্রিন্ট করুন" : "Print PDF"}
            </Button>
            <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/5">
              <Download className="size-4 mr-1.5" />
              {lang === "bn" ? "ডাউনলোড করুন" : "Download PDF"}
            </Button>
          </div>
        </div>

        {/* Control Panel (no-print) */}
        <Card className="p-4 no-print space-y-4 bg-card/60 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date range picker */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {lang === "bn" ? "তারিখের সীমা" : "Date Range"}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">{lang === "bn" ? "হতে" : "From"}</span>
                  <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">{lang === "bn" ? "পর্যন্ত" : "To"}</span>
                  <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
              <div className="flex gap-1.5 pt-1">
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => setPreset("today")}>
                  {lang === "bn" ? "আজ" : "Today"}
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => setPreset("week")}>
                  {lang === "bn" ? "৭ দিন" : "7 Days"}
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => setPreset("month")}>
                  {lang === "bn" ? "৩০ দিন" : "30 Days"}
                </Button>
              </div>
            </div>

            {/* Section selections */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "রিপোর্টে অন্তর্ভুক্ত করুন" : "Include in Report"}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showSales} onChange={e => setShowSales(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-3.5" />
                  <span>{lang === "bn" ? "বিক্রি" : "Sales"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showPurchases} onChange={e => setShowPurchases(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-3.5" />
                  <span>{lang === "bn" ? "ক্রয়" : "Purchases"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showExpenses} onChange={e => setShowExpenses(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-3.5" />
                  <span>{lang === "bn" ? "খরচ / ব্যয়" : "Expenses"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showCashbox} onChange={e => setShowCashbox(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-3.5" />
                  <span>{lang === "bn" ? "ক্যাশ বক্স" : "Cashbox"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showSomiti} onChange={e => setShowSomiti(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-3.5" />
                  <span>{lang === "bn" ? "সমিতি" : "Somiti"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showParties} onChange={e => setShowParties(e.target.checked)} className="rounded text-primary border-muted-foreground/30 size-3.5" />
                  <span>{lang === "bn" ? "পার্টিসমূহ" : "Parties"}</span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Metrics KPI Area */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {showSales && (
            <Card className="p-3.5 space-y-1 beveled-card bg-emerald-500/5 border-emerald-500/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <TrendingUp className="size-3 text-emerald-600" />
                {lang === "bn" ? "মোট বিক্রি" : "Total Sales"}
              </div>
              <div className="text-lg font-bold font-serif text-emerald-600">{fmtMoney(salesTotalVal)}</div>
              <div className="text-[9px] text-muted-foreground">
                {lang === "bn" ? `${filteredSales.length} টি বিক্রি (লাভ ৳${salesProfitVal})` : `${filteredSales.length} sales (profit ৳${salesProfitVal})`}
              </div>
            </Card>
          )}

          {showPurchases && (
            <Card className="p-3.5 space-y-1 beveled-card bg-blue-500/5 border-blue-500/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <ShoppingCart className="size-3 text-blue-600" />
                {lang === "bn" ? "মোট ক্রয়" : "Total Purchases"}
              </div>
              <div className="text-lg font-bold font-serif text-blue-600">{fmtMoney(purchaseTotalVal)}</div>
              <div className="text-[9px] text-muted-foreground">
                {lang === "bn" ? `${filteredPurchases.length} টি ক্রয় ভাউচার` : `${filteredPurchases.length} purchase vouchers`}
              </div>
            </Card>
          )}

          {showExpenses && (
            <Card className="p-3.5 space-y-1 beveled-card bg-rose-500/5 border-rose-500/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <Receipt className="size-3 text-rose-600" />
                {lang === "bn" ? "মোট ব্যয়" : "Total Overhead"}
              </div>
              <div className="text-lg font-bold font-serif text-rose-600">{fmtMoney(expenseTotalVal)}</div>
              <div className="text-[9px] text-muted-foreground">
                {lang === "bn" ? `${filteredExpenses.length} টি অন্যান্য খরচ` : `${filteredExpenses.length} other expenses`}
              </div>
            </Card>
          )}

          {showCashbox && (
            <Card className="p-3.5 space-y-1 beveled-card bg-amber-500/5 border-amber-500/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <Banknote className="size-3 text-amber-600" />
                {lang === "bn" ? "ক্যাশ নিট প্রবাহ" : "Cashbox Net"}
              </div>
              <div className={`text-lg font-bold font-serif ${cashboxNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {lang === "bn" ? `${filteredCashbox.length} টি ক্যাশ বিবরণী` : `${filteredCashbox.length} cash box actions`}
              </div>
            </Card>
          )}

          {showSomiti && (
            <Card className="p-3.5 space-y-1 beveled-card bg-indigo-500/5 border-indigo-500/20 col-span-2 md:col-span-1">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <PiggyBank className="size-3 text-indigo-600" />
                {lang === "bn" ? "সমিতি নিট ব্যালেন্স" : "Somiti Net"}
              </div>
              <div className={`text-lg font-bold font-serif ${somitiNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {lang === "bn" ? `${filteredSomiti.length} টি লেনদেন` : `${filteredSomiti.length} somiti activities`}
              </div>
            </Card>
          )}
        </div>

        {/* Chart Section (rendered with animation disabled for printing) */}
        {(showSales || showPurchases || showExpenses) && chartData.length > 0 && (
          <Card className="p-4 space-y-3 beveled-card bg-card/40 backdrop-blur-sm print:shadow-none print:border-none">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground print:text-black">
              {lang === "bn" ? "রাজস্ব বনাম ক্রয় বনাম খরচ বিশ্লেষণ" : "Sales vs Purchases vs Expenses Comparison"}
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {showSales && <Bar dataKey="Sales" fill="#10b981" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                  {showPurchases && <Bar dataKey="Purchases" fill="#3b82f6" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                  {showExpenses && <Bar dataKey="Expenses" fill="#ef4444" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Detailed Transaction Tables */}
        <div className="space-y-6">
          {/* Sales Table */}
          {showSales && filteredSales.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-wide uppercase border-b pb-1 flex items-center gap-1.5">
                <TrendingUp className="size-4 text-emerald-600 no-print" />
                {lang === "bn" ? "বিক্রয় বিবরণী" : "Sales Records"}
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2.5 font-bold">{lang === "bn" ? "তারিখ" : "Date"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "পণ্যের বিবরণ" : "Product"}</th>
                      <th className="p-2.5 font-bold text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "বিক্রয় মূল্য" : "Sell"}</th>
                      <th className="p-2.5 font-bold text-center">{lang === "bn" ? "পেমেন্ট টাইপ" : "Type"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "লাভ" : "Profit"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groupedSalesList.map(s => (
                      <tr key={s.id}>
                        <td className="p-2.5 whitespace-nowrap">{fmtDateTime(s.created_at)}</td>
                        <td className="p-2.5 font-medium">
                          {s.isGroup ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-foreground flex items-center gap-1 flex-wrap">
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1 rounded border border-emerald-500/20 shrink-0">
                                  {lang === "bn" ? "কার্ট" : "Cart"}
                                </span>
                                <span>{s.product_name}</span>
                              </div>
                            </div>
                          ) : (
                            s.product_name
                          )}
                        </td>
                        <td className="p-2.5 text-center">{s.qty}</td>
                        <td className="p-2.5 text-right font-serif">{fmtMoney(s.sell_price)}</td>
                        <td className="p-2.5 text-center capitalize">{s.type}</td>
                        <td className="p-2.5 text-right text-rose-600 font-bold font-serif">{s.due_amount > 0 ? fmtMoney(s.due_amount) : "—"}</td>
                        <td className="p-2.5 text-right text-emerald-600 font-bold font-serif">{fmtMoney(s.profit)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold border-t">
                      <td colSpan={2} className="p-2.5">{lang === "bn" ? "মোট" : "Total"}</td>
                      <td className="p-2.5 text-center">{filteredSales.reduce((a, s) => a + s.qty, 0)}</td>
                      <td className="p-2.5 text-right font-serif">{fmtMoney(salesTotalVal)}</td>
                      <td className="p-2.5 text-center">—</td>
                      <td className="p-2.5 text-right text-rose-600 font-serif">
                        {fmtMoney(filteredSales.reduce((a, s) => a + Number(s.due_amount), 0))}
                      </td>
                      <td className="p-2.5 text-right text-emerald-600 font-serif">{fmtMoney(salesProfitVal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Purchases Table */}
          {showPurchases && filteredPurchases.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-wide uppercase border-b pb-1 flex items-center gap-1.5">
                <ShoppingCart className="size-4 text-blue-600" />
                {lang === "bn" ? "ক্রয় বিবরণী" : "Purchase Records"}
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2.5 font-bold">{lang === "bn" ? "তারিখ" : "Date"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "পণ্যের বিবরণ" : "Product"}</th>
                      <th className="p-2.5 font-bold text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "একক মূল্য" : "Unit Cost"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "মোট মূল্য" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPurchases.map(p => (
                      <tr key={p.id}>
                        <td className="p-2.5 whitespace-nowrap">{fmtDateTime(p.created_at)}</td>
                        <td className="p-2.5 font-medium">{p.product_name}</td>
                        <td className="p-2.5 text-center">{p.qty}</td>
                        <td className="p-2.5 text-right font-serif">{fmtMoney(p.unit_cost)}</td>
                        <td className="p-2.5 text-right font-serif font-bold">{fmtMoney(p.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold border-t">
                      <td colSpan={2} className="p-2.5">{lang === "bn" ? "মোট" : "Total"}</td>
                      <td className="p-2.5 text-center">{filteredPurchases.reduce((a, p) => a + p.qty, 0)}</td>
                      <td className="p-2.5 text-right">—</td>
                      <td className="p-2.5 text-right font-serif">{fmtMoney(purchaseTotalVal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses Table */}
          {showExpenses && filteredExpenses.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-wide uppercase border-b pb-1 flex items-center gap-1.5">
                <Receipt className="size-4 text-rose-600" />
                {lang === "bn" ? "খরচ / ব্যয় বিবরণী" : "Expense Records"}
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2.5 font-bold">{lang === "bn" ? "তারিখ" : "Date"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "খরচের খাত / বিবরণ" : "Description / Expense Head"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "মন্তব্য" : "Remarks"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "খরচের পরিমাণ" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredExpenses.map(e => (
                      <tr key={e.id}>
                        <td className="p-2.5 whitespace-nowrap">{fmtDateTime(e.created_at)}</td>
                        <td className="p-2.5 font-medium">{e.title}</td>
                        <td className="p-2.5 text-muted-foreground">{e.note || "—"}</td>
                        <td className="p-2.5 text-right font-serif font-bold text-rose-600">{fmtMoney(e.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold border-t">
                      <td colSpan={3} className="p-2.5">{lang === "bn" ? "মোট খরচ" : "Total Expenses"}</td>
                      <td className="p-2.5 text-right font-serif text-rose-600">{fmtMoney(expenseTotalVal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cashbox Table */}
          {showCashbox && filteredCashbox.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-wide uppercase border-b pb-1 flex items-center gap-1.5">
                <Banknote className="size-4 text-amber-600" />
                {lang === "bn" ? "ক্যাশ বক্স লেনদেন বিবরণী" : "Cashbox Action Ledger"}
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2.5 font-bold">{lang === "bn" ? "তারিখ" : "Date"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "টাইপ" : "Action type"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "মন্তব্য" : "Note / Reference"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCashbox.map(c => {
                      const isPlus = c.kind === "deposit" || c.kind === "sale";
                      return (
                        <tr key={c.id}>
                          <td className="p-2.5 whitespace-nowrap">{fmtDateTime(c.created_at)}</td>
                          <td className="p-2.5 capitalize font-medium">{c.kind}</td>
                          <td className="p-2.5 text-muted-foreground">{c.note || "—"}</td>
                          <td className={`p-2.5 text-right font-serif font-bold ${isPlus ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPlus ? "+" : "−"}{fmtMoney(c.amount)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/30 font-bold border-t">
                      <td colSpan={3} className="p-2.5">{lang === "bn" ? "নিট ক্যাশ ব্যালেন্স প্রবাহ" : "Net Cashbox Flow"}</td>
                      <td className={`p-2.5 text-right font-serif ${cashboxNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Somiti Table */}
          {showSomiti && filteredSomiti.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-wide uppercase border-b pb-1 flex items-center gap-1.5">
                <PiggyBank className="size-4 text-indigo-600" />
                {lang === "bn" ? "সমিতি সঞ্চয় বিবরণী" : "Somiti Deposit & Withdrawals"}
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2.5 font-bold">{lang === "bn" ? "তারিখ" : "Date"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "ধরন" : "Action"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "মন্তব্য" : "Remarks"}</th>
                      <th className="p-2.5 font-bold text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredSomiti.map(s => {
                      const isPlus = s.kind === "deposit";
                      return (
                        <tr key={s.id}>
                          <td className="p-2.5 whitespace-nowrap">{fmtDateTime(s.created_at)}</td>
                          <td className="p-2.5 capitalize font-medium">{s.kind}</td>
                          <td className="p-2.5 text-muted-foreground">{s.note || "—"}</td>
                          <td className={`p-2.5 text-right font-serif font-bold ${isPlus ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPlus ? "+" : "−"}{fmtMoney(s.amount)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/30 font-bold border-t">
                      <td colSpan={3} className="p-2.5">{lang === "bn" ? "সমিতি নিট সঞ্চয়" : "Net Somiti Balance"}</td>
                      <td className={`p-2.5 text-right font-serif ${somitiNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Parties Table */}
          {showParties && filteredParties.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-wide uppercase border-b pb-1 flex items-center gap-1.5">
                <Users className="size-4 text-amber-600" />
                {lang === "bn" ? "সক্রিয় পার্টি ও সরবরাহকারী বিবরণী" : "Parties Registration Logs"}
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2.5 font-bold">{lang === "bn" ? "নিবন্ধন তারিখ" : "Registered Date"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "পার্টির নাম" : "Name"}</th>
                      <th className="p-2.5 font-bold">{lang === "bn" ? "ফোন নম্বর" : "Phone"}</th>
                      <th className="p-2.5 font-bold text-center">{lang === "bn" ? "আর্কাইভ করা" : "Archived"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredParties.map(p => (
                      <tr key={p.id}>
                        <td className="p-2.5 whitespace-nowrap">{fmtDateTime(p.created_at)}</td>
                        <td className="p-2.5 font-semibold">{p.name}</td>
                        <td className="p-2.5 font-mono">{p.phone || "—"}</td>
                        <td className="p-2.5 text-center capitalize">{p.archived ? (lang === "bn" ? "হ্যাঁ" : "Yes") : (lang === "bn" ? "না" : "No")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile sticky action bar (only on small screens) ── */}
        <div className="sm:hidden fixed bottom-16 left-0 right-0 z-40 print:hidden">
          <div className="mx-4 flex gap-2 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-lg p-2.5">
            <Button
              onClick={handlePrint}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-xs h-10"
            >
              <Printer className="size-4 mr-1.5" />
              {lang === "bn" ? "প্রিন্ট করুন" : "Print PDF"}
            </Button>
            <Button
              onClick={handleDownloadPDF}
              size="sm"
              variant="outline"
              className="flex-1 border-primary/40 text-primary hover:bg-primary/5 text-xs h-10"
            >
              <Download className="size-4 mr-1.5" />
              {lang === "bn" ? "ডাউনলোড" : "Download"}
            </Button>
          </div>
        </div>
      </div>

      {/* DEDICATED PRINT VIEW (visible only when printing) */}
      <div id="print-report-content" className="hidden print:block print-color-exact w-full max-w-4xl mx-auto bg-white text-zinc-900 p-8 font-sans space-y-8 text-xs">
        {/* PAGE 1: Overview & Graph Cover */}
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-zinc-200 pb-6">
            <div className="flex items-center gap-4">
              <img
                src={bizSettings?.business?.logo_url || "/logo.png"}
                alt={bizName}
                className="h-14 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
              />
              <div>
                <h1 className="text-xl font-bold font-serif uppercase tracking-tight text-zinc-900">{bizName}</h1>
                <p className="text-zinc-500 text-[9px] uppercase font-semibold tracking-wider">{t("reports")}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                {lang === "bn" ? "ব্যবসায়িক বিশ্লেষণ রিপোর্ট" : "Business Analysis Report"}
              </h2>
              <p className="text-zinc-500 text-[10px] mt-1">
                {lang === "bn" ? `সময়কাল: ${from} থেকে ${to}` : `Period: ${from} to ${to}`}
              </p>
              <p className="text-zinc-400 text-[9px] mt-0.5">
                {lang === "bn" ? `তৈরি হয়েছে: ${new Date().toLocaleString()}` : `Generated: ${new Date().toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Performance Overview KPI Grid */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {lang === "bn" ? "কর্মক্ষমতা ওভারভিউ" : "Performance Overview"}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {showSales && (
                <div className="p-4 rounded-lg border border-emerald-100 bg-emerald-50/30 space-y-1">
                  <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "মোট বিক্রি" : "Total Sales"}
                  </div>
                  <div className="text-xl font-bold font-serif text-emerald-700">{fmtMoney(salesTotalVal)}</div>
                  <div className="text-[9px] text-emerald-600">
                    {lang === "bn" ? `${filteredSales.length} টি বিক্রি (লাভ ৳${salesProfitVal})` : `${filteredSales.length} sales (profit ৳${salesProfitVal})`}
                  </div>
                </div>
              )}

              {showPurchases && (
                <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/30 space-y-1">
                  <div className="text-[10px] text-blue-800 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "মোট ক্রয়" : "Total Purchases"}
                  </div>
                  <div className="text-xl font-bold font-serif text-blue-700">{fmtMoney(purchaseTotalVal)}</div>
                  <div className="text-[9px] text-blue-600">
                    {lang === "bn" ? `${filteredPurchases.length} টি ভাউচার` : `${filteredPurchases.length} purchase vouchers`}
                  </div>
                </div>
              )}

              {showExpenses && (
                <div className="p-4 rounded-lg border border-rose-100 bg-rose-50/30 space-y-1">
                  <div className="text-[10px] text-rose-800 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "মোট ব্যয়" : "Total Overhead"}
                  </div>
                  <div className="text-xl font-bold font-serif text-rose-700">{fmtMoney(expenseTotalVal)}</div>
                  <div className="text-[9px] text-rose-600">
                    {lang === "bn" ? `${filteredExpenses.length} টি অন্যান্য খরচ` : `${filteredExpenses.length} other expenses`}
                  </div>
                </div>
              )}

              {showCashbox && (
                <div className="p-4 rounded-lg border border-amber-100 bg-amber-50/30 space-y-1">
                  <div className="text-[10px] text-amber-800 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "ক্যাশ নিট প্রবাহ" : "Cashbox Net"}
                  </div>
                  <div className={`text-xl font-bold font-serif ${cashboxNetVal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
                  </div>
                  <div className="text-[9px] text-amber-600">
                    {lang === "bn" ? `${filteredCashbox.length} টি ক্যাশ বিবরণী` : `${filteredCashbox.length} cash box actions`}
                  </div>
                </div>
              )}

              {showSomiti && (
                <div className="p-4 rounded-lg border border-indigo-100 bg-indigo-50/30 space-y-1">
                  <div className="text-[10px] text-indigo-800 uppercase font-bold tracking-wide">
                    {lang === "bn" ? "সমিতি নিট ব্যালেন্স" : "Somiti Net"}
                  </div>
                  <div className={`text-xl font-bold font-serif ${somitiNetVal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
                  </div>
                  <div className="text-[9px] text-indigo-600">
                    {lang === "bn" ? `${filteredSomiti.length} টি লেনদেন` : `${filteredSomiti.length} somiti activities`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Graph Comparison Section */}
          {(showSales || showPurchases || showExpenses) && chartData.length > 0 && (
            <div className="space-y-4 border border-zinc-200 bg-zinc-50/30 rounded-lg p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {lang === "bn" ? "রাজস্ব বনাম ক্রয় বনাম খরচ বিশ্লেষণ" : "Sales vs Purchases vs Expenses Analysis"}
              </h3>
              <div className="w-full flex justify-center">
                <BarChart width={700} height={280} data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#71717a" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {showSales && <Bar dataKey="Sales" fill="#10b981" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                  {showPurchases && <Bar dataKey="Purchases" fill="#3b82f6" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                  {showExpenses && <Bar dataKey="Expenses" fill="#ef4444" isAnimationActive={false} radius={[3, 3, 0, 0]} />}
                </BarChart>
              </div>
            </div>
          )}
        </div>

        {/* PAGE 2 ONWARDS: Detailed Records */}
        <div className="print-page-break pt-8 space-y-8">
          <h2 className="text-sm font-bold text-zinc-800 border-b-2 border-zinc-300 pb-2 tracking-wider uppercase">
            {lang === "bn" ? "বিস্তারিত লেনদেন রিপোর্ট" : "Detailed Transaction Records"}
          </h2>

          {/* Sales Table */}
          {showSales && filteredSales.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 flex items-center gap-1">
                <span>■</span>
                {lang === "bn" ? "বিক্রয় বিবরণী" : "Sales Records"}
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "তারিখ" : "Date"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "পণ্যের বিবরণ" : "Product"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700 text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700 text-right">{lang === "bn" ? "বিক্রয় মূল্য" : "Sell"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700 text-center">{lang === "bn" ? "পেমেন্ট টাইপ" : "Type"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700 text-right">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                    <th className="p-2 font-bold text-zinc-700 text-right">{lang === "bn" ? "লাভ" : "Profit"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {groupedSalesList.map(s => (
                    <tr key={s.id} className="print-avoid-break">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap">{fmtDateTime(s.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-medium">
                        {s.isGroup ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-zinc-900 flex items-center gap-1 flex-wrap">
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1 rounded border border-emerald-500/20 shrink-0">
                                {lang === "bn" ? "কার্ট" : "Cart"}
                              </span>
                              <span>{s.product_name}</span>
                            </div>
                          </div>
                        ) : (
                          s.product_name
                        )}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center">{s.qty}</td>
                      <td className="p-2 border-r border-zinc-200 text-right font-serif">{fmtMoney(s.sell_price)}</td>
                      <td className="p-2 border-r border-zinc-200 text-center capitalize">{s.type}</td>
                      <td className="p-2 border-r border-zinc-200 text-right text-rose-600 font-bold font-serif">{s.due_amount > 0 ? fmtMoney(s.due_amount) : "—"}</td>
                      <td className="p-2 text-right text-emerald-600 font-bold font-serif">{fmtMoney(s.profit)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={2} className="p-2 border-r border-zinc-200">{lang === "bn" ? "মোট" : "Total"}</td>
                    <td className="p-2 border-r border-zinc-200 text-center">{filteredSales.reduce((a, s) => a + s.qty, 0)}</td>
                    <td className="p-2 border-r border-zinc-200 text-right font-serif">{fmtMoney(salesTotalVal)}</td>
                    <td className="p-2 border-r border-zinc-200 text-center">—</td>
                    <td className="p-2 border-r border-zinc-200 text-right text-rose-600 font-serif">
                      {fmtMoney(filteredSales.reduce((a, s) => a + Number(s.due_amount), 0))}
                    </td>
                    <td className="p-2 text-right text-emerald-600 font-serif">{fmtMoney(salesProfitVal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Purchases Table */}
          {showPurchases && filteredPurchases.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 flex items-center gap-1">
                <span>■</span>
                {lang === "bn" ? "ক্রয় বিবরণী" : "Purchase Records"}
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "তারিখ" : "Date"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "পণ্যের বিবরণ" : "Product"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700 text-center">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700 text-right">{lang === "bn" ? "একক মূল্য" : "Unit Cost"}</th>
                    <th className="p-2 font-bold text-zinc-700 text-right">{lang === "bn" ? "মোট মূল্য" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredPurchases.map(p => (
                    <tr key={p.id} className="print-avoid-break">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap">{fmtDateTime(p.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-medium">{p.product_name}</td>
                      <td className="p-2 border-r border-zinc-200 text-center">{p.qty}</td>
                      <td className="p-2 border-r border-zinc-200 text-right font-serif">{fmtMoney(p.unit_cost)}</td>
                      <td className="p-2 text-right font-serif font-bold">{fmtMoney(p.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={2} className="p-2 border-r border-zinc-200">{lang === "bn" ? "মোট" : "Total"}</td>
                    <td className="p-2 border-r border-zinc-200 text-center">{filteredPurchases.reduce((a, p) => a + p.qty, 0)}</td>
                    <td className="p-2 border-r border-zinc-200 text-center">—</td>
                    <td className="p-2 text-right font-serif">{fmtMoney(purchaseTotalVal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Expenses Table */}
          {showExpenses && filteredExpenses.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 flex items-center gap-1">
                <span>■</span>
                {lang === "bn" ? "খরচ / ব্যয় বিবরণী" : "Expense Records"}
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "তারিখ" : "Date"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "খরচের খাত / বিবরণ" : "Description / Expense Head"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "মন্তব্য" : "Remarks"}</th>
                    <th className="p-2 font-bold text-zinc-700 text-right">{lang === "bn" ? "খরচের পরিমাণ" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredExpenses.map(e => (
                    <tr key={e.id} className="print-avoid-break">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap">{fmtDateTime(e.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-medium">{e.title}</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-500">{e.note || "—"}</td>
                      <td className="p-2 text-right font-serif font-bold text-rose-600">{fmtMoney(e.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={3} className="p-2 border-r border-zinc-200">{lang === "bn" ? "মোট খরচ" : "Total Expenses"}</td>
                    <td className="p-2 text-right font-serif text-rose-600">{fmtMoney(expenseTotalVal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cashbox Table */}
          {showCashbox && filteredCashbox.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 flex items-center gap-1">
                <span>■</span>
                {lang === "bn" ? "ক্যাশ বক্স লেনদেন বিবরণী" : "Cashbox Action Ledger"}
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "তারিখ" : "Date"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "টাইপ" : "Action type"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "মন্তব্য" : "Note / Reference"}</th>
                    <th className="p-2 font-bold text-zinc-700 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredCashbox.map(c => {
                    const isPlus = c.kind === "deposit" || c.kind === "sale";
                    return (
                      <tr key={c.id} className="print-avoid-break">
                        <td className="p-2 border-r border-zinc-200 whitespace-nowrap">{fmtDateTime(c.created_at)}</td>
                        <td className="p-2 border-r border-zinc-200 capitalize font-medium">{c.kind}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-500">{c.note || "—"}</td>
                        <td className={`p-2 text-right font-serif font-bold ${isPlus ? "text-emerald-600" : "text-rose-600"}`}>
                          {isPlus ? "+" : "−"}{fmtMoney(c.amount)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={3} className="p-2 border-r border-zinc-200">{lang === "bn" ? "নিট ক্যাশ ব্যালেন্স প্রবাহ" : "Net Cashbox Flow"}</td>
                    <td className={`p-2 text-right font-serif ${cashboxNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {cashboxNetVal >= 0 ? "+" : ""}{fmtMoney(cashboxNetVal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Somiti Table */}
          {showSomiti && filteredSomiti.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 flex items-center gap-1">
                <span>■</span>
                {lang === "bn" ? "সমিতি সঞ্চয় বিবরণী" : "Somiti Deposit & Withdrawals"}
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "তারিখ" : "Date"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "ধরন" : "Action"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "মন্তব্য" : "Remarks"}</th>
                    <th className="p-2 font-bold text-zinc-700 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredSomiti.map(s => {
                    const isPlus = s.kind === "deposit";
                    return (
                      <tr key={s.id} className="print-avoid-break">
                        <td className="p-2 border-r border-zinc-200 whitespace-nowrap">{fmtDateTime(s.created_at)}</td>
                        <td className="p-2 border-r border-zinc-200 capitalize font-medium">{s.kind}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-500">{s.note || "—"}</td>
                        <td className={`p-2 text-right font-serif font-bold ${isPlus ? "text-emerald-600" : "text-rose-600"}`}>
                          {isPlus ? "+" : "−"}{fmtMoney(s.amount)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={3} className="p-2 border-r border-zinc-200">{lang === "bn" ? "সমিতি নিট সঞ্চয়" : "Net Somiti Balance"}</td>
                    <td className={`p-2 text-right font-serif ${somitiNetVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {somitiNetVal >= 0 ? "+" : ""}{fmtMoney(somitiNetVal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Parties Table */}
          {showParties && filteredParties.length > 0 && (
            <div className="space-y-2 print-avoid-break">
              <h3 className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 flex items-center gap-1">
                <span>■</span>
                {lang === "bn" ? "সক্রিয় পার্টি ও সরবরাহকারী বিবরণী" : "Parties Registration Logs"}
              </h3>
              <table className="w-full text-left text-[9px] border-collapse border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "নিবন্ধন তারিখ" : "Registered Date"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700">{lang === "bn" ? "পার্টির নাম" : "Name"}</th>
                    <th className="p-2 border-r border-zinc-200 font-bold text-zinc-700 text-center">{lang === "bn" ? "ফোন নম্বর" : "Phone"}</th>
                    <th className="p-2 font-bold text-zinc-700 text-center">{lang === "bn" ? "আর্কাইভ করা" : "Archived"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredParties.map(p => (
                    <tr key={p.id} className="print-avoid-break">
                      <td className="p-2 border-r border-zinc-200 whitespace-nowrap">{fmtDateTime(p.created_at)}</td>
                      <td className="p-2 border-r border-zinc-200 font-semibold">{p.name}</td>
                      <td className="p-2 border-r border-zinc-200 font-mono text-center">{p.phone || "—"}</td>
                      <td className="p-2 text-center capitalize">{p.archived ? (lang === "bn" ? "হ্যাঁ" : "Yes") : (lang === "bn" ? "না" : "No")}</td>
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