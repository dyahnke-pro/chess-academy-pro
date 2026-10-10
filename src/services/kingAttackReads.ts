// kingAttackReads — ATTACK, SACRIFICES AND KINGS (computers batch 4).
//
// Pure board reads for the side to move (`me`), each one of the habits of
// thought a strong player runs around the kings, handed to the one producer
// (`thinkAloud.depthClauses`) as `king-read` facts the one door ranks:
//
//   mateOrMaterial   — mate beats material ("leave the rook: Qh6 mates"), and
//                      the honest converse ("no mate here: take the rook with
//                      check"). A mate line also says how the pieces SHARE the
//                      work (the division of labour).
//   castlingGeometry — the move that stops them castling ("it sees f8"), and
//                      your own castling blocked by their piece.
//   lureKing         — the move that aims a line at the square their king
//                      castles to, while they still can.
//   probingCheck     — the best move is a quiet check with the king choosing
//                      between squares: check first, then plan around it.
//   breakChooser     — a flank build-up is met in the centre; a locked centre
//                      sends the play to the wing.
//   sacrificeTarget  — three of your pieces bear on a square by their king that
//                      only fewer defend: where a sacrifice may land.
//   sacrificeConditions — castling short against their bishop on the h7/h2
//                      diagonal: the sacrifice is played out on the board and
//                      the missing piece (knight to g5, queen to the h-file)
//                      is named.
//   kingSquareByChecks — king to X, not Y: on Y their check comes.
//   ownPieceShelter  — their king hides behind YOUR piece on your rook's or
//                      bishop's line: move it off and it is check.
//   kingDiagonalWalk — the endgame king's diagonal step that approaches their
//                      pawn and supports yours at once.
//
// G0: nothing here decides; each read says what the board (chess.js) or the
// engine line handed in shows, and every one carries the PROOF it rests on
// (a played line or the squares, `proof.ts`). A read that cannot prove itself
// is not emitted. Phrasing rotates on the move number, never at random.
import { openSentence, continueSentence } from '../utils/openSentence';
import { Chess, type Square, type Move } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { sayMoveClause } from './spokenMove';
import { legalLineProof, squaresProof, type Proof } from './proof';
import { MATE_POINTS, piecePoints, type FactStakes } from './factStakes';
import { legalSeeGainFor } from './positionReadingService';
import { detectPlanRace, planRaceClause, planRaceProof } from './planRace';

export type KingReadId =
  | 'mate-over-material' | 'material-not-mate' | 'mate-division'
  | 'stops-castling' | 'own-castling-blocked' | 'lure-king'
  | 'probing-check' | 'centre-strike' | 'wing-lever'
  | 'sacrifice-target' | 'sacrifice-conditions'
  | 'king-square-checks' | 'own-piece-shelter' | 'king-diagonal-walk' | 'storm-race';

export interface KingRead {
  id: KingReadId;
  text: string;
  /** The squares the read names — marked on the board, and the geometry the
   *  door collapses on. */
  squares: string[];
  /** What the read rests on — a played line or the squares. Required: an
   *  unprovable read is never built. */
  proof: Proof;
  stakes?: FactStakes;
  /** Names the engine's move — speaks only where the move may be named. */
  namesMove: boolean;
  /** The idea without the move, for where the move is held back. */
  idea?: string;
  /** Once-per-game claim key. */
  claim?: string;
  /** The line the sentence names, from the board it starts on (drawn). */
  lines?: Array<{ fen: string; sans: string[] }>;
}

type Lines = ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>;
type Color = 'w' | 'b';

const name = (p: string): string => PIECE_NAMES[p] ?? 'piece';
const cap = (s: string): string => openSentence(s);
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
/** PHRASING ROTATES, NEVER ROLLS: keyed on the move number. */
const rot = (fen: string, ...forms: string[]): string => forms[Number(fen.split(' ')[5] ?? 1) % forms.length];
const FILES = 'abcdefgh';
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const word = (n: number): string => WORDS[n] ?? String(n);

function load(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

/** Play a list of UCI or SAN moves from `fen`; stops at the first illegal one. */
function playLine(fen: string, moves: readonly string[]): { board: Chess; played: Move[] } | null {
  const board = load(fen);
  if (!board) return null;
  const played: Move[] = [];
  for (const mv of moves) {
    let m: Move | null = null;
    try {
      m = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(mv)
        ? board.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] })
        : board.move(mv);
    } catch { m = null; }
    if (!m) break;
    played.push(m);
  }
  return { board, played };
}

function kingSquare(b: Chess, c: Color): Square | null {
  for (const row of b.board()) for (const x of row) if (x && x.type === 'k' && x.color === c) return x.square;
  return null;
}


function attackedBy(b: Chess, sq: string, by: Color): Square[] {
  try { return b.attackers(sq as Square, by); } catch { return []; }
}

