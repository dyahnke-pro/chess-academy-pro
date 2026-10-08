import { Chess, type Square } from 'chess.js';
import { describeStructure } from './boardStructure';
import type { Proof } from './proof';

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
  /** Pure pawn ending only: the first new queen will cover the other pawn's
   *  queening square (Naroditsky, Pawn Races: "queen first, and if your queen
   *  covers their promotion square it never promotes"). Null when not read. */
  firstQueenCovers: boolean | null;
}

export interface FileCollision {
  kind: 'file-collision';
  file: string;
  /** True when that side has a rook that can legally land on the file NOW. */
  yoursNow: boolean;
  theirsNow: boolean;
}

/**
 * THE ATTACK RACE ACROSS WINGS (batch 4). Kings castled on opposite wings, each
 * side storming the other's king with a pawn: the SAME plan kind (a pawn storm)
 * toward the SAME terminal event (the pawn touching the king's pawn cover, so a
 * file can open). Unit = pawn pushes until contact. Only RUNNING storm pawns
 * count (the square ahead is empty), and only pawns that have already left home
 * — a storm that has not started is not in the race.
 */
export interface StormRace {
  kind: 'storm-race';
  yourPawn: string;
  theirPawn: string;
  /** Pushes until your storm pawn attacks a pawn of their king's cover. */
  yourPushes: number;
  theirPushes: number;
  youMoveFirst: boolean;
  /** You make contact first; moving first wins a tie. */
  youFirst: boolean;
  /** The wing YOUR storm runs on (their king's wing). */
  yourWing: 'kingside' | 'queenside';
  theirWing: 'kingside' | 'queenside';
}

export type PlanRace = PasserRace | StormRace | FileCollision;

const STORM_FILES = 'abcdefgh';
/** The wing a king has castled to, or null in the centre / off the back ranks. */
function castledWing(chess: Chess, color: Color): 'kingside' | 'queenside' | null {
  for (const cell of chess.board().flat()) {
    if (!cell || cell.type !== 'k' || cell.color !== color) continue;
    const rank = Number(cell.square[1]);
    const home = color === 'w' ? rank <= 2 : rank >= 7;
    if (!home) return null;
    if ('fgh'.includes(cell.square[0])) return 'kingside';
    if ('abc'.includes(cell.square[0])) return 'queenside';
    return null;
  }
  return null;
}

/** The fastest running storm pawn of `color` against a king on `wing`:
 *  pushes until it attacks one of the enemy pawns on that wing. Null when no
 *  advanced pawn there can reach contact within four pushes. */
function stormRunner(chess: Chess, color: Color, wing: 'kingside' | 'queenside'): { sq: string; pushes: number } | null {
  const files = wing === 'kingside' ? 'fgh' : 'abc';
  const d = color === 'w' ? 1 : -1;
  const home = color === 'w' ? 2 : 7;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  let best: { sq: string; pushes: number } | null = null;
  for (const cell of chess.board().flat()) {
    if (!cell || cell.type !== 'p' || cell.color !== color || !files.includes(cell.square[0])) continue;
    const f = STORM_FILES.indexOf(cell.square[0]);
    const r0 = Number(cell.square[1]);
    if (r0 === home) continue;   // the storm has not started with this pawn
    for (let n = 0; n <= 4; n += 1) {
      const r = r0 + n * d;
      if (r < 1 || r > 8) break;
      if (n > 0 && chess.get(`${cell.square[0]}${r}` as Square)) break;   // blocked: not running
      const hits = [f - 1, f + 1].some((ff) => {
        if (ff < 0 || ff > 7) return false;
        const p = chess.get(`${STORM_FILES[ff]}${r + d}` as Square);
        return !!p && p.type === 'p' && p.color === enemy;
      });
      if (hits) {
        if (!best || n < best.pushes) best = { sq: cell.square, pushes: n };
        break;
      }
    }
  }
  return best;
}

