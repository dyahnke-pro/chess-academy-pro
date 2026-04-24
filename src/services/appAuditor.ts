/**
 * appAuditor
 * ----------
 * Unified rolling-window audit log for the whole app. Captures four
 * classes of issue:
 *
 *   1. Narration factual errors (piece-on-square, check/mate, etc.) —
 *      emitted by `narrationAuditor.recordAudit()`.
 *   2. Uncaught runtime errors — global `window.onerror` / unhandled
 *      promise rejections. Installed by `installGlobalErrorHooks()` on
 *      app boot.
 *   3. Subsystem failures — TTS cascades, bad FENs, LLM errors,
 *      Stockfish timeouts, Lichess failures, Dexie writes. Logged
 *      explicitly by the owning service at the failure point.
 *   4. App state anomalies — React error boundary catches, navigation
 *      failures, FEN desyncs.
 *
 * Every entry lands in the same Dexie `meta` key under a rolling
 * window (`APP_AUDIT_LOG_MAX_ENTRIES`). The debug panel (Settings →
 * About → Narration audit) reads the whole log and exports it as a
 * markdown report via "Copy for Claude".
 *
 * Contract: every writer must be fire-and-forget.
 *   void logAppAudit({ ... });
 * The logger swallows its own errors — a failing audit write must
 * never break the feature path that raised it.
 */
import { db } from '../db/schema';

const APP_AUDIT_LOG_META_KEY = 'app-audit-log.v1';
const APP_AUDIT_LOG_MAX_ENTRIES = 300;

export type AuditCategory = 'narration' | 'runtime' | 'subsystem' | 'app';

export type AuditKind =
  // Narration (from narrationAuditor)
  | 'piece-on-square'
  | 'hanging-piece'
  | 'check-claim'
  | 'mate-claim'
  | 'illegal-san'
  | 'sanitizer-leak'
  // Runtime errors
  | 'uncaught-error'
  | 'unhandled-rejection'
  // Subsystem failures
  | 'tts-failure'
  | 'polly-fallback'
  | 'bad-fen'
  | 'stockfish-error'
  | 'llm-error'
  | 'lichess-error'
  | 'dexie-error'
  | 'network-error'
  // App state
  | 'error-boundary'
  | 'navigation-error'
  | 'fen-desync'
  // Voice instrumentation (WO-LEGACY-VOICE-01)
  | 'voice-speak-invoked'
  // Phase-transition narration trail (WO-PHASE-FIX-02)
  | 'phase-transition-detected'
  | 'phase-transition-suppressed'
  // Narration latency (WO-POLISH-03)
  | 'narration-latency'
  // Phase narration latency (WO-PHASE-LAG-01)
  | 'phase-narration-latency'
  // Walk-the-game review trail (WO-REVIEW-02)
  | 'review-opened'
  | 'review-narration-spoken'
  | 'review-nav'
  // Additional review trail (WO-REVIEW-02a)
  | 'review-segments-generated'
  | 'review-segments-parse-failed'
  // Engine lines on the review screen (WO-REVIEW-02b)
  | 'review-engine-lines-analysis-started'
  | 'review-engine-lines-analysis-complete'
  | 'review-engine-lines-toggled'
  | 'review-engine-candidate-explored'
  // Position-narration Stockfish cache (WO-PHASE-PROSE-01)
  | 'narration-stockfish-cache-hit';

export interface AuditEntry {
  timestamp: number;
  kind: AuditKind;
  category: AuditCategory;
  /** One-line summary — what went wrong. */
  summary: string;
  /** Origin file or subsystem label for triage. */
  source: string;
  /** Longer details (stack trace, FEN dump, raw response, etc.). */
  details?: string;
  /** Current FEN when relevant (narration / position / stockfish). */
  fen?: string;
  /** Extra free-form context from the caller. */
  context?: string;
  /** Route at capture time, for repro. */
  route?: string;
}

/** Log one entry. Fire-and-forget. Also streams the entry to
 *  `/api/audit-stream` when the user has opted in by setting
 *  `auditStreamUrl` + `auditStreamSecret` in localStorage. Stream
 *  failures are silent; the local Dexie log is still written. */
export async function logAppAudit(
  entry: Omit<AuditEntry, 'timestamp' | 'route'>,
): Promise<void> {
  const filled: AuditEntry = {
    ...entry,
    timestamp: Date.now(),
    route: typeof window !== 'undefined' ? window.location?.pathname : undefined,
  };
  try {
    const current = await readLog();
    current.push(filled);
    const trimmed = current.slice(-APP_AUDIT_LOG_MAX_ENTRIES);
    await db.meta.put({
      key: APP_AUDIT_LOG_META_KEY,
      value: JSON.stringify(trimmed),
    });
  } catch {
    /* swallow — auditor failures must not affect the feature path */
  }
  // Opt-in remote stream — used for live-watch sessions where Claude
  // polls the backend for new entries. Off by default.
  void streamAuditEntry(filled);
}

