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
      <div className="relative flex flex-col items-center justify-center">
        {/* Ape Walk Lottie Animation - Big Size for Phone & PC */}
        <div className="w-72 h-72 sm:w-96 sm:h-96 md:w-[440px] md:h-[440px] max-w-[92vw] flex items-center justify-center">
          <DotLottieReact
            src="/ape-walk.lottie"
            loop
            autoplay
            className="w-full h-full object-contain"
          />
        </div>

        {/* Branding & Loading Status */}
        <div className="mt-2 flex flex-col items-center gap-1.5 text-center">
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-wide text-foreground">
            Classic World
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Loading...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
