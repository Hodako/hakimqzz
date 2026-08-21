"use client";

import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function SpeedLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`flex flex-col items-center justify-center ${fullScreen ? "fixed inset-0 z-50 bg-background/90 backdrop-blur-sm" : "py-12"}`}>
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center select-none ${
        fullScreen
          ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-md"
          : "w-full py-8"
      }`}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Ape Walk Lottie Animation */}
        <div className="w-48 h-48 sm:w-60 sm:h-60 max-w-[85vw] flex items-center justify-center">
          <DotLottieReact
            src="/ape-walk.lottie"
            loop
            autoplay
            className="w-full h-full object-contain"
          />
        </div>

        {/* Branding & Loading Status */}
        <div className="mt-1 flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-1">
            <span className="font-serif text-lg sm:text-xl font-bold tracking-wide text-foreground">
              Classic World
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
              Loading workspace...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
