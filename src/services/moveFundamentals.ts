// moveFundamentals
// ----------------
// The POSITIVE fundamental computer (David 2026-09-06: "the fundamental computer
// needs to be added to all coach surfaces… compute which fundamentals matter
// most. If two are just as important state them both. Fundamental first then the
// rest of teaching.").
//
// For a strong move, it computes WHICH teaching fundamental(s) the move SERVES —
// development, king safety, an outpost, central control, an open file, king
// activity, a passed pawn — ranked by importance on THIS board, and renders them
// WOVEN, fundamental-first. It is the positive counterpart to the mistake-side
// `principleAttribution` (which names the fundamental a bad move BROKE).
//
// G0/G3: it decides nothing — every fundamental has a chess.js board test and
// names only real squares. It is a pure LEAF (chess.js + seeGain + phase only,
// never `groundedAnswer`) so it can be the shared source every coach surface
// pulls from without an import cycle.

import { Chess } from 'chess.js';
import { rotateStem } from '../utils/rotateStem';
import { CENTRAL_SQUARES, CORE_CENTER, keyTargetSquares, kingZoneAmong, kingZoneClause, standingHoles } from './keySquares';
import { andList } from '../utils/andList';
import type { Square } from 'chess.js';
import { landingIsSafe } from './positionReadingService';
import { classifyPhase } from './gamePhaseService';
import type { MisconceptionTagId } from '../data/misconceptionTags';

export type MoveFundamentalId =
  | 'king-safety'
  | 'outpost'
  | 'development'
  | 'center'
  | 'open-file'
  | 'king-activity'
  | 'promotion'
  | 'passed-pawn'
  | 'luft'
  | 'space'
  | 'prophylaxis';

export interface MoveFundamental {
  id: MoveFundamentalId;
  /** Importance on THIS board, 0-100 — higher leads. */
  weight: number;
  /** Verb-first clause to APPEND after an already-named move ("develops into
   *  the game, fighting for the center on d4 and e5"). No piece/square restated. */
  led: string;
  /** Self-contained clause that names the piece ("develops the knight into the
   *  game…") — for standalone use where the move was not already spoken. */
  selfContained: string;
  /** Imperative plan clause ("develop into the game and fight for the center…")
   *  — for the ranked briefing ("The plan here: …"). Never names the SAN, so it
   *  teaches the idea without handing over the move on a live board. */
  imperative: string;
  /** Board squares the clause references (arrows / highlights). */
  squares: string[];
}

/**
 * 🔗 THE POSITIVE HALF FILES UNDER THE SAME HOLES AS THE NEGATIVE HALF
 * (2026-09-17, the computer-unification map — docs/plans/2026-09-17-computer-unification.md).
 *
 * The app carried TWO fundamentals vocabularies and they never reconciled:
 *   • NEGATIVE — `FundamentalId` in principleAttribution, 33 members, each
 *     mapped to a `MisconceptionTagId` by `FUNDAMENTAL_TAG`, feeding the
 *     weakness spine, the drills and the need score.
 *   • POSITIVE — `MoveFundamentalId` here, 10 members, mapped to NOTHING. The
 *     type appeared in exactly one file: this one.
 *
 * So the coach could name what a student did WRONG at 33 levels of resolution
 * and what they did RIGHT at one — all ten positives collapse into the single
 * `ClauseKind` 'fundamental'. And playing the thing correctly was never
 * recorded against the matching hole, so a student who had FIXED a weakness got
 * no evidence of it in their own model.
 *
 * This is the rot rule at the top of CLAUDE.md (two vocabularies that mean the
 * same thing and never reconcile — `TacticPatternType discovery` vs
 * `TacticType discovered_attack`), applied to the axis the coach uses most.
 *
 * A `Record` over the union, so a NEW positive fundamental fails to compile
 * until someone decides where it files. `null` is an HONEST answer and not a
 * placeholder: not every strength has a matching hole in the tag set, and
 * inventing one would be fabricated data (G3). Two are null today and that is
 * the correct count, not a backlog.
 */
