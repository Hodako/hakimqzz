"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Trash2, Download, ShoppingBag, DollarSign, Tag, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getPurchases } from "@/lib/queries";
import type { Purchase } from "@/lib/queries";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useT } from "@/lib/i18n";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { FAB } from "@/components/ui/fab";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { deletePurchaseFn } from "@/lib/rpc";
import { toast } from "sonner";
import { setCachedData, refreshQueries } from "@/lib/optimistic-cache";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

export default function PurchasesPage() {
  const { lang, t } = useT();
  const qc = useQueryClient();
  const { data } = useCachedQuery(["purchases"], getPurchases);
  const [open, setOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPurchases = useMemo(() => {
    if (!data) return [];
    if (!filterDate) return data;
    return data.filter((p) => p.created_at.startsWith(filterDate));
  }, [data, filterDate]);

  const totalBuyExpense = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  }, [filteredPurchases]);

  const totalBuyQty = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (p.qty || 0), 0);
  }, [filteredPurchases]);

  // ── CSV Export Function with Download ──────────────────────────────────────
  const handleExportCSV = () => {
    if (!filteredPurchases || filteredPurchases.length === 0) {
      toast.error(lang === "bn" ? "ডাউনলোড করার মত কোন তথ্য পাওয়া যায়নি" : "No purchase data available to export");
      return;
    }

    const headers = [
      "ID",
      lang === "bn" ? "তারিখ ও সময়" : "Date & Time",
      lang === "bn" ? "পণ্যের নাম" : "Product Name",
      lang === "bn" ? "পরিমাণ (Qty)" : "Quantity",
      lang === "bn" ? "একক ক্রয় মূল্য" : "Unit Cost",
      lang === "bn" ? "মোট ক্রয় খরচ (Expense)" : "Total Buy Expense",
      lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Mode",
    ];

    const rows = filteredPurchases.map((p) => [
      `"${p.id}"`,
      `"${fmtDateTime(p.created_at)}"`,
      `"${(p.product_name || "").replace(/"/g, '""')}"`,
      p.qty,
      p.unit_cost,
      p.total,
      `"${p.payment_type || "cash"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = filterDate
      ? `product_buy_expenses_${filterDate}.csv`
      : `product_buy_expenses_all.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      lang === "bn"
        ? `মাল ক্রয় খরচের হিসাব ডাউনলোড হয়েছে (${filename})`
        : `Product buy expense report exported (${filename})`
    );
  };

  async function performDelete() {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    setCachedData<Purchase[]>(qc, ["purchases"], (old) =>
      (old ?? []).filter((p) => p.id !== purchaseToDelete.id)
    );
    try {
      await deletePurchaseFn({ data: { id: purchaseToDelete.id } });
      await refreshQueries(qc, ["purchases"], ["products"], ["expenses"], ["cashbox"]);
      toast.success(t("delete"));
      setPurchaseToDelete(null);
    } catch (err: unknown) {
      await refreshQueries(qc, ["purchases"], ["products"], ["expenses"], ["cashbox"]);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDelete(purchase: Purchase) {
    setPurchaseToDelete(purchase);
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Page Title & Download/Export Header Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="size-6 text-primary" />
            <span>{t("new_purchase")}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === "bn"
              ? "নতুন মাল ক্রয় ও ক্রয় খরচের পূর্ণাঙ্গ হিসাব (Product Buy Expense Ledger)"
              : "Product buy expenses & purchase inventory records"}
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-2 font-bold border-primary/30 text-primary hover:bg-primary/10 shadow-sm"
        >
          <Download className="size-4" />
          <span>{lang === "bn" ? "ডাউনলোড" : "Export CSV"}</span>
        </Button>
      </div>

      {/* ── Product Buy Expense Summary KPI Cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-card to-transparent rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>{lang === "bn" ? "মোট মাল ক্রয় খরচ (Total Buy Expense)" : "Total Buy Expense"}</span>
            <DollarSign className="size-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">
            {fmtMoney(totalBuyExpense)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {filterDate ? `${filterDate} তারিখের হিসাব` : "সর্বমোট ক্রয় খরচ"}
          </div>
        </Card>

        <Card className="p-3.5 border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-card to-transparent rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>{lang === "bn" ? "ক্রয়কৃত মোট পরিমাণ" : "Total Purchased Qty"}</span>
            <Tag className="size-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {totalBuyQty} {lang === "bn" ? "টি মাল" : "items"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {filteredPurchases.length} {lang === "bn" ? "টি ক্রয় ট্রানজ্যাকশন" : "purchase transactions"}
          </div>
        </Card>

        <Card className="p-3.5 border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-transparent rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>{lang === "bn" ? "পেমেন্ট মাধ্যমসমূহ" : "Payment Ledger"}</span>
            <Info className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {lang === "bn"
              ? "ক্যাশ ক্রয়ে ক্যাশবক্স থেকে টাকা কাটা হয়, আর ক্রেডিট ক্রয়ে সাপ্লায়ারের বকেয়া হিসাব আপডেট হয়।"
              : "Cash purchases deduct from Cashbox; Credit purchases update Supplier Dues."}
          </div>
        </Card>
      </div>

      {/* Date Filter & Export Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
        <div className="space-y-1 w-full sm:w-auto">
          <Label className="text-xs font-medium text-muted-foreground">{t("filter_date")}</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              className="h-8 text-xs w-44 rounded-lg"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => setFilterDate("")}
              >
                {lang === "bn" ? "সাফ" : "Clear"}
              </Button>
            )}
          </div>
        </div>

        <Button
          onClick={handleExportCSV}
          variant="secondary"
          size="sm"
          className="h-8 text-xs font-bold gap-1.5 shrink-0"
        >
          <Download className="size-3.5 text-primary" />
          <span>{lang === "bn" ? "ক্রয় খরচের ফাইল ডাউনলোড করুন" : "Download Buy Expenses CSV"}</span>
        </Button>
      </div>

      {/* Purchases List Table Card */}
      {(!filteredPurchases || filteredPurchases.length === 0) && (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl">
          {t("no_activity")}
        </Card>
      )}

      {filteredPurchases.length > 0 && (
        <Card className="divide-y divide-border overflow-hidden rounded-2xl shadow-sm">
          {filteredPurchases.map((p) => (
            <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="font-semibold text-sm truncate flex items-center gap-2 text-foreground">
                  <span>{p.product_name}</span>
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    ×{p.qty}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span>{fmtDateTime(p.created_at)}</span>
                  {p.unit_cost ? (
                    <span className="text-[11px] text-muted-foreground">
                      @{fmtMoney(p.unit_cost)} / pc
                    </span>
                  ) : null}
                  {p.payment_type && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        p.payment_type === "cash"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {p.payment_type}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold text-sm text-foreground font-mono">{fmtMoney(p.total)}</div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                  {lang === "bn" ? "ক্রয় খরচ (Expense)" : "Buy Expense"}
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0 rounded-lg"
                onClick={() => handleDelete(p)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <FAB onClick={() => setOpen(true)} />
      <PurchaseDialog open={open} onOpenChange={setOpen} />

      <ConfirmDeleteDialog
        open={purchaseToDelete !== null}
        onOpenChange={(v) => {
          if (!v) setPurchaseToDelete(null);
        }}
        title="Delete Purchase"
        description={`Are you sure you want to delete purchase "${purchaseToDelete?.product_name}"? This action is permanent and cannot be undone.`}
        onConfirm={performDelete}
        busy={isDeleting}
      />
    </div>
  );
}
