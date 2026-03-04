export function LoadingScreen(): JSX.Element {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="text-6xl mb-6 animate-bounce-in">♛</div>
      <p className="text-theme-text-muted text-sm tracking-widest uppercase">
        Chess Academy Pro
      </p>
      <div className="mt-8 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-theme-accent animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
