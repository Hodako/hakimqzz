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
  Users,
  FileText,
  ListOrdered,
  Clock,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { getRestaurantTablesFn, getRestaurantOrdersFn, getBillingQueueFn } from "@/lib/rpc";
import { PcThemeQuickStudio } from "@/components/pc-theme-quick-studio";

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
  businessName,
}: RestaurantDashboardViewProps) {
  const { lang } = useT();
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("today");
  const [uiStudioOpen, setUiStudioOpen] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [kdsOrders, setKdsOrders] = useState<any[]>([]);
  const [queueItems, setQueueItems] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getRestaurantTablesFn().catch(() => []),
      getRestaurantOrdersFn().catch(() => []),
      getBillingQueueFn().catch(() => []),
    ]).then(([tb, ord, q]) => {
      if (!active) return;
      if (Array.isArray(tb)) setTables(tb);
      if (Array.isArray(ord)) setKdsOrders(ord);
      if (Array.isArray(q)) setQueueItems(q);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");
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
    const validExpenses = expenses.filter((e) => inRange(e.created_at));

    const totalRevenue = validSales.reduce(
      (sum, s) => sum + (Number(s.sell_price) || 0) * (Number(s.qty) || 1),
      0
    );
    const totalCost = validSales.reduce(
      (sum, s) => sum + (Number(s.buy_price) || 0) * (Number(s.qty) || 1),
      0
    );
    const totalExpenses = validExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalCost - totalExpenses;

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
      totalExpenses,
      netProfit,
      topDishes,
    };
  }, [sales, expenses, range]);

  const occupiedTables = tables.filter((t) => t.status === "occupied").length;
  const activeKds = kdsOrders.filter((o) => o.status === "pending" || o.status === "preparing").length;
  const queuedBills = queueItems.filter((q) => q.status === "queued" || q.status === "printed").length;

  return (
    <div className="space-y-5 pb-10">
      {/* Header & Quick Launch */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 border border-border p-4 rounded-3xl shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
            <Utensils className="size-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-serif">
              {businessName || (lang === "bn" ? "রেস্তোরাঁ ড্যাশবোর্ড" : "Restaurant Dashboard")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "বিক্রয়, ডাইনিং টেবিল, কিচেন ও মেনু পারফরম্যান্স"
                : "Live dining sales, table occupancy, kitchen queue & menu performance"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/restaurant">
            <Button size="sm" className="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs gap-1.5 cursor-pointer">
              <Utensils className="size-3.5" />
              <span>{lang === "bn" ? "রেস্তোরাঁ পিওএস খুলুন" : "Open Restaurant POS"}</span>
            </Button>
          </Link>
          <Link href="/products">
            <Button size="sm" variant="outline" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer">
              <BookOpen className="size-3.5" />
              <span>{lang === "bn" ? "মেনু ম্যানেজ" : "Restaurant Menu"}</span>
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setUiStudioOpen(true)}
            className="hidden md:inline-flex h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Palette className="size-3.5 text-primary" />
            <span>{lang === "bn" ? "থিম ও UI স্টুডিও" : "UI Studio"}</span>
          </Button>
        </div>
      </div>

      {/* Period Switcher */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
          <Calendar className="size-3.5" />
          {lang === "bn" ? "সময়সীমা:" : "Period:"}
        </span>
        {(
          [
            { id: "today", en: "Today", bn: "আজ" },
            { id: "7d", en: "7 Days", bn: "৭ দিন" },
            { id: "30d", en: "30 Days", bn: "৩০ দিন" },
            { id: "all", en: "All Time", bn: "সব সময়" },
          ] as const
        ).map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={range === p.id ? "default" : "outline"}
            onClick={() => setRange(p.id)}
            className="h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {lang === "bn" ? p.bn : p.en}
          </Button>
        ))}
      </div>

      {/* Focused 4-Card Restaurant KPI Grid (No Stock/Expected Sale Value Clutter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 rounded-3xl border border-border/80 bg-card/85 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{lang === "bn" ? "মোট বিক্রয়" : "Restaurant Sales"}</span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {fmtMoney(filteredData.totalRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            {filteredData.salesCount} {lang === "bn" ? "টি অর্ডার সম্পন্ন" : "completed bills"}
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border border-border/80 bg-card/85 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{lang === "bn" ? "ক্যাশবক্স ব্যালেন্স" : "Cashbox Balance"}</span>
            <Wallet className="size-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {fmtMoney(cashboxBalanceValue)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {lang === "bn" ? "হাতে নগদ জমা" : "Available drawer cash"}
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border border-border/80 bg-card/85 space-y-1.5 shadow-xs">
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
          <Card className="p-4 rounded-3xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition space-y-1.5 shadow-xs h-full">
            <div className="flex items-center justify-between text-xs text-orange-700 dark:text-orange-400 font-semibold">
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

      {/* Main Content Split: Top Selling Dishes (Once Sold) + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-6 p-5 rounded-3xl border border-border/80 space-y-3">
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
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs"
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

        <Card className="lg:col-span-6 p-5 rounded-3xl border border-border/80 space-y-3">
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
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs"
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

      {/* Quick Operational Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/restaurant">
          <Card className="p-3.5 rounded-2xl hover:border-orange-500/50 transition flex items-center gap-2.5 text-xs font-bold">
            <ListOrdered className="size-4 text-orange-500" />
            <span>{lang === "bn" ? "POS ও বিল কিউ" : "POS & Bill Queue"}</span>
          </Card>
        </Link>
        <Link href="/products">
          <Card className="p-3.5 rounded-2xl hover:border-primary/50 transition flex items-center gap-2.5 text-xs font-bold">
            <BookOpen className="size-4 text-emerald-600" />
            <span>{lang === "bn" ? "রেস্তোরাঁ মেনু" : "Menu & Drinks Stock"}</span>
          </Card>
        </Link>
        <Link href="/employee-hub">
          <Card className="p-3.5 rounded-2xl hover:border-primary/50 transition flex items-center gap-2.5 text-xs font-bold">
            <Users className="size-4 text-indigo-600" />
            <span>{lang === "bn" ? "ওয়েটার ও স্টাফ" : "Waiters & Staff"}</span>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="p-3.5 rounded-2xl hover:border-primary/50 transition flex items-center gap-2.5 text-xs font-bold">
            <FileText className="size-4 text-amber-600" />
            <span>{lang === "bn" ? "রেস্তোরাঁ রিপোর্ট" : "Sales Reports"}</span>
          </Card>
        </Link>
      </div>

      <PcThemeQuickStudio open={uiStudioOpen} onOpenChange={setUiStudioOpen} />
    </div>
  );
}
