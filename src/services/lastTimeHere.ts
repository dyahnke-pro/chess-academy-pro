// lastTimeHere — "last time you were in this position" (David 2026-10-15:
// "strengthen the coach's memory"; THE HEART, step 2: the choices the student
// would consider, including "what they played last time").
//
// The data was already computed: every analysed game's book departure is a
// `BookDepartureRow` — the position where the student left theory, the move
// they played there and what it cost — loaded into the student-need context
// on Learn and Review. Nothing read it by POSITION. This leaf does: when the
// board is one the student left theory from before, at a cost, the coach says
// what happened there and whether this time went the same way.
//
// Their own move, already played, is named — it is a fact about their record,
// not a find (the theory carve-out). The book move is never named here.

import type { BookDepartureRow } from './bookDepartureWeakness';
import { costWords } from './engineConstants';
import { positionOf } from '../utils/samePosition';
import { recencyPhrase } from './misconceptionCallbacks';

/** A departure only counts as a lesson when it measurably hurt. */
const COSTLY_CP = 50;

const bare = (san: string): string => san.replace(/[+#!?]+$/, '');

export interface LastTimeHere {
  text: string;
  /** The game it happened in. */
  gameId: string;
  /** Same move again, or a different one this time. */
  repeated: boolean;
  /** Say-once key: one position, one recall a game. Carries the direction
   *  (`last-here:same:` / `last-here:other:`) so a surface picks its lane from
   *  the computed verdict, never from the prose. */
  key: string;
}

/**
 * The student's last costly departure from THIS position in another game, set
 * against the move they just played. Null when they never left theory here, it
 * cost nothing, or the only such game is the one being played.
 */
export function lastTimeHere(
  fenBefore: string,
  playedSan: string,
  rows: readonly BookDepartureRow[],
  currentGameId: string | null,
  now: number = Date.now(),
): LastTimeHere | null {
  const here = positionOf(fenBefore);
  const prior = rows
    .filter((r) => r.gameId !== currentGameId && r.evalCostCp >= COSTLY_CP && positionOf(r.bookFen) === here)
    .sort((a, b) => b.playedAt - a.playedAt);
  const last = prior[0];
  if (!last) return null;
  const when = last.playedAt > 0 ? ` ${recencyPhrase(last.playedAt, now)}` : '';
  const cost = costWords(last.evalCostCp);
  const repeated = bare(playedSan) === bare(last.departedSan);
  const times = prior.filter((r) => bare(r.departedSan) === bare(last.departedSan)).length;
  const often = times >= 2 ? `, in ${times} of your games` : '';
  const text = repeated
    ? `Same move as last time here — ${last.departedSan} cost you ${cost} in that game${when}${often}.`
    : bare(playedSan) === bare(last.mainSan)
      ? `Last time here you played ${last.departedSan} and it cost you ${cost}${when}. This time you kept to theory.`
      : `Last time here you played ${last.departedSan} and it cost you ${cost}${when}. This time you went another way.`;
  return { text, gameId: last.gameId, repeated, key: `last-here:${repeated ? 'same' : 'other'}:${here}` };
}
