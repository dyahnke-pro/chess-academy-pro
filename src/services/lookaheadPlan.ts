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
import { Chess } from 'chess.js';
import { computePlyFacts } from './pvPlayback';
import { describeStructure } from './boardStructure';
import { detectTactics } from './tacticsDetector';
import type { PvLine, PvPly, PrevCaptureContext } from './pvPlayback';

type ChessCtor = InstanceType<typeof Chess>;

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen',
};

/** Tactic names in English.
 *
 *  `tacticsDetector` types are snake_case identifiers, and the first version of
 *  this spoke them raw — a 60-gem sweep produced "You want to land a
 *  mate_threat", which is the coach reading a variable name aloud. A detector
 *  enum is a program's word for a thing, never a person's. */
const TACTIC_WORD: Record<string, string> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovery: 'discovered attack',
  back_rank: 'back-rank threat',
  mate_threat: 'mating threat',
  removal_of_guard: 'removal of the defender',
  trapped_piece: 'piece trap',
};

/** Speakable name for a tactic, or null when it has none — an unknown tactic
 *  is dropped rather than read out as its identifier. */
export function tacticWord(kind: string | null): string | null {
  if (!kind) return null;
  return TACTIC_WORD[kind] ?? null;
}

/** How close a landing square has to be to a king to count as "coming at it".
 *
 *  Three, not two. Two is the ring of squares touching the king, which almost
 *  nothing reaches inside eight plies — measured on a Scholar's-mate line, only
 *  the final queen move qualified, so an obvious four-piece attack scored 1 and
 *  the beat never fired. Three is a knight's working radius from the king and
 *  matches what "bringing pieces at your king" actually looks like. */
const KING_ZONE = 3;

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
  /** Net material this side wins across the horizon, in points. */
  materialSwing: number;
  /** Passed pawns this side creates. */
  passedPawns: string[];
  /** Enemy king-shield pawns this side strips away. */
  shieldStripped: number;
  /** A tactic that LANDS inside the line ('fork' | 'pin' | 'skewer' | …). */
  tactic: string | null;
  /** The line ends in mate delivered by this side. */
  mates: boolean;
  /** The mate is ALREADY ON THE BOARD — the game is over, not coming.
   *
   *  Without this the coach announced "there is a forced mate in this line —
   *  it is there if you find it" on the move that DELIVERED mate, inviting the
   *  student to find something they had just played. Tense is not decoration
   *  when the game has ended. */
  mateDelivered?: boolean;
  /** How many of this side's moves land within a king's-walk of the ENEMY
   *  king — the computable form of "they are coming for you". */
  nearEnemyKing: number;
  /** Where those moves land. The clause "bring pieces at your king" names no
   *  square, which is exactly why it needs marks: the student is told an attack
   *  is coming and given nowhere to look. */
  kingAttackSquares: string[];
  /** Where the material actually changes hands. */
  materialSquares: string[];
  /** Where a PIECE (never a pawn) gets traded off. */
  tradeSquares: string[];
  /** Where the tactic lands, when one does. */
  tacticSquare: string | null;
  /** A piece that MOVES TWICE OR MORE inside the horizon, with the squares it
   *  travels through — "the knight goes f3, d2, then c4".
   *
   *  The single most characteristic thing a strong coach says about a line, and
   *  the plan was throwing it away: `headingFor` kept the destinations and lost
   *  the journey, so a three-move regrouping read as two unrelated squares. The
   *  chain was already being reconstructed inside `planMarks` to place an
   *  arrow; here it becomes the sentence it always was. */
  maneuver: { piece: string; path: string[] } | null;
  /** Checks this side gives inside the horizon. `isCheck` has been computed on
   *  every ply since `pvPlayback` was written and read by nothing. */
  checks: number;
  /** A pawn this side promotes, by square — the loudest thing a line can
   *  contain and, until now, invisible for the same reason. */
  promotes: string | null;
  /** Speakable, or '' when the line gives this side nothing describable. */
  text: string;
  /** THE CLAUSES THAT REACHED `text`, each with the squares it is about.
   *
   *  This is what lets the board draw a plan the words never spelled out — "they
   *  want to bring pieces at your king" points nowhere by itself — while keeping
   *  the coupling that makes marks honest: a caller draws a clause's squares
   *  only after confirming that clause is in the utterance the student actually
   *  heard. See `planMarks`. */
  spokenClauses: Array<{ text: string; squares: string[] }>;
}

/** What is TRUE OF THE BOARD RIGHT NOW, as opposed to what the line does next.
 *
 *  David 2026-08-10, asked why these were missing: they were. The plan was built
 *  from the diffs `computePlyFacts` exposes, so it saw everything the line
 *  CHANGED and nothing the position already IS — a pin standing on the board
 *  that no move in the line touches was invisible, and `describeStructure` was
 *  being computed twice per ply and then discarded except for two of its
 *  fields. Both are free: chess.js geometry, no engine. */
