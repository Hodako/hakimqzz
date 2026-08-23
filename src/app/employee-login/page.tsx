"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Lock, Smartphone, ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { employeeLoginFn } from "@/lib/rpc";
import Link from "next/link";

function EmployeeLoginForm() {
  const { lang } = useT();
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error(lang === "bn" ? "ইউজারনেম/মোবাইল নম্বর ও পাসওয়ার্ড দিন" : "Please enter your username/phone and password");
      return;
    }

    setBusy(true);
    try {
      const res = await employeeLoginFn({
        data: {
          username: identifier.trim(),
          password,
        },
      });

      toast.success(lang === "bn" ? "কর্মচারী পোর্টালে সফলভাবে লগইন হয়েছে!" : "Employee signed in successfully!");
      login(res.user as AuthUser);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Employee login failed. Check credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 shadow-lg shadow-indigo-500/20 backdrop-blur-md mb-1">
            <UserCheck className="size-7 text-indigo-400" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-mono">
              STAFF & EMPLOYEE ACCESS
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {lang === "bn" ? "কর্মচারী লগইন পোর্টাল" : "Employee Portal"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            {lang === "bn"
              ? "দোকান মালিক কর্তৃক প্রদত্ত আপনার ইউজারনেম ও পাসওয়ার্ড দিয়ে সাইন ইন করুন"
              : "Sign in with the employee credentials assigned by your shop owner"}
          </p>
        </div>

        <Card className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-5 text-slate-200">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Smartphone className="size-3.5 text-indigo-400" />
                {lang === "bn" ? "ইউজারনেম বা মোবাইল নম্বর" : "Username or Phone"}
              </Label>
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: employee1 বা 01700000000" : "e.g. staff_rahim or 017XXXXXXXX"}
                required
                className="h-11 rounded-xl bg-slate-800/80 border-slate-700 text-sm text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="size-3.5 text-indigo-400" />
                  {lang === "bn" ? "পাসওয়ার্ড" : "Password"}
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  {showPassword ? (lang === "bn" ? "লুকান" : "Hide") : (lang === "bn" ? "দেখান" : "Show")}
                </button>
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 rounded-xl bg-slate-800/80 border-slate-700 text-sm text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] gap-2 mt-2"
            >
              {busy ? (
                <span>{lang === "bn" ? "যাচাই করা হচ্ছে..." : "Signing in..."}</span>
              ) : (
                <>
                  <span>{lang === "bn" ? "লগইন করুন" : "Sign In to Work"}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-3 border-t border-slate-800 text-center space-y-2">
            <Link
              href="/auth"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              <Store className="size-3.5" />
              <span>{lang === "bn" ? "দোকান মালিক লগইন পোর্টালে যান" : "Are you a Shop Owner? Login here"}</span>
            </Link>
            <p className="text-[11px] text-slate-500">
              {lang === "bn"
                ? "পাসওয়ার্ড ভুলে গেলে আপনার দোকান মালিকের সাথে যোগাযোগ করুন।"
                : "Forgot your password? Please contact your Shop Owner to reset."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">Loading Employee Portal...</div>}>
      <EmployeeLoginForm />
    </Suspense>
  );
}
