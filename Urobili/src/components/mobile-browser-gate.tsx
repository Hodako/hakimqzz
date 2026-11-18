"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  Utensils,
  BarChart3,
  ShieldCheck,
  Layers,
  CheckCircle2,
  MoreVertical,
  Languages,
  Monitor,
  ChefHat,
  ListOrdered,
  Printer,
  Users,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import "@/styles/hallmark-landing.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function UrobiliMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <polygon points="24,26 30,19 36,26 42,19 48,26 48,38 24,38" fill="#A6D4FA" />
      <polygon points="24,38.5 48,38.5 24,68" fill="#5BA4F5" />
      <line x1="28" y1="45" x2="40" y2="45" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="28" y1="51.5" x2="36.5" y2="51.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <polygon points="48,38.5 48,84 24,68" fill="#2B7DE0" />
      <polygon points="24,68 48,84 60,104" fill="#1D63DC" />
      <polygon points="48,84 72,84 60,104" fill="#154BA6" />
      <polygon points="72,84 96,68 60,104" fill="#3287E8" />
      <polygon points="72,38 96,12 96,26" fill="#C7E4FE" />
      <polygon points="72,38 96,26 72,84" fill="#2574D8" />
      <polygon points="96,26 96,68 72,84" fill="#1A58BA" />
    </svg>
  );
}

