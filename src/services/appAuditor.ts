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
  | 'fen-desync';

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

/** Log one entry. Fire-and-forget. */
export async function logAppAudit(
  entry: Omit<AuditEntry, 'timestamp' | 'route'>,
): Promise<void> {
  try {
    const current = await readLog();
    const filled: AuditEntry = {
      ...entry,
      timestamp: Date.now(),
      route: typeof window !== 'undefined' ? window.location?.pathname : undefined,
    };
    current.push(filled);
    const trimmed = current.slice(-APP_AUDIT_LOG_MAX_ENTRIES);
    await db.meta.put({
      key: APP_AUDIT_LOG_META_KEY,
      value: JSON.stringify(trimmed),
    });
  } catch {
    /* swallow — auditor failures must not affect the feature path */
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
