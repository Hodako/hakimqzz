import type { Product } from "@/lib/queries";

export type ReceiptPrintMode = "manual" | "automatic";

export type InvoiceSectionId =
  | "header"
  | "meta"
  | "customer"
  | "before_items"
  | "items"
  | "after_items"
  | "totals"
  | "footer";

export const DEFAULT_INVOICE_SECTION_ORDER: InvoiceSectionId[] = [
  "header",
  "meta",
  "before_items",
  "items",
  "after_items",
  "totals",
  "footer",
];

export interface CustomInvoiceLine {
  id: string;
  text: string;
  position: "header" | "before_items" | "after_items" | "footer";
  align?: "left" | "center" | "right";
  bold?: boolean;
  fontSizePt?: number;
}

export interface InvoiceVisibilitySettings {
  showShopName?: boolean;
  showShopAddress?: boolean;
  showShopPhone?: boolean;
  showShopEmail?: boolean;
  showEmail?: boolean;
  showTagline?: boolean;
  showInvoiceNo?: boolean;
  showDateTime?: boolean;
  showCashier?: boolean;
  showCashierName?: boolean;
  showCustomer?: boolean;
  showCustomerDetails?: boolean;
  showPaymentMode?: boolean;
  showChangeReturn?: boolean;
  showTerms?: boolean;
  showPolicyNote?: boolean;
  showItemsHeader?: boolean;
  showItemHeader?: boolean;
  showDiscount?: boolean;
  showSubtotal?: boolean;
  showTotal?: boolean;
  showPaid?: boolean;
  showDue?: boolean;
}

export type LabelPrintMode = "thermal" | "a4_sheet";
export type BarcodeSymbology = "CODE128" | "EAN13" | "UPCA" | "CODE39" | "QR";
export type LabelUnit = "mm" | "cm" | "in";
export type LabelElementType = "text" | "barcode" | "qrcode" | "box" | "line" | "image";

export interface LabelElement {
  id: string;
  type: LabelElementType;
  /** User-facing layer label in the Label LIVE Layers list */
  layerName?: string;
  /** Millimeter coordinates & dimensions on the physical sticker */
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  rotation?: 0 | 90 | 180 | 270;
  locked?: boolean;
  hidden?: boolean;
  /** Text string, {variable} expression, barcode data, or image dataUrl */
  content: string;
  /** Typography properties */
  fontFamily?: "sans" | "mono" | "serif" | "condensed";
  fontSizePt?: number;
  fontWeight?: "normal" | "semibold" | "bold" | "black";
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  inverted?: boolean;
  autoFit?: boolean;
  wrap?: boolean;
  letterSpacingEm?: number;
  /** Barcode / QR properties */
  symbology?: BarcodeSymbology;
  showCodeText?: boolean;
  /** Shape / Box / Line properties */
  borderWidthMm?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  borderRadiusMm?: number;
  filled?: boolean;
  lineOrientation?: "horizontal" | "vertical";
}

export interface LabelSavedTemplate {
  id: string;
  name: string;
  description?: string;
  widthMm: number;
  heightMm: number;
  cornerRadiusMm?: number;
  elements: LabelElement[];
  updatedAt: string;
}

export interface InvoiceSavedTemplate {
  id: string;
  name: string;
  description?: string;
  paperWidthMm: number;
  fontSizePt: number;
  titleFontSizePt: number;
  printLanguage?: "bn" | "en";
  showCurrencySymbol?: boolean;
  currencySymbol?: string;
  customCashierName?: string;
  customHeaderTitle?: string;
  customSubtitle?: string;
  customAddress?: string;
  customPhone?: string;
  customFooterNote?: string;
  customPolicyNote?: string;
  visibility: InvoiceVisibilitySettings;
  customLines: CustomInvoiceLine[];
  invoiceSectionOrder?: InvoiceSectionId[];
  tableStyle?: "compact" | "bordered" | "clean" | "minimal";
  updatedAt: string;
}

