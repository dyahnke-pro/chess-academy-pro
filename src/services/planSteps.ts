// planSteps — THE PLAN'S NEXT STEPS (WO-OPENINGS-REWRITE-01 composer, David
// 2026-11-12: the writers say "Bd3 and Qc2, both aimed at h7, then castle";
// "they just need to get done"). Read off the engine's best line after a move:
// the mover's own next quiet moves, and what they build together — a square
// they all aim at, a pawn break they prepare, castling to finish. Said only
// when the line is quiet (no capture or check in its first plies): a line of
// captures is a tactic, which other computers say.
//
// PURE: chess.js and the line only. Dual use: the same steps a lesson teaches
// are the steps a student's game can be checked against.
import { Chess, type Color, type Square } from 'chess.js';
import { isPawnBreak } from './pawnBreak';
import { pieceWork } from './pieceWork';
import { isUndevelopedInOpening } from '../utils/undeveloped';
import { findWeakPawns, legalSeeGainFor } from './positionReadingService';

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king', p: 'pawn' };

export interface PlanStep { san: string; piece: string; from: string; to: string; castle: boolean; brk: boolean;
  /** The piece was taken on its square later in the line (a trade): a step
   *  from that square is another piece's, never this road going on. */
  lost?: true }
/** ONE PIECE'S ROAD in the plan (Danya: "the knight reroutes to a3", "the
 *  queen must leave h5 for the queenside"): a piece the line moves two or more
 *  times in a row of its own steps, that does more work at the end of the road
 *  than where it stands (`pieceWork`). The piece to improve, and where it goes. */
export interface PlanManeuver { piece: string; from: string; route: string[];
  /** The road goes on from the move just played: the piece keeps going, it was
   *  not misplaced ("has a better road" right after it arrived read as a fault). */
  justMoved: boolean;
  /** WHAT THE ROAD'S END GIVES THE PIECE TO DO, that it does not do now
   *  (Danya judges a road by what it attacks there: "toward f2", "the knight
   *  heads for d5", "the bishop adds pressure on the seventh"): a square next
   *  to their king, a piece or pawn of theirs, or a hole in their camp. A
   *  road with no job is the engine waiting, never a plan. */
  job: RoadJob }
/** The one job a road's end gives its piece. */
export interface RoadJob { kind: 'king' | 'piece' | 'hole'; square: string; piece: string | null }
export interface PlanSteps {
  /** The mover's next moves in the line, in order (2–3). */
  steps: PlanStep[];
  /** A square two or more of the moved pieces attack at the plan's end, with
   *  something of the other side on it or next to their king. */
  aim: string | null;
  /** What stands on the aim: a piece of the other side, or null for an empty
   *  square next to their king. The owner is said from the STUDENT's seat in
   *  `planStepsText` (their plan aims at YOUR knight). */
  aimPiece: string | null;
  /** WHY the aim is a target (David 2026-11-19: "why does it want to be on
   *  that line?"), read on the plan's last board: what is weak about a pawn
   *  there (no pawn can guard it), and how many of the planner's pieces hit
   *  it against how many guard it. Null for an empty square by the king. */
  aimWhy: { weak: 'isolated' | 'backward' | 'doubled' | 'no-pawn-guard' | null; hits: number; guards: number;
    /** The exchange count on that square wins material for the planner. */
    wins: boolean } | null;
  /** The whole line played to the plan's last step (UCI), for the proof. */
  line: string[];
  /** One piece walked two or more steps to a better square, or null. */
  maneuver: PlanManeuver | null;
  squares: string[];
}

/** The plan in the engine's line from `fenAfter` (the other side to move):
 *  `line` is UCI, their reply first; `played` the move that made `fenAfter`
 *  (UCI), or null when unknown. Null when the line is not quiet, or the
 *  mover's next moves are fewer than two. */
