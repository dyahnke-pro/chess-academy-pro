/**
 * reviewStrategicOrientation — the PLAN-IDEA beats for the post-game review walk.
 * Two one-shot beats, each fired once:
 *   1. buildOpeningDevelopmentPlan — when the opening is identified: the typical
 *      DEVELOPING plans for both sides (develop the minors, castle, the
 *      fianchetto's long diagonal, who grabbed the centre).
 *   2. buildMiddlegameOrientation — at the start of the middlegame: the structural
 *      anchor (opposite-side castling) + both sides' plans from the pawn
 *      MAJORITIES on each wing.
 *
 * PLAN IDEAS ARE SHOWN WITH ARROWS, NOT BY MOVING PIECES (David 2026-07-19). Each
 * beat returns `{ text, arrows }`: the board stays at the current position and the
 * arrows LEAD THE EYE to the plan (the majority pawns advancing, the fianchetto
 * diagonal, the pawn-storm toward the enemy king, the minors' development squares).
 * The best-LINE playout (§5) still moves the pieces — that is a concrete line, not
 * a plan idea; this is only for the plan beats.
 *
 * Grounding: this is the classical, board-true basis for a plan — "develop your
 * pieces and castle", "play where you have the pawn majority" (Capablanca / Lasker,
 * the injected concept corpus). Every claim + arrow is computed from chess.js piece
 * placement + boardStructure (G0/G3); nothing is invented. CONSERVATIVE: a plan is
 * stated only on a CLEAR signal; when nothing is clear it returns null and the walk
 * stays silent (empty > generic > invented; "don't state non-applicable reasons").
 *
 * REVIEW register (retrospective, the student's own game) — 2nd person for the
 * student, 3rd for the opponent.
 */
import { Chess } from 'chess.js';
import { describeStructure } from './boardStructure';

/** A plan-idea arrow. Colours: PLAN_BLUE for the student's plan, PLAN_AMBER for
 *  the opponent's — distinct from the green best-move arrow so the two never
 *  read as the same thing. */
export interface PlanArrow {
  startSquare: string;
  endSquare: string;
  color: string;
}

export interface PlanBeat {
  text: string;
  arrows: PlanArrow[];
}

const PLAN_BLUE = '#3b82f6'; // the student's plan
const PLAN_AMBER = '#f59e0b'; // the opponent's plan

type Wing = 'queenside' | 'kingside';
const QUEENSIDE_FILES = new Set(['a', 'b', 'c']);
const KINGSIDE_FILES = new Set(['f', 'g', 'h']);

interface Located { type: string; color: 'w' | 'b'; square: string; }

function pieces(chess: Chess): Located[] {
  const out: Located[] = [];
  for (const row of chess.board()) {
    for (const cell of row) if (cell) out.push({ type: cell.type, color: cell.color, square: cell.square });
  }
  return out;
}

function fileOf(sq: string): string { return sq[0]; }
function rankOf(sq: string): number { return Number(sq[1]); }

// ─── OPENING DEVELOPMENT PLAN ────────────────────────────────────────────────

/** Natural knight development squares (universal, board-true): the knight belongs
 *  toward the centre. Arrow from a home knight to its natural square. */
const KNIGHT_HOME_TO_NATURAL: Record<string, string> = {
  b1: 'c3', g1: 'f3', b8: 'c6', g8: 'f6',
};

/** For a fianchettoed bishop, the far CENTRAL square on its long diagonal it
 *  bears on — the arrow that shows "this bishop rakes the centre". */
function fianchettoDiagonalTarget(square: string): string | null {
  switch (square) {
    case 'g2': return 'd5'; // white kingside fianchetto → long light diagonal
    case 'b2': return 'e5'; // white queenside fianchetto → long dark diagonal
    case 'g7': return 'd4'; // black kingside fianchetto
    case 'b7': return 'e4'; // black queenside fianchetto
    default: return null;
  }
}

/** Home squares for the bishops — a bishop still standing here is undeveloped. */
const BISHOP_HOMES = new Set(['c1', 'f1', 'c8', 'f8']);

interface SideDev {
  hasCentre: boolean;
  fianchettoSquare: string | null;
  undevelopedKnights: string[];
  undevelopedBishops: string[];
  castled: boolean;
  /** King actually sits on a SHORT-castled square (g-file). */
  castledShort: boolean;
  /** ANY castling right remains in the FEN for this side. */
  canCastle: boolean;
  /** The kingside right specifically (for shield-clause honesty). */
  canCastleShort: boolean;
}

