"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getProducts, getParties, getSales, getPurchases, getExpenses } from "@/lib/queries";
import {
  Home, Package, ShoppingBag, Users, MoreHorizontal,
  LogOut, Languages, Banknote, DollarSign, Settings,
  BarChart3, Receipt, PiggyBank, ShoppingCart, Moon, Sun, FileText,
  TrendingUp, TrendingDown, Sparkles, Palette, MessageSquare, HelpCircle,
  RefreshCw, Lock, KeyRound, ShieldCheck, Wallet, Plus, ChevronDown, Check, Crown, User, Shirt, Store,
  Landmark, CalendarPlus, Calendar, ArrowDownLeft, ArrowUpRight, HandCoins, Barcode, Printer, Layers, Utensils,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLogo } from "@/components/app-logo";
import { SpeedLoader } from "@/components/speed-loader";
import { UniversalSearch } from "@/components/universal-search";
import { toast } from "sonner";
import { createProfileFn, switchProfileFn } from "@/lib/rpc";
import { clearQueryCache } from "@/lib/query-cache";
import { ModuleCustomizerDialog } from "@/components/module-customizer-dialog";
import { readModuleConfig, type ModuleConfig } from "@/lib/module-config";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarTrigger, SidebarContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import type { PermissionSet } from "@/lib/permissions";
import { canAccess, resolvePermissions } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { FloatingAiChat } from "@/components/floating-ai-chat";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { ModeSwitcherDialog } from "@/components/mode-switcher-dialog";
import { CustomEntryDialog, type CustomEntryType } from "@/components/custom-entry-dialog";
import { useCashboxQuery } from "@/hooks/use-cashbox-query";
import { fmtMoney } from "@/lib/format";
import { cashboxBalance } from "@/lib/cashbox-utils";

import { CustomHomeIcon } from "@/components/custom-home-icon";
import { AdminPopupDialog } from "@/components/admin-popup-dialog";
import { PcEmeraldBackdrop } from "@/components/pc-emerald-backdrop";
import { PcEmeraldQuickButton } from "@/components/pc-emerald-quick-button";
import {
  THEME_UPDATED_EVENT,
  isEmeraldModeEnabled,
  readCustomThemeConfig,
  toggleEmeraldMode,
} from "@/lib/emerald-theme";

type NavItem = {
  to: string;
  labelKey: "home" | "products" | "sales" | "parties" | "settings" | "more" | "online_sell" | "cash_management" | "trackback" | "expenses" | "owner_expense" | "somiti" | "new_purchase" | "invoice_generator" | "label_printer" | "due" | "profit" | "products_buy" | "losses" | "reports_generator" | "ai_audits" | "customers" | "theme_settings" | "sms" | "employees" | "bank_management";
  icon: React.ElementType;
  perm?: keyof PermissionSet;
  customLabel?: string;
  labelEn?: string;
  labelBn?: string;
};

type NavGroup = { labelKey: "navigation" | "more" | "reports"; items: NavItem[] };

const desktopNavGroups: NavGroup[] = [
  {
    labelKey: "navigation",
    items: [
      { to: "/dashboard", labelKey: "home", icon: CustomHomeIcon, perm: "dashboard" },
      { to: "/sales", labelKey: "sales", icon: ShoppingBag, perm: "sales" },
      { to: "/sales/today", labelKey: "sales", icon: TrendingUp, perm: "sales", labelEn: "Today's Sale", labelBn: "আজকের বিক্রি" },
      { to: "/online-sells", labelKey: "online_sell", icon: DollarSign, perm: "sales", labelEn: "Online Sales", labelBn: "অনলাইন বিক্রি" },
      { to: "/products", labelKey: "products", icon: Package, perm: "products" },
      { to: "/customers", labelKey: "customers", icon: Users, perm: "parties", labelEn: "Customers & Dues", labelBn: "কাস্টমার ও বাকি" },
      { to: "/invoices", labelKey: "invoice_generator", icon: FileText, perm: "sales" },
      { to: "/labels", labelKey: "label_printer", icon: Barcode, perm: "products" },
      { to: "/printer-settings", labelKey: "settings", icon: Printer, perm: "sales", labelEn: "Printer Settings", labelBn: "প্রিন্টার সেটিংস" },
      { to: "/cash-management", labelKey: "cash_management", icon: Banknote, perm: "expenses" },
      { to: "/expenses", labelKey: "expenses", icon: Receipt, perm: "expenses" },
      { to: "/employee-hub", labelKey: "employees", icon: Users, perm: "sales", labelEn: "Employee Hub", labelBn: "কর্মচারী হাব" },
      { to: "/dues", labelKey: "due", icon: Banknote, perm: "parties" },
      { to: "/parties", labelKey: "parties", icon: Users, perm: "parties" },
    ],
  },
  {
    labelKey: "more",
    items: [
      { to: "/sms", labelKey: "sms", icon: MessageSquare, perm: "sales" },
      { to: "/purchases", labelKey: "new_purchase", icon: ShoppingCart, perm: "purchases" },
      { to: "/bank", labelKey: "bank_management", icon: Landmark, perm: "expenses" },
      { to: "/owners-wallet", labelKey: "owner_expense", icon: Wallet, perm: "owners_wallet" },
      { to: "/somiti", labelKey: "somiti", icon: PiggyBank, perm: "somiti" },
    ],
  },
  {
    labelKey: "reports",
    items: [
      { to: "/reports", labelKey: "reports_generator", icon: FileText, perm: "reports" },
      { to: "/product-analytics", labelKey: "product_analytics" as any, icon: BarChart3, perm: "reports" },
      { to: "/profits", labelKey: "profit", icon: TrendingUp, perm: "profit_loss" },
      { to: "/losses", labelKey: "losses", icon: TrendingDown, perm: "profit_loss" },
      { to: "/trackback", labelKey: "trackback", icon: BarChart3, perm: "reports" },
      { to: "/purchase-reports", labelKey: "products_buy", icon: ShoppingCart, perm: "reports" },
      { to: "/ai-audits", labelKey: "ai_audits", icon: Sparkles, perm: "reports" },
      { to: "/settings", labelKey: "settings", icon: Settings, perm: "settings" },
    ],
  },
];

