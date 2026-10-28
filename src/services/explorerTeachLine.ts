// explorerTeachLine
// -----------------
// Teach a THIN/MISSING coach opening from the GAMES DATABASE. The 2026-09-06
// build (David: "the fix for missing coach openings is to ask the amateur
// database into coach teach X opening") appended one linear line; since
// 2026-10-27 (David: "master is best, I want the same structure 'branches'
// offered during the lesson") the database's replies at the line's last
// position become fork tiles, each walked down the masters' main line.
//
// Masters first (sound theory); the online buckets only when the masters never
// reached the line (the Traxler). G0/G3: every move is REAL game data, never
// invented, chess.js-legal. The soundness guard is data-driven and engine-free:
// a STUDENT move that loses in practice in those same games is skipped.

import { Chess } from 'chess.js';
import { fetchLichessExplorer, lichessCoolingDown } from './lichessExplorerService';
import { masterTreeAt } from './masterTree';
import { MAX_SIBLING_BRANCHES } from '../utils/featureFlags';
import type { LichessExplorerResult, LichessExplorerMove } from '../types';

/** Which database a branch was walked from. */
export type ExplorerSource = 'masters' | 'amateur';

/** A fork tile built from the GAMES DATABASE for a line the curated opening
 *  DB stops short on. Same shape the curated fork tiles carry, plus where its
 *  moves came from and why its walk stopped. */
export interface ExplorerBranch {
  /** The first move of the branch, played from the spine's last position. */
  san: string;
  /** Tile label — the move, side-marked ("…g6", "b4"). */
  label: string;
  fullName: string;
  /** Games in the database that played this move here. */
  count: number;
  /** The database's main line after the branch move. */
  extensionMoves: string[];
  source: ExplorerSource;
  /** Games at the spine's last position (the share's denominator). */
  totalGames: number;
  /** Spoken before the branch move's own beat: how often it is played. */
  teaserLead: string;
  /** Tile subtitle: the same count, short. */
  subtitle: string;
  /** Spoken after the branch's last move when the games run out before both
   *  sides castle — said as the fact it is, never padded into a plan. */
  endNote: string | null;
}

export interface ExplorerBranches {
  branches: ExplorerBranch[];
  source: ExplorerSource | null;
  /** The results of the games at the line's last position — who scores. */
  results: { white: number; draws: number; black: number } | null;
  /** The database could not be reached for part of the walk: a lesson built
   *  from this is thinner than the data, so it must not be cached. */
  incomplete: boolean;
}

/** Masters is "grounded" at a position once it holds this many games. */
const MASTERS_MIN_GAMES = 5;
/** Amateur is noisier, so it needs more games before we trust the line. */
const AMATEUR_MIN_GAMES = 20;
/** Don't follow a move played in fewer than this many games (noise). */
const MIN_MOVE_GAMES = 3;
/** A move whose mover-score is below this is a practical loser — skip it in
 *  favour of the next most-played sound move. */
const SOUNDNESS_FLOOR_PCT = 40;
/** A branch is offered when this share of the position's games play it. A
 *  BAR, not a cap: every move over it is offered (up to the fork picker's
 *  size, the same `MAX_SIBLING_BRANCHES` the curated tiles use). */
const BRANCH_SHARE_FLOOR = 0.08;
/** …and at least this many games — a 2-game move is not a branch of theory. */
const BRANCH_MIN_GAMES: Record<ExplorerSource, number> = { masters: 10, amateur: 200 };
/** A walk stops where fewer games than this reached the position: past it the
 *  "main line" is a handful of games, not theory (2.a3, measured 2026-10-27:
 *  under 10 master games the masters' line turns into h4/h5/g5). */
const WALK_FLOOR_GAMES: Record<ExplorerSource, number> = { masters: 10, amateur: 100 };
/** Hard stop on a walk, in plies past the branch move. */
const WALK_MAX_PLIES = 30;

function totalGames(r: LichessExplorerResult): number {
  return r.white + r.draws + r.black;
}
function moveGames(m: LichessExplorerMove): number {
  return m.white + m.draws + m.black;
}

/** The mover's practical score (0-100): (theirWins + draws/2) / games. */
export function moverScore(m: LichessExplorerMove, mover: 'w' | 'b'): number {
  const g = moveGames(m);
  if (g === 0) return 50;
  const wins = mover === 'w' ? m.white : m.black;
  return ((wins + m.draws / 2) / g) * 100;
}

/** Pick the move to teach: the MOST-PLAYED move (among the top few) that clears
 *  the soundness floor for the side to move; else the outright most-played. */
