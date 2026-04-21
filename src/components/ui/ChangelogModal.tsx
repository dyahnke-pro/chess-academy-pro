import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDismissals } from '../../stores/userContext';
import { recordDismissal } from '../../services/dismissals';
import { track, EVENTS } from '../../services/analytics';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

/**
 * Modal that surfaces the newest entry from public/changelog.json
 * exactly once per user per version. The dismissal key is
 * `changelog:<version>` — recorded in user_dismissals on close.
 *
 * Renders null when:
 *   - The changelog is empty (ship state).
 *   - The current entry's key is already in dismissals.
 *   - Fetch fails (silently — not worth a toast).
 */
export function ChangelogModal(): JSX.Element | null {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  const dismissals = useDismissals();

  useEffect(() => {
    let cancelled = false;
    void fetch('/changelog.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ChangelogEntry[]) => {
        if (cancelled) return;
        if (!Array.isArray(data) || data.length === 0) return;
        setEntry(data[0]);
      })
      .catch(() => {
        /* network failure — silently skip */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!entry) return null;
  const key = `changelog:${entry.version}`;
  if (dismissals.has(key)) return null;

  const handleDismiss = (): void => {
    void recordDismissal(key);
    track(EVENTS.nudgeDismissed, { key });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
      data-testid="changelog-modal"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="changelog-modal-title" className="text-lg font-bold">
              {entry.title}
            </h2>
            <p className="text-xs opacity-60">
              v{entry.version} · {entry.date}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss changelog"
            className="p-1 opacity-70 hover:opacity-100"
            data-testid="changelog-dismiss-btn"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {entry.items.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-5 w-full rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