export const BUILTIN_INVOICE_TEMPLATES: InvoiceSavedTemplate[] = [
  {
    id: "inv_tpl_80mm_standard",
    name: "80mm Standard POS Thermal (স্ট্যান্ডার্ড থার্মাল)",
    description: "Standard 80mm thermal receipt with clean layout, cashier name and policy terms",
    paperWidthMm: 80,
    fontSizePt: 6.8,
    titleFontSizePt: 9.5,
    printLanguage: "bn",
    showCurrencySymbol: false,
    currencySymbol: "",
    customCashierName: "Cashier Counter 1",
    visibility: {
      showShopName: true,
      showShopAddress: true,
      showShopPhone: true,
      showShopEmail: true,
      showTagline: true,
      showInvoiceNo: true,
      showDateTime: true,
      showCashier: true,
      showCashierName: true,
      showCustomer: true,
      showCustomerDetails: true,
      showPaymentMode: true,
      showChangeReturn: true,
      showTerms: true,
      showPolicyNote: true,
      showItemsHeader: true,
      showItemHeader: true,
      showDiscount: true,
      showSubtotal: true,
      showTotal: true,
      showPaid: true,
      showDue: true,
    },
    customLines: [],
    invoiceSectionOrder: [
      "header",
      "meta",
      "customer",
      "items",
      "totals",
      "footer",
    ],
    tableStyle: "compact",
    updatedAt: "2026-11-16T00:00:00.000Z",
  },
  {
    id: "inv_tpl_58mm_mini",
    name: "58mm Mini POS Thermal (মিনি থার্মাল রসিদ)",
    description: "Ultra-compact 58mm thermal receipt layout optimized for small roll printers",
    paperWidthMm: 58,
    fontSizePt: 6.0,
    titleFontSizePt: 8.5,
    printLanguage: "bn",
    showCurrencySymbol: false,
    currencySymbol: "",
    customCashierName: "ক্যাশ কাউন্টার",
    visibility: {
      showShopName: true,
      showShopAddress: true,
      showShopPhone: true,
      showShopEmail: false,
      showTagline: false,
      showInvoiceNo: true,
      showDateTime: true,
      showCashier: true,
      showCashierName: true,
      showCustomer: true,
      showCustomerDetails: true,
      showPaymentMode: true,
      showChangeReturn: true,
      showTerms: true,
      showPolicyNote: true,
      showItemsHeader: true,
      showItemHeader: true,
      showDiscount: true,
      showSubtotal: true,
      showTotal: true,
      showPaid: true,
      showDue: true,
    },
    customLines: [],
    invoiceSectionOrder: [
      "header",
      "meta",
      "customer",
      "items",
      "totals",
      "footer",
    ],
    tableStyle: "compact",
    updatedAt: "2026-11-16T00:00:00.000Z",
  },
  {
    id: "inv_tpl_clean_no_taka",
    name: "Clean No-Taka Invoice (টাকা চিহ্ন ছাড়া ফ্রেশ ইনভয়েস)",
    description: "Modern professional invoice showing prices as pure numbers without taka/currency sign",
    paperWidthMm: 80,
    fontSizePt: 7.0,
    titleFontSizePt: 10.0,
    printLanguage: "bn",
    showCurrencySymbol: false,
    currencySymbol: "",
    customCashierName: "অপারেটর",
    visibility: {
      showShopName: true,
      showShopAddress: true,
      showShopPhone: true,
      showShopEmail: true,
      showTagline: true,
      showInvoiceNo: true,
      showDateTime: true,
      showCashier: true,
      showCashierName: true,
      showCustomer: true,
      showCustomerDetails: true,
      showPaymentMode: true,
      showChangeReturn: true,
      showTerms: true,
      showPolicyNote: true,
      showItemsHeader: true,
      showItemHeader: true,
      showDiscount: true,
      showSubtotal: true,
      showTotal: true,
      showPaid: true,
      showDue: true,
    },
    customLines: [],
    invoiceSectionOrder: [
      "header",
      "meta",
      "customer",
      "items",
      "totals",
      "footer",
    ],
    tableStyle: "clean",
    updatedAt: "2026-11-16T00:00:00.000Z",
  },
  {
    id: "inv_tpl_a4_retail",
    name: "A4 / Full Sheet Retail Invoice (পূর্ণাঙ্গ রিটেইল চালান)",
    description: "Full-page invoice with detailed customer info, cashier header, table borders & terms",
    paperWidthMm: 210,
    fontSizePt: 9.5,
    titleFontSizePt: 14.0,
    printLanguage: "bn",
    showCurrencySymbol: false,
    currencySymbol: "",
    customCashierName: "ক্যাশিয়ার",
    visibility: {
      showShopName: true,
      showShopAddress: true,
      showShopPhone: true,
      showShopEmail: true,
      showTagline: true,
      showInvoiceNo: true,
      showDateTime: true,
      showCashier: true,
      showCashierName: true,
      showCustomer: true,
      showCustomerDetails: true,
      showPaymentMode: true,
      showChangeReturn: true,
      showTerms: true,
      showPolicyNote: true,
      showItemsHeader: true,
      showItemHeader: true,
      showDiscount: true,
      showSubtotal: true,
      showTotal: true,
      showPaid: true,
      showDue: true,
    },
    customLines: [],
    invoiceSectionOrder: [
      "header",
      "meta",
      "customer",
      "items",
      "totals",
      "footer",
    ],
    tableStyle: "bordered",
    updatedAt: "2026-11-16T00:00:00.000Z",
  },
];

