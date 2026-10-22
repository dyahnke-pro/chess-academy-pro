/**
 * THE EARNED FREE PIECE (docs/CAMPAIGN.md §6a, David 2026-10-21: "make sure
 * the piece isn't just handed over … like a deeper calculation finds the
 * winning free piece, rewind forces the user to find it").
 *
 * The planted hanging piece was a hand-over: a coach piece left capturable in
 * one move. Here the coach plays ONE natural slip — one of its own engine
 * candidates, a move a player at its level would play — after which NOTHING
 * hangs, yet the student has a forcing line of `plantDepth` moves that wins a
 * knight, bishop or rook. The student has to find it.
 *
 * This module is the PURE half (chess.js and the legal SEE): which of the
 * coach's candidate lines are slips, whether a board leaves anything hanging,
 * and how deep a student's winning line runs before the piece falls. The
 * engine half (`coachGameEngine.tryEarnedSlip`) reads the coach's candidates
 * and confirms the student's line; it decides nothing these functions do not.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { legalSeeGainFor } from '../services/positionReadingService';
import { MATERIAL_VALUE } from '../services/pieceValues';
import type { PatternId, PlantReject, PlantScan } from './missionCard';
import { PATTERN_PROBES, patternAfterMove } from './patterns';

/** What a slip must cost the coach against its own best move (centipawns):
 *  a real mistake, not an inaccuracy. */
export const SLIP_DROP_CP = 200;
/** What the student must win: a piece. */
export const WIN_BAR = 3;
/** What a coach move may never leave to be simply taken: a piece, or the
 *  exchange — 2 net (2026-10-22: …Rh6?? Bxh6 gxh6 lost the exchange and read
 *  as "nothing hangs" at the piece bar). The card's own win bar is +2, so a
 *  slip that left the exchange en prise would be a hand-over by the back door. */
export const GIFT_BAR = 2;
/** The student's material minus the coach's. */
function lead(board: Chess, student: Color): number {
  let n = 0;
  for (const row of board.board()) for (const cell of row) {
    if (cell) n += cell.color === student ? MATERIAL_VALUE[cell.type] : -MATERIAL_VALUE[cell.type];
  }
  return n;
}

