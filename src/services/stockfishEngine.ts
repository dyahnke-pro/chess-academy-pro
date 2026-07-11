import { Capacitor } from '@capacitor/core';
import { StockfishNative } from 'capacitor-stockfish-native';
import type { StockfishAnalysis, AnalysisLine } from '../types';
import { MATE_EVAL_VALUE } from './engineConstants';
import { stockfishCache } from './stockfishCache';
import { logAppAudit } from './appAuditor';

type StockfishMessageHandler = (analysis: StockfishAnalysis) => void;
type StockfishStatus = 'idle' | 'loading' | 'ready' | 'error';
type StatusChangeHandler = (status: StockfishStatus, error?: string) => void;

export type AnalysisPriority = 'brain' | 'prefetch';

/** Surface error thrown when a `priority='prefetch'` analysis is
 *  dropped because a `priority='brain'` analysis is already in flight.
 *  Callers (the speculative-prefetch path) should catch and ignore. */
export class PrefetchDroppedError extends Error {
  constructor() {
    super('prefetch dropped: brain eval in flight');
    this.name = 'PrefetchDroppedError';
  }
}

interface PendingAnalysis {
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (error: Error) => void;
  lines: Map<number, AnalysisLine>;
  bestMove: string;
  depth: number;
  blackToMove: boolean;
  /** Caller's priority. Used by `analyzePosition`'s contention rules:
   *  brain calls preempt prefetch; prefetch is dropped when a brain
   *  eval is already in flight; brain-on-brain serializes via the
   *  brain mutex instead of cancelling. */
  priority: AnalysisPriority;
  /** FEN + requested depth, captured so the bestmove handler can
   *  populate the LRU cache once analysis completes. Skipped when
   *  the call carried per-analysis options (Skill Level, etc.). */
  cacheFen?: string;
  cacheDepth?: number;
  /** Hard-timeout handle that recovers this analysis if the worker dies
   *  silently (no bestmove). Cleared when the analysis settles. */
  hardTimeout?: ReturnType<typeof setTimeout>;
  /** Wall-clock ms when this analysis was dispatched. Used by the asm/iOS
   *  liveness guard to bound how long a slow-but-alive worker may be
   *  nudged before it's force-recovered anyway. */
  startedAt?: number;
}

interface QueueEntry {
  fen: string;
  depth: number;
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (error: Error) => void;
}

const INIT_TIMEOUT_MS = 45_000;
const STOCKFISH_MT_URL = '/stockfish/stockfish-18-lite.js';
const STOCKFISH_ST_URL = '/stockfish/stockfish-18-lite-single.js';
// Pure-asm.js Stockfish (Niklas Fiekas's build, the lila author) — NO WebAssembly,
// so it can't hit the `call_indirect to a signature that does not match` trap that
// kills stockfish-18-lite-single on iOS WebKit (192 crashes in PostHog, David
// 2026-06-21). asm.js is plain JS: slower than WASM but bulletproof on iOS Safari,
// needs no SharedArrayBuffer, and speaks standard UCI (incl. Skill Level) so the
// rating-matched difficulty still works. iOS ONLY — desktop keeps multi-thread,
// Android keeps the WASM single build (Chromium has no call_indirect bug).
const STOCKFISH_IOS_ASM_URL = '/stockfish/stockfish-asm.js';
// NOTE (David 2026-06-15): the lila/sf16-7 module-worker path was REMOVED from
// routing — it needs SharedArrayBuffer (7+ SAB/pthread refs) which iOS
// Capacitor lacks, so it hung 45s on init. iOS now uses the SAB-free
// single build (STOCKFISH_ST_URL). The lila-bridge.worker.js + sf16-7 assets
// remain on disk (orphaned) pending a decision on a true single-threaded
// engine if the single build's iOS-26 `call_indirect` issue resurfaces.
const MAX_CRASH_RETRIES = 3;
/** How long to wait after spawning the multi-threaded worker before
 *  declaring it broken. The bundle hangs / throws inside pthread
 *  spawn very quickly when the host environment can't actually run
 *  it, so 5s is enough to catch real failures while still allowing
 *  slow first-load WASM compilation to finish. */
const MT_EARLY_FAILURE_WINDOW_MS = 5_000;

export type StockfishVariant = 'multi' | 'single' | 'lila' | 'asm' | 'ios-native';

export interface ResolvedWorker {
  url: string;
  variant: StockfishVariant;
  reason: string;
  /** WO-STOCKFISH-SWAP — `lila` variant uses a module worker; the
   *  others use classic workers. Caller passes this through to
   *  `new Worker(url, { type })`. */
  workerType?: 'module' | 'classic';
}

