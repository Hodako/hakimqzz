"use client";


import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
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
    return data.filter(p => p.created_at.startsWith(filterDate));
  }, [data, filterDate]);

  const totalBuysOnDate = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  }, [filteredPurchases]);

  async function performDelete() {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    setCachedData<Purchase[]>(qc, ["purchases"], old => (old ?? []).filter(p => p.id !== purchaseToDelete.id));
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
      <h1 className="text-2xl font-bold">{t("new_purchase")}</h1>

      {/* Date Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card p-3 rounded-lg border border-border/80">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("filter_date")}</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              className="h-8 text-xs w-44"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setFilterDate("")}>
                {lang === "bn" ? "সাফ" : "Clear"}
              </Button>
            )}
          </div>
        </div>
        {filterDate && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs space-y-0.5">
            <div><strong>{lang === "bn" ? `${filterDate} তারিখের মোট কেনাকাটা:` : `Total Purchases on ${filterDate}:`}</strong></div>
            <div className="text-sm font-bold font-serif">{fmtMoney(totalBuysOnDate)}</div>
          </div>
        )}
      </div>

      {(!filteredPurchases || filteredPurchases.length === 0) && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t("no_activity")}</Card>
      )}
      
      {filteredPurchases.length > 0 && (
        <Card className="divide-y divide-border overflow-hidden">
          {filteredPurchases.map(p => (
            <div key={p.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.product_name} ×{p.qty}</div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(p.created_at)}</div>
              </div>
              <div className="font-semibold shrink-0">{fmtMoney(p.total)}</div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive shrink-0"
                onClick={() => handleDelete(p)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </Card>
      )}
       <FAB onClick={() => setOpen(true)} />
      <PurchaseDialog open={open} onOpenChange={setOpen} />

      <ConfirmDeleteDialog
        open={purchaseToDelete !== null}
        onOpenChange={(v) => { if (!v) setPurchaseToDelete(null); }}
        title="Delete Purchase"
        description={`Are you sure you want to delete purchase "${purchaseToDelete?.product_name}"? This action is permanent and cannot be undone.`}
        onConfirm={performDelete}
        busy={isDeleting}
      />
    </div>
  );
}
