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
import { seatPieceReferences } from '../utils/seatPieces';
import { Chess, type Square } from 'chess.js';
import { computePlyFacts } from './pvPlayback';
import { describeStructure } from './boardStructure';
import { detectTactics } from './tacticsDetector';
import { PATTERN_SPEECH, patternAim, patternClaimsMaterial } from './tacticVocabulary';
import type { PvLine, PvPly, PrevCaptureContext } from './pvPlayback';
import { aimsOf, aimWalkableNow, stepArc, EMPTY_ARC, type ArcEvent, type ArcMove, type Seat } from './planArc';
import { proofCut } from './exchangeLedger';
// The PLAN ACROSS MOVES (planArc) — the memory this reader never had. Exposed
// from here so a surface composes one plan module, not two.
export { aimsOf, aimWalkableNow, joinEmerges, stepArc, EMPTY_ARC, type ArcEvent, type ArcState, type ArcMove, type Seat, type Aim } from './planArc';

type ChessCtor = InstanceType<typeof Chess>;

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen',
};

/**
 * The squares a journey ACTUALLY passes through — start and destination
 * removed, repeats collapsed, order kept.
 *
 * 🔒 A ROUTE MAY NOT NAME ITS OWN DESTINATION. `path` is the raw list of
 * squares a piece touched, so a piece that goes c2 → b3 → c2 has c2 in the
 * middle of its own journey, and `path.slice(1, -1)` handed that straight to
 * the sentence: "walk the queen round to c2, by way of c2 and b3." Real
 * journey, nonsense sentence, and it happened twice in one game.
 */
/** Could the piece on `from` step to `to` in ONE move on this board — its own
 *  geometry, with the squares between clear? Unreadable board → false, so the
 *  caller's reroute survives rather than being dropped on a guess. */
export function reachesInOneMove(fen: string | undefined, from: string, to: string): boolean {
  if (!fen) return false;
  let board: Chess;
  try { board = new Chess(fen); } catch { return false; }
  const piece = board.get(from as Square);
  if (!piece) return false;
  const df = to.charCodeAt(0) - from.charCodeAt(0);
  const dr = Number(to[1]) - Number(from[1]);
  const adf = Math.abs(df); const adr = Math.abs(dr);
  if (piece.type === 'n') return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
  if (piece.type === 'k') return Math.max(adf, adr) === 1;
  const straight = df === 0 || dr === 0;
  const diagonal = adf === adr && adf > 0;
  const shapeOk = piece.type === 'q' ? straight || diagonal : piece.type === 'r' ? straight : piece.type === 'b' ? diagonal : false;
  if (!shapeOk) return false;
  const sf = Math.sign(df); const sr = Math.sign(dr);
  for (let i = 1; i < Math.max(adf, adr); i++) {
    const sq = `${String.fromCharCode(from.charCodeAt(0) + sf * i)}${Number(from[1]) + sr * i}`;
    if (board.get(sq as Square)) return false;
  }
  return true;
}

/** What stands on a route's destination on the board the plan is read from:
 *  the mover's own piece (no route there yet), theirs (the route takes it), or
 *  nothing. */
export function routeDestination(fen: string, dest: string, color: 'white' | 'black'): { kind: 'own' } | { kind: 'takes'; piece: string } | { kind: 'empty' } {
  try {
    const pc = new Chess(fen).get(dest as never) as { type?: string; color?: string } | undefined;
    if (!pc?.type) return { kind: 'empty' };
    if (pc.color === (color === 'white' ? 'w' : 'b')) return { kind: 'own' };
    return { kind: 'takes', piece: PIECE_WORD[pc.type] ?? 'piece' };
  } catch { return { kind: 'empty' }; }
}

/** WHICH PIECE a reroute clause is about, as data: its kind and the square it
 *  starts the line on. A reader decides whether the route belongs to the move
 *  it is explaining by comparing `from` with that move's own from-square — never
 *  by parsing the sentence (clean-pass walk 2026-10-03: two bishops, one route,
 *  and "the bishop" named the wrong one). */
export interface ClauseRoute { piece: string; from: string }

export function waypointsOf(path: readonly string[]): string[] {
  if (path.length < 3) return [];
  const start = path[0];
  const end = path[path.length - 1];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sq of path.slice(1, -1)) {
    if (sq === start || sq === end || seen.has(sq)) continue;
    seen.add(sq);
    out.push(sq);
  }
  return out;
}

/** Speakable name for a tactic, or null when it has none — an unknown tactic
 *  is dropped rather than read out as its identifier. */
/** Tactic names and aims in English come from the ONE table,
 *  `tacticVocabulary.PATTERN_SPEECH` — never a snake_case enum read aloud
 *  ("You want to land a mate_threat"), never a hand-copied list. */
export function tacticAim(kind: string | null): string | null {
  return kind && kind !== 'battery' ? patternAim(kind) : null;
}

export function tacticWord(kind: string | null): string | null {
  if (!kind || kind === 'battery' || kind === 'none') return null;
  return (PATTERN_SPEECH as Record<string, { word: string }>)[kind]?.word ?? null;
}

/**
 * THE STUDENT'S OWN TACTIC, SEATED FROM THE BOARD (run C walk 2026-09-30: "You
 * have a pin: bishop on h3 pins rook on g2 against king on f1" — nobody's
 * pieces). Whose each piece is, is read off the board by the one seating
 * computer (`seatPieceReferences`), never guessed from word order: a back-rank
 * description names the VICTIM king first, and a word-order guess called it
 * "your king on g1" (run F walk 2026-09-30). When the description already
 * names the motif, it IS the sentence.
 */
