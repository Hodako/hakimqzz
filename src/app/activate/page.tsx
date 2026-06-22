"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AppLogo } from "@/components/app-logo";
import { SpeedLoader } from "@/components/speed-loader";
import { toast } from "sonner";
import { activateLicenseFn } from "@/lib/rpc-admin";

export default function ActivatePage() {
  const { user, loading, refresh } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth");
      } else if (user.activated) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.activated) return <SpeedLoader />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    try {
      await activateLicenseFn({ data: { licenseKey: key.trim() } });
      await refresh();
      toast.success(t("save"));
      router.replace("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass-card w-full max-w-md p-6 space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <AppLogo size="lg" />
          <h1 className="text-xl font-serif font-bold">Activate License</h1>
          <p className="text-sm text-muted-foreground">
            Enter your business or employee license key to activate HakimEzy.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">License Key</Label>
            <Input
              placeholder="HZ-XXXX-XXXX-XXXX or EMP-XXXX-XXXX-XXXX"
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "…" : "Activate Account"}
          </Button>

          <div className="pt-2 text-center">
            <a
              href="https://wa.me/8801783501427?text=Hello%20Admin,%20I%20need%20a%20license%20key%20for%20HakimEzy."
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "'Roboto', sans-serif" }}
              className="w-full h-11 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm uppercase tracking-wide"
            >
              <svg className="size-4 fill-current inline-block" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 2.028 14.07 1.001 11.45 1c-5.448 0-9.873 4.372-9.877 9.802-.001 1.77.474 3.498 1.38 5.048L1.93 20.89l5.097-1.343zM18.17 14.85c-.34-.17-2.01-1-2.32-1.115-.31-.115-.53-.17-.75.17-.22.34-.85 1.115-1.04 1.343-.19.227-.38.257-.72.086-2.11-.99-3.48-1.99-4.75-4.17-.34-.585.34-.543.98-1.817.11-.227.056-.427-.028-.597-.084-.17-.75-1.81-1.03-2.48-.276-.665-.553-.574-.75-.585-.19-.01-.41-.01-.63-.01-.22 0-.58.08-.88.41-.3.33-1.15 1.12-1.15 2.73s1.17 3.16 1.33 3.38c.16.22 2.3 3.52 5.58 4.94.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.62-.09 2.01-.82 2.3-1.57.29-.75.29-1.39.2-1.52-.09-.13-.34-.23-.68-.4z"/>
              </svg>
              Contact Admin
            </a>
          </div>
        </form>
      </Card>
    </div>
  );
}
