"use client";

import { useState, useMemo, useEffect } from "react";
import { Stethoscope, Truck, Calendar, ClipboardList, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getProducts, type Product } from "@/lib/queries";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { createProductFn, createSaleFn, createPartyFn } from "@/lib/rpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import {
  Pill,
  Smartphone,
  Shirt,
  ShoppingCart,
  Briefcase,
  Utensils,
  Plus,
  Search,
  ShoppingBag,
  AlertTriangle,
  ShieldCheck,
  Package,
  Barcode,
  CheckCircle2,
  RefreshCw,
  Minus,
  Layers,
} from "lucide-react";

type IndustryKey = "pharmacy" | "electronics" | "fashion" | "grocery" | "retail";

const ERP_MODULES: {
  id: IndustryKey;
  title: string;
  titleBn: string;
  icon: any;
  color: string;
  desc: string;
  descBn: string;
  highlightEn: string;
  highlightBn: string;
}[] = [
  {
    id: "fashion",
    title: "Fashion & Boutique ERP",
    titleBn: "ফ্যাশন ও বুটিক ইআরপি",
    icon: Shirt,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/25",
    desc: "Size/Color matrix & Hangtags",
    descBn: "সাইজ, কালার এবং হ্যাংট্যাগ",
    highlightEn: "Manage garment sizes, color variants, barcode hangtags & online orders.",
    highlightBn: "পোশাকের সাইজ, কালার ভ্যারিয়েন্ট, বারকোড ট্যাগ ও অনলাইন অর্ডার পরিচালনা করুন।",
  },
  {
    id: "electronics",
    title: "Electronics & Gadgets ERP",
    titleBn: "ইলেকট্রনিক্স ও গ্যাজেট ইআরপি",
    icon: Smartphone,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/25",
    desc: "IMEI/Serial & Warranty tracking",
    descBn: "আইএমইআই, সিরিয়াল ও ওয়ারেন্টি",
    highlightEn: "Track IMEI / Serial numbers, device warranty periods & service trackback.",
    highlightBn: "আইএমইআই বা সিরিয়াল নম্বর, ওয়ারেন্টি মেয়াদ ও সার্ভিস ট্র্যাক করুন।",
  },
  {
    id: "pharmacy",
    title: "Pharmacy & Healthcare ERP",
    titleBn: "ফার্মেসি ও হেলথকেয়ার ইআরপি",
    icon: Pill,
    color: "text-rose-600 bg-rose-500/10 border-rose-500/25",
    desc: "Batch, Expiry alerts & Rx POS",
    descBn: "ব্যাচ, মেয়াদ সতর্কতা ও দ্রুত বিলিং",
    highlightEn: "Monitor medicine batch numbers, 90-day expiry alerts & fast counter billing.",
    highlightBn: "ওষুধের ব্যাচ নম্বর, মেয়াদোত্তীর্ণ সতর্কতা ও দ্রুত কাউন্টার বিলিং দেখুন।",
  },
  {
    id: "grocery",
    title: "Grocery & Superstore ERP",
    titleBn: "মুদি ও সুপারশপ ইআরপি",
    icon: ShoppingCart,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25",
    desc: "Weight/Unit & Wholesale tiers",
    descBn: "ওজন, ইউনিট ও পাইকারি দর",
    highlightEn: "Sell by Kg/Litre/Pack, manage wholesale rates & instant low-stock restocking.",
    highlightBn: "কেজি, লিটার বা প্যাক হিসেবে বিক্রি, পাইকারি রেট ও কম স্টক অ্যালার্ট দেখুন।",
  },
  {
    id: "retail",
    title: "General Retail & Wholesale",
    titleBn: "সাধারণ ও পাইকারি ইআরপি",
    icon: Briefcase,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/25",
    desc: "Inventory, Ledger & Fast POS",
    descBn: "ইনভেন্টরি, খাতা ও দ্রুত বিলিং",
    highlightEn: "All-in-one retail inventory, customer dues ledger & fast POS checkout.",
    highlightBn: "সম্পূর্ণ রিটেইল স্টক, কাস্টমার বাকি খাতা ও দ্রুত বিলিং।",
  },
];