export function planSteps(fenAfter: string, line: readonly string[], lastMove: string | null, maxSteps = 3,
  /** A plain trade in the stretch — a capture taken straight back on its
   *  square — is part of the plan, not a fight (the board read's plan: the
   *  engine's line often trades a pair on the way). Off for a move's own plan. */
  allowTrades = false,
  /** Is `lastMove` the plan's own first step (a board read: the engine's
   *  suggestion, not a move played)? Then a piece's road starts where it
   *  stands before it, so "the queen on h5" is named, not the square it was
   *  sent to. A move already played is not a step of the plan from here. */
  firstIsStep = false): PlanSteps | null {
  const board = new Chess(fenAfter);
  const mover: Color = board.turn() === 'w' ? 'b' : 'w';
  // THE BOARD NOW — what the plan is said against. A board read's first step
  // is the engine's suggestion, so "now" is the board before it; a move
  // already played leaves the board as it stands. Every piece, square and
  // target the plan names is checked against this board, never a board the
  // line only reaches (Danya, the art of maneuvering #0: "your knight on c3
  // has a better road: e2 and then f4" with a knight standing on f4).
  const now = firstIsStep && lastMove ? boardBefore(fenAfter, lastMove) : fenAfter;
  if (!now) return null;
  const nowBoard = new Chess(now, { skipValidation: true });
  if (firstIsStep && lastMove) {
    // The suggestion itself must be quiet: a check or a capture first is a
    // fight, which the tactic computers say (endgame attacks #2 board 3: Qd8+
    // first, then "Qd4, Qc5 and then Be2" with the queen already on d4).
    try {
      const m = nowBoard.moves({ verbose: true }).find((x) => x.from === lastMove.slice(0, 2) && x.to === lastMove.slice(2, 4));
      if (!m || m.san.includes('+') || m.san.includes('#')) return null;
      if (m.captured && !(allowTrades && line[0]?.slice(2, 4) === m.to)) return null;
    } catch { return null; }
  }
  // Where each of the mover's pieces has stood in the plan, by the square it
  // stands on now: a step back to a square it already stood on is a shuffle
  // ("Rb5, Rb8 and then Rb5", modern chess technique #2), not a plan.
  const walked = new Map<string, Set<string>>();
  for (const sq of nowBoard.board().flat()) if (sq && sq.color === mover) walked.set(sq.square, new Set([sq.square]));
  if (firstIsStep && lastMove) {
    const was = walked.get(lastMove.slice(0, 2));
    if (was) { walked.delete(lastMove.slice(0, 2)); was.add(lastMove.slice(2, 4)); walked.set(lastMove.slice(2, 4), was); }
  }
  const steps: PlanStep[] = [];
  /** Step index → the earlier step that cleared its square (one of the
   *  mover's own pieces stands there now). */
  const cleared = new Map<number, number>();
  const played: string[] = [];
  for (let i = 0; i < line.length && steps.length < maxSteps; i += 1) {
    const u = line[i];
    const before = board.fen();
    let mv;
    try { mv = board.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined }); } catch { break; }
    played.push(u);
    // A capture or a check in the plan's stretch is a fight, not a plan —
    // except a plain trade when the caller allows one: the capture, and the
    // recapture on the same square that answers it.
    const retakes = (j: number): boolean => !!line[j] && line[j].slice(2, 4) === mv.to;
    const prevTook = i > 0 && played.length >= 2 && (() => { const pu = line[i - 1]; return pu.slice(2, 4) === mv.to; })();
    if (mv.san.includes('+') || mv.san.includes('#')) return null;
    if (mv.captured) {
      // A plain trade is passed over: neither the capture nor the recapture
      // is a step of the plan, and neither is called a break.
      if (allowTrades && (retakes(i + 1) || prevTook)) {
        if (mv.color === mover) { const was = walked.get(mv.from) ?? new Set([mv.from]); walked.delete(mv.from); walked.delete(mv.to); was.add(mv.to); walked.set(mv.to, was); }
        else {
          walked.delete(mv.to);
          // Their capture took the piece a step of ours put there: the road it
          // was on ends (the knight a6-c5 taken on c5 and the d7 knight
          // retaking does not carry on as "a6, c5 and then e6").
          const took = [...steps].reverse().find((x) => x.to === mv.to);
          if (took) took.lost = true;
        }
        continue;
      }
      return null;
    }
    if (mv.color !== mover) continue;
    if (!mv.san.startsWith('O-O')) {
      const was = walked.get(mv.from) ?? new Set([mv.from]);
      if (was.has(mv.to)) return null;
      // A step onto a square one of the mover's own pieces holds NOW is said
      // against a board the student is not looking at ("Qd4" with the queen
      // on d4, "e2 and then f4" with a knight on f4).
      const there = nowBoard.get(mv.to);
      // Free only when a step of the plan itself left it — and then only if
      // that step is said with it (checked once the plan's shape is known).
      if (there && there.color === mover) {
        const by = steps.findIndex((x) => x.from === mv.to);
        cleared.set(steps.length, by);
        if (by < 0) return null;
      }
      walked.delete(mv.from); was.add(mv.to); walked.set(mv.to, was);
    }
    steps.push({ san: mv.san, piece: PIECE[mv.piece], from: mv.from, to: mv.to, castle: mv.san.startsWith('O-O'), brk: mv.piece === 'p' && isPawnBreak(before, mv.san, null) });
  }
  // A board read's first step is a step of the road too ("Re3 and then b3":
  // the rook lift, the-positional-rook-lift #0): one step after it is a road
  // when the same piece walks it, never a list.
  const firstPiece = firstIsStep && lastMove ? firstStep(fenAfter, lastMove) : null;
  if (steps.length < (firstPiece ? 1 : 2)) return null;
  // THE AIM: a square of theirs two or more of the moved pieces now hit.
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  const theirKing = board.board().flat().find((p) => p && p.type === 'k' && p.color === enemy)?.square ?? null;
  const near = (sq: string): boolean => !!theirKing && Math.abs(sq.charCodeAt(0) - theirKing.charCodeAt(0)) <= 1 && Math.abs(Number(sq[1]) - Number(theirKing[1])) <= 1;
  const counts = new Map<string, number>();
  for (const s of steps) {
    if (s.castle) continue;
    const at = board.get(s.to as Square);
    if (!at || at.color !== mover || at.type === 'p') continue;
    for (const sq of attacksFrom(board, s.to)) counts.set(sq, (counts.get(sq) ?? 0) + 1);
  }
  let aim: string | null = null; let aimPiece: string | null = null;
  for (const [sq, n] of counts) {
    if (n < 2) continue;
    const p = board.get(sq as Square);
    // The target is a piece standing there NOW: "lining up on their knight on
    // d3" with no knight on d3 named a piece the line only brings (how to win
    // equal positions #1).
    const pNow = nowBoard.get(sq as Square);
    if (p && (!pNow || pNow.color !== p.color || pNow.type !== p.type)) continue;
    if (!p && pNow) continue;
    const target = (p && p.color === enemy && p.type !== 'k') || (!p && near(sq) && hasMatingForce(board, mover));
    if (!target) continue;
    aim = sq;
    aimPiece = p ? PIECE[p.type] : null;
    if (p && p.type === 'p' && near(sq)) break;
  }
  const brk = steps.some((s) => s.brk);
  const first = firstPiece;
  const road = pieceManeuver(first ? first.before : fenAfter, board, first ? [first.step, ...steps] : steps, mover);
  const maneuver = road ? { ...road, justMoved: !first && !!lastMove && lastMove.slice(2, 4) === road.from } : null;
  // A road names only its own piece's moves: a road square some OTHER step
  // cleared reads as a square still taken on the board now ("your knight on
  // c3 has a better road: e2 and then f4" with a knight on f4 that leaves
  // only for a trade the sentence never says).
  if (maneuver) {
    for (const [k, by] of cleared) {
      if (!maneuver.route.includes(steps[k].to)) continue;
      if (!maneuver.route.includes(steps[by].to) || steps[by].piece !== maneuver.piece) return null;
    }
  }
  // Steps with nothing that ties them — no square they aim at, no break they
  // build to — are moves, not a plan. "Be7, castling and then Nc6, to finish
  // developing" said on every quiet move was filler (decision baseline
  // 2026-11-12): finishing development is what every move of an opening does.
  if (!aim && !brk && !maneuver) return null;
  // A list tied ONLY by a break is a plan when a step after it works with the
  // break: a piece that lands bearing on the break's square or on the pawn
  // it hits ("the c4 break and then Nc3", the knight on d5). "The f5 break,
  // Kh8 and then Nc5" is a break and two other moves (Danya, mysterious GM
  // moves #0: his plan is the centre and the king attack, never a list).
  // Steps BEFORE a break are its preparation (the writers' "Bd3, Bc2 and then
  // the d4 break"); steps after it must work with it.
  if (!aim && !maneuver && brk) {
    const b = steps.find((x) => x.brk);
    if (b && b !== steps[steps.length - 1]) {
      const f = b.to.charCodeAt(0); const r = Number(b.to[1]) + (mover === 'w' ? 1 : -1);
      const contact = [-1, 1].map((d) => `${String.fromCharCode(f + d)}${r}`).filter((sq) => /^[a-h][1-8]$/.test(sq));
      const goals = new Set([b.to, ...contact]);
      const works = steps.slice(steps.indexOf(b) + 1).some((x) => !x.castle && x.piece !== 'pawn' && x.piece !== 'king'
        && board.get(x.to as Square)?.color === mover && attacksFrom(board, x.to).some((sq) => goals.has(sq)));
      if (!works) return null;
    }
  }
  // One step and no road is a move, not a plan.
  if (steps.length < 2 && !maneuver) return null;
  // A plan tied only by the break the move just played prepares is that
  // move's own job said again ("Your c3 prepares d4 … and then the d4
  // break"): one idea, said once, by the move.
  if (!aim && !maneuver && lastMove) {
    const brkStep = steps.find((s) => s.brk);
    const by = board.get(lastMove.slice(2, 4) as Square);
    if (brkStep && by && by.type === 'p' && by.color === mover) {
      const f = lastMove.charCodeAt(2) - 97; const r = Number(lastMove[3]); const d = mover === 'w' ? 1 : -1;
      const guards = [f - 1, f + 1].filter((x) => x >= 0 && x < 8).map((x) => `${String.fromCharCode(97 + x)}${r + d}`);
      if (guards.includes(brkStep.to)) return null;
    }
  }
  let aimWhy: PlanSteps['aimWhy'] = null;
  if (aim && aimPiece) {
    const sq = aim as Square;
    // Counted the way the aim is found (`attacksFrom`): through a battery, so
    // three rooks stacked on the c-file are three hits, not one.
    const bearing = (c: Color): Square[] => board.board().flat()
      .filter((x): x is NonNullable<typeof x> => !!x && x.color === c && x.square !== sq && attacksFrom(board, x.square).includes(sq))
      .map((x) => x.square);
    const hits = bearing(mover).length;
    const guarders = bearing(enemy);
    let weak: NonNullable<PlanSteps['aimWhy']>['weak'] = null;
    if (aimPiece === 'pawn') {
      const w = findWeakPawns(board.fen(), enemy);
      weak = w.isolated.includes(sq) ? 'isolated' : w.backward.includes(sq) ? 'backward' : w.doubled.includes(sq) ? 'doubled'
        : guarders.some((g) => board.get(g)?.type === 'p') || sq[1] === (enemy === 'w' ? '2' : '7') ? null : 'no-pawn-guard';
    }
    aimWhy = { weak, hits, guards: guarders.length, wins: legalSeeGainFor(board.fen(), sq, mover) > 0 };
  }
  return { steps, aim, aimPiece, aimWhy, line: played, maneuver, squares: [...(maneuver ? [maneuver.from] : []), ...steps.map((s) => s.to), ...(aim ? [aim] : [])] };
}