export function seatedTacticLine(word: string, description: string | null | undefined, fen: string, student: 'w' | 'b'): string {
  if (!description) return `You have a ${word}.`;
  let d = description.trim().replace(/[.!]$/, '');
  d = d.charAt(0).toLowerCase() + d.slice(1);
  d = seatPieceReferences(d, fen, student);
  const body = d.charAt(0).toUpperCase() + d.slice(1);
  return new RegExp(`\\b${word}\\b`).test(d) ? `${body}.` : `You have a ${word}: ${d}.`;
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
  /** WHAT was won and what was given for it, counted off the board at the
   *  same quiet point as `materialSwing` — so a bishop taken for a pawn is said
   *  as that, never rounded to "a pawn" (manual claim check 2026-09-30, 190). */
  materialDeal?: { took: string; gave: string | null };
  /** Passed pawns this side creates. */
  passedPawns: string[];
  /** Passed pawns this side PUSHES — a passer that already stood and steps on.
   *  Kept apart from `passedPawns` so it is never voiced as "create" (calc hand
   *  walk 2026-10-01: an advancing passer read as a new one on every push). */
  pushedPassers?: string[];
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
  /** The piece trades this side's FIRST move actually sets up — the capture
   *  is that move, or the first move lands where it attacks the square the
   *  capture happens on. Only these may be spoken as the move's WHY
   *  (WO-STANDARD-01 D-6). */
  tradeIntended: string[];
  /** Where the tactic lands, when one does. */
  tacticSquare: string | null;
  /** This side's pieces that never move in the whole line, by square — "your
   *  queenside sleeps through this". A plan is as much about what is left out
   *  as what is included, and the journeys already say which pieces moved. */
  idlePieces: string[];
  /** A piece that MOVES TWICE OR MORE inside the horizon, with the squares it
   *  travels through — "the knight goes f3, d2, then c4".
   *
   *  The single most characteristic thing a strong coach says about a line, and
   *  the plan was throwing it away: `headingFor` kept the destinations and lost
   *  the journey, so a three-move regrouping read as two unrelated squares. The
   *  chain was already being reconstructed inside `planMarks` to place an
   *  arrow; here it becomes the sentence it always was. */
  maneuver: { piece: string; path: string[]; takes?: string } | null;
  /** Checks this side gives inside the horizon. `isCheck` has been computed on
   *  every ply since `pvPlayback` was written and read by nothing. */
  checks: number;
  /** A pawn this side promotes, by square — the loudest thing a line can
   *  contain and, until now, invisible for the same reason. */
  promotes: string | null;
  /** Speakable, or '' when the line gives this side nothing describable.
   *
   *  The WANT-LIST only — one sentence. Callers that want a compact preview
   *  (the fork offer describes three roads in a breath) use this alone; the
   *  full narration appends `aside`. */
  text: string;
  /** A separate observation about the line that is NOT something this side
   *  wants — today, the pieces the whole plan happens without.
   *
   *  It is its own field for the same reason it is its own sentence: folded into
   *  the want-list it reads as an intention ("you want to … and leave a1, d1, f1
   *  exactly where they are"), and folded into `text` it repeats once per road
   *  in a fork offer, which a probe caught doing exactly that. '' when there is
   *  nothing to notice, which is most lines. */
  aside: string;
  /** THE CLAUSES THAT REACHED `text`, each with the squares it is about.
   *
   *  This is what lets the board draw a plan the words never spelled out — "they
   *  want to bring pieces at your king" points nowhere by itself — while keeping
   *  the coupling that makes marks honest: a caller draws a clause's squares
   *  only after confirming that clause is in the utterance the student actually
   *  heard. See `planMarks`. */
  /** The want-list, clause by clause, ranked — highest weight first.
   *
   *  🔒 EACH `text` IS A BARE VERB PHRASE, NEVER A FINISHED SENTENCE. It has to
   *  read correctly spliced after BOTH "You want to …" (here) and "it would …"
   *  (`inaccuracyCall.whyBetter`, which takes the leader as the single strongest
   *  reason the better move was better). So: "win a pawn", "land a skewer",
   *  "walk the bishop round to b3, by way of f7" — lowercase, no full stop.
   *
   *  Two producers broke this and both shipped ungrammatical callouts that every
   *  board-truth gate passed, because each half was true and only the JOIN was
   *  wrong. Keep new producers to the contract rather than teaching consumers to
   *  detect the violation — a validator on prose is the thing G0 says to stop
   *  writing. */
  /** `drift` marks the fallback "bring pieces to X and Y" — where the pieces
   *  end up, not why a move is good. A reason-seeking caller skips it. */
  spokenClauses: Array<{ text: string; squares: string[]; drift?: true; route?: ClauseRoute }>;
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
/** What the board looks like WHERE THE LINE ENDS, and how that differs from
 *  where it starts.
 *
 *  The read has only ever looked at the root, so every claim about what a line
 *  LEAVES BEHIND — better pawns, a king on an open file, pieces with nowhere to
 *  go — had no source. The terminal position is already computed on the last
 *  ply; nothing here costs a search. */
export interface TerminalRead {
  /** Undefended enemy pieces standing at the end of the line, by square. */
  loose: string[];
  /** Legal-move count at the terminus for each side, against the root — the
   *  computable form of "their pieces run out of squares". */
  mobilityShift: { mine: number; theirs: number };
  /** Whose king ends up on a file with no pawns on it. */
  kingOnOpenFile: 'mine' | 'theirs' | null;
  /** Who comes out of the line with fewer pawn islands. */
  betterPawns: 'mine' | 'theirs' | null;
  /** Pawn breaks available once the line finishes, by destination square. */
  breaks: string[];
}

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
  /** A position occurs twice — the line is heading for a repetition, which is
   *  a draw offer neither side has to accept and a fact the student should
   *  hear before assuming they are winning. */
  repeats: boolean;
  /** Plies before anything is captured. A line where nothing touches for six
   *  moves is a manoeuvring line, and saying so tells the student what KIND of
   *  calculation they are doing. Null when nothing is captured at all. */
  pliesToFirstCapture: number | null;
  /** A NON-forcing move sitting inside a run of forcing ones — the in-between
   *  move, and the point of most tactics. Held as its index so a caller can
   *  count moves rather than plies. */
  quietMoveIndex: number | null;
  /** Root → terminal eval swing, mover's perspective, when the line was
   *  engine-verified. Null on the engine-free path — stated as null rather
   *  than guessed at. */
  evalSwingCp: number | null;
  /** Whose king loses the right to castle inside the line. */
  castlingLost: 'mine' | 'theirs' | 'both' | null;
}

