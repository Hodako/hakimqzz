"use client";

import { useEffect } from "react";

/**
 * Proactively requests camera permission on page load so the browser
 * shows the native permission dialog before the user opens the scanner.
 * Works on Android WebView (Capacitor), Chrome, Firefox, Safari.
 */
export function AutoCameraTrigger() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only trigger if permission hasn't been decided yet
    const requestCamera = async () => {
      try {
        // Check existing permission state first (avoids redundant popups)
        if (navigator?.permissions?.query) {
          try {
            const result = await navigator.permissions.query({ name: "camera" as PermissionName });
            if (result.state === "granted" || result.state === "denied") {
              // Already decided — don't re-prompt
              return;
            }
          } catch (_) {
            // Some browsers don't support 'camera' in permissions.query — continue anyway
          }
        }

        if (!navigator?.mediaDevices?.getUserMedia) return;

        // Request rear camera first (preferred for barcode scanning)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        // Release immediately — we only need the permission grant
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        if (err?.name !== "NotAllowedError") {
          // Fallback: try generic video
          try {
            if (navigator?.mediaDevices?.getUserMedia) {
              const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
              s.getTracks().forEach((t) => t.stop());
            }
          } catch (_) {}
        }
      }
    };

    // Delay slightly so the app shell is mounted and the user sees it
    const timer = setTimeout(requestCamera, 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
