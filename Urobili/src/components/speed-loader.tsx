"use client";

import { useEffect, useState } from "react";

/**
 * Urobili — Origami Geometric Loader
 * Custom animated origami "U" paper-folding loader matching the Urobili brand identity.
 */
export function SpeedLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={
          fullScreen
            ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-zinc-950"
            : "w-full min-h-[260px] flex flex-col items-center justify-center"
        }
      />
    );
  }

  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-zinc-950 select-none overflow-hidden"
          : "w-full min-h-[280px] flex flex-col items-center justify-center select-none overflow-hidden py-8"
      }
      role="status"
      aria-label="Loading Urobili"
    >
      <style>{`
        @keyframes urobiliFoldLeft {
          0%, 100% { transform: perspective(600px) rotateY(0deg) translateY(0px); opacity: 1; }
          45% { transform: perspective(600px) rotateY(-18deg) translateY(-4px); opacity: 0.92; }
        }
        @keyframes urobiliFoldRight {
          0%, 100% { transform: perspective(600px) rotateY(0deg) translateY(0px); opacity: 1; }
          55% { transform: perspective(600px) rotateY(18deg) translateY(-4px); opacity: 0.92; }
        }
        @keyframes urobiliFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.03); }
        }
        @keyframes urobiliCreasePulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes urobiliBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .uro-origami-wrap {
          animation: urobiliFloat 2.4s ease-in-out infinite;
          filter: drop-shadow(0 16px 28px rgba(37, 99, 235, 0.18));
        }
        .uro-fold-left {
          transform-origin: center bottom;
          animation: urobiliFoldLeft 2.4s ease-in-out infinite;
        }
        .uro-fold-right {
          transform-origin: center bottom;
          animation: urobiliFoldRight 2.4s ease-in-out infinite;
        }
        .uro-crease {
          animation: urobiliCreasePulse 2.4s ease-in-out infinite;
        }
        .uro-bar-inner {
          animation: urobiliBar 1.35s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Soft ambient origami backdrop */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="size-72 rounded-full bg-blue-500/8 dark:bg-blue-500/10 blur-3xl" />
      </div>

      {/* Origami SVG Mark */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="uro-origami-wrap relative size-24 sm:size-28 flex items-center justify-center">
          <svg
            viewBox="0 0 120 112"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            {/* Left Origami Wing */}
            <g className="uro-fold-left">
              {/* Top crown ears */}
              <polygon points="18,22 28,12 37,21 46,12 56,22 56,36 18,36" fill="#A8D4FF" />
              {/* Receipt / Folded Upper Face */}
              <polygon points="18,36 56,36 18,70" fill="#5AA9F8" />
              {/* Two subtle receipt lines */}
              <line x1="25" y1="45" x2="39" y2="45" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
              <line x1="25" y1="53" x2="34" y2="53" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
              {/* Lower Left Facet */}
              <polygon points="56,36 56,78 18,70" fill="#2B7CE9" />
              {/* Bottom Left Corner Wing */}
              <polygon points="18,70 56,78 44,96" fill="#1D64C8" />
            </g>

            {/* Center Base Origami Triangle */}
            <polygon className="uro-crease" points="44,96 56,78 76,78 60,104" fill="#164B96" />

            {/* Right Origami Wing */}
            <g className="uro-fold-right">
              {/* Top Sharp Highlight Wing */}
              <polygon points="76,34 104,10 104,24" fill="#CBE4FF" />
              {/* Main Right Vertical Facet */}
              <polygon points="76,34 104,24 76,78" fill="#2B7CE9" />
              {/* Deep Shadow Right Facet */}
              <polygon points="104,24 104,70 76,78" fill="#1752A3" />
              {/* Bottom Right Corner Wing */}
              <polygon points="104,70 76,78 60,104" fill="#3C8DF2" />
            </g>

            {/* Crisp White Origami Crease Lines */}
            <g stroke="#FFFFFF" strokeWidth="0.9" strokeOpacity="0.65" fill="none">
              <polyline points="18,36 56,36 18,70 56,78 44,96 60,104 104,70 104,24 76,34 76,78 56,78" />
              <line x1="76" y1="34" x2="104" y2="70" />
              <line x1="56" y1="36" x2="56" y2="78" />
              <line x1="76" y1="78" x2="60" y2="104" />
            </g>
          </svg>
        </div>

        {/* Urobili Brand Wordmark */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
            <span>Urobili</span>
          </div>
          <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
            Smart ERP &amp; POS
          </div>
        </div>

        {/* Origami Shimmer Progress Bar */}
        <div className="w-40 h-1.5 rounded-full bg-blue-100 dark:bg-zinc-800 overflow-hidden shadow-inner">
          <div className="uro-bar-inner h-full w-2/5 rounded-full bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600" />
        </div>
      </div>
    </div>
  );
}
