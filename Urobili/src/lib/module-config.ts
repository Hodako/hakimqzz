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
    case "electronics":
      return ["/restaurant", "/somiti"];
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
  const key = (industry || "retail").toLowerCase();
  const profiles: Record<string, IndustryProfile> = {
    restaurant: {
      id: "restaurant",
      labelEn: "Restaurant & Cafe ERP",
      labelBn: "রেস্তোরাঁ ও ক্যাফে ইআরপি",
      taglineEn: "Multi-floor tables, waiter terminal, kitchen KOT & cashier billing queue",
      taglineBn: "মাল্টি-ফ্লোর টেবিল, ওয়েটার টার্মিনাল, কিচেন টিকেট ও ক্যাশিয়ার বিল কিউ",
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
      labelEn: "Fashion & Boutique ERP",
      labelBn: "ফ্যাশন ও বুটিক ইআরপি",
      taglineEn: "Size & color variants, garment hangtags, online orders & boutique POS",
      taglineBn: "সাইজ ও কালার ভ্যারিয়েন্ট, গার্মেন্টস হ্যাংট্যাগ, অনলাইন অর্ডার ও বুটিক পিওএস",
      quickActions: [
        { to: "/sales", labelEn: "Boutique POS", labelBn: "বুটিক পিওএস" },
        { to: "/labels", labelEn: "Print Hangtags", labelBn: "হ্যাংট্যাগ প্রিন্ট" },
        { to: "/online-sells", labelEn: "Online Orders", labelBn: "অনলাইন অর্ডার" },
      ],
      characteristicsEn: ["Size & Color Matrix", "Barcode Hangtags", "Courier & Online Sales"],
      characteristicsBn: ["সাইজ ও কালার তালিকা", "বারকোড হ্যাংট্যাগ", "কুরিয়ার ও অনলাইন বিক্রি"],
    },
    electronics: {
      id: "electronics",
      labelEn: "Electronics & Gadgets ERP",
      labelBn: "ইলেকট্রনিক্স ও গ্যাজেট ইআরপি",
      taglineEn: "IMEI & serial tracking, warranty periods & service trackback",
      taglineBn: "আইএমইআই ও সিরিয়াল ট্র্যাকিং, ওয়ারেন্টি মেয়াদ ও সার্ভিস ট্র্যাকব্যাক",
      quickActions: [
        { to: "/sales", labelEn: "Gadget POS", labelBn: "গ্যাজেট পিওএস" },
        { to: "/trackback", labelEn: "Warranty Trackback", labelBn: "ওয়ারেন্টি ট্র্যাকব্যাক" },
        { to: "/purchases", labelEn: "Stock Intake", labelBn: "স্টক ক্রয়" },
      ],
      characteristicsEn: ["IMEI / Serial Numbers", "Warranty Tracking", "Device Trackback"],
      characteristicsBn: ["আইএমইআই ও সিরিয়াল নম্বর", "ওয়ারেন্টি ট্র্যাকিং", "ডিভাইস ট্র্যাকব্যাক"],
    },
    pharmacy: {
      id: "pharmacy",
      labelEn: "Pharmacy & Healthcare ERP",
      labelBn: "ফার্মেসি ও হেলথকেয়ার ইআরপি",
      taglineEn: "Batch numbers, 90-day expiry alerts & rapid counter dispensing",
      taglineBn: "ব্যাচ নম্বর, ৯০ দিনের মেয়াদ সতর্কতা ও দ্রুত কাউন্টার বিলিং",
      quickActions: [
        { to: "/sales", labelEn: "Dispense POS", labelBn: "কাউন্টার পিওএস" },
        { to: "/purchases", labelEn: "Reorder Medicines", labelBn: "ওষুধ ক্রয়" },
        { to: "/products", labelEn: "Batch & Expiry Stock", labelBn: "ব্যাচ ও মেয়াদ স্টক" },
      ],
      characteristicsEn: ["Batch Tracking", "90-Day Expiry Alerts", "Supplier Reordering"],
      characteristicsBn: ["ব্যাচ ট্র্যাকিং", "মেয়াদ সতর্কতা", "সাপ্লায়ার ক্রয়"],
    },
    grocery: {
      id: "grocery",
      labelEn: "Grocery & Superstore ERP",
      labelBn: "মুদি ও সুপারশপ ইআরপি",
      taglineEn: "Weight & unit pricing, wholesale tiers & fast barcode checkout",
      taglineBn: "ওজন ও ইউনিট মূল্য, পাইকারি রেট ও দ্রুত বারকোড চেকআউট",
      quickActions: [
        { to: "/sales", labelEn: "Superstore POS", labelBn: "সুপারশপ পিওএস" },
        { to: "/products", labelEn: "Weight & Unit Stock", labelBn: "ওজন ও ইউনিট স্টক" },
        { to: "/customers", labelEn: "Customer Dues", labelBn: "কাস্টমার বাকি" },
      ],
      characteristicsEn: ["Kg / Litre / Pack Units", "Wholesale Pricing", "Low-Stock Alerts"],
      characteristicsBn: ["কেজি / লিটার / প্যাক", "পাইকারি মূল্য", "কম স্টক সতর্কতা"],
    },
    retail: {
      id: "retail",
      labelEn: "Retail & Wholesale ERP",
      labelBn: "রিটেইল ও হোলসেল ইআরপি",
      taglineEn: "Complete inventory, customer dues ledger, invoices & cashbox",
      taglineBn: "সম্পূর্ণ ইনভেন্টরি, কাস্টমার বাকি খাতা, ইনভয়েস ও ক্যাশবক্স",
      quickActions: [
        { to: "/sales", labelEn: "Quick POS", labelBn: "দ্রুত পিওএস" },
        { to: "/products", labelEn: "Inventory", labelBn: "পণ্য ও স্টক" },
        { to: "/parties", labelEn: "Parties & Suppliers", labelBn: "পার্টি ও সাপ্লায়ার" },
      ],
      characteristicsEn: ["Fast Barcode POS", "Customer & Party Ledger", "Multi-Branch Ready"],
      characteristicsBn: ["দ্রুত বারকোড পিওএস", "কাস্টমার ও পার্টি খাতা", "মাল্টি-ব্রাঞ্চ সাপোর্ট"],
    },
  };
  return profiles[key] || profiles.retail;
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