/** The board before `lastMove` was played on it, the moved piece put back
 *  (a promotion back to a pawn, a castled king and rook back home). A
 *  captured piece is not restored: the square is left empty, which is all the
 *  plan's checks against the mover's own pieces need. */
function boardBefore(fenAfter: string, lastMove: string): string | null {
  try {
    const b = new Chess(fenAfter);
    const from = lastMove.slice(0, 2) as Square; const to = lastMove.slice(2, 4) as Square;
    const p = b.get(to);
    if (!p || b.get(from)) return null;
    b.remove(to);
    b.put(lastMove.length > 4 ? { type: 'p', color: p.color } : p, from);
    if (p.type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
      const rank = from[1]; const kingSide = to[0] === 'g';
      const rFrom = `${kingSide ? 'f' : 'd'}${rank}` as Square; const rTo = `${kingSide ? 'h' : 'a'}${rank}` as Square;
      const r = b.get(rFrom);
      if (r) { b.remove(rFrom); b.put(r, rTo); }
    }
    const parts = b.fen().split(' '); parts[1] = p.color; parts[3] = '-';
    return new Chess(parts.join(' '), { skipValidation: true }).fen();
  } catch { return null; }
}

/** The plan's first step when it is `lastMove` itself, with the board before
 *  it (the piece put back where it stood), read off `fenAfter`. */
