// gameEndReads — what the reference coach says looking BACK over a game
// (computers batch 2, teach-brief §K): why it ended where it did, the piece that
// never played, the quiet move it turned on, a position worth setting up, and
// the moments where even the engine's read would not hold still.
//
// Every read is computed from the game's own moves (chess.js) and the review's
// own engine numbers (white-POV cp per ply, the best move searched before each
// ply, the eval if that best move had been played). Nothing is inferred from
// prose and nothing is guessed: a read that cannot be proven is not emitted.
//
//   whyItEnded     — the final board: their mate threat leaves no defence, or
//                    exactly one, and that one loses material by force.
//   idlePiece      — a knight or bishop of theirs that stood still from early
//                    on to the end, its roads blocked by its own pawns.
//   quietDecider   — the game turned on THEIR slip, set up by your QUIET move
//                    (the engine's own choice) that took a square from a piece.
//   exploreInvite  — a position after your move where every legal reply of
//                    theirs allows mate in one: set it up and try them.
//   murkyRead      — you played the engine's move, yet its two searches of the
//                    same position disagree by a band: unexplored ground.
//
// Pure: chess.js only. No numbers in the spoken text (bands in words).
import { Chess, type Move, type Square } from 'chess.js';
import { asIfToMove, signedLegalSeeFor } from './positionReadingService';
import { matesInOne } from './opponentMoveReads';
import { MATE_POINTS, type FactStakes } from './factStakes';
import { legalLineProof, squaresProof, type Proof } from './proof';
import { sayMoveNoun } from './spokenMove';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface GamePly {
  san: string;
  fenBefore: string;
  fenAfter: string;
  /** White-POV centipawns after the move, or null when unanalysed. */
  evalAfter: number | null;
  /** The engine's best move from `fenBefore` (UCI), or null. */
  bestMoveUci: string | null;
  /** White-POV eval had the best move been played, or null. */
  bestMoveEval: number | null;
}

export interface EndRead {
  kind: 'why-it-ended' | 'idle-piece' | 'quiet-decider' | 'explore' | 'murky';
  text: string;
  proof: Proof;
  squares: string[];
  stakes?: FactStakes;
  /** The ply (0-based index into the game) the read belongs to. */
  index: number;
  claim: string;
}

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MATE_LIKE = 5000;

