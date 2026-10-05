// SPEED-RUN READS, batch 1 — checked against existing computers first (phase
// change → phaseTransitionDetector/principleVoice; sole defender → tacticsDetector
// overload: those are NOT here, by design; lines opened are READ from boardDelta).
// (the saved build queue, docs/naroditsky-insight-catalogue.md
// §BUILD QUEUE). Pure board reads, each one of his habits of thought, handed to
// the one producer (`thinkAloud.depthClauses`) as `speedrun-read` facts the one
// door ranks. G0: nothing here decides — each says what the board shows.
import { Chess, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { sayMoveClause } from './spokenMove';
import { criticalityThresholds } from './criticalityScan';
import { legalSeeGainFor } from './positionReadingService';
import { isPinnedPiece } from './nextPlans';
import { isOutpost } from './outpost';
import { findLoosePieces } from './loosePieces';
import { computeBoardDelta } from './boardDelta';

const name = (p: string): string => PIECE_NAMES[p] ?? 'piece';
const play = (fen: string, san: string): { board: Chess; move: ReturnType<Chess['move']> } | null => {
  try { const board = new Chess(fen); const move = board.move(san); return move ? { board, move } : null; } catch { return null; }
};
const sanOf = (fen: string, uci: string | undefined): string | null => {
  if (!uci || uci.length < 4) return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
};

export interface Read { text: string; squares?: string[]; /** It names the engine's move — speaks only where the move may be named. */ namesMove?: boolean }
type Lines = ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>;
const seatCp = (fen: string, l: { evaluation: number; mate: number | null }): number => {
  const white = l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation;
  return fen.split(' ')[1] === 'w' ? white : -white;
};

/** #23 WHO RELEASES THE TENSION: you can capture into the tension, the engine
 *  does not — keep it, and let them be the one to release. */
export function keepTension(fen: string, me: 'w' | 'b', bestSan: string | null): Read | null {
  if (!bestSan) return null;
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (b.turn() !== me) return null;
  const tension = b.moves({ verbose: true }).find((m) => m.piece === 'p' && m.captured === 'p');
  if (!tension || bestSan.replace(/[+#]/g, '') === tension.san.replace(/[+#]/g, '')) return null;
  const best = play(fen, bestSan);
  if (!best || best.move.captured) return null;
  return {
    text: `Keep the tension between your pawn on ${tension.from} and theirs on ${tension.to} — whoever takes first releases it, and right now that helps them, not you.`,
    squares: [tension.from, tension.to],
  };
}

/** "ANY MOVE IS FINE" (A12, his "know which decisions matter — spend ten
 *  seconds"): the top three moves sit within a hair of each other. */
export function anyMoveFine(fen: string, lines: Lines): Read | null {
  if (lines.length < 3) return null;
  const cps = lines.slice(0, 3).map((l) => seatCp(fen, l));
  // The SAME bar the one criticality read uses (`criticalityThresholds`): all
  // three inside an inaccuracy of each other is "no real decision here".
  if (Math.max(...cps) - Math.min(...cps) >= criticalityThresholds().notable || Math.abs(cps[0]) > 300) return null;
  const sans = lines.slice(0, 3).map((l) => sanOf(fen, l.moves[0])).filter((x): x is string => !!x);
  if (sans.length < 3) return null;
  return { namesMove: true, text: `Several moves are equally good here — ${sans[0]}, ${sans[1]} or ${sans[2]}. Not every move is a big decision; save your time for the ones that are.` };
}

/** D2 THE UGLY MOVE THAT IS CORRECT ("the hardest move to make"): the engine's
 *  best doubles your own pawns, or walks a piece back to its home rank. */
export function uglyButRight(fen: string, bestSan: string | null): Read | null {
  if (!bestSan) return null;
  const r = play(fen, bestSan);
  if (!r) return null;
  const me = r.move.color;
  const home = me === 'w' ? '1' : '8';
  const doubled = (b: Chess): number => {
    let n = 0;
    for (const f of 'abcdefgh') {
      let k = 0;
      for (let rk = 1; rk <= 8; rk += 1) { const p = b.get(`${f}${rk}` as Square); if (p && p.type === 'p' && p.color === me) k += 1; }
      if (k > 1) n += 1;
    }
    return n;
  };
  let before: Chess;
  try { before = new Chess(fen); } catch { return null; }
  const retreatHome = r.move.piece !== 'p' && r.move.piece !== 'k' && r.move.to[1] === home && r.move.from[1] !== home && !r.move.captured;
  const doublesOwn = doubled(r.board) > doubled(before);
  if (!retreatHome && !doublesOwn) return null;
  const why = doublesOwn ? 'it doubles your own pawns' : `it walks your ${name(r.move.piece)} back home`;
  return { namesMove: true, text: `${sayMoveClause(r.move.san, fen).replace(/^./, (c) => c.toUpperCase())} looks ugly — ${why} — but it is the move. Don't reject a move for how it looks; check it.` };
}

/** C8 WHICH SIDE TO CASTLE: both ways are legal and one wing's pawn cover is
 *  intact while the other has holes or a half-open file. */
export function castleSide(fen: string, me: 'w' | 'b'): Read | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (b.turn() !== me) return null;
  const sans = b.moves();
  if (!sans.includes('O-O') || !sans.includes('O-O-O')) return null;
  const rank = me === 'w' ? '2' : '7';
  const cover = (files: readonly string[]): number => files.filter((f) => { const p = b.get(`${f}${rank}` as Square); return p && p.type === 'p' && p.color === me; }).length;
  const short = cover(['f', 'g', 'h']); const long = cover(['a', 'b', 'c']);
  if (short === long) return null;
  const side = short > long ? 'short' : 'long';
  return { text: `If you castle, castle ${side}: the pawns on that wing are still at home (${Math.max(short, long)} of 3), the other wing has already been loosened.` };
}

/** A4 PROVOKE THE COMMITMENT ("Be2 provokes …c4, which releases the pressure"):
 *  the engine's best move is answered by a pawn advance that fixes their pawn
 *  on a square in your half you can aim at. */
export function provokes(fen: string, lines: Lines): Read | null {
  const l = lines[0];
  if (!l || l.moves.length < 2) return null;
  const best = sanOf(fen, l.moves[0]);
  if (!best) return null;
  const after = play(fen, best);
  if (!after) return null;
  const replySan = sanOf(after.board.fen(), l.moves[1]);
  const reply = replySan ? play(after.board.fen(), replySan) : null;
  if (!reply || reply.move.piece !== 'p' || reply.move.captured) return null;
  const rel = reply.move.color === 'w' ? Number(reply.move.to[1]) : 9 - Number(reply.move.to[1]);
  if (rel < 5) return null;
  return { namesMove: true, text: `${sayMoveClause(best, fen).replace(/^./, (c) => c.toUpperCase())} invites ${sayMoveClause(reply.move.san, after.board.fen())} — once that pawn commits to ${reply.move.to}, it is fixed and becomes something to aim at.`, squares: [reply.move.to] };
}

// ── batch 2 (each checked against the existing computers first) ─────────────

/** #39 THE THREAT IS STRONGER THAN THE EXECUTION: you can win material right
 *  now, and the engine prefers a quiet move that keeps it hanging. */
export function threatStronger(fen: string, me: 'w' | 'b', lines: Lines): Read | null {
  const best = lines[0];
  const bestSan = sanOf(fen, best?.moves?.[0]);
  if (!best || !bestSan || /x/.test(bestSan)) return null;
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (b.turn() !== me) return null;
  const grab = b.moves({ verbose: true }).find((m) => m.captured && legalSeeGainFor(fen, m.to, me) > 0);
  if (!grab) return null;
  const grabLine = lines.find((l) => sanOf(fen, l.moves[0]) === grab.san);
  if (grabLine && seatCp(fen, best) - seatCp(fen, grabLine) < criticalityThresholds().notable) return null;
  return { text: `You could take on ${grab.to} right now, but the threat is stronger than carrying it out — the material will keep, so keep it hanging over them and improve first.`, squares: [grab.to] };
}

/** A9 A PIECE HELD ONLY BY A TACTIC ("the loose b1 bishop survives tactically —
 *  recheck it every move"): more of theirs hit it than yours guard it, yet
 *  taking it loses for them. */
export function heldByTactic(fen: string, me: 'w' | 'b'): Read | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const them = me === 'w' ? 'b' : 'w';
  for (const cell of b.board().flat()) {
    if (!cell || cell.color !== me || cell.type === 'k' || cell.type === 'p') continue;
    const hits = b.attackers(cell.square, them).length;
    if (hits === 0 || hits <= b.attackers(cell.square, me).length) continue;
    if (legalSeeGainFor(fen, cell.square, them) > 0) continue;
    return { text: `Your ${name(cell.type)} on ${cell.square} is outnumbered but safe only because of a tactic — check it again after every move, because the moment the tactic disappears, so does its protection.`, squares: [cell.square] };
  }
  return null;
}

/** C5 SECURE THE LOOSE PIECE BEFORE COLLECTING: a capture is there for you, a
 *  piece of yours is loose and hit, and the engine guards first. */
export function secureFirst(fen: string, me: 'w' | 'b', lines: Lines): Read | null {
  const bestSan = sanOf(fen, lines[0]?.moves?.[0]);
  if (!bestSan || /x/.test(bestSan)) return null;
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (b.turn() !== me || !b.moves({ verbose: true }).some((m) => m.captured)) return null;
  const loose = findLoosePieces(fen, me).find((l) => l.attacked && l.type !== 'p');
  if (!loose) return null;
  const after = play(fen, bestSan);
  if (!after || after.board.attackers(loose.square, me).length === 0 && after.move.from !== loose.square) return null;
  return { text: `There is something to collect, but your ${name(loose.type)} on ${loose.square} is loose and under fire — secure it first; the capture will still be there.`, squares: [loose.square] };
}

/** B10 MUTUAL PINS: a piece of yours and a piece of theirs are both pinned to
 *  the king — whoever breaks free first wins the fight. */
export function mutualPins(fen: string): Read | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const pinned = (c: 'w' | 'b'): string | null => {
    for (const cell of b.board().flat()) if (cell && cell.color === c && cell.type !== 'k' && isPinnedPiece(b, cell.square, c)) return cell.square;
    return null;
  };
  const w = pinned('w'); const bl = pinned('b');
  if (!w || !bl) return null;
  return { text: `Both sides are pinned — your piece and theirs (${w} and ${bl}). Whoever breaks free first wins the fight; kicking the pinner with a pawn costs pawn cover, so weigh it.`, squares: [w, bl] };
}

/** D1 OVERPROTECTION: your best piece sits on an outpost with a single guard —
 *  give it a second so it can never be traded off cheaply. */
export function overprotect(fen: string, me: 'w' | 'b'): Read | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  for (const cell of b.board().flat()) {
    if (!cell || cell.color !== me || (cell.type !== 'n' && cell.type !== 'b')) continue;
    if (!isOutpost(b, cell.square, me, true)) continue;
    if (b.attackers(cell.square, me).length !== 1) continue;
    return { text: `Your ${name(cell.type)} on ${cell.square} is your best piece — overprotect it: a second guard means it can never be won or traded off cheaply, and it frees your other pieces.`, squares: [cell.square] };
  }
  return null;
}