export interface PosLabelSettings {
  mode: LabelPrintMode;
  printerName: string;
  barcodeFormat: BarcodeSymbology;
  unit: LabelUnit;
  widthMm: number;
  heightMm: number;
  cornerRadiusMm: number;
  defaultCopies: number;
  rollColumns: number;
  columnGapMm: number;
  rowGapMm: number;
  offsetTopMm: number;
  offsetLeftMm: number;
  a4Columns: number;
  fontSizePt: number;
  barcodeHeightPx: number;
  barcodeWidthPct: number;
  showShopName: boolean;
  showProductName: boolean;
  showPrice: boolean;
  showMrp: boolean;
  showBarcode: boolean;
  showCodeText: boolean;
  showCategory: boolean;
  showVariant: boolean;
  showBorder: boolean;
  customFooterText: string;
  currencyPrefix: string;
  silentPrint: boolean;
  snapToGrid: boolean;
  gridStepMm: number;
  feedDirection: "up" | "down" | "left" | "right";
  /** Label LIVE freeform 2D canvas elements (starts empty — zero forced default texts!) */
  canvasElements: LabelElement[];
  /** User's saved custom label designs */
  savedTemplates: LabelSavedTemplate[];
  /** Product-to-Template mappings: productId -> templateId */
  productTemplateMappings?: Record<string, string>;
  /** Product custom mapped layouts: productId -> full layout config */
  productCustomLayouts?: Record<string, {
    templateId?: string;
    widthMm?: number;
    heightMm?: number;
    cornerRadiusMm?: number;
    elements: LabelElement[];
    updatedAt: string;
  }>;
}

export interface LabelStudioDraft {
  activeProductId?: string | null;
  activeTemplateId?: string | null;
  widthMm: number;
  heightMm: number;
  cornerRadiusMm?: number;
  elements: LabelElement[];
  copies?: number;
  queue?: any[];
  previewRowIndex?: number;
  savedAt?: string;
  updatedAt?: string;
}

export const LABEL_STUDIO_DRAFT_KEY = "cw_label_studio_draft_v2";

export const DEFAULT_LABEL_SETTINGS: PosLabelSettings = {
  mode: "thermal",
  printerName: "",
  barcodeFormat: "CODE128",
  unit: "mm",
  widthMm: 50,
  heightMm: 30,
  cornerRadiusMm: 1.5,
  defaultCopies: 1,
  rollColumns: 1,
  columnGapMm: 2,
  rowGapMm: 2.5,
  offsetTopMm: 0,
  offsetLeftMm: 0,
  a4Columns: 4,
  fontSizePt: 9,
  barcodeHeightPx: 30,
  barcodeWidthPct: 94,
  showShopName: false,
  showProductName: false,
  showPrice: false,
  showMrp: false,
  showBarcode: false,
  showCodeText: true,
  showCategory: false,
  showVariant: false,
  showBorder: false,
  customFooterText: "",
  currencyPrefix: "",
  silentPrint: true,
  snapToGrid: true,
  gridStepMm: 0.5,
  feedDirection: "up",
  canvasElements: [],
  savedTemplates: [],
  productTemplateMappings: {},
  productCustomLayouts: {},
};

export interface PosHardwareSettings {
  printMode: ReceiptPrintMode;
  /** Receipt / invoice printing language ("bn" = Bangla, "en" = English) */
  printLanguage?: "bn" | "en";
  scannerSuffix: "Enter" | "Tab";
  /** When true, prints directly in 1-click without showing Windows print dialog. When false, opens Windows Print Preferences dialog. */
  automatePrinting: boolean;
  /** Per-device default printer name (empty string = Windows system default printer) */
  devicePrinterName: string;
  /** Thermal paper margins in millimeters (per-device). Default is 0mm as requested */
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  /** Print scale percentage (50 to 200, typed by user) */
  printScale: number;
  /** Number of receipt copies per print */
  copies: number;

