import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Friendly fallback rendered by the top-level Sentry.ErrorBoundary
 * when a render throws something the per-route boundaries don't
 * catch. Kept intentionally simple: the goal is to get the user un-
 * stuck with a single reload, not to debug in-page.
 */
export function AppErrorFallback(): JSX.Element {
  return (
    <div
      className="flex min-h-screen flex-1 items-center justify-center p-8"
      data-testid="app-error-fallback"
      role="alert"
    >
      <div
        className="w-full max-w-sm rounded-2xl border-2 p-6 text-center"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-error, #ef4444)',
          color: 'var(--color-text)',
        }}
      >
        <AlertTriangle
          size={40}
          className="mx-auto mb-3"
          style={{ color: 'var(--color-error, #ef4444)' }}
          aria-hidden="true"
        />
        <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
        <p className="text-sm opacity-80 mb-5">
          Reload the app to keep going. If it happens again, your progress
          is safe locally — we've already reported the issue.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
          }}
          data-testid="app-error-reload-btn"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Reload app
        </button>
      </div>
    </div>
  );
}
