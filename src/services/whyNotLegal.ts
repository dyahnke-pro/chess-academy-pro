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
import { tagSlots } from '../coach/chatTurnCodeReader';
import { castlingNow } from './chessRules';

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

/** The first piece standing between `from` and `to` on a straight line, or null. */
function blockerOn(chess: Chess, from: Square, to: Square): Square | null {
  const df = Math.sign(to.charCodeAt(0) - from.charCodeAt(0));
  const dr = Math.sign(Number(to[1]) - Number(from[1]));
  let f = from.charCodeAt(0) + df;
  let r = Number(from[1]) + dr;
  while (`${String.fromCharCode(f)}${r}` !== to) {
    const sq = `${String.fromCharCode(f)}${r}` as Square;
    if (chess.get(sq)) return sq;
    f += df; r += dr;
  }
  return null;
}

/** Does a piece of this type move along this geometry at all (board ignored)? */
function movesThatWay(type: PieceSymbol, from: Square, to: Square, color: Color): boolean {
  const df = Math.abs(to.charCodeAt(0) - from.charCodeAt(0));
  const dr = Math.abs(Number(to[1]) - Number(from[1]));
  if (type === 'n') return (df === 1 && dr === 2) || (df === 2 && dr === 1);
  if (type === 'k') return df <= 1 && dr <= 1;
  if (type === 'b') return df === dr && df > 0;
  if (type === 'r') return (df === 0) !== (dr === 0);
  if (type === 'q') return (df === dr && df > 0) || ((df === 0) !== (dr === 0));
  const fwd = (Number(to[1]) - Number(from[1])) * (color === 'w' ? 1 : -1);
  return (df === 0 && (fwd === 1 || (fwd === 2 && Number(from[1]) === (color === 'w' ? 2 : 7)))) || (df === 1 && fwd === 1);
}

/** Why the student's `piece` (any piece when omitted) cannot go to `dest` —
 *  or null when some such move IS legal. */
