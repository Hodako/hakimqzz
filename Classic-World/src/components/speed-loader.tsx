"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function SpeedLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center select-none ${
        fullScreen
          ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-md"
          : "w-full py-8"
      }`}
    >
      <div className="relative flex flex-col items-center justify-center w-full px-4">
        {/* Ape Walk Lottie Animation - Big, Scaled Size on Mobile and PC */}
        <div className="w-[88vw] max-w-[480px] h-[48vh] max-h-[480px] min-h-[280px] flex items-center justify-center">
          <DotLottieReact
            src="/ape-walk.lottie"
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Branding & Loading Status */}
        <div className="mt-3 flex flex-col items-center gap-1.5 text-center">
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-foreground">
            Classic World
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Loading workspace...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
