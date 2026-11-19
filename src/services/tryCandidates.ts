/**
 * THE TRIES A PLAYER WEIGHS FOR A REASON (WO-PICTURE-01 P2, David
 * 2026-11-19; scratchpad/danya-how-he-reads.md "one level deeper").
 *
 * Danya's most common try is the plan's DIRECT attempt: "a frontal assault on
 * the e6 pawn", "Rh3 to hit the pawns directly", "Nd3-b4 to encircle d5",
 * "f4-f5 to crash through". He tests it, finds the one quiet resource that
 * meets it ("…Rf7", "…h4", "…Kf7-e6"), and the plan he keeps is the one that
 * survives. Our candidate moves came only from the eye (the human model), so
 * the direct try was never weighed at all.
 *
 * A try here is a QUIET move of the side to move (a capture or a check is the
 * eye's, already a candidate) that:
 *  - `target`: newly hits a weak pawn of the other side (isolated, backward or
 *    doubled), by a piece or by a pawn lever — the frontal attack; or
 *  - `storm`: pushes a pawn on the other king's wing, toward that king, when
 *    the kings stand on opposite wings — the crash through.
 * Every such move is a try — no cap: the engine judges each
 * (`boardReadFacts` reads it); nothing here says the try is good or bad.
 *
 * Pure: chess.js and the weak-pawn reader.
 */
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { withMover } from '../utils/sideToMove';
import { findWeakPawns, findPassedPawns } from './positionReadingService';
import { phaseOfFen } from './boardConcepts';
import { weighedForWhatItDoes, type ConsideredWhy, type ConsideredTry } from './weighedMoves';

export type TryWhy = 'target' | 'storm';

export interface PlanTry {
  uci: string;
  san: string;
  why: TryWhy;
  /** The weak pawn it hits, or the king it storms. */
  target: string;
}

function attackersOf(board: Chess, sq: Square, by: Color): number {
  try { return board.attackers(sq, by).length; } catch { return 0; }
}

function kingFile(board: Chess, c: Color): number | null {
  const k = board.findPiece({ type: 'k', color: c })[0];
  return k ? k.charCodeAt(0) - 97 : null;
}

export function planTries(fen: string): PlanTry[] {
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  if (board.inCheck()) return [];
  const me = board.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const weak = findWeakPawns(fen, them);
  const targets = [...new Set([...weak.isolated, ...weak.backward, ...weak.doubled])];
  const quiet = board.moves({ verbose: true }).filter((m) => !m.captured && !m.san.includes('+') && !m.san.includes('#') && !m.promotion);
  const out: PlanTry[] = [];

  // EVERY QUIET MOVE THAT NEWLY HITS A TARGET is a try (no cap, G4.5): the
  // engine judges each, and the refuters say the ones that fall short. The
  // king is a piece here too — in an ending his try is the king march.
  for (const t of targets) {
    const before = attackersOf(board, t, me);
    for (const m of quiet) {
      const after = new Chess(fen);
      try { after.move(m); } catch { continue; }
      if (attackersOf(after, t, me) <= before) continue;
      // The mover's own piece must now be one of the attackers (not a line
      // opened for another piece — that is a discovery, a different idea).
      let hits = false;
      try { hits = after.attackers(t, me).includes(m.to); } catch { hits = false; }
      if (!hits) continue;
      out.push({ uci: m.from + m.to, san: m.san, why: 'target', target: t });
    }
  }

  const myK = kingFile(board, me);
  const theirK = kingFile(board, them);
  if (myK !== null && theirK !== null && (myK <= 2) !== (theirK <= 2) && (myK >= 5 || myK <= 2) && (theirK >= 5 || theirK <= 2)) {
    const wing = theirK >= 5 ? [5, 6, 7] : [0, 1, 2];
    const k = board.findPiece({ type: 'k', color: them })[0] ?? '';
    // Every pawn push on their king's wing is a storm try (no cap).
    for (const m of quiet) {
      if (m.piece !== 'p') continue;
      const file = m.to.charCodeAt(0) - 97;
      if (!wing.includes(file)) continue;
      out.push({ uci: m.from + m.to, san: m.san, why: 'storm', target: k });
    }
  }
  return out;
}

