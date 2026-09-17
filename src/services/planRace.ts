import { Chess, type Square } from 'chess.js';
import { describeStructure } from './boardStructure';

type Color = 'w' | 'b';

/**
 * Rank distance to promotion (0 = about to queen). Lives HERE, not in
 * `boardPlan`, so the dependency runs one way: boardPlan → planRace →
 * boardStructure. It was boardPlan's private helper until the race needed the
 * same unit, and a second copy is exactly the drift this repo keeps paying for.
 */
export function stepsToPromote(square: string, color: Color): number {
  const rank = Number.parseInt(square[1] ?? '2', 10);
  return color === 'w' ? 8 - rank : rank - 1;
}

/**
 * THE REGISTER IS A REQUIRED PARAMETER, not a default (the identity-term rule —
 * same discipline as the seat on `describeThreatRecognition` and
 * `surfaceRegister` on `curatedBeatAt`). A race reads retrospectively in review
 * ("their pawn was a move faster") and present-tense in a live game ("their pawn
 * is a move faster"); a new caller must decide which, never inherit one.
 */
export type RaceRegister = 'review' | 'live';

/**
 * WHY ONLY TWO KINDS RACE (2026-09-17). `deriveNextPlans` emits eight plan
 * kinds, and the obvious build — "count the tempi to each plan's key square" —
 * is WRONG. Only three kinds have a countable arrival at all (push the passer,
 * blockade the isolani, seize the file), and those three count in DIFFERENT
 * UNITS: pawn pushes, minor-piece hops, rook moves. Comparing them reports
 * "their plan is faster" when their plan is seizing a file, which is not a
 * terminal event at all — a confidently wrong number is worse than silence.
 *
 * A race is real only when both sides run the SAME plan kind toward the SAME
 * kind of terminal event:
 *  • both have a passed pawn      → a genuine race, unit = pushes to promotion;
 *  • both want the SAME open file → a collision, unit = rook moves to that file.
 * Everything else is silent (G4.5's "empty > generic" — silence is a computed
 * verdict here, not a cap).
 */
export interface PasserRace {
  kind: 'passer-race';
  yourPawn: string;
  theirPawn: string;
  yourPushes: number;
  theirPushes: number;
  /** Whose move it is — half the arithmetic, and the half that decides a tie. */
  youMoveFirst: boolean;
  /** Who reaches the queening square first if nobody interferes. Moving first
   *  wins a tie, because your Nth move lands before their Nth. */
  youQueenFirst: boolean;
  /** Queens still on. A 3-vs-3 race is NOT what decides a sharp middlegame, so
   *  the race is a standing fact there and an instruction only once the board
   *  simplifies. `deriveNextPlans` gates its escort clause the same way — "the
   *  king joins the escort once the queens come off" — and phase-blind advice
   *  is the defect that rule was written for. */
  queensOn: boolean;
}

export interface FileCollision {
  kind: 'file-collision';
  file: string;
  /** True when that side has a rook that can legally land on the file NOW. */
  yoursNow: boolean;
  theirsNow: boolean;
}

export type PlanRace = PasserRace | FileCollision;

/**
 * Pushes (not ranks) to the promotion square. A pawn still on its start rank
 * with two empty squares ahead saves a tempo with the double step — counting
 * ranks there would hand the student a race they are actually winning.
 */
export function pushesToPromote(chess: Chess, square: string, color: Color): number {
  const steps = stepsToPromote(square, color);
  const file = square[0];
  const rank = Number.parseInt(square[1] ?? '2', 10);
  const onStart = color === 'w' ? rank === 2 : rank === 7;
  if (!onStart) return steps;
  const d = color === 'w' ? 1 : -1;
  const one = `${file}${rank + d}`;
  const two = `${file}${rank + 2 * d}`;
  const clear = !chess.get(one as Square) && !chess.get(two as Square);
  return clear ? steps - 1 : steps;
}

/**
 * The fastest RUNNING passer of a side — the one that actually sets the pace.
 *
 * "Running" means the square in front is empty. A blockaded passer is NOT in a
 * race, it is stuck, and counting its rank distance produces the exact lie this
 * computer exists to kill: the first draft reported a pawn on a2 with an enemy
 * knight on a3 as "6 pushes from queening" when it could not legally move at
 * all. A side whose only passer is blockaded has no runner here, and the
 * teaching for it already exists — `structurePlan` says dislodge the blockader.
 */
function fastestRunner(chess: Chess, squares: readonly string[], color: Color): { sq: string; pushes: number } | null {
  let best: { sq: string; pushes: number } | null = null;
  const d = color === 'w' ? 1 : -1;
  for (const sq of squares) {
    const front = `${sq[0]}${Number.parseInt(sq[1] ?? '2', 10) + d}`;
    if (chess.get(front as Square)) continue; // blockaded — not running
    const pushes = pushesToPromote(chess, sq, color);
    if (!best || pushes < best.pushes) best = { sq, pushes };
  }
  return best;
}

/** Can this side put a rook on that file with one legal move? */
function rookReachesFileNow(fen: string, file: string, color: Color): boolean {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return false; }
  // Ask the board from that side's perspective, whoever is actually to move.
  const parts = fen.split(' ');
  if (parts[1] !== color) {
    parts[1] = color;
    parts[3] = '-'; // an en-passant square belongs to the other side's last move
    try { chess = new Chess(parts.join(' ')); } catch { return false; }
  }
  for (const mv of chess.moves({ verbose: true })) {
    if (mv.piece === 'r' && mv.to[0] === file) return true;
  }
  return false;
}

/**
 * THE RACE, or null. Computed from the board (G0) for BOTH seats, and stated
 * only when the two sides are genuinely running the same kind of plan.
 */
