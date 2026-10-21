/**
 * Level 1 · Opening · DEVELOP & CASTLE — the board check (WO-MISSIONS-01).
 *
 * PURE and deterministic: chess.js only, no engine, no model. The starting
 * squares come from `development.ts`, the one development reading.
 *
 * Walks the game from the standard start, following each of the student's
 * four original minors by identity (a knight on f1 after Nd2-f1 has left home
 * once; a minor's second move is what the mission is about):
 *   PASS — every original knight and bishop has left its square (or was
 *          captured) AND the student has castled, either side.
 *   MISS — the first of:
 *          a) a minor moves a second time before the pass, unless exempt:
 *             it stood on a square an enemy piece or pawn attacked, the move
 *             is a capture, or the student was in check;
 *          b) the student's own king or rook moves take castling away on
 *             both sides (not when the move answered a check).
 * Pawn, queen and rook moves never miss on their own. A ply the student chose
 * to play on from (`forgiven`) is walked past.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { homeSquaresOf, isMinorAtHome } from '../../services/development';
import type { MissionGame, MissionStatus, ShownMove } from '../missionCard';

interface Walk {
  status: MissionStatus;
  /** Original minors that have left home or been captured (0–4). */
  out: number;
  castled: boolean;
}

function walk(game: MissionGame): Walk {
  const me: Color = game.studentColor;
  const them: Color = me === 'w' ? 'b' : 'w';
  const board = new Chess();
  // Where each original minor stands now → its home square (its identity).
  const at = new Map<string, string>();
  for (const home of [...homeSquaresOf('n', me), ...homeSquaresOf('b', me)]) at.set(home, home);
  const left = new Set<string>();
  const captured = new Set<string>();
  const [rookQ, rookK] = homeSquaresOf('r', me);
  let kingSide = true;
  let queenSide = true;
  let castled = false;
  const out = (): number => new Set([...left, ...captured]).size;
  const passed = (): boolean => castled && out() === 4;

  for (let ply = 0; ply < game.sans.length; ply++) {
    const mover = board.turn();
    const fenBefore = board.fen();
    const inCheck = board.inCheck();
    // The square a piece moves FROM, read before the move.
    let attackedBefore = false;
    let move;
    try {
      const probe = new Chess(fenBefore);
      const m = probe.move(game.sans[ply]);
      attackedBefore = mover === me && board.isAttacked(m.from, them);
      move = board.move(game.sans[ply]);
    } catch {
      break; // an illegal record ends the walk; the status so far stands
    }
    if (mover === them) {
      // Their capture of one of the student's minors resolves it; of a rook on
      // its home square, takes that side's castling — not the student's doing.
      if (move.captured) {
        const home = at.get(move.to);
        if (home) { at.delete(move.to); captured.add(home); }
        if (move.to === rookK) kingSide = false;
        if (move.to === rookQ) queenSide = false;
      }
      if (passed()) return { status: { state: 'pass', ply }, out: out(), castled };
      continue;
    }
    // ── the student's move ──
    let miss: MissionStatus | null = null;
    const home = at.get(move.from);
    if (home && (move.piece === 'n' || move.piece === 'b')) {
      at.delete(move.from);
      at.set(move.to, home);
      if (!left.has(home)) left.add(home);
      else {
        const exempt = attackedBefore || !!move.captured || inCheck;
        if (!exempt && !game.forgiven.has(ply) && !passed()) miss = { state: 'miss', ply, reason: 'repeat-move' };
      }
    }
    if (move.piece === 'k') {
      if (move.isKingsideCastle() || move.isQueensideCastle()) castled = true;
      else if (!castled) {
        const hadRight = kingSide || queenSide;
        kingSide = false;
        queenSide = false;
        if (!miss && hadRight && !inCheck && !game.forgiven.has(ply)) miss = { state: 'miss', ply, reason: 'castling-lost' };
      }
    }
    if (move.piece === 'r' && !castled) {
      const hadBoth = kingSide && queenSide;
      const hadOne = kingSide || queenSide;
      if (move.from === rookK) kingSide = false;
      if (move.from === rookQ) queenSide = false;
      const lostLast = hadOne && !kingSide && !queenSide && !hadBoth;
      if (!miss && lostLast && !inCheck && !game.forgiven.has(ply)) miss = { state: 'miss', ply, reason: 'castling-lost' };
    }
    if (miss) return { status: miss, out: out(), castled };
    if (passed()) return { status: { state: 'pass', ply }, out: out(), castled };
  }
  return { status: { state: 'pending' }, out: out(), castled };
}