export const MOVE_FUNDAMENTAL_TAG: Record<MoveFundamentalId, MisconceptionTagId | null> = {
  development: 'neglected-development',
  'king-safety': 'weakened-king-safety',
  space: 'space-conceded',
  // A promotion is a THING DONE, not a habit neglected — there is no
  // misconception to file it under. Honest null (CLAUDE.md: empty > invented).
  promotion: null,
  'passed-pawn': 'passed-pawn-neglected',
  'king-activity': 'passive-king-endgame',
  'open-file': 'passive-rook',
  prophylaxis: 'missed-opponents-threat',
  outpost: 'misplaced-piece',
  // No tag names "ceded the centre" — `space-conceded` is the space axis, not
  // the centre one, and mapping here would file centre evidence under space.
  center: null,
  // Making luft is not the inverse of any hole we track.
  luft: null,
};

const PIECE_NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
/** The squares "fighting for the center" is allowed to name — Q1, occupation.
 *  The Q2 set (what a piece EYES) is `keyTargetSquares`; see keySquares.ts. */
const CENTER: readonly string[] = [...CENTRAL_SQUARES];

function fileOf(sq: string): string { return sq[0]; }
function rankOf(sq: string): number { return Number(sq[1]); }
/** Rank from the mover's own side: 1 = back rank, 8 = far rank. */
function relRank(sq: string, color: 'w' | 'b'): number {
  return color === 'w' ? rankOf(sq) : 9 - rankOf(sq);
}

/** No enemy pawn can ever advance to attack `sq` — the classic outpost test. */
function isOutpost(board: Chess, sq: string, mover: 'w' | 'b'): boolean {
  const file = sq.charCodeAt(0);
  const rank = rankOf(sq);
  const enemy = mover === 'w' ? 'b' : 'w';
  const attackRank = mover === 'w' ? rank + 1 : rank - 1;
  if (attackRank < 1 || attackRank > 8) return false;
  for (const df of [-1, 1]) {
    const f = file + df;
    if (f < 97 || f > 104) continue;
    const adjFile = String.fromCharCode(f);
    for (let r = 1; r <= 8; r += 1) {
      const p = board.get(`${adjFile}${r}` as Square);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      const canReach = enemy === 'w' ? r <= attackRank : r >= attackRank;
      if (canReach) return false;
    }
  }
  return true;
}

/** Central squares the piece on `to` now attacks (from the after-move board). */
function eyesCenter(after: Chess, to: string, mover: 'w' | 'b'): string[] {
  // Q2 — the centre AND the squares beside their king. Filtering the Q1 list
  // here is why `Bc4` could never be said to look at f7.
  return keyTargetSquares(after, mover === 'w' ? 'white' : 'black').filter((s) => {
    try { return after.attackers(s as Square, mover).includes(to as Square); }
    catch { return false; }
  });
}

/** Is the pawn on `to` passed on the after-move board? No enemy pawn on the
 *  same or adjacent file ahead of it. */
function isPassedPawn(after: Chess, to: string, mover: 'w' | 'b'): boolean {
  const enemy = mover === 'w' ? 'b' : 'w';
  const file = to.charCodeAt(0);
  const rank = rankOf(to);
  for (const df of [-1, 0, 1]) {
    const f = file + df;
    if (f < 97 || f > 104) continue;
    const adjFile = String.fromCharCode(f);
    for (let r = 1; r <= 8; r += 1) {
      const p = after.get(`${adjFile}${r}` as Square);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      const ahead = mover === 'w' ? r > rank : r < rank;
      if (ahead) return false;
    }
  }
  return true;
}

/** The file has no FRIENDLY pawns (half-open); open when neither side has one. */
function fileOpenness(after: Chess, file: string, mover: 'w' | 'b'): 'open' | 'half-open' | null {
  let friendly = 0;
  let enemy = 0;
  for (let r = 1; r <= 8; r += 1) {
    const p = after.get(`${file}${r}` as Square);
    if (!p || p.type !== 'p') continue;
    if (p.color === mover) friendly += 1; else enemy += 1;
  }
  if (friendly > 0) return null;
  return enemy === 0 ? 'open' : 'half-open';
}