export interface LookaheadPlan {
  keySquares: KeySquare[];
  /** How the line behaves — forced, simplifying, heading for an ending. */
  shape: LineShape;
  /** What the board looks like where the line ends. */
  terminal: TerminalRead;
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

function planFor(
  plies: readonly PvPly[],
  color: 'white' | 'black',
  /** The move that STARTED an exchange the line is finishing (the line opens
   *  by taking back on the square it captured on). The ledger counts from
   *  before it, so a recapture is the other half of a trade, never a win.
   *  Null when the line starts on a quiet board. */
  exchangePrior: { fenBefore: string; san: string } | null,
): SidePlan {
  const mine = plies.slice(0, PLAN_HORIZON).filter((p) => p.moverColor === color);
  const destinations = new Map<string, number>();
  const opening = new Set<string>();
  const trading: string[] = [];
  const outposts: string[] = [];
  const passedPawns: string[] = [];
  const pushedPassers: string[] = [];
  let materialSwing = 0;
  let materialDeal: { took: string; gave: string | null } | undefined;
  let shieldStripped = 0;
  let tactic: string | null = null;
  let tacticSquare: string | null = null;
  let mates = false;
  let nearEnemyKing = 0;
  const kingAttackSquares: string[] = [];
  const materialSquares: string[] = [];
  const tradeSquares: string[] = [];
  const tradeIntended: string[] = [];
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
      if (taken !== 'pawn') {
        tradeSquares.push(to);
        // THE WHY MUST BELONG TO THE MOVE (WO-STANDARD-01 D-6, prod tape
        // 2026-09-22: "Nc6 was the move, to trade off the knight" — the
        // knight came off five plies later, by a different piece, on a
        // square Nc6 never looked at). A trade is this move's intention only
        // when the move IS the capture, or lands where it attacks the square
        // the capture happens on — read off the board after the first move.
        // A RECAPTURE IS NOT A TRADE THIS SIDE CHOSE (Learn walk oct3c, 4.Nf3:
        // "the idea is to trade off the knight" over Nf3 …Qc7 O-O …Nxe5 Nxe5 —
        // Black started it, on a pawn it was winning). The trade is this side's
        // only when its capture opens the exchange on that square.
        const at = plies.indexOf(ply);
        const prev = at > 0 ? plies[at - 1] : undefined;
        const recapture = prev
          ? prev.moverColor !== color && !!prev.facts.captured && squaresOf(prev).to === to
          : at === 0 && exchangePrior !== null && priorCaptureSquare(exchangePrior) === to;
        if (!recapture && tradeSetUpByFirstMove(mine[0], to, color)) tradeIntended.push(taken);
      }
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
    // A pawn move that lands as a passer it already was: pushing the passer.
    if (!/^[KQRBNO]/.test(ply.san) && !ply.facts.newPassedPawns.includes(to)) {
      const passed = describeStructure(ply.fenAfter)?.pawns.passedPawns[owner] ?? [];
      if (passed.includes(to)) pushedPassers.push(to);
    }
    materialSwing += ply.facts.materialGained;
    if (ply.facts.materialGained > 0) materialSquares.push(to);
    shieldStripped += ply.facts.shieldLost;
    // A DISCOVERY THE NEXT MOVE TAKES AWAY IS NOT A PLAN (walk 2026-10-02:
    // "d5 was their move, to unleash a discovered attack" — the line's dxe6
    // sets up exf7+ against the rook on e8, and its own next move …fxe6 takes
    // the pawn). A discovery in waiting lands only if the blocker survives.
    const reply = plies[plies.indexOf(ply) + 1];
    const blockerTaken = ply.facts.tacticLanded === 'discovery' && !!reply && reply.moverColor !== color && reply.uci.slice(2, 4) === to;
    // …and a tactic is a plan only if the line goes on to WIN with it (walk
    // oct3b, 20.d3: "the idea is to unleash a discovered attack" — Be3 hits
    // the knight on b1 and …Nc3 simply steps away). Read by the one ledger.
    const lineCollects = (): boolean => {
      const rest = plies.slice(plies.indexOf(ply)).map((p) => p.san);
      const proof = proofCut(ply.fenBefore, rest, color === 'white' ? 'w' : 'b');
      if (!proof) return false;
      if (proof.mate) return (plies[plies.indexOf(ply) + proof.plies - 1]?.moverColor ?? null) === color;
      return !!proof.ledger && proof.ledger.netPawns > 0;
    };
    if (!tactic && ply.facts.tacticLanded && !blockerTaken && (!patternClaimsMaterial(ply.facts.tacticLanded) || lineCollects())) {
      tactic = ply.facts.tacticLanded;
      tacticSquare = to;
    }
    if (ply.facts.isMate) mates = true;
    // "They are coming for your king" as arithmetic: how many of this side's
    // moves land within a king's-walk of the OTHER king. Read off the board
    // before the move, so it describes where the piece is heading rather than
    // where the king ended up after being chased.
    const enemyKing = kingSquare(ply.fenBefore, color === 'white' ? 'b' : 'w');
    // PIECES only: a king walking over or a pawn run is not "swinging pieces
    // toward their king" (hand walk 2026-09-27, a king-and-pawn ending: "h6 was
    // the move, to swing pieces toward their king" with no pieces on the board).
    // …and a capture taken straight back is a TRADE, not a piece arriving
    // (walk oct3a: "Rc1 was the move — swing pieces toward their king" for a
    // line whose Qxa6 and Bxc7 are each recaptured at once).
    const tradedOff = ply.san.includes('x') && !!reply && reply.moverColor !== color && reply.uci.slice(2, 4) === to;
    if (enemyKing && /^[QRBN]/.test(ply.san) && !tradedOff && chebyshev(to, enemyKing) <= KING_ZONE) {
      nearEnemyKing += 1;
      kingAttackSquares.push(to);
    }
  }

  // A PASSER THE LINE TAKES STRAIGHT BACK WAS NEVER CREATED (Learn walk
  // 2026-10-01: "exf3 was their move, to create a passed pawn on f3" — and
  // Qxf3 takes it the next move). The pawn must still stand on its file at the
  // end of the horizon, where it landed or further up.
  {
    const endFen = plies.slice(0, PLAN_HORIZON).at(-1)?.fenAfter;
    if (endFen && passedPawns.length) {
      try {
        const end = new Chess(endFen);
        const owner = color === 'white' ? 'w' : 'b';
        const survives = (sq: string): boolean => {
          const r0 = Number(sq[1]);
          for (let r = 1; r <= 8; r += 1) {
            if (owner === 'w' ? r < r0 : r > r0) continue;
            const pc = end.get(`${sq[0]}${r}` as never) as { type?: string; color?: string } | undefined;
            if (pc?.type === 'p' && pc.color === owner) return true;
          }
          return false;
        };
        for (let i = passedPawns.length - 1; i >= 0; i -= 1) if (!survives(passedPawns[i])) passedPawns.splice(i, 1);
      } catch { /* unreadable end — keep the claim as the board gave it */ }
    }
  }

  // WHAT THE LINE WINS is the ONE ledger rule (WO-OUTCOME-01): its settled
  // net at the listener's horizon, counted from before an exchange the line
  // finishes (a recapture is the other half of a trade, never a win). The
  // private quiet-point count this replaces disagreed with the ledger.
  {
    const proof = plies.length > 0
      ? proofCut(plies[0].fenBefore, plies.map((p) => p.san), color === 'white' ? 'w' : 'b', exchangePrior)
      : null;
    materialSwing = proof && !proof.mate && proof.ledger ? proof.ledger.netPawns : 0;
    // …and WHAT it took and gave are the ledger's own lists, never a second
    // count of two boards (walk oct3g, 30.Ng4: the board diff came back empty
    // and the clause fell to a value bucket — "let them win a rook" for a line
    // that wins the queen for a bishop).
    if (proof && proof.ledger && materialSwing >= 1) materialDeal = dealOfLedger(proof.ledger.studentWon, proof.ledger.opponentWon);
  }

  // WHAT NEVER MOVED. A plan is as much about what is left out as what is in
  // it — "your queenside sleeps through this line" is a real criticism of a
  // plan and the journeys already say which pieces took part. Non-pawns only:
  // pawns sitting still is the normal state of a pawn.
  const movedFrom = new Set<string>();
  for (const j of journeys.values()) for (const sq of j.path) movedFrom.add(sq);
  const idlePieces: string[] = [];
  try {
    const rootFen = mine[0]?.fenBefore;
    if (rootFen) {
      const want = color === 'white' ? 'w' : 'b';
      for (const cell of new Chess(rootFen).board().flat()) {
        if (!cell || cell.color !== want) continue;
        if (cell.type === 'p' || cell.type === 'k') continue;
        if (!movedFrom.has(cell.square)) idlePieces.push(cell.square);
      }
    }
  } catch { /* unreadable root — claim nothing */ }