export interface PositionRead {
  /** Tactics already on the board at the root — not created by the line. */
  tacticsNow: string[];
  /** Kings on opposite wings: both sides can attack without being attacked
   *  back, which changes what every other fact here is worth. */
  oppositeWings: boolean;
  /** Pawn islands per side. More islands = more weaknesses to defend. */
  islands: { white: number; black: number };
  /** Half-open files per side — where a rook belongs. */
  halfOpen: { white: string[]; black: string[] };
  /** Endgame classification once material is low enough, else null. */
  endgameType: string | null;
  /** Material balance in points, positive = White ahead. */
  materialBalance: number;
  /** Root → terminal eval swing in centipawns, mover's perspective, when the
   *  line was verified by an engine. Null on the engine-free path — stated as
   *  null rather than guessed at. */
  evalSwingCp: number | null;
}

/** One move of the line, reduced to what a board can draw.
 *
 *  Kept alongside the prose because an arrow has to come from the SAME line the
 *  sentence was read off — a mark computed from a second source is a second
 *  claim, and the two drift. See `planMarks`. */
export interface PlanStep {
  from: string;
  to: string;
  color: 'white' | 'black';
}

/** How the LINE behaves, as opposed to what either side gets out of it.
 *
 *  A coach watching a variation says "this is all forced" or "everything comes
 *  off here" long before saying who ends up better, and none of it needed new
 *  data — it is the shape of the plies we already replay. */
export interface LineShape {
  /** Leading plies where the side to move had exactly ONE legal move. There is
   *  nothing to calculate while this is running, and saying so is what tells a
   *  student when calculation actually starts. */
  forcedPlies: number;
  /** Material that comes off the board in TOTAL, both sides, in points — the
   *  volume of the trade rather than the net. A line where twelve points change
   *  hands is a different animal from one where a pawn does, even when the two
   *  end level. */
  traded: number;
  /** The line ends with the queens off and few pieces left. */
  endsInEndgame: boolean;
}