  /** Paper width in millimeters: e.g. 80, 76, 70, 58, 50, 20 or custom typed mm */
  paperWidthMm: number;
  /** Paper height in millimeters: "auto" (content height) or specific number like 40, 50, 60, 70, 80, 100, 150 etc. */
  paperHeightMm: number | "auto";
  /** Auto fit mode to make invoice contents fit inside the roll perfectly */
  fitToWidth: boolean;
  /** Base font size in points (e.g. 7.0pt default, adjustable 4.5 to 18pt) */
  fontSizePt: number;
  /** Title font size in points (e.g. 9.5pt default, adjustable 6 to 26pt) */
  titleFontSizePt: number;
  /** Internal one-time flag migrating oversized legacy font defaults */
  typographyV3Migrated?: boolean;
  typographyV4Migrated?: boolean;
  /** Custom header text override */
  customHeaderTitle?: string;
  /** Custom subtitle / tagline */
  customSubtitle?: string;
  /** Custom address override */
  customAddress?: string;
  /** Custom phone override */
  customPhone?: string;
  /** Custom footer note */
  customFooterNote?: string;
  /** Exchange / return policy line printed at the very bottom (empty string hides it) */
  customPolicyNote?: string;
  /** Custom cashier name override (e.g. "Cashier: Counter 1" or staff name) */
  customCashierName?: string;
  /** Whether to show currency symbol (default false: removes taka symbol from prices) */
  showCurrencySymbol?: boolean;
  /** Currency symbol to show if showCurrencySymbol is true (e.g. "৳", "$", "BDT") */
  currencySymbol?: string;
  /** Saved custom & builtin invoice templates */
  savedInvoiceTemplates?: InvoiceSavedTemplate[];
  /** Currently active invoice template id */
  activeInvoiceTemplateId?: string | null;
  /** Toggle visibility of standard invoice lines */
  visibility: InvoiceVisibilitySettings;
  /** Drag-and-drop section order for invoice blocks */
  invoiceSectionOrder?: InvoiceSectionId[];
  /** Custom lines added by admin */
  customLines: CustomInvoiceLine[];
  /** Barcode / Custom-Size Label LIVE Sticker Studio settings */
  labelSettings: PosLabelSettings;
}

const STORAGE_KEY = "urobili_pos_hardware_v1";

export const DEFAULT_VISIBILITY_SETTINGS: InvoiceVisibilitySettings = {
  showShopName: true,
  showShopAddress: true,
  showShopPhone: true,
  showShopEmail: true,
  showTagline: true,
  showInvoiceNo: true,
  showDateTime: true,
  showCashier: true,
  showCashierName: true,
  showCustomer: true,
  showCustomerDetails: true,
  showPaymentMode: true,
  showChangeReturn: true,
  showTerms: true,
  showPolicyNote: true,
  showItemsHeader: true,
  showItemHeader: true,
  showDiscount: true,
  showSubtotal: true,
  showTotal: true,
  showPaid: true,
  showDue: true,
};

/** Default exchange / return policy line shown at the bottom of the receipt */
export const DEFAULT_POLICY_NOTE = "* ৭ দিনের মধ্যে ইনভয়েস সহ পণ্য পরিবর্তন প্রযোজ্য *";
export const DEFAULT_POLICY_NOTE_EN = "* Exchange within 7 days with invoice *";

export const DEFAULT_HARDWARE_SETTINGS: PosHardwareSettings = {
  printMode: "manual",
  printLanguage: "bn",
  scannerSuffix: "Enter",
  automatePrinting: true,
  devicePrinterName: "",
  marginTopMm: 0,
  marginBottomMm: 0,
  marginLeftMm: 0,
  marginRightMm: 0,
  printScale: 100,
  copies: 1,
  paperWidthMm: 80,
  paperHeightMm: "auto",
  fitToWidth: true,
  fontSizePt: 6.5,
  titleFontSizePt: 8.8,
  typographyV3Migrated: true,
  customCashierName: "ক্যাশিয়ার",
  showCurrencySymbol: false,
  currencySymbol: "",
  savedInvoiceTemplates: BUILTIN_INVOICE_TEMPLATES,
  activeInvoiceTemplateId: "inv_tpl_80mm_standard",
  visibility: DEFAULT_VISIBILITY_SETTINGS,
  invoiceSectionOrder: DEFAULT_INVOICE_SECTION_ORDER,
  customLines: [],
  labelSettings: DEFAULT_LABEL_SETTINGS,
};