function assessDevelopment(all: Located[], color: 'w' | 'b', castlingField: string): SideDev {
  const mine = all.filter((p) => p.color === color);
  const centreRanks = color === 'w' ? [4, 5] : [4, 5];
  const hasCentre = mine.some((p) => p.type === 'p' && (fileOf(p.square) === 'd' || fileOf(p.square) === 'e') && centreRanks.includes(rankOf(p.square)));
  const fianchettoSquare = mine.find((p) => p.type === 'b' && fianchettoDiagonalTarget(p.square) !== null)?.square ?? null;
  const undevelopedKnights = mine.filter((p) => p.type === 'n' && KNIGHT_HOME_TO_NATURAL[p.square] !== undefined).map((p) => p.square);
  const undevelopedBishops = mine.filter((p) => p.type === 'b' && BISHOP_HOMES.has(p.square)).map((p) => p.square);
  const king = mine.find((p) => p.type === 'k');
  const castled = king ? (fileOf(king.square) === 'g' || fileOf(king.square) === 'c') : false;
  const castledShort = king ? fileOf(king.square) === 'g' : false;
  const short = color === 'w' ? 'K' : 'k';
  const long = color === 'w' ? 'Q' : 'q';
  const canCastleShort = castlingField.includes(short);
  const canCastle = canCastleShort || castlingField.includes(long);
  return { hasCentre, fianchettoSquare, undevelopedKnights, undevelopedBishops, castled, castledShort, canCastle, canCastleShort };
}

