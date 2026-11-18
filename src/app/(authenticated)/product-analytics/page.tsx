"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BarChart2, TrendingUp, TrendingDown, AlertTriangle, Package,
  ShoppingCart, Download, ArrowLeft, Search, Filter,
  Layers, Eye, RefreshCw, ChevronRight, Zap, PieChart as PieChartIcon,
  Clock, Flame, DollarSign, SlidersHorizontal, Printer, Sparkles,
  ArrowUpDown, CheckCircle2, ShieldAlert, Award, Percent,
  Scan, QrCode, Calculator, CheckCheck, Volume2, VolumeX, Plus, Minus, Trash2, FileSpreadsheet, RotateCcw,
  Pencil, ArrowLeftRight, Copy, Check
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { getProducts, getSales, type Product, type Sale } from "@/lib/queries";
import { useT } from "@/lib/i18n";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationBar, paginate } from "@/components/ui/pagination-bar";
import { ProductImage } from "@/components/product-image";
import { ProductDialog } from "@/components/product-dialog";
import { SaleDialog } from "@/components/sale-dialog";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { BarcodeScannerDialog, playBarcodeBeep } from "@/components/barcode-scanner-dialog";
import { downloadCsv, exportDateStamp } from "@/lib/export";
import { parseSaleDate, toLocalDateStr } from "@/lib/sales-calc";
import { updateProductFn } from "@/lib/rpc";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type TimeRange = "today" | "7d" | "30d" | "this_month" | "all";
type SortOption = "pieces_desc" | "revenue_desc" | "profit_desc" | "velocity_desc" | "stock_asc" | "stock_desc" | "margin_desc";
type ActiveTab = "stock_scanner" | "best_sellers" | "trending" | "critical_stock" | "slow_moving" | "all";

interface ScannedAuditItem {
  id: string;
  product: Product;
  matchedProducts?: Product[];
  matchQuery?: string;
  scannedQty: number;
  lastScannedAt: number;
}

/**
 * Find ALL products matching a scanned barcode/SKU/name (not just the first/earliest one).
 * When multiple products share the same barcode, all of them are returned under a normalized group key.
 */
function findMatchingProducts(products: Product[], rawCode: string): { key: string; matches: Product[]; normalizedQuery: string } {
  const trimmed = rawCode.trim();
  const query = trimmed.toLowerCase();
  const strippedQuery = query.replace(/^0+/, "");

  if (!query) {
    return { key: "", matches: [], normalizedQuery: "" };
  }

  const byExactId = products.find((p) => p.id?.toLowerCase() === query);
  if (byExactId) {
    return { key: byExactId.id, matches: [byExactId], normalizedQuery: query };
  }

  const seen = new Set<string>();
  const matches: Product[] = [];
  for (const p of products) {
    const pBarcode = p.barcode?.trim().toLowerCase() || "";
    const pStrippedBarcode = pBarcode.replace(/^0+/, "");
    const pSku = p.sku?.trim().toLowerCase() || "";
    const pName = p.name?.trim().toLowerCase() || "";

    const isMatch =
      (pBarcode && pBarcode === query) ||
      (strippedQuery && pStrippedBarcode && pStrippedBarcode === strippedQuery) ||
      (pSku && pSku === query) ||
      (pName && pName === query);

    if (isMatch && !seen.has(p.id)) {
      seen.add(p.id);
      matches.push(p);
    }
  }

  if (matches.length === 0) {
    return { key: "", matches: [], normalizedQuery: query };
  }
  if (matches.length === 1) {
    return { key: matches[0].id, matches, normalizedQuery: query };
  }

  const groupToken = strippedQuery || query;
  return { key: `barcode-group:${groupToken}`, matches, normalizedQuery: query };
}

function getAuditProductMetrics(item: { product: Product; matchedProducts?: Product[] }) {
  const list = item.matchedProducts && item.matchedProducts.length > 0 ? item.matchedProducts : [item.product];
  const sysStock = list.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const sysCostTotal = list.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.buy_price) || 0), 0);
  const sysSaleTotal = list.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.sell_price) || 0), 0);
  const avgBuy =
    sysStock > 0
      ? sysCostTotal / sysStock
      : list.reduce((sum, p) => sum + (Number(p.buy_price) || 0), 0) / list.length;
  const avgSell =
    sysStock > 0
      ? sysSaleTotal / sysStock
      : list.reduce((sum, p) => sum + (Number(p.sell_price) || 0), 0) / list.length;

  return {
    list,
    count: list.length,
    sysStock,
    sysCostTotal,
    sysSaleTotal,
    avgBuy,
    avgSell,
  };
}

type StockMatchStatus = "match" | "over" | "under";

function getStockComparison(scannedQty: number, systemStock: number | string | undefined | null) {
  const sysStock = Number(systemStock) || 0;
  const diff = scannedQty - sysStock;
  const status: StockMatchStatus = diff === 0 ? "match" : diff > 0 ? "over" : "under";
  return {
    sysStock,
    diff,
    status,
    isMismatch: diff !== 0,
  };
}

function playMismatchBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(340, now, 0.14);
    playTone(260, now + 0.16, 0.2);
  } catch {
    // Ignore audio context blocks
  }
}

