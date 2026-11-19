export interface CustomModuleItem {
  id: string;
  labelEn: string;
  labelBn: string;
  url: string;
}

export interface ModuleConfig {
  disabledModules: string[];
  disabledKpis: string[];
  customModules: CustomModuleItem[];
}

export const MODULE_CATALOG = [
  { key: "/sales", labelEn: "Point of Sale", labelBn: "পয়েন্ট অব সেল" },
  { key: "/sales/today", labelEn: "Today's Sale", labelBn: "আজকের বিক্রি" },
  { key: "/online-sells", labelEn: "Online Sales", labelBn: "অনলাইন বিক্রি" },
  { key: "/products", labelEn: "Products & Stock", labelBn: "পণ্য ও স্টক" },
  { key: "/customers", labelEn: "Customers & Dues", labelBn: "কাস্টমার ও বাকি" },
  { key: "/invoices", labelEn: "Invoices", labelBn: "ইনভয়েস" },
  { key: "/labels", labelEn: "Barcode Labels", labelBn: "বারকোড লেবেল" },
  { key: "/purchases", labelEn: "Purchases", labelBn: "ক্রয়" },
  { key: "/expenses", labelEn: "Expenses", labelBn: "খরচ" },
  { key: "/cash-management", labelEn: "Cashbox", labelBn: "ক্যাশবক্স" },
  { key: "/bank", labelEn: "Bank Management", labelBn: "ব্যাংক অ্যাকাউন্ট" },
  { key: "/owners-wallet", labelEn: "Owner's Wallet", labelBn: "মালিকের ওয়ালেট" },
  { key: "/somiti", labelEn: "Samity / Savings", labelBn: "সমিতি ও সঞ্চয়" },
  { key: "/sms", labelEn: "SMS Marketing", labelBn: "এসএমএস" },
  { key: "/employee-hub", labelEn: "Employee Hub", labelBn: "কর্মচারী হাব" },
  { key: "/reports", labelEn: "Reports", labelBn: "রিপোর্ট" },
  { key: "/profits", labelEn: "Profit & Loss", labelBn: "লাভ ও ক্ষতি" },
  { key: "/ai-audits", labelEn: "AI Audits", labelBn: "এআই অডিট" },
] as const;

export const KPI_CATALOG = [
  { key: "today_sales", labelEn: "Today's Sales KPI", labelBn: "আজকের বিক্রি কার্ড" },
  { key: "online_sales", labelEn: "Online Sales KPI", labelBn: "অনলাইন বিক্রি কার্ড" },
  { key: "cashbox", labelEn: "Cashbox Balance KPI", labelBn: "ক্যাশবক্স ব্যালেন্স কার্ড" },
  { key: "profit", labelEn: "Net Profit KPI", labelBn: "নিট লাভ কার্ড" },
  { key: "dues", labelEn: "Customer Dues KPI", labelBn: "কাস্টমার বাকি কার্ড" },
  { key: "expenses", labelEn: "Expenses KPI", labelBn: "খরচ কার্ড" },
  { key: "purchases", labelEn: "Purchases KPI", labelBn: "ক্রয় কার্ড" },
  { key: "stock_alerts", labelEn: "Low Stock Alerts", labelBn: "কম স্টক সতর্কতা" },
] as const;

export function getIndustryDefaultDisabledModules(industry?: string): string[] {
  switch ((industry || "").toLowerCase()) {
    case "restaurant":
      return ["/online-sells", "/somiti", "/labels", "/erp"];
    case "fashion":
      return ["/restaurant", "/somiti"];
    case "pharmacy":
      return ["/restaurant", "/online-sells", "/somiti"];
    case "grocery":
      return ["/restaurant", "/online-sells", "/somiti"];
    default:
      return ["/restaurant"];
  }
}

export interface IndustryProfile {
  id: string;
  labelEn: string;
  labelBn: string;
  taglineEn: string;
  taglineBn: string;
  quickActions: { to: string; labelEn: string; labelBn: string }[];
  characteristicsEn: string[];
  characteristicsBn: string[];
}

