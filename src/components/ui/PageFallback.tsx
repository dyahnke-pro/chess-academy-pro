/** Shown inside the app chrome while a page's code loads on first visit. */
export function PageFallback(): JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center p-8" data-testid="page-fallback">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-theme-accent animate-pulse" />
        ))}
      </div>
    </div>
  );
}
