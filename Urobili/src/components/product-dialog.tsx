"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { getProducts, type Product } from "@/lib/queries";
import { ImagePlus, Plus, Trash2, Scan, Barcode, Wand2, AlertCircle, Package, CheckCircle2, RotateCcw, Fingerprint, Copy, Check, ArrowRight } from "lucide-react";
import { createProductFn, updateProductFn, uploadImageFn } from "@/lib/rpc";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import { LabelPrintDialog } from "@/components/label-print-dialog";
import { generateUniqueBarcode } from "@/lib/label-printer";

export function ProductDialog({
  open, onOpenChange, product,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; product?: Product | null;
}) {
  const { lang, t } = useT();
  const { user } = useAuth();
  const isRestaurant = user?.industry === "restaurant";
  const qc = useQueryClient();
  const { data: products = [] } = useCachedQuery(["products"], getProducts);
  
  const [name, setName] = useState("");
  const [buy, setBuy] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [trackStock, setTrackStock] = useState(!isRestaurant);
  const [customAdd, setCustomAdd] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [attrs, setAttrs] = useState<{ key: string; val: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(product ?? null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    setCurrentProduct(product ?? null);
  }, [product, open]);

  const activeId = currentProduct?.id || (currentProduct as any)?._id || "";
  const originalStock = useMemo(() => Number(currentProduct?.stock) || 0, [currentProduct]);
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  // Barcode duplicate validation: verify if another product already possesses this barcode
  const duplicateProduct = useMemo(() => {
    const trimmed = barcode.trim().toLowerCase();
    if (!trimmed) return null;
    const stripped = trimmed.replace(/^0+/, "");
    return (
      products.find((p) => {
        if (activeId && p.id === activeId) return false;
        const pCode = (p.barcode || "").trim().toLowerCase();
        const pStripped = pCode.replace(/^0+/, "");
        return (pCode && pCode === trimmed) || (stripped && pStripped && pStripped === stripped);
      }) || null
    );
  }, [barcode, products, activeId]);

  const switchToExistingProduct = (p: Product) => {
    setCurrentProduct(p);
    setName(p.name ?? "");
    setBuy(String(p.buy_price ?? ""));
    setSellPrice(String(p.sell_price ?? ""));
    setStock(String(p.stock ?? "0"));
    setCustomAdd("");
    setMinStock(String(p.min_stock ?? "5"));
    setCategory(p.category ?? "");
    setBarcode(p.barcode ?? p.code ?? "");
    setFile(null);
    if (p.attributes) {
      setAttrs(Object.entries(p.attributes).map(([key, val]) => ({ key, val })));
    } else {
      setAttrs([]);
    }
    toast.info(
      lang === "bn"
        ? `বিদ্যমান পণ্য "${p.name}" (আইডি: #${p.id.slice(-6).toUpperCase()}) নির্বাচিত হয়েছে। আপনি এখন স্টক যোগ করতে পারেন।`
        : `Switched to existing product "${p.name}" (ID: #${p.id.slice(-6).toUpperCase()}). You can now add stock.`
    );
  };

  useEffect(() => {
    if (open) {
      setName(currentProduct?.name ?? "");
      setBuy(String(currentProduct?.buy_price ?? ""));
      setSellPrice(String(currentProduct?.sell_price ?? ""));
      setStock(String(currentProduct?.stock ?? "0"));
      setTrackStock(
        currentProduct
          ? Boolean((currentProduct as any).track_stock ?? (currentProduct.attributes?.track_stock === "true" || !isRestaurant))
          : !isRestaurant
      );
      setCustomAdd("");
      setMinStock(String(currentProduct?.min_stock ?? "5"));
      setCategory(currentProduct?.category ?? "");
      setBarcode(currentProduct?.barcode ?? currentProduct?.code ?? "");
      setFile(null);
      if (currentProduct?.attributes) {
        setAttrs(Object.entries(currentProduct.attributes).map(([key, val]) => ({ key, val })));
      } else {
        setAttrs([]);
      }
    }
  }, [open, currentProduct]);

  function addAttribute() {
    setAttrs(prev => [...prev, { key: "", val: "" }]);
  }

  function updateAttribute(i: number, patch: Partial<{ key: string; val: string }>) {
    setAttrs(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }

  function removeAttribute(i: number) {
    setAttrs(prev => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let image_url = product?.image_url ?? null;
      if (file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const upData: any = await uploadImageFn({ data: { base64, fileName: file.name } });
        image_url = upData?.url || upData?.data?.url || null;
      }

      const attributesObj: Record<string, string> = {};
      attrs.forEach(a => {
        if (a.key.trim()) {
          attributesObj[a.key.trim()] = a.val.trim();
        }
      });

      const payload = {
        name,
        image_url,
        buy_price: Number(buy) || 0,
        sell_price: Number(sellPrice) || 0,
        track_stock: isRestaurant ? trackStock : true,
        stock: isRestaurant && !trackStock ? 0 : Number(stock) || 0,
        min_stock: isRestaurant && !trackStock ? 0 : (minStock.trim() && Number.isFinite(Number(minStock)) ? Math.max(0, Number(minStock)) : 5),
        category: category.trim(),
        barcode: barcode.trim() || null,
        code: barcode.trim() || null,
        attributes: {
          ...attributesObj,
          ...(isRestaurant ? { track_stock: trackStock ? "true" : "false" } : {}),
        },
      };

      if (duplicateProduct) {
        toast.error(
          lang === "bn"
            ? `আপনি এটি করতে পারবেন না! "${duplicateProduct.name}" পণ্যে ইতিমধ্যে একই বারকোড (${duplicateProduct.barcode}) রয়েছে।`
            : `You can't do this! A product with this barcode already exists ("${duplicateProduct.name}").`,
          { duration: 4500 }
        );
        setBusy(false);
        return;
      }

      if (activeId) {
        await updateProductFn({ data: { id: activeId, ...payload } });
      } else {
        await createProductFn({ data: payload });
      }

      toast.success(t("save"));
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeId ? (lang === "bn" ? "পণ্য এডিট ও স্টক সংযোজন" : "Edit Product & Restock") : t("add_product")}
            </DialogTitle>
          </DialogHeader>

          {/* Dedicated Unique Product Identity Banner */}
          {activeId ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/25 text-xs">
              <div className="flex items-center gap-1.5 font-mono overflow-hidden">
                <Fingerprint className="size-4 text-primary shrink-0" />
                <span className="font-bold text-foreground text-[11px] shrink-0">
                  {lang === "bn" ? "পণ্য আইডি:" : "Product ID:"}
                </span>
                <span className="font-bold text-primary bg-background px-1.5 py-0.5 rounded border border-border truncate text-[11px]" title={activeId}>
                  #{activeId.slice(-6).toUpperCase()} ({activeId})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] shrink-0 hover:bg-background"
                onClick={() => {
                  navigator.clipboard.writeText(activeId);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                  toast.success(lang === "bn" ? "পণ্য আইডি কপি হয়েছে" : "Product ID copied");
                }}
              >
                {copiedId ? <Check className="size-3 text-emerald-600 mr-1" /> : <Copy className="size-3 mr-1" />}
                {copiedId ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}
              </Button>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-muted/50 border border-border/70 text-xs flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Plus className="size-3.5 text-primary" />
                <span>{lang === "bn" ? "নতুন পণ্য তৈরি (নতুন অনন্য আইডি স্বয়ংক্রিয়ভাবে তৈরি হবে)" : "New Product (Dedicated ID auto-generated)"}</span>
              </span>
            </div>
          )}
          <form onSubmit={submit} className="space-y-3">
            <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-5 cursor-pointer hover:bg-secondary/50 transition">
              <ImagePlus className="size-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : t("upload_image")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Field label={t("product_name")}><Input required placeholder={t("product_name")} value={name} onChange={e => setName(e.target.value)} /></Field>
            
            {/* Barcode & QR Code Field */}
            <Field label={lang === "bn" ? "বারকোড / QR কোড (ঐচ্ছিক)" : "Barcode / QR Code (Optional)"}>
              <div className="flex items-center gap-1.5">
                <Input
                  type="text"
                  className={`font-mono text-xs flex-1 ${duplicateProduct ? "border-rose-500 ring-1 ring-rose-500/30 text-rose-600" : ""}`}
                  placeholder={lang === "bn" ? "বারকোড স্ক্যান করুন অথবা লিখুন..." : "Scan or enter barcode..."}
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 cursor-pointer"
                  title={lang === "bn" ? "ক্যামেরা দিয়ে স্ক্যান করুন" : "Scan Barcode"}
                  onClick={() => setScannerOpen(true)}
                >
                  <Scan className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer"
                  title={lang === "bn" ? "নতুন বারকোড তৈরি করুন" : "Auto-Generate Barcode"}
                  onClick={() => {
                    const nextCode = generateUniqueBarcode(
                      "CODE128",
                      products.map((p) => p.barcode || ""),
                      "CW"
                    );
                    setBarcode(nextCode);
                    toast.success(
                      lang === "bn"
                        ? `নতুন বারকোড তৈরি হয়েছে: ${nextCode}`
                        : `Generated barcode: ${nextCode}`
                    );
                  }}
                >
                  <Wand2 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                  title={lang === "bn" ? "বারকোড স্টিকার প্রিন্ট করুন" : "Print Barcode Sticker"}
                  onClick={() => {
                    if (!barcode.trim()) {
                      const nextCode = generateUniqueBarcode(
                        "CODE128",
                        products.map((p) => p.barcode || ""),
                        "CW"
                      );
                      setBarcode(nextCode);
                    }
                    setLabelDialogOpen(true);
                  }}
                >
                  <Barcode className="size-4" />
                </Button>
              </div>
              {duplicateProduct && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-2 mt-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="size-4 shrink-0 text-rose-600" />
                    <span>
                      {lang === "bn"
                        ? `বারকোডটি ইতিমধ্যে "${duplicateProduct.name}" পণ্যে ব্যবহৃত হয়েছে (আইডি: #${duplicateProduct.id.slice(-6).toUpperCase()})।`
                        : `Barcode is already used by "${duplicateProduct.name}" (ID: #${duplicateProduct.id.slice(-6).toUpperCase()}).`}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    onClick={() => switchToExistingProduct(duplicateProduct)}
                  >
                    <ArrowRight className="size-3.5" />
                    <span>
                      {lang === "bn"
                        ? `"${duplicateProduct.name}" পণ্যে নতুন স্টক যোগ করতে ক্লিক করুন`
                        : `Switch & add new stock to "${duplicateProduct.name}"`}
                    </span>
                  </Button>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("buy_price")}><Input type="number" step="any" inputMode="decimal" pattern="[0-9.]*" placeholder={t("buy_price")} value={buy} onChange={e => setBuy(e.target.value)} /></Field>
              <Field label={t("sell_price") || "Selling Price"}><Input type="number" step="any" inputMode="decimal" pattern="[0-9.]*" placeholder={t("sell_price") || "Selling Price"} value={sellPrice} onChange={e => setSellPrice(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("category")}>
                <div className="relative flex items-center">
                  <Input
                    placeholder={t("category")}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="pr-8"
                  />
                  {categories.length > 0 && (
                    <select
                      value=""
                      onChange={e => {
                        if (e.target.value) setCategory(e.target.value);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[10px] text-muted-foreground w-6 h-6 focus:outline-none cursor-pointer"
                      title="Select existing category"
                    >
                      <option value="">▼</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </Field>
              {trackStock && (
                <Field label={t("min_stock")}><Input type="number" step="1" inputMode="numeric" pattern="[0-9]*" placeholder="5" value={minStock} onChange={e => setMinStock(e.target.value)} /></Field>
              )}
            </div>
            {isRestaurant && (
              <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/30 cursor-pointer text-xs">
                <div>
                  <div className="font-bold">
                    {lang === "bn" ? "স্টক গণনা চালু করুন (পানির বোতল, কোল্ড ড্রিঙ্কস)" : "Track Stock Count (e.g. Water Bottles, Cold Drinks)"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {lang === "bn" ? "সাধারণ খাবারের জন্য বন্ধ রাখুন; বোতলজাত পণ্যের জন্য চালু করুন।" : "Leave off for made-to-order dishes; turn on for bottled drinks."}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                  className="size-4 accent-primary cursor-pointer"
                />
              </label>
            )}
            {/* ── Stock & Restock Management Widget ── */}
            {(!isRestaurant || trackStock) && (currentProduct ? (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Package className="size-3.5 text-primary" />
                    <span>{lang === "bn" ? "স্টক ও নতুন স্টক সংযোজন" : "Stock & Restock"}</span>
                  </Label>
                  <div className="text-xs font-mono text-muted-foreground">
                    {lang === "bn" ? "বর্তমান স্টক:" : "Current:"}{" "}
                    <span className="font-bold text-foreground">{originalStock}</span> {lang === "bn" ? "পিস" : "pcs"}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* + Custom Amount Input */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                      {lang === "bn" ? "➕ নতুন ক্রয়কৃত স্টক যোগ করুন" : "➕ Add New Stock (Custom Amount)"}
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-emerald-600 dark:text-emerald-400 select-none pointer-events-none">
                        +
                      </span>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={lang === "bn" ? "নতুন ক্রয়ের পরিমাণ (যেমন: ১০)" : "Enter added amount"}
                        value={customAdd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomAdd(val);
                          const addNum = Math.max(0, Number(val) || 0);
                          setStock(String(originalStock + addNum));
                        }}
                        className="pl-7 h-9 text-xs rounded-xl font-mono font-bold bg-background border-emerald-500/30 focus-visible:ring-emerald-500/30"
                      />
                    </div>
                  </div>

                  {/* Total Resulting Stock Input */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      {lang === "bn" ? "সর্বমোট চূড়ান্ত স্টক (পিস)" : "Total Final Stock (pcs)"}
                    </span>
                    <Input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={stock}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStock(val);
                        const num = Number(val) || 0;
                        const diff = num - originalStock;
                        setCustomAdd(diff > 0 ? String(diff) : "");
                      }}
                      className="h-9 text-xs font-mono font-bold rounded-xl bg-background border-primary/40 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Quick Add Buttons: +1, +5, +10, +20, +50, +100 */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">
                      {lang === "bn" ? "এক ক্লিকে স্টক যোগ:" : "Quick Add Shortcuts:"}
                    </span>
                    {Number(stock) !== originalStock && (
                      <button
                        type="button"
                        onClick={() => {
                          setStock(String(originalStock));
                          setCustomAdd("");
                        }}
                        className="text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        <span>{lang === "bn" ? "রিসেট (মূল স্টকে ফিরুন)" : "Reset"}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[1, 5, 10, 20, 50, 100].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentAdd = Number(customAdd) || 0;
                          const nextAdd = currentAdd + amt;
                          setCustomAdd(String(nextAdd));
                          setStock(String(originalStock + nextAdd));
                        }}
                        className="h-7 px-2.5 text-xs font-bold rounded-lg border-border hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500/40 cursor-pointer transition-all"
                      >
                        +{amt}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Calculation Feedback Banner */}
                {Number(stock) > originalStock && (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in fade-in">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>
                      {lang === "bn"
                        ? `পূর্বের স্টক: ${originalStock} + নতুন ক্রয়: ${Number(stock) - originalStock} = নতুন মোট স্টক: ${stock} পিস`
                        : `Previous: ${originalStock} + Restock: ${Number(stock) - originalStock} = Total: ${stock} pcs`}
                    </span>
                  </div>
                )}
                {Number(stock) < originalStock && (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold animate-in fade-in">
                    <AlertCircle className="size-4 text-amber-600 shrink-0" />
                    <span>
                      {lang === "bn"
                        ? `স্টক হ্রাস: ${originalStock - Number(stock)} পিস কমেছে (নতুন স্টক: ${stock} পিস)`
                        : `Stock reduced by ${originalStock - Number(stock)} pcs (New stock: ${stock} pcs)`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <Field label={t("stock")}>
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    step="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={t("stock")}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground mr-1">{lang === "bn" ? "দ্রুত যোগ:" : "Quick add:"}</span>
                    {[5, 10, 20, 50, 100].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const cur = Number(stock) || 0;
                          setStock(String(cur + amt));
                        }}
                        className="h-6 px-2 text-[10px] font-bold rounded-lg border-border hover:bg-primary/10 cursor-pointer"
                      >
                        +{amt}
                      </Button>
                    ))}
                  </div>
                </div>
              </Field>
            ))}

            <div className="space-y-1.5 border-t border-border pt-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{t("attributes")}</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={addAttribute}>
                  <Plus className="size-3 mr-1" /> {t("add_attribute")}
                </Button>
              </div>
              {attrs.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">{t("no_results")}</p>
              )}
              <div className="space-y-1.5">
                {attrs.map((attr, i) => (
                  <div key={`attr-${i}`} className="flex items-center gap-1.5">
                    <Input
                      className="h-8 text-xs flex-1"
                      placeholder={t("key")}
                      value={attr.key}
                      onChange={e => updateAttribute(i, { key: e.target.value })}
                    />
                    <Input
                      className="h-8 text-xs flex-1"
                      placeholder={t("value")}
                      value={attr.val}
                      onChange={e => updateAttribute(i, { val: e.target.value })}
                    />
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive shrink-0" onClick={() => removeAttribute(i)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 border-t border-border pt-2.5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={busy}>{busy ? "…" : t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(code) => {
          const trimmed = code.trim().toLowerCase();
          const stripped = trimmed.replace(/^0+/, "");
          const dup = products.find((p) => {
            if (activeId && p.id === activeId) return false;
            const pCode = (p.barcode || "").trim().toLowerCase();
            const pStripped = pCode.replace(/^0+/, "");
            return (pCode && pCode === trimmed) || (stripped && pStripped && pStripped === stripped);
          });
          if (dup) {
            switchToExistingProduct(dup);
            return;
          }
          setBarcode(code);
          toast.success(lang === "bn" ? `বারকোড যোগ করা হয়েছে: ${code}` : `Barcode set: ${code}`);
        }}
        title={lang === "bn" ? "পণ্য বারকোড স্ক্যান করুন" : "Scan Product Barcode"}
      />

      <LabelPrintDialog
        open={labelDialogOpen}
        onOpenChange={setLabelDialogOpen}
        products={products}
        initialProducts={[
          {
            id: product?.id || "draft_product",
            name: name.trim() || product?.name || (lang === "bn" ? "নতুন পণ্য" : "New Product"),
            image_url: product?.image_url ?? null,
            buy_price: Number(buy) || 0,
            sell_price: Number(sellPrice) || 0,
            stock: Math.max(1, Number(stock) || 1),
            barcode: barcode.trim() || product?.barcode || "89400001",
            category: category.trim(),
            attributes: Object.fromEntries(
              attrs.filter((a) => a.key.trim()).map((a) => [a.key.trim(), a.val.trim()])
            ),
            created_at: product?.created_at || new Date().toISOString(),
            initialCopies: Math.max(1, Math.min(200, Number(stock) || 1)),
          },
        ]}
        shopName={user?.business_name || "UROBILI"}
        lang={lang}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
