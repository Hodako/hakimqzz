"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductSearchSelect } from "@/components/product-search";
import { CustomerSearchSelect } from "@/components/customer-search";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { getCustomers, getProducts, type Product } from "@/lib/queries";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { createSaleFn, createCustomerFn, steadfastCreateOrderFn, steadfastFraudCheckFn } from "@/lib/rpc";
import { getBusinessSettingsFn } from "@/lib/rpc-admin";
import { Plus, Minus, Trash2, Scan, Printer, History, Banknote, Smartphone, CreditCard, DollarSign, ShoppingCart, Truck, PackageCheck, Share2, Split, ChevronDown, ChevronUp, RotateCcw, CheckCircle2, Sparkles, Zap, Eye, ShieldCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { safeUUID } from "@/lib/utils";
import { printPwaInvoice, downloadPwaInvoicePdf } from "@/lib/invoice-printer";
import { InvoicePreviewDialog } from "@/components/invoice-preview-dialog";
import { playTapSound, playScanSuccessSound, playSaleSuccessSound, playErrorSound } from "@/lib/audio";
import { getWhatsAppInvoiceUrl } from "@/lib/whatsapp-helper";
import { sendDesktopWhatsAppIfAuto } from "@/lib/desktop-whatsapp";
import { createHidScanBuffer, findProductsByScannedCode, getPosHardwareSettings } from "@/lib/pos-hardware";
import {
  getDivisions,
  getDistrictsByDivision,
  getUpazilasByDistrict,
  getUnionsByUpazila,
  buildSteadfastAddress,
} from "@/lib/bd-geo-data";

type CartLine = { productId: string; qty: string; sellPrice: string; discount: string };
export type SalePaymentType = "cash" | "bkash" | "bank" | "credit" | "online" | "split";

function BkashLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="-6.6741 -11.07275 57.8422 66.4365"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none">
        <path
          fill="#DF146E"
          d="M42.31 44.291H2.182C.981 44.291 0 43.308 0 42.107V2.186C0 .982.981 0 2.182 0H42.31c1.203 0 2.184.982 2.184 2.186v39.921c0 1.201-.981 2.184-2.184 2.184"
        />
        <path
          fill="#FFF"
          d="M31.894 24.251l-14.107-2.246 1.909 8.329zm.572-.682L21.374 8.16l-3.623 13.106zm-15.402-2.482L5.441 6.239l15.221 1.819zm-5.639-6.154l-6.449-6.08h1.695zm24.504 1.15L33.2 23.486l-4.426-6.118zM21.417 30.232l10.71-4.3.454-1.365zm-8.933 7.821l4.589-16.102 2.326 10.479zm24.099-21.914l-1.128 3.056 4.059-.07z"
        />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sale Dialog Component
// ─────────────────────────────────────────────────────────────────────────────
export function SaleDialog({
  open, onOpenChange, presetType, presetProductId, presetCart,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  presetType?: SalePaymentType; presetProductId?: string;
  presetCart?: { productId: string; qty: string; sellPrice: string; discount?: string }[];
}) {
  const { lang, t } = useT();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  const [type, setType] = useState<SalePaymentType>(presetType ?? "cash");
  const [partyId, setPartyId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [draft, setDraft] = useState<CartLine>({ productId: "", qty: "1", sellPrice: "", discount: "" });
  const [paid, setPaid] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitBkash, setSplitBkash] = useState("");
  const [splitBank, setSplitBank] = useState("");
  const [mobileSplitOpen, setMobileSplitOpen] = useState(true);
  const [courierName, setCourierName] = useState("Steadfast Courier");
  const [trackingCode, setTrackingCode] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [autoSendSteadfast, setAutoSendSteadfast] = useState(true);
  const [sfFraudResult, setSfFraudResult] = useState<any | null>(null);
  const [sfFraudBusy, setSfFraudBusy] = useState(false);

  // BD Geographic Hierarchy for Online Sales & SteadFast Delivery
  const [division, setDivision] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [upazila, setUpazila] = useState("");
  const [union, setUnion] = useState("");
  const [customUnion, setCustomUnion] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [manualRecipientName, setManualRecipientName] = useState("");
  const [manualRecipientPhone, setManualRecipientPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [onlineDeliveryMode, setOnlineDeliveryMode] = useState<"manual" | "auto">("manual");

  const effectiveUnion = customUnion.trim() || union;
  const builtFullAddress = useMemo(() => {
    return buildSteadfastAddress({
      division,
      district,
      upazila,
      union: effectiveUnion,
      addressDetails,
    });
  }, [division, district, upazila, effectiveUnion, addressDetails]);

  const divisions = useMemo(() => getDivisions(), []);
  const districts = useMemo(() => getDistrictsByDivision(division), [division]);
  const upazilas = useMemo(() => getUpazilasByDistrict(district), [district]);
  const unions = useMemo(() => getUnionsByUpazila(district, upazila), [district, upazila]);

  const handleDivisionChange = (newDiv: string) => {
    setDivision(newDiv);
    const firstDist = getDistrictsByDivision(newDiv)[0]?.name || "";
    setDistrict(firstDist);
    setUpazila("");
    setUnion("");
    setCustomUnion("");
  };

  const handleDistrictChange = (newDist: string) => {
    setDistrict(newDist);
    setUpazila("");
    setUnion("");
    setCustomUnion("");
  };

  const handleUpazilaChange = (newUp: string) => {
    setUpazila(newUp);
    setUnion("");
    setCustomUnion("");
  };

  const bizSettings = useQuery({ queryKey: ["business-settings"], queryFn: getBusinessSettingsFn });
  const steadfastEnabled = Boolean((bizSettings.data?.business as any)?.steadfast_enabled);
  const [finalDiscount, setFinalDiscount] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scannerSuffix, setScannerSuffix] = useState<"Enter" | "Tab" | "None">("Enter");
  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastAddToCartTimeRef = useRef(0);

  useEffect(() => {
    setScannerSuffix(getPosHardwareSettings().scannerSuffix);
  }, [open]);

  const { data: products = [] } = useCachedQuery(["products"], getProducts);
  const { data: rawCustomers = [] } = useCachedQuery(["customers"], getCustomers);
  const customers = rawCustomers.filter((c: any) => c.type !== "supplier" && !c.is_supplier);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [addingCust, setAddingCust] = useState(false);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);

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

  const handleBarcodeScan = useCallback((scannedCode: string) => {
    const raw = String(scannedCode || "").trim();
    if (!raw) return false;

    const matches = findProductsByScannedCode(products, raw);
    const prod = matches[0];

    if (!prod) {
      playErrorSound();
      toast.error(
        lang === "bn"
          ? `বারকোড (${raw}) দ্বারা পণ্য পাওয়া যায়নি`
          : `No product found for Barcode: ${raw}`
      );
      return false;
    }

    if (matches.length > 1) {
      toast.info(
        lang === "bn"
          ? `${matches.length}টি পণ্যের কোড মিলেছে, প্রথম পণ্যটি কার্টে যোগ করা হয়েছে: ${prod.name}`
          : `${matches.length} products matched this code; added first match: ${prod.name}`
      );
    }

    playScanSuccessSound();

    let newQty = 1;
    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === prod.id);
      if (idx !== -1) {
        const updated = [...prev];
        const existingQty = Number(updated[idx].qty) || 0;
        newQty = existingQty + 1;
        updated[idx] = { ...updated[idx], qty: String(newQty) };
        return updated;
      } else {
        newQty = 1;
        return [...prev, {
          productId: prod.id,
          qty: "1",
          sellPrice: String(prod.sell_price || ""),
          discount: ""
        }];
      }
    });

    toast.success(
      lang === "bn"
        ? `কার্টে যোগ হয়েছে: ${prod.name} (পরিমাণ: ${newQty})`
        : `Added to cart: ${prod.name} (Qty: ${newQty})`
    );

    setDraft({ productId: "", qty: "1", sellPrice: "", discount: "" });
    return true;
  }, [products, lang]);

  const handleBarcodeInputSubmit = useCallback((rawCode?: string) => {
    const code = (rawCode ?? scanInput).trim();
    if (!code) return;
    handleBarcodeScan(code);
    setScanInput("");
    setTimeout(() => scanInputRef.current?.focus(), 50);
  }, [scanInput, handleBarcodeScan]);

  const wasOpenRef = useRef(false);
  const lastPresetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setType(presetType ?? "cash");
      setPartyId("");
      setPaid("");
      setSplitCash("");
      setSplitBkash("");
      setSplitBank("");
      setFinalDiscount("");
      setCourierName("Steadfast Courier");
      setTrackingCode("");
      setManualRecipientName("");
      setManualRecipientPhone("");
      setAddressDetails("");
      setDeliveryNote("");
      setSfFraudResult(null);
      setDivision("Dhaka");
      setDistrict("Dhaka");
      setUpazila("");
      setUnion("");
      setCustomUnion("");
      setOnlineDeliveryMode("manual");
      if (presetCart && presetCart.length > 0) {
        setCart(presetCart.map(x => ({ ...x, discount: x.discount ?? "" })));
      } else if (presetProductId) {
        lastPresetIdRef.current = presetProductId;
        const p = products.find(x => x.id === presetProductId);
        setCart([{ productId: presetProductId, qty: "1", sellPrice: p ? String(p.sell_price || "") : "", discount: "" }]);
      } else {
        setCart([]);
      }
      setDraft({ productId: "", qty: "1", sellPrice: "", discount: "" });
      setScanInput("");
      setTimeout(() => scanInputRef.current?.focus(), 80);
    } else if (open && presetProductId && presetProductId !== lastPresetIdRef.current) {
      // When a new presetProductId arrives while the dialog is already open (e.g. repeated scans)
      lastPresetIdRef.current = presetProductId;
      const p = products.find(x => x.id === presetProductId);
      if (p) {
        setCart(prev => {
          const idx = prev.findIndex(item => item.productId === presetProductId);
          if (idx !== -1) {
            const updated = [...prev];
            const existingQty = Number(updated[idx].qty) || 0;
            updated[idx] = { ...updated[idx], qty: String(existingQty + 1) };
            return updated;
          } else {
            return [...prev, {
              productId: presetProductId,
              qty: "1",
              sellPrice: String(p.sell_price || ""),
              discount: ""
            }];
          }
        });
      }
    } else if (!open) {
      wasOpenRef.current = false;
      lastPresetIdRef.current = undefined;
    }
  }, [open, presetType, presetProductId, presetCart, products]);

  // Listen for global product add events (e.g. from dashboard scanner)
  useEffect(() => {
    if (!open) return;
    const handleGlobalAdd = (e: any) => {
      const pid = e?.detail?.productId;
      const p = e?.detail?.product || products.find(x => x.id === pid);
      if (p && pid) {
        setCart(prev => {
          const idx = prev.findIndex(item => item.productId === pid);
          if (idx !== -1) {
            const updated = [...prev];
            const existingQty = Number(updated[idx].qty) || 0;
            updated[idx] = { ...updated[idx], qty: String(existingQty + 1) };
            return updated;
          } else {
            return [...prev, {
              productId: pid,
              qty: "1",
              sellPrice: String(p.sell_price || ""),
              discount: ""
            }];
          }
        });
      }
    };
    window.addEventListener("df-add-product-to-sale", handleGlobalAdd);
    return () => window.removeEventListener("df-add-product-to-sale", handleGlobalAdd);
  }, [open, products]);

  // Ultra-fast Hardware Barcode Scanner listener (USB / Bluetooth HID guns) - Classic-World System
  useEffect(() => {
    if (!open) return;

    const hidBuffer = createHidScanBuffer(scannerSuffix);
    const handleHardwareScannerKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.id === "sale-barcode-input") return;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as any).isContentEditable);
      if (isInput) return;

      const scanned = hidBuffer.consumeKey(e, handleBarcodeScan);
      if (scanned) {
        e.preventDefault();
        e.stopPropagation();
        handleBarcodeScan(scanned);
      }
    };

    window.addEventListener("keydown", handleHardwareScannerKeyDown, true);
    return () => {
      hidBuffer.clear();
      window.removeEventListener("keydown", handleHardwareScannerKeyDown, true);
    };
  }, [open, handleBarcodeScan, scannerSuffix]);

  function lineTotal(line: CartLine) {
    const p = products.find(x => x.id === line.productId);
    if (!p) return 0;
    const sell = Number(line.sellPrice) || p.sell_price || 0;
    const disc = Number(line.discount) || 0;
    const finalPrice = Math.max(sell - disc, 0);
    return finalPrice * (Number(line.qty) || 0);
  }

  const rawSellTotal = cart.reduce((a, l) => a + lineTotal(l), 0);
  const finalDiscountNum = Math.min(Math.max(0, Number(finalDiscount) || 0), rawSellTotal);
  const sellTotal = Math.max(0, rawSellTotal - finalDiscountNum);
  const profitTotal = Math.max(0, cart.reduce((a, l) => {
    const p = products.find(x => x.id === l.productId);
    const sell = Number(l.sellPrice) || (p ? p.sell_price : 0) || 0;
    const disc = Number(l.discount) || 0;
    const finalPrice = Math.max(sell - disc, 0);
    const qty = Number(l.qty) || 1;
    const buy = Number(p?.buy_price) || 0;
    return a + (finalPrice - buy) * qty;
  }, 0) - finalDiscountNum);

  const isFullPaid = type === "cash" || type === "bkash" || type === "bank";
  const splitCashNum = Math.max(0, Number(splitCash) || 0);
  const splitBkashNum = Math.max(0, Number(splitBkash) || 0);
  const splitBankNum = Math.max(0, Number(splitBank) || 0);
  const totalSplitPaid = splitCashNum + splitBkashNum + splitBankNum;

  const paidNum = type === "split"
    ? totalSplitPaid
    : (type === "online" ? 0 : (isFullPaid ? sellTotal : Number(paid) || 0));

  const due = Math.max(sellTotal - paidNum, 0);

  function handleFooterPaymentSwitch(nextType: SalePaymentType) {
    setType(nextType);
  }

  function addToCart() {
    const now = Date.now();
    if (now - lastAddToCartTimeRef.current < 450) {
      return;
    }

    if (!draft.productId) {
      playErrorSound();
      return toast.error(t("select_product"));
    }
    const p = products.find(x => x.id === draft.productId);
    const qty = Number(draft.qty) || 1;
    if (qty <= 0) {
      playErrorSound();
      return toast.error(t("qty") + " > 0");
    }
    const sell = Number(draft.sellPrice) || (p ? p.sell_price : 0);
    if (!sell || sell <= 0) {
      playErrorSound();
      return toast.error(t("sell_price") + " " + t("required"));
    }
    const disc = Number(draft.discount) || 0;
    if (disc < 0) {
      playErrorSound();
      return toast.error(lang === "bn" ? "ডিসকাউন্ট নেতিবাচক হতে পারে না" : "Discount cannot be negative");
    }

    lastAddToCartTimeRef.current = now;
    playScanSuccessSound();
    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === draft.productId);
      if (idx !== -1) {
        const next = [...prev];
        const prevQty = Number(next[idx].qty) || 0;
        next[idx] = {
          ...next[idx],
          qty: String(prevQty + qty),
          sellPrice: String(sell),
          discount: String(disc),
        };
        return next;
      }
      return [...prev, { productId: draft.productId, qty: String(qty), sellPrice: String(sell), discount: String(disc) }];
    });

    toast.success(lang === "bn" ? `কার্টে যুক্ত: ${p?.name || ""}` : `Added to cart: ${p?.name || ""}`);
    setDraft({ productId: "", qty: "1", sellPrice: "", discount: "" });
  }

  useEffect(() => {
    if (!open) return;

    const handleDialogKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

      if (e.code === "Space" || e.key === " ") {
        const isTextInput = isInput && (target as HTMLInputElement).type === "text" && (target as HTMLInputElement).value.length > 0;
        if (!isTextInput && cart.length > 0 && !draft.productId && !busy) {
          e.preventDefault();
          submit(e as any, "print");
        }
      }

      if (e.key === "Enter") {
        if (draft.productId) {
          e.preventDefault();
          addToCart();
        }
        // Never auto-submit the whole order on Enter while interacting with product drafts
      }
    };

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => window.removeEventListener("keydown", handleDialogKeyDown);
  }, [open, draft.productId, cart, busy, type, partyId, paidNum, due]);

  async function submit(e: React.FormEvent, action: "print" | "download" | "none" = "none") {
    e.preventDefault();
    if (!user || cart.length === 0) {
      playErrorSound();
      return toast.error(t("select_product"));
    }

    // STRICT SELL PRICE VALIDATION: Block sale from recording if ANY item has empty or <= 0 price
    const emptyPriceIdx = cart.findIndex((line) => {
      const pStr = String(line.sellPrice ?? "").trim();
      const num = Number(pStr);
      return pStr === "" || isNaN(num) || num <= 0;
    });

    if (emptyPriceIdx !== -1) {
      playErrorSound();
      const p = products.find((x) => x.id === cart[emptyPriceIdx].productId);
      const name = p?.name ? `"${p.name}"` : `আইটেম #${emptyPriceIdx + 1}`;
      toast.error(
        lang === "bn"
          ? `${name}-এর বিক্রয় মূল্য খালি বা ০ রাখা যাবে না! অনুগ্রহ করে সঠিক দর লিখুন।`
          : `Sell price for ${name} cannot be empty or zero! Please enter a valid price.`
      );
      const el = document.querySelector(`[data-cart-sell-price-index="${emptyPriceIdx}"]`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
      return;
    }

    if ((type === "credit" || (type === "split" && due > 0)) && !partyId) {
      playErrorSound();
      return toast.error(lang === "bn" ? "বকেয়া থাকার কারণে কাস্টমার নির্বাচন করা আবশ্যক" : "Customer is required when there is remaining due");
    }
    setBusy(true);
    try {
      const cartId = safeUUID();
      const changeAmount = (type === "split" && totalSplitPaid > sellTotal)
        ? totalSplitPaid - sellTotal
        : 0;

      // Net amounts actually received/retained after returning physical cash change
      let netCash = splitCashNum;
      let netBkash = splitBkashNum;
      let netBank = splitBankNum;

      if (type === "split" && changeAmount > 0) {
        const cashDeduction = Math.min(netCash, changeAmount);
        netCash -= cashDeduction;
        const remainderChange = changeAmount - cashDeduction;
        if (remainderChange > 0) {
          const bkashDeduction = Math.min(netBkash, remainderChange);
          netBkash -= bkashDeduction;
          const bankDeduction = Math.min(netBank, remainderChange - bkashDeduction);
          netBank -= bankDeduction;
        }
      }

      const effectivePaid = type === "split"
        ? Math.min(totalSplitPaid, sellTotal)
        : (type === "online" ? 0 : (isFullPaid ? sellTotal : Math.min(Number(paid) || 0, sellTotal)));

      let remainingCash = type === "split" ? netCash : (type === "cash" ? sellTotal : 0);
      let remainingBkash = type === "split" ? netBkash : (type === "bkash" ? sellTotal : 0);
      let remainingBank = type === "split" ? netBank : (type === "bank" ? sellTotal : 0);
      let remainingPaid = (type === "credit") ? effectivePaid : (type === "split" ? (netCash + netBkash + netBank) : (type === "online" ? 0 : sellTotal));
      let remainingDue = (type === "credit" || type === "split") ? due : (type === "online" ? sellTotal : 0);
      let remainingFinalDisc = finalDiscountNum;

      let firstCreatedSaleId: string | null = null;
      for (let i = 0; i < cart.length; i++) {
        const line = cart[i];
        const product = products.find(p => p.id === line.productId);
        if (!product) {
          throw new Error(lang === "bn" ? "কার্টের একটি পণ্য ডাটাবেজে পাওয়া যায়নি!" : "A product in your cart could not be found!");
        }
        const qtyNum = Math.max(1, Number(line.qty) || 1);
        const rawSellPrice = Number(line.sellPrice);
        if (isNaN(rawSellPrice) || rawSellPrice <= 0) {
          throw new Error(lang === "bn" ? `${product.name}-এর বিক্রয় মূল্য সঠিক নয়!` : `Invalid sell price for ${product.name}!`);
        }
        const disc = Math.max(0, Number(line.discount) || 0);
        const finalUnitSell = Math.max(rawSellPrice - disc, 0);
        const lineItemSell = finalUnitSell * qtyNum;

        let allocatedFinalDisc = 0;
        if (remainingFinalDisc > 0) {
          if (i === cart.length - 1) {
            allocatedFinalDisc = Math.min(remainingFinalDisc, lineItemSell);
            remainingFinalDisc = Math.max(0, remainingFinalDisc - allocatedFinalDisc);
          } else {
            const ratio = rawSellTotal > 0 ? lineItemSell / rawSellTotal : 1 / cart.length;
            allocatedFinalDisc = Math.min(Math.round(finalDiscountNum * ratio), remainingFinalDisc, lineItemSell);
            remainingFinalDisc -= allocatedFinalDisc;
          }
        }

        const lineSell = Math.max(lineItemSell - allocatedFinalDisc, 0);
        const lineDiscTotal = (disc * qtyNum) + allocatedFinalDisc;
        const lineProfit = lineSell - (Number(product.buy_price || 0) * qtyNum);

        // Proportional paid & due distribution
        let linePaid = 0;
        let lineDue = 0;
        let lineCash = 0;
        let lineBkash = 0;
        let lineBank = 0;

        if (type === "online") {
          linePaid = 0;
          lineDue = lineSell;
        } else if (type === "split") {
          if (i === cart.length - 1) {
            lineCash = Math.max(remainingCash, 0);
            lineBkash = Math.max(remainingBkash, 0);
            lineBank = Math.max(remainingBank, 0);
            linePaid = Math.min(lineCash + lineBkash + lineBank, lineSell);
            lineDue = Math.max(lineSell - linePaid, 0);
          } else {
            const ratio = sellTotal > 0 ? lineSell / sellTotal : 1 / cart.length;
            lineCash = Math.min(Math.round(netCash * ratio), remainingCash);
            lineBkash = Math.min(Math.round(netBkash * ratio), remainingBkash);
            lineBank = Math.min(Math.round(netBank * ratio), remainingBank);
            linePaid = Math.min(lineCash + lineBkash + lineBank, lineSell);
            lineDue = Math.max(lineSell - linePaid, 0);
            remainingCash -= lineCash;
            remainingBkash -= lineBkash;
            remainingBank -= lineBank;
            remainingDue -= lineDue;
          }
        } else if (type === "credit") {
          if (i === cart.length - 1) {
            linePaid = Math.min(Math.max(remainingPaid, 0), lineSell);
            lineDue = Math.max(lineSell - linePaid, 0);
            lineCash = linePaid;
          } else {
            const ratio = sellTotal > 0 ? lineSell / sellTotal : 1 / cart.length;
            linePaid = Math.min(Math.round(effectivePaid * ratio), remainingPaid, lineSell);
            lineDue = Math.max(lineSell - linePaid, 0);
            lineCash = linePaid;
            remainingPaid -= linePaid;
            remainingDue -= lineDue;
          }
        } else {
          linePaid = lineSell;
          lineDue = 0;
          if (type === "cash") lineCash = lineSell;
          else if (type === "bkash") lineBkash = lineSell;
          else if (type === "bank") lineBank = lineSell;
        }

        const createdSale = await createSaleFn({
          data: {
            product_id: product.id,
            product_name: product.name,
            qty: qtyNum,
            buy_price: Number(product.buy_price) || 0,
            sell_price: rawSellPrice,
            discount: lineDiscTotal,
            profit: lineProfit,
            type,
            party_id: partyId || null,
            paid_amount: linePaid,
            due_amount: lineDue,
            split_cash: lineCash,
            split_bkash: lineBkash,
            split_bank: lineBank,
            cart_id: cartId,
            courier_name: type === "online" ? courierName : undefined,
            tracking_code: type === "online" ? trackingCode : undefined,
            courier_status: type === "online" ? "pending" : undefined,
            note: (builtFullAddress || customerAddress) ? `Address: ${builtFullAddress || customerAddress}${deliveryNote ? ` | Note: ${deliveryNote}` : ""}` : undefined,
            recipient_name: manualRecipientName || (customers.find((c: any) => c.id === partyId) as any)?.name || undefined,
            recipient_phone: manualRecipientPhone || (customers.find((c: any) => c.id === partyId) as any)?.phone || undefined,
            recipient_address: builtFullAddress || customerAddress || (customers.find((c: any) => c.id === partyId) as any)?.address || undefined,
          },
        });
        if (!firstCreatedSaleId && createdSale?.id) {
          firstCreatedSaleId = createdSale.id;
        }
      }

      if (type === "online" && steadfastEnabled && autoSendSteadfast && firstCreatedSaleId && courierName.toLowerCase().includes("steadfast")) {
        const cust = customers.find((c: any) => c.id === partyId);
        const recName = String(manualRecipientName || cust?.name || "Customer").trim();
        const recPhone = String(manualRecipientPhone || (cust as any)?.phone || "").trim();
        const recAddr = String(builtFullAddress || customerAddress || (cust as any)?.address || "").trim();
        if (recPhone && recAddr) {
          try {
            const sfRes = await steadfastCreateOrderFn({
              data: {
                saleId: firstCreatedSaleId,
                recipient_name: recName,
                recipient_phone: recPhone,
                recipient_address: recAddr,
                cod_amount: Math.max(0, Math.round(sellTotal)),
                note: deliveryNote || undefined,
              },
            });
            if (sfRes?.consignment?.tracking_code) {
              setTrackingCode(sfRes.consignment.tracking_code);
              toast.success(
                lang === "bn"
                  ? `SteadFast পার্সেল বুক হয়েছে! Tracking: ${sfRes.consignment.tracking_code}`
                  : `SteadFast booked! Tracking: ${sfRes.consignment.tracking_code}`
              );
            }
          } catch (sfErr: any) {
            toast.warning(`Sale saved, SteadFast dispatch skipped: ${sfErr?.message || "Check phone/address"}`);
          }
        }
      }

      // Desktop Client-Compute WhatsApp Auto-Send (if Auto Mode is active)
      const waCust = customers.find((c: any) => c.id === partyId);
      const waPhone = String((waCust as any)?.phone || "").trim();
      if (waPhone) {
        const itemsSummary = cart
          .map((l) => {
            const p = products.find((x) => x.id === l.productId);
            return `${p?.name || "Item"} ×${l.qty}`;
          })
          .join(", ");

        const isCashSale = type === "cash" || !type;
        const paidNum = isCashSale
          ? Math.round(sellTotal)
          : type === "credit"
          ? Math.round(Number(paid) || 0)
          : Math.round(sellTotal);
        const dueNum = isCashSale ? 0 : Math.max(0, Math.round(sellTotal - paidNum));

        void sendDesktopWhatsAppIfAuto(type === "online" ? "online" : "sale", {
          phone: waPhone,
          shopName: user?.business_name,
          customerName: waCust?.name || "Customer",
          itemsSummary,
          amount: Math.round(sellTotal),
          paidAmount: paidNum,
          dueAmount: dueNum,
          paymentType: type,
          trackingCode: type === "online" ? (trackingCode || null) : null,
        });
      }

      await qc.invalidateQueries({ queryKey: ["sales"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      await qc.invalidateQueries({ queryKey: ["party-detail"] });
      await qc.invalidateQueries({ queryKey: ["cashbox"] });

      playSaleSuccessSound();

      let paymentModeStr = "CASH (নগদ)";
      if (type === "online") {
        paymentModeStr = `COURIER [${courierName}]`;
      } else if (type === "bkash") {
        paymentModeStr = "BKASH (বিকাশ)";
      } else if (type === "bank") {
        paymentModeStr = "BANK (ব্যাংক)";
      } else if (type === "credit") {
        paymentModeStr = due > 0 ? `CREDIT (বাকী) [জমা: ৳${paidNum}]` : "CASH (নগদ)";
      } else if (type === "split") {
        const parts: string[] = [];
        if (splitCashNum > 0) parts.push(`নগদ: ৳${splitCashNum}`);
        if (splitBkashNum > 0) parts.push(`বিকাশ: ৳${splitBkashNum}`);
        if (splitBankNum > 0) parts.push(`ব্যাংক: ৳${splitBankNum}`);
        if (due > 0) parts.push(`বাকী: ৳${due}`);
        paymentModeStr = `SPLIT (${parts.join(" + ")})`;
      }

      const cust = customers.find(c => c.id === partyId);
      const waUrl = getWhatsAppInvoiceUrl({
        invoiceNo: `INV-${cartId.slice(-6).toUpperCase()}`,
        customerName: cust?.name || (lang === "bn" ? "সম্মানিত ক্রেতা" : "Valued Customer"),
        customerPhone: cust?.phone || "",
        shopName: user.business_name || user.full_name || "Dream Fashion",
        shopPhone: user.business_phone_numbers || "",
        items: cart.map(c => {
          const prod = products.find(p => p.id === c.productId);
          return {
            name: prod?.name || "Product",
            qty: Number(c.qty) || 1,
            price: Math.max((Number(c.sellPrice) || prod?.sell_price || 0) - (Number(c.discount) || 0), 0),
          };
        }),
        subtotal: rawSellTotal + cart.reduce((acc, c) => acc + ((Number(c.discount) || 0) * (Number(c.qty) || 1)), 0),
        discount: cart.reduce((acc, c) => acc + ((Number(c.discount) || 0) * (Number(c.qty) || 1)), 0) + finalDiscountNum,
        total: sellTotal,
        paidAmount: type === "online" ? 0 : paidNum,
        dueAmount: type === "online" ? sellTotal : due,
        paymentMethod: paymentModeStr,
      }, lang as any);

      toast.success(
        <div className="flex items-center justify-between gap-3 w-full">
          <span>{lang === "bn" ? "বিক্রয় সম্পন্ন হয়েছে!" : "Sale recorded successfully!"}</span>
          {cust?.phone && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shrink-0 inline-flex items-center gap-1 shadow-sm transition-colors"
            >
              <Share2 className="size-3" /> WhatsApp
            </a>
          )}
        </div>,
        { duration: 6000 }
      );

      const hwSettings = getPosHardwareSettings();
      if (action === "print" || (action === "none" && hwSettings.printMode === "automatic")) {
        const invoiceParams = {
          businessName: user.business_name || user.full_name || "Dream Fashion",
          userEmail: user.business_emails || user.email || "",
          shopAddress: user.business_address || "",
          shopPhoneNumbers: user.business_phone_numbers || "",
          pageSize: user.invoice_page_size || "80mm",
          pageWidth: user.invoice_page_width || "",
          pageHeight: user.invoice_page_height || "",
          invoiceFontSize: user.invoice_font_size || "16px",
          invoiceScale: user.invoice_scale || "100%",
          invoiceLineSpacing: user.invoice_line_spacing || "3px",
          invoiceNo: `INV-${cartId.slice(-6).toUpperCase()}`,
          invoiceDate: fmtDateTime(new Date()),
          cashierName: user.full_name || undefined,
          customerName: cust?.name || (lang === "bn" ? "সাধারণ কাস্টমার" : "Walk-in Customer"),
          customerPhone: cust?.phone || "",
          paymentMode: paymentModeStr,
          splitCash: type === "split" ? netCash : (type === "cash" ? paidNum : undefined),
          splitBkash: type === "split" ? netBkash : (type === "bkash" ? paidNum : undefined),
          splitBank: type === "split" ? netBank : (type === "bank" ? paidNum : undefined),
          items: cart.map(c => {
            const prod = products.find(p => p.id === c.productId);
            return {
              product: { id: prod?.id, name: prod?.name || "Product" },
              qty: Number(c.qty) || 1,
              sellPrice: Math.max(Number(c.sellPrice) || prod?.sell_price || 0, 0),
            };
          }),
          subtotal: rawSellTotal + cart.reduce((acc, c) => acc + ((Number(c.discount) || 0) * (Number(c.qty) || 1)), 0),
          discountAmount: cart.reduce((acc, c) => acc + ((Number(c.discount) || 0) * (Number(c.qty) || 1)), 0) + finalDiscountNum,
          total: sellTotal,
          paidAmount: type === "online" ? 0 : (type === "split" && totalSplitPaid > sellTotal ? totalSplitPaid : paidNum),
          due: type === "online" ? sellTotal : due,
          changeAmount: changeAmount > 0 ? changeAmount : undefined,
          terms: user.invoice_terms || "",
        };

        try {
          await printPwaInvoice(invoiceParams);
          toast.success(lang === "bn" ? "ইনভয়েস প্রিন্ট প্রস্তুত হচ্ছে!" : "Opening invoice print view!");
        } catch {
          toast.error(lang === "bn" ? "বিক্রি সংরক্ষিত হয়েছে, প্রিন্ট হয়নি। বিক্রির ইতিহাস থেকে আবার চেষ্টা করুন।" : "Sale saved, but printing failed. Retry from sales history.");
        }
      }

      onOpenChange(false);
    } catch (err: unknown) {
      playErrorSound();
      toast.error(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  const currentChangeAmount = (type === "split" && totalSplitPaid > sellTotal)
    ? (totalSplitPaid - sellTotal)
    : (type === "cash" && paidNum > sellTotal)
    ? (paidNum - sellTotal)
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[98vw] sm:max-w-[95vw] md:max-w-5xl lg:max-w-6xl xl:max-w-[1380px] max-h-[96dvh] flex flex-col overflow-hidden p-0 rounded-3xl border-border shadow-2xl">
          <DialogHeader className="px-5 pt-4 pb-3 shrink-0 border-b border-border/80 bg-card flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {type === "online" ? <Truck className="size-4" /> : <ShoppingCart className="size-4" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {type === "online" ? (lang === "bn" ? "নতুন অনলাইন কুরিয়ার অর্ডার" : "New Online Courier Order") : t("new_sale")}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  {type === "online"
                    ? (lang === "bn" ? "কুরিয়ার ক্যাশ অন ডেলিভারি সেলস এন্ট্রি" : "Courier Cash on Delivery Order")
                    : (lang === "bn" ? "দ্রুত বিক্রয় ও ইনভয়েস জেনারেশন" : "Fast POS Checkout & Invoice Generation")}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/60 font-medium">
              <span><strong className="text-foreground">Enter</strong>: {lang === "bn" ? "কার্টে যোগ" : "Add to Cart"}</span>
              <span>·</span>
              <span><strong className="text-foreground">Space</strong>: {lang === "bn" ? "বিক্রি সম্পন্ন" : "Complete Sale"}</span>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <form
              id="sale-form"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (draft.productId) {
                    e.preventDefault();
                    const draftPriceStr = String(draft.sellPrice ?? "").trim();
                    if (!draftPriceStr || isNaN(Number(draftPriceStr)) || Number(draftPriceStr) <= 0) {
                      e.stopPropagation();
                      playErrorSound();
                      toast.error(
                        lang === "bn"
                          ? "পণ্যের বিক্রয় মূল্য দিন! দর খালি বা ০ রাখা যাবে না।"
                          : "Please enter a valid sell price!"
                      );
                      return;
                    }
                    addToCart();
                    return;
                  }
                  // Check if any cart item has empty or <= 0 price
                  const emptyIdx = cart.findIndex((l) => {
                    const p = String(l.sellPrice ?? "").trim();
                    return p === "" || isNaN(Number(p)) || Number(p) <= 0;
                  });
                  if (emptyIdx !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    playErrorSound();
                    const invalidProduct = products.find((p) => p.id === cart[emptyIdx].productId);
                    const prodName = invalidProduct?.name ? `"${invalidProduct.name}"` : `আইটেম #${emptyIdx + 1}`;
                    toast.error(
                      lang === "bn"
                        ? `${prodName}-এর বিক্রয় মূল্য খালি! দর না লিখে এন্টার দিয়ে বিক্রি করা যাবে না।`
                        : `Sell price for ${prodName} cannot be empty! Please enter the sell price.`
                    );
                    const inputEl = document.querySelector(`[data-cart-sell-price-index="${emptyIdx}"]`) as HTMLInputElement | null;
                    if (inputEl) {
                      inputEl.focus();
                      inputEl.select();
                    }
                    return;
                  }
                }
              }}
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.productId) {
                  const draftPriceStr = String(draft.sellPrice ?? "").trim();
                  if (!draftPriceStr || isNaN(Number(draftPriceStr)) || Number(draftPriceStr) <= 0) {
                    playErrorSound();
                    toast.error(
                      lang === "bn"
                        ? "পণ্যের বিক্রয় মূল্য দিন! দর খালি বা ০ রাখা যাবে না।"
                        : "Please enter a valid sell price!"
                    );
                    return;
                  }
                  addToCart();
                } else if (cart.length > 0) {
                  submit(e);
                }
              }}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5"
            >
              <div className="md:col-span-7 lg:col-span-6 space-y-3.5 min-w-0">
                {/* Payment Method Selector or Courier Delivery Panel */}
                {type === "online" ? (
                  <div className="space-y-3">
                    {/* Mode Switcher Bar */}
                    <div className="flex items-center justify-between gap-2 p-1.5 bg-muted/60 border border-border/80 rounded-xl">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Truck className="size-4 text-purple-600 shrink-0 ml-1" />
                        <span className="text-xs font-bold text-foreground truncate">
                          {lang === "bn" ? "অনলাইন অর্ডার মোড:" : "Online Sale Mode:"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border/60 shrink-0">
                        <button
                          type="button"
                          onClick={() => setOnlineDeliveryMode("manual")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            onlineDeliveryMode === "manual"
                              ? "bg-purple-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {lang === "bn" ? "ম্যানুয়াল (Manual)" : "Manual"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlineDeliveryMode("auto")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                            onlineDeliveryMode === "auto"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Sparkles className="size-3" />
                          <span>{lang === "bn" ? "অটো (Auto)" : "Auto"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: MANUAL MODE (Classic earlier look) */}
                    {onlineDeliveryMode === "manual" ? (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                            <Truck className="size-4 text-purple-600" />
                            {lang === "bn" ? "কুরিয়ার পেমেন্ট (Courier Payment)" : "Courier Payment"}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            ⏳ {lang === "bn" ? "পেমেন্ট অপেক্ষমাণ (Pending)" : "Payment: Pending"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {lang === "bn"
                            ? "কুরিয়ার পেমেন্ট পেন্ডিং থাকবে। কুরিয়ার টাকা রিসিভ করার পর সেলস পেজ থেকে 'পেমেন্ট গ্রহণ' করলে ক্যাশবক্সে জমা হবে।"
                            : "Online sale profit is recorded immediately. Payment will deposit into Cashbox upon courier collection approval."}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div className="space-y-1">
                            <Label className="text-[10.5px] font-semibold text-muted-foreground">{lang === "bn" ? "কুরিয়ার সার্ভিস" : "Courier Service"}</Label>
                            <select
                              value={courierName}
                              onChange={(e) => setCourierName(e.target.value)}
                              className="w-full h-8.5 text-xs rounded-lg border border-input bg-background px-2 font-medium"
                            >
                              <option value="Steadfast Courier">Steadfast Courier (স্টেডফাস্ট)</option>
                              <option value="Pathao Courier">Pathao Courier (পাঠাও)</option>
                              <option value="RedX Delivery">RedX Delivery (রেডএক্স)</option>
                              <option value="Sundarban Courier">Sundarban Courier (সুন্দরবন)</option>
                              <option value="Paperfly">Paperfly (পেপারফ্লাই)</option>
                              <option value="SA Paribahan">SA Paribahan (এস এ পরিবহন)</option>
                              <option value="Custom Courier">Other / অন্য কুরিয়ার</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10.5px] font-semibold text-muted-foreground">{lang === "bn" ? "ট্র্যাকিং কোড / ইনভয়েস" : "Tracking / Consignment ID"}</Label>
                            <Input
                              value={trackingCode}
                              onChange={(e) => setTrackingCode(e.target.value)}
                              placeholder="e.g. ST-93821"
                              className="h-8.5 text-xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Optional Manual Delivery Address */}
                        <div className="space-y-1 pt-0.5">
                          <Label className="text-[10.5px] font-semibold text-muted-foreground">{lang === "bn" ? "ডেলিভারি ঠিকানা ও নোট (ঐচ্ছিক)" : "Delivery Address & Note (Optional)"}</Label>
                          <Input
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder={lang === "bn" ? "যেমন: মিরপুর ১০, ঢাকা | নোট: খুলে চেক করে দিন" : "e.g. Mirpur 10, Dhaka | Note: Check parcel"}
                            className="h-8 text-xs"
                          />
                        </div>

                        {steadfastEnabled && (
                          <div className="pt-1.5 border-t border-purple-500/20 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <label className="flex items-center gap-2 text-[11px] font-semibold text-purple-800 dark:text-purple-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={autoSendSteadfast}
                                  onChange={(e) => setAutoSendSteadfast(e.target.checked)}
                                  className="size-3.5 accent-emerald-600"
                                />
                                <span>{lang === "bn" ? "সেল করার সাথে সাথেই SteadFast-এ পাঠান" : "Auto-send to SteadFast on save"}</span>
                              </label>
                              {(() => {
                                const cust = customers.find((c: any) => c.id === partyId);
                                const p = String((cust as any)?.phone || "").trim();
                                if (!p) return null;
                                return (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={sfFraudBusy}
                                    onClick={async () => {
                                      setSfFraudBusy(true);
                                      try {
                                        const r = await steadfastFraudCheckFn({ data: { phone: p } });
                                        setSfFraudResult(r);
                                      } catch (e: any) {
                                        toast.error(e?.message || "Fraud check failed");
                                      } finally {
                                        setSfFraudBusy(false);
                                      }
                                    }}
                                    className="h-6.5 px-2 text-[10px] font-bold rounded-lg gap-1"
                                  >
                                    <ShieldCheck className="size-3 text-amber-600" />
                                    <span>{sfFraudBusy ? "..." : (lang === "bn" ? "ফ্রড চেক" : "Fraud Check")}</span>
                                  </Button>
                                );
                              })()}
                            </div>
                            {sfFraudResult && (
                              <div className="p-2 rounded-lg bg-background/80 border border-border text-[10.5px] flex items-center justify-between">
                                <span>Parcels: <b>{sfFraudResult.total_parcels}</b></span>
                                <span className="text-emerald-600">Delivered: <b>{sfFraudResult.total_delivered}</b></span>
                                <span className="text-rose-600">Cancelled: <b>{sfFraudResult.total_cancelled}</b></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Mode 2: AUTO MODE (Full Cascading Location Widget) */
                      <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-purple-500/5 to-transparent border border-emerald-500/30 rounded-2xl space-y-3.5 shadow-2xs">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Sparkles className="size-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                {lang === "bn" ? "অটো SteadFast লোকেশন এন্ট্রি" : "Auto SteadFast Location Entry"}
                              </span>
                              <p className="text-[10px] text-muted-foreground">
                                {lang === "bn" ? "কুরিয়ার: SteadFast Courier (স্বয়ংক্রিয় বুকিং)" : "Courier: SteadFast Courier (Auto-book)"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            ⏳ {lang === "bn" ? "পেমেন্ট: কুরিয়ারে অপেক্ষমাণ" : "Payment: Pending COD"}
                          </span>
                        </div>

                        {/* Section 1: Customer Selection (Optional) or Direct Recipient Info */}
                        <div className="p-2.5 bg-background/80 rounded-xl border border-border/80 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                              <span>{lang === "bn" ? "১. কাস্টমার নির্বাচন (ঐচ্ছিক)" : "1. Customer Selection (Optional)"}</span>
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {lang === "bn" ? "— তালিকা থেকে বা নতুন যোগ করুন" : "— from list or add new"}
                              </span>
                            </Label>
                            {partyId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPartyId("")}
                                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-rose-600 cursor-pointer"
                              >
                                {lang === "bn" ? "মুছে ফেলুন" : "Clear"}
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="flex-1">
                              <CustomerSearchSelect
                                customers={customers}
                                value={partyId}
                                onChange={(id) => {
                                  setPartyId(id);
                                  if (id) {
                                    const c = customers.find((x: any) => x.id === id);
                                    if (c) {
                                      if (c.name && !manualRecipientName) setManualRecipientName(c.name);
                                      if ((c as any).phone && !manualRecipientPhone) setManualRecipientPhone((c as any).phone);
                                      if ((c as any).address && !addressDetails) setAddressDetails((c as any).address);
                                    }
                                  }
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setAddCustomerOpen(true)}
                              className="h-9 px-2.5 text-xs font-semibold rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/10 gap-1 shrink-0 cursor-pointer"
                            >
                              <Plus className="size-3.5" />
                              <span>{lang === "bn" ? "নতুন" : "Add"}</span>
                            </Button>
                          </div>

                          {/* Recipient Name and Phone */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <Label className="text-[10.5px] font-semibold text-muted-foreground">
                                {lang === "bn" ? "প্রাপকের নাম" : "Recipient Name"}
                              </Label>
                              <Input
                                value={manualRecipientName}
                                onChange={(e) => setManualRecipientName(e.target.value)}
                                placeholder={lang === "bn" ? "যেমন: তানভীর আহমেদ" : "e.g. Tanvir Ahmed"}
                                className="h-8 text-xs font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10.5px] font-semibold text-muted-foreground">
                                  {lang === "bn" ? "মোবাইল নম্বর (১১ ডিজিট)" : "Recipient Phone (11-digit)"}
                                </Label>
                                {manualRecipientPhone && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={sfFraudBusy}
                                    onClick={async () => {
                                      setSfFraudBusy(true);
                                      try {
                                        const r = await steadfastFraudCheckFn({ data: { phone: manualRecipientPhone } });
                                        setSfFraudResult(r);
                                      } catch (e: any) {
                                        toast.error(e?.message || "Fraud check failed");
                                      } finally {
                                        setSfFraudBusy(false);
                                      }
                                    }}
                                    className="h-5 px-1.5 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 gap-1 cursor-pointer"
                                  >
                                    <ShieldCheck className="size-3" />
                                    <span>{sfFraudBusy ? "..." : (lang === "bn" ? "ফ্রড চেক" : "Fraud Check")}</span>
                                  </Button>
                                )}
                              </div>
                              <Input
                                value={manualRecipientPhone}
                                onChange={(e) => setManualRecipientPhone(e.target.value)}
                                placeholder="017XXXXXXXX"
                                maxLength={14}
                                className="h-8 text-xs font-mono font-medium"
                              />
                            </div>
                          </div>

                          {sfFraudResult && (
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10.5px] flex items-center justify-between">
                              <span>মোট পার্সেল: <b>{sfFraudResult.total_parcels}</b></span>
                              <span className="text-emerald-600 font-semibold">ডেলিভার্ড: <b>{sfFraudResult.total_delivered}</b></span>
                              <span className="text-rose-600 font-semibold">বাতিল: <b>{sfFraudResult.total_cancelled}</b></span>
                            </div>
                          )}
                        </div>

                        {/* Section 2: Cascading Geographic Address Selection (Division -> District -> Upazila -> Union -> Details) */}
                        <div className="p-2.5 bg-background/80 rounded-xl border border-border/80 space-y-2.5">
                          <div className="flex items-center justify-between gap-1">
                            <Label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                              <MapPin className="size-3.5 text-purple-600" />
                              <span>{lang === "bn" ? "২. ডেলিভারি এলাকা ও ঠিকানা (SteadFast Geography)" : "2. Delivery Location (BD Geography)"}</span>
                            </Label>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {builtFullAddress.length}/250 char
                            </span>
                          </div>

                          {/* Division & District */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground">{lang === "bn" ? "বিভাগ (Division)" : "Division"}</Label>
                              <select
                                value={division}
                                onChange={(e) => handleDivisionChange(e.target.value)}
                                className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-medium"
                              >
                                {divisions.map((d: any) => (
                                  <option key={d.name} value={d.name}>
                                    {lang === "bn" ? d.nameBn : d.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground">{lang === "bn" ? "জেলা (District)" : "District"}</Label>
                              <select
                                value={district}
                                onChange={(e) => handleDistrictChange(e.target.value)}
                                className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-medium"
                              >
                                {districts.map((d: any) => (
                                  <option key={d.name} value={d.name}>
                                    {lang === "bn" ? d.nameBn : d.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Upazila / Thana & Union / Area */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground">{lang === "bn" ? "উপজেলা / থানা (Upazila)" : "Upazila / Thana"}</Label>
                              <select
                                value={upazila}
                                onChange={(e) => handleUpazilaChange(e.target.value)}
                                className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-medium"
                              >
                                <option value="">{lang === "bn" ? "-- উপজেলা নির্বাচন করুন --" : "-- Select Upazila --"}</option>
                                {upazilas.map((u: any) => (
                                  <option key={u.name} value={u.name}>
                                    {lang === "bn" ? u.nameBn : u.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground">{lang === "bn" ? "ইউনিয়ন / জোন / এলাকা" : "Union / Zone"}</Label>
                              <select
                                value={customUnion ? "__custom__" : union}
                                onChange={(e) => {
                                  if (e.target.value === "__custom__") {
                                    setCustomUnion(" ");
                                    setUnion("");
                                  } else {
                                    setCustomUnion("");
                                    setUnion(e.target.value);
                                  }
                                }}
                                className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-medium"
                              >
                                <option value="">{lang === "bn" ? "-- ইউনিয়ন / এলাকা --" : "-- Select Union/Area --"}</option>
                                {unions.map((un: any) => (
                                  <option key={un} value={un}>
                                    {un}
                                  </option>
                                ))}
                                <option value="__custom__">{lang === "bn" ? "+ অন্য এলাকা / কাস্টম লিখুন..." : "+ Custom / Other Area..."}</option>
                              </select>
                            </div>
                          </div>

                          {/* Custom Union text input if selected */}
                          {(customUnion !== "" || (upazila && unions.length === 0)) && (
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground">{lang === "bn" ? "কাস্টম ইউনিয়ন / এলাকার নাম" : "Custom Union / Area"}</Label>
                              <Input
                                value={customUnion.trim()}
                                onChange={(e) => setCustomUnion(e.target.value)}
                                placeholder={lang === "bn" ? "এলাকার নাম লিখুন" : "Type area/union name"}
                                className="h-8 text-xs"
                              />
                            </div>
                          )}

                          {/* Address Details (House / Road / Sector / Village) */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">
                              {lang === "bn" ? "বাড়ি নং, রোড নং, সেক্টর, হোল্ডিং বিস্তারিত ঠিকানা" : "House, Road, Sector, Village & Details"}
                            </Label>
                            <Input
                              value={addressDetails}
                              onChange={(e) => setAddressDetails(e.target.value)}
                              placeholder={lang === "bn" ? "যেমন: বাসা ১২, রোড ৪, ব্লক সি" : "e.g. House 12, Road 4, Block C"}
                              className="h-8 text-xs"
                            />
                          </div>

                          {/* Live SteadFast Address Preview */}
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] space-y-0.5">
                            <div className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                              {lang === "bn" ? "SteadFast-এ প্রেরিতব্য ঠিকানা (Preview):" : "SteadFast Address Preview:"}
                            </div>
                            <p className="font-medium text-foreground leading-snug break-words">
                              {builtFullAddress || (lang === "bn" ? "বিভাগ, জেলা, উপজেলা ও ঠিকানা পূরণ করুন..." : "Select division, district, upazila & details...")}
                            </p>
                          </div>
                        </div>

                        {/* Section 3: Courier Settings & Auto-dispatch */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10.5px] font-semibold text-muted-foreground">{lang === "bn" ? "কুরিয়ার সার্ভিস" : "Courier Service"}</Label>
                            <select
                              value={courierName}
                              onChange={(e) => setCourierName(e.target.value)}
                              className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-medium"
                            >
                              <option value="Steadfast Courier">Steadfast Courier (স্টেডফাস্ট)</option>
                              <option value="Pathao Courier">Pathao Courier (পাঠাও)</option>
                              <option value="RedX Delivery">RedX Delivery (রেডএক্স)</option>
                              <option value="Sundarban Courier">Sundarban Courier (সুন্দরবন)</option>
                              <option value="Other Courier">Other / অন্য কুরিয়ার</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10.5px] font-semibold text-muted-foreground">{lang === "bn" ? "ডেলিভারি নোট / নির্দেশনা" : "Delivery Note"}</Label>
                            <Input
                              value={deliveryNote}
                              onChange={(e) => setDeliveryNote(e.target.value)}
                              placeholder={lang === "bn" ? "যেমন: খুলে চেক করে দিতে হবে" : "e.g. Fragile / Handle with care"}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        {steadfastEnabled && (
                          <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                            <label className="flex items-center gap-2 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={autoSendSteadfast}
                                onChange={(e) => setAutoSendSteadfast(e.target.checked)}
                                className="size-3.5 accent-emerald-600 rounded"
                              />
                              <span>{lang === "bn" ? "সেল সেভ করার সাথে সাথে SteadFast-এ স্বয়ংক্রিয় বুকিং দিন" : "Auto-book to SteadFast on save"}</span>
                            </label>
                            {trackingCode && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold">
                                {trackingCode}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      {lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Method"}
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setType("cash")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          type === "cash"
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{lang === "bn" ? "নগদ" : "Cash"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType("bkash")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          type === "bkash"
                            ? "bg-[#E2136E]/15 border-[#E2136E] text-[#E2136E] dark:text-pink-300 shadow-xs ring-1 ring-[#E2136E]/30"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <BkashLogo className="size-4 shrink-0" />
                        <span>{lang === "bn" ? "বিকাশ" : "bKash"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType("bank")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          type === "bank"
                            ? "bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 shadow-xs ring-1 ring-sky-500/30"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <DollarSign className="size-4 text-sky-600 dark:text-sky-400" />
                        <span>{lang === "bn" ? "ব্যাংক" : "Bank"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType("credit")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          type === "credit"
                            ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <CreditCard className="size-4 text-amber-600 dark:text-amber-400" />
                        <span>{lang === "bn" ? "বাকী" : "Credit"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType("split")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          type === "split"
                            ? "bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs ring-1 ring-purple-500/30"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <Split className="size-4 text-purple-600 dark:text-purple-400" />
                        <span>{lang === "bn" ? "স্প্লিট" : "Split"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {(type !== "online" || onlineDeliveryMode === "manual") && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {lang === "bn" ? "কাস্টমার" : "Customer"} {(type === "credit" || (type === "split" && due > 0)) ? "*" : ""}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <CustomerSearchSelect customers={customers} value={partyId} onChange={setPartyId} />
                      </div>
                      {partyId && (
                        <Link href={`/customers/detail?id=${partyId}`} target="_blank">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 shrink-0 cursor-pointer text-primary hover:bg-primary/10 hover:border-primary/40"
                            title={lang === "bn" ? "কাস্টমারের ক্রয়ের ইতিহাস দেখুন" : "View Customer Buying History"}
                          >
                            <History className="size-4" />
                          </Button>
                        </Link>
                      )}
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
                )}

                <div className="border border-border/90 bg-card/60 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShoppingCart className="size-3.5 text-primary" />
                      {t("select_product")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">{lang === "bn" ? "ডিফল্ট পরিমাণ: ১" : "Default Qty: 1"}</span>
                    </div>
                  </div>

                  {/* Direct Hardware Barcode / SKU Scan Input (Classic-World System) */}
                  <div className="flex gap-1.5">
                    <Input
                      id="sale-barcode-input"
                      ref={scanInputRef}
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || (scannerSuffix === "Tab" && e.key === "Tab")) {
                          e.preventDefault();
                          handleBarcodeInputSubmit();
                        }
                      }}
                      placeholder={lang === "bn" ? "বারকোড স্ক্যান করুন অথবা কোড লিখে Enter চাপুন..." : "Scan barcode or type code + Enter..."}
                      className="h-9 text-xs font-mono border-primary/30 bg-background/80"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBarcodeInputSubmit()}
                      className="h-9 px-3 shrink-0 cursor-pointer text-xs font-semibold"
                    >
                      {lang === "bn" ? "যোগ" : "Scan"}
                    </Button>
                  </div>

                  {/* Product Name & Direct Sell Price Input Box side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-7 space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        {lang === "bn" ? "পণ্যের নাম / বারকোড" : "Product Name / Barcode"}
                      </Label>
                      <ProductSearchSelect
                        products={products}
                        value={draft.productId}
                        onScanDirect={handleBarcodeScan}
                        onChange={v => {
                          const p = products.find(x => x.id === v);
                          setDraft(d => ({
                            ...d,
                            productId: v,
                            qty: d.qty || "1",
                            sellPrice: p && p.sell_price > 0 ? String(p.sell_price) : "",
                            discount: "",
                          }));
                        }}
                      />
                    </div>
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-[11px] font-bold text-primary">
                        {lang === "bn" ? "বিক্রি মূল্য (Sell Price ৳)" : "Sell Price (৳)"}
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        placeholder={lang === "bn" ? "বিক্রি দর লিখুন (৳)" : "Enter Sell Price (৳)"}
                        value={draft.productId ? draft.sellPrice : (cart.length > 0 ? cart[cart.length - 1].sellPrice : draft.sellPrice)}
                        onChange={e => {
                          const val = e.target.value;
                          if (draft.productId) {
                            setDraft(d => ({ ...d, sellPrice: val }));
                          } else if (cart.length > 0) {
                            setCart(prev => prev.map((item, idx) => idx === prev.length - 1 ? { ...item, sellPrice: val } : item));
                          } else {
                            setDraft(d => ({ ...d, sellPrice: val }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (draft.productId) addToCart();
                          }
                        }}
                        className="h-9 font-bold font-mono text-sm border-primary/50 bg-background focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t("qty")}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="1"
                        value={draft.qty}
                        onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (draft.productId) addToCart();
                          }
                        }}
                      />
                    </Field>
                    <Field label={lang === "bn" ? "ছাড় (Discount ৳)" : "Discount (৳)"}>
                      <Input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        placeholder="0"
                        value={draft.discount}
                        onChange={e => setDraft(d => ({ ...d, discount: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (draft.productId) addToCart();
                          }
                        }}
                      />
                    </Field>
                  </div>

                  {draft.productId && draft.sellPrice && (
                    <div className="text-xs text-muted-foreground flex justify-between items-center font-medium bg-muted/40 p-2 rounded-lg">
                      <span>{lang === "bn" ? "আইটেম মোট:" : "Item Total:"}</span>
                      <span className="font-bold text-foreground font-serif">
                        ৳{Math.max((Number(draft.sellPrice) || 0) - (Number(draft.discount) || 0), 0) * (Number(draft.qty) || 1)}
                      </span>
                    </div>
                  )}

                  <Button type="button" variant="default" size="sm" className="w-full h-9 text-xs font-semibold cursor-pointer" onClick={addToCart}>
                    <Plus className="size-4 mr-1" />{t("add_to_cart")} <span className="opacity-70 ml-1 font-mono text-[10px] hidden sm:inline">[Enter]</span>
                  </Button>
                </div>
              </div>

              <div className="md:col-span-5 lg:col-span-6 flex flex-col justify-between space-y-3 min-w-0">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShoppingCart className="size-3.5 text-primary" />
                      {t("cart")} ({cart.length})
                    </Label>
                    {cart.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-1.5"
                        onClick={() => { setCart([]); setFinalDiscount(""); }}
                      >
                        {lang === "bn" ? "কার্ট খালি করুন" : "Clear Cart"}
                      </Button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="border border-dashed border-border rounded-xl p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5 bg-muted/10 min-h-[140px]">
                      <ShoppingCart className="size-6 text-muted-foreground/40" />
                      <span>{lang === "bn" ? "কার্ট খালি রয়েছে। পণ্য যোগ করুন।" : "Cart is empty. Add products to proceed."}</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {cart.map((line, i) => {
                        const p = products.find(x => x.id === line.productId);
                        return (
                          <div key={`${line.productId}-${i}`} className="border border-border/80 rounded-xl p-3 text-xs bg-card space-y-2.5 shadow-2xs hover:border-primary/40 transition-colors">
                            {/* Top Row: Product Name + Prominent Sell Price Input Box + Remove Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm" title={p?.name}>
                                  {i + 1}. {p?.name}
                                </span>
                                {p?.barcode && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    Barcode: {p.barcode}
                                  </span>
                                )}
                              </div>

                              {/* Direct Sell Price Input Box right beside Product Name */}
                              <div className="flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/30 shrink-0">
                                <span className="text-[11px] font-bold text-primary whitespace-nowrap">
                                  {lang === "bn" ? "বিক্রি দর (৳):" : "Sell Price (৳):"}
                                </span>
                                <Input
                                  type="number"
                                  step="any"
                                  inputMode="decimal"
                                  data-cart-sell-price-index={i}
                                  value={line.sellPrice}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setCart(prev => prev.map((item, idx) => idx === i ? { ...item, sellPrice: val } : item));
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") {
                                      const p = String(line.sellPrice ?? "").trim();
                                      if (!p || isNaN(Number(p)) || Number(p) <= 0) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        playErrorSound();
                                        toast.error(
                                          lang === "bn"
                                            ? "বিক্রি দর খালি বা ০ রাখা যাবে না!"
                                            : "Sell price cannot be empty or zero!"
                                        );
                                      }
                                    }
                                  }}
                                  className="h-7 w-24 sm:w-28 px-2 text-xs sm:text-sm font-bold font-mono text-foreground text-right bg-background border-primary/40 rounded focus-visible:ring-1 focus-visible:ring-primary"
                                  placeholder={lang === "bn" ? "দর লিখুন" : "Price"}
                                  title={lang === "bn" ? "বিক্রি দর পরিবর্তন করুন" : "Edit Sell Price"}
                                />
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                onClick={() => setCart(prev => prev.filter((_, idx) => idx !== i))}
                                title={lang === "bn" ? "আইটেম মুছুন" : "Remove item"}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>

                            {/* Bottom Row: Qty Stepper + Discount + Line Total */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-border/50">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Qty Stepper */}
                                <div className="flex items-center border border-border rounded-lg bg-background">
                                  <button
                                    type="button"
                                    className="size-6.5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                    onClick={() => {
                                      const current = Number(line.qty) || 1;
                                      if (current > 1) {
                                        setCart(prev => prev.map((item, idx) => idx === i ? { ...item, qty: String(current - 1) } : item));
                                      } else {
                                        setCart(prev => prev.filter((_, idx) => idx !== i));
                                      }
                                    }}
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={line.qty}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setCart(prev => prev.map((item, idx) => idx === i ? { ...item, qty: val } : item));
                                    }}
                                    className="h-6.5 w-11 px-0.5 text-center font-mono font-bold text-xs border-0 rounded-none bg-transparent"
                                  />
                                  <button
                                    type="button"
                                    className="size-6.5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                    onClick={() => {
                                      const current = Number(line.qty) || 0;
                                      setCart(prev => prev.map((item, idx) => idx === i ? { ...item, qty: String(current + 1) } : item));
                                    }}
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>

                                {/* Discount per unit */}
                                <div className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-lg border border-border/50">
                                  <span className="text-[10.5px] font-medium text-muted-foreground">{lang === "bn" ? "ছাড় (৳):" : "Disc (৳):"}</span>
                                  <Input
                                    type="number"
                                    step="any"
                                    inputMode="decimal"
                                    value={line.discount || ""}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setCart(prev => prev.map((item, idx) => idx === i ? { ...item, discount: val } : item));
                                    }}
                                    className="h-6.5 w-16 px-1.5 text-[11px] font-mono text-right bg-background border-border/70 rounded"
                                    placeholder="0"
                                  />
                                </div>
                              </div>

                              {/* Line Total */}
                              <div className="text-right">
                                <div className="font-bold text-foreground font-serif text-xs sm:text-sm">৳{lineTotal(line).toLocaleString()}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  (৳{line.sellPrice || 0} {Number(line.discount) > 0 ? `- ৳${line.discount}` : ""}) × {line.qty}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {type === "split" && (
                  <div className="border border-purple-500/30 bg-purple-500/5 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs overflow-hidden font-hind">
                    {/* Header: Title, Total, and Mobile Toggle */}
                    <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-7 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 grid place-items-center shrink-0">
                          <Split className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <Label className="text-xs sm:text-sm font-bold text-purple-950 dark:text-purple-100 flex items-center gap-1.5 truncate">
                            {lang === "bn" ? "স্প্লিট পেমেন্ট হিসাব" : "Split Payment Breakdown"}
                          </Label>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(splitCashNum > 0 || splitBkashNum > 0 || splitBankNum > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSplitCash("");
                              setSplitBkash("");
                              setSplitBank("");
                            }}
                            className="text-[11px] font-medium text-muted-foreground hover:text-rose-600 px-2 py-0.5 rounded border border-border/60 hover:border-rose-300 transition-colors cursor-pointer flex items-center gap-1"
                            title="Reset all split fields"
                          >
                            <RotateCcw className="size-3" />
                            <span>{lang === "bn" ? "মুছুন" : "Clear"}</span>
                          </button>
                        )}

                        <span className="text-xs font-bold bg-background px-2.5 py-1 rounded-lg border border-purple-500/30 text-foreground shadow-2xs">
                          {lang === "bn" ? "বিল:" : "Bill:"} ৳{sellTotal}
                        </span>

                        {/* Mobile Reveal / Hide Toggle Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMobileSplitOpen(prev => !prev)}
                          className="sm:hidden h-7 text-[11px] px-2 rounded-lg font-bold border-purple-500/30 text-purple-700 dark:text-purple-300 bg-background cursor-pointer gap-1"
                        >
                          {mobileSplitOpen ? (
                            <>
                              <ChevronUp className="size-3.5" />
                              <span>{lang === "bn" ? "লুকান" : "Hide"}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-3.5" />
                              <span>{lang === "bn" ? "টাকা লিখুন" : "Reveal"}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Mobile Compact Summary Chip (Shown when collapsed on mobile) */}
                    {!mobileSplitOpen && (
                      <div
                        onClick={() => setMobileSplitOpen(true)}
                        className="sm:hidden p-2 bg-background/90 rounded-xl border border-purple-500/30 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/40 transition-all"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            {lang === "bn" ? "নগদ:" : "Cash:"} ৳{splitCashNum}
                          </span>
                          <span className="text-[#E2136E] font-bold text-[11px]">
                            {lang === "bn" ? "বিকাশ:" : "bKash:"} ৳{splitBkashNum}
                          </span>
                          {splitBankNum > 0 && (
                            <span className="text-sky-600 font-bold text-[11px]">
                              {lang === "bn" ? "ব্যাংক:" : "Bank:"} ৳{splitBankNum}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-[11px] text-purple-700 dark:text-purple-300">
                          {due > 0 ? (
                            <span className="text-rose-600">বাকী: ৳{due}</span>
                          ) : (
                            <span className="text-emerald-600">✓ পরিশোধ</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inputs & Controls (Visible always on sm: screens, revealable on mobile) */}
                    <div className={`${mobileSplitOpen ? "block" : "hidden sm:block"} space-y-3 animate-in fade-in duration-150`}>
                      {/* Visual Segmented Payment Progress Bar */}
                      {sellTotal > 0 && (
                        <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden flex shadow-inner">
                          {splitCashNum > 0 && (
                            <div
                              style={{ width: `${Math.min(100, (splitCashNum / sellTotal) * 100)}%` }}
                              className="bg-emerald-500 transition-all duration-200"
                              title={lang === "bn" ? `নগদ: ৳${splitCashNum}` : `Cash: ৳${splitCashNum}`}
                            />
                          )}
                          {splitBkashNum > 0 && (
                            <div
                              style={{ width: `${Math.min(100, (splitBkashNum / sellTotal) * 100)}%` }}
                              className="bg-[#E2136E] transition-all duration-200"
                              title={lang === "bn" ? `বিকাশ: ৳${splitBkashNum}` : `bKash: ৳${splitBkashNum}`}
                            />
                          )}
                          {splitBankNum > 0 && (
                            <div
                              style={{ width: `${Math.min(100, (splitBankNum / sellTotal) * 100)}%` }}
                              className="bg-sky-500 transition-all duration-200"
                              title={lang === "bn" ? `ব্যাংক: ৳${splitBankNum}` : `Bank: ৳${splitBankNum}`}
                            />
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2.5">
                        {/* Line 1: Cash */}
                        <div className="bg-background rounded-xl p-2.5 sm:p-3 border border-emerald-500/30 shadow-2xs transition-all focus-within:ring-1 focus-within:ring-emerald-500 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="size-6 sm:size-7 rounded-md bg-emerald-500/15 grid place-items-center text-emerald-600 shrink-0">
                                <Banknote className="size-3.5 sm:size-4" />
                              </div>
                              <Label className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer truncate">
                                {lang === "bn" ? "নগদ (Cash)" : "Cash"}
                              </Label>
                            </div>
                          </div>

                          <div className="relative w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground select-none pointer-events-none">৳</span>
                            <Input
                              type="number"
                              step="any"
                              inputMode="decimal"
                              placeholder="0"
                              value={splitCash}
                              onChange={e => setSplitCash(e.target.value)}
                              className="h-9 sm:h-10 pl-7 pr-7 text-sm sm:text-base font-bold bg-card rounded-lg w-full"
                            />
                            {splitCash && (
                              <button
                                type="button"
                                onClick={() => setSplitCash("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground size-5 flex items-center justify-center text-xs rounded-full hover:bg-muted cursor-pointer"
                                title="Clear"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Line 2: bKash */}
                        <div className="bg-background rounded-xl p-2.5 sm:p-3 border border-[#E2136E]/30 shadow-2xs transition-all focus-within:ring-1 focus-within:ring-[#E2136E] space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="size-6 sm:size-7 rounded-md bg-[#E2136E]/15 grid place-items-center text-[#E2136E] shrink-0">
                                <BkashLogo className="size-3.5 sm:size-4" />
                              </div>
                              <Label className="text-xs sm:text-sm font-bold text-[#E2136E] dark:text-pink-300 cursor-pointer truncate">
                                {lang === "bn" ? "বিকাশ (bKash)" : "bKash"}
                              </Label>
                            </div>
                          </div>

                          <div className="relative w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground select-none pointer-events-none">৳</span>
                            <Input
                              type="number"
                              step="any"
                              inputMode="decimal"
                              placeholder="0"
                              value={splitBkash}
                              onChange={e => setSplitBkash(e.target.value)}
                              className="h-9 sm:h-10 pl-7 pr-7 text-sm sm:text-base font-bold bg-card rounded-lg w-full"
                            />
                            {splitBkash && (
                              <button
                                type="button"
                                onClick={() => setSplitBkash("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground size-5 flex items-center justify-center text-xs rounded-full hover:bg-muted cursor-pointer"
                                title="Clear"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Line 3: Bank */}
                        <div className="bg-background rounded-xl p-2.5 sm:p-3 border border-sky-500/30 shadow-2xs transition-all focus-within:ring-1 focus-within:ring-sky-500 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="size-6 sm:size-7 rounded-md bg-sky-500/15 grid place-items-center text-sky-600 shrink-0">
                                <DollarSign className="size-3.5 sm:size-4" />
                              </div>
                              <Label className="text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-300 cursor-pointer truncate">
                                {lang === "bn" ? "ব্যাংক (Bank)" : "Bank"}
                              </Label>
                            </div>
                          </div>

                          <div className="relative w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground select-none pointer-events-none">৳</span>
                            <Input
                              type="number"
                              step="any"
                              inputMode="decimal"
                              placeholder="0"
                              value={splitBank}
                              onChange={e => setSplitBank(e.target.value)}
                              className="h-9 sm:h-10 pl-7 pr-7 text-sm sm:text-base font-bold bg-card rounded-lg w-full"
                            />
                            {splitBank && (
                              <button
                                type="button"
                                onClick={() => setSplitBank("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground size-5 flex items-center justify-center text-xs rounded-full hover:bg-muted cursor-pointer"
                                title="Clear"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary & Live Financial Verification Strip */}
                      <div className="space-y-2 pt-1 border-t border-purple-500/20">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold bg-background/60 p-2.5 rounded-xl border border-purple-500/20">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div>
                              <span className="text-muted-foreground">{lang === "bn" ? "পরিশোধ:" : "Paid:"} </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">৳{totalSplitPaid}</span>
                            </div>
                            <span className="text-muted-foreground font-normal">/</span>
                            <div>
                              <span className="text-muted-foreground">{lang === "bn" ? "বিল:" : "Bill:"} </span>
                              <span className="font-extrabold text-sm">৳{sellTotal}</span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {due > 0 ? (
                              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-extrabold text-[11px] sm:text-xs">
                                <span>{lang === "bn" ? "⚠️ বাকী:" : "⚠️ Due:"} ৳{due}</span>
                                {!partyId && (
                                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    {lang === "bn" ? "কাস্টমার আবশ্যক" : "Cust req"}
                                  </span>
                                )}
                              </div>
                            ) : totalSplitPaid > sellTotal ? (
                              <span className="text-amber-600 dark:text-amber-400 font-extrabold text-[11px] sm:text-xs flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                <span>{lang === "bn" ? "🔄 ফেরত (Change):" : "🔄 Change:"} ৳{totalSplitPaid - sellTotal}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] sm:text-xs flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                <CheckCircle2 className="size-3.5" />
                                <span>{lang === "bn" ? "সম্পূর্ণ পরিশোধিত" : "Paid in Full"}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {type === "credit" && (
                  <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {lang === "bn" ? "আংশিক জমা / আদায়কৃত টাকা" : "Partial Paid Amount"}
                      </Label>
                      <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                        {lang === "bn" ? "মোট বিল:" : "Total:"} ৳{sellTotal}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        placeholder=""
                        value={paid}
                        onChange={e => setPaid(e.target.value)}
                        className="h-9 sm:h-11 text-sm sm:text-base font-semibold font-serif bg-background rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs px-2.5 shrink-0 rounded-lg cursor-pointer font-medium"
                        onClick={() => setPaid("0")}
                      >
                        {lang === "bn" ? "পুরো বাকী" : "Full Due"}
                      </Button>
                      {sellTotal > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs px-2.5 shrink-0 rounded-lg cursor-pointer font-medium"
                          onClick={() => setPaid(String(Math.round(sellTotal / 2)))}
                        >
                          ৫০%
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-amber-700 dark:text-amber-300 pt-0.5 border-t border-amber-500/20">
                      <span>{lang === "bn" ? "অবশিষ্ট বাকী থাকবে:" : "Remaining Due:"}</span>
                      <span className="font-serif text-sm font-black text-rose-600 dark:text-rose-400">৳{due}</span>
                    </div>
                  </div>
                )}

                <div className="border border-border rounded-xl p-3 bg-muted/20 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("subtotal")}</span>
                    <span className="font-mono font-medium">৳{rawSellTotal}</span>
                  </div>

                  {/* Final Overall Cart Discount */}
                  <div className="flex items-center justify-between gap-2 py-1 border-y border-border/60">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Sparkles className="size-3.5 text-amber-500" />
                      <span>{lang === "bn" ? "ফাইনাল ছাড় / ডিসকাউন্ট:" : "Final Discount:"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-rose-500 font-bold">−৳</span>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={finalDiscount}
                        onChange={e => setFinalDiscount(e.target.value)}
                        className="h-7 w-24 text-right text-xs font-bold font-mono bg-background border-border/80 text-rose-600 dark:text-rose-400 rounded-lg"
                      />
                    </div>
                  </div>

                  {finalDiscountNum > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                      <span>{lang === "bn" ? "সর্বশেষ ছাড় কর্তন:" : "Final Discount Deducted:"}</span>
                      <span className="font-mono font-bold">−৳{finalDiscountNum}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment Method"}</span>
                    <span className="font-bold uppercase text-foreground">
                      {type === "split"
                        ? (lang === "bn" ? "স্প্লিট" : "Split")
                        : type === "bkash"
                        ? (lang === "bn" ? "বিকাশ" : "bKash")
                        : type === "credit"
                        ? (lang === "bn" ? "বাকী" : "Credit")
                        : type === "online"
                        ? (lang === "bn" ? "অনলাইন" : "Online")
                        : type === "bank"
                        ? (lang === "bn" ? "ব্যাংক" : "Bank")
                        : (lang === "bn" ? "নগদ" : "Cash")}
                    </span>
                  </div>
                  {type === "split" && (
                    <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/50 text-[11px]">
                      <span>{lang === "bn" ? "পরিশোধিত / বাকী:" : "Paid / Due:"}</span>
                      <span className="font-mono font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400">৳{totalSplitPaid}</span>
                        {" / "}
                        <span className={due > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>৳{due}</span>
                        {totalSplitPaid > sellTotal && (
                          <span className="text-amber-600 dark:text-amber-400 font-sans ml-1 text-[10px]">(ফেরত ৳{totalSplitPaid - sellTotal})</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-border/80 pt-1.5 flex justify-between items-baseline font-bold text-sm">
                    <span>{t("total")}</span>
                    <span className="text-base font-serif text-foreground">৳{sellTotal}</span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className="px-5 py-3 shrink-0 border-t border-border bg-card flex flex-row items-center justify-between sm:justify-between gap-2">
            <div className="text-xs flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground">{t("total")}: </span>
              <span className="font-bold text-base font-serif text-foreground">৳{sellTotal}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Last-second payment method quick switcher right before confirming */}
              <div
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5"
                role="group"
                aria-label={lang === "bn" ? "পেমেন্ট পরিবর্তন করুন" : "Change payment method"}
              >
                {(
                  [
                    {
                      key: "cash" as SalePaymentType,
                      label: lang === "bn" ? "নগদ" : "Cash",
                      activeCls: "bg-emerald-600 text-white border-emerald-600 shadow-2xs",
                    },
                    {
                      key: "split" as SalePaymentType,
                      label: lang === "bn" ? "স্প্লিট" : "Split",
                      activeCls: "bg-purple-600 text-white border-purple-600 shadow-2xs",
                    },
                    {
                      key: "credit" as SalePaymentType,
                      label: lang === "bn" ? "বাকী" : "Credit",
                      activeCls: "bg-amber-600 text-white border-amber-600 shadow-2xs",
                    },
                    {
                      key: "bkash" as SalePaymentType,
                      label: lang === "bn" ? "বিকাশ" : "bKash",
                      activeCls: "bg-[#E2136E] text-white border-[#E2136E] shadow-2xs",
                    },
                  ] as const
                ).map((opt) => {
                  const active = type === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleFooterPaymentSwitch(opt.key)}
                      className={`h-7 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                        active
                          ? opt.activeCls
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cart.length === 0}
                onClick={() => setInvoicePreviewOpen(true)}
                className="gap-1.5 h-9 font-medium border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
              >
                <Eye className="size-3.5" />
                <span>{lang === "bn" ? "প্রিভিউ ও সাইজ" : "Preview & Size"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || cart.length === 0}
                onClick={(e) => submit(e, "print")}
                className="gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 h-9 font-medium cursor-pointer"
              >
                <Printer className="size-3.5" />
                <span>{lang === "bn" ? "প্রিন্ট" : "Print"}</span>
                <span className="text-[10px] opacity-70 font-mono hidden sm:inline">[Space]</span>
              </Button>
              <Button
                type="submit"
                form="sale-form"
                size="sm"
                disabled={busy || cart.length === 0}
                className="h-9 px-4 font-semibold cursor-pointer"
              >
                {busy ? "…" : t("record_sale")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Invoice Preview & Customizer */}
      <InvoicePreviewDialog
        open={invoicePreviewOpen}
        onOpenChange={setInvoicePreviewOpen}
        lang={lang}
        invoiceData={{
          businessName: user?.business_name || user?.full_name || "Dream Fashion POS",
          userEmail: user?.business_emails || user?.email || "",
          shopAddress: user?.business_address || "",
          shopPhoneNumbers: user?.business_phone_numbers || "",
          pageSize: user?.invoice_page_size || "80mm",
          pageWidth: user?.invoice_page_width || "",
          pageHeight: user?.invoice_page_height || "",
          invoiceNo: "INV-PREVIEW",
          invoiceDate: fmtDateTime(new Date()),
          customerName: customers.find((c: any) => c.id === partyId)?.name || (lang === "bn" ? "সাধারণ কাস্টমার" : "Walk-in Customer"),
          customerPhone: customers.find((c: any) => c.id === partyId)?.phone || "",
          paymentMode: type === "split" ? "SPLIT" : type.toUpperCase(),
          items: cart.map((c) => {
            const prod = products.find((p: any) => p.id === c.productId);
            return {
              product: { id: prod?.id, name: prod?.name || "Product" },
              qty: Number(c.qty) || 1,
              sellPrice: Math.max((Number(c.sellPrice) || prod?.sell_price || 0) - (Number(c.discount) || 0), 0),
            };
          }),
          subtotal: rawSellTotal,
          discountAmount: finalDiscountNum,
          total: sellTotal,
          paidAmount: type === "online" ? 0 : paidNum,
          due: type === "online" ? sellTotal : due,
          changeAmount: currentChangeAmount > 0 ? currentChangeAmount : undefined,
          terms: user?.invoice_terms || "",
        }}
      />

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
                inputMode="tel"
                pattern="[0-9+]*"
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