/** WO-STOCKFISH-SWAP — iOS Safari User-Agent detection. The
 *  `stockfish-18-lite` bundles (multi AND single) crash with
 *  `RuntimeError: call_indirect to a signature that does not match`
 *  on iOS Safari 26+ (audit cycle 6 confirmed across 10+ findings).
 *  iOS Safari is detected by UA tokens that don't match other
 *  WebKit-based engines (Chrome on iOS lies and reports Safari, but
 *  ALSO has CriOS / FxiOS / EdgiOS in the UA — exclude those).
 *  When detected, route to lila-stockfish-web's sf16-7 instead.
 *  Capacitor on iOS reports user agent containing "iPhone" /
 *  "iPad" too — same crash applies; same path applies. */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  // iPad Safari masquerades as Mac on iPadOS 13+ — also check
  // maxTouchPoints to catch that.
  const looksIos =
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) &&
      typeof navigator.maxTouchPoints === 'number' &&
      navigator.maxTouchPoints > 1);
  if (!looksIos) return false;
  // Exclude Chrome, Firefox, Edge on iOS — they don't have the WASM
  // crash and shouldn't take the lila path. They all still hit
  // `Mozilla/5.0 ... Safari/...` but inject their own token.
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function resolveWorkerUrl(): ResolvedWorker {
  if (typeof window === 'undefined') {
    return { url: STOCKFISH_ST_URL, variant: 'single', reason: 'no-window', workerType: 'classic' };
  }
  const isolated =
    (window as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  const sabAvailable = typeof SharedArrayBuffer !== 'undefined';
  // iOS ALWAYS uses the asm.js build — NEVER multi, even with SharedArrayBuffer.
  // "Option A" (David 2026-06-21) bet that once the native COOP/COEP patch made
  // the iOS WebView cross-origin-isolated, iPhone could run the same threaded
  // `multi` build as desktop. Production disproved it: with SAB now present on
  // iOS, the picker chose `multi` and the threaded WASM heap OOMs on iPhone
  // memory limits — 100% of the Stockfish crashes in PostHog over the last 7
  // days were iOS, "RangeError: Out of memory" on multi → crash cascade (David
  // 2026-06-28). So the iOS check goes FIRST and short-circuits to asm: it's the
  // bulletproof build (plain JS, no SAB, no `call_indirect` trap that kills the
  // WASM single build on WebKit, no threaded-heap OOM). Slower than WASM, but a
  // working engine beats a crashing one. Desktop/Android keep `multi`.
  if (isIosSafari()) {
    return {
      url: STOCKFISH_IOS_ASM_URL,
      variant: 'asm',
      reason: 'iOS — asm.js build (multi OOMs the iPhone heap; the WASM single build call_indirect-traps on WebKit)',
      workerType: 'classic',
    };
  }
  // Non-iOS with cross-origin isolation + SAB → the fast multi-threaded build.
  if (isolated && sabAvailable) {
    return {
      url: STOCKFISH_MT_URL,
      variant: 'multi',
      reason: 'crossOriginIsolated + SharedArrayBuffer available (non-iOS)',
      workerType: 'classic',
    };
  }
  return {
    url: STOCKFISH_ST_URL,
    variant: 'single',
    reason: `multi-thread requirements not met (crossOriginIsolated=${isolated}, SharedArrayBuffer=${sabAvailable})`,
    workerType: 'classic',
  };
}

/** Phase 8 — Stockfish crash hygiene constants. */
/** Delay between `worker.terminate()` and the single-thread fallback
 *  spawn, in milliseconds. `terminate()` is synchronous but the
 *  browser's WASM page reclamation is async; spawning the fallback
 *  immediately can OOM because the multi-thread heap hasn't been
 *  freed yet. 100ms is enough on Chrome 120 in the wild (audit cycle
 *  dbaee3b confirmed the OOM came ~95ms after the multi crash). */
const WASM_RECLAIM_DELAY_MS = 100;
/** Backoff delay before retrying a single-thread spawn that OOM'd.
 *  Most WASM OOMs are transient memory pressure that recovers
 *  within a second; one retry after this delay clears the majority
 *  of cases without making the user wait too long if the retry
 *  also fails. */
const SINGLE_THREAD_RETRY_DELAY_MS = 500;
/** How long after the FIRST worker error we keep coalescing further
 *  errors into the same audit-log entry. A crashing multi-thread
 *  bundle emits 60+ ErrorEvents in ~100ms; we want one summary log,
 *  not 60 IndexedDB writes blocking the main thread. */
const WORKER_ERROR_DEDUP_WINDOW_MS = 500;
/** Watchdog: if an analysis sends `go` but no `bestmove` arrives within
 *  this window, emit a `stockfish-analysis-stalled` audit. This is the
 *  signal that screens a dead eval bar (esp. the iOS lila/sf16-7 bridge
 *  failing silently) to the audit stream / PostHog — David 2026-06-15.
 *  Generous so a slow deep search on single-thread/lila never false-fires;
 *  a truly stuck engine never returns at all. Audit-only — does not alter
 *  the resolve/reject flow (callers own their own timeouts). */
const ANALYSIS_STALL_MS = 12_000;
/** Per-variant SEARCH TIME BUDGET appended to every depth search as
 *  `go depth N movetime B` — UCI runs both limits and stops at whichever is
 *  reached first (empirically verified on the exact shipped asm build,
 *  2026-07-11: `go depth 99 movetime 1500` → bestmove in 1537ms at depth 13).
 *
 *  ROOT CAUSE this exists (PostHog 2026-07-06→11, ~35 stall events): on the
 *  single-threaded variants the search runs synchronously inside the
 *  worker's event loop, so an unbounded `go depth 18` can run 30s+ AND the
 *  `stop` command sits unprocessed in the message queue — that is the
 *  literal "budget grace exceeded (engine not responding to stop)" event.
 *  `movetime` is enforced INSIDE the engine's search loop (no event loop
 *  needed), so it bounds latency where `stop` cannot. A budget'd search
 *  returns the best line found so far — bounded-shallow beats timeout-
 *  nothing; the result's `depth` field reports the depth actually reached
 *  (the info-line parser already tracks it).
 *
 *  Fast variants keep pure depth (undefined budget): they honor `stop`,
 *  finish depth 18 in well under a second, and capping them would only
 *  cost analysis quality. The stall watchdog + hard-timeout recovery stay
 *  untouched as the safety net — with the budget they should ~never fire. */
const SEARCH_BUDGET_MS: Partial<Record<StockfishVariant, number>> = {
  asm: 5_000,
  single: 8_000,
};
/** Hard recovery timeout for a single analysis. The 12s stall above is
 *  audit-ONLY (it logs a dead eval bar but never settles the promise),
 *  which is exactly how the coach froze: `analyzeWithBudget`'s 300ms
 *  budget calls `stop()`, but `stop()` is a no-op on a worker iOS killed
 *  while backgrounded / that crashed mid-search without firing `onerror`,
 *  so the underlying analyze promise NEVER settles and every awaiting
 *  caller (the grounded coach answer) hangs forever (David 2026-06-16).
 *  When this fires, `recoverStuckAnalysis` REJECTS the caller and resets
 *  the dead worker so the next analyze respawns a fresh one. Generous so
 *  a legit deep single-thread search never gets killed mid-flight; a
 *  truly dead worker is the only thing that reaches it. */
const ANALYSIS_HARD_TIMEOUT_MS = 30_000;
/** Grace window AFTER the brain budget's `stop()` before we give up on a
 *  live bestmove and recover. On a healthy engine `stop()` yields a
 *  bestmove in a few ms; if nothing comes back within the grace the
 *  worker is dead, so recover FAST (don't make the coach wait the full
 *  30s engine-level backstop) — reject → the brain serves its grounded
 *  "I can't verify" fallback instead of freezing. */
const ANALYSIS_BUDGET_GRACE_MS = 2_000;
/** asm/iOS liveness window. The asm.js build is SLOW and slow to honor
 *  `stop` on iOS WebKit, but it streams `info` lines throughout a search —
 *  so a worker that emitted ANY message within this window is ALIVE, just
 *  slow, and must NOT be torn down (tearing it down forces a 45s cold
 *  re-parse of the 1.58MB asm bundle → the init-timeout thrash cascade,
 *  David 2026-07-05 PostHog). A truly dead / iOS-background-killed worker
 *  emits nothing, so it stays past this window and is still recovered
 *  (the June freeze fix is preserved). asm variant ONLY — other variants
 *  keep the original teardown-on-grace behavior untouched. */
const ASM_WORKER_LIVENESS_MS = 4_000;
/** Absolute ceiling from analysis dispatch after which an asm worker is
 *  force-recovered EVEN IF still emitting — bounds the worst case (an
 *  engine ignoring `stop` and streaming forever) so the liveness guard
 *  can never hang a caller indefinitely. */
const ASM_RECOVER_CEILING_MS = 15_000;
/** localStorage key for the persisted "multi-thread is broken on
 *  this host" flag. Per audit cycle ccd0057: multi-thread crashes
 *  reliably on David's machine. Without persistence, every new
 *  session re-probes multi-thread → crashes → falls back, wasting
 *  ~2 s of init on every page load. With the flag persisted, we
 *  skip multi entirely after the first failure on a given device. */
const MULTI_FALLBACK_LS_KEY = 'sfx.multi-fallback-attempted.v1';

function readPersistedMultiFallback(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(MULTI_FALLBACK_LS_KEY) === '1';
  } catch {
    return false;
  }
}

function writePersistedMultiFallback(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MULTI_FALLBACK_LS_KEY, '1');
  } catch {
    // localStorage can throw (private browsing, quota, etc.) —
    // not worth surfacing; we just don't get persistence.
  }
}

/** True only in the native iOS app (Capacitor WKWebView) with the native
 *  Stockfish plugin registered. There we run Stockfish as a real ARM binary
 *  instead of asm.js in the WebView — no 1.58MB re-parse, no worker-kill, no
 *  init-timeout thrash (David 2026-07-05 PostHog), and vastly faster. Web +
 *  Android + mobile-web keep the JS engine, so this is false there. */
function isNativeIosStockfishAvailable(): boolean {
  try {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === 'ios' &&
      Capacitor.isPluginAvailable('StockfishNative')
    );
  } catch {
    return false;
  }
}

/**
 * Worker-compatible adapter over the native Stockfish plugin. Presents the
 * exact surface the engine uses on a `Worker` (`postMessage`, `onmessage`,
 * `onerror`, `addEventListener('message')`, `removeEventListener`,
 * `terminate`) so the UCI state machine in `StockfishEngine` is UNCHANGED —
 * only the transport differs. Outbound commands are queued until the async
 * `start()` completes, then flushed; inbound UCI lines arrive on the plugin's
 * `output` listener and are delivered as `MessageEvent`-shaped objects.
 */
