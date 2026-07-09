/** Custom stylized animated loader. */
export function SpeedLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  if (!fullScreen) {
    return (
      <div className="flex items-center justify-center p-8 relative min-h-[4rem]">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-xs z-50 flex items-center justify-center">
      <div className="bg-card border border-border p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6 min-w-[120px] min-h-[120px] relative">
        <div className="relative w-10 h-10">
          <div className="loader loader-container"></div>
        </div>
        <span className="text-xs text-muted-foreground font-semibold mt-4">Loading...</span>
      </div>
    </div>
  );
}

