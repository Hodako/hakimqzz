"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmployeeDeviceCodeForm } from "@/components/employee-device-link";
import { SpeedLoader } from "@/components/speed-loader";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginFn, registerFn, firebaseAuthSyncFn, uploadImageFn } from "@/lib/rpc";
import { updateBusinessSettingsFn } from "@/lib/rpc-admin";
import type { AuthUser } from "@/hooks/use-auth";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  User,
  RefreshCw,
  CheckCircle2,
  Store,
  Image as ImageIcon,
  Shield,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  Utensils,
  Shirt,
  ShoppingCart,
  Smartphone,
  Pill,
  Briefcase,
  Quote,
} from "lucide-react";

const INDUSTRIES = [
  { id: "restaurant", labelEn: "Restaurant / Cafe", labelBn: "রেস্তোরাঁ ও ক্যাফে", icon: Utensils, desc: "Dine-in, KOT, table management & takeaway" },
  { id: "fashion", labelEn: "Fashion & Boutique", labelBn: "ফ্যাশন ও বুটিক", icon: Shirt, desc: "Sizes, colors, barcode labels & invoices" },
  { id: "grocery", labelEn: "Grocery & Superstore", labelBn: "মুদি ও সুপারশপ", icon: ShoppingCart, desc: "Fast billing, wholesale, units & stock" },
  { id: "electronics", labelEn: "Electronics & Mobile", labelBn: "ইলেকট্রনিক্স ও গ্যাজেট", icon: Smartphone, desc: "IMEI, serial tracking & warranty receipts" },
  { id: "pharmacy", labelEn: "Pharmacy & Healthcare", labelBn: "ফার্মেসি ও ড্রাগস", icon: Pill, desc: "Batch numbers, expiry alerts & fast retail" },
  { id: "retail", labelEn: "General Retail / Wholesale", labelBn: "সাধারণ ব্যবসা / পাইকারি", icon: Briefcase, desc: "Standard inventory, ledger & POS invoicing" },
];