// ── MATE OR MATERIAL, AND THE DIVISION OF LABOUR ─────────────────────────────

/** The longest mate line a student is told about as one idea. */
const MATE_PLY_MAX = 9;

/**
 * MATE BEATS MATERIAL. The engine's best line, played out on the board, ends
 * in checkmate by `me` — and a capture of a rook or more is sitting there
 * that is not the first move of the mate: leave it. When the mate uses two or
 * more of the student's pieces over three or more moves, the line is also said
 * as a division of labour — which piece goes where.
 *
 * The converse is said only when the engine says so: none of the lines handed
 * in mates, the best move takes a rook or more WITH CHECK, and the king is
 * under fire (`lines` must be present — a single line cannot prove "no mate").
 */
export function mateOrMaterial(fen: string, me: Color, lines: Lines): KingRead | null {
  const b = load(fen);
  if (!b || b.turn() !== me || lines.length === 0) return null;
  const best = lines[0];
  const run = playLine(fen, best.moves.slice(0, MATE_PLY_MAX));
  if (!run || run.played.length === 0) return null;
  const sans = run.played.map((m) => m.san);
  const first = run.played[0];
  if (run.board.isCheckmate() && run.board.turn() !== me) {
    // The greedy capture that is not the mate: a rook or more, won outright.
    const grab = b.moves({ verbose: true })
      .filter((m) => m.captured && piecePoints(m.captured) >= 5 && m.san !== first.san)
      .filter((m) => legalSeeGainFor(fen, m.to, me) >= 3)
      .sort((x, y) => piecePoints(y.captured ?? '') - piecePoints(x.captured ?? ''))[0];
    const studentMoves = run.played.filter((m) => m.color === me);
    const division = divisionOfLabour(run.played, me);
    const proof = legalLineProof(fen, sans, true);
    if (!proof) return null;
    const stakes: FactStakes = { points: MATE_POINTS, plies: sans.length - 1 };
    const lineArr = [{ fen, sans }];
    if (grab) {
      const leave = `their ${name(grab.captured as string)} on ${grab.to}`;
      return {
        id: 'mate-over-material',
        text: `${rot(fen, `Leave ${leave}`, `Don't take ${leave}`, `Skip ${leave}`)} — ${sayMoveClause(first.san, fen)} starts a mate they can't stop, and mate beats any material.${division ? ` ${division}` : ''}`,
        idea: `There is a mate on the board — look for it before you take ${leave}.`,
        squares: [grab.to, first.from, first.to, run.played[run.played.length - 1].to],
        proof, stakes, namesMove: true, claim: `kr:mate:${sans.join('')}`, lines: lineArr,
      };
    }
    if (division && studentMoves.length >= 2) {
      return {
        id: 'mate-division',
        text: `There's a mate here, and it takes teamwork: ${continueSentence(division)}`,
        idea: 'There is a mate here that needs several of your pieces working together — find what each one does.',
        squares: studentMoves.map((m) => m.to),
        proof, stakes, namesMove: true, claim: `kr:mate:${sans.join('')}`, lines: lineArr,
      };
    }
    return null;
  }
  // NO MATE HERE — take the material with check. Only when no line mates.
  if (lines.some((l) => l.mate != null)) return null;
  if (!first.captured || piecePoints(first.captured) < 5 || !first.san.includes('+')) return null;
  const k = kingSquare(b, other(me));
  if (!k) return null;
  const zone = kingZone(k);
  const pressure = new Set(zone.flatMap((sq) => attackedBy(b, sq, me))).size;
  if (pressure < 2) return null;
  const proof = legalLineProof(fen, sans.slice(0, 3));
  if (!proof) return null;
  return {
    id: 'material-not-mate',
    text: `${rot(fen, 'No mate here', "There's no mate to find here", 'The attack has no mate in it')} — ${sayMoveClause(first.san, fen)} takes their ${name(first.captured)} with check, and the material is the win.`,
    idea: 'There is no mate in this attack — the win is material, taken with check.',
    squares: [first.from, first.to],
    proof, stakes: { points: piecePoints(first.captured), plies: 0 }, namesMove: true,
    lines: [{ fen, sans: sans.slice(0, 3) }],
  };
}

/** "Your rook goes to h8, your other rook to b8 and your king to g7 — mate."
 *  Each student piece is followed through the line by its square; null when
 *  fewer than two of them move. */
