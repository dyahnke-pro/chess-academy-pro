// leadUpCause — WHY A SLIP HAPPENED, read off the moves that led to it
// (WO-DEPTH-01, David 2026-11-08: "Most time they blunder because of constant
// pressure, or complicating the position, or having lack of space. I want a
// deeper reasoning than just a surface read.").
//
// The surface read says what the slip did ("the bishop hangs"). This reads
// the stretch of game BEFORE it, against the game's own baseline, and names a
// condition only where the count shows it:
//   · PRESSURE — the other side's last moves kept forcing an answer (a check,
//     or a move that left a new threat: `newThreat`, the tempo run's test);
//   · COMPLICATION — more pieces under attack at once than the game usually
//     had (`computeMustDefend`, both sides);
//   · CRAMP — the slipping side had far fewer moves than the other, and had
//     for its last few moves (mobility, sustained, never one board).
// Pure: chess.js and the threat readers. Nothing on a null — a cause that is
// not shown is never said.
import { Chess, type Color } from 'chess.js';
import { computeMustDefend, newThreat, sideToMoveAs } from './threatOut';

export type LeadUpCause =
  | { kind: 'pressure'; forced: number; of: number }
  | { kind: 'complication'; attacked: number; usual: number }
  | { kind: 'cramp'; moves: number; theirs: number };

/** The other side's last moves read for pressure. */
export const PRESSURE_WINDOW = 4;
/** How many of them must have forced an answer (the last one included). */
export const PRESSURE_FORCED = 3;
/** Pieces under attack at once, at least, and against the game's median. */
export const COMPLICATION_MIN = 3;
export const COMPLICATION_FACTOR = 2;
/** The slipping side's moves against the other's, at most. */
export const CRAMP_RATIO = 0.6;
/** The slipping side's own boards the cramp must hold on (the slip's included). */
export const CRAMP_BOARDS = 3;
/** Boards before this ply are the opening — not the game's baseline. */
const BASELINE_FROM_PLY = 12;

interface PlyRead {
  fen: string;
  /** Pieces (not pawns) under attack, both sides together. */
  attacked: number;
  /** Legal moves each side would have with the move. */
  mobility: Record<Color, number>;
}

/** The game read once: the board before every ply and its counts. */
export interface GameRead {
  sans: readonly string[];
  plies: PlyRead[];
}

function mobilityOf(fen: string, color: Color): number {
  const asColor = sideToMoveAs(fen, color);
  if (!asColor) return 0;
  try { return new Chess(asColor).moves().length; } catch { return 0; }
}

function attackedOn(fen: string): number {
  let n = 0;
  for (const c of ['w', 'b'] as const) n += computeMustDefend(fen, c).pieces.filter((p) => p.piece !== 'p').length;
  return n;
}

/** Read the game once; every slip's lead-up is read off this. */
export function readGame(sans: readonly string[]): GameRead {
  const plies: PlyRead[] = [];
  const c = new Chess();
  for (const san of sans) {
    const fen = c.fen();
    plies.push({ fen, attacked: attackedOn(fen), mobility: { w: mobilityOf(fen, 'w'), b: mobilityOf(fen, 'b') } });
    try { c.move(san); } catch { break; }
  }
  return { sans, plies };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function boardAfter(fen: string, san: string): string | null {
  try { const c = new Chess(fen); return c.move(san) ? c.fen() : null; } catch { return null; }
}

/** Every cause the lead-up to the slip at `slipIndex` shows, strongest first. */
export function leadUpCauses(game: GameRead, slipIndex: number): LeadUpCause[] {
  const at = game.plies[slipIndex];
  if (!at) return [];
  const slipper = new Chess(at.fen).turn();
  const other: Color = slipper === 'w' ? 'b' : 'w';
  const out: LeadUpCause[] = [];

  // PRESSURE — their last moves, the one just before the slip included.
  let forced = 0; let of = 0; let lastForced = false;
  for (let k = 1; k <= PRESSURE_WINDOW; k += 1) {
    const idx = slipIndex - (2 * k - 1);
    if (idx < 0) break;
    const san = game.sans[idx];
    const before = game.plies[idx]?.fen;
    const after = before ? boardAfter(before, san) : null;
    if (!before || !after) break;
    of += 1;
    const f = san.includes('+') || newThreat(before, after, slipper);
    if (f) forced += 1;
    if (k === 1) lastForced = f;
  }
  if (of === PRESSURE_WINDOW && lastForced && forced >= PRESSURE_FORCED) out.push({ kind: 'pressure', forced, of });

  // COMPLICATION — pieces under attack at once, against the game's median.
  const baseline = game.plies.slice(BASELINE_FROM_PLY, slipIndex).map((p) => p.attacked);
  if (baseline.length >= 6) {
    const usual = median(baseline);
    if (at.attacked >= COMPLICATION_MIN && at.attacked >= COMPLICATION_FACTOR * Math.max(usual, 1)) {
      out.push({ kind: 'complication', attacked: at.attacked, usual });
    }
  }

  // CRAMP — sustained over the slipping side's own last boards.
  let cramped = 0;
  for (let k = 0; k < CRAMP_BOARDS; k += 1) {
    const p = game.plies[slipIndex - 2 * k];
    if (!p) break;
    const mine = p.mobility[slipper]; const theirs = p.mobility[other];
    if (theirs > 0 && mine <= CRAMP_RATIO * theirs) cramped += 1;
  }
  if (cramped === CRAMP_BOARDS) out.push({ kind: 'cramp', moves: at.mobility[slipper], theirs: at.mobility[other] });

  return out;
}

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const num = (n: number): string => NUM[n] ?? String(n);

/** The cause said from the student's seat. `slipperIsStudent`: whose slip. */
export function leadUpWords(cause: LeadUpCause, slipperIsStudent: boolean): string {
  switch (cause.kind) {
    case 'pressure':
      return slipperIsStudent
        ? `It came under pressure: ${num(cause.forced)} of their last ${num(cause.of)} moves forced an answer from you. That is when slips happen — when the moves keep forcing you, slow down.`
        : `It came under pressure: ${num(cause.forced)} of your last ${num(cause.of)} moves forced an answer from them. Keep asking questions and the slips come.`;
    case 'complication':
      return `The position was at its most tangled: ${num(cause.attacked)} pieces were under attack at once, where most of the game had ${cause.usual <= 1 ? 'one or none' : num(cause.usual)}.`;
    case 'cramp':
      return slipperIsStudent
        ? `You were cramped: your pieces had ${cause.moves} moves against their ${cause.theirs}, and a cramped position is hard to hold.`
        : `They were cramped: their pieces had ${cause.moves} moves against your ${cause.theirs}, and a cramped position is hard to hold.`;
  }
}