function devClause(dev: SideDev, subject: 'you' | 'your opponent'): string | null {
  const verb = subject === 'you' ? { have: "you've", need: 'you still need to', poss: 'your' } : { have: 'your opponent has', need: 'your opponent still needs to', poss: "the opponent's" };
  const bits: string[] = [];
  if (dev.hasCentre) bits.push(`${verb.have} claimed the centre — develop behind it`);
  if (dev.fianchettoSquare) bits.push(`${verb.poss} fianchettoed bishop rakes the long diagonal`);
  // NAME the pieces that still need a job — the generic "develop and castle"
  // recipe read the same every game (David 2026-07-21, IMG_4579: "still
  // showing generic future plans"). The knight's natural square is universal
  // board truth (the arrows already point there — the words must name them);
  // a home bishop is named without inventing its destination.
  const jobs = devJobs(dev);
  if (jobs) bits.push(jobs);
  // Castling advice only when castling is still POSSIBLE — a king that lost
  // its rights gets honest king-safety advice instead of an illegal
  // instruction (board-awareness sweep, David 2026-07-22).
  if (!dev.castled) {
    bits.push(dev.canCastle
      ? 'get the king castled'
      : 'the king has lost its castling rights — walk it to safety by hand and connect the rooks');
  }
  if (bits.length === 0) return null;
  // Capitalise the joined clause for the leading subject.
  const joined = bits.join(', and ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** WHY a knight belongs on its natural square — the CENTRAL squares it fights
 *  for from there, computed from knight geometry (David 2026-07-22: "And WHY
 *  the knight belongs on f6!!!!"). Board truth, not lore: from f6 a knight
 *  attacks e4 and d5. */
const KNIGHT_SQUARE_FIGHTS: Record<string, string> = {
  f3: 'from there it fights for e5 and d4',
  c3: 'from there it fights for d5 and e4',
  f6: 'from there it fights for e4 and d5',
  c6: 'from there it fights for d4 and e5',
};

/** The f-file knight's king-shield clause — spoken ONLY when it's true of THIS
 *  board: "your castled king" requires the king to actually be castled short;
 *  with kingside rights intact it becomes future-tense; otherwise silence
 *  (board-awareness sweep, David 2026-07-22 — the criminal was mine). */
function knightWhy(to: string, dev: SideDev): string | null {
  const fights = KNIGHT_SQUARE_FIGHTS[to];
  if (!fights) return null;
  if (to !== 'f3' && to !== 'f6') return fights;
  if (dev.castledShort) return `${fights} and stands guard over your castled king`;
  if (dev.canCastleShort) return `${fights} and will shield your king once you castle short`;
  return fights;
}

/** The CONCRETE development to-do list, pieces named by square — each with
 *  its WHY, never a bare destination. */
function devJobs(dev: SideDev): string | null {
  const jobs: string[] = [];
  for (const kn of dev.undevelopedKnights.slice(0, 2)) {
    const to = KNIGHT_HOME_TO_NATURAL[kn];
    if (to) {
      const why = knightWhy(to, dev);
      jobs.push(`the ${kn} knight belongs on ${to}${why ? ` — ${why}` : ''}`);
    } else {
      jobs.push(`the knight on ${kn} needs a square`);
    }
  }
  for (const b of dev.undevelopedBishops.slice(0, 2)) {
    jobs.push(`the ${b} bishop is still boxed in at home — a piece that sees nothing defends nothing`);
  }
  return jobs.length > 0 ? jobs.join(', ') : null;
}

function devArrows(dev: SideDev, arrowColor: string): PlanArrow[] {
  const arrows: PlanArrow[] = [];
  for (const kn of dev.undevelopedKnights.slice(0, 2)) {
    const to = KNIGHT_HOME_TO_NATURAL[kn];
    if (to) arrows.push({ startSquare: kn, endSquare: to, color: arrowColor });
  }
  if (dev.fianchettoSquare) {
    const to = fianchettoDiagonalTarget(dev.fianchettoSquare);
    if (to) arrows.push({ startSquare: dev.fianchettoSquare, endSquare: to, color: arrowColor });
  }
  return arrows;
}

/**
 * The opening DEVELOPING-plan beat, fired when the opening is identified.
 *
 * David 2026-07-20 (IMG_4560): this used to read "both sides have the exact same
 * plan — develop and castle" on EVERY game, because it only ever spoke the
 * generic board-computed developing clause. Now, when we have the opening's
 * CURATED key ideas (repertoire.json — the classical set), it leads with the
 * opening's OWN defining idea (specific + grounded, G3), and only falls back to
 * the board-computed developing plan (named by opening) for uncurated lines.
 * Arrows still lead the eye to the minors' natural squares + the fianchetto.
 */
export function buildOpeningDevelopmentPlan(
  fen: string,
  studentColorWB: 'w' | 'b',
  opts?: { openingName?: string | null; curatedIdeas?: string[] | null; seed?: number },
): PlanBeat | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const all = pieces(chess);
  const enemyWB: 'w' | 'b' = studentColorWB === 'w' ? 'b' : 'w';
  const castlingField = fen.split(' ')[2] ?? '-';
  const mine = assessDevelopment(all, studentColorWB, castlingField);
  const theirs = assessDevelopment(all, enemyWB, castlingField);
  const arrows = [
    ...devArrows(mine, PLAN_BLUE),
    ...devArrows(theirs, PLAN_AMBER),
  ];
  const openingLabel = opts?.openingName ?? null;
  const seed = opts?.seed ?? 0;

  // OPENING-SPECIFIC path: lead with ONE of the opening's key ideas — ROTATED by
  // the per-game seed (David 2026-07-21: "the opening narration line about taking
  // space being the whole point is the same every time"). Same opening, different
  // game → a different lead idea + a different stem, so the coach never reads as
  // a recording. Grounded in the curated repertoire keyIdeas (G3).
  const curated = opts?.curatedIdeas;
  if (curated && curated.length > 0) {
    const pick = curated[seed % curated.length].trim().replace(/\.$/, '');
    const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
    const stems = openingLabel
      ? [
          (i: string) => `The heart of the ${openingLabel}: ${i}.`,
          (i: string) => `Remember what the ${openingLabel} is really about — ${i}.`,
          (i: string) => `Everything in the ${openingLabel} flows from one idea: ${i}.`,
        ]
      : [
          (i: string) => `The key idea here: ${i}.`,
          (i: string) => `Keep one idea in front of you: ${i}.`,
          (i: string) => `The position keeps asking the same question — ${i}.`,
        ];
    const lead = stems[seed % stems.length](pick);
    const next = curated.find((x) => x.trim().replace(/\.$/, '') !== pick);
    const second = next ? ` ${cap(next.trim().replace(/\.$/, ''))}.` : '';
    // Ground the idea in THIS position: name the pieces that still need a job
    // (the arrows point at them — the words must name them). David 2026-07-21
    // (IMG_4579): the curated lead alone still read as a generic recipe.
    const jobs = devJobs(mine);
    const castleBit = mine.castled ? '' : mine.canCastle ? ', then castle' : ', then get the king to safety by hand — its castling rights are gone';
    const jobsClause = jobs ? ` Right now: ${jobs}${castleBit}.` : '';
    return { text: `${lead}${second}${jobsClause}`, arrows };
  }

  // FALLBACK: the board-computed developing plan for an uncurated opening. State
  // the STUDENT's plan only, named by the opening (the arrows show both sides'
  // development) — never the symmetric "both sides have the exact same plan"
  // that read the same every game (David 2026-07-20). Empty > generic.
  const myClause = devClause(mine, 'you');
  if (!myClause) return null;
  const myLower = myClause.charAt(0).toLowerCase() + myClause.slice(1);
  const prefix = openingLabel ? `In the ${openingLabel}, ` : 'Out of the opening, ';
  const text = `${prefix}${myLower}.`;
  return { text: text.charAt(0).toUpperCase() + text.slice(1), arrows };
}

// ─── MIDDLEGAME ORIENTATION (pawn majorities) ────────────────────────────────

interface WingCounts { queenside: number; kingside: number; }

function pawnCountsByWing(all: Located[]): Record<'w' | 'b', WingCounts> {
  const out: Record<'w' | 'b', WingCounts> = { w: { queenside: 0, kingside: 0 }, b: { queenside: 0, kingside: 0 } };
  for (const p of all) {
    if (p.type !== 'p') continue;
    const f = fileOf(p.square);
    if (QUEENSIDE_FILES.has(f)) out[p.color].queenside += 1;
    else if (KINGSIDE_FILES.has(f)) out[p.color].kingside += 1;
  }
  return out;
}

/** The wing where `side` holds a CLEAR advanceable pawn majority, or null. */
function majorityWing(counts: Record<'w' | 'b', WingCounts>, side: 'w' | 'b'): Wing | null {
  const enemy: 'w' | 'b' = side === 'w' ? 'b' : 'w';
  const qEdge = counts[side].queenside - counts[enemy].queenside;
  const kEdge = counts[side].kingside - counts[enemy].kingside;
  const qOk = counts[side].queenside >= 2 && qEdge >= 1;
  const kOk = counts[side].kingside >= 2 && kEdge >= 1;
  if (qOk && kOk) return qEdge === kEdge ? null : (qEdge > kEdge ? 'queenside' : 'kingside');
  if (qOk) return 'queenside';
  if (kOk) return 'kingside';
  return null;
}

/** Arrows showing a side advancing its pawns on a wing (each pawn → one square
 *  forward). Caps at 3 so the board doesn't get busy. */
function majorityArrows(all: Located[], side: 'w' | 'b', wing: Wing, arrowColor: string): PlanArrow[] {
  const files = wing === 'queenside' ? QUEENSIDE_FILES : KINGSIDE_FILES;
  const dir = side === 'w' ? 1 : -1;
  const arrows: PlanArrow[] = [];
  for (const p of all) {
    if (p.type !== 'p' || p.color !== side || !files.has(fileOf(p.square))) continue;
    const r = rankOf(p.square);
    const nr = r + dir;
    if (nr < 1 || nr > 8) continue;
    arrows.push({ startSquare: p.square, endSquare: `${fileOf(p.square)}${nr}`, color: arrowColor });
    if (arrows.length >= 3) break;
  }
  return arrows;
}

/** Arrows for a pawn-storm toward the enemy king (opposite-side castling): the
 *  attacker's wing pawns point one square forward toward the enemy king's wing. */
function stormArrows(all: Located[], attacker: 'w' | 'b', enemyKingWing: Wing, arrowColor: string): PlanArrow[] {
  return majorityArrows(all, attacker, enemyKingWing, arrowColor);
}

/**
 * The middlegame orientation beat — structural anchor + both sides' plans from
 * the pawn majorities, with arrows leading the eye to each plan. Null when
 * nothing clear is computable.
 */
export function buildMiddlegameOrientation(fen: string, studentColorWB: 'w' | 'b'): PlanBeat | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const struct = describeStructure(fen);
  if (!struct) return null;
  const all = pieces(chess);

  const counts = pawnCountsByWing(all);
  const enemyWB: 'w' | 'b' = studentColorWB === 'w' ? 'b' : 'w';
  const studentWing = majorityWing(counts, studentColorWB);
  const enemyWing = majorityWing(counts, enemyWB);

  const parts: string[] = [];
  const arrows: PlanArrow[] = [];

  const oppositeCastling =
    struct.kings.oppositeWings &&
    struct.kings.kingWing[studentColorWB] !== 'center' &&
    struct.kings.kingWing[enemyWB] !== 'center';
  if (oppositeCastling) {
    parts.push('The kings castled on opposite wings — this is a race, and whoever storms the enemy king first wins');
    const enemyKingWing = struct.kings.kingWing[enemyWB] === 'queenside' ? 'queenside' : 'kingside';
    const myKingWing = struct.kings.kingWing[studentColorWB] === 'queenside' ? 'queenside' : 'kingside';
    arrows.push(...stormArrows(all, studentColorWB, enemyKingWing, PLAN_BLUE));
    arrows.push(...stormArrows(all, enemyWB, myKingWing, PLAN_AMBER));
  }

  if (studentWing) {
    parts.push(`your plan is to advance your ${studentWing} pawn majority and make it count`);
    if (!oppositeCastling) arrows.push(...majorityArrows(all, studentColorWB, studentWing, PLAN_BLUE));
  }
  if (enemyWing) {
    parts.push(`your opponent's plan is to push on the ${enemyWing}, where they hold the majority`);
    if (!oppositeCastling) arrows.push(...majorityArrows(all, enemyWB, enemyWing, PLAN_AMBER));
  }

  if (parts.length === 0) return null;
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const rest = parts.slice(1);
  const text = rest.length ? `${first}; ${rest.join('; ')}.` : `${first}.`;
  return { text, arrows };
}