export function getIndustryProfile(industry?: string): IndustryProfile {
  const raw = (industry || "fashion").toLowerCase();
  const key = ["restaurant", "fashion", "pharmacy", "grocery"].includes(raw) ? raw : "fashion";
  const profiles: Record<string, IndustryProfile> = {
    restaurant: {
      id: "restaurant",
      labelEn: "Restaurant & Cafe ERP",
      labelBn: "রেস্তোরাঁ ও ক্যাফে ইআরপি",
      taglineEn: "NexoPOS-inspired dining POS, multi-floor tables, KDS, shifts & cashier bill queue",
      taglineBn: "মাল্টি-ফ্লোর টেবিল, ওয়েটার টার্মিনাল, কিচেন ডিসপ্লে, শিফট ও বিল কিউ",
      quickActions: [
        { to: "/restaurant", labelEn: "Open Restaurant POS", labelBn: "রেস্তোরাঁ পিওএস খুলুন" },
        { to: "/products", labelEn: "Dishes & Menu", labelBn: "খাবার ও মেনু" },
        { to: "/employee-hub", labelEn: "Waiters & Staff", labelBn: "ওয়েটার ও স্টাফ" },
      ],
      characteristicsEn: ["Multi-Floor & Seat Capacity", "Kitchen Display (KDS)", "Cashier Bill Queue"],
      characteristicsBn: ["মাল্টি-ফ্লোর ও সিট ক্যাপাসিটি", "কিচেন ডিসপ্লে", "ক্যাশিয়ার বিল কিউ"],
    },
    fashion: {
      id: "fashion",
      labelEn: "Fashion & Clothing ERP",
      labelBn: "ফ্যাশন ও ক্লদিং ইআরপি",
      taglineEn: "1-tap size & color matrix POS, garment hangtags, online orders & instant checkout",
      taglineBn: "সাইজ ও কালার ভ্যারিয়েন্ট পিওএস, গার্মেন্টস হ্যাংট্যাগ, অনলাইন অর্ডার ও দ্রুত বিলিং",
      quickActions: [
        { to: "/erp", labelEn: "Easy Fashion POS", labelBn: "ইজি ফ্যাশন পিওএস" },
        { to: "/labels", labelEn: "Print Hangtags", labelBn: "হ্যাংট্যাগ প্রিন্ট" },
        { to: "/online-sells", labelEn: "Online Orders", labelBn: "অনলাইন অর্ডার" },
      ],
      characteristicsEn: ["1-Tap Size & Color Matrix", "Barcode Hangtags", "Courier & Online Sales"],
      characteristicsBn: ["সাইজ ও কালার তালিকা", "বারকোড হ্যাংট্যাগ", "কুরিয়ার ও অনলাইন বিক্রি"],
    },
    pharmacy: {
      id: "pharmacy",
      labelEn: "Pharmacy & Healthcare ERP",
      labelBn: "ফার্মেসি ও হেলথকেয়ার ইআরপি",
      taglineEn: "PharmaSpot dispensing POS, batch expiry quarantine, Rx queue & supplier directory",
      taglineBn: "ব্যাচ নম্বর, ৯০ দিনের মেয়াদ সতর্কতা, প্রেসক্রিপশন কিউ ও দ্রুত কাউন্টার বিলিং",
      quickActions: [
        { to: "/erp", labelEn: "Pharmacy POS", labelBn: "ফার্মেসি পিওএস" },
        { to: "/purchases", labelEn: "Reorder Medicines", labelBn: "ওষুধ ক্রয়" },
        { to: "/products", labelEn: "Batch & Expiry Stock", labelBn: "ব্যাচ ও মেয়াদ স্টক" },
      ],
      characteristicsEn: ["Batch & Expiry Quarantine", "Rx & Hold Orders", "Supplier Directory"],
      characteristicsBn: ["ব্যাচ ও মেয়াদ সুরক্ষা", "প্রেসক্রিপশন ও হোল্ড বিল", "সাপ্লায়ার ডিরেক্টরি"],
    },
    grocery: {
      id: "grocery",
      labelEn: "Groceries & Superstore ERP",
      labelBn: "মুদি ও সুপারশপ ইআরপি",
      taglineEn: "Weight & unit pricing, wholesale tiers & fast barcode checkout",
      taglineBn: "ওজন ও ইউনিট মূল্য, পাইকারি রেট ও দ্রুত বারকোড চেকআউট",
      quickActions: [
        { to: "/erp", labelEn: "Grocery POS", labelBn: "মুদি পিওএস" },
        { to: "/products", labelEn: "Weight & Unit Stock", labelBn: "ওজন ও ইউনিট স্টক" },
        { to: "/customers", labelEn: "Customer Dues", labelBn: "কাস্টমার বাকি" },
      ],
      characteristicsEn: ["Kg / Litre / Pack Units", "Wholesale Pricing", "Low-Stock Alerts"],
      characteristicsBn: ["কেজি / লিটার / প্যাক", "পাইকারি মূল্য", "কম স্টক সতর্কতা"],
    },
  };
  return profiles[key] || profiles.fashion;
}

export function getIndustryLabel(industry?: string, lang: "bn" | "en" = "en"): string {
  const map: Record<string, { en: string; bn: string }> = {
    restaurant: { en: "Restaurant & Cafe ERP", bn: "রেস্তোরাঁ ও ক্যাফে ইআরপি" },
    fashion: { en: "Fashion & Apparel ERP", bn: "ফ্যাশন ও গার্মেন্টস ইআরপি" },
    pharmacy: { en: "Pharmacy & Healthcare ERP", bn: "ফার্মেসি ও হেলথকেয়ার ইআরপি" },
    electronics: { en: "Electronics & Mobile ERP", bn: "ইলেকট্রনিক্স ও মোবাইল ইআরপি" },
    grocery: { en: "Grocery & Superstore ERP", bn: "গ্রোসারি ও সুপারশপ ইআরপি" },
    retail: { en: "Retail & Wholesale ERP", bn: "রিটেইল ও হোলসেল ইআরপি" },
  };
  const key = (industry || "retail").toLowerCase();
  const entry = map[key] || map.retail;
  return lang === "bn" ? entry.bn : entry.en;
}

const STORAGE_KEY = "urobili_module_config";

export function readModuleConfig(industry?: string, serverConfig?: Partial<ModuleConfig> | null): ModuleConfig {
  const defaultDisabled = getIndustryDefaultDisabledModules(industry);
  let local: Partial<ModuleConfig> | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) local = JSON.parse(raw);
    } catch {}
  }
  const source = serverConfig || local;
  return {
    disabledModules: Array.isArray(source?.disabledModules) ? source.disabledModules : defaultDisabled,
    disabledKpis: Array.isArray(source?.disabledKpis) ? source.disabledKpis : [],
    customModules: Array.isArray(source?.customModules) ? source.customModules : [],
  };
}

export function writeModuleConfig(cfg: ModuleConfig) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      window.dispatchEvent(new Event("urobili-module-config-updated"));
    } catch {}
  }
}