export default function AuthPage() {
  const { user, loading, login, updateUser } = useAuth();
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Active Main Tab: Owner vs Employee
  const [mainRole, setMainRole] = useState<"owner" | "employee">("owner");

  // Owner Auth State (Email or Phone)
  const [ownerMode, setOwnerMode] = useState<"signin" | "signup">("signin");
  const [ownerIdentifier, setOwnerIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Dialog State
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  // Post-Signup Onboarding State: Shop Name, Logo, Tagline, Industry
  const [onboardingUser, setOnboardingUser] = useState<AuthUser | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState("/urobili-logo.png");
  const [shopTagline, setShopTagline] = useState("");
  const [shopIndustry, setShopIndustry] = useState("restaurant");
  const [shopAddress, setShopAddress] = useState("");
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("role") === "employee" || params.get("tab") === "employee") {
        setMainRole("employee");
      }
    }
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      if (user && !onboardingUser) {
        if (!user.business_name || user.business_name === "Urobili" || !user.industry) {
          setOnboardingUser(user);
        } else {
          router.replace(user.industry === "restaurant" ? "/restaurant" : "/dashboard");
        }
      }
    }
  }, [user, loading, router, mounted, onboardingUser]);

  if ((!mounted || loading) && !onboardingUser) return <SpeedLoader />;
  if (user && !onboardingUser && user.business_name && user.business_name !== "Urobili") return <SpeedLoader />;

  function afterAuth(u: AuthUser | null, token?: string) {
    if (!u) {
      toast.error(lang === "bn" ? "লগইন ব্যর্থ হয়েছে, আবার চেষ্টা করুন" : "Authentication failed. Please try again.");
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("app_pin_unlocked");
    }
    login(u, token);
    if (u.role === "owner" && (!u.business_name || u.business_name === "Urobili" || !u.industry)) {
      setOnboardingUser(u);
    } else {
      router.replace(u.industry === "restaurant" ? "/restaurant" : "/dashboard");
    }
  }

  async function handleCompleteOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error(lang === "bn" ? "দোকান বা রেস্তোরাঁর নাম লিখুন" : "Please enter your business / restaurant name");
      return;
    }
    setOnboardingBusy(true);
    try {
      const payload = {
        name: shopName.trim(),
        business_name: shopName.trim(),
        logo_url: shopLogo.trim() || "/urobili-logo.png",
        tagline: shopTagline.trim() || undefined,
        industry: shopIndustry || "restaurant",
        address: shopAddress.trim() || undefined,
      };

      await updateBusinessSettingsFn({ data: payload });
      updateUser(payload);

      toast.success(
        lang === "bn"
          ? `${shopName.trim()} সেটআপ সফল হয়েছে!`
          : `${shopName.trim()} profile configured successfully!`
      );
      setOnboardingUser(null);
      router.replace(shopIndustry === "restaurant" ? "/restaurant" : "/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Profile update failed");
      setOnboardingUser(null);
      router.replace("/dashboard");
    } finally {
      setOnboardingBusy(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res: any = await uploadImageFn({ data: { base64, fileName: file.name } });
        const url = res?.url || res?.data?.url;
        if (url) {
          setShopLogo(url);
          toast.success(lang === "bn" ? "লোগো আপলোড সম্পন্ন!" : "Logo uploaded!");
        } else {
          toast.error(lang === "bn" ? "লোগো আপলোড ব্যর্থ হয়েছে" : "Upload failed");
        }
      } catch {
        toast.error("Failed to upload logo");
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // ─── Owner Sign-In (Pure PostgreSQL via RPC) ─────────────────────────────
  async function handleOwnerSignIn(e: React.FormEvent) {
    e.preventDefault();
    const cleanId = ownerIdentifier.trim();
    if (!cleanId || !password) {
      toast.error(lang === "bn" ? "ইমেইল/মোবাইল নম্বর ও পাসওয়ার্ড লিখুন" : "Please enter email/phone and password");
      return;
    }

    setBusy(true);
    try {
      const data = await loginFn({ data: { identifier: cleanId, password } });

      if (!data?.user) {
        throw new Error(lang === "bn" ? "ভুল ইমেইল/মোবাইল নম্বর বা পাসওয়ার্ড" : "Invalid email/phone number or password");
      }

      toast.success(lang === "bn" ? "লগইন সফল হয়েছে!" : "Logged in successfully!");
      afterAuth(data.user as AuthUser, data.token);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  // ─── Owner Sign-Up (Pure PostgreSQL via RPC) ─────────────────────────────
  async function handleOwnerSignUp(e: React.FormEvent) {
    e.preventDefault();
    const cleanId = ownerIdentifier.trim();
    if (!cleanId || !password) {
      toast.error(lang === "bn" ? "ইমেইল বা মোবাইল নম্বর এবং পাসওয়ার্ড প্রদান করুন" : "Please provide email/phone and password");
      return;
    }

    setBusy(true);
    try {
      const data = await registerFn({
        data: {
          identifier: cleanId,
          password,
          fullName,
          role: "owner",
        },
      });

      if (!data?.user) {
        throw new Error("Registration failed. Please try again.");
      }

      toast.success(lang === "bn" ? "দোকান মালিক অ্যাকাউন্ট তৈরি হয়েছে!" : "Shop Owner account created successfully!");
      const u = data.user as AuthUser;
      login(u, data.token);
      setOnboardingUser(u);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  // ─── Google Sign-In ───────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setGoogleBusy(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        throw new Error("Unable to retrieve email from Google Account");
      }

      const idToken = await fbUser.getIdToken();
      const data = await firebaseAuthSyncFn({
        data: {
          email: fbUser.email,
          fullName: fbUser.displayName || undefined,
          photoUrl: fbUser.photoURL || undefined,
          firebaseUid: fbUser.uid,
          idToken,
        },
      });

      if (!data?.user) {
        throw new Error("Failed to synchronize Google account");
      }

      toast.success(lang === "bn" ? "গুগল দিয়ে সফলভাবে সাইন ইন হয়েছে!" : "Google sign-in successful!");
      afterAuth(data.user as AuthUser, data.token);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        return;
      }
      toast.error(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleBusy(false);
    }
  }

  // ─── Forgot Password Handler ─────────────────────────────────────────────
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      toast.error(lang === "bn" ? "সঠিক ইমেইল এড্রেস প্রদান করুন" : "Please enter a valid email address");
      return;
    }
    setForgotBusy(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim().toLowerCase());
      toast.success(
        lang === "bn"
          ? "পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে!"
          : "Password reset link sent to your email!"
      );
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset link");
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div
      className="min-h-[100dvh] w-full relative flex flex-col justify-between overflow-x-hidden select-none bg-[#B0A398]"
      style={{
        backgroundImage: "url('/urobili-login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* ─── Top Brand Header ─────────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-6 sm:px-12 pt-6 sm:pt-9 z-20">
        <div className="flex items-center gap-3">
          <div className="size-9 sm:size-10 rounded-xl bg-white/90 backdrop-blur-md p-1.5 shadow-sm border border-white/40 flex items-center justify-center">
            <img src="/urobili-logo.png" alt="Urobili Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-serif text-2xl sm:text-[28px] font-bold tracking-tight text-[#FDFBF7] drop-shadow-md">
            Urobili
          </span>
        </div>

        {/* Minimal Language Switcher */}
        <div className="flex items-center gap-1 bg-[#2C241E]/40 backdrop-blur-md p-1 rounded-full border border-white/20 text-xs font-semibold text-white/90 shadow-sm">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              lang === "en" ? "bg-white text-[#2C241E] font-bold shadow-xs" : "hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("bn")}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              lang === "bn" ? "bg-white text-[#2C241E] font-bold shadow-xs" : "hover:text-white"
            }`}
          >
            বাংলা
          </button>
        </div>
      </header>

      {/* ─── Main Content Row (Left Hero Typography + Right Floating Card) ─────── */}
      <main className="w-full flex-1 flex flex-col lg:flex-row items-center justify-between px-6 sm:px-12 lg:px-16 xl:px-24 py-4 sm:py-8 z-20">
        {/* Left Hero Typography (Visible on Desktop) */}
        <div className="hidden lg:flex flex-col justify-center max-w-lg space-y-4 my-auto select-none">
          <div className="space-y-3">
            <h2 className="font-serif text-5xl xl:text-6xl font-bold text-[#FDFBF7] leading-[1.15] drop-shadow-md">
              Every big thing <br />
              starts small
            </h2>
            <p className="text-base xl:text-lg text-[#FDFBF7]/90 font-medium drop-shadow-sm max-w-md">
              {lang === "bn"
                ? "লগইন করুন এবং আপনার রেস্তোরাঁ ও ব্যবসার হিসাব পরিচালনা করুন।"
                : "Log in and continue growing your business."}
            </p>
          </div>
        </div>

        {/* Mobile Sprout Hero Card (Visible on Phone/Tablet) */}
        <div className="lg:hidden w-full max-w-[420px] mb-3 text-center space-y-1">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#FDFBF7] drop-shadow-md">
            Every big thing starts small
          </h2>
          <p className="text-xs text-[#FDFBF7]/85 drop-shadow-sm">
            {lang === "bn" ? "লগইন করে এগিয়ে চলুন" : "Log in and continue growing."}
          </p>
        </div>

        {/* Right Floating Warm Cream Card (Responsive on PC & Mobile) */}
        <div className="w-full max-w-[420px] rounded-[32px] bg-[#FFF5ED] border border-[#EBE2D7] shadow-[0_25px_60px_-15px_rgba(40,30,20,0.22)] p-6 sm:p-9 space-y-5 sm:space-y-6 mx-auto lg:mx-0 lg:ml-auto my-auto">
          {/* Card Title */}
          <div>
            <h1 className="text-2xl sm:text-[27px] font-bold text-[#2C241E] tracking-tight text-center sm:text-left">
              {mainRole === "employee"
                ? (lang === "bn" ? "ডিভাইস পেয়ারিং" : "Device Pairing")
                : ownerMode === "signin"
                  ? (lang === "bn" ? "অ্যাকাউন্টে লগইন করুন" : "Log in to your account")
                  : (lang === "bn" ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "Create your account")}
            </h1>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* 1. EMPLOYEE AUTHENTICATION VIEW                                      */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {mainRole === "employee" ? (
            <div className="space-y-5">
              <EmployeeDeviceCodeForm onLinked={afterAuth} />

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 space-y-1.5 text-xs text-[#2C241E]">
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>{lang === "bn" ? "কর্মচারী কোড পেয়ারিং" : "Staff Pairing"}</span>
                </div>
                <p className="text-[11px] text-[#6E645A] leading-relaxed">
                  {lang === "bn"
                    ? "কর্মচারীদের আলাদা পাসওয়ার্ড প্রয়োজন নেই। মালিকের ড্যাশবোর্ড থেকে পাওয়া ডিভাইস লিংক কোড দিন।"
                    : "Staff members can easily link without password using the device pairing code issued by your manager."}
                </p>
              </div>

              <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setMainRole("owner")}
                  className="text-xs font-semibold text-[#55A61D] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="size-3.5" />
                  <span>{lang === "bn" ? "দোকান মালিক লগইনে ফিরে যান" : "Back to Owner Login"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════ */
            /* 2. SHOP OWNER AUTHENTICATION VIEW                                    */
            /* ══════════════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              <form onSubmit={ownerMode === "signin" ? handleOwnerSignIn : handleOwnerSignUp} className="space-y-3.5 sm:space-y-4">
                {/* Full Name (Sign Up only) */}
                {ownerMode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#65594F] block">
                      {lang === "bn" ? "আপনার পুরো নাম" : "Full name"}
                    </label>
                    <div className="relative flex items-center bg-white rounded-2xl border border-[#E8DFD3] focus-within:border-[#55A61D] focus-within:ring-2 focus-within:ring-[#55A61D]/15 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] h-[50px] sm:h-[52px]">
                      <User className="size-5 text-[#A4988E] ml-4 shrink-0" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={lang === "bn" ? "যেমন: আজিজুল হাকিম" : "e.g. John Doe"}
                        className="w-full h-full bg-transparent pl-3 pr-4 text-[#2C241E] text-sm placeholder:text-[#A4988E] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Email or Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#65594F] block">
                    {lang === "bn" ? "ইমেইল বা মোবাইল নম্বর" : "Email address or phone"}
                  </label>
                  <div className="relative flex items-center bg-white rounded-2xl border border-[#E8DFD3] focus-within:border-[#55A61D] focus-within:ring-2 focus-within:ring-[#55A61D]/15 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] h-[50px] sm:h-[52px]">
                    <Mail className="size-5 text-[#A4988E] ml-4 shrink-0" />
                    <input
                      type="text"
                      required
                      value={ownerIdentifier}
                      onChange={(e) => setOwnerIdentifier(e.target.value)}
                      placeholder={lang === "bn" ? "ইমেইল অথবা মোবাইল নম্বর দিন" : "Enter your email or phone"}
                      className="w-full h-full bg-transparent pl-3 pr-4 text-[#2C241E] text-sm placeholder:text-[#A4988E] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#65594F] block">
                    {lang === "bn" ? "পাসওয়ার্ড" : "Password"}
                  </label>
                  <div className="relative flex items-center bg-white rounded-2xl border border-[#E8DFD3] focus-within:border-[#55A61D] focus-within:ring-2 focus-within:ring-[#55A61D]/15 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] h-[50px] sm:h-[52px]">
                    <Lock className="size-5 text-[#A4988E] ml-4 shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={ownerMode === "signup" ? 6 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={lang === "bn" ? "পাসওয়ার্ড লিখুন" : "Enter your password"}
                      className="w-full h-full bg-transparent pl-3 pr-12 text-[#2C241E] text-sm placeholder:text-[#A4988E] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-[#A4988E] hover:text-[#55A61D] transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link (right-aligned) */}
                {ownerMode === "signin" && (
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-[12px] font-medium text-[#7A6F66] hover:text-[#55A61D] transition-colors cursor-pointer"
                    >
                      {lang === "bn" ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot your password?"}
                    </button>
                  </div>
                )}

                {/* Primary Action Button (Vibrant Leaf Green #55A61D) */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-[50px] sm:h-[52px] rounded-2xl bg-[#55A61D] hover:bg-[#489117] active:scale-[0.99] text-white font-bold text-[15px] shadow-md shadow-[#55A61D]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-1"
                >
                  {busy ? (
                    <RefreshCw className="size-5 animate-spin" />
                  ) : (
                    <span>
                      {ownerMode === "signin"
                        ? (lang === "bn" ? "লগইন" : "Log in")
                        : (lang === "bn" ? "সাইন আপ" : "Sign up")}
                    </span>
                  )}
                </button>
              </form>

              {/* Divider: ── or ── */}
              <div className="relative flex items-center my-3.5 sm:my-4">
                <div className="w-full border-t border-[#E8DFD3]" />
                <span className="bg-[#FFF5ED] px-3 text-xs text-[#9E9287] font-normal">
                  {lang === "bn" ? "অথবা" : "or"}
                </span>
                <div className="w-full border-t border-[#E8DFD3]" />
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleBusy}
                className="w-full h-[50px] sm:h-[52px] rounded-2xl bg-white hover:bg-[#FAF7F2] border border-[#E8DFD3] text-[#2C241E] font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer active:scale-[0.99] disabled:opacity-70"
              >
                {googleBusy ? (
                  <RefreshCw className="size-4 animate-spin text-[#55A61D]" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 48 48" className="size-5 shrink-0">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.55 10.78l7.98-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                )}
                <span>{lang === "bn" ? "গুগল দিয়ে প্রবেশ করুন" : "Continue with Google"}</span>
              </button>

              {/* Footer Toggle: Don't have an account? Sign up */}
              <div className="text-center text-[13px] text-[#6E645A] pt-1">
                {ownerMode === "signin" ? (
                  <>
                    <span>{lang === "bn" ? "অ্যাকাউন্ট নেই? " : "Don't have an account? "}</span>
                    <button
                      type="button"
                      onClick={() => setOwnerMode("signup")}
                      className="text-[#55A61D] font-semibold hover:underline cursor-pointer ml-1"
                    >
                      {lang === "bn" ? "সাইন আপ করুন" : "Sign up"}
                    </button>
                  </>
                ) : (
                  <>
                    <span>{lang === "bn" ? "ইতিমধ্যে অ্যাকাউন্ট আছে? " : "Already have an account? "}</span>
                    <button
                      type="button"
                      onClick={() => setOwnerMode("signin")}
                      className="text-[#55A61D] font-semibold hover:underline cursor-pointer ml-1"
                    >
                      {lang === "bn" ? "লগইন করুন" : "Sign in"}
                    </button>
                  </>
                )}
              </div>

              {/* Staff Pairing Option */}
              <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setMainRole("employee")}
                  className="text-[12px] font-medium text-[#8F8377] hover:text-[#55A61D] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserCheck className="size-3.5 text-[#55A61D]" />
                  <span>{lang === "bn" ? "কর্মচারী? ডিভাইস কোড দিয়ে লগইন" : "Staff Member? Pair device with code"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Bottom Footer Row ────────────────────────────────────────────────── */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between px-6 sm:px-12 pb-5 z-20 text-xs text-[#FDFBF7]/85">
        <p className="text-[11px] drop-shadow-sm text-center sm:text-left">
          © 2026 Urobili POS & ERP Platform. All rights reserved.
        </p>
        <div className="flex items-center gap-3 mt-1.5 sm:mt-0 text-[11px]">
          <a
            href="https://azizul.iam.bd"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white underline underline-offset-2 transition-colors drop-shadow-sm"
          >
            Developed by Azizul hakim Khan
          </a>
          <span>•</span>
          <a
            href="https://wa.me/8801783501427"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-white transition-colors drop-shadow-sm"
          >
            <HelpCircle className="size-3.5" />
            <span>{lang === "bn" ? "সাপোর্ট" : "Support"}</span>
          </a>
        </div>
      </footer>

      {/* ─── FORGOT PASSWORD MODAL ────────────────────────────────────────────── */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent
          className="max-w-md rounded-3xl p-6 bg-[#FFF5ED] border border-[#EBE2D7] shadow-2xl text-[#2C241E]"
          style={{ backgroundColor: "#FFF5ED" }}
        >
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold text-[#2C241E]">
              {lang === "bn" ? "পাসওয়ার্ড রিসেট করুন" : "Reset your password"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7A6F66]">
              {lang === "bn"
                ? "আপনার অ্যাকাউন্টের ইমেইল দিন। আমরা একটি পাসওয়ার্ড রিসেট লিংক পাঠাব।"
                : "Enter your registered email and we'll send you a password reset link."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#65594F]">
                {lang === "bn" ? "ইমেইল এড্রেস *" : "Email address *"}
              </label>
              <div className="relative flex items-center bg-white rounded-2xl border border-[#E8DFD3] focus-within:border-[#55A61D] h-12">
                <Mail className="size-4 text-[#A4988E] ml-3.5 shrink-0" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-full bg-transparent pl-3 pr-4 text-[#2C241E] text-xs sm:text-sm focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 pt-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                className="h-10 rounded-xl text-xs text-[#65594F] border-[#E8DFD3] hover:bg-white cursor-pointer"
              >
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={forgotBusy || !forgotEmail.trim()}
                className="h-10 rounded-xl text-xs font-bold bg-[#55A61D] hover:bg-[#489117] text-white cursor-pointer"
              >
                {forgotBusy ? <RefreshCw className="size-4 animate-spin mr-1.5" /> : null}
                <span>{lang === "bn" ? "রিসেট লিংক পাঠান" : "Send reset link"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── POST-SIGNUP ONBOARDING MODAL (Shop Name, Logo, Tagline & Industry) ─── */}
      <Dialog open={!!onboardingUser} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-[#FFFDF9] border border-[#E8DFD3] shadow-2xl text-[#2C241E]"
          style={{ backgroundColor: "#FFFDF9" }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-[#55A61D]/10 text-[#55A61D] border border-[#55A61D]/20 flex items-center justify-center shrink-0">
                <Store className="size-6 text-[#55A61D]" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#2C241E]">
                  {lang === "bn" ? "আপনার ব্যবসার প্রোফাইল সেটআপ" : "Welcome! Setup Your Business"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#7A6F66]">
                  {lang === "bn"
                    ? "দোকান বা রেস্তোরাঁর নাম, লোগো, ট্যাগলাইন এবং ইন্ডাস্ট্রি নির্বাচন করুন।"
                    : "Enter your store details, tagline, logo, and choose your business industry."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCompleteOnboarding} className="space-y-4 mt-3">
            {/* 1. Shop Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#544940]">
                {lang === "bn" ? "দোকান বা রেস্তোরাঁর নাম *" : "Business / Shop Name *"}
              </Label>
              <Input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: ড্রিম ডাইন ক্যাফে / রয়াল ফ্যাশন" : "e.g. Dream Dine Cafe & Restaurant / Royal Fashion"}
                className="h-11 rounded-xl bg-white border-[#E8DFD3] text-[#2C241E] text-xs sm:text-sm px-3.5 focus-visible:ring-[#55A61D]"
              />
            </div>

            {/* 2. Tagline */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#544940] flex items-center gap-1.5">
                <Quote className="size-3.5 text-[#55A61D]" />
                <span>{lang === "bn" ? "ট্যাগলাইন (স্লোগান)" : "Business Tagline / Slogan"}</span>
              </Label>
              <Input
                type="text"
                value={shopTagline}
                onChange={(e) => setShopTagline(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: সেরা স্বাদের বিশ্বস্ত ঠিকানা" : "e.g. Where Good Taste Meets Quality"}
                className="h-11 rounded-xl bg-white border-[#E8DFD3] text-[#2C241E] text-xs sm:text-sm px-3.5 focus-visible:ring-[#55A61D]"
              />
            </div>

            {/* 3. Industry / Business Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#544940]">
                {lang === "bn" ? "ইন্ডাস্ট্রি / ব্যবসার ধরন নির্বাচন করুন *" : "Select Your Business Industry *"}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INDUSTRIES.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = shopIndustry === ind.id;
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => setShopIndustry(ind.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-[#55A61D]/10 border-[#55A61D] text-[#2C241E] shadow-xs"
                          : "bg-white border-[#E8DFD3] hover:border-[#55A61D]/50 text-[#65594F]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`p-1.5 rounded-xl ${isSelected ? "bg-[#55A61D] text-white" : "bg-[#F2ECE4] text-[#65594F]"}`}>
                          <Icon className="size-4" />
                        </div>
                        {isSelected && <CheckCircle2 className="size-4 text-[#55A61D]" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs leading-tight">
                          {lang === "bn" ? ind.labelBn : ind.labelEn}
                        </div>
                        <div className="text-[10px] text-[#8C8074] leading-tight line-clamp-1 mt-0.5">
                          {ind.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Logo Upload & Preview */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-[#544940] flex items-center justify-between">
                <span>{lang === "bn" ? "ব্যবসার লোগো" : "Shop / Brand Logo"}</span>
                {logoUploading && <span className="text-[10px] text-[#55A61D] animate-pulse">Uploading...</span>}
              </Label>
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl border border-[#E8DFD3] p-1 bg-white flex items-center justify-center shrink-0 shadow-xs">
                  {shopLogo ? (
                    <img src={shopLogo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <ImageIcon className="size-5 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="h-10 rounded-xl bg-white border-[#E8DFD3] text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-[#55A61D] file:text-white cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 5. Address (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#544940]">
                {lang === "bn" ? "ঠিকানা (ঐচ্ছিক)" : "Address (Optional)"}
              </Label>
              <Input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: বনানী, ঢাকা" : "e.g. Banani, Dhaka"}
                className="h-11 rounded-xl bg-white border-[#E8DFD3] text-[#2C241E] text-xs sm:text-sm px-3.5 focus-visible:ring-[#55A61D]"
              />
            </div>

            <DialogFooter className="flex flex-row gap-2 pt-3 justify-end border-t border-[#E8DFD3]">
              <Button
                type="submit"
                disabled={onboardingBusy || !shopName.trim()}
                className="w-full sm:w-auto h-11 px-6 rounded-xl text-sm font-bold bg-[#55A61D] hover:bg-[#489117] text-white cursor-pointer shadow-md shadow-[#55A61D]/25"
              >
                {onboardingBusy ? (
                  <RefreshCw className="size-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="size-4 mr-1.5" />
                )}
                <span>
                  {shopIndustry === "restaurant"
                    ? (lang === "bn" ? "রেস্তোরাঁ পিওএস শুরু করুন" : "Launch Restaurant POS")
                    : (lang === "bn" ? "ড্যাশবোর্ডে প্রবেশ করুন" : "Enter Dashboard")}
                </span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
