import { Plus } from "lucide-react";

export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 sm:bottom-6 right-4 z-40 size-12 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-xl shadow-primary/35 active:scale-95 transition-all border border-white/20 hover:scale-105"
      aria-label="Add new item"
    >
      <Plus className="size-6 stroke-[2.5]" />
    </button>
  );
}