export function whyNotLegal(fen: string, dest: string, student: 'white' | 'black', piece?: PieceSymbol): string | null {
  if (!SQ_RE.test(dest)) return null;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const color: Color = student === 'white' ? 'w' : 'b';
  const sq = dest as Square;
  if (chess.turn() !== color) return `It's their move right now — you can play once they have moved.`;
  const legal = chess.moves({ verbose: true }).filter((m) => m.to === sq && (!piece || m.piece === piece));
  if (legal.length) return null;
  const onIt = chess.get(sq);
  if (onIt && onIt.color === color) return `${dest} has your own ${NAME[onIt.type]} on it — you cannot capture your own piece.`;
  let from = reachers(chess, sq, color);
  if (piece) {
    const mine: Square[] = [];
    for (const row of chess.board()) for (const p of row) if (p && p.color === color && p.type === piece) mine.push(p.square);
    if (mine.length === 0) return `You have no ${NAME[piece]} left on the board.`;
    from = from.filter((f) => chess.get(f)?.type === piece);
    if (from.length === 0) {
      // Name what stops each one: a piece in the way, or the wrong geometry.
      // Only the pieces that COULD get there by their own movement are worth
      // naming (blocked, or a pawn that needs a capture). The rest are noise:
      // eight pawns that "do not move that way" teach nothing.
      const plural = `${NAME[piece]}${piece === 'p' || mine.length > 1 ? 's' : ''}`;
      const near = mine.filter((f) => movesThatWay(piece, f, sq, color));
      if (near.length === 0) return mine.length === 1
        ? `Your ${NAME[piece]} on ${mine[0]} does not move that way — it cannot reach ${dest}.`
        : `None of your ${plural} can reach ${dest} from where they stand.`;
      const why = near.map((f) => {
        if (piece === 'p' && !onIt && f[0] !== dest[0] && movesThatWay('p', f, sq, color)) return `your pawn on ${f} moves diagonally only to capture, and ${dest} is empty`;
        if (piece === 'p' && onIt && f[0] === dest[0]) return `your pawn on ${f} is blocked — a pawn cannot capture straight ahead`;
        if (!movesThatWay(piece, f, sq, color)) return `your ${NAME[piece]} on ${f} does not move that way`;
        const b = piece === 'n' || piece === 'k' ? null : blockerOn(chess, f, sq);
        const bp = b ? chess.get(b) : undefined;
        return b && bp ? `your ${NAME[piece]} on ${f} is blocked by ${bp.color === color ? 'your' : 'their'} ${NAME[bp.type]} on ${b}` : `your ${NAME[piece]} on ${f} cannot reach ${dest}`;
      });
      const text = `${NAME[piece].charAt(0).toUpperCase()}${NAME[piece].slice(1)} to ${dest} is not possible: ${why.join('; ')}.`;
      return text;
    }
  }
  if (from.length === 0) {
    const pawnDiag = chess.attackers(sq, color).some((s) => chess.get(s)?.type === 'p');
    if (pawnDiag && !onIt) return `There is nothing on ${dest} to take — a pawn moves diagonally only when it captures.`;
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
    if (p.type === 'k') {
      reasons.push(by && by2 ? `your king cannot go to ${dest} — their ${NAME[by2.type]} on ${by} would attack it there` : `your king cannot go to ${dest}`);
    } else if (checked && by && by2) {
      checker = `their ${NAME[by2.type]} on ${by}`;
      checkMovers.push(`your ${NAME[p.type]}`);
    } else if (by && by2) {
      reasons.push(`your ${NAME[p.type]} on ${f} is pinned — moving it would expose your king to their ${NAME[by2.type]} on ${by}`);
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

const LETTER: Record<string, PieceSymbol> = { K: 'k', Q: 'q', R: 'r', B: 'b', N: 'n' };

/**
 * A MOVE THE SENTENCE NAMES THAT THE BOARD WILL NOT ALLOW — whatever the
 * wording ("it won't let me take b5", "is qf3 ok?", "Nb5 doesn't work",
 * "castle?"). The sentence computer reads the move; the board decides.
 * Null when the sentence names no move, when the move is legal for either
 * side (a question about THEIR move is a hypothetical, not a refusal), or
 * when it was played earlier in the game (a question about the past).
 */
export function illegalNamedMove(ask: string, fen: string, student: 'white' | 'black', history: readonly string[] = []): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const slots = tagSlots(ask);
  const color: Color = student === 'white' ? 'w' : 'b';
  // Castling: the action, or "O-O" typed.
  if (slots.action === 'castle' || slots.sans.some((s) => s.startsWith('O-O'))) {
    if (chess.turn() !== color) return null;
    if (chess.moves({ verbose: true }).some((m) => m.isKingsideCastle() || m.isQueensideCastle())) return null;
    if (history.some((h) => h.startsWith('O-O')) && slots.past) return null;
    return castlingNow(chess, color);
  }
  const san = slots.sans.find((s) => !s.startsWith('O-O')) ?? null;
  const dest = san ? (san.match(/([a-h][1-8])(?=[^a-h1-8]*$)/)?.[1] ?? null) : slots.squares[slots.squares.length - 1] ?? null;
  if (!dest) return null;
  const piece: PieceSymbol | undefined = san
    ? (LETTER[san[0]] ?? 'p')
    : slots.pieces.length === 1 ? slots.pieces[0] as PieceSymbol : undefined;
  // A move must be meant: a SAN, an action, a named piece, or a judged bare square ("is d5 good?").
  const meant = !!san || slots.action !== 'none' || slots.pieces.length > 0 || (slots.judged && slots.ask !== 'none') || slots.negated;
  if (!meant) return null;
  // A move asked about in the past tense that is not on the tape is a
  // question about a different game — the past-move lane says so.
  if (slots.past && !slots.negated) return null;
  // Legal for the student now, or for them on their turn: not a refusal.
  const fits = (c: Chess): boolean => c.moves({ verbose: true }).some((m) => m.to === dest && (!piece || m.piece === piece));
  if (fits(chess)) return null;
  // A move of THEIRS ("what if they play Bxc3") is a hypothetical, not a refusal.
  if (slots.seat === 'them') return null;
  // A move only THEY can play, said without "I / my", is theirs as well
  // ("what does Nc6 do?" with their knight on b8 — pass 2, 2026-10-09).
  if (slots.seat !== 'me' && san) {
    const parts = fen.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    try { const them = new Chess(parts.join(' ')); if (!them.inCheck() && them.move(san)) return null; } catch { /* not theirs either */ }
  }
  // Played earlier in the game: a question about the past.
  const replay = new Chess();
  for (const h of history) {
    let mv;
    try { mv = replay.move(h); } catch { break; }
    if (!mv) break;
    if (mv.to === dest && (!piece || mv.piece === piece)) return null;
  }
  return whyNotLegal(fen, dest, student, piece);
}
