"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Save,
  Check,
  Trash2,
  Sliders,
  DollarSign,
  User,
  Store,
  Layers,
  RotateCcw,
  Eye,
  CheckCircle2,
  Copy,
} from "lucide-react";
import {
  getPosHardwareSettings,
  savePosHardwareSettings,
  saveCustomInvoiceTemplate,
  deleteCustomInvoiceTemplate,
  applyInvoiceTemplate,
  BUILTIN_INVOICE_TEMPLATES,
  DEFAULT_VISIBILITY_SETTINGS,
  DEFAULT_POLICY_NOTE,
  DEFAULT_POLICY_NOTE_EN,
  type InvoiceSavedTemplate,
  type PosHardwareSettings,
  type InvoiceVisibilitySettings,
} from "@/lib/pos-hardware";
import { printPwaInvoice } from "@/lib/invoice-printer";
import { toast } from "sonner";

export interface InvoiceTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopName?: string;
  lang?: string;
  onTemplateApplied?: (template: InvoiceSavedTemplate) => void;
}

export function InvoiceTemplateDialog({
  open,
  onOpenChange,
  shopName = "Urobili",
  lang = "bn",
  onTemplateApplied,
}: InvoiceTemplateDialogProps) {
  const isBn = lang === "bn";

  // System Hardware State
  const [hw, setHw] = useState<PosHardwareSettings>(getPosHardwareSettings());

  // Available Templates list
  const allTemplates = useMemo(() => {
    const customList = Array.isArray(hw.savedInvoiceTemplates)
      ? hw.savedInvoiceTemplates
      : BUILTIN_INVOICE_TEMPLATES;
    // ensure unique by id
    const map = new Map<string, InvoiceSavedTemplate>();
    BUILTIN_INVOICE_TEMPLATES.forEach((t) => map.set(t.id, t));
    customList.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [hw.savedInvoiceTemplates]);

  // Selected Working Template
  const [activeTplId, setActiveTplId] = useState<string>(() => {
    return hw.activeInvoiceTemplateId || BUILTIN_INVOICE_TEMPLATES[0].id;
  });

  // Editor State
  const [tplName, setTplName] = useState<string>("");
  const [paperWidthMm, setPaperWidthMm] = useState<number>(80);
  const [fontSizePt, setFontSizePt] = useState<number>(6.5);
  const [titleFontSizePt, setTitleFontSizePt] = useState<number>(8.8);
  const [printLanguage, setPrintLanguage] = useState<"bn" | "en">("bn");
  const [showCurrencySymbol, setShowCurrencySymbol] = useState<boolean>(false);
  const [currencySymbol, setCurrencySymbol] = useState<string>("");
  const [customCashierName, setCustomCashierName] = useState<string>("ক্যাশিয়ার");
  const [customHeaderTitle, setCustomHeaderTitle] = useState<string>("");
  const [customSubtitle, setCustomSubtitle] = useState<string>("");
  const [customAddress, setCustomAddress] = useState<string>("");
  const [customPhone, setCustomPhone] = useState<string>("");
  const [customFooterNote, setCustomFooterNote] = useState<string>("");
  const [customPolicyNote, setCustomPolicyNote] = useState<string>("");
  const [tableStyle, setTableStyle] = useState<"compact" | "bordered" | "clean" | "minimal">("compact");
  const [visibility, setVisibility] = useState<InvoiceVisibilitySettings>(DEFAULT_VISIBILITY_SETTINGS);

  // Sync state when dialog opens or active template changes
  const loadTemplateIntoForm = (tpl: InvoiceSavedTemplate) => {
    setActiveTplId(tpl.id);
    setTplName(tpl.name || "");
    setPaperWidthMm(tpl.paperWidthMm || 80);
    setFontSizePt(tpl.fontSizePt || 6.5);
    setTitleFontSizePt(tpl.titleFontSizePt || 8.8);
    setPrintLanguage(tpl.printLanguage || "bn");
    setShowCurrencySymbol(Boolean(tpl.showCurrencySymbol));
    setCurrencySymbol(tpl.currencySymbol || "");
    setCustomCashierName(tpl.customCashierName || hw.customCashierName || "ক্যাশিয়ার");
    setCustomHeaderTitle(tpl.customHeaderTitle || "");
    setCustomSubtitle(tpl.customSubtitle || "");
    setCustomAddress(tpl.customAddress || "");
    setCustomPhone(tpl.customPhone || "");
    setCustomFooterNote(tpl.customFooterNote || "");
    setCustomPolicyNote(tpl.customPolicyNote !== undefined ? tpl.customPolicyNote : DEFAULT_POLICY_NOTE);
    setTableStyle(tpl.tableStyle || "compact");
    setVisibility({
      ...DEFAULT_VISIBILITY_SETTINGS,
      ...(tpl.visibility || {}),
    });
  };

  useEffect(() => {
    if (open) {
      const currentHw = getPosHardwareSettings();
      setHw(currentHw);
      const targetId = currentHw.activeInvoiceTemplateId || BUILTIN_INVOICE_TEMPLATES[0].id;
      const tpl =
        (currentHw.savedInvoiceTemplates || []).find((t) => t.id === targetId) ||
        BUILTIN_INVOICE_TEMPLATES.find((t) => t.id === targetId) ||
        BUILTIN_INVOICE_TEMPLATES[0];
      loadTemplateIntoForm(tpl);
    }
  }, [open]);

  // Construct current working template object
  const currentWorkingTemplate: InvoiceSavedTemplate = useMemo(() => {
    return {
      id: activeTplId,
      name: tplName || "Custom Template",
      paperWidthMm,
      fontSizePt,
      titleFontSizePt,
      printLanguage,
      showCurrencySymbol,
      currencySymbol,
      customCashierName,
      customHeaderTitle: customHeaderTitle.trim() || undefined,
      customSubtitle: customSubtitle.trim() || undefined,
      customAddress: customAddress.trim() || undefined,
      customPhone: customPhone.trim() || undefined,
      customFooterNote: customFooterNote.trim() || undefined,
      customPolicyNote: customPolicyNote !== undefined ? customPolicyNote : undefined,
      visibility,
      customLines: hw.customLines || [],
      tableStyle,
      updatedAt: new Date().toISOString(),
    };
  }, [
    activeTplId,
    tplName,
    paperWidthMm,
    fontSizePt,
    titleFontSizePt,
    printLanguage,
    showCurrencySymbol,
    currencySymbol,
    customCashierName,
    customHeaderTitle,
    customSubtitle,
    customAddress,
    customPhone,
    customFooterNote,
    customPolicyNote,
    visibility,
    hw.customLines,
    tableStyle,
  ]);

  // Save as new template (unlimited templates)
  const handleSaveAsNew = () => {
    const defaultName = `${isBn ? "কাস্টম ইনভয়েস" : "Custom Invoice"} ${paperWidthMm}mm (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
    const name = prompt(
      isBn ? "নতুন ইনভয়েস টেমপ্লেটের নাম দিন:" : "Enter name for new invoice template:",
      tplName.trim() || defaultName
    );
    if (!name || !name.trim()) return;

    const newId = `inv_cust_${Date.now()}`;
    const newTpl: InvoiceSavedTemplate = {
      ...currentWorkingTemplate,
      id: newId,
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    };

    const updatedHw = saveCustomInvoiceTemplate(newTpl);
    setHw(updatedHw);
    setActiveTplId(newId);
    setTplName(name.trim());
    toast.success(isBn ? `টেমপ্লেট "${name}" সফলভাবে সংরক্ষিত হয়েছে!` : `Template "${name}" saved successfully!`);
  };

  // Overwrite existing template
  const handleUpdateCurrent = () => {
    const isBuiltin = BUILTIN_INVOICE_TEMPLATES.some((b) => b.id === activeTplId);
    if (isBuiltin) {
      // Save as new custom copy if trying to edit builtin
      handleSaveAsNew();
      return;
    }
    const updatedHw = saveCustomInvoiceTemplate(currentWorkingTemplate);
    setHw(updatedHw);
    toast.success(isBn ? "টেমপ্লেট আপডেট করা হয়েছে!" : "Template updated successfully!");
  };

  // Delete custom template
  const handleDeleteTemplate = (id: string, name: string) => {
    const isBuiltin = BUILTIN_INVOICE_TEMPLATES.some((b) => b.id === id);
    if (isBuiltin) {
      toast.error(isBn ? "বিল্ট-ইন টেমপ্লেট মুছে ফেলা যাবে না" : "Cannot delete built-in template");
      return;
    }
    if (!confirm(isBn ? `"${name}" টেমপ্লেটটি মুছে ফেলতে চান?` : `Delete template "${name}"?`)) return;

    const updatedHw = deleteCustomInvoiceTemplate(id);
    setHw(updatedHw);
    const fallback = BUILTIN_INVOICE_TEMPLATES[0];
    loadTemplateIntoForm(fallback);
    toast.success(isBn ? "টেমপ্লেট মুছে ফেলা হয়েছে" : "Template deleted");
  };

  // Set as Active System Template
  const handleApplyTemplate = () => {
    const updatedHw = applyInvoiceTemplate(currentWorkingTemplate);
    setHw(updatedHw);
    if (onTemplateApplied) {
      onTemplateApplied(currentWorkingTemplate);
    }
    toast.success(
      isBn
        ? "এই টেমপ্লেটটি ডিফল্ট ইনভয়েস হিসেবে সক্রিয় করা হয়েছে!"
        : "Template activated as default invoice!"
    );
    onOpenChange(false);
  };

  // Print Test Invoice
  const handlePrintTest = async () => {
    try {
      await printPwaInvoice({
        businessName: customHeaderTitle || shopName,
        shopAddress: customAddress || "Mirpur-10, Dhaka-1216",
        shopPhoneNumbers: customPhone || "01700-000000",
        tagline: customSubtitle || "Quality Fashion & Lifestyle",
        invoiceNo: "INV-TEST-001",
        invoiceDate: new Date().toLocaleString("en-GB", { hour12: true }),
        cashierName: customCashierName,
        customerName: isBn ? "নগদ ক্রেতা" : "Walk-in Customer",
        customerPhone: "01800-000000",
        items: [
          {
            product: { id: "p1", name: "Classic Cotton Premium Shirt" },
            qty: 2,
            sellPrice: 1250,
          },
          {
            product: { id: "p2", name: "Slim Fit Denim Jeans Pant" },
            qty: 1,
            sellPrice: 1850,
          },
        ],
        subtotal: 4350,
        discountAmount: 350,
        total: 4000,
        paidAmount: 4000,
        due: 0,
        paymentMode: "CASH",
        terms: customFooterNote || (isBn ? "আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!" : "Thank you for shopping with us!"),
      });
      toast.success(isBn ? "টেস্ট ইনভয়েস প্রিন্ট সফল!" : "Test invoice printed!");
    } catch (err: any) {
      toast.error(err?.message || (isBn ? "প্রিন্ট ত্রুটি" : "Print error"));
    }
  };

  // Sample Items for Live Preview
  const sampleItems = [
    { name: "Classic Cotton Premium Shirt", qty: 2, price: 1250, total: 2500 },
    { name: "Slim Fit Denim Jeans Pant", qty: 1, price: 1850, total: 1850 },
  ];
  const sampleSubtotal = 4350;
  const sampleDiscount = 350;
  const sampleTotal = 4000;
  const samplePaid = 4000;

  // Currency string formatted
  const curPrefix = showCurrencySymbol ? (currencySymbol ? `${currencySymbol} ` : "৳ ") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[98vw] max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Top Header Toolbar */}
        <div className="px-4 py-3 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                  {isBn ? "ইনভয়েস টেমপ্লেট জেনারেটর" : "Invoice Template Studio"}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/30 font-bold">
                  {paperWidthMm}mm • {tableStyle.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn
                  ? "ক্যাশিয়ার নাম, টাকা চিহ্ন ছাড়া মূল্য ও কাস্টম টেমপ্লেট সেভ এবং ডিজাইন করুন"
                  : "Customize cashier name, remove taka sign, layout & save unlimited custom invoice templates"}
              </DialogDescription>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintTest}
              className="h-8.5 text-xs font-bold gap-1.5 cursor-pointer border-border"
            >
              <Printer className="size-3.5 text-indigo-500" />
              <span>{isBn ? "টেস্ট প্রিন্ট" : "Test Print"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveAsNew}
              className="h-8.5 text-xs font-bold gap-1.5 cursor-pointer bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
            >
              <Save className="size-3.5" />
              <span>{isBn ? "নতুন সেভ করুন" : "Save as New"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleApplyTemplate}
              className="h-8.5 px-4 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
            >
              <Check className="size-3.5" />
              <span>{isBn ? "ডিফল্ট হিসেবে ব্যবহার করুন" : "Apply as Default"}</span>
            </Button>
          </div>
        </div>

        {/* Template Selector Bar */}
        <div className="px-4 py-2 bg-muted/40 border-b border-border/80 flex items-center justify-between gap-3 text-xs overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground whitespace-nowrap">
              {isBn ? "টেমপ্লেট নির্বাচন:" : "Select Template:"}
            </span>
            <select
              value={activeTplId}
              onChange={(e) => {
                const found = allTemplates.find((t) => t.id === e.target.value);
                if (found) loadTemplateIntoForm(found);
              }}
              className="h-8 rounded-lg bg-background border border-border px-2 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <optgroup label={isBn ? "বিল্ট-ইন টেমপ্লেট" : "Built-in Templates"}>
                {BUILTIN_INVOICE_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
              {allTemplates.filter((t) => !t.id.startsWith("inv_tpl_")).length > 0 && (
                <optgroup label={isBn ? "কাস্টম সংরক্ষিত টেমপ্লেট" : "Your Custom Templates"}>
                  {allTemplates
                    .filter((t) => !t.id.startsWith("inv_tpl_"))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.paperWidthMm}mm)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {!activeTplId.startsWith("inv_tpl_") && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUpdateCurrent}
                  className="h-7 text-xs font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  <Save className="size-3 mr-1" />
                  {isBn ? "আপডেট" : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTemplate(activeTplId, tplName)}
                  className="h-7 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="size-3 mr-1" />
                  {isBn ? "ডিলিট" : "Delete"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content: Split Grid (Left Controls, Right Live Preview) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Controls Pane (7 cols) */}
          <div className="lg:col-span-7 border-r border-border h-full overflow-y-auto p-4 space-y-4">
            <Tabs defaultValue="cashier" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-9 p-1 bg-muted/60">
                <TabsTrigger value="cashier" className="text-xs font-bold flex items-center gap-1">
                  <User className="size-3" />
                  <span className="truncate">{isBn ? "ক্যাশিয়ার ও মুদ্রা" : "Cashier & Currency"}</span>
                </TabsTrigger>
                <TabsTrigger value="paper" className="text-xs font-bold flex items-center gap-1">
                  <Sliders className="size-3" />
                  <span className="truncate">{isBn ? "সাইজ ও ফন্ট" : "Paper & Font"}</span>
                </TabsTrigger>
                <TabsTrigger value="header" className="text-xs font-bold flex items-center gap-1">
                  <Store className="size-3" />
                  <span className="truncate">{isBn ? "দোকান ও হেডার" : "Branding"}</span>
                </TabsTrigger>
                <TabsTrigger value="visibility" className="text-xs font-bold flex items-center gap-1">
                  <Layers className="size-3" />
                  <span className="truncate">{isBn ? "ব্লক ও নীতিমালা" : "Sections"}</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Cashier & Currency */}
              <TabsContent value="cashier" className="space-y-4 pt-3">
                {/* Cashier Name Customization Card */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                    <User className="size-4 text-indigo-500" />
                    <span>{isBn ? "কাস্টম ক্যাশিয়ার নাম (Custom Cashier Name)" : "Custom Cashier Name"}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {isBn
                      ? "ইনভয়েসে প্রিন্ট হওয়া ক্যাশিয়ার বা অপারেটরের নাম নির্ধারণ করুন (যেমন: ক্যাশিয়ার: আরিফ বা Counter 1)"
                      : "Define the cashier or operator name displayed on all printed and generated invoices"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{isBn ? "ক্যাশিয়ার নাম" : "Cashier Name"}</Label>
                      <Input
                        value={customCashierName}
                        onChange={(e) => setCustomCashierName(e.target.value)}
                        placeholder={isBn ? "যেমন: ক্যাশিয়ার: মোঃ সুমন" : "e.g. Cashier: Arif or Counter 1"}
                        className="h-8.5 text-xs font-medium"
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60 mt-auto">
                      <div>
                        <div className="text-xs font-bold">{isBn ? "রসিদে ক্যাশিয়ার নাম দেখান" : "Show Cashier on Receipt"}</div>
                        <div className="text-[10px] text-muted-foreground">{isBn ? "বিল মেটা সেকশনে দেখাবে" : "In bill meta section"}</div>
                      </div>
                      <Switch
                        checked={visibility.showCashierName !== false && visibility.showCashier !== false}
                        onCheckedChange={(val) =>
                          setVisibility((prev) => ({
                            ...prev,
                            showCashier: val,
                            showCashierName: val,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Currency & Taka Sign Settings Card */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                      <DollarSign className="size-4 text-emerald-500" />
                      <span>{isBn ? "মূল্যে টাকা (৳) চিহ্ন সেটিংস" : "Price Currency & Taka Symbol"}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold ${!showCurrencySymbol ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : ""}`}>
                      {!showCurrencySymbol ? (isBn ? "টাকা চিহ্ন বন্ধ (ক্লিন সংখ্যা)" : "No Symbol (Clean Numbers)") : (isBn ? "চিহ্ন সক্রিয়" : "Symbol Active")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {isBn
                      ? "মূল্যের আগে '৳' চিহ্ন না রাখতে চাইলে নিচের সুইচটি বন্ধ রাখুন। তখন সংখ্যা সরাসরি দেখাবে (যেমন: 1,200)"
                      : "Turn off to remove the '৳' sign so prices display as pure clean numbers (e.g. 1,200)"}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
                      <div>
                        <div className="text-xs font-bold">{isBn ? "টাকা / মুদ্রা চিহ্ন দেখাবেন?" : "Show Currency Symbol"}</div>
                        <div className="text-[10px] text-muted-foreground">{isBn ? "ডিফল্ট: বন্ধ (টাকা ছাড়া)" : "Default: OFF (No Taka sign)"}</div>
                      </div>
                      <Switch
                        checked={showCurrencySymbol}
                        onCheckedChange={setShowCurrencySymbol}
                      />
                    </div>

                    {showCurrencySymbol && (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">{isBn ? "কাস্টম কারেন্সি চিহ্ন (চিহ্ন চাইলে)" : "Custom Symbol"}</Label>
                        <Input
                          value={currencySymbol}
                          onChange={(e) => setCurrencySymbol(e.target.value)}
                          placeholder="৳ বা BDT বা $"
                          className="h-8.5 text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Template Name & Save Info */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <Label className="text-xs font-bold">{isBn ? "টেমপ্লেটের নাম" : "Template Name"}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder={isBn ? "যেমন: Modern 80mm Clean Invoice" : "e.g. 80mm Clean Retail"}
                      className="h-8.5 text-xs font-medium"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveAsNew}
                      className="h-8.5 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer"
                    >
                      <Save className="size-3.5" />
                      <span>{isBn ? "সেভ" : "Save"}</span>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: Paper & Font */}
              <TabsContent value="paper" className="space-y-4 pt-3">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <div className="text-xs font-bold text-foreground">{isBn ? "কাগজের মাপ (Paper Width)" : "Paper Width"}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { width: 80, label: "80mm Thermal (স্ট্যান্ডার্ড)" },
                      { width: 58, label: "58mm Thermal (মিনি)" },
                      { width: 76, label: "76mm Thermal" },
                      { width: 210, label: "A4 Retail (২১০ মিমি)" },
                    ].map((opt) => (
                      <button
                        key={opt.width}
                        type="button"
                        onClick={() => setPaperWidthMm(opt.width)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          paperWidthMm === opt.width
                            ? "bg-indigo-600/15 border-indigo-500 text-indigo-600 dark:text-indigo-300 font-bold"
                            : "bg-muted/40 border-border/80 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.width}mm</div>
                        <div className="text-[10px] mt-0.5">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <div className="text-xs font-bold text-foreground">{isBn ? "ফন্ট সাইজ ও টাইপোগ্রাফি (Typography)" : "Typography"}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <Label className="text-[11px]">{isBn ? "সাধারণ টেক্সট সাইজ (pt)" : "Base Font Pt"}</Label>
                        <span className="font-mono font-bold text-indigo-500">{fontSizePt} pt</span>
                      </div>
                      <input
                        type="range"
                        min={5.0}
                        max={12.0}
                        step={0.5}
                        value={fontSizePt}
                        onChange={(e) => setFontSizePt(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <Label className="text-[11px]">{isBn ? "শিরোনাম টেক্সট সাইজ (pt)" : "Title Font Pt"}</Label>
                        <span className="font-mono font-bold text-indigo-500">{titleFontSizePt} pt</span>
                      </div>
                      <input
                        type="range"
                        min={7.0}
                        max={16.0}
                        step={0.5}
                        value={titleFontSizePt}
                        onChange={(e) => setTitleFontSizePt(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{isBn ? "প্রিন্ট ভাষা" : "Print Language"}</Label>
                      <select
                        value={printLanguage}
                        onChange={(e) => setPrintLanguage(e.target.value as any)}
                        className="w-full h-8.5 rounded-lg bg-background border border-border px-2 text-xs font-medium"
                      >
                        <option value="bn">বাংলা (Bengali)</option>
                        <option value="en">English (ইংরেজি)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{isBn ? "টেবিল ডিজাইন স্টাইল" : "Table Style"}</Label>
                      <select
                        value={tableStyle}
                        onChange={(e) => setTableStyle(e.target.value as any)}
                        className="w-full h-8.5 rounded-lg bg-background border border-border px-2 text-xs font-medium"
                      >
                        <option value="compact">Compact (কমপ্যাক্ট থার্মাল)</option>
                        <option value="bordered">Bordered (বর্ডার সহ)</option>
                        <option value="clean">Clean (টাকা চিহ্ন ছাড়া ফ্রেশ)</option>
                        <option value="minimal">Minimal (মিনিমালিস্ট)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: Branding & Shop Header */}
              <TabsContent value="header" className="space-y-4 pt-3">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <div className="text-xs font-bold text-foreground">{isBn ? "দোকান ও ব্র্যান্ড হেডার" : "Store & Header Overrides"}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{isBn ? "দোকানের নাম (Header Title)" : "Shop Name"}</Label>
                      <Input
                        value={customHeaderTitle}
                        onChange={(e) => setCustomHeaderTitle(e.target.value)}
                        placeholder={shopName || "UROBILI"}
                        className="h-8.5 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{isBn ? "ট্যাগলাইন / সাবটাইটেল" : "Tagline"}</Label>
                      <Input
                        value={customSubtitle}
                        onChange={(e) => setCustomSubtitle(e.target.value)}
                        placeholder="Premium Fashion & Lifestyle"
                        className="h-8.5 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{isBn ? "ঠিকানা (Address)" : "Address"}</Label>
                      <Input
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="মিরপুর-১০, ঢাকা-১২১৬"
                        className="h-8.5 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">{isBn ? "মোবাইল নম্বর (Phone)" : "Phone"}</Label>
                      <Input
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="01700-000000"
                        className="h-8.5 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: Sections & Policy */}
              <TabsContent value="visibility" className="space-y-4 pt-3">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <div className="text-xs font-bold text-foreground mb-1">{isBn ? "ইনভয়েসের লাইন ও সেকশন টগল" : "Section Toggles"}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { key: "showShopName", labelBn: "দোকানের নাম", labelEn: "Shop Name" },
                      { key: "showTagline", labelBn: "ট্যাগলাইন", labelEn: "Tagline" },
                      { key: "showShopAddress", labelBn: "ঠিকানা", labelEn: "Address" },
                      { key: "showShopPhone", labelBn: "ফোন নম্বর", labelEn: "Phone" },
                      { key: "showInvoiceNo", labelBn: "বিল / ইনভয়েস নং", labelEn: "Invoice No" },
                      { key: "showDateTime", labelBn: "তারিখ ও সময়", labelEn: "Date & Time" },
                      { key: "showCustomer", labelBn: "ক্রেতার তথ্য", labelEn: "Customer" },
                      { key: "showCashierName", labelBn: "ক্যাশিয়ার নাম", labelEn: "Cashier" },
                      { key: "showDiscount", labelBn: "ছাড় / Discount", labelEn: "Discount" },
                      { key: "showSubtotal", labelBn: "মোট / Subtotal", labelEn: "Subtotal" },
                      { key: "showTotal", labelBn: "সর্বমোট / Total", labelEn: "Total" },
                      { key: "showPaid", labelBn: "জমা / Paid", labelEn: "Paid" },
                      { key: "showDue", labelBn: "বকেয়া / Due", labelEn: "Due" },
                      { key: "showChangeReturn", labelBn: "ফেরত / Change", labelEn: "Change" },
                      { key: "showPolicyNote", labelBn: "এক্সচেঞ্জ নীতিমালা", labelEn: "Policy Note" },
                      { key: "showTerms", labelBn: "থ্যাঙ্ক ইউ নোট", labelEn: "Footer Note" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <Switch
                          checked={(visibility as any)[item.key] !== false}
                          onCheckedChange={(checked) =>
                            setVisibility((prev) => ({
                              ...prev,
                              [item.key]: checked,
                            }))
                          }
                        />
                        <span className="text-[11px] font-medium truncate">
                          {isBn ? item.labelBn : item.labelEn}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer Notes & Policy Text */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">{isBn ? "ধন্যবাদ বা ফুটার নোট" : "Footer Thank You Note"}</Label>
                    <Input
                      value={customFooterNote}
                      onChange={(e) => setCustomFooterNote(e.target.value)}
                      placeholder={isBn ? "আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!" : "Thank you for shopping with us!"}
                      className="h-8.5 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">{isBn ? "এক্সচেঞ্জ / পণ্য পরিবর্তন নীতিমালা (সবার নিচে)" : "Return & Exchange Policy"}</Label>
                    <Textarea
                      rows={2}
                      value={customPolicyNote}
                      onChange={(e) => setCustomPolicyNote(e.target.value)}
                      placeholder={DEFAULT_POLICY_NOTE}
                      className="text-xs font-medium"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Live Preview Pane (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-950 p-4 flex flex-col items-center justify-start overflow-y-auto">
            <div className="text-[11px] font-bold text-zinc-400 mb-2 flex items-center gap-1.5">
              <Eye className="size-3.5 text-indigo-400" />
              <span>{isBn ? "রিয়েল-টাইম লাইভ ইনভয়েস প্রিভিউ" : "Real-Time Invoice Live Preview"}</span>
              <span className="text-[10px] text-zinc-500 font-mono">({paperWidthMm}mm)</span>
            </div>

            {/* Simulated Thermal Paper Sheet */}
            <div
              style={{
                width: paperWidthMm === 58 ? "260px" : paperWidthMm === 210 ? "100%" : "320px",
                maxWidth: "100%",
                fontSize: `${fontSizePt}pt`,
              }}
              className="bg-white text-black p-4 rounded-xl shadow-2xl font-sans transition-all select-none space-y-2 border border-zinc-200"
            >
              {/* Header */}
              {visibility.showShopName !== false && (
                <div className="text-center">
                  <div
                    style={{ fontSize: `${titleFontSizePt}pt` }}
                    className="font-extrabold uppercase tracking-wide leading-tight text-black"
                  >
                    {customHeaderTitle || shopName}
                  </div>
                  {visibility.showTagline !== false && (customSubtitle || "Quality Fashion & Lifestyle") && (
                    <div className="text-[9.5px] font-semibold text-zinc-700 mt-0.5">
                      {customSubtitle || "Quality Fashion & Lifestyle"}
                    </div>
                  )}
                  {visibility.showShopAddress !== false && (
                    <div className="text-[9px] font-medium text-zinc-600 mt-0.5">
                      {customAddress || "মিরপুর-১০, ঢাকা-১২১৬"}
                    </div>
                  )}
                  {visibility.showShopPhone !== false && (
                    <div className="text-[9.5px] font-mono font-bold text-zinc-800 mt-0.5">
                      {printLanguage === "en" ? "Mobile:" : "মোবাইল:"} {customPhone || "01700-000000"}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-dashed border-black my-1" />

              {/* Meta & Cashier */}
              <div className="space-y-0.5 text-zinc-900 leading-tight">
                {visibility.showInvoiceNo !== false && (
                  <div className="flex justify-between items-center font-mono font-bold">
                    <span>{printLanguage === "en" ? "Bill: #001234" : "বিল: #০০১২৩৪"}</span>
                    <span className="text-[9px] font-normal">
                      {new Date().toLocaleDateString("en-GB")}
                    </span>
                  </div>
                )}
                {visibility.showCustomer !== false && (
                  <div className="flex justify-between text-[10px]">
                    <span>
                      {printLanguage === "en" ? "Customer:" : "ক্রেতা:"}{" "}
                      <strong>{printLanguage === "en" ? "Walk-in Customer" : "নগদ ক্রেতা"}</strong>
                    </span>
                    <span className="font-mono">01800-000000</span>
                  </div>
                )}
                {visibility.showCashierName !== false && customCashierName && (
                  <div className="text-[10px] text-zinc-700 font-semibold pt-0.5">
                    {printLanguage === "en" ? "Cashier:" : "ক্যাশিয়ার:"}{" "}
                    <strong className="text-black">{customCashierName}</strong>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-black my-1" />

              {/* Items Table */}
              <table className="w-full text-left border-collapse">
                {visibility.showItemsHeader !== false && (
                  <thead>
                    <tr className="border-b border-dashed border-black text-[9.5px]">
                      <th className="py-0.5 text-left font-bold">{printLanguage === "en" ? "Item" : "পণ্য"}</th>
                      <th className="py-0.5 text-center font-bold w-10">{printLanguage === "en" ? "Qty" : "পরি."}</th>
                      <th className="py-0.5 text-right font-bold w-16">{printLanguage === "en" ? "Amount" : "টাকা"}</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  {sampleItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-dotted border-zinc-300">
                      <td className="py-1 font-semibold leading-tight text-black">{item.name}</td>
                      <td className="py-1 text-center font-mono">{item.qty}</td>
                      <td className="py-1 text-right font-mono font-bold whitespace-nowrap">
                        {curPrefix}
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-black my-1" />

              {/* Totals */}
              <div className="space-y-0.5 font-medium leading-tight">
                {visibility.showSubtotal !== false && (
                  <div className="flex justify-between text-zinc-700">
                    <span>{printLanguage === "en" ? "Subtotal:" : "মোট:"}</span>
                    <span className="font-mono">
                      {curPrefix}
                      {sampleSubtotal.toLocaleString()}
                    </span>
                  </div>
                )}
                {visibility.showDiscount !== false && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>{printLanguage === "en" ? "Discount:" : "ছাড়:"}</span>
                    <span className="font-mono">
                      -{curPrefix}
                      {sampleDiscount.toLocaleString()}
                    </span>
                  </div>
                )}
                {visibility.showTotal !== false && (
                  <div className="border-t border-dashed border-black py-0.5 my-0.5 flex justify-between font-black text-sm">
                    <span>{printLanguage === "en" ? "Total:" : "সর্বমোট:"}</span>
                    <span className="font-mono font-bold">
                      {curPrefix}
                      {sampleTotal.toLocaleString()}
                    </span>
                  </div>
                )}
                {visibility.showPaid !== false && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>{printLanguage === "en" ? "Paid:" : "জমা:"}</span>
                    <span className="font-mono">
                      {curPrefix}
                      {samplePaid.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer Terms & Policy */}
              {(visibility.showTerms !== false || visibility.showPolicyNote !== false) && (
                <>
                  <div className="border-t border-dashed border-black my-1" />
                  <div className="text-center space-y-1 pt-0.5 text-zinc-700">
                    {visibility.showTerms !== false && (
                      <div className="text-[9.5px] font-semibold">
                        {customFooterNote ||
                          (printLanguage === "en"
                            ? "Thank you for shopping with us!"
                            : "আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!")}
                      </div>
                    )}
                    {visibility.showPolicyNote !== false && (
                      <div className="text-[8.5px] text-zinc-600 italic">
                        {customPolicyNote ||
                          (printLanguage === "en" ? DEFAULT_POLICY_NOTE_EN : DEFAULT_POLICY_NOTE)}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
