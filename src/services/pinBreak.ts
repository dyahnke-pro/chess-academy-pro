// pinBreak — THE PIN THAT BREAKS WITH TEMPO (David, questions.md item 7:
// "the pinned piece leaves WITH TEMPO: (a) with check, (b) with a bigger threat
// (hits the queen / threatens mate), (c) with a discovered attack … In each the
// pin is an illusion and the pinning piece hangs. Teach the condition and the
// check.").
//
// DUAL-USE, like every computer: with the STUDENT holding the pin it is the
// warning ("their knight is pinned, but it can leave with check — the pin does
// not hold"); with the student's piece pinned it is the resource ("your knight
// looks pinned, but Ng5 breaks it with check"). One answer, read from either
// seat, so the coach never calls a pin winning that the board can walk out of.
//
// THE CONDITION, computed — never assumed from the shape: the escape must be
// SAFE. Play it, then every reply of the pin's holder, then the pinned side's
// best capture, then the holder's best recapture; the pinned side must come
// out no worse than before (the brief's own trap: after 5.Ng5+ the queen on d8
// may simply take on g5). PURE: chess.js + the tactic detector's own pins.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { withProof, type Proof, type ProofSize } from './proof';
import { CAPTURE_VALUE } from './pieceValues';

export type PinBreakHow = 'check' | 'threat' | 'discovery';

export interface PinBreak {
  /** The side whose piece is pinned (and who breaks the pin). */
  side: Color;
  pinner: Square;
  pinned: Square;
  behind: Square;
  pinnedPiece: PieceSymbol;
  pinnerPiece: PieceSymbol;
  /** The escape: the pinned piece's move that breaks the pin with tempo. */
  san: string;
  from: Square;
  to: Square;
  how: PinBreakHow;
  /** After the escape the pinning piece can be won. */
  pinnerHangs: boolean;
  /** What the computer proved: the escape, the holder's best answer, and
   *  what the pinned side then takes. Rendered per seat (`pinBreakProof`). */
  line: { fen: string; reply: { san: string } | null; cap: { san: string; captured: PieceSymbol; to: Square } | null };
}

const VALUE = CAPTURE_VALUE as Readonly<Record<PieceSymbol, number>>;

function material(chess: Chess, color: Color): number {
  let sum = 0;
  for (const row of chess.board()) for (const c of row) if (c && c.color === color && c.type !== 'k') sum += VALUE[c.type];
  return sum;
}

/** Pinned side's material minus the holder's. */
function balance(chess: Chess, side: Color): number {
  const other: Color = side === 'w' ? 'b' : 'w';
  return material(chess, side) - material(chess, other);
}

function withMover(fen: string, color: Color): string {
  const parts = fen.split(' ');
  if (parts[1] === color) return fen;
  parts[1] = color;
  parts[3] = '-';
  return parts.join(' ');
}

/** Best balance (for `side`) after `mover` makes its best capture, or stands. */
function bestCapture(chess: Chess, side: Color, depth: number): number {
  const stand = balance(chess, side);
  if (depth === 0) return stand;
  const moverIsSide = chess.turn() === side;
  let best = stand;
  for (const m of chess.moves({ verbose: true })) {
    if (!m.captured) continue;
    chess.move(m);
    const v = bestCapture(chess, side, depth - 1);
    chess.undo();
    if (moverIsSide ? v > best : v < best) best = v;
  }
  return best;
}

/** Worst case for `side` after the escape: every holder reply, then two plies
 *  of captures. Mate against `side` is −∞. Returns the reply that does it. */
function worstAfterEscape(afterEscape: Chess, side: Color): { value: number; reply: Move | null } {
  let worst = Infinity;
  let reply: Move | null = null;
  for (const r of afterEscape.moves({ verbose: true })) {
    afterEscape.move(r);
    const v = afterEscape.isCheckmate() ? -Infinity : bestCapture(afterEscape, side, 2);
    afterEscape.undo();
    if (v < worst) { worst = v; reply = r; }
    if (worst === -Infinity) break;
  }
  return worst === Infinity ? { value: balance(afterEscape, side), reply: null } : { value: worst, reply };
}

