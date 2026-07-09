/** Custom stylized animated loader. */
export function SpeedLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  if (!fullScreen) {
    return (
      <div className="relative w-10 h-10 mx-auto my-4 flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-xs z-50">
      <div className="loader"></div>
    </div>
  );
}