export function pickMove(r: LichessExplorerResult, mover: 'w' | 'b'): LichessExplorerMove | null {
  const candidates = [...r.moves].sort((a, b) => moveGames(b) - moveGames(a)).slice(0, 4);
  if (candidates.length === 0) return null;
  const sound = candidates.find(
    (m) => moveGames(m) >= MIN_MOVE_GAMES && moverScore(m, mover) >= SOUNDNESS_FLOOR_PCT,
  );
  return sound ?? candidates[0];
}

/** The moves the database plays often enough at a position to count as a
 *  branch of theory — the one bar the lesson's fork tiles and the chat's
 *  "the masters answer…" both read. Most-played first. */
export function repliesOverBar(r: LichessExplorerResult, source: ExplorerSource): LichessExplorerMove[] {
  const total = totalGames(r);
  if (total === 0) return [];
  return [...r.moves]
    .sort((a, b) => moveGames(b) - moveGames(a))
    .filter((m) => moveGames(m) >= BRANCH_MIN_GAMES[source] && moveGames(m) / total >= BRANCH_SHARE_FLOOR);
}

/** Both sides have castled — the opening's job is done. */
function bothCastled(chess: Chess): boolean {
  const moves = chess.history({ verbose: true });
  const castled = (c: 'w' | 'b'): boolean => moves.some((m) => m.color === c && m.san.startsWith('O-O'));
  return castled('w') && castled('b');
}

/** The next move of a walk. The STUDENT's move is the most-played one that
 *  does not lose in practice — they are being taught it. The OPPONENT's is the
 *  most-played, sound or not — it is what the student will face. */
export function pickWalkMove(r: LichessExplorerResult, mover: 'w' | 'b', student: 'w' | 'b'): LichessExplorerMove | null {
  if (mover === student) return pickMove(r, mover);
  return [...r.moves].sort((a, b) => moveGames(b) - moveGames(a))[0] ?? null;
}

/** How long one lesson build waits out Lichess's rate-limit cooldown in all.
 *  A cooldown starts whenever ANY explorer call is refused — the teach page's
 *  own master-games prefetch tripped one the second a lesson was asked for
 *  (prod 2026-10-27), and the build gave up on a database that was back 30s
 *  later. A lesson is already a minute's wait; this is part of it. */
const COOLDOWN_BUDGET_MS = 40_000;
const COOLDOWN_POLL_MS = 1_000;

/** One build's share of the cooldown wait. */
interface WaitBudget { waitedMs: number }

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The database's answer at the board `path` reaches. Masters read the deep
 *  master tree first (WO-ALL-OPENINGS-01 P1) and the live explorer only where
 *  the tree holds no answer — the tree is deeper and never rate-limited. */
async function fetchFrom(path: readonly string[], fen: string, source: ExplorerSource, budget: WaitBudget): Promise<LichessExplorerResult> {
  if (source === 'masters') {
    const tree = await masterTreeAt(path);
    if (tree && totalGames(tree) > 0) return tree;
  }
  const db = source === 'masters' ? 'masters' : 'lichess';
  try {
    return await fetchLichessExplorer(fen, db);
  } catch (err) {
    if (!lichessCoolingDown() || budget.waitedMs >= COOLDOWN_BUDGET_MS) throw err;
    while (lichessCoolingDown() && budget.waitedMs < COOLDOWN_BUDGET_MS) {
      await sleep(COOLDOWN_POLL_MS);
      budget.waitedMs += COOLDOWN_POLL_MS;
    }
    return fetchLichessExplorer(fen, db);
  }
}

function labelFor(san: string, mover: 'w' | 'b'): string {
  return mover === 'b' ? `…${san}` : san;
}

/** A game count as it is read aloud: "33,422", never "33422". */
function count(n: number): string {
  return n.toLocaleString('en-US');
}

function gamesWord(source: ExplorerSource): string {
  return source === 'masters' ? 'master games' : 'online games';
}

/**
 * THE GAMES DATABASE TEACHES A LINE THE OPENING DB STOPS ON (David 2026-10-27:
 * "We need to tie in the ability to look up the database and teach from it" →
 * "master is best, I want the same structure 'branches' offered during the
 * lesson"). The Mengarini is three moves in the opening DB — 1.e4 c5 2.a3 —
 * and 606 master games past that. At the line's last position every reply the
 * masters play often enough becomes a fork tile, the shape the curated lessons
 * offer, and each tile walks the masters' main line until both sides have
 * castled or the games run thin. The online database only when the masters
 * never reached the line at all (the Traxler).
 *
 * G0/G3: every move is a real game move, chess.js-legal. Never invented.
 */
