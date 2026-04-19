import { useEffect, useState } from 'react';
import { getAuditLog, clearAuditLog } from '../../services/narrationAuditor';
import type { AuditLogEntry } from '../../services/narrationAuditor';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Debug viewer for the runtime narration auditor. Lists recent
 * flagged inconsistencies (piece-on-square mismatches, illegal SAN
 * references, wrong check/mate claims) so content issues can be
 * triaged from real sessions without waiting for a batch grader.
 *
 * Surfaced in Settings → About (or wherever the user routes it).
 * Intentionally low-visibility — most users should never see this;
 * it's a power/maintainer tool.
 */
export function NarrationAuditPanel(): JSX.Element {
  const [log, setLog] = useState<AuditLogEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async (): Promise<void> => {
    const data = await getAuditLog();
    setLog(data);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleClear = async (): Promise<void> => {
    setBusy(true);
    await clearAuditLog();
    await refresh();
    setBusy(false);
  };

  if (log === null) {
    return (
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Loading audit log…
      </div>
    );
  }

  if (log.length === 0) {
    return (
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        No narration inconsistencies flagged. The auditor runs in the
        background and will log any claims that conflict with the
        position (e.g., "knight on f3" when f3 is empty, or a check
        claim when the king isn\u2019t in check).
      </div>
    );
  }

  // Most-recent first.
  const entries = [...log].reverse();

  return (
    <div className="space-y-3" data-testid="narration-audit-panel">
      <div className="flex items-center justify-between">
        <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <AlertTriangle size={12} style={{ color: 'var(--color-accent)' }} />
          <span>{log.length} flagged {log.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        <button
          onClick={() => { void handleClear(); }}
          disabled={busy}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-theme-border hover:bg-theme-surface disabled:opacity-50"
          data-testid="narration-audit-clear"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {entries.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className="rounded-md border border-theme-border p-2 text-xs space-y-1"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>
                {new Date(entry.timestamp).toLocaleString()}
                {entry.context ? ` · ${entry.context}` : ''}
              </span>
            </div>
            <div className="font-mono text-[10px] break-all" style={{ color: 'var(--color-text-muted)' }}>
              {entry.fen}
            </div>
            <ul className="space-y-1 ml-0 list-none">
              {entry.flags.map((f, j) => (
                <li key={j} className="pl-2 border-l-2 border-amber-500/50">
                  <span className="text-amber-500 font-medium">[{f.kind}]</span>{' '}
                  <span>{f.explanation}</span>
                  {f.narrationExcerpt && f.narrationExcerpt !== f.kind && (
                    <span className="block mt-0.5 italic" style={{ color: 'var(--color-text-muted)' }}>
                      &ldquo;{f.narrationExcerpt}&rdquo;
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