  // A piece that moved once went somewhere; a piece that moved twice is being
  // REROUTED, and that is the sentence. Longest journey wins — three hops is a
  // more striking idea than two.
  const rootFen = mine[0]?.fenBefore;
  const maneuverPick = [...journeys.values()]
    .filter((j) => j.path.length >= 3)
    // A ROUTE MAY NOT NAME ITS OWN DESTINATION AS A WAYPOINT. From David's game
    // of 2026-08-11: "walk the queen round to c2, by way of c2 and b3" — and
    // again "walk the knight round to c6, by way of c6 and a5". Both are real
    // journeys (the piece went c2, b3, c2) but the sentence is nonsense: you do
    // not travel to a square by way of that square. A piece that leaves and
    // comes back has been chased, not rerouted, so once the destination and the
    // start are removed from the waypoints there has to be something LEFT for
    // this to be a regrouping at all.
    .filter((j) => waypointsOf(j.path).length > 0)
    // A PAWN IS NOT REROUTED. A live probe produced "they want to walk the pawn
    // round to a5, by way of b6" — that is not a regrouping, it is a pawn
    // capturing twice, and no coach has ever described it that way. The reroute
    // is a PIECE idea: a knight or bishop taking the long way to a better
    // square. Pawns only go forwards.
    .filter((j) => j.piece !== 'pawn')
    // A PIECE THAT COMES HOME HAS NOT BEEN REROUTED. From the prod transcript:
    // "walk the queen round from d1 to d1, by way of f3" — a real journey, and
    // a nonsense sentence. A round trip is a piece being chased back, or the
    // engine marking time; either way it is not the regrouping this clause is
    // for.
    .filter((j) => j.path[0] !== j.path[j.path.length - 1])
    // A ROUTE THE PIECE DID NOT NEED IS NOT A REGROUPING (review walk 900,
    // 2026-09-26): "…Bh2+ — it would walk the bishop round to c7, by way of
    // h2". The bishop checked, then dropped back to c7 — a square it reached
    // from d6 in one move. A reroute is the long way to a square the short way
    // cannot reach; when the start sees the destination on the ROOT board,
    // the waypoints are incident (a check, a chase), not the idea.
    .filter((j) => !reachesInOneMove(mine[0]?.fenBefore, j.path[0], j.path[j.path.length - 1]))
    // A ROUTE ONTO A SQUARE ITS OWN PIECE HOLDS IS NO PLAN (Learn walk
    // 2026-10-01: "getting the rook to c3, by way of c1" with White's knight
    // on c3 — the line only works once that knight has gone).
    .filter((j) => !rootFen || routeDestination(rootFen, j.path[j.path.length - 1], color).kind !== 'own')
    // …nor a heavy piece walking back to its own first rank (Learn walk
    // 2026-10-01: "getting the rook to d1, by way of d5" — a retreat, not a
    // plan). A minor's Nd2–f1 regroup is the classic reroute and stays.
    .filter((j) => !((j.piece === 'rook' || j.piece === 'queen') && j.path[j.path.length - 1][1] === (color === 'white' ? '1' : '8')))
    .sort((a, b) => b.path.length - a.path.length)[0] ?? null;
  // …and onto a square THEIR piece holds, the route ends in a capture, so it
  // is said as one ("getting the knight to a7" was taking the a7 pawn).
  // What it takes is what the LINE's arriving move captures, never what stood
  // there on the root board (walk oct3b, 21…Rac8: "walk the rook round to c1
  // … and take the bishop there" — the bishop had gone to b4 by then).
  const arrivalCapture = (path: readonly string[]): string | null => {
    const dest = path[path.length - 1];
    const from = path[path.length - 2];
    const arrival = mine.find((p) => p.uci.slice(0, 2) === from && p.uci.slice(2, 4) === dest);
    if (!arrival) return null;
    try {
      const mv = new Chess(arrival.fenBefore).move({ from, to: dest, promotion: arrival.uci[4] });
      return mv?.captured ? PIECE_WORD[mv.captured] ?? 'piece' : null;
    } catch { return null; }
  };
  const takenOnArrival = maneuverPick ? arrivalCapture(maneuverPick.path) : null;
  // …and the capture must be the one the CURRENT board shows (clean-pass walk
  // 2026-10-03, G2 ply 30: "getting the bishop to e2, by way of a6, to take
  // the knight there" — e2 held White's queen; a knight only arrived there
  // later in the line). When what stands on the destination now is not what
  // the line takes there, the target moves under the plan: it is not a route
  // anyone can follow from this board, so it is not said.
  const rootOccupant = maneuverPick && rootFen ? (() => {
    try { return new Chess(rootFen).get(maneuverPick.path[maneuverPick.path.length - 1] as Square) ?? null; } catch { return null; }
  })() : null;
  const theirsNow = rootOccupant && rootOccupant.color !== (color === 'white' ? 'w' : 'b') ? PIECE_WORD[rootOccupant.type] ?? 'piece' : null;
  const targetShifts = theirsNow !== null && theirsNow !== takenOnArrival;
  // …and a capture of a piece that is NOT there yet is said as one that
  // arrives (review walk 2026-10-04, G2 16.Bb1: "walk the bishop round to d5,
  // by way of c4 and take the knight there" — d5 was empty; their knight
  // reached it later in the line).
  const takes = takenOnArrival && theirsNow === null ? `${takenOnArrival} that lands` : takenOnArrival;
  const maneuver = !maneuverPick || targetShifts ? null : takes ? { ...maneuverPick, takes } : maneuverPick;

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
    ...(materialDeal ? { materialDeal } : {}),
    passedPawns,
    ...(pushedPassers.length ? { pushedPassers } : {}),
    shieldStripped,
    tactic,
    tacticSquare,
    idlePieces,
    maneuver,
    checks,
    promotes,
    mates,
    mateDelivered: false,
    nearEnemyKing,
    kingAttackSquares,
    materialSquares,
    tradeSquares,
    tradeIntended,
    text: '',
    aside: '',
    spokenClauses: [],
  };
}

/** Does this side's first move of the line set up a capture on `captureSq`?
 *  True when the first move IS that capture, or when the piece it moved
 *  attacks `captureSq` from where it landed. Board-read; never inferred from
 *  the SAN. */
/** The square the move before the line captured on, or null. */
function priorCaptureSquare(prior: { fenBefore: string; san: string }): string | null {
  try {
    const m = new Chess(prior.fenBefore).move(prior.san);
    return m?.captured ? m.to : null;
  } catch { return null; }
}

