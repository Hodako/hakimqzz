"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSearchSelect } from "@/components/product-search";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { getParties, getProducts, type Product } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { createSaleFn, createPartyFn } from "@/lib/rpc";
import { Plus, Trash2 } from "lucide-react";

type CartLine = { productId: string; qty: string; sellPrice: string };

export function SaleDialog({
  open, onOpenChange, presetType, presetProductId, presetCart,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  presetType?: "cash" | "credit" | "online"; presetProductId?: string;
  presetCart?: { productId: string; qty: string; sellPrice: string }[];
}) {
  const { lang, t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: products = [] } = useCachedQuery(["products"], getProducts);
  const { data: parties = [] } = useCachedQuery(["parties"], getParties);

  const [type, setType] = useState<"cash" | "credit" | "online">(presetType ?? "cash");
  const [partyId, setPartyId] = useState("");
  const [paid, setPaid] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [draft, setDraft] = useState<CartLine>({ productId: "", qty: "1", sellPrice: "" });
  const [busy, setBusy] = useState(false);

  // Quick Customer Creation
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [addingCust, setAddingCust] = useState(false);

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    const name = newCustName.trim();
    if (!name) return;
    const phone = newCustPhone.trim() || null;
    const address = newCustAddress.trim() || null;
    setAddingCust(true);
    try {
      const saved = await createPartyFn({ data: { name, phone, address } });
      qc.invalidateQueries({ queryKey: ["parties"] });
      setPartyId(saved.id);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      setAddCustomerOpen(false);
      toast.success(lang === "bn" ? `${name} কে কাস্টমার হিসেবে যোগ করা হয়েছে` : `Added customer ${name}`);
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setAddingCust(false);
    }
  }

  useEffect(() => {
    if (open) {
      setType(presetType ?? "cash");
      setPartyId("");
      setPaid("");
      if (presetCart && presetCart.length > 0) {
        setCart(presetCart);
      } else if (presetProductId) {
        const p = products.find(x => x.id === presetProductId);
        setCart([{ productId: presetProductId, qty: "1", sellPrice: p ? String(p.sell_price || "") : "" }]);
      } else {
        setCart([]);
      }
      setDraft({ productId: "", qty: "1", sellPrice: "" });
    }
  }, [open, presetType, presetProductId, presetCart]);

  useEffect(() => {
    if (draft.productId && !draft.sellPrice) {
      const p = products.find(x => x.id === draft.productId);
      if (p && p.sell_price > 0) setDraft(d => ({ ...d, sellPrice: String(p.sell_price) }));
    }
  }, [draft.productId, draft.sellPrice, products]);

  function lineTotal(line: CartLine) {
    const p = products.find(x => x.id === line.productId);
    if (!p) return 0;
    const sell = Number(line.sellPrice) || p.sell_price || 0;
    return sell * (Number(line.qty) || 0);
  }

  const sellTotal = cart.reduce((a, l) => a + lineTotal(l), 0);
  const profitTotal = cart.reduce((a, l) => {
    const p = products.find(x => x.id === l.productId);
    if (!p) return a;
    const sell = Number(l.sellPrice) || p.sell_price || 0;
    const qty = Number(l.qty) || 0;
    return a + (sell - p.buy_price) * qty;
  }, 0);
  const paidNum = (type === "cash" || type === "online") ? sellTotal : Number(paid) || 0;
  const due = Math.max(sellTotal - paidNum, 0);

  function addToCart() {
    if (!draft.productId) return toast.error(t("select_product"));
    const qty = Number(draft.qty) || 0;
    if (qty <= 0) return;
    const sell = Number(draft.sellPrice);
    if (!sell || sell <= 0) return toast.error(t("sell_price") + " " + t("required"));
    setCart(prev => [...prev, { ...draft }]);
    setDraft({ productId: "", qty: "1", sellPrice: "" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || cart.length === 0) return toast.error(t("select_product"));
    if (type === "credit" && !partyId) return toast.error(t("party") + " " + t("required"));
    setBusy(true);
    try {
      const duePerItem = type === "credit" ? due / cart.length : 0;
      const paidPerItem = type === "credit" ? paidNum / cart.length : 0;

      const cartId = crypto.randomUUID();
      for (const line of cart) {
        const product = products.find(p => p.id === line.productId)!;
        const qtyNum = Number(line.qty) || 0;
        const sellPrice = Number(line.sellPrice) || product.sell_price || 0;
        const lineSell = sellPrice * qtyNum;
        const lineProfit = (sellPrice - product.buy_price) * qtyNum;

        await createSaleFn({
          data: {
            product_id: product.id,
            product_name: product.name,
            qty: qtyNum,
            buy_price: product.buy_price,
            sell_price: sellPrice,
            profit: lineProfit,
            type,
            party_id: type === "credit" ? partyId : null,
            paid_amount: type === "credit" ? paidPerItem : lineSell,
            due_amount: type === "credit" ? duePerItem : 0,
            cart_id: cartId,
          },
        });
      }

      toast.success(t("record_sale"));
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["party-detail"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* Fixed height dialog — prevents resize/jump when cart or dropdowns change */}
        <DialogContent className="max-w-md w-full h-[90dvh] max-h-[90dvh] flex flex-col overflow-hidden p-0">
          {/* Pinned header */}
          <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-border">
            <DialogTitle>{t("new_sale")}</DialogTitle>
          </DialogHeader>

          {/* Scrollable body — only this area grows/shrinks */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            <form id="sale-form" onSubmit={submit} className="space-y-3">
              <Tabs value={type} onValueChange={(v) => setType(v as "cash" | "credit" | "online")}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="cash">{t("cash_sale")}</TabsTrigger>
                  <TabsTrigger value="credit">{t("credit_sale")}</TabsTrigger>
                  <TabsTrigger value="online">{t("online_sell")}</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="border border-border rounded-lg p-3 space-y-2">
                <Field label={t("select_product")}>
                  <ProductSearchSelect products={products} value={draft.productId} onChange={v => setDraft(d => ({ ...d, productId: v }))} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t("qty")}><Input inputMode="numeric" placeholder={t("qty")} value={draft.qty} onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))} /></Field>
                  <Field label={t("sell_price")}><Input inputMode="decimal" placeholder={t("sell_price")} value={draft.sellPrice} onChange={e => setDraft(d => ({ ...d, sellPrice: e.target.value }))} /></Field>
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={addToCart}>
                  <Plus className="size-3.5 mr-1" />{t("add_to_cart")}
                </Button>
              </div>

              {cart.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("cart")} ({cart.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {cart.map((line, i) => {
                      const p = products.find(x => x.id === line.productId);
                      return (
                        <div key={i} className="flex flex-col gap-1 border border-border rounded-md p-2 text-xs bg-muted/10">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="truncate flex-1 text-zinc-800 dark:text-zinc-200">{p?.name}</span>
                            <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 text-destructive hover:bg-destructive/10" onClick={() => setCart(prev => prev.filter((_, idx) => idx !== i))}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-muted-foreground">{t("qty")}</span>
                              <Input
                                className="h-7 text-xs bg-background"
                                type="number"
                                value={line.qty}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCart(prev => prev.map((x, idx) => idx === i ? { ...x, qty: val } : x));
                                }}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-muted-foreground">{t("sell_price")}</span>
                              <Input
                                className="h-7 text-xs bg-background"
                                type="number"
                                value={line.sellPrice}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCart(prev => prev.map((x, idx) => idx === i ? { ...x, sellPrice: val } : x));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {type === "credit" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("party")}</Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <Select value={partyId} onValueChange={setPartyId}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0 cursor-pointer"
                        onClick={() => setAddCustomerOpen(true)}
                        title="Add Customer"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("paid_amount")}><Input inputMode="decimal" placeholder={t("paid_amount")} value={paid} onChange={e => setPaid(e.target.value)} /></Field>
                    <Field label={t("due_amount")}><div className="h-9 px-3 grid items-center rounded-md bg-warning/10 font-semibold text-sm">{fmtMoney(due)}</div></Field>
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Pinned footer — total + action buttons */}
          <div className="shrink-0 border-t border-border px-5 py-3 space-y-2 bg-background">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("total")}</span>
              <span className="font-semibold">{fmtMoney(sellTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("profit")}</span>
              <span className="text-success font-medium">{fmtMoney(profitTotal)}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
              <Button type="submit" form="sale-form" className="flex-1" disabled={busy || cart.length === 0}>{busy ? "…" : t("record_sale")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-serif">
              {lang === "bn" ? "নতুন গ্রাহক যোগ করুন" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "গ্রাহকের নাম *" : "Customer Name *"}</Label>
              <Input
                required
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                placeholder="e.g. Abul Kalam"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "ফোন নম্বর" : "Phone Number"}</Label>
              <Input
                type="tel"
                inputMode="tel"
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
                placeholder="e.g. 017XXXXXXXX"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{lang === "bn" ? "ঠিকানা" : "Address"}</Label>
              <Input
                value={newCustAddress}
                onChange={e => setNewCustAddress(e.target.value)}
                placeholder="e.g. Dhaka, Bangladesh"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddCustomerOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={addingCust}>
                {addingCust ? "…" : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
