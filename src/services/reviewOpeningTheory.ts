// reviewOpeningTheory — the OPENING THEORY LECTURE for the first part of a
// post-game review (David 2026-07-20: "a solid 5 minutes explaining the theory
// behind the opening and the variation that was played… what the different
// lines are, what is considered the best moves, what other sidelines can be
// played").
//
// This is the DATA computer (G0/G3): it walks the game's own opening moves
// through the masters database and, at every real branch point, records the
// MAINLINE (most-played master move), the top SIDELINES, the move the student's
// game actually played, and where the game LEFT mainstream theory. Every number
// is a database aggregate — no move, frequency, or win-rate is invented. The
// narration layer (reviewOpeningTheoryNarration) turns this into the spoken
// lecture; the LLM only phrases these computed facts.

import { Chess } from 'chess.js';
import type { MasterPlayResult, MasterPlayMove } from './masterPlayTypes';
import { lookupMasterPlay } from './masterPlayLookup';
import { detectOpening } from './openingDetectionService';

/** A candidate move at a branch point, with its master-DB frequency + score. */
export interface TheoryMove {
  san: string;
  games: number;
  /** Share of games at this position that played this move (0..1). */
  pct: number;
  /** Win-share for the SIDE TO MOVE (win + half the draws), 0..1. */
  scoreForMover: number;
}

/** One theoretically-meaningful moment in the opening. */
export interface TheoryBranch {
  /** 1-indexed ply of the move played here. */
  ply: number;
  moveNumber: number;
  moverColor: 'white' | 'black';
  fenBefore: string;
  /** The move the student's game actually played (null if it wasn't in the DB). */
  played: TheoryMove | null;
  /** The most-played master move at this position. */
  mainline: TheoryMove;
  /** The next-most-played alternatives (up to 2). */
  sidelines: TheoryMove[];
  totalGames: number;
  isMainline: boolean;
  /** Played is a known master move but not the mainline. */
  isSideline: boolean;
  /** The played move isn't in the master DB at this position. */
  leftBook: boolean;
  /** The named opening/variation the GAME'S line reaches at this ply (DB trie),
   *  or null — Danya re-names the variation at every branch. */
  variationName: string | null;
  /** The named variation the MAINLINE move would reach (for "the main line is
   *  the Austrian Attack"), or null. */
  mainlineName: string | null;
}

export interface OpeningTheoryLecture {
  openingName: string;
  /** The theoretically-meaningful branch points, in game order. */
  branches: TheoryBranch[];
  /** 1-indexed ply where the game left mainstream theory, or null. */
  departurePly: number | null;
  /** Master games at the root — the size of the theory the opening rests on. */
  startGames: number;
}

/** A position needs at least this many master games to be a real branch. */
const MIN_BRANCH_GAMES = 10;
/** Only the opening phase gets the theory tour. */
const MAX_PLIES = 16;

function scoreForMover(m: MasterPlayMove, mover: 'white' | 'black'): number {
  // white/draw/black are win-shares of the games with this move.
  return mover === 'white'
    ? m.whitePct + m.drawPct / 2
    : m.blackPct + m.drawPct / 2;
}

function toTheoryMove(m: MasterPlayMove, total: number, mover: 'white' | 'black'): TheoryMove {
  return {
    san: m.san,
    games: m.games,
    pct: total > 0 ? m.games / total : 0,
    scoreForMover: scoreForMover(m, mover),
  };
}

/**
 * Build the opening-theory lecture for a game from its own opening moves.
 * Walks the masters DB along the game; each branch records mainline + sidelines
 * + the played move + the departure point. Returns null when there's no real
 * theory to teach (the game left book immediately, or the DB is unavailable).
 */
export async function buildOpeningTheoryLecture(
  fens: string[],
  sans: string[],
  openingName: string,
  opts: { lookup?: (fen: string) => Promise<MasterPlayResult> } = {},
): Promise<OpeningTheoryLecture | null> {
  if (fens.length < 2 || sans.length < 1) return null;
  const lookup =
    opts.lookup ?? ((fen: string) => lookupMasterPlay(fen, { trigger: 'manual', surface: 'game-review' }));

  const branches: TheoryBranch[] = [];
  let departurePly: number | null = null;
  let startGames = 0;
  const limit = Math.min(sans.length, MAX_PLIES, fens.length - 1);

  for (let i = 0; i < limit; i++) {
    const fenBefore = fens[i];
    let res: MasterPlayResult;
    try {
      res = await lookup(fenBefore);
    } catch {
      break; // DB down → stop; whatever we have is honest
    }
    if (i === 0) startGames = res.totalGames;

    // Book ran thin here → this is where the game left mainstream theory.
    if (res.totalGames < MIN_BRANCH_GAMES || res.moves.length === 0) {
      if (departurePly === null) departurePly = i + 1;
      break;
    }

    const mover: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const total = res.totalGames;
    const playedMove = res.moves.find((m) => m.san === sans[i]) ?? null;
    const mainlineRaw = res.moves[0];
    const isMainline = playedMove !== null && playedMove.san === mainlineRaw.san;
    const leftBook = playedMove === null;
    if (leftBook && departurePly === null) departurePly = i + 1;

    // Record a branch when there's genuine choice (2+ known moves) OR the game
    // deviated (a sideline / a departure) — skip forced single-reply positions.
    if (res.moves.length >= 2 || !isMainline) {
      const variationName = detectOpening(sans.slice(0, i + 1))?.name ?? null;
      const mainlineName = detectOpening([...sans.slice(0, i), mainlineRaw.san])?.name ?? null;
      branches.push({
        ply: i + 1,
        moveNumber: Math.ceil((i + 1) / 2),
        moverColor: mover,
        fenBefore,
        played: playedMove ? toTheoryMove(playedMove, total, mover) : null,
        mainline: toTheoryMove(mainlineRaw, total, mover),
        sidelines: res.moves.slice(1, 3).map((m) => toTheoryMove(m, total, mover)),
        totalGames: total,
        isMainline,
        isSideline: playedMove !== null && !isMainline,
        leftBook,
        variationName,
        mainlineName,
      });
    }

    if (leftBook) break; // once off-book, the theory tour is over
  }

  if (branches.length === 0) return null;
  return { openingName, branches, departurePly, startGames };
}