function tradeSetUpByFirstMove(first: PvPly | undefined, captureSq: string, color: 'white' | 'black'): boolean {
  if (!first) return false;
  const { to } = squaresOf(first);
  if (to === captureSq && first.facts.captured) return true;
  try {
    const c = new Chess(first.fenAfter);
    return c.attackers(captureSq as Square, color === 'white' ? 'w' : 'b').includes(to as Square);
  } catch { return false; }
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
  // 🔴 "You" for the student, "They" for the opponent — CLAUDE.md's locked rule
  // (David 2026-08-28), which SUPERSEDES the earlier collaborative-plan voice
  // here (2026-08-23, "we want to advance the queenside; they want to attack
  // the king"). Both were his; the later one is stricter and app-wide, and he
  // confirmed it applies here on 2026-09-21.
  //
  // The deleted comment is not annotated because the claim itself is what
  // rotted: it told every reader the plan was a sanctioned carve-out from a
  // ban that has no carve-outs.
  //
  // HOW IT SURVIVED THE MIGRATION THAT CLEARED 8,197 OCCURRENCES:
  // `perspectiveVoice` scans shipped narration DATA — the JSON corpora and the
  // lesson beats — and this is a CODE TEMPLATE. The gate could not see it, so
  // the sweep passed it by. `noBannedPronounsInCode` now covers that gap.
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
  const clauses: Array<{ weight: number; text: string; squares: string[]; route?: ClauseRoute }> = [];
  const add = (weight: number, text: string, squares: string[] = [], route?: ClauseRoute): void => {
    clauses.push({ weight, text, squares, ...(route ? { route } : {}) });
  };

  // A tactic that actually lands is the single most concrete thing the line
  // contains, so it starts above everything except mate.
  // PROMOTION outranks everything short of mate: a pawn reaching the eighth is
  // a new queen, and no other clause competes with that.
  // (`promotion` had sat in PlyFacts since pvPlayback was written and been read
  // by nothing. It was then added TWICE in one edit — the same clause, same
  // weight, appended to the list back to back, so a promoting line said "push a
  // pawn through to a new queen on a8" and then said it again.)
  if (plan.promotes) {
    add(150, `push a pawn through to a new queen on ${plan.promotes}`, [plan.promotes]);
  }
  const tactic = tacticAim(plan.tactic);
  if (tactic) add(90, tactic, plan.tacticSquare ? [plan.tacticSquare] : []);
  // THE REROUTE — the most characteristic thing a coach says about a line, and
  // the plan had the data and no sentence for it: `headingFor` kept the
  // destinations and lost the journey, so a three-move regrouping read as two
  // unrelated squares. Ranked just under a landing tactic — concrete, visual,
  // and the thing a student can copy next game.
  if (plan.maneuver) {
    const { piece, path } = plan.maneuver;
    const via = waypointsOf(path);
    // Belt and braces with the selection filter: if the journey has no waypoint
    // that is not also its destination, there is no reroute to describe and the
    // clause says nothing rather than saying something false.
    if (via.length > 0) {
      const dest = path[path.length - 1];
      const takes = plan.maneuver.takes ? `, and take the ${plan.maneuver.takes} there` : '';
      // NAMED BY ITS SQUARE (clean-pass walk 2026-10-03, G1 18.Ba4+ and G3
      // 13…Bf5): "the idea is to walk the bishop round to c5, by way of e3"
      // was the OTHER bishop's route — the f4 bishop, in the line — and "the
      // bishop" reads as the one that just moved. The square says which.
      add(80, `walk the ${piece} on ${path[0]} round to ${dest}, by way of ${via.join(' and ')}${takes}`, [path[0], ...via, dest], { piece, from: path[0] });
    }
  }
  // CHECKS ON THE WAY. Low weight on purpose — it is texture, not a plan — but
  // it is the difference between a quiet line and one the student has to
  // survive move by move.
  //
  // 🔒 AND IT CHECKS THE OTHER SIDE, WHICHEVER SIDE IS SPEAKING. This read
  // `check you …` in both voices, so the student's OWN plan said "You want to …
  // check you twice along the way" — the student checking themselves. Every
  // sibling clause in this want-list takes its side from `theirKing`; this was
  // the only one that hardcoded a pronoun, and being board-true (the checks are
  // counted correctly) it was invisible to every gate.
  if (plan.checks >= 2) {
    const whom = voice === 'mine' ? 'them' : 'you';
    add(30, `check ${whom} ${plan.checks === 2 ? 'twice' : `${plan.checks} times`} along the way`);
  }
  // WHAT THE PLAN LEAVES OUT IS NOT A CLAUSE — it is its own sentence, added
  // after the want-list at the bottom of this function. See the note there.

  // King attack, scaled by how many pieces are really arriving. Two is a
  // gesture; four is an assault and the sentence should lead with it.
  // …but never above a PIECE the line actually wins (Learn walk 2026-10-02,
  // ply 32: "Ne3 was cleaner — it would swing pieces toward their king" for a
  // knight fork that wins the queen; the king read scored 98, the queen 95).
  if (plan.nearEnemyKing >= 2) {
    const kingWeight = 50 + plan.nearEnemyKing * 12;
    // …and below ANY material the line wins (walk oct3a: "Ne5 was the move —
    // it would swing pieces toward their king" for Ne5 Qe7 Qb5 f6 Nxg6, which
    // wins the g6 pawn; the king read is a count of landing squares, the pawn
    // is the point).
    // A real assault (four pieces) still leads a pawn; a two- or three-piece
    // gesture does not.
    const yields = plan.materialSwing >= 3 || (plan.materialSwing >= 1 && plan.nearEnemyKing < 4);
    const capped = yields ? Math.min(kingWeight, 34 + plan.materialSwing * 10) : kingWeight;
    add(capped, `swing pieces toward ${theirKing}`, plan.kingAttackSquares);
  }
  // Shield pawns are worth more per pawn than a piece walking over: a pawn that
  // has gone is not coming back.
  if (plan.shieldStripped > 0) add(45 + plan.shieldStripped * 18, `pull the pawns away from ${theirKing}`);
  // Material, by what it actually is. A rook is not a pawn and the ranking
  // should not pretend otherwise.
  if (plan.materialSwing >= 1) {
    const what = plan.materialDeal
      ? `${plan.materialDeal.took}${plan.materialDeal.gave ? ` for ${plan.materialDeal.gave}` : ''}`
      : plan.materialSwing >= 5 ? 'a rook' : plan.materialSwing >= 3 ? 'a piece' : 'a pawn';
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
  if (plan.passedPawns.length === 0 && plan.pushedPassers?.length) {
    const sq = plan.pushedPassers[plan.pushedPassers.length - 1];
    const rank = Number(sq[1]);
    const advanced = plan.color === 'white' ? rank : 9 - rank;
    add(10 + advanced * 8, `push the passed pawn on to ${sq}`, [sq]);
  }
  if (plan.outposts.length > 0) {
    add(35, `park a piece on ${plan.outposts[0]}, where none of their pawns can attack it`, [plan.outposts[0]]);
  }
  if (plan.opening.length > 0) add(25, `prise open the ${plan.opening[0]}-file`);
  if (plan.trading.length > 0) {
    // A PAWN TRADE IS NOT A PLAN. "They want to trade off the pawn" was in the
    // five-narration sample and says nothing — pawns come off in almost every
    // line. Trading a PIECE is a real intention; trading a pawn is weather.
    // AND THE FIRST MOVE MUST SET IT UP (D-6): a capture somewhere down the
    // line is the line's weather, not this move's reason.
    const unique = [...new Set(plan.tradeIntended)].filter((p) => p !== 'pawn');
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
    const line = `${voice === 'mine' ? "You're" : "They're"} bringing pieces to ${squares} over the next few moves.`;
    // THE CLAUSE, NOT THE SENTENCE. `spokenClauses[].text` is a bare verb
    // phrase by contract — `inaccuracyCall.whyBetter` splices the leader
    // straight after "it would ". Storing the finished SENTENCE here produced,
    // on a real Two Knights blunder: "Na5 was the move — it would You're
    // bringing pieces to c6 and a5 over the next few moves.." Board-true in
    // every part, so no gate could see it; it is simply not English.
    plan.spokenClauses = [{ text: `bring pieces to ${squares} over the next few moves`, squares: heading, drift: true }];
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
  plan.spokenClauses = chosen.filter((c) => c.squares.length > 0).map((c) => ({ text: c.text, squares: c.squares, ...(c.route ? { route: c.route } : {}) }));
  for (const t of shown) said?.add(t);
  const list = shown.length === 1
    ? shown[0]
    : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
  // WHAT THE PLAN LEAVES OUT — its own sentence, in its own FIELD.
  //
  // It was briefly a clause in the want-list and a live probe read it back as
  // "You want to swing pieces toward their king, park a piece on d5 and leave
  // a1, d1, f1 exactly where they are." The grammar of a want-list turns a
  // CAVEAT into an INTENTION: nobody plans to leave their rooks at home.
  //
  // Making it a trailing sentence on `text` fixed the grammar and broke
  // something else, which the same probe caught: the fork offer previews three
  // roads using `text`, so all three ended "Worth noticing: your pieces on a1,
  // c1 and d1 sit this one out entirely" — identical tails on options that
  // exist to be told apart. So it is a separate field, and the caller decides:
  // the full narration speaks it, a compact preview does not.
  //
  // Own-side only. Cataloguing which of the OPPONENT'S pieces stay home reads
  // as a complaint about their play and is not the student's problem.
  const idle = plan.idlePieces ?? [];
  if (voice === 'mine' && idle.length >= 3) {
    const three = idle.slice(0, 3);
    // ── ONCE PER GAME MEANS ONCE, NOT ONCE PER LINE-UP ────────────────────
    // The key used to be the three squares, so the moment one of them woke up
    // the sample changed and the caveat introduced itself all over again. In
    // David's 2026-08-11 game it fired EIGHT times in twenty minutes — a1/c1/d1,
    // then d3/f3/a1, then c3/f3/a1, then f3/a1/f1 — while the comment above
    // said "own-side only" and the code believed it was speaking once.
    //
    // It is one observation ("your pieces are asleep") sampled differently each
    // turn, not eight observations, so the key is the observation. A caveat the
    // student has already heard is noise however the squares have shuffled.
    const key = 'idle-pieces';
    if (!said?.has(key)) {
      said?.add(key);
      plan.aside = `Worth noticing: your pieces on ${three.slice(0, -1).join(', ')} and ${three[three.length - 1]} sit this one out entirely.`;
    }
  }
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
  said: Set<string> | undefined,
  /** See `planFor` — the move that started the exchange the line finishes. */
  exchangePrior: { fenBefore: string; san: string } | null,
): LookaheadPlan | null {
  if (line.plies.length < 4) return null;

  const white = planFor(line.plies, 'white', exchangePrior);
  const black = planFor(line.plies, 'black', exchangePrior);
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
    shape: { ...shapeOf(line.plies, studentColor), evalSwingCp: line.terminalEvalCp !== null ? line.terminalEvalCp - line.rootEvalCp : null },
    terminal: terminalRead(line.plies, studentColor),
    path: pathOf(line.plies),
    read: readPosition(line),
    white, black, mine, theirs,
  };
}

/** The drift sentence, in either voice.
 *
 * 🔴 IT SAID `(You|They)` AND THE PRODUCER EMITS `We're` FOR THE STUDENT —
 * so `mergeTwinDrift` below has NEVER RUN (found 2026-09-21). Its first line is
 * `DRIFT.exec(mine.text)`, which was always null, so the function returned
 * early every single time.
 *
 * What that means is not academic: the whole merge exists because David heard
 * the stutter on his iPhone (2026-08-10, transcript 02:47:57) — the two sides
 * speaking the identical drift sentence back to back, differing only in
 * pronouns and squares. That fix has been dead code since the student's
 * subject word became "We're", and the stutter it was built to stop can still
 * reach a student today.
 *
 * `We` is deliberate (see `describePlan`'s subject, David 2026-08-23), so the
 * consumer is what moves — and it now accepts ALL THREE subjects rather than
 * the two it happened to be written against, so the merge keeps working if the
 * plan voice changes again. A consumer that only matches what the producer
 * emitted on the day it was written is a wire waiting to come loose. */
const DRIFT = /^(We|You|They)'re bringing pieces to (.+) over the next few moves\.$/;

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
/** Exported ONLY so a test can prove this fires. It went dead for months
 *  precisely because nothing could reach it. */
export function mergeTwinDriftForTest(mine: SidePlan, theirs: SidePlan): void {
  mergeTwinDrift(mine, theirs);
}

function mergeTwinDrift(mine: SidePlan, theirs: SidePlan): void {
  const m = DRIFT.exec(mine.text);
  const t = DRIFT.exec(theirs.text);
  if (!m || !t) return;
  // 🔒 THE MERGE ECHOES THE PRODUCER'S SUBJECT — it must not change the voice.
  // This line hard-coded "you're" while `describePlan` emits "We're" for the
  // student (David 2026-08-23, the collaborative plan register), so the moment
  // the merge was revived it silently switched register mid-feature: the
  // unmerged plan said "We're", the merged one said "you're". Nobody saw it
  // because the merge had never run.
  //
  // `m[1]` IS the subject the producer actually used, so echoing it keeps the
  // two halves in one voice and keeps working if that voice changes again —
  // which is the whole lesson of the regex above, applied to the output
  // instead of the input.
  const mySubject = m[1].toLowerCase();
  theirs.text = `They're going for ${t[2]}, and ${mySubject}'re going for ${m[2]}.`;
  mine.text = '';
  // The squares keep their owners, so the board still marks each half in its
  // own colour — the merge is a sentence change, never a fact change.
  //
  // 🔒 AND THE CLAUSES KEEP THEIR OWN TEXT, which is what that sentence claims
  // and the code did not do: both halves were overwritten with `theirs.text`,
  // the finished MERGED SENTENCE. `spokenClauses[].text` is a bare verb phrase
  // by contract — `whyBetter` splices the leader after "it would " — so the
  // merge was reaching out of its own scope and corrupting a downstream lane
  // with a sentence. A fact change, in the one function documented not to make
  // one.
  const merged = theirs.spokenClauses.concat(mine.spokenClauses);
  theirs.spokenClauses = merged.filter((_, i) => i < 1);
  mine.spokenClauses = merged.slice(1);
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
function shapeOf(plies: readonly PvPly[], studentColor: 'white' | 'black'): LineShape {
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
  // REPETITION. A position seen twice inside the horizon means the line is
  // heading for a draw neither side has to accept — and a student assuming
  // they are winning should hear it.
  const seen = new Set<string>();
  let repeats = false;
  for (const ply of horizon) {
    const key = ply.fenAfter.split(' ').slice(0, 4).join(' ');
    if (seen.has(key)) { repeats = true; break; }
    seen.add(key);
  }

  // HOW LONG BEFORE ANYTHING TOUCHES. A line where nothing is captured for six
  // plies is a manoeuvring line, and saying so tells the student what KIND of
  // calculation they are doing.
  let pliesToFirstCapture: number | null = null;
  for (let i = 0; i < horizon.length; i += 1) {
    if (horizon[i].facts.captured) { pliesToFirstCapture = i; break; }
  }

  // THE IN-BETWEEN MOVE — a quiet ply wedged inside forcing ones, and the point
  // of most tactics. Requires forcing on BOTH sides of it, which is what makes
  // it the surprise rather than just a slow move in a slow line.
  const forcing = horizon.map((p) => Boolean(p.facts.captured || p.facts.isCheck));
  let quietMoveIndex: number | null = null;
  for (let i = 1; i < horizon.length - 1; i += 1) {
    if (!forcing[i] && forcing[i - 1] && forcing[i + 1]) { quietMoveIndex = i; break; }
  }

  // CASTLING RIGHTS GIVEN UP inside the line — read off the FEN's own field
  // rather than inferred from king moves, so a rook move counts too.
  const rights = (fen: string): string => fen.split(' ')[2] ?? '-';
  const rootRights = rights(horizon[0]?.fenBefore ?? '');
  const endRights = rights(horizon[horizon.length - 1]?.fenAfter ?? '');
  // `split('')`/spread on a string is banned by lint for surrogate-pair
  // reasons; these are ASCII castling flags, but the rule is right in general
  // and an explicit list is clearer anyway.
  const lostFor = (chars: readonly string[]): boolean =>
    chars.some((c) => rootRights.includes(c) && !endRights.includes(c));
  const whiteLost = lostFor(['K', 'Q']);
  const blackLost = lostFor(['k', 'q']);

  const mineLost = studentColor === 'white' ? whiteLost : blackLost;
  const theirsLost = studentColor === 'white' ? blackLost : whiteLost;
  const castlingLost = mineLost && theirsLost ? 'both' as const
    : mineLost ? 'mine' as const
      : theirsLost ? 'theirs' as const
        : null;

  return {
    forcedPlies, traded, endsInEndgame, repeats, pliesToFirstCapture, quietMoveIndex,
    evalSwingCp: null, castlingLost,
  };
}

/** Nothing known about the terminus — a short line has no ending to read. */
const EMPTY_TERMINAL: TerminalRead = {
  loose: [], mobilityShift: { mine: 0, theirs: 0 }, kingOnOpenFile: null,
  betterPawns: null, breaks: [],
};

/**
 * The board WHERE THE LINE ENDS, against where it starts.
 *
 * Every claim about what a line LEAVES BEHIND — better pawns, a king on an open
 * file, pieces with nowhere to go — had no source before this, because the read
 * only ever looked at the root. The terminal FEN is already on the last ply.
 */
function terminalRead(plies: readonly PvPly[], studentColor: 'white' | 'black'): TerminalRead {
  const horizon = plies.slice(0, PLAN_HORIZON);
  const rootFen = horizon[0]?.fenBefore;
  const endFen = horizon[horizon.length - 1]?.fenAfter;
  if (!rootFen || !endFen) return EMPTY_TERMINAL;
  const me = studentColor === 'white' ? 'w' : 'b';
  const them = me === 'w' ? 'b' : 'w';
  try {
    const end = new Chess(endFen);

    // How many moves each side has at the end, against the start. Counted from
    // the same side-to-move by flipping the FEN, so the two numbers compare.
    const movesFor = (fen: string, side: 'w' | 'b'): number => {
      const parts = fen.split(' ');
      parts[1] = side;
      try { return new Chess(parts.join(' ')).moves().length; } catch { return 0; }
    };
    const mobilityShift = {
      mine: movesFor(endFen, me) - movesFor(rootFen, me),
      theirs: movesFor(endFen, them) - movesFor(rootFen, them),
    };

    // Undefended enemy pieces standing at the terminus — what is left loose
    // once the dust settles.
    const loose: string[] = [];
    try {
      for (const h of detectTactics(endFen).hangingPieces ?? []) {
        if (h.color === them && h.piece !== 'p') loose.push(h.square);
      }
    } catch { /* geometry is a bonus */ }

    const structure = describeStructure(endFen);
    const islands = structure?.pawns.islands;
    const myIslands = islands ? (me === 'w' ? islands.w : islands.b) : 0;
    const theirIslands = islands ? (me === 'w' ? islands.b : islands.w) : 0;
    const betterPawns = myIslands < theirIslands ? 'mine' as const
      : theirIslands < myIslands ? 'theirs' as const
        : null;

    // A king on a file with no pawns at all is a king with a draught through
    // its position — the file an attack comes down.
    const cells = end.board().flat();
    const fileHasPawn = (file: string): boolean =>
      cells.some((c) => c && c.type === 'p' && c.square[0] === file);
    let kingOnOpenFile: 'mine' | 'theirs' | null = null;
    for (const c of cells) {
      if (!c || c.type !== 'k') continue;
      if (fileHasPawn(c.square[0])) continue;
      kingOnOpenFile = c.color === me ? 'mine' : 'theirs';
      if (kingOnOpenFile === 'mine') break; // the student's own king matters more
    }

    // Pawn breaks the student can play once the line finishes — where the plan
    // picks up after the variation ends.
    const breaks: string[] = [];
    const parts = endFen.split(' ');
    parts[1] = me;
    try {
      for (const m of new Chess(parts.join(' ')).moves({ verbose: true })) {
        if (m.piece === 'p' && m.captured && !breaks.includes(m.to)) breaks.push(m.to);
      }
    } catch { /* nothing to offer */ }

    // NB: a "permanent hole" read was scoped OUT of this batch rather than
    // guessed at — `describeStructure` has no hole field, and inventing a
    // second definition beside the outpost detector (which already answers
    // "a square no pawn can challenge") would give two lanes a chance to
    // disagree about the same square.

    return { loose, mobilityShift, kingOnOpenFile, betterPawns, breaks };
  } catch {
    return EMPTY_TERMINAL;
  }
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
    tacticSquare: null, idlePieces: [], maneuver: null, checks: 0, promotes: null,
    mates: false, nearEnemyKing: 0,
    kingAttackSquares: [], materialSquares: [], tradeSquares: [], tradeIntended: [],
    text: '', aside: '', spokenClauses: [],
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
        tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], passedPawnsHanded: [],
        outpostGained: null, shieldLost: 0,
      },
    }],
    rootEvalCp: 0, terminalEvalCp: null, delivers: true, closeAlternative: null,
  };
  return {
    keySquares: [],
    shape: {
      forcedPlies: 0, traded: 0, endsInEndgame: false, repeats: false,
      pliesToFirstCapture: null, quietMoveIndex: null, evalSwingCp: null, castlingLost: null,
    },
    terminal: EMPTY_TERMINAL,
    path: [], read: readPosition(stub), white, black, mine, theirs,
  };
}

