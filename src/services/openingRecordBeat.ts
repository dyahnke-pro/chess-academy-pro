// openingRecordBeat — REVIEW OPENS WITH THE STUDENT'S RECORD IN THE OPENING
// (WO-HOME-OPENING-01 A8, David 2026-09-22). "your 63rd Pirc, 49% so far —
// your home opening. You left book at move 7 again, the third time here."
//
// Pure: every number is read off the student-need context the review already
// loads (the ONE key's family count and score, the precomputed departure rows
// joined by POSITION), never recomputed here and never invented. Returns null
// when the record has nothing to say — a first game in a line is silent about
// its record, not padded with "your 1st".
import type { BookDepartureRow } from './bookDepartureWeakness';
import type { StudentNeedContext } from './needScore';
import { fenKey } from './needScore';

export interface OpeningRecordInput {
  /** The family name as the intro frames it ("Pirc Defense"). */
  family: string;
  ctx: Pick<StudentNeedContext, 'openingGames' | 'openingScore' | 'homeOpening' | 'bookDepartures' | 'lineFenKeys'>;
  /** This game's id, so its own departure row is "this game" and the rest are history. */
  gameId: string | null;
}

const ORDINAL = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** "your 63rd Pirc Defense, 49% so far — your home opening" (null under 2 games). */
export function openingRecordClause(input: OpeningRecordInput): string | null {
  const games = input.ctx.openingGames ?? 0;
  if (games < 2) return null;
  const score = input.ctx.openingScore;
  const scoreBit = score === null || score === undefined ? '' : `, ${Math.round(score * 100)}% so far`;
  const homeBit = input.ctx.homeOpening ? ' — your home opening' : '';
  return `your ${ORDINAL(games)} ${input.family}${scoreBit}${homeBit}`;
}

/** This game's departure and how often the student has left book at the SAME
 *  board before: "You left book at move 7 again — …a6 instead of …Nf6, the
 *  third time here." Null when this game has no departure row yet (the sweep
 *  writes it) or the row is not on this line. */
export function departureRecordSentence(input: OpeningRecordInput): string | null {
  const { gameId, ctx } = input;
  if (!gameId || !ctx.lineFenKeys) return null;
  const mine: BookDepartureRow | undefined = ctx.bookDepartures.find((r) => r.gameId === gameId);
  if (!mine) return null;
  const at = ctx.lineFenKeys[mine.departurePly - 1];
  if (at === undefined || at !== fenKey(mine.bookFen)) return null;
  const prior = ctx.bookDepartures.filter((r) => r.gameId !== gameId && fenKey(r.bookFen) === at).length;
  const moveNo = Math.ceil(mine.departurePly / 2);
  const dots = mine.departurePly % 2 === 0 ? '…' : '';
  const line = `${dots}${mine.departedSan} instead of ${dots}${mine.mainSan}`;
  if (prior === 0) return `You left book at move ${moveNo} — ${line}.`;
  return `You left book at move ${moveNo} again — ${line}, the ${ORDINAL(prior + 1)} time here.`;
}
