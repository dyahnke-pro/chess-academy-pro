// Which live errors deserve a fixer, and which are the app working.
//
// 🔒 THE CRON WAS RED SIX RUNS RUNNING FOR SOMETHING NOBODY WOULD EVER FIX.
// The autofix job was gated on "did PostHog return any row", so the app
// successfully recovering from a wedged Stockfish worker — a 2×/1-user
// `forced worker respawn`, which is the self-heal REPORTING that it worked —
// spawned a full Claude session every fifteen minutes to go hunt the bug.
//
// The split this gate protects: everything is still REPORTED on the tracking
// issue, because the telemetry is worth having; only a genuine defect spawns a
// fixer. Get that backwards in either direction and it costs something real —
// too loose and the cron goes permanently red until it's ignored, too tight and
// a live crash reaches nobody.
import { describe, it, expect } from 'vitest';
import { isActionable } from './posthog-error-watch.mjs';

const err = (type: string, value: string) => ({ type, value });

describe('self-healing telemetry does not spawn a fixer', () => {
  it('mutes the exact events that made the cron red', () => {
    // Every string here is copied from a real production event.
    const selfHealing = [
      err('stockfish-analysis-stalled', 'forced worker respawn (analyzeWithBudget retry-on-death); variant=single'),
      err('stockfish-analysis-stalled', 'forced worker respawn (ponder detected a dead worker); variant=single'),
      err('stockfish-analysis-stalled', 'forced worker respawn (getAdaptiveMove hung-worker recovery); variant=asm'),
      err('stockfish_variant_fallback', 'multi failed at runtime, fell back to single (reason: no uciok within 5s of spawn)'),
      err('stockfish-error', 'analyzePosition failed/timeout — Stockfish init cooldown — try again in a few seconds'),
      err('lichess_error', 'rate-limit cooldown 30s (retry-after=none)'),
      err('lichess_error', 'status=429 error=Error: HTTP 429 body="{"error":"upstream-blocked"'),
    ];
    for (const e of selfHealing) {
      expect(isActionable(e), `would still spawn a fixer: ${e.value}`).toBe(false);
    }
  });

  it('still routes genuine crashes to the fixer', () => {
    const real = [
      err('uncaught-error', "Cannot read properties of undefined (reading 'san')"),
      err('unhandled-rejection', 'IndexedDB transaction aborted'),
      err('continuity-error', 'lesson beat referenced a square not on the board'),
      err('sanitizer-leak', 'raw SAN reached the voice'),
      err('coach non-answer', 're-ask [coach-teach]: "why is that the best move"'),
    ];
    for (const e of real) {
      expect(isActionable(e), `a real defect was muted: ${e.value}`).toBe(true);
    }
  });

  it('treats an UNKNOWN error class as actionable', () => {
    // The direction this fails in matters. The list mutes what we have
    // positively identified as self-healing; anything new must fail toward
    // being looked at, because silence by default is how a real crash goes
    // unnoticed for a week.
    expect(isActionable(err('some-new-subsystem-error', 'a thing we have never seen before'))).toBe(true);
    expect(isActionable(err('', ''))).toBe(true);
  });

  it('does not mute a crash merely for mentioning a muted subsystem', () => {
    // "stockfish" is not the mute key — the RECOVERY phrasing is. A genuine
    // Stockfish crash must still reach the fixer.
    expect(isActionable(err('uncaught-error', 'stockfishEngine.analyzePosition threw before any worker existed'))).toBe(true);
  });
});