/** The square the mover's king stands on, or null. */
function kingSquare(board: Chess, mover: 'w' | 'b'): string | null {
  for (const row of board.board()) {
    for (const p of row) { if (p && p.type === 'k' && p.color === mover) return p.square; }
  }
  return null;
}

/** The two diagonal-forward squares a pawn on `sq` attacks, for `mover`. */
function pawnAttackSquares(sq: string, mover: 'w' | 'b'): string[] {
  const file = sq.charCodeAt(0);
  const rank = rankOf(sq);
  const fwd = mover === 'w' ? rank + 1 : rank - 1;
  if (fwd < 1 || fwd > 8) return [];
  const out: string[] = [];
  for (const df of [-1, 1]) {
    const f = file + df;
    if (f >= 97 && f <= 104) out.push(`${String.fromCharCode(f)}${fwd}`);
  }
  return out;
}

function countHomeMinors(board: Chess, mover: 'w' | 'b'): number {
  const home: Square[] = mover === 'w'
    ? (['b1', 'g1', 'c1', 'f1'] as Square[])
    : (['b8', 'g8', 'c8', 'f8'] as Square[]);
  let n = 0;
  for (const sq of home) {
    const p = board.get(sq);
    if (p && p.color === mover && (p.type === 'n' || p.type === 'b')) n += 1;
  }
  return n;
}

/**
 * computeMoveFundamentals — every fundamental the move serves, board-verified,
 * sorted most-important first. Empty when the move has no positive point worth
 * naming (a routine shuffle) OR the piece simply hangs on its square (the
 * recapture-safety guard, mirroring the old quietPurposePhrase).
 */
