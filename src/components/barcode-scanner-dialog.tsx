"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Scan, CheckCircle2, AlertTriangle, FlipHorizontal, Zap, Flashlight, ZoomIn, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

// Play audio beep on barcode scan
export function playBarcodeBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1480, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

// ── Ultra-Advanced Micro-Barcode Image Processing Engine ─────────────────────

// 1. High-contrast adaptive thresholding for tiny/faded barcodes
function applyAdaptiveThreshold(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const len = d.length;

    // Calculate mean brightness
    let totalBright = 0;
    for (let i = 0; i < len; i += 4) {
      totalBright += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    }
    const mean = totalBright / (len / 4);

    // Apply strict binarization around local mean
    for (let i = 0; i < len; i += 4) {
      const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      const val = gray < mean - 5 ? 0 : 255;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (_) {}
}

// 2. High-pass Laplacian edge sharpening kernel for micro 1D bars
function applyLaplacianSharpen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const src = ctx.getImageData(0, 0, width, height);
    const dst = ctx.createImageData(width, height);
    const s = src.data;
    const d = dst.data;
    const w = width;

    // 3x3 Sharpen Kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * w + x) * 4;
        const top = ((y - 1) * w + x) * 4;
        const bot = ((y + 1) * w + x) * 4;
        const left = (y * w + (x - 1)) * 4;
        const right = (y * w + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const val = 5 * s[idx + c] - s[top + c] - s[bot + c] - s[left + c] - s[right + c];
          d[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
        }
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(dst, 0, 0);
  } catch (_) {}
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>("");
  const readerRef = useRef<any>(null);
  const isDecodingRef = useRef<boolean>(false);
  const detectorRef = useRef<any>(null);

  const [permissionState, setPermissionState] = useState<PermState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const PERM_KEY = "dreamfashion_camera_permission_granted";

  // ── Stop camera stream & cancel decode loop ─────────────────────────────
  const stopScanner = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isDecodingRef.current = false;
    detectorRef.current = null;
    readerRef.current = null;
    setTorchOn(false);
    setIsZoomed(false);
    setPermissionState("idle");
  }, []);

  // ── Handle a decoded barcode (Fast POS-style behavior) ───────────────────
  const handleDecodedCode = useCallback(
    (code: string) => {
      const cleaned = (code || "").trim();
      if (!cleaned) return;

      const now = Date.now();
      // Debounce: ignore same code within 0.9 s for ultra-fast scanning
      if (lastCodeRef.current === cleaned && now - lastScanTimeRef.current < 900) return;
      lastCodeRef.current = cleaned;
      lastScanTimeRef.current = now;

      setLastScanned(cleaned);
      setScanCount((prev) => prev + 1);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 300);

      playBarcodeBeep();
      onScan(cleaned);

      if (!continuous) {
        stopScanner();
        onOpenChange(false);
      } else {
        toast.success(lang === "bn" ? `স্ক্যান সম্পন্ন: ${cleaned}` : `Scanned Code: ${cleaned}`);
      }
    },
    [continuous, lang, onOpenChange, onScan, stopScanner]
  );

  // ── Ultra-Advanced Multi-Pass Micro-Barcode Decoding Engine ─────────────
  const startDecodeLoop = useCallback(() => {
    // 1. Initialize native BarcodeDetector API if available (Instant GPU detection)
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: [
            "code_128",
            "code_39",
            "code_93",
            "codabar",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "itf",
            "qr_code",
            "data_matrix",
            "pdf417",
            "aztec",
          ],
        });
      } catch (_) {
        detectorRef.current = null;
      }
    }

    let lastTickTime = 0;

    const tick = async () => {
      if (!streamRef.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        if (streamRef.current) {
          animFrameRef.current = requestAnimationFrame(tick);
        }
        return;
      }

      const now = Date.now();
      // Sub-10ms loop throttle (~100 FPS check rate) for ultra-aggressive scan response
      if (now - lastTickTime < 10) {
        if (streamRef.current) {
          animFrameRef.current = requestAnimationFrame(tick);
        }
        return;
      }
      lastTickTime = now;

      if (!isDecodingRef.current) {
        isDecodingRef.current = true;
        try {
          let foundCode: string | null = null;

          // Pass 1: Hardware-accelerated native BarcodeDetector (GPU level)
          if (detectorRef.current) {
            try {
              const barcodes = await detectorRef.current.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                foundCode = barcodes[0].rawValue;
              }
            } catch (_) {}
          }

          // Pass 2: ZXing Multi-Layer Multi-Scale Pyramid for Micro Barcodes
          if (!foundCode && readerRef.current && canvasRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              const vw = video.videoWidth;
              const vh = video.videoHeight;
              canvas.width = Math.min(vw, 1920);
              canvas.height = Math.min(vh, 1080);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Pass 2A: Full-frame raw scan
              try {
                const res = await readerRef.current.decodeFromCanvas(canvas);
                if (res) {
                  foundCode = res.getText();
                }
              } catch (_) {}

              // Pass 2B: Center Crop 2.5x Upscaling Pyramid (Magnifies micro barcodes)
              if (!foundCode) {
                try {
                  const cropW = Math.floor(canvas.width * 0.70);
                  const cropH = Math.floor(canvas.height * 0.45);
                  const cropX = Math.floor((canvas.width - cropW) / 2);
                  const cropY = Math.floor((canvas.height - cropH) / 2);

                  const scaledW = Math.floor(cropW * 2.2);
                  const scaledH = Math.floor(cropH * 2.2);

                  const pyCanvas = document.createElement("canvas");
                  pyCanvas.width = scaledW;
                  pyCanvas.height = scaledH;
                  const pyCtx = pyCanvas.getContext("2d", { willReadFrequently: true });
                  if (pyCtx) {
                    pyCtx.imageSmoothingEnabled = true;
                    pyCtx.imageSmoothingQuality = "high";
                    pyCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, scaledW, scaledH);

                    // Decode upscaled pyramid
                    const resPy = await readerRef.current.decodeFromCanvas(pyCanvas);
                    if (resPy) {
                      foundCode = resPy.getText();
                    }

                    // Pass 2C: Sharpened & Adaptive Thresholded Micro-Pass
                    if (!foundCode) {
                      applyLaplacianSharpen(pyCtx, scaledW, scaledH);
                      applyAdaptiveThreshold(pyCtx, scaledW, scaledH);
                      const resSharp = await readerRef.current.decodeFromCanvas(pyCanvas);
                      if (resSharp) {
                        foundCode = resSharp.getText();
                      }
                    }
                  }
                } catch (_) {}
              }

              // Pass 2D: Micro Target Box (30% x 25% ultra-center scan for tiny jewelry/apparel barcodes)
              if (!foundCode) {
                try {
                  const microW = Math.floor(canvas.width * 0.35);
                  const microH = Math.floor(canvas.height * 0.30);
                  const microX = Math.floor((canvas.width - microW) / 2);
                  const microY = Math.floor((canvas.height - microH) / 2);

                  const microCanvas = document.createElement("canvas");
                  microCanvas.width = microW * 3;
                  microCanvas.height = microH * 3;
                  const microCtx = microCanvas.getContext("2d", { willReadFrequently: true });
                  if (microCtx) {
                    microCtx.imageSmoothingEnabled = false;
                    microCtx.drawImage(canvas, microX, microY, microW, microH, 0, 0, microW * 3, microH * 3);
                    applyAdaptiveThreshold(microCtx, microW * 3, microH * 3);
                    const resMicro = await readerRef.current.decodeFromCanvas(microCanvas);
                    if (resMicro) {
                      foundCode = resMicro.getText();
                    }
                  }
                } catch (_) {}
              }
            }
          }

          if (foundCode) {
            handleDecodedCode(foundCode);
          }
        } catch (_) {
        } finally {
          isDecodingRef.current = false;
        }
      }

      if (streamRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [handleDecodedCode]);

  // ── Flashlight (Torch) Turn ON / OFF Toggle ────────────────────────────
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) {
      toast.error(lang === "bn" ? "ক্যামেরা সচল নয়" : "Camera stream not active");
      return;
    }
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const nextTorch = !torchOn;
    let applied = false;

    // Standard W3C Advanced constraints
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      applied = true;
    } catch (_) {}

    if (!applied) {
      try {
        await track.applyConstraints({
          torch: nextTorch,
        } as any);
        applied = true;
      } catch (_) {}
    }

    setTorchOn(nextTorch);
    if (nextTorch) {
      toast.success(lang === "bn" ? "ফ্ল্যাশলাইট অন করা হয়েছে 💡" : "Flashlight ON 💡");
    } else {
      toast.info(lang === "bn" ? "ফ্ল্যাশলাইট অফ করা হয়েছে 🔌" : "Flashlight OFF 🔌");
    }
  }, [torchOn, lang]);

  // ── Digital Zoom Toggle for Micro Barcodes ─────────────────────────────
  const toggleZoom = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const nextZoom = !isZoomed;
    const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};

    if (capabilities.zoom) {
      try {
        const targetZoom = nextZoom ? Math.min(3.0, capabilities.zoom.max || 2.5) : capabilities.zoom.min || 1;
        await track.applyConstraints({
          advanced: [{ zoom: targetZoom } as any],
        });
      } catch (_) {}
    }
    setIsZoomed(nextZoom);
    toast.info(
      nextZoom
        ? (lang === "bn" ? "মাইক্রো বারকোড ম্যাগনিফায়ার সচল 🔍" : "Micro Barcode Magnifier 2.5x 🔍")
        : (lang === "bn" ? "সাধারণ ভিউ ১x 📷" : "Standard View 1x 📷")
    );
  }, [isZoomed, lang]);

  // ── Start camera scan with Ultra-High Accuracy HD Video Stream ──────────
  const startCameraScan = useCallback(
    async (cameraId?: string, facing: "environment" | "user" = "environment") => {
      stopScanner();
      setCameraError(null);

      const isPrevGranted = typeof window !== "undefined" && localStorage.getItem(PERM_KEY) === "true";
      if (!isPrevGranted) {
        setPermissionState("requesting");
      }

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

        // Ultra HD camera constraints for maximum sharp pixel density
        const highResConstraints: MediaTrackConstraints = cameraId
          ? {
              deviceId: { exact: cameraId },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 60, min: 30 },
            }
          : {
              facingMode: facing === "environment" ? { ideal: "environment" } : "user",
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 60, min: 30 },
            };

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: highResConstraints,
            audio: false,
          });
        } catch (_) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: facing === "environment" ? "environment" : "user",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch (_) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        streamRef.current = stream;

        // Apply Macro Focus & Continuous Camera Track Capabilities
        const track = stream.getVideoTracks()[0];
        if (track && "applyConstraints" in track) {
          try {
            const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
            const advancedConstraints: any = {};

            if (capabilities.focusMode?.includes("continuous")) {
              advancedConstraints.focusMode = "continuous";
            }
            if (capabilities.exposureMode?.includes("continuous")) {
              advancedConstraints.exposureMode = "continuous";
            }
            if (capabilities.whiteBalanceMode?.includes("continuous")) {
              advancedConstraints.whiteBalanceMode = "continuous";
            }

            if (Object.keys(advancedConstraints).length > 0) {
              await track.applyConstraints({
                advanced: [advancedConstraints],
              });
            }
          } catch (_) {}
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");
          videoRef.current.setAttribute("muted", "true");
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }

        // Prepare ZXing reader with max hints
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
              BarcodeFormat.CODE_93,
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.QR_CODE,
              BarcodeFormat.DATA_MATRIX,
              BarcodeFormat.ITF,
              BarcodeFormat.PDF_417,
              BarcodeFormat.AZTEC,
            ]);
            hints.set(DecodeHintType.TRY_HARDER, true);
          }
        } catch (_) {}

        const reader = hints ? new BrowserMultiFormatReader(hints) : new BrowserMultiFormatReader();
        readerRef.current = reader;

        try {
          localStorage.setItem(PERM_KEY, "true");
        } catch (_) {}

        setPermissionState("granted");
        startDecodeLoop();

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
      const t = setTimeout(() => startCameraScan(selectedCameraId || undefined, facingMode), 100);
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
            <span>{title ?? (lang === "bn" ? "লাইভ মাইক্রো বারকোড স্ক্যানার" : "Live Ultra-Micro Barcode Scanner")}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Offscreen canvas for fast multi-pass viewfinder sampling */}
        <canvas ref={canvasRef} className="hidden" />

        {/* ── POS CAMERA VIEW & SCANNER UI ────────────────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <div
            className={`relative rounded-2xl overflow-hidden bg-black min-h-[310px] sm:min-h-[350px] border transition-all duration-200 shadow-2xl flex flex-col items-center justify-center ${
              scanFlash ? "border-emerald-500 ring-4 ring-emerald-500/50" : "border-border/80"
            }`}
          >
            <video
              ref={videoRef}
              className={`w-full h-full min-h-[310px] sm:min-h-[350px] object-cover transition-transform duration-300 ${
                isZoomed ? "scale-135" : "scale-100"
              }`}
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
                  {lang === "bn" ? "মাইক্রো-ফোকাস এইচডি ক্যামেরা চালুকরণ..." : "Starting Micro-Focus HD Camera..."}
                </p>
              </div>
            )}

            {permissionState === "granted" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                <div
                  className={`w-72 h-44 border-2 rounded-2xl relative transition-all duration-200 ${
                    scanFlash
                      ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.8)]"
                      : "border-primary/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                  }`}
                >
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.95)] animate-pulse" />
                </div>
              </div>
            )}

            {/* Status indicator pill */}
            {permissionState === "granted" && (
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-[10px] font-bold flex items-center gap-1.5 z-20 shadow-md">
                <Sparkles className="size-3 text-amber-400 animate-spin" />
                <span>{lang === "bn" ? "মাইক্রো ট্র্যাকিং সচল 🟢" : "Micro Scan Active 🟢"}</span>
              </div>
            )}

            {/* Flashlight & Camera Control Toolbar */}
            {permissionState === "granted" && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {/* Flashlight / Torch ON-OFF Toggle */}
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`px-3 py-1 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    torchOn
                      ? "bg-amber-400 text-black border-amber-300 ring-2 ring-amber-400/50"
                      : "bg-black/80 text-white border-white/20 hover:bg-black/95"
                  }`}
                  title={lang === "bn" ? "ফ্ল্যাশলাইট অন/অফ করুন" : "Toggle Flashlight"}
                >
                  <Flashlight className={`size-3.5 ${torchOn ? "fill-black" : ""}`} />
                  <span>{torchOn ? "Flashlight ON" : "Flashlight OFF"}</span>
                </button>

                {/* Macro Zoom Magnifier */}
                <button
                  type="button"
                  onClick={toggleZoom}
                  className={`size-8 rounded-full backdrop-blur-md border flex items-center justify-center transition shadow-md ${
                    isZoomed
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-black/80 text-white border-white/20 hover:bg-black/95"
                  }`}
                  title={lang === "bn" ? "মাইক্রো বারকোড ম্যাগনিফায়ার" : "Micro Barcode Magnifier"}
                >
                  <ZoomIn className="size-4" />
                </button>

                {/* Flip Camera */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="size-8 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/95 transition shadow-md"
                  title={lang === "bn" ? "ক্যামেরা পরিবর্তন করুন" : "Flip Camera"}
                >
                  <FlipHorizontal className="size-4" />
                </button>
              </div>
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
                  {lastScanned || (lang === "bn" ? "যেকোনো ক্ষুদ্র বারকোড বা ট্যাগের দিকে ক্যামেরা ধরুন..." : "Point at any micro or tiny product barcode...")}
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
