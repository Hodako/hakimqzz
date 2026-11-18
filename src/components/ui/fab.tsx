"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
  title?: string;
}

export function FAB({ onClick, title = "Add new item" }: FABProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const buttonElement = (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-8 right-4 md:right-8 z-[999] size-12 sm:size-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white/30 cursor-pointer ring-4 ring-primary/20 hover:ring-primary/40"
      aria-label={title}
      style={{
        position: "fixed",
        pointerEvents: "auto",
      }}
    >
      <Plus className="size-6 sm:size-7 stroke-[2.75]" />
    </button>
  );

  // Render directly into document.body to escape any parent transform / scroll stacking context
  if (mounted && typeof document !== "undefined") {
    return createPortal(buttonElement, document.body);
  }

  return buttonElement;
}
