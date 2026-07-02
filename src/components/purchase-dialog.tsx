"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductSearchSelect } from "@/components/product-search";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { getProducts } from "@/lib/queries";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { createPurchaseFn } from "@/lib/rpc";
import { Plus, Trash2 } from "lucide-react";

type PurchaseLine = { productId: string; qty: string; unitCost: string; sellPrice: string };

export function PurchaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const { data: products = [] } = useCachedQuery(["products"], getProducts);
  const [lines, setLines] = useState<PurchaseLine[]>([{ productId: "", qty: "1", unitCost: "", sellPrice: "" }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setLines([{ productId: "", qty: "1", unitCost: "", sellPrice: "" }]);
  }, [open]);

  function updateLine(i: number, patch: Partial<PurchaseLine>) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, ...patch };
      if (patch.productId) {
        const p = products.find(x => x.id === patch.productId);
        if (p) {
          next.unitCost = String(p.buy_price || "");
          next.sellPrice = p.sell_price > 0 ? String(p.sell_price) : "";
        }
      }
      return next;
    }));
  }

  const grandTotal = lines.reduce((sum, l) => {
    const p = products.find(x => x.id === l.productId);
    if (!p) return sum;
    return sum + (Number(l.qty) || 0) * (Number(l.unitCost) || 0);
  }, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter(l => l.productId && Number(l.qty) > 0);
    if (valid.length === 0) return toast.error(t("select_product"));
    setBusy(true);
    try {
      for (const line of valid) {
        const p = products.find(x => x.id === line.productId)!;
        const qty = Number(line.qty) || 0;
        const unit_cost = Number(line.unitCost) || 0;
        const sell_price = Number(line.sellPrice) || 0;
        await createPurchaseFn({
          data: {
            product_id: p.id,
            product_name: p.name,
            qty,
            unit_cost,
            sell_price: sell_price > 0 ? sell_price : undefined,
            total: qty * unit_cost,
          },
        });
      }
      toast.success(t("save"));
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("new_purchase")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                {lines.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="size-6" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
              <ProductSearchSelect products={products} value={line.productId} onChange={v => updateLine(i, { productId: v })} />
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t("qty")}</Label>
                  <Input className="h-8 text-xs" inputMode="numeric" placeholder={t("qty")} value={line.qty} onChange={e => updateLine(i, { qty: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t("buy_price")}</Label>
                  <Input className="h-8 text-xs" inputMode="decimal" placeholder={t("buy_price")} value={line.unitCost} onChange={e => updateLine(i, { unitCost: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t("sell_price")}</Label>
                  <Input className="h-8 text-xs" inputMode="decimal" placeholder={t("sell_price")} value={line.sellPrice} onChange={e => updateLine(i, { sellPrice: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setLines(prev => [...prev, { productId: "", qty: "1", unitCost: "", sellPrice: "" }])}>
            <Plus className="size-3.5 mr-1" />{t("add_product")}
          </Button>
          <div className="flex items-center justify-between text-sm border-t border-border pt-3">
            <span className="text-muted-foreground">{t("total")}</span>
            <span className="font-semibold">{fmtMoney(grandTotal)}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy}>{busy ? "…" : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
