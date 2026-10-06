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
import { costStakes, piecePoints, type FactStakes } from './factStakes';
import { findPawnBreaks, findWeakPawns } from './positionReadingService';
import { computePieceRoute } from './forwardTeaching';
import { knightReach } from './moveInsight';

const name = (p: string): string => PIECE_NAMES[p] ?? 'piece';
/** PHRASING ROTATES, NEVER ROLLS (CLAUDE.md §THE FOUNDATION): keyed on the
 *  move number, so a replay says the same thing and a game does not. */
const rot = (fen: string, ...forms: string[]): string => forms[Number(fen.split(' ')[5] ?? 1) % forms.length];
const play = (fen: string, san: string): { board: Chess; move: ReturnType<Chess['move']> } | null => {
  try { const board = new Chess(fen); const move = board.move(san); return move ? { board, move } : null; } catch { return null; }
};
const sanOf = (fen: string, uci: string | undefined): string | null => {
  if (!uci || uci.length < 4) return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
};

export interface Read { text: string; squares?: string[]; /** It names the engine's move — speaks only where the move may be named. */ namesMove?: boolean; /** What rides on it (factStakes) — the ranker orders by this. */ stakes?: FactStakes; /** The IDEA without the move — spoken when the move is held back (named only where earned). */ idea?: string; /** A once-per-game claim (the voice package drops a repeat). */ claim?: string }
type Lines = ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>;
const seatCp = (fen: string, l: { evaluation: number; mate: number | null }): number => {
  const white = l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation;
  return fen.split(' ')[1] === 'w' ? white : -white;
};

/** The cost of NOT playing line one: centipawns between it and line two. */
const choiceGap = (fen: string, lines: Lines): number | null => (lines.length >= 2 ? seatCp(fen, lines[0]) - seatCp(fen, lines[1]) : null);
const pieceStakes = (type: string, plies: number): FactStakes | undefined => (piecePoints(type) > 0 ? { points: piecePoints(type), plies } : undefined);

/** #23 WHO RELEASES THE TENSION: you can capture into the tension, the engine
 *  does not — keep it, and let them be the one to release. */
