/**
 * WHY A MOVE CANNOT BE PLAYED (live replay 2026-10-09: "It's not letting me
 * take b5" got "b5 isn't a move I can find here — which move did you mean?").
 *
 * The student tried a move and the board refused it. The board knows exactly
 * why: it is not their turn, their king is in check, the piece is pinned to
 * the king, the path is blocked, the square holds their own piece, or nothing
 * of theirs reaches it. Each reason is read off chess.js — nothing guessed.
 */
import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const SQ_RE = /^[a-h][1-8]$/;

function kingSquare(chess: Chess, color: Color): Square | null {
  for (const row of chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

/** The piece of theirs that would attack your king if `from` moved to `to`. */
function exposer(chess: Chess, from: Square, to: Square, color: Color): Square | null {
  const fen = chess.fen().split(' ');
  fen[1] = color;
  fen[3] = '-';
  let probe: Chess;
  try { probe = new Chess(fen.join(' '), { skipValidation: true }); } catch { return null; }
  const piece = probe.get(from);
  if (!piece) return null;
  probe.remove(from);
  probe.remove(to);
  probe.put(piece, to);
  const king = piece.type === 'k' ? to : kingSquare(probe, color);
  if (!king) return null;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  return probe.attackers(king, enemy)[0] ?? null;
}

/** The student pieces that reach `dest` geometrically, ignoring pins and check. */
function reachers(chess: Chess, dest: Square, color: Color): Square[] {
  const out = new Set<Square>(chess.attackers(dest, color));
  // Pawn pushes are not attacks: add a pawn one (or two, from home) squares behind.
  const dir = color === 'w' ? -1 : 1;
  const file = dest[0];
  const rank = Number(dest[1]);
  const one = `${file}${rank + dir}` as Square;
  const two = `${file}${rank + 2 * dir}` as Square;
  const p1 = SQ_RE.test(one) ? chess.get(one) : undefined;
  if (p1 && p1.type === 'p' && p1.color === color) out.add(one);
  const home = color === 'w' ? 4 : 5;
  const p2 = rank === home && SQ_RE.test(two) ? chess.get(two) : undefined;
  if (p2 && p2.type === 'p' && p2.color === color) out.add(two);
  // A pawn's diagonal "attack" is not a move onto an empty square.
  const target = chess.get(dest);
  for (const sq of [...out]) {
    const p = chess.get(sq);
    if (p?.type === 'p' && sq[0] !== dest[0] && !target && chess.fen().split(' ')[3] !== dest) out.delete(sq);
    if (p?.type === 'p' && sq[0] === dest[0] && target) out.delete(sq);
  }
  return [...out];
}

/** Why the student cannot move to `dest` — or null when some move there IS legal. */
export function whyNotLegal(fen: string, dest: string, student: 'white' | 'black'): string | null {
  if (!SQ_RE.test(dest)) return null;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const color: Color = student === 'white' ? 'w' : 'b';
  const sq = dest as Square;
  if (chess.turn() !== color) return `It's their move right now — you can play once they have moved.`;
  const legal = chess.moves({ verbose: true }).filter((m) => m.to === sq);
  if (legal.length) return null;
  const onIt = chess.get(sq);
  if (onIt && onIt.color === color) return `${dest} has your own ${NAME[onIt.type]} on it — you cannot capture your own piece.`;
  const from = reachers(chess, sq, color);
  if (from.length === 0) {
    const pawnDiag = chess.attackers(sq, color).some((s) => chess.get(s)?.type === 'p');
    if (pawnDiag && !onIt) return `There is nothing on ${dest} to take — a pawn moves diagonally only when it captures.`;
    // A slider whose line is blocked: name the blocker.
    return `None of your pieces can reach ${dest} from where they stand.`;
  }
  const checked = chess.inCheck();
  const reasons: string[] = [];
  const checkMovers: string[] = [];
  let checker: string | null = null;
  for (const f of from) {
    const p = chess.get(f);
    if (!p) continue;
    const by = exposer(chess, f, sq, color);
    const by2 = by ? chess.get(by) : undefined;
    const who = `Your ${NAME[p.type]} on ${f}`;
    if (p.type === 'k') {
      reasons.push(by && by2 ? `your king cannot go to ${dest} — their ${NAME[by2.type]} on ${by} would attack it there` : `your king cannot go to ${dest}`);
    } else if (checked && by && by2) {
      checker = `their ${NAME[by2.type]} on ${by}`;
      checkMovers.push(`your ${NAME[p.type]}`);
    } else if (by && by2) {
      reasons.push(`${who} is pinned — moving it would expose your king to their ${NAME[by2.type]} on ${by}`);
    }
  }
  if (checker) {
    const movers = checkMovers.length === 1 ? `${checkMovers[0]} going to ${dest} does not` : `neither ${checkMovers.join(' nor ')} going to ${dest}`;
    reasons.unshift(`your king is in check from ${checker}, and ${movers} get${checkMovers.length === 1 ? '' : 's'} it out`);
  }
  if (reasons.length === 0) return null;
  const text = reasons.join('; and ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/** "It's not letting me take b5", "why can't I play Nb5?", "Bxf7 is illegal?" */
const REFUSED_RE = /\b(?:not\s+letting\s+me|(?:won'?t|doesn'?t|does\s+not|will\s+not)\s+let\s+me|why\s+can'?t\s+i|why\s+cannot\s+i|i\s+can'?t|i\s+cannot|unable\s+to|(?:is|it'?s)\s+illegal|not\s+(?:a\s+)?legal|isn'?t\s+legal)\b/i;

/** The answer to a refused-move complaint, or null when it is not one. */
export function answerRefusedMove(ask: string, fen: string, student: 'white' | 'black'): string | null {
  const t = ask.replace(/[\u2018\u2019]/g, "'");
  if (!REFUSED_RE.test(t)) return null;
  const squares = [...t.toLowerCase().matchAll(/\b[nbrqk]?x?([a-h][1-8])\b/g)].map((m) => m[1]);
  const dest = squares[squares.length - 1];
  if (!dest) return null;
  const why = whyNotLegal(fen, dest, student);
  if (why) return why;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const legal = chess.moves({ verbose: true }).filter((m) => m.to === dest);
  if (legal.length === 0) return null;
  const list = legal.map((m) => `your ${NAME[m.piece]} from ${m.from} to ${m.to} (${m.san})`).join(', or ');
  return `That is legal right now: ${list}. Drag the piece from its square to ${dest}.`;
}