export default function ProductAnalyticsPage() {
  const { lang, t } = useT();
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useCachedQuery(["products"], getProducts);
  const { data: sales = [], isLoading: salesLoading } = useCachedQuery(["sales"], getSales);

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("stock_scanner");
  const [sortBy, setSortBy] = useState<SortOption>("pieces_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog triggers
  const [saleProduct, setSaleProduct] = useState<string | undefined>();
  const [saleOpen, setSaleOpen] = useState(false);
  const [buyProduct, setBuyProduct] = useState<string | undefined>();
  const [buyOpen, setBuyOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // -------------------------------------------------------------
  // Stock Audit Scanner & Live Calculator State (with Auto-Save Persistence)
  // -------------------------------------------------------------
  const AUDIT_STORAGE_KEY = "df_stock_audit_scans_cache_v2";
  const AUDIT_META_KEY = "df_stock_audit_scans_meta_v2";

  const [scannedAuditItems, setScannedAuditItems] = useState<ScannedAuditItem[]>([]);
  const scannedAuditRef = useRef<ScannedAuditItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [continuousScan, setContinuousScan] = useState(true);
  const [manualBarcodeInput, setManualBarcodeInput] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [showMismatchesOnly, setShowMismatchesOnly] = useState(false);
  const [auditFilter, setAuditFilter] = useState<"all" | "mismatch" | "over" | "under" | "match">("all");
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [applyStockDialogOpen, setApplyStockDialogOpen] = useState(false);
  const [isApplyingStock, setIsApplyingStock] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const restoredRef = useRef(false);

  const [lastScannedProduct, setLastScannedProduct] = useState<{
    id: string;
    product: Product;
    matchedProducts?: Product[];
    qty: number;
    timestamp: number;
  } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-restore saved audit scan session from localStorage on initial load / when products are available
  useEffect(() => {
    if (restoredRef.current || products.length === 0) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!raw) return;
      const stored: Array<{ id: string; q: number; ts: number; m?: string }> = JSON.parse(raw);
      if (!Array.isArray(stored) || stored.length === 0) return;

      const restoredList: ScannedAuditItem[] = [];
      for (const item of stored) {
        const query = item.m || item.id;
        const { key, matches } = findMatchingProducts(products, query);
        const prod = matches[0] || products.find((p) => p.id === item.id);
        if (prod) {
          restoredList.push({
            id: key || item.id,
            product: prod,
            matchedProducts: matches.length > 0 ? matches : [prod],
            matchQuery: query,
            scannedQty: Math.max(1, Number(item.q) || 1),
            lastScannedAt: item.ts || Date.now(),
          });
        }
      }

      if (restoredList.length > 0) {
        scannedAuditRef.current = restoredList;
        setScannedAuditItems(restoredList);
        const metaRaw = localStorage.getItem(AUDIT_META_KEY);
        if (metaRaw) {
          try {
            const meta = JSON.parse(metaRaw);
            if (meta.savedAt) setLastSavedTime(meta.savedAt);
          } catch {}
        }
        toast.info(
          lang === "bn"
            ? `পূর্ববর্তী সংরক্ষিত অডিট পুনরুদ্ধার করা হয়েছে (${restoredList.length}টি পণ্য)।`
            : `Restored saved audit session (${restoredList.length} items).`,
          { duration: 3500 }
        );
      }
    } catch (err) {
      console.error("Failed to restore stock audit items from cache", err);
    }
  }, [products, lang]);

  // Persist scanned items to localStorage on every change (handles thousands of items compactly)
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      if (scannedAuditItems.length === 0) {
        localStorage.removeItem(AUDIT_STORAGE_KEY);
        localStorage.removeItem(AUDIT_META_KEY);
        setLastSavedTime(null);
      } else {
        const compact = scannedAuditItems.map((item) => ({
          id: item.id,
          q: item.scannedQty,
          ts: item.lastScannedAt,
          m: item.matchQuery || item.product.barcode || item.product.id,
        }));
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(compact));
        const now = Date.now();
        localStorage.setItem(
          AUDIT_META_KEY,
          JSON.stringify({
            savedAt: now,
            itemCount: compact.length,
          })
        );
        setLastSavedTime(now);
      }
    } catch (err) {
      console.warn("Storage quota exceeded or error caching stock audit", err);
    }
  }, [scannedAuditItems]);

  // Sync scanned audit items against live products so duplicate barcodes always reflect all matching products
  const resolvedAuditItems = useMemo(() => {
    return scannedAuditItems.map((item) => {
      if (item.matchQuery) {
        const { matches } = findMatchingProducts(products, item.matchQuery);
        if (matches.length > 0) {
          return {
            ...item,
            product: matches[0],
            matchedProducts: matches,
          };
        }
      }
      const fallbackList = (item.matchedProducts && item.matchedProducts.length > 0 ? item.matchedProducts : [item.product]).map(
        (mp) => products.find((p) => p.id === mp.id) || mp
      );
      return {
        ...item,
        product: fallbackList[0],
        matchedProducts: fallbackList,
      };
    });
  }, [scannedAuditItems, products]);

  // Focus barcode input when scanner tab is opened
  useEffect(() => {
    if (activeTab === "stock_scanner" && !scannerOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 150);
    }
  }, [activeTab, scannerOpen]);

  // Distinct product categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (s.returned) return false;
      const saleDate = parseSaleDate(s.created_at) ?? new Date(s.created_at || Date.now());

      if (timeRange === "today") {
        return toLocalDateStr(saleDate) === toLocalDateStr(now);
      }
      if (timeRange === "7d") {
        const d7 = new Date(now.getTime() - 7 * 86400000);
        return saleDate >= d7;
      }
      if (timeRange === "30d") {
        const d30 = new Date(now.getTime() - 30 * 86400000);
        return saleDate >= d30;
      }
      if (timeRange === "this_month") {
        return (
          saleDate.getFullYear() === now.getFullYear() &&
          saleDate.getMonth() === now.getMonth()
        );
      }
      return true; // "all"
    });
  }, [sales, timeRange]);

  // Map product metrics: total pieces sold, revenue, profit, velocity
  const productMetrics = useMemo(() => {
    const map = new Map<string, { pieces: number; revenue: number; profit: number }>();

    filteredSales.forEach((sale) => {
      const pId = sale.product_id;
      if (!pId) return;

      const qty = Number(sale.qty) || 0;
      const sellPrice = Number(sale.sell_price) || 0;
      const profit = Number(sale.profit) || (sellPrice - (Number(sale.buy_price) || 0)) * qty;
      const rev = sellPrice * qty;

      const cur = map.get(pId) || { pieces: 0, revenue: 0, profit: 0 };
      map.set(pId, {
        pieces: cur.pieces + qty,
        revenue: cur.revenue + rev,
        profit: cur.profit + profit,
      });
    });

    return map;
  }, [filteredSales]);

  // Enhanced product list with computed analytics
  const analyticsProducts = useMemo(() => {
    return products.map((product) => {
      const stats = productMetrics.get(product.id) || { pieces: 0, revenue: 0, profit: 0 };
      const currentStock = Number(product.stock) || 0;
      const minStock = Number(product.min_stock) || 5;
      const buyPrice = Number(product.buy_price) || 0;
      const sellPrice = Number(product.sell_price) || 0;
      const margin = sellPrice > 0 ? ((sellPrice - buyPrice) / sellPrice) * 100 : 0;
      const stockCostValuation = currentStock * buyPrice;
      const stockSaleValuation = currentStock * sellPrice;

      // Velocity: Sold pieces vs current stock ratio
      const velocity = currentStock > 0 ? (stats.pieces / (currentStock + stats.pieces)) * 100 : stats.pieces > 0 ? 100 : 0;

      // Critical stock status
      const isOut = currentStock <= 0;
      const isLow = !isOut && currentStock <= minStock;
      const isHealthy = !isOut && !isLow;

      return {
        product,
        soldPieces: stats.pieces,
        revenue: stats.revenue,
        profit: stats.profit,
        margin,
        velocity,
        currentStock,
        minStock,
        isOut,
        isLow,
        isHealthy,
        stockCostValuation,
        stockSaleValuation,
      };
    });
  }, [products, productMetrics]);

  // Overall aggregate KPIs
  const totalValuationCost = useMemo(() => {
    return analyticsProducts.reduce((acc, p) => acc + p.stockCostValuation, 0);
  }, [analyticsProducts]);

  const totalValuationSale = useMemo(() => {
    return analyticsProducts.reduce((acc, p) => acc + p.stockSaleValuation, 0);
  }, [analyticsProducts]);

  const totalStoreStock = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  }, [products]);

  // -------------------------------------------------------------
  // Live Stock Audit Scanner & Calculator Logic
  // -------------------------------------------------------------
  const handleScanOrAddProduct = (barcodeOrId: string) => {
    const rawQuery = barcodeOrId.trim();
    if (!rawQuery) return;
    const { key, matches } = findMatchingProducts(products, rawQuery);
    const found = matches[0];

    if (!found) {
      toast.error(
        lang === "bn"
          ? `বারকোড বা আইডি "${rawQuery}" দ্বারা পণ্য পাওয়া যায়নি!`
          : `No product found for code "${rawQuery}"!`,
        { duration: 2500 }
      );
      return;
    }

    const playMatchedBeep = () => {
      try {
        playBarcodeBeep();
      } catch {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
        } catch {}
      }
    };

    const existingList = scannedAuditRef.current;
    const matchIds = new Set(matches.map((m) => m.id));
    const idx = existingList.findIndex(
      (item) =>
        item.id === key ||
        matchIds.has(item.id) ||
        (item.matchedProducts && item.matchedProducts.some((mp) => matchIds.has(mp.id)))
    );
    const nextQty = idx >= 0 ? existingList[idx].scannedQty + 1 : 1;
    const nowTs = Date.now();

    const nextItem: ScannedAuditItem = {
      id: key,
      product: found,
      matchedProducts: matches,
      matchQuery: rawQuery,
      scannedQty: nextQty,
      lastScannedAt: nowTs,
    };

    const nextList =
      idx >= 0
        ? existingList.map((item, i) => (i === idx ? nextItem : item))
        : [nextItem, ...existingList];

    scannedAuditRef.current = nextList;
    setScannedAuditItems(nextList);
    setLastScannedProduct({
      id: key,
      product: found,
      matchedProducts: matches,
      qty: nextQty,
      timestamp: nowTs,
    });

    const metrics = getAuditProductMetrics(nextItem);
    const comp = getStockComparison(nextQty, metrics.sysStock);
    const labelWithCount =
      matches.length > 1
        ? `${found.name} (+${matches.length - 1} ${lang === "bn" ? "টি আরও" : "more"})`
        : found.name;

    if (soundEnabled) {
      if (comp.isMismatch) {
        playMismatchBeep();
      } else {
        playMatchedBeep();
      }
    }

    if (comp.isMismatch) {
      toast.error(
        comp.status === "over"
          ? lang === "bn"
            ? `রেড অ্যালার্ট: ${labelWithCount} — স্ক্যান (${nextQty}) সিস্টেম স্টক (${comp.sysStock}) এর চেয়ে বেশি (+${comp.diff} বেশি)!`
            : `RED ALERT: ${labelWithCount} — Scanned ${nextQty} exceeds System Stock ${comp.sysStock} (+${comp.diff} over!)`
          : lang === "bn"
            ? `রেড অ্যালার্ট: ${labelWithCount} — স্ক্যান (${nextQty}) সিস্টেম স্টক (${comp.sysStock}) এর চেয়ে কম (${comp.diff} ঘাটতি)!`
            : `RED ALERT: ${labelWithCount} — Scanned ${nextQty} is below System Stock ${comp.sysStock} (${comp.diff} short!)`,
        { duration: 3500 }
      );
    } else {
      toast.success(
        lang === "bn"
          ? `স্টক মিলেছে: ${labelWithCount} (${nextQty}/${comp.sysStock} pcs)`
          : `Stock Matched: ${labelWithCount} (${nextQty}/${comp.sysStock} pcs)`,
        { duration: 1500 }
      );
    }

    setManualBarcodeInput("");
  };

  const syncLastScannedIfSelected = (item: ScannedAuditItem, qty: number) => {
    setLastScannedProduct((prev) =>
      prev && prev.id === item.id
        ? { id: item.id, product: item.product, matchedProducts: item.matchedProducts, qty, timestamp: Date.now() }
        : prev
    );
  };

  const handleAdjustScannedQty = (id: string, delta: number) => {
    const target = resolvedAuditItems.find((item) => item.id === id);
    if (!target) return;
    const nextQty = target.scannedQty + delta;
    const nextList =
      nextQty > 0
        ? scannedAuditRef.current.map((item) =>
            item.id === id ? { ...item, scannedQty: nextQty, lastScannedAt: Date.now() } : item
          )
        : scannedAuditRef.current.filter((item) => item.id !== id);

    scannedAuditRef.current = nextList;
    setScannedAuditItems(nextList);

    if (nextQty > 0) {
      syncLastScannedIfSelected(target, nextQty);
      const metrics = getAuditProductMetrics(target);
      const comp = getStockComparison(nextQty, metrics.sysStock);
      const labelWithCount =
        metrics.count > 1
          ? `${target.product.name} (+${metrics.count - 1} ${lang === "bn" ? "টি আরও" : "more"})`
          : target.product.name;
      if (comp.isMismatch) {
        if (soundEnabled) playMismatchBeep();
        toast.error(
          comp.status === "over"
            ? lang === "bn"
              ? `রেড অ্যালার্ট: ${labelWithCount} — স্ক্যান ${nextQty} (সিস্টেম ${comp.sysStock}, +${comp.diff} বেশি)`
              : `RED ALERT: ${labelWithCount} — Scanned ${nextQty} vs System ${comp.sysStock} (+${comp.diff} over)`
            : lang === "bn"
              ? `রেড অ্যালার্ট: ${labelWithCount} — স্ক্যান ${nextQty} (সিস্টেম ${comp.sysStock}, ${comp.diff} কম)`
              : `RED ALERT: ${labelWithCount} — Scanned ${nextQty} vs System ${comp.sysStock} (${comp.diff} short)`,
          { duration: 2500 }
        );
      }
    } else if (lastScannedProduct?.id === id) {
      setLastScannedProduct(null);
    }
  };

  const handleSetScannedQty = (id: string, qty: number) => {
    const validQty = Math.max(0, qty);
    const target = resolvedAuditItems.find((item) => item.id === id);
    const nextList =
      validQty === 0
        ? scannedAuditRef.current.filter((item) => item.id !== id)
        : scannedAuditRef.current.map((item) =>
            item.id === id ? { ...item, scannedQty: validQty, lastScannedAt: Date.now() } : item
          );

    scannedAuditRef.current = nextList;
    setScannedAuditItems(nextList);

    if (target && validQty > 0) {
      syncLastScannedIfSelected(target, validQty);
    } else if (validQty === 0 && lastScannedProduct?.id === id) {
      setLastScannedProduct(null);
    }
  };

  const handleRemoveScannedItem = (id: string) => {
    const nextList = scannedAuditRef.current.filter((item) => item.id !== id);
    scannedAuditRef.current = nextList;
    setScannedAuditItems(nextList);
    if (lastScannedProduct?.id === id) {
      setLastScannedProduct(null);
    }
    toast.info(lang === "bn" ? "পণ্যটি অডিট তালিকা থেকে সরানো হয়েছে" : "Item removed from audit list");
  };

  const handleClearAudit = () => {
    if (scannedAuditItems.length === 0) return;
    if (confirm(lang === "bn" ? "আপনি কি নিশ্চিতভাবে সম্পূর্ণ অডিট ক্যালকুলেটর রিসেট করতে চান? সংরক্ষিত সকল স্ক্যান ফলাফল মুছে যাবে।" : "Are you sure you want to reset the entire audit calculator? All saved scan results will be cleared.")) {
      scannedAuditRef.current = [];
      setScannedAuditItems([]);
      setLastScannedProduct(null);
      setAuditFilter("all");
      setShowMismatchesOnly(false);
      try {
        localStorage.removeItem(AUDIT_STORAGE_KEY);
        localStorage.removeItem(AUDIT_META_KEY);
      } catch {}
      setLastSavedTime(null);
      toast.info(lang === "bn" ? "অডিট ক্যালকুলেটর খালি করা হয়েছে" : "Audit calculator cleared");
    }
  };

  // Live Scanned Audit Calculations
  const auditCalculations = useMemo(() => {
    let totalPieces = 0;
    let totalCostValuation = 0;
    let totalSaleValuation = 0;
    let totalSystemStockOfScanned = 0;
    let totalSystemCostOfScanned = 0;
    let totalSystemSaleOfScanned = 0;

    let overStockCount = 0;
    let underStockCount = 0;
    let matchedItemCount = 0;

    type MismatchedAuditItem = {
      id: string;
      product: Product;
      scannedQty: number;
      sysStock: number;
      diff: number;
      status: "match" | "over" | "under";
    };
    const mismatchedItems: MismatchedAuditItem[] = [];

    resolvedAuditItems.forEach((item) => {
      const q = item.scannedQty;
      const metrics = getAuditProductMetrics(item);
      const buyPrice = metrics.avgBuy;
      const sellPrice = metrics.avgSell;
      const sysStock = metrics.sysStock;
      const diff = q - sysStock;
      const comp = getStockComparison(q, sysStock);

      totalPieces += q;
      totalCostValuation += q * buyPrice;
      totalSaleValuation += q * sellPrice;

      totalSystemStockOfScanned += sysStock;
      totalSystemCostOfScanned += sysStock * buyPrice;
      totalSystemSaleOfScanned += sysStock * sellPrice;

      if (comp.status === "over") overStockCount++;
      else if (comp.status === "under") underStockCount++;
      else matchedItemCount++;

      if (comp.isMismatch) {
        mismatchedItems.push({
          id: item.id,
          product: item.product,
          scannedQty: q,
          sysStock,
          diff,
          status: comp.status,
        });
      }
    });

    const piecesDifference = totalPieces - totalSystemStockOfScanned;
    const costDifference = totalCostValuation - totalSystemCostOfScanned;
    const saleDifference = totalSaleValuation - totalSystemSaleOfScanned;

    return {
      totalPieces,
      totalCostValuation,
      totalSaleValuation,
      totalSystemStockOfScanned,
      totalSystemCostOfScanned,
      totalSystemSaleOfScanned,
      piecesDifference,
      costDifference,
      saleDifference,
      uniqueItemCount: resolvedAuditItems.length,
      mismatchedItems,
      hasMismatches: mismatchedItems.length > 0,
      overStockCount,
      underStockCount,
      matchedItemCount,
    };
  }, [resolvedAuditItems]);

  // Bulk Apply Scanned Physical Quantities into System Database Stock
  const handleApplyAuditToSystemStock = async () => {
    if (resolvedAuditItems.length === 0) return;
    setIsApplyingStock(true);
    try {
      let updatedCount = 0;
      for (const item of resolvedAuditItems) {
        await updateProductFn({
          data: {
            id: item.product.id,
            stock: item.scannedQty,
          },
        });
        updatedCount++;
      }
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        lang === "bn"
          ? `সফলভাবে ${updatedCount}টি পণ্যের স্টক ডাটাবেজে আপডেট করা হয়েছে!`
          : `Successfully synchronized stock for ${updatedCount} products!`,
        { duration: 4000 }
      );
      setApplyStockDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || String(err));
    } finally {
      setIsApplyingStock(false);
    }
  };

  // Export Scanned Audit to CSV (support full audit or variance-only)
  const handleExportAuditCsv = (mismatchesOnly = false) => {
    const sourceList = mismatchesOnly
      ? resolvedAuditItems.filter((item) => getStockComparison(item.scannedQty, getAuditProductMetrics(item).sysStock).isMismatch)
      : resolvedAuditItems;

    if (sourceList.length === 0) {
      toast.error(
        lang === "bn"
          ? mismatchesOnly ? "এক্সপোর্ট করার মতো কোনো স্টক অমিল নেই!" : "এক্সপোর্ট করার মতো কোনো স্ক্যানকৃত পণ্য নেই!"
          : mismatchesOnly ? "No stock mismatches to export!" : "No scanned items to export!"
      );
      return;
    }

    const rows = sourceList.map((item, idx) => {
      const p = item.product;
      const metrics = getAuditProductMetrics(item);
      const buy = metrics.avgBuy;
      const sell = metrics.avgSell;
      const sysStock = metrics.sysStock;
      const scannedQty = item.scannedQty;
      const diffQty = scannedQty - sysStock;
      const totalCost = scannedQty * buy;
      const totalSell = scannedQty * sell;
      const status = diffQty === 0 ? "Matched" : diffQty > 0 ? `Surplus (+${diffQty})` : `Shortage (${diffQty})`;

      return {
        "SL": idx + 1,
        "Product Name": metrics.count > 1 ? metrics.list.map((m) => `${m.name} (${Number(m.stock) || 0})`).join(" + ") : p.name,
        "Matched Products": metrics.count,
        "Barcode": p.barcode || "",
        "SKU": p.sku || "",
        "Category": p.category || "",
        "Unit Cost Price (BDT)": Math.round(buy * 100) / 100,
        "Unit Retail Price (BDT)": Math.round(sell * 100) / 100,
        "Scanned Physical Qty": scannedQty,
        "System Expected Stock": sysStock,
        "Quantity Variance": diffQty,
        "Physical Cost Worth (BDT)": Math.round(totalCost * 100) / 100,
        "Physical Retail Worth (BDT)": Math.round(totalSell * 100) / 100,
        "Audit Status": status,
      };
    });

    const prefix = mismatchesOnly ? "Stock_Audit_Mismatches" : "Stock_Audit_Valuation";
    downloadCsv(`${prefix}_${exportDateStamp()}`, rows);
    toast.success(
      lang === "bn"
        ? mismatchesOnly ? "অমিল রিপোর্ট CSV ডাউনলোড হয়েছে" : "সম্পূর্ণ অডিট রিপোর্ট CSV ডাউনলোড হয়েছে"
        : mismatchesOnly ? "Mismatch variance CSV downloaded" : "Audit report CSV downloaded"
    );
  };

  // Filtered Scanned Items for in-table search & multi-mode mismatch filter
  const filteredAuditItems = useMemo(() => {
    let base = resolvedAuditItems;
    if (auditFilter === "mismatch" || showMismatchesOnly) {
      base = base.filter((item) => getStockComparison(item.scannedQty, getAuditProductMetrics(item).sysStock).isMismatch);
    } else if (auditFilter === "over") {
      base = base.filter((item) => getStockComparison(item.scannedQty, getAuditProductMetrics(item).sysStock).status === "over");
    } else if (auditFilter === "under") {
      base = base.filter((item) => getStockComparison(item.scannedQty, getAuditProductMetrics(item).sysStock).status === "under");
    } else if (auditFilter === "match") {
      base = base.filter((item) => getStockComparison(item.scannedQty, getAuditProductMetrics(item).sysStock).status === "match");
    }

    if (!auditSearchQuery.trim()) return base;
    const q = auditSearchQuery.toLowerCase();
    return base.filter((item) => {
      const list = getAuditProductMetrics(item).list;
      return list.some(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    });
  }, [resolvedAuditItems, auditSearchQuery, auditFilter, showMismatchesOnly]);

  // Tab Filtering & Sorting for Analytics Tabs
  const filteredProducts = useMemo(() => {
    let list = [...analyticsProducts];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.product.name.toLowerCase().includes(q) ||
          (item.product.barcode && item.product.barcode.toLowerCase().includes(q)) ||
          (item.product.sku && item.product.sku.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      list = list.filter((item) => item.product.category === selectedCategory);
    }

    if (activeTab === "best_sellers") {
      list = list.filter((item) => item.soldPieces > 0);
      list.sort((a, b) => b.soldPieces - a.soldPieces);
    } else if (activeTab === "trending") {
      list = list.filter((item) => item.velocity > 0);
      list.sort((a, b) => b.velocity - a.velocity);
    } else if (activeTab === "critical_stock") {
      list = list.filter((item) => item.isLow || item.isOut);
      list.sort((a, b) => a.currentStock - b.currentStock);
    } else if (activeTab === "slow_moving") {
      list = list.filter((item) => item.soldPieces === 0 && item.currentStock > 0);
      list.sort((a, b) => b.currentStock - a.currentStock);
    } else if (activeTab === "all") {
      if (sortBy === "pieces_desc") list.sort((a, b) => b.soldPieces - a.soldPieces);
      else if (sortBy === "revenue_desc") list.sort((a, b) => b.revenue - a.revenue);
      else if (sortBy === "profit_desc") list.sort((a, b) => b.profit - a.profit);
      else if (sortBy === "velocity_desc") list.sort((a, b) => b.velocity - a.velocity);
      else if (sortBy === "stock_asc") list.sort((a, b) => a.currentStock - b.currentStock);
      else if (sortBy === "stock_desc") list.sort((a, b) => b.currentStock - a.currentStock);
      else if (sortBy === "margin_desc") list.sort((a, b) => b.margin - a.margin);
    }

    return list;
  }, [analyticsProducts, search, selectedCategory, activeTab, sortBy]);

  const pagedResult = useMemo(() => {
    return paginate(filteredProducts, page, pageSize);
  }, [filteredProducts, page, pageSize]);

  return (
    <div className="min-h-screen bg-white dark:bg-background pb-20 md:pb-12">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-card border-b px-3 py-2.5 sm:px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="size-8 sm:size-9 rounded-full">
                <ArrowLeft className="size-4 sm:size-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <BarChart2 className="size-5 sm:size-6 text-primary" />
                  {lang === "bn" ? "পণ্য অ্যানালিটিক্স ও স্টক অডিট" : "Product Analytics & Stock Audit"}
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
                {lang === "bn"
                  ? "বারকোড স্ক্যানার দিয়ে ফিজিক্যাল স্টক চেক ও বিক্রির বিশ্লেষণ"
                  : "Physical stock audit scanner & sales intelligence"}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              variant={activeTab === "stock_scanner" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("stock_scanner");
                setScannerOpen(true);
              }}
              className="h-8 sm:h-9 text-xs gap-1.5 shadow-xs font-semibold"
            >
              <Scan className="size-3.5 sm:size-4" />
              <span>{lang === "bn" ? "বারকোড স্ক্যানার" : "Barcode Scanner"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRefreshing(true);
                qc.invalidateQueries({ queryKey: ["products"] });
                qc.invalidateQueries({ queryKey: ["sales"] });
                setTimeout(() => {
                  setIsRefreshing(false);
                  toast.success(lang === "bn" ? "তথ্য রিফ্রেশ হয়েছে" : "Data refreshed");
                }, 400);
              }}
              disabled={isRefreshing}
              className="size-8 sm:size-9 p-0"
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 sm:size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-4 sm:space-y-6">
        {/* Main Tab Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none border-b">
          <button
            onClick={() => setActiveTab("stock_scanner")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-t-lg font-semibold text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === "stock_scanner"
                ? "border-primary text-primary bg-primary/5 font-bold shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Scan className="size-3.5 sm:size-4 text-emerald-500" />
            <span>{lang === "bn" ? "🔍 স্টক অডিট স্ক্যানার" : "🔍 Stock Audit Scanner"}</span>
            {scannedAuditItems.length > 0 && (
              <Badge className="bg-emerald-600 text-white text-[10px] sm:text-[11px] px-1.5 py-0 h-4.5 sm:h-5">
                {auditCalculations.totalPieces} pcs
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("best_sellers")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-t-lg font-medium text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === "best_sellers"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Flame className="size-3.5 sm:size-4 text-amber-500" />
            <span>{lang === "bn" ? "সেরা বিক্রিত" : "Best Sellers"}</span>
          </button>

          <button
            onClick={() => setActiveTab("trending")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-t-lg font-medium text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === "trending"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <TrendingUp className="size-3.5 sm:size-4 text-indigo-500" />
            <span>{lang === "bn" ? "ট্রেন্ডিং" : "Trending"}</span>
          </button>

          <button
            onClick={() => setActiveTab("critical_stock")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-t-lg font-medium text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === "critical_stock"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <AlertTriangle className="size-3.5 sm:size-4 text-rose-500" />
            <span>{lang === "bn" ? "স্টক শেষ / কম" : "Low / Out of Stock"}</span>
          </button>

          <button
            onClick={() => setActiveTab("slow_moving")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-t-lg font-medium text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === "slow_moving"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Clock className="size-3.5 sm:size-4 text-orange-500" />
            <span>{lang === "bn" ? "ধীর বিক্রিত" : "Slow Moving"}</span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-t-lg font-medium text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap shrink-0 ${
              activeTab === "all"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Layers className="size-3.5 sm:size-4 text-slate-500" />
            <span>{lang === "bn" ? "সকল পণ্য" : "All Products"}</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: STOCK AUDIT SCANNER & VALUATION                        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "stock_scanner" && (
          <div className="space-y-6">
            {/* Top Audit Calculator Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {/* Card 1: Total Scanned Pieces */}
              <Card className="p-3 sm:p-4 bg-white dark:bg-card border border-emerald-500/30 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    {lang === "bn" ? "স্ক্যানকৃত মোট পিস" : "Scanned Pieces"}
                  </span>
                  <div className="p-1.5 sm:p-2 bg-emerald-500/10 text-emerald-600 rounded-md sm:rounded-lg">
                    <Package className="size-3.5 sm:size-4" />
                  </div>
                </div>
                <div className="mt-1 sm:mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-3xl font-black text-foreground">
                    {auditCalculations.totalPieces}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {lang === "bn" ? `(${auditCalculations.uniqueItemCount} আইটেম)` : `(${auditCalculations.uniqueItemCount} items)`}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {lang === "bn"
                    ? `সিস্টেম: ${totalStoreStock} পিস`
                    : `System: ${totalStoreStock} pcs`}
                </p>
              </Card>

              {/* Card 2: Total Cost Worth */}
              <Card className="p-3 sm:p-4 bg-white dark:bg-card border border-indigo-500/30 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    {lang === "bn" ? "মোট ক্রয়মূল্য (কেনা)" : "Total Cost (Buy)"}
                  </span>
                  <div className="p-1.5 sm:p-2 bg-indigo-500/10 text-indigo-600 rounded-md sm:rounded-lg">
                    <Calculator className="size-3.5 sm:size-4" />
                  </div>
                </div>
                <div className="mt-1 sm:mt-2">
                  <span className="text-xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                    {fmtMoney(auditCalculations.totalCostValuation)}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {lang === "bn"
                    ? `সিস্টেম: ${fmtMoney(auditCalculations.totalSystemCostOfScanned)}`
                    : `Expected: ${fmtMoney(auditCalculations.totalSystemCostOfScanned)}`}
                </p>
              </Card>

              {/* Card 3: Total Retail Worth */}
              <Card className="p-3 sm:p-4 bg-white dark:bg-card border border-purple-500/30 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                    {lang === "bn" ? "মোট বিক্রয়মূল্য" : "Total Retail (Sell)"}
                  </span>
                  <div className="p-1.5 sm:p-2 bg-purple-500/10 text-purple-600 rounded-md sm:rounded-lg">
                    <DollarSign className="size-3.5 sm:size-4" />
                  </div>
                </div>
                <div className="mt-1 sm:mt-2">
                  <span className="text-xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                    {fmtMoney(auditCalculations.totalSaleValuation)}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {lang === "bn"
                    ? `সিস্টেম: ${fmtMoney(auditCalculations.totalSystemSaleOfScanned)}`
                    : `Expected: ${fmtMoney(auditCalculations.totalSystemSaleOfScanned)}`}
                </p>
              </Card>

              {/* Card 4: Match Status & Discrepancy */}
              <Card className={`p-3 sm:p-4 border shadow-xs bg-white dark:bg-card ${
                auditCalculations.totalPieces === 0
                  ? "border-border"
                  : !auditCalculations.hasMismatches && auditCalculations.piecesDifference === 0
                  ? "border-emerald-500/40"
                  : "border-rose-500 bg-rose-500/5"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {lang === "bn" ? "স্টক ম্যাচিং" : "Match Status"}
                  </span>
                  <div className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg ${
                    auditCalculations.totalPieces === 0
                      ? "bg-muted/30"
                      : auditCalculations.hasMismatches
                      ? "bg-rose-500/15"
                      : "bg-emerald-500/10"
                  }`}>
                    {auditCalculations.totalPieces === 0 ? (
                      <Clock className="size-3.5 sm:size-4 text-muted-foreground" />
                    ) : !auditCalculations.hasMismatches && auditCalculations.piecesDifference === 0 ? (
                      <CheckCheck className="size-3.5 sm:size-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="size-3.5 sm:size-4 text-rose-600 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="mt-1 sm:mt-2">
                  {auditCalculations.totalPieces === 0 ? (
                    <span className="text-sm sm:text-lg font-bold text-muted-foreground">
                      {lang === "bn" ? "স্ক্যান শুরু করুন" : "Start Scanning"}
                    </span>
                  ) : !auditCalculations.hasMismatches && auditCalculations.piecesDifference === 0 ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-black text-base sm:text-2xl">
                      <CheckCircle2 className="size-4 sm:size-6" />
                      <span>{lang === "bn" ? "হুবহু মিল" : "Perfect Match"}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-lg sm:text-2xl font-black text-rose-600">
                        {auditCalculations.piecesDifference > 0
                          ? `+${auditCalculations.piecesDifference} pcs`
                          : auditCalculations.piecesDifference < 0
                          ? `${auditCalculations.piecesDifference} pcs`
                          : lang === "bn"
                          ? `${auditCalculations.mismatchedItems.length}টি অমিল`
                          : `${auditCalculations.mismatchedItems.length} Alerts`}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-rose-600">
                        {auditCalculations.piecesDifference > 0
                          ? (lang === "bn" ? "বেশি (অ্যালার্ট)" : "Over Stock")
                          : auditCalculations.piecesDifference < 0
                          ? (lang === "bn" ? "ঘাটতি (অ্যালার্ট)" : "Shortage")
                          : (lang === "bn" ? "স্টক অমিল" : "Mismatch")}
                      </span>
                    </div>
                  )}
                </div>

                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate ${
                  auditCalculations.hasMismatches ? "text-rose-600 font-semibold" : "text-muted-foreground"
                }`}>
                  {auditCalculations.totalPieces === 0
                    ? (lang === "bn" ? "বারকোড দিয়ে চেক করুন" : "Scan to check")
                    : auditCalculations.hasMismatches
                    ? (lang === "bn"
                        ? `অমিল: ${auditCalculations.mismatchedItems.length}টি (বেশি ${auditCalculations.overStockCount}, কম ${auditCalculations.underStockCount})`
                        : `Red Alert: ${auditCalculations.mismatchedItems.length} mismatch (${auditCalculations.overStockCount} over, ${auditCalculations.underStockCount} short)`)
                    : (lang === "bn"
                        ? `পার্থক্য: ${fmtMoney(Math.abs(auditCalculations.costDifference))}`
                        : `Diff: ${fmtMoney(Math.abs(auditCalculations.costDifference))}`)}
                </p>
              </Card>
            </div>

            {/* Live Red Stock Mismatch Alert Banner */}
            {auditCalculations.hasMismatches && (
              <Card className="p-3 sm:p-4 bg-rose-500/12 border-2 border-rose-500 shadow-xs space-y-2.5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
                      <ShieldAlert className="size-4 sm:size-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                        {lang === "bn"
                          ? `রেড অ্যালার্ট: ${auditCalculations.mismatchedItems.length}টি পণ্যের স্ক্যান সংখ্যা সিস্টেম স্টকের সাথে মিলছে না!`
                          : `RED ALERT: ${auditCalculations.mismatchedItems.length} scanned product(s) differ from system stock!`}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-rose-700/90 dark:text-rose-300/90">
                        {lang === "bn"
                          ? `স্টকের চেয়ে বেশি স্ক্যান: ${auditCalculations.overStockCount}টি • স্টকের চেয়ে কম স্ক্যান: ${auditCalculations.underStockCount}টি`
                          : `Scanned more than stock: ${auditCalculations.overStockCount} • Scanned less than stock: ${auditCalculations.underStockCount}`}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={showMismatchesOnly ? "destructive" : "outline"}
                    onClick={() => setShowMismatchesOnly((v) => !v)}
                    className={`h-8 text-xs font-bold shrink-0 ${
                      showMismatchesOnly
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "border-rose-500 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15"
                    }`}
                  >
                    <AlertTriangle className="size-3.5 mr-1.5" />
                    {showMismatchesOnly
                      ? (lang === "bn" ? "সব পণ্য দেখুন" : "Show All Scanned")
                      : (lang === "bn"
                          ? `শুধু অমিল দেখুন (${auditCalculations.mismatchedItems.length})`
                          : `Show Mismatches Only (${auditCalculations.mismatchedItems.length})`)}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {auditCalculations.mismatchedItems.slice(0, 6).map((m) => (
                    <Badge
                      key={m.id}
                      className="bg-rose-600/90 hover:bg-rose-600 text-white border-0 text-[11px] font-mono px-2 py-0.5 cursor-pointer"
                      onClick={() => {
                        setAuditSearchQuery(m.product.name);
                        setShowMismatchesOnly(true);
                      }}
                    >
                      {m.product.name}: {m.scannedQty} / {m.sysStock} ({m.diff > 0 ? `+${m.diff} Over` : `${m.diff} Short`})
                    </Badge>
                  ))}
                  {auditCalculations.mismatchedItems.length > 6 && (
                    <Badge variant="outline" className="border-rose-500 text-rose-700 dark:text-rose-300 text-[11px]">
                      +{auditCalculations.mismatchedItems.length - 6} {lang === "bn" ? "আরও" : "more"}
                    </Badge>
                  )}
                </div>
              </Card>
            )}

            {/* Scanner Input Console & Control Bench */}
            <Card className="p-3 sm:p-5 border border-border/80 shadow-xs bg-white dark:bg-card space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Manual Barcode & Gun Scan Input */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Scan className="absolute left-3 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-primary" />
                    <Input
                      ref={barcodeInputRef}
                      value={manualBarcodeInput}
                      onChange={(e) => setManualBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && manualBarcodeInput.trim()) {
                          e.preventDefault();
                          handleScanOrAddProduct(manualBarcodeInput);
                        }
                      }}
                      placeholder={lang === "bn" ? "বারকোড স্ক্যান বা লিখুন (Enter)..." : "Scan barcode or enter SKU (Enter)..."}
                      className="pl-9 sm:pl-11 pr-20 sm:pr-24 h-10 sm:h-12 text-xs sm:text-base font-mono bg-background border-border/80 focus-visible:ring-primary shadow-xs"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleScanOrAddProduct(manualBarcodeInput)}
                      disabled={!manualBarcodeInput.trim()}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 sm:h-9 px-2.5 sm:px-3 text-xs"
                    >
                      {lang === "bn" ? "যোগ" : "Add"}
                    </Button>
                  </div>

                  {/* Camera Scanner Button */}
                  <Button
                    size="default"
                    onClick={() => setScannerOpen(true)}
                    className="h-10 sm:h-12 px-3 sm:px-5 gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs sm:text-sm shrink-0"
                  >
                    <QrCode className="size-4 sm:size-5" />
                    <span>{lang === "bn" ? "ক্যামেরা" : "Camera"}</span>
                  </Button>
                </div>

                {/* Sound & Controls Toolbar */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-between sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`h-8 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-xs gap-1 ${soundEnabled ? "text-primary border-primary/30" : "text-muted-foreground"}`}
                    title={soundEnabled ? "Sound Enabled" : "Sound Muted"}
                  >
                    {soundEnabled ? <Volume2 className="size-3.5 sm:size-4 text-emerald-500" /> : <VolumeX className="size-3.5 sm:size-4 text-rose-500" />}
                    <span>{soundEnabled ? (lang === "bn" ? "সাউন্ড" : "Beep") : (lang === "bn" ? "মিউট" : "Mute")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApplyStockDialogOpen(true)}
                    disabled={resolvedAuditItems.length === 0}
                    className="h-8 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-xs gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-bold"
                    title={lang === "bn" ? "স্ক্যানকৃত সংখ্যা অনুযায়ী ডাটাবেজ স্টক আপডেট করুন" : "Sync database stock to scanned count"}
                  >
                    <ArrowLeftRight className="size-3.5 sm:size-4 text-emerald-600" />
                    <span>{lang === "bn" ? "স্টক সিঙ্ক" : "Sync Stock"}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportAuditCsv(false)}
                    disabled={scannedAuditItems.length === 0}
                    className="h-8 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-xs gap-1"
                    title={lang === "bn" ? "সকল স্ক্যানকৃত পণ্য CSV এক্সপোর্ট" : "Export full audit CSV"}
                  >
                    <Download className="size-3.5 sm:size-4 text-indigo-500" />
                    <span>CSV</span>
                  </Button>

                  {auditCalculations.hasMismatches && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportAuditCsv(true)}
                      className="h-8 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-xs gap-1 border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                      title={lang === "bn" ? "শুধু স্টক অমিল রিপোর্ট CSV এক্সপোর্ট" : "Export mismatches only CSV"}
                    >
                      <Download className="size-3.5 sm:size-4 text-rose-500" />
                      <span>{lang === "bn" ? "অমিল CSV" : "Variance"}</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    disabled={scannedAuditItems.length === 0}
                    className="h-8 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-xs gap-1"
                  >
                    <Printer className="size-3.5 sm:size-4 text-purple-500" />
                    <span>{lang === "bn" ? "প্রিন্ট" : "Print"}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAudit}
                    disabled={scannedAuditItems.length === 0}
                    className="h-8 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <RotateCcw className="size-3.5 sm:size-4" />
                    <span>{lang === "bn" ? "রিসেট" : "Reset"}</span>
                  </Button>
                </div>
              </div>

              {/* Live Session Auto-Save Indicator & Summary Strip */}
              <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between text-[11px] sm:text-xs text-muted-foreground gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/25">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold">{lang === "bn" ? "অটো-সেভ সক্রিয় (সেশন নিরাপদ)" : "Session Auto-Saved"}</span>
                    {lastSavedTime && (
                      <span className="text-[10px] font-mono text-muted-foreground ml-1">
                        • {new Date(lastSavedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground hidden md:inline">
                    {lang === "bn"
                      ? "হাজার হাজার পণ্য স্ক্যান করলেও পেজ পরিবর্তন বা রিফ্রেশে তথ্য অক্ষত থাকবে।"
                      : "Scan data safely preserved across navigation and refresh."}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono font-bold text-foreground self-end sm:self-auto">
                  <span>
                    {lang === "bn" ? `স্ক্যানকৃত: ${resolvedAuditItems.length} আইটেম` : `Scanned: ${resolvedAuditItems.length} items`}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-600 font-black">
                    {auditCalculations.totalPieces} pcs
                  </span>
                </div>
              </div>
            </Card>

            {/* Spotlight of Last Scanned Item */}
            {lastScannedProduct && (() => {
              const liveItem = resolvedAuditItems.find((i) => i.id === lastScannedProduct.id);
              const spotMetrics = getAuditProductMetrics(liveItem || lastScannedProduct);
              const lastQty = liveItem ? liveItem.scannedQty : lastScannedProduct.qty;
              const spotProduct = liveItem ? liveItem.product : lastScannedProduct.product;
              const lastComp = getStockComparison(lastQty, spotMetrics.sysStock);
              return (
                <Card
                  className={`p-3 sm:p-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300 border-2 ${
                    lastComp.isMismatch
                      ? "bg-rose-50/90 dark:bg-rose-950/30 border-rose-500"
                      : "bg-white dark:bg-card border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`size-12 sm:size-14 rounded-lg overflow-hidden border bg-background shrink-0 ${
                        lastComp.isMismatch ? "border-rose-500 ring-2 ring-rose-500/30" : ""
                      }`}>
                        <ProductImage
                          path={spotProduct.image_url}
                          alt={spotProduct.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {lastComp.isMismatch ? (
                            <Badge className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0 gap-1">
                              <AlertTriangle className="size-3" />
                              {lastComp.status === "over"
                                ? lang === "bn"
                                  ? `রেড অ্যালার্ট: স্টকের চেয়ে বেশি (+${lastComp.diff})`
                                  : `RED ALERT: Over Stock (+${lastComp.diff})`
                                : lang === "bn"
                                  ? `রেড অ্যালার্ট: স্টকের চেয়ে কম (${lastComp.diff})`
                                  : `RED ALERT: Under Stock (${lastComp.diff})`}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0 gap-1">
                              <CheckCircle2 className="size-3" />
                              {lang === "bn" ? "স্ক্যান ও স্টক মিল রয়েছে" : "Just Scanned • Matched"}
                            </Badge>
                          )}
                          {spotMetrics.count > 1 && (
                            <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0">
                              {lang === "bn" ? `${spotMetrics.count}টি পণ্য মিলিত` : `${spotMetrics.count} Products Combined`}
                            </Badge>
                          )}
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">
                            {spotProduct.barcode || spotProduct.sku || "No Barcode"}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-base font-bold text-foreground truncate">
                          {spotProduct.name}
                          {spotMetrics.count > 1 && (
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 ml-1.5">
                              (+{spotMetrics.count - 1} {lang === "bn" ? "টি আরও" : "more"})
                            </span>
                          )}
                        </h4>
                        {spotMetrics.count > 1 && (
                          <p className="text-[10px] sm:text-[11px] text-indigo-700 dark:text-indigo-300 truncate">
                            {spotMetrics.list.map((m) => `${m.name}: ${Number(m.stock) || 0} pcs`).join(" • ")}
                          </p>
                        )}
                        <p className={`text-[10px] sm:text-xs truncate ${
                          lastComp.isMismatch ? "text-rose-700 dark:text-rose-300 font-semibold" : "text-muted-foreground"
                        }`}>
                          {lastComp.isMismatch
                            ? lastComp.status === "over"
                              ? lang === "bn"
                                ? `স্ক্যান ${lastQty} পিস — সিস্টেম স্টক ${lastComp.sysStock} পিস (+${lastComp.diff} বেশি!)`
                                : `Scanned ${lastQty} pcs vs System Stock ${lastComp.sysStock} pcs (+${lastComp.diff} over!)`
                              : lang === "bn"
                                ? `স্ক্যান ${lastQty} পিস — সিস্টেম স্টক ${lastComp.sysStock} পিস (${lastComp.diff} কম!)`
                                : `Scanned ${lastQty} pcs vs System Stock ${lastComp.sysStock} pcs (${lastComp.diff} short!)`
                            : `${lang === "bn" ? "ক্যাটাগরি" : "Category"}: ${spotProduct.category || "General"}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-bold block">
                          {lang === "bn" ? "একক ক্রয়" : "Unit Cost"}
                        </span>
                        <span className="text-xs sm:text-base font-bold text-indigo-600 dark:text-indigo-400">
                          {fmtMoney(spotMetrics.avgBuy)}
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-bold block">
                          {lang === "bn" ? "একক বিক্রয়" : "Unit Retail"}
                        </span>
                        <span className="text-xs sm:text-base font-bold text-purple-600 dark:text-purple-400">
                          {fmtMoney(spotMetrics.avgSell)}
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-bold block">
                          {lang === "bn" ? "সিস্টেম স্টক" : "System Stock"}
                        </span>
                        <span className="text-xs sm:text-base font-bold font-mono text-foreground">
                          {lastComp.sysStock} pcs
                        </span>
                      </div>

                      <div className={`text-right px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border shadow-xs ${
                        lastComp.isMismatch
                          ? "bg-rose-600/15 border-rose-500 text-rose-700 dark:text-rose-300"
                          : "bg-slate-50 dark:bg-muted/40 border-border"
                      }`}>
                        <span className="text-[10px] sm:text-[11px] uppercase font-bold block">
                          {lang === "bn" ? "স্ক্যান সংখ্যা" : "Scanned"}
                        </span>
                        <span className={`text-sm sm:text-xl font-black font-mono ${
                          lastComp.isMismatch ? "text-rose-600" : "text-emerald-600"
                        }`}>
                          {lastQty} pcs
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Scanned Items Ledger Table & Mobile Cards */}
            <Card className="overflow-hidden border shadow-xs bg-white dark:bg-card">
              <div className="p-3 sm:p-4 border-b bg-slate-50/60 dark:bg-muted/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileSpreadsheet className="size-4 sm:size-5 text-primary" />
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {lang === "bn" ? "স্ক্যানকৃত পণ্যের অডিট লেজার" : "Scanned Product Audit Ledger"}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">
                    {resolvedAuditItems.length}
                  </Badge>

                  {/* Multi-Mode Variance Filter Tabs */}
                  <div className="flex items-center gap-1 flex-wrap pl-1 sm:pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuditFilter("all");
                        setShowMismatchesOnly(false);
                      }}
                      className={`h-7 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        auditFilter === "all" && !showMismatchesOnly
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/80 bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {lang === "bn" ? "সব" : "All"} ({resolvedAuditItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuditFilter("mismatch");
                        setShowMismatchesOnly(true);
                      }}
                      className={`h-7 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        auditFilter === "mismatch" || showMismatchesOnly
                          ? "bg-rose-600 text-white border-rose-600"
                          : "border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      }`}
                    >
                      <AlertTriangle className="size-3" />
                      <span>{lang === "bn" ? "অমিল" : "Mismatches"} ({auditCalculations.mismatchedItems.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuditFilter("over");
                        setShowMismatchesOnly(false);
                      }}
                      className={`h-7 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        auditFilter === "over"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      }`}
                    >
                      {lang === "bn" ? "বেশি (+)" : "Over (+)"} ({auditCalculations.overStockCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuditFilter("under");
                        setShowMismatchesOnly(false);
                      }}
                      className={`h-7 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        auditFilter === "under"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      }`}
                    >
                      {lang === "bn" ? "ঘাটতি (-)" : "Short (-)"} ({auditCalculations.underStockCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuditFilter("match");
                        setShowMismatchesOnly(false);
                      }}
                      className={`h-7 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        auditFilter === "match"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                    >
                      {lang === "bn" ? "মিল (✓)" : "Matched (✓)"} ({auditCalculations.matchedItemCount})
                    </button>
                  </div>
                </div>

                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground" />
                  <Input
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder={lang === "bn" ? "তালিকায় খুঁজুন..." : "Filter in table..."}
                    className="pl-8 sm:pl-9 h-8 sm:h-9 text-xs bg-background"
                  />
                </div>
              </div>

              {filteredAuditItems.length === 0 ? (
                scannedAuditItems.length > 0 ? (
                  <div className="p-8 sm:p-10 text-center text-muted-foreground space-y-3">
                    <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mx-auto">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-foreground">
                      {showMismatchesOnly && !auditSearchQuery.trim()
                        ? (lang === "bn" ? "কোনো স্টক অমিল অবশিষ্ট নেই!" : "No stock mismatches remaining!")
                        : (lang === "bn" ? "ফিল্টার অনুযায়ী কোনো পণ্য পাওয়া যায়নি" : "No scanned items match current filter")}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowMismatchesOnly(false);
                        setAuditSearchQuery("");
                      }}
                      className="text-xs font-semibold"
                    >
                      {lang === "bn" ? "সব স্ক্যানকৃত পণ্য দেখুন" : "Show All Scanned Items"}
                    </Button>
                  </div>
                ) : (
                  <div className="p-8 sm:p-12 text-center text-muted-foreground space-y-3">
                    <div className="size-12 sm:size-16 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto">
                      <Scan className="size-6 sm:size-8 animate-pulse" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-foreground">
                      {lang === "bn" ? "এখনো কোনো পণ্য স্ক্যান করা হয়নি" : "No products scanned yet"}
                    </h4>
                    <p className="text-xs max-w-md mx-auto">
                      {lang === "bn"
                        ? "উপরে বারকোড ইনপুট বক্সে কোড লিখে Enter চাপুন অথবা 'ক্যামেরা স্ক্যানার' বোতাম চেপে ক্যামেরা দিয়ে দ্রুত স্ক্যান করুন।"
                        : "Scan barcodes using the camera scanner or enter codes in the input field above to calculate stock worth in real time."}
                    </p>
                    <Button
                      onClick={() => setScannerOpen(true)}
                      className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm"
                    >
                      <QrCode className="size-4" />
                      {lang === "bn" ? "ক্যামেরা দিয়ে স্ক্যান শুরু করুন" : "Open Camera Scanner"}
                    </Button>
                  </div>
                )
              ) : (
                <>
                  {/* Phone View: Touch-Friendly Card Ledger */}
                  <div className="md:hidden divide-y divide-border/60">
                    {filteredAuditItems.map((item, idx) => {
                      const p = item.product;
                      const metrics = getAuditProductMetrics(item);
                      const buy = metrics.avgBuy;
                      const sell = metrics.avgSell;
                      const comp = getStockComparison(item.scannedQty, metrics.sysStock);
                      const { sysStock, diff, isMismatch } = comp;
                      const totalCost = item.scannedQty * buy;
                      const totalSell = item.scannedQty * sell;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 space-y-2.5 ${
                            isMismatch
                              ? "bg-rose-50/80 dark:bg-rose-950/25 border-l-4 border-l-rose-500"
                              : "bg-white dark:bg-card"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                                #{idx + 1}
                              </span>
                              <div className="size-11 rounded-lg overflow-hidden border bg-background shrink-0">
                                <ProductImage
                                  path={p.image_url}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-foreground text-xs truncate">
                                  {p.name}
                                  {metrics.count > 1 && (
                                    <span className="ml-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                      (+{metrics.count - 1})
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">
                                  {p.barcode || p.sku || "No Barcode"} {p.category ? `• ${p.category}` : ""}
                                </p>
                                {metrics.count > 1 && (
                                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300 truncate">
                                    {metrics.list.map((m) => `${m.name} (${Number(m.stock) || 0})`).join(" + ")}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {!isMismatch ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                  <CheckCircle2 className="size-2.5 mr-1" />
                                  {lang === "bn" ? "মিল আছে" : "Matched"}
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-600 text-white border-rose-600 text-[10px] px-1.5 py-0 font-bold gap-1">
                                  <AlertTriangle className="size-2.5" />
                                  {diff < 0
                                    ? (lang === "bn" ? `কম (${diff})` : `Short (${diff})`)
                                    : (lang === "bn" ? `বেশি (+${diff})` : `Over (+${diff})`)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Pricing Ledger Bar */}
                          <div className="grid grid-cols-2 gap-1.5 bg-slate-50/80 dark:bg-muted/30 p-2 rounded-lg text-[11px]">
                            <div>
                              <span className="text-muted-foreground block text-[10px] leading-tight">
                                {lang === "bn" ? "একক ক্রয় / মোট ক্রয়" : "Unit / Total Cost"}
                              </span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {fmtMoney(buy)} <span className="text-[10px] font-normal text-muted-foreground">({fmtMoney(totalCost)})</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px] leading-tight">
                                {lang === "bn" ? "একক বিক্রয় / মোট বিক্রয়" : "Unit / Total Retail"}
                              </span>
                              <span className="font-semibold text-purple-600 dark:text-purple-400">
                                {fmtMoney(sell)} <span className="text-[10px] font-normal text-muted-foreground">({fmtMoney(totalSell)})</span>
                              </span>
                            </div>
                          </div>

                          {/* Stock Comparison & Touch Stepper Row */}
                          <div className="flex items-center justify-between pt-0.5">
                            <div className="text-[11px] text-muted-foreground">
                              <span>{lang === "bn" ? "সিস্টেম:" : "System:"} </span>
                              <span className="font-bold text-foreground font-mono">{sysStock}</span>
                              <span className="mx-1">|</span>
                              <span>{lang === "bn" ? "স্ক্যান:" : "Scan:"} </span>
                              <span className={`font-bold font-mono ${isMismatch ? "text-rose-600" : "text-emerald-600"}`}>
                                {item.scannedQty}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center border rounded-lg bg-background p-0.5 shadow-2xs">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleAdjustScannedQty(item.id, -1)}
                                >
                                  <Minus className="size-3.5" />
                                </Button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.scannedQty}
                                  onChange={(e) => handleSetScannedQty(item.id, parseInt(e.target.value, 10) || 0)}
                                  className={`w-10 h-7 text-center font-bold font-mono text-xs bg-transparent border-0 focus:outline-hidden ${
                                    isMismatch ? "text-rose-600" : ""
                                  }`}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleAdjustScannedQty(item.id, 1)}
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustScannedQty(item.id, 5)}
                                  className="h-7 px-1.5 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/80 cursor-pointer"
                                  title="+5 pcs"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustScannedQty(item.id, 10)}
                                  className="h-7 px-1.5 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/80 cursor-pointer"
                                  title="+10 pcs"
                                >
                                  +10
                                </button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title={lang === "bn" ? "পণ্য সম্পাদনা" : "Edit product"}
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setEditOpen(true);
                                  }}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                  onClick={() => handleRemoveScannedItem(item.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Mobile Grand Totals Summary Footer */}
                    <div className="p-3 bg-slate-50 dark:bg-muted/40 border-t space-y-1.5 text-xs">
                      <div className="flex justify-between font-bold">
                        <span>{lang === "bn" ? "সর্বমোট স্ক্যান সংখ্যা:" : "Grand Total Pieces:"}</span>
                        <span className="text-emerald-600 font-mono">{auditCalculations.totalPieces} pcs</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{lang === "bn" ? "মোট ক্রয়মূল্য:" : "Total Cost Worth:"}</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{fmtMoney(auditCalculations.totalCostValuation)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{lang === "bn" ? "মোট বিক্রয়মূল্য:" : "Total Retail Worth:"}</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{fmtMoney(auditCalculations.totalSaleValuation)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] pt-1 border-t border-border/60">
                        <span className="text-muted-foreground">{lang === "bn" ? "সিস্টেম বনাম স্ক্যান:" : "System vs Scanned:"}</span>
                        <span className={`font-bold font-mono ${!auditCalculations.hasMismatches && auditCalculations.piecesDifference === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {!auditCalculations.hasMismatches && auditCalculations.piecesDifference === 0
                            ? (lang === "bn" ? "হুবহু মিল" : "Perfect Match")
                            : auditCalculations.piecesDifference === 0
                            ? (lang === "bn" ? `${auditCalculations.mismatchedItems.length}টি অমিল` : `${auditCalculations.mismatchedItems.length} Mismatches`)
                            : (auditCalculations.piecesDifference > 0 ? `+${auditCalculations.piecesDifference}` : auditCalculations.piecesDifference) + " pcs"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop View: Comprehensive 11-Column Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                          <th className="p-3 w-10 text-center">#</th>
                          <th className="p-3">{lang === "bn" ? "পণ্য" : "Product"}</th>
                          <th className="p-3">{lang === "bn" ? "বারকোড / SKU" : "Barcode / SKU"}</th>
                          <th className="p-3 text-right">{lang === "bn" ? "একক ক্রয়মূল্য" : "Unit Cost"}</th>
                          <th className="p-3 text-right">{lang === "bn" ? "একক বিক্রয়মূল্য" : "Unit Retail"}</th>
                          <th className="p-3 text-center">{lang === "bn" ? "ফিজিক্যাল সংখ্যা" : "Physical Qty"}</th>
                          <th className="p-3 text-right">{lang === "bn" ? "মোট ক্রয়মূল্য" : "Total Cost"}</th>
                          <th className="p-3 text-right">{lang === "bn" ? "মোট বিক্রয়মূল্য" : "Total Retail"}</th>
                          <th className="p-3 text-center">{lang === "bn" ? "সিস্টেম স্টক" : "System Stock"}</th>
                          <th className="p-3 text-center">{lang === "bn" ? "ম্যাচিং স্ট্যাটাস" : "Match Status"}</th>
                          <th className="p-3 text-center w-12">{lang === "bn" ? "অ্যাকশন" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredAuditItems.map((item, idx) => {
                          const p = item.product;
                          const metrics = getAuditProductMetrics(item);
                          const buy = metrics.avgBuy;
                          const sell = metrics.avgSell;
                          const comp = getStockComparison(item.scannedQty, metrics.sysStock);
                          const { sysStock, diff, isMismatch } = comp;
                          const totalCost = item.scannedQty * buy;
                          const totalSell = item.scannedQty * sell;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isMismatch
                                  ? "bg-rose-500/8 hover:bg-rose-500/12"
                                  : "hover:bg-muted/20"
                              }`}
                            >
                              <td className="p-3 text-center font-mono text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="size-10 rounded-md overflow-hidden border bg-background shrink-0">
                                    <ProductImage
                                      path={p.image_url}
                                      alt={p.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <span className="font-bold text-foreground text-sm flex items-center gap-1.5 flex-wrap">
                                      <span>{p.name}</span>
                                      {metrics.count > 1 && (
                                        <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] px-1.5 py-0">
                                          {lang === "bn" ? `${metrics.count}টি পণ্য` : `${metrics.count} items`}
                                        </Badge>
                                      )}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block">
                                      {metrics.count > 1
                                        ? metrics.list.map((m) => `${m.name} (${Number(m.stock) || 0})`).join(" • ")
                                        : p.category || "General"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <span>{p.barcode || p.sku || "-"}</span>
                                  {p.barcode && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(p.barcode || "");
                                        setCopiedBarcode(p.barcode || "");
                                        setTimeout(() => setCopiedBarcode(null), 1500);
                                        toast.success(lang === "bn" ? "বারকোড কপি হয়েছে!" : "Barcode copied!");
                                      }}
                                      className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted cursor-pointer"
                                      title={lang === "bn" ? "বারকোড কপি করুন" : "Copy Barcode"}
                                    >
                                      {copiedBarcode === p.barcode ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-right font-medium text-indigo-600 dark:text-indigo-400">
                                {fmtMoney(buy)}
                              </td>
                              <td className="p-3 text-right font-medium text-purple-600 dark:text-purple-400">
                                {fmtMoney(sell)}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-7 cursor-pointer"
                                    onClick={() => handleAdjustScannedQty(item.id, -1)}
                                  >
                                    <Minus className="size-3" />
                                  </Button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.scannedQty}
                                    onChange={(e) => handleSetScannedQty(item.id, parseInt(e.target.value, 10) || 0)}
                                    className={`w-14 h-7 text-center font-bold font-mono text-sm bg-background border rounded px-1 ${
                                      isMismatch ? "border-rose-500 text-rose-600" : ""
                                    }`}
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-7 cursor-pointer"
                                    onClick={() => handleAdjustScannedQty(item.id, 1)}
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-1 mt-1 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustScannedQty(item.id, 5)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/80 cursor-pointer"
                                    title="+5 pcs"
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustScannedQty(item.id, 10)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/80 cursor-pointer"
                                    title="+10 pcs"
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustScannedQty(item.id, 50)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/80 cursor-pointer"
                                    title="+50 pcs"
                                  >
                                    +50
                                  </button>
                                </div>
                              </td>
                              <td className="p-3 text-right font-bold text-indigo-700 dark:text-indigo-300">
                                {fmtMoney(totalCost)}
                              </td>
                              <td className="p-3 text-right font-bold text-purple-700 dark:text-purple-300">
                                {fmtMoney(totalSell)}
                              </td>
                              <td className="p-3 text-center font-mono text-xs">
                                {sysStock} pcs
                              </td>
                              <td className="p-3 text-center">
                                {!isMismatch ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                                    <CheckCircle2 className="size-3 mr-1" />
                                    {lang === "bn" ? "মিল রয়েছে" : "Matched"}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-600 text-white border-rose-600 text-[10px] font-bold gap-1">
                                    <AlertTriangle className="size-3" />
                                    {diff < 0
                                      ? (lang === "bn" ? `ঘাটতি (${diff})` : `Short (${diff})`)
                                      : (lang === "bn" ? `বেশি (+${diff})` : `Over (+${diff})`)}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title={lang === "bn" ? "পণ্য তথ্য সম্পাদনা" : "Edit product"}
                                    onClick={() => {
                                      setEditingProduct(p);
                                      setEditOpen(true);
                                    }}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                    title={lang === "bn" ? "অডিট থেকে মুছুন" : "Remove from audit"}
                                    onClick={() => handleRemoveScannedItem(item.id)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-muted/60 font-bold">
                          <td colSpan={5} className="p-3 text-right text-sm">
                            {lang === "bn" ? "সর্বমোট হিসাব (Grand Totals):" : "Grand Totals:"}
                          </td>
                          <td className="p-3 text-center text-sm text-emerald-600">
                            {auditCalculations.totalPieces} pcs
                          </td>
                          <td className="p-3 text-right text-sm text-indigo-600">
                            {fmtMoney(auditCalculations.totalCostValuation)}
                          </td>
                          <td className="p-3 text-right text-sm text-purple-600">
                            {fmtMoney(auditCalculations.totalSaleValuation)}
                          </td>
                          <td className="p-3 text-center text-xs text-muted-foreground">
                            {auditCalculations.totalSystemStockOfScanned} pcs
                          </td>
                          <td colSpan={2} className="p-3 text-center">
                            {!auditCalculations.hasMismatches && auditCalculations.piecesDifference === 0 ? (
                              <span className="text-xs text-emerald-600 font-bold">{lang === "bn" ? "হুবহু মিল" : "Perfect Match"}</span>
                            ) : (
                              <span className="text-xs font-bold text-rose-600">
                                {auditCalculations.piecesDifference === 0
                                  ? (lang === "bn" ? `${auditCalculations.mismatchedItems.length}টি অমিল` : `${auditCalculations.mismatchedItems.length} Mismatches`)
                                  : `${auditCalculations.piecesDifference > 0 ? `+${auditCalculations.piecesDifference}` : auditCalculations.piecesDifference} pcs`}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2-6: STANDARD PRODUCT ANALYTICS & INTELLIGENCE           */}
        {/* ------------------------------------------------------------- */}
        {activeTab !== "stock_scanner" && (
          <div className="space-y-6">
            {/* Top Aggregate Summary Bento */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card className="p-3 sm:p-4 bg-white dark:bg-card border shadow-xs">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">
                  <span className="truncate">{lang === "bn" ? "মোট স্টক মূল্য (কেনা)" : "Stock Worth (Cost)"}</span>
                  <Package className="size-3.5 sm:size-4 text-teal-500 shrink-0" />
                </div>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-foreground">
                  {fmtMoney(totalValuationCost)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {lang === "bn" ? "কেনা মূল্যের হিসাব" : "Purchase cost basis"}
                </p>
              </Card>

              <Card className="p-3 sm:p-4 bg-white dark:bg-card border shadow-xs">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">
                  <span className="truncate">{lang === "bn" ? "মোট বিক্রয় মূল্য" : "Retail Value"}</span>
                  <TrendingUp className="size-3.5 sm:size-4 text-emerald-500 shrink-0" />
                </div>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-foreground">
                  {fmtMoney(totalValuationSale)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {lang === "bn" ? "বিক্রি মূল্যের সর্বমোট" : "Retail price basis"}
                </p>
              </Card>

              <Card className="p-3 sm:p-4 bg-white dark:bg-card border shadow-xs">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">
                  <span className="truncate">{lang === "bn" ? "স্টক শেষ পণ্য" : "Out of Stock"}</span>
                  <ShieldAlert className="size-3.5 sm:size-4 text-rose-500 shrink-0" />
                </div>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-rose-600">
                  {analyticsProducts.filter((p) => p.isOut).length}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {lang === "bn" ? "রি-অর্ডার প্রয়োজন" : "Replenishment needed"}
                </p>
              </Card>

              <Card className="p-3 sm:p-4 bg-white dark:bg-card border shadow-xs">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">
                  <span className="truncate">{lang === "bn" ? "মোট পণ্য সংখ্যা" : "Total Products"}</span>
                  <Layers className="size-3.5 sm:size-4 text-indigo-500 shrink-0" />
                </div>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-foreground">
                  {products.length}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {lang === "bn" ? `${categories.length} টি ক্যাটাগরি` : `${categories.length} categories`}
                </p>
              </Card>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-card p-2.5 sm:p-3 rounded-lg border shadow-xs">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === "bn" ? "নাম বা বারকোড দিয়ে খুঁজুন..." : "Search name or barcode..."}
                    className="pl-8 sm:pl-9 h-8 sm:h-9 text-xs"
                  />
                </div>

                <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                  <SelectTrigger className="w-32 sm:w-40 h-8 sm:h-9 text-xs">
                    <SelectValue placeholder={lang === "bn" ? "সকল ক্যাটাগরি" : "All Categories"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang === "bn" ? "সকল ক্যাটাগরি" : "All Categories"}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                  <SelectTrigger className="w-28 sm:w-32 h-8 sm:h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{lang === "bn" ? "আজকে" : "Today"}</SelectItem>
                    <SelectItem value="7d">{lang === "bn" ? "গত ৭ দিন" : "Last 7 Days"}</SelectItem>
                    <SelectItem value="30d">{lang === "bn" ? "গত ৩০ দিন" : "Last 30 Days"}</SelectItem>
                    <SelectItem value="this_month">{lang === "bn" ? "এই মাস" : "This Month"}</SelectItem>
                    <SelectItem value="all">{lang === "bn" ? "সকল সময়" : "All Time"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Table & Mobile Cards */}
            <Card className="overflow-hidden border shadow-xs bg-white dark:bg-card">
              {/* Phone View: Touch-Friendly Product Cards */}
              <div className="md:hidden divide-y divide-border/60">
                {pagedResult.items.map((item) => (
                  <div key={item.product.id} className="p-3 space-y-2.5 bg-white dark:bg-card hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-11 rounded-lg overflow-hidden border bg-background shrink-0">
                          <ProductImage
                            path={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-foreground text-xs sm:text-sm block truncate">
                            {item.product.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono block truncate">
                            {item.product.category || "General"} • {item.product.barcode || item.product.sku || "No Barcode"}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        item.isOut
                          ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                          : item.isLow
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      }`}>
                        {item.currentStock} pcs
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50/80 dark:bg-muted/30 p-2 rounded-lg text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px] leading-tight">
                          {lang === "bn" ? "কেনা / বিক্রি মূল্য" : "Cost / Retail"}
                        </span>
                        <span className="font-semibold text-foreground">
                          {fmtMoney(Number(item.product.buy_price) || 0)} / {fmtMoney(Number(item.product.sell_price) || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] leading-tight">
                          {lang === "bn" ? "বিক্রিত / লাভ" : "Sold / Profit"}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.soldPieces} pcs • {fmtMoney(item.profit)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="text-[11px] text-muted-foreground">
                        <span>{lang === "bn" ? "মোট আয়:" : "Revenue:"} </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{fmtMoney(item.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 bg-background shadow-2xs"
                          onClick={() => {
                            setSaleProduct(item.product.id);
                            setSaleOpen(true);
                          }}
                        >
                          {lang === "bn" ? "বিক্রি" : "Sell"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 bg-background shadow-2xs"
                          onClick={() => {
                            setBuyProduct(item.product.id);
                            setBuyOpen(true);
                          }}
                        >
                          {lang === "bn" ? "ক্রয়" : "Buy"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Full Analytics Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                      <th className="p-3">{lang === "bn" ? "পণ্য" : "Product"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "কেনা মূল্য" : "Buy Price"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "বিক্রি মূল্য" : "Sale Price"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "বর্তমান স্টক" : "Current Stock"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "বিক্রিত পিস" : "Sold Pieces"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "মোট আয়" : "Revenue"}</th>
                      <th className="p-3 text-right">{lang === "bn" ? "লাভ" : "Profit"}</th>
                      <th className="p-3 text-center">{lang === "bn" ? "অ্যাকশন" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pagedResult.items.map((item) => (
                      <tr key={item.product.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-10 rounded-md overflow-hidden border bg-background shrink-0">
                              <ProductImage
                                path={item.product.image_url}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-foreground text-sm block">
                                {item.product.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {item.product.category || "General"} • {item.product.barcode || item.product.sku || "No Barcode"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">{fmtMoney(Number(item.product.buy_price) || 0)}</td>
                        <td className="p-3 text-right font-medium">{fmtMoney(Number(item.product.sell_price) || 0)}</td>
                        <td className="p-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            item.isOut
                              ? "bg-rose-500/15 text-rose-600"
                              : item.isLow
                              ? "bg-amber-500/15 text-amber-600"
                              : "bg-emerald-500/15 text-emerald-600"
                          }`}>
                            {item.currentStock} pcs
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-foreground">{item.soldPieces} pcs</td>
                        <td className="p-3 text-right font-bold text-indigo-600">{fmtMoney(item.revenue)}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{fmtMoney(item.profit)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2"
                              onClick={() => {
                                setSaleProduct(item.product.id);
                                setSaleOpen(true);
                              }}
                            >
                              {lang === "bn" ? "বিক্রি" : "Sell"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2"
                              onClick={() => {
                                setBuyProduct(item.product.id);
                                setBuyOpen(true);
                              }}
                            >
                              {lang === "bn" ? "ক্রয়" : "Buy"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagedResult.totalPages > 1 && (
                <div className="p-3 border-t bg-white dark:bg-card">
                  <PaginationBar
                    page={page}
                    totalPages={pagedResult.totalPages}
                    total={filteredProducts.length}
                    pageSize={pageSize}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal for Continuous Physical Stock Auditing */}
      {scannerOpen && (
        <BarcodeScannerDialog
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={(scannedCode) => {
            if (scannedCode) {
              handleScanOrAddProduct(scannedCode);
              if (!continuousScan) {
                setScannerOpen(false);
              }
            }
          }}
          title={lang === "bn" ? "পণ্য স্টক অডিট স্ক্যানার" : "Product Stock Audit Scanner"}
          continuous={continuousScan}
        />
      )}

      {/* Product Edit / Sale / Purchase Modals */}
      {editOpen && (
        <ProductDialog
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v);
            if (!v) setEditingProduct(null);
          }}
          product={editingProduct}
        />
      )}
      {saleOpen && (
        <SaleDialog
          open={saleOpen}
          onOpenChange={setSaleOpen}
          presetProductId={saleProduct}
        />
      )}
      {buyOpen && (
        <PurchaseDialog
          open={buyOpen}
          onOpenChange={setBuyOpen}
          presetProductId={buyProduct}
        />
      )}

      {/* Apply Stock Audit to Database Stock Modal */}
      <Dialog open={applyStockDialogOpen} onOpenChange={setApplyStockDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-5 text-emerald-600" />
              <span>{lang === "bn" ? "স্ক্যান অনুযায়ী সিস্টেম স্টক আপডেট" : "Apply Audit Count to System Stock"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              {lang === "bn"
                ? "আপনি কি নিশ্চিতভাবে স্ক্যানকৃত পণ্যগুলোর বর্তমান ফিজিক্যাল সংখ্যাকে ডাটাবেজের আসল স্টক হিসেবে সেভ করতে চান? এটি পণ্যের বিদ্যমান স্টককে নতুন স্ক্যান সংখ্যা দিয়ে প্রতিস্থাপন করবে।"
                : "Are you sure you want to update the database stock of all audited products to match the scanned physical quantities? This will update real inventory."}
            </p>
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border text-center font-bold">
              <div>
                <span className="text-muted-foreground block text-[10px]">{lang === "bn" ? "মোট পণ্য" : "Total Items"}</span>
                <span className="text-base font-mono">{resolvedAuditItems.length}</span>
              </div>
              <div>
                <span className="text-rose-600 block text-[10px]">{lang === "bn" ? "স্টক অমিল" : "Mismatches"}</span>
                <span className="text-base text-rose-600 font-mono">{auditCalculations.mismatchedItems.length}</span>
              </div>
              <div>
                <span className="text-emerald-600 block text-[10px]">{lang === "bn" ? "মোট পিস" : "Total Pieces"}</span>
                <span className="text-base text-emerald-600 font-mono">{auditCalculations.totalPieces}</span>
              </div>
            </div>
            {auditCalculations.mismatchedItems.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-background">
                {auditCalculations.mismatchedItems.slice(0, 15).map((m) => (
                  <div key={m.id} className="flex justify-between items-center text-[11px] p-1.5 rounded hover:bg-muted/50">
                    <span className="font-medium truncate max-w-[200px]">{m.product.name}</span>
                    <span className="font-mono">
                      <span className="text-muted-foreground">{m.sysStock}</span>
                      <span className="mx-1">→</span>
                      <span className="font-bold text-emerald-600">{m.scannedQty}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">({m.diff > 0 ? `+${m.diff}` : m.diff})</span>
                    </span>
                  </div>
                ))}
                {auditCalculations.mismatchedItems.length > 15 && (
                  <div className="text-center text-[10px] text-muted-foreground pt-1">
                    +{auditCalculations.mismatchedItems.length - 15} {lang === "bn" ? "টি আরও পণ্য" : "more items"}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setApplyStockDialogOpen(false)} disabled={isApplyingStock}>
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              size="sm"
              disabled={isApplyingStock || resolvedAuditItems.length === 0}
              onClick={handleApplyAuditToSystemStock}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 cursor-pointer"
            >
              {isApplyingStock ? (lang === "bn" ? "আপডেট হচ্ছে..." : "Applying...") : (lang === "bn" ? "হ্যাঁ, স্টক আপডেট নিশ্চিত করুন" : "Yes, Update Stock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