function detectStormRace(chess: Chess, studentColor: Color): StormRace | null {
  const opp: Color = studentColor === 'w' ? 'b' : 'w';
  const myKing = castledWing(chess, studentColor);
  const theirKing = castledWing(chess, opp);
  if (!myKing || !theirKing || myKing === theirKing) return null;
  if (chess.inCheck()) return null;
  const mine = stormRunner(chess, studentColor, theirKing);
  const theirs = stormRunner(chess, opp, myKing);
  if (!mine || !theirs) return null;
  const youMoveFirst = chess.turn() === studentColor;
  return {
    kind: 'storm-race',
    yourPawn: mine.sq,
    theirPawn: theirs.sq,
    yourPushes: mine.pushes,
    theirPushes: theirs.pushes,
    youMoveFirst,
    youFirst: youMoveFirst ? mine.pushes <= theirs.pushes : mine.pushes < theirs.pushes,
    yourWing: theirKing,
    theirWing: myKing,
  };
}

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
/** Does a queen on `from` see `to` along an open file, rank or diagonal? */
function queenSees(b: Chess, from: string, to: string): boolean {
  const df = to.charCodeAt(0) - from.charCodeAt(0);
  const dr = Number(to[1]) - Number(from[1]);
  if (!(df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) || (df === 0 && dr === 0)) return false;
  const sf = Math.sign(df); const sr = Math.sign(dr);
  for (let f = from.charCodeAt(0) + sf, r = Number(from[1]) + sr; f !== to.charCodeAt(0) || r !== Number(to[1]); f += sf, r += sr) {
    if (b.get(`${String.fromCharCode(f)}${r}` as Square)) return false;
  }
  return true;
}

/** THE FIRST QUEEN, ON ARRIVAL — in a pure pawn ending, does the new queen
 *  cover the slower pawn's queening square (with that pawn where it will be
 *  when the queen lands)? Kings and pawns only; anything else returns null. */
