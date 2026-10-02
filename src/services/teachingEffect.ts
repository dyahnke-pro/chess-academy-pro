/**
 * teachingEffect — DOES TEACHING WORK? (David 2026-10-02: "Track whether a
 * student's repeated mistakes actually decline after the coach teaches them.
 * That's the real grade.")
 *
 * A pure computer over the student's own record. For each mistake kind (the
 * attributed fundamental when there is one, else the tag):
 *   - TAUGHT AT: the first time the coach dealt with it LIVE — a slip captured
 *     in Learn (`discussion-practice`) or on a Review walk (`game-review`). A
 *     sweep over imported games (`auto-analysis`) finds it but teaches nothing.
 *   - THE RATE, per analysed game, before that moment and after it — on the
 *     GAME's own time, never the row's write time (an imported archive is
 *     analysed in one sitting and would all read as "after").
 * Too few games on either side reads `too-early`: a trend is never guessed
 * (the lifecycle computer's rule, `weaknessLifecycle`).
 *
 * A LEAF: no db, no store — the I/O door hands in rows and games.
 */

export type TeachingVerdict = 'declining' | 'flat' | 'rising' | 'too-early';

export interface EffectRow {
  /** fundamentalId ?? tag — the finest name the record has. */
  kind: string;
  source: 'discussion-practice' | 'game-review' | 'auto-analysis';
  /** When the slip happened (the game's time when known). */
  at: number;
  gameId: string | null;
}

export interface EffectGame { id: string; at: number }

export interface TeachingEffect {
  kind: string;
  taughtAt: number;
  gamesBefore: number;
  gamesAfter: number;
  /** Slips of this kind per game, before and after it was taught. */
  rateBefore: number;
  rateAfter: number;
  verdict: TeachingVerdict;
}

/** Games needed on EACH side before a direction is named. */
export const MIN_GAMES_EACH_SIDE = 3;
/** A change smaller than this (slips per game) is flat, not a trend. */
export const FLAT_BAND = 0.1;

export function teachingEffects(rows: readonly EffectRow[], games: readonly EffectGame[]): TeachingEffect[] {
  const taught = new Map<string, number>();
  for (const r of rows) {
    if (r.source === 'auto-analysis') continue;
    const prev = taught.get(r.kind);
    if (prev === undefined || r.at < prev) taught.set(r.kind, r.at);
  }
  const out: TeachingEffect[] = [];
  for (const [kind, taughtAt] of taught) {
    // The game it was taught in belongs to BEFORE: the slip that prompted the
    // lesson is the old habit, not evidence about whether the lesson held.
    const before = games.filter((g) => g.at <= taughtAt);
    const after = games.filter((g) => g.at > taughtAt);
    const afterIds = new Set(after.map((g) => g.id));
    const kindRows = rows.filter((r) => r.kind === kind);
    const slipsAfter = kindRows.filter((r) => (r.gameId ? afterIds.has(r.gameId) : r.at > taughtAt)).length;
    const slipsBefore = kindRows.length - slipsAfter;
    const rateBefore = before.length ? slipsBefore / before.length : 0;
    const rateAfter = after.length ? slipsAfter / after.length : 0;
    const enough = before.length >= MIN_GAMES_EACH_SIDE && after.length >= MIN_GAMES_EACH_SIDE;
    const delta = rateAfter - rateBefore;
    const verdict: TeachingVerdict = !enough ? 'too-early'
      : delta <= -FLAT_BAND ? 'declining'
        : delta >= FLAT_BAND ? 'rising'
          : 'flat';
    out.push({ kind, taughtAt, gamesBefore: before.length, gamesAfter: after.length, rateBefore, rateAfter, verdict });
  }
  return out.sort((a, b) => a.taughtAt - b.taughtAt);
}
