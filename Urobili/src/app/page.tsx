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
        (typeof window !== "undefined" ? localStorage.getItem("cw_industry") || "restaurant" : "restaurant");
      router.replace(industry === "restaurant" ? "/restaurant" : "/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <SpeedLoader />;
  }

  return <AuthPage />;
}


