// A STRONG PLAYER'S CHOICE HERE (WO-TEACH-GAPS P3 — "his data on the live
// board", David 2026-09-30: say it DEPERSONALIZED — his games as data, never
// his name).
//
// After the student moves, from the games DB (`danya-play-db`): when this exact
// position has enough games and a frequent, well-scoring move, say whether the
// student's move was that choice, or name it. Said AFTER the move so it never
// hands over the next move (the move-advice rule). Grounded (G3): the move, the
// counts and the score are the DB's.
import { bestPlanMove, getHisPlayDb, HIS_PLAN_MIN_GAMES, lookupHisPlaySync } from './hisPlayLookup';
import { moveWhy } from './deliberation';

/** Start loading the DB (fire and forget); lookups are silent until it lands. */
export function warmStrongChoice(): void { void getHisPlayDb(); }

export function strongChoice(fenBefore: string, playedSan: string): { text: string; san: string; same: boolean } | null {
  const entry = lookupHisPlaySync(fenBefore);
  if (!entry || entry.total < HIS_PLAN_MIN_GAMES) return null;
  const best = bestPlanMove(entry);
  if (!best) return null;
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  const same = bare(best.san) === bare(playedSan);
  // The student's own move, when strong players play it too, is said FIRST —
  // "the choice is Bb5" after a sound Nc3 read as a correction (walk
  // 2026-09-30, game 2).
  const mine = entry.moves.find((m) => bare(m.san) === bare(playedSan));
  // THE REASON, NOT JUST THE STATISTIC (David 2026-10-06: "statistics where a
  // reason should be" — a database talking, not a coach). The move-why
  // computer says what the strong move DOES.
  const mover = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  let why: string | null = null;
  try { why = moveWhy(fenBefore, best.san, mover, null); } catch { why = null; }
  // NO COUNTS AT ALL (David 2026-10-06, after the 10-06 tape still said "363
  // of 1012 strong games go this way": a coach gives the reason; a database
  // gives the count). No reason computed → the line is not said.
  if (!why) return null;
  const text = same
    ? `That's what strong players play here — it ${why}.`
    : mine && mine.games >= Math.max(HIS_PLAN_MIN_GAMES, best.games * 0.1)
      ? `${playedSan} is a strong player's move here too, but ${best.san} scores better — it ${why}.`
      : `Strong players play ${best.san} here — it ${why}.`;
  return { text, san: best.san, same };
}