export function keepTension(fen: string, me: 'w' | 'b', bestSan: string | null): Read | null {
  if (!bestSan) return null;
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (b.turn() !== me) return null;
  // En passant is not tension: it lands on an empty square ("their pawn on g6"
  // with the pawn on g5 — scale replay 2026-10-06).
  const tension = b.moves({ verbose: true }).find((m) => m.piece === 'p' && m.captured === 'p' && !m.isEnPassant());
  if (!tension || bestSan.replace(/[+#]/g, '') === tension.san.replace(/[+#]/g, '')) return null;
  const best = play(fen, bestSan);
  if (!best || best.move.captured) return null;
  return {
    text: rot(fen, `Keep the tension between your pawn on ${tension.from} and theirs on ${tension.to} — whoever takes first releases it, and right now that helps them, not you.`, `Don't take on ${tension.to} yet — your pawn on ${tension.from} and theirs stare at each other, and releasing that tension helps them.`, `Leave the pawns on ${tension.from} and ${tension.to} where they are — the side that captures first gives the other the freer game here.`),
    squares: [tension.from, tension.to],
  };
}

/** "ANY MOVE IS FINE" (A12, his "know which decisions matter — spend ten
 *  seconds"): the top three moves sit within a hair of each other. */
export function anyMoveFine(fen: string, lines: Lines): Read | null {
  // Out of the opening only: "several moves are equal" on move one is true and teaches nothing.
  if (lines.length < 3 || Number(fen.split(' ')[5] ?? 1) < 8) return null;
  const cps = lines.slice(0, 3).map((l) => seatCp(fen, l));
  // The SAME bar the one criticality read uses (`criticalityThresholds`): all
  // three inside an inaccuracy of each other is "no real decision here".
  if (Math.max(...cps) - Math.min(...cps) >= criticalityThresholds().notable || Math.abs(cps[0]) > 300) return null;
  const sans = lines.slice(0, 3).map((l) => sanOf(fen, l.moves[0])).filter((x): x is string => !!x);
  if (sans.length < 3) return null;
  return { idea: rot(fen, 'No move here is a big decision — several are about equally good, so save your time for the moves that are.', 'This is not a critical moment — a few moves do the same job; bank the time for when it matters.', 'Nothing hinges on this one — pick a sensible move and keep your clock for the hard decisions.'), claim: 'srr:any-move-fine', namesMove: true, text: `Several moves are equally good here — ${sans[0]}, ${sans[1]} or ${sans[2]}. Not every move is a big decision; save your time for the ones that are.` };
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
  return { idea: `The best move here is an ugly ${name(r.move.piece)} move — ${why} — ${rot(fen, "don't reject a move for how it looks; check it.", 'ugly is not the same as bad — calculate it before you dismiss it.', 'the move that looks wrong is sometimes the only one; look before you discard it.')}`, namesMove: true, text: `${sayMoveClause(r.move.san, fen).replace(/^./, (c) => c.toUpperCase())} looks ugly — ${why} — but it is the move. Don't reject a move for how it looks; check it.` };
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
  return { idea: `A ${name(after.move.piece)} move here makes them commit their ${reply.move.from[0]}-pawn — a committed pawn is fixed, and becomes something to aim at.`, namesMove: true, text: `${sayMoveClause(best, fen).replace(/^./, (c) => c.toUpperCase())} invites ${sayMoveClause(reply.move.san, after.board.fen())} — once that pawn commits to ${reply.move.to}, it is fixed and becomes something to aim at.`, squares: [reply.move.to] };
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
  const gap = grabLine ? seatCp(fen, best) - seatCp(fen, grabLine) : null;
  return { stakes: costStakes(gap) ?? { points: legalSeeGainFor(fen, grab.to, me), plies: 1 }, text: `You could take on ${grab.to} right now, but the threat is stronger than carrying it out — the material will keep, so keep it hanging over them and improve first.`, squares: [grab.to] };
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
    return { stakes: pieceStakes(cell.type, 1), text: `Your ${name(cell.type)} on ${cell.square} is outnumbered but safe only because of a tactic — check it again after every move, because the moment the tactic disappears, so does its protection.`, squares: [cell.square] };
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
  // Something to COLLECT: a capture that actually wins material, not any capture.
  if (b.turn() !== me || !b.moves({ verbose: true }).some((m) => m.captured && legalSeeGainFor(fen, m.to, me) > 0)) return null;
  const loose = findLoosePieces(fen, me).find((l) => l.attacked && l.type !== 'p');
  if (!loose) return null;
  const after = play(fen, bestSan);
  if (!after || after.board.attackers(loose.square, me).length === 0 && after.move.from !== loose.square) return null;
  return { stakes: pieceStakes(loose.type, 1), text: `There is something to collect, but your ${name(loose.type)} on ${loose.square} is loose and under fire — ${rot(fen, 'secure it first; the capture will still be there.', 'tidy that up before you go collecting.', 'safety first — the material is not going anywhere.')}`, squares: [loose.square] };
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
  const pts = Math.min(piecePoints(b.get(w as Square)?.type ?? ''), piecePoints(b.get(bl as Square)?.type ?? ''));
  return { stakes: pts > 0 ? { points: pts, plies: 2 } : undefined, text: `Both sides are pinned — your piece and theirs (${w} and ${bl}). Whoever breaks free first wins the fight; kicking the pinner with a pawn costs pawn cover, so weigh it.`, squares: [w, bl] };
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
    return { stakes: pieceStakes(cell.type, 3), text: `Your ${name(cell.type)} on ${cell.square} is your best piece — overprotect it: a second guard means it can never be won or traded off cheaply, and it frees your other pieces.`, squares: [cell.square] };
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
  return { idea: `Your ${name(a.move.piece)} has a check that drives their ${name(r.move.piece)} to an awkward square — the point of a check can be the square it forces.`, namesMove: true, text: `The check forces them to block with the ${name(r.move.piece)} on ${r.move.to}, and there it is stuck — the point of the check is the awkward square it drives that piece to.`, squares: [r.move.to] };
}

// ── batch 3 (checked first: breaks → findPawnBreaks; knight routes →
// computePieceRoute; knight distance → moveInsight.knightReach; outposts → isOutpost) ──

/** PLAY IT ANYWAY: the engine's move allows their check or capture — the scary
 *  reply — and the line still holds for you. */
export function playAnyway(fen: string, lines: Lines): Read | null {
  const l = lines[0];
  if (!l || l.moves.length < 2) return null;
  const bestSan = sanOf(fen, l.moves[0]);
  const a = bestSan ? play(fen, bestSan) : null;
  if (!a || !bestSan) return null;
  const replySan = sanOf(a.board.fen(), l.moves[1]);
  if (!replySan || !/[+x]/.test(replySan)) return null;
  if (seatCp(fen, l) < 0) return null;
  // SCARY means it looks like it wins something: a check, or a capture that
  // nets them material on the count. A plain recapture is not scary.
  if (!replySan.includes('+')) {
    const rp = play(a.board.fen(), replySan);
    if (!rp || legalSeeGainFor(a.board.fen(), rp.move.to, rp.move.color) <= 0) return null;
    // Taking back what your move took is a trade, not a scare.
    if (a.move.captured && piecePoints(a.move.captured) >= piecePoints(rp.move.captured ?? '')) return null;
  }
  const what = replySan.includes('+') ? 'a check' : 'a capture';
  const rTo = play(a.board.fen(), replySan)?.move;
  const hits = replySan.includes('+') ? 'lets them check your king'
    : rTo?.captured && rTo.to === a.move.to ? `offers the ${name(rTo.captured)}` // naming the square would give the move away
      : rTo?.captured ? `lets them take your ${name(rTo.captured)} on ${rTo.to}` : 'allows a scary-looking reply';
  return { idea: `Your strongest ${name(a.move.piece)} move ${hits} — ${rot(fen, 'look one move past it: nothing follows for them.', 'check what happens next — the scare is empty.', 'follow it one more move and the danger disappears.')}`, namesMove: true, text: `${sayMoveClause(bestSan, fen).replace(/^./, (c) => c.toUpperCase())} allows ${what} — ${sayMoveClause(replySan, a.board.fen())} — and you play it anyway: look one move past the scary reply and nothing follows for them.` };
}

/** SKIP THE MIDDLEMAN: the break is there and the engine plays it now rather
 *  than preparing it — every preparing move is a tempo they get too. */
export function skipMiddleman(fen: string, bestSan: string | null): Read | null {
  if (!bestSan || /x/.test(bestSan)) return null;
  const r = play(fen, bestSan);
  if (!r || r.move.piece !== 'p') return null;
  if (!findPawnBreaks(fen).includes(r.move.to)) return null;
  const hit = [-1, 1].map((d) => `${String.fromCharCode(r.move.to.charCodeAt(0) + d)}${Number(r.move.to[1]) + (r.move.color === 'w' ? 1 : -1)}`)
    .find((q) => { const p = r.board.get(q as Square); return p && p.type === 'p' && p.color !== r.move.color; });
  return { idea: `Your ${r.move.from[0]}-pawn break${hit ? ` against their pawn on ${hit}` : ''} is ready now — no need to prepare it; every preparing move is a move they get too.`, namesMove: true, text: `The break is ready now — ${sayMoveClause(bestSan, fen)}. No need to prepare it first; every preparing move is a move they get to use too.`, squares: [r.move.to] };
}

/** THE USEFUL WAITING MOVE: no move matters much, and the engine's is a small
 *  rook-pawn step — air for the king while they have to commit first. */
export function usefulWaiting(fen: string, lines: Lines): Read | null {
  if (!anyMoveFine(fen, lines)) return null;
  const bestSan = sanOf(fen, lines[0]?.moves?.[0]);
  if (!bestSan || !/^[abgh][36]$/.test(bestSan)) return null;
  return { idea: 'Nothing has to happen yet — a useful waiting move is enough, and it makes them commit first.', claim: 'srr:waiting', namesMove: true, text: `Nothing has to happen yet — ${bestSan} is a useful waiting move: it costs nothing, gives your king air, and makes them commit first.`, squares: [bestSan] };
}

/** KEEP A SQUARE VACANT FOR THE KNIGHT: your knight's route to its outpost
 *  runs through a square another piece of yours could block. */
export function keepSquareForKnight(fen: string, me: 'w' | 'b', bestSan: string | null): Read | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (b.turn() !== me) return null;
  const bestTo = bestSan ? play(fen, bestSan)?.move.to : undefined;
  for (const cell of b.board().flat()) {
    if (!cell || cell.color !== me || cell.type !== 'n') continue;
    const route = computePieceRoute(fen, cell.square);
    if (!route || route.route.length < 2) continue;
    const via = route.route[0];
    if (b.get(via) || bestTo === via) continue;
    const blocker = b.moves({ verbose: true }).find((m) => m.to === via && m.piece !== 'n');
    if (!blocker) continue;
    return { text: `Keep ${via} empty — your knight on ${cell.square} goes ${[cell.square, ...route.route].join('–')}, and ${via} is the first step.`, squares: [via, route.target] };
  }
  return null;
}

/** THE RIGHT PIECE FOR THE HOLE: your bishop sits on an outpost a knight of
 *  yours could reach — the hole belongs to the knight, which no bishop of
 *  theirs can trade off for free and no pawn can chase. */
export function rightPieceForHole(fen: string, me: 'w' | 'b'): Read | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  for (const cell of b.board().flat()) {
    if (!cell || cell.color !== me || cell.type !== 'b') continue;
    if (!isOutpost(b, cell.square, me, true)) continue;
    const k = knightReach(fen, cell.square, me);
    if (!k || k.moves > 3) continue;
    return { text: `The hole on ${cell.square} is held by your bishop, but it belongs to a knight — your knight on ${k.from} gets there in ${k.moves}; a knight on an outpost hits both colours and can only be traded for a piece.`, squares: [cell.square, k.from] };
  }
  return null;
}

// ── batch 4 — the rest of the owed list, every one from the engine's own lines
// (checked first: concessions AFTER a played move → concessionBeat, which
// compares two moves of one side, so a forced reply is new; threats → SEE). ──

const flipTurn = (fen: string): string => { const f = fen.split(' '); f[1] = f[1] === 'w' ? 'b' : 'w'; f[3] = '-'; return f.join(' '); };
const cap = (t: string): string => t.replace(/^./, (c) => c.toUpperCase());
/** Does any reply win something of `me` after `fenAfter` (them to move)? */
const leavesSomething = (fenAfter: string, me: 'w' | 'b'): string | null => {
  let b: Chess;
  try { b = new Chess(fenAfter); } catch { return null; }
  const them = me === 'w' ? 'b' : 'w';
  for (const cell of b.board().flat()) {
    if (!cell || cell.color !== me || cell.type === 'k') continue;
    if (b.attackers(cell.square, them).length && legalSeeGainFor(fenAfter, cell.square, them) > 0) return cell.square;
  }
  return null;
};

/** #22 FINISH WHAT YOU STARTED: your last move started a pawn break and the
 *  engine's move carries it on with a pawn — don't stop halfway. */
export function finishStarted(lastOwn: { fenBefore: string; san: string } | undefined, fen: string, bestSan: string | null): Read | null {
  if (!lastOwn || !bestSan) return null;
  const last = play(lastOwn.fenBefore, lastOwn.san);
  if (!last || last.move.piece !== 'p' || last.move.captured) return null;
  if (!findPawnBreaks(lastOwn.fenBefore).includes(last.move.to)) return null;
  const best = play(fen, bestSan);
  if (!best || best.move.piece !== 'p') return null;
  if (Math.abs(best.move.from.charCodeAt(0) - last.move.to.charCodeAt(0)) > 1) return null;
  return { idea: `You started the break with ${last.move.san} — finish it before they settle.`, namesMove: true, text: `You started something with ${last.move.san} — finish it: ${sayMoveClause(bestSan, fen)} keeps the break going instead of letting them settle.`, squares: [last.move.to, best.move.to] };
}

/** #27 A MOVE GOOD IN EVERY BRANCH: after the engine's move no reply of theirs
 *  wins anything of yours; after the next-best, one does. */
export function goodInEveryBranch(fen: string, me: 'w' | 'b', lines: Lines): Read | null {
  if (lines.length < 2) return null;
  const a = sanOf(fen, lines[0].moves[0]); const b2 = sanOf(fen, lines[1].moves[0]);
  const pa = a ? play(fen, a) : null; const pb = b2 ? play(fen, b2) : null;
  if (!pa || !pb || !a || !b2 || pa.move.color !== me) return null;
  // A recapture works whatever they answer by nature — nothing to teach.
  if (pa.move.captured) return null;
  if (leavesSomething(pa.board.fen(), me)) return null;
  const loose = leavesSomething(pb.board.fen(), me);
  if (!loose) return null;
  return { stakes: costStakes(choiceGap(fen, lines)) ?? pieceStakes(pb.board.get(loose as Square)?.type ?? '', 1), idea: `Your ${name(pa.move.piece)} has a move that works whatever they answer — the next-best choice leaves your ${name(pb.board.get(loose as Square)?.type ?? '')} on ${loose} to be taken.`, namesMove: true, text: `${cap(sayMoveClause(a, fen))} works whatever they answer — nothing of yours can be taken after it. ${b2} leaves the piece on ${loose} to be collected.`, squares: [loose] };
}

/** #31 TAKE THE STING OUT: a piece of yours can be won, and the engine neither
 *  moves it nor adds a guard — its move makes taking it stop working. */
export function takeTheSting(fen: string, me: 'w' | 'b', bestSan: string | null): Read | null {
  if (!bestSan) return null;
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  if (b.turn() !== me) return null;
  const them = me === 'w' ? 'b' : 'w';
  const best = play(fen, bestSan);
  if (!best || best.move.captured) return null;
  for (const cell of b.board().flat()) {
    if (!cell || cell.color !== me || cell.type === 'k' || cell.type === 'p') continue;
    if (!b.attackers(cell.square, them).length || legalSeeGainFor(fen, cell.square, them) <= 0) continue;
    if (best.move.from === cell.square) continue;
    if (best.board.attackers(cell.square, me).length > b.attackers(cell.square, me).length) continue;
    if (legalSeeGainFor(best.board.fen(), cell.square, them) > 0) continue;
    return { stakes: { points: legalSeeGainFor(fen, cell.square, them), plies: 1 }, idea: `Your ${name(cell.type)} on ${cell.square} is attacked — but you don't have to move it or guard it; look for the move that makes taking it fail.`, namesMove: true, text: `Your ${name(cell.type)} on ${cell.square} is attacked, but ${sayMoveClause(bestSan, fen)} neither moves it nor guards it — it takes the sting out, so taking it no longer works for them.`, squares: [cell.square] };
  }
  return null;
}

/** THE RETREAT THAT KEEPS YOUR BREAK: the engine's retreat steps off the square
 *  in front of your own pawn, and the break is on again. */
export function retreatKeepsBreak(fen: string, me: 'w' | 'b', bestSan: string | null): Read | null {
  const r = bestSan ? play(fen, bestSan) : null;
  if (!r || r.move.piece === 'p' || r.move.piece === 'k' || r.move.captured) return null;
  const back = me === 'w' ? Number(r.move.to[1]) < Number(r.move.from[1]) : Number(r.move.to[1]) > Number(r.move.from[1]);
  if (!back) return null;
  const behind = `${r.move.from[0]}${Number(r.move.from[1]) + (me === 'w' ? -1 : 1)}` as Square;
  const pawn = r.board.get(behind);
  if (!pawn || pawn.type !== 'p' || pawn.color !== me) return null;
  if (!findPawnBreaks(flipTurn(r.board.fen())).includes(r.move.from)) return null;
  return { idea: `Stepping your ${name(r.move.piece)} back clears the way for your ${behind[0]}-pawn to break — not every step back is passive.`, namesMove: true, text: `${cap(sayMoveClause(bestSan as string, fen))} is a retreat with a point — it clears ${r.move.from} so your pawn on ${behind} can break there.`, squares: [behind, r.move.from] };
}

/** THE BEST-CASE PLAN TEST: the slower plan, played out with best play from
 *  both sides, still leaves you with less than the engine's move. */
export function bestCasePlan(fen: string, lines: Lines): Read | null {
  if (lines.length < 2) return null;
  const quiet = (l: Lines[number]): boolean => {
    let b: Chess;
    try { b = new Chess(fen); } catch { return false; }
    let ours = 0;
    for (let i = 0; i < l.moves.length && i < 8; i += 1) {
      const u = l.moves[i];
      let m;
      try { m = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return false; }
      if (i % 2 === 0) { if (m.captured || m.san.includes('+')) return false; ours += 1; }
    }
    return ours >= 3;
  };
  const [one, two] = lines;
  if (!quiet(two)) return null;
  const gap = seatCp(fen, one) - seatCp(fen, two);
  if (gap < criticalityThresholds().notable || seatCp(fen, two) > 50) return null;
  const a = sanOf(fen, one.moves[0]); const b2 = sanOf(fen, two.moves[0]);
  if (!a || !b2) return null;
  return { stakes: costStakes(gap) ?? undefined, idea: `Test the slow plan with ${b2} by its best case: even if everything goes right, it only gets you level — something sharper is there.`, namesMove: true, text: `Test the slow plan with ${b2} by its best case: even when everything goes right for you, you end up no better than level. ${a} gets more.` };
}

/** THE REJECTED MOVE THAT WORKS LATER: a move that is worse now turns up later
 *  in the engine's own line — after the preparation it works. */
export function rejectedMoveLater(fen: string, lines: Lines): Read | null {
  if (lines.length < 2) return null;
  const main = lines[0].moves;
  for (const l of lines.slice(1)) {
    if (seatCp(fen, lines[0]) - seatCp(fen, l) < criticalityThresholds().notable) continue;
    const u = l.moves[0];
    const at = main.findIndex((m, i) => i > 0 && i % 2 === 0 && m === u);
    if (at < 0) continue;
    const san = sanOf(fen, u); const first = sanOf(fen, main[0]);
    if (!san || !first) continue;
    return { stakes: costStakes(seatCp(fen, lines[0]) - seatCp(fen, l)) ?? undefined, idea: `${san} doesn't work yet — prepare it first; a rejected move is not a dead move.`, namesMove: true, text: `${san} doesn't work yet — but it does after ${first}: it comes back ${at / 2} move${at === 2 ? '' : 's'} later in the line. A rejected move is not a dead move; prepare it.` };
  }
  return null;
}

/** FORCE A CONCESSION: their best answer to the engine's move costs them
 *  something nameable — castling, or a new weak pawn. */
export function forceConcession(fen: string, lines: Lines): Read | null {
  const l = lines[0];
  const bestSan = sanOf(fen, l?.moves?.[0]);
  if (!l || !bestSan || l.moves.length < 2) return null;
  const a = play(fen, bestSan);
  if (!a) return null;
  const replySan = sanOf(a.board.fen(), l.moves[1]);
  const r = replySan ? play(a.board.fen(), replySan) : null;
  if (!r || !replySan) return null;
  const them = r.move.color;
  const rights = (f: string): string => f.split(' ')[2];
  const theirs = (f: string): string => rights(f).replace(them === 'w' ? /[kq]/g : /[KQ]/g, '').replace('-', '');
  if (r.move.piece === 'k' && !replySan.startsWith('O-O') && theirs(a.board.fen()) && !theirs(r.board.fen())) {
    return { idea: `Your ${name(a.move.piece)} has a forcing move that costs their king the right to castle — ${rot(fen, 'find it.', 'look at the checks first.', 'can you see it?')}`, namesMove: true, text: `${cap(sayMoveClause(bestSan, fen))} forces a concession — their best answer is ${replySan}, and their king loses the right to castle.`, squares: [r.move.to] };
  }
  // Only a STRUCTURAL weakness the reply itself made: an isolated or doubled
  // pawn of theirs that stands there, after a reply that moved or took a pawn.
  if (r.move.piece !== 'p' && r.move.captured !== 'p') return null;
  const weak = (f: string): Set<string> => { const w = findWeakPawns(f, them); return new Set([...w.isolated, ...w.doubled]); };
  const before = weak(a.board.fen());
  const fresh = [...weak(r.board.fen())].find((s2) => !before.has(s2) && r.board.get(s2 as Square)?.type === 'p' && r.board.get(s2 as Square)?.color === them);
  if (!fresh) return null;
  // A concession LASTS: at the end of the engine's line the pawn is still
  // there and still weak (1…d5 2.exd5 doubles the d-pawns, and …Qxd5 takes
  // one straight back — nothing was conceded).
  const end = new Chess(r.board.fen());
  for (const u of l.moves.slice(2, 6)) { try { end.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; } }
  if (end.get(fresh as Square)?.type !== 'p' || end.get(fresh as Square)?.color !== them || !weak(end.fen()).has(fresh)) return null;
  // Name the pawn as it stands NOW (the board the student sees): the file of
  // the pawn before the reply moved it.
  const pawnFile = (r.move.to === fresh && r.move.piece === 'p' ? r.move.from : fresh)[0];
  if (!fresh) return null;
  return { idea: `Your ${name(a.move.piece)} has a forcing move that leaves their ${pawnFile}-pawn weak for good — ${rot(fen, 'find it.', 'look at the forcing moves first.', 'can you see it?')}`, namesMove: true, text: `${cap(sayMoveClause(bestSan, fen))} forces a concession — their best answer is ${replySan}, and it leaves their ${pawnFile}-pawn weak for good.`, squares: [fresh] };
}

/** FLEXIBLE MOVES FIRST: a piece move and a pawn move are about equal — play
 *  the piece; the pawn can come later, and it can never come back. */
export function flexibleFirst(fen: string, lines: Lines): Read | null {
  if (lines.length < 2) return null;
  const a = sanOf(fen, lines[0].moves[0]);
  const pa = a ? play(fen, a) : null;
  if (!pa || !a || pa.move.piece === 'p' || pa.move.captured || a.includes('+')) return null;
  const what = a.startsWith('O-O') ? 'castling' : `a ${name(pa.move.piece)} move`;
  for (const l of lines.slice(1)) {
    if (seatCp(fen, lines[0]) - seatCp(fen, l) >= criticalityThresholds().notable) continue;
    const s2 = sanOf(fen, l.moves[0]);
    const p2 = s2 ? play(fen, s2) : null;
    if (!p2 || !s2 || p2.move.piece !== 'p' || p2.move.captured) continue;
    return { idea: rot(fen, `Make the flexible move first — ${what} keeps your options; ${s2} can always come later, but a pawn can never go back.`, `Keep your options open — ${what} first; ${s2} will still be there, and a pawn move can't be taken back.`, `Commit the pawn last — ${what} now, ${s2} later if you still want it.`), claim: 'srr:flexible-first', namesMove: true, text: `${a} and ${s2} are about equal — make the flexible move first. ${a} keeps your options; the pawn move can always come later, but it can never go back.` };
  }
  return null;
}

/** THE QUEEN AS THE GLUE: your queen is the only guard of two attacked pieces
 *  — move or trade it and both come loose. */
export function queenGlue(fen: string, me: 'w' | 'b'): Read | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const them = me === 'w' ? 'b' : 'w';
  const q = b.board().flat().find((c) => c && c.type === 'q' && c.color === me);
  if (!q) return null;
  const held: string[] = [];
  for (const c of b.board().flat()) {
    if (!c || c.color !== me || c.type === 'k' || c.type === 'q') continue;
    const g = b.attackers(c.square, me);
    if (g.length === 1 && g[0] === q.square && b.attackers(c.square, them).length > 0) held.push(c.square);
  }
  if (held.length < 2) return null;
  const most = Math.max(...held.map((h) => piecePoints(b.get(h as Square)?.type ?? '')));
  return { stakes: most > 0 ? { points: most, plies: 2 } : undefined, text: `Your queen on ${q.square} is the glue — it alone holds ${held[0]} and ${held[1]}. Move it or trade it and both come loose.`, squares: [q.square, ...held] };
}