function firstStep(fenAfter: string, lastMove: string): { step: PlanStep; before: string } | null {
  try {
    const b = new Chess(fenAfter);
    const from = lastMove.slice(0, 2) as Square; const to = lastMove.slice(2, 4) as Square;
    const p = b.get(to);
    if (!p || p.type === 'p' || p.type === 'k' || b.get(from)) return null;
    b.remove(to); b.put(p, from);
    const letter = p.type.toUpperCase();
    return { step: { san: `${letter}${to}`, piece: PIECE[p.type], from, to, castle: false, brk: false }, before: b.fen() };
  } catch { return null; }
}

/** Can the piece on `start` of `fen`, standing on `at` instead, reach `to`
 *  in one of its own moves (the rest of the board as it is)? */
function reachesInOne(fen: string, start: string, at: string, to: string, mover: Color): boolean {
  try {
    const b = new Chess(fen);
    const p = b.get(start as Square);
    if (!p) return false;
    if (at !== start) { if (b.get(at as Square)) return false; b.remove(start as Square); b.put(p, at as Square); }
    const parts = b.fen().split(' '); parts[1] = mover; parts[3] = '-';
    return new Chess(parts.join(' '), { skipValidation: true }).moves({ square: at as Square, verbose: true }).some((m) => m.to === to);
  } catch { return false; }
}

