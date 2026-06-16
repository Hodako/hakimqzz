"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart, Receipt, PiggyBank, DollarSign,
  Banknote, BarChart3, Settings, FileText,
  LogOut, TrendingUp, TrendingDown, GripVertical, Palette,
  Layout, Type, Image as ImageIcon, Sparkles, LayoutGrid, AlignLeft, AlignCenter, AlignRight
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, resolvePermissions } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const businessLinks = [
  { to: "/invoices",       labelKey: "invoice_generator", desc: "Create & customize invoices", icon: FileText,     perm: "sales"      as const },
  { to: "/purchases",      labelKey: "new_purchase",    desc: "Log product inventory buys", icon: ShoppingCart, perm: "purchases"  as const },
  { to: "/online-sells",   labelKey: "online_sell",     desc: "Track web and online sales", icon: DollarSign,   perm: "sales"      as const },
  { to: "/dues",           labelKey: "due",             desc: "Total customer outstanding dues", icon: Banknote, perm: "parties"    as const },
  { to: "/settings",       labelKey: "settings",        desc: "Business profile & settings", icon: Settings,     perm: "settings"   as const },
] as const;

const financeLinks = [
  { to: "/expenses",       labelKey: "expenses",        desc: "Record overhead expenses", icon: Receipt, imageUrl: "https://img.icons8.com/color/48/tax.png", perm: "expenses"   as const },
  { to: "/somiti",         labelKey: "somiti",          desc: "Manage Somiti accounts", icon: PiggyBank,    perm: "expenses"   as const },
  { to: "/cash-management",labelKey: "cash_management", desc: "Cashbox ledger & cashflow", icon: Banknote,     perm: "expenses"   as const },
  { to: "/profits",        labelKey: "profit",          desc: "Sales margins & net profits", icon: TrendingUp,  perm: "reports"    as const },
  { to: "/losses",         labelKey: "losses",          desc: "Analyze transactional losses", icon: TrendingDown, perm: "reports" as const },
  { to: "/trackback",      labelKey: "trackback",       desc: "Comparative metrics chart", icon: BarChart3,    perm: "reports"    as const },
  { to: "/reports",        labelKey: "reports_generator", desc: "Generate custom PDF reports", icon: FileText, perm: "reports"    as const },
] as const;

