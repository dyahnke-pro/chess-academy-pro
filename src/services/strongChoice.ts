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

/** Start loading the DB (fire and forget); lookups are silent until it lands. */
export function warmStrongChoice(): void { void getHisPlayDb(); }

export function strongChoice(fenBefore: string, playedSan: string): { text: string; san: string; same: boolean } | null {
  const entry = lookupHisPlaySync(fenBefore);
  if (!entry || entry.total < HIS_PLAN_MIN_GAMES) return null;
  const best = bestPlanMove(entry);
  if (!best) return null;
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  const same = bare(best.san) === bare(playedSan);
  const score = Math.round(((best.w + best.d / 2) / Math.max(1, best.games)) * 100);
  const stat = `played in ${best.games} of ${entry.total} games from this position, scoring ${score}%`;
  const text = same
    ? `That is a strong player's choice here — ${stat}.`
    : `A strong player's choice here is ${best.san} — ${stat}.`;
  return { text, san: best.san, same };
}