export async function buildExplorerBranches(
  spineSans: readonly string[],
  studentSide: 'white' | 'black',
): Promise<ExplorerBranches> {
  const student: 'w' | 'b' = studentSide === 'white' ? 'w' : 'b';
  const root = new Chess();
  try {
    for (const san of spineSans) root.move(san);
  } catch {
    return { branches: [], source: null, results: null, incomplete: false };
  }
  if (root.isGameOver()) return { branches: [], source: null, results: null, incomplete: false };
  const rootFen = root.fen();
  const mover = root.turn();

  let incomplete = false;
  const budget: WaitBudget = { waitedMs: 0 };
  let source: ExplorerSource | null = null;
  let at: LichessExplorerResult | null = null;
  let mastersAnswered = false;
  try {
    const masters = await fetchFrom(spineSans, rootFen, 'masters', budget);
    mastersAnswered = true;
    if (totalGames(masters) >= MASTERS_MIN_GAMES) { source = 'masters'; at = masters; }
  } catch { incomplete = true; }
  // The online games only when the masters ANSWERED and never reached the
  // line — never because the masters could not be reached (David: "master is
  // best"); an unreachable database rebuilds the lesson next time instead.
  if (!source && mastersAnswered) {
    try {
      const amateur = await fetchFrom(spineSans, rootFen, 'amateur', budget);
      if (totalGames(amateur) >= AMATEUR_MIN_GAMES) { source = 'amateur'; at = amateur; }
    } catch { incomplete = true; }
  }
  if (!source || !at) return { branches: [], source: null, results: null, incomplete };
  const src: ExplorerSource = source;

  const total = totalGames(at);
  const byGames = [...at.moves].sort((a, b) => moveGames(b) - moveGames(a));
  const offered = repliesOverBar(at, src)
    .filter((m) => mover !== student || moverScore(m, mover) >= SOUNDNESS_FLOOR_PCT);
  // Nothing clears the bar → the most-played move alone, so the lesson still
  // walks the line people actually play.
  const chosen = (offered.length > 0 ? offered : byGames.slice(0, 1).filter((m) => moveGames(m) >= MIN_MOVE_GAMES))
    .slice(0, MAX_SIBLING_BRANCHES);

  const branches: ExplorerBranch[] = [];
  for (let rank = 0; rank < chosen.length; rank += 1) {
    const first = chosen[rank];
    const chess = new Chess(rootFen);
    try {
      chess.move(first.san);
    } catch {
      continue; // an explorer SAN illegal here — never play it
    }
    const extensionMoves: string[] = [];
    let endNote: string | null = null;
    for (let ply = 0; ply < WALK_MAX_PLIES; ply += 1) {
      if (chess.isGameOver() || bothCastled(chess)) break;
      let r: LichessExplorerResult;
      try {
        r = await fetchFrom([...spineSans, first.san, ...extensionMoves], chess.fen(), src, budget);
      } catch {
        incomplete = true;
        break;
      }
      const here = totalGames(r);
      const pick = here >= WALK_FLOOR_GAMES[src] ? pickWalkMove(r, chess.turn(), student) : null;
      if (!pick || moveGames(pick) < MIN_MOVE_GAMES) {
        endNote = `The ${gamesWord(src)} run out here: ${here === 0 ? 'none' : `only ${count(here)}`} reached this position.`;
        break;
      }
      try {
        extensionMoves.push(chess.move(pick.san).san);
      } catch {
        break; // an explorer SAN illegal here — stop, never throw mid-build
      }
    }
    const games = moveGames(first);
    const share = `${count(games)} of the ${count(total)} ${gamesWord(src)}`;
    branches.push({
      san: first.san,
      label: labelFor(first.san, mover),
      fullName: labelFor(first.san, mover),
      count: games,
      extensionMoves,
      source: src,
      totalGames: total,
      teaserLead: rank === 0 ? `The most common answer, in ${share}.` : `Played in ${share}.`,
      subtitle: `${count(games)} of ${count(total)} ${gamesWord(src)}`,
      endNote,
    });
  }
  return { branches, source: src, results: { white: at.white, draws: at.draws, black: at.black }, incomplete };
}

/** How the database's games from a position scored, from the student's seat:
 *  "In 606 master games from here, your side wins 35% and theirs 22%." */
export function resultsLine(
  results: { white: number; draws: number; black: number },
  source: ExplorerSource,
  studentSide: 'white' | 'black',
): string | null {
  const n = results.white + results.draws + results.black;
  if (n === 0) return null;
  const pct = (x: number): number => Math.round((x / n) * 100);
  const mine = studentSide === 'white' ? results.white : results.black;
  const theirs = studentSide === 'white' ? results.black : results.white;
  return `In ${count(n)} ${gamesWord(source)} from here, your side wins ${pct(mine)}% and theirs ${pct(theirs)}%; the rest are drawn.`;
}
