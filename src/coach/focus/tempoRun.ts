/**
 * THE TEMPO RUN (David 2026-10-22: "you have him on the run with tempo moves,
 * keep pressing and making him react to you" → "Maybe it can say 'you HAD them
 * on the run!' after the run ends. With the star burst and coin appearing at
 * that time" → "Go"). PURE.
 *
 * A TEMPO MOVE makes them react: a check, or a quiet move after which they
 * face a NEW threat — a piece of theirs (not a pawn) the student would win
 * next move that was not en prise before, or a mate threat — read by the ONE
 * must-defend computer (`computeMustDefend`, `mateThreatsAgainst`), so a
 * discovered attack counts as much as the moved piece's own (hand walk
 * 2026-10-23: 13.Nd5 uncovered the d2 bishop on the h6 queen and was not
 * counted). It is SOUND — the board's own read lists it within a pawn of its
 * best, so a check the engine calls a mistake, or a kick by a piece that just
 * hangs, never counts. A move that brings back a position already on the board
 * is no progress, so a perpetual check is not a run. A RUN is tempo moves in a
 * row that stood (a move taken back never counts).
 *
 * The line comes when a run of `TEMPO_RUN_MIN` or more ENDS, in the past tense,
 * so it never interrupts the run and never hands out advice:
 *   - "You HAD them on the run!" — with the starburst and the coin;
 *   - "You had them on the run — and you let them off the hook." when the run
 *     ended too soon: the board's best was still a forcing move and the move
 *     played cost at least `LET_OFF_CP`. That is the miss half; no coin.
 *
 * Measured on David's 342 analysed games (`tempoRun.measure.test.ts`): a run of
 * 2+ ended 311 times in 183 games — 267 "had", 44 "let off"; his longest run
 * per game was 0–1 in 140 games, 2 in 119, 3 in 54, 4+ in 29 (so a new best
 * stays rare).
 */
import { Chess, type Color } from 'chess.js';
import { computeMustDefend, mateThreatsAgainst } from '../../services/threatOut';
import { costOf, studentCp } from './castlingWatch';
import type { ReadLine } from './focusChances';
import { positionKey } from '../../services/positionProvenance';

export const TEMPO_RUN_MIN = 2;
/** Within this of the read's best (cp), a tempo move is sound. */
export const TEMPO_SOUND_CP = 100;
/** The run's ending move cost at least this with a forcing move on: let off. */
export const LET_OFF_CP = 50;

export const TEMPO_HAD_LINE = 'You HAD them on the run!';
export const TEMPO_LET_OFF_LINE = 'You had them on the run — and you let them off the hook.';

export interface TempoRun {
  /** Tempo moves in a row so far. */
  length: number;
  /** The longest run this game. */
  longest: number;
}

export const NO_RUN: TempoRun = { length: 0, longest: 0 };

export interface TempoMoveInput {
  fenBefore: string;
  san: string;
  student: Color;
  /** The read of the board the move was played from. */
  lines: readonly ReadLine[] | null;
  /** The positions after the student's earlier moves that stood this game
   *  (`positionKey`). A move that brings one back makes no progress — a
   *  perpetual check is a draw, not a run (prod record 2026-10-23: Qg6+ Ke7
   *  Qg5+ Ke8 Qg6+ … read as a run of six and a "new best"). */
  seen: ReadonlySet<string>;
}

/** The move, and the board after it. */
function played(fen: string, move: string | { from: string; to: string; promotion?: string }): { san: string; captured: boolean; fenAfter: string } | null {
  try {
    const c = new Chess(fen);
    const m = c.move(move);
    return { san: m.san, captured: !!m.captured, fenAfter: c.fen() };
  } catch { return null; }
}

/** What the move cost against the read's best (cp, ≥ 0); when the read does
 *  not list it, at least the gap to the worst line listed. Null with no read. */
function costAgainstRead(x: TempoMoveInput): number | null {
  if (!x.lines || x.lines.length === 0) return null;
  const listed = costOf(x.fenBefore, x.san, x.lines, x.student);
  if (listed) return listed.drop;
  const cps = x.lines.map((l) => studentCp(l, x.student));
  return Math.max(...cps) - Math.min(...cps);
}

/** Pieces of `foe`'s (not pawns) the other side wins on its next move. */
const enPrise = (fen: string, foe: Color): Set<string> =>
  new Set(computeMustDefend(fen, foe).pieces.filter((p) => p.piece !== 'p').map((p) => p.square));

/** After the move, `foe` faces a threat it did not face before: a piece of
 *  theirs newly en prise, or a mate threat. */
function newThreat(fenBefore: string, fenAfter: string, foe: Color): boolean {
  const before = enPrise(fenBefore, foe);
  for (const sq of enPrise(fenAfter, foe)) if (!before.has(sq)) return true;
  return mateThreatsAgainst(fenAfter, foe).moves.length > 0 && mateThreatsAgainst(fenBefore, foe).moves.length === 0;
}

const foeOf = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** A check, or a quiet move that makes a threat they must answer — sound. */
export function tempoMove(x: TempoMoveInput): boolean {
  const p = played(x.fenBefore, x.san);
  if (!p || x.seen.has(positionKey(p.fenAfter))) return false;
  const makesThem = p.san.includes('+') || (!p.captured && newThreat(x.fenBefore, p.fenAfter, foeOf(x.student)));
  if (!makesThem) return false;
  // Listed within a pawn of the best: sound. Not listed (or no read): the
  // engine cannot vouch for it, so it never extends a run.
  const listed = costOf(x.fenBefore, x.san, x.lines, x.student);
  return !!listed && listed.drop < TEMPO_SOUND_CP;
}

/** The read's best move was forcing: a check, a capture or a threat. */
function bestWasForcing(x: TempoMoveInput): boolean {
  const uci = x.lines?.[0]?.moves[0];
  if (!uci) return false;
  const p = played(x.fenBefore, { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return !!p && (p.san.includes('+') || p.captured || newThreat(x.fenBefore, p.fenAfter, foeOf(x.student)));
}

export interface RunEnd {
  length: number;
  letOff: boolean;
}

/** The run after a move that stood, and — when a run of `TEMPO_RUN_MIN` or
 *  more just ended — how it ended. */
export function stepRun(run: TempoRun, x: TempoMoveInput): { run: TempoRun; ended: RunEnd | null } {
  if (tempoMove(x)) {
    const length = run.length + 1;
    return { run: { length, longest: Math.max(run.longest, length) }, ended: null };
  }
  if (run.length < TEMPO_RUN_MIN) return { run: { ...run, length: 0 }, ended: null };
  const cost = costAgainstRead(x);
  const letOff = bestWasForcing(x) && cost !== null && cost >= LET_OFF_CP;
  return { run: { ...run, length: 0 }, ended: { length: run.length, letOff } };
}