export function MobileBrowserGate({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useT();
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked_mobile_browser">("checking");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedToast, setInstalledToast] = useState(false);
  const [originUrl, setOriginUrl] = useState("https://urobili.com");
  const [activeMoment, setActiveMoment] = useState<"waiter" | "queue" | "owner">("waiter");

  useEffect(() => {
    const checkEnvironment = () => {
      if (typeof window === "undefined") return;
      setOriginUrl(window.location.origin);

      const ua = navigator.userAgent || "";
      const isCapacitor =
        !!(window as any).Capacitor ||
        window.location.protocol === "capacitor:" ||
        window.location.protocol === "file:";

      const isStandalonePWA =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      if (isCapacitor || isStandalonePWA) {
        setStatus("allowed");
        return;
      }

      const mobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const narrowTouch = window.innerWidth < 768 && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

      if (mobileUA || narrowTouch) {
        setStatus("blocked_mobile_browser");
      } else {
        setStatus((prev) => (prev === "blocked_mobile_browser" && mobileUA ? prev : "allowed"));
      }
    };

    checkEnvironment();

    const existingPrompt = (window as any).__urobiliDeferredPrompt;
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__urobiliDeferredPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      (window as any).__urobiliDeferredPrompt = null;
      setDeferredPrompt(null);
      setInstalledToast(true);
      const isStandaloneNow =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
      if (isStandaloneNow) {
        setStatus("allowed");
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("resize", checkEnvironment);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("resize", checkEnvironment);
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="hl-dose flex items-center justify-center">
        <div
          className="size-9 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--hl-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (status === "allowed") {
    return <>{children}</>;
  }

  async function handleInstallAndroidPWA() {
    const promptEvent = deferredPrompt || (typeof window !== "undefined" ? (window as any).__urobiliDeferredPrompt : null);
    if (promptEvent) {
      setInstalling(true);
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          (window as any).__urobiliDeferredPrompt = null;
          setDeferredPrompt(null);
          setInstalledToast(true);
        } else {
          setShowInstructions(true);
        }
      } catch {
        setShowInstructions(true);
      } finally {
        setInstalling(false);
      }
    } else {
      setShowInstructions(true);
      const el = document.getElementById("android-pwa-steps");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(originUrl)}`;

  return (
    <div className="hl-dose">
      {/* Dose Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@700&family=Instrument+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Morning Window Light */}
      <div className="hl-window-light" aria-hidden="true">
        <div className="hl-window-pane" style={{ top: "-12%", left: "8%" }} />
        <div className="hl-window-pane" style={{ top: "18%", right: "-6%", animationDelay: "-24s" }} />
      </div>

      {/* Floating Pill Navigation */}
      <header className="sticky top-3 z-30 px-4 pt-3">
        <nav className="hl-container hl-pill-nav px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <UrobiliMark className="w-7 h-7 shrink-0" />
            <span className="font-bold text-base tracking-tight truncate">Urobili</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLang(lang === "bn" ? "en" : "bn")}
              className="hl-btn hl-btn-sm"
              aria-label="Switch Language"
            >
              <Languages className="size-4" />
              <span>{lang === "bn" ? "EN" : "বাংলা"}</span>
            </button>
            <button
              type="button"
              onClick={handleInstallAndroidPWA}
              className="hl-btn hl-btn--primary hl-btn-sm"
            >
              <Download className="size-4" />
              <span>{lang === "bn" ? "ইনস্টল" : "Install"}</span>
            </button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pb-14">
        {/* 1. HERO BANNER: Headline + 1 Sentence + Download beside Product Screen */}
        <section className="hl-container pt-7 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold">
                  {lang === "bn"
                    ? "ফোনে Urobili পিওএস ও ইআরপি অ্যাপ ইনস্টল করুন"
                    : "Install Urobili POS & ERP Web App"}
                </h1>
                <p className="text-base" style={{ color: "var(--hl-ink-2)" }}>
                  {lang === "bn"
                    ? "দ্রুত বিলিং, ইনভেন্টরি, ইনভয়েস, ক্যাশবক্স ও সম্পূর্ণ ব্যবসার হিসাব ফোনে চালান।"
                    : "Run fast POS billing, inventory, invoices, cashbox, and full accounting on your phone."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleInstallAndroidPWA}
                  disabled={installing}
                  className="hl-btn hl-btn--primary w-full sm:w-auto"
                >
                  <Download className="size-5 shrink-0" />
                  <span>
                    {installing
                      ? lang === "bn"
                        ? "ইনস্টল হচ্ছে..."
                        : "Installing Web App..."
                      : lang === "bn"
                        ? "অ্যান্ড্রয়েড ওয়েব অ্যাপ ইনস্টল করুন"
                        : "Install Android Web App"}
                  </span>
                </button>

                <a href="#android-pwa-steps" className="hl-btn w-full sm:w-auto no-underline">
                  <Smartphone className="size-4 shrink-0" />
                  <span>{lang === "bn" ? "ইনস্টল ধাপ দেখুন" : "See 3-step guide"}</span>
                </a>
              </div>

              {installedToast && (
                <div
                  className="p-3 rounded-xl flex items-center gap-2 text-sm font-medium"
                  style={{ background: "var(--hl-accent-soft)", color: "var(--hl-ink)" }}
                >
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    {lang === "bn"
                      ? "অ্যাপ ইনস্টল সম্পন্ন হয়েছে। হোম স্ক্রিন থেকে খুলুন।"
                      : "Web App installed. Open Urobili from your home screen."}
                  </span>
                </div>
              )}
            </div>

            {/* Real Product Screen Preview (28px radius phone surface, no OS chrome) */}
            <div className="lg:col-span-6">
              <div
                className="hl-surface p-4 mx-auto max-w-sm space-y-3"
                style={{ borderRadius: "28px" }}
              >
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--hl-rule)" }}>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4" style={{ color: "var(--hl-accent)" }} />
                    <span className="font-bold text-sm">
                      {lang === "bn" ? "ইউরোবিলি সম্পূর্ণ পিওএস" : "Urobili Complete POS"}
                    </span>
                  </div>
                  <span className="hl-tag hl-mono text-xs">
                    {lang === "bn" ? "লাইভ" : "Live Sync"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border" style={{ borderColor: "var(--hl-rule)", background: "var(--hl-paper)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{lang === "bn" ? "দ্রুত বিক্রি" : "Fast POS"}</span>
                      <span className="hl-mono text-xs" style={{ color: "var(--hl-accent)" }}>80mm</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--hl-accent-deep)" }}>
                      {lang === "bn" ? "ইনভয়েস ও বিলিং" : "Invoices & Receipts"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border" style={{ borderColor: "var(--hl-rule)", background: "var(--hl-paper-2)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{lang === "bn" ? "স্টক ও মেনু" : "Stock & Menu"}</span>
                      <span className="hl-mono text-xs" style={{ color: "var(--hl-muted)" }}>QR</span>
                    </div>
                    <div className="text-xs mt-1 font-medium">
                      {lang === "bn" ? "বারকোড ও হিসাব" : "Barcode & Catalog"}
                    </div>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl flex items-center justify-between text-xs"
                  style={{ background: "var(--hl-paper-3)" }}
                >
                  <span className="font-medium flex items-center gap-1.5">
                    <ShieldCheck className="size-4" style={{ color: "var(--hl-accent)" }} />
                    <span>{lang === "bn" ? "সব ব্যবসার জন্য ইআরপি" : "Multi-Sector Cloud ERP"}</span>
                  </span>
                  <span className="hl-mono font-medium">POS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PLATFORM & INSTALL MAP / DIAGRAM */}
        <section id="android-pwa-steps" className="hl-container py-5">
          <div
            className={`hl-plastic p-5 sm:p-6 space-y-5 ${
              showInstructions ? "ring-2" : ""
            }`}
            style={{
              "--t": "var(--hl-p-thu)",
              ...(showInstructions ? { outline: "2px solid var(--hl-focus)" } : {}),
            } as React.CSSProperties}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold">
                {lang === "bn"
                  ? "অ্যান্ড্রয়েড ক্রোম থেকে ইনস্টল করার ৩টি ধাপ"
                  : "Three steps on Android Chrome"}
              </h2>
              <span className="hl-mono text-xs" style={{ color: "var(--hl-muted)" }}>
                Android 8.0+ PWA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="hl-surface p-4 space-y-2">
                <div className="hl-mono text-xs font-medium" style={{ color: "var(--hl-accent)" }}>
                  01
                </div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <MoreVertical className="size-4" style={{ color: "var(--hl-accent)" }} />
                  <span>{lang === "bn" ? "ক্রোম মেনু খুলুন" : "Open Chrome menu"}</span>
                </h3>
                <p className="text-sm" style={{ color: "var(--hl-muted)" }}>
                  {lang === "bn"
                    ? "উপরে ইনস্টল বাটনে ট্যাপ করুন অথবা Chrome-এর মেনু (⋮) আইকনে চাপ দিন।"
                    : "Tap the Install button above or tap the three-dot menu in Chrome."}
                </p>
              </div>

              <div className="hl-surface p-4 space-y-2">
                <div className="hl-mono text-xs font-medium" style={{ color: "var(--hl-accent)" }}>
                  02
                </div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Download className="size-4" style={{ color: "var(--hl-accent)" }} />
                  <span>{lang === "bn" ? "অ্যাপ ইনস্টল করুন" : "Choose Install app"}</span>
                </h3>
                <p className="text-sm" style={{ color: "var(--hl-muted)" }}>
                  {lang === "bn"
                    ? "মেনু থেকে 'Install app' অথবা 'Add to Home screen' নির্বাচন করুন।"
                    : "Select Install app or Add to Home screen and confirm."}
                </p>
              </div>

              <div className="hl-surface p-4 space-y-2">
                <div className="hl-mono text-xs font-medium" style={{ color: "var(--hl-accent)" }}>
                  03
                </div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <CheckCircle2 className="size-4" style={{ color: "var(--hl-accent)" }} />
                  <span>{lang === "bn" ? "হোম স্ক্রিন থেকে চালান" : "Launch from Home"}</span>
                </h3>
                <p className="text-sm" style={{ color: "var(--hl-muted)" }}>
                  {lang === "bn"
                    ? "হোম স্ক্রিনের Urobili আইকন থেকে সম্পূর্ণ ওয়েব অ্যাপ ওপেন করুন।"
                    : "Open the Urobili icon on your home screen for full-screen POS."}
                </p>
              </div>
            </div>

            {/* QR Code strip for sharing across staff phones */}
            <div
              className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ borderColor: "var(--hl-rule)" }}
            >
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-sm font-bold">
                  {lang === "bn"
                    ? "অন্য কর্মচারীর ফোনে খুলতে স্ক্যান করুন"
                    : "Scan to open on another staff phone"}
                </div>
                <div className="hl-mono text-xs" style={{ color: "var(--hl-muted)" }}>
                  {originUrl}
                </div>
              </div>
              <img
                src={qrUrl}
                alt="QR code to open Urobili Android Web App"
                className="w-24 h-24 rounded-xl border bg-white p-1 shrink-0"
                style={{ borderColor: "var(--hl-rule)" }}
              />
            </div>
          </div>
        </section>

        {/* 3. BEFORE & AFTER: Mobile Browser vs Installed Android Web App */}
        <section className="hl-container py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="hl-plastic p-5 space-y-3" style={{ "--t": "var(--hl-p-mon)" } as React.CSSProperties}>
              <div className="hl-mono text-xs" style={{ color: "var(--hl-muted)" }}>
                {lang === "bn" ? "আগে" : "Before"}
              </div>
              <h3 className="text-lg font-bold">
                {lang === "bn" ? "সাধারণ ফোন ব্রাউজার" : "Mobile Phone Browser"}
              </h3>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--hl-ink-2)" }}>
                <li>{lang === "bn" ? "অ্যাড্রেস বার ও ব্রাউজার সীমাবদ্ধতা" : "Browser address bar and tab clutter"}</li>
                <li>{lang === "bn" ? "POS ও বিলিং টার্মিনাল বন্ধ থাকে" : "POS and billing terminals stay locked"}</li>
              </ul>
            </div>

            <div className="hl-plastic p-5 space-y-3" style={{ "--t": "var(--hl-p-thu)" } as React.CSSProperties}>
              <div className="hl-mono text-xs" style={{ color: "var(--hl-accent-deep)" }}>
                {lang === "bn" ? "পরে" : "After"}
              </div>
              <h3 className="text-lg font-bold">
                {lang === "bn" ? "ইনস্টল করা Urobili ওয়েব অ্যাপ" : "Installed Urobili Web App"}
              </h3>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--hl-ink-2)" }}>
                <li>{lang === "bn" ? "ফুল-স্ক্রিন POS বিলিং, স্টক ও ইনভয়েস কন্ট্রোল" : "Full-screen POS billing, inventory, and invoice control"}</li>
                <li>{lang === "bn" ? "লাইভ ক্যাশবক্স, রিপোর্ট ও থার্মাল প্রিন্ট সাপোর্ট" : "Live cashbox, reports, and thermal receipt printing"}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. SWITCHER: Named Moments in Screens */}
        <section className="hl-container py-5">
          <div className="hl-surface p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {lang === "bn" ? "সম্পূর্ণ পিওএস ও ইআরপি ফিচার" : "Complete POS & ERP Modules"}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMoment("waiter")}
                  className={`hl-btn hl-btn-sm ${activeMoment === "waiter" ? "hl-btn--primary" : ""}`}
                >
                  <Printer className="size-3.5" />
                  <span>{lang === "bn" ? "POS ও বিলিং" : "POS & Billing"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMoment("queue")}
                  className={`hl-btn hl-btn-sm ${activeMoment === "queue" ? "hl-btn--primary" : ""}`}
                >
                  <Layers className="size-3.5" />
                  <span>{lang === "bn" ? "স্টক ও মেনু" : "Stock & Menu"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMoment("owner")}
                  className={`hl-btn hl-btn-sm ${activeMoment === "owner" ? "hl-btn--primary" : ""}`}
                >
                  <BarChart3 className="size-3.5" />
                  <span>{lang === "bn" ? "রিপোর্ট ও ব্যাকআপ" : "Owner ERP"}</span>
                </button>
              </div>
            </div>

            {activeMoment === "waiter" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <Printer className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "৮০ মিমি থার্মাল প্রিন্ট" : "80mm thermal receipts"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "বিল প্রিন্ট, কাস্টম ইনভয়েস ও ক্যাশবক্স সিঙ্ক।" : "Print crisp receipts and sync cashbox automatically."}
                  </p>
                </div>
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <ListOrdered className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "বিল কিউ ও হোল্ড" : "Billing queue and drafts"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "অর্ডার কিউতে পাঠিয়ে দ্রুত বিল নিষ্পত্তি করুন।" : "Queue pending bills and settle payments in one tap."}
                  </p>
                </div>
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <Users className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "কাস্টমার ও বাকি খাতা" : "Customers and dues"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "নগদ, বাকি ও কুরিয়ার বিক্রি সহজে ট্র্যাক করুন।" : "Track cash, credit dues, and online deliveries."}
                  </p>
                </div>
              </div>
            )}

            {activeMoment === "queue" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <Layers className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "ইন্ডাস্ট্রি ভিত্তিক ERP" : "Sector-tailored catalogs"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "ফ্যাশন, ফার্মেসি, গ্যাজেট, মুদি ও রেস্তোরাঁ সাপোর্ট।" : "Tailored for Fashion, Pharmacy, Gadgets, Grocery, and Dining."}
                  </p>
                </div>
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <Utensils className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "মাল্টি-ফ্লোর ও মেনু" : "Menus and floor plans"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "ডাইন-ইন টেবিল, কিচেন KOT ও ড্রিঙ্কস স্টক।" : "Dining floor plans, kitchen tickets, and optional drink stock."}
                  </p>
                </div>
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <CheckCircle2 className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "বারকোড ও মেয়াদ অ্যালার্ট" : "Barcode and expiry alerts"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "কম স্টক, ব্যাচ ও মেয়াদোত্তীর্ণ সতর্কতা পান।" : "Real-time low stock, batch, and expiry notifications."}
                  </p>
                </div>
              </div>
            )}

            {activeMoment === "owner" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <BarChart3 className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "লাইভ আয় ও লাভ" : "Live revenue and profit"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "প্রতিদিনের বিক্রয় ও টেবিল ক্যাপাসিটি দেখুন।" : "Monitor daily sales and seat capacity across floors."}
                  </p>
                </div>
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <ShieldCheck className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "PostgreSQL ক্লাউড" : "PostgreSQL isolation"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "প্রতিটি ব্যবসার ডাটা আলাদা স্কিমায় সুরক্ষিত।" : "Every tenant account and record lives in PostgreSQL."}
                  </p>
                </div>
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--hl-rule)" }}>
                  <Monitor className="size-5 mb-2" style={{ color: "var(--hl-accent)" }} />
                  <div className="font-bold">{lang === "bn" ? "ডেস্কটপ সাপোর্ট" : "Desktop ready"}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--hl-muted)" }}>
                    {lang === "bn" ? "ডেস্কটপ ব্রাউজারে সম্পূর্ণ মালিক প্যানেল চালু থাকে।" : "Open on desktop anytime for full back-office control."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5. STATEMENT INK BAND + CLOSING DOWNLOAD */}
        <section className="hl-container py-4">
          <div className="hl-band-ink rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold">
                {lang === "bn"
                  ? "রেস্তোরাঁ, ফ্যাশন, ফার্মেসি ও রিটেইল ইআরপি"
                  : "Built for restaurants, fashion, pharmacy, and retail"}
              </h2>
              <p className="text-sm" style={{ color: "var(--hl-accent-soft)" }}>
                {lang === "bn"
                  ? "অ্যান্ড্রয়েড ওয়েব অ্যাপ ইনস্টল করে এখনই শুরু করুন।"
                  : "Install the Android Web App to launch your terminal."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstallAndroidPWA}
              className="hl-btn hl-btn--primary shrink-0 w-full sm:w-auto"
            >
              <Download className="size-5" />
              <span>{lang === "bn" ? "ওয়েব অ্যাপ ইনস্টল করুন" : "Install Android Web App"}</span>
            </button>
          </div>
        </section>
      </main>

      {/* Statement Footer */}
      <footer className="hl-container pb-10 pt-2 border-t text-xs flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderColor: "var(--hl-rule)", color: "var(--hl-muted)" }}>
        <span className="font-medium">
          {lang === "bn" ? "Urobili ইআরপি ও পিওএস" : "Urobili POS and ERP"}
        </span>
        <span className="hl-mono">
          {lang === "bn" ? "ডেস্কটপ ও ইনস্টল করা Android PWA-তে সচল" : "Runs on Desktop and Installed Android PWA"}
        </span>
      </footer>
    </div>
  );
}