/** The plan's one-piece road: the longest chain of steps moving the same
 *  piece (each step starting where the last ended), two steps or more, that
 *  ends where the piece does more work than where it started. Kings and pawns
 *  walk for other reasons (an ending, a break) and are said by their own
 *  computers. */
/** Does `c` have mating force against a king: a queen or a rook? A minor
 *  hitting a square next to the king in an ending is no attack (Danya,
 *  Carlsen's endgame wins #0: the play is the damaged queenside pawns, not
 *  "b3, next to their king"). */
export function hasMatingForce(b: Chess, c: Color): boolean {
  return b.findPiece({ type: 'q', color: c }).length + b.findPiece({ type: 'r', color: c }).length > 0;
}

/** A hole of theirs for a piece of `mover`: a square no pawn of theirs can
 *  ever attack. */
function isHole(b: Chess, sq: string, mover: Color): boolean {
  const r = Number(sq[1]); const f = sq.charCodeAt(0);
  const them: Color = mover === 'w' ? 'b' : 'w';
  for (const df of [-1, 1]) {
    const file = String.fromCharCode(f + df);
    if (file < 'a' || file > 'h') continue;
    for (const p of b.findPiece({ type: 'p', color: them })) {
      if (p[0] === file && (them === 'b' ? Number(p[1]) > r : Number(p[1]) < r)) return false;
    }
  }
  return true;
}

/** THE ROAD'S JOB (see `RoadJob`): read at the road's end against where the
 *  piece stands now — a square next to their king (with a queen or rook on
 *  the board to make it an attack), a piece or pawn of theirs, a hole of
 *  theirs for a knight. The king first, then a piece, then a hole. */
