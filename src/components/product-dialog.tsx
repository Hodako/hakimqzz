"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { getProducts, type Product } from "@/lib/queries";
import { ImagePlus, Plus, Trash2, Scan, Zap, X } from "lucide-react";
import { createProductFn, updateProductFn, uploadImageFn } from "@/lib/rpc";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import { playScanSuccessSound } from "@/lib/audio";
import { setCachedData, refreshQueries } from "@/lib/optimistic-cache";

export function ProductDialog({
  open, onOpenChange, product, initialBarcode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: Product | null;
  initialBarcode?: string | null;
}) {
  const { lang, t } = useT();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data: products = [] } = useCachedQuery(["products"], getProducts);
  
  const [name, setName] = useState("");
  const [buy, setBuy] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("5");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [attrs, setAttrs] = useState<{ key: string; val: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef<{ char: string; time: number }[]>([]);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setBuy(String(product?.buy_price ?? ""));
      setSellPrice(String(product?.sell_price ?? ""));
      setStock(String(product?.stock ?? "0"));
      setMinStock(String(product?.min_stock ?? "5"));
      setCategory(product?.category ?? "");
      setBarcode(product?.barcode ?? initialBarcode ?? "");
      setFile(null);
      if (product?.attributes) {
        setAttrs(Object.entries(product.attributes).map(([key, val]) => ({ key, val })));
      } else {
        setAttrs([]);
      }
    }
  }, [open, product, initialBarcode]);

  // Global hardware barcode reader listener when popup is active
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;

      const now = performance.now();
      const buffer = scanBufferRef.current;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          let totalInterval = 0;
          for (let i = 1; i < buffer.length; i++) {
            totalInterval += buffer[i].time - buffer[i - 1].time;
          }
          const avgInterval = totalInterval / (buffer.length - 1);

          // Standard barcode guns emit characters in ultra-rapid succession (< 55ms)
          if (avgInterval <= 55) {
            e.preventDefault();
            e.stopPropagation();

            const scanned = buffer.map(b => b.char).join("").trim();
            scanBufferRef.current = [];

            if (scanned) {
              setBarcode(scanned);
              playScanSuccessSound();
              toast.success(
                lang === "bn"
                  ? `বারকোড যুক্ত হয়েছে: ${scanned}`
                  : `Barcode placed: ${scanned}`
              );

              // Clean up any other field that might have absorbed keystrokes before Enter
              const activeEl = document.activeElement as HTMLInputElement | null;
              if (activeEl && activeEl !== barcodeInputRef.current) {
                if (activeEl.value && activeEl.value.endsWith(scanned)) {
                  const cleaned = activeEl.value.slice(0, -scanned.length);
                  if (activeEl.placeholder?.includes(t("product_name") || "name")) {
                    setName(cleaned);
                  } else if (activeEl.placeholder?.includes(t("buy_price") || "buy")) {
                    setBuy(cleaned);
                  } else if (activeEl.placeholder?.includes(t("sell_price") || "sell")) {
                    setSellPrice(cleaned);
                  }
                }
              }

              if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
                barcodeInputRef.current.select();
              }
            }
            return;
          }
        }

        // If the barcode input was focused on Enter, do not submit dialog prematurely
        if (document.activeElement === barcodeInputRef.current) {
          e.preventDefault();
        }
        scanBufferRef.current = [];
        return;
      }

      if (e.key.length === 1) {
        if (buffer.length > 0) {
          const lastTime = buffer[buffer.length - 1].time;
          if (now - lastTime > 75) {
            scanBufferRef.current = [];
          }
        }
        scanBufferRef.current.push({ char: e.key, time: now });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      scanBufferRef.current = [];
    };
  }, [open, lang, t]);

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
    if (!user) {
      toast.error(lang === "bn" ? "অনুগ্রহ করে পুনরায় লগইন করুন" : "Please log in first");
      return;
    }
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
        name: name.trim(),
        image_url,
        buy_price: Number(buy) || 0,
        sell_price: Number(sellPrice) || 0,
        stock: Number(stock) || 0,
        min_stock: Number(minStock) ?? 5,
        category: category.trim(),
        barcode: barcode.trim() || null,
        attributes: attributesObj,
      };

      const tempId = product?.id || `prod_${Date.now()}`;
      const optimisticProduct: Product = {
        id: tempId,
        name: payload.name,
        image_url: payload.image_url,
        buy_price: payload.buy_price,
        sell_price: payload.sell_price,
        stock: payload.stock,
        min_stock: payload.min_stock,
        category: payload.category,
        barcode: payload.barcode,
        attributes: payload.attributes,
        archived: false,
        created_at: product?.created_at || new Date().toISOString(),
      };

      // 1. Instant Optimistic UI Update (zero perceived lag)
      setCachedData<Product[]>(qc, ["products"], (old = []) => {
        if (product) {
          return old.map(p => p.id === product.id ? { ...p, ...optimisticProduct } : p);
        }
        return [optimisticProduct, ...old];
      });

      toast.success(t("save"));
      onOpenChange(false);

      // 2. Perform write in background and refresh cache
      if (product) {
        updateProductFn({ data: { id: product.id, ...payload } })
          .then(() => refreshQueries(qc, ["products"]))
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : String(err));
            refreshQueries(qc, ["products"]);
          });
      } else {
        createProductFn({ data: payload })
          .then(() => refreshQueries(qc, ["products"]))
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : String(err));
            refreshQueries(qc, ["products"]);
          });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{product ? t("edit") : t("add_product")}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-5 cursor-pointer hover:bg-secondary/50 transition">
              <ImagePlus className="size-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : t("upload_image")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Field label={t("product_name")}><Input required placeholder={t("product_name")} value={name} onChange={e => setName(e.target.value)} /></Field>
            
            {/* Barcode & QR Code Field with Auto-Scan Support */}
            <Field label={lang === "bn" ? "বারকোড / QR কোড (ঐচ্ছিক)" : "Barcode / QR Code (Optional)"}>
              <div className="space-y-1">
                <div className="flex gap-1.5 items-center">
                  <div className="relative flex-1">
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      className="font-mono text-xs pr-8"
                      placeholder={lang === "bn" ? "বারকোড বা QR কোড লিখুন বা স্ক্যান করুন..." : "Enter or scan barcode..."}
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                    />
                    {barcode && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                        onClick={() => setBarcode("")}
                        title={lang === "bn" ? "মুছে ফেলুন" : "Clear"}
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {isMobile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 min-w-[44px] px-2.5 shrink-0 flex items-center justify-center cursor-pointer"
                      onClick={() => setScannerOpen(true)}
                      title={lang === "bn" ? "ক্যামেরা বারকোড স্ক্যানার" : "Camera Barcode Scanner"}
                      aria-label={lang === "bn" ? "বারকোড / QR কোড স্ক্যানার" : "Barcode / QR Code Scanner"}
                    >
                      <Scan className="size-4 text-primary" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                  <Zap className="size-3 animate-pulse shrink-0" />
                  <span>{lang === "bn" ? "বারকোড রিডার সক্রিয়: স্ক্যান করলে স্বয়ংক্রিয়ভাবে বসবে" : "Barcode Scanner Ready: Scan to auto-fill"}</span>
                </div>
              </div>
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
              <Field label={t("min_stock")}><Input type="number" step="1" inputMode="numeric" pattern="[0-9]*" placeholder="5" value={minStock} onChange={e => setMinStock(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-1">
              <Field label={t("stock")}><Input type="number" step="1" inputMode="numeric" pattern="[0-9]*" placeholder={t("stock")} value={stock} onChange={e => setStock(e.target.value)} /></Field>
            </div>

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
          setBarcode(code);
          playScanSuccessSound();
          toast.success(lang === "bn" ? `বারকোড যোগ করা হয়েছে: ${code}` : `Barcode set: ${code}`);
        }}
        title={lang === "bn" ? "পণ্য বারকোড স্ক্যান করুন" : "Scan Product Barcode"}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