export default function MultiIndustryErpPage() {
  const { user } = useAuth();
  const { lang } = useT();
  const qc = useQueryClient();

  const lockedIndustry = (ERP_MODULES.some((m) => m.id === user?.industry) ? user?.industry : "retail") as IndustryKey;
  const activeIndustry = lockedIndustry;
  const [search, setSearch] = useState("");

  const { data: products = [] } = useCachedQuery<Product[]>(["products"], getProducts);

  // Quick Add Industry Item Modal
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("10");
  // Industry-specific fields
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [imeiSerial, setImeiSerial] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("12");
  const [sizeVal, setSizeVal] = useState("M / L / XL");
  const [colorVal, setColorVal] = useState("");
  const [unitType, setUnitType] = useState("Pcs");
  const [wholesalePrice, setWholesalePrice] = useState("");

  // Quick POS Cart
  const [cart, setCart] = useState<{ product: Product; qty: number; price: number }[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // Pharmacy Management ERP Sub-Modules (modeled on Pharmacy Inventory, Doctor/Rx Orders & Supplier drugsAvailable)
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

  const [pharmacyTab, setPharmacyTab] = useState<"inventory" | "rx_orders" | "suppliers">("inventory");
  const [batchFilter, setBatchFilter] = useState<"all" | "expiring" | "expired" | "low_stock">("all");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const tenantKey = user?.business_id || user?.id || "default";
      const savedRx = localStorage.getItem(`urobili_pharmacy_rx_${tenantKey}`);
      if (savedRx) setRxOrders(JSON.parse(savedRx));
      const savedSup = localStorage.getItem(`urobili_pharmacy_sup_${tenantKey}`);
      if (savedSup) setPharmaSuppliers(JSON.parse(savedSup));
    } catch (_) {}
  }, [user?.business_id, user?.id]);

  function getExpiryDays(expiry?: string) {
    if (!expiry) return null;
    const ms = new Date(expiry).getTime();
    if (Number.isNaN(ms)) return null;
    return Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function persistRxOrders(next: RxOrderItem[]) {
    setRxOrders(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`urobili_pharmacy_rx_${user?.business_id || user?.id || "default"}`, JSON.stringify(next));
      } catch (_) {}
    }
  }

  function persistPharmaSuppliers(next: PharmacySupplierItem[]) {
    setPharmaSuppliers(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`urobili_pharmacy_sup_${user?.business_id || user?.id || "default"}`, JSON.stringify(next));
      } catch (_) {}
    }
  }

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
    addToCart(p);
  }

  function handleAddRxOrder(e: React.FormEvent) {
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
    persistRxOrders([nextOrder, ...rxOrders]);
    setRxDoctorName("");
    setRxDoctorId("");
    setRxDoctorContact("");
    setRxQty("1");
    toast.success(lang === "bn" ? "প্রেসক্রিপশন অর্ডার যুক্ত হয়েছে" : `Created Rx Order ${nextOrder.id}`);
  }

  function handleVerifyOrPickupRx(rx: RxOrderItem, nextStatus: RxOrderItem["status"]) {
    persistRxOrders(rxOrders.map((r) => (r.id === rx.id ? { ...r, status: nextStatus } : r)));
    if (nextStatus === "verified") {
      const drug = products.find((p) => p.id === rx.drugId || p.name === rx.drugNames);
      if (drug) {
        for (let i = 0; i < rx.drugQuantity; i++) {
          handleSafeAddToCart(drug);
        }
        setPharmacyTab("inventory");
        toast.success(lang === "bn" ? "যাচাই করে পিওএস কার্টে যোগ করা হয়েছে" : `Verified ${rx.id} & loaded into POS cart`);
        return;
      }
    }
    toast.success(lang === "bn" ? "অর্ডার স্ট্যাটাস আপডেট হয়েছে" : `Rx Order ${rx.id} marked ${nextStatus.replace("_", " ")}`);
  }

  async function handleAddPharmacySupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!supName.trim()) return;
    const drugsList = supDrugs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const nextSup: PharmacySupplierItem = {
      id: `SUP-${Date.now().toString().slice(-5)}`,
      supplierID: `PH-${Math.floor(1000 + Math.random() * 9000)}`,
      name: supName.trim(),
      email: supEmail.trim(),
      contact: supContact.trim(),
      drugsAvailable: drugsList,
    };
    persistPharmaSuppliers([nextSup, ...pharmaSuppliers]);
    if (supContact.trim()) {
      void createPartyFn({ data: { name: supName.trim(), phone: supContact.trim() } }).catch(() => {});
    }
    setSupName("");
    setSupEmail("");
    setSupContact("");
    setSupDrugs("");
    toast.success(lang === "bn" ? "ফার্মেসি সাপ্লায়ার যুক্ত হয়েছে" : `Added supplier ${nextSup.name}`);
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (p.archived) return false;
      if (!q) return true;
      const attrStr = JSON.stringify(p.attributes || {}).toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q) ||
        attrStr.includes(q)
      );
    });
  }, [products, search]);

  // Pharmacy Expiry Alerts (expiring within 90 days or already expired)
  const expiringCount = useMemo(() => {
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return products.filter((p) => {
      const exp = p.attributes?.expiry;
      if (!exp) return false;
      const t = new Date(exp).getTime();
      return !isNaN(t) && t - now <= ninetyDays;
    }).length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => !p.archived && Number(p.stock) <= Number(p.min_stock ?? 5)).length;
  }, [products]);

  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.qty, 0), [cart]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === p.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { product: p, qty: 1, price: Number(p.sell_price) || 0 }];
    });
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
      } else if (activeIndustry === "electronics") {
        if (imeiSerial) attributes.imei = imeiSerial;
        if (warrantyMonths) attributes.warranty = `${warrantyMonths} Months`;
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
          category: activeIndustry.toUpperCase(),
          attributes,
        },
      });
      toast.success(lang === "bn" ? "পণ্য ERP ইনভেন্টরিতে যোগ হয়েছে!" : "Item added to ERP inventory!");
      qc.invalidateQueries({ queryKey: ["products"] });
      setAddOpen(false);
      setName("");
      setBuyPrice("");
      setSellPrice("");
      setBatchNo("");
      setExpiryDate("");
      setImeiSerial("");
      setColorVal("");
      setWholesalePrice("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  async function handlePosCheckout() {
    if (cart.length === 0) return;
    setCheckoutBusy(true);
    try {
      for (const item of cart) {
        await createSaleFn({
          data: {
            product_id: item.product.id,
            product_name: item.product.name,
            qty: item.qty,
            buy_price: Number(item.product.buy_price) || 0,
            sell_price: item.price,
            paid_amount: item.price * item.qty,
            due_amount: 0,
            type: "cash",
            notes: `ERP POS [${activeIndustry.toUpperCase()}]`,
          },
        });
      }
      toast.success(lang === "bn" ? "ERP POS বিক্রি সম্পন্ন হয়েছে!" : "ERP POS sale completed!");
      setCart([]);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["cashbox"] });
    } catch (err: any) {
      toast.error(err?.message || "Checkout failed");
    } finally {
      setCheckoutBusy(false);
    }
  }

  const activeMod = ERP_MODULES.find((m) => m.id === activeIndustry) || ERP_MODULES[0];
  const ModIcon = activeMod.icon;

  return (
    <div className="space-y-4 pb-10">
      {/* Locked Dedicated Industry Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-3xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-2xl border flex items-center justify-center ${activeMod.color}`}>
            <ModIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-serif">
              {lang === "bn" ? activeMod.titleBn : activeMod.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {lang === "bn" ? activeMod.highlightBn : activeMod.highlightEn}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.industry === "restaurant" && (
            <Link href="/restaurant">
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 cursor-pointer border-emerald-500/30 text-emerald-600">
                <Utensils className="size-3.5" />
                <span>{lang === "bn" ? "রেস্তোরাঁ পিওএস" : "Restaurant POS"}</span>
              </Button>
            </Link>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
            <Plus className="size-4" />
            <span>{lang === "bn" ? "নতুন আইটেম যোগ করুন" : "Add Item"}</span>
          </Button>
        </div>
      </div>

      {/* Dedicated Active Industry Workspace Banner */}
      {(() => {
        return (
          <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${activeMod.color}`}>
                <ModIcon className="size-5" />
              </div>
              <div>
                <div className="text-sm font-bold">{lang === "bn" ? activeMod.titleBn : activeMod.title}</div>
                <div className="text-xs text-muted-foreground">
                  {lang === "bn" ? activeMod.highlightBn : activeMod.highlightEn}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeIndustry === "fashion" && (
                <>
                  <Link href="/labels">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 cursor-pointer">
                      <Barcode className="size-3.5" />
                      <span>{lang === "bn" ? "বারকোড ট্যাগ" : "Hangtags & Labels"}</span>
                    </Button>
                  </Link>
                  <Link href="/online-sells">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 cursor-pointer">
                      <ShoppingBag className="size-3.5" />
                      <span>{lang === "bn" ? "অনলাইন বিক্রি" : "Online Orders"}</span>
                    </Button>
                  </Link>
                </>
              )}
              {activeIndustry === "electronics" && (
                <Link href="/trackback">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 cursor-pointer">
                    <ShieldCheck className="size-3.5" />
                    <span>{lang === "bn" ? "ওয়ারেন্টি ট্র্যাকব্যাক" : "Warranty Trackback"}</span>
                  </Button>
                </Link>
              )}
              {activeIndustry === "pharmacy" && (
                <Link href="/purchases">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 cursor-pointer">
                    <Package className="size-3.5" />
                    <span>{lang === "bn" ? "স্টক রিস্টক" : "Reorder Stock"}</span>
                  </Button>
                </Link>
              )}
              {activeIndustry === "grocery" && (
                <Link href="/sales">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 cursor-pointer">
                    <ShoppingCart className="size-3.5" />
                    <span>{lang === "bn" ? "দ্রুত কাউন্টার পিওএস" : "Fast Counter POS"}</span>
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Dedicated Industry KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 rounded-2xl flex items-center gap-3">
          <Package className="size-5 text-primary shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              {lang === "bn" ? "সক্রিয় পণ্য" : "Active SKUs"}
            </div>
            <div className="text-base font-bold">{products.filter((p) => !p.archived).length}</div>
          </div>
        </Card>
        <Card className="p-3.5 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              {lang === "bn" ? "কম স্টক সতর্কতা" : "Low Stock Alerts"}
            </div>
            <div className="text-base font-bold text-amber-600">{lowStockCount}</div>
          </div>
        </Card>
        {activeIndustry === "pharmacy" ? (
          <Card className="p-3.5 rounded-2xl flex items-center gap-3">
            <Pill className="size-5 text-rose-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {lang === "bn" ? "মেয়াদ সতর্কতা (৯০ দিন)" : "Expiry Alerts (90d)"}
              </div>
              <div className="text-base font-bold text-rose-600">{expiringCount}</div>
            </div>
          </Card>
        ) : activeIndustry === "electronics" ? (
          <Card className="p-3.5 rounded-2xl flex items-center gap-3">
            <Smartphone className="size-5 text-blue-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {lang === "bn" ? "আইএমইআই ট্র্যাকড" : "IMEI / Serial Tracked"}
              </div>
              <div className="text-base font-bold text-blue-600">
                {products.filter((p) => Boolean(p.attributes?.imei)).length}
              </div>
            </div>
          </Card>
        ) : activeIndustry === "fashion" ? (
          <Card className="p-3.5 rounded-2xl flex items-center gap-3">
            <Shirt className="size-5 text-purple-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {lang === "bn" ? "সাইজ ভ্যারিয়েন্ট" : "Size Variants"}
              </div>
              <div className="text-base font-bold text-purple-600">
                {products.filter((p) => Boolean(p.attributes?.size)).length}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-3.5 rounded-2xl flex items-center gap-3">
            <ShoppingCart className="size-5 text-emerald-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {lang === "bn" ? "ইউনিট ও পাইকারি" : "Wholesale Ready"}
              </div>
              <div className="text-base font-bold text-emerald-600">
                {products.filter((p) => Boolean(p.attributes?.wholesale || p.attributes?.unit)).length}
              </div>
            </div>
          </Card>
        )}
        <Card className="p-3.5 rounded-2xl flex items-center gap-3">
          <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              {lang === "bn" ? "ডাটাবেজ সুরক্ষা" : "PostgreSQL Tenant"}
            </div>
            <div className="text-xs font-bold text-emerald-600">
              {lang === "bn" ? "সুরক্ষিত ও আলাদা" : "Isolated & Secured"}
            </div>
          </div>
        </Card>
      </div>

      {/* Pharmacy Specialized Module Switcher & Batch Filters */}
      {activeIndustry === "pharmacy" && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-2.5 rounded-2xl border border-border">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPharmacyTab("inventory")}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  pharmacyTab === "inventory" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <Pill className="size-3.5" />
                <span>{lang === "bn" ? "ওষুধ ও ব্যাচ স্টক" : "Drug Inventory & POS"}</span>
              </button>
              <button
                type="button"
                onClick={() => setPharmacyTab("rx_orders")}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  pharmacyTab === "rx_orders" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <Stethoscope className="size-3.5" />
                <span>{lang === "bn" ? "ডাক্তার ও Rx অর্ডার" : "Doctor / Rx Orders"}</span>
                {rxOrders.filter((r) => r.status === "pending").length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
                    {rxOrders.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPharmacyTab("suppliers")}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  pharmacyTab === "suppliers" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <Truck className="size-3.5" />
                <span>{lang === "bn" ? "সরবরাহকারী ডিরেক্টরি" : "Suppliers & Drugs"}</span>
              </button>
            </div>

            {pharmacyTab === "inventory" && (
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "all", label: lang === "bn" ? "সব ব্যাচ" : "All Batches" },
                    { id: "expiring", label: lang === "bn" ? "মেয়াদোত্তীর্ণ হচ্ছে (৯০ দিন)" : "Expiring <= 90d" },
                    { id: "expired", label: lang === "bn" ? "মেয়াদ শেষ (ব্লকড)" : "Expired Quarantine" },
                    { id: "low_stock", label: lang === "bn" ? "স্বল্প স্টক" : "Low Stock" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBatchFilter(f.id)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all ${
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

          {pharmacyTab === "rx_orders" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Card className="lg:col-span-5 p-4 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ClipboardList className="size-4 text-rose-600" />
                  <span>{lang === "bn" ? "নতুন প্রেসক্রিপশন / Rx অর্ডার" : "New Doctor / Clinic Rx Order"}</span>
                </div>
                <form onSubmit={handleAddRxOrder} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <Input required value={rxDoctorName} onChange={(e) => setRxDoctorName(e.target.value)} placeholder={lang === "bn" ? "ডাক্তারের নাম *" : "Doctor Name *"} className="h-9 rounded-xl" />
                    <Input value={rxDoctorId} onChange={(e) => setRxDoctorId(e.target.value)} placeholder="Doctor ID / BMDC" className="h-9 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={rxDoctorContact} onChange={(e) => setRxDoctorContact(e.target.value)} placeholder={lang === "bn" ? "যোগাযোগ / মোবাইল" : "Doctor Contact / Phone"} className="h-9 rounded-xl" />
                    <Input type="date" value={rxPickupDate} onChange={(e) => setRxPickupDate(e.target.value)} className="h-9 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={rxDrugId} onChange={(e) => setRxDrugId(e.target.value)} className="col-span-2 h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-semibold">
                      <option value="">{lang === "bn" ? "ওষুধ নির্বাচন করুন" : "Select Drug from Inventory..."}</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name} (৳{pr.sell_price} • Stock: {pr.stock})
                        </option>
                      ))}
                    </select>
                    <Input type="number" min={1} value={rxQty} onChange={(e) => setRxQty(e.target.value)} placeholder="Qty" className="h-9 rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer">
                    {lang === "bn" ? "+ Rx অর্ডার তৈরি করুন" : "+ Queue Rx Order"}
                  </Button>
                </form>
              </Card>

              <Card className="lg:col-span-7 p-4 rounded-3xl space-y-3">
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>{lang === "bn" ? "যাচাই ও পিকআপ কিউ" : "Rx Verification & Pickup Queue"}</span>
                  <span className="text-[11px] text-muted-foreground">{rxOrders.length} orders</span>
                </div>
                <div className="space-y-2 max-h-[340px] overflow-y-auto text-xs">
                  {rxOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {lang === "bn" ? "কোনো প্রেসক্রিপশন অর্ডার নেই।" : "No Doctor / Rx orders queued yet."}
                    </p>
                  ) : (
                    rxOrders.map((rx) => (
                      <div key={rx.id} className="p-3 rounded-2xl border border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span>{rx.id} • Dr. {rx.doctorName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rx.status === "pending"
                                ? "bg-amber-500/15 text-amber-700"
                                : rx.status === "verified"
                                  ? "bg-blue-500/15 text-blue-600"
                                  : "bg-emerald-500/15 text-emerald-600"
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
                            <Button size="sm" onClick={() => handleVerifyOrPickupRx(rx, "verified")} className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer">
                              {lang === "bn" ? "যাচাই ও POS" : "Verify & Load POS"}
                            </Button>
                          )}
                          {rx.status === "verified" && (
                            <Button size="sm" onClick={() => handleVerifyOrPickupRx(rx, "picked_up")} className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer">
                              {lang === "bn" ? "ডেলিভারি সম্পন্ন" : "Mark Picked Up"}
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => persistRxOrders(rxOrders.filter((r) => r.id !== rx.id))}
                            className="size-8 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
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

          {pharmacyTab === "suppliers" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Card className="lg:col-span-4 p-4 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Truck className="size-4 text-rose-600" />
                  <span>{lang === "bn" ? "ফার্মা সাপ্লায়ার যুক্ত করুন" : "Register Drug Supplier"}</span>
                </div>
                <form onSubmit={handleAddPharmacySupplier} className="space-y-2.5 text-xs">
                  <Input required value={supName} onChange={(e) => setSupName(e.target.value)} placeholder={lang === "bn" ? "সাপ্লায়ারের নাম *" : "Supplier / Distributor Name *"} className="h-9 rounded-xl" />
                  <Input value={supContact} onChange={(e) => setSupContact(e.target.value)} placeholder={lang === "bn" ? "ফোন নম্বর" : "Contact Phone"} className="h-9 rounded-xl" />
                  <Input type="email" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} placeholder="Email Address" className="h-9 rounded-xl" />
                  <Input value={supDrugs} onChange={(e) => setSupDrugs(e.target.value)} placeholder="Drugs available (comma-separated, e.g. Napa, Seclo, Azithro)" className="h-9 rounded-xl" />
                  <Button type="submit" className="w-full h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer">
                    {lang === "bn" ? "+ সাপ্লায়ার সেভ করুন" : "+ Save Supplier"}
                  </Button>
                </form>
              </Card>

              <Card className="lg:col-span-8 p-4 rounded-3xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sm">{lang === "bn" ? "সরবরাহকারী ও প্রাপ্য ওষুধ" : "Verified Suppliers & Drugs Available"}</span>
                  <Input value={supFilter} onChange={(e) => setSupFilter(e.target.value)} placeholder="Filter by drug or supplier..." className="h-8 w-56 rounded-xl text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto text-xs">
                  {pharmaSuppliers
                    .filter(
                      (s) =>
                        !supFilter.trim() ||
                        s.name.toLowerCase().includes(supFilter.toLowerCase()) ||
                        s.drugsAvailable.some((d) => d.toLowerCase().includes(supFilter.toLowerCase()))
                    )
                    .map((s) => (
                      <div key={s.id} className="p-3 rounded-2xl border border-border bg-muted/20 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {s.supplierID} • {s.contact || "No phone"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => persistPharmaSuppliers(pharmaSuppliers.filter((x) => x.id !== s.id))}
                            className="text-rose-500 hover:underline cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {s.drugsAvailable.map((d, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                              {d}
                            </span>
                          ))}
                        </div>
                        <Link href="/purchases" className="inline-flex items-center text-[11px] font-bold text-primary hover:underline">
                          Order Restock -&gt;
                        </Link>
                      </div>
                    ))}
                  {pharmaSuppliers.length === 0 && (
                    <p className="col-span-full text-center text-muted-foreground py-8">
                      {lang === "bn" ? "কোনো ফার্মেসি সাপ্লায়ার যুক্ত হয়নি।" : "No suppliers added yet. Register distributors and supplied drugs on the left."}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Main Split: Inventory Grid + Instant POS Cart */}
      {(activeIndustry !== "pharmacy" || pharmacyTab === "inventory") && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-3">
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeIndustry === "electronics"
                  ? "Search by model, IMEI, serial, or barcode..."
                  : activeIndustry === "pharmacy"
                    ? "Search medicine, batch number, or barcode..."
                    : "Search inventory by name, SKU, size, color, or barcode..."
              }
              className="pl-10 h-11 rounded-2xl bg-card"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts
              .filter((p) => {
                if (activeIndustry !== "pharmacy" || batchFilter === "all") return true;
                const dLeft = getExpiryDays(p.attributes?.expiry);
                if (batchFilter === "expired") return dLeft !== null && dLeft < 0;
                if (batchFilter === "expiring") return dLeft !== null && dLeft >= 0 && dLeft <= 90;
                if (batchFilter === "low_stock") return Number(p.stock) <= Number(p.min_stock ?? 5);
                return true;
              })
              .slice(0, 24)
              .map((p) => {
                const daysLeft = activeIndustry === "pharmacy" ? getExpiryDays(p.attributes?.expiry) : null;
                const isExpiredBatch = daysLeft !== null && daysLeft < 0;
                const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 90;
                return (
              <Card key={p.id} className={`p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 transition-all ${isExpiredBatch ? "border-rose-500/60 bg-rose-500/5" : "hover:border-primary/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm line-clamp-1">{p.name}</h3>
                    <div className="text-[11px] text-muted-foreground">
                      Stock: <span className="font-bold text-foreground">{p.stock}</span>
                      {p.attributes?.unit ? ` ${p.attributes.unit}` : ""}
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary shrink-0">৳ {p.sell_price}</span>
                </div>

                {/* Industry-specific metadata badges */}
                {(p.attributes && Object.keys(p.attributes).length > 0) || isExpiredBatch || isExpiringSoon ? (
                  <div className="flex flex-wrap gap-1">
                    {isExpiredBatch && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                        EXPIRED (Quarantined)
                      </span>
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
                    {p.attributes?.expiry && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold">
                        Exp: {p.attributes.expiry}
                      </span>
                    )}
                    {p.attributes?.imei && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold">
                        IMEI: {p.attributes.imei}
                      </span>
                    )}
                    {p.attributes?.warranty && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                        Warranty: {p.attributes.warranty}
                      </span>
                    )}
                    {p.attributes?.size && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-semibold">
                        Size: {p.attributes.size}
                      </span>
                    )}
                    {p.attributes?.color && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 font-semibold">
                        {p.attributes.color}
                      </span>
                    )}
                  </div>
                ) : null}

                <Button
                  size="sm"
                  disabled={isExpiredBatch}
                  onClick={() => handleSafeAddToCart(p)}
                  className="w-full h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer disabled:opacity-60"
                >
                  <Plus className="size-3.5" />
                  <span>{isExpiredBatch ? "Blocked (Expired)" : "Add to POS"}</span>
                </Button>
              </Card>
                );
              })}
          </div>
        </div>

        {/* Right: ERP Point of Sale Cart */}
        <div className="lg:col-span-4">
          <Card className="p-4 rounded-3xl sticky top-20 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingBag className="size-4 text-primary" />
                <span>{ERP_MODULES.find((m) => m.id === activeIndustry)?.title} POS</span>
              </div>
              {cart.length > 0 && (
                <button type="button" onClick={() => setCart([])} className="text-xs text-rose-500 hover:underline cursor-pointer">
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground space-y-1">
                <Barcode className="size-7 mx-auto opacity-30" />
                <p>Select items from the ERP inventory to bill</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={item.product.id} className="p-2.5 rounded-2xl bg-muted/40 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate">{item.product.name}</div>
                      <div className="text-[10px] text-muted-foreground">৳ {item.price} × {item.qty}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev
                              .map((it, i) => (i === idx ? { ...it, qty: it.qty - 1 } : it))
                              .filter((it) => it.qty > 0)
                          )
                        }
                        className="size-6 rounded-lg bg-background border flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-5 text-center font-bold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: it.qty + 1 } : it)))
                        }
                        className="size-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">৳ {cartTotal.toLocaleString()}</span>
              </div>
              <Button
                type="button"
                disabled={cart.length === 0 || checkoutBusy}
                onClick={handlePosCheckout}
                className="w-full h-11 rounded-2xl font-bold text-sm cursor-pointer"
              >
                {checkoutBusy ? <RefreshCw className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
                <span>Complete Sale</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
      )}

      {/* Add Industry-Specific ERP Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Add {ERP_MODULES.find((m) => m.id === activeIndustry)?.title} Item
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateIndustryProduct} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Item / Product Name *</label>
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

            {activeIndustry === "electronics" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">IMEI / Serial No.</label>
                  <Input value={imeiSerial} onChange={(e) => setImeiSerial(e.target.value)} placeholder="35693803..." className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Warranty (Months)</label>
                  <Input type="number" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} placeholder="12" className="h-10 rounded-xl" />
                </div>
              </div>
            )}

            {activeIndustry === "fashion" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Size</label>
                  <Input value={sizeVal} onChange={(e) => setSizeVal(e.target.value)} placeholder="M / L / XL" className="h-10 rounded-xl" />
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
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-xl text-xs font-bold">
                {saving ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : null}
                Save to ERP
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
