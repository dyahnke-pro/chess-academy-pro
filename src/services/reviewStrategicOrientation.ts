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
import { openSentence } from '../utils/openSentence';
import { Chess } from 'chess.js';
import { describeStructure } from './boardStructure';
import { oppositeWingsRace } from './planRace';
import { phaseOfFen } from './boardConcepts';
import type { BoardArrow } from '../types';
import { admitArrows, type ArrowClaim } from './arrowDoor';


/** A plan-idea arrow — ARROW DOOR output (`arrowDoor`, 2026-09-29): the
 *  student's plan move is theirs to play (green, checked legal and safe), the
 *  opponent's reads red (coming at you), a bishop's diagonal is a sight line.
 *  The blue/amber plan palette this replaced was a third colour language. */
export type PlanArrow = BoardArrow;

/**
 * WHAT A PLAN BEAT IS, and why it gained an id and squares (2026-09-17, the
 * computer-unification map §0.2 — docs/plans/2026-09-17-computer-unification.md).
 *
 * The coach had THREE shapes for "a thing it says" and each carried a different
 * subset: `ComputedConcept` (id + squares + two registers + importance),
 * `MoveFundamental` (id + squares + three registers + weight), and this — text
 * and arrows only.
 *
 * That was not cosmetic. `coachDecider`'s subsumption pass collapses facts that
 * are the SAME CLAIM by comparing their square sets, and G4.5.1 is explicit that
 * a fact with no squares is NEVER collapsed ("we cannot prove it is the same
 * claim and silence must never be a guess"). With no squares, every plan beat
 * fell straight through subsumption — so review could state one idea twice from
 * two producers and nothing could tell they were one claim. With no id, nothing
 * could rank it, dedupe it across plies, or file it under a weakness.
 *
 * Both are REQUIRED, so a new beat producer must decide them instead of
 * inheriting a silent default. The squares are emitted from the SAME data that
 * builds the arrows — never scraped back out of the prose.
 */
export type PlanBeatId =
  | 'opponent-move'
  | 'opponent-development'
  | 'opening-development'
  | 'his-plan'
  | 'masters-plan'
  | 'middlegame-orientation';

export interface PlanBeat {
  id: PlanBeatId;
  text: string;
  arrows: PlanArrow[];
  /** The squares this beat's claim is about — the subsumption key. Derived from
   *  the same board data as `arrows`, so it can never disagree with them. */
  squares: string[];
  /** Set when the beat restates the moved piece's reach into the centre — the
   *  same claim the review's `[does]` fact computes, so a surface that already
   *  speaks `[does]` for the ply drops this one (walk 5, 2026-09-23).
   *  `hanging`: the beat is a one-move threat on an undefended piece — the
   *  threat-voice table decides whether a student who sees those hears it. */
  kind?: 'influence' | 'hanging';
}

/** The squares an arrow set touches — one place, so every producer couples the
 *  same geometry its arrows already prove. */
export function squaresOfArrows(arrows: readonly PlanArrow[]): string[] {
  const out = new Set<string>();
  for (const a of arrows) { out.add(a.startSquare); out.add(a.endSquare); }
  return [...out];
}

/** A plan move (or sight line) before the door judges it. `mine` = the
 *  student's side; `fen` set = one ply of a line, checked on its own board. */
interface PlanPair { from: string; to: string; mine: boolean; sight?: boolean; fen?: string }
const PLAN_MINE = true;
const PLAN_THEIRS = false;

function planDoor(fen: string, studentColorWB: 'w' | 'b', pairs: readonly PlanPair[]): PlanArrow[] {
  const claims: ArrowClaim[] = pairs.map((p) => (
    p.fen ? { from: p.from, to: p.to, role: 'line', fen: p.fen, source: 'reviewPlan.line' }
      : p.sight ? { from: p.from, to: p.to, role: 'vision', source: 'reviewPlan.sight' }
        : { from: p.from, to: p.to, role: p.mine ? 'play' : 'theirs', source: 'reviewPlan.move' }
  ));
  return admitArrows(claims, { fen, studentColor: studentColorWB === 'w' ? 'white' : 'black' }).arrows;
}

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
function majorityArrows(all: Located[], side: 'w' | 'b', wing: Wing, mine: boolean): PlanPair[] {
  const files = wing === 'queenside' ? QUEENSIDE_FILES : KINGSIDE_FILES;
  const dir = side === 'w' ? 1 : -1;
  const arrows: PlanPair[] = [];
  for (const p of all) {
    if (p.type !== 'p' || p.color !== side || !files.has(fileOf(p.square))) continue;
    const r = rankOf(p.square);
    const nr = r + dir;
    if (nr < 1 || nr > 8) continue;
    arrows.push({ from: p.square, to: `${fileOf(p.square)}${nr}`, mine });
    if (arrows.length >= 3) break;
  }
  return arrows;
}

/** Arrows for a pawn-storm toward the enemy king (opposite-side castling): the
 *  attacker's wing pawns point one square forward toward the enemy king's wing. */
function stormArrows(all: Located[], attacker: 'w' | 'b', enemyKingWing: Wing, mine: boolean): PlanPair[] {
  return majorityArrows(all, attacker, enemyKingWing, mine);
}

/**
 * The middlegame orientation beat — structural anchor + both sides' plans from
 * the pawn majorities, with arrows leading the eye to each plan. Null when
 * nothing clear is computable.
 */
/** Which wing a file letter sits on. */
function fileWing(file: string): Wing { return file >= 'e' ? 'kingside' : 'queenside'; }

