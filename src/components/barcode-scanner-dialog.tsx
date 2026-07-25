"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Scan, CheckCircle2, AlertTriangle, FlipHorizontal, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

// Play audio beep on barcode scan
export function playBarcodeBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (scannedCode: string) => void;
  title?: string;
  continuous?: boolean;
}

type PermState = "idle" | "granted" | "denied" | "requesting";

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  title,
  continuous = false,
}: BarcodeScannerDialogProps) {
  const { lang } = useT();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>("");
  const readerRef = useRef<any>(null);

  const [permissionState, setPermissionState] = useState<PermState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scanFlash, setScanFlash] = useState<boolean>(false);

  // ── Stop camera stream & cancel decode loop ─────────────────────────────
  const stopScanner = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPermissionState("idle");
  }, []);

  // ── Handle a decoded barcode (Fast POS-style behavior) ───────────────────
  const handleDecodedCode = useCallback(
    (code: string) => {
      const now = Date.now();
      // Debounce: ignore same code within 1.2 s
      if (lastCodeRef.current === code && now - lastScanTimeRef.current < 1200) return;
      lastCodeRef.current = code;
      lastScanTimeRef.current = now;

      setLastScanned(code);
      setScanCount((prev) => prev + 1);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 300);

      playBarcodeBeep();
      onScan(code);

      if (!continuous) {
        stopScanner();
        onOpenChange(false);
      } else {
        toast.success(lang === "bn" ? `স্ক্যান সম্পন্ন: ${code}` : `Scanned Code: ${code}`);
      }
    },
    [continuous, lang, onOpenChange, onScan, stopScanner]
  );

  // ── ZXing decode loop (runs per animation frame) ─────────────────────────
  const startDecodeLoop = useCallback(
    (reader: any) => {
      const tick = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.paused || video.ended) {
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        try {
          const result = await reader.decodeFromVideoElement(video);
          if (result) {
            handleDecodedCode(result.getText());
          }
        } catch (_) {
          // NotFoundException when no barcode in current frame — normal
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [handleDecodedCode]
  );

  // ── Start camera scan & prompt permissions for Phone Rear Camera ─────────
  const startCameraScan = useCallback(
    async (cameraId?: string, facing: "environment" | "user" = "environment") => {
      stopScanner();
      setCameraError(null);
      setPermissionState("requesting");

      if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
        setPermissionState("denied");
        setCameraError(
          lang === "bn"
            ? "ক্যামেরা ব্যবহারের জন্য সিকিউর কানেকশন (HTTPS বা localhost) প্রয়োজন। পিকচার আপলোড বা ম্যানুয়াল এন্ট্রি ব্যবহার করুন।"
            : "Camera access requires HTTPS or localhost. Please use Image Upload or Manual Entry."
        );
        return;
      }

      try {
        let stream: MediaStream | null = null;

        // 1. Force back camera selection on mobile phones
        if (!cameraId && facing === "environment") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { exact: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch (exactErr) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: { ideal: "environment" },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                audio: false,
              });
            } catch (_) {}
          }
        }

        if (!stream) {
          const videoConstraints: MediaTrackConstraints = cameraId
            ? { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } };

          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: videoConstraints,
              audio: false,
            });
          } catch (_) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            } catch (finalErr) {
              throw finalErr;
            }
          }
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");
          videoRef.current.setAttribute("muted", "true");
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        let hints: Map<any, any> | undefined;
        try {
          const zxingLib = await import("@zxing/library");
          const DecodeHintType = zxingLib?.DecodeHintType;
          const BarcodeFormat = zxingLib?.BarcodeFormat;
          if (DecodeHintType?.POSSIBLE_FORMATS && BarcodeFormat) {
            hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.QR_CODE,
              BarcodeFormat.DATA_MATRIX,
              BarcodeFormat.ITF,
            ]);
            if (DecodeHintType.TRY_HARDER) {
              hints.set(DecodeHintType.TRY_HARDER, true);
            }
          }
        } catch (_) {}

        const reader = hints ? new BrowserMultiFormatReader(hints) : new BrowserMultiFormatReader();
        readerRef.current = reader;

        setPermissionState("granted");
        startDecodeLoop(reader);

        if (navigator?.mediaDevices?.enumerateDevices) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices
              .filter((d) => d.kind === "videoinput")
              .map((d, i) => ({ id: d.deviceId, label: d.label || (lang === "bn" ? `ক্যামেরা ${i + 1}` : `Camera ${i + 1}`) }));

            if (videoDevices.length > 0) {
              setCameras(videoDevices);
              const backCam = videoDevices.find((d) => /back|rear|environment|main/i.test(d.label));
              if (backCam && !selectedCameraId) {
                setSelectedCameraId(backCam.id);
              }
            }
          } catch (_) {}
        }
      } catch (err: any) {
        console.error("POS Camera start error:", err);
        setPermissionState("denied");
        setCameraError(
          err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
            ? lang === "bn"
              ? "ক্যামেরার অনুমতি প্রয়োজন। ডিভাইসের Settings > Apps > Dream Fashion এ গিয়ে ক্যামেরা পারমিশন এলাউ করুন।"
              : "Camera permission denied. Enable Camera access in app settings."
            : lang === "bn"
              ? "ক্যামেরা স্ক্যানার চালু করা যায়নি (HTTPS বা সিকিউর কানেকশন প্রয়োজন)। পিকচার আপলোড বা ম্যানুয়াল কোড এন্ট্রি ব্যবহার করুন।"
              : "Camera scanner unavailable (HTTPS required). Please use Image Upload or Manual Entry."
        );
      }
    },
    [lang, selectedCameraId, startDecodeLoop, stopScanner]
  );

  useEffect(() => {
    if (open) {
      setLastScanned(null);
      setScanCount(0);
      lastCodeRef.current = "";
      const t = setTimeout(() => startCameraScan(selectedCameraId || undefined, facingMode), 150);
      return () => clearTimeout(t);
    } else {
      stopScanner();
    }
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCameraSwitch = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    startCameraScan(cameraId, facingMode);
  };

  const handleFlipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCameraScan(undefined, next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) stopScanner();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-xl p-4 sm:p-5 bg-card border-border rounded-3xl shadow-2xl overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Scan className="size-4 text-primary animate-pulse" />
            </div>
            <span>{title ?? (lang === "bn" ? "পিওএস বারকোড স্ক্যানার" : "POS Barcode Scanner")}</span>
          </DialogTitle>
        </DialogHeader>

        {/* ── POS CAMERA VIEW & SCANNER UI ────────────────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <div className={`relative rounded-2xl overflow-hidden bg-black min-h-[300px] sm:min-h-[340px] border transition-all duration-200 shadow-2xl flex flex-col items-center justify-center ${
            scanFlash ? "border-emerald-500 ring-4 ring-emerald-500/50" : "border-border/80"
          }`}>
            <video
              ref={videoRef}
              className="w-full h-full min-h-[300px] sm:min-h-[340px] object-cover"
              playsInline
              muted
              autoPlay
            />

            {permissionState === "denied" && (
              <div className="absolute inset-0 p-5 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-3 z-30">
                <div className="size-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                  <AlertTriangle className="size-6" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <p className="text-xs font-bold text-foreground">
                    {lang === "bn" ? "ক্যামেরার অনুমতি প্রয়োজন" : "Camera Access Required"}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{cameraError}</p>
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs font-bold px-4 gap-1.5 shadow"
                  onClick={() => startCameraScan(selectedCameraId || undefined, facingMode)}
                >
                  <RefreshCw className="size-3.5" />
                  {lang === "bn" ? "পারমিশন দিন ও পুনরায় চেষ্টা করুন" : "Allow Camera & Retry"}
                </Button>
              </div>
            )}

            {permissionState === "requesting" && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2 z-20">
                <Camera className="size-8 animate-bounce text-primary" />
                <p className="text-xs font-medium text-muted-foreground animate-pulse">
                  {lang === "bn" ? "ক্যামেরা চালু করা হচ্ছে..." : "Starting camera stream..."}
                </p>
              </div>
            )}

            {permissionState === "granted" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                <div className={`w-72 h-44 border-2 rounded-2xl relative transition-all duration-200 ${
                  scanFlash ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.8)]" : "border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                }`}>
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.95)] animate-pulse" />
                </div>
              </div>
            )}

            {permissionState === "granted" && (
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-[10px] font-bold flex items-center gap-2 z-20 shadow-md">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{lang === "bn" ? "ক্যামেরা সচল 🟢" : "Camera Live 🟢"}</span>
              </div>
            )}

            {permissionState === "granted" && (
              <button
                onClick={handleFlipCamera}
                className="absolute top-3 right-3 z-20 size-8 rounded-full bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/90 transition"
                title={lang === "bn" ? "ক্যামেরা পরিবর্তন করুন" : "Flip Camera"}
              >
                <FlipHorizontal className="size-4" />
              </button>
            )}

            {cameras.length > 1 && permissionState === "granted" && (
              <div className="absolute bottom-3 right-3 z-20">
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraSwitch(e.target.value)}
                  className="h-7 bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] rounded-lg px-2 focus:outline-none cursor-pointer"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* POS Scan Result Badge */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {lang === "bn" ? "সর্বশেষ স্ক্যানকৃত বারকোড" : "Last Scanned Barcode"}
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-foreground truncate" title={lastScanned || "—"}>
                  {lastScanned || (lang === "bn" ? "পণ্যের বারকোডের দিকে ক্যামেরা ধরুন..." : "Point camera at product barcode...")}
                </div>
              </div>
            </div>
            {scanCount > 0 && (
              <span className="text-xs font-bold bg-emerald-600 text-white px-3 py-1 rounded-full shrink-0 shadow flex items-center gap-1">
                <Zap className="size-3 fill-white" />
                {scanCount} {lang === "bn" ? "টি স্ক্যানকৃত" : "scanned"}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