/** Is this plan clause a COST — something that was taken or broken, as opposed
 *  to where pieces go? The one test both backward readers use ("that let them
 *  …", "it let them …"): Blumenfeld walk F32 heard "That let them walk the rook
 *  round to h5, by way of c5, pull the pawns away, win a pawn, prise open the
 *  c-file and trade off the rook", and F18 "That gave them the run of b4 and
 *  c3" — plans and drift said as if they were the price of the move. */
export function isCostClause(text: string): boolean {
  return /^(win|take|mate|checkmate|trap|pull the pawns)\b/.test(text.trim());
}

const DEAL_ONE: Record<string, string> = { p: 'a pawn', m: 'a piece', r: 'a rook', q: 'the queen' };
const DEAL_MANY: Record<string, string> = { p: 'pawns', m: 'pieces', r: 'rooks', q: 'queens' };
const COUNT_WORD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
function dealWords(n: Record<string, number>): string | null {
  const words = (['q', 'r', 'm', 'p'] as const).filter((t) => n[t] > 0)
    .map((t) => (n[t] === 1 ? DEAL_ONE[t] : `${COUNT_WORD[n[t]] ?? n[t]} ${DEAL_MANY[t]}`));
  return words.length ? words.join(' and ') : null;
}
/** What the side took and gave over a line, from the LEDGER's capture lists —
 *  "a piece for a pawn". Like-for-like cancels: a bishop and two pawns for a
 *  bishop is two pawns. */