function divisionOfLabour(played: readonly Move[], me: Color): string | null {
  // piece id → its route; ids follow a piece from square to square.
  const at = new Map<string, number>();
  const routes: Array<{ type: string; to: string }> = [];
  const dead = new Set<number>();
  for (const m of played) {
    if (m.color !== me) {
      // A piece of yours taken on the way gave itself up; its job is not a square.
      const hit = at.get(m.to);
      if (m.captured && hit !== undefined) { dead.add(hit); at.delete(m.to); }
      continue;
    }
    let id = at.get(m.from);
    if (id === undefined) { id = routes.length; routes.push({ type: m.piece, to: m.to }); }
    else routes[id].to = m.to;
    at.delete(m.from);
    at.set(m.to, id);
  }
  const live = routes.filter((_r, i) => !dead.has(i));
  if (live.length < 2) return null;
  const seen = new Map<string, number>();
  const parts = live.map((r) => {
    const n = seen.get(r.type) ?? 0;
    seen.set(r.type, n + 1);
    return `your ${n > 0 ? 'other ' : ''}${name(r.type)} ${n > 0 ? 'to' : 'goes to'} ${r.to}`;
  });
  const listed = parts.length === 2 ? `${parts[0]} and ${parts[1]}` : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${cap(listed)} — mate.`;
}

function kingZone(k: string): string[] {
  const f = FILES.indexOf(k[0]);
  const r = Number(k[1]);
  const out: string[] = [];
  for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
    const ff = f + df; const rr = r + dr;
    if (ff >= 0 && ff < 8 && rr >= 1 && rr <= 8) out.push(`${FILES[ff]}${rr}`);
  }
  return out;
}

// ── CASTLING GEOMETRY AND THE LURE ───────────────────────────────────────────

/** The squares a king crosses (and lands on) castling each way. */
const TRANSIT: Record<Color, Record<'k' | 'q', [string, string]>> = {
  w: { k: ['f1', 'g1'], q: ['d1', 'c1'] },
  b: { k: ['f8', 'g8'], q: ['d8', 'c8'] },
};
const WING_WORD: Record<'k' | 'q', string> = { k: 'short', q: 'long' };

function castleRights(fen: string, c: Color): Array<'k' | 'q'> {
  const rights = fen.split(' ')[2] ?? '-';
  const out: Array<'k' | 'q'> = [];
  if (rights.includes(c === 'w' ? 'K' : 'k')) out.push('k');
  if (rights.includes(c === 'w' ? 'Q' : 'q')) out.push('q');
  return out;
}

/**
 * THE MOVE THAT STOPS THEM CASTLING: the engine's best move puts a piece on a
 * line through a square their king must cross, on a wing they can still
 * castle to, which nothing of yours covered before. Board-true: the attacker,
 * the square, the castling right.
 */
export function stopsCastling(fen: string, me: Color, bestSan: string | null): KingRead | null {
  if (!bestSan) return null;
  const before = load(fen);
  if (!before || before.turn() !== me) return null;
  const them = other(me);
  const rights = castleRights(fen, them);
  if (rights.length === 0) return null;
  const run = playLine(fen, [bestSan]);
  if (!run || run.played.length !== 1) return null;
  const mv = run.played[0];
  const after = run.board;
  for (const wing of rights) {
    for (const sq of TRANSIT[them][wing]) {
      if (attackedBy(before, sq, me).length > 0) continue;
      const now = attackedBy(after, sq, me);
      if (!now.includes(mv.to)) continue;
      const proof = squaresProof(`your ${name(mv.piece)} on ${mv.to} covers ${sq}`, [mv.to, sq]);
      if (!proof) return null;
      const opener = mv.captured ? `${cap(sayMoveClause(mv.san, fen))} — and it` : `${cap(sayMoveClause(mv.san, fen))}:`;
      return {
        id: 'stops-castling',
        text: `${opener} ${mv.captured ? 'sees' : 'your ' + name(mv.piece) + ' sees'} ${sq}, so they can't castle ${WING_WORD[wing]}.`,
        idea: `Look for a move that covers ${sq} — their king has to cross it to castle ${WING_WORD[wing]}.`,
        squares: [mv.to, sq], proof, namesMove: true, claim: `kr:nocastle:${them}${wing}`,
      };
    }
  }
  return null;
}

/** YOUR CASTLING, BLOCKED: you still have the right, and their piece covers a
 *  square your king must cross. Said once a game per wing. */
export function ownCastlingBlocked(fen: string, me: Color): KingRead | null {
  const b = load(fen);
  if (!b || b.turn() !== me || b.inCheck()) return null;
  const them = other(me);
  for (const wing of castleRights(fen, me)) {
    const [cross, land] = TRANSIT[me][wing];
    const empty = [cross, land].every((s) => !b.get(s as Square)) && (wing === 'k' || !b.get((me === 'w' ? 'b1' : 'b8') as Square));
    if (!empty) continue;   // the pieces in the way are the usual reason, not this
    for (const sq of [cross, land]) {
      const hit = attackedBy(b, sq, them)[0];
      if (!hit) continue;
      const piece = b.get(hit);
      if (!piece) continue;
      const proof = squaresProof(`their ${name(piece.type)} on ${hit} covers ${sq}`, [hit, sq]);
      if (!proof) return null;
      return {
        id: 'own-castling-blocked',
        text: `You can't castle ${WING_WORD[wing]} right now — their ${name(piece.type)} on ${hit} sees ${sq}, a square your king has to cross.`,
        squares: [hit, sq], proof, namesMove: false, claim: `kr:owncastle:${me}${wing}:${hit}`,
      };
    }
  }
  return null;
}