export function detectPlanRace(fen: string, studentColor: Color): PlanRace | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const s = describeStructure(fen);
  if (!s) return null;
  const opp: Color = studentColor === 'w' ? 'b' : 'w';

  // 1. BOTH sides have a passed pawn — the classic race.
  const mine = fastestRunner(chess, s.pawns.passedPawns[studentColor], studentColor);
  const theirs = fastestRunner(chess, s.pawns.passedPawns[opp], opp);
  if (mine && theirs) {
    const youMoveFirst = chess.turn() === studentColor;
    const queensOn = chess.board().flat().some((c) => !!c && c.type === 'q');
    return {
      kind: 'passer-race',
      queensOn,
      yourPawn: mine.sq,
      theirPawn: theirs.sq,
      yourPushes: mine.pushes,
      theirPushes: theirs.pushes,
      youMoveFirst,
      youQueenFirst: youMoveFirst
        ? mine.pushes <= theirs.pushes
        : mine.pushes < theirs.pushes,
    };
  }

  // 2. BOTH sides want the same open file — a collision, not a speed contest.
  //    Only a file NEITHER side's heavy pieces already hold is contested.
  const heavyFiles: Record<Color, Set<string>> = { w: new Set(), b: new Set() };
  const rookCount: Record<Color, number> = { w: 0, b: 0 };
  for (const cell of chess.board().flat()) {
    if (!cell) continue;
    if (cell.type === 'r' || cell.type === 'q') heavyFiles[cell.color].add(cell.square[0]);
    if (cell.type === 'r') rookCount[cell.color] += 1;
  }
  const myHeavy = heavyFiles[studentColor];
  const theirHeavy = heavyFiles[opp];
  if (rookCount[studentColor] > 0 && rookCount[opp] > 0) {
    for (const file of s.pawns.openFiles) {
      if (myHeavy.has(file) || theirHeavy.has(file)) continue;
      return {
        kind: 'file-collision',
        file,
        yoursNow: rookReachesFileNow(fen, file, studentColor),
        theirsNow: rookReachesFileNow(fen, file, opp),
      };
    }
  }

  return null;
}

/**
 * The spoken clause, or null. States the COUNTS and the consequence for the
 * slower side — never a verdict like "you lose that race": a middlegame piece
 * can still blockade, and overstating the why is its own defect (David
 * 2026-07-19: "be careful not to overstate the why").
 */
export function planRaceClause(
  fen: string,
  studentColor: Color,
  register: RaceRegister,
): string | null {
  const race = detectPlanRace(fen, studentColor);
  if (!race) return null;
  const past = register === 'review';

  if (race.kind === 'passer-race') {
    const pushes = (n: number): string => `${n} push${n === 1 ? '' : 'es'}`;
    const counts = past
      ? `both sides had a runner: yours on ${race.yourPawn} was ${pushes(race.yourPushes)} from queening, theirs on ${race.theirPawn} was ${race.theirPushes}`
      : `both sides have a runner: yours on ${race.yourPawn} is ${pushes(race.yourPushes)} from queening, theirs on ${race.theirPawn} is ${race.theirPushes}`;

    // A dead-level count is still a race — the MOVE decides it, and saying so
    // is the whole teaching. The first draft returned null here and threw away
    // the clearest case there is.
    const level = race.yourPushes === race.theirPushes;
    const tempoNote = level
      ? (race.youMoveFirst
        ? (past ? ', and the move was yours' : ", and the move is yours")
        : (past ? ', and the move was theirs' : ', and the move is theirs'))
      : '';

    // Never a verdict — "if nobody interferes". A middlegame piece can still
    // blockade or capture, so the arithmetic is a guide to the PLAN, not a
    // promise about the result (David 2026-07-19: don't overstate the why).
    // WITH QUEENS ON, the race is a standing fact, not a marching order. Read
    // at Fischer–Spassky move 27: both runners three away and the move White's,
    // but with queens and rooks on, "push, and make them be the one who stops to
    // defend" is an instruction into a sharp middlegame. The honest form names
    // what the race is WORTH and what unlocks it — which also teaches why you
    // would want the trade.
    const lesson = race.youQueenFirst
      ? (past
        ? (race.queensOn
          ? 'you got there first once the queens came off — that race was the reason to trade into the endgame'
          : 'you got there first if nobody interfered, so the race was yours to take — pushing beat stopping to defend')
        : (race.queensOn
          ? 'you get there first once the queens come off — that race is your reason to trade into the endgame, not to go pushing into the middlegame'
          : "you get there first if nobody interferes, so the race is yours — push, and make them be the one who stops to defend"))
      : (past
        ? (race.queensOn
          ? 'they got there first, so the endgame was theirs — that race was the reason to keep the queens on and play for something else'
          : 'they got there first, so racing lost it — theirs had to be stopped before yours could decide anything')
        : (race.queensOn
          ? 'they get there first, so the endgame favours them — keep the queens on and play for something else, or stop theirs before you trade'
          : "they get there first, so you can't just race — stop theirs before yours can decide anything"));
    return `${counts}${tempoNote}; ${lesson}`;
  }

  // File collision — silent unless exactly one side can take it this move,
  // because "you both want it" with neither able to move there teaches nothing.
  if (race.yoursNow === race.theirsNow) return null;
  return race.yoursNow
    ? (past
      ? `you both wanted the open ${race.file}-file and only your rook could take it — that was the moment to claim it`
      : `you both want the open ${race.file}-file and only your rook can take it right now — claim it before they contest it`)
    : (past
      ? `you both wanted the open ${race.file}-file, but only their rook could take it — it was theirs first`
      : `you both want the open ${race.file}-file, but only their rook can take it right now — contest it or they own it`);
}