function load(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

function play(board: Chess, uci: string): ReturnType<Chess['move']> | null {
  try { return board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
}

/** What a coach move captured (0 for none) — the material the slip itself
 *  took, which the student's first capture only wins BACK. */
export function slipTook(captured: string | undefined): number {
  return captured ? (MATERIAL_VALUE[captured] ?? 0) : 0;
}

/** NOTHING HANGS: on this board (the student to move, just after the slip)
 *  no capture wins the student `GIFT_BAR` (a piece, or the exchange) NET of
 *  what the slip took — `took`, the
 *  slip's own capture. A slip that trades (…Bxd6 Nxd6) leaves its bishop
 *  "capturable for 3" on the board after, but the student is only winning
 *  back what they lost (David's game 2026-10-21: the trade walks into a fork,
 *  the most natural slip there is). The piece has to be WON, never picked up. */
export function nothingHangs(fen: string, took: number): boolean {
  const board = load(fen);
  if (!board) return false;
  const student = board.turn();
  for (const row of board.board()) for (const cell of row) {
    if (!cell || cell.color === student || cell.type === 'k' || cell.type === 'p') continue;
    if (legalSeeGainFor(fen, cell.square, student) - took >= GIFT_BAR) return false;
  }
  return true;
}

/** One of the coach's engine candidates at its own board. */
export interface CoachLine {
  uci: string;
  /** The line's evaluation, the COACH's point of view (centipawns; mate as ±100000). */
  coachCp: number;
  /** The line the read played out, the candidate first — after it, the
   *  student's best answer as the coach's own read sees it. */
  pv: readonly string[];
}

export interface SlipCandidate {
  uci: string;
  /** The board after the slip, the student to move. */
  fenAfter: string;
  /** What the slip costs the coach against its best candidate. */
  dropCp: number;
  /** What the slip itself captured (`slipTook`). */
  took: number;
  /** What the coach's own line already shows the student winning after the
   *  slip, or null. It only orders which slips the student-side read checks
   *  first; that read still decides. */
  shown: LineWin | null;
}

/**
 * The coach's natural slips on `fen` (coach to move): its own engine
 * candidates that cost at least `SLIP_DROP_CP` against its best, and the
 * coach is not giving check (a check forces the answer and leads the student
 * by the hand). Smallest drop first — the most natural mistake reads best.
 * `hanging` is REQUIRED: 'forbid' keeps only slips after which nothing hangs
 * (the earned free piece, every shot); 'allow' keeps a slip that leaves a
 * piece to take — the loose-pieces lesson's own question (`focusPlant`).
 */
export function slipCandidates(fen: string, lines: readonly CoachLine[], hanging: 'forbid' | 'allow'): SlipCandidate[] {
  if (lines.length < 2) return [];
  const best = Math.max(...lines.map((l) => l.coachCp));
  const out: SlipCandidate[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    if (seen.has(l.uci)) continue;
    seen.add(l.uci);
    const dropCp = best - l.coachCp;
    if (dropCp < SLIP_DROP_CP) continue;
    const board = load(fen);
    if (!board) return [];
    const move = play(board, l.uci);
    if (!move || board.inCheck() || board.isGameOver()) continue;
    const fenAfter = board.fen();
    const took = slipTook(move.captured);
    if (hanging === 'forbid' && !nothingHangs(fenAfter, took)) continue;
    out.push({ uci: l.uci, fenAfter, dropCp, took, shown: lineWin(fenAfter, l.pv.slice(1), took) });
  }
  return out.sort((a, b) => a.dropCp - b.dropCp || (a.uci < b.uci ? -1 : a.uci > b.uci ? 1 : 0));
}

export interface LineWin {
  /** The student's moves BEFORE the one that wins the piece (1 = a key move,
   *  then the capture). */
  depth: number;
  /** The line from the slip's board to the winning capture (student first),
   *  in UCI — what the coach defends along and the check judges against. */
  line: string[];
  /** The square the piece falls on. */
  square: Square;
}

/**
 * Where a student's line (from `fenAfter`, the student to move) wins a piece:
 * the first student capture after which the student is up at least a piece on
 * the board BEFORE the slip (`took`: what the slip captured — winning it back
 * is not a win) AND the coach's next move in the line (if any) does not win it
 * back. Null when the line wins nothing, or wins it at once (that is a
 * hand-over, depth 0).
 */
export function lineWin(fenAfter: string, pv: readonly string[], took: number): LineWin | null {
  const board = load(fenAfter);
  if (!board) return null;
  const student = board.turn();
  const start = lead(board, student) + took;
  for (let i = 0; i < pv.length; i++) {
    const move = play(board, pv[i]);
    if (!move) return null;
    if (move.color !== student || !move.captured) continue;
    if (lead(board, student) - start < WIN_BAR) continue;
    // Held through the coach's answer in the line, when the line has one.
    if (i + 1 < pv.length) {
      const check = new Chess(board.fen());
      if (!play(check, pv[i + 1]) || lead(check, student) - start < WIN_BAR) continue;
    }
    const depth = Math.floor(i / 2);
    if (depth < 1) return null;
    return { depth, line: pv.slice(0, i + 1), square: move.to };
  }
  return null;
}

/** The coach's first move of the card on which it may slip (1-based; its 1st is
 *  the answer to the card going live). There is NO last move (David 2026-10-21:
 *  "we cannot be teaching how to take advantage of slips and then not provide
 *  one in the game"): the coach keeps looking until the slip lands, while the
 *  student still has room to play the shot out (`PLANT_ROOM_MOVES`). MEASURED
 *  on the ten gate games with every legal move a candidate
 *  (`earnedSlip.arrival.measure.test.ts`): the slip came by the coach's 11th
 *  move of the card in all ten. */
export const PLANT_FIRST_COACH_MOVE = 2;
/** THE EASIER SHOT (2026-10-22): from the coach's 10th move of the card with
 *  no slip yet, it plants one a key move easier than the dial asks — the
 *  slip came by the coach's 11th move in all ten gate games at one key move,
 *  and a deeper shot is rarer on a real board. Every game still gets its
 *  shot; a pass on an easier one does not count at the dial's setting
 *  (`easierShot` on the record). */
export const PLANT_EASIER_FROM_MOVE = 10;
/** The student moves a shot needs before the card's closing move: up to three
 *  key moves (`plantDepth` 3) and the capture. */
export const PLANT_ROOM_MOVES = 4;
/** Student-side engine reads per turn (the coach's own read is one more).
 *  They go to the slips the coach's own line already shows losing a piece at
 *  the dial's depth, then at another depth, then the rest — MEASURED
 *  2026-10-21 on the ten gate games: in smallest-drop order every slip that
 *  wins a piece but three ranked 3rd or later, so two reads never reached them. */
export const PLANT_VERIFY_MAX = 2;
/** Where the student must stand once the line is played (their point of view). */
export const STUDENT_MIN_CP = 200;
/** A first move this close to the line's (centipawns) is the shot too. */
export const ALT_WINDOW_CP = 50;

/** MID-EXCHANGE: the coach is in check or can win a piece itself — a
 *  recapture or a check reply comes first, never a slip. A pawn it could take
 *  is no exchange in progress (a student far ahead leaves pawns about). */
export function midExchange(fen: string): boolean {
  const board = load(fen);
  if (!board) return true;
  if (board.inCheck()) return true;
  const coach = board.turn();
  for (const row of board.board()) for (const cell of row) {
    if (!cell || cell.color === coach || cell.type === 'k') continue;
    if (legalSeeGainFor(fen, cell.square, coach) >= WIN_BAR) return true;
  }
  return false;
}

/** An engine read of a board: its top lines, white's point of view. */
export type SlipRead = (fen: string) => Promise<{ topLines: ReadonlyArray<{ evaluation: number; moves: readonly string[]; mate: number | null }> } | null>;

export interface EarnedPick extends LineWin {
  /** The coach's slip. */
  uci: string;
  /** Where the student stands after the line's best play (their point of view). */
  studentCp: number;
  /** Other first moves the read rates within `ALT_WINDOW_CP` of the line's. */
  alts: string[];
}

/**
 * The slip for this board (coach to move), or why there is none. `coachLines`
 * is the coach's own multi-line read of `fen` (its candidates, the coach's
 * point of view); each slip it offers — those whose own line already shows a
 * piece falling at `depth` first, then at another depth, then the rest, the
 * smallest drop first within each — is confirmed by ONE student-side read, at
 * most `PLANT_VERIFY_MAX`, whose best line must win a
 * piece at exactly the dial's `depth` and leave the student at
 * `STUDENT_MIN_CP` or better. The read's other first moves within
 * `ALT_WINDOW_CP` ride along as `alts`: playing one is not a miss.
 */
export async function findEarnedSlip(
  fen: string,
  coachLines: readonly CoachLine[],
  depth: 1 | 2 | 3,
  read: SlipRead,
): Promise<{ pick: EarnedPick | null; scan: PlantScan }> {
  const scan: PlantScan = {};
  const bump = (r: PlantReject): void => { scan[r] = (scan[r] ?? 0) + 1; };
  if (midExchange(fen)) { bump('mid-exchange'); return { pick: null, scan }; }
  const slips = slipCandidates(fen, coachLines, 'forbid');
  if (slips.length === 0) { bump('no-slip'); return { pick: null, scan }; }
  const shownRank = (s: SlipCandidate): number => (!s.shown ? 2 : s.shown.depth === depth ? 0 : 1);
  const ranked = [...slips].sort((a, b) => shownRank(a) - shownRank(b));
  for (const slip of ranked.slice(0, PLANT_VERIFY_MAX)) {
    const a = await read(slip.fenAfter);
    if (!a || a.topLines.length === 0) { bump('no-read'); continue; }
    const studentWhite = slip.fenAfter.split(' ')[1] === 'w';
    const pov = (l: { evaluation: number; mate: number | null }): number =>
      (l.mate !== null ? Math.sign(l.mate) * 100000 : l.evaluation) * (studentWhite ? 1 : -1);
    const best = [...a.topLines].sort((x, y) => pov(y) - pov(x))[0];
    const win = lineWin(slip.fenAfter, best.moves, slip.took);
    if (!win) { bump('no-line'); continue; }
    if (win.depth !== depth) { bump('wrong-depth'); continue; }
    const studentCp = pov(best);
    if (studentCp < STUDENT_MIN_CP) { bump('not-winning'); continue; }
    const first = win.line[0];
    const alts = [...new Set(a.topLines
      .filter((l) => pov(l) >= studentCp - ALT_WINDOW_CP && l.moves.length > 0 && l.moves[0] !== first)
      .map((l) => l.moves[0]))];
    return { pick: { ...win, uci: slip.uci, studentCp, alts }, scan };
  }
  return { pick: null, scan };
}

/** The fixed clause the pass line closes on, per pattern that won the piece
 *  (§6a: "the fork won it"). Fixed ON PURPOSE, like every mission phrase —
 *  the same words each time is how the pattern sticks. */
export const SHOT_WON: Partial<Record<PatternId, string>> = {
  'knight-fork': 'The fork won it.',
  pin: 'The pin won it.',
};

/** The pattern the student's line USES, read on the board the slip left: a
 *  knight fork when the line opens with the knight and the board offers the
 *  fork; a pin when the opening move leaves one. Null when the shot has no
 *  named pattern in the library — then the pass line says nothing more. */
export function shotPattern(fenAfterSlip: string, line: readonly string[]): PatternId | null {
  const board = load(fenAfterSlip);
  const first = line[0];
  if (!board || !first) return null;
  const student = board.turn();
  if (board.get(first.slice(0, 2) as Square)?.type === 'n' && PATTERN_PROBES['knight-fork'].present(fenAfterSlip, student)) return 'knight-fork';
  if (patternAfterMove('pin', fenAfterSlip, first, student)) return 'pin';
  return null;
}

/** The board the slip left, replayed from the game; null without a slip. */
export function slipBoard(game: { sans: readonly string[]; startFen?: string; context?: { planted?: { ply: number } } }): string | null {
  const planted = game.context?.planted;
  if (!planted) return null;
  const board = load(game.startFen ?? new Chess().fen());
  if (!board) return null;
  for (let i = 0; i <= planted.ply && i < game.sans.length; i++) {
    try { board.move(game.sans[i]); } catch { return null; }
  }
  return board.fen();
}