/** Keyboard/HID scanners need no browser Bluetooth permission: the OS delivers keys. */
export function createHidScanBuffer(suffix: "Enter" | "Tab" | "None" = "Enter", maxGapMs = 250) {
  let buffer = "";
  let lastKeyAt = 0;
  let flushTimer: any = null;
  return {
    reset() {
      buffer = "";
      lastKeyAt = 0;
      if (flushTimer) clearTimeout(flushTimer);
    },
    clear() {
      buffer = "";
      lastKeyAt = 0;
      if (flushTimer) clearTimeout(flushTimer);
    },
    push(key: string, at: number): string | null {
      const isSuffix =
        key === suffix ||
        key === "Enter" ||
        key === "\r" ||
        key === "\n" ||
        key === "Tab";

      if (isSuffix) {
        if (flushTimer) clearTimeout(flushTimer);
        if (at - lastKeyAt > 1200) {
          buffer = "";
          return null;
        }
        const code = buffer.trim();
        buffer = "";
        return code.length >= 1 ? code : null;
      }

      if (at - lastKeyAt > maxGapMs) {
        buffer = "";
      }
      lastKeyAt = at;

      if (key.length === 1 && buffer.length < 4096) {
        buffer += key;
      } else if (
        key !== "Shift" &&
        key !== "Control" &&
        key !== "Alt" &&
        key !== "Meta" &&
        key !== "CapsLock"
      ) {
        buffer = "";
      }
      return null;
    },
    consumeKey(e: KeyboardEvent, onAutoFlush?: (code: string) => void): string | null {
      if (e.ctrlKey || e.altKey || e.metaKey) return null;
      const now = Date.now();
      const res = this.push(e.key, now);
      if (res) return res;
      if (onAutoFlush && buffer.length >= 3) {
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(() => {
          const code = buffer.trim();
          buffer = "";
          if (code.length >= 3) {
            onAutoFlush(code);
          }
        }, 220);
      }
      return null;
    },
  };
}

