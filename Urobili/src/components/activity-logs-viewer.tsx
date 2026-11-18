"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import {
  getProducts,
  getSales,
  getPurchases,
  getExpenses,
  getCashbox,
  getEmployees,
  getEmployeeSalaries,
  getEmployeeExpenses,
  getEmployeeShoppings,
  getActivityLogs,
  type ActivityLog,
} from "@/lib/queries";
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  RefreshCw,
  Package,
  ShoppingCart,
  Wallet,
  DollarSign,
  Users,
  Settings,
  Calendar,
  Clock,
  User,
  Crown,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  CheckCircle2,
  FileSpreadsheet,
  Fingerprint,
} from "lucide-react";

export function ActivityLogsViewer() {
  const { lang } = useT();
  const qc = useQueryClient();

  // ── Search & Filter State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<"all" | "owner" | "staff">("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "yesterday" | "week" | "month">("all");
  const [page, setPage] = useState(1);
  const pageSize = 40;

  // ── Queries for Unified Activity Stream ──
  const explicitLogsQuery = useQuery({ queryKey: ["activity_logs"], queryFn: getActivityLogs });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const salesQuery = useQuery({ queryKey: ["sales"], queryFn: getSales });
  const purchasesQuery = useQuery({ queryKey: ["purchases"], queryFn: getPurchases });
  const expensesQuery = useQuery({ queryKey: ["expenses"], queryFn: getExpenses });
  const cashboxQuery = useQuery({ queryKey: ["cashbox"], queryFn: getCashbox });
  const salariesQuery = useQuery({ queryKey: ["employee_salaries"], queryFn: getEmployeeSalaries });
  const empExpensesQuery = useQuery({ queryKey: ["employee_expenses"], queryFn: getEmployeeExpenses });
  const shoppingsQuery = useQuery({ queryKey: ["employee_shoppings"], queryFn: getEmployeeShoppings });

  const isRefreshing =
    explicitLogsQuery.isFetching ||
    productsQuery.isFetching ||
    salesQuery.isFetching ||
    expensesQuery.isFetching;

  const handleRefresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["activity_logs"] }),
      qc.invalidateQueries({ queryKey: ["products"] }),
      qc.invalidateQueries({ queryKey: ["sales"] }),
      qc.invalidateQueries({ queryKey: ["purchases"] }),
      qc.invalidateQueries({ queryKey: ["expenses"] }),
      qc.invalidateQueries({ queryKey: ["cashbox"] }),
      qc.invalidateQueries({ queryKey: ["employee_salaries"] }),
      qc.invalidateQueries({ queryKey: ["employee_expenses"] }),
      qc.invalidateQueries({ queryKey: ["employee_shoppings"] }),
    ]);
  };

  // ── Helpers ──
  const fmtMoney = (val: number) => Math.round(Number(val) || 0).toLocaleString("en-IN");

  const parseToDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === "object" && typeof val.toDate === "function") return val.toDate();
    if (typeof val === "object" && val.seconds !== undefined) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const fmtDateTime = (d: Date | null) => {
    if (!d) return "—";
    try {
      const datePart = d.toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
      const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      return `${datePart} • ${timePart}`;
    } catch (_) {
      return d.toISOString().slice(0, 16);
    }
  };

  const getRelativeTime = (d: Date | null) => {
    if (!d) return "";
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return lang === "bn" ? "এইমাত্র" : "Just now";
    if (diffMins < 60) return lang === "bn" ? `${diffMins} মিনিট আগে` : `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return lang === "bn" ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return lang === "bn" ? "গতকাল" : "Yesterday";
    if (diffDays < 30) return lang === "bn" ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
    return "";
  };

  // ── Synthesize Unified Activity Feed ──
  const allLogs: ActivityLog[] = useMemo(() => {
    const list: ActivityLog[] = [];
    const seenIds = new Set<string>();
    const loggedProductCreateIds = new Set<string>();
    const loggedProductRestockIds = new Set<string>();

    // 1. Explicit logs from Firestore
    (explicitLogsQuery.data || []).forEach((log: any) => {
      const id = log.id || `explicit_${Math.random()}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const d = parseToDate(log.created_at);
        const pid = log.metadata?.product_id || log.metadata?.id;
        if (pid) {
          const pidStr = String(pid);
          if (log.action_type === "product_create") loggedProductCreateIds.add(pidStr);
          if (log.action_type === "product_restock" || log.action_type === "product_update") loggedProductRestockIds.add(pidStr);
        }
        list.push({
          id,
          category: log.category || "other",
          action_type: log.action_type || "action",
          title: log.title || "Business Action",
          details: log.details || "",
          actor_name: log.actor_name || "মালিক (Owner)",
          actor_role: log.actor_role || "owner",
          actor_id: log.actor_id,
          timestamp: d ? d.toISOString() : new Date().toISOString(),
          date: d ? d.toISOString().slice(0, 10) : "",
          source: log.source || "সিস্টেম",
          metadata: log.metadata || {},
        });
      }
    });

    // 2. Synthesized Products (When and which products added by owner / staff)
    (productsQuery.data || []).forEach((prod: any) => {
      const pIdStr = String(prod.id);

      // Only synthesize product_create log if no real log already exists for this dedicated product ID
      if (!loggedProductCreateIds.has(pIdStr)) {
        const id = `prod_add_${prod.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const d = parseToDate(prod.created_at);
          const buyP = Number(prod.buy_price) || 0;
          const sellP = Number(prod.sell_price) || 0;
          const stock = Number(prod.stock) || 0;
          const code = prod.code || prod.barcode || "";

          list.push({
            id,
            category: "product",
            action_type: "product_create",
            title: `নতুন পণ্য যুক্ত করা হয়েছে: ${prod.name || "অজানা পণ্য"}`,
            details: `পণ্য আইডি: #${pIdStr.slice(-6).toUpperCase()} (${pIdStr}) • বারকোড/কোড: ${code || "নেই"} • কেনা: ৳${fmtMoney(buyP)} • বিক্রি: ৳${fmtMoney(sellP)}${prod.updated_at ? ` • (বর্তমান মোট স্টক: ${stock} পিস)` : ` • প্রাথমিক স্টক: ${stock} পিস`} • ক্যাটাগরি: ${prod.category || "সাধারণ"}`,
            actor_name: prod.created_by_name || (prod.created_by ? "কর্মচারী" : "মালিক (Owner)"),
            actor_role: prod.created_by ? "staff" : "owner",
            timestamp: d ? d.toISOString() : "",
            date: d ? d.toISOString().slice(0, 10) : "",
            source: "ইনভেন্টরি",
            metadata: { product_id: prod.id, name: prod.name, buy_price: buyP, sell_price: sellP, stock, code },
          });
        }
      }

      // 2b. Synthesized Product Edits (Products with updated_at timestamp)
      // Only synthesize edit log if no real restock/update logs exist for this dedicated product ID
      if (prod.updated_at && !loggedProductRestockIds.has(pIdStr)) {
        const editId = `prod_edit_${prod.id}`;
        if (!seenIds.has(editId)) {
          seenIds.add(editId);
          const du = parseToDate(prod.updated_at);
          const buyP = Number(prod.buy_price) || 0;
          const sellP = Number(prod.sell_price) || 0;
          const stock = Number(prod.stock) || 0;
          const code = prod.code || prod.barcode || "";

          list.push({
            id: editId,
            category: "product",
            action_type: "product_update",
            title: `পণ্যের তথ্য ও স্টক এডিট: ${prod.name || "অজানা পণ্য"}`,
            details: `পণ্য আইডি: #${pIdStr.slice(-6).toUpperCase()} (${pIdStr}) • বর্তমান স্টক: ${stock} পিস • কেনা: ৳${fmtMoney(buyP)} • বিক্রি: ৳${fmtMoney(sellP)} • বারকোড/কোড: ${code || "নেই"}`,
            actor_name: prod.updated_by_name || "মালিক (Owner)",
            actor_role: "owner",
            timestamp: du ? du.toISOString() : "",
            date: du ? du.toISOString().slice(0, 10) : "",
            source: "ইনভেন্টরি এডিট",
            metadata: { product_id: prod.id, name: prod.name, stock, buy_price: buyP, sell_price: sellP, code },
          });
        }
      }
    });

    // 3. Synthesized Sales (Who made sale, products, price, profit, date/time)
    (salesQuery.data || []).forEach((s: any) => {
      const id = `sale_${s.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const d = parseToDate(s.created_at);
        const qty = Number(s.qty) || 1;
        const unitP = Number(s.sell_price) || 0;
        const total = unitP * qty;
        const isReturn = Boolean(s.returned);
        const payType = s.type || "নগদ";

        list.push({
          id,
          category: "sale",
          action_type: isReturn ? "sale_return" : "sale_create",
          title: isReturn
            ? `পণ্য ফেরত (রিটার্ন): ${s.product_name || "পণ্য"}`
            : `বিক্রি সম্পন্ন: ${s.product_name || "পণ্য"}${qty > 1 ? ` (x${qty})` : ""}`,
          details: `রসিদ নং: #${s.id.slice(0, 8)} • রেট: ৳${fmtMoney(unitP)} • মোট: ৳${fmtMoney(total)} • মাধ্যম: ${payType.toUpperCase()} • লাভ: ৳${fmtMoney(s.profit || 0)}${s.note ? ` • নোট: ${s.note}` : ""}`,
          actor_name: s.employee_name || s.created_by_name || "মালিক (Owner)",
          actor_role: s.employee_id || s.employee_name ? "staff" : "owner",
          timestamp: d ? d.toISOString() : "",
          date: d ? d.toISOString().slice(0, 10) : "",
          source: "POS ক্যাশ কাউন্টার",
          metadata: { sale_id: s.id, product_name: s.product_name, qty, total, type: payType },
        });
      }
    });

    // 4. Synthesized Purchases
    (purchasesQuery.data || []).forEach((p: any) => {
      const id = `pur_${p.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const d = parseToDate(p.created_at);
        list.push({
          id,
          category: "purchase",
          action_type: "purchase_create",
          title: `স্টক ক্রয় / চালান: ${p.supplier_name || p.party_name || "সাপ্লায়ার"}`,
          details: `চালানের মোট টাকা: ৳${fmtMoney(p.total_amount || 0)} • পরিশোধ: ৳${fmtMoney(p.paid_amount || 0)} • বকেয়া: ৳${fmtMoney(p.due_amount || 0)}`,
          actor_name: "মালিক (Owner)",
          actor_role: "owner",
          timestamp: d ? d.toISOString() : "",
          date: d ? d.toISOString().slice(0, 10) : "",
          source: "পার্টি ও ক্রয়",
          metadata: { purchase_id: p.id, total_amount: p.total_amount, paid_amount: p.paid_amount },
        });
      }
    });

    // 5. Synthesized Expenses
    (expensesQuery.data || []).forEach((exp: any) => {
      const id = `exp_${exp.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const d = parseToDate(exp.created_at || exp.date);
        const isStock = exp.payment_method === "stock" || exp.is_stock_expense;
        list.push({
          id,
          category: "expense",
          action_type: "expense_create",
          title: `দোকানের খরচ: ${exp.category || "সাধারণ খরচ"}`,
          details: `পরিমাণ: ৳${fmtMoney(exp.amount || 0)} • মাধ্যম: ${isStock ? "📦 স্টক পণ্য (নন-ক্যাশ)" : exp.payment_method === "online" ? "🌐 অনলাইন" : "💵 নগদ"}${exp.note ? ` • নোট: ${exp.note}` : ""}`,
          actor_name: exp.employee_name || "মালিক (Owner)",
          actor_role: exp.employee_name ? "staff" : "owner",
          timestamp: d ? d.toISOString() : "",
          date: d ? d.toISOString().slice(0, 10) : "",
          source: "দোকানের খরচ",
          metadata: { expense_id: exp.id, amount: exp.amount, category: exp.category },
        });
      }
    });

    // 6. Synthesized Cashbox Logs
    (cashboxQuery.data || []).forEach((c: any) => {
      const id = `cb_${c.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const d = parseToDate(c.created_at);
        list.push({
          id,
          category: "cashbox",
          action_type: "cashbox_movement",
          title: `ক্যাশবক্স লেনদেন: ${c.kind || "ক্যাশ জমা/খরচ"}`,
          details: `টাকা: ৳${fmtMoney(c.amount || 0)}${c.note ? ` • বিবরণ: ${c.note}` : ""}`,
          actor_name: "মালিক (Owner)",
          actor_role: "owner",
          timestamp: d ? d.toISOString() : "",
          date: d ? d.toISOString().slice(0, 10) : "",
          source: "ক্যাশবক্স",
          metadata: { log_id: c.id, amount: c.amount, kind: c.kind },
        });
      }
    });

    // 7. Synthesized Employee Shoppings & Stock Gifts
    (shoppingsQuery.data || []).forEach((sh: any) => {
      const id = `shop_${sh.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const d = parseToDate(sh.created_at || sh.date);
        const isGift = sh.payment_status === "gift";
        const isSalCut = sh.payment_status === "deduct_from_salary";
        list.push({
          id,
          category: "staff",
          action_type: isGift ? "stock_gift" : "employee_shopping",
          title: isGift
            ? `🎁 মালিকের স্টক উপহার: ${sh.employee_name || "কর্মচারী"}`
            : `🛍️ কর্মচারী কেনাকাটা (বেতন কর্তন): ${sh.employee_name || "কর্মচারী"}`,
          details: `মোট টাকা: ৳${fmtMoney(sh.total_amount || 0)} • ধরণ: ${isGift ? "স্টক পণ্য (নন-ক্যাশ খরচ)" : isSalCut ? "বেতন থেকে কর্তন" : "নগদ আদায়"}${sh.note ? ` • মন্তব্য: ${sh.note}` : ""}`,
          actor_name: isGift ? "মালিক (Owner)" : (sh.employee_name || "কর্মচারী"),
          actor_role: isGift ? "owner" : "staff",
          timestamp: d ? d.toISOString() : "",
          date: d ? d.toISOString().slice(0, 10) : "",
          source: "Employee Hub",
          metadata: { shopping_id: sh.id, total_amount: sh.total_amount, status: sh.payment_status },
        });
      }
    });

    // 8. Synthesized Employee Salaries
    (salariesQuery.data || []).forEach((sal: any) => {
      const id = `sal_${sal.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const d = parseToDate(sal.created_at || sal.date);
        list.push({
          id,
          category: "salary",
          action_type: "salary_payment",
          title: `বেতন প্রদান: ${sal.employee_name || "কর্মচারী"} (${sal.month || "চলতি মাস"})`,
          details: `পরিশোধিত টাকা: ৳${fmtMoney(sal.amount || 0)} • মাধ্যম: ${sal.payment_method || "নগদ"}${sal.note ? ` • মন্তব্য: ${sal.note}` : ""}`,
          actor_name: "মালিক (Owner)",
          actor_role: "owner",
          timestamp: d ? d.toISOString() : "",
          date: d ? d.toISOString().slice(0, 10) : "",
          source: "বেতন খতিয়ান",
          metadata: { salary_id: sal.id, amount: sal.amount, month: sal.month },
        });
      }
    });

    // Sort chronologically descending (newest action first)
    list.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return tb - ta;
    });

    return list;
  }, [
    explicitLogsQuery.data,
    productsQuery.data,
    salesQuery.data,
    purchasesQuery.data,
    expensesQuery.data,
    cashboxQuery.data,
    shoppingsQuery.data,
    salariesQuery.data,
  ]);

  // ── Filtered Logs ──
  const filteredLogs = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthStart = todayStr.slice(0, 7);

    return allLogs.filter((log) => {
      // 1. Category / Action Filter
      if (categoryFilter === "product_restock") {
        if (log.action_type !== "product_restock") return false;
      } else if (categoryFilter === "product_edit") {
        if (log.action_type !== "product_update" && log.action_type !== "product_restock") return false;
      } else if (categoryFilter === "product_create") {
        if (log.action_type !== "product_create") return false;
      } else if (categoryFilter !== "all" && log.category !== categoryFilter) {
        return false;
      }

      // 2. Actor Filter
      if (actorFilter === "owner" && log.actor_role !== "owner") return false;
      if (actorFilter === "staff" && log.actor_role !== "staff") return false;

      // 3. Time Filter
      if (timeFilter === "today") {
        if (!log.date || log.date !== todayStr) return false;
      } else if (timeFilter === "yesterday") {
        if (!log.date || log.date !== yesterday) return false;
      } else if (timeFilter === "week") {
        if (!log.date || log.date < sevenDaysAgo) return false;
      } else if (timeFilter === "month") {
        if (!log.date || !log.date.startsWith(monthStart)) return false;
      }

      // 4. Search Filter (text, title, details, actor, or dedicated Product ID)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${log.title} ${log.details || ""} ${log.actor_name} ${log.source || ""}`.toLowerCase();
        const pId = String(log.metadata?.product_id || log.metadata?.id || "").toLowerCase();
        const matchesId = pId && (pId === q || pId.includes(q) || pId.slice(-6) === q);
        if (!text.includes(q) && !matchesId) return false;
      }

      return true;
    });
  }, [allLogs, categoryFilter, actorFilter, timeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  // ── Export CSV Handler ──
  const handleExportCSV = () => {
    const headers = ["Timestamp", "Date", "Category", "Action", "Title", "Details", "Actor", "Role", "Source"];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.date || ""}"`,
      `"${l.category}"`,
      `"${l.action_type}"`,
      `"${(l.title || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${l.actor_name}"`,
      `"${l.actor_role || ""}"`,
      `"${l.source || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `classic_world_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Category Badges & Icons ──
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case "product":
        return <Package className="size-4 text-purple-600 dark:text-purple-400" />;
      case "sale":
        return <ShoppingCart className="size-4 text-emerald-600 dark:text-emerald-400" />;
      case "purchase":
        return <ArrowDownLeft className="size-4 text-blue-600 dark:text-blue-400" />;
      case "expense":
        return <ArrowUpRight className="size-4 text-rose-600 dark:text-rose-400" />;
      case "cashbox":
        return <Wallet className="size-4 text-amber-600 dark:text-amber-400" />;
      case "staff":
        return <Users className="size-4 text-indigo-600 dark:text-indigo-400" />;
      case "salary":
        return <DollarSign className="size-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <ClipboardList className="size-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <Card className="p-4 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <ClipboardList className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                  {lang === "bn" ? "অ্যাক্টিভিটি ও সর্বাঙ্গীন সিস্টেম লগ" : "Business Activity & Audit Logs"}
                </h2>
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                  {allLogs.length.toLocaleString()} {lang === "bn" ? "টি মোট রেকর্ড" : "Total Events"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                {lang === "bn"
                  ? "দোকানের সকল কার্যক্রমের সম্পূর্ণ স্বচ্ছ খতিয়ান: কখন কোন পণ্য যুক্ত করা হয়েছে, কে বিক্রি করেছে, খরচ, ক্যাশবক্স ও কর্মচারীদের প্রতিটি পদক্ষেপ এখানে সংরক্ষিত ও প্রদর্শিত।"
                  : "Comprehensive audit trail: view when and which products were added by the owner, sales made, expenses, cashbox movements, and all business actions."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 px-3 rounded-xl gap-1.5 text-xs font-bold border-border cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{lang === "bn" ? "রিফ্রেশ" : "Sync"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="h-9 px-3 rounded-xl gap-1.5 text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{lang === "bn" ? "CSV ডাউনলোড" : "Export CSV"}</span>
            </Button>
          </div>
        </div>

        {/* ── 4 Quick Overview KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/60">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
              <span className="text-[11px] font-bold">{lang === "bn" ? "পণ্য যোগ ও এডিট" : "Products Added & Edited"}</span>
              <Package className="size-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-lg font-black font-mono text-purple-900 dark:text-purple-100">
                {allLogs.filter((l) => l.category === "product").length.toLocaleString()}
              </span>
              <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 font-medium">
                ({allLogs.filter((l) => l.action_type === "product_create").length} {lang === "bn" ? "যোগ" : "added"} • {allLogs.filter((l) => l.action_type === "product_update" || l.action_type === "product_restock").length} {lang === "bn" ? "এডিট" : "edited"})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
              <span className="text-[11px] font-bold">{lang === "bn" ? "বিক্রয় রেকর্ড" : "Sales Recorded"}</span>
              <ShoppingCart className="size-3.5" />
            </div>
            <span className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-100">
              {allLogs.filter((l) => l.category === "sale").length.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-300">
              <span className="text-[11px] font-bold">{lang === "bn" ? "দোকানের খরচ" : "Expenses Logged"}</span>
              <ArrowUpRight className="size-3.5" />
            </div>
            <span className="text-lg font-black font-mono text-rose-900 dark:text-rose-100">
              {allLogs.filter((l) => l.category === "expense").length.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300">
              <span className="text-[11px] font-bold">{lang === "bn" ? "কর্মী ও বেতন" : "Staff & Salary"}</span>
              <Users className="size-3.5" />
            </div>
            <span className="text-lg font-black font-mono text-indigo-900 dark:text-indigo-100">
              {allLogs.filter((l) => l.category === "staff" || l.category === "salary").length.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Interactive Filter Toolbar ── */}
      <Card className="p-4 rounded-3xl bg-card border-border/80 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={lang === "bn" ? "পণ্যের নাম, রসিদ, নোট বা ইউজার দিয়ে খুঁজুন..." : "Search logs by product, invoice, note, or user..."}
              className="pl-9 h-9 text-xs rounded-xl bg-background"
            />
          </div>

          {/* Actor Filter */}
          <div className="sm:col-span-3 flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => {
                setActorFilter("all");
                setPage(1);
              }}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                actorFilter === "all" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "bn" ? "সব ইউজার" : "All Users"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActorFilter("owner");
                setPage(1);
              }}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                actorFilter === "owner" ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              👑 {lang === "bn" ? "মালিক" : "Owner"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActorFilter("staff");
                setPage(1);
              }}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                actorFilter === "staff" ? "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              👤 {lang === "bn" ? "কর্মী" : "Staff"}
            </button>
          </div>

          {/* Time Filter */}
          <div className="sm:col-span-4 flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setTimeFilter("all");
                setPage(1);
              }}
              className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                timeFilter === "all" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "bn" ? "সব সময়" : "All"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeFilter("today");
                setPage(1);
              }}
              className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                timeFilter === "today" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "bn" ? "আজ" : "Today"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeFilter("yesterday");
                setPage(1);
              }}
              className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                timeFilter === "yesterday" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "bn" ? "গতকাল" : "Yesterday"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeFilter("month");
                setPage(1);
              }}
              className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                timeFilter === "month" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "bn" ? "চলতি মাস" : "Month"}
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: lang === "bn" ? "সকল লগ" : "All Logs", count: allLogs.length },
            {
              id: "product_restock",
              label: lang === "bn" ? "📦 নতুন স্টক যোগ (Restock)" : "Stock Restocked",
              count: allLogs.filter((l) => l.action_type === "product_restock").length,
            },
            {
              id: "product_edit",
              label: lang === "bn" ? "✏️ পণ্য এডিট ও পরিবর্তন" : "Product Edits",
              count: allLogs.filter((l) => l.action_type === "product_update" || l.action_type === "product_restock").length,
            },
            {
              id: "product_create",
              label: lang === "bn" ? "➕ নতুন পণ্য সংযোজন" : "Products Added",
              count: allLogs.filter((l) => l.action_type === "product_create").length,
            },
            {
              id: "product",
              label: lang === "bn" ? "📦 সকল পণ্য কার্যক্রম" : "All Products",
              count: allLogs.filter((l) => l.category === "product").length,
            },
            { id: "sale", label: lang === "bn" ? "🛒 বিক্রি" : "Sales", count: allLogs.filter((l) => l.category === "sale").length },
            { id: "expense", label: lang === "bn" ? "💸 খরচ" : "Expenses", count: allLogs.filter((l) => l.category === "expense").length },
            { id: "purchase", label: lang === "bn" ? "📥 স্টক ক্রয়" : "Purchases", count: allLogs.filter((l) => l.category === "purchase").length },
            { id: "cashbox", label: lang === "bn" ? "💼 ক্যাশবক্স" : "Cashbox", count: allLogs.filter((l) => l.category === "cashbox").length },
            { id: "staff", label: lang === "bn" ? "👥 কর্মী শপিং ও উপহার" : "Staff Shopping", count: allLogs.filter((l) => l.category === "staff").length },
            { id: "salary", label: lang === "bn" ? "💰 বেতন খতিয়ান" : "Salary", count: allLogs.filter((l) => l.category === "salary").length },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategoryFilter(cat.id);
                setPage(1);
              }}
              className={`py-1.5 px-3 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 text-xs ${
                categoryFilter === cat.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${categoryFilter === cat.id ? "bg-primary-foreground/20 text-white" : "bg-muted text-foreground/70"}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Logs Feed / List ── */}
      <Card className="rounded-3xl border border-border/80 overflow-hidden bg-card shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2 text-muted-foreground">
            <ClipboardList className="size-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">{lang === "bn" ? "কোনো অ্যাক্টিভিটি লগ পাওয়া যায়নি" : "No activity logs match your filter"}</p>
            <p className="text-xs text-muted-foreground">
              {lang === "bn" ? "ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।" : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {paginatedLogs.map((log) => {
              const d = parseToDate(log.timestamp);
              const isOwner = log.actor_role === "owner";

              return (
                <div key={log.id} className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Left: Category Icon, Title, and Badges */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-center shrink-0 mt-0.5">
                        {renderCategoryIcon(log.category)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-foreground">
                            {log.title}
                          </span>

                          {/* Actor Badge */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 px-1.5 gap-1 font-bold ${
                              isOwner
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                                : "border-indigo-500/40 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200"
                            }`}
                          >
                            {isOwner ? <Crown className="size-3 text-amber-600" /> : <User className="size-3 text-indigo-600" />}
                            <span>{log.actor_name}</span>
                          </Badge>

                          {/* Source Tag */}
                          {log.source && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                              {log.source}
                            </span>
                          )}

                          {/* Dedicated Product ID Badge */}
                          {(log.metadata?.product_id || log.metadata?.id) && (
                            <Badge
                              variant="outline"
                              className="text-[9.5px] h-5 px-1.5 gap-1 font-mono font-bold bg-primary/10 border-primary/30 text-primary"
                              title={`Dedicated Product ID: ${log.metadata.product_id || log.metadata.id}`}
                            >
                              <Fingerprint className="size-2.5 text-primary shrink-0" />
                              <span>ID: #{String(log.metadata.product_id || log.metadata.id).slice(-6).toUpperCase()}</span>
                            </Badge>
                          )}

                          {/* Action Type Badges */}
                          {log.action_type === "product_update" && (
                            <Badge className="bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                              ✏️ পণ্য এডিট
                            </Badge>
                          )}
                          {log.action_type === "product_restock" && (
                            <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              📦 নতুন স্টক যোগ
                            </Badge>
                          )}
                          {log.action_type === "product_create" && (
                            <Badge className="bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                              ➕ নতুন পণ্য তৈরি
                            </Badge>
                          )}

                          {/* Stock Addition Highlight Pill */}
                          {(log.metadata?.stock_diff ?? 0) > 0 && (
                            <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 text-[10px] font-bold">
                              📦 +{log.metadata?.stock_diff} পিস নতুন স্টক যোগ
                            </Badge>
                          )}
                          {(log.metadata?.stock_diff ?? 0) < 0 && (
                            <Badge className="bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/40 text-[10px] font-bold">
                              📦 {log.metadata?.stock_diff} পিস স্টক হ্রাস
                            </Badge>
                          )}
                        </div>

                        {/* Details / Product info / Price / Notes */}
                        {log.details && (
                          <div className="px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50 text-xs text-foreground/90 font-medium break-words leading-relaxed">
                            {log.details}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Timestamp */}
                    <div className="sm:text-right shrink-0 pl-12 sm:pl-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 text-[11px] text-muted-foreground font-mono">
                      <span>{fmtDateTime(d)}</span>
                      <span className="text-[10px] font-sans text-primary font-bold">{getRelativeTime(d)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {totalPages > 1 && (
          <div className="p-3 bg-muted/30 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {lang === "bn"
                ? `পৃষ্ঠা ${page} / ${totalPages} (মোট ${filteredLogs.length} টি)`
                : `Page ${page} of ${totalPages} (${filteredLogs.length} total)`}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7.5 px-2.5 rounded-lg text-xs"
              >
                {lang === "bn" ? "আগের পৃষ্ঠা" : "Previous"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7.5 px-2.5 rounded-lg text-xs"
              >
                {lang === "bn" ? "পরের পৃষ্ঠা" : "Next"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
