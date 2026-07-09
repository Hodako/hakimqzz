"use client";

import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/** Custom Lottie-based animated loader. */
export function SpeedLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!fullScreen) {
    return (
      <div className="relative w-28 h-28 mx-auto my-4 flex items-center justify-center">
        <DotLottieReact
          src="https://lottie.host/fe10f7ac-ad56-4358-8b1a-57695cee23ea/VVGpSfA8yu.lottie"
          loop
          autoplay
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-xs z-50 flex items-center justify-center">
      <div className="w-40 h-40">
        <DotLottieReact
          src="https://lottie.host/fe10f7ac-ad56-4358-8b1a-57695cee23ea/VVGpSfA8yu.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
}



