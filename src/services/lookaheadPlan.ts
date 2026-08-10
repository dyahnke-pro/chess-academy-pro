// What both sides are trying to do, read off ONE engine line.
//
// David 2026-08-09, on the shape of the teaching: "we narrate the plans to the
// user based off of the look ahead (if both sides play well) not just with move
// by move now play this, but with hints that lead them to playing well. Like
// this square is weak or black wants to attack this square and that leads the
// user to defend a key square. Or even say, this is a key square that cannot
// fall!!" And then, when asked whether the engine can do that at all: "Stockfish
// only tells you the plan for the side to move. Can we calculate looking ahead
// and then narration what the plan is for both sides?"
//
// It can, and it needs no second search. A principal variation is both sides
// playing well in alternation, and `pvPlayback` already tags every ply with
// `moverColor` and computes its facts — captures, opened files, outposts,
// passed pawns. Reading that line twice, once per colour, gives two plans for
// the price of one engine call. What was missing was only the reading.
//
// EVERY claim here is arithmetic over moves the engine actually played (G0/G3).
// Nothing is inferred about intentions: "heading for e5" means a piece of that
// colour lands on e5 inside the line, not that the model believes it wants to.
import type { PvLine, PvPly } from './pvPlayback';

/** How far into the line is worth describing as INTENTION.
 *
 *  Past about here both sides are being credited with a future neither has
 *  committed to: the line is still the engine's best guess, but a student told
 *  "they are going to take on e5" about ply 14 will watch it not happen and
 *  learn to distrust the coach. Eight plies is four moves each — enough for a
 *  plan to be visible, short enough to still be true. */
export const PLAN_HORIZON = 8;

export interface KeySquare {
  square: string;
  /** Times a white move touched it (from or to). */
  whiteTouches: number;
  /** Times a black move touched it. */
  blackTouches: number;
  /** Material that changed hands on this square inside the line, in points. */
  materialOnSquare: number;
  /** Ranking weight. Contested squares outrank busy ones. */
  weight: number;
  /** True when BOTH sides touched it — the difference between "a square that
   *  matters" and "the square this game turns on". */
  contested: boolean;
}

export interface SidePlan {
  color: 'white' | 'black';
  /** Squares this side's pieces move TO inside the horizon, most-visited first. */
  headingFor: string[];
  /** Files this side's moves open. */
  opening: string[];
  /** What this side captures, in plain words. */
  trading: string[];
  /** Outposts this side establishes. */
  outposts: string[];
  /** Speakable, or '' when the line gives this side nothing describable. */
  text: string;
}

export interface LookaheadPlan {
  keySquares: KeySquare[];
  white: SidePlan;
  black: SidePlan;
  /** The student's own plan, for convenience at the call site. */
  mine: SidePlan;
  /** The opponent's — what a strong player tells you they are doing to you. */
  theirs: SidePlan;
}

const PIECE_POINTS: Record<string, number> = {
  pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0,
};

/** The piece word out of a `captured` fact like "takes the knight". */
function capturedPiece(fact: string | null): string | null {
  if (!fact) return null;
  const m = /\b(pawn|knight|bishop|rook|queen)\b/i.exec(fact);
  return m ? m[1].toLowerCase() : null;
}

function squaresOf(ply: PvPly): { from: string; to: string } {
  return { from: ply.uci.slice(0, 2), to: ply.uci.slice(2, 4) };
}

/**
 * The squares the line keeps coming back to.
 *
 * A square both sides touch is where the game is actually being decided, and
 * that is a COUNT, not a judgement — which is what makes "a key square" and
 * "THE key square that cannot fall" two different claims backed by two
 * different numbers instead of by emphasis.
 */
export function keySquaresOf(plies: readonly PvPly[]): KeySquare[] {
  const tally = new Map<string, KeySquare>();
  const touch = (square: string, color: 'white' | 'black', material: number): void => {
    const row = tally.get(square) ?? {
      square, whiteTouches: 0, blackTouches: 0, materialOnSquare: 0, weight: 0, contested: false,
    };
    if (color === 'white') row.whiteTouches += 1;
    else row.blackTouches += 1;
    row.materialOnSquare += material;
    tally.set(square, row);
  };

  for (const ply of plies.slice(0, PLAN_HORIZON)) {
    const { from, to } = squaresOf(ply);
    const taken = capturedPiece(ply.facts.captured);
    touch(to, ply.moverColor, taken ? (PIECE_POINTS[taken] ?? 0) : 0);
    // The square a piece LEAVES matters less than where it goes, but a piece
    // abandoning a square is exactly how a defender disappears — which is the
    // concession beat's whole subject.
    touch(from, ply.moverColor, 0);
  }

  const rows = [...tally.values()];
  for (const row of rows) {
    row.contested = row.whiteTouches > 0 && row.blackTouches > 0;
    // Contest dominates: a square both sides fight over teaches more than one
    // side's piece shuffling through twice. Material on the square is the
    // tiebreak, because a square things get captured on is the real battle.
    row.weight = (row.contested ? 10 : 0)
      + Math.min(row.whiteTouches, row.blackTouches) * 4
      + (row.whiteTouches + row.blackTouches)
      + row.materialOnSquare;
  }
  return rows
    .filter((r) => r.contested || r.whiteTouches + r.blackTouches >= 2)
    .sort((a, b) => b.weight - a.weight || a.square.localeCompare(b.square));
}