function roadJob(start: Chess, end: Chess, from: string, to: string, mover: Color): RoadJob | null {
  const them: Color = mover === 'w' ? 'b' : 'w';
  const ALL: string[] = [];
  for (const f of 'abcdefgh') for (let r = 1; r <= 8; r += 1) ALL.push(`${f}${r}`);
  const hitNow = new Set(ALL.filter((sq) => start.attackers(sq as Square, mover).includes(from as Square)));
  const hitEnd = ALL.filter((sq) => !hitNow.has(sq) && end.attackers(sq as Square, mover).includes(to as Square));
  const k = end.findPiece({ type: 'k', color: them })[0];
  if (k && hasMatingForce(end, mover)) {
    const z = hitEnd.find((sq) => !end.get(sq as Square) && Math.abs(sq.charCodeAt(0) - k.charCodeAt(0)) <= 1 && Math.abs(Number(sq[1]) - Number(k[1])) <= 1);
    if (z) return { kind: 'king', square: z, piece: null };
  }
  // The piece nearest their king first (the rook on h4 is after h3, not c4).
  const dist = (sq: string): number => (k ? Math.max(Math.abs(sq.charCodeAt(0) - k.charCodeAt(0)), Math.abs(Number(sq[1]) - Number(k[1]))) : 0);
  const piece = hitEnd.filter((sq) => { const p = end.get(sq as Square); return !!p && p.color === them && p.type !== 'k'; })
    .sort((a, b) => dist(a) - dist(b))[0];
  if (piece) return { kind: 'piece', square: piece, piece: PIECE[end.get(piece as Square)?.type ?? 'p'] };
  const moved = end.get(to as Square);
  // A hole is a knight's outpost (Danya: "the d5 square is irreparably weak"):
  // a central square on their fifth or sixth rank, never a rim square.
  if (moved?.type === 'n') {
    const deep = mover === 'w' ? '56' : '43';
    const hole = hitEnd.find((sq) => !end.get(sq as Square) && 'cdef'.includes(sq[0]) && deep.includes(sq[1]) && isHole(end, sq, mover));
    if (hole) return { kind: 'hole', square: hole, piece: null };
  }
  return null;
}

function pieceManeuver(fenStart: string, end: Chess, steps: readonly PlanStep[], mover: Color): Omit<PlanManeuver, 'justMoved'> | null {
  let best: PlanStep[] = [];
  for (let i = 0; i < steps.length; i += 1) {
    const chain = [steps[i]];
    for (let j = i + 1; j < steps.length; j += 1) {
      if (steps[j].from === chain[chain.length - 1].to && steps[j].piece === steps[i].piece && !chain[chain.length - 1].lost) chain.push(steps[j]);
    }
    if (chain.length > best.length) best = chain;
  }
  if (best.length < 2) return null;
  const type = best[0].san[0] === 'N' ? 'n' : best[0].san[0] === 'B' ? 'b' : best[0].san[0] === 'R' ? 'r' : best[0].san[0] === 'Q' ? 'q' : null;
  if (!type) return null;
  const start = best[0].from;
  const last = best[best.length - 1].to;
  // A ROAD GOES SOMEWHERE: no square twice, never back through where it
  // started ("h2 and then h1" from h1 is a shuffle).
  const walked = [start, ...best.map((s) => s.to)];
  if (new Set(walked).size !== walked.length) return null;
  // An undeveloped piece's lesson is development, not a reroute.
  let startBoard: Chess;
  try { startBoard = new Chess(fenStart); } catch { return null; }
  if (isUndevelopedInOpening(fenStart, mover, type, start)) return null;
  // The road's piece must stand on its first square NOW: a queen the line
  // makes by promoting is not "your queen on c8" on a board with no queen
  // (Danya, a guide to underpromotion #0: the Saavedra board).
  const own = startBoard.get(start as Square);
  if (!own || own.color !== mover || own.type !== type) return null;
  // A square the piece reaches in one move is not a road: the engine's detour
  // is about timing, said by other computers.
  // The same holds at every stop: a road that could skip a stop is the
  // engine waiting, not a piece travelling ("c1, c2 and then c3").
  for (let i = 0; i + 2 < walked.length; i += 1) {
    for (let j = i + 2; j < walked.length; j += 1) {
      if (reachesInOne(fenStart, start, walked[i], walked[j], mover)) return null;
    }
  }
  // The road must end where the piece is still standing.
  const at = end.get(last as Square);
  if (!at || at.color !== mover || at.type !== type) return null;
  let before: number;
  try { before = pieceWork(startBoard, start as Square, type, mover); } catch { return null; }
  const after = pieceWork(end, last as Square, type, mover);
  if (after <= before) return null;
  const job = roadJob(startBoard, end, start, last, mover);
  if (!job) return null;
  return { piece: best[0].piece, from: start, route: best.map((s) => s.to), job };
}