function dealOfLedger(won: readonly string[], lost: readonly string[]): { took: string; gave: string | null } | undefined {
  const kind = (x: string): string => (x === 'n' || x === 'b' ? 'm' : x);
  const tally = (xs: readonly string[]): Record<string, number> => {
    const n: Record<string, number> = { q: 0, r: 0, m: 0, p: 0 };
    for (const x of xs) if (x in n || x === 'n' || x === 'b') n[kind(x)] += 1;
    return n;
  };
  const took = tally(won); const gave = tally(lost);
  for (const t of ['q', 'r', 'm', 'p']) { const k = Math.min(took[t], gave[t]); took[t] -= k; gave[t] -= k; }
  const t = dealWords(took);
  if (!t) return undefined;
  return { took: t, gave: dealWords(gave) };
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
  /** The move that PRODUCED `fen`, or null when there is none to hand.
   *  REQUIRED, so every caller decides it: when that move was a capture and
   *  the line opens by taking back on its square, the line is finishing a
   *  trade and its material is counted from before the trade began. Without
   *  it a recapture read as "win a pawn" (David 2026-10-02). */
  lastMove: { fenBefore: string; san: string } | null,
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
  let exchangePrior: { fenBefore: string; san: string } | null = null;
  if (lastMove) {
    try {
      const lm = new Chess(lastMove.fenBefore).move(lastMove.san);
      if (lm?.captured && uciMoves[0]?.slice(2, 4) === lm.to) {
        exchangePrior = { fenBefore: lastMove.fenBefore, san: lastMove.san };
        prevCap = { square: lm.to, capturedValue: PIECE_POINTS[PIECE_WORD[lm.captured] ?? ''] ?? 0 };
      }
    } catch { /* an unreadable last move — count from the board as given */ }
  }
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
    exchangePrior,
  );
}

