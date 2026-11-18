"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EmployeesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to consolidated Employee Hub ("কর্মচারী হাব")
    router.replace("/employee-hub");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm font-semibold text-muted-foreground font-charukola">
        কর্মচারী হাবে স্থানান্তর করা হচ্ছে...
      </p>
    </div>
  );
}
