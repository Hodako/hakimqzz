"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const HEADER_SLOT_ID = "urobili-primary-header-actions";
export const PRIMARY_HEADER_READY_EVENT = "urobili-primary-header-ready";

export function PrimaryHeaderSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const sync = () => {
      const el = document.getElementById(HEADER_SLOT_ID);
      if (el) setTarget(el);
    };
    sync();
    window.addEventListener(PRIMARY_HEADER_READY_EVENT, sync);
    const raf = window.requestAnimationFrame(sync);
    return () => {
      window.removeEventListener(PRIMARY_HEADER_READY_EVENT, sync);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}

export function getPrimaryHeaderTitle(pathname: string, industry?: string, lang: "en" | "bn" = "en"): string {
  const clean = (pathname || "").split("?")[0];
  if (clean === "/dashboard" || clean === "/") {
    if (industry === "restaurant") return lang === "bn" ? "রেস্তোরাঁ ড্যাশবোর্ড" : "Restaurant Dashboard";
    return lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard";
  }
  if (clean.startsWith("/restaurant")) return lang === "bn" ? "রেস্তোরাঁ পিওএস" : "Restaurant POS";
  if (clean.startsWith("/erp")) {
    const mapEn: Record<string, string> = {
      pharmacy: "Pharmacy POS & ERP",
      fashion: "Fashion & Clothing POS",
      grocery: "Groceries & Superstore POS",
      restaurant: "Restaurant ERP",
    };
    const mapBn: Record<string, string> = {
      pharmacy: "ফার্মেসি পিওএস ও ইআরপি",
      fashion: "ফ্যাশন ও ক্লদিং পিওএস",
      grocery: "মুদি ও সুপারশপ পিওএস",
      restaurant: "রেস্তোরাঁ ইআরপি",
    };
    return (lang === "bn" ? mapBn : mapEn)[industry || "fashion"] || (lang === "bn" ? "ইন্ডাস্ট্রি পিওএস" : "Industry POS");
  }
  if (clean.startsWith("/products")) {
    return industry === "restaurant"
      ? (lang === "bn" ? "রেস্তোরাঁ মেনু" : "Restaurant Menu")
      : (lang === "bn" ? "পণ্য ও স্টক" : "Products");
  }
  if (clean.startsWith("/product-analytics")) return lang === "bn" ? "পণ্য অ্যানালিটিক্স" : "Product Analytics";
  if (clean.startsWith("/reports")) return lang === "bn" ? "ব্যবসায়িক রিপোর্ট" : "Business Report";
  if (clean.startsWith("/profits")) return lang === "bn" ? "লাভ-লোকসান" : "Profit & Loss";
  if (clean.startsWith("/ai-audits")) return lang === "bn" ? "ফাইন্যান্সিয়াল অডিট এআই" : "Financial Audit AI";
  if (clean.startsWith("/cash-management")) return lang === "bn" ? "ক্যাশ ম্যানেজমেন্ট" : "Cash Management";
  if (clean.startsWith("/sales")) return lang === "bn" ? "বিক্রি ও পিওএস" : "Sales & POS";
  if (clean.startsWith("/employee-hub") || clean.startsWith("/employees")) {
    return lang === "bn" ? "কর্মচারী হাব" : "Employee Hub";
  }
  if (clean.startsWith("/settings")) return lang === "bn" ? "সেটিংস" : "Settings";
  return "";
}