export function buildMiddlegameOrientation(
  fen: string,
  studentColorWB: 'w' | 'b',
  /** The move played on this ply (SAN). When the opposite-castling storm is the
   *  plan and this move pushes a pawn toward the student's OWN king, the beat
   *  says so — the storm belongs at the enemy king, not in front of your own
   *  (audit 2026-07-24: the race beat landed on g5, a kingside push, while
   *  advising to attack the queenside king). */
  moveSan?: string,
  /** WHOSE PLAN this beat may carry (WO-TEACH-02, prod SEAT red 2026-09-24:
   *  "Your opponent's plan is to push on the queenside" spoken as the whole
   *  line on the student's own move). The per-ply review passes the mover's
   *  seat: the student's move carries the student's plan and the race; the
   *  opponent's move carries theirs. 'both' is the one-shot orientation. */
  seat: 'student' | 'opponent' | 'both' = 'both',
): PlanBeat | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  // A MIDDLEGAME orientation needs a middlegame. At move 7 the pawns are still
  // being traded and no wing has a majority worth a plan — yet prod said "Your
  // plan is to advance your kingside majority; your opponent's plan is to push
  // on the queenside" there (WO-STANDARD-01 D-15, tape 2026-09-22). The board
  // decides the phase (boardConcepts), not the caller's ply floor.
  if (phaseOfFen(fen) === 'opening') return null;
  const struct = describeStructure(fen);
  if (!struct) return null;
  const all = pieces(chess);

  const counts = pawnCountsByWing(all);
  const enemyWB: 'w' | 'b' = studentColorWB === 'w' ? 'b' : 'w';
  const studentWing = majorityWing(counts, studentColorWB);
  const enemyWing = majorityWing(counts, enemyWB);

  const parts: string[] = [];
  const pairs: PlanPair[] = [];

  // A PAWN RACE NEEDS PAWNS TO RACE WITH, AND A MIDDLEGAME TO RACE IN (review
  // walk 900, 2026-09-26: "The kings castled on opposite wings — this is a
  // race" with neither king castled, queens and rooks hunting a bare king, and
  // one a-pawn to "throw" at it). Kings on opposite wings is a storm only when
  // the storming side still owns two pawns on the enemy king's wing.
  const enemyKingWingNow = struct.kings.kingWing[enemyWB] === 'queenside' ? 'queenside' : 'kingside';
  const oppositeCastling =
    oppositeWingsRace(fen, studentColorWB, 'review') !== null &&
    phaseOfFen(fen) === 'middlegame' &&
    counts[studentColorWB][enemyKingWingNow] >= 2;
  if (oppositeCastling && seat !== 'opponent') {
    const enemyKingWing = enemyKingWingNow;
    const myKingWing = struct.kings.kingWing[studentColorWB] === 'queenside' ? 'queenside' : 'kingside';
    // Name the concrete TARGET, not a generic race (David 2026-07-24): storm the
    // pawns at the enemy king's actual wing and rip the files open — that's where
    // the mate comes from.
    let raceLine = `The kings are on opposite wings — this is a race, and it's won by throwing your pawns at their king on the ${enemyKingWing} and tearing open the files around it before they do the same to you`;
    // If THIS move pushes a pawn toward the student's OWN king, it goes the wrong
    // way — the storm belongs at the enemy king, not in front of yours.
    const pawnMove = moveSan && /^[a-h]x?[a-h]?[1-8]/.test(moveSan) && !/^[KQRBNO]/.test(moveSan);
    const destFile = pawnMove && moveSan ? moveSan.replace(/[^a-h]/g, '').slice(-1) : '';
    if (pawnMove && destFile && fileWing(destFile) === myKingWing) {
      raceLine += ` — and note this pawn push goes the wrong way, opening lines in front of your OWN king instead of theirs`;
    }
    parts.push(raceLine);
    pairs.push(...stormArrows(all, studentColorWB, enemyKingWing, PLAN_MINE));
    pairs.push(...stormArrows(all, enemyWB, myKingWing, PLAN_THEIRS));
  }

  // ONE PLAN PER SIDE (unity U5, review walk #24: "throw your pawns at their
  // king on the kingside" then "advance your queenside pawn majority"). With
  // the kings on opposite wings the race IS the plan; a majority speaks only
  // when it sits on the wing the race is run on.
  const studentKingWingNow = struct.kings.kingWing[studentColorWB] === 'queenside' ? 'queenside' : 'kingside';
  const raceSaid = oppositeCastling && seat !== 'opponent';
  if (studentWing && seat !== 'opponent' && (!raceSaid || studentWing === enemyKingWingNow)) {
    parts.push(`your plan is to advance your ${studentWing} pawn majority and make it count`);
    if (!oppositeCastling) pairs.push(...majorityArrows(all, studentColorWB, studentWing, PLAN_MINE));
  }
  if (enemyWing && seat !== 'student' && (!raceSaid || enemyWing === studentKingWingNow)) {
    parts.push(`your opponent's plan is to push on the ${enemyWing}, where they hold the majority`);
    if (!oppositeCastling) pairs.push(...majorityArrows(all, enemyWB, enemyWing, PLAN_THEIRS));
  }

  if (parts.length === 0) return null;
  const first = openSentence(parts[0]);
  const rest = parts.slice(1);
  const text = rest.length ? `${first}; ${rest.join('; ')}.` : `${first}.`;
  const arrows = planDoor(fen, studentColorWB, pairs);
  return { id: 'middlegame-orientation', text, arrows, squares: squaresOfArrows(arrows) };
}