function seat(cp: number, s: 'w' | 'b'): number { return s === 'w' ? cp : -cp; }
function other(c: 'w' | 'b'): 'w' | 'b' { return c === 'w' ? 'b' : 'w'; }
function bare(san: string): string { return san.replace(/[+#]/g, ''); }

// ── WHY IT ENDED ────────────────────────────────────────────────────────────

/** The defences of the side to move against a mate-in-one threat of the other
 *  side: every legal move after which no mate in one remains. */
function defencesAgainstMate(fen: string): { threat: Move | null; defences: Move[] } {
  let c: Chess;
  try { c = new Chess(fen); } catch { return { threat: null, defences: [] }; }
  const attacker = other(c.turn());
  const probe = c.inCheck() ? null : asIfToMove(fen, attacker);
  const threat = probe ? matesInOne(probe)[0] ?? null : null;
  if (!threat) return { threat: null, defences: [] };
  const defences = c.moves({ verbose: true }).filter((m) => {
    const d = new Chess(fen); d.move(m.san);
    return matesInOne(d.fen()).length === 0;
  });
  return { threat, defences };
}

/**
 * "The queen swings to h6; the mate threat leaves one defence, and it fails."
 * On the game's final board (not mate, not drawn): the winner threatens mate in
 * one, and the side to move has no defence, or exactly one that then loses at
 * least a piece to a capture the exchange count proves.
 */
export function whyItEnded(plies: readonly GamePly[], student: 'w' | 'b'): EndRead | null {
  const last = plies.at(-1);
  if (!last) return null;
  let end: Chess;
  try { end = new Chess(last.fenAfter); } catch { return null; }
  if (end.isGameOver()) return null;
  const loser = end.turn();
  const winner = other(loser);
  const { threat, defences } = defencesAgainstMate(last.fenAfter);
  if (!threat) return null;
  const studentWon = winner === student;
  const head = studentWon ? 'Why it was over for them' : 'Why it was over';
  const who = studentWon ? 'you threaten' : 'they threaten';
  const whose = studentWon ? 'they have' : 'you have';
  const mate = bare(threat.san);
  const index = plies.length - 1;
  if (defences.length === 0) {
    const any = end.moves({ verbose: true }).at(0);
    if (!any) return null;
    const d = new Chess(last.fenAfter); d.move(any.san);
    const m = matesInOne(d.fen()).at(0);
    if (!m) return null;
    const proof = legalLineProof(last.fenAfter, [any.san, m.san], true);
    if (!proof) return null;
    return {
      kind: 'why-it-ended', index,
      text: `${head}: ${who} mate with ${mate}, and nothing stops it — every move ${whose} allows mate.`,
      proof, squares: [threat.to], stakes: { points: MATE_POINTS, plies: 1 }, claim: 'why-it-ended',
    };
  }
  if (defences.length !== 1) return null;
  const only = defences[0];
  const after = new Chess(last.fenAfter); after.move(only.san);
  // The one defence fails: the winner then takes a piece the exchange proves.
  let win: { san: string; value: number } | null = null;
  for (const m of after.moves({ verbose: true })) {
    if (!m.captured || m.captured === 'p') continue;
    const net = signedLegalSeeFor(after.fen(), m.to, winner);
    if (net >= 3 && (!win || net > win.value)) win = { san: m.san, value: net };
  }
  if (!win) return null;
  const proof = legalLineProof(last.fenAfter, [only.san, win.san], true);
  if (!proof) return null;
  const text = rotateStem([
    `${head}: ${who} mate with ${mate}, and only ${sayMoveNoun(only.san, last.fenAfter)} stops it — and that fails, because ${bare(win.san)} wins material after it.`,
    `${head}: the mate threat with ${mate} leaves one defence, ${bare(only.san)}, and it fails to ${bare(win.san)}.`,
  ], stemKeyOf(last.fenAfter));
  return { kind: 'why-it-ended', index, text, proof, squares: [threat.to, only.to], stakes: { points: win.value, plies: 2 }, claim: 'why-it-ended' };
}

// ── THE PIECE THAT DID NOTHING ──────────────────────────────────────────────

const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

/**
 * "Their a6 knight's only road ran through c5, where their own pawn stood." In
 * a game you won (the final read at least three pawns your way), a knight of
 * theirs that came to its square inside the first twenty plies and never moved
 * again, at least twenty plies, and at the end has at most one move, with at
 * least one of its squares taken by its own pawn.
 */
export function idlePiece(plies: readonly GamePly[], student: 'w' | 'b'): EndRead | null {
  const last = plies.at(-1);
  if (!last || last.evalAfter == null || plies.length < 30) return null;
  if (seat(last.evalAfter, student) < 300) return null;
  const them = other(student);
  let end: Chess;
  try { end = new Chess(last.fenAfter); } catch { return null; }
  for (const row of end.board()) for (const p of row) {
    if (!p || p.color !== them || p.type !== 'n') continue;
    // When did it arrive, and did it stay?
    let arrived = -1;
    plies.forEach((pl, i) => {
      try { const m = new Chess(pl.fenBefore).move(pl.san); if (m.to === p.square) arrived = i; } catch { /* skip */ }
      try { const m = new Chess(pl.fenBefore).move(pl.san); if (m.from === p.square) arrived = Number.POSITIVE_INFINITY; } catch { /* skip */ }
    });
    if (!Number.isFinite(arrived) || arrived >= 20 || plies.length - 1 - arrived < 20) continue;
    const asThem = asIfToMove(last.fenAfter, them);
    const moves = asThem ? new Chess(asThem).moves({ square: p.square, verbose: true }) : [];
    if (moves.length > 1) continue;
    const own: string[] = [];
    for (const [df, dr] of KNIGHT) {
      const f = p.square.charCodeAt(0) + df; const r = Number(p.square[1]) + dr;
      if (f < 97 || f > 104 || r < 1 || r > 8) continue;
      const t = `${String.fromCharCode(f)}${r}`;
      const q = end.get(t as Square);
      if (q && q.color === them && q.type === 'p') own.push(t);
    }
    if (own.length === 0) continue;
    const squares = [p.square, ...own];
    const proof = squaresProof(`Their knight stood on ${p.square} from early on to the end; ${own.join(' and ')} held its own pawns`, squares);
    if (!proof) continue;
    const text = rotateStem([
      `Their knight on ${p.square} did nothing all game: its road ran through ${own[0]}, where their own pawn stood.`,
      `One piece of theirs never played: the knight on ${p.square}, boxed in by its own pawn on ${own[0]}.`,
    ], stemKeyOf(last.fenAfter));
    return { kind: 'idle-piece', index: plies.length - 1, text, proof, squares, claim: `idle-piece:${p.square}` };
  }
  return null;
}

// ── THE QUIET MOVE IT TURNED ON ─────────────────────────────────────────────

/**
 * "The key moment wasn't a tactic but g3, taking f4 from their knight." The
 * read (your seat) goes from under one pawn to at least two and stays there to
 * the end — and the swing lands on THEIR move. Your move just before it was
 * quiet, was the engine's own choice, and took a square from a piece of theirs
 * (a move it had before and has no longer, the square now covered by the piece
 * you moved).
 */
export function quietDecider(plies: readonly GamePly[], student: 'w' | 'b'): EndRead | null {
  if (plies.length < 4) return null;
  for (let i = 1; i < plies.length; i++) {
    const p = plies[i]; const q = plies[i - 1];
    if (p.evalAfter == null || q.evalAfter == null) continue;
    let mover: 'w' | 'b';
    try { mover = new Chess(p.fenBefore).turn(); } catch { continue; }
    if (mover === student) continue;
    if (seat(q.evalAfter, student) >= 100 || seat(p.evalAfter, student) < 200) continue;
    if (Math.abs(p.evalAfter) >= MATE_LIKE && Math.abs(q.evalAfter) >= MATE_LIKE) continue;
    if (!plies.slice(i).every((x) => x.evalAfter == null || seat(x.evalAfter, student) >= 200)) return null;
    // Your move just before.
    let mv: Move;
    try { mv = new Chess(q.fenBefore).move(q.san); } catch { return null; }
    if (mv.captured || /[+#]/.test(mv.san)) return null;
    const uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    if (q.bestMoveUci !== uci) return null;
    const asThemBefore = asIfToMove(q.fenBefore, other(student));
    if (!asThemBefore) return null;
    const had = new Chess(asThemBefore).moves({ verbose: true }).filter((m) => m.piece !== 'p' && m.piece !== 'k');
    const now = new Chess(q.fenAfter);
    for (const h of had) {
      const stillThere = now.get(h.from);
      if (!stillThere || stillThere.color === student || stillThere.type !== h.piece) continue;
      if (!now.attackers(h.to, student).includes(mv.to)) continue;
      // Before your move the square was safe for it; now it loses the piece.
      let before: Chess; let after: Chess;
      try { before = new Chess(asThemBefore); before.move({ from: h.from, to: h.to }); } catch { continue; }
      try { after = new Chess(q.fenAfter); after.move({ from: h.from, to: h.to }); } catch { continue; }
      if (signedLegalSeeFor(before.fen(), h.to, student) > 0) continue;
      if (signedLegalSeeFor(after.fen(), h.to, student) <= 0) continue;
      const squares = [mv.to, h.to, h.from];
      const proof = squaresProof(`After ${bare(mv.san)}, their ${PIECE[h.piece]} on ${h.from} can no longer go to ${h.to} without being lost`, squares);
      if (!proof) continue;
      const text = rotateStem([
        `The key moment wasn't a tactic but ${sayMoveNoun(mv.san, q.fenBefore)}, taking ${h.to} from their ${PIECE[h.piece]} — their next move went wrong, and the game was yours from there.`,
        `This game turned on a quiet move: ${sayMoveNoun(mv.san, q.fenBefore)} took ${h.to} away from their ${PIECE[h.piece]}, and their answer cost them.`,
      ], stemKeyOf(q.fenAfter));
      return { kind: 'quiet-decider', index: i - 1, text, proof, squares, claim: 'quiet-decider' };
    }
    return null;
  }
  return null;
}

// ── AN INVITATION TO EXPLORE ────────────────────────────────────────────────

/**
 * "Set this up and try the defences yourself; each runs into mate." After the
 * move at `index`, the side to move has at least three legal moves and every
 * one allows mate in one. Exact (chess.js), so it is checked only where the
 * engine already reads a decisive edge for the side that just moved.
 */
export function exploreInvite(plies: readonly GamePly[], index: number, student: 'w' | 'b'): EndRead | null {
  const p = plies.at(index);
  if (!p || p.evalAfter == null) return null;
  let c: Chess;
  try { c = new Chess(p.fenAfter); } catch { return null; }
  if (c.isGameOver()) return null;
  const defender = c.turn();
  const attacker = other(defender);
  if (seat(p.evalAfter, attacker) < 500) return null;
  const replies = c.moves({ verbose: true });
  if (replies.length < 3) return null;
  let sample: [string, string] | null = null;
  for (const r of replies) {
    const d = new Chess(p.fenAfter); d.move(r.san);
    const m = matesInOne(d.fen()).at(0);
    if (!m) return null;
    if (!sample) sample = [r.san, m.san];
  }
  if (!sample) return null;
  const proof = legalLineProof(p.fenAfter, sample, true);
  if (!proof) return null;
  const yours = attacker === student;
  const text = yours
    ? rotateStem([
      'Set this position up and try their defences yourself: every one of them runs into mate.',
      'Worth exploring on your own board: whatever they play here, mate follows at once.',
    ], stemKeyOf(p.fenAfter))
    : rotateStem([
      'Set this position up and try your defences yourself: every one of them runs into mate — that is how far it had gone.',
      'Worth exploring on your own board: whatever you play here, mate follows at once.',
    ], stemKeyOf(p.fenAfter));
  return { kind: 'explore', index, text, proof, squares: [], stakes: { points: MATE_POINTS, plies: 1 }, claim: 'explore' };
}

// ── HONEST MURKINESS ────────────────────────────────────────────────────────

type Band = 'clearly better for you' | 'a bit better for you' | 'about level' | 'a bit worse for you' | 'clearly worse for you';
function band(cp: number): Band {
  if (cp >= 250) return 'clearly better for you';
  if (cp >= 80) return 'a bit better for you';
  if (cp > -80) return 'about level';
  if (cp > -250) return 'a bit worse for you';
  return 'clearly worse for you';
}

/**
 * "This is unexplored; keep it simple." You played exactly the engine's move,
 * so the two numbers the review holds — the eval it gave that move before you
 * played it, and its read of the board after — describe ONE position. When they
 * land in different bands, neither is solid: the honest sentence is that the
 * position is unclear, never a guess at who stands better. Decided positions
 * (either read beyond five pawns) are left alone.
 */
export function murkyRead(ply: GamePly, index: number, student: 'w' | 'b'): EndRead | null {
  if (ply.evalAfter == null || ply.bestMoveEval == null || !ply.bestMoveUci) return null;
  let mv: Move;
  try { mv = new Chess(ply.fenBefore).move(ply.san); } catch { return null; }
  if (mv.color !== student) return null;
  if (`${mv.from}${mv.to}${mv.promotion ?? ''}` !== ply.bestMoveUci) return null;
  if (Math.abs(ply.evalAfter) >= 500 || Math.abs(ply.bestMoveEval) >= 500) return null;
  const a = seat(ply.bestMoveEval, student); const b = seat(ply.evalAfter, student);
  if (Math.abs(a - b) < 150 || band(a) === band(b)) return null;
  const proof: Proof = {
    kind: 'count', exact: false,
    short: `One search read it as ${band(a)}, the next as ${band(b)}`,
    full: `One search read it as ${band(a)}, the next as ${band(b)}`,
    squares: [mv.to],
  };
  const text = rotateStem([
    'This is unexplored ground: even the engine\'s read of it would not hold still. In positions like this, keep it simple.',
    'Nobody can tell you exactly who stands better here — the engine changed its mind as it looked deeper. Keep it simple and safe.',
  ], stemKeyOf(ply.fenAfter));
  return { kind: 'murky', index, text, proof, squares: [mv.to], claim: `murky:${index}` };
}