/**
 * THE MOVES A STRONG PLAYER WEIGHS BEFORE THE EYE DOES (WO-PICTURE-01 P2,
 * David 2026-11-19; the tries bench's `not-weighed`): of Danya's 240 refuted
 * tries, 43 were never offered by the eye — a capture he looked at and threw
 * out ("Qxd3? Qb6+"), a passed pawn pushed too soon ("b2?? Rf8+"), the king
 * step in a pawn ending that loses the opposition ("Ke2?! Ke4"). Each is
 * weighed for a REASON a strong player has, never for how it looks:
 *  - `capture` / `check`: the forcing moves — every one is looked at (checks,
 *    captures, threats);
 *  - `passer`: a push of a passed pawn, every promotion piece included — the
 *    passer is always the first thing an ending asks about;
 *  - `king`: in an ending, every king step — there the king is a fighting
 *    piece, and its square decides the opposition and the race;
 *  - `threat` / `defence`: a quiet move that now wins something next move, or
 *    saves what was under fire (`weighedForWhatItDoes`, read without the eye's
 *    floor), or that now threatens mate, strikes an enemy pawn (a lever) or
 *    doubles a rook on a file (`quietWhy`).
 * Every such move is a try (no cap, G4.5): the engine reads each, and the
 * refuters say only the ones whose line rules them out.
 *
 * Pure: chess.js, the pawn-structure and capture readers.
 */
export type ReasonWhy = ConsideredWhy;

export interface ReasonTry {
  uci: string;
  san: string;
  why: ReasonWhy;
}

export function reasonTries(fen: string): ReasonTry[] {
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  const me = board.turn();
  const passed = new Set<string>(findPassedPawns(fen, me));
  const ending = phaseOfFen(fen) === 'endgame';
  const out: ReasonTry[] = [];
  for (const m of board.moves({ verbose: true })) {
    const uci = m.from + m.to + (m.promotion ?? '');
    const why: ReasonWhy | null = m.captured ? 'capture'
      : /[+#]/.test(m.san) ? 'check'
      : m.piece === 'p' && (passed.has(m.from) || !!m.promotion) ? 'passer'
      : m.piece === 'k' && ending && !m.flags.includes('k') && !m.flags.includes('q') ? 'king'
      : weighedForWhatItDoes(fen, uci) ?? quietWhy(fen, m);
    if (why) out.push({ uci, san: m.san, why });
  }
  return out;
}

/** The quiet move's own idea, read on the board after it: a mate it now
 *  threatens (`mate-threat`: given a free move, the mover mates — his
 *  "Qd8?? threatens mate, but …fxg2+"), a pawn that now strikes an enemy
 *  pawn (`lever`: "…b5, breaking at c4"), or a rook that now stands on a file
 *  with another rook or the queen behind it (`double`: "…Rhd8, doubling"). */
function quietWhy(fen: string, m: Move): ReasonWhy | null {
  const after = new Chess(fen);
  try { after.move(m); } catch { return null; }
  if (after.isGameOver()) return null;
  const free = withMover(after.fen(), m.color);
  if (free) {
    const b = new Chess(free);
    if (b.moves().some((s) => s.endsWith('#'))) return 'mate-threat';
  }
  if (m.piece === 'p') {
    const dir = m.color === 'w' ? 1 : -1;
    const file = m.to.charCodeAt(0);
    const rank = Number(m.to[1]) + dir;
    for (const df of [-1, 1]) {
      const sq = `${String.fromCharCode(file + df)}${rank}`;
      if (!/^[a-h][1-8]$/.test(sq)) continue;
      const p = after.get(sq as Square);
      if (p && p.type === 'p' && p.color !== m.color) return 'lever';
    }
    return null;
  }
  if (m.piece === 'r' && m.from[0] !== m.to[0]) {
    const file = m.to[0];
    const r0 = Number(m.to[1]);
    for (const dir of [-1, 1]) {
      for (let r = r0 + dir; r >= 1 && r <= 8; r += dir) {
        const p = after.get(`${file}${r}` as Square);
        if (!p) continue;
        if (p.color === m.color && (p.type === 'r' || p.type === 'q')) return 'double';
        break;
      }
    }
  }
  return null;
}

/** EVERY MOVE WEIGHED PAST THE EYE, with its reason: the plan's direct tries
 *  first (a move that is both keeps the plan's wording), then the reason
 *  tries. ONE builder, read by the board read and the tries bench alike. */
export function consideredTries(fen: string): Map<string, ConsideredTry> {
  const out = new Map<string, ConsideredTry>();
  for (const t of planTries(fen)) if (!out.has(t.uci)) out.set(t.uci, { why: 'plan', target: t.target });
  for (const t of reasonTries(fen)) if (!out.has(t.uci)) out.set(t.uci, { why: t.why, target: null });
  return out;
}