export function getPosHardwareSettings(): PosHardwareSettings {
  if (typeof window === "undefined") return DEFAULT_HARDWARE_SETTINGS;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const savedLabel = saved?.labelSettings || {};

    let rawFontPt = saved?.fontSizePt !== undefined && Number.isFinite(Number(saved.fontSizePt))
      ? Math.max(4.5, Math.min(24, Number(saved.fontSizePt)))
      : 6.5;
    let rawTitlePt = saved?.titleFontSizePt !== undefined && Number.isFinite(Number(saved.titleFontSizePt))
      ? Math.max(6, Math.min(32, Number(saved.titleFontSizePt)))
      : 8.8;
    let rawScale = saved?.printScale !== undefined && Number.isFinite(Number(saved.printScale))
      ? Math.min(250, Math.max(30, Number(saved.printScale)))
      : 100;

    const resolved: PosHardwareSettings = {
      printMode: saved?.printMode === "automatic" ? "automatic" : "manual",
      printLanguage: saved?.printLanguage === "en" ? "en" : "bn",
      scannerSuffix: saved?.scannerSuffix === "Tab" ? "Tab" : "Enter",
      automatePrinting: saved?.automatePrinting !== undefined ? Boolean(saved.automatePrinting) : true,
      devicePrinterName: typeof saved?.devicePrinterName === "string" ? saved.devicePrinterName : "",
      marginTopMm: saved?.marginTopMm !== undefined && Number.isFinite(Number(saved.marginTopMm)) ? Math.max(0, Number(saved.marginTopMm)) : 0,
      marginBottomMm: saved?.marginBottomMm !== undefined && Number.isFinite(Number(saved.marginBottomMm)) ? Math.max(0, Number(saved.marginBottomMm)) : 0,
      marginLeftMm: saved?.marginLeftMm !== undefined && Number.isFinite(Number(saved.marginLeftMm)) ? Math.max(0, Number(saved.marginLeftMm)) : 0,
      marginRightMm: saved?.marginRightMm !== undefined && Number.isFinite(Number(saved.marginRightMm)) ? Math.max(0, Number(saved.marginRightMm)) : 0,
      printScale: rawScale,
      copies: saved?.copies !== undefined && Number.isFinite(Number(saved.copies)) ? Math.min(10, Math.max(1, Number(saved.copies))) : 1,

      paperWidthMm: saved?.paperWidthMm !== undefined && Number.isFinite(Number(saved.paperWidthMm)) ? Math.max(15, Math.min(300, Number(saved.paperWidthMm))) : 80,
      paperHeightMm: saved?.paperHeightMm !== undefined && saved?.paperHeightMm !== "auto" && Number.isFinite(Number(saved.paperHeightMm)) && Number(saved.paperHeightMm) > 0 ? Number(saved.paperHeightMm) : "auto",
      fitToWidth: saved?.fitToWidth !== undefined ? Boolean(saved.fitToWidth) : true,
      fontSizePt: rawFontPt,
      titleFontSizePt: rawTitlePt,
      typographyV3Migrated: true,
      typographyV4Migrated: true,
      customHeaderTitle: typeof saved?.customHeaderTitle === "string" ? saved.customHeaderTitle : undefined,
      customSubtitle: typeof saved?.customSubtitle === "string" ? saved.customSubtitle : undefined,
      customAddress: typeof saved?.customAddress === "string" ? saved.customAddress : undefined,
      customPhone: typeof saved?.customPhone === "string" ? saved.customPhone : undefined,
      customFooterNote: typeof saved?.customFooterNote === "string" ? saved.customFooterNote : undefined,
      customPolicyNote: typeof saved?.customPolicyNote === "string" ? saved.customPolicyNote : undefined,
      customCashierName: typeof saved?.customCashierName === "string" ? saved.customCashierName : "ক্যাশিয়ার",
      showCurrencySymbol: saved?.showCurrencySymbol !== undefined ? Boolean(saved.showCurrencySymbol) : false,
      currencySymbol: typeof saved?.currencySymbol === "string" ? saved.currencySymbol : "",
      savedInvoiceTemplates: Array.isArray(saved?.savedInvoiceTemplates) && saved.savedInvoiceTemplates.length > 0
        ? saved.savedInvoiceTemplates
        : BUILTIN_INVOICE_TEMPLATES,
      activeInvoiceTemplateId: typeof saved?.activeInvoiceTemplateId === "string" ? saved.activeInvoiceTemplateId : "inv_tpl_80mm_standard",
      visibility: {
        ...DEFAULT_VISIBILITY_SETTINGS,
        ...(saved?.visibility || {}),
      },
      invoiceSectionOrder: Array.isArray(saved?.invoiceSectionOrder) && saved.invoiceSectionOrder.length > 0
        ? saved.invoiceSectionOrder
        : DEFAULT_INVOICE_SECTION_ORDER,
      customLines: Array.isArray(saved?.customLines) ? saved.customLines : [],
      labelSettings: {
        ...DEFAULT_LABEL_SETTINGS,
        ...savedLabel,
        currencyPrefix: (savedLabel?.currencyPrefix || "").replace(/[৳Tk.\s]+/gi, "").trim(),
        mode: savedLabel?.mode === "a4_sheet" ? "a4_sheet" : "thermal",
        unit: savedLabel?.unit === "cm" || savedLabel?.unit === "in" ? savedLabel.unit : "mm",
        widthMm: Number(savedLabel?.widthMm) >= 10 ? Math.min(300, Number(savedLabel.widthMm)) : DEFAULT_LABEL_SETTINGS.widthMm,
        heightMm: Number(savedLabel?.heightMm) >= 8 ? Math.min(400, Number(savedLabel.heightMm)) : DEFAULT_LABEL_SETTINGS.heightMm,
        cornerRadiusMm: Number.isFinite(Number(savedLabel?.cornerRadiusMm)) ? Math.max(0, Math.min(20, Number(savedLabel.cornerRadiusMm))) : DEFAULT_LABEL_SETTINGS.cornerRadiusMm,
        defaultCopies: Number(savedLabel?.defaultCopies) >= 1 ? Math.min(10000, Math.floor(Number(savedLabel.defaultCopies))) : DEFAULT_LABEL_SETTINGS.defaultCopies,
        a4Columns: Number(savedLabel?.a4Columns) >= 1 ? Math.min(6, Math.max(1, Number(savedLabel.a4Columns))) : DEFAULT_LABEL_SETTINGS.a4Columns,
        fontSizePt: Number(savedLabel?.fontSizePt) >= 4 ? Math.min(48, Math.max(4, Number(savedLabel.fontSizePt))) : DEFAULT_LABEL_SETTINGS.fontSizePt,
        barcodeHeightPx: Number(savedLabel?.barcodeHeightPx) >= 10 ? Math.min(200, Math.max(10, Number(savedLabel.barcodeHeightPx))) : DEFAULT_LABEL_SETTINGS.barcodeHeightPx,
        canvasElements: Array.isArray(savedLabel?.canvasElements) ? savedLabel.canvasElements : [],
        savedTemplates: Array.isArray(savedLabel?.savedTemplates) ? savedLabel.savedTemplates : [],
        productTemplateMappings: (typeof savedLabel?.productTemplateMappings === "object" && savedLabel.productTemplateMappings) ? savedLabel.productTemplateMappings : {},
        productCustomLayouts: (typeof savedLabel?.productCustomLayouts === "object" && savedLabel.productCustomLayouts) ? savedLabel.productCustomLayouts : {},
      },
    };
    return resolved;
  } catch {
    return DEFAULT_HARDWARE_SETTINGS;
  }
}

