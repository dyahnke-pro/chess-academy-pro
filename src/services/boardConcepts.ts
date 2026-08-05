// boardConcepts — what a position IS, computed from the board.
//
// The concept tier holds teaching that belongs to no opening: king activity in
// endgames, when a trade helps, how to punish a structural weakness. To reach
// it, something has to say which ideas the position in front of the student is
// actually about — and that something must be CODE (G0). The model never picks
// the tags; it only phrases the note the tags selected.
//
// Deliberately conservative. A tag is emitted only when the board plainly shows
// it, because the cost of a wrong tag is a generic principle delivered as if it
// were about this position — the same failure that put endgame platitudes under
// a Caro-Kann label. Silence is a valid answer here (the narration rules say so
// outright), so an unremarkable middlegame yields few tags or none, and the
// caller falls through rather than reaching for filler.

import { Chess } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { countMaterial, ENDGAME_MATERIAL_THRESHOLD } from './gamePhaseService';
import {
  hasCastled,
  rooksConnected,
  countDevelopedMinors,
  hasMajorPieceCaptured,
} from './phaseTransitionDetector';

export type Phase = 'opening' | 'middlegame' | 'endgame';

export interface BoardConcepts {
  phase: Phase;
  concepts: string[];
}

type Sq = { type: string; color: 'w' | 'b'; square: string };

const pieces = (chess: Chess): Sq[] => {
  const out: Sq[] = [];
  for (const row of chess.board()) {
    for (const p of row) if (p) out.push({ type: p.type, color: p.color, square: p.square });
  }
  return out;
};

const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]);

/** THE phase rule, and deliberately the SAME signals the coach speaks aloud
 *  (David 2026-08-05: "middle game when castled and rooks connected, endgame
 *  when the queens or both rooks, or all minor pieces and a rook come off").
 *
 *  This used to be a private material count — endgame at ≤6 pieces with no
 *  queens, opening while ≥13 remained. That made a THIRD phase definition in a
 *  codebase that already had two, and it disagreed with the one the student
 *  hears: at move 20, both sides castled, one piece traded,
 *  `detectPhaseTransition` has already announced the middlegame while this
 *  still said "opening" — so a middlegame-tagged note was rejected at exactly
 *  the position the coach had just called a middlegame.
 *
 *  Reuses the detector's own pure helpers rather than restating its rules, so
 *  the two cannot drift. The full ledger-driven detector stays where it is;
 *  this is the stateless read of the same board facts. */
function phaseOfBoard(fen: string): Phase {
  // ENDGAME first: material is the reliable signal and must outrank any
  // development rule — a queenless rook ending is an ending however it arose.
  if (countMaterial(fen) <= ENDGAME_MATERIAL_THRESHOLD) return 'endgame';
  const developed = countDevelopedMinors(fen);
  const castledAndConnected = (['white', 'black'] as const)
    .some((c) => hasCastled(fen, c) && rooksConnected(fen, c));
  if (castledAndConnected
    || (developed.white >= 3 && developed.black >= 3)
    || hasMajorPieceCaptured(fen)) return 'middlegame';
  return 'opening';
}

/** Files with no pawn of the given colour — where a rook belongs. */
function openFilesFor(all: Sq[], color: 'w' | 'b'): Set<number> {
  const mine = new Set(all.filter((p) => p.type === 'p' && p.color === color).map((p) => fileOf(p.square)));
  const out = new Set<number>();
  for (let f = 0; f < 8; f += 1) if (!mine.has(f)) out.add(f);
  return out;
}

/** An isolated pawn on a CENTRAL file — the isolated queen's pawn the corpus
 *  actually teaches. Measured first without the central restriction: some pawn
 *  somewhere is isolated or doubled in almost every real position, so the tag
 *  fired on 10,831 of 13,397 plies and meant nothing. A tag that is always true
 *  is a platitude with a lookup key. */
function hasIsolatedCentralPawn(all: Sq[], color: 'w' | 'b'): boolean {
  const mine = all.filter((p) => p.type === 'p' && p.color === color);
  const files = new Set(mine.map((p) => fileOf(p.square)));
  return mine.some((p) => {
    const f = fileOf(p.square);
    if (f < 2 || f > 5) return false; // c- through f-file
    return !files.has(f - 1) && !files.has(f + 1);
  });
}

/** Doubled pawns on a file the OPPONENT has no pawn on — the weakness that can
 *  actually be attacked down the file, rather than every recapture in chess. */
