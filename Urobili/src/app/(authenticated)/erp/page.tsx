"use client";

import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getProducts, type Product } from "@/lib/queries";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import {
  createProductFn,
  createSaleFn,
  createPartyFn,
  getPharmacyRxOrdersFn,
  upsertPharmacyRxOrderFn,
  deletePharmacyRxOrderFn,
  getPharmacySuppliersFn,
  upsertPharmacySupplierFn,
  deletePharmacySupplierFn,
  getPharmacyHoldOrdersFn,
  upsertPharmacyHoldOrderFn,
  deletePharmacyHoldOrderFn,
} from "@/lib/rpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PrimaryHeaderSlot } from "@/components/primary-header-slot";
import { PosNumpadPayModal, type PosPayResult } from "@/components/pos-numpad-pay-modal";
import { toast } from "sonner";
import {
  Pill,
  Shirt,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  Package,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Barcode,
  Utensils,
  Stethoscope,
  Truck,
  ClipboardList,
  Trash2,
  PauseCircle,
  PlayCircle,
  Tag,
} from "lucide-react";

type IndustryKey = "fashion" | "pharmacy" | "grocery";

const PRIORITY_ERP_MODULES: {
  id: IndustryKey;
  title: string;
  titleBn: string;
  icon: any;
  color: string;
}[] = [
  {
    id: "fashion",
    title: "Fashion & Clothing POS",
    titleBn: "ফ্যাশন ও ক্লদিং পিওএস",
    icon: Shirt,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/25",
  },
  {
    id: "pharmacy",
    title: "Pharmacy POS (PharmaSpot)",
    titleBn: "ফার্মেসি পিওএস ও ইআরপি",
    icon: Pill,
    color: "text-rose-600 bg-rose-500/10 border-rose-500/25",
  },
  {
    id: "grocery",
    title: "Groceries & Superstore POS",
    titleBn: "মুদি ও সুপারশপ পিওএস",
    icon: ShoppingCart,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25",
  },
];

type RxOrderItem = {
  id: string;
  doctorName: string;
  doctorID: string;
  doctorContact: string;
  drugId: string;
  drugNames: string;
  drugPrice: number;
  drugQuantity: number;
  pickupDate: string;
  status: "pending" | "verified" | "picked_up";
};

type PharmacySupplierItem = {
  id: string;
  supplierID: string;
  name: string;
  email: string;
  contact: string;
  drugsAvailable: string[];
};

type HoldOrderItem = {
  id: string;
  refNumber: string;
  customerName: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  total: number;
  createdAt: string;
};

