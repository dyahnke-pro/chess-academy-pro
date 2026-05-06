import { useEffect, useMemo, useState } from 'react';
import { getAppAuditLog, clearAppAuditLog } from '../../services/appAuditor';
import type { AuditCategory, AuditEntry } from '../../services/appAuditor';
import { runLichessHealthProbe } from '../../services/lichessHealthProbe';
import { AlertTriangle, Trash2, Copy, Check, Activity } from 'lucide-react';

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
  // 'spine' is a virtual filter (not an AuditCategory) — selects only
  // the audit kinds emitted by coachService.ask + the surface-migration
  // marker. Lets you copy just the spine activity for a session and
  // paste it back to verify which surfaces routed through the unified
  // coach (WO-COACH-UNIFY-01).
  const [filter, setFilter] = useState<AuditCategory | 'all' | 'spine'>('all');
  const [probing, setProbing] = useState(false);
  // WO-DEEP-DIAGNOSTICS — read the build stamp from the most recent
  // entry that carries one (every entry will, post this WO).
  const buildIdHint = useMemo(() => {
    if (!log || log.length === 0) return null;
    for (let i = log.length - 1; i >= 0; i--) {
      const id = log[i].buildId;
      if (id) return id;
    }
    return null;
  }, [log]);

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

  // WO-DEEP-DIAGNOSTICS — manual health probe. Runs the Lichess
  // 3-shape probe; the audit it emits will appear in the log on the
  // next refresh.
  const handleRunDiagnostics = async (): Promise<void> => {
    setProbing(true);
    try {
      await runLichessHealthProbe();
    } catch {
      // probe surfaces its own audit on every attempt; UI button
      // never throws.
    }
    await refresh();
    setProbing(false);
  };

  const filtered = useMemo(() => {
    if (!log) return [];
    if (filter === 'all') return log;
    if (filter === 'spine') {
      return log.filter((e) =>
        e.kind === 'coach-brain-ask-received' ||
        e.kind === 'coach-brain-envelope-assembled' ||
        e.kind === 'coach-brain-provider-called' ||
        e.kind === 'coach-brain-answer-returned' ||
        e.kind === 'coach-brain-tool-called' ||
        e.kind === 'coach-llm-model-selected' ||
        e.kind === 'coach-surface-migrated',
      );
    }
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
      <div className="space-y-2">
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          No issues flagged. The auditor runs continuously in the
          background and logs narration inconsistencies, runtime
          exceptions, TTS fallbacks, bad FENs, LLM errors, and
          unhandled promise rejections as they happen.
        </div>
        <button
          onClick={() => { void handleRunDiagnostics(); }}
          disabled={probing}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-theme-border hover:bg-theme-surface disabled:opacity-50"
          data-testid="run-diagnostics"
        >
          <Activity size={12} />
          {probing ? 'Running…' : 'Run Lichess health probe'}
        </button>
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
          <span>
            {log.length} total · {filtered.length} shown
            {buildIdHint ? ` · build ${buildIdHint}` : ''}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { void handleRunDiagnostics(); }}
            disabled={probing}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-theme-border hover:bg-theme-surface disabled:opacity-50"
            data-testid="run-diagnostics"
            title="Probe Lichess explorer with 3 different fetch shapes and audit the result"
          >
            <Activity size={12} />
            {probing ? 'Probing…' : 'Probe Lichess'}
          </button>
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

      {/* Category filters + virtual 'spine' filter for unified-coach
          activity (WO-COACH-UNIFY-01). The spine count reflects how
          many audit entries came from coachService.ask / surface
          migration markers — non-zero means the spine is being used. */}
      <div className="flex gap-1 flex-wrap text-xs">
        {(['all', 'spine', 'narration', 'runtime', 'subsystem', 'app'] as const).map((cat) => {
          const count =
            cat === 'all'
              ? log.length
              : cat === 'spine'
                ? log.filter((e) =>
                    e.kind === 'coach-brain-ask-received' ||
                    e.kind === 'coach-brain-envelope-assembled' ||
                    e.kind === 'coach-brain-provider-called' ||
                    e.kind === 'coach-brain-answer-returned' ||
                    e.kind === 'coach-brain-tool-called' ||
                    e.kind === 'coach-llm-model-selected' ||
                    e.kind === 'coach-surface-migrated',
                  ).length
                : (byCategory[cat] ?? 0);
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
            {entry.buildId && (
              <div className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                build: {entry.buildId}
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
      entry.buildId ? `- build: \`${entry.buildId}\`` : '',
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