export default function MorePage() {
  const { lang, t } = useT();
  const { user, logout, isUploading, uploadProgress, uploadProfilePic } = useAuth();
  const perms = resolvePermissions(user?.role ?? "employee", user?.permissions);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme states
  const [theme, setTheme] = useState({
    primaryColor: "",
    backgroundColor: "",
    bgImage: "",
    bgImageOpacity: 0.1,
    fontFamily: "",
    fontSize: "",
    textColor: "",
    density: "standard",
    isMaterialUI: false,
    uiStyle: "default",
    bevelStrength: "medium",
    glowEnabled: false,
  });

  // KPI config state
  const [kpiConfig, setKpiConfig] = useState({
    align: "left",
    size: "standard",
    columns: 2,
    order: ["credit_sale", "cash_sale", "online_sell", "profit", "loss", "expense", "due", "cashbox"]
  });
  const [kpiDraggedIndex, setKpiDraggedIndex] = useState<number | null>(null);

  const kpiLabels: Record<string, string> = {
    credit_sale: lang === "bn" ? "বাকি বিক্রয়" : "Credit Sale",
    cash_sale: lang === "bn" ? "নগদ বিক্রয়" : "Cash Sale",
    online_sell: lang === "bn" ? "অনলাইন বিক্রয়" : "Online Sale",
    profit: lang === "bn" ? "মোট মুনাফা" : "Total Profit",
    loss: lang === "bn" ? "মোট ক্ষতি" : "Total Loss",
    expense: lang === "bn" ? "মোট খরচ" : "Total Expenses",
    due: lang === "bn" ? "মোট বাকি" : "Total Due",
    cashbox: lang === "bn" ? "ক্যাশবক্স" : "Cashbox",
  };

  const updateKpiConfig = (patch: Partial<typeof kpiConfig>) => {
    const next = { ...kpiConfig, ...patch };
    setKpiConfig(next);
    localStorage.setItem("hz_kpi_config", JSON.stringify(next));
    window.dispatchEvent(new Event("hz-kpi-config-updated"));
  };

  const handleKpiDragStart = (idx: number) => setKpiDraggedIndex(idx);
  const handleKpiDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (kpiDraggedIndex === null || kpiDraggedIndex === idx) return;
    const list = [...kpiConfig.order];
    const item = list[kpiDraggedIndex];
    list.splice(kpiDraggedIndex, 1);
    list.splice(idx, 0, item);
    setKpiDraggedIndex(idx);
    setKpiConfig(prev => ({ ...prev, order: list }));
  };
  const handleKpiDragEnd = () => {
    setKpiDraggedIndex(null);
    localStorage.setItem("hz_kpi_config", JSON.stringify(kpiConfig));
    window.dispatchEvent(new Event("hz-kpi-config-updated"));
  };

  // Widget ordering state
  const [widgets, setWidgets] = useState<any[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Load theme config
    const savedTheme = localStorage.getItem("hz_custom_theme");
    if (savedTheme) {
      try {
        setTheme(prev => ({ ...prev, ...JSON.parse(savedTheme) }));
      } catch (e) {
        console.error(e);
      }
    }

    // Load KPI config
    const savedKpi = localStorage.getItem("hz_kpi_config");
    if (savedKpi) {
      try {
        setKpiConfig(prev => ({ ...prev, ...JSON.parse(savedKpi) }));
      } catch (e) {
        console.error(e);
      }
    }

    // Load widget order
    const savedOrder = localStorage.getItem("hz_dashboard_widget_order");
    const defaultOrder = ['kpis', 'valuations', 'graphs', 'reminders', 'quickLinks', 'bestSelling', 'recent'];
    let orderList = defaultOrder;
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0) orderList = parsed;
      } catch (e) {
        console.error(e);
      }
    }
    
    // Map ids to names
    const getWidgetName = (id: string) => {
      switch(id) {
        case 'kpis': return lang === "bn" ? "মূল সূচকসমূহ (KPI গ্রিড)" : "Key Metrics (KPI Grid)";
        case 'valuations': return lang === "bn" ? "ইনভেন্টরি স্টক মূল্যায়ন" : "Inventory Stock Valuation";
        case 'graphs': return lang === "bn" ? "চার্ট ও গ্রাফিক্স বিশ্লেষণ" : "Charts & Analytics Graph";
        case 'reminders': return lang === "bn" ? "রিমাইন্ডার ও টাস্ক লিস্ট" : "Reminders & Task List";
        case 'quickLinks': return lang === "bn" ? "শর্টকাট কুইক লিংকস" : "Shortcut Quick Links";
        case 'bestSelling': return lang === "bn" ? "বেস্ট সেলিং পণ্যসমূহ" : "Best Selling Items";
        case 'recent': return lang === "bn" ? "সাম্প্রতিক বিক্রয় কার্যক্রম" : "Recent Operations Feed";
        default: return id;
      }
    };

    setWidgets(orderList.map(id => ({ id, name: getWidgetName(id) })));
  }, [lang]);

  const updateThemeField = (field: string, value: any) => {
    const nextTheme = { ...theme, [field]: value };
    setTheme(nextTheme);
    localStorage.setItem("hz_custom_theme", JSON.stringify(nextTheme));
    window.dispatchEvent(new Event("hz-theme-updated"));
  };

  const handleResetTheme = () => {
    localStorage.removeItem("hz_custom_theme");
    setTheme({
      primaryColor: "",
      backgroundColor: "",
      bgImage: "",
      bgImageOpacity: 0.1,
      fontFamily: "",
      fontSize: "",
      textColor: "",
      density: "standard",
      isMaterialUI: false,
      uiStyle: "default",
      bevelStrength: "medium",
      glowEnabled: false,
    });
    window.dispatchEvent(new Event("hz-theme-updated"));
    toast.success(lang === "bn" ? "থিম রিসেট সফল হয়েছে" : "Theme settings reset successfully");
  };

  // Drag and Drop Logic
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const list = [...widgets];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setWidgets(list);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    const order = widgets.map(w => w.id);
    localStorage.setItem("hz_dashboard_widget_order", JSON.stringify(order));
    window.dispatchEvent(new Event("hz-dashboard-order-updated"));
    toast.success(lang === "bn" ? "ড্যাশবোর্ড ক্রম হালনাগাদ হয়েছে" : "Dashboard widget order updated");
  };

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadProfilePic(file);
    }
  };

  const visibleBiz = businessLinks.filter(item => canAccess(perms, item.perm));
  const visibleFin = financeLinks.filter(item => canAccess(perms, item.perm));

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Preloaded Gradient Presets
  const bgPresets = [
    { name: "None", url: "" },
    { name: "Flowerism Pattern", url: "/flowerism_preset.png" },
    { name: "Glass Gradient", url: "/glassmorphism_preset.png" },
    { name: "Silk Mesh", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600&auto=format&fit=crop" },
    { name: "Abstract Gradient", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" },
    { name: "Dark Texture", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop" },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* Profile Header */}
      <Card className="p-4 bg-gradient-to-br from-primary/10 via-indigo-500/5 to-background border-primary/20 beveled-card">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 select-none">
            <Avatar
              onClick={handleAvatarClick}
              className={`size-14 border-2 border-background shadow-md shrink-0 cursor-pointer transition-transform active:scale-95 group hover:brightness-90 ${isUploading ? 'pointer-events-none' : ''}`}
            >
              <AvatarImage src={user?.avatar_url || "https://png.pngtree.com/png-vector/20231019/ourmid/pngtree-user-profile-avatar-png-image_10211467.png"} alt="Profile" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-bold text-lg">{initials}</AvatarFallback>
            </Avatar>

            {isUploading ? (
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-[9px] text-white font-bold pointer-events-none">
                <span>{uploadProgress}%</span>
                <div className="w-8 h-1 bg-white/30 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <div
                onClick={handleAvatarClick}
                className="absolute inset-0 bg-black/35 opacity-0 hover:opacity-100 rounded-full flex items-center justify-center text-[8px] text-white font-medium cursor-pointer transition-opacity pointer-events-none"
              >
                {lang === "bn" ? "আপলোড" : "Upload"}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-zinc-950 dark:text-zinc-50 truncate">{user?.full_name || "User"}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border uppercase ${
                user?.role === "owner"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              }`}>
                {user?.role === "owner" ? (lang === "bn" ? "মালিক" : "Owner") : (lang === "bn" ? "কর্মচারী" : "Employee")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 uppercase tracking-wider">
              {user?.business_name || "Dream Fashion"}
            </div>
          </div>
        </div>
      </Card>

      {/* Group 1: Business Operations */}
      {visibleBiz.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {lang === "bn" ? "ব্যবসা পরিচালনা" : "Business Operations"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {visibleBiz.map(({ to, labelKey, desc, icon: Icon }) => (
              <Link key={to} href={to} className="block group">
                <Card className="p-3.5 h-full flex flex-col justify-between gap-3 hover:border-primary/30 transition-all active:scale-[0.98] beveled-card bg-card/60 backdrop-blur-sm">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary grid place-items-center shrink-0 border border-primary/10 shadow-sm">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">{t(labelKey as any)}</div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{desc}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Group 2: Accounting & Finance */}
      {visibleFin.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {lang === "bn" ? "হিসাব ও বিশ্লেষণ" : "Accounting & Financials"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {visibleFin.map(({ to, labelKey, desc, icon: Icon, imageUrl }: any) => (
              <Link key={to} href={to} className="block group">
                <Card className="p-3.5 h-full flex flex-col justify-between gap-3 hover:border-indigo-500/30 transition-all active:scale-[0.98] beveled-card bg-card/60 backdrop-blur-sm">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 grid place-items-center shrink-0 border border-indigo-500/10 shadow-sm overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} className="size-5 object-contain" alt={t(labelKey as any)} />
                    ) : (
                      <Icon className="size-4.5" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">{t(labelKey as any)}</div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{desc}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Group 3: Themes Customization */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Palette className="size-4 text-primary" />
          {lang === "bn" ? "থিম ও লেআউট কাস্টমাইজেশন" : "Themes & Customization"}
        </h3>
        
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border beveled-card space-y-5">
          {/* Design Style Selector */}
          <div className="space-y-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="size-4 text-primary" />
              <span>{lang === "bn" ? "ইউজার ইন্টারফেস ডিজাইন স্টাইল" : "User Interface Design Style"}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "default", label: lang === "bn" ? "ডিফল্ট গ্লাস" : "Default Glass", icon: Layout, desc: lang === "bn" ? "আধুনিক কাঁচ ও বেভেল" : "Standard glass & bevel", setup: { uiStyle: "default", isMaterialUI: false, bgImage: "" } },
                { id: "morphism", label: lang === "bn" ? "নিউমর্ফিজম" : "Neumorphism", icon: Palette, desc: lang === "bn" ? "নরম ত্রিমাত্রিক ছায়া" : "Soft 3D extruded shadows", setup: { uiStyle: "morphism", isMaterialUI: false, fontFamily: "Nunito, sans-serif", bgImage: "" } },
                { id: "brutalism", label: lang === "bn" ? "ব্রুটালিজম" : "Brutalism", icon: LayoutGrid, desc: lang === "bn" ? "কঠোর কালো বর্ডার" : "Thick borders & monospace", setup: { uiStyle: "brutalism", isMaterialUI: false, fontFamily: "'Fira Code', monospace", bgImage: "" } },
                { id: "new-brutalism", label: lang === "bn" ? "নিও-ব্রুটালিজম" : "Neo-Brutalism", icon: Sparkles, desc: lang === "bn" ? "উজ্জ্বল কার্টুনিশ" : "High contrast colorful", setup: { uiStyle: "new-brutalism", isMaterialUI: false, fontFamily: "Poppins, sans-serif", bgImage: "" } },
                { id: "glassmorphic", label: lang === "bn" ? "গ্লাসমর্ফিজম" : "Glassmorphism", icon: ImageIcon, desc: lang === "bn" ? "স্বচ্ছ ফ্রস্টেড গ্লাস" : "Frosted glass on gradient", setup: { uiStyle: "glassmorphism", isMaterialUI: false, bgImage: "/glassmorphism_preset.png", bgImageOpacity: 0.22 } },
                { id: "flowerism", label: lang === "bn" ? "ফ্লাওয়ারিজম" : "Flowerism", icon: Sparkles, desc: lang === "bn" ? "ফ্লোরাল নরম পেস্টেল" : "Organic pastel floral theme", setup: { uiStyle: "flowerism", isMaterialUI: false, bgImage: "/flowerism_preset.png", bgImageOpacity: 0.15, primaryColor: "#f43f5e" } },
                { id: "material", label: lang === "bn" ? "মেটেরিয়াল ইউআই" : "Material UI", icon: Settings, desc: lang === "bn" ? "ফ্ল্যাট এলিভেশন ছায়া" : "Standard flat elevation", setup: { uiStyle: "default", isMaterialUI: true, fontFamily: "Roboto, sans-serif", bgImage: "" } }
              ].map(s => {
                const isActive = s.id === "material" ? theme.isMaterialUI : (theme.uiStyle === s.id && !theme.isMaterialUI);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const next = { ...theme, ...s.setup, uiStyle: s.setup.uiStyle as any };
                      setTheme(next);
                      localStorage.setItem("hz_custom_theme", JSON.stringify(next));
                      window.dispatchEvent(new Event("hz-theme-updated"));
                      toast.success(lang === "bn" ? `${s.label} স্টাইল লোড হয়েছে` : `Loaded ${s.label} style`);
                    }}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all duration-200 active:scale-95 cursor-pointer hover:bg-muted/10 ${
                      isActive 
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30" 
                        : "border-border bg-card/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`size-5 rounded-lg grid place-items-center ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <s.icon className="size-3" />
                      </div>
                      <span className="font-semibold text-xs text-foreground truncate">{s.label}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground leading-normal">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Bevels & Glows */}
          <div className="space-y-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="size-4 text-indigo-500" />
              <span>{lang === "bn" ? "বর্ডার বেভেল এবং নিয়ন গ্লো ইফেক্টস" : "Bevels & Glow Effects"}</span>
            </div>

            <div className="space-y-2">
              {/* Bevel selector */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "বেভেল স্টাইল (Bevel Strength)" : "Bevel Style & Highlight"}</Label>
                <div className="flex bg-muted rounded-lg p-0.5 text-xs w-full">
                  {[
                    { id: "none", label: lang === "bn" ? "কিছু না" : "None" },
                    { id: "light", label: lang === "bn" ? "হালকা" : "Light" },
                    { id: "medium", label: lang === "bn" ? "মাঝারি" : "Medium" },
                    { id: "heavy", label: lang === "bn" ? "গাঢ়" : "Heavy" }
                  ].map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => updateThemeField("bevelStrength", b.id)}
                      className={`flex-1 py-1 rounded-md text-center font-medium transition-all ${
                        theme.bevelStrength === b.id
                          ? "bg-background text-foreground shadow font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glow toggle */}
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-semibold text-foreground">{lang === "bn" ? "নিওন গ্লো ইফেক্ট সক্রিয় করুন" : "Enable Neon Glow Effects"}</Label>
                  <p className="text-[9px] text-muted-foreground">{lang === "bn" ? "কার্ড এবং সক্রিয় বাটনে সুন্দর ব্যাকলাইট গ্লো ছায়ো" : "Adds backlighting glows matching the brand accent"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateThemeField("glowEnabled", !theme.glowEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    theme.glowEnabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      theme.glowEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section A: Typography */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Type className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "টাইপোগ্রাফি ও ফন্ট" : "Typography & Fonts"}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ফন্ট ফ্যামিলি" : "Font Family"}</Label>
                <select
                  value={theme.fontFamily}
                  onChange={e => updateThemeField("fontFamily", e.target.value)}
                  className="w-full h-8 rounded border border-border bg-background px-2 text-xs"
                >
                  <option value="">{lang === "bn" ? "ডিফল্ট ফন্ট" : "Default Font"}</option>
                  <option value="Roboto, sans-serif">Roboto (Google — Clean)</option>
                  <option value="Montserrat, sans-serif">Montserrat (Google — Bold)</option>
                  <option value="Nunito, sans-serif">Nunito (Google — Rounded)</option>
                  <option value="Ubuntu, sans-serif">Ubuntu (Google — Friendly)</option>
                  <option value="'Playfair Display', serif">Playfair Display (Elegant Serif)</option>
                  <option value="Poppins, 'Hind Siliguri', sans-serif">Poppins & Hind Siliguri (Modern)</option>
                  <option value="Lora, Georgia, serif">Lora (Classic Serif)</option>
                  <option value="'Times New Roman', Times, serif">Times New Roman (Traditional Serif)</option>
                  <option value="'Fira Code', monospace">Fira Code (Developer Mono)</option>
                  <option value="system-ui, -apple-system, sans-serif">System UI (Native OS)</option>
                  <option value="sans-serif">Sans-Serif (Browser Default)</option>
                  <option value="Arial, Helvetica, sans-serif">Arial / Helvetica (Classic)</option>
                  <option value="Georgia, 'Times New Roman', serif">Georgia (Elegant Serif)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <Label>{lang === "bn" ? "ফন্ট সাইজ (স্কেল)" : "Base Font Size"}</Label>
                  <span className="font-mono">{theme.fontSize || "16px"}</span>
                </div>
                <input
                  type="range"
                  min="13"
                  max="22"
                  step="1"
                  value={parseInt(theme.fontSize || "16")}
                  onChange={e => updateThemeField("fontSize", `${e.target.value}px`)}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section B: Colors & Styling */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Palette className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "রং ও প্যালেট" : "Colors & Aesthetics"}</span>
            </div>

            <div className="space-y-3">
              {/* Accent Color Preset Buttons */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "অ্যাকসেন্ট রং (থিম কালার)" : "Primary Brand Color"}</Label>
                <div className="flex gap-2 flex-wrap items-center pt-1">
                  {[
                    { hex: "#10b981", label: "Green" },
                    { hex: "#6366f1", label: "Indigo" },
                    { hex: "#0ea5e9", label: "Sky" },
                    { hex: "#f97316", label: "Orange" },
                    { hex: "#f43f5e", label: "Rose" },
                  ].map(c => (
                    <button
                      key={c.hex}
                      onClick={() => updateThemeField("primaryColor", c.hex)}
                      className={`size-6 rounded-full border-2 transition-transform active:scale-90 ${
                        theme.primaryColor === c.hex ? "border-foreground scale-110 shadow-sm" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  
                  {/* Custom Color Selector */}
                  <div className="flex items-center gap-1.5 border border-border rounded px-1.5 py-0.5 bg-background">
                    <input
                      type="color"
                      value={theme.primaryColor || "#10b981"}
                      onChange={e => updateThemeField("primaryColor", e.target.value)}
                      className="size-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-[9px] font-mono">{theme.primaryColor || "#10b981"}</span>
                  </div>
                </div>
              </div>

              {/* Text and Background Custom Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ব্যাকগ্রাউন্ড রং" : "Background Color"}</Label>
                  <div className="flex items-center gap-1.5 border border-border rounded px-2 py-1 bg-background h-8">
                    <input
                      type="color"
                      value={theme.backgroundColor || "#fafafa"}
                      onChange={e => updateThemeField("backgroundColor", e.target.value)}
                      className="size-5 rounded cursor-pointer"
                    />
                    <span className="text-[9px] font-mono truncate">{theme.backgroundColor || "Default"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "টেক্সট রং" : "Text Color"}</Label>
                  <div className="flex items-center gap-1.5 border border-border rounded px-2 py-1 bg-background h-8">
                    <input
                      type="color"
                      value={theme.textColor || "#18181b"}
                      onChange={e => updateThemeField("textColor", e.target.value)}
                      className="size-5 rounded cursor-pointer"
                    />
                    <span className="text-[9px] font-mono truncate">{theme.textColor || "Default"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Density & Spacing */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Layout className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "প্যাডিং ও লেআউট ডেনসিটি" : "Density & Spacing"}</span>
            </div>
            
            <div className="flex bg-muted rounded-lg p-0.5 text-xs w-full justify-between">
              {[
                { id: "compact", label: lang === "bn" ? "কম্প্যাক্ট" : "Compact" },
                { id: "standard", label: lang === "bn" ? "স্ট্যান্ডার্ড" : "Standard" },
                { id: "cozy", label: lang === "bn" ? "কোজি (বড়)" : "Cozy" },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => updateThemeField("density", d.id)}
                  className={`flex-1 py-1 rounded-md text-center font-medium transition-all ${
                    theme.density === d.id ? "bg-background text-foreground shadow" : "text-muted-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section D: KPI Card Customization */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <LayoutGrid className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "KPI কার্ড কাস্টমাইজেশন" : "KPI Card Customization"}</span>
            </div>

            {/* KPI Alignment */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "কার্ড টেক্সট অ্যালাইনমেন্ট" : "Card Text Alignment"}</Label>
              <div className="flex gap-2">
                {(["left", "center", "right"] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => updateKpiConfig({ align: a })}
                    className={`flex-1 h-8 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                      kpiConfig.align === a
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {a === "left" && <AlignLeft className="size-3.5" />}
                    {a === "center" && <AlignCenter className="size-3.5" />}
                    {a === "right" && <AlignRight className="size-3.5" />}
                    {lang === "bn" ? (a === "left" ? "বাম" : a === "center" ? "মাঝ" : "ডান") : (a === "left" ? "Left" : a === "center" ? "Center" : "Right")}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Card Size */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "কার্ড সাইজ" : "Card Size"}</Label>
              <div className="flex bg-muted rounded-lg p-0.5 text-xs w-full">
                {(["small", "standard", "large"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => updateKpiConfig({ size: s })}
                    className={`flex-1 py-1.5 rounded-md text-center font-medium transition-all capitalize ${
                      kpiConfig.size === s
                        ? "bg-background text-foreground shadow font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {lang === "bn" ? (s === "small" ? "ছোট" : s === "standard" ? "স্ট্যান্ডার্ড" : "বড়") : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Columns */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "কলাম সংখ্যা (মোবাইল)" : "Columns per Row (Mobile)"}</Label>
              <div className="flex bg-muted rounded-lg p-0.5 text-xs">
                {[1, 2, 3].map(c => (
                  <button
                    key={c}
                    onClick={() => updateKpiConfig({ columns: c })}
                    className={`flex-1 py-1.5 rounded-md text-center font-medium transition-all ${
                      kpiConfig.columns === c
                        ? "bg-background text-foreground shadow font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {c} {lang === "bn" ? "কলাম" : "Col"}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Drag-and-Drop Order */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "KPI ক্রম (ড্র্যাগ করে পরিবর্তন করুন)" : "KPI Order (Drag to reorder)"}</Label>
              <div className="space-y-1">
                {kpiConfig.order.map((id, idx) => (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handleKpiDragStart(idx)}
                    onDragOver={(e) => handleKpiDragOver(e, idx)}
                    onDragEnd={handleKpiDragEnd}
                    className={`p-2 bg-background border border-border/75 rounded-lg flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all select-none hover:bg-muted/20 ${
                      kpiDraggedIndex === idx ? "opacity-40 scale-[0.98] border-primary" : ""
                    }`}
                  >
                    <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground flex-1">{kpiLabels[id] || id}</span>
                    <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section E: Background Image */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ImageIcon className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "ব্যাকগ্রাউন্ড ছবি" : "Background Image"}</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ছবি ইউআরএল (Image URL)" : "Custom Background Image URL"}</Label>
                <Input
                  className="bg-background h-8 text-xs placeholder:text-[10px]"
                  placeholder="https://example.com/bg.jpg"
                  value={theme.bgImage}
                  onChange={e => updateThemeField("bgImage", e.target.value)}
                />
              </div>

              {theme.bgImage && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <Label>{lang === "bn" ? "ছবির অপাসিটি" : "Background Opacity"}</Label>
                    <span className="font-mono">{Math.round(theme.bgImageOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.40"
                    step="0.01"
                    value={theme.bgImageOpacity}
                    onChange={e => updateThemeField("bgImageOpacity", parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Presets Grid */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{lang === "bn" ? "ডিফল্ট ব্যাকগ্রাউন্ড প্রিসেটস" : "Quick Image Presets"}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {bgPresets.map(p => (
                    <button
                      key={p.name}
                      onClick={() => {
                        updateThemeField("bgImage", p.url);
                        updateThemeField("bgImageOpacity", 0.1);
                      }}
                      className={`h-10 text-[9px] font-semibold border rounded-lg overflow-hidden flex items-center justify-center p-1 bg-cover bg-center text-center transition-all ${
                        theme.bgImage === p.url ? "border-primary font-bold shadow-md scale-105" : "border-border hover:bg-muted/30 text-muted-foreground"
                      }`}
                      style={p.url ? { backgroundImage: `linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url('${p.url}')` } : {}}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section G: Dashboard Widget Drag-and-Drop */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="size-4 text-muted-foreground" />
              <span>{lang === "bn" ? "ড্যাশবোর্ড লেআউট (ড্র্যাগ অ্যান্ড ড্রপ)" : "Dashboard Layout (Drag & Drop)"}</span>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-normal">
              {lang === "bn"
                ? "ড্যাশবোর্ডের উপাদানগুলোর ক্রম পরিবর্তন করতে তাদের উপর ক্লিক করে ড্র্যাগ করে উপরে-নিচে নামান।"
                : "Drag and drop the cards below to change the order they appear on your main dashboard."}
            </p>

            <div className="space-y-1.5">
              {widgets.map((w, index) => (
                <div
                  key={w.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-2 bg-background border border-border/75 rounded-lg flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all select-none hover:bg-muted/20 ${
                    draggedIndex === index ? "opacity-40 scale-[0.98] border-primary" : ""
                  }`}
                >
                  <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-semibold text-foreground">{w.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <Button
            onClick={handleResetTheme}
            variant="outline"
            className="w-full h-8 text-[11px] border-zinc-200 hover:bg-muted font-medium"
          >
            {lang === "bn" ? "থিম সেটিংস ডিফল্ট করুন" : "Reset Custom Theme to Default"}
          </Button>

        </Card>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <Button
          onClick={() => {
            if (confirm(lang === "bn" ? "আপনি কি লগআউট করতে চান?" : "Are you sure you want to sign out?")) {
              logout();
            }
          }}
          variant="outline"
          className="w-full h-10 border-rose-500/20 text-rose-600 hover:bg-rose-500/5 dark:hover:bg-rose-950/20 beveled-button rounded-xl text-xs font-semibold"
        >
          <LogOut className="size-4 mr-2" />
          {lang === "bn" ? "লগ আউট" : "Sign Out"}
        </Button>
      </div>
    </div>
  );
}