const restaurantNavGroups: NavGroup[] = [
  {
    labelKey: "navigation",
    items: [
      { to: "/restaurant", labelKey: "sales", icon: Utensils, perm: "sales", labelEn: "Restaurant POS & Dining", labelBn: "রেস্তোরাঁ পিওএস ও টেবিল" },
      { to: "/products", labelKey: "products", icon: Package, perm: "products", labelEn: "Dishes & Menu Items", labelBn: "খাবার ও মেনু আইটেম" },
      { to: "/employee-hub", labelKey: "employees", icon: Users, perm: "sales", labelEn: "Waiters & Staff", labelBn: "ওয়েটার ও স্টাফ" },
      { to: "/cash-management", labelKey: "cash_management", icon: Banknote, perm: "expenses" },
      { to: "/expenses", labelKey: "expenses", icon: Receipt, perm: "expenses" },
      { to: "/printer-settings", labelKey: "settings", icon: Printer, perm: "sales", labelEn: "Kitchen & Printer", labelBn: "কিচেন ও প্রিন্টার" },
    ],
  },
  {
    labelKey: "reports",
    items: [
      { to: "/reports", labelKey: "reports_generator", icon: FileText, perm: "reports", labelEn: "Restaurant Reports", labelBn: "রেস্তোরাঁ রিপোর্ট" },
      { to: "/profits", labelKey: "profit", icon: TrendingUp, perm: "profit_loss" },
      { to: "/settings", labelKey: "settings", icon: Settings, perm: "settings" },
    ],
  },
];

const mobileNav: NavItem[] = [
  { to: "/dashboard", labelKey: "home", icon: CustomHomeIcon, perm: "dashboard" },
  { to: "/sales", labelKey: "sales", icon: ShoppingBag, perm: "sales" },
  { to: "/products", labelKey: "products", icon: Package, perm: "products" },
  { to: "/customers", labelKey: "customers", icon: Users, labelEn: "Customers", labelBn: "কাস্টমার" },
  { to: "/more", labelKey: "more", icon: MoreHorizontal },
];

function filterNav(items: NavItem[], perms: PermissionSet) {
  return items.filter(item => !item.perm || perms[item.perm]);
}