/** The side's best capture on this board (by the same two-ply count), or null. */
function bestCaptureMove(chess: Chess, side: Color): Move | null {
  let best: Move | null = null;
  let bestV = balance(chess, side);
  for (const m of chess.moves({ verbose: true })) {
    if (!m.captured) continue;
    chess.move(m);
    const v = bestCapture(chess, side, 1);
    chess.undo();
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

/** Does the piece on `from` (of `side`) now hit an enemy piece worth at least
 *  `minValue`? */
function hitsBigger(chess: Chess, from: Square, side: Color, minValue: number): boolean {
  const other: Color = side === 'w' ? 'b' : 'w';
  for (const row of chess.board()) {
    for (const c of row) {
      if (!c || c.color !== other || c.type === 'k' || VALUE[c.type] < minValue) continue;
      if (chess.attackers(c.square, side).includes(from)) return true;
    }
  }
  return false;
}

function attackPairs(chess: Chess, side: Color): Set<string> {
  const other: Color = side === 'w' ? 'b' : 'w';
  const out = new Set<string>();
  for (const row of chess.board()) {
    for (const c of row) {
      if (!c || c.color !== other) continue;
      for (const h of chess.attackers(c.square, side)) out.add(`${h}>${c.square}`);
    }
  }
  return out;
}

/** How the move gains time, or null when it does not. */
function tempoOf(after: Chess, m: Move, side: Color, behindValue: number, before: Set<string>): PinBreakHow | null {
  if (after.inCheck()) return 'check';
  // A bigger threat: the escaped piece now hits something worth at least what
  // it was shielding (their queen when the pin was to yours).
  if (hitsBigger(after, m.to, side, behindValue)) return 'threat';
  // A discovery: moving it opened a line from another of the side's pieces
  // onto something worth at least the shielded piece.
  const fresh = attackPairs(after, side);
  const other: Color = side === 'w' ? 'b' : 'w';
  for (const pair of fresh) {
    if (before.has(pair)) continue;
    const [h, t] = pair.split('>') as [Square, Square];
    if (h === m.to) continue;
    const target = after.get(t);
    if (target && target.color === other && target.type !== 'k' && VALUE[target.type] >= behindValue) return 'discovery';
  }
  return null;
}

/**
 * Every pin against `side`'s pieces that `side` can break with tempo, safely.
 * `side` defaults to the side to move; for the other side the board is read
 * with them to move (what they COULD do on their turn).
 */
export function findPinBreaks(fen: string, side?: Color): PinBreak[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const s: Color = side ?? chess.turn();
  if (chess.turn() !== s) {
    try { chess = new Chess(withMover(fen, s)); } catch { return []; }
  }
  const holder: Color = s === 'w' ? 'b' : 'w';
  const board = chess.fen();
  const pins = detectTactics(board).tactics.filter((t) => t.type === 'pin' && t.beneficiary === holder);
  const base = balance(chess, s);
  const before = attackPairs(chess, s);
  const out: PinBreak[] = [];
  for (const pin of pins) {
    const [pinner, pinned, behind] = pin.involvedSquares as Square[];
    const piece = chess.get(pinned);
    const shield = chess.get(behind);
    const pinnerP = chess.get(pinner);
    if (!piece || piece.color !== s || !shield || shield.color !== s || shield.type === 'k' || !pinnerP) continue;
    const behindValue = VALUE[shield.type];
    for (const m of chess.moves({ square: pinned, verbose: true })) {
      chess.move(m);
      const how = tempoOf(chess, m, s, behindValue, before);
      if (how) {
        const { value: worst, reply } = worstAfterEscape(chess, s);
        if (worst >= base) {
          // THE PROOF (proof.ts): the escape, their best answer, what follows.
          let cap: Move | null = null;
          if (reply) { chess.move(reply); cap = bestCaptureMove(chess, s); chess.undo(); }
          const line = { fen: board, reply: reply ? { san: reply.san } : null, cap: cap && cap.captured ? { san: cap.san, captured: cap.captured, to: cap.to } : null };
          // Can the pinner be won afterwards? Best capture ON the pinner.
          const pinnerHangs = (() => {
            for (const r of chess.moves({ verbose: true })) {
              chess.move(r);
              const takes = chess.moves({ verbose: true }).some((c) => c.to === pinner && c.captured);
              chess.undo();
              if (!takes) return false;
            }
            return true;
          })();
          out.push({ side: s, pinner, pinned, behind, pinnedPiece: piece.type, pinnerPiece: pinnerP.type, san: m.san, from: m.from, to: m.to, how, pinnerHangs, line });
          chess.undo();
          break;
        }
      }
      chess.undo();
    }
  }
  return out;
}

const PIECE: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const HOW: Record<PinBreakHow, string> = { check: 'with check', threat: 'with a bigger threat', discovery: 'with a discovered attack' };

/**
 * The sentence, from the student's seat, WITH its proof (proof.ts): their own
 * pinned piece → the resource; their opponent's → the warning.
 */
export function pinBreakLine(b: PinBreak, student: Color, size: ProofSize = 'full'): string {
  const piece = PIECE[b.pinnedPiece];
  const how = HOW[b.how];
  const conclusion = b.side === student
    ? `Your ${piece} on ${b.pinned} only looks pinned: ${b.san} leaves ${how}, so the pin does not hold.`
    : `Their ${piece} on ${b.pinned} looks pinned, but it can leave ${how} — ${b.san} — so the pin does not hold.`;
  const said = withProof(conclusion, pinBreakProof(b, student), size);
  return b.side === student ? said : `${said} Before you lean on a pin, check every move the pinned piece has.`;
}


/**
 * The proof, as the computer found it — exact: every move was checked. Said
 * from the student's seat: the holder's reply is "yours" when the student
 * holds the pin, "theirs" when the student's piece is the pinned one.
 */
export function pinBreakProof(b: PinBreak, student: Color): Proof {
  const studentIsPinned = b.side === student;
  const { reply, cap } = b.line;
  // The pinned side takes; the holder answered. Said from the student's seat.
  const taker = studentIsPinned ? 'you play' : 'they play';
  const replyOwner = studentIsPinned ? 'their' : 'your';
  const win = cap ? `${taker} ${cap.san}, winning the ${PIECE[cap.captured]} on ${cap.to}` : 'the pin is gone';
  const full = reply ? `After ${b.san}, ${replyOwner} best is ${reply.san}, and ${win}` : `After ${b.san}, ${win}`;
  const short = cap ? `Then ${win}` : '';
  const sans = [b.san, ...(reply ? [reply.san] : []), ...(reply && cap ? [cap.san] : [])];
  return { kind: 'line', exact: true, short, full, line: { fen: b.line.fen, sans }, squares: [b.from, b.to] };
}