async function streamAuditEntry(entry: AuditEntry): Promise<void> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const url = localStorage.getItem('auditStreamUrl');
  const secret = localStorage.getItem('auditStreamSecret');
  if (!url || !secret) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-audit-secret': secret,
      },
      body: JSON.stringify(entry),
      // Best-effort: don't block on slow networks.
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* silent — the local Dexie log is still the source of truth */
  }
}

/** Read the full log, newest-last ordering preserved. */
export async function getAppAuditLog(): Promise<AuditEntry[]> {
  return readLog();
}

/** Clear the log. */
export async function clearAppAuditLog(): Promise<void> {
  try {
    await db.meta.delete(APP_AUDIT_LOG_META_KEY);
  } catch {
    /* no-op */
  }
}

async function readLog(): Promise<AuditEntry[]> {
  try {
    const record = await db.meta.get(APP_AUDIT_LOG_META_KEY);
    if (!record) return [];
    // Legacy (pre-stringify) may have an array directly; accept defensively.
    if (Array.isArray(record.value)) return record.value as AuditEntry[];
    if (typeof record.value !== 'string') return [];
    const parsed: unknown = JSON.parse(record.value);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Register a console back-door on `window.__AUDIT__` so the log is
 * reachable from DevTools even when the Settings UI isn't:
 *
 *   await __AUDIT__.dump()       // full entries
 *   await __AUDIT__.copy()       // copies the markdown report to clipboard
 *   await __AUDIT__.clear()      // empty the log
 *   __AUDIT__.count()            // last-read count (updated on dump/copy)
 *
 * Idempotent. Safe to call multiple times. Installed on app boot.
 */
export function installConsoleBackdoor(): void {
  if (typeof window === 'undefined') return;
  const api = {
    dump: async (): Promise<AuditEntry[]> => {
      const log = await getAppAuditLog();
      (api as unknown as { count: () => number }).count = () => log.length;
      // eslint-disable-next-line no-console
      console.log('[appAuditor] dump:', log.length, 'entries', log);
      return log;
    },
    copy: async (): Promise<void> => {
      const log = await getAppAuditLog();
      const md = formatAuditLogAsMarkdown(log);
      try {
        await navigator.clipboard.writeText(md);
        // eslint-disable-next-line no-console
        console.log('[appAuditor] copied', log.length, 'entries to clipboard');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[appAuditor] clipboard write failed:', err);
        // eslint-disable-next-line no-console
        console.log(md);
      }
    },
    clear: async (): Promise<void> => {
      await clearAppAuditLog();
      // eslint-disable-next-line no-console
      console.log('[appAuditor] cleared');
    },
    count: () => -1,
  };
  (window as unknown as { __AUDIT__: typeof api }).__AUDIT__ = api;
}

/** Minimal markdown serializer for the back-door `__AUDIT__.copy()`
 *  helper. Mirrors the UI panel's `formatLogAsMarkdown` without
 *  pulling the panel component into this service. */
function formatAuditLogAsMarkdown(log: AuditEntry[]): string {
  if (log.length === 0) return '# App audit log\n\n_No findings._\n';
  const blocks = [...log].reverse().map((entry, i) => {
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
  return ['# App audit log', '', `Total: **${log.length}** entries.`, '', '## Findings', '', blocks.join('\n\n')].join('\n');
}

/**
 * Install global error hooks on app boot. Returns a cleanup function
 * that detaches them — the production app never cleans up, but tests
 * need teardown to avoid cross-test pollution.
 *
 * Hooks are idempotent: calling twice is safe (replaces prior handlers).
 */
export function installGlobalErrorHooks(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onError = (event: ErrorEvent): void => {
    const message = event.error instanceof Error ? event.error.message : String(event.message);
    const stack = event.error instanceof Error ? event.error.stack : undefined;
    void logAppAudit({
      kind: 'uncaught-error',
      category: 'runtime',
      source: event.filename ?? 'window.onerror',
      summary: message || 'Unknown error',
      details: [
        stack,
        event.filename ? `file: ${event.filename}:${event.lineno}:${event.colno}` : '',
      ].filter(Boolean).join('\n'),
    });
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason as unknown;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    void logAppAudit({
      kind: 'unhandled-rejection',
      category: 'runtime',
      source: 'window.onunhandledrejection',
      summary: message || 'Unhandled promise rejection',
      details: stack,
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