function filterGroups(groups: NavGroup[], perms: PermissionSet): NavGroup[] {
  return groups
    .map(g => ({ ...g, items: filterNav(g.items, perms) }))
    .filter(g => g.items.length > 0);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useT();
  const { resolved, toggle } = useTheme();
  const { user, loading, logout, isUploading, uploadProgress } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data: cashEntries = [] } = useCashboxQuery();
  const currentCashBalance = useMemo(() => cashboxBalance(cashEntries), [cashEntries]);

  useEffect(() => {
    if (!user?.activated) return;
    void qc.prefetchQuery({ queryKey: ["products"], queryFn: getProducts });
    void qc.prefetchQuery({ queryKey: ["sales"], queryFn: getSales });
    const perms = resolvePermissions(user.role, user.permissions);
    if (canAccess(perms, "parties")) {
      void qc.prefetchQuery({ queryKey: ["parties"], queryFn: getParties });
    }
    if (canAccess(perms, "purchases")) {
      void qc.prefetchQuery({ queryKey: ["purchases"], queryFn: getPurchases });
    }
    if (canAccess(perms, "expenses")) {
      void qc.prefetchQuery({ queryKey: ["expenses"], queryFn: getExpenses });
    }
  }, [user?.activated, user?.role, user?.permissions, qc]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          (active as HTMLElement).contentEditable === "true")
      ) {
        return;
      }

      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const key = e.key.toLowerCase();
      const isCtrlK = (e.ctrlKey || e.metaKey) && key === "k";
      const isAltC = e.altKey && (key === "c" || e.code === "KeyC");

      // Barcode Scanner Protection: Disable all naked single-letter global navigation hotkeys (p, r, s, c, d, etc.)
      // Only permit explicit modifier combinations like Ctrl+K or Alt+C
      if (!isCtrlK && !isAltC) {
        return;
      }

      if (isAltC) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open_custom_entry", { detail: { initialType: "sale" } }));
        return;
      }

      if (isCtrlK) {
        e.preventDefault();
        // Priority 1: Search inputs or filter inputs on the active page
        const searchInput = (
          document.querySelector('input[type="search"]:not([disabled])') ||
          document.querySelector('input[placeholder*="search" i]:not([disabled])') ||
          document.querySelector('input[placeholder*="খুঁজুন" i]:not([disabled])') ||
          document.querySelector('input[placeholder*="খুজুন" i]:not([disabled])') ||
          document.querySelector('input[placeholder*="Search" i]:not([disabled])') ||
          document.querySelector('#universal-search-input:not([disabled])') ||
          document.querySelector('main input:not([type="hidden"]):not([disabled])') ||
          document.querySelector('input:not([type="hidden"]):not([disabled])')
        ) as HTMLInputElement | null;

        if (searchInput) {
          searchInput.focus();
          if (typeof searchInput.select === "function") {
            searchInput.select();
          }
        } else {
          // Trigger search button or modal if present
          const searchBtn = document.querySelector('[data-search-trigger="true"], button[aria-label*="search" i]') as HTMLButtonElement | null;
          if (searchBtn) {
            searchBtn.click();
          }
        }
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const [activeEmpSession, setActiveEmpSession] = useState<any>(null);

  // Profile / ID Switcher State
  const [modeSwitcherOpen, setModeSwitcherOpen] = useState(false);

  // Admin / Owner Change PIN Modal State
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [pinChangeBusy, setPinChangeBusy] = useState(false);

  const handleUpdateAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = (localStorage.getItem("app_pin_code_val") || "1234").trim();
    if (currentPinInput.trim() && currentPinInput.trim() !== storedPin) {
      toast.error(lang === "bn" ? "বর্তমান পিন কোড সঠিক নয়!" : "Current PIN is incorrect!");
      return;
    }
    const cleanNewPin = newPinInput.trim();
    if (!/^\d{4,9}$/.test(cleanNewPin)) {
      toast.error(lang === "bn" ? "নতুন পিন কোড ৪ থেকে ৯ সংখ্যার হতে হবে!" : "New PIN must be 4 to 9 digits!");
      return;
    }
    if (cleanNewPin !== confirmPinInput.trim()) {
      toast.error(lang === "bn" ? "নতুন পিন এবং নিশ্চিতকরণ পিন মিলছে না!" : "New PIN and Confirm PIN do not match!");
      return;
    }

    setPinChangeBusy(true);
    try {
      localStorage.setItem("app_pin_code_val", cleanNewPin);
      localStorage.setItem("app_pin_code_enabled", "true");
      window.dispatchEvent(new Event("storage"));

      const { updateBusinessSettingsFn } = await import("@/lib/rpc-admin");
      await updateBusinessSettingsFn({ data: { owner_pin: cleanNewPin } });
      try {
        const { fsUpdateBusinessSettings } = await import("@/lib/firestore-service");
        await fsUpdateBusinessSettings({ owner_pin: cleanNewPin });
      } catch (_) {}

      qc.invalidateQueries({ queryKey: ["business-settings"] });
      toast.success(lang === "bn" ? "অ্যাডমিন পিন কোড সফলভাবে পরিবর্তন হয়েছে!" : "Admin PIN updated successfully!");
      setChangePinOpen(false);
      setCurrentPinInput("");
      setNewPinInput("");
      setConfirmPinInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update PIN");
    } finally {
      setPinChangeBusy(false);
    }
  };
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);

  // Custom Entry Popup Widget State (PC & Global)
  const [customEntryOpen, setCustomEntryOpen] = useState(false);
  const [customEntryType, setCustomEntryType] = useState<CustomEntryType>("sale");

  useEffect(() => {
    try {
      setActiveEmpSession(JSON.parse(localStorage.getItem("cw_active_employee_session") || "null"));
    } catch {}

    const handleEmpSwitch = () => {
      try {
        setActiveEmpSession(JSON.parse(localStorage.getItem("cw_active_employee_session") || "null"));
      } catch {}
    };
    window.addEventListener("hz-employee-switched", handleEmpSwitch);
    window.addEventListener("storage", handleEmpSwitch);
    return () => {
      window.removeEventListener("hz-employee-switched", handleEmpSwitch);
      window.removeEventListener("storage", handleEmpSwitch);
    };
  }, []);

  useEffect(() => {
    const handleOpenCustomEntry = (e: any) => {
      if (e?.detail?.initialType) {
        setCustomEntryType(e.detail.initialType);
      }
      setCustomEntryOpen(true);
    };
    window.addEventListener("open_custom_entry", handleOpenCustomEntry as EventListener);
    return () => window.removeEventListener("open_custom_entry", handleOpenCustomEntry as EventListener);
  }, []);

  const [emeraldActive, setEmeraldActive] = useState(false);

  useEffect(() => {
    const syncEmerald = () =>
      setEmeraldActive(isEmeraldModeEnabled(readCustomThemeConfig()));
    syncEmerald();
    window.addEventListener(THEME_UPDATED_EVENT, syncEmerald);
    window.addEventListener("storage", syncEmerald);
    return () => {
      window.removeEventListener(THEME_UPDATED_EVENT, syncEmerald);
      window.removeEventListener("storage", syncEmerald);
    };
  }, []);

  if (loading && !user) return <SpeedLoader />;
  if (!user) return null;

  const perms = resolvePermissions(user.role, user.permissions);
  const isEmployee = Boolean(activeEmpSession || user.role === "employee" || (user as any).employee_id);
  const allowedPages = activeEmpSession?.allowedPages || (user as any).allowedPages;

  // Pages hidden from employees by default
  const EMPLOYEE_DEFAULT_HIDDEN = new Set([
    "/trackback", "/profits", "/losses", "/reports", "/ai-audits",
    "/purchase-reports", "/somiti", "/parties",
    "/bank", "/owners-wallet", "/settings",
  ]);

  // Core employee pages that must always remain accessible to staff in the sidebar
  const EMPLOYEE_ALWAYS_ALLOWED = new Set([
    "/dashboard",
    "/sales",
    "/sales/today",
    "/online-sells",
    "/products",
    "/customers",
    "/customers/detail",
    "/dues",
    "/invoices",
    "/labels",
    "/printer-settings",
    "/cash-management",
    "/expenses",
    "/employee-hub",
  ]);

  const employeeNavItems: NavItem[] = [
    { to: "/dashboard", labelKey: "home", icon: CustomHomeIcon, customLabel: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard" },
    ...(perms?.sales !== false ? [
      { to: "/sales", labelKey: "sales" as const, icon: ShoppingBag, customLabel: lang === "bn" ? "বিক্রি" : "Sales" },
      { to: "/sales/today", labelKey: "sales" as const, icon: TrendingUp, customLabel: lang === "bn" ? "আজকের বিক্রি" : "Today's Sale" },
      { to: "/online-sells", labelKey: "online_sell" as const, icon: DollarSign, customLabel: lang === "bn" ? "অনলাইন বিক্রি" : "Online Sales" },
    ] : []),
    ...(perms?.products !== false ? [
      { to: "/products", labelKey: "products" as const, icon: Package, customLabel: lang === "bn" ? "পণ্য তালিকা" : "Products" },
    ] : []),
    { to: "/customers", labelKey: "customers" as const, icon: Users, customLabel: lang === "bn" ? "কাস্টমার" : "Customers" },
    ...(perms?.sales !== false ? [
      { to: "/invoices", labelKey: "invoice_generator" as const, icon: FileText, customLabel: lang === "bn" ? "চালান" : "Invoices" },
    ] : []),
    ...(perms?.products !== false ? [
      { to: "/labels", labelKey: "label_printer" as const, icon: Barcode, customLabel: lang === "bn" ? "বারকোড স্টিকার" : "Label Printer" },
    ] : []),
    ...(perms?.sales !== false ? [
      { to: "/printer-settings", labelKey: "settings" as const, icon: Printer, customLabel: lang === "bn" ? "প্রিন্টার সেটিংস" : "Printer Settings" },
    ] : []),
    ...(perms?.cashbox !== false ? [
      { to: "/cash-management", labelKey: "cash_management" as const, icon: Banknote, customLabel: lang === "bn" ? "ক্যাশ বক্স" : "Cash Box" },
    ] : []),
    ...(perms?.expenses !== false ? [
      { to: "/expenses", labelKey: "expenses" as const, icon: Receipt, customLabel: lang === "bn" ? "খরচ সমূহ" : "Expenses" },
    ] : []),
    { to: "/employee-hub", labelKey: "employees", icon: Users, customLabel: lang === "bn" ? "কর্মচারী" : "Employees" },
    ...(perms?.somiti ? [
      { to: "/somiti", labelKey: "somiti" as const, icon: PiggyBank, customLabel: lang === "bn" ? "সমিতি" : "Samity" },
    ] : []),
  ];

  const isRestaurant = user?.industry === "restaurant" || pathname.startsWith("/restaurant");
  const hideMobileChromeForWaiter = isRestaurant && pathname.startsWith("/restaurant");

  const [moduleCustomizerOpen, setModuleCustomizerOpen] = useState(false);
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>(() =>
    readModuleConfig(user?.industry, (user as any)?.module_config)
  );

  useEffect(() => {
    setModuleConfig(readModuleConfig(user?.industry, (user as any)?.module_config));
    const onUpdate = () => {
      setModuleConfig(readModuleConfig(user?.industry, (user as any)?.module_config));
    };
    window.addEventListener("urobili-module-config-updated", onUpdate);
    return () => window.removeEventListener("urobili-module-config-updated", onUpdate);
  }, [user?.industry, (user as any)?.module_config]);

  const activeDesktopGroups = isRestaurant ? restaurantNavGroups : desktopNavGroups;
  const disabledSet = new Set(moduleConfig.disabledModules || []);

  const baseSidebarGroups: NavGroup[] = isEmployee
    ? [
        {
          labelKey: "navigation",
          items: isRestaurant
            ? [
                { to: "/restaurant", labelKey: "sales", icon: Utensils, labelEn: "Menu & Tables", labelBn: "মেনু ও টেবিল" },
              ]
            : employeeNavItems,
        },
      ]
    : activeDesktopGroups
        .map(group => ({
          ...group,
          items: group.items.filter(
            item => (!item.perm || Boolean(perms?.[item.perm])) && !disabledSet.has(item.to)
          ),
        }))
        .filter(group => group.items.length > 0);

  const sidebarGroups: NavGroup[] =
    !isEmployee && moduleConfig.customModules.length > 0
      ? [
          ...baseSidebarGroups,
          {
            labelKey: "more",
            items: moduleConfig.customModules.map(cm => ({
              to: cm.url,
              labelKey: "more",
              icon: Layers,
              labelEn: cm.labelEn,
              labelBn: cm.labelBn,
            })),
          },
        ]
      : baseSidebarGroups;

  const bottomNav = hideMobileChromeForWaiter
    ? []
    : isEmployee
      ? [
          { to: "/dashboard", labelKey: "home" as const, icon: CustomHomeIcon },
          { to: "/sales", labelKey: "sales" as const, icon: ShoppingBag },
          { to: "/products", labelKey: "products" as const, icon: Package },
          { to: "/customers", labelKey: "customers" as const, icon: Users, labelEn: "Customers", labelBn: "কাস্টমার" },
          { to: "/employee-hub", labelKey: "employees" as const, icon: Users, labelEn: "Hub", labelBn: "হাব" },
          { to: "/more", labelKey: "more" as const, icon: MoreHorizontal },
        ]
      : mobileNav.filter(item => (!item.perm || Boolean(perms?.[item.perm])) && !disabledSet.has(item.to));

  const brandName = user.business_name || "Urobili";
  const userInitials = user.email?.slice(0, 2).toUpperCase() ?? "UR";

  const activeProfileId = user.activeProfile || (typeof window !== "undefined" ? localStorage.getItem("active_profile") : null) || "default";
  const profiles = user.profiles && user.profiles.length > 0
    ? user.profiles
    : [{ id: "default", name: "Main ID", created_at: new Date().toISOString() }];
  const currentProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const handleSwitchProfile = async (profileId: string) => {
    if (isSwitchingProfile) return;
    setIsSwitchingProfile(true);
    try {
      await switchProfileFn({ data: { profileId } });
      const pName = profiles.find(p => p.id === profileId)?.name || "Default";
      toast.success(lang === "bn" ? `আইডি "${pName}" এ পরিবর্তন করা হয়েছে` : `Switched to ID "${pName}"`);
      clearQueryCache();
      qc.clear();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setIsSwitchingProfile(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || isSwitchingProfile) return;
    setIsSwitchingProfile(true);
    try {
      await createProfileFn({ data: { name: newProfileName.trim() } });
      toast.success(lang === "bn" ? `নতুন আইডি "${newProfileName}" তৈরি করা হয়েছে` : `New ID "${newProfileName}" created & switched`);
      setNewProfileName("");
      setCreateProfileOpen(false);
      clearQueryCache();
      qc.clear();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setIsSwitchingProfile(false);
    }
  };

  async function handleSignOut() {
    await logout();
    router.replace("/auth");
  }

  function isActive(to: string) {
    return pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
  }

  return (
    <div className="min-h-screen min-h-dvh bg-transparent flex w-full app-shell relative">
      <PcEmeraldBackdrop />
      <Sidebar collapsible="icon" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <SidebarHeader className="border-b border-sidebar-border px-3 py-3 space-y-2">
          <div className="flex items-center overflow-hidden group-data-[collapsible=icon]:justify-center">
            <AppLogo size="md" className="h-11 max-w-[210px]" />
          </div>
          
        </SidebarHeader>

        <SidebarContent>
          {sidebarGroups.map(group => (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ to, labelKey, customLabel, labelEn, labelBn, icon: Icon }: any) => {
                    const resolvedLabel =
                      lang === "bn"
                        ? labelBn || customLabel || (labelKey ? t(labelKey) : to)
                        : labelEn || customLabel || (labelKey ? t(labelKey) : to);
                    return (
                    <SidebarMenuItem key={`${to}-${resolvedLabel}`}>
                      <SidebarMenuButton
                        isActive={isActive(to)}
                        tooltip={resolvedLabel}
                        asChild
                      >
                        <Link href={to} prefetch={true} className="flex items-center gap-2 w-full">
                          <Icon className="icon-sm inline-flex shrink-0" />
                          <span className="truncate text-left">{resolvedLabel}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            {!isEmployee && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setModuleCustomizerOpen(true)}
                  tooltip={lang === "bn" ? "মডিউল ও ড্যাশবোর্ড কাস্টমাইজ" : "Customize Modules & KPIs"}
                  className="text-primary hover:bg-primary/10 font-semibold cursor-pointer"
                >
                  <Sparkles className="icon-sm shrink-0" />
                  <span className="truncate text-xs">
                    {lang === "bn" ? "মডিউল কাস্টমাইজ করুন" : "Customize Modules"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={user.email ?? "Account"}>
                    <Avatar className="size-6 shrink-0">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} className="aspect-square h-full w-full object-cover rounded-full" alt="Profile" />
                      ) : (
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="truncate text-sm">{user.email}</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-52">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLang("bn")}>বাংলা {lang === "bn" && "✓"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLang("en")}>English {lang === "en" && "✓"}</DropdownMenuItem>
                  {!isEmployee && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setChangePinOpen(true)} className="cursor-pointer font-medium gap-2 text-amber-600 dark:text-amber-400">
                        <KeyRound className="size-3.5 text-amber-500" />
                        <span>{lang === "bn" ? "অ্যাডমিন পিন পরিবর্তন" : "Change Admin PIN"}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="icon-sm mr-2" />
                    {t("sign_out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="px-3 py-2 border-t border-sidebar-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="font-semibold text-foreground/80 flex items-center gap-1.5">
              <img src="/urobili-logo.png" className="size-4 object-contain" alt="Urobili" />
              Urobili
            </span>
            <a
              href="https://azizul.iam.bd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold text-[10.5px]"
            >
              Azizul hakim Khan
            </a>
          </div>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
        <header className={`${hideMobileChromeForWaiter ? "hidden md:block" : ""} sticky top-0 inset-x-0 z-40 bg-card/98 backdrop-blur-md border-b border-border/50 shrink-0 shadow-xs`} style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}>
          {isUploading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-800 z-50">
              <div
                className="h-full bg-gradient-to-r from-primary to-indigo-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          <div className="flex items-center justify-between h-12 px-2.5 sm:px-3 gap-1.5 sm:gap-2 overflow-hidden">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <SidebarTrigger className="inline-flex size-7 shrink-0 cursor-pointer" />
              <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 flex-1">
                <AppLogo size="sm" className="h-7 sm:h-8 max-h-8 w-auto shrink-0" />
                <h1 className="font-serif font-semibold text-sm sm:text-base truncate leading-none text-foreground">{brandName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Single Unified Mode & Profile/Branch Switcher: compact icon on phone, pill on tablet/PC */}
              <button
                type="button"
                onClick={() => setModeSwitcherOpen(true)}
                className={`inline-flex items-center justify-center sm:gap-1.5 size-8 sm:size-auto sm:h-7 sm:px-2.5 rounded-full border text-[11px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
                  activeEmpSession
                    ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                }`}
                title={
                  lang === "bn"
                    ? "মোড ও প্রোফাইল পরিবর্তন করুন"
                    : "Switch Mode & Profile"
                }
                aria-label="Switch Mode and Profile"
              >
                {activeEmpSession ? (
                  <User className="size-3.5 sm:size-3 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Store className="size-3.5 sm:size-3 text-emerald-600 dark:text-emerald-400" />
                )}
                <span className="hidden sm:inline truncate max-w-[150px]">
                  {activeEmpSession
                    ? activeEmpSession.name
                    : `${lang === "bn" ? "মালিক" : "Owner"} • ${currentProfile?.name || "Main ID"}`}
                </span>
                <span className="hidden sm:inline text-[9px] opacity-60">⇄</span>
              </button>
              {/* Dedicated PC/Tablet Custom Entry Quick Widget */}
              <DropdownMenu>
                <div className="hidden md:inline-flex items-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomEntryType("sale");
                      setCustomEntryOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold cursor-pointer hover:opacity-85 active:scale-95 transition-all"
                    title={lang === "bn" ? "কাস্টম এন্ট্রি উইজেট (তারিখসহ লেনদেন) [Alt+C]" : "Custom Entry Widget (With Date) [Alt+C]"}
                  >
                    <CalendarPlus className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === "bn" ? "কাস্টম এন্ট্রি" : "Custom Entry"}</span>
                    <span className="hidden lg:inline-flex text-[9px] px-1 py-0.2 bg-background/80 rounded border border-border/80 text-muted-foreground font-mono">Alt+C</span>
                  </button>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-7 px-1.5 text-emerald-600 dark:text-emerald-400 border-l border-emerald-500/30 hover:bg-emerald-500/20 rounded-r-full cursor-pointer flex items-center justify-center transition-colors"
                      title={lang === "bn" ? "দ্রুত কাস্টম এন্ট্রি শর্টকাট" : "Quick Custom Entry Shortcuts"}
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-xl border-border/80 bg-card">
                  <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {lang === "bn" ? "তারিখসহ দ্রুত লেনদেন" : "Quick Custom Entries"}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => { setCustomEntryType("sale"); setCustomEntryOpen(true); }}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="size-3.5 text-emerald-500" />
                      <span>{lang === "bn" ? "কাস্টম বিক্রি" : "Custom Sale"}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Alt+1</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCustomEntryType("expense"); setCustomEntryOpen(true); }}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="size-3.5 text-rose-500" />
                      <span>{lang === "bn" ? "কাস্টম খরচ" : "Custom Expense"}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Alt+2</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCustomEntryType("purchase"); setCustomEntryOpen(true); }}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="size-3.5 text-indigo-500" />
                      <span>{lang === "bn" ? "কাস্টম ক্রয়" : "Custom Purchase"}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Alt+3</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCustomEntryType("deposit"); setCustomEntryOpen(true); }}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="size-3.5 text-sky-500" />
                      <span>{lang === "bn" ? "ক্যাশবক্সে টাকা জমা" : "Cash Deposit"}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Alt+4</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCustomEntryType("withdraw"); setCustomEntryOpen(true); }}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="size-3.5 text-amber-500" />
                      <span>{lang === "bn" ? "ক্যাশবক্স উত্তোলন" : "Cash Withdraw"}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Alt+5</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCustomEntryType("due_collection"); setCustomEntryOpen(true); }}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <HandCoins className="size-3.5 text-purple-500" />
                      <span>{lang === "bn" ? "বাকি আদায়" : "Due Collection"}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Alt+6</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => { setCustomEntryOpen(true); }}
                    className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl font-bold text-primary cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5" />
                      <span>{lang === "bn" ? "সম্পূর্ণ উইজেট খুলুন" : "Open Full Widget"}</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Alt+C</kbd>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <PcEmeraldQuickButton />
              <PWAInstallButton variant="outline" className="hidden sm:inline-flex h-8 px-2.5 text-xs" />
              <UniversalSearch role={user.role} permissions={user.permissions} />
              <Link href="/more" title={lang === "bn" ? "হেল্প ও সাপোর্ট" : "Help & Support"} className="hidden md:inline-flex">
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="icon-sm" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="size-8 hidden sm:inline-flex" onClick={toggle} aria-label="Theme">
                {resolved === "dark" ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  sessionStorage.removeItem("app_pin_unlocked");
                  window.dispatchEvent(new Event("app_lock_screen"));
                }}
                className="size-8 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg cursor-pointer hidden sm:inline-flex"
                title={lang === "bn" ? "স্ক্রিন লক করুন" : "Lock Screen"}
              >
                <Lock className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 hidden sm:inline-flex">
                    <Languages className="icon-sm" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLang("bn")}>বাংলা {lang === "bn" && "✓"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLang("en")}>English {lang === "en" && "✓"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 cursor-pointer ring-1 ring-border/50 hover:ring-primary/40 rounded-full">
                    <Avatar className="size-6">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} className="aspect-square h-full w-full object-cover rounded-full" alt="Profile" />
                      ) : (
                        <AvatarFallback className="text-[9px] font-bold bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl rounded-2xl border-border/80">
                  <div className="px-2 py-1.5 border-b border-border/60">
                    <div className="text-xs font-bold truncate text-foreground">{user.business_name || "Urobili"}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{user.email || (user as any).username || ""}</div>
                    <div className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {user.role || "Admin / Owner"}
                    </div>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem
                      onClick={() => {
                        sessionStorage.removeItem("app_pin_unlocked");
                        window.dispatchEvent(new Event("app_lock_screen"));
                      }}
                      className="text-xs font-medium cursor-pointer"
                    >
                      <Lock className="size-3.5 mr-2 text-amber-500" />
                      {lang === "bn" ? "স্ক্রিন লক করুন" : "Lock Screen"}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={toggle}
                      className="text-xs font-medium cursor-pointer sm:hidden"
                    >
                      {resolved === "dark" ? <Sun className="size-3.5 mr-2 text-amber-500" /> : <Moon className="size-3.5 mr-2 text-indigo-500" />}
                      {resolved === "dark" ? (lang === "bn" ? "লাইট মোড" : "Light Mode") : (lang === "bn" ? "ডার্ক মোড" : "Dark Mode")}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
                      className="text-xs font-medium cursor-pointer sm:hidden"
                    >
                      <Languages className="size-3.5 mr-2 text-muted-foreground" />
                      {lang === "bn" ? "English এ পরিবর্তন" : "বাংলায় পরিবর্তন"}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        // Lock screen before entering Settings — owner must re-enter PIN
                        const pinEnabled = localStorage.getItem("app_pin_code_enabled") === "true";
                        const pinVal = localStorage.getItem("app_pin_code_val");
                        if (pinEnabled && pinVal) {
                          sessionStorage.removeItem("app_pin_unlocked");
                          window.dispatchEvent(new Event("app_lock_screen"));
                        }
                        router.push("/settings");
                      }}
                      className="text-xs font-medium cursor-pointer"
                    >
                      <Settings className="size-3.5 mr-2 text-muted-foreground" />
                      {lang === "bn" ? "সেটিংস ও নিরাপত্তা" : "Settings & Security"}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setModeSwitcherOpen(true)}
                      className="text-xs font-medium cursor-pointer"
                    >
                      <RefreshCw className="size-3.5 mr-2 text-primary" />
                      {lang === "bn" ? "মোড / আইডি পরিবর্তন" : "Switch Mode / ID"}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        const next = toggleEmeraldMode(!emeraldActive);
                        setEmeraldActive(isEmeraldModeEnabled(next));
                        toast.success(
                          !emeraldActive
                            ? (lang === "bn" ? "এমেরাল্ড গ্লাস ইউআই চালু হয়েছে" : "Emerald Glass UI enabled")
                            : (lang === "bn" ? "ডিফল্ট ইউআই চালু হয়েছে" : "Switched to Default UI")
                        );
                      }}
                      className="hidden md:flex text-xs font-medium cursor-pointer"
                    >
                      <Layers className="size-3.5 mr-2 text-emerald-500" />
                      <span>
                        {lang === "bn"
                          ? `এমেরাল্ড ইউআই: ${emeraldActive ? "চালু ✓" : "বন্ধ"}`
                          : `Emerald Glass UI: ${emeraldActive ? "ON ✓" : "OFF"}`}
                      </span>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive text-xs font-medium cursor-pointer">
                    <LogOut className="size-3.5 mr-2" />
                    {t("sign_out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain ${hideMobileChromeForWaiter && isMobile ? "p-0" : `pt-3 pb-16 md:pb-4 ${isMobile ? "px-3" : "px-6 py-4"}`}`}>
          <div className={hideMobileChromeForWaiter && isMobile ? "w-full" : (isMobile ? "w-full max-w-lg mx-auto" : "w-full max-w-screen-2xl mx-auto")}>
            <PermissionGuard>
              {children}
            </PermissionGuard>
          </div>
          {!hideMobileChromeForWaiter && <div className="md:hidden mobile-bottom-spacer" aria-hidden />}
          <ModeSwitcherDialog open={modeSwitcherOpen} onOpenChange={setModeSwitcherOpen} />
          <CustomEntryDialog open={customEntryOpen} onOpenChange={setCustomEntryOpen} initialType={customEntryType} />
          <ModuleCustomizerDialog open={moduleCustomizerOpen} onOpenChange={setModuleCustomizerOpen} />
        </main>
      </div>

      {bottomNav.length > 0 && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/98 backdrop-blur-md border-t border-border/80 shadow-2xl safe-area-pb mobile-tab-bar select-none" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 6px)" }}>
          <div
            className="grid h-14 max-w-lg mx-auto w-full"
            style={{ gridTemplateColumns: `repeat(${bottomNav.length}, minmax(0, 1fr))` }}
          >
            {bottomNav.map(({ to, labelKey, labelEn, labelBn, icon: Icon }: any) => {
              const active = isActive(to);
              const navText = lang === "bn" ? labelBn || t(labelKey) : labelEn || t(labelKey);
              return (
                <Link
                  key={to}
                  href={to}
                  prefetch={true}
                  className={`flex flex-col items-center justify-center py-1 gap-0.5 text-[10px] font-medium transition-colors active:scale-95 ${
                    active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className={`flex items-center justify-center px-3 py-0.5 rounded-full transition-all duration-150 ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground/80"
                  }`}>
                    {labelKey === "home" ? (
                      <CustomHomeIcon className="size-5 shrink-0" />
                    ) : (
                      <Icon className="size-5 shrink-0" />
                    )}
                  </div>
                  <span className="leading-tight truncate max-w-[64px] text-center">{navText}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      {!isMobile && (pathname === "/dashboard" || pathname === "/") && (
        <FloatingAiChat />
      )}
      <AdminPopupDialog />

      {/* Change Admin PIN Modal Dialog */}
      <Dialog open={changePinOpen} onOpenChange={setChangePinOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <KeyRound className="size-4" />
              </div>
              <div>
                <span>{lang === "bn" ? "অ্যাডমিন পিন পরিবর্তন করুন" : "Change Admin PIN"}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {lang === "bn" ? "দোকান মালিকের ৪ থেকে ৯ সংখ্যার গোপন সিকিউরিটি পিন সেট করুন" : "Set your 4 to 9-digit Owner PIN code"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAdminPin} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {lang === "bn" ? "বর্তমান পিন (যদি জানা থাকে)" : "Current PIN (Optional)"}
              </Label>
              <Input
                type="password"
                maxLength={9}
                placeholder="****"
                value={currentPinInput}
                onChange={e => setCurrentPinInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-9 text-sm font-mono tracking-widest text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {lang === "bn" ? "নতুন পিন কোড (৪-৯ সংখ্যা)" : "New PIN (4 to 9 digits)"} <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="password"
                maxLength={9}
                placeholder="4 to 9 digits (e.g. 123456789)"
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-10 text-base font-mono tracking-widest text-center font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {lang === "bn" ? "নতুন পিন নিশ্চিত করুন" : "Confirm New PIN"} <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="password"
                maxLength={9}
                placeholder="Repeat new PIN"
                value={confirmPinInput}
                onChange={e => setConfirmPinInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-10 text-base font-mono tracking-widest text-center font-bold"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setChangePinOpen(false)} className="rounded-xl">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={pinChangeBusy} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs">
                {pinChangeBusy ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (lang === "bn" ? "পিন সংরক্ষণ করুন" : "Save PIN")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create New Profile / ID Modal Dialog */}
      <Dialog open={createProfileOpen} onOpenChange={setCreateProfileOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="size-4 text-indigo-600" />
              {lang === "bn" ? "নতুন আইডি / প্রোফাইল তৈরি করুন" : "Create New ID / Branch Profile"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProfile} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {lang === "bn" ? "আইডি / প্রোফাইলের নাম" : "ID / Profile Name"}
              </Label>
              <Input
                required
                placeholder={lang === "bn" ? "যেমন: শাখা ২, ব্রাঞ্চ বা শোরুম..." : "e.g. Branch 2, Showroom..."}
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateProfileOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSwitchingProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {isSwitchingProfile ? (lang === "bn" ? "তৈরি হচ্ছে..." : "Creating...") : (lang === "bn" ? "তৈরি করুন" : "Create ID")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