class NativeStockfishTransport {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private readonly _msgHandlers = new Set<(event: MessageEvent<string>) => void>();
  private readonly _outQueue: string[] = [];
  private _ready = false;
  private _dead = false;
  private _listenerHandle: { remove: () => Promise<void> } | null = null;

  constructor() {
    void this._boot();
  }

  private async _boot(): Promise<void> {
    try {
      this._listenerHandle = await StockfishNative.addListener(
        'output',
        (data: { line: string }) => this._deliver(data?.line ?? ''),
      );
      await StockfishNative.start();
      if (this._dead) return;
      this._ready = true;
      for (const cmd of this._outQueue.splice(0)) {
        void StockfishNative.cmd({ cmd }).catch((err: unknown) => this._fail(err));
      }
    } catch (err) {
      this._fail(err);
    }
  }

  private _deliver(line: string): void {
    if (this._dead || !line) return;
    const event = { data: line } as MessageEvent<string>;
    this.onmessage?.(event);
    for (const handler of [...this._msgHandlers]) handler(event);
  }

  private _fail(err: unknown): void {
    if (this._dead) return;
    const message = `native stockfish transport failed: ${
      err instanceof Error ? err.message : String(err)
    }`;
    // Shape enough of an ErrorEvent for the engine's onerror handler (reads
    // `.message`, calls `.preventDefault?.()`).
    const event = { message, preventDefault() {} } as unknown as ErrorEvent;
    this.onerror?.(event);
  }

  postMessage(cmd: string): void {
    if (this._dead) return;
    if (this._ready) void StockfishNative.cmd({ cmd }).catch((err: unknown) => this._fail(err));
    else this._outQueue.push(cmd);
  }

  addEventListener(type: 'message', listener: (event: MessageEvent<string>) => void): void {
    if (type === 'message') this._msgHandlers.add(listener);
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<string>) => void): void {
    if (type === 'message') this._msgHandlers.delete(listener);
  }

  terminate(): void {
    this._dead = true;
    this._msgHandlers.clear();
    this.onmessage = null;
    this.onerror = null;
    const handle = this._listenerHandle;
    this._listenerHandle = null;
    void handle?.remove().catch(() => {});
    void StockfishNative.exit().catch(() => {});
  }
}

class StockfishEngine {
  // Last init stage the (lila) bridge reported via a `__sfstage__` marker —
  // folded into the init-timeout message to name where the iOS hang occurs
  // (David 2026-06-15).
  private _lastInitStage: string | null = null;
  // Wall-clock ms of the last message received from the current worker (any
  // message: __sfstage__, error:, info, uciok, readyok, bestmove). The
  // asm/iOS liveness guard reads this to tell a slow-but-alive worker (still
  // streaming info) apart from a dead one (silent) before tearing it down.
  // Reset when a new worker is spawned.
  private _lastMessageAt = 0;
  private worker: Worker | null = null;
  private isReady = false;
  private pending: PendingAnalysis | null = null;
  private messageHandlers: Set<StockfishMessageHandler> = new Set();
  private statusHandlers: Set<StatusChangeHandler> = new Set();
  private initPromise: Promise<void> | null = null;
  private _status: StockfishStatus = 'idle';
  private _error: string | null = null;
  // Analysis queue — serializes requests so they don't cancel each other
  private _queue: QueueEntry[] = [];
  private _queueRunning = false;
  // Gate to ignore stale bestmove/info from a stopped analysis
  private _analysisStarted = false;
  // Worker-crash retry counter; resets on successful initialize.
  private _crashRetries = 0;
  // Set true once the engine has surfaced "engine unavailable" so we
  // don't keep trying to reinit on every analyze call.
  private _permanentlyUnavailable = false;
  // Which Stockfish bundle the current worker was spawned from. Used
  // to gate multi-thread-only setoptions during the init handshake.
  private workerVariant: StockfishVariant = 'single';
  // Serialization chain for brain-priority analyses. Each new brain
  // call appends a fresh promise; the previous one is awaited before
  // the new call enters its handshake. Prefetch calls bypass the
  // mutex (they are dropped when a brain is in flight, or supersede
  // an in-flight prefetch).
  private _brainMutex: Promise<void> = Promise.resolve();
  // Sticky once the multi-thread bundle has failed at runtime in
  // this app session OR on this device in a previous session. Once
  // true, every subsequent initialize() call goes straight to the
  // single-threaded variant. Persisted to localStorage on first
  // failure so a fresh page load doesn't re-probe a known-broken
  // multi-thread bundle (saves ~2 s of init on every load on
  // affected devices).
  private _runtimeFallbackAttempted = readPersistedMultiFallback();
  // Sticky once the native iOS Stockfish plugin has failed to boot in this
  // session. When set, initialize() stops picking `ios-native` and falls back
  // to the asm.js Worker so the iOS app is never left with no engine.
  private _nativeFallbackAttempted = false;
  // Phase 8 — coalesce worker error spam. Multi-thread crashes can
  // emit 60+ ErrorEvents in ~100ms; we want one audit-log row, not
  // 60. Tracks the first error timestamp + count in the current
  // dedup window.
  private _workerErrorWindow: { startedAt: number; count: number } | null = null;
  // Phase 8 — single-thread OOM retry budget. Capped at one retry
  // per session to avoid a tight spin if the host is genuinely out
  // of memory. Reset on successful init.
  private _singleThreadOomRetryUsed = false;

  get status(): StockfishStatus {
    return this._status;
  }

  get error(): string | null {
    return this._error;
  }

  private setStatus(status: StockfishStatus, error?: string): void {
    this._status = status;
    this._error = error ?? null;
    this.statusHandlers.forEach((h) => h(status, error));
  }

  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  // Init-failure cooldown. When the worker init throws (commonly:
  // `WebAssembly.Memory(): could not allocate memory` on a memory-
  // pressured device), subsequent callers should fail-fast for a
  // window instead of re-entering the init flow and re-OOMing. The
  // audit (2026-05-14 scenario 25 + 26) captured 1.3M browser-level
  // pageerror events when consumer-side useEffects re-called
  // analyzePosition in a tight loop after each OOM. The cooldown
  // window bounds the cascade to "a few errors then silent fail-fast"
  // and recovers on its own when the memory pressure clears.
  //
  // 2026-05-17 audit caught the original 30s being too long in
  // practice: a single init timeout poisoned every subsequent
  // opponent move during /openings/<id>/play (random moves for ~30s
  // until cooldown expired). Reduced to 5s — still bounds the
  // OOM cascade (the cascade fires in milliseconds, not seconds)
  // but recovers fast enough that human-paced play doesn't stall.
  private _initFailedAt: number | null = null;
  private static readonly INIT_COOLDOWN_MS = 5_000;

