/**
 * Lichess health probe — runs the same endpoint with three different
 * fetch shapes and emits a single audit entry capturing what each
 * actually returned. Use to diagnose `Load failed` / `401` /
 * `network-error` style symptoms where the bare error message
 * doesn't tell us whether the issue is forbidden-header throw, CORS
 * preflight, network unreachable, content blocker, or an actual
 * gateway response.
 *
 * The probe is opt-in (Settings → Run diagnostics). It is NOT called
 * from the normal explorer fetch path — production calls go through
 * `lichessExplorerService.ts` and don't pay the 3x cost.
 *
 * What it tries (in order):
 *   1. Bare GET — no headers at all. Tests whether the endpoint is
 *      reachable when the request is the simplest possible CORS GET.
 *   2. Accept-only — `Accept: application/json`. CORS-safelist;
 *      should not trigger preflight.
 *   3. Accept + X-Client — `X-Client: chess-academy-pro/1.0`.
 *      Triggers OPTIONS preflight; isolates whether preflight is
 *      what's failing.
 *
 * Each attempt records: HTTP status, response time, error name +
 * message + cause when it threw, and the resolved URL. The combined
 * pattern across the three rows tells us the actual failure mode.
 */
import { logAppAudit } from './appAuditor';

const PROBE_TIMEOUT_MS = 5_000;

interface ProbeAttempt {
  shape: 'bare' | 'accept-only' | 'accept-plus-x-client';
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  errorName?: string;
  errorMessage?: string;
  errorCause?: string;
}

/**
 * Run the three-shape probe and emit a `lichess-health-probe-result`
 * audit entry summarizing every attempt. Returns the full attempts
 * array for any caller that wants to render it directly.
 */
export async function runLichessHealthProbe(): Promise<ProbeAttempt[]> {
  // Probe the masters explorer endpoint with a known-good FEN.
  // Starting position: every Lichess explorer source has data here,
  // so a 200 response is the unambiguous "endpoint is reachable + the
  // request shape is acceptable" signal.
  const startingFen =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(startingFen)}`;

  const attempts: ProbeAttempt[] = [];

  // Run sequentially, not in parallel — we want timings to reflect
  // real-world latency without contention. 3 × 5s upper bound is
  // tolerable for a debug button.
  attempts.push(await runOne(url, 'bare', undefined));
  attempts.push(
    await runOne(url, 'accept-only', { Accept: 'application/json' }),
  );
  attempts.push(
    await runOne(url, 'accept-plus-x-client', {
      Accept: 'application/json',
      'X-Client': 'chess-academy-pro/1.0',
    }),
  );

  const summary = attempts
    .map((a) => `${a.shape}=${a.ok ? `ok(${a.status ?? '?'})` : `fail(${a.errorName ?? a.status ?? '?'})`}`)
    .join('; ');
  void logAppAudit({
    kind: 'lichess-health-probe-result',
    category: 'subsystem',
    source: 'lichessHealthProbe.runLichessHealthProbe',
    summary,
    details: JSON.stringify({
      online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      attempts,
    }, null, 2),
  });

  return attempts;
}

async function runOne(
  url: string,
  shape: ProbeAttempt['shape'],
  headers: Record<string, string> | undefined,
): Promise<ProbeAttempt> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return {
      shape,
      url,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - started,
    };
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string; cause?: unknown };
    return {
      shape,
      url,
      status: null,
      ok: false,
      durationMs: Date.now() - started,
      errorName: e.name ?? 'UnknownError',
      errorMessage: e.message ?? String(err),
      errorCause:
        e.cause !== undefined && e.cause !== null
          ? typeof e.cause === 'string'
            ? e.cause
            : JSON.stringify(e.cause)
          : undefined,
    };
  }
}