export function saveLabelStudioDraft(draft: LabelStudioDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LABEL_STUDIO_DRAFT_KEY, JSON.stringify(draft));
  } catch (_) {}
}

export function getLabelStudioDraft(): LabelStudioDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LABEL_STUDIO_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function clearLabelStudioDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LABEL_STUDIO_DRAFT_KEY);
  } catch (_) {}
}

export function getProductLabelMapping(productId: string): {
  templateId?: string;
  widthMm?: number;
  heightMm?: number;
  cornerRadiusMm?: number;
  elements?: LabelElement[];
} | null {
  if (!productId) return null;
  const hw = getPosHardwareSettings();
  const labelSettings = hw.labelSettings || DEFAULT_LABEL_SETTINGS;
  const custom = labelSettings.productCustomLayouts?.[productId];
  if (custom && Array.isArray(custom.elements) && custom.elements.length > 0) {
    return {
      templateId: custom.templateId,
      widthMm: custom.widthMm,
      heightMm: custom.heightMm,
      cornerRadiusMm: custom.cornerRadiusMm,
      elements: custom.elements,
    };
  }
  const tplId = labelSettings.productTemplateMappings?.[productId];
  if (tplId) {
    const tpl = (labelSettings.savedTemplates || []).find((t) => t.id === tplId);
    if (tpl) {
      return {
        templateId: tpl.id,
        widthMm: tpl.widthMm,
        heightMm: tpl.heightMm,
        cornerRadiusMm: tpl.cornerRadiusMm,
        elements: tpl.elements,
      };
    }
    return { templateId: tplId };
  }
  return null;
}

export function saveProductLabelMapping(
  productId: string,
  mapping: {
    templateId?: string;
    widthMm?: number;
    heightMm?: number;
    cornerRadiusMm?: number;
    elements?: LabelElement[];
  }
): void {
  if (!productId) return;
  const hw = getPosHardwareSettings();
  const labelSettings = hw.labelSettings || DEFAULT_LABEL_SETTINGS;
  const nextMappings = { ...(labelSettings.productTemplateMappings || {}) };
  const nextCustom = { ...(labelSettings.productCustomLayouts || {}) };

  if (mapping.templateId) {
    nextMappings[productId] = mapping.templateId;
  }
  if (mapping.elements && mapping.elements.length > 0) {
    nextCustom[productId] = {
      templateId: mapping.templateId,
      widthMm: mapping.widthMm,
      heightMm: mapping.heightMm,
      cornerRadiusMm: mapping.cornerRadiusMm,
      elements: mapping.elements,
      updatedAt: new Date().toISOString(),
    };
  }

  savePosHardwareSettings({
    labelSettings: {
      ...labelSettings,
      productTemplateMappings: nextMappings,
      productCustomLayouts: nextCustom,
    },
  });
}

export function removeProductLabelMapping(productId: string): void {
  if (!productId) return;
  const hw = getPosHardwareSettings();
  const labelSettings = hw.labelSettings || DEFAULT_LABEL_SETTINGS;
  const nextMappings = { ...(labelSettings.productTemplateMappings || {}) };
  const nextCustom = { ...(labelSettings.productCustomLayouts || {}) };

  delete nextMappings[productId];
  delete nextCustom[productId];

  savePosHardwareSettings({
    labelSettings: {
      ...labelSettings,
      productTemplateMappings: nextMappings,
      productCustomLayouts: nextCustom,
    },
  });
}