function planFor(plies: readonly PvPly[], color: 'white' | 'black'): SidePlan {
  const mine = plies.slice(0, PLAN_HORIZON).filter((p) => p.moverColor === color);
  const destinations = new Map<string, number>();
  const opening = new Set<string>();
  const trading: string[] = [];
  const outposts: string[] = [];

  for (const ply of mine) {
    const { to } = squaresOf(ply);
    destinations.set(to, (destinations.get(to) ?? 0) + 1);
    for (const f of ply.facts.newOpenFiles) opening.add(f);
    const taken = capturedPiece(ply.facts.captured);
    if (taken) trading.push(taken);
    if (ply.facts.outpostGained) outposts.push(ply.facts.outpostGained);
  }

  const headingFor = [...destinations.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([sq]) => sq);

  return {
    color,
    headingFor,
    opening: [...opening],
    trading,
    outposts,
    text: '',
  };
}

/** Turn a computed plan into one sentence. Empty when there is nothing to say —
 *  which is honest, and better than a sentence that means nothing. */
function describe(plan: SidePlan, voice: 'mine' | 'theirs'): string {
  const subject = voice === 'mine' ? 'You' : 'They';
  const possessive = voice === 'mine' ? 'your' : 'their';
  const parts: string[] = [];

  if (plan.outposts.length > 0) {
    parts.push(`plant a piece on ${plan.outposts[0]} where no pawn can chase it`);
  }
  if (plan.trading.length > 0) {
    const unique = [...new Set(plan.trading)];
    parts.push(`trade off ${unique.length > 1 ? 'pieces' : `the ${unique[0]}`}`);
  }
  if (plan.opening.length > 0) {
    parts.push(`open the ${plan.opening[0]}-file`);
  }
  if (parts.length === 0 && plan.headingFor.length > 0) {
    // Nothing concrete happens in the line, but the pieces still go SOMEWHERE,
    // and where they go is the plan when nothing is captured.
    const squares = plan.headingFor.slice(0, 2).join(' and ');
    return `${subject} bring ${possessive} pieces toward ${squares} over the next few moves.`;
  }
  if (parts.length === 0) return '';

  const list = parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${subject} want to ${list}.`;
}

/**
 * Both plans and the key squares, from one line.
 *
 * Returns null when the line is too short to describe an intention — two plies
 * is a move and a reply, not a plan, and calling it one is how a coach starts
 * sounding authoritative about nothing.
 */
export function buildLookaheadPlan(
  line: PvLine,
  studentColor: 'white' | 'black',
): LookaheadPlan | null {
  if (line.plies.length < 4) return null;

  const white = planFor(line.plies, 'white');
  const black = planFor(line.plies, 'black');
  const mine = studentColor === 'white' ? white : black;
  const theirs = studentColor === 'white' ? black : white;
  mine.text = describe(mine, 'mine');
  theirs.text = describe(theirs, 'theirs');
  // Assign back so `white`/`black` carry the same strings as `mine`/`theirs` —
  // they are the same objects, but say so rather than relying on it.
  if (!white.text) white.text = white === mine ? mine.text : theirs.text;
  if (!black.text) black.text = black === mine ? mine.text : theirs.text;

  return { keySquares: keySquaresOf(line.plies), white, black, mine, theirs };
}

/**
 * The key-square line, at the strength the numbers support.
 *
 * Two claims, and which one is earned is decided by the count rather than by
 * how important it feels:
 *   contested by both sides → "the square this position turns on"
 *   touched repeatedly by one → "a square worth watching"
 */
export function keySquareLine(keys: readonly KeySquare[]): string {
  const top = keys[0];
  if (!top) return '';
  if (top.contested && top.weight >= 16) {
    return `${top.square} is the square this position turns on — both sides keep coming back to it.`;
  }
  if (top.contested) {
    return `${top.square} is contested — both sides have designs on it.`;
  }
  return `${top.square} is worth watching; the play keeps running through it.`;
}
