import { useEffect, useMemo, useState } from 'react';
import { getAppAuditLog, clearAppAuditLog } from '../../services/appAuditor';
import type { AuditCategory, AuditEntry } from '../../services/appAuditor';
import { AlertTriangle, Trash2, Copy, Check } from 'lucide-react';

/**
 * Unified debug viewer for the whole-app auditor.
 *
 * Surfaces four classes of finding:
 *   1. Narration factual errors (piece-on-square, check/mate, illegal SAN)
 *   2. Runtime errors (uncaught exceptions, unhandled promise rejections)
 *   3. Subsystem failures (TTS fallback, bad FEN, LLM error, network, Dexie)
 *   4. App state anomalies (React error boundary, FEN desync)
 *
 * All entries share one rolling-window Dexie log. "Copy for Claude"
 * serialises the visible entries to markdown for pasting into a Claude
 * Code session.
 */
export function NarrationAuditPanel(): JSX.Element {
  const [log, setLog] = useState<AuditEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<AuditCategory | 'all'>('all');

  const refresh = async (): Promise<void> => {
    const data = await getAppAuditLog();
    setLog(data);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleClear = async (): Promise<void> => {
    setBusy(true);
    await clearAppAuditLog();
    await refresh();
    setBusy(false);
  };

  const filtered = useMemo(() => {
    if (!log) return [];
    if (filter === 'all') return log;
    return log.filter((e) => e.category === filter);
  }, [log, filter]);

  const handleCopy = async (): Promise<void> => {
    if (filtered.length === 0) return;
    const markdown = formatLogAsMarkdown(filtered);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
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
        No issues flagged. The auditor runs continuously in the
        background and logs narration inconsistencies, runtime
        exceptions, TTS fallbacks, bad FENs, LLM errors, and
        unhandled promise rejections as they happen.
      </div>
    );
  }

  // Most-recent first.
  const entries = [...filtered].reverse();
  const byCategory = countByCategory(log);

  return (
    <div className="space-y-3" data-testid="narration-audit-panel">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <AlertTriangle size={12} style={{ color: 'var(--color-accent)' }} />
          <span>{log.length} total · {filtered.length} shown</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { void handleCopy(); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-theme-border hover:bg-theme-surface disabled:opacity-50"
            data-testid="narration-audit-copy"
            title="Copy the visible findings as markdown for pasting into a Claude Code session"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy for Claude'}
          </button>
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
      </div>

      {/* Category filters */}
      <div className="flex gap-1 flex-wrap text-xs">
        {(['all', 'narration', 'runtime', 'subsystem', 'app'] as const).map((cat) => {
          const count = cat === 'all' ? log.length : (byCategory[cat] ?? 0);
          const active = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-2 py-0.5 rounded-md border"
              style={{
                background: active ? 'var(--color-accent)' : 'transparent',
                color: active ? '#fff' : 'var(--color-text-muted)',
                borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
              }}
              data-testid={`audit-filter-${cat}`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {entries.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className="rounded-md border border-theme-border p-2 text-xs space-y-1"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span style={{ color: 'var(--color-text-muted)' }}>
                {new Date(entry.timestamp).toLocaleString()}
                {entry.source ? ` · ${entry.source}` : ''}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  background: categoryColor(entry.category),
                  color: '#000',
                }}
              >
                {entry.category}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-500 font-medium">[{entry.kind}]</span>{' '}
              <span>{entry.summary}</span>
            </div>
            {entry.fen && (
              <div className="font-mono text-[10px] break-all" style={{ color: 'var(--color-text-muted)' }}>
                FEN: {entry.fen}
              </div>
            )}
            {entry.route && entry.route !== '/' && (
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                route: {entry.route}
              </div>
            )}
            {entry.details && (
              <details className="text-[10px]">
                <summary style={{ color: 'var(--color-text-muted)' }}>details</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all" style={{ color: 'var(--color-text-muted)' }}>
                  {entry.details}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function countByCategory(log: AuditEntry[]): Record<AuditCategory, number> {
  const counts: Record<AuditCategory, number> = {
    narration: 0,
    runtime: 0,
    subsystem: 0,
    app: 0,
  };
  for (const entry of log) counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  return counts;
}

function categoryColor(category: AuditCategory): string {
  switch (category) {
    case 'narration': return '#f59e0b';   // amber
    case 'runtime':   return '#ef4444';   // red
    case 'subsystem': return '#3b82f6';   // blue
    case 'app':       return '#8b5cf6';   // purple
  }
}

/** Serialise an audit log slice as a markdown report. Optimised for
 *  pasting into a Claude Code session — groups by kind, puts the
 *  highest-signal entries (runtime errors, subsystem failures) first.
 *  Exported for regression tests. */
export function formatLogAsMarkdown(log: AuditEntry[]): string {
  if (log.length === 0) return '# App audit log\n\n_No findings._\n';

  const byKind = new Map<string, number>();
  const byCategory = new Map<AuditCategory, number>();
  for (const entry of log) {
    byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + 1);
  }

  const kindSummary = [...byKind.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `- ${k}: ${n}`)
    .join('\n');
  const categorySummary = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `- ${k}: ${n}`)
    .join('\n');

  // Newest first, with runtime + subsystem errors floated to the top
  // within each timestamp bucket — they're usually the highest-signal.
  const priority = (c: AuditCategory): number => {
    if (c === 'runtime') return 0;
    if (c === 'subsystem') return 1;
    if (c === 'app') return 2;
    return 3;
  };
  const entries = [...log].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
    return priority(a.category) - priority(b.category);
  });

  const blocks = entries.map((entry, i) => {
    const ts = new Date(entry.timestamp).toISOString();
    return [
      `### Finding ${i + 1} — [${entry.category}/${entry.kind}]`,
      `- timestamp: \`${ts}\``,
      `- source: \`${entry.source}\``,
      entry.route ? `- route: \`${entry.route}\`` : '',
      entry.fen ? `- FEN: \`${entry.fen}\`` : '',
      entry.context ? `- context: \`${entry.context}\`` : '',
      ``,
      `**${entry.summary}**`,
      entry.details ? '\n```\n' + entry.details + '\n```' : '',
    ].filter(Boolean).join('\n');
  });

  return [
    '# App audit log',
    '',
    `Total: **${log.length}** ${log.length === 1 ? 'finding' : 'findings'}.`,
    '',
    '## By category',
    categorySummary,
    '',
    '## By kind',
    kindSummary,
    '',
    '## Findings',
    '',
    blocks.join('\n\n'),
  ].join('\n');
}
