"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Utensils,
  TrendingUp,
  Wallet,
  Receipt,
  ChefHat,
  Flame,
  Palette,
  BookOpen,
  Clock,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Store,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  getRestaurantTablesFn,
  getRestaurantOrdersFn,
  getBillingQueueFn,
  getPosShiftsFn,
} from "@/lib/rpc";
import { PcThemeQuickStudio } from "@/components/pc-theme-quick-studio";
import { PrimaryHeaderSlot } from "@/components/primary-header-slot";

interface RestaurantDashboardViewProps {
  sales: any[];
  expenses: any[];
  cashboxBalanceValue: number;
  businessName?: string;
}

export function RestaurantDashboardView({
  sales = [],
  expenses = [],
  cashboxBalanceValue = 0,
}: RestaurantDashboardViewProps) {
  const { lang } = useT();
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("today");
  const [uiStudioOpen, setUiStudioOpen] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [kdsOrders, setKdsOrders] = useState<any[]>([]);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getRestaurantTablesFn().catch(() => []),
      getRestaurantOrdersFn().catch(() => []),
      getBillingQueueFn().catch(() => []),
      getPosShiftsFn().catch(() => []),
    ]).then(([tb, ord, q, sh]) => {
      if (!active) return;
      if (Array.isArray(tb)) setTables(tb);
      if (Array.isArray(ord)) setKdsOrders(ord);
      if (Array.isArray(q)) setQueueItems(q);
      if (Array.isArray(sh)) setShifts(sh);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");
    const yestDate = new Date(now.getTime() - 86400000);
    const yesterdayStr = yestDate.toLocaleDateString("en-CA");
    const cutoff =
      range === "7d"
        ? new Date(now.getTime() - 7 * 86400000)
        : range === "30d"
          ? new Date(now.getTime() - 30 * 86400000)
          : null;

    const inRange = (dt?: string) => {
      if (!dt) return false;
      if (range === "all") return true;
      const d = new Date(dt);
      if (isNaN(d.getTime())) return false;
      if (range === "today") return d.toLocaleDateString("en-CA") === todayStr;
      return cutoff ? d >= cutoff : true;
    };

    const validSales = sales.filter((s) => !s.returned && inRange(s.created_at));
    const yesterdaySales = sales.filter((s) => {
      if (s.returned || !s.created_at) return false;
      const d = new Date(s.created_at);
      return !isNaN(d.getTime()) && d.toLocaleDateString("en-CA") === yesterdayStr;
    });
    const validExpenses = expenses.filter((e) => inRange(e.created_at));

    const totalRevenue = validSales.reduce(
      (sum, s) => sum + (Number(s.sell_price) || 0) * (Number(s.qty) || 1),
      0
    );
    const yesterdayRevenue = yesterdaySales.reduce(
      (sum, s) => sum + (Number(s.sell_price) || 0) * (Number(s.qty) || 1),
      0
    );
    const revDeltaPct =
      range === "today" && yesterdayRevenue > 0
        ? Math.round(((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : null;
    const avgOrderValue = validSales.length > 0 ? Math.round(totalRevenue / validSales.length) : 0;

    const totalCost = validSales.reduce(
      (sum, s) => sum + (Number(s.buy_price) || 0) * (Number(s.qty) || 1),
      0
    );
    const totalExpenses = validExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalCost - totalExpenses;

    // Hourly Sales Breakdown (8 AM - 11 PM)
    const hourBuckets: Record<number, number> = {};
    for (let h = 9; h <= 23; h++) hourBuckets[h] = 0;
    validSales.forEach((s) => {
      const d = new Date(s.created_at);
      if (!isNaN(d.getTime())) {
        const hr = Math.min(23, Math.max(9, d.getHours()));
        hourBuckets[hr] = (hourBuckets[hr] || 0) + (Number(s.sell_price) || 0) * (Number(s.qty) || 1);
      }
    });
    const hourlySeries = Object.entries(hourBuckets).map(([hr, rev]) => {
      const h = Number(hr);
      const label = h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`;
      return { hour: label, revenue: Math.round(rev) };
    });

    // Payment Method Split
    const payMap: Record<string, number> = { cash: 0, bkash: 0, nagad: 0, card: 0, split: 0 };
    validSales.forEach((s) => {
      const k = String(s.type || "cash").toLowerCase();
      const amt = (Number(s.sell_price) || 0) * (Number(s.qty) || 1);
      if (k in payMap) payMap[k] += amt;
      else payMap.cash += amt;
    });

    // Top Selling Dishes (only computed from actual completed sales)
    const dishMap = new Map<string, { name: string; qty: number; revenue: number }>();
    validSales.forEach((s) => {
      const items = Array.isArray(s.items) && s.items.length > 0 ? s.items : null;
      if (items) {
        items.forEach((it: any) => {
          const key = it.name || "Dish";
          const cur = dishMap.get(key) || { name: key, qty: 0, revenue: 0 };
          cur.qty += Number(it.qty) || 1;
          cur.revenue += (Number(it.price) || 0) * (Number(it.qty) || 1);
          dishMap.set(key, cur);
        });
      } else {
        const key = s.product_name || "Order";
        const cur = dishMap.get(key) || { name: key, qty: 0, revenue: 0 };
        cur.qty += Number(s.qty) || 1;
        cur.revenue += (Number(s.sell_price) || 0) * (Number(s.qty) || 1);
        dishMap.set(key, cur);
      }
    });
    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      salesCount: validSales.length,
      recentSales: validSales.slice(0, 8),
      totalRevenue,
      revDeltaPct,
      avgOrderValue,
      totalExpenses,
      netProfit,
      hourlySeries,
      payMap,
      topDishes,
    };
  }, [sales, expenses, range]);

  const occupiedTables = tables.filter((t) => t.status === "occupied").length;
  const activeKds = kdsOrders.filter((o) => o.status === "pending" || o.status === "preparing").length;
  const queuedBills = queueItems.filter((q) => q.status === "queued" || q.status === "printed").length;
  const openShift = shifts.find((s) => s.status === "open");

  return (
    <div className="space-y-5 pb-10">
      {/* Primary Header Controls (Single Header for Both Phone & PC - Zero Secondary Headers) */}
      <PrimaryHeaderSlot>
        {/* Date Filter Range Pills in Primary Header */}
        <div className="inline-flex items-center gap-0.5 bg-muted/70 p-0.5 rounded-full border border-border/80 text-[11px] font-semibold">
          {(
            [
              { id: "today", en: "Today", bn: "আজ" },
              { id: "7d", en: "7D", bn: "৭ দিন" },
              { id: "30d", en: "30D", bn: "৩০ দিন" },
              { id: "all", en: "All", bn: "সব" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRange(p.id)}
              className={`px-2 sm:px-2.5 h-6 rounded-full transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                range === p.id
                  ? "bg-background text-primary font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "bn" ? p.bn : p.en}
            </button>
          ))}
        </div>

        {/* Primary RestroBit Orange POS Button */}
        <Link href="/restaurant">
          <Button size="sm" className="h-7 px-2.5 rounded-full bg-[#FF6B00] hover:bg-[#E55F00] text-white font-bold text-[11px] gap-1 cursor-pointer shadow-xs">
            <Utensils className="size-3" />
            <span>{lang === "bn" ? "রেস্তোরাঁ পিওএস" : "POS"}</span>
          </Button>
        </Link>
        <Link href="/products" className="hidden sm:inline-flex">
          <Button size="sm" variant="outline" className="h-7 px-2 rounded-full text-[11px] font-semibold gap-1 cursor-pointer">
            <BookOpen className="size-3" />
            <span>{lang === "bn" ? "মেনু" : "Menu"}</span>
          </Button>
        </Link>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setUiStudioOpen(true)}
          className="h-7 px-2 rounded-full text-[11px] font-semibold gap-1 cursor-pointer hidden md:inline-flex"
        >
          <Palette className="size-3 text-primary" />
          <span>{lang === "bn" ? "থিম" : "Theme"}</span>
        </Button>
      </PrimaryHeaderSlot>

      {/* Focused 4-Card Restaurant KPI Grid (Sales + Delta + AOV, Cashbox, Net, Live Dining) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{lang === "bn" ? "মোট বিক্রয়" : "Restaurant Sales"}</span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {fmtMoney(filteredData.totalRevenue)}
          </div>
          <div className="text-[11px] flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-600 font-semibold">
              {filteredData.salesCount} {lang === "bn" ? "বিল" : "bills"} • AOV {fmtMoney(filteredData.avgOrderValue)}
            </span>
            {filteredData.revDeltaPct !== null && (
              <span className={`inline-flex items-center font-bold ${filteredData.revDeltaPct >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {filteredData.revDeltaPct >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(filteredData.revDeltaPct)}%
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{lang === "bn" ? "ক্যাশবক্স ব্যালেন্স" : "Cashbox Balance"}</span>
            <Wallet className="size-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {fmtMoney(cashboxBalanceValue)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {lang === "bn" ? "হাতে নগদ জমা" : "Available drawer cash"}
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{lang === "bn" ? "খরচ ও নিট লাভ" : "Expenses & Net"}</span>
            <Receipt className="size-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {fmtMoney(filteredData.netProfit)}
          </div>
          <div className="text-[11px] text-rose-500 font-medium">
            {lang === "bn" ? "খরচ:" : "Expenses:"} {fmtMoney(filteredData.totalExpenses)}
          </div>
        </Card>

        <Link href="/restaurant" className="block">
          <Card className="p-4 rounded-2xl border border-orange-500/35 bg-card hover:border-orange-500 transition space-y-1.5 shadow-xs h-full">
            <div className="flex items-center justify-between text-xs text-orange-600 dark:text-orange-400 font-semibold">
              <span>{lang === "bn" ? "ডাইনিং ও কিচেন" : "Dining & Queue"}</span>
              <ChefHat className="size-4 text-orange-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {occupiedTables}/{tables.length || 16} {lang === "bn" ? "টেবিল" : "Tables"}
            </div>
            <div className="text-[11px] text-orange-600 font-semibold flex items-center gap-2">
              <span>{activeKds} KOT</span>
              <span>•</span>
              <span>{queuedBills} {lang === "bn" ? "বিল কিউ" : "in queue"}</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Analytics Row: Hourly Sales Chart + Payment Method Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 p-5 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">
              {lang === "bn" ? "ঘণ্টাভিত্তিক বিক্রয় প্রবণতা" : "Sales by Hour"}
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {lang === "bn" ? "সকাল ৯টা – রাত ১১টা" : "9 AM – 11 PM"}
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData.hourlySeries} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v) || 0)} />
                <Bar dataKey="revenue" fill="#FF6B00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-4 p-5 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span>{lang === "bn" ? "পেমেন্ট মেথড বিভাজন" : "Payment Split"}</span>
          </h2>
          <div className="space-y-2.5 text-xs">
            {(
              [
                { k: "cash", label: lang === "bn" ? "নগদ (Cash)" : "Cash", color: "bg-emerald-500" },
                { k: "bkash", label: "bKash", color: "bg-pink-500" },
                { k: "nagad", label: "Nagad", color: "bg-orange-500" },
                { k: "card", label: lang === "bn" ? "কার্ড (Card)" : "Card", color: "bg-indigo-500" },
                { k: "split", label: lang === "bn" ? "স্প্লিট (Split)" : "Split Tender", color: "bg-teal-500" },
              ] as const
            ).map((pm) => {
              const val = filteredData.payMap[pm.k] || 0;
              const pct = filteredData.totalRevenue > 0 ? Math.round((val / filteredData.totalRevenue) * 100) : 0;
              return (
                <div key={pm.k} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{pm.label}</span>
                    <span className="font-bold text-muted-foreground">
                      {fmtMoney(val)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${pm.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Main Content Split: Top Selling Dishes (Once Sold) + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-6 p-5 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <span>{lang === "bn" ? "জনপ্রিয় বিক্রিত খাবার" : "Top Selling Dishes"}</span>
            </h2>
            <Link href="/products" className="text-xs font-semibold text-primary hover:underline">
              {lang === "bn" ? "মেনু দেখুন" : "View Menu"}
            </Link>
          </div>
          {filteredData.topDishes.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              {lang === "bn"
                ? "বিক্রয় শুরু হলে এখানে সেরা খাবারের তালিকা দেখা যাবে।"
                : "Dishes appear here once orders are billed."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.topDishes.map((d, idx) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-muted/45 border border-border/60 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-6 rounded-full bg-orange-500/15 text-orange-600 font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground">{d.qty}x</span>
                    <span className="font-bold text-emerald-600">{fmtMoney(d.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-6 p-5 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span>{lang === "bn" ? "সাম্প্রতিক বিল ও অর্ডার" : "Recent Settled Bills"}</span>
            </h2>
            <Link href="/reports" className="text-xs font-semibold text-primary hover:underline">
              {lang === "bn" ? "সব রিপোর্ট" : "Full Reports"}
            </Link>
          </div>
          {filteredData.recentSales.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              {lang === "bn"
                ? "এই সময়ে এখনো কোনো অর্ডার সম্পন্ন হয়নি।"
                : "No billed orders recorded in this period yet."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.recentSales.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-muted/45 border border-border/60 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold truncate">{s.product_name || "Restaurant Order"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {fmtDateTime(s.created_at)} • {(s.type || "cash").toUpperCase()}
                    </div>
                  </div>
                  <div className="font-bold text-emerald-600 shrink-0">
                    {fmtMoney((Number(s.sell_price) || 0) * (Number(s.qty) || 1))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <PcThemeQuickStudio open={uiStudioOpen} onOpenChange={setUiStudioOpen} />
    </div>
  );
}