/** The squares a piece on `sq` bears on: the knight's jumps, the king's
 *  steps, and a slider's rays — read THROUGH its own slider standing behind
 *  on the same line (a battery: Qc2 behind Bd3 bears on h7), stopping at the
 *  first other piece. */
function attacksFrom(board: Chess, sq: string): string[] {
  const p = board.get(sq as Square);
  if (!p) return [];
  const f0 = sq.charCodeAt(0) - 97; const r0 = Number(sq[1]) - 1;
  const at = (f: number, r: number): string | null => (f >= 0 && f < 8 && r >= 0 && r < 8 ? `${String.fromCharCode(97 + f)}${r + 1}` : null);
  const out: string[] = [];
  if (p.type === 'n' || p.type === 'k') {
    const d = p.type === 'n' ? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [df, dr] of d) { const t = at(f0 + df, r0 + dr); if (t) out.push(t); }
    return out;
  }
  const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dirs = p.type === 'b' ? diag : p.type === 'r' ? straight : p.type === 'q' ? [...diag, ...straight] : [];
  for (const [df, dr] of dirs) {
    const isDiag = df !== 0 && dr !== 0;
    for (let k = 1; k < 8; k += 1) {
      const t = at(f0 + df * k, r0 + dr * k);
      if (!t) break;
      out.push(t);
      const q = board.get(t as Square);
      if (!q) continue;
      const alongMine = q.color === p.color && (q.type === 'q' || (isDiag ? q.type === 'b' : q.type === 'r'));
      if (!alongMine) break;
    }
  }
  return out;
}

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
/** Why the aim is a target, in words from the planner's seat: the pawn's
 *  weakness, then the count when the planner's pieces outnumber the guards. */
function aimWhyText(p: PlanSteps, whose: 'your' | 'their'): string {
  const w = p.aimWhy;
  if (!w) return '';
  const owner = whose === 'your' ? 'their' : 'your';
  const weak = w.weak === 'isolated' ? ' It is isolated, so no pawn can ever guard it.'
    : w.weak === 'backward' ? ' It is backward: the pawns beside it have moved on and can no longer guard it.'
      : w.weak === 'doubled' ? ' It is a doubled pawn, and the pawn in front of it cannot guard it.'
        : w.weak === 'no-pawn-guard' ? ' No pawn guards it, so only pieces can.' : '';
  const n = (k: number): string => COUNT[k] ?? String(k);
  const theirs = owner === 'their' ? 'theirs' : 'yours';
  const hit = `${n(w.hits)[0].toUpperCase()}${n(w.hits).slice(1)} of ${whose} pieces hit it`;
  const guard = `${n(w.guards)} of ${theirs} guard${w.guards === 1 ? 's' : ''} it`;
  // THE COUNT is the lesson, said only when it is the truth of the square:
  // more hits than guards AND the exchange there wins it. A count alone is
  // not a win — three rooks against a knight a pawn guards win nothing — so a
  // count the exchange does not back is not said.
  const count = w.hits > w.guards && w.wins ? ` ${hit}, and only ${guard}.` : '';
  return `${weak}${count}`;
}

/** THE PLAN WITHOUT ITS MOVES — Learn's held form (LEARN NAMES NO MOVE
 *  UNASKED, carve-out 4): the piece and what it aims at, never the road or
 *  the steps, so the student still finds the moves. Null for their plan (it
 *  names no move of the student's) and for a plan with nothing to point at. */
