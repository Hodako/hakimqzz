"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductSearchSelect } from "@/components/product-search";
import { CustomerSearchSelect } from "@/components/customer-search";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { getCustomers, getProducts, type Product } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { createSaleFn, createCustomerFn } from "@/lib/rpc";
import { Plus, Trash2, Scan, Printer } from "lucide-react";
import { safeUUID } from "@/lib/utils";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import { printPwaInvoice } from "@/lib/invoice-printer";

type CartLine = { productId: string; qty: string; sellPrice: string; discount: string };

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
  const { data: customers = [] } = useCachedQuery(["customers"], getCustomers);

  const [type, setType] = useState<"cash" | "credit" | "online">(presetType ?? "cash");
  const [partyId, setPartyId] = useState("");
  const [paid, setPaid] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [draft, setDraft] = useState<CartLine>({ productId: "", qty: "1", sellPrice: "", discount: "" });
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

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
      const saved = await createCustomerFn({ data: { name, phone, address } });
      qc.invalidateQueries({ queryKey: ["customers"] });
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

  const handleBarcodeScan = (scannedCode: string) => {
    const clean = String(scannedCode || "").trim().toLowerCase();
    const prod = products.find(p => {
      const pBarcode = (p.barcode || "").trim().toLowerCase();
      const pQr = ((p as any).qr_code || "").trim().toLowerCase();
      const pCode = ((p as any).code || "").trim().toLowerCase();
      const pSku = ((p as any).sku || "").trim().toLowerCase();
      const pId = String(p.id || "").trim().toLowerCase();
      const pName = (p.name || "").trim().toLowerCase();

      return (
        (pBarcode && (pBarcode === clean || clean.includes(pBarcode))) ||
        (pQr && (pQr === clean || clean.includes(pQr))) ||
        (pCode && (pCode === clean || clean.includes(pCode))) ||
        (pSku && (pSku === clean || clean.includes(pSku))) ||
        (pId && (pId === clean || clean.includes(pId))) ||
        (pName && pName === clean)
      );
    });
    if (!prod) {
      toast.error(lang === "bn" ? `বারকোড/QR কোড (${scannedCode}) দ্বারা পণ্য পাওয়া যায়নি` : `No product found for Barcode/QR: ${scannedCode}`);
      return;
    }

    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === prod.id);
      if (idx !== -1) {
        const updated = [...prev];
        const existingQty = Number(updated[idx].qty) || 0;
        updated[idx] = { ...updated[idx], qty: String(existingQty + 1) };
        return updated;
      } else {
        return [...prev, {
          productId: prod.id,
          qty: "1",
          sellPrice: String(prod.sell_price || ""),
          discount: ""
        }];
      }
    });

    toast.success(lang === "bn" ? `কার্টে যুক্ত: ${prod.name}` : `Added to cart: ${prod.name}`);
  };

  useEffect(() => {
    if (open) {
      setType(presetType ?? "cash");
      setPartyId("");
      setPaid("");
      if (presetCart && presetCart.length > 0) {
        setCart(presetCart.map(x => ({ ...x, discount: (x as any).discount ?? "" })));
      } else if (presetProductId) {
        const p = products.find(x => x.id === presetProductId);
        setCart([{ productId: presetProductId, qty: "1", sellPrice: p ? String(p.sell_price || "") : "", discount: "" }]);
      } else {
        setCart([]);
      }
      setDraft({ productId: "", qty: "1", sellPrice: "", discount: "" });
    }
  }, [open, presetType, presetProductId, presetCart, products]);

  // Global Hardware USB / Bluetooth Barcode Listener for SaleDialog
  useEffect(() => {
    if (!open) return;

    let scanBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 120) {
        scanBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (scanBuffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScan(scanBuffer);
          scanBuffer = "";
        }
      } else if (e.key.length === 1) {
        scanBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, products]);



  function lineTotal(line: CartLine) {
    const p = products.find(x => x.id === line.productId);
    if (!p) return 0;
    const sell = Number(line.sellPrice) || p.sell_price || 0;
    const disc = Number(line.discount) || 0;
    const finalPrice = Math.max(sell - disc, 0);
    return finalPrice * (Number(line.qty) || 0);
  }

  const sellTotal = cart.reduce((a, l) => a + lineTotal(l), 0);
  const profitTotal = cart.reduce((a, l) => {
    const p = products.find(x => x.id === l.productId);
    if (!p) return a;
    const sell = Number(l.sellPrice) || p.sell_price || 0;
    const disc = Number(l.discount) || 0;
    const finalPrice = Math.max(sell - disc, 0);
    const qty = Number(l.qty) || 0;
    return a + (finalPrice - p.buy_price) * qty;
  }, 0);
  const paidNum = (type === "cash" || type === "online") ? sellTotal : Number(paid) || 0;
  const due = Math.max(sellTotal - paidNum, 0);

  function addToCart() {
    if (!draft.productId) return toast.error(t("select_product"));
    const qty = Number(draft.qty) || 0;
    if (qty <= 0) return;
    const sell = Number(draft.sellPrice);
    if (!sell || sell <= 0) return toast.error(t("sell_price") + " " + t("required"));
    const disc = Number(draft.discount) || 0;
    if (disc < 0) return toast.error(lang === "bn" ? "ডিসকাউন্ট নেতিবাচক হতে পারে না" : "Discount cannot be negative");
    
    setCart(prev => [...prev, { ...draft }]);
    setDraft({ productId: "", qty: "1", sellPrice: "", discount: "" });
  }

  async function submit(e: React.FormEvent, shouldPrint = false) {
    e.preventDefault();
    if (!user || cart.length === 0) return toast.error(t("select_product"));
    if (type === "credit" && !partyId) return toast.error((lang === "bn" ? "কাস্টমার" : "Customer") + " " + t("required"));
    setBusy(true);
    try {
      const duePerItem = type === "credit" ? due / cart.length : 0;
      const paidPerItem = type === "credit" ? paidNum / cart.length : 0;

      const cartId = safeUUID();
      for (const line of cart) {
        const product = products.find(p => p.id === line.productId)!;
        const qtyNum = Number(line.qty) || 0;
        const sellPrice = Number(line.sellPrice) || product.sell_price || 0;
        const disc = Number(line.discount) || 0;
        const finalSellPrice = Math.max(sellPrice - disc, 0);
        const lineSell = finalSellPrice * qtyNum;
        const lineProfit = (finalSellPrice - product.buy_price) * qtyNum;

        await createSaleFn({
          data: {
            product_id: product.id,
            product_name: product.name,
            qty: qtyNum,
            buy_price: product.buy_price,
            sell_price: finalSellPrice,
            profit: lineProfit,
            type,
            party_id: partyId || null,
            paid_amount: type === "credit" ? paidPerItem : lineSell,
            due_amount: type === "credit" ? duePerItem : 0,
            cart_id: cartId,
            discount: disc,
          },
        });
      }

      toast.success(t("record_sale"));
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["party-detail"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });

      if (shouldPrint) {
        const cust = customers.find(c => c.id === partyId);
        const discTotal = cart.reduce((acc, item) => acc + (Number(item.discount) || 0) * (Number(item.qty) || 1), 0);
        printPwaInvoice({
          businessName: user.business_name || user.full_name || "Dream Fashion POS",
          userEmail: user.business_emails || user.email || "",
          shopAddress: user.business_address || "",
          shopPhoneNumbers: user.business_phone_numbers || "",
          pageSize: user.invoice_page_size || "80mm",
          pageWidth: user.invoice_page_width || "",
          pageHeight: user.invoice_page_height || "",
          invoiceFontSize: user.invoice_font_size || "15px",
          invoiceNo: `INV-${cartId.slice(-6).toUpperCase()}`,
          invoiceDate: new Date().toLocaleDateString(),
          customerName: cust?.name || (lang === "bn" ? "সাধারণ কাস্টমার" : "Walk-in Customer"),
          customerPhone: cust?.phone || "",
          items: cart.map(c => {
            const prod = products.find(p => p.id === c.productId);
            return {
              product: { id: prod?.id, name: prod?.name || "Product" },
              qty: Number(c.qty) || 1,
              sellPrice: Math.max((Number(c.sellPrice) || prod?.sell_price || 0) - (Number(c.discount) || 0), 0),
            };
          }),
          subtotal: sellTotal + discTotal,
          discountAmount: discTotal,
          total: sellTotal,
          paidAmount: type === "credit" ? paidNum : sellTotal,
          due: type === "credit" ? due : 0,
          terms: user.invoice_terms || "",
        });
      }

      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md w-full h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-0">
          {/* Pinned header */}
          <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-border">
            <DialogTitle>{t("new_sale")}</DialogTitle>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            <form id="sale-form" onSubmit={submit} className="space-y-3">
              <Tabs value={type} onValueChange={(v) => setType(v as "cash" | "credit" | "online")}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="cash">{t("cash_sale")}</TabsTrigger>
                  <TabsTrigger value="credit">{t("credit_sale")}</TabsTrigger>
                  <TabsTrigger value="online">{t("online_sell")}</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Customer selection - always visible but required only for Credit */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {lang === "bn" ? "কাস্টমার (গ্রাহক)" : "Customer"} {type === "credit" ? "*" : `(${lang === "bn" ? "ঐচ্ছিক" : "Optional"})`}
                </Label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <CustomerSearchSelect customers={customers} value={partyId} onChange={setPartyId} />
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

              <div className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t("select_product")}</Label>
                </div>
                <ProductSearchSelect
                  products={products}
                  value={draft.productId}
                  onChange={v => {
                    const p = products.find(x => x.id === v);
                    setDraft(d => ({
                      ...d,
                      productId: v,
                      sellPrice: p && p.sell_price > 0 ? String(p.sell_price) : "",
                      discount: "",
                    }));
                  }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Field label={t("qty")}><Input type="number" inputMode="numeric" pattern="[0-9]*" placeholder={t("qty")} value={draft.qty} onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))} /></Field>
                  <Field label={t("sell_price")}><Input type="number" step="any" inputMode="decimal" pattern="[0-9.]*" placeholder={t("sell_price")} value={draft.sellPrice} onChange={e => setDraft(d => ({ ...d, sellPrice: e.target.value }))} /></Field>
                  <Field label={lang === "bn" ? "ডিসকাউন্ট" : "Discount"}><Input type="number" step="any" inputMode="decimal" pattern="[0-9.]*" placeholder="0" value={draft.discount} onChange={e => setDraft(d => ({ ...d, discount: e.target.value }))} /></Field>
                </div>
                {draft.productId && draft.sellPrice && (
                  <div className="text-[11px] text-muted-foreground text-right font-medium">
                    {lang === "bn" ? "চূড়ান্ত মূল্য: " : "Final Price: "} ৳{Math.max((Number(draft.sellPrice) || 0) - (Number(draft.discount) || 0), 0)}
                  </div>
                )}
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
                        <div key={`${line.productId}-${i}`} className="flex flex-col gap-1 border border-border rounded-md p-2 text-xs bg-muted/10">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="truncate flex-1 text-zinc-800 dark:text-zinc-200">{p?.name}</span>
                            <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 text-destructive hover:bg-destructive/10" onClick={() => setCart(prev => prev.filter((_, idx) => idx !== i))}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <Label className="text-[9px] text-muted-foreground">{t("qty")}</Label>
                              <Input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="h-7 text-xs"
                                value={line.qty}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCart(prev => prev.map((item, idx) => idx === i ? { ...item, qty: val } : item));
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-[9px] text-muted-foreground">{t("sell_price")}</Label>
                              <Input
                                type="number"
                                step="any"
                                inputMode="decimal"
                                pattern="[0-9.]*"
                                className="h-7 text-xs"
                                value={line.sellPrice}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCart(prev => prev.map((item, idx) => idx === i ? { ...item, sellPrice: val } : item));
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-[9px] text-muted-foreground">{lang === "bn" ? "ছাড়/ডিসকাউন্ট" : "Discount"}</Label>
                              <Input
                                type="number"
                                step="any"
                                inputMode="decimal"
                                pattern="[0-9.]*"
                                className="h-7 text-xs"
                                value={line.discount}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCart(prev => prev.map((item, idx) => idx === i ? { ...item, discount: val } : item));
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground text-right font-medium pt-0.5">
                            Subtotal: ৳{lineTotal(line)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {type === "credit" && (
                <Field label={lang === "bn" ? "নগদ পাওয়া টাকা (ঐচ্ছিক)" : "Received Cash Amount (Optional)"}>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    pattern="[0-9.]*"
                    placeholder={`0 (Total Due: ৳${sellTotal})`}
                    value={paid}
                    onChange={e => setPaid(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {lang === "bn"
                      ? `বাকি থাকবে: ৳${due} (পার্টির অ্যাকাউন্টে বকেয়া হিসেবে যুক্ত হবে)`
                      : `Remaining Due: ৳${due} (will be added to customer ledger)`}
                  </p>
                </Field>
              )}
            </form>
          </div>

          {/* Pinned footer */}
          <DialogFooter className="px-5 py-3 shrink-0 border-t border-border bg-card gap-2 flex-row items-center justify-between sm:justify-between">
            <div className="text-xs">
              <span className="text-muted-foreground">{t("total")}: </span>
              <span className="font-bold text-sm font-serif">৳{sellTotal}</span>
              {profitTotal !== 0 && (
                <span className="text-[10px] text-emerald-600 block">+{fmtMoney(profitTotal)} profit</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || cart.length === 0}
                onClick={(e) => submit(e, true)}
                className="gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
              >
                <Printer className="size-3.5" />
                {lang === "bn" ? "ইনভয়েস প্রিন্ট" : "Print Invoice"}
              </Button>
              <Button type="submit" form="sale-form" size="sm" disabled={busy || cart.length === 0}>
                {busy ? "…" : t("record_sale")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Customer Add Modal */}
      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{lang === "bn" ? "নতুন কাস্টমার যোগ করুন" : "Add New Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-3 text-xs pt-1">
            <div className="space-y-1">
              <Label className="text-[10px]">{t("full_name")} *</Label>
              <Input
                required
                className="h-8 text-xs"
                placeholder={t("full_name")}
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">{t("phone")}</Label>
              <Input
                type="tel"
                className="h-8 text-xs"
                placeholder={t("phone")}
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">{lang === "bn" ? "ঠিকানা" : "Address"}</Label>
              <Input
                className="h-8 text-xs"
                placeholder={lang === "bn" ? "ঠিকানা" : "Address"}
                value={newCustAddress}
                onChange={e => setNewCustAddress(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddCustomerOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs" disabled={addingCust}>
                {addingCust ? "..." : t("save")}
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