// ─── NARRATION BEATS ────────────────────────────────────────────────────────
// The lecture, turned into a sequence of playable beats: at each branch the
// board shows the MAINLINE move (the arrow / played move) while the coach voices
// the grounded theory — mainline %, sidelines, and where the game deviated. Each
// `fact` is only computed numbers (G0); the house voice phrases them at runtime.

export interface TheoryLectureBeat {
  /** Position before this beat's move. */
  fenBefore: string;
  /** The move to PLAY on the board for this beat (the mainline), UCI. Null on
   *  the intro/outro beats (nothing to move). */
  showUci: string | null;
  /** The mainline SAN shown (for the arrow label / dev). */
  showSan: string | null;
  moveNumber: number;
  moverColor: 'white' | 'black';
  kind: 'intro' | 'mainline' | 'sideline' | 'departure' | 'outro';
  /** The grounded fact for the house voice to phrase. */
  fact: string;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function uciFor(fen: string, san: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return `${m.from}${m.to}${m.promotion ?? ''}`;
  } catch {
    return null;
  }
}

function sidelineClause(sidelines: TheoryMove[]): string {
  const named = sidelines.filter((s) => s.games > 0);
  if (named.length === 0) return '';
  if (named.length === 1) return ` The main alternative is ${named[0].san} (${pct(named[0].pct)}).`;
  return ` The other main tries are ${named[0].san} (${pct(named[0].pct)}) and ${named[1].san} (${pct(named[1].pct)}).`;
}

/**
 * Turn a lecture into playable, grounded beats. `ideas` (optional) are the
 * opening's known key ideas (from repertoire.json / the concept corpus) — when
 * present, the intro weaves one in; the frequencies always stand on their own.
 */
export function buildTheoryLectureBeats(
  lecture: OpeningTheoryLecture,
  ideas: string[] = [],
): TheoryLectureBeat[] {
  const beats: TheoryLectureBeat[] = [];
  const first = lecture.branches[0];
  const ideaClause = ideas.length > 0 ? ` The core idea: ${ideas[0]}` : '';
  beats.push({
    fenBefore: first.fenBefore,
    showUci: null,
    showSan: null,
    moveNumber: first.moveNumber,
    moverColor: first.moverColor,
    kind: 'intro',
    fact: `This is the theory behind the ${lecture.openingName}, the backbone of ${lecture.startGames.toLocaleString()} master games.${ideaClause}`,
  });

  // Only announce a variation NAME when it's new (Danya re-names at each branch,
  // but doesn't repeat the same name twice in a row).
  let lastNamed = lecture.openingName;
  const nameClause = (name: string | null): string => {
    if (!name || name === lastNamed) return '';
    lastNamed = name;
    return ` This is the ${name}.`;
  };
  const mainlineNameClause = (name: string | null): string =>
    !name || name === lastNamed ? '' : ` — the ${name}`;

  for (const b of lecture.branches) {
    const side = b.moverColor === 'white' ? 'White' : 'Black';
    if (b.leftBook) {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'departure',
        // Danya's departure shape: name where book is, what it is, then the
        // anti-sideline recipe ("when in doubt, keep developing").
        fact: `At move ${b.moveNumber}, this is where the game leaves mainstream theory. The book move for ${side} is ${b.mainline.san}${mainlineNameClause(b.mainlineName)} — ${pct(b.mainline.pct)} of master games, scoring ${pct(b.mainline.scoreForMover)}.${sidelineClause(b.sidelines)} Past here you're on your own; the guide is simple — keep developing and fight for the centre.`,
      });
    } else if (b.isSideline && b.played) {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.played.san),
        showSan: b.played.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'sideline',
        fact: `At move ${b.moveNumber}, the main line is ${b.mainline.san} (${pct(b.mainline.pct)}, scoring ${pct(b.mainline.scoreForMover)}). This game took ${b.played.san} (${pct(b.played.pct)}, scoring ${pct(b.played.scoreForMover)}) — a known, respectable sideline, though the main line presses a touch harder.${nameClause(b.variationName)}`,
      });
    } else {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'mainline',
        fact: `At move ${b.moveNumber}, ${b.mainline.san} is the main line for ${side} — ${pct(b.mainline.pct)} of games, scoring ${pct(b.mainline.scoreForMover)}, the principled choice.${sidelineClause(b.sidelines)}${nameClause(b.variationName)}`,
      });
    }
  }

  return beats;
}
