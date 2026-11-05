"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, AlertCircle, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import { executeDirectSilentPrint } from "@/lib/pos-print";
import { toast } from "sonner";

interface PrinterItem {
  name: string;
  isDefault?: boolean;
  status?: number;
}

export function PosHardwareSettings({ lang = "en" }: { lang?: "en" | "bn" }) {
  const [loading, setLoading] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);
  const [status, setStatus] = useState<{
    isConnected: boolean;
    isElectron: boolean;
    defaultPrinter?: string;
    printers: PrinterItem[];
  }>({
    isConnected: false,
    isElectron: false,
    printers: [],
  });

  const checkHardware = async () => {
    setLoading(true);
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // 1. Check Electron Native Desktop App
    const electronPOS = (window as any).electronPOS;
    if (electronPOS) {
      try {
        const def = await electronPOS.getDefaultPrinter();
        const list = await electronPOS.getPrinters();
        setStatus({
          isConnected: true,
          isElectron: true,
          defaultPrinter: def?.name || "System Default",
          printers: list || [],
        });
        setLoading(false);
        return;
      } catch (err) {
        console.warn("[POS Hardware] Electron check error:", err);
      }
    }

    // 2. Check Local Windows POS Bridge on 127.0.0.1:9123
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 1200);
      const res = await fetch("http://127.0.0.1:9123/printers", { signal: controller.signal });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        setStatus({
          isConnected: true,
          isElectron: false,
          defaultPrinter: data.defaultPrinter?.name || "System Default",
          printers: data.printers || [],
        });
        setLoading(false);
        return;
      }
    } catch (_) {}

    // 3. Browser mode (no direct silent printer connection yet)
    setStatus({
      isConnected: false,
      isElectron: false,
      printers: [],
    });
    setLoading(false);
  };

  useEffect(() => {
    checkHardware();
  }, []);

  const handleTestSilentPrint = async () => {
    setTestingPrint(true);
    const testReceiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 8px 0;
            color: #000;
            font-size: 12px;
            text-align: center;
          }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="title">DREAM FASHION POS</div>
        <div>1-CLICK SILENT PRINT TEST</div>
        <div class="divider"></div>
        <div class="row"><span>Printer:</span><span>${status.defaultPrinter || "Default"}</span></div>
        <div class="row"><span>Status:</span><span>READY (SILENT OK)</span></div>
        <div class="row"><span>Timestamp:</span><span>${new Date().toLocaleTimeString()}</span></div>
        <div class="divider"></div>
        <div style="font-size: 10px; margin-top: 6px;">Zero print preview dialog! Real POS hardware ready.</div>
      </body>
      </html>
    `;

    try {
      const success = await executeDirectSilentPrint(testReceiptHtml, status.defaultPrinter);
      if (success) {
        toast.success(
          lang === "bn"
            ? `টেস্ট রসিদ সফলভাবে প্রিন্টারে পাঠানো হয়েছে (${status.defaultPrinter || "Default"})`
            : `Test receipt printed silently to: ${status.defaultPrinter || "Default"}`
        );
      } else {
        toast.info(
          lang === "bn"
            ? "সাইলেন্ট প্রিন্টার ব্রিজ এখনও শুরু হয়নি। Windows POS অ্যাপটি চালু করুন।"
            : "Silent printing bridge not running. Launch the Windows POS app to enable 1-click silent printing."
        );
      }
    } catch (e: any) {
      toast.error(`Print error: ${e.message}`);
    } finally {
      setTestingPrint(false);
    }
  };

  const handleTestCashDrawer = async () => {
    setTestingDrawer(true);
    try {
      const electronPOS = (window as any).electronPOS;
      if (electronPOS?.openCashDrawer) {
        await electronPOS.openCashDrawer(status.defaultPrinter);
        toast.success(lang === "bn" ? "ক্যাশ ড্রয়ার সিগন্যাল পাঠানো হয়েছে!" : "Cash drawer kick pulse sent!");
      } else {
        // Try local bridge
        const res = await fetch("http://127.0.0.1:9123/open-drawer", { method: "POST" });
        if (res.ok) {
          toast.success(lang === "bn" ? "ক্যাশ ড্রয়ার সিগন্যাল পাঠানো হয়েছে!" : "Cash drawer kick pulse sent!");
        } else {
          toast.info("Cash drawer control requires DreamFashion Windows POS terminal.");
        }
      }
    } catch (_) {
      toast.info("Cash drawer control requires DreamFashion Windows POS terminal.");
    } finally {
      setTestingDrawer(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5 text-primary">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Zap className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              {lang === "bn" ? "রিয়েল উইন্ডোজ পিওএস এবং সাইলেন্ট প্রিন্টিং" : "Windows POS & 1-Click Silent Printing"}
              {status.isConnected ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px] gap-1">
                  <CheckCircle2 className="size-3" />
                  {status.isElectron ? "Desktop POS App Active" : "Bridge Connected"}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px] gap-1">
                  <AlertCircle className="size-3" />
                  Browser Mode
                </Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "কোনো প্রিভিউ উইন্ডো ছাড়া ১-ক্লিকে সরাসরি ডিফল্ট থার্মাল প্রিন্টারে প্রিন্ট"
                : "Instant thermal receipt printing directly to default printer with ZERO dialog popup"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkHardware}
          disabled={loading}
          className="rounded-xl h-8 text-xs gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          {lang === "bn" ? "রিফ্রেশ করুন" : "Refresh Status"}
        </Button>
      </div>

      {/* Hardware Status Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {lang === "bn" ? "ডিফল্ট প্রিন্টার" : "Default Thermal Printer"}
          </div>
          <div className="text-sm font-bold text-foreground flex items-center gap-2">
            <Printer className="size-4 text-primary" />
            <span className="truncate">{status.defaultPrinter || (status.isConnected ? "None detected" : "Auto-detected on print")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {status.isConnected
              ? "All receipts will print to this printer automatically without popup"
              : "Run DreamFashion-POS.bat on your Windows PC to activate direct silent printing"}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {lang === "bn" ? "পিওএস টার্মিনাল মোড" : "POS Terminal Mode"}
          </div>
          <div className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>{status.isElectron ? "Native Windows App (High-Speed)" : status.isConnected ? "Browser + POS Bridge" : "Standard Web"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Hardware barcode guns & cash drawer supported
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button
          type="button"
          onClick={handleTestSilentPrint}
          disabled={testingPrint}
          className="rounded-xl h-9 text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Printer className={`size-3.5 ${testingPrint ? "animate-pulse" : ""}`} />
          {lang === "bn" ? "১-ক্লিক টেস্ট প্রিন্ট করুন" : "Test 1-Click Silent Print"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleTestCashDrawer}
          disabled={testingDrawer}
          className="rounded-xl h-9 text-xs font-semibold gap-2"
        >
          <Zap className="size-3.5 text-amber-500" />
          {lang === "bn" ? "ক্যাশ ড্রয়ার টেস্ট" : "Test Cash Drawer Kick"}
        </Button>
      </div>
    </Card>
  );
}