/**
 * THE LURE: their king has not castled and can still go short; the engine's
 * best move OPENS a line from one of your bishops or your queen (not the piece
 * that moves) to the squares that king would land beside (h7/g7, h2/g2). The
 * attack is waiting for the king, not the other way round.
 */
export function lureKing(fen: string, me: Color, bestSan: string | null): KingRead | null {
  if (!bestSan) return null;
  const before = load(fen);
  if (!before || before.turn() !== me) return null;
  const them = other(me);
  if (!castleRights(fen, them).includes('k')) return null;
  const k = kingSquare(before, them);
  if (!k || k[0] !== 'e') return null;
  const run = playLine(fen, [bestSan]);
  if (!run || run.played.length !== 1) return null;
  const mv = run.played[0];
  if (mv.captured || mv.san.includes('+')) return null;
  const targets = them === 'b' ? ['h7', 'g7'] : ['h2', 'g2'];
  for (const sq of targets) {
    const was = new Set(attackedBy(before, sq, me));
    const now = attackedBy(run.board, sq, me).filter((a) => !was.has(a) && a !== mv.to);
    const slider = now.find((a) => { const p = run.board.get(a); return !!p && (p.type === 'b' || p.type === 'q'); });
    if (!slider) continue;
    const p = run.board.get(slider);
    if (!p) continue;
    const proof = squaresProof(`after ${mv.san} your ${name(p.type)} on ${slider} sees ${sq}`, [mv.from, slider, sq]);
    if (!proof) return null;
    return {
      id: 'lure-king',
      text: `${cap(sayMoveClause(mv.san, fen))} opens your ${name(p.type)} on ${slider} toward ${sq} — exactly where their king lands if they castle short.`,
      idea: `Their king hasn't castled yet — aim your pieces at ${sq}, where it goes when it does.`,
      squares: [mv.from, slider, sq], proof, namesMove: true, claim: `kr:lure:${slider}${sq}`,
    };
  }
  return null;
}

// ── THE PROBING CHECK ────────────────────────────────────────────────────────

/** The engine's best move is a quiet check with no mate in the line, the king
 *  has two or more squares to choose from, and the engine's reply IS a king
 *  move: check first, then plan around where it went. */
export function probingCheck(fen: string, me: Color, lines: Lines): KingRead | null {
  const b = load(fen);
  if (!b || b.turn() !== me || lines.length === 0 || lines[0].mate != null) return null;
  const run = playLine(fen, lines[0].moves.slice(0, 2));
  if (!run || run.played.length < 2) return null;
  const [chk, reply] = run.played;
  if (!chk.san.includes('+') || chk.captured) return null;
  const mid = playLine(fen, [chk.san]);
  if (!mid) return null;
  const kingMoves = mid.board.moves({ verbose: true }).filter((m) => m.piece === 'k');
  const squares = [...new Set(kingMoves.map((m) => m.to))];
  if (squares.length < 2 || reply.piece !== 'k') return null;
  const listed = squares.length === 2 ? `${squares[0]} or ${squares[1]}` : `${squares.slice(0, -1).join(', ')} or ${squares[squares.length - 1]}`;
  const proof = squaresProof(`after ${chk.san} the king can go to ${listed}`, [chk.to, ...squares]);
  if (!proof) return null;
  return {
    id: 'probing-check',
    text: `${cap(sayMoveClause(chk.san, fen))} first — it's check, and the king has to choose between ${listed}. See where it goes, then plan around it.`,
    idea: 'There is a check worth giving first — make the king commit to a square, then plan around it.',
    squares: [chk.to, ...squares], proof, namesMove: true, lines: [{ fen, sans: [chk.san, reply.san] }],
  };
}

// ── THE BREAK CHOOSER ────────────────────────────────────────────────────────

const START_RANK: Record<Color, number> = { w: 2, b: 7 };

/** Their pawns advanced at least two ranks on one wing (two or more of them). */
function flankBuildUp(b: Chess, them: Color): { wing: 'kingside' | 'queenside'; squares: string[] } | null {
  const dir = them === 'w' ? 1 : -1;
  const wings: Array<{ wing: 'kingside' | 'queenside'; files: string }> = [{ wing: 'kingside', files: 'fgh' }, { wing: 'queenside', files: 'abc' }];
  for (const w of wings) {
    const adv: string[] = [];
    for (const row of b.board()) for (const x of row) {
      if (!x || x.type !== 'p' || x.color !== them || !w.files.includes(x.square[0])) continue;
      if ((Number(x.square[1]) - START_RANK[them]) * dir >= 2) adv.push(x.square);
    }
    if (adv.length >= 2) return { wing: w.wing, squares: adv };
  }
  return null;
}