  async initialize(): Promise<void> {
    if (this._permanentlyUnavailable) {
      throw new Error('Stockfish engine unavailable (exhausted crash retries)');
    }
    if (this._initFailedAt !== null && Date.now() - this._initFailedAt < StockfishEngine.INIT_COOLDOWN_MS) {
      throw new Error('Stockfish init cooldown — try again in a few seconds');
    }
    if (this.initPromise) return this.initPromise;

    this.setStatus('loading');
    console.log('[Stockfish] Initializing worker...');

    this.initPromise = new Promise((resolve, reject) => {
      const overallTimeoutId = setTimeout(() => {
        // Fold in the last init stage the worker reported (David 2026-06-15):
        // the iOS lila init HANGS, and the last `__sfstage__` marker names
        // exactly where (import / instantiate / runtime) so we can fix the
        // real hang point instead of guessing.
        const msg = `Stockfish initialization timed out after 45s (last stage: ${this._lastInitStage ?? 'none — worker never signaled'})`;
        console.error('[Stockfish]', msg);
        this.setStatus('error', msg);
        reject(new Error(msg));
      }, INIT_TIMEOUT_MS);

      const threadCount =
        (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
      const hashMb = 64;

      // Track the early-failure timer for the multi-thread variant so
      // we can clear it once uciok is received OR when fallback runs.
      let earlyFailureTimer: ReturnType<typeof setTimeout> | null = null;

      const tryStart = (forceSingle: boolean): void => {
        let resolved: ResolvedWorker;
        // iOS ALWAYS delegates to resolveWorkerUrl(), which pins iOS to the
        // asm.js build — never multi (it OOMs the iPhone heap) and never the
        // WASM single build (it `call_indirect`-traps on WebKit). The
        // force-single / sticky-fallback branches below are for NON-iOS hosts
        // recovering from a multi-thread failure; iOS short-circuits before
        // them so a multi crash there can never route iOS to the broken single
        // build (David 2026-06-28, after the iOS multi-OOM cascade in PostHog).
        if (isNativeIosStockfishAvailable() && !this._nativeFallbackAttempted) {
          // Native iOS app: run Stockfish as an ARM binary via the plugin,
          // bypassing the asm.js WebView engine entirely. `url` is unused —
          // the construction branch keys off `variant === 'ios-native'`.
          resolved = {
            url: '',
            variant: 'ios-native',
            reason: 'iOS native Stockfish plugin (asm.js WebView bypass)',
            workerType: 'classic',
          };
        } else if (isIosSafari()) {
          resolved = resolveWorkerUrl();
        } else if (forceSingle) {
          resolved = {
            url: STOCKFISH_ST_URL,
            variant: 'single',
            reason: 'runtime fallback after multi-thread bundle failure',
            workerType: 'classic',
          };
        } else if (this._runtimeFallbackAttempted) {
          // Sticky: a previous initialize() in this session already
          // discovered that multi-thread is broken on this host. Skip
          // probing it again.
          resolved = {
            url: STOCKFISH_ST_URL,
            variant: 'single',
            reason: 'sticky fallback (multi previously failed at runtime)',
            workerType: 'classic',
          };
        } else {
          resolved = resolveWorkerUrl();
        }

        this.workerVariant = resolved.variant;
        console.log(
          `[Stockfish] Using ${resolved.variant}-threaded variant: ${resolved.reason}`,
        );
        void logAppAudit({
          kind: 'stockfish-variant-resolved',
          category: 'subsystem',
          source: 'stockfishEngine.initialize',
          summary: `variant=${resolved.variant} reason=${resolved.reason}`,
        });

        // Fallback is only meaningful for the multi-thread variant; if
        // we're already on single, a failure is a real init failure.
        const handleEarlyMultiFailure = (reason: string): void => {
          if (this.workerVariant !== 'multi') return;
          if (this._runtimeFallbackAttempted) return;
          this._runtimeFallbackAttempted = true;
          // Persist so a fresh page load on this device doesn't
          // re-probe the known-broken multi-thread bundle.
          writePersistedMultiFallback();
          if (earlyFailureTimer !== null) {
            clearTimeout(earlyFailureTimer);
            earlyFailureTimer = null;
          }
          const totalErrors = this._workerErrorWindow?.count ?? 1;
          console.warn(
            `[Stockfish] Multi-thread variant failed at runtime (${totalErrors} error event${
              totalErrors === 1 ? '' : 's'
            }), falling back to single-threaded`,
          );
          void logAppAudit({
            kind: 'stockfish-variant-fallback',
            category: 'subsystem',
            source: 'stockfishEngine.initialize',
            summary: `multi failed at runtime, fell back to single (reason: ${reason}; ${totalErrors} error event${
              totalErrors === 1 ? '' : 's'
            } coalesced)`,
          });
          this.worker?.terminate();
          this.worker = null;
          // Phase 8 Bug B — give the browser time to reclaim the
          // multi-thread WASM heap BEFORE spawning the single-thread
          // worker. Without this delay, the single-thread spawn OOMs
          // because the multi-thread pages haven't been freed yet.
          // ~100ms is enough on Chrome 120 (audit confirmed the
          // single-thread OOM came ~95ms after the multi crash).
          setTimeout(() => tryStart(true), WASM_RECLAIM_DELAY_MS);
        };

        try {
          // WO-STOCKFISH-SWAP — module worker shape for the lila
          // bridge (which uses ES module imports); classic worker
          // for the legacy stockfish-18-lite bundle.
          this.worker = resolved.variant === 'ios-native'
            ? (new NativeStockfishTransport() as unknown as Worker)
            : resolved.workerType === 'module'
              ? new Worker(resolved.url, { type: 'module' })
              : new Worker(resolved.url);
          // Fresh worker → reset liveness clock so a stale timestamp from a
          // prior worker can't make this one look alive before it speaks.
          this._lastMessageAt = Date.now();

          this.worker.onmessage = (event: MessageEvent<string>) => {
            // Liveness heartbeat — ANY message means the worker is running.
            this._lastMessageAt = Date.now();
            const line = event.data;
            // Bridge init stage marker (David 2026-06-15) — records where the
            // iOS init hang occurs; NOT a UCI line, so consume it here.
            if (typeof line === 'string' && line.startsWith('__sfstage__ ')) {
              this._lastInitStage = line.slice('__sfstage__ '.length);
              return;
            }
            // The lila/sf16-7 bridge (iOS path) reports failures as
            // `error: ...` UCI lines (bridge-init / bridge-uci failed).
            // handleMessage only parses info/bestmove and silently drops
            // these — which is why a dead eval bar gives NO signal. Surface
            // them to the audit stream and unblock any hung analysis.
            if (typeof line === 'string' && /^error:/i.test(line)) {
              this.surfaceWorkerError(line);
            }
            this.handleMessage(line);
          };

          this.worker.onerror = (error) => {
            // Capture the failing file:line:col (David 2026-06-15 root-cause
            // hunt) — for a worker SCRIPT load/parse failure `error.message`
            // is empty, but `filename`/`lineno` name the resource that died,
            // which is what was missing when the iOS lila crash logged blank.
            const ee = error as Partial<ErrorEvent>;
            const loc = ee.filename
              ? ` @ ${ee.filename}:${ee.lineno ?? '?'}:${ee.colno ?? '?'}`
              : '';
            const msg =
              (error.message || 'Uncaught RuntimeError or worker load failure') + loc;
            // Phase 8 Bug A — suppress the bubble to window.onerror.
            // A crashing multi-thread bundle emits 60+ ErrorEvents
            // in ~100ms; if any of those reach the global error
            // handler, installGlobalErrorHooks logs each one to
            // IndexedDB and blocks the main thread for hundreds of
            // ms. preventDefault() + the dedup window below cap
            // worker-crash audit volume at 1 row per ~500ms.
            error.preventDefault?.();
            // Coalesce console + audit logging within the dedup
            // window so we don't spam either.
            const now = Date.now();
            const inWindow =
              this._workerErrorWindow !== null &&
              now - this._workerErrorWindow.startedAt <
                WORKER_ERROR_DEDUP_WINDOW_MS;
            if (inWindow && this._workerErrorWindow) {
              this._workerErrorWindow.count += 1;
              return true;
            }
            this._workerErrorWindow = { startedAt: now, count: 1 };
            console.error('[Stockfish] worker.onerror:', msg);
            // Native iOS engine failed to boot — demote to the asm.js Worker
            // (sticky for the session) so the app is never left engine-less.
            if (
              this.workerVariant === 'ios-native' &&
              !this._nativeFallbackAttempted
            ) {
              this._nativeFallbackAttempted = true;
              void logAppAudit({
                kind: 'stockfish-variant-fallback',
                category: 'subsystem',
                source: 'stockfishEngine.initialize',
                summary: `native iOS engine failed to boot (${msg.slice(0, 120)}); falling back to asm.js`,
              });
              if (earlyFailureTimer !== null) {
                clearTimeout(earlyFailureTimer);
                earlyFailureTimer = null;
              }
              this.worker?.terminate();
              this.worker = null;
              setTimeout(() => tryStart(false), WASM_RECLAIM_DELAY_MS);
              return true;
            }
            // Multi-thread bundle failed early — try the runtime
            // fallback before treating this as a fatal init error.
            if (
              this.workerVariant === 'multi' &&
              !this._runtimeFallbackAttempted
            ) {
              handleEarlyMultiFailure(msg);
              return true;
            }
            // Phase 8 Bug C — single-thread also OOM'd. Retry once
            // after a backoff so a transient memory-pressure event
            // doesn't leave the engine permanently unavailable.
            // Detect OOM by message content (WebAssembly.instantiate
            // throws "Out of memory: Cannot allocate Wasm memory").
            const isOom =
              /out of memory|cannot allocate wasm memory/i.test(msg);
            if (
              this.workerVariant === 'single' &&
              isOom &&
              !this._singleThreadOomRetryUsed
            ) {
              this._singleThreadOomRetryUsed = true;
              console.warn(
                `[Stockfish] Single-thread spawn OOM; retrying after ${SINGLE_THREAD_RETRY_DELAY_MS}ms`,
              );
              void logAppAudit({
                kind: 'stockfish-variant-fallback',
                category: 'subsystem',
                source: 'stockfishEngine.initialize',
                summary: `single-thread OOM; retry-with-backoff (${SINGLE_THREAD_RETRY_DELAY_MS}ms)`,
              });
              this.worker?.terminate();
              this.worker = null;
              if (earlyFailureTimer !== null) {
                clearTimeout(earlyFailureTimer);
                earlyFailureTimer = null;
              }
              setTimeout(() => tryStart(true), SINGLE_THREAD_RETRY_DELAY_MS);
              return true;
            }
            clearTimeout(overallTimeoutId);
            if (earlyFailureTimer !== null) {
              clearTimeout(earlyFailureTimer);
              earlyFailureTimer = null;
            }
            this.setStatus('error', msg);
            this.initPromise = null;
            reject(new Error(msg));
            return true;
          };

          // 5-second early-failure window. If multi-thread doesn't
          // reach `uciok` in that time, the bundle is hung in pthread
          // spawn — fall back instead of waiting for the 45s overall
          // timeout. Single-threaded init has no early window; it
          // either initializes within 45s or it doesn't.
          if (resolved.variant === 'multi') {
            earlyFailureTimer = setTimeout(() => {
              handleEarlyMultiFailure('no uciok within 5s of spawn');
            }, MT_EARLY_FAILURE_WINDOW_MS);
          }

          const initHandler = (event: MessageEvent<string>): void => {
            if (event.data === 'uciok') {
              // uciok received — multi is past the danger zone.
              if (earlyFailureTimer !== null) {
                clearTimeout(earlyFailureTimer);
                earlyFailureTimer = null;
              }
              if (this.workerVariant === 'multi') {
                this.send(`setoption name Threads value ${threadCount}`);
                this.send(`setoption name Hash value ${hashMb}`);
                console.log(
                  `[Stockfish] threads=${threadCount} hash=${hashMb}MB`,
                );
              } else {
                console.log(
                  '[Stockfish] single-threaded variant — skipping Threads/Hash setup',
                );
              }
              this.send('setoption name MultiPV value 3');
              // ONE ucinewgame per engine session — initializes the hash tables
              // at the configured size and starts clean. It is deliberately NOT
              // sent per analysis (that would clear the transposition table
              // before every search, forcing a cold search from scratch each
              // move — David 2026-07-03). Keeping the table warm lets
              // consecutive positions in a game (each one ply deeper) reuse the
              // prior search tree and reach depth far faster, which matters most
              // for the slow iOS asm.js build.
              this.send('ucinewgame');
              this.send('isready');
              return;
            }
            if (event.data === 'readyok') {
              clearTimeout(overallTimeoutId);
              this.worker?.removeEventListener('message', initHandler);
              this.isReady = true;
              this._crashRetries = 0;
              this._initFailedAt = null; // clear cooldown on success
              // Reset Phase 8 retry budgets on successful ready.
              this._singleThreadOomRetryUsed = false;
              this._workerErrorWindow = null;
              console.log(
                `[Stockfish] Engine ready (${this.workerVariant}-threaded WASM)`,
              );
              this.setStatus('ready');
              resolve();
            }
          };

          this.worker.addEventListener('message', initHandler);
          this.send('uci');
        } catch (error) {
          // Synchronous throw during worker construction (rare, e.g.
          // the worker URL itself is malformed). Multi-thread gets
          // the runtime-fallback chance; single-thread cannot.
          if (
            this.workerVariant === 'multi' &&
            !this._runtimeFallbackAttempted
          ) {
            handleEarlyMultiFailure(
              error instanceof Error ? error.message : String(error),
            );
            return;
          }
          clearTimeout(overallTimeoutId);
          if (earlyFailureTimer !== null) {
            clearTimeout(earlyFailureTimer);
            earlyFailureTimer = null;
          }
          const msg = error instanceof Error ? error.message : String(error);
          console.error('[Stockfish] Init error:', msg);
          this.setStatus('error', msg);
          this.initPromise = null;
          reject(error instanceof Error ? error : new Error(msg));
        }
      };

      tryStart(false);
    });

    return this.initPromise.catch((err: unknown) => {
      // Surface init failures as crash events so the retry path can run.
      // ALSO record the failure timestamp so subsequent initialize()
      // calls in the next 30s fail-fast instead of re-OOMing.
      this._initFailedAt = Date.now();
      this.handleWorkerCrash(err instanceof Error ? err.message : String(err));
      throw err;
    });
  }

  /**
   * Wipe the broken worker and try once more, up to MAX_CRASH_RETRIES.
   * After the cap, mark the engine permanently unavailable so callers
   * (the brain, post-game review, hint system) can degrade gracefully.
   */
  private handleWorkerCrash(reason: string): void {
    // Record the failure for the init cooldown gate (idempotent —
    // initialize()'s own catch sets this too; covering both paths).
    this._initFailedAt = Date.now();
    this._crashRetries += 1;
    console.error(
      `[Stockfish] Worker crashed (attempt ${this._crashRetries}/${MAX_CRASH_RETRIES}): ${reason}`,
    );
    // Surface engine crash / init-failure to the audit stream + PostHog.
    // Without this, an engine that dies before it ever starts an analysis
    // (e.g. the iOS lila/sf16-7 module worker failing to load in the
    // Capacitor WebView) produces ZERO signal — a dead eval bar with no
    // explanation (David 2026-06-15). This is the failure mode that
    // surfaceWorkerError + the stall watchdog can't see because no `go`
    // is ever sent. stockfish-error is a DEFECT kind → $exception → the
    // error-watch autofix loop.
    void logAppAudit({
      kind: 'stockfish-error',
      category: 'subsystem',
      source: 'stockfishEngine.handleWorkerCrash',
      summary: `worker crash/init-fail (variant=${this.workerVariant ?? '?'}, attempt ${this._crashRetries}/${MAX_CRASH_RETRIES}): ${reason.slice(0, 160)}`,
    });
    if (this.pending) {
      if (this.pending.hardTimeout) clearTimeout(this.pending.hardTimeout);
      this.pending.reject(new Error(`worker crashed: ${reason}`));
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    if (this._crashRetries >= MAX_CRASH_RETRIES) {
      this._permanentlyUnavailable = true;
      this.setStatus(
        'error',
        'engine unavailable, coaching from position only',
      );
      // Reject every queued analysis so no caller hangs forever.
      for (const entry of this._queue) {
        entry.reject(new Error('engine unavailable'));
      }
      this._queue = [];
      this._queueRunning = false;
      return;
    }
    console.log('[Stockfish] Worker crashed, reinitializing...');
    // Don't await — let the next analyze call drive reinit naturally.
  }

  /** Reject the in-flight analysis and reset the (presumed dead) worker so
   *  the NEXT analyze spawns a fresh one. The recovery path for a worker
   *  that died silently — iOS background-kill mid-session, a WASM crash
   *  that didn't fire `onerror`, the single-thread iOS `call_indirect`
   *  fault — none of which ever emit `bestmove`, so the awaiting caller
   *  (the grounded coach answer) would otherwise hang forever and freeze
   *  the UI (David 2026-06-16). No-ops if `pending` already settled. */
  private recoverStuckAnalysis(reason: string): void {
    if (!this.pending) return;
    // asm/iOS LIVENESS GUARD — do NOT tear down a slow-but-alive worker.
    // The asm.js build streams `info` lines during search and is slow to
    // honor `stop` on iOS WebKit; if it emitted a message within the
    // liveness window it's alive, and terminating it would force a 45s cold
    // re-parse of the 1.58MB asm bundle (the init-timeout thrash cascade,
    // David 2026-07-05 PostHog). Instead: re-send `stop` to nudge a
    // bestmove and re-arm a short re-check. Bounded by an absolute ceiling
    // from dispatch so a genuinely stuck search still recovers. A dead /
    // background-killed worker emits nothing → falls straight through to
    // the teardown below (the June-2026 freeze fix is preserved). Guarded
    // to the asm variant so every other variant keeps its exact behavior.
    if (this.workerVariant === 'asm') {
      const alive = Date.now() - this._lastMessageAt < ASM_WORKER_LIVENESS_MS;
      const startedAgo = Date.now() - (this.pending.startedAt ?? 0);
      if (alive && startedAgo < ASM_RECOVER_CEILING_MS) {
        const held = this.pending;
        this.send('stop');
        if (held.hardTimeout) clearTimeout(held.hardTimeout);
        held.hardTimeout = setTimeout(() => {
          if (this.pending === held) {
            this.recoverStuckAnalysis(`${reason} (asm liveness re-check)`);
          }
        }, ASM_WORKER_LIVENESS_MS);
        return;
      }
    }
    const p = this.pending;
    this.pending = null;
    if (p.hardTimeout) clearTimeout(p.hardTimeout);
    // A MULTI worker that inited fine (uciok+readyok) then never returned
    // bestmove is the SAB/pthread search-deadlock some non-iOS browsers hit.
    // It fires no `onerror`, so handleEarlyMultiFailure never runs and the
    // demote flag stays false — the next initialize() respawns `multi` and
    // stalls again (the beta WEB loop: reset → multi → stall → reset …).
    // Wire the runtime stall into the SAME session-permanent + device-
    // persistent demote the init-failure path uses, so the next init takes
    // the sticky-single branch and future loads skip multi entirely. iOS is
    // already `asm`, so guarding on `multi` is sufficient.
    if (this.workerVariant === 'multi' && !this._runtimeFallbackAttempted) {
      this._runtimeFallbackAttempted = true;
      writePersistedMultiFallback();
      void logAppAudit({
        kind: 'stockfish-variant-fallback',
        category: 'subsystem',
        source: 'stockfishEngine.recoverStuckAnalysis',
        summary: `multi stalled at runtime (${reason}); demoted to single for the session + persisted`,
      });
    }
    void logAppAudit({
      kind: 'stockfish-analysis-stalled',
      category: 'subsystem',
      source: 'stockfishEngine.recoverStuckAnalysis',
      summary: `${reason} — resetting worker (variant=${this.workerVariant ?? '?'})`,
    });
    try { this.worker?.terminate(); } catch { /* already gone */ }
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    try { p.reject(new Error(`analysis aborted: ${reason}`)); } catch { /* ignore */ }
  }

  /** Force-teardown the current (dead / hung) worker so the NEXT analyze
   *  respawns a fresh one. Public so a caller that timed out BEFORE the 30s
   *  internal hard-timeout fired can recover a hung iOS worker immediately and
   *  retry, instead of waiting the backstop. Proven root cause (David 2026-07-04
   *  + node repro): the asm.js engine analyzes every position fine in <4s — the
   *  iOS WebKit Web Worker is what dies (memory/backgrounding), transiently and
   *  regardless of position/variant/depth. A fresh worker recovers. Same
   *  teardown as recoverStuckAnalysis; safe to call when idle (no-op-ish). */
  forceRestart(reason: string = 'caller-forced'): void {
    const p = this.pending;
    this.pending = null;
    if (p?.hardTimeout) clearTimeout(p.hardTimeout);
    void logAppAudit({
      kind: 'stockfish-analysis-stalled',
      category: 'subsystem',
      source: 'stockfishEngine.forceRestart',
      summary: `forced worker respawn (${reason}); variant=${this.workerVariant ?? '?'}`,
    });
    try { this.worker?.terminate(); } catch { /* already gone */ }
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    if (p) { try { p.reject(new Error(`analysis aborted: forceRestart (${reason})`)); } catch { /* ignore */ } }
  }

  async analyzePosition(
    fen: string,
    depth: number = 18,
    options?: Record<string, string | number>,
    priority: AnalysisPriority = 'brain',
  ): Promise<StockfishAnalysis> {
    // FEN cache short-circuit — if we've already analyzed this exact
    // position+depth, return the cached result without invoking the
    // worker. Per-analysis `options` (e.g. Skill Level overrides) are
    // intentionally NOT part of the key — those callers should bypass
    // by passing a cache-skip sentinel if needed. Today only the brain
    // and prefetch path call without options.
    if (!options) {
      const hit = stockfishCache.get(fen, depth);
      if (hit) {
        void logAppAudit({
          kind: 'stockfish-cache-hit',
          category: 'subsystem',
          source: 'stockfishCache',
          summary: `fen=${fen.slice(0, 30)}... depth=${depth}`,
        });
        return hit;
      }
      void logAppAudit({
        kind: 'stockfish-cache-miss',
        category: 'subsystem',
        source: 'stockfishCache',
        summary: `fen=${fen.slice(0, 30)}... depth=${depth}`,
      });
    }

    // Priority contention rules:
    //   1. Incoming brain call cancels any in-flight prefetch.
    //   2. Incoming prefetch is DROPPED if a brain call is in flight
    //      (real coaching work must not be preempted by speculative
    //      warming).
    //   3. Brain-on-brain serializes via `_brainMutex` — the in-flight
    //      brain eval runs to completion before the new one starts,
    //      since both are providing real coaching value.
    if (priority === 'prefetch' && this.pending?.priority === 'brain') {
      throw new PrefetchDroppedError();
    }

    if (priority === 'brain') {
      // Append to the brain serialization chain. The previous entry
      // resolves either when the prior brain eval finishes or when it
      // fails — either way we're cleared to start. Prefetch in-flight
      // is fine; the Promise body below cancels it on entry.
      const prev = this._brainMutex;
      let release!: () => void;
      this._brainMutex = new Promise<void>((r) => {
        release = r;
      });
      try {
        await prev;
      } catch {
        /* prior brain rejected — we still proceed */
      }
      try {
        return await this._dispatchAnalysis(fen, depth, options, priority);
      } finally {
        release();
      }
    }

    return this._dispatchAnalysis(fen, depth, options, priority);
  }

  private async _dispatchAnalysis(
    fen: string,
    depth: number,
    options: Record<string, string | number> | undefined,
    priority: AnalysisPriority,
  ): Promise<StockfishAnalysis> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      // If a previous analysis is pending, stop it and wait for bestmove
      // before starting the new one. With priority gating, the only
      // remaining cases here are:
      //   - incoming brain over in-flight prefetch (cancel prefetch)
      //   - incoming prefetch over in-flight prefetch (newer move's
      //     prefetch supersedes)
      //   - incoming brain after another brain's mutex released but
      //     before this entry runs (race; cancel)
      if (this.pending) {
        const oldPending = this.pending;
        this.pending = null;
        if (oldPending.hardTimeout) clearTimeout(oldPending.hardTimeout);
        this.send('stop');
        oldPending.reject(new Error('Analysis interrupted by new request'));
      }

      const blackToMove = fen.split(' ')[1] === 'b';

      // Mark analysis as not yet started so stale bestmove from a
      // previously-stopped analysis is ignored (see handleMessage gate).
      this._analysisStarted = false;

      this.pending = {
        resolve,
        reject,
        lines: new Map(),
        bestMove: '',
        depth: 0,
        blackToMove,
        priority,
        cacheFen: options ? undefined : fen,
        cacheDepth: options ? undefined : depth,
        startedAt: Date.now(),
      };

      // Hard-recovery backstop covering the WHOLE window (readyok-never AND
      // bestmove-never). If the worker died silently this is the only thing
      // that settles the promise — without it the coach hangs forever
      // (David 2026-06-16 freeze). Cleared on bestmove in handleMessage.
      const watchedPending = this.pending;
      this.pending.hardTimeout = setTimeout(() => {
        if (this.pending === watchedPending) {
          this.recoverStuckAnalysis(`no bestmove in ${ANALYSIS_HARD_TIMEOUT_MS}ms`);
        }
      }, ANALYSIS_HARD_TIMEOUT_MS);

      // NOTE: deliberately NO `ucinewgame` here — that would clear the
      // transposition table before every search, so each analysis would start
      // cold (David 2026-07-03). `ucinewgame` is sent ONCE at init; the table
      // then stays warm across the session so related positions (the next move
      // in a game) reuse the prior tree. `position fen` fully sets the board, so
      // reusing TT entries is always correct (they're Zobrist-keyed). We still
      // do the isready handshake to serialize cleanly after any prior stop.
      this.send('isready');

      // Wait for readyok before starting new analysis to avoid race with stop
      const readyHandler = (event: MessageEvent<string>): void => {
        if (event.data === 'readyok') {
          this.worker?.removeEventListener('message', readyHandler);
          // Apply per-analysis options (e.g. Skill Level). Persist until changed.
          if (options) {
            for (const [key, value] of Object.entries(options)) {
              this.send(`setoption name ${key} value ${value}`);
            }
          }
          this.send(`position fen ${fen}`);
          // Variant-aware bounded search (see SEARCH_BUDGET_MS): slow
          // single-threaded variants get `movetime` alongside `depth` so the
          // search can NEVER outlive the budget; fast variants keep pure depth.
          const budgetMs = this.workerVariant ? SEARCH_BUDGET_MS[this.workerVariant] : undefined;
          this.send(budgetMs ? `go depth ${depth} movetime ${budgetMs}` : `go depth ${depth}`);
          this._analysisStarted = true;
          // Stall watchdog: if THIS analysis is still pending after the
          // window (no bestmove came back), screen the dead engine to the
          // audit stream. Self-guarding — if pending resolved or was
          // replaced, the identity check fails and this no-ops, so no
          // cleanup is needed and the resolve/reject flow is untouched.
          const watched = this.pending;
          setTimeout(() => {
            if (this.pending === watched && this._analysisStarted) {
              void logAppAudit({
                kind: 'stockfish-analysis-stalled',
                category: 'subsystem',
                source: 'stockfishEngine._dispatchAnalysis',
                summary: `no bestmove in ${ANALYSIS_STALL_MS}ms — variant=${this.workerVariant ?? '?'} depth=${depth} fen=${fen.slice(0, 40)}`,
              });
            }
          }, ANALYSIS_STALL_MS);
        }
      };
      this.worker?.addEventListener('message', readyHandler);
    });
  }

  /**
   * Signal the start of a genuinely NEW game — sends `ucinewgame`, clearing the
   * transposition table so stale entries from the previous game don't linger in
   * the (small, on iOS) hash. Cheap and safe between games.
   *
   * Do NOT call this per move: the whole point of NOT sending `ucinewgame` per
   * analysis (see `_dispatchAnalysis`) is to keep the table WARM within a game
   * so each search reuses the previous one's tree. Call it only when the board
   * resets to a fresh, unrelated game (new coach game, restart, review of a
   * different game).
   */
  newGame(): void {
    if (this.worker && this.isReady) {
      this.send('ucinewgame');
      this.send('isready');
    }
  }

  /**
   * True while an analysis is in flight. Opportunistic background prewarming
   * (pondering on the student's clock) checks this so it YIELDS to real,
   * user-driven analyses instead of cancelling them — `analyzePosition` cancels
   * any in-flight search, so a prewarm that fired blindly could clobber a
   * live narration/eval request.
   */
  isBusy(): boolean {
    return this.pending !== null;
  }

  async getBestMove(fen: string, moveTimeMs: number = 1000): Promise<string> {
    await this.initialize();

    return new Promise((resolve) => {
      const handler = (event: MessageEvent<string>): void => {
        const match = /^bestmove (\S+)/.exec(event.data);
        if (match) {
          this.worker?.removeEventListener('message', handler);
          resolve(match[1]);
        }
      };

      this.worker?.addEventListener('message', handler);
      this.send(`position fen ${fen}`);
      this.send(`go movetime ${moveTimeMs}`);
    });
  }

  /**
   * Queue an analysis request. Unlike `analyzePosition` (which cancels any
   * in-flight analysis), `queueAnalysis` serializes requests — each one waits
   * for the previous to finish before starting. Useful for background tasks
   * (e.g. coach analysis) that should not interfere with the analysis board.
   */
  queueAnalysis(fen: string, depth: number = 18): Promise<StockfishAnalysis> {
    return new Promise<StockfishAnalysis>((resolve, reject) => {
      this._queue.push({ fen, depth, resolve, reject });
      void this._drainQueue();
    });
  }

  private async _drainQueue(): Promise<void> {
    if (this._queueRunning) return;
    this._queueRunning = true;
    while (this._queue.length > 0) {
      const entry = this._queue.shift();
      if (!entry) break;
      try {
        const result = await this.analyzePosition(entry.fen, entry.depth);
        entry.resolve(result);
      } catch (err) {
        entry.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
    this._queueRunning = false;
  }

  stop(): void {
    if (this.worker && this.isReady) {
      this.send('stop');
    }
  }

  /**
   * WO-STOCKFISH-SWAP-AND-PERF (part 5): brain-facing budgeted eval.
   *
   * 1. Cache hit → return synchronously via a resolved promise.
   * 2. Cache miss → fire `analyzePosition` and start a budget timer.
   *    When the timer fires, send `stop` to Stockfish so it emits
   *    `bestmove` with whatever depth it reached. The engine's
   *    bestmove handler resolves the underlying promise normally —
   *    the budget just cuts the deepening search short.
   *
   * The budget intentionally affects the engine globally (any
   * concurrent analysis will be interrupted). Brain calls go through
   * here; UI eval calls (post-game review, hint system) keep
   * `analyzePosition` directly so they aren't budget-capped.
   */
  async analyzeWithBudget(
    fen: string,
    depth: number,
    budgetMs: number = 300,
  ): Promise<StockfishAnalysis> {
    const cached = stockfishCache.get(fen, depth);
    if (cached) {
      void logAppAudit({
        kind: 'stockfish-cache-hit',
        category: 'subsystem',
        source: 'stockfishEngine.analyzeWithBudget',
        summary: `fen=${fen.slice(0, 30)}... depth=${depth}`,
      });
      return cached;
    }
    // One budgeted attempt: force a bestmove at the budget, and if nothing
    // lands within the grace the (iOS) worker is dead → recover so the caller
    // doesn't hang (David 2026-06-16).
    const runOnce = async (): Promise<StockfishAnalysis> => {
      const promise = this.analyzePosition(fen, depth);
      const timer = setTimeout(() => this.stop(), budgetMs);
      const graceTimer = setTimeout(() => {
        this.recoverStuckAnalysis('budget grace exceeded (engine not responding to stop)');
      }, budgetMs + ANALYSIS_BUDGET_GRACE_MS);
      try {
        return await promise;
      } finally {
        clearTimeout(timer);
        clearTimeout(graceTimer);
      }
    };
    try {
      return await runOnce();
    } catch (err) {
      // A deliberate prefetch drop is not a failure — don't retry it.
      if (err instanceof PrefetchDroppedError) throw err;
      // Worker died (the grace timer just reset it). Retry ONCE on a FRESH
      // worker — the asm engine analyzes any position fine when alive (David
      // 2026-07-04 node repro), so a respawn recovers instead of failing the
      // grounding (calc/narration) to a cold timeout. This is the direct
      // self-heal for every budgeted grounding caller, not just via ponder.
      this.forceRestart('analyzeWithBudget retry-on-death');
      return await runOnce();
    }
  }

  destroy(): void {
    this.stop();
    // Reject the currently running analysis, if any
    if (this.pending) {
      if (this.pending.hardTimeout) clearTimeout(this.pending.hardTimeout);
      this.pending.reject(new Error('Engine destroyed'));
      this.pending = null;
    }
    // Reject all queued analyses
    for (const entry of this._queue) {
      entry.reject(new Error('Engine destroyed'));
    }
    this._queue = [];
    this._queueRunning = false;
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    this.setStatus('idle');
  }

  onAnalysis(handler: StockfishMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  /** Surface an `error:`-prefixed UCI line from the worker (the lila
   *  bridge's failure channel) to the audit stream, and fail any in-flight
   *  analysis so the eval bar doesn't hang stuck at 0.0. This is the
   *  diagnostic that screens a dead engine to David (2026-06-15). */
  private surfaceWorkerError(line: string): void {
    void logAppAudit({
      kind: 'stockfish-error',
      category: 'subsystem',
      source: 'stockfishEngine.worker',
      summary: `engine error (variant=${this.workerVariant ?? '?'}): ${line.slice(0, 200)}`,
    });
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      if (p.hardTimeout) clearTimeout(p.hardTimeout);
      p.reject(new Error(line.slice(0, 200)));
    }
  }

  private handleMessage(data: string): void {
    if (!this.pending || !this._analysisStarted) return;

    // Parse info lines (MultiPV)
    const infoMatch = /^info /.exec(data);
    if (infoMatch) {
      const multipvMatch = /multipv (\d+)/.exec(data);
      const depthMatch = /depth (\d+)/.exec(data);
      const scoreMatch = /score (cp|mate) (-?\d+)/.exec(data);
      const pvMatch = / pv (.+)$/.exec(data);

      if (multipvMatch && depthMatch && scoreMatch && pvMatch) {
        const rank = parseInt(multipvMatch[1]);
        const depth = parseInt(depthMatch[1]);
        const scoreType = scoreMatch[1];
        const scoreValue = parseInt(scoreMatch[2]);
        const moves = pvMatch[1].trim().split(' ');

        this.pending.depth = depth;

        const line: AnalysisLine = {
          rank,
          evaluation: scoreType === 'cp' ? scoreValue : (scoreValue > 0 ? MATE_EVAL_VALUE : -MATE_EVAL_VALUE),
          moves,
          mate: scoreType === 'mate' ? scoreValue : null,
        };

        this.pending.lines.set(rank, line);
      }
    }

    // Best move signal
    const bestMoveMatch = /^bestmove (\S+)/.exec(data);
    if (bestMoveMatch) {
      const bestMove = bestMoveMatch[1];
      const topLines = Array.from(this.pending.lines.values())
        .sort((a, b) => a.rank - b.rank);

      // Cast to include undefined — TypeScript omits it without noUncheckedIndexedAccess
      const primaryLine = topLines[0] as AnalysisLine | undefined;
      // Stockfish returns score from side-to-move's perspective; normalize to white's perspective
      const flip = this.pending.blackToMove ? -1 : 1;
      const evaluation = (primaryLine?.evaluation ?? 0) * flip;
      const isMate = primaryLine?.mate !== null && primaryLine?.mate !== undefined;
      const mateIn = primaryLine?.mate !== null && primaryLine?.mate !== undefined
        ? primaryLine.mate * flip
        : null;

      // Normalize all lines to white's perspective
      const normalizedLines = topLines.map((line) => ({
        ...line,
        evaluation: line.evaluation * flip,
        mate: line.mate !== null ? line.mate * flip : null,
      }));

      const analysis: StockfishAnalysis = {
        bestMove,
        evaluation,
        isMate,
        mateIn,
        depth: this.pending.depth,
        topLines: normalizedLines,
        nodesPerSecond: 0,
      };

      if (this.pending.cacheFen !== undefined && this.pending.cacheDepth !== undefined) {
        stockfishCache.set(this.pending.cacheFen, this.pending.cacheDepth, analysis);
      }

      if (this.pending.hardTimeout) clearTimeout(this.pending.hardTimeout);
      this.pending.resolve(analysis);
      this.pending = null;

      this.messageHandlers.forEach((h) => h(analysis));
    }
  }

  /** App-resume recovery (David 2026-06-16: freeze after backgrounding the iOS
   *  app, then re-entering). iOS suspends/kills the Web Worker when the app is
   *  backgrounded — but the resolved `initPromise` makes `initialize()` think
   *  we're still ready, so the next analyze (which the coach AWAITS for its
   *  grounded answers) hangs FOREVER on a dead worker → frozen UI. On resume,
   *  hard-reset: reject any pending analysis so no caller hangs, drop the dead
   *  worker, and clear the init state so the next analyze spawns a FRESH
   *  worker. Idempotent + safe to call on every foreground. */
  handleAppResume(): void {
    if (this.pending) {
      if (this.pending.hardTimeout) clearTimeout(this.pending.hardTimeout);
      try { this.pending.reject(new Error('engine reset on app resume')); } catch { /* ignore */ }
      this.pending = null;
    }
    try { this.worker?.terminate(); } catch { /* already gone */ }
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    this._permanentlyUnavailable = false;
    this._crashRetries = 0;
    this._initFailedAt = null;
  }
}

// Singleton
export const stockfishEngine = new StockfishEngine();

// App-resume recovery — when the app returns to the foreground, the iOS
// WebView's Web Worker may have been killed while backgrounded; the stale
// resolved initPromise would otherwise hang the next analysis (and the coach
// that awaits it) → frozen. visibilitychange fires on foreground in the
// Capacitor WKWebView, so reset the engine then; the next analyze respawns.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      stockfishEngine.handleAppResume();
    }
  });
}
