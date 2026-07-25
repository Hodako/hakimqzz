"use client";

import { useEffect, useState, useCallback } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows a sticky banner when camera permission is denied.
 * On Android/Capacitor it guides users to the system settings.
 */
export function CameraPermissionChecker() {
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);

  const requestCameraAccess = useCallback(async (silent = false) => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) return;
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionState("granted");
      setShowBanner(false);
    } catch (err: any) {
      console.warn("Camera permission error:", err);
      if (err?.name === "NotAllowedError") {
        setPermissionState("denied");
        setShowBanner(true);
      }
    } finally {
      setRequesting(false);
    }
  }, []);

  const checkPermission = useCallback(async () => {
    if (typeof window === "undefined" || !navigator) return;

    if (navigator.permissions?.query) {
      try {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        setPermissionState(result.state as any);

        if (result.state === "denied") {
          setShowBanner(true);
        } else if (result.state === "prompt") {
          // Silently request once on first visit
          await requestCameraAccess(true);
        }

        result.onchange = () => {
          setPermissionState(result.state as any);
          setShowBanner(result.state === "denied");
        };
        return;
      } catch (_) {
        // permissions.query not supported for 'camera' on this browser
      }
    }

    // Fallback: just try requesting
    await requestCameraAccess(true);
  }, [requestCameraAccess]);

  useEffect(() => {
    const timer = setTimeout(checkPermission, 2000);
    return () => clearTimeout(timer);
  }, [checkPermission]);

  if (!showBanner || permissionState === "granted") return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md bg-zinc-900/95 text-white backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-2.5">
        <div className="size-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
          <Camera className="size-4 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-300">
              ক্যামেরার অনুমতি প্রয়োজন / Camera Access Needed
            </h4>
            <button
              onClick={() => setShowBanner(false)}
              className="text-zinc-400 hover:text-white p-0.5 rounded-lg transition"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-300 leading-snug">
            বারকোড স্ক্যানার ব্যবহার করতে ক্যামেরার অনুমতি দিন।
            <span className="block text-[10px] text-zinc-400 mt-0.5">
              Android: Settings → Apps → Dream Fashion → Permissions → Camera
            </span>
          </p>

          <div className="pt-1 flex gap-2">
            <Button
              size="sm"
              className="h-7 px-3 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-black shadow"
              disabled={requesting}
              onClick={() => requestCameraAccess(false)}
            >
              {requesting ? "..." : "Allow Camera / ক্যামেরা চালু করুন"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
