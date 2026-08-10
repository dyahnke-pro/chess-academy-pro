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
  trapped_piece: 'trapped piece',
};

/** Speakable name for a tactic, or null when it has none — an unknown tactic
 *  is dropped rather than read out as its identifier. */
function tacticWord(kind: string | null): string | null {
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
  /** How many of this side's moves land within a king's-walk of the ENEMY
   *  king — the computable form of "they are coming for you". */
  nearEnemyKing: number;
  /** Speakable, or '' when the line gives this side nothing describable. */
  text: string;
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

export interface LookaheadPlan {
  keySquares: KeySquare[];
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
  let mates = false;
  let nearEnemyKing = 0;

  for (const ply of mine) {
    const { to } = squaresOf(ply);
    destinations.set(to, (destinations.get(to) ?? 0) + 1);
    for (const f of ply.facts.newOpenFiles) opening.add(f);
    const taken = capturedPiece(ply.facts.captured);
    if (taken) trading.push(taken);
    if (ply.facts.outpostGained) outposts.push(ply.facts.outpostGained);
    passedPawns.push(...ply.facts.newPassedPawns);
    materialSwing += ply.facts.materialGained;
    shieldStripped += ply.facts.shieldLost;
    if (!tactic && ply.facts.tacticLanded) tactic = ply.facts.tacticLanded;
    if (ply.facts.isMate) mates = true;
    // "They are coming for your king" as arithmetic: how many of this side's
    // moves land within a king's-walk of the OTHER king. Read off the board
    // before the move, so it describes where the piece is heading rather than
    // where the king ended up after being chased.
    const enemyKing = kingSquare(ply.fenBefore, color === 'white' ? 'b' : 'w');
    if (enemyKing && chebyshev(to, enemyKing) <= KING_ZONE) nearEnemyKing += 1;
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
    materialSwing,
    passedPawns,
    shieldStripped,
    tactic,
    mates,
    nearEnemyKing,
    text: '',
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
export function describePlan(plan: SidePlan, voice: 'mine' | 'theirs'): string {
  const subject = voice === 'mine' ? 'You' : 'They';
  const possessive = voice === 'mine' ? 'your' : 'their';
  const theirKing = voice === 'mine' ? 'their king' : 'your king';

  // Mate ends the sentence before it starts: nothing else in the position
  // matters, and burying it behind "and open the c-file" would be absurd.
  if (plan.mates) {
    return voice === 'mine'
      ? 'There is a forced mate in this line — it is there if you find it.'
      : 'They have a forced mate in this line. This is the moment to stop it.';
  }

  const clauses: Array<{ weight: number; text: string }> = [];
  const add = (weight: number, text: string): void => { clauses.push({ weight, text }); };

  // A tactic that actually lands is the single most concrete thing the line
  // contains, so it starts above everything except mate.
  const tactic = tacticWord(plan.tactic);
  if (tactic) add(90, `land a ${tactic}`);
  // King attack, scaled by how many pieces are really arriving. Two is a
  // gesture; four is an assault and the sentence should lead with it.
  if (plan.nearEnemyKing >= 2) add(50 + plan.nearEnemyKing * 12, `bring pieces at ${theirKing}`);
  // Shield pawns are worth more per pawn than a piece walking over: a pawn that
  // has gone is not coming back.
  if (plan.shieldStripped > 0) add(45 + plan.shieldStripped * 18, `strip the pawns in front of ${theirKing}`);
  // Material, by what it actually is. A rook is not a pawn and the ranking
  // should not pretend otherwise.
  if (plan.materialSwing >= 1) {
    const what = plan.materialSwing >= 5 ? 'a rook' : plan.materialSwing >= 3 ? 'a piece' : 'a pawn';
    add(35 + plan.materialSwing * 10, `win ${what}`);
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
    add(10 + advanced * 8, `create a passed pawn on ${sq}`);
  }
  if (plan.outposts.length > 0) add(35, `plant a piece on ${plan.outposts[0]} where no pawn can chase it`);
  if (plan.opening.length > 0) add(25, `open the ${plan.opening[0]}-file`);
  if (plan.trading.length > 0) {
    const unique = [...new Set(plan.trading)];
    add(20, `trade off ${unique.length > 1 ? 'pieces' : `the ${unique[0]}`}`);
  }

  if (clauses.length === 0) {
    // Nothing concrete happens in the line, but the pieces still go SOMEWHERE,
    // and where they go is the plan when nothing is captured.
    if (plan.headingFor.length === 0) return '';
    const squares = plan.headingFor.slice(0, 2).join(' and ');
    return `${subject} bring ${possessive} pieces toward ${squares} over the next few moves.`;
  }

  const shown = clauses.sort((a, b) => b.weight - a.weight).slice(0, 3).map((c) => c.text);
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
): LookaheadPlan | null {
  if (line.plies.length < 4) return null;

  const white = planFor(line.plies, 'white');
  const black = planFor(line.plies, 'black');
  const mine = studentColor === 'white' ? white : black;
  const theirs = studentColor === 'white' ? black : white;
  mine.text = describePlan(mine, 'mine');
  theirs.text = describePlan(theirs, 'theirs');
  // Assign back so `white`/`black` carry the same strings as `mine`/`theirs` —
  // they are the same objects, but say so rather than relying on it.
  if (!white.text) white.text = white === mine ? mine.text : theirs.text;
  if (!black.text) black.text = black === mine ? mine.text : theirs.text;

  return {
    keySquares: keySquaresOf(line.plies),
    read: readPosition(line),
    white, black, mine, theirs,
  };
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
export function positionReadLine(read: PositionRead, studentColor: 'white' | 'black'): string {
  const mine = studentColor === 'white' ? read.islands.white : read.islands.black;
  const theirs = studentColor === 'white' ? read.islands.black : read.islands.white;
  const myHalfOpen = studentColor === 'white' ? read.halfOpen.white : read.halfOpen.black;

  // Opposite wings first: it reframes everything else. Both sides get to
  // attack without being attacked back, so speed beats material.
  if (read.oppositeWings) {
    return 'The kings have gone to opposite wings — both sides can attack without being attacked back, so speed matters more than material here.';
  }
  const named = read.tacticsNow.map(tacticWord).filter((t): t is string => t !== null);
  if (named.length > 0) {
    return `There is already a ${named[0]} on the board — it is there whether or not anyone plays into it.`;
  }
  if (read.endgameType) {
    return `This is a ${read.endgameType} endgame; the pawns decide it from here.`;
  }
  if (theirs > mine) {
    return `They have ${theirs} pawn islands to your ${mine} — more islands means more things to defend.`;
  }
  if (myHalfOpen.length > 0) {
    return `The ${myHalfOpen[0]}-file is half-open for you; that is where a rook belongs.`;
  }
  return '';
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
): LookaheadPlan | null {
  if (uciMoves.length < 4) return null;
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
  if (plies.length < 4) return null;
  return buildLookaheadPlan(
    { plies, rootEvalCp: 0, terminalEvalCp: null, delivers: true, closeAlternative: null },
    studentColor,
  );
}