export function saveCustomInvoiceTemplate(template: InvoiceSavedTemplate): PosHardwareSettings {
  const hw = getPosHardwareSettings();
  const currentTemplates = Array.isArray(hw.savedInvoiceTemplates) && hw.savedInvoiceTemplates.length > 0
    ? [...hw.savedInvoiceTemplates]
    : [...BUILTIN_INVOICE_TEMPLATES];

  const existingIdx = currentTemplates.findIndex((t) => t.id === template.id);
  if (existingIdx >= 0) {
    currentTemplates[existingIdx] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    currentTemplates.push({ ...template, updatedAt: new Date().toISOString() });
  }

  return savePosHardwareSettings({
    savedInvoiceTemplates: currentTemplates,
    activeInvoiceTemplateId: template.id,
  });
}

export function deleteCustomInvoiceTemplate(templateId: string): PosHardwareSettings {
  const hw = getPosHardwareSettings();
  const currentTemplates = Array.isArray(hw.savedInvoiceTemplates)
    ? hw.savedInvoiceTemplates.filter((t) => t.id !== templateId)
    : [];

  return savePosHardwareSettings({
    savedInvoiceTemplates: currentTemplates.length > 0 ? currentTemplates : BUILTIN_INVOICE_TEMPLATES,
    activeInvoiceTemplateId: hw.activeInvoiceTemplateId === templateId ? (BUILTIN_INVOICE_TEMPLATES[0]?.id || null) : hw.activeInvoiceTemplateId,
  });
}

export function applyInvoiceTemplate(template: InvoiceSavedTemplate): PosHardwareSettings {
  return savePosHardwareSettings({
    paperWidthMm: template.paperWidthMm || 80,
    fontSizePt: template.fontSizePt || 6.5,
    titleFontSizePt: template.titleFontSizePt || 8.8,
    printLanguage: template.printLanguage || "bn",
    showCurrencySymbol: Boolean(template.showCurrencySymbol),
    currencySymbol: template.currencySymbol || "",
    customCashierName: template.customCashierName || "",
    customHeaderTitle: template.customHeaderTitle,
    customSubtitle: template.customSubtitle,
    customAddress: template.customAddress,
    customPhone: template.customPhone,
    customFooterNote: template.customFooterNote,
    customPolicyNote: template.customPolicyNote,
    visibility: { ...DEFAULT_VISIBILITY_SETTINGS, ...(template.visibility || {}) },
    customLines: template.customLines || [],
    invoiceSectionOrder: template.invoiceSectionOrder || DEFAULT_INVOICE_SECTION_ORDER,
    activeInvoiceTemplateId: template.id,
  });
}

export function savePosHardwareSettings(settings: Partial<PosHardwareSettings>): PosHardwareSettings {
  const current = getPosHardwareSettings();
  const nextLabelSettings = settings.labelSettings
    ? {
        ...current.labelSettings,
        ...settings.labelSettings,
        currencyPrefix: (settings.labelSettings.currencyPrefix !== undefined
          ? settings.labelSettings.currencyPrefix
          : current.labelSettings.currencyPrefix || ""
        )
          .replace(/[৳Tk.\s]+/gi, "")
          .trim(),
      }
    : current.labelSettings;
  const updated: PosHardwareSettings = {
    ...current,
    ...settings,
    ...(settings.labelSettings ? { labelSettings: nextLabelSettings } : {}),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("pos-hardware-settings-changed"));
  }
  return updated;
}

export function findProductsByScannedCode(products: Product[], code: string): Product[] {
  const scanned = (code || "").trim().toLowerCase();
  if (!scanned) return [];
  const stripped = scanned.replace(/^0+/, "");

  const active = products.filter((product) => !product.archived);

  // 1. Exact match on barcode
  const exactBarcode = active.filter(
    (p) => p.barcode && p.barcode.trim().toLowerCase() === scanned
  );
  if (exactBarcode.length) return exactBarcode;

  // 2. Match with stripped leading zeroes
  if (stripped) {
    const strippedBarcode = active.filter(
      (p) =>
        p.barcode &&
        p.barcode.trim().toLowerCase().replace(/^0+/, "") === stripped
    );
    if (strippedBarcode.length) return strippedBarcode;
  }

  // 3. Match against QR code, SKU, code, product_number, ID, or auto-generated 8-char label code
  const otherMatches = active.filter((product) => {
    const shortId = product.id ? product.id.slice(-8) : "";
    return [
      product.qr_code,
      product.code,
      product.sku,
      product.product_number != null ? String(product.product_number) : undefined,
      product.id,
      shortId,
    ].some((value) => {
      if (!value) return false;
      const v = String(value).trim().toLowerCase();
      return v === scanned || (stripped && v.replace(/^0+/, "") === stripped);
    });
  });

  return otherMatches;
}