export function planStepsHeld(p: PlanSteps, whose: 'your' | 'their'): string | null {
  if (whose !== 'your') return null;
  const target = p.aim ? (p.aimPiece ? `their ${p.aimPiece} on ${p.aim}` : `${p.aim}, next to their king`) : null;
  if (p.maneuver) {
    return `Your ${p.maneuver.piece} on ${p.maneuver.from} has a better square${target ? `, one aimed at ${target}` : ''}.${aimWhyText(p, whose)}`;
  }
  if (!target) return null;
  return `Your pieces have a target: ${target}.${aimWhyText(p, whose)}`;
}

/** The plan in words, from the student's seat. The break is named once, in
 *  its place among the steps ("Bd3, Bc2 and then the d4 break") — never the
 *  move and again as what it builds to. */
export function planStepsText(p: PlanSteps, whose: 'your' | 'their'): string {
  // A ROAD FOR ONE PIECE is the plan said as Danya says it: the piece, and
  // where it goes (one idea a sentence). The line proves the road is better,
  // not that the piece is idle where it stands, so "does little" is not said.
  if (p.maneuver) {
    const m = p.maneuver;
    const owner = whose === 'your' ? 'their' : 'your';
    // Never three squares in one breath (the human-squares rule): the piece
    // and its square in one sentence, the road in the next.
    const road = m.route.length === 2 ? `${m.route[0]} and then ${m.route[1]}` : `by way of ${m.route[0]} to ${m.route.at(-1)}`;
    const aim = p.aim ? ` There it lines up on ${p.aimPiece ? `${owner} ${p.aimPiece} on ${p.aim}` : `${p.aim}, next to ${owner} king`}.` : ` ${roadJobText(m.job, owner)}`;
    const who = whose === 'your' ? 'Your' : 'Their';
    return m.justMoved ? `${who} ${m.piece} keeps going: ${road}.${aim}${aimWhyText(p, whose)}` : `${who} ${m.piece} on ${m.from} has a better road. It goes ${road}.${aim}${aimWhyText(p, whose)}`;
  }
  const named = p.steps.map((s) => (s.castle ? 'castling' : s.brk ? `the ${s.san} break` : s.san));
  const list = named.length === 2 ? `${named[0]} and then ${named[1]}` : `${named.slice(0, -1).join(', ')} and then ${named.at(-1)}`;
  // The target belongs to the OTHER side from the planner: your plan aims at
  // their pieces, theirs at yours.
  const owner = whose === 'your' ? 'their' : 'your';
  const why = p.aim ? `, the pieces lining up on ${p.aimPiece ? `${owner} ${p.aimPiece} on ${p.aim}` : `${p.aim}, next to ${owner} king`}` : '';
  return `${whose === 'your' ? 'Your' : 'Their'} plan from here: ${list}${why}.${aimWhyText(p, whose)}`;
}

/** The road's job said after the road (one idea a sentence): "There it hits
 *  g7, next to their king." / "There it hits their pawn on b3." / "There it
 *  eyes d5, a hole in their camp." */
export function roadJobText(j: RoadJob, owner: 'your' | 'their'): string {
  if (j.kind === 'king') return `There it hits ${j.square}, next to ${owner} king.`;
  if (j.kind === 'piece') return `There it hits ${owner} ${j.piece ?? 'pawn'} on ${j.square}.`;
  return `There it eyes ${j.square}, a hole in ${owner} camp.`;
}

/** The plan's say-once key: one plan per aim or break and mover, so the same
 *  plan is not said again a move later with its steps shifted by one. */
export function planStepsKey(p: PlanSteps, mover: 'w' | 'b'): string {
  const brk = p.steps.find((s) => s.brk);
  // One plan per aim: a road that lines up on a target is that target's plan,
  // so the same target is not said again a move later as a list of steps.
  if (p.maneuver && !p.aim) return `plan-steps:${mover}:road:${p.maneuver.route.at(-1)}`;
  return `plan-steps:${mover}:${p.aim ? `aim:${p.aim}` : `break:${brk?.to ?? ''}`}`;
}

/** The UCI of `san` played on `fenBefore`, or null — the `played` a caller
 *  that holds the move as SAN passes. */
export function playedUci(fenBefore: string, san: string): string | null {
  try { const m = new Chess(fenBefore).move(san); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
}