/** The d/e pawns locked head to head: each blocked by an enemy pawn. */
function centreLocked(b: Chess): string[] | null {
  const locked: string[] = [];
  for (const f of ['d', 'e']) {
    for (let r = 2; r <= 7; r += 1) {
      const w = b.get(`${f}${r}` as Square);
      const bl = b.get(`${f}${r + 1}` as Square);
      if (w?.type === 'p' && w.color === 'w' && bl?.type === 'p' && bl.color === 'b') locked.push(`${f}${r}`, `${f}${r + 1}`);
    }
  }
  return locked.length >= 4 ? locked : null;
}

/** A pawn move that captures a pawn, or lands attacking one. */
function isLever(after: Chess, mv: Move): boolean {
  if (mv.piece !== 'p') return false;
  if (mv.captured === 'p') return true;
  const dir = mv.color === 'w' ? 1 : -1;
  const f = FILES.indexOf(mv.to[0]);
  const r = Number(mv.to[1]) + dir;
  return [f - 1, f + 1].some((ff) => {
    if (ff < 0 || ff > 7 || r < 1 || r > 8) return false;
    const p = after.get(`${FILES[ff]}${r}` as Square);
    return !!p && p.type === 'p' && p.color !== mv.color;
  });
}

/**
 * WHICH BREAK, WHICH WING. A flank pawn build-up is answered in the centre —
 * the engine's best move is a central pawn lever while their pawns have run
 * up one wing. A locked centre sends the play to the wing — the engine's best
 * is a flank pawn lever while the d- and e-pawns stand locked.
 */
export function breakChooser(fen: string, me: Color, bestSan: string | null): KingRead | null {
  if (!bestSan) return null;
  const b = load(fen);
  if (!b || b.turn() !== me) return null;
  const run = playLine(fen, [bestSan]);
  if (!run || run.played.length !== 1) return null;
  const mv = run.played[0];
  if (!isLever(run.board, mv)) return null;
  const central = 'de'.includes(mv.to[0]);
  const build = flankBuildUp(b, other(me));
  if (central && build) {
    const proof = squaresProof(`their pawns on ${build.squares.join(', ')} have left the centre`, [...build.squares, mv.to]);
    if (!proof) return null;
    return {
      id: 'centre-strike',
      text: `Their pawns have run up the ${build.wing} — the answer to a flank attack is a strike in the centre, and ${sayMoveClause(mv.san, fen)} is it.`,
      idea: `Their pawns have run up the ${build.wing} — answer a flank attack in the centre.`,
      squares: [...build.squares, mv.to], proof, namesMove: true, claim: `kr:centre-strike:${mv.to}`,
    };
  }
  const locked = centreLocked(b);
  if (!central && locked) {
    const wing = 'abc'.includes(mv.to[0]) ? 'queenside' : 'kingside';
    const proof = squaresProof(`the centre pawns on ${locked.join(', ')} are locked`, [...locked, mv.to]);
    if (!proof) return null;
    return {
      id: 'wing-lever',
      text: `The centre is locked, so the play is on the wings — ${sayMoveClause(mv.san, fen)} is the lever on the ${wing}.`,
      idea: 'The centre is locked — the play is on the wings, with a pawn lever.',
      squares: [...locked, mv.to], proof, namesMove: true, claim: `kr:wing-lever:${mv.to}`,
    };
  }
  return null;
}

// ── THE STANDING SACRIFICIAL TARGET ──────────────────────────────────────────

/**
 * A square beside their castled king, holding one of their pawns or pieces,
 * that three or more of your pieces bear on and fewer of theirs defend — and
 * which no plain capture wins (that would be a hanging piece, not a target).
 * It is where a sacrifice may land; said once per square.
 */
export function sacrificeTarget(fen: string, me: Color): KingRead | null {
  const b = load(fen);
  if (!b || b.turn() !== me) return null;
  const them = other(me);
  const k = kingSquare(b, them);
  if (!k || 'de'.includes(k[0])) return null;
  // Beside the king, and the pawn-cover squares two ranks in front of it
  // (h6 / g3 — the classic sacrifice squares).
  const fwd = them === 'b' ? -1 : 1;
  const front = [-1, 0, 1].map((df) => `${FILES[FILES.indexOf(k[0]) + df] ?? ''}${Number(k[1]) + 2 * fwd}`).filter((x) => /^[a-h][1-8]$/.test(x));
  for (const sq of [...kingZone(k), ...front]) {
    if (sq === k) continue;
    const occ = b.get(sq as Square);
    if (!occ || occ.color !== them) continue;
    const att = attackedBy(b, sq, me);
    const def = attackedBy(b, sq, them);
    if (att.length < 3 || def.length >= att.length) continue;
    const plain = b.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
    if (plain.length > 0 && legalSeeGainFor(fen, sq as Square, me) > 0) continue;
    const proof = squaresProof(`${word(att.length)} of your pieces on ${sq} against ${word(def.length)} defenders`, [...att, sq]);
    if (!proof) return null;
    return {
      id: 'sacrifice-target',
      text: `Your pieces converge on ${sq} — ${word(att.length)} of them against ${def.length === 0 ? 'no defender' : `${word(def.length)} of theirs`}, right by their king. That is where a sacrifice may land.`,
      squares: [...att, sq], proof, namesMove: false, claim: `kr:sac-target:${sq}`,
    };
  }
  return null;
}