export function computeMoveFundamentals(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): MoveFundamental[] {
  const mover: 'w' | 'b' = moverColor === 'white' ? 'w' : 'b';
  let after: Chess;
  let mv: ReturnType<Chess['move']>;
  try {
    after = new Chess(fenBefore);
    mv = after.move(moveSan);
  } catch { return []; }
  if (!mv) return [];

  // Recapture-safety: never dress a piece that HANGS on its landing square as a
  // positional gain (a rook that "eyes the center" but drops to a queen is not a
  // merit). Castling / passed-pawn pushes clear this trivially.
  if (!landingIsSafe(after.fen(), mv.to)) return [];

  const moveNumber = Number(fenBefore.split(' ')[5]) || 1;
  const phase = classifyPhase(fenBefore, moveNumber);
  const out: MoveFundamental[] = [];

  // ── KING SAFETY — castling. The one move that both tucks the king away and
  //    activates a rook; in the opening/middlegame it is usually the priority.
  if (mv.san === 'O-O' || mv.san === 'O-O-O') {
    const kingTo = mv.san === 'O-O' ? (mover === 'w' ? 'g1' : 'g8') : (mover === 'w' ? 'c1' : 'c8');
    const rookTo = mv.san === 'O-O' ? (mover === 'w' ? 'f1' : 'f8') : (mover === 'w' ? 'd1' : 'd8');
    out.push({
      id: 'king-safety',
      weight: phase === 'endgame' ? 45 : 92,
      led: 'castles your king into safety and swings the rook toward the center',
      selfContained: 'castling gets your king to safety and brings the rook toward the center',
      imperative: 'castle your king to safety and bring the rook toward the center',
      squares: [kingTo, rookTo],
    });
  }

  // ── OUTPOST — a minor planted where no enemy pawn can ever evict it.
  if ((mv.piece === 'n' || mv.piece === 'b') && relRank(mv.to, mover) >= 5 && isOutpost(after, mv.to, mover)) {
    const name = PIECE_NAME[mv.piece];
    out.push({
      id: 'outpost',
      weight: 84,
      led: `lands on the ${mv.to} outpost, a square none of their pawns can attack`,
      selfContained: `plants the ${name} on the ${mv.to} outpost, where no pawn can challenge it`,
      imperative: `plant the ${name} on the ${mv.to} outpost, where no pawn can challenge it`,
      squares: [mv.to],
    });
  }

  // ── DEVELOPMENT — a minor coming off its home rank into the game. Weight
  //    scales with how much is still undeveloped: the more pieces at home, the
  //    more urgent development is.
  const homeRank = mover === 'w' ? 1 : 8;
  if ((mv.piece === 'n' || mv.piece === 'b') && rankOf(mv.from) === homeRank && !out.some((f) => f.id === 'outpost')) {
    const name = PIECE_NAME[mv.piece];
    // NO SLICE (G4.5). This was `.filter(CORE_CENTER).slice(0, 2)` — two
    // truncations stacked: the narrow four-square centre, then a hard cap of
    // two. Between them the f7 a developing bishop stares at could not survive
    // even once it was computed.
    const eyes = eyesCenter(after, mv.to, mover);
    const seat = mover === 'w' ? 'white' as const : 'black' as const;
    const nearKing = kingZoneAmong(eyes, after, seat);
    // "fighting for the center on <list>" may only list CENTRAL squares — a
    // hole or a king-zone square in that list makes the sentence false, which
    // is the same defect the 2026-07-22 wing-pawn fix removed. Each kind of
    // square gets the clause that is true of it.
    const central = eyes.filter((s) => CENTRAL_SQUARES.includes(s));
    // "leaning on e6", not "the hole on e6" — at move three Black's e-pawn is
    // still home, so e6 is an empty square, not yet a hole. Say what is true.
    const holes = eyes.filter((s) => standingHoles(seat).includes(s) && !nearKing.includes(s));
    const homeAfter = countHomeMinors(after, mover);
    const weight = Math.min(82, 55 + 6 * (homeAfter + 1));
    const centerTail = (central.length ? `, fighting for the center on ${andList(central)}` : '')
      + (holes.length ? `, leaning on ${andList(holes)}` : '')
      + kingZoneClause(nearKing);
    out.push({
      id: 'development',
      weight,
      led: `develops into the game${centerTail}`,
      selfContained: `develops the ${name} into the game${centerTail}`,
      imperative: `develop into the game${centerTail}`,
      squares: [mv.to, ...eyes],
    });
  }

  // ── CENTER — a central pawn advance (space), or a piece already in play newly
  //    contesting the core center. (A developing minor already carries the
  //    center in its own clause above, so it does not double-count here.)
  if (mv.piece === 'p' && CENTER.includes(mv.to) && relRank(mv.to, mover) >= 4) {
    out.push({
      id: 'center',
      weight: 66,
      led: `stakes out the center and grabs space`,
      selfContained: `stakes out the center with the pawn to ${mv.to}`,
      imperative: `stake out the center and grab space with the pawn to ${mv.to}`,
      squares: [mv.to],
    });
  } else if (mv.piece === 'p' && relRank(mv.to, mover) <= 3) {
    // SUPPORT the center — a quiet pawn move in your own half (c3 / e3 / d3)
    // whose pawn now GUARDS a core central square, preparing the push (2.c3 in
    // the French guards d4). Caught live by the prod hint audit 2026-09-06: the
    // coach had no why for c3 and fell to the bare "that's the strongest move".
    // A wing pawn (a3 guards only b4) never qualifies — b4 is not the center.
    // OPENS A BISHOP (hand walk 2026-09-24: Naroditsky's d3 is "the modest d3,
    // opening the bishop"; the coach said only "d3 guards e4" — true and not
    // the point). A home-square bishop whose squares grow by ≥2 when this pawn
    // steps off its diagonal has just been developed by the pawn move.
    const freed = bishopFreedBy(new Chess(fenBefore), after, mover, mv.from);
    if (freed) {
      // g2/b2 (g7/b7) vacated = the fianchetto square: "g3 — preparing to
      // fianchetto" is how he names it.
      const fianchetto = ['g2', 'b2', 'g7', 'b7'].includes(mv.from) ? mv.from : null;
      out.push({
        id: 'development',
        weight: 60,
        led: fianchetto
          ? `prepares to fianchetto the bishop to ${fianchetto}`
          : `opens the diagonal for the bishop on ${freed}`,
        selfContained: fianchetto
          ? `prepares to fianchetto the bishop to ${fianchetto} with the pawn to ${mv.to}`
          : `opens the diagonal for the bishop on ${freed} with the pawn to ${mv.to}`,
        imperative: fianchetto
          ? `fianchetto the bishop to ${fianchetto}`
          : `open the diagonal for the bishop on ${freed}`,
        squares: fianchetto ? [mv.to, fianchetto] : [mv.to, freed],
      });
    }
    const guards = eyesCenter(after, mv.to, mover).filter((s) => CORE_CENTER.includes(s));
    if (guards.length > 0) {
      const g = andList(guards); // no slice (G4.5) — CORE_CENTER is four squares
      out.push({
        id: 'center',
        weight: 55,
        led: `supports the center, guarding ${g}`,
        selfContained: `supports the center with the pawn to ${mv.to}, guarding ${g}`,
        imperative: `support the center — the pawn to ${mv.to} guards ${g}`,
        squares: [mv.to, ...guards],
      });
    }
  } else if (mv.piece !== 'p' && mv.piece !== 'k' && rankOf(mv.from) !== homeRank && !out.some((f) => f.id === 'development' || f.id === 'outpost')) {
    const eyes = eyesCenter(after, mv.to, mover).filter((s) => CORE_CENTER.includes(s));
    if (eyes.length >= 2) { // a THRESHOLD, not a cap — two core squares is the bar
      out.push({
        id: 'center',
        weight: 52,
        led: `takes aim at the center, hitting ${eyes.join(' and ')}`,
        selfContained: `repositions the ${PIECE_NAME[mv.piece]} to take aim at ${eyes.join(' and ')}`,
        imperative: `take aim at the center, hitting ${eyes.join(' and ')}`,
        squares: [mv.to, ...eyes],
      });
    }
  }

  // ── OPEN FILE — a rook (or queen) onto an open / half-open file: the file
  //    where a rook belongs.
  if (mv.piece === 'r' || mv.piece === 'q') {
    const openness = fileOpenness(after, fileOf(mv.to), mover);
    if (openness) {
      const name = PIECE_NAME[mv.piece];
      const fileName = `${fileOf(mv.to)}-file`;
      out.push({
        id: 'open-file',
        weight: phase === 'endgame' ? 60 : 72,
        led: `takes the ${openness} ${fileName}, where the ${name} belongs`,
        selfContained: `brings the ${name} to the ${openness} ${fileName}`,
        imperative: `take the ${openness} ${fileName}, where the ${name} belongs`,
        squares: [mv.to],
      });
    }
  }

  // ── KING ACTIVITY — in the endgame the king is a fighting piece. A king step
  //    toward the center (higher relative rank, or toward the d/e files).
  if (mv.piece === 'k' && phase === 'endgame') {
    const towardCentreRank = relRank(mv.to, mover) > relRank(mv.from, mover);
    const centreFileDist = (sq: string) => Math.min(Math.abs(sq.charCodeAt(0) - 100), Math.abs(sq.charCodeAt(0) - 101)); // dist to d/e
    const towardCentreFile = centreFileDist(mv.to) < centreFileDist(mv.from);
    if (towardCentreRank || towardCentreFile) {
      out.push({
        id: 'king-activity',
        weight: 88,
        led: `marches your king toward the center, where it fights in the endgame`,
        selfContained: `activates the king toward the center, a fighting piece in the endgame`,
        imperative: `march your king toward the center — in the endgame it is a fighting piece`,
        squares: [mv.to],
      });
    }
  }

  // ── PROMOTION — the most consequential thing a pawn can do (prod, 2026-09-13).
  //
  // A user pushed to h8 and heard the SAME sentence as the move before it:
  //   "Your pawn to h7 — pushes your passed pawn — passed pawns must be pushed."
  //   "Your pawn to h8 — pushes your passed pawn — passed pawns must be pushed."
  // h8 is a PROMOTION. This file had zero promotion handling, so an 8th-rank
  // arrival fell into the passed-pawn branch below and the coach narrated a new
  // queen as a pawn push.
  //
  // Weight 90 — above every other fundamental here, because nothing a pawn does
  // outranks becoming a queen. Emitted BEFORE passed-pawn so it leads, and the
  // passed-pawn branch is skipped on the same move (both would be about the
  // same pawn, and the promotion is the better statement of it).
  const promotedTo = mv.promotion
    ? ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' } as const)[mv.promotion as 'q' | 'r' | 'b' | 'n']
    : null;
  if (promotedTo) {
    out.push({
      id: 'promotion',
      weight: 90,
      led: promotedTo === 'queen'
        ? `promotes — your pawn is a queen now`
        : `promotes to a ${promotedTo} — underpromotion, chosen on purpose`,
      selfContained: `promotes on ${mv.to} — the pawn becomes a ${promotedTo}`,
      imperative: `push it through and promote`,
      squares: [mv.to],
    });
  }

  // ── PASSED PAWN — push a passer; passed pawns must be pushed. Only once the
  //    passer is actually ADVANCED (past its own half) — a first nudge from the
  //    2nd/3rd rank while rooks are still on isn't yet the "push the passer"
  //    moment, and calling it one is noise.
  if (!promotedTo && mv.piece === 'p' && relRank(mv.to, mover) >= 4 && isPassedPawn(after, mv.to, mover)) {
    out.push({
      id: 'passed-pawn',
      weight: phase === 'endgame' ? 84 : 62,
      led: `pushes your passed pawn — passed pawns must be pushed`,
      selfContained: `pushes the passed pawn to ${mv.to} — passed pawns must be pushed`,
      imperative: `push your passed pawn — passed pawns must be pushed`,
      squares: [mv.to],
    });
  }

  // ── PROPHYLAXIS — a quiet pawn push that DENIES an enemy minor an active
  //    square (h3 taking g4 from a bishop/knight). Strictly verified: an enemy
  //    minor must actually be able to reach the newly-guarded square (else the
  //    claim is invented — the Italian's h3 is LUFT, not "stops …Bg4", because
  //    no black minor can reach g4). Only a square deep in the mover's half
  //    (relRank ≥ 5 for the enemy) counts as a real incursion square.
  const enemy: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  if (mv.piece === 'p' && !mv.captured) {
    for (const s of pawnAttackSquares(mv.to, mover)) {
      if (after.get(s as Square)) continue; // occupied — not a denied empty square
      if (relRank(s, enemy) < 5) continue;  // not deep enough in our half to matter
      let deniers: Array<'n' | 'b'> = [];
      try {
        const b = new Chess(fenBefore);
        deniers = b
          .attackers(s as Square, enemy)
          .map((sq) => b.get(sq)?.type)
          .filter((t): t is 'n' | 'b' => t === 'n' || t === 'b');
      } catch { deniers = []; }
      if (deniers.length > 0) {
        const pieceName = PIECE_NAME[deniers[0]];
        out.push({
          id: 'prophylaxis',
          weight: 50,
          led: `takes the ${s} square away from their ${pieceName}`,
          selfContained: `plays ${mv.to}, denying their ${pieceName} the ${s} square`,
          imperative: `deny their ${pieceName} the ${s} square`,
          squares: [mv.to, s],
        });
        break; // one denial clause is enough
      }
    }
  }

  // ── LUFT — a pawn step in front of the CASTLED king that opens a flight
  //    square off the back rank (guards against the back-rank mate). Verified:
  //    the king sits on its castled square and this pawn shields it.
  if (mv.piece === 'p' && !mv.captured && !out.some((f) => f.id === 'prophylaxis')) {
    const kSq = kingSquare(after, mover);
    const backRank = mover === 'w' ? 1 : 8;
    const kingside = kSq === (mover === 'w' ? 'g1' : 'g8');
    const queenside = kSq === (mover === 'w' ? 'c1' : 'c8') || kSq === (mover === 'w' ? 'b1' : 'b8');
    const shieldFiles = kingside ? ['g', 'h'] : queenside ? ['a', 'b'] : [];
    if (
      kSq && rankOf(kSq) === backRank && shieldFiles.includes(fileOf(mv.to))
      && relRank(mv.to, mover) === 3 && relRank(mv.from, mover) === 2
    ) {
      out.push({
        id: 'luft',
        weight: 46,
        led: `gives your king luft — a flight square off the back rank`,
        selfContained: `makes luft with ${mv.to}, a flight square for the king off the back rank`,
        imperative: `make luft — give your king a flight square off the back rank`,
        squares: [mv.to, kSq],
      });
    }
  }

  // ── SPACE — a wing pawn advanced past the middle (b4 / a4 / h4 …), grabbing
  //    space on that flank. Center pawns and passers are already named above;
  //    this catches the flank space-grab that otherwise had no "why".
  if (
    mv.piece === 'p' && !mv.captured && relRank(mv.to, mover) >= 4
    && !CENTER.includes(mv.to)
    && !out.some((f) => f.id === 'passed-pawn' || f.id === 'center' || f.id === 'prophylaxis')
  ) {
    const file = fileOf(mv.to);
    const side = ('ab'.includes(file)) ? 'queenside' : ('gh'.includes(file)) ? 'kingside' : null;
    if (side) {
      out.push({
        id: 'space',
        weight: 48,
        led: `grabs space on the ${side}`,
        selfContained: `advances ${mv.to}, grabbing space on the ${side}`,
        imperative: `grab space on the ${side} with ${mv.to}`,
        squares: [mv.to],
      });
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/**
 * pickLeadingFundamentals — the top fundamental, plus a co-leader only when it
 * is nearly as important (within 12 weight AND ≥ 55). David: "if two are just
 * as important state them both."
 */
export function pickLeadingFundamentals(funds: readonly MoveFundamental[]): MoveFundamental[] {
  if (funds.length === 0) return [];
  const top = funds[0];
  const lead = [top];
  const second = funds[1];
  if (second && second.id !== top.id && second.weight >= 55 && top.weight - second.weight <= 12) {
    lead.push(second);
  }
  return lead;
}

/**
 * The LEADING fundamentals as STRUCTURE — ids, weights, squares and all three
 * registers.
 *
 * 🚨 Why this is exported. `renderStrategic` below computes exactly this and
 * then joins it into one string, so every consumer of this module received
 * `string | null` and the `id` never crossed the module boundary. That is how
 * the positive half came to file under nothing: not because the mapping was
 * missing, but because the thing to map was destroyed on the way out.
 *
 * It is the same defect as comparing rendered prose to decide a plan's identity
 * (planMemory, fixed 2026-09-17) and as a plan that computes a square and says
 * "a square". A caller that wants prose still calls `strategicWhy*`; a caller
 * that wants to RECORD what the student got right calls this.
 */
export function leadingFundamentals(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): MoveFundamental[] {
  return pickLeadingFundamentals(computeMoveFundamentals(fenBefore, moveSan, moverColor));
}

/** Woven, fundamental-first render of the leading fundamental(s). `form` picks
 *  the led clause (append after an already-named move) or the self-contained
 *  clause (names the piece). Returns null when nothing fires. */
function renderStrategic(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
  form: 'led' | 'selfContained' | 'imperative',
): string | null {
  const lead = leadingFundamentals(fenBefore, moveSan, moverColor);
  if (lead.length === 0) return null;
  return lead.map((f) => f[form]).join(', and ');
}

/** The LED positional clause (verb-first) — for a surface that has ALREADY named
 *  the move, e.g. the hint ("Your knight to f3 — {this}"). Null when quiet. */
export function strategicWhyLed(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): string | null {
  return renderStrategic(fenBefore, moveSan, moverColor, 'led');
}

/** The SELF-CONTAINED positional clause (names the piece) — for standalone use,
 *  e.g. review ("the best move was Nf3 — it {this}"). Null when quiet. */
export function strategicWhySelfContained(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): string | null {
  return renderStrategic(fenBefore, moveSan, moverColor, 'selfContained');
}

/** The IMPERATIVE plan clause (never names the SAN) — for the ranked DNA briefing
 *  ("The plan here: {this}"). Teaches the idea without handing over the move on a
 *  live board. Null when the move has no fundamental worth naming. */
export function strategicWhyImperative(
  fenBefore: string,
  moveSan: string,
  moverColor: 'white' | 'black',
): string | null {
  return renderStrategic(fenBefore, moveSan, moverColor, 'imperative');
}

/** A principle taught once per game on a quiet student opening ply (S2): the
 *  move, and the rule it follows. The rule is the board's own imperative clause
 *  (`computeMoveFundamentals`), so nothing here is asserted without proof. */
export function principleOnceLine(
  san: string,
  f: Pick<MoveFundamental, 'imperative'>,
  /** Rotation key — required, stable about the moment (`stemKeyOf` of the
   *  board the move was played from). Only the wrapper rotates. */
  stemKey: number,
): string {
  return rotateStem([
    `${san} follows a principle worth keeping: ${f.imperative}.`,
    `The principle behind ${san}: ${f.imperative}.`,
    `${san} does what the opening asks — ${f.imperative}.`,
    `There's a rule behind ${san}: ${f.imperative}.`,
  ], stemKey);
}

/** Which positive fundamentals are opening PRINCIPLES a beginner is taught.
 *  Space grabs with a flank pawn and prophylaxis are real fundamentals but not
 *  rules to follow on every move — "grab space with h5" is not a principle. A
 *  `Record` so a new fundamental fails to compile until someone answers. */
const IS_OPENING_PRINCIPLE: Record<MoveFundamental['id'], boolean> = {
  development: true,
  center: true,
  'king-safety': true,
  outpost: true,
  'open-file': true,
  'king-activity': false,
  promotion: false,
  'passed-pawn': false,
  luft: false,
  space: false,
  prophylaxis: false,
};

/** The first opening principle this move follows that has not been taught
 *  yet this game, or null. */
export function principleToTeach(
  fenBefore: string, san: string, mover: 'white' | 'black', taught: ReadonlySet<string>,
): MoveFundamental | null {
  return computeMoveFundamentals(fenBefore, san, mover)
    .find((f) => IS_OPENING_PRINCIPLE[f.id] && !taught.has(f.id)) ?? null;
}

/** The home-square bishop (c1/f1 or c8/f8) whose MOVES grew by at least two
 *  because a pawn left `vacated` — counted from the board, never assumed. */
function bishopFreedBy(before: Chess, after: Chess, mover: 'w' | 'b', vacated: string): string | null {
  const homes = mover === 'w' ? ['c1', 'f1'] : ['c8', 'f8'];
  const count = (board: Chess, sq: string): number => {
    try {
      const parts = board.fen().split(' ');
      parts[1] = mover; parts[3] = '-';
      return new Chess(parts.join(' ')).moves({ square: sq as Square, verbose: true }).length;
    } catch { return 0; }
  };
  for (const home of homes) {
    const p = after.get(home as Square);
    if (!p || p.type !== 'b' || p.color !== mover) continue;
    // the vacated square must sit on one of the bishop's diagonals
    const df = Math.abs(home.charCodeAt(0) - vacated.charCodeAt(0));
    const dr = Math.abs(Number(home[1]) - Number(vacated[1]));
    if (df !== dr || df === 0) continue;
    if (count(after, home) - count(before, home) >= 2) return home;
  }
  return null;
}
