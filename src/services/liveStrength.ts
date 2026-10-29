// liveStrength — MATCH THE OPPONENT TO THE STUDENT IN REAL TIME, FROM MOVE ONE
// (WO-LAYERS-01 step 8; CLAUDE.md "STRENGTH IS MATCHED IN REAL TIME": "The
// coach can match in real time as they play on the board for the first time").
//
// 🔒 ANCHORED TO REAL PLAYERS (David 2026-10-22: "Coach keeps kicking my ass …
// Will it algo down at some point?" → "Make that fix"). The first version
// stepped +60 for a clean answer to a posed question and −35 for a miss. With
// nothing tying the number to what a player at that rating actually does, it
// settled wherever 37% of the student's answers were clean — far below what a
// 1400 manages — so it CLIMBED while the student lost: David's read 1679 after
// six counted moves, from a 1414 seed, and the coach crushed him four games
// running. A step size is a guess; a measured curve is not.
//
// Now each graded move is read against how REAL players at every rating play
// the same kind of move (`move-quality-curve.json`, 7,920 rated Lichess games
// at Stockfish depth 12, `scripts/meter/fit-move-curve.mjs`): the move's cost
// falls in one of six bands, and the estimate is the posterior over a rating
// grid, P(rating | the bands seen) ∝ prior × Π P(band | rating). No step size,
// no drift: a player who moves like a 1100 reads 1100.
//
// The filter is the curve's own, so the two are measured alike: from the 9th
// move on (book moves tell little), the mover's eval before the move within
// ±300 cp (a decided game tells little), and a graded cost. A move the board
// flagged as a known opening slip (a gem walked into or punished) counts
// before move 9 too — the earliest real signal there is.
//
// ONE DETECTOR, TWO CONSUMERS (locked): this reads the SAME graded cost the
// record files (`evaluatePlayerMove` / `recordGradedMove`) — not a second
// measurement. It reads the cost on its whole scale, not only "posed question
// held or not": those rates are nearly flat across ratings (88% held at 600,
// 96% at 2200; `skillMeters`), so a strength read off them turns any bias into
// hundreds of points. A move's cost is steeper (a 600 makes a 100-cp mistake
// on 41% of moves, a 2500 on 10%).
//
// What NEVER counts as evidence:
//  - a move played after the coach said something about this board (prompted:
//    the clue told you);
//  - a FIND on a board the coach MADE for you (a planted or steered chance,
//    the Campaign's earned piece — David 2026-10-22: "You said it
//    gets stronger after I find the slip? Don't let it do that"). A miss there
//    still counts: missing a chance the coach left is a real miss.
import curve from '../data/move-quality-curve.json';
import { STRENGTH_FLOOR } from './engineConstants';
import { plyOfFen } from '../utils/plyOfFen';

export interface LiveStrength {
  /** The estimate: the posterior's mean. */
  rating: number;
  /** How unsure: the posterior's spread (one standard deviation). */
  rd: number;
  /** Moves that carried evidence. */
  evidence: number;
  /** P(rating) over `GRID`, this session only (not persisted). */
  post: readonly number[];
}

/** The ONE floor (`engineStrength`). */
export const LIVE_MIN = STRENGTH_FLOOR;
const LIVE_MAX = 2800;
const GRID_STEP = 25;
/** The grid reaches below the floor so a prior at the floor is not cut in
 *  half (a 400 seed would read 640); the REPORTED rating is clamped. */
const GRID_MIN = 0;
const GRID: readonly number[] = Array.from({ length: (LIVE_MAX - GRID_MIN) / GRID_STEP + 1 }, (_, i) => GRID_MIN + i * GRID_STEP);
/** A seed is a guess — a rating from another site, another time control (a
 *  chess.com Daily rating is days a move), or the unrated default — so the
 *  board takes over fast. */
export const SEED_RD = 300;
/** A carried estimate never starts a new game surer than this: players
 *  improve, and the board must stay able to follow. */
export const CARRY_RD_MIN = 150;