/** #38 THE POSITION OPENED — HIT THE GAS: their last move opened a line for one
 *  of YOUR pieces (`boardDelta` decides what opened), and your best move is
 *  forcing. */
export function positionOpened(lastMove: { fenBefore: string; san: string } | undefined, me: 'w' | 'b', bestSan: string | null): Read | null {
  if (!lastMove || !bestSan || !/[+#x]/.test(bestSan)) return null;
  const sq = new Map<string, readonly string[]>();
  const deltas = computeBoardDelta(lastMove.fenBefore, lastMove.san, sq);
  const after = play(lastMove.fenBefore, lastMove.san);
  if (!after || after.move.color === me) return null;
  for (const t of deltas) {
    if (!/line just opened/.test(t)) continue;
    const at = sq.get(t)?.[0];
    const p = at ? after.board.get(at as Square) : null;
    if (p && p.color === me) {
      return { text: `Their move opened your ${name(p.type)}'s line — the position just opened up, so hit the gas: forcing moves now, before they can close it again.`, squares: [...(sq.get(t) ?? [])] };
    }
  }
  return null;
}

/** B9 FORCE A PIECE ONTO AN AWKWARD SQUARE ("Bb5+ provokes …Bd7, which cuts the
 *  queen off"): the engine's check is answered by a block, and the blocking
 *  piece is left with almost nowhere to go. */
export function awkwardBlock(fen: string, lines: Lines): Read | null {
  const l = lines[0];
  const bestSan = sanOf(fen, l?.moves?.[0]);
  if (!l || !bestSan || !bestSan.includes('+') || l.moves.length < 2) return null;
  const a = play(fen, bestSan);
  if (!a) return null;
  const replySan = sanOf(a.board.fen(), l.moves[1]);
  const r = replySan ? play(a.board.fen(), replySan) : null;
  if (!r || r.move.piece === 'k' || r.move.captured) return null;
  let freeMoves = 0;
  try {
    const b = new Chess([r.board.fen().split(' ')[0], r.move.color, '-', '-', '0', '1'].join(' '));
    freeMoves = b.moves({ square: r.move.to }).length;
  } catch { return null; }
  if (freeMoves > 2) return null;
  return { namesMove: true, text: `The check forces them to block with the ${name(r.move.piece)} on ${r.move.to}, and there it is stuck — the point of the check is the awkward square it drives that piece to.`, squares: [r.move.to] };
}

/** Every read for the side to move, in his order of thought. */
export function speedRunReads(args: { fen: string; me: 'w' | 'b'; lines: Lines; lastMove?: { fenBefore: string; san: string } }): Read[] {
  const bestSan = sanOf(args.fen, args.lines[0]?.moves?.[0]);
  return [
    positionOpened(args.lastMove, args.me, bestSan),
    threatStronger(args.fen, args.me, args.lines),
    secureFirst(args.fen, args.me, args.lines),
    heldByTactic(args.fen, args.me),
    mutualPins(args.fen),
    keepTension(args.fen, args.me, bestSan),
    overprotect(args.fen, args.me),
    castleSide(args.fen, args.me),
    uglyButRight(args.fen, bestSan),
    provokes(args.fen, args.lines),
    awkwardBlock(args.fen, args.lines),
    anyMoveFine(args.fen, args.lines),
  ].filter((r): r is Read => !!r);
}