export interface LookaheadPlan {
  keySquares: KeySquare[];
  /** How the line behaves — forced, simplifying, heading for an ending. */
  shape: LineShape;
  /** The line itself, inside the horizon — where every piece actually goes. */
  path: PlanStep[];
  /** The board as it stands, beside what the line does to it. */
  read: PositionRead;
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

/** Where a colour's king stands, or null on a malformed board. */
function kingSquare(fen: string, color: 'w' | 'b'): string | null {
  try {
    for (const cell of new Chess(fen).board().flat()) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  } catch { /* fall through */ }
  return null;
}

/** King-walk distance between two squares. */
function chebyshev(a: string, b: string): number {
  return Math.max(
    Math.abs(a.charCodeAt(0) - b.charCodeAt(0)),
    Math.abs(Number(a[1]) - Number(b[1])),
  );
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
  const passedPawns: string[] = [];
  let materialSwing = 0;
  let shieldStripped = 0;
  let tactic: string | null = null;
  let tacticSquare: string | null = null;
  let mates = false;
  let nearEnemyKing = 0;
  const kingAttackSquares: string[] = [];
  const materialSquares: string[] = [];
  const tradeSquares: string[] = [];
  let checks = 0;
  let promotes: string | null = null;
  /** Where each of this side's pieces has travelled so far, keyed by the square
   *  it currently stands on. A move off a tracked square EXTENDS that piece's
   *  path instead of starting a new one — which is what turns two destinations
   *  back into one regrouping. */
  const journeys = new Map<string, { piece: string; path: string[] }>();

  for (const ply of mine) {
    const { from, to } = squaresOf(ply);
    destinations.set(to, (destinations.get(to) ?? 0) + 1);
    if (ply.facts.isCheck) checks += 1;
    if (ply.facts.promotion) promotes = to;
    const carried = journeys.get(from);
    if (carried) {
      journeys.delete(from);
      journeys.set(to, { piece: carried.piece, path: [...carried.path, to] });
    } else {
      // The SAN says which piece moved without a board read: a leading piece
      // letter, or a pawn when there is none.
      const letter = /^[KQRBN]/.exec(ply.san)?.[0] ?? 'P';
      journeys.set(to, { piece: PIECE_WORD[letter.toLowerCase()] ?? 'pawn', path: [from, to] });
    }
    for (const f of ply.facts.newOpenFiles) opening.add(f);
    const taken = capturedPiece(ply.facts.captured);
    if (taken) {
      trading.push(taken);
      if (taken !== 'pawn') tradeSquares.push(to);
    }
    if (ply.facts.outpostGained) outposts.push(ply.facts.outpostGained);
    // VERIFY THE PAWN IS ACTUALLY THIS SIDE'S, ON THE BOARD, BEFORE CLAIMING
    // IT. `newPassedPawns` pools both colours into one untagged list, so
    // crediting the mover with everything it contains hands a side the
    // OPPONENT's passed pawn — and a full-game walk duly produced "you want to
    // create a passed pawn on c2" about a pawn that was neither newly passed
    // nor, on inspection, passed at all. The board settles it: the square must
    // hold a pawn of this colour after the ply.
    const owner = color === 'white' ? 'w' : 'b';
    for (const sq of ply.facts.newPassedPawns) {
      try {
        const piece = new Chess(ply.fenAfter).get(sq as never) as { type?: string; color?: string } | undefined;
        if (piece?.type === 'p' && piece.color === owner) passedPawns.push(sq);
      } catch { /* unreadable board — claim nothing */ }
    }
    materialSwing += ply.facts.materialGained;
    if (ply.facts.materialGained > 0) materialSquares.push(to);
    shieldStripped += ply.facts.shieldLost;
    if (!tactic && ply.facts.tacticLanded) {
      tactic = ply.facts.tacticLanded;
      tacticSquare = to;
    }
    if (ply.facts.isMate) mates = true;
    // "They are coming for your king" as arithmetic: how many of this side's
    // moves land within a king's-walk of the OTHER king. Read off the board
    // before the move, so it describes where the piece is heading rather than
    // where the king ended up after being chased.
    const enemyKing = kingSquare(ply.fenBefore, color === 'white' ? 'b' : 'w');
    if (enemyKing && chebyshev(to, enemyKing) <= KING_ZONE) {
      nearEnemyKing += 1;
      kingAttackSquares.push(to);
    }
  }

  // A piece that moved once went somewhere; a piece that moved twice is being
  // REROUTED, and that is the sentence. Longest journey wins — three hops is a
  // more striking idea than two.
  const maneuver = [...journeys.values()]
    .filter((j) => j.path.length >= 3)
    // A PIECE THAT COMES HOME HAS NOT BEEN REROUTED. From the prod transcript:
    // "walk the queen round from d1 to d1, by way of f3" — a real journey, and
    // a nonsense sentence. A round trip is a piece being chased back, or the
    // engine marking time; either way it is not the regrouping this clause is
    // for.
    .filter((j) => j.path[0] !== j.path[j.path.length - 1])
    .sort((a, b) => b.path.length - a.path.length)[0] ?? null;

  const headingFor = [...destinations.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([sq]) => sq);

  return {
    color,
    headingFor,
    opening: [...opening],
    trading,
    outposts,
    materialSwing,
    passedPawns,
    shieldStripped,
    tactic,
    tacticSquare,
    maneuver,
    checks,
    promotes,
    mates,
    mateDelivered: false,
    nearEnemyKing,
    kingAttackSquares,
    materialSquares,
    tradeSquares,
    text: '',
    spokenClauses: [],
  };
}

/**
 * Turn a computed plan into one sentence, MOST IMPORTANT THING FIRST.
 *
 * The order is SCORED, not a fixed ladder. Every clause carries a weight
 * computed from the position's own numbers — four pieces converging on a king
 * outranks two, winning a rook outranks winning a pawn, a passed pawn on the
 * seventh outranks one on the fourth — so the ranking answers to the board
 * rather than to the order somebody happened to write the branches in. A static
 * ladder says the same thing first in every game.
 *
 * Capped at three clauses. The read now sees ten things, and a coach that lists
 * ten things has told the student nothing; the cap is what makes the ranking
 * mean anything.
 *
 * Empty when there is nothing to say — honest, and better than a sentence that
 * means nothing.
 */
export function describePlan(
  plan: SidePlan,
  voice: 'mine' | 'theirs',
  /** Clauses already spoken this game. A plan is stable across several plies by
   *  nature — the same pin is still coming three moves later — so without this
   *  the coach says "you want to land a pin" three turns running. Measured on a
   *  five-ply sample: "There is already a pin on the board" four plies in a row
   *  and the same intention repeated three times. Caller owns the set. */
  said?: Set<string>,
): string {
  const subject = voice === 'mine' ? 'You' : 'They';
  const theirKing = voice === 'mine' ? 'their king' : 'your king';

  // Mate ends the sentence before it starts: nothing else in the position
  // matters, and burying it behind "and open the c-file" would be absurd.
  if (plan.mates) {
    if (plan.mateDelivered) {
      return voice === 'mine'
        ? "That's checkmate — game over."
        : "That's checkmate. Game over.";
    }
    return voice === 'mine'
      ? "There's a forced mate in this line — it's there if you can find it."
      : "They've got a forced mate in this line. This is the moment to stop it.";
  }

  // Every clause carries the squares it is ABOUT, so the board can point at
  // what the sentence describes even when the words name no square — "bring
  // pieces at your king" is a warning with nowhere to look until the marks
  // arrive. Squares are the plan's own computed ones; nothing is inferred.
  const clauses: Array<{ weight: number; text: string; squares: string[] }> = [];
  const add = (weight: number, text: string, squares: string[] = []): void => {
    clauses.push({ weight, text, squares });
  };

  // A tactic that actually lands is the single most concrete thing the line
  // contains, so it starts above everything except mate.
  // PROMOTION outranks everything short of mate: a pawn reaching the eighth is
  // a new queen, and no other clause competes with that.
  if (plan.promotes) {
    add(150, `push a pawn through to a new queen on ${plan.promotes}`, [plan.promotes]);
  }
  // PROMOTION outranks everything short of mate: a pawn reaching the eighth is
  // a new queen, and no other clause competes with that. `promotion` has sat in
  // PlyFacts since pvPlayback was written and been read by nothing.
  if (plan.promotes) {
    add(150, `push a pawn through to a new queen on ${plan.promotes}`, [plan.promotes]);
  }
  const tactic = tacticWord(plan.tactic);
  if (tactic) add(90, `land a ${tactic}`, plan.tacticSquare ? [plan.tacticSquare] : []);
  // THE REROUTE — the most characteristic thing a coach says about a line, and
  // the plan had the data and no sentence for it: `headingFor` kept the
  // destinations and lost the journey, so a three-move regrouping read as two
  // unrelated squares. Ranked just under a landing tactic — concrete, visual,
  // and the thing a student can copy next game.
  if (plan.maneuver) {
    const { piece, path } = plan.maneuver;
    const via = path.slice(1, -1).join(' and ');
    add(80, `walk the ${piece} round to ${path[path.length - 1]}, by way of ${via}`, path);
  }
  // CHECKS ON THE WAY. Low weight on purpose — it is texture, not a plan — but
  // it is the difference between a quiet line and one the student has to
  // survive move by move.
  if (plan.checks >= 2) {
    add(30, `check you ${plan.checks === 2 ? 'twice' : `${plan.checks} times`} along the way`);
  }
  // King attack, scaled by how many pieces are really arriving. Two is a
  // gesture; four is an assault and the sentence should lead with it.
  if (plan.nearEnemyKing >= 2) {
    add(50 + plan.nearEnemyKing * 12, `swing pieces toward ${theirKing}`, plan.kingAttackSquares);
  }
  // Shield pawns are worth more per pawn than a piece walking over: a pawn that
  // has gone is not coming back.
  if (plan.shieldStripped > 0) add(45 + plan.shieldStripped * 18, `pull the pawns away from ${theirKing}`);
  // Material, by what it actually is. A rook is not a pawn and the ranking
  // should not pretend otherwise.
  if (plan.materialSwing >= 1) {
    const what = plan.materialSwing >= 5 ? 'a rook' : plan.materialSwing >= 3 ? 'a piece' : 'a pawn';
    add(35 + plan.materialSwing * 10, `win ${what}`, plan.materialSquares);
  }
  // A passed pawn matters more the closer it is to promoting — the one fact
  // here whose SQUARE changes its importance, not just its wording.
  if (plan.passedPawns.length > 0) {
    const sq = plan.passedPawns[0];
    const rank = Number(sq[1]);
    const advanced = plan.color === 'white' ? rank : 9 - rank;
    // Steep on purpose: a passer on the seventh is close to decisive, one on
    // the third is a long-term asset that should not outrank a knight sitting
    // on an outpost right now.
    add(10 + advanced * 8, `create a passed pawn on ${sq}`, [sq]);
  }
  if (plan.outposts.length > 0) {
    add(35, `park a piece on ${plan.outposts[0]}, where no pawn can chase it off`, [plan.outposts[0]]);
  }
  if (plan.opening.length > 0) add(25, `prise open the ${plan.opening[0]}-file`);
  if (plan.trading.length > 0) {
    // A PAWN TRADE IS NOT A PLAN. "They want to trade off the pawn" was in the
    // five-narration sample and says nothing — pawns come off in almost every
    // line. Trading a PIECE is a real intention; trading a pawn is weather.
    const unique = [...new Set(plan.trading)].filter((p) => p !== 'pawn');
    if (unique.length > 0) {
      add(20, `trade off ${unique.length > 1 ? 'pieces' : `the ${unique[0]}`}`, plan.tradeSquares);
    }
  }

  plan.spokenClauses = [];
  if (clauses.length === 0) {
    // Nothing concrete happens in the line, but the pieces still go SOMEWHERE,
    // and where they go is the plan when nothing is captured.
    if (plan.headingFor.length === 0) return '';
    const heading = plan.headingFor.slice(0, 2);
    const squares = heading.join(' and ');
    // THE DRIFT LINE OBEYS THE SAID-SET TOO. Every scored clause above is
    // filtered against it; this early return skipped the check entirely, so on
    // a quiet stretch the coach repeated itself word for word — from the prod
    // transcript, two plies running: "You bring your pieces toward d4 and c3
    // over the next few moves." Keyed on the SQUARES rather than the sentence,
    // because the pieces genuinely heading somewhere NEW is worth saying again
    // and the same destinations are not.
    const key = `drift-${voice}-${heading.join('')}`;
    if (said?.has(key)) return '';
    said?.add(key);
    const line = `${subject === 'You' ? "You're" : "They're"} bringing pieces to ${squares} over the next few moves.`;
    plan.spokenClauses = [{ text: line, squares: heading }];
    return line;
  }

  const ranked = clauses.sort((a, b) => b.weight - a.weight);
  // Skip what has already been said and DESCEND, rather than suppressing and
  // falling silent — the same rule the positional read follows, and for the
  // same reason: a repeated line and a missing line are both failures, and
  // there is usually a third true thing to say.
  const fresh = said ? ranked.filter((c) => !said.has(c.text)) : ranked;
  // EVERY CLAUSE THE LINE EARNED (David 2026-08-10: "I want to hear everything
  // the PV has to say. Do not limit it."). There was a three-clause cap here,
  // justified by "a coach that lists ten things has told the student nothing" —
  // but every clause is a distinct, board-true fact the engine's own line
  // produced, and a cap silently discards the ones ranked lowest. Ranking
  // still runs, so the most important thing is still said FIRST; that is what
  // makes an uncapped sentence safe, and it is the same argument that removed
  // the fact budget from the package.
  //
  // The said-set is the limit that stays, because it governs REPETITION rather
  // than content: nothing is dropped for being the fourth thing, only for
  // having been said already.
  const chosen = fresh;
  const shown = chosen.map((c) => c.text);
  if (shown.length === 0) return '';
  plan.spokenClauses = chosen.filter((c) => c.squares.length > 0).map((c) => ({ text: c.text, squares: c.squares }));
  for (const t of shown) said?.add(t);
  const list = shown.length === 1
    ? shown[0]
    : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
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
  /** Clauses already spoken this game — see `describePlan`. */
  said?: Set<string>,
): LookaheadPlan | null {
  if (line.plies.length < 4) return null;

  const white = planFor(line.plies, 'white');
  const black = planFor(line.plies, 'black');
  const mine = studentColor === 'white' ? white : black;
  const theirs = studentColor === 'white' ? black : white;
  mine.text = describePlan(mine, 'mine', said);
  theirs.text = describePlan(theirs, 'theirs', said);
  mergeTwinDrift(mine, theirs);
  // Assign back so `white`/`black` carry the same strings as `mine`/`theirs` —
  // they are the same objects, but say so rather than relying on it.
  if (!white.text) white.text = white === mine ? mine.text : theirs.text;
  if (!black.text) black.text = black === mine ? mine.text : theirs.text;

  return {
    keySquares: keySquaresOf(line.plies),
    shape: shapeOf(line.plies),
    path: pathOf(line.plies),
    read: readPosition(line),
    white, black, mine, theirs,
  };
}

/** The drift sentence, in either voice. */
const DRIFT = /^(You|They)'re bringing pieces to (.+) over the next few moves\.$/;

/**
 * ONE SENTENCE, NOT THE SAME SENTENCE TWICE.
 *
 * David 2026-08-10: "I think I heard a double sentence." He did. His iPhone
 * transcript, 02:47:57:
 *
 *   "They bring their pieces toward c6 and d7 over the next few moves.
 *    You bring your pieces toward c3 and d3 over the next few moves."
 *
 * Two sentences, identical word for word except the pronouns and the squares.
 * Neither is wrong — that is what makes it insidious — but heard aloud it is a
 * stutter, and it fires on exactly the quiet positions where the drift clause
 * is the ONLY thing either side has to say, which is most of them. The two
 * sides were described by separate calls that could not see each other.
 *
 * Both halves survive; they just share a sentence.
 */
function mergeTwinDrift(mine: SidePlan, theirs: SidePlan): void {
  const m = DRIFT.exec(mine.text);
  const t = DRIFT.exec(theirs.text);
  if (!m || !t) return;
  theirs.text = `They're going for ${t[2]}, and you're going for ${m[2]}.`;
  mine.text = '';
  // The squares keep their owners, so the board still marks each half in its
  // own colour — the merge is a sentence change, never a fact change.
  const merged = theirs.spokenClauses.concat(mine.spokenClauses)
    .map((c) => ({ text: theirs.text, squares: c.squares }));
  theirs.spokenClauses = merged.filter((_, i) => i < 1);
  mine.spokenClauses = merged.slice(1).map((c) => ({ text: theirs.text, squares: c.squares }));
}

/**
 * How the LINE behaves — forced, simplifying, heading for an ending.
 *
 * All three come off plies already replayed. `forcedPlies` counts the LEADING
 * run where the side to move had exactly one legal move: while that lasts there
 * is nothing to calculate, and telling a student where the choices start is
 * more useful than any claim about who stands better. `traded` is total
 * material off, both sides, which distinguishes a line where twelve points
 * change hands from one where a pawn does even when the two end level.
 */
function shapeOf(plies: readonly PvPly[]): LineShape {
  const horizon = plies.slice(0, PLAN_HORIZON);
  let forcedPlies = 0;
  let counting = true;
  let traded = 0;
  for (const ply of horizon) {
    if (counting) {
      try {
        if (new Chess(ply.fenBefore).moves().length === 1) forcedPlies += 1;
        else counting = false;
      } catch { counting = false; }
    }
    const taken = capturedPiece(ply.facts.captured);
    if (taken) traded += PIECE_POINTS[taken] ?? 0;
  }
  // The terminal board decides the ending claim — the root cannot, which is
  // precisely why "this trades into an endgame" was never sayable before.
  let endsInEndgame = false;
  const last = horizon[horizon.length - 1]?.fenAfter;
  if (last) {
    try {
      const board = new Chess(last);
      const men = board.board().flat().filter((c) => c && c.type !== 'k' && c.type !== 'p');
      endsInEndgame = men.length <= 4 && !men.some((c) => c && c.type === 'q');
    } catch { /* unreadable — claim nothing */ }
  }
  return { forcedPlies, traded, endsInEndgame };
}

/** The horizon's moves, from/to/colour — the raw material for the arrows. */
function pathOf(plies: readonly PvPly[]): PlanStep[] {
  return plies.slice(0, PLAN_HORIZON).map((p) => ({
    ...squaresOf(p),
    color: p.moverColor,
  }));
}

/** The board as it stands at the root of the line. */
function readPosition(line: PvLine): PositionRead {
  const rootFen = line.plies[0]?.fenBefore ?? '';
  const structure = rootFen ? describeStructure(rootFen) : null;
  let tacticsNow: string[] = [];
  try {
    tacticsNow = [...new Set(detectTactics(rootFen).tactics.map((t) => t.type as string))];
  } catch { /* geometry is a bonus, never a blocker */ }
  const swing = line.terminalEvalCp !== null
    ? line.terminalEvalCp - line.rootEvalCp
    : null;
  return {
    tacticsNow,
    oppositeWings: structure?.kings.oppositeWings ?? false,
    islands: { white: structure?.pawns.islands.w ?? 0, black: structure?.pawns.islands.b ?? 0 },
    halfOpen: {
      white: structure?.pawns.halfOpenFiles.w ?? [],
      black: structure?.pawns.halfOpenFiles.b ?? [],
    },
    endgameType: structure?.material.endgameType ?? null,
    materialBalance: structure?.material.balance ?? 0,
    evalSwingCp: swing,
  };
}

/**
 * One sentence about the board itself, most-telling fact first.
 *
 * Separate from the plan on purpose: the plan says what is ABOUT to happen and
 * this says what is already true, and a student needs the second to understand
 * the first. Same construction rules — fixed templates, computed values, no
 * model.
 */
export function positionReadLine(
  read: PositionRead,
  studentColor: 'white' | 'black',
  said?: Set<string>,
  /** The board, when the caller has it. Only the half-open-file line needs it,
   *  and only to answer one question: does this side still HAVE a rook? A
   *  half-open file is a pawn fact, so it survives into endings where the rooks
   *  are long gone — and the line then advises a student to post a piece they
   *  do not own. That is a `voicePackage.plan` grading drop in the live log
   *  (2026-08-10), and per G0 the cure is not to let the gate catch it: it is
   *  to not compute the claim. */
  fen?: string,
): string {
  // EVERY FRESH RUNG, NOT THE FIRST ONE (David 2026-08-10: "I want to hear
  // everything the PV has to say. Do not limit it."). Each `if` here returned
  // immediately, so a position that was an opposite-wings race AND had a pin
  // standing AND left the student a half-open file said exactly one of those
  // three things and discarded the other two, forever — the said-set marks a
  // rung used whether or not it was spoken, so the discarded ones never came
  // back on a later ply either.
  //
  // Order is unchanged, and it still matters: the most reframing fact leads.
  const lines: string[] = [];
  const once = (key: string, line: string): void => {
    if (said?.has(key)) return;
    said?.add(key);
    lines.push(line);
  };
  const mine = studentColor === 'white' ? read.islands.white : read.islands.black;
  const theirs = studentColor === 'white' ? read.islands.black : read.islands.white;
  const myHalfOpen = studentColor === 'white' ? read.halfOpen.white : read.halfOpen.black;

  // Opposite wings first: it reframes everything else. Both sides get to
  // attack without being attacked back, so speed beats material.
  if (read.oppositeWings) {
    once('opposite-wings', 'The kings have gone to opposite wings, so you can both attack without being attacked back. Speed matters more than material now.');
  }
  // EVERY tactic already standing, not just the first — a board with a pin and
  // a fork on it has two things to see.
  for (const named of read.tacticsNow.map(tacticWord).filter((t): t is string => t !== null)) {
    once(`tactic-${named}`, `There's already a ${named} sitting on the board, whether or not anyone plays into it.`);
  }
  if (read.endgameType) {
    once('endgame', `We're in a ${read.endgameType} endgame now — the pawns decide it from here.`);
  }
  if (theirs > mine) {
    once('islands', `They've got ${theirs} pawn islands to your ${mine}, and more islands means more to look after.`);
  }
  if (myHalfOpen.length > 0 && hasRook(fen, studentColor)) {
    once(`halfopen-${myHalfOpen[0]}`, `The ${myHalfOpen[0]}-file is half-open for you — that's where a rook wants to be.`);
  }
  return lines.join(' ');
}

/**
 * How the LINE behaves, in one or more sentences — forced, simplifying, or
 * heading for an ending.
 *
 * Distinct from both the plan (what a side gets out of the line) and the board
 * read (what is already true of the position): this is what a coach says while
 * a variation is playing out. None of it was sayable before, because the shape
 * was never read off the plies — the structure call only ever looked at the
 * root, so "this trades into an endgame" had no source.
 *
 * Same construction as everything else here: fixed templates, computed values,
 * and silence when the numbers do not earn a sentence.
 */
export function lineShapeLine(shape: LineShape, said?: Set<string>): string {
  const lines: string[] = [];
  const once = (key: string, line: string): void => {
    if (said?.has(key)) return;
    said?.add(key);
    lines.push(line);
  };
  // Two plies is a move and a reply with nothing to choose — worth saying,
  // because telling a student where calculation STARTS is more useful than any
  // claim about who stands better.
  if (shape.forcedPlies >= 2) {
    once('forced', `The next ${shape.forcedPlies === 2 ? 'move is' : `${shape.forcedPlies} moves are`} forced — nothing to work out until after that.`);
  }
  // Nine points is roughly a queen, two rooks, or three minor pieces. Past that
  // the board genuinely empties and the game changes character, which is a
  // different fact from who comes out ahead.
  if (shape.traded >= 9) {
    once('trades', "A lot comes off in this line — count the material before you commit to it.");
  }
  if (shape.endsInEndgame) {
    once('to-endgame', 'This trades down into an endgame, so the pawns are about to matter more than the pieces.');
  }
  return lines.join(' ');
}

/** Does this side still own a rook? Unknown board → assume not, and say
 *  nothing: silence is always available and a wrong claim is not. */
function hasRook(fen: string | undefined, color: 'white' | 'black'): boolean {
  if (!fen) return false;
  try {
    const want = color === 'white' ? 'w' : 'b';
    return new Chess(fen).board().flat()
      .some((c) => c && c.type === 'r' && c.color === want);
  } catch { return false; }
}

/**
 * The key-square line, at the strength the numbers support.
 *
 * Two claims, and which one is earned is decided by the count rather than by
 * how important it feels:
 *   contested by both sides → "the square this position turns on"
 *   touched repeatedly by one → "a square worth watching"
 */
export function keySquareLine(
  keys: readonly KeySquare[],
  /** Clauses already spoken this game. Without this the key square is the
   *  loudest repeat in the coach: a full-game walk said "f3 is the square this
   *  position turns on" three plies running, then b5 five times, then d7 four.
   *  A key square STAYS the key square for many moves — that is what makes it
   *  one — so the line has to be said once and then left alone. */
  said?: Set<string>,
): string {
  // EVERY CONTESTED SQUARE THE LINE FOUND, not only the top one (David
  // 2026-08-10: "I want to hear everything the PV has to say"). A line that
  // fights over two squares has two things to tell the student; this returned
  // after the first and the second was never mentioned on any ply.
  //
  // The said-set still holds each square to one mention across the game, so
  // this widens what is SAID without widening what is repeated.
  const spoken: string[] = [];
  for (const k of keys) {
    const line = oneKeySquare(k, said);
    if (line) spoken.push(line);
  }
  return spoken.join(' ');
}

/** One square's sentence, at the strength its counts support. */
function oneKeySquare(top: KeySquare, said?: Set<string>): string {
  const key = `keysquare-${top.square}`;
  if (said?.has(key)) return '';
  said?.add(key);
  if (top.contested && top.weight >= 16) {
    // "THE square this position turns on" is a SINGULAR claim, and a live prod
    // run made it twice in five seconds about two different squares — d5, then
    // d3 (2026-08-10). Each was true of its own line; together they cancel, and
    // a coach that names the decisive square every move has named nothing. The
    // superlative is spent once; every later square that earns attention gets
    // the honest, weaker form.
    if (!said?.has('keysquare-superlative')) {
      said?.add('keysquare-superlative');
      return `Everything's running through ${top.square} — both sides keep coming back to it.`;
    }
    // No dangling "too": the superlative may have been SPENT on a turn whose
    // sentence never reached the voice, so this can be the first key square the
    // student actually hears. It has to stand on its own.
    return `Both sides want ${top.square} here.`;
  }
  if (top.contested) {
    return `${top.square} is the contested one — you both want it.`;
  }
  // AN UNCONTESTED SQUARE HAS TO EARN THE SENTENCE. One side passing through
  // twice is not "the play keeps running through it" — a live prod run offered
  // "a7 is worth watching" in a quiet Italian, which is a rim square nothing
  // was fighting over. Contest is the whole signal; without it, the traffic has
  // to be heavy enough to mean something on its own.
  if (top.whiteTouches + top.blackTouches < 4) return '';
  return `Keep half an eye on ${top.square} — the play keeps running through it.`;
}

/** Too few plies to call anything a plan — but the board is still a board.
 *
 *  Returns a plan with EMPTY intentions and a real position read, so callers
 *  get the endgame/mate moments instead of silence. Saying "there is a forced
 *  mate here" is exactly the sort of thing a short line contains. */
function shortLineRead(
  fen: string,
  uciMoves: readonly string[],
  studentColor: 'white' | 'black',
): LookaheadPlan | null {
  let board: ChessCtor;
  try { board = new Chess(fen); } catch { return null; }
  const empty = (color: 'white' | 'black'): SidePlan => ({
    color, headingFor: [], opening: [], trading: [], outposts: [],
    passedPawns: [], materialSwing: 0, shieldStripped: 0, tactic: null,
    tacticSquare: null, maneuver: null, checks: 0, promotes: null,
    mates: false, nearEnemyKing: 0,
    kingAttackSquares: [], materialSquares: [], tradeSquares: [],
    text: '', spokenClauses: [],
  });
  // A mate ON THE BOARD is the one intention a zero-ply line still has.
  const mated = board.isCheckmate();
  const white = empty('white');
  const black = empty('black');
  const loserIsWhite = board.turn() === 'w';
  if (mated) {
    const winner = loserIsWhite ? black : white;
    winner.mates = true;
    winner.mateDelivered = true; // on the board, not coming — see `mateDelivered`
  }
  const mine = studentColor === 'white' ? white : black;
  const theirs = studentColor === 'white' ? black : white;
  mine.text = describePlan(mine, 'mine');
  theirs.text = describePlan(theirs, 'theirs');
  const stub: PvLine = {
    plies: [{
      san: '', uci: uciMoves[0] ?? '', moverColor: board.turn() === 'w' ? 'black' : 'white',
      fenBefore: fen, fenAfter: fen,
      facts: {
        captured: null, isCheck: board.isCheck(), isMate: mated, promotion: null,
        tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [],
        outpostGained: null, shieldLost: 0,
      },
    }],
    rootEvalCp: 0, terminalEvalCp: null, delivers: true, closeAlternative: null,
  };
  return {
    keySquares: [], shape: { forcedPlies: 0, traded: 0, endsInEndgame: false },
    path: [], read: readPosition(stub), white, black, mine, theirs,
  };
}

/**
 * The plan from a raw engine PV, with no second search and no engine handle.
 *
 * `computePvLine` gives a richer `PvLine` but needs an engine to verify the
 * line's terminal eval. Surfaces that already hold `topLines[0].moves` from a
 * read they made for another reason — Learn does, for the think-aloud and
 * priority-first beats — can get both plans for free by replaying it here.
 *
 * The facts filled are the ones chess.js can settle alone: what each move
 * captures, and where it lands. Opened files and outposts are left empty rather
 * than guessed, so `describe` falls back to the squares the pieces are heading
 * for — less to say, and nothing invented (G0).
 */
export function planFromUci(
  fen: string,
  uciMoves: readonly string[],
  studentColor: 'white' | 'black',
  said?: Set<string>,
): LookaheadPlan | null {
  // A SHORT LINE IS NOT NOTHING. This used to bail at fewer than four plies,
  // which meant the coach went silent for the last moves of every game — a
  // full-game walk ended with three silent plies INCLUDING the checkmate,
  // which is the worst possible moment to have nothing to say. The plan needs
  // four plies to describe an intention; the BOARD READ needs none, so a short
  // line still gets read.
  if (uciMoves.length < 4) return shortLineRead(fen, uciMoves, studentColor);
  let board: ChessCtor;
  try { board = new Chess(fen); } catch { return null; }
  const plies: PvPly[] = [];
  // Carried so a recapture is recognised as one, exactly as the engine path
  // does — without it every exchange reads as two separate captures.
  let prevCap: PrevCaptureContext = { square: null, capturedValue: 0 };
  for (const uci of uciMoves.slice(0, PLAN_HORIZON)) {
    if (!uci || uci.length < 4) break;
    const fenBefore = board.fen();
    let mv;
    try {
      mv = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    } catch { break; }
    if (!mv) break;
    plies.push({
      san: mv.san,
      uci,
      moverColor: mv.color === 'w' ? 'white' : 'black',
      fenBefore,
      fenAfter: board.fen(),
      facts: computePlyFacts(fenBefore, board.fen(), {
        captured: mv.captured,
        san: mv.san,
        color: mv.color,
        promotion: mv.promotion,
      }, prevCap),
    });
    prevCap = { square: mv.to, capturedValue: mv.captured ? (PIECE_POINTS[PIECE_WORD[mv.captured] ?? ''] ?? 0) : 0 };
  }
  if (plies.length < 4) return shortLineRead(fen, uciMoves, studentColor);
  return buildLookaheadPlan(
    { plies, rootEvalCp: 0, terminalEvalCp: null, delivers: true, closeAlternative: null },
    studentColor,
    said,
  );
}