function hasExposedDoubledPawn(all: Sq[], color: 'w' | 'b'): boolean {
  const counts = new Map<number, number>();
  for (const p of all) {
    if (p.type !== 'p' || p.color !== color) continue;
    const f = fileOf(p.square);
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const theirFiles = new Set(
    all.filter((p) => p.type === 'p' && p.color !== color).map((p) => fileOf(p.square)),
  );
  for (const [f, n] of counts) if (n >= 2 && !theirFiles.has(f)) return true;
  return false;
}

/** A knight sitting on a square a friendly pawn defends and no enemy pawn can
 *  ever attack — the textbook outpost, and one the corpus teaches by name. */
function hasKnightOutpost(all: Sq[], color: 'w' | 'b'): boolean {
  const dir = color === 'w' ? 1 : -1;
  const myPawns = all.filter((p) => p.type === 'p' && p.color === color);
  const theirPawns = all.filter((p) => p.type === 'p' && p.color !== color);
  return all.some((n) => {
    if (n.type !== 'n' || n.color !== color) return false;
    const f = fileOf(n.square);
    const r = rankOf(n.square);
    // In enemy territory, or it is not an outpost worth the name.
    if (color === 'w' ? r < 4 : r > 5) return false;
    const defended = myPawns.some((p) => Math.abs(fileOf(p.square) - f) === 1 && rankOf(p.square) === r - dir);
    if (!defended) return false;
    // No enemy pawn on an adjacent file can still advance to challenge it.
    const challengeable = theirPawns.some((p) => {
      const pf = fileOf(p.square);
      const pr = rankOf(p.square);
      if (Math.abs(pf - f) !== 1) return false;
      return color === 'w' ? pr > r : pr < r;
    });
    return !challengeable;
  });
}

/** Two or more pawns pushed up the flank the enemy king is castled on. */
function hasPawnStorm(all: Sq[], color: 'w' | 'b'): boolean {
  const king = all.find((p) => p.type === 'k' && p.color !== color);
  if (!king) return false;
  const kf = fileOf(king.square);
  // Only a flank king is being stormed; a central king is a different idea.
  if (kf >= 2 && kf <= 5) return false;
  const advanced = all.filter((p) => {
    if (p.type !== 'p' || p.color !== color) return false;
    if (Math.abs(fileOf(p.square) - kf) > 2) return false;
    const r = rankOf(p.square);
    return color === 'w' ? r >= 4 : r <= 5;
  });
  return advanced.length >= 2;
}

/** The king's own pawn shield, gone or going. */
function kingIsExposed(all: Sq[], color: 'w' | 'b'): boolean {
  const king = all.find((p) => p.type === 'k' && p.color === color);
  if (!king) return false;
  const kf = fileOf(king.square);
  const kr = rankOf(king.square);
  const homeRank = color === 'w' ? 1 : 8;
  // Only judge a king that has settled on its back rank — a king walking in an
  // endgame is `king-activity`, a different (and good) idea.
  if (kr !== homeRank) return false;
  const shield = all.filter((p) => {
    if (p.type !== 'p' || p.color !== color) return false;
    return Math.abs(fileOf(p.square) - kf) <= 1;
  });
  // Enemy heavy pieces still on, and fewer than two shield pawns left.
  const enemyHeavies = all.filter((p) => p.color !== color && (p.type === 'q' || p.type === 'r')).length;
  return shield.length < 2 && enemyHeavies > 0;
}

/** When a passed pawn is worth naming, which depends on the phase.
 *
 *  In an ENDGAME any passed pawn is the story — in a king-and-pawn ending it is
 *  frequently the entire content, which is why `boardConcepts.test` pins a c4
 *  passer as notable. In a MIDDLEGAME, with pieces everywhere, a pawn is only a
 *  theme once it is actually running; flagging every technically-passed pawn
 *  there fired on 26% of plies and taught nothing. */
function hasNotablePassedPawn(all: Sq[], color: 'w' | 'b', phase: Phase): boolean {
  const passers = passedPawns(all, color);
  if (phase === 'endgame') return passers.length > 0;
  return passers.some((p) => (color === 'w' ? rankOf(p.square) >= 5 : rankOf(p.square) <= 4));
}

/** Pawns with no enemy pawn ahead on their own or an adjacent file. */
function passedPawns(all: Sq[], color: 'w' | 'b'): Sq[] {
  const mine = all.filter((p) => p.type === 'p' && p.color === color);
  const theirs = all.filter((p) => p.type === 'p' && p.color !== color);
  return mine.filter((p) => {
    const f = fileOf(p.square);
    const r = rankOf(p.square);
    return !theirs.some((o) => {
      const of = fileOf(o.square);
      const or = rankOf(o.square);
      if (Math.abs(of - f) > 1) return false;
      return color === 'w' ? or > r : or < r;
    });
  });
}

/**
 * Which phase a position is in, on its own. `boardConcepts` returns null when a
 * position has no notable ideas, so a caller that needs only the phase — to
 * scope teaching by phase, or to split a coverage measurement — cannot get it
 * from there without conflating "unremarkable" with "unknown".
 */
export function phaseOfFen(fen: string): Phase | null {
  try {
    const all = pieces(new Chess(fen));
    return all.length === 0 ? null : phaseOfBoard(fen);
  } catch {
    return null;
  }
}

/**
 * The ideas this position is about, for selecting teaching that is not tied to
 * any opening. Returns few tags by design — see the note at the top of the file.
 */
export function boardConcepts(fen: string): BoardConcepts | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const all = pieces(chess);
  if (all.length === 0) return null;
  // ONE definition, shared with `phaseOfFen` and with what the coach says.
  const phase = phaseOfBoard(fen);
  const concepts = new Set<string>();

  const minorsAndMajors = all.filter((p) => p.type !== 'p' && p.type !== 'k');
  const rooks = minorsAndMajors.filter((p) => p.type === 'r');

  if (phase === 'endgame') {
    // Named endgame types the corpus teaches by name. Only when the board is
    // exactly that ending — "rook endgame" means rooks and pawns, nothing else.
    if (rooks.length > 0 && rooks.length === minorsAndMajors.length) concepts.add('rook-endgame');
    if (minorsAndMajors.length === 0) concepts.add('pawn-endgame');
    // King activity is THE endgame idea, but only worth teaching once a king
    // has actually left its back rank — otherwise it is a platitude.
    const kings = all.filter((p) => p.type === 'k');
    if (kings.some((k) => rankOf(k.square) >= 3 && rankOf(k.square) <= 6)) concepts.add('king-activity');
  }

  if (hasNotablePassedPawn(all, 'w', phase) || hasNotablePassedPawn(all, 'b', phase)) concepts.add('passed-pawn');

  // The bishop pair is only a theme while both bishops survive AND the opponent
  // has broken up — two bishops against two bishops is not an imbalance.
  for (const c of ['w', 'b'] as const) {
    const mine = all.filter((p) => p.type === 'b' && p.color === c).length;
    const theirs = all.filter((p) => p.type === 'b' && p.color !== c).length;
    if (mine === 2 && theirs < 2 && phase !== 'endgame') concepts.add('bishop-pair');
  }

  // ── THE CORPUS VOCABULARY (2026-08-05) ──────────────────────────────────
  // Measured across all four corpora: 115,267 middlegame/endgame concept tags,
  // of which the five tags above could ask for 5,132 — 4.5%. The other 110,135
  // were unreachable, not because selection was strict but because the
  // board-reader and the corpus did not share a word. That is the same shape as
  // the tactics bug: the lookup key never matched the data.
  //
  // Everything below is PROVABLE from the board. The corpus's next-richest
  // seams — prophylaxis (3,203), initiative (2,982), counterplay (1,551) — are
  // deliberately NOT emitted: they are judgements about intent, and a tag we
  // cannot prove is a generic principle delivered as a fact about this
  // position. Empty beats invented.
  for (const c of ['w', 'b'] as const) {
    if (hasIsolatedCentralPawn(all, c) || hasExposedDoubledPawn(all, c)) concepts.add('pawn-structure');
    if (phase !== 'endgame' && hasKnightOutpost(all, c)) concepts.add('knight-outpost');
    if (phase !== 'endgame' && hasPawnStorm(all, c)) concepts.add('pawn-storm');
    if (phase !== 'endgame' && kingIsExposed(all, c)) concepts.add('king-safety');
  }

  // A rook on the SEVENTH, or on a file neither side has a pawn on. A
  // semi-open file is too common to mean anything — that version fired on
  // 9,928 of 13,397 plies.
  for (const c of ['w', 'b'] as const) {
    const seventh = c === 'w' ? 7 : 2;
    const bothOpen = new Set(
      [...openFilesFor(all, 'w')].filter((f) => openFilesFor(all, 'b').has(f)),
    );
    const active = all.some((p) => p.type === 'r' && p.color === c
      && (rankOf(p.square) === seventh || bothOpen.has(fileOf(p.square))));
    if (active) concepts.add('piece-activity');
  }

  // TACTICS — reuse the detector the tactics surface already trusts rather than
  // growing a second, divergent one. chess.js only, deterministic, quiet on a
  // quiet board.
  //
  // A NAMED pattern only. Hanging pieces were included at first and the tag
  // fired 9,532 times: in a real game something is momentarily undefended
  // almost every ply, and "there is a loose piece" is not a teaching moment.
  try {
    if (detectTactics(fen).tactics.length > 0) concepts.add('tactics');
  } catch { /* a detector fault must not invent or suppress a tag */ }

  if (concepts.size === 0) return null;
  return { phase, concepts: [...concepts] };
}
