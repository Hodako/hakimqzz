"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { printPwaInvoice } from "@/lib/invoice-printer";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Truck,
  Copy,
  Check,
  Printer,
  Pencil,
  PackageCheck,
  RotateCcw,
  Phone,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  MapPin,
  ExternalLink,
  Layers,
} from "lucide-react";
import { approveCourierPaymentFn, cancelCourierOrderFn } from "@/lib/rpc";
import { useQueryClient } from "@tanstack/react-query";

interface OrderInfoDialogProps {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (sale: any) => void;
  initialSelectedItemId?: string | null;
}

export function OrderInfoDialog({
  order,
  open,
  onOpenChange,
  onEdit,
  initialSelectedItemId,
}: OrderInfoDialogProps) {
  const { lang, t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  // If order has multiple items, allow switching between custom orders
  const items: any[] = useMemo(() => {
    if (!order) return [];
    if (Array.isArray(order.items) && order.items.length > 0) return order.items;
    return [order];
  }, [order]);

  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // When initialSelectedItemId changes, select that custom order item
  useMemo(() => {
    if (initialSelectedItemId && items.length > 0) {
      const idx = items.findIndex((it) => it.id === initialSelectedItemId);
      if (idx !== -1) {
        setSelectedIdx(idx);
        return;
      }
    }
    setSelectedIdx(0);
  }, [initialSelectedItemId, items]);

  if (!order) return null;

  const currentItem = items[selectedIdx] || items[0] || order;
  const isMultiItem = items.length > 1;

  // Tracking Code extraction
  const trackingCode =
    currentItem.tracking_code ||
    currentItem.tracking_id ||
    currentItem.consignment_id ||
    order.tracking_code ||
    null;

  // Courier details
  const courierName =
    currentItem.courier_name || order.courier_name || "Courier Delivery";
  const courierStatus =
    currentItem.courier_status || order.courier_status || "pending";
  const isPending =
    courierStatus !== "collected" &&
    courierStatus !== "cancelled" &&
    !currentItem.returned &&
    !order.returned;
  const isCollected = courierStatus === "collected";
  const isCancelled =
    courierStatus === "cancelled" || currentItem.returned || order.returned;

  // Customer details
  const customer =
    currentItem.parties ||
    order.parties ||
    currentItem.customer ||
    order.customer ||
    null;
  const custName =
    customer?.name || (lang === "bn" ? "সাধারণ কাস্টমার" : "Online Customer");
  const custPhone = customer?.phone || currentItem.phone || order.phone || "";
  const custAddress =
    customer?.address || currentItem.address || order.address || "";

  // Note
  const orderNote = currentItem.note || order.note || "";

  // Financial calculations for current selected custom order
  const itemQty = Number(currentItem.qty) || 1;
  const itemSellPrice = Number(currentItem.sell_price) || 0;
  const itemBuyPrice = Number(currentItem.buy_price) || 0;
  const itemTotal = itemSellPrice * itemQty;
  const itemProfit =
    currentItem.profit !== undefined &&
    currentItem.profit !== null &&
    !isNaN(Number(currentItem.profit))
      ? Number(currentItem.profit)
      : (itemSellPrice - itemBuyPrice) * itemQty;

  const invNo = currentItem.cart_id
    ? `INV-${currentItem.cart_id.slice(-6).toUpperCase()}`
    : currentItem.id
    ? `INV-${currentItem.id.slice(-6).toUpperCase()}`
    : "INV-SALE";

  const handleCopyTracking = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(String(trackingCode).trim());
    setCopied(true);
    toast.success(
      lang === "bn"
        ? "ট্র্যাকিং নম্বর কপি করা হয়েছে!"
        : "Tracking code copied to clipboard!"
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintCurrent = () => {
    try {
      printPwaInvoice({
        businessName: user?.business_name || "Dream Fashion",
        userEmail: user?.business_emails || user?.email || "",
        shopAddress: user?.business_address || "",
        shopPhoneNumbers: user?.business_phone_numbers || "",
        pageSize: user?.invoice_page_size || "58mm",
        terms: user?.invoice_terms || "",
        invoiceNo: invNo,
        invoiceDate: fmtDateTime(currentItem.created_at || order.created_at),
        customerName: custName,
        paymentMode: `COURIER [${courierName}]`,
        items: [
          {
            product: {
              id: currentItem.product_id || undefined,
              name: currentItem.product_name,
            },
            qty: itemQty,
            sellPrice: itemSellPrice,
          },
        ],
        subtotal: itemTotal,
        discountAmount: Number(currentItem.discount) || 0,
        total: itemTotal,
        paidAmount: isCollected ? itemTotal : Number(currentItem.paid_amount) || 0,
        due: isCollected ? 0 : Number(currentItem.due_amount) || itemTotal,
      });
      toast.success(
        lang === "bn" ? "ইনভয়েস প্রিন্ট প্রস্তুত হচ্ছে!" : "Opening invoice print view!"
      );
    } catch (err: any) {
      toast.error(err?.message || "Print failed");
    }
  };

  const handleApproveCurrent = async () => {
    setActionBusy(true);
    try {
      await approveCourierPaymentFn({ data: { id: currentItem.id } });
      toast.success(
        lang === "bn"
          ? "কুরিয়ার পেমেন্ট সফলভাবে ক্যাশবক্সে জমা হয়েছে!"
          : "Courier payment collected and deposited into Cashbox!"
      );
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelCurrent = async () => {
    setActionBusy(true);
    try {
      await cancelCourierOrderFn({ data: { id: currentItem.id } });
      toast.success(
        lang === "bn"
          ? "কুরিয়ার অর্ডার বাতিল এবং স্টক ফিরিয়ে দেওয়া হয়েছে!"
          : "Courier order cancelled and stock restored!"
      );
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const cleanPhone = custPhone.replace(/[^0-9+]/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-4 sm:p-5 rounded-2xl max-h-[92vh] overflow-y-auto font-hind">
        <DialogHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Truck className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-hind text-foreground flex items-center gap-1.5">
                  <span>{lang === "bn" ? "অর্ডার ও কুরিয়ার বিবরণ" : "Order & Courier Details"}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    {invNo}
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {fmtDateTime(currentItem.created_at || order.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isPending ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 uppercase bg-amber-500/15 text-amber-800 dark:text-amber-300 animate-pulse flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{lang === "bn" ? "পেন্ডিং কুরিয়ার" : "Pending"}</span>
                </span>
              ) : isCollected ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 uppercase bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  <span>{lang === "bn" ? "ক্যাশবক্সে জমা" : "Paid & Collected"}</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/40 uppercase bg-rose-500/15 text-rose-800 dark:text-rose-300 line-through flex items-center gap-1">
                  <XCircle className="size-3" />
                  <span>{lang === "bn" ? "বাতিলকৃত" : "Cancelled"}</span>
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Multi-Item Order Custom Item Selector */}
        {isMultiItem && (
          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground flex items-center gap-1">
                <Layers className="size-3.5 text-primary" />
                <span>{lang === "bn" ? "এই অর্ডারের কাস্টম আইটেম বেছে নিন:" : "Select Custom Order / Item:"}</span>
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                ({selectedIdx + 1}/{items.length})
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {items.map((it, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={it.id || idx}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold shrink-0 transition-all border cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card text-foreground hover:bg-muted border-border/80"
                    }`}
                  >
                    <span>{idx + 1}. {it.product_name}</span>
                    <span className="font-mono text-[10px] opacity-80">×{it.qty}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Custom Order Detailed Information */}
        <div className="space-y-3 py-1 text-xs">
          {/* Tracking Bar with 1-Click Copy */}
          {trackingCode && (
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Truck className="size-4 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    {lang === "bn" ? "অনলাইন কুরিয়ার ট্র্যাকিং কোড" : "Courier Tracking Code"}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-foreground truncate block">
                    {trackingCode}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyTracking}
                className="h-7 px-2.5 text-xs font-bold rounded-lg border-purple-500/30 bg-background hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 gap-1 cursor-pointer shrink-0"
              >
                {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copied ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}</span>
              </Button>
            </div>
          )}

          {/* Product & Financial Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-[10.5px] text-muted-foreground block">{lang === "bn" ? "পণ্য" : "Product"}</span>
              <span className="font-bold text-foreground text-xs truncate block" title={currentItem.product_name}>
                {currentItem.product_name}
              </span>
            </div>

            <div className="p-2 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-[10.5px] text-muted-foreground block">{lang === "bn" ? "পরিমাণ" : "Qty"}</span>
              <span className="font-bold font-mono text-foreground text-xs block">
                {itemQty} {lang === "bn" ? "টি" : "pcs"}
              </span>
            </div>

            <div className="p-2 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-[10.5px] text-muted-foreground block">{lang === "bn" ? "বিক্রয় মূল্য" : "Sell Price"}</span>
              <span className="font-bold font-serif text-foreground text-xs block">
                {fmtMoney(itemTotal)}
              </span>
            </div>

            <div className="p-2 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-[10.5px] text-muted-foreground block">{lang === "bn" ? "অর্জিত লাভ" : "Net Profit"}</span>
              <span className="font-bold font-serif text-emerald-600 dark:text-emerald-400 text-xs block">
                {fmtMoney(itemProfit)}
              </span>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="p-3 bg-card rounded-xl border border-border/80 space-y-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <User className="size-3 text-primary" />
              <span>{lang === "bn" ? "গ্রাহক / কাস্টমার তথ্য" : "Customer Information"}</span>
            </span>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <span className="font-bold text-sm text-foreground block truncate">{custName}</span>
                {custAddress && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{custAddress}</span>
                  </span>
                )}
              </div>

              {custPhone && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Phone className="size-3" />
                    <span>{custPhone}</span>
                  </a>

                  <a
                    href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20"
                    title="WhatsApp"
                  >
                    <MessageSquare className="size-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Courier & Delivery Method Details */}
          <div className="p-3 bg-card rounded-xl border border-border/80 space-y-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Truck className="size-3 text-primary" />
              <span>{lang === "bn" ? "কুরিয়ার ও ডেলিভারি বিবরণ" : "Courier & Delivery Details"}</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10.5px] text-muted-foreground block">{lang === "bn" ? "কুরিয়ার সার্ভিস:" : "Courier Service:"}</span>
                <span className="font-bold text-foreground">{courierName}</span>
              </div>

              <div>
                <span className="text-[10.5px] text-muted-foreground block">{lang === "bn" ? "ডেলিভারি অবস্থা:" : "Delivery Status:"}</span>
                <span className={`font-bold ${
                  isCollected ? "text-emerald-600" : isCancelled ? "text-rose-600" : "text-amber-600"
                }`}>
                  {isCollected ? (lang === "bn" ? "কালেক্টেড (ক্যাশবক্সে জমা)" : "Collected") :
                   isCancelled ? (lang === "bn" ? "বাতিলকৃত" : "Cancelled") :
                   (lang === "bn" ? "কুরিয়ার অপেক্ষমাণ" : "Pending Courier")}
                </span>
              </div>
            </div>

            {orderNote && (
              <div className="pt-1.5 border-t border-border/60 text-[11px] text-muted-foreground italic">
                <strong>{lang === "bn" ? "নোট / ডেলিভারি ঠিকানা:" : "Note / Address:"}</strong> {orderNote}
              </div>
            )}
          </div>
        </div>

        {/* Direct Action Buttons Footer */}
        <DialogFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintCurrent}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 cursor-pointer flex-1 sm:flex-initial"
            >
              <Printer className="size-3.5 text-primary" />
              <span>{lang === "bn" ? "রসিদ প্রিন্ট" : "Print Invoice"}</span>
            </Button>

            {onEdit && !isCancelled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(currentItem);
                }}
                className="h-8 text-xs font-bold rounded-xl gap-1 cursor-pointer flex-1 sm:flex-initial"
              >
                <Pencil className="size-3.5 text-muted-foreground" />
                <span>{lang === "bn" ? "এডিট" : "Edit"}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            {isPending && (
              <>
                <Button
                  type="button"
                  size="sm"
                  style={{ backgroundColor: "#ADFF2F" }}
                  onClick={handleApproveCurrent}
                  disabled={actionBusy}
                  className="h-8 px-3 text-xs font-bold rounded-xl text-zinc-950 gap-1 border border-black/20 hover:brightness-95 transition-all shadow-2xs cursor-pointer flex-1 sm:flex-initial"
                >
                  <PackageCheck className="size-3.5 text-zinc-950" />
                  <span>{lang === "bn" ? "✓ গ্রহণ ও ক্যাশবক্স জমা" : "Accept & Collect"}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleCancelCurrent}
                  disabled={actionBusy}
                  className="h-8 px-2.5 text-xs font-bold rounded-xl gap-1 cursor-pointer flex-1 sm:flex-initial"
                >
                  <RotateCcw className="size-3.5" />
                  <span>{lang === "bn" ? "বাতিল" : "Cancel"}</span>
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-semibold rounded-xl"
            >
              {lang === "bn" ? "বন্ধ করুন" : "Close"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
