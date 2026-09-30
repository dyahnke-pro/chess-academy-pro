// TRAP LEARNING — when a known trap stops being warned (David 2026-09-30:
// "Option 2. Maybe make it depend how many book moves they've made?").
//
// The trap-ahead lane warns the student before a natural move that walks into a
// known trap. Warning forever means every avoid is PROMPTED, and a prompted
// avoid proves nothing — so the trap could never go green. The coach therefore
// TESTS: once the warning has been heeded in enough different games, the next
// meeting is deliberately silent. Avoided unaided → green (quiet from then on,
// still recorded). Walked in → red (warn again until re-earned).
//
// Per trap, keyed on its position. Book depth decides HOW SOON the test comes:
// a student who usually plays theory past this trap's move has shown the line,
// so one heeded warning is enough; otherwise two. Book depth never makes a trap
// green on its own — only an unaided avoid does.
//
// The rows are the same `capabilityEvidence` rows every lane writes, tagged
// `missed-opponents-threat` with the trap's own position, so the heat map sees
// every meeting too. A LEAF: the decision is pure; the store is behind two
// small functions.
import { db } from '../db/schema';
import { recordLaneEvidence } from './capabilityEvidence';

export const TRAP_TAG = 'missed-opponents-threat' as const;

/** Heeded warnings (in distinct games) before the silent test, by book depth. */
export const WARNED_GAMES_BEFORE_TEST = 2;
export const WARNED_GAMES_BEFORE_TEST_BOOKED = 1;

export type TrapState = 'grey' | 'warned' | 'test' | 'green' | 'red';

export interface TrapMeeting {
  outcome: 'held' | 'broken';
  prompted: boolean;
  sourceGameId?: string;
  recordedAt: number;
}

/** Board part of a FEN — the trap's identity whatever the move counters say. */
export function trapKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

/**
 * Where this student stands on one trap, and whether the coach speaks.
 * `bookDepthPlies`: how deep in theory this student usually stays (median ply
 * they leave book), or null when unknown. `trapPly`: the ply the slip would be.
 */
export function trapDecision(
  meetings: readonly TrapMeeting[],
  opts: { bookDepthPlies: number | null; trapPly: number },
): { state: TrapState; speak: boolean } {
  const rows = [...meetings].sort((a, b) => a.recordedAt - b.recordedAt);
  if (!rows.length) return { state: 'grey', speak: true };
  let lastBreak = -1;
  rows.forEach((r, i) => { if (r.outcome === 'broken') lastBreak = i; });
  const since = rows.slice(lastBreak + 1);
  if (since.some((r) => r.outcome === 'held' && !r.prompted)) return { state: 'green', speak: false };
  if (lastBreak === rows.length - 1) return { state: 'red', speak: true };
  const heededGames = new Set(since.filter((r) => r.outcome === 'held' && r.prompted).map((r) => r.sourceGameId ?? `row-${r.recordedAt}`));
  const booked = opts.bookDepthPlies !== null && opts.bookDepthPlies > opts.trapPly;
  const needed = booked ? WARNED_GAMES_BEFORE_TEST_BOOKED : WARNED_GAMES_BEFORE_TEST;
  if (heededGames.size >= needed) return { state: 'test', speak: false };
  return { state: lastBreak >= 0 ? 'red' : 'warned', speak: true };
}

/** Median of the plies the student left book at, or null with no record. */
export function medianBookDepth(departurePlies: readonly number[]): number | null {
  if (!departurePlies.length) return null;
  const s = [...departurePlies].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── the store ─────────────────────────────────────────────────────────────
let byTrap: Map<string, TrapMeeting[]> | null = null;
let bookDepth: number | null = null;
let loading: Promise<void> | null = null;

/** Load this student's trap meetings and book depth once (Learn warms it). */
export function warmTrapRecord(): Promise<void> {
  if (byTrap) return Promise.resolve();
  loading ??= (async () => {
    const map = new Map<string, TrapMeeting[]>();
    try {
      const rows = await db.capabilityEvidence.where('tag').equals(TRAP_TAG).toArray();
      for (const r of rows) {
        const k = trapKey(r.fen);
        const list = map.get(k) ?? [];
        list.push({ outcome: r.outcome, prompted: r.prompted, recordedAt: r.recordedAt, ...(r.sourceGameId ? { sourceGameId: r.sourceGameId } : {}) });
        map.set(k, list);
      }
    } catch { /* no store — every trap reads grey */ }
    try {
      const rec = await db.meta.get('book-departure-rows.v1');
      const parsed = rec && typeof rec.value === 'string' ? JSON.parse(rec.value) as { rows?: Array<{ departurePly: number }> } : null;
      bookDepth = medianBookDepth((parsed?.rows ?? []).map((r) => r.departurePly));
    } catch { bookDepth = null; }
    byTrap = map;
  })().finally(() => { loading = null; });
  return loading;
}

/** Whether the coach warns about the trap at `fen` (grey until the record loads). */
export function trapSpeaks(fen: string, trapPly: number): { state: TrapState; speak: boolean } {
  if (!byTrap) { void warmTrapRecord(); return { state: 'grey', speak: true }; }
  return trapDecision(byTrap.get(trapKey(fen)) ?? [], { bookDepthPlies: bookDepth, trapPly });
}

/** Record one meeting: the student either played the slip (broken) or not. */
export function noteTrapMeeting(args: {
  fen: string; playedSan: string; slipSan: string; warned: boolean;
  confirmed: boolean; gameId: string | null;
}): TrapMeeting['outcome'] {
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  const outcome: TrapMeeting['outcome'] = bare(args.playedSan) === bare(args.slipSan) ? 'broken' : 'held';
  const row: TrapMeeting = { outcome, prompted: args.warned, recordedAt: Date.now(), ...(args.gameId ? { sourceGameId: args.gameId } : {}) };
  if (byTrap) {
    const k = trapKey(args.fen);
    byTrap.set(k, [...(byTrap.get(k) ?? []), row]);
  }
  // A confirmed refutation is a real question (counts toward green); a
  // positional one is recorded but sits under the green bar.
  void recordLaneEvidence({
    tag: TRAP_TAG, outcome, fen: args.fen, playedSan: args.playedSan,
    posedImportance: args.confirmed ? 85 : 70, origin: 'learn', prompted: args.warned,
    ...(args.gameId ? { sourceGameId: args.gameId } : {}),
  });
  return outcome;
}

/** Tests only. */
export function resetTrapRecord(): void { byTrap = null; bookDepth = null; loading = null; }
