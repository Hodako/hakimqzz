"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { getProducts, getParties, type Product, type Party } from "@/lib/queries";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSearchSelect } from "@/components/product-search";
import { toast } from "sonner";
import { Plus, Trash2, Printer, ArrowLeft, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { getBusinessSettingsFn } from "@/lib/rpc-admin";

type InvoiceItem = {
  product: Product;
  qty: number;
  sellPrice: number;
};

export default function InvoicePage() {
  const { t } = useT();
  const { user } = useAuth();
  
  const { data: products = [] } = useCachedQuery(["products"], getProducts);
  const { data: parties = [] } = useCachedQuery(["parties"], getParties);

  const [selectedPartyId, setSelectedPartyId] = useState<string>("walk-in");
  const [customName, setCustomName] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  
  // Product Selector draft state
  const [draftProduct, setDraftProduct] = useState<string>("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftPrice, setDraftPrice] = useState("");

  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");

  // Auto-fill price when product changes
  function handleProductChange(prodId: string) {
    setDraftProduct(prodId);
    const p = products.find(x => x.id === prodId);
    if (p) {
      setDraftPrice(String(p.sell_price || ""));
    }
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!draftProduct) return toast.error(t("select_product"));
    
    const p = products.find(x => x.id === draftProduct);
    if (!p) return;

    const qty = Number(draftQty) || 0;
    if (qty <= 0) return toast.error(t("qty") + " > 0");

    const price = Number(draftPrice) || 0;
    if (price <= 0) return toast.error(t("sell_price") + " > 0");

    const existingIndex = invoiceItems.findIndex(item => item.product.id === p.id);
    if (existingIndex > -1) {
      setInvoiceItems(prev => prev.map((item, idx) => 
        idx === existingIndex ? { ...item, qty: item.qty + qty } : item
      ));
    } else {
      setInvoiceItems(prev => [...prev, { product: p, qty, sellPrice: price }]);
    }

    toast.success(t("item_added"));
    setDraftProduct("");
    setDraftQty("1");
    setDraftPrice("");
  }

  const subtotal = invoiceItems.reduce((acc, item) => acc + (item.qty * item.sellPrice), 0);
  const discountAmount = Number(discount) || 0;
  const total = Math.max(subtotal - discountAmount, 0);
  const paidAmount = Number(paid) || 0;
  const due = Math.max(total - paidAmount, 0);

  const settingsQuery = useQuery({
    queryKey: ["business-settings"],
    queryFn: getBusinessSettingsFn,
  });
  const biz = settingsQuery.data?.business;

  const paymentStatus = useMemo(() => {
    if (total <= 0) return "PAID";
    if (paidAmount >= total) return "PAID";
    if (paidAmount === 0) return "DUE";
    return "PARTIAL";
  }, [total, paidAmount]);

  const colorTheme = biz?.invoice_color || "black";
  const colorClasses = useMemo(() => {
    switch (colorTheme) {
      case "emerald":
        return {
          text: "text-emerald-700",
          border: "border-emerald-500",
          bg: "bg-emerald-50/50",
          headerBg: "bg-emerald-100/60",
          accentText: "text-emerald-800",
          borderLight: "border-emerald-200/50",
        };
      case "indigo":
        return {
          text: "text-indigo-700",
          border: "border-indigo-500",
          bg: "bg-indigo-50/50",
          headerBg: "bg-indigo-100/60",
          accentText: "text-indigo-800",
          borderLight: "border-indigo-200/50",
        };
      case "rose":
        return {
          text: "text-rose-700",
          border: "border-rose-500",
          bg: "bg-rose-50/50",
          headerBg: "bg-rose-100/60",
          accentText: "text-rose-800",
          borderLight: "border-rose-200/50",
        };
      default:
        return {
          text: "text-zinc-800",
          border: "border-zinc-400",
          bg: "bg-zinc-50",
          headerBg: "bg-zinc-100",
          accentText: "text-zinc-900",
          borderLight: "border-zinc-200",
        };
    }
  }, [colorTheme]);

  const activeCustomerName = useMemo(() => {
    if (selectedPartyId === "walk-in") return customName.trim() || t("walk_in_customer");
    const p = parties.find(x => x.id === selectedPartyId);
    return p ? p.name : "Unnamed Party";
  }, [selectedPartyId, customName, parties, t]);

  const activeCustomerPhone = useMemo(() => {
    if (selectedPartyId === "walk-in") return customPhone.trim() || "—";
    const p = parties.find(x => x.id === selectedPartyId);
    return p ? p.phone || "—" : "—";
  }, [selectedPartyId, customPhone, parties]);

  const invoiceNo = useMemo(() => {
    return `INV-${Date.now().toString().slice(-6)}`;
  }, [invoiceItems]);

  function handlePrint() {
    if (invoiceItems.length === 0) return toast.error(t("no_items_in_cart"));
    window.print();
  }

  function handleReset() {
    setInvoiceItems([]);
    setSelectedPartyId("walk-in");
    setCustomName("");
    setCustomPhone("");
    setDiscount("0");
    setPaid("");
    setDraftProduct("");
    setDraftQty("1");
    setDraftPrice("");
    toast.success(t("clear"));
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar */}
      <div className="flex items-center justify-between no-print">
        <Link href="/more">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-1" />{t("more")}
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="size-3.5 mr-1" />{t("clear")}
          </Button>
          <Button size="sm" onClick={handlePrint} disabled={invoiceItems.length === 0}>
            <Printer className="size-3.5 mr-1" />{t("print")} / PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 no-print">
        {/* Billing Info Panel */}
        <Card className="lg:col-span-1 p-4 glass-card space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-1.5">
            <ShoppingCart className="size-4 text-primary" />
            {t("customer_details")}
          </h2>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("select_customer")}</Label>
              <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("walk_in_customer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">{t("walk_in_customer")}</SelectItem>
                  {parties.filter(p => !p.archived).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPartyId === "walk-in" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("full_name")}</Label>
                  <Input 
                    placeholder={t("full_name")} 
                    value={customName} 
                    onChange={e => setCustomName(e.target.value)} 
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("phone")}</Label>
                  <Input 
                    placeholder={t("customer_phone")} 
                    value={customPhone} 
                    onChange={e => setCustomPhone(e.target.value)} 
                    className="h-9"
                    inputMode="tel"
                  />
                </div>
              </>
            )}

            {selectedPartyId !== "walk-in" && (
              <div className="p-2.5 rounded-lg bg-muted/30 text-xs space-y-1">
                <div><strong>{t("party_name")}:</strong> {activeCustomerName}</div>
                <div><strong>{t("phone")}:</strong> {activeCustomerPhone}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Add Items & Cart Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add product form */}
          <Card className="p-4 glass-card">
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs text-muted-foreground">{t("select_product")}</Label>
                  <ProductSearchSelect 
                    products={products.filter(p => !p.archived && p.stock > 0)} 
                    value={draftProduct} 
                    onChange={handleProductChange} 
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label className="text-xs text-muted-foreground">{t("qty")}</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={draftQty} 
                    onChange={e => setDraftQty(e.target.value)} 
                    className="h-9"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label className="text-xs text-muted-foreground">{t("sell_price")}</Label>
                  <Input 
                    type="number" 
                    value={draftPrice} 
                    onChange={e => setDraftPrice(e.target.value)} 
                    className="h-9"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full">
                <Plus className="size-4 mr-1" />
                {t("add_item")}
              </Button>
            </form>
          </Card>

          {/* Cart items list */}
          <Card className="p-4 glass-card space-y-3">
            <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("cart")}</h2>
            
            {invoiceItems.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                {t("no_items_in_cart")}
              </div>
            )}

            {invoiceItems.length > 0 && (
              <div className="divide-y divide-border overflow-hidden rounded-lg border text-xs">
                {invoiceItems.map((item, idx) => (
                  <div key={item.product.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/10">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">{item.product.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {fmtMoney(item.sellPrice)} × {item.qty}
                      </span>
                    </div>
                    <div className="font-semibold">{fmtMoney(item.qty * item.sellPrice)}</div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-7 text-destructive hover:bg-destructive/10" 
                      onClick={() => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Discount & Paid amounts */}
            {invoiceItems.length > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("discount")} (Amount)</Label>
                  <Input 
                    type="number" 
                    value={discount} 
                    onChange={e => setDiscount(e.target.value)} 
                    className="h-9"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("paid_amount")}</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={paid} 
                    onChange={e => setPaid(e.target.value)} 
                    className="h-9"
                    inputMode="decimal"
                  />
                </div>
              </div>
            )}

            {/* Calculations Summary */}
            {invoiceItems.length > 0 && (
              <div className="bg-muted/20 p-3 rounded-lg text-xs space-y-1.5 font-medium border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>{fmtMoney(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>{t("discount")}</span>
                    <span>-{fmtMoney(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1">
                  <span>{t("payable_amount")}</span>
                  <span>{fmtMoney(total)}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span>{t("paid_amount")}</span>
                  <span>{fmtMoney(paidAmount)}</span>
                </div>
                {due > 0 && (
                  <div className="flex justify-between text-rose-600 border-t border-dashed pt-1">
                    <span>{t("due_amount")}</span>
                    <span>{fmtMoney(due)}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* Printable Invoice Page (Always structured cleanly for Print view) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div className="hidden print:block invoice-print max-w-4xl mx-auto bg-white text-black p-8 font-sans space-y-6 text-sm relative overflow-hidden">
        {/* Watermark background overlay */}
        {biz?.invoice_watermark_enabled && biz?.invoice_watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0 opacity-[0.08] dark:opacity-[0.05]">
            <span className="text-[120px] font-black uppercase tracking-widest -rotate-45 text-zinc-950 font-sans whitespace-nowrap">
              {biz.invoice_watermark}
            </span>
          </div>
        )}

        {/* Header section */}
        <div className={`flex justify-between items-start border-b-2 pb-6 ${colorClasses.border}`}>
          <div className="space-y-1.5">
            <h1 className={`text-2xl font-bold uppercase tracking-wide ${colorClasses.accentText}`}>{user?.business_name || "HakimQzz"}</h1>
            <p className="text-xs text-zinc-500">{t("tagline")}</p>
            <p className="text-xs text-zinc-500">{user?.email}</p>
          </div>
          <div className="text-right space-y-1">
            <h2 className="text-xl font-bold uppercase text-zinc-800">{t("invoices")}</h2>
            <div className="text-xs text-zinc-600"><strong>{t("invoice_no")}:</strong> {invoiceNo}</div>
            <div className="text-xs text-zinc-600"><strong>{t("date")}:</strong> {fmtDate(new Date().toISOString())}</div>
            <div className="flex justify-end pt-1">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${
                paymentStatus === "PAID"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : paymentStatus === "DUE"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Client details info */}
        <div className="grid grid-cols-2 gap-6 pt-2">
          <div className={`space-y-1 p-3 rounded-lg ${colorClasses.bg}`}>
            <h3 className={`text-xs font-bold uppercase ${colorClasses.text}`}>{t("billed_to")}:</h3>
            <div className="font-semibold text-black">{activeCustomerName}</div>
            <div className="text-zinc-600">{activeCustomerPhone}</div>
          </div>
          <div className="space-y-1 text-right">
            {/* Placeholder info */}
          </div>
        </div>

        {/* Invoice Item list table */}
        <div className="pt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b-2 ${colorClasses.border} ${colorClasses.headerBg} ${colorClasses.text}`}>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">{t("product_name")}</th>
                <th className="py-2 px-3 text-right">{t("sell_price")}</th>
                <th className="py-2 px-3 text-center">{t("qty")}</th>
                <th className="py-2 px-3 text-right">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, index) => (
                <tr key={item.product.id} className={`border-b ${colorClasses.borderLight}`}>
                  <td className="py-2 px-3 text-zinc-500 font-mono">{index + 1}</td>
                  <td className="py-2 px-3 font-medium">{item.product.name}</td>
                  <td className="py-2 px-3 text-right">{fmtMoney(item.sellPrice)}</td>
                  <td className="py-2 px-3 text-center font-mono">{item.qty}</td>
                  <td className="py-2 px-3 text-right font-semibold">{fmtMoney(item.qty * item.sellPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total calculation panel */}
        <div className="flex justify-end pt-4">
          <div className={`w-64 space-y-2 border-t pt-3 ${colorClasses.border} text-xs`}>
            <div className="flex justify-between text-zinc-600">
              <span>{t("subtotal")}</span>
              <span>{fmtMoney(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>{t("discount")}</span>
                <span>-{fmtMoney(discountAmount)}</span>
              </div>
            )}
            <div className={`flex justify-between border-t pt-2 font-bold text-sm ${colorClasses.border} ${colorClasses.accentText}`}>
              <span>{t("payable_amount")}</span>
              <span>{fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>{t("paid_amount")}</span>
              <span>{fmtMoney(paidAmount)}</span>
            </div>
            {due > 0 && (
              <div className="flex justify-between border-t border-dashed pt-1 text-rose-600 font-semibold border-rose-300">
                <span>{t("due_amount")}</span>
                <span>{fmtMoney(due)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer text print area */}
        <div className="text-center pt-10 border-t border-zinc-200 text-[10px] text-zinc-500 space-y-1">
          {biz?.invoice_terms ? (
            <p className="font-medium text-zinc-700 whitespace-pre-line leading-relaxed">{biz.invoice_terms}</p>
          ) : (
            <p>Thank you for your business!</p>
          )}
          <p className="text-[9px] text-zinc-400 pt-2">Generated via {user?.business_name || "HakimQzz"} Invoice Manager.</p>
        </div>
      </div>
    </div>
  );
}