/** How far ahead review reads a side's plan off the moves actually played. */
const HINDSIGHT_PLIES = 8;

/**
 * Both sides' arcs across a finished game, keyed by the index of the move each
 * event belongs to (0-based into `sans`). Review's read is HINDSIGHT: the plan
 * after each move is read off the moves that were actually played next — the
 * plan the side really carried out, not one the engine proposed.
 *
 * Emerge, arrive and drop speak; a step toward a plan does not — walking a
 * whole review, "another step toward…" on every move is a chant, and the
 * landing says what the steps were for.
 */
export function gameArcs(sans: readonly string[], studentColor: 'white' | 'black'): Map<number, ArcEvent[]> {
  const out = new Map<number, ArcEvent[]>();
  const board = new Chess();
  const uci: string[] = []; const fens: string[] = [board.fen()];
  const moved: ArcMove[] = [];
  for (const san of sans) {
    let m;
    try { m = board.move(san); } catch { break; }
    uci.push(m.from + m.to + (m.promotion ?? '')); fens.push(board.fen());
    moved.push({ from: m.from, to: m.to, piece: m.piece, promotion: m.promotion });
  }
  const studentWB: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  for (const color of ['w', 'b'] as const) {
    const seat: Seat = color === studentWB ? 'student' : 'opponent';
    let state = EMPTY_ARC;
    for (let i = color === 'w' ? 0 : 1; i < moved.length; i += 2) {
      const plan = planFromUci(fens[i + 1], uci.slice(i + 1, i + 1 + HINDSIGHT_PLIES), studentColor, { fenBefore: fens[i], san: sans[i] });
      const side = plan ? (seat === 'student' ? plan.mine : plan.theirs) : null;
      // The SAME walkability Learn applies (review walk 2026-10-01: "pushing the
      // passed pawn on the a-file" with …a6 still blocking it — the hindsight
      // line makes the passer two moves later).
      const aims = side ? aimsOf(side, seat).filter((a) => aimWalkableNow(a, fens[i + 1], color, sans.slice(0, i + 1))) : [];
      const r = stepArc(state, aims, moved[i], fens[i + 1], color, seat);
      state = r.next;
      // A plan leaving the engine line is not something a player DID — "they
      // have let an attack on your king go" read as nonsense four times in one
      // review (Carlsen–Topalov walk 2026-09-27). Emerge and arrive speak.
      const spoken = r.events.filter((e) => e.kind === 'emerge' || e.kind === 'arrive');
      if (spoken.length) out.set(i, [...(out.get(i) ?? []), ...spoken]);
    }
  }
  return out;
}
