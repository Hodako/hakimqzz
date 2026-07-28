"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { getProducts, getParties, type Product } from "@/lib/queries";
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
import {
  Plus,
  Minus,
  Trash2,
  Printer,
  ArrowLeft,
  RefreshCw,
  ShoppingCart,
  UserCheck,
  FileText,
  Eye,
  Edit3,
  Sparkles,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { getBusinessSettingsFn } from "@/lib/rpc-admin";

type InvoiceItem = {
  product: Product;
  qty: number;
  sellPrice: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// PWA & Mobile Web Safe Isolated Print Engine
// ─────────────────────────────────────────────────────────────────────────────
function printPwaInvoice(data: {
  businessName: string;
  userEmail: string;
  tagline: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  due: number;
  changeAmount: number;
  paymentStatus: string;
  colorTheme: string;
  terms: string;
}) {
  const colorMap: Record<string, { main: string; bg: string; headerBg: string }> = {
    emerald: { main: "#047857", bg: "#ecfdf5", headerBg: "#d1fae5" },
    indigo: { main: "#4338ca", bg: "#eef2ff", headerBg: "#e0e7ff" },
    rose: { main: "#be123c", bg: "#fff1f2", headerBg: "#ffe4e6" },
    black: { main: "#18181b", bg: "#f4f4f5", headerBg: "#e4e4e7" },
  };

  const colors = colorMap[data.colorTheme] || colorMap.black;

  const itemsHtml = data.items
    .map(
      (item, i) => `
    <tr style="border-bottom: 1px solid #e4e4e7;">
      <td style="padding: 8px; font-family: monospace; color: #71717a;">${i + 1}</td>
      <td style="padding: 8px; font-weight: 500;">${item.product.name}</td>
      <td style="padding: 8px; text-align: right; font-family: monospace;">৳${item.sellPrice.toLocaleString()}</td>
      <td style="padding: 8px; text-align: center; font-family: monospace;">${item.qty}</td>
      <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 600;">৳${(item.qty * item.sellPrice).toLocaleString()}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNo}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #ffffff !important; color: #000000 !important; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${colors.main}; padding-bottom: 16px; margin-bottom: 20px; }
    .biz-name { font-size: 22px; font-weight: bold; text-transform: uppercase; color: ${colors.main}; }
    .tagline { font-size: 12px; color: #71717a; margin-top: 2px; }
    .inv-title { font-size: 20px; font-weight: bold; text-transform: uppercase; text-align: right; color: #18181b; }
    .inv-meta { font-size: 12px; color: #52525b; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .client-box { background: ${colors.bg}; padding: 12px 16px; border-radius: 8px; }
    .client-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: ${colors.main}; margin-bottom: 4px; }
    .client-name { font-size: 14px; font-weight: 600; color: #000000; }
    .client-phone { font-size: 12px; color: #52525b; font-family: monospace; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #d1fae5; background: #ecfdf5; color: #047857; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    th { background: ${colors.headerBg}; color: ${colors.main}; padding: 10px 8px; text-align: left; font-weight: bold; border-bottom: 2px solid ${colors.main}; }
    .summary-wrap { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .summary-box { width: 260px; font-size: 12px; border-top: 2px solid ${colors.main}; padding-top: 12px; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; color: #52525b; }
    .row-total { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; font-weight: bold; color: ${colors.main}; border-top: 1px solid ${colors.main}; margin-top: 4px; }
    .row-paid { display: flex; justify-content: space-between; padding: 4px 0; color: #047857; font-weight: 500; }
    .row-due { display: flex; justify-content: space-between; padding: 4px 0; color: #e11d48; font-weight: 600; border-top: 1px dashed #f43f5e; margin-top: 4px; }
    .footer { border-top: 1px solid #e4e4e7; padding-top: 16px; text-align: center; font-size: 11px; color: #71717a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="biz-name">${data.businessName}</div>
        <div class="tagline">${data.tagline}</div>
        <div style="font-size: 11px; color: #71717a;">${data.userEmail}</div>
      </div>
      <div style="text-align: right;">
        <div class="inv-title">INVOICE</div>
        <div class="inv-meta"><strong>No:</strong> ${data.invoiceNo}</div>
        <div class="inv-meta"><strong>Date:</strong> ${data.invoiceDate}</div>
      </div>
    </div>
    <div class="grid">
      <div class="client-box">
        <div class="client-title">BILLED TO:</div>
        <div class="client-name">${data.customerName}</div>
        <div class="client-phone">${data.customerPhone}</div>
      </div>
      <div style="text-align: right; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 11px; color: #71717a; margin-bottom: 2px;">Status</div>
        <div><span class="status-badge">${data.paymentStatus}</span></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Product</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="summary-wrap">
      <div class="summary-box">
        <div class="row"><span>Subtotal</span><span style="font-family: monospace;">৳${data.subtotal.toLocaleString()}</span></div>
        ${data.discountAmount > 0 ? `<div class="row" style="color: #e11d48;"><span>Discount</span><span style="font-family: monospace;">-৳${data.discountAmount.toLocaleString()}</span></div>` : ""}
        <div class="row-total"><span>Payable Total</span><span style="font-family: monospace;">৳${data.total.toLocaleString()}</span></div>
        <div class="row-paid"><span>Paid Amount</span><span style="font-family: monospace;">৳${data.paidAmount.toLocaleString()}</span></div>
        ${data.due > 0 ? `<div class="row-due"><span>Due Amount</span><span style="font-family: monospace;">৳${data.due.toLocaleString()}</span></div>` : ""}
        ${data.changeAmount > 0 ? `<div class="row" style="color: #0284c7; font-weight: 500;"><span>Change Return</span><span style="font-family: monospace;">৳${data.changeAmount.toLocaleString()}</span></div>` : ""}
      </div>
    </div>
    <div class="footer">
      <p>${data.terms || "Thank you for your business!"}</p>
      <p style="font-size: 9px; margin-top: 4px; color: #a1a1aa;">Generated via ${data.businessName} Invoice Manager</p>
    </div>
  </div>
</body>
</html>`;

  // Create isolated iframe for PWA print
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        window.print();
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      }, 1000);
    }, 250);
  } else {
    window.print();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Pixel-Perfect Invoice Document View (Used on PC screen & Print PDF)
// ─────────────────────────────────────────────────────────────────────────────
interface InvoiceDocumentViewProps {
  businessName: string;
  userEmail: string;
  tagline: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  due: number;
  changeAmount: number;
  paymentStatus: string;
  colorClasses: any;
  biz: any;
  t: (key: string) => string;
  isPrintOnly?: boolean;
}

function InvoiceDocumentView({
  businessName,
  userEmail,
  tagline,
  invoiceNo,
  invoiceDate,
  customerName,
  customerPhone,
  items,
  subtotal,
  discountAmount,
  total,
  paidAmount,
  due,
  changeAmount,
  paymentStatus,
  colorClasses,
  biz,
  t,
  isPrintOnly = false,
}: InvoiceDocumentViewProps) {
  return (
    <div
      className={`invoice-print-container bg-white text-zinc-900 rounded-xl border border-zinc-200 shadow-md font-sans text-xs space-y-5 relative overflow-hidden min-h-[580px] flex flex-col justify-between ${
        isPrintOnly ? "p-4 border-none shadow-none" : "p-6 sm:p-8"
      }`}
    >
      {/* Optional Watermark */}
      {biz?.invoice_watermark_enabled && biz?.invoice_watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0 opacity-[0.06]">
          <span className="text-[100px] font-black uppercase tracking-widest -rotate-45 text-zinc-950 whitespace-nowrap">
            {biz.invoice_watermark}
          </span>
        </div>
      )}

      <div className="space-y-5 z-10">
        {/* Invoice Header & Branding */}
        <div className={`flex justify-between items-start border-b-2 pb-4 ${colorClasses.border}`}>
          <div className="space-y-1">
            <h1 className={`text-xl font-bold uppercase tracking-wide ${colorClasses.accentText}`}>
              {businessName}
            </h1>
            <p className="text-xs text-zinc-500">{tagline}</p>
            <p className="text-xs text-zinc-500">{userEmail}</p>
          </div>
          <div className="text-right space-y-1">
            <h2 className="text-lg font-bold uppercase text-zinc-800 tracking-wider">
              {t("invoices")}
            </h2>
            <div className="text-xs text-zinc-600 font-mono">
              <strong>{t("invoice_no")}:</strong> {invoiceNo}
            </div>
            <div className="text-xs text-zinc-600">
              <strong>{t("date")}:</strong> {invoiceDate}
            </div>
            {!isPrintOnly && (
              <div className="flex justify-end pt-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : paymentStatus === "DUE"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`space-y-1 p-3 rounded-lg ${colorClasses.bg}`}>
            <h3 className={`text-[11px] font-bold uppercase tracking-wider ${colorClasses.text}`}>
              {t("billed_to")}:
            </h3>
            <div className="font-semibold text-zinc-900 text-sm">{customerName}</div>
            <div className="text-zinc-600 font-mono text-xs">{customerPhone}</div>
          </div>
          <div className="text-right flex flex-col justify-center space-y-1">
            <div className="text-zinc-500 text-[11px]">Payment Status</div>
            <div className="font-bold text-zinc-800 uppercase tracking-wider">{paymentStatus}</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b-2 ${colorClasses.border} ${colorClasses.headerBg} ${colorClasses.text}`}>
                <th className="py-2 px-2.5 font-bold">#</th>
                <th className="py-2 px-2.5 font-bold">{t("product_name")}</th>
                <th className="py-2 px-2.5 font-bold text-right">{t("sell_price")}</th>
                <th className="py-2 px-2.5 font-bold text-center">{t("qty")}</th>
                <th className="py-2 px-2.5 font-bold text-right">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 italic">
                    No items added yet. Add products to populate invoice table.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.product.id} className={`border-b ${colorClasses.borderLight}`}>
                    <td className="py-2 px-2.5 text-zinc-400 font-mono">{index + 1}</td>
                    <td className="py-2 px-2.5 font-medium text-zinc-900">{item.product.name}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-zinc-700">{fmtMoney(item.sellPrice)}</td>
                    <td className="py-2 px-2.5 text-center font-mono font-medium">{item.qty}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-zinc-900">
                      {fmtMoney(item.qty * item.sellPrice)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-2">
          <div className={`w-64 space-y-1.5 border-t-2 pt-2.5 ${colorClasses.border} text-xs`}>
            <div className="flex justify-between text-zinc-600">
              <span>{t("subtotal")}</span>
              <span className="font-mono">{fmtMoney(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>{t("discount")}</span>
                <span className="font-mono">-{fmtMoney(discountAmount)}</span>
              </div>
            )}

            <div className={`flex justify-between border-t pt-2 font-bold text-sm ${colorClasses.border} ${colorClasses.accentText}`}>
              <span>{t("payable_amount")}</span>
              <span className="font-mono">{fmtMoney(total)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-medium">
              <span>{t("paid_amount")}</span>
              <span className="font-mono">{fmtMoney(paidAmount)}</span>
            </div>

            {due > 0 && (
              <div className="flex justify-between border-t border-dashed pt-1 text-rose-600 font-semibold border-rose-300">
                <span>{t("due_amount")}</span>
                <span className="font-mono">{fmtMoney(due)}</span>
              </div>
            )}

            {changeAmount > 0 && (
              <div className="flex justify-between border-t border-dashed pt-1 text-sky-700 font-semibold border-sky-300">
                <span>Change Return</span>
                <span className="font-mono">{fmtMoney(changeAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Footer */}
      <div className="pt-6 border-t border-zinc-200 text-center text-[10px] text-zinc-500 space-y-1 z-10 mt-auto">
        {biz?.invoice_terms ? (
          <p className="font-medium text-zinc-700 whitespace-pre-line leading-relaxed">
            {biz.invoice_terms}
          </p>
        ) : (
          <p className="font-medium text-zinc-700">Thank you for your business!</p>
        )}
        <p className="text-[9px] text-zinc-400">
          Generated via {businessName} Invoice Manager.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoicePage() {
  const { t } = useT();
  const { user } = useAuth();

  const { data: products = [] } = useCachedQuery(["products"], getProducts);
  const { data: parties = [] } = useCachedQuery(["parties"], getParties);

  // Form State
  const [selectedPartyId, setSelectedPartyId] = useState<string>("walk-in");
  const [customName, setCustomName] = useState("");
  const [customPhone, setCustomPhone] = useState("");

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  // Draft product selector state
  const [draftProduct, setDraftProduct] = useState<string>("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftPrice, setDraftPrice] = useState("");

  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");

  // Mobile View Toggle ("editor" vs "preview")
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  // Fetch Business Branding & Settings
  const settingsQuery = useQuery({
    queryKey: ["business-settings"],
    queryFn: getBusinessSettingsFn,
  });
  const biz = settingsQuery.data?.business;

  // Auto-fill sell price when selecting a product
  function handleProductChange(prodId: string) {
    setDraftProduct(prodId);
    const p = products.find((x) => x.id === prodId);
    if (p) {
      setDraftPrice(String(p.sell_price || ""));
    }
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!draftProduct) return toast.error(t("select_product"));

    const p = products.find((x) => x.id === draftProduct);
    if (!p) return;

    const qty = Number(draftQty) || 0;
    if (qty <= 0) return toast.error(t("qty") + " > 0");

    const price = Number(draftPrice) || 0;
    if (price <= 0) return toast.error(t("sell_price") + " > 0");

    const existingIndex = invoiceItems.findIndex((item) => item.product.id === p.id);
    if (existingIndex > -1) {
      setInvoiceItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: item.qty + qty, sellPrice: price } : item
        )
      );
    } else {
      setInvoiceItems((prev) => [...prev, { product: p, qty, sellPrice: price }]);
    }

    toast.success(t("item_added"));
    setDraftProduct("");
    setDraftQty("1");
    setDraftPrice("");
  }

  function handleUpdateQty(productId: string, delta: number) {
    setInvoiceItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as InvoiceItem[]
    );
  }

  function handleUpdatePrice(productId: string, newPriceStr: string) {
    const newPrice = Number(newPriceStr) || 0;
    setInvoiceItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, sellPrice: newPrice } : item
      )
    );
  }

  function handleRemoveItem(productId: string) {
    setInvoiceItems((prev) => prev.filter((item) => item.product.id !== productId));
  }

  // Calculations
  const subtotal = invoiceItems.reduce((acc, item) => acc + item.qty * item.sellPrice, 0);
  const discountAmount = Math.min(Number(discount) || 0, subtotal);
  const total = Math.max(subtotal - discountAmount, 0);
  const paidAmount = Number(paid) || 0;
  const due = Math.max(total - paidAmount, 0);
  const changeAmount = Math.max(paidAmount - total, 0);

  const paymentStatus = useMemo(() => {
    if (total <= 0) return "PAID";
    if (paidAmount >= total) return "PAID";
    if (paidAmount === 0) return "DUE";
    return "PARTIAL";
  }, [total, paidAmount]);

  // Color Theme styling
  const colorTheme = biz?.invoice_color || "black";
  const colorClasses = useMemo(() => {
    switch (colorTheme) {
      case "emerald":
        return {
          text: "text-emerald-700 dark:text-emerald-400",
          border: "border-emerald-500",
          bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
          headerBg: "bg-emerald-100/70 dark:bg-emerald-900/40",
          accentText: "text-emerald-800 dark:text-emerald-300",
          borderLight: "border-emerald-200/60 dark:border-emerald-800/40",
        };
      case "indigo":
        return {
          text: "text-indigo-700 dark:text-indigo-400",
          border: "border-indigo-500",
          bg: "bg-indigo-50/70 dark:bg-indigo-950/30",
          headerBg: "bg-indigo-100/70 dark:bg-indigo-900/40",
          accentText: "text-indigo-800 dark:text-indigo-300",
          borderLight: "border-indigo-200/60 dark:border-indigo-800/40",
        };
      case "rose":
        return {
          text: "text-rose-700 dark:text-rose-400",
          border: "border-rose-500",
          bg: "bg-rose-50/70 dark:bg-rose-950/30",
          headerBg: "bg-rose-100/70 dark:bg-rose-900/40",
          accentText: "text-rose-800 dark:text-rose-300",
          borderLight: "border-rose-200/60 dark:border-rose-800/40",
        };
      default:
        return {
          text: "text-zinc-800 dark:text-zinc-200",
          border: "border-zinc-400 dark:border-zinc-600",
          bg: "bg-zinc-50 dark:bg-zinc-900/40",
          headerBg: "bg-zinc-100 dark:bg-zinc-800/60",
          accentText: "text-zinc-900 dark:text-zinc-100",
          borderLight: "border-zinc-200 dark:border-zinc-700",
        };
    }
  }, [colorTheme]);

  const activeCustomerName = useMemo(() => {
    if (selectedPartyId === "walk-in") return customName.trim() || t("walk_in_customer");
    const p = parties.find((x) => x.id === selectedPartyId);
    return p ? p.name : t("walk_in_customer");
  }, [selectedPartyId, customName, parties, t]);

  const activeCustomerPhone = useMemo(() => {
    if (selectedPartyId === "walk-in") return customPhone.trim() || "—";
    const p = parties.find((x) => x.id === selectedPartyId);
    return p ? p.phone || "—" : "—";
  }, [selectedPartyId, customPhone, parties]);

  const invoiceNo = useMemo(() => {
    return `INV-${Date.now().toString().slice(-6)}`;
  }, [invoiceItems.length === 0]);

  const businessName = user?.business_name || "HakimQzz";
  const userEmail = user?.email || "";
  const tagline = t("tagline") || "Quality Products & Service";
  const invoiceDate = fmtDate(new Date().toISOString());

  function handlePrint() {
    if (invoiceItems.length === 0) return toast.error(t("no_items_in_cart"));

    // Invoke PWA-safe Print Routine
    printPwaInvoice({
      businessName,
      userEmail,
      tagline,
      invoiceNo,
      invoiceDate,
      customerName: activeCustomerName,
      customerPhone: activeCustomerPhone,
      items: invoiceItems,
      subtotal,
      discountAmount,
      total,
      paidAmount,
      due,
      changeAmount,
      paymentStatus,
      colorTheme,
      terms: biz?.invoice_terms || "",
    });
  }

  // Web Share / Mobile PWA Share
  async function handleShareInvoice() {
    if (invoiceItems.length === 0) return toast.error(t("no_items_in_cart"));
    const textSummary = `Invoice #${invoiceNo}\nCustomer: ${activeCustomerName}\nTotal Payable: ৳${total.toLocaleString()}\nPaid: ৳${paidAmount.toLocaleString()}\nStatus: ${paymentStatus}`;

    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Invoice #${invoiceNo} - ${businessName}`,
          text: textSummary,
        });
        toast.success("Invoice details shared!");
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(textSummary);
        toast.success("Invoice summary copied to clipboard!");
      } catch (_) {
        toast.error("Share not supported on this browser.");
      }
    }
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

  function handleFullPay() {
    setPaid(String(total));
  }

  return (
    <div className="space-y-4 pb-8 max-w-7xl mx-auto">
      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* Top Header & Actions Toolbar (Non-Printable)                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-card p-3.5 rounded-xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Link href="/more">
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4 mr-1" />
              {t("more")}
            </Button>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div>
            <h1 className="font-semibold text-base flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {t("invoice_generator")}
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Create & print clean single-page invoices
            </p>
          </div>
        </div>

        {/* Action Controls & Mobile Tab Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Mobile Tab Switcher */}
          <div className="flex sm:hidden rounded-lg bg-muted p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => setMobileTab("editor")}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                mobileTab === "editor" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              <Edit3 className="size-3.5" /> Editor
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                mobileTab === "preview" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              <Eye className="size-3.5" /> Preview
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="h-8 px-2.5 text-xs">
              <RefreshCw className="size-3.5 mr-1" />
              {t("clear")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareInvoice}
              disabled={invoiceItems.length === 0}
              className="h-8 px-2.5 text-xs hidden sm:inline-flex"
            >
              <Share2 className="size-3.5 mr-1" /> Share
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              disabled={invoiceItems.length === 0}
              className="h-8 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Printer className="size-3.5 mr-1.5" />
              {t("print")} / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* Main Single Page Workspace Grid                                        */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 no-print items-start">
        {/* ── LEFT COLUMN: Input Form & Cart Controls ── */}
        <div
          className={`lg:col-span-6 xl:col-span-5 space-y-4 ${
            mobileTab === "preview" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Section 1: Customer & Invoice Info */}
          <Card className="p-4 space-y-3.5 border-border/80 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-primary" />
                {t("customer_details")}
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {invoiceNo}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">{t("select_customer")}</Label>
                <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("walk_in_customer")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">{t("walk_in_customer")}</SelectItem>
                    {parties
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.phone || "No phone"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPartyId === "walk-in" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("full_name")}</Label>
                    <Input
                      placeholder={t("walk_in_customer")}
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="h-8.5 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("phone")}</Label>
                    <Input
                      placeholder="017..."
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="h-8.5 text-xs"
                      inputMode="tel"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1 border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("party_name")}:</span>
                    <span className="font-medium text-foreground">{activeCustomerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("phone")}:</span>
                    <span className="font-mono text-foreground">{activeCustomerPhone}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Section 2: Add Product to Invoice */}
          <Card className="p-4 space-y-3 border-border/80 shadow-2xs">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShoppingCart className="size-3.5 text-primary" />
              {t("add_item")}
            </h2>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t("select_product")}</Label>
                <ProductSearchSelect
                  products={products.filter((p) => !p.archived && p.stock > 0)}
                  value={draftProduct}
                  onChange={handleProductChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("qty")}</Label>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8.5 rounded-r-none border-r-0 shrink-0"
                      onClick={() => setDraftQty((q) => String(Math.max(1, (Number(q) || 1) - 1)))}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={draftQty}
                      onChange={(e) => setDraftQty(e.target.value)}
                      className="h-8.5 text-xs text-center rounded-none font-mono"
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8.5 rounded-l-none border-l-0 shrink-0"
                      onClick={() => setDraftQty((q) => String((Number(q) || 0) + 1))}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("sell_price")} (৳)</Label>
                  <Input
                    type="number"
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="w-full h-8.5 text-xs font-medium">
                <Plus className="size-3.5 mr-1" />
                {t("add_item")}
              </Button>
            </form>
          </Card>

          {/* Section 3: Cart Item List Table */}
          <Card className="p-4 space-y-3 border-border/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                {t("cart")} ({invoiceItems.length})
              </h2>
              {invoiceItems.length > 0 && (
                <span className="text-xs font-semibold text-primary">
                  Total: {fmtMoney(subtotal)}
                </span>
              )}
            </div>

            {invoiceItems.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-lg border border-dashed border-border/80 bg-muted/20">
                <ShoppingCart className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">{t("no_items_in_cart")}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Select a product above to build your invoice</p>
              </div>
            ) : (
              <div className="divide-y divide-border border rounded-lg overflow-hidden text-xs bg-card">
                {invoiceItems.map((item) => (
                  <div key={item.product.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/20 transition-colors">
                    {/* Item Details */}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">{item.product.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        <span>৳</span>
                        <input
                          type="number"
                          value={item.sellPrice}
                          onChange={(e) => handleUpdatePrice(item.product.id, e.target.value)}
                          className="w-16 h-5 px-1 py-0 border rounded text-xs font-mono bg-background text-foreground"
                          inputMode="decimal"
                        />
                      </div>
                    </div>

                    {/* Inline Qty Controls */}
                    <div className="flex items-center border rounded-md overflow-hidden bg-background">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        className="px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="px-2 font-mono font-semibold text-xs min-w-[20px] text-center">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        className="px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>

                    {/* Item Total & Delete */}
                    <div className="text-right pl-1 min-w-[65px]">
                      <div className="font-semibold text-foreground font-mono">{fmtMoney(item.qty * item.sellPrice)}</div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleRemoveItem(item.product.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Section 4: Payments & Discounts */}
          {invoiceItems.length > 0 && (
            <Card className="p-4 space-y-3 border-border/80 shadow-2xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("discount")} (৳)</Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-[11px] text-muted-foreground">{t("paid_amount")} (৳)</Label>
                    <button
                      type="button"
                      onClick={handleFullPay}
                      className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5"
                    >
                      <Sparkles className="size-2.5" /> Full Pay
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="bg-muted/30 p-3 rounded-lg text-xs space-y-1.5 border border-border/60 font-medium">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("subtotal")}</span>
                  <span className="font-mono">{fmtMoney(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>{t("discount")}</span>
                    <span className="font-mono">-{fmtMoney(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold border-t border-border/80 pt-1.5 text-foreground">
                  <span>{t("payable_amount")}</span>
                  <span className="font-mono text-primary">{fmtMoney(total)}</span>
                </div>

                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{t("paid_amount")}</span>
                  <span className="font-mono">{fmtMoney(paidAmount)}</span>
                </div>

                {due > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 border-t border-dashed border-rose-200 dark:border-rose-900/60 pt-1">
                    <span>{t("due_amount")}</span>
                    <span className="font-mono font-bold">{fmtMoney(due)}</span>
                  </div>
                )}

                {changeAmount > 0 && (
                  <div className="flex justify-between text-sky-600 dark:text-sky-400 border-t border-dashed border-sky-200 dark:border-sky-900/60 pt-1">
                    <span>Change Return</span>
                    <span className="font-mono font-bold">{fmtMoney(changeAmount)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN: PC Live Document Preview (Identical to Print View) ── */}
        <div
          className={`lg:col-span-6 xl:col-span-7 ${
            mobileTab === "editor" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="sticky top-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Eye className="size-3.5 text-primary" /> Live Document Preview
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  paymentStatus === "PAID"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    : paymentStatus === "DUE"
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                }`}
              >
                {paymentStatus}
              </span>
            </div>

            {/* Pixel-Perfect Unified Document Component */}
            <InvoiceDocumentView
              businessName={businessName}
              userEmail={userEmail}
              tagline={tagline}
              invoiceNo={invoiceNo}
              invoiceDate={invoiceDate}
              customerName={activeCustomerName}
              customerPhone={activeCustomerPhone}
              items={invoiceItems}
              subtotal={subtotal}
              discountAmount={discountAmount}
              total={total}
              paidAmount={paidAmount}
              due={due}
              changeAmount={changeAmount}
              paymentStatus={paymentStatus}
              colorClasses={colorClasses}
              biz={biz}
              t={t}
            />
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* Hidden Pure Printable Layout for Window Print / PDF Output            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div className="hidden print:block invoice-print-page w-full bg-white text-black p-4 font-sans text-xs">
        <InvoiceDocumentView
          businessName={businessName}
          userEmail={userEmail}
          tagline={tagline}
          invoiceNo={invoiceNo}
          invoiceDate={invoiceDate}
          customerName={activeCustomerName}
          customerPhone={activeCustomerPhone}
          items={invoiceItems}
          subtotal={subtotal}
          discountAmount={discountAmount}
          total={total}
          paidAmount={paidAmount}
          due={due}
          changeAmount={changeAmount}
          paymentStatus={paymentStatus}
          colorClasses={colorClasses}
          biz={biz}
          t={t}
          isPrintOnly
        />
      </div>
    </div>
  );
}