const FIRST_PLY: number = curve.firstPly;
const CONTESTED_CP: number = curve.contestedCp;
/** A find costs less than this; a mistake at least this (the curve's bar). */
export const MISTAKE_CP: number = curve.bars.mistake;
const BAND_EDGES: readonly number[] = curve.bandEdges;
const AT_LEAST = curve.atLeast as ReadonlyArray<{ edge: number; D: number; S: number }>;

/** P(band | rating): each edge's smooth curve (P(cost >= edge | rating)), a
 *  band being the difference of its two edges — the raw buckets are noisy and
 *  not monotone, so the curve is read, never the bucket. */
function bandsAt(r: number): readonly number[] {
  const ge = AT_LEAST.map(({ D, S }) => 1 - 1 / (1 + Math.pow(10, -(r - D) / S)));
  return [1 - ge[0], ...ge.map((g, i) => g - (ge[i + 1] ?? 0))];
}
const LIKELIHOOD: ReadonlyArray<readonly number[]> = GRID.map(bandsAt);

/** The band a move's cost falls in: 0 = under 20 cp … 5 = 300 cp or more. */
export function lossBand(cpLoss: number): number {
  return BAND_EDGES.filter((e) => cpLoss >= e).length;
}

function summarise(post: readonly number[], evidence: number): LiveStrength {
  let mean = 0;
  for (let i = 0; i < GRID.length; i += 1) mean += post[i] * GRID[i];
  let v = 0;
  for (let i = 0; i < GRID.length; i += 1) v += post[i] * (GRID[i] - mean) ** 2;
  return { rating: Math.max(LIVE_MIN, Math.round(mean)), rd: Math.round(Math.sqrt(v)), evidence, post };
}

/** A prior centred on `rating`, `rd` wide, clamped to the grid. */
export function startLiveStrength(rating: number, rd: number = SEED_RD, evidence = 0): LiveStrength {
  const mu = Math.min(LIVE_MAX, Math.max(LIVE_MIN, rating));
  // (Centred at the floor at least; the grid below it keeps the prior whole.)
  const w = GRID.map((r) => Math.exp(-0.5 * ((r - mu) / rd) ** 2));
  const z = w.reduce((a, x) => a + x, 0);
  // A prior reports what it was given — the grid's mean is that, off by a
  // rounding — and every move read after it reports the posterior.
  return { ...summarise(w.map((x) => x / z), evidence), rating: Math.round(mu), rd: Math.round(rd) };
}

/** The estimate the last game ended on, as the next game's prior — never
 *  surer than `CARRY_RD_MIN`. */
export function carryLiveStrength(c: { rating: number; rd: number; evidence: number }): LiveStrength {
  return startLiveStrength(c.rating, Math.max(CARRY_RD_MIN, c.rd), c.evidence);
}

export interface LiveMove {
  fenBefore: string;
  /** The graded cost (cp); null = ungraded, never read as clean. */
  cpLoss: number | null;
  /** The mover's eval before the move (cp, mover POV); null = unknown, and an
   *  unknown board is not known to be contested. */
  evalBeforeMover: number | null;
  /** Something about this board was said before the move. */
  prompted: boolean;
  /** The coach made this chance for the student (planted, steered, a taught
   *  slip, the Campaign's earned piece): a find earns nothing. */
  coachMade: boolean;
  /** The move walked into or punished a known opening slip (`gemMoveSignal`). */
  gem: boolean;
}

/** One graded move → the next estimate (or the same one: not evidence). */
export function updateLiveStrength(s: LiveStrength, m: LiveMove): LiveStrength {
  if (m.cpLoss === null || m.evalBeforeMover === null || m.prompted) return s;
  if (Math.abs(m.evalBeforeMover) > CONTESTED_CP) return s;
  if (!m.gem && plyOfFen(m.fenBefore) < FIRST_PLY) return s;
  if (m.coachMade && m.cpLoss < MISTAKE_CP) return s;
  const band = lossBand(Math.max(0, m.cpLoss));
  const next = s.post.map((p, i) => p * LIKELIHOOD[i][band]);
  const z = next.reduce((a, x) => a + x, 0);
  if (!(z > 0)) return s;
  return summarise(next.map((x) => x / z), s.evidence + 1);
}