export default function PriorityIndustryPosPage() {
  const { user } = useAuth();
  const { lang } = useT();
  const qc = useQueryClient();

  const rawIndustry = (user?.industry || "fashion").toLowerCase();
  const activeIndustry: IndustryKey =
    rawIndustry === "pharmacy" || rawIndustry === "grocery" || rawIndustry === "fashion"
      ? rawIndustry
      : "fashion";

  const { data: products = [] } = useCachedQuery<Product[]>(["products"], getProducts);

  // Shared POS state
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<{ product: Product; qty: number; price: number }[]>([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // Easy Fashion filters
  const [selectedSize, setSelectedSize] = useState<string>("ALL");
  const [selectedColor, setSelectedColor] = useState<string>("ALL");

  // Grocery wholesale toggle
  const [wholesaleMode, setWholesaleMode] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>("ALL");

  // PharmaSpot Tabs & PostgreSQL-persisted entities
  const [pharmacyTab, setPharmacyTab] = useState<"inventory" | "hold_orders" | "rx_orders" | "suppliers">("inventory");
  const [batchFilter, setBatchFilter] = useState<"all" | "expiring" | "expired" | "low_stock">("all");
  const [holdOrders, setHoldOrders] = useState<HoldOrderItem[]>([]);
  const [holdRefInput, setHoldRefInput] = useState("");
  const [rxOrders, setRxOrders] = useState<RxOrderItem[]>([]);
  const [rxDoctorName, setRxDoctorName] = useState("");
  const [rxDoctorId, setRxDoctorId] = useState("");
  const [rxDoctorContact, setRxDoctorContact] = useState("");
  const [rxDrugId, setRxDrugId] = useState("");
  const [rxQty, setRxQty] = useState("1");
  const [rxPickupDate, setRxPickupDate] = useState("");
  const [pharmaSuppliers, setPharmaSuppliers] = useState<PharmacySupplierItem[]>([]);
  const [supName, setSupName] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supDrugs, setSupDrugs] = useState("");
  const [supFilter, setSupFilter] = useState("");

  // Add Item Modal
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [barcodeVal, setBarcodeVal] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [sizeVal, setSizeVal] = useState("M");
  const [colorVal, setColorVal] = useState("");
  const [unitType, setUnitType] = useState("Pcs");
  const [wholesalePrice, setWholesalePrice] = useState("");

  // Load Pharmacy PostgreSQL tables cleanly on mount
  useEffect(() => {
    if (activeIndustry !== "pharmacy") return;
    let active = true;
    Promise.all([
      getPharmacyRxOrdersFn().catch(() => []),
      getPharmacySuppliersFn().catch(() => []),
      getPharmacyHoldOrdersFn().catch(() => []),
    ]).then(([rx, sup, holds]) => {
      if (!active) return;
      if (Array.isArray(rx)) setRxOrders(rx);
      if (Array.isArray(sup)) setPharmaSuppliers(sup);
      if (Array.isArray(holds)) setHoldOrders(holds);
    });
    return () => {
      active = false;
    };
  }, [activeIndustry]);

  function getExpiryDays(expiry?: string) {
    if (!expiry) return null;
    const ms = new Date(expiry).getTime();
    if (Number.isNaN(ms)) return null;
    return Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24));
  }

  const fashionColors = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.attributes?.color) set.add(p.attributes.color.trim());
    });
    return Array.from(set).slice(0, 10);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (p.archived) return false;
      if (activeIndustry === "fashion") {
        if (selectedSize !== "ALL" && !(p.attributes?.size || "").toUpperCase().includes(selectedSize)) return false;
        if (selectedColor !== "ALL" && (p.attributes?.color || "").toLowerCase() !== selectedColor.toLowerCase()) return false;
      }
      if (activeIndustry === "grocery" && selectedUnit !== "ALL") {
        if ((p.attributes?.unit || "Pcs").toLowerCase() !== selectedUnit.toLowerCase()) return false;
      }
      if (activeIndustry === "pharmacy" && batchFilter !== "all") {
        const dLeft = getExpiryDays(p.attributes?.expiry);
        if (batchFilter === "expired" && !(dLeft !== null && dLeft < 0)) return false;
        if (batchFilter === "expiring" && !(dLeft !== null && dLeft >= 0 && dLeft <= 90)) return false;
        if (batchFilter === "low_stock" && !(Number(p.stock) <= Number(p.min_stock ?? 5))) return false;
      }
      if (!q) return true;
      const attrStr = JSON.stringify(p.attributes || {}).toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        attrStr.includes(q)
      );
    });
  }, [products, search, activeIndustry, selectedSize, selectedColor, selectedUnit, batchFilter]);

  const expiringCount = useMemo(() => {
    return products.filter((p) => {
      const d = getExpiryDays(p.attributes?.expiry);
      return d !== null && d <= 90;
    }).length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => !p.archived && Number(p.stock) <= Number(p.min_stock ?? 5)).length;
  }, [products]);

  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.qty, 0), [cart]);
  const cartTotal = Math.max(0, cartSubtotal - Math.max(0, Number(discountVal) || 0));

  function handleSafeAddToCart(p: Product) {
    if (activeIndustry === "pharmacy") {
      const daysLeft = getExpiryDays(p.attributes?.expiry);
      if (daysLeft !== null && daysLeft < 0) {
        toast.error(
          lang === "bn"
            ? `${p.name} মেয়াদোত্তীর্ণ! বিক্রয় ব্লক করা হয়েছে।`
            : `Blocked: "${p.name}" batch ${p.attributes?.batch || ""} is expired!`
        );
        return;
      }
    }
    const unitPrice =
      activeIndustry === "grocery" && wholesaleMode && Number(p.attributes?.wholesale) > 0
        ? Number(p.attributes?.wholesale)
        : Number(p.sell_price) || 0;

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === p.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1, price: unitPrice };
        return next;
      }
      return [...prev, { product: p, qty: 1, price: unitPrice }];
    });
  }

  // Instant Barcode / SKU Enter-to-Cart
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = search.trim().toLowerCase();
    if (!q) return;
    const exact = products.find(
      (p) => !p.archived && ((p.barcode || "").toLowerCase() === q || (p.sku || "").toLowerCase() === q)
    );
    if (exact) {
      e.preventDefault();
      handleSafeAddToCart(exact);
      setSearch("");
      toast.success(`${exact.name} +1`);
    }
  }

  async function handleHoldPharmacyOrder() {
    if (cart.length === 0) return;
    const refNumber = holdRefInput.trim() || `REF-${Date.now().toString().slice(-4)}`;
    const hold: HoldOrderItem = {
      id: `HOLD-${Date.now().toString().slice(-6)}`,
      refNumber,
      customerName: refNumber,
      items: cart.map((c) => ({ productId: c.product.id, name: c.product.name, qty: c.qty, price: c.price })),
      total: cartTotal,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setHoldOrders((prev) => [hold, ...prev]);
    setCart([]);
    setHoldRefInput("");
    void upsertPharmacyHoldOrderFn({ data: hold }).catch(() => {});
    toast.success(lang === "bn" ? `বিল হোল্ড করা হয়েছে (${refNumber})` : `Order placed on hold (${refNumber})`);
  }

  function handleRecallHoldOrder(hold: HoldOrderItem) {
    const restored: { product: Product; qty: number; price: number }[] = [];
    hold.items.forEach((it) => {
      const found = products.find((p) => p.id === it.productId || p.name === it.name);
      if (found) restored.push({ product: found, qty: it.qty, price: it.price });
    });
    setCart(restored);
    setHoldOrders((prev) => prev.filter((h) => h.id !== hold.id));
    void deletePharmacyHoldOrderFn({ data: { id: hold.id } }).catch(() => {});
    setPharmacyTab("inventory");
    toast.success(lang === "bn" ? `হোল্ড বিল রিকল হয়েছে (${hold.refNumber})` : `Recalled ${hold.refNumber}`);
  }

  async function handleAddRxOrder(e: React.FormEvent) {
    e.preventDefault();
    const drug = products.find((p) => p.id === rxDrugId) || products[0];
    if (!rxDoctorName.trim() || !drug) {
      toast.error(lang === "bn" ? "ডাক্তারের নাম ও ওষুধ নির্বাচন করুন" : "Enter doctor name and select a medicine");
      return;
    }
    const qty = Math.max(1, Number(rxQty) || 1);
    const nextOrder: RxOrderItem = {
      id: `RX-${Date.now().toString().slice(-5)}`,
      doctorName: rxDoctorName.trim(),
      doctorID: rxDoctorId.trim() || `DOC-${Date.now().toString().slice(-3)}`,
      doctorContact: rxDoctorContact.trim(),
      drugId: drug.id,
      drugNames: drug.name,
      drugPrice: Number(drug.sell_price) || 0,
      drugQuantity: qty,
      pickupDate: rxPickupDate || new Date().toISOString().slice(0, 10),
      status: "pending",
    };
    setRxOrders((prev) => [nextOrder, ...prev]);
    void upsertPharmacyRxOrderFn({ data: nextOrder }).catch(() => {});
    setRxDoctorName("");
    setRxDoctorId("");
    setRxDoctorContact("");
    setRxQty("1");
    toast.success(lang === "bn" ? "প্রেসক্রিপশন অর্ডার যুক্ত হয়েছে" : `Created Rx Order ${nextOrder.id}`);
  }

  function handleVerifyOrPickupRx(rx: RxOrderItem, nextStatus: RxOrderItem["status"]) {
    const updated = { ...rx, status: nextStatus };
    setRxOrders((prev) => prev.map((r) => (r.id === rx.id ? updated : r)));
    void upsertPharmacyRxOrderFn({ data: updated }).catch(() => {});
    if (nextStatus === "verified") {
      const drug = products.find((p) => p.id === rx.drugId || p.name === rx.drugNames);
      if (drug) {
        for (let i = 0; i < rx.drugQuantity; i++) handleSafeAddToCart(drug);
        setPharmacyTab("inventory");
        toast.success(lang === "bn" ? "যাচাই করে পিওএস কার্টে যোগ হয়েছে" : `Verified ${rx.id} & loaded into POS cart`);
        return;
      }
    }
    toast.success(lang === "bn" ? "স্ট্যাটাস আপডেট হয়েছে" : `Rx Order ${rx.id} marked ${nextStatus.replace("_", " ")}`);
  }

  async function handleAddPharmacySupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!supName.trim()) return;
    const drugsList = supDrugs.split(",").map((s) => s.trim()).filter(Boolean);
    const nextSup: PharmacySupplierItem = {
      id: `SUP-${Date.now().toString().slice(-5)}`,
      supplierID: `PH-${Math.floor(1000 + Math.random() * 9000)}`,
      name: supName.trim(),
      email: supEmail.trim(),
      contact: supContact.trim(),
      drugsAvailable: drugsList,
    };
    setPharmaSuppliers((prev) => [nextSup, ...prev]);
    void upsertPharmacySupplierFn({ data: nextSup }).catch(() => {});
    if (supContact.trim()) {
      void createPartyFn({ data: { name: supName.trim(), phone: supContact.trim() } }).catch(() => {});
    }
    setSupName("");
    setSupEmail("");
    setSupContact("");
    setSupDrugs("");
    toast.success(lang === "bn" ? "ফার্মেসি সাপ্লায়ার যুক্ত হয়েছে" : `Saved supplier ${nextSup.name}`);
  }

  async function handleCreateIndustryProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const attributes: Record<string, string> = { industry: activeIndustry };
      if (activeIndustry === "pharmacy") {
        if (batchNo) attributes.batch = batchNo;
        if (expiryDate) attributes.expiry = expiryDate;
      } else if (activeIndustry === "fashion") {
        if (sizeVal) attributes.size = sizeVal;
        if (colorVal) attributes.color = colorVal;
      } else if (activeIndustry === "grocery") {
        if (unitType) attributes.unit = unitType;
        if (wholesalePrice) attributes.wholesale = wholesalePrice;
      }

      await createProductFn({
        data: {
          name: name.trim(),
          buy_price: Number(buyPrice) || 0,
          sell_price: Number(sellPrice) || 0,
          stock: Number(stock) || 0,
          barcode: barcodeVal.trim() || null,
          category: PRIORITY_ERP_MODULES.find((m) => m.id === activeIndustry)?.title || "Inventory",
          attributes,
        },
      });
      toast.success(lang === "bn" ? "আইটেম সফলভাবে যুক্ত হয়েছে" : "Item added to inventory");
      setAddOpen(false);
      setName("");
      setBuyPrice("");
      setSellPrice("");
      setStock("10");
      setBarcodeVal("");
      setBatchNo("");
      setExpiryDate("");
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmCheckout(pay: PosPayResult) {
    if (cart.length === 0) return;
    setCheckoutBusy(true);
    try {
      const totalDiscount = Math.max(0, Number(discountVal) || 0);
      const perItemDisc = cart.length > 0 ? Math.round(totalDiscount / cart.length) : 0;
      for (const item of cart) {
        await createSaleFn({
          data: {
            product_id: item.product.id,
            product_name: item.product.name,
            qty: item.qty,
            buy_price: Number(item.product.buy_price) || 0,
            sell_price: item.price,
            discount: perItemDisc,
            type: pay.paymentMethod === "split" ? "split" : pay.paymentMethod === "bkash" || pay.paymentMethod === "nagad" ? "bkash" : pay.paymentMethod === "card" ? "bank" : "cash",
            split_cash: pay.paymentMethod === "split" ? pay.splitCash : undefined,
            split_bkash: pay.paymentMethod === "split" ? pay.splitDigital : undefined,
            note: `${activeIndustry.toUpperCase()} POS • Paid: ৳${pay.tendered} • Change: ৳${pay.changeDue}`,
          },
        });
      }
      if (pay.autoPrint && typeof window !== "undefined") {
        window.print();
      }
      toast.success(
        lang === "bn"
          ? `বিক্রি সম্পন্ন (৳${cartTotal.toLocaleString()})`
          : `Checkout completed (৳${cartTotal.toLocaleString()}${pay.changeDue > 0 ? ` • Change ৳${pay.changeDue}` : ""})`
      );
      setCart([]);
      setDiscountVal(0);
      setPayModalOpen(false);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
    } catch (err: any) {
      toast.error(err?.message || "Checkout failed");
    } finally {
      setCheckoutBusy(false);
    }
  }

  // If a restaurant tenant visits /erp, redirect cleanly to dedicated Restaurant POS
  if (rawIndustry === "restaurant") {
    return (
      <Card className="p-8 rounded-3xl max-w-lg mx-auto my-8 text-center space-y-4">
        <Utensils className="size-10 text-[#FF6B00] mx-auto" />
        <h2 className="text-lg font-bold">
          {lang === "bn" ? "রেস্তোরাঁ পিওএস ও ডাইনিং" : "Dedicated Restaurant POS"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {lang === "bn"
            ? "আপনার অ্যাকাউন্ট রেস্তোরাঁ ইন্ডাস্ট্রির জন্য নির্ধারিত। নিচের বাটনে ক্লিক করে রেস্তোরাঁ পিওএস খুলুন।"
            : "Your workspace is configured for Restaurant & Cafe operations with floors, tables, KDS, shifts & bill queue."}
        </p>
        <Link href="/restaurant">
          <Button className="h-11 px-6 rounded-2xl bg-[#FF6B00] hover:bg-[#E55F00] text-white font-bold cursor-pointer">
            {lang === "bn" ? "রেস্তোরাঁ পিওএস খুলুন" : "Open Restaurant POS"}
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Contextual Actions projected into AppShell Primary Header */}
      <PrimaryHeaderSlot>
        {activeIndustry === "fashion" && (
          <>
            <Link href="/labels">
              <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-full text-[11px] gap-1 cursor-pointer">
                <Barcode className="size-3" />
                <span>{lang === "bn" ? "বারকোড ট্যাগ" : "Hangtags"}</span>
              </Button>
            </Link>
            <Link href="/online-sells">
              <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-full text-[11px] gap-1 cursor-pointer">
                <ShoppingBag className="size-3" />
                <span>{lang === "bn" ? "অনলাইন অর্ডার" : "Online Orders"}</span>
              </Button>
            </Link>
          </>
        )}
        {activeIndustry === "pharmacy" && (
          <Link href="/purchases">
            <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-full text-[11px] gap-1 cursor-pointer">
              <Package className="size-3" />
              <span>{lang === "bn" ? "স্টক রিস্টক" : "Reorder Stock"}</span>
            </Button>
          </Link>
        )}
        {activeIndustry === "grocery" && (
          <button
            type="button"
            onClick={() => setWholesaleMode((v) => !v)}
            className={`h-7 px-2.5 rounded-full text-[11px] font-bold border cursor-pointer ${
              wholesaleMode ? "bg-emerald-600 text-white border-emerald-600" : "bg-card border-border text-foreground"
            }`}
          >
            {wholesaleMode ? (lang === "bn" ? "পাইকারি দর চালু" : "Wholesale: ON") : (lang === "bn" ? "খুচরা দর" : "Retail Mode")}
          </button>
        )}
        <Button size="sm" onClick={() => setAddOpen(true)} className="h-7 px-3 rounded-full text-[11px] font-bold gap-1 cursor-pointer">
          <Plus className="size-3.5" />
          <span>{lang === "bn" ? "নতুন আইটেম" : "Add Item"}</span>
        </Button>
      </PrimaryHeaderSlot>

      {/* Focused 4-Card KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 rounded-2xl flex items-center gap-3">
          <Package className="size-5 text-primary shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "সক্রিয় পণ্য" : "Active SKUs"}</div>
            <div className="text-base font-bold">{products.filter((p) => !p.archived).length}</div>
          </div>
        </Card>
        <Card className="p-3.5 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "কম স্টক" : "Low Stock"}</div>
            <div className="text-base font-bold text-amber-600">{lowStockCount}</div>
          </div>
        </Card>
        {activeIndustry === "pharmacy" ? (
          <Card className="p-3.5 rounded-2xl flex items-center gap-3">
            <Pill className="size-5 text-rose-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "মেয়াদ সতর্কতা (৯০ দিন)" : "Expiry Alerts (90d)"}</div>
              <div className="text-base font-bold text-rose-600">{expiringCount}</div>
            </div>
          </Card>
        ) : activeIndustry === "fashion" ? (
          <Card className="p-3.5 rounded-2xl flex items-center gap-3">
            <Shirt className="size-5 text-purple-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "সাইজ ভ্যারিয়েন্ট" : "Size Variants"}</div>
              <div className="text-base font-bold text-purple-600">{products.filter((p) => Boolean(p.attributes?.size)).length}</div>
            </div>
          </Card>
        ) : (
          <Card className="p-3.5 rounded-2xl flex items-center gap-3">
            <ShoppingCart className="size-5 text-emerald-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{lang === "bn" ? "পাইকারি রেডি" : "Wholesale Ready"}</div>
              <div className="text-base font-bold text-emerald-600">
                {products.filter((p) => Boolean(p.attributes?.wholesale || p.attributes?.unit)).length}
              </div>
            </div>
          </Card>
        )}
        <Card className="p-3.5 rounded-2xl flex items-center gap-3">
          <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">PostgreSQL</div>
            <div className="text-xs font-bold text-emerald-600">{lang === "bn" ? "সুরক্ষিত ও সিঙ্কড" : "Synced & Isolated"}</div>
          </div>
        </Card>
      </div>

      {/* PharmaSpot Module Switcher */}
      {activeIndustry === "pharmacy" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-2 rounded-2xl border border-border">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "inventory", icon: Pill, label: lang === "bn" ? "ডিসপেন্স পিওএস" : "Dispense POS" },
                  { id: "hold_orders", icon: PauseCircle, label: lang === "bn" ? `হোল্ড বিল (${holdOrders.length})` : `Hold Orders (${holdOrders.length})` },
                  { id: "rx_orders", icon: Stethoscope, label: lang === "bn" ? `ডাক্তার / Rx (${rxOrders.length})` : `Doctor / Rx (${rxOrders.length})` },
                  { id: "suppliers", icon: Truck, label: lang === "bn" ? "সাপ্লায়ার" : "Suppliers" },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPharmacyTab(tab.id)}
                    className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      pharmacyTab === tab.id ? "bg-rose-600 text-white shadow-xs" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {pharmacyTab === "inventory" && (
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "all", label: lang === "bn" ? "সব ব্যাচ" : "All Batches" },
                    { id: "expiring", label: lang === "bn" ? "মেয়াদ <=৯০ দিন" : "Expiring <= 90d" },
                    { id: "expired", label: lang === "bn" ? "মেয়াদ শেষ" : "Expired" },
                    { id: "low_stock", label: lang === "bn" ? "কম স্টক" : "Low Stock" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBatchFilter(f.id)}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer border ${
                      batchFilter === f.id
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PharmaSpot On-Hold Orders */}
          {pharmacyTab === "hold_orders" && (
            <Card className="p-4 rounded-2xl space-y-3">
              <div className="font-bold text-sm">{lang === "bn" ? "হোল্ড করা ফার্মেসি বিল" : "On-Hold Pharmacy Bills (PostgreSQL)"}</div>
              {holdOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  {lang === "bn" ? "কোনো বিল হোল্ড করা নেই।" : "No orders on hold right now."}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {holdOrders.map((h) => (
                    <div key={h.id} className="p-3.5 rounded-2xl border border-border bg-muted/25 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{h.refNumber}</span>
                        <span className="font-black text-primary">৳ {h.total.toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {h.items.map((it) => `${it.qty}x ${it.name}`).join(", ")} • {h.createdAt}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" onClick={() => handleRecallHoldOrder(h)} className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1 cursor-pointer">
                          <PlayCircle className="size-3.5" />
                          <span>{lang === "bn" ? "রিকল ও বিল" : "Recall to POS"}</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setHoldOrders((prev) => prev.filter((x) => x.id !== h.id));
                            void deletePharmacyHoldOrderFn({ data: { id: h.id } }).catch(() => {});
                          }}
                          className="size-9 rounded-xl border border-rose-200 text-rose-500 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Doctor / Rx Orders */}
          {pharmacyTab === "rx_orders" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Card className="lg:col-span-5 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ClipboardList className="size-4 text-rose-600" />
                  <span>{lang === "bn" ? "নতুন প্রেসক্রিপশন / Rx অর্ডার" : "New Doctor / Clinic Rx Order"}</span>
                </div>
                <form onSubmit={handleAddRxOrder} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <Input required value={rxDoctorName} onChange={(e) => setRxDoctorName(e.target.value)} placeholder="Doctor Name *" className="h-10 rounded-xl" />
                    <Input value={rxDoctorId} onChange={(e) => setRxDoctorId(e.target.value)} placeholder="Doctor ID / BMDC" className="h-10 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={rxDoctorContact} onChange={(e) => setRxDoctorContact(e.target.value)} placeholder="Phone" className="h-10 rounded-xl" />
                    <Input type="date" value={rxPickupDate} onChange={(e) => setRxPickupDate(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={rxDrugId} onChange={(e) => setRxDrugId(e.target.value)} className="col-span-2 h-10 px-2.5 rounded-xl border border-border bg-background text-xs font-semibold">
                      <option value="">Select Medicine...</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id}>{pr.name} (৳{pr.sell_price} • Stock: {pr.stock})</option>
                      ))}
                    </select>
                    <Input type="number" min={1} value={rxQty} onChange={(e) => setRxQty(e.target.value)} placeholder="Qty" className="h-10 rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer">
                    + Queue Rx Order
                  </Button>
                </form>
              </Card>

              <Card className="lg:col-span-7 p-4 rounded-2xl space-y-3">
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>Rx Verification & Pickup Queue (PostgreSQL)</span>
                  <span className="text-[11px] text-muted-foreground">{rxOrders.length} orders</span>
                </div>
                <div className="space-y-2 max-h-[340px] overflow-y-auto text-xs">
                  {rxOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No Doctor / Rx orders queued yet.</p>
                  ) : (
                    rxOrders.map((rx) => (
                      <div key={rx.id} className="p-3 rounded-2xl border border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span>{rx.id} • Dr. {rx.doctorName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rx.status === "pending" ? "bg-amber-500/15 text-amber-700" : rx.status === "verified" ? "bg-blue-500/15 text-blue-600" : "bg-emerald-500/15 text-emerald-600"
                            }`}>
                              {rx.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {rx.drugNames} × {rx.drugQuantity} (৳ {rx.drugPrice * rx.drugQuantity}) • Pickup: {rx.pickupDate}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {rx.status === "pending" && (
                            <Button size="sm" onClick={() => handleVerifyOrPickupRx(rx, "verified")} className="h-8 rounded-xl bg-blue-600 text-white text-[11px] font-bold cursor-pointer">
                              Verify & Load POS
                            </Button>
                          )}
                          {rx.status === "verified" && (
                            <Button size="sm" onClick={() => handleVerifyOrPickupRx(rx, "picked_up")} className="h-8 rounded-xl bg-emerald-600 text-white text-[11px] font-bold cursor-pointer">
                              Mark Picked Up
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRxOrders((prev) => prev.filter((r) => r.id !== rx.id));
                              void deletePharmacyRxOrderFn({ data: { id: rx.id } }).catch(() => {});
                            }}
                            className="size-8 rounded-xl border border-rose-200 text-rose-500 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Pharmacy Suppliers */}
          {pharmacyTab === "suppliers" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Card className="lg:col-span-4 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Truck className="size-4 text-rose-600" />
                  <span>Register Drug Supplier</span>
                </div>
                <form onSubmit={handleAddPharmacySupplier} className="space-y-2.5 text-xs">
                  <Input required value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="Supplier / Distributor Name *" className="h-10 rounded-xl" />
                  <Input value={supContact} onChange={(e) => setSupContact(e.target.value)} placeholder="Contact Phone" className="h-10 rounded-xl" />
                  <Input type="email" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} placeholder="Email Address" className="h-10 rounded-xl" />
                  <Input value={supDrugs} onChange={(e) => setSupDrugs(e.target.value)} placeholder="Drugs available (comma-separated)" className="h-10 rounded-xl" />
                  <Button type="submit" className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer">
                    + Save Supplier
                  </Button>
                </form>
              </Card>

              <Card className="lg:col-span-8 p-4 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sm">Verified Suppliers (PostgreSQL)</span>
                  <Input value={supFilter} onChange={(e) => setSupFilter(e.target.value)} placeholder="Filter by drug or supplier..." className="h-8 w-56 rounded-xl text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto text-xs">
                  {pharmaSuppliers
                    .filter(
                      (s) =>
                        !supFilter.trim() ||
                        s.name.toLowerCase().includes(supFilter.toLowerCase()) ||
                        (s.drugsAvailable || []).some((d) => d.toLowerCase().includes(supFilter.toLowerCase()))
                    )
                    .map((s) => (
                      <div key={s.id} className="p-3 rounded-2xl border border-border bg-muted/20 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground">{s.supplierID} • {s.contact || "No phone"}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPharmaSuppliers((prev) => prev.filter((x) => x.id !== s.id));
                              void deletePharmacySupplierFn({ data: { id: s.id } }).catch(() => {});
                            }}
                            className="text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(s.drugsAvailable || []).map((d, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">{d}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Main Split: Inventory Grid + Touch-Friendly POS Cart */}
      {(activeIndustry !== "pharmacy" || pharmacyTab === "inventory") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-3">
            {/* Search & Barcode Instant Scan Bar */}
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  activeIndustry === "pharmacy"
                    ? "Scan barcode or search medicine, generic, batch..."
                    : activeIndustry === "fashion"
                      ? "Scan garment barcode or search dress, size, color..."
                      : "Scan barcode or search grocery item, unit..."
                }
                className="pl-10 h-11 rounded-2xl bg-card"
              />
            </div>

            {/* Easy Fashion POS: 1-Tap Size & Color Filter Strip */}
            {activeIndustry === "fashion" && (
              <div className="flex flex-wrap items-center gap-1.5 bg-card p-2.5 rounded-2xl border border-border">
                <span className="text-[11px] font-bold text-muted-foreground px-1">
                  {lang === "bn" ? "সাইজ:" : "Size:"}
                </span>
                {["ALL", "S", "M", "L", "XL", "XXL", "FREE"].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`h-8 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      selectedSize === sz
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sz === "ALL" ? (lang === "bn" ? "সব" : "All") : sz}
                  </button>
                ))}
                {fashionColors.length > 0 && (
                  <>
                    <div className="h-4 w-px bg-border mx-1" />
                    <button
                      type="button"
                      onClick={() => setSelectedColor("ALL")}
                      className={`h-8 px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        selectedColor === "ALL" ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {lang === "bn" ? "সব কালার" : "All Colors"}
                    </button>
                    {fashionColors.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColor(col)}
                        className={`h-8 px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                          selectedColor === col ? "bg-purple-600 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Grocery POS: Quick Unit Filter Pills */}
            {activeIndustry === "grocery" && (
              <div className="flex flex-wrap items-center gap-1.5 bg-card p-2.5 rounded-2xl border border-border">
                {["ALL", "KG", "Litre", "Pack", "Pcs"].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSelectedUnit(u)}
                    className={`h-8 px-3 rounded-xl text-xs font-bold cursor-pointer ${
                      selectedUnit === u ? "bg-emerald-600 text-white" : "bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {u === "ALL" ? (lang === "bn" ? "সব ইউনিট" : "All Units") : u}
                  </button>
                ))}
              </div>
            )}

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.slice(0, 30).map((p) => {
                const daysLeft = activeIndustry === "pharmacy" ? getExpiryDays(p.attributes?.expiry) : null;
                const isExpiredBatch = daysLeft !== null && daysLeft < 0;
                const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 90;
                const displayPrice =
                  activeIndustry === "grocery" && wholesaleMode && Number(p.attributes?.wholesale) > 0
                    ? Number(p.attributes?.wholesale)
                    : Number(p.sell_price) || 0;

                return (
                  <Card
                    key={p.id}
                    className={`p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all ${
                      isExpiredBatch ? "border-rose-500/60 bg-rose-500/5" : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm line-clamp-1">{p.name}</h3>
                        <div className="text-[11px] text-muted-foreground">
                          Stock: <span className="font-bold text-foreground">{p.stock}</span>
                          {p.attributes?.unit ? ` ${p.attributes.unit}` : ""}
                        </div>
                      </div>
                      <span className="font-black text-sm text-primary shrink-0">৳ {displayPrice}</span>
                    </div>

                    {(p.attributes || isExpiredBatch || isExpiringSoon) && (
                      <div className="flex flex-wrap gap-1">
                        {isExpiredBatch && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">EXPIRED</span>
                        )}
                        {isExpiringSoon && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                            Exp in {daysLeft}d
                          </span>
                        )}
                        {p.attributes?.batch && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-semibold">
                            Batch: {p.attributes.batch}
                          </span>
                        )}
                        {p.attributes?.size && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold">
                            Size: {p.attributes.size}
                          </span>
                        )}
                        {p.attributes?.color && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold">
                            {p.attributes.color}
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      disabled={isExpiredBatch}
                      onClick={() => handleSafeAddToCart(p)}
                      className="w-full h-10 rounded-xl text-xs font-bold gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Plus className="size-4" />
                      <span>{isExpiredBatch ? "Blocked (Expired)" : lang === "bn" ? "কার্টে যোগ করুন" : "Add to Cart"}</span>
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right: Touch-First POS Cart with Discount, Hold (PharmaSpot) & Numpad Pay */}
          <div className="lg:col-span-4">
            <Card className="p-4 rounded-2xl sticky top-20 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShoppingBag className="size-4 text-primary" />
                  <span>{PRIORITY_ERP_MODULES.find((m) => m.id === activeIndustry)?.title}</span>
                </div>
                {cart.length > 0 && (
                  <button type="button" onClick={() => setCart([])} className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer">
                    {lang === "bn" ? "মুছুন" : "Clear"}
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground space-y-1">
                  <Barcode className="size-8 mx-auto opacity-30" />
                  <p>{lang === "bn" ? "পণ্য নির্বাচন বা বারকোড স্ক্যান করুন" : "Tap any item or scan barcode to bill"}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {cart.map((item, idx) => (
                    <div key={item.product.id} className="p-2.5 rounded-xl bg-muted/45 border border-border/60 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{item.product.name}</div>
                        <div className="text-[11px] text-primary font-semibold">
                          ৳ {item.price} × {item.qty} = ৳ {item.price * item.qty}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setCart((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, qty: it.qty - 1 } : it)).filter((it) => it.qty > 0)
                            )
                          }
                          className="size-8 rounded-lg bg-background border flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: it.qty + 1 } : it)))}
                          className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 font-semibold">
                    <Tag className="size-3.5" />
                    {lang === "bn" ? "ছাড় (৳)" : "Discount (৳)"}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={discountVal || ""}
                    onChange={(e) => setDiscountVal(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 h-8 rounded-lg text-right text-xs font-bold"
                  />
                </div>
              )}

              {activeIndustry === "pharmacy" && cart.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={holdRefInput}
                    onChange={(e) => setHoldRefInput(e.target.value)}
                    placeholder={lang === "bn" ? "হোল্ড রেফারেন্স / রোগীর নাম" : "Hold Ref / Patient Name"}
                    className="h-9 rounded-xl text-xs"
                  />
                  <Button type="button" variant="outline" onClick={handleHoldPharmacyOrder} className="h-9 px-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer">
                    <PauseCircle className="size-3.5 mr-1" />
                    {lang === "bn" ? "হোল্ড" : "Hold"}
                  </Button>
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex justify-between font-black text-base">
                  <span>{lang === "bn" ? "মোট বিল" : "Total Payable"}</span>
                  <span className="text-primary">৳ {cartTotal.toLocaleString()}</span>
                </div>
                <Button
                  type="button"
                  disabled={cart.length === 0 || checkoutBusy}
                  onClick={() => setPayModalOpen(true)}
                  className="w-full h-12 rounded-2xl font-bold text-sm cursor-pointer gap-1.5"
                >
                  {checkoutBusy ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  <span>{lang === "bn" ? "পেমেন্ট ও চেঞ্জ" : "Pay & Checkout"}</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Touch Numpad Split-Payment & Change Calculator */}
      <PosNumpadPayModal
        open={payModalOpen}
        onOpenChange={setPayModalOpen}
        totalAmount={cartTotal}
        busy={checkoutBusy}
        title={PRIORITY_ERP_MODULES.find((m) => m.id === activeIndustry)?.title}
        onConfirm={handleConfirmCheckout}
      />

      {/* Add Industry Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {lang === "bn" ? "নতুন আইটেম যোগ করুন" : `Add ${PRIORITY_ERP_MODULES.find((m) => m.id === activeIndustry)?.title} Item`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateIndustryProduct} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Item Name *</label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter item name" className="h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold block mb-1">Buy Price</label>
                <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Sell Price *</label>
                <Input required type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0" className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Stock Qty</label>
                <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="10" className="h-10 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Barcode / SKU</label>
              <Input value={barcodeVal} onChange={(e) => setBarcodeVal(e.target.value)} placeholder="Scan or enter barcode" className="h-10 rounded-xl" />
            </div>

            {activeIndustry === "pharmacy" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Batch Number</label>
                  <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="B-2026-01" className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Expiry Date</label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-10 rounded-xl" />
                </div>
              </div>
            )}

            {activeIndustry === "fashion" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Size</label>
                  <Input value={sizeVal} onChange={(e) => setSizeVal(e.target.value)} placeholder="S / M / L / XL" className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Color</label>
                  <Input value={colorVal} onChange={(e) => setColorVal(e.target.value)} placeholder="Emerald / Black" className="h-10 rounded-xl" />
                </div>
              </div>
            )}

            {activeIndustry === "grocery" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Unit (KG / Litre / Pcs)</label>
                  <Input value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="KG" className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Wholesale Price</label>
                  <Input type="number" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} placeholder="0" className="h-10 rounded-xl" />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl text-xs">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl text-xs font-bold">
                {saving ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : null}
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