// ── THE SACRIFICE'S CONDITIONS, IN DEFENCE ───────────────────────────────────

/**
 * Castling short with their bishop on the diagonal to h7 (h2): the bishop
 * sacrifice is PLAYED OUT on the board — bishop takes with check, king takes,
 * their knight checks from g5 (g4) — and the piece the attack needs that they
 * do not have is named. Speaks only when castling is your best move and the
 * sacrifice is legal after it.
 */
export function sacrificeConditions(fen: string, me: Color, bestSan: string | null): KingRead | null {
  if (!bestSan || bestSan.replace(/[+#]/g, '') !== 'O-O') return null;
  const castled = playLine(fen, ['O-O']);
  if (!castled || castled.played.length !== 1) return null;
  const them = other(me);
  const h = me === 'w' ? 'h2' : 'h7';
  const g5 = me === 'w' ? 'g4' : 'g5';
  const kingAfter = me === 'w' ? 'g1' : 'g8';
  const board = castled.board;
  const hPawn = board.get(h as Square);
  if (!hPawn || hPawn.type !== 'p' || hPawn.color !== me) return null;
  const bishop = attackedBy(board, h, them).find((s) => board.get(s)?.type === 'b');
  if (!bishop) return null;
  // Coordinates, so chess.js reads the sacrifice unambiguously.
  const sacLine = playLine(board.fen(), [`${bishop}${h}`]);
  if (!sacLine || sacLine.played.length !== 1 || !sacLine.played[0].san.includes('+')) return null;
  const take = playLine(sacLine.board.fen(), [`${kingAfter}${h}`]);
  if (!take || take.played.length !== 1) return null;
  const afterTake = take.board;
  const knight = afterTake.moves({ verbose: true }).find((m) => m.piece === 'n' && m.to === g5);
  const queenReaches = (bd: Chess): boolean => bd.moves({ verbose: true }).some((m) => m.piece === 'q' && m.to[0] === 'h');
  const line = [sacLine.played[0].san, take.played[0].san];
  let missing: string;
  if (!knight) {
    missing = `no knight of theirs can reach ${g5} to follow it up`;
  } else {
    const chk = playLine(afterTake.fen(), [knight.san]);
    if (!chk || chk.played.length !== 1) return null;
    // Your king steps back to g8 (g1) — the main defence — and their queen
    // must reach the h-file next.
    const back = playLine(chk.board.fen(), [`${h}${kingAfter}`]);
    if (!back || back.played.length !== 1) return null;
    if (queenReaches(back.board)) return null;
    line.push(knight.san, back.played[0].san);
    missing = `their queen can't reach the h-file to join in`;
  }
  const proof = legalLineProof(castled.board.fen(), line, true);
  if (!proof) return null;
  return {
    id: 'sacrifice-conditions',
    text: `Castle — their bishop on ${bishop} eyes ${h}, but the sacrifice there falls short: ${missing}.`,
    idea: `Before you castle into their bishop on ${bishop}, check the sacrifice on ${h}: does it have the knight and the queen to follow?`,
    squares: [bishop, h, g5], proof, namesMove: true, claim: `kr:greek-def:${bishop}`,
    lines: [{ fen: castled.board.fen(), sans: line }],
  };
}

// ── THE KING'S SQUARE, BY THE CHECKS THAT FOLLOW ─────────────────────────────

function checksAfter(fen: string): Move[] {
  const b = load(fen);
  if (!b) return [];
  return b.moves({ verbose: true }).filter((m) => m.san.includes('+'));
}

/**
 * KING TO X, NOT Y: the engine's best move is a king move, another king move
 * was legal, and after that other move they have a check that the best move
 * leaves them without. The check is played on the board (the proof).
 */
export function kingSquareByChecks(fen: string, me: Color, bestSan: string | null): KingRead | null {
  if (!bestSan) return null;
  const b = load(fen);
  if (!b || b.turn() !== me) return null;
  const best = playLine(fen, [bestSan]);
  if (!best || best.played.length !== 1 || best.played[0].piece !== 'k') return null;
  const bm = best.played[0];
  const bestChecks = checksAfter(best.board.fen()).length;
  for (const alt of b.moves({ verbose: true })) {
    if (alt.piece !== 'k' || alt.to === bm.to || alt.san.startsWith('O-O')) continue;
    const a = playLine(fen, [alt.san]);
    if (!a) continue;
    const checks = checksAfter(a.board.fen());
    if (checks.length <= bestChecks) continue;
    const queen = checks.find((c) => c.piece === 'q') ?? checks[0];
    const proof = legalLineProof(fen, [alt.san, queen.san], true);
    if (!proof) return null;
    return {
      id: 'king-square-checks',
      text: `King to ${bm.to}, not ${alt.to} — on ${alt.to} their ${name(queen.piece)} checks on ${queen.to} and wins time.`,
      idea: 'Before the king moves, count the checks it walks into on each square.',
      squares: [bm.to, alt.to, queen.to], proof, namesMove: true, lines: [{ fen, sans: [alt.san, queen.san] }],
    };
  }
  return null;
}

// ── THEIR KING BEHIND YOUR PIECE ─────────────────────────────────────────────

const DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Their king stands on the line of your rook, bishop or queen, and the only
 * thing in between is ONE piece of yours: the king is sheltering behind your
 * own piece. Moving it off the line is check (a discovered check in waiting).
 * Board-true: the slider, the blocker, the king, and a legal move that clears.
 */
export function ownPieceShelter(fen: string, me: Color): KingRead | null {
  const b = load(fen);
  if (!b || b.turn() !== me || b.inCheck()) return null;
  const k = kingSquare(b, other(me));
  if (!k) return null;
  const kf = FILES.indexOf(k[0]);
  const kr = Number(k[1]);
  for (const [df, dr] of DIRS) {
    const diag = df !== 0 && dr !== 0;
    let blocker: { sq: string; type: string } | null = null;
    for (let i = 1; i < 8; i += 1) {
      const f = kf + df * i; const r = kr + dr * i;
      if (f < 0 || f > 7 || r < 1 || r > 8) break;
      const sq = `${FILES[f]}${r}`;
      const p = b.get(sq as Square);
      if (!p) continue;
      if (p.color !== me) break;
      if (!blocker) { blocker = { sq, type: p.type }; continue; }
      const slides = p.type === 'q' || (diag ? p.type === 'b' : p.type === 'r');
      if (!slides) break;
      if (blocker.type === 'k' || blocker.type === 'p') break;
      // A legal move of the blocker that leaves the line.
      const clears = b.moves({ square: blocker.sq as Square, verbose: true }).filter((m) => {
        const mf = FILES.indexOf(m.to[0]) - kf; const mr = Number(m.to[1]) - kr;
        const onLine = (df === 0 ? mf === 0 : dr === 0 ? mr === 0 : mf * dr === mr * df) && Math.sign(mf) === Math.sign(df) && Math.sign(mr) === Math.sign(dr);
        return !onLine;
      });
      if (clears.length === 0) break;
      const lineWord = diag ? 'diagonal' : df === 0 ? `${k[0]}-file` : `${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][kr - 1]} rank`;
      const proof = squaresProof(`your ${name(p.type)} on ${sq}, your ${name(blocker.type)} on ${blocker.sq}, their king on ${k}`, [sq, blocker.sq, k]);
      if (!proof) return null;
      return {
        id: 'own-piece-shelter',
        text: `Their king on ${k} is hiding behind your own ${name(blocker.type)} on ${blocker.sq} — it's on your ${name(p.type)}'s ${lineWord}. Move the ${name(blocker.type)} off the line and it's check.`,
        squares: [sq, blocker.sq, k], proof, namesMove: false, claim: `kr:shelter:${sq}${blocker.sq}${k}`,
      };
    }
  }
  return null;
}

// ── THE KING'S DIAGONAL WALK ─────────────────────────────────────────────────

const dist = (a: string, b2: string): number => Math.max(Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b2[0])), Math.abs(Number(a[1]) - Number(b2[1])));

/**
 * THE DIAGONAL STEP: an ending with no queens, the engine's best move a
 * diagonal king step that brings the king closer BOTH to one of their pawns
 * and to one of yours, where no straight step of the king does both.
 */
export function kingDiagonalWalk(fen: string, me: Color, bestSan: string | null): KingRead | null {
  if (!bestSan) return null;
  const b = load(fen);
  if (!b || b.turn() !== me) return null;
  const cells = b.board().flat().filter((x): x is NonNullable<typeof x> => !!x);
  if (cells.some((x) => x.type === 'q')) return null;
  if (cells.filter((x) => x.type !== 'k' && x.type !== 'p').length > 2) return null;
  const best = playLine(fen, [bestSan]);
  if (!best || best.played.length !== 1 || best.played[0].piece !== 'k') return null;
  const mv = best.played[0];
  if (mv.from[0] === mv.to[0] || mv.from[1] === mv.to[1]) return null;
  const theirs = cells.filter((x) => x.type === 'p' && x.color !== me).map((x) => x.square);
  const mine = cells.filter((x) => x.type === 'p' && x.color === me).map((x) => x.square);
  const straight = b.moves({ verbose: true }).filter((m) => m.piece === 'k' && (m.from[0] === m.to[0] || m.from[1] === m.to[1]));
  for (const t of theirs) for (const o of mine) {
    const d0t = dist(mv.from, t); const d0o = dist(mv.from, o);
    if (d0t <= 1 || d0o <= 1) continue;
    if (!(dist(mv.to, t) < d0t && dist(mv.to, o) < d0o)) continue;
    if (straight.some((s) => dist(s.to, t) < d0t && dist(s.to, o) < d0o)) continue;
    const proof: Proof = {
      kind: 'count', exact: true,
      short: `from ${mv.from} to ${mv.to}, a step nearer ${t} and ${o} at once`,
      full: `your king on ${mv.from} is ${word(d0t)} squares from their pawn on ${t} and ${word(d0o)} from yours on ${o}; on ${mv.to} it is ${word(dist(mv.to, t))} and ${word(dist(mv.to, o))}`,
      squares: [mv.from, mv.to, t, o],
    };
    return {
      id: 'king-diagonal-walk',
      text: `${rot(fen, 'Go diagonally', 'Take the diagonal', 'Walk the king on the diagonal')} — king to ${mv.to} heads for their pawn on ${t} and toward yours on ${o} at the same time. A straight step does only one of those.`,
      idea: 'Walk the king on the diagonal — one step can approach their pawn and support yours at once.',
      squares: [mv.from, mv.to, t, o], proof, namesMove: true,
    };
  }
  return null;
}

// ── THE ATTACK RACE ACROSS WINGS ─────────────────────────────────────────────

/** The live half of `planRace`'s storm race — the one race computer, said in
 *  the present tense on the student's move. Said once per pair of pawns. */
export function stormRace(fen: string, me: Color): KingRead | null {
  const race = detectPlanRace(fen, me);
  if (!race || race.kind !== 'storm-race') return null;
  const clause = planRaceClause(fen, me, 'live');
  const proof = planRaceProof(fen, me);
  if (!clause || !proof) return null;
  return {
    id: 'storm-race', text: `${cap(clause)}.`, squares: [race.yourPawn, race.theirPawn], proof, namesMove: false,
    claim: `kr:storm:${race.yourPawn}${race.theirPawn}`,
  };
}

// ── THE PRODUCER ─────────────────────────────────────────────────────────────

/** Every king read for the side to move. `lines` is the engine's multi-PV
 *  (needed for the mate/no-mate and probing reads); `bestSan` is line one's
 *  first move. Order is his order of thought: mate first, then the king. */
export function kingAttackReads(args: { fen: string; me: Color; lines: Lines }): KingRead[] {
  const bestSan = (() => {
    const u = args.lines[0]?.moves?.[0];
    if (!u) return null;
    const r = playLine(args.fen, [u]);
    return r && r.played.length === 1 ? r.played[0].san : null;
  })();
  const out: Array<KingRead | null> = [];
  const safe = (f: () => KingRead | null): void => { try { out.push(f()); } catch { /* a read is a bonus */ } };
  safe(() => mateOrMaterial(args.fen, args.me, args.lines));
  safe(() => sacrificeConditions(args.fen, args.me, bestSan));
  safe(() => kingSquareByChecks(args.fen, args.me, bestSan));
  safe(() => stopsCastling(args.fen, args.me, bestSan));
  safe(() => lureKing(args.fen, args.me, bestSan));
  safe(() => probingCheck(args.fen, args.me, args.lines));
  safe(() => breakChooser(args.fen, args.me, bestSan));
  safe(() => kingDiagonalWalk(args.fen, args.me, bestSan));
  safe(() => ownPieceShelter(args.fen, args.me));
  safe(() => sacrificeTarget(args.fen, args.me));
  safe(() => ownCastlingBlocked(args.fen, args.me));
  safe(() => stormRace(args.fen, args.me));
  return out.filter((r): r is KingRead => !!r);
}

/** The reads that need only the board and the best move — for review's
 *  retrospective pass, which has the engine's best line but no multi-PV. */
export function kingReadsForBestLine(fen: string, me: Color, bestLineUci: readonly string[]): KingRead[] {
  return kingAttackReads({ fen, me, lines: bestLineUci.length ? [{ moves: bestLineUci, evaluation: 0, mate: null }] : [] })
    // Without the other lines "no mate here" cannot be proven, and the
    // single-line mate read is still exact (played to checkmate on the board).
    .filter((r) => r.id !== 'material-not-mate' && r.id !== 'probing-check');
}
