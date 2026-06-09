import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { db } from '../../db/schema';

// "How to use this app" help bubble (playbook §8). A top-right "i" button that
// opens a coach-mark explainer for the surface. Auto-opens on FIRST visit
// (tracked per-surface in Dexie meta), then lives behind the "i" — replayable
// any time. Additive, no app state. Teach the LOOP (Watch → Learn → Practice → Play).

export interface HelpStep {
  /** Short label, e.g. "Watch" or "The climb". */
  label: string;
  /** Plain-English explanation of what it does + why. */
  body: string;
}

interface PageHelpProps {
  title: string;
  steps: HelpStep[];
  /** Extra classes for the trigger button (positioning at the call site). */
  className?: string;
  /**
   * Stable per-surface id. When set, the help auto-opens the first time this
   * surface is visited (persisted in Dexie `meta`), then stays behind the "i".
   * Omit to disable auto-open (manual-only).
   */
  helpId?: string;
  /**
   * Hold the first-visit auto-open. Used so a higher-priority first-run
   * bubble (the strength picker) pops first; when this flips back to false
   * the auto-open runs, making this the SECOND bubble in sequence.
   */
  suppressAutoOpen?: boolean;
  /** Optional content rendered below the steps — e.g. a legal/attribution
   *  notice on the pro-masterclass surfaces. */
  footer?: ReactNode;
}

function metaKey(helpId: string): string {
  return `pagehelp-seen-${helpId}`;
}

export function PageHelp({ title, steps, className = '', helpId, suppressAutoOpen = false, footer }: PageHelpProps): JSX.Element {
  const [open, setOpen] = useState(false);

  // First-visit auto-open: check Dexie once on mount; if unseen, open + mark
  // seen. Held while suppressAutoOpen is true (re-runs when it flips false),
  // so the strength bubble can claim the first slot.
  useEffect(() => {
    if (!helpId || suppressAutoOpen) return;
    let cancelled = false;
    void db.meta.get(metaKey(helpId)).then((rec) => {
      if (cancelled || rec) return;
      setOpen(true);
      void db.meta.put({ key: metaKey(helpId), value: '1' });
    });
    return () => { cancelled = true; };
  }, [helpId, suppressAutoOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How to use this page"
        data-testid="page-help-btn"
        className={`p-1.5 rounded-lg text-theme-text-muted hover:text-amber-300 hover:bg-theme-border/50 transition-colors ${className}`}
      >
        <Info size={18} />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-testid="page-help-modal"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-theme-surface border-t-2 sm:border-2 border-amber-500/40 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-theme-text">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                data-testid="page-help-close"
                className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border/50"
              >
                <X size={18} />
              </button>
            </div>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-theme-text">{s.label}</span>
                    <p className="text-xs text-theme-text-muted mt-0.5 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            {footer && (
              <div className="mt-4 pt-3 border-t border-theme-border" data-testid="page-help-footer">
                {footer}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