function queenCovers(chess: Chess, race: PasserRace, studentColor: Color): boolean | null {
  if (chess.board().flat().some((c) => !!c && c.type !== 'k' && c.type !== 'p')) return null;
  const winner: Color = race.youQueenFirst ? studentColor : (studentColor === 'w' ? 'b' : 'w');
  const loser: Color = winner === 'w' ? 'b' : 'w';
  const wPawn = race.youQueenFirst ? race.yourPawn : race.theirPawn;
  const lPawn = race.youQueenFirst ? race.theirPawn : race.yourPawn;
  const wPushes = race.youQueenFirst ? race.yourPushes : race.theirPushes;
  const winnerFirst = chess.turn() === winner;
  const lDone = winnerFirst ? wPushes - 1 : wPushes;
  const dir = loser === 'w' ? 1 : -1;
  const lPromoRank = loser === 'w' ? 8 : 1;
  // Where the slower pawn stands when the queen lands (single steps; a start-
  // rank double step only brings it closer, so this never overstates cover).
  const lRank = Math.min(8, Math.max(1, Number(lPawn[1]) + dir * Math.max(0, lDone)));
  if (lRank === lPromoRank) return false;
  const promo = `${wPawn[0]}${winner === 'w' ? 8 : 1}`;
  const target = `${lPawn[0]}${lPromoRank}`;
  try {
    const b = new Chess(chess.fen());
    b.remove(wPawn as Square); b.remove(lPawn as Square);
    b.put({ type: 'p', color: loser }, `${lPawn[0]}${lRank}` as Square);
    b.put({ type: 'q', color: winner }, promo as Square);
    // THE QUEEN's line, not "attacked by anything": a king beside the square
    // is not the new queen covering it (pass-3 drills: "covers a8" with the
    // queen on g1 and only the king touching a8).
    return queenSees(b, promo, target);
  } catch { return null; }
}

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
    const race: PasserRace = {
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
      firstQueenCovers: null,
    };
    race.firstQueenCovers = queenCovers(chess, race, studentColor);
    return race;
  }

  // 2. Opposite-side castling, both storms running — the attack race.
  const storm = detectStormRace(chess, studentColor);
  if (storm) return storm;

  // 3. BOTH sides want the same open file — a collision, not a speed contest.
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
  // A side in CHECK has only its check answers to choose from, so "only their
  // rook could take it" is the check talking, not the file (review walk
  // 2026-10-01, game 2 ply 67: after Rb7+ the black rook on d8 could not go to
  // e8 only because the king had to move).
  if (rookCount[studentColor] > 0 && rookCount[opp] > 0 && !chess.inCheck()) {
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
          ? 'you would get there first once the queens came off — that race was the reason to trade into the endgame'
          : 'you would get there first if nobody interfered, so the race was yours to take — pushing beat stopping to defend')
        : (race.queensOn
          ? 'you get there first once the queens come off — that race is your reason to trade into the endgame, not to go pushing into the middlegame'
          : "you get there first if nobody interferes, so the race is yours — push, and make them be the one who stops to defend"))
      : (past
        ? (race.queensOn
          ? 'they would get there first, so the endgame was theirs — that race was the reason to keep the queens on and play for something else'
          : 'they would get there first, so racing lost it — theirs had to be stopped before yours could decide anything')
        : (race.queensOn
          ? 'they get there first, so the endgame favours them — keep the queens on and play for something else, or stop theirs before you trade'
          : "they get there first, so you can't just race — stop theirs before yours can decide anything"));
    // THE FIRST QUEEN, ON ARRIVAL (pure pawn ending): covering the other
    // queening square ends the race outright.
    const cover = race.firstQueenCovers
      ? (race.youQueenFirst
        ? (past ? ' — and your new queen would have covered their queening square, so theirs could never promote' : ' — and your new queen covers their queening square, so theirs never promotes')
        : (past ? ' — and their new queen would have covered your queening square' : ' — and their new queen covers your queening square, so yours never promotes'))
      : '';
    return `${counts}${tempoNote}; ${lesson}${cover}`;
  }

  if (race.kind === 'storm-race') {
    const w = ['no', 'one', 'two', 'three', 'four'];
    const n = (k: number): string => (k === 0 ? 'already touching' : `${w[k] ?? k} push${k === 1 ? '' : 'es'} from`);
    const counts = past
      ? `both kings faced a pawn storm: your pawn on ${race.yourPawn} was ${n(race.yourPushes)} their king's pawns, theirs on ${race.theirPawn} was ${n(race.theirPushes)} yours`
      : `both kings face a pawn storm: your pawn on ${race.yourPawn} is ${n(race.yourPushes)} their king's pawns, theirs on ${race.theirPawn} is ${n(race.theirPushes)} yours`;
    const tie = race.yourPushes === race.theirPushes
      ? (race.youMoveFirst ? (past ? ', and the move was yours' : ', and the move is yours') : (past ? ', and the move was theirs' : ', and the move is theirs'))
      : '';
    const lesson = race.youFirst
      ? (past
        ? `their ${race.theirWing} play was too slow — keeping your storm going was the plan`
        : `their ${race.theirWing} play is too slow — keep pushing on the ${race.yourWing}`)
      : (past
        ? `their storm arrived first — slowing it down came before pushing yours`
        : `their storm arrives first — slow it down before you push yours`);
    return `${counts}${tie}; ${lesson}`;
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

/**
 * THE FILE, TAKEN — the live half of the file collision, said AFTER the move
 * (never "claim it now", which would name the student's next move unearned).
 * Both sides wanted the same open file and the student's rook got there. Null
 * unless the move itself is the rook landing on the contested file.
 */
export function fileClaimed(fenBefore: string, san: string): { file: string; contested: boolean; text: string } | null {
  let chess: Chess;
  try { chess = new Chess(fenBefore); } catch { return null; }
  const mover = chess.turn();
  const race = detectPlanRace(fenBefore, mover);
  if (!race || race.kind !== 'file-collision' || !race.yoursNow) return null;
  let mv;
  try { mv = chess.move(san); } catch { return null; }
  if (mv.piece !== 'r' || mv.to[0] !== race.file) return null;
  const file = race.file;
  return {
    file,
    contested: race.theirsNow,
    text: race.theirsNow
      ? `You took the open ${file}-file first — their rook could have reached it too, so now they have to contest it.`
      : `You took the open ${file}-file before either of their rooks could reach it.`,
  };
}

/** THE RACE'S PROOF — the counts it rests on, read off the board (exact).
 *  The same `detectPlanRace` the clause speaks from; null when no race. */
export function planRaceProof(fen: string, studentColor: Color): Proof | null {
  const race = detectPlanRace(fen, studentColor);
  if (!race) return null;
  if (race.kind === 'passer-race') {
    const p = (n: number): string => `${n} push${n === 1 ? '' : 'es'}`;
    const counts = `your pawn on ${race.yourPawn} is ${p(race.yourPushes)} from queening, theirs on ${race.theirPawn} is ${p(race.theirPushes)}, and the move is ${race.youMoveFirst ? 'yours' : 'theirs'}`;
    return { kind: 'count', exact: true, short: `${race.yourPushes} pushes against ${race.theirPushes}`, full: counts, squares: [race.yourPawn, race.theirPawn] };
  }
  if (race.kind === 'storm-race') {
    const w = ['no', 'one', 'two', 'three', 'four'];
    const p = (n: number): string => `${w[n] ?? n} push${n === 1 ? '' : 'es'}`;
    return { kind: 'count', exact: true, short: `${p(race.yourPushes)} against ${p(race.theirPushes)}`, full: `your storm pawn on ${race.yourPawn} needs ${p(race.yourPushes)} to touch their king's pawns, theirs on ${race.theirPawn} needs ${p(race.theirPushes)}, and the move is ${race.youMoveFirst ? 'yours' : 'theirs'}`, squares: [race.yourPawn, race.theirPawn] };
  }
  const file = `the ${race.file}-file`;
  return { kind: 'squares', exact: true, short: file, full: `both sides want ${file}`, squares: [`${race.file}1`, `${race.file}8`] };
}
