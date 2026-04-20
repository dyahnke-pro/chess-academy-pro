import { useEffect, useState } from 'react';
import { getAuditLog, clearAuditLog } from '../../services/narrationAuditor';
import type { AuditLogEntry } from '../../services/narrationAuditor';
import { AlertTriangle, Trash2, Copy, Check } from 'lucide-react';

/**
 * Debug viewer for the runtime narration auditor. Lists recent
 * flagged inconsistencies (piece-on-square mismatches, illegal SAN
 * references, wrong check/mate claims) so content issues can be
 * triaged from real sessions without waiting for a batch grader.
 *
 * Key affordance: "Copy for Claude" serialises the whole log as a
 * markdown report that can be pasted directly into a Claude Code
 * session. That's the "send Claude what it needs to fix it" path
 * for any finding the auditor surfaces post-launch.
 */
export function NarrationAuditPanel(): JSX.Element {
  const [log, setLog] = useState<AuditLogEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async (): Promise<void> => {
    if (!log || log.length === 0) return;
    const markdown = formatLogAsMarkdown(log);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can reject (not-focused iframe, http context on older
      // iOS). Fallback via a transient textarea so copy always works.
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
        No narration inconsistencies flagged. The auditor runs in the
        background and will log any claims that conflict with the
        position (e.g., &ldquo;knight on f3&rdquo; when f3 is empty, or
        a check claim when the king isn&rsquo;t in check).
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
        <div className="flex gap-1">
          <button
            onClick={() => { void handleCopy(); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-theme-border hover:bg-theme-surface disabled:opacity-50"
            data-testid="narration-audit-copy"
            title="Copy a markdown report suitable for pasting into a Claude Code session"
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

/** Serialise an audit log as a markdown report. Shape is optimised
 *  for pasting into a Claude Code session — one fenced-code block
 *  per finding with timestamp, context, FEN, and per-flag excerpt +
 *  explanation. Exported for regression tests. */
export function formatLogAsMarkdown(log: AuditLogEntry[]): string {
  if (log.length === 0) return '# Narration audit log\n\n_No findings._\n';

  const byKind = new Map<string, number>();
  for (const entry of log) {
    for (const flag of entry.flags) {
      byKind.set(flag.kind, (byKind.get(flag.kind) ?? 0) + 1);
    }
  }

  const summary = [...byKind.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `- ${k}: ${n}`)
    .join('\n');

  const entries = [...log].reverse();
  const blocks = entries.map((entry, i) => {
    const ts = new Date(entry.timestamp).toISOString();
    const ctx = entry.context ?? '(no context)';
    const flags = entry.flags
      .map((f) => {
        const excerpt = f.narrationExcerpt && f.narrationExcerpt !== f.kind
          ? `  - excerpt: "${f.narrationExcerpt}"\n`
          : '';
        return `- **[${f.kind}]** ${f.explanation}\n${excerpt}`;
      })
      .join('');
    return [
      `### Finding ${i + 1}`,
      `- timestamp: \`${ts}\``,
      `- context: \`${ctx}\``,
      `- FEN: \`${entry.fen}\``,
      ``,
      flags,
    ].join('\n');
  });

  return [
    '# Narration audit log',
    '',
    `Total: **${log.length}** flagged ${log.length === 1 ? 'entry' : 'entries'}.`,
    '',
    '## By kind',
    summary,
    '',
    '## Findings',
    '',
    blocks.join('\n'),
  ].join('\n');
}
