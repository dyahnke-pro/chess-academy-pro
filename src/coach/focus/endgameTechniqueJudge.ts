/**
 * THE ENDGAME'S FOCUS — TECHNIQUE (Coach Build Board "4. Focuses", David
 * 2026-11-24). Three kinds of move, each the record's own endgame skill, read
 * off the board and scored by the one shape (`moveKindJudge`):
 *   - `passed-pawn-neglected` — a passed pawn of yours pushed;
 *   - `passive-rook` — a rook to the seventh rank, or behind your passed pawn;
 *   - `passive-king-endgame` — the king, queens off, stepping toward the
 *     centre or the nearest pawn.
 * The board poses a kind when the engine's best move is that kind and clearly
 * beats every other kind; the student holds it or misses it. Each miss is
 * taught in fixed words — the habit, never the move.
 */
import { Chess, type Color, type Square } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { isPassedPawnAt } from '../../services/boardStructure';
import { queensOff } from '../../services/gamePhaseService';
import type { ReadLine } from './focusChances';
import { judgeMoveKind } from './moveKindJudge';
import type { SkillVerdict } from './openingJudge';

export type EndgameSkill = 'passed-pawn-neglected' | 'passive-rook' | 'passive-king-endgame';

/** Which kind each skill is, read off the move from the board. */
const KIND: Record<EndgameSkill, (fen: string, uci: string) => boolean> = {
  'passed-pawn-neglected': (fen, uci) => {
    const c = load(fen);
    const p = c?.get(uci.slice(0, 2) as Square);
    return !!c && !!p && p.type === 'p' && p.color === c.turn() && isPassedPawnAt(fen, uci.slice(0, 2), p.color);
  },
  'passive-rook': (fen, uci) => {
    const c = load(fen);
    const p = c?.get(uci.slice(0, 2) as Square);
    if (!c || !p || p.type !== 'r' || p.color !== c.turn()) return false;
    const to = uci.slice(2, 4);
    const rank = Number(to[1]);
    if (rank === (p.color === 'w' ? 7 : 2)) return true;
    // Behind one of your passed pawns, on its file.
    return passersOf(fen, p.color).some((sq) => sq[0] === to[0] && (p.color === 'w' ? rank < Number(sq[1]) : rank > Number(sq[1])));
  },
  'passive-king-endgame': (fen, uci) => {
    const c = load(fen);
    const p = c?.get(uci.slice(0, 2) as Square);
    if (!c || !p || p.type !== 'k' || p.color !== c.turn() || !queensOff(fen)) return false;
    const from = uci.slice(0, 2); const to = uci.slice(2, 4);
    if (Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) > 1) return false; // castling
    // A recapture with the king is the trade finishing, not the king's job.
    if (c.get(to as Square)) return false;
    const pawns = pawnSquares(c);
    return toCentre(to) < toCentre(from) || (pawns.length > 0 && nearest(to, pawns) < nearest(from, pawns));
  },
};

/** The fixed words each endgame miss is taught with: the habit. */
export const ENDGAME_MISS_LINE: Record<EndgameSkill, string> = {
  'passed-pawn-neglected': 'A passed pawn has to be pushed. In the endgame, ask first whether your passed pawn can move up.',
  'passive-rook': 'Rooks belong on the seventh rank and behind passed pawns. Before a quiet move, find your rook its most active square.',
  'passive-king-endgame': 'In the endgame the king is a fighting piece. Bring it toward the centre and the pawns.',
};

export const ENDGAME_SKILLS: readonly EndgameSkill[] = ['passed-pawn-neglected', 'passive-rook', 'passive-king-endgame'];

function load(fen: string): Chess | null { try { return new Chess(fen); } catch { return null; } }

function passersOf(fen: string, color: Color): string[] {
  const c = load(fen);
  if (!c) return [];
  return c.board().flat().filter((x) => x && x.type === 'p' && x.color === color).map((x) => (x as { square: string }).square).filter((sq) => isPassedPawnAt(fen, sq, color));
}

function pawnSquares(c: Chess): string[] {
  return c.board().flat().filter((x) => x?.type === 'p').map((x) => (x as { square: string }).square);
}

const dist = (a: string, b: string): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
const toCentre = (sq: string): number => Math.min(...['d4', 'd5', 'e4', 'e5'].map((c) => dist(sq, c)));
const nearest = (sq: string, pawns: readonly string[]): number => Math.min(...pawns.map((p) => dist(sq, p)));

/** The endgame skills one move earns a verdict on (each kind judged on its
 *  own; a board poses at most the kind of its best move). */
export function judgeEndgameMove(fenBefore: string, san: string, lines: readonly ReadLine[] | null): SkillVerdict[] {
  const out: SkillVerdict[] = [];
  for (const tag of ENDGAME_SKILLS) {
    const v = judgeMoveKind(fenBefore, san, lines, KIND[tag]);
    if (v) out.push({ tag: tag as MisconceptionTagId, outcome: v.outcome, line: v.outcome === 'broken' ? ENDGAME_MISS_LINE[tag] : null });
  }
  return out;
}