/** The mission's verdict on the game so far. */
export function checkDevelopAndCastle(game: MissionGame): MissionStatus {
  return walk(game).status;
}

/** "2/4 out · castle next" — what the banner shows. */
export function developAndCastleProgress(game: MissionGame): string {
  const w = walk(game);
  return `${w.out}/4 pieces out · ${w.castled ? 'castled' : 'not castled yet'}`;
}

/** A move the mission wants from this board: develops a minor still on its
 *  starting square, or castles. */
function servesMission(fen: string, uci: string, me: Color): boolean {
  try {
    const board = new Chess(fen);
    const piece = board.get(uci.slice(0, 2) as Square);
    if (!piece || piece.color !== me) return false;
    const m = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (m.isKingsideCastle() || m.isQueensideCastle()) return true;
    return isMinorAtHome(m.piece, me, m.from);
  } catch {
    return false;
  }
}

/** The home minors of `me` that have a legal move on this board (turned to
 *  `me`, so it can be read on either side's move). */
function freeHomeMinors(fen: string, me: Color): Set<string> {
  const parts = fen.split(' ');
  parts[1] = me;
  parts[3] = '-';
  const out = new Set<string>();
  try {
    const board = new Chess(parts.join(' '));
    for (const t of ['n', 'b'] as const) for (const sq of homeSquaresOf(t, me)) {
      const pc = board.get(sq);
      if (pc && pc.color === me && pc.type === t && board.moves({ square: sq }).length > 0) out.add(sq);
    }
  } catch { /* an unreadable board frees nothing */ }
  return out;
}

/** A PAWN move that frees a minor still on its starting square — out of a
 *  bishop's way — so a piece can come out next. (A minor walking back home is
 *  not freeing anything.) */
function unlocksMinor(fen: string, uci: string, me: Color): boolean {
  try {
    const board = new Chess(fen);
    const before = freeHomeMinors(fen, me);
    const m = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (m.piece !== 'p') return false;
    return [...freeHomeMinors(board.fen(), me)].some((sq) => !before.has(sq));
  } catch {
    return false;
  }
}

/** The move to show after a second miss: the engine's best among the moves
 *  that develop or castle; with none in its read, the first such legal move —
 *  castling, knights, bishops. When nothing can come out yet, the mission's
 *  next step is the pawn that opens the way: the engine's best of those, else
 *  a centre pawn. */
export function developAndCastleShowMove(fenBefore: string, studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  const shown = (uci: string): ShownMove => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
  const develops = candidatesUci.find((uci) => servesMission(fenBefore, uci, studentColor));
  if (develops) return shown(develops);
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return null; }
  if (board.turn() !== studentColor) return null;
  const legal = board.moves({ verbose: true });
  const rank = (m: (typeof legal)[number]): number =>
    m.isKingsideCastle() ? 0 : m.isQueensideCastle() ? 1 : m.piece === 'n' ? 2 : 3;
  const wanted = legal
    .filter((m) => m.isKingsideCastle() || m.isQueensideCastle() || isMinorAtHome(m.piece, studentColor, m.from))
    .sort((a, b) => rank(a) - rank(b));
  if (wanted.length > 0) return { from: wanted[0].from, to: wanted[0].to };
  // Nothing can come out yet: the pawn that frees one — the engine's choice
  // first, else centre files first, onto a square no enemy pawn hits.
  const frees = candidatesUci.find((uci) => unlocksMinor(fenBefore, uci, studentColor));
  if (frees) return shown(frees);
  const FILE_ORDER = 'edgbcfah';
  const enemy: Color = studentColor === 'w' ? 'b' : 'w';
  const pawnHit = (sq: string): boolean => {
    const f = sq.charCodeAt(0);
    const r = Number(sq[1]) + (studentColor === 'w' ? 1 : -1);
    return [f - 1, f + 1].some((c) => {
      if (c < 97 || c > 104 || r < 1 || r > 8) return false;
      const pc = board.get(`${String.fromCharCode(c)}${r}` as Square);
      return !!pc && pc.color === enemy && pc.type === 'p';
    });
  };
  const freeing = legal
    .filter((m) => m.piece === 'p' && unlocksMinor(fenBefore, `${m.from}${m.to}${m.promotion ?? ''}`, studentColor))
    .sort((a, b) => (Number(pawnHit(a.to)) - Number(pawnHit(b.to))) || (FILE_ORDER.indexOf(a.from[0]) - FILE_ORDER.indexOf(b.from[0])));
  return freeing.length > 0 ? { from: freeing[0].from, to: freeing[0].to } : null;
}
