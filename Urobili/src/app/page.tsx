"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { SpeedLoader } from "@/components/speed-loader";
import AuthPage from "./auth/page";

export default function IndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const industry =
        user.industry ||
        (typeof window !== "undefined" ? localStorage.getItem("cw_industry") : "");
      const isConfigured = Boolean(industry && (user as any).onboarding_completed !== false);

      if (isConfigured) {
        router.replace(industry === "restaurant" ? "/restaurant" : "/dashboard");
      } else {
        router.replace("/auth");
      }
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <SpeedLoader />;
  }

  return <AuthPage />;
}


