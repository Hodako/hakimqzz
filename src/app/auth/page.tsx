"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { SpeedLoader } from "@/components/speed-loader";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginFn, registerFn, firebaseAuthSyncFn, employeeLoginFn } from "@/lib/rpc";
import type { AuthUser } from "@/hooks/use-auth";
import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { KeyRound, Mail, CheckCircle2, RefreshCw, UserCheck, Shield, Lock, User, ArrowRight, Eye, EyeOff, Store, Phone, Sparkles } from "lucide-react";

export default function AuthPage() {
  const { user, loading, login } = useAuth();
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Active Main Tab: Owner vs Employee
  const [mainRole, setMainRole] = useState<"owner" | "employee">("owner");

  // Owner Auth State
  const [ownerMode, setOwnerMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Employee Auth State
  const [empMode, setEmpMode] = useState<"signin" | "signup">("signin");
  const [empIdentifier, setEmpIdentifier] = useState("");
  const [empFullName, setEmpFullName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [showEmpPassword, setShowEmpPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Forgot Password State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

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
      if (user) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router, mounted]);

  if (!mounted || loading || user) return <SpeedLoader />;

  function afterAuth(u: AuthUser | null) {
    if (!u) return;
    login(u);
    router.replace("/dashboard");
  }

  // ─── Owner Sign-In ────────────────────────────────────────────────────────
  async function handleOwnerSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (fbErr: any) {
        if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential") {
          try {
            await createUserWithEmailAndPassword(auth, cleanEmail, password);
          } catch {}
        }
      }

      const data = await loginFn({ data: { email: cleanEmail, password } });
      afterAuth(data.user as AuthUser);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  // ─── Owner Sign-Up ────────────────────────────────────────────────────────
  async function handleOwnerSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (fullName && userCred.user) {
          await updateProfile(userCred.user, { displayName: fullName });
        }
      } catch (fbErr: any) {
        if (fbErr.code !== "auth/email-already-in-use") {
          console.warn("Firebase Auth registration notice:", fbErr.message);
        }
      }

      const data = await registerFn({ data: { email: cleanEmail, password, fullName } });
      toast.success(lang === "bn" ? "দোকান মালিক অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!" : "Shop Owner account created successfully!");
      afterAuth(data.user as AuthUser);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  // ─── Employee Sign-In (Direct Credentials or Email) ───────────────────────
  async function handleEmployeeSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!empIdentifier.trim() || !empPassword) {
      toast.error(lang === "bn" ? "ইউজারনেম/মোবাইল নম্বর ও পাসওয়ার্ড লিখুন" : "Please enter username/phone and password");
      return;
    }
    setBusy(true);
    try {
      // First try employee credential login (username, phone, or assigned email)
      const data = await employeeLoginFn({
        data: {
          username: empIdentifier.trim(),
          password: empPassword,
        },
      });
      toast.success(lang === "bn" ? "কর্মচারী হিসেবে সফলভাবে লগইন হয়েছে!" : "Employee signed in successfully!");
      afterAuth(data.user as AuthUser);
    } catch (err: unknown) {
      // If identifier is an email, fallback to general email login
      if (empIdentifier.includes("@")) {
        try {
          const cleanEmail = empIdentifier.trim().toLowerCase();
          try {
            await signInWithEmailAndPassword(auth, cleanEmail, empPassword);
          } catch {}
          const data = await loginFn({ data: { email: cleanEmail, password: empPassword } });
          afterAuth(data.user as AuthUser);
          return;
        } catch {}
      }
      toast.error(err instanceof Error ? err.message : "Employee login failed. Please check credentials.");
    } finally {
      setBusy(false);
    }
  }

  // ─── Employee Sign-Up (Email & Password for Staff) ─────────────────────────
  async function handleEmployeeSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = empEmail.trim().toLowerCase();

      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, empPassword);
        if (empFullName && userCred.user) {
          await updateProfile(userCred.user, { displayName: empFullName });
        }
      } catch (fbErr: any) {
        if (fbErr.code !== "auth/email-already-in-use") {
          console.warn("Firebase Auth notice:", fbErr.message);
        }
      }

      // Register staff user in database
      const data = await registerFn({ data: { email: cleanEmail, password: empPassword, fullName: empFullName } });
      toast.success(lang === "bn" ? "কর্মচারী অ্যাকাউন্ট তৈরি হয়েছে! লগইন করুন।" : "Employee account created! Logged in successfully.");
      afterAuth(data.user as AuthUser);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Employee registration failed");
    } finally {
      setBusy(false);
    }
  }

  // ─── Google Sign-In (For Both Owner & Employee) ───────────────────────────
  async function handleGoogleSignIn() {
    setGoogleBusy(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        throw new Error("Unable to retrieve email from Google Account");
      }

      const data = await firebaseAuthSyncFn({
        data: {
          email: fbUser.email,
          fullName: fbUser.displayName || undefined,
          photoUrl: fbUser.photoURL || undefined,
          firebaseUid: fbUser.uid,
        },
      });

      toast.success(lang === "bn" ? "গুগল দিয়ে সফলভাবে সাইন ইন হয়েছে!" : "Google sign-in successful!");
      afterAuth(data.user as AuthUser);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        return;
      }
      toast.error(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleBusy(false);
    }
  }

  // ─── Forgot Password ───────────────────────────────────────────────────────
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      toast.error(lang === "bn" ? "আপনার নিবন্ধিত ইমেইল এড্রেস লিখুন" : "Please enter your registered email");
      return;
    }

    setForgotBusy(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim().toLowerCase());
      setForgotSent(true);
      toast.success(
        lang === "bn"
          ? "পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে!"
          : "Password reset link sent to your email!"
      );
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        toast.error(lang === "bn" ? "এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি" : "No user found with this email address");
      } else if (err.code === "auth/invalid-email") {
        toast.error(lang === "bn" ? "সঠিক ইমেইল এড্রেস লিখুন" : "Invalid email address format");
      } else {
        toast.error(err.message || "Failed to send reset email");
      }
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full grid grid-cols-1 md:grid-cols-12 bg-background text-foreground select-none">
      {/* ─── Left Panel: Hero Showcase (Desktop only) ────────────────────────── */}
      <div
        className="hidden md:flex md:col-span-6 lg:col-span-7 relative flex-col justify-between p-8 lg:p-12 text-white select-none overflow-hidden bg-cover bg-center h-full min-h-screen"
        style={{ backgroundImage: `linear-gradient(rgba(9, 9, 11, 0.75), rgba(9, 9, 11, 0.88)), url('/login_illustration.jpg')` }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top brand */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <AppLogo size="md" alt="HakimQzz" />
          <span className="font-serif text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent">
            HakimQzz
          </span>
        </div>

        {/* Middle description */}
        <div className="space-y-4 lg:space-y-6 relative z-10 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>{lang === "bn" ? "যেকোনো ব্যবসার আস্থার প্রতীক" : "Smart POS & Business ERP"}</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold font-serif leading-tight text-white">
            {lang === "bn"
              ? `"HakimQzz" ইনভেন্টরি, সেলস ও একাউন্টিং সলিউশন`
              : `"HakimQzz" Inventory, Sales & Accounting Solution`}
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed max-w-md">
            {lang === "bn"
              ? "স্টক মূল্যায়ন, ক্যাশ ফ্লো, কাস্টম ইনভয়েস, কর্মচারী এক্সেস এবং বিক্রয় ট্র্যাকিং সহজতর করার পূর্ণাঙ্গ প্ল্যাটফর্ম।"
              : "Next-generation inventory valuation, cashbox ledger, custom invoices, staff management, and analytics in one place."}
          </p>
        </div>

        {/* Single Official Attribution Footer (PC Left Panel Only) */}
        <div className="space-y-1 relative z-10 text-xs text-zinc-400 border-t border-white/10 pt-4 font-balooda shrink-0">
          <p className="text-zinc-200 font-semibold text-xs">
            made with love by <span className="font-bold text-white">Azizul Hakim Khan</span>.
          </p>
          <p className="text-[11px] text-zinc-400">
            @2026 - infinite all rights reserved by <span className="font-bold text-zinc-200">Hakim Qzz</span>.
          </p>
          <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 pt-0.5">
            <span>Whatsapp Support:</span>
            <a href="https://wa.me/8801783501427" target="_blank" rel="noopener noreferrer" className="hover:underline text-emerald-400">
              +8801783501427
            </a>
          </p>
        </div>
      </div>

      {/* ─── Right Panel: Clean Form Widget ──────────────────────────────────── */}
      <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 min-h-[100dvh] overflow-y-auto">
        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <AppLogo size="sm" alt="HakimQzz" />
            <span className="font-serif text-lg font-bold">HakimQzz</span>
          </div>

          <div className="flex gap-1 rounded-full bg-white dark:bg-zinc-900 border border-border/80 p-0.5 text-xs ml-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setLang("bn")}
              className={`px-3 py-1 rounded-full cursor-pointer font-medium transition-all ${
                lang === "bn" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full cursor-pointer font-medium transition-all ${
                lang === "en" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Center: Main Form Card */}
        <div className="w-full max-w-md mx-auto my-auto py-2 sm:py-4">
          <div className="p-5 sm:p-7 rounded-3xl bg-card border border-border shadow-xl space-y-5">
            {/* Top Primary Tab: Shop Owner vs Employee */}
            <div className="grid grid-cols-2 p-1 bg-muted/80 rounded-2xl border border-border/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMainRole("owner")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mainRole === "owner"
                    ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="size-4 text-primary" />
                <span>{lang === "bn" ? "দোকান মালিক" : "Shop Owner"}</span>
              </button>

              <button
                type="button"
                onClick={() => setMainRole("employee")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mainRole === "employee"
                    ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm font-bold border border-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="size-4 text-emerald-500" />
                <span>{lang === "bn" ? "কর্মচারী (Staff)" : "Employee / Staff"}</span>
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* 1. EMPLOYEE AUTHENTICATION VIEW                                      */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {mainRole === "employee" ? (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center justify-center size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mb-1">
                    <UserCheck className="size-5" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-serif font-bold text-foreground">
                    {empMode === "signin"
                      ? (lang === "bn" ? "কর্মচারী লগইন" : "Employee Sign In")
                      : (lang === "bn" ? "কর্মচারী সাইন আপ" : "Employee Sign Up")}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {empMode === "signin"
                      ? (lang === "bn" ? "দোকান মালিকের দেওয়া ইউজারনেম/মোবাইল/ইমেইল দিয়ে প্রবেশ করুন" : "Sign in with your staff username, phone, or email")
                      : (lang === "bn" ? "কর্মচারী হিসেবে নতুন একাউন্ট তৈরি করুন" : "Create a new employee account")}
                  </p>
                </div>

                {/* Sub-tab: Sign In vs Sign Up for Employee */}
                <div className="flex rounded-xl bg-muted/60 p-0.5 border border-border text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setEmpMode("signin")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      empMode === "signin" ? "bg-background text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang === "bn" ? "লগইন করুন" : "Sign In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpMode("signup")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      empMode === "signup" ? "bg-background text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang === "bn" ? "নতুন একাউন্ট" : "Sign Up"}
                  </button>
                </div>

                {/* Form: Employee Sign In */}
                {empMode === "signin" ? (
                  <form onSubmit={handleEmployeeSignIn} className="space-y-3.5 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        <span>{lang === "bn" ? "ইউজারনেম, মোবাইল বা ইমেইল" : "Username, Mobile or Email"}</span>
                      </Label>
                      <Input
                        type="text"
                        required
                        value={empIdentifier}
                        onChange={(e) => setEmpIdentifier(e.target.value)}
                        placeholder={lang === "bn" ? "যেমন: rahim, 017XXXXXXXX বা rahim@gmail.com" : "e.g. rahim, 017XXXXXXXX or staff@gmail.com"}
                        className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-emerald-500 w-full"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Lock className="size-3.5 text-muted-foreground" />
                          <span>{t("password")}</span>
                        </Label>
                        <button
                          type="button"
                          onClick={() => setShowEmpPassword(!showEmpPassword)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {showEmpPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          <span>{showEmpPassword ? (lang === "bn" ? "লুকান" : "Hide") : (lang === "bn" ? "দেখান" : "Show")}</span>
                        </button>
                      </div>
                      <Input
                        type={showEmpPassword ? "text" : "password"}
                        required
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        placeholder={lang === "bn" ? "আপনার পাসওয়ার্ড লিখুন" : "Enter your password"}
                        className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-emerald-500 w-full"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={busy}
                      className="w-full h-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] gap-2 mt-1 cursor-pointer"
                    >
                      {busy ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <>
                          <span>{lang === "bn" ? "কর্মচারী হিসেবে প্রবেশ করুন" : "Sign In as Employee"}</span>
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  /* Form: Employee Sign Up */
                  <form onSubmit={handleEmployeeSignUp} className="space-y-3.5 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        <span>{lang === "bn" ? "পুরো নাম" : "Full Name"}</span>
                      </Label>
                      <Input
                        type="text"
                        required
                        value={empFullName}
                        onChange={(e) => setEmpFullName(e.target.value)}
                        placeholder={lang === "bn" ? "আপনার পুরো নাম লিখুন" : "e.g. Md Rahim Khan"}
                        className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-emerald-500 w-full"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <span>{t("email")}</span>
                      </Label>
                      <Input
                        type="email"
                        required
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        placeholder={lang === "bn" ? "যেমন: employee@gmail.com" : "e.g. employee@gmail.com"}
                        className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-emerald-500 w-full"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Lock className="size-3.5 text-muted-foreground" />
                          <span>{t("password")}</span>
                        </Label>
                        <button
                          type="button"
                          onClick={() => setShowEmpPassword(!showEmpPassword)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {showEmpPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          <span>{showEmpPassword ? (lang === "bn" ? "লুকান" : "Hide") : (lang === "bn" ? "দেখান" : "Show")}</span>
                        </button>
                      </div>
                      <Input
                        type={showEmpPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        placeholder={lang === "bn" ? "কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড" : "Create a password (min 6 characters)"}
                        className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-emerald-500 w-full"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={busy}
                      className="w-full h-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] gap-2 mt-1 cursor-pointer"
                    >
                      {busy ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <>
                          <span>{lang === "bn" ? "কর্মচারী অ্যাকাউন্ট তৈরি করুন" : "Create Employee Account"}</span>
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Google Sign-in for Employee */}
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="relative text-center">
                    <span className="bg-card px-2 text-[10px] text-muted-foreground uppercase tracking-wider relative z-10">
                      {lang === "bn" ? "অথবা গুগল দিয়ে লগইন" : "Or Continue With"}
                    </span>
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={googleBusy}
                    className="w-full h-11 sm:h-12 rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs sm:text-sm gap-2.5 shadow-2xs cursor-pointer"
                  >
                    {googleBusy ? (
                      <RefreshCw className="size-4 animate-spin text-primary" />
                    ) : (
                      <svg version="1.1" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="size-4 shrink-0">
                        <path style={{ fill: "#FBBB00" }} d="M113.47,309.408L95.648,375.94l-65.139,1.378C11.042,341.211,0,299.9,0,256c0-42.451,10.324-82.483,28.624-117.732h0.014l57.992,10.632l25.404,57.644c-5.317,15.501-8.215,32.141-8.215,49.456C103.821,274.792,107.225,292.797,113.47,309.408z"></path>
                        <path style={{ fill: "#518EF8" }} d="M507.527,208.176C510.467,223.662,512,239.655,512,256c0,18.328-1.927,36.206-5.598,53.451c-12.462,58.683-45.025,109.925-90.134,146.187l-0.014-0.014l-73.044-3.727l-10.338-64.535c29.932-17.554,53.324-45.025,65.646-77.911h-136.89V208.176h138.887L507.527,208.176L507.527,208.176z"></path>
                        <path style={{ fill: "#28B446" }} d="M416.253,455.624l0.014,0.014C372.396,490.901,316.666,512,256,512c-97.491,0-182.252-54.491-225.491-134.681l82.961-67.91c21.619,57.698,77.278,98.771,142.53,98.771c28.047,0,54.323-7.582,76.87-20.818L416.253,455.624z"></path>
                        <path style={{ fill: "#F14336" }} d="M419.404,58.936l-82.933,67.896c-23.335-14.586-50.919-23.012-80.471-23.012c-66.729,0-123.429,42.957-143.965,102.724l-83.397-68.276h-0.014C71.23,56.123,157.06,0,256,0C318.115,0,375.068,22.126,419.404,58.936z"></path>
                      </svg>
                    )}
                    <span>{lang === "bn" ? "গুগল দিয়ে লগইন করুন (Google Auth)" : "Continue with Google"}</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* ══════════════════════════════════════════════════════════════════════ */
              /* 2. SHOP OWNER AUTHENTICATION VIEW                                    */
              /* ══════════════════════════════════════════════════════════════════════ */
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center justify-center size-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-1">
                    <Shield className="size-5" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-serif font-bold text-foreground">
                    {ownerMode === "signin" ? t("sign_in") : t("sign_up")}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {ownerMode === "signin"
                      ? (lang === "bn" ? "আপনার শপ ড্যাশবোর্ডে প্রবেশ করুন" : "Login to access your store dashboard")
                      : (lang === "bn" ? "দোকান পরিচালনার জন্য নতুন একাউন্ট খুলুন" : "Create a new shop owner account")}
                  </p>
                </div>

                {/* Sub-tab: Owner Sign In vs Sign Up */}
                <div className="flex rounded-xl bg-muted/60 p-0.5 border border-border text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setOwnerMode("signin")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      ownerMode === "signin" ? "bg-background text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("sign_in")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerMode("signup")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      ownerMode === "signup" ? "bg-background text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("sign_up")}
                  </button>
                </div>

                <form onSubmit={ownerMode === "signin" ? handleOwnerSignIn : handleOwnerSignUp} className="space-y-3.5 pt-1">
                  {/* Full Name on Signup */}
                  {ownerMode === "signup" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        <span>{t("full_name")}</span>
                      </Label>
                      <Input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Azizul Hakim"
                        className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary w-full"
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="size-3.5 text-muted-foreground" />
                      <span>{t("email")}</span>
                    </Label>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. owner@gmail.com"
                      className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary w-full"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="size-3.5 text-muted-foreground" />
                        <span>{t("password")}</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        <span>{showPassword ? (lang === "bn" ? "লুকান" : "Hide") : (lang === "bn" ? "দেখান" : "Show")}</span>
                      </button>
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={ownerMode === "signup" ? 6 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={ownerMode === "signup" ? "Create password (min 6 characters)" : "Enter your password"}
                      className="h-11 sm:h-12 rounded-xl bg-background border-border text-xs sm:text-sm px-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary w-full"
                    />
                  </div>

                  {/* Remember Me / Forgot Password */}
                  {ownerMode === "signin" && (
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded accent-primary cursor-pointer" />
                        <span>Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email || "");
                          setForgotSent(false);
                          setForgotModalOpen(true);
                        }}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        {lang === "bn" ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?"}
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 sm:h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-md shadow-primary/20 transition-all active:scale-[0.98] gap-2 mt-1 cursor-pointer"
                  >
                    {busy ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <>
                        <span>{ownerMode === "signin" ? t("sign_in") : t("create_account")}</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Google Sign-in */}
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="relative text-center">
                    <span className="bg-card px-2 text-[10px] text-muted-foreground uppercase tracking-wider relative z-10">
                      {lang === "bn" ? "অথবা গুগল দিয়ে লগইন" : "Or Continue With"}
                    </span>
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={googleBusy}
                    className="w-full h-11 sm:h-12 rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs sm:text-sm gap-2.5 shadow-2xs cursor-pointer"
                  >
                    {googleBusy ? (
                      <RefreshCw className="size-4 animate-spin text-primary" />
                    ) : (
                      <svg version="1.1" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="size-4 shrink-0">
                        <path style={{ fill: "#FBBB00" }} d="M113.47,309.408L95.648,375.94l-65.139,1.378C11.042,341.211,0,299.9,0,256c0-42.451,10.324-82.483,28.624-117.732h0.014l57.992,10.632l25.404,57.644c-5.317,15.501-8.215,32.141-8.215,49.456C103.821,274.792,107.225,292.797,113.47,309.408z"></path>
                        <path style={{ fill: "#518EF8" }} d="M507.527,208.176C510.467,223.662,512,239.655,512,256c0,18.328-1.927,36.206-5.598,53.451c-12.462,58.683-45.025,109.925-90.134,146.187l-0.014-0.014l-73.044-3.727l-10.338-64.535c29.932-17.554,53.324-45.025,65.646-77.911h-136.89V208.176h138.887L507.527,208.176L507.527,208.176z"></path>
                        <path style={{ fill: "#28B446" }} d="M416.253,455.624l0.014,0.014C372.396,490.901,316.666,512,256,512c-97.491,0-182.252-54.491-225.491-134.681l82.961-67.91c21.619,57.698,77.278,98.771,142.53,98.771c28.047,0,54.323-7.582,76.87-20.818L416.253,455.624z"></path>
                        <path style={{ fill: "#F14336" }} d="M419.404,58.936l-82.933,67.896c-23.335-14.586-50.919-23.012-80.471-23.012c-66.729,0-123.429,42.957-143.965,102.724l-83.397-68.276h-0.014C71.23,56.123,157.06,0,256,0C318.115,0,375.068,22.126,419.404,58.936z"></path>
                      </svg>
                    )}
                    <span>{lang === "bn" ? "গুগল দিয়ে লগইন করুন (Google Auth)" : "Continue with Google"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean, minimal copyright (Mobile view only) */}
        <div className="text-center text-[11px] text-muted-foreground py-2 md:hidden">
          <span>© 2026 HakimQzz POS. All rights reserved.</span>
        </div>
      </div>

      {/* ─── FORGOT PASSWORD MODAL ───────────────────────────────────────────── */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <KeyRound className="size-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {lang === "bn" ? "পাসওয়ার্ড রিসেট করুন" : "Reset Password"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {lang === "bn"
                    ? "পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হবে।"
                    : "Enter your account email to receive a secure password reset link."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {forgotSent ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-bold text-sm">
                    {lang === "bn" ? "ইমেইল সফলভাবে পাঠানো হয়েছে!" : "Password Reset Email Sent!"}
                  </p>
                  <p>
                    {lang === "bn"
                      ? `${forgotEmail} ঠিকানায় পাসওয়ার্ড পরিবর্তনের লিংক পাঠানো হয়েছে। ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।`
                      : `A password reset link has been dispatched to ${forgotEmail}. Please check your inbox or spam folder.`}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setForgotModalOpen(false)}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9"
              >
                {lang === "bn" ? "ঠিক আছে" : "Got It"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {lang === "bn" ? "নিবন্ধিত ইমেইল এড্রেস" : "Registered Email Address"}
                </Label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForgotModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  {lang === "bn" ? "বাতিল" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={forgotBusy}
                  size="sm"
                  className="rounded-xl text-xs bg-primary text-primary-foreground font-bold"
                >
                  {forgotBusy ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <span>{lang === "bn" ? "রিসেট লিংক পাঠান" : "Send Reset Link"}</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