/** Every read for the side to move, in his order of thought. */
export function speedRunReads(args: { fen: string; me: 'w' | 'b'; lines: Lines; lastMove?: { fenBefore: string; san: string }; lastOwnMove?: { fenBefore: string; san: string } }): Read[] {
  const bestSan = sanOf(args.fen, args.lines[0]?.moves?.[0]);
  return [
    positionOpened(args.lastMove, args.me, bestSan),
    queenGlue(args.fen, args.me),
    takeTheSting(args.fen, args.me, bestSan),
    finishStarted(args.lastOwnMove, args.fen, bestSan),
    goodInEveryBranch(args.fen, args.me, args.lines),
    forceConcession(args.fen, args.lines),
    rejectedMoveLater(args.fen, args.lines),
    bestCasePlan(args.fen, args.lines),
    retreatKeepsBreak(args.fen, args.me, bestSan),
    flexibleFirst(args.fen, args.lines),
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
    skipMiddleman(args.fen, bestSan),
    playAnyway(args.fen, args.lines),
    keepSquareForKnight(args.fen, args.me, bestSan),
    rightPieceForHole(args.fen, args.me),
    usefulWaiting(args.fen, args.lines) ?? anyMoveFine(args.fen, args.lines),
  ].filter((r): r is Read => !!r).map((r) => {
    if (r.stakes && r.stakes.points > 0) return r;
    // No stake of its own: the read carries the weight of the decision it
    // speaks to — what playing the next-best move instead costs (the same
    // centipawn gap the one criticality read measures). A quiet position
    // honestly carries almost nothing.
    const fallback = costStakes(choiceGap(args.fen, args.lines));
    const { stakes: _drop, ...rest } = r;
    return fallback ? { ...rest, stakes: fallback } : rest;
  });
}
