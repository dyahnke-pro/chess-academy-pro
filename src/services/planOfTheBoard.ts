// planOfTheBoard — THE ONE PLAN OF A BOARD, chosen the way Danya chooses it
// (David 2026-11-19: "strengthen the PLAN computer so the read says the plan
// Danya says").
//
// Read off 173 of his plan ideas (plan, route, prepare, weakness, structure,
// space, file, outpost), a plan of his is a GOAL and a WAY, never a state:
//   - a piece's ROAD to where it works ("the rook lift Re1-e3-b3", "Rd7-f7
//     toward f2", "the bishop via f7-g6 adds pressure on the seventh");
//   - the SIEGE of a weakness, the pieces stacked on its file ("build the gun
//     on the d-file", "Alekhine's gun on the c-file");
//   - the WEAK PAWN fixed and attacked, the OUTPOST taken, the passer pushed,
//     the worst piece improved — each with its way;
//   - the BREAK that opens the side the pieces aim at ("h5 starts the assault
//     on the poorly guarded king", "b4 then b5 to dislodge the c6 knight").
// "Their rook on f1 is well placed — it has the half-open f-file" is a state:
// it names no goal and no way, and it is not a plan.
//
// THE RULE. The candidates are the plan computers already built (`planSteps`'
// road and steps, `boardPlan.siegeOf`, `nextPlans.deriveNextPlanFacts`, the
// break `pawnBreak` reads). A candidate is said only when the engine's BEST
// line plays it: one of the mover's first four moves in that line moves the
// plan's piece, lands on its squares or hits its target. Of those, the one the
// line starts soonest wins (the best move itself starting it first); a tie
// goes to the more specific plan (a siege, a road, a weak pawn, an outpost,
// a passer, the worst piece, a break, the steps). Silent when the best line is
// a tactic (a check or a material gain in its first four plies: the tactic
// computers say it) or the position is decided (a mate, or three pawns).
//
// PURE: chess.js, the lines handed in and the plan computers. Dual use: the
// plan a read teaches is the plan a student's next moves can be checked
// against (its squares and its piece).
import { Chess, type Color, type Square } from 'chess.js';
import { planSteps, planStepsText, type PlanSteps } from './planSteps';
import { siegeOf } from './boardPlan';
import { deriveNextPlanFacts, type PlanKind } from './nextPlans';
import { pawnBreak } from './pawnBreak';
import { openSentence } from '../utils/openSentence';

export type BoardPlanKind = 'siege' | 'road' | 'kick' | PlanKind | 'break' | 'steps';

export interface BoardPlan {
  kind: BoardPlanKind;
  text: string;
  /** The squares the plan is about, coupled here (G4.5.1). */
  squares: string[];
  /** What the plan is aimed at (a pawn, a piece, a square), when it has one. */
  target: string | null;
  /** The mover's move in the best line that starts it (0 = the best move). */
  starts: number;
}

export interface PlanLineIn { moves: readonly string[]; evaluation: number; mate: number | null }

/** Three pawns, or a mate: the game is decided, conversion and tactics speak. */
const DECIDED_CP = 300;
/** A line that wins two pawns of material in its first plies is a tactic. */
const TACTIC_GAIN = 2;
/** How many plies of the best line a tactic is looked for in. */
const TACTIC_PLIES = 4;
/** How many of the mover's moves in the best line may start the plan. */
const SUPPORT_MOVES = 4;

/** The tie order: the more specific plan first. */
const ORDER: readonly BoardPlanKind[] = ['siege', 'road', 'kick', 'weak-pawn', 'outpost', 'passer', 'king-attack', 'worst-piece', 'open-file', 'bishop-pair', 'convert', 'break', 'steps'];

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function material(b: Chess, c: Color): number {
  let n = 0;
  for (const row of b.board()) for (const x of row) if (x) n += (x.color === c ? 1 : -1) * VALUE[x.type];
  return n;
}

interface MoverMove { idx: number; from: string; to: string; piece: string; san: string; hits: Set<string> }

/** The mover's first moves in the line, each with the squares its piece hits
 *  after it lands. */
function moverMoves(fen: string, line: readonly string[], mover: Color, max: number): MoverMove[] {
  const b = new Chess(fen);
  const out: MoverMove[] = [];
  for (const u of line) {
    if (out.length >= max) break;
    let mv;
    try { mv = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    if (mv.color !== mover) continue;
    const hits = new Set<string>();
    for (const f of 'abcdefgh') for (let r = 1; r <= 8; r += 1) {
      const sq = `${f}${r}` as Square;
      if (b.attackers(sq, mover).includes(mv.to)) hits.add(sq);
    }
    out.push({ idx: out.length, from: mv.from, to: mv.to, piece: mv.piece, san: mv.san, hits });
  }
  return out;
}

/** Is the line a tactic: a check first, or material won in its first plies? */
function isTactic(fen: string, line: readonly string[], mover: Color): boolean {
  const b = new Chess(fen);
  const start = material(b, mover);
  for (let i = 0; i < Math.min(TACTIC_PLIES, line.length); i += 1) {
    let mv;
    try { mv = b.move({ from: line[i].slice(0, 2), to: line[i].slice(2, 4), promotion: line[i][4] }); } catch { return false; }
    if (i === 0 && (mv.san.includes('+') || mv.san.includes('#'))) return true;
    // Read after the other side's answer (a capture taken straight back is a trade).
    if (i % 2 === 1 && material(b, mover) - start >= TACTIC_GAIN) return true;
  }
  return false;
}

/** The first of the mover's moves that plays the plan: moves its piece, lands
 *  on its squares, or hits its target. -1 when the line never does. */
function startsAt(moves: readonly MoverMove[], squares: readonly string[], target: string | null, piece: string | null): number {
  for (const m of moves) {
    if (piece && m.from === piece) return m.idx;
    if (squares.includes(m.to) && m.piece !== 'k') return m.idx;
    if (target && m.hits.has(target)) return m.idx;
  }
  return -1;
}

/** The plan's road and steps off the best line: the whole line, and the line
 *  cut before its first capture (a trade later in the line takes the road's
 *  piece off the board it is read on). */
function stepsPlan(fen: string, line: readonly string[]): PlanSteps | null {
  const first = line[0];
  if (!first) return null;
  let after: string;
  try { const c = new Chess(fen); c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] }); after = c.fen(); } catch { return null; }
  const whole = planSteps(after, line.slice(1), first, 3, true, true);
  if (whole?.maneuver) return whole;
  const b = new Chess(after);
  const cut: string[] = [];
  for (const u of line.slice(1)) {
    let mv;
    try { mv = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    if (mv.captured) break;
    cut.push(u);
  }
  // A capture that is no trade ends the quiet stretch: the plan is read up
  // to it (the bishop's road to g6 before the rook takes on a5).
  const shorter = cut.length < line.length - 1 ? planSteps(after, cut, first, 3, true, true) : null;
  if (shorter?.maneuver) return shorter;
  return whole ?? shorter;
}


/** Where the best line starts a structure plan, read by what the plan is:
 *  the weak pawn hit or its blockade square taken, the passer pushed, the
 *  outpost occupied, the worst piece moved. The plans that name no target
 *  (seize a file, use the bishop pair, convert) are a direction, never a
 *  plan the line can prove, so they are not candidates. */
function structureStarts(kind: PlanKind, squares: readonly string[], moves: readonly MoverMove[], board: Chess): number {
  const [a, b] = squares;
  if (!a) return -1;
  // A pawn of their king's cover is the attack's, never "a weak pawn to fix
  // and win" ("plant your knight on f6 so f7 can never advance").
  const shield = kind === 'weak-pawn' && inKingShield(board, a);
  for (const m of moves) {
    // The pawn hit, or its blockade square taken by a minor piece (the
    // blockader the plan names; a queen there is the attack's).
    if (kind === 'weak-pawn' && !shield && (m.hits.has(a) || (b && m.to === b && (m.piece === 'n' || m.piece === 'b')))) return m.idx;
    if (kind === 'passer' && m.from === a) return m.idx;
    if (kind === 'outpost' && squares.includes(m.to) && (m.piece === 'n' || m.piece === 'b')) return m.idx;
    if (kind === 'worst-piece' && m.from === a) return m.idx;
  }
  return -1;
}

/** A structure plan's goal and its first way ("…win their weak pawn on c2.
 *  Here's how: control c3, the square in front of it, so it can never
 *  advance."): the count and the later steps are the plan's detail, said when
 *  the student asks for the plan. */
function goalAndWay(text: string): string {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, 2).join('').trim();
}

/** Is the pawn on `sq` part of its own king's cover: on the king's file or
 *  beside it, within two ranks in front of it? */
function inKingShield(board: Chess, sq: string): boolean {
  const p = board.get(sq as Square);
  if (!p || p.type !== 'p') return false;
  const k = board.findPiece({ type: 'k', color: p.color })[0];
  if (!k) return false;
  const ahead = (Number(sq[1]) - Number(k[1])) * (p.color === 'w' ? 1 : -1);
  return Math.abs(sq.charCodeAt(0) - k.charCodeAt(0)) <= 1 && ahead >= 0 && ahead <= 2;
}

/** The break read as the plan it builds to, one idea a sentence: "Your plan
 *  builds to h5: it attacks their pawn on g6. If they take, it half-opens the
 *  h-file…" — the break's own words (`pawnBreak`), its lead turned from "h5
 *  is a pawn break" into where the plan goes. */
export function breakPlanText(breakText: string, whose: 'your' | 'their'): string {
  const lead = `${whose === 'your' ? 'Your' : 'Their'} plan builds to`;
  const a = breakText.match(/^(\S+) is a pawn break: it (.*)$/s);
  if (a) return `${lead} ${a[1]}: it ${a[2]}`;
  const b = breakText.match(/^A pawn break: (\S+) (.*)$/s);
  if (b) return `${lead} ${b[1]}: it ${b[2]}`;
  const c = breakText.match(/^(\S+) is a pawn break(.*?), and it (.*)$/s);
  if (c) return `${lead} ${c[1]}${c[2]}, which ${c[3]}`;
  const d = breakText.match(/^(\S+) is a pawn break(.*)$/s);
  if (d) return `${lead} ${d[1]}${d[2]}`;
  return `${lead} a pawn break. ${breakText}`;
}

const NOUN: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** THE PAWN THAT KICKS A PIECE (Danya, the knockout blow #2: "the quiet pawn
 *  advance b4 (then b5) to dislodge the c6 knight"): a quiet push in the best
 *  line, after the best move, that attacks a piece of theirs and stands safe
 *  there (no more of theirs hit it than guard it). */
function kickOf(fen: string, line: readonly string[], mover: Color, whose: 'your' | 'their'): BoardPlan | null {
  const now = new Chess(fen);
  const b = new Chess(fen);
  const them: Color = mover === 'w' ? 'b' : 'w';
  /** Each pawn's pushes in the line, keyed by where it stands now. */
  const marches = new Map<string, string[]>();
  let n = 0;
  for (const u of line) {
    if (n >= SUPPORT_MOVES) break;
    let mv;
    try { mv = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    if (mv.color !== mover) continue;
    n += 1;
    if (mv.piece !== 'p' || mv.captured || mv.san.includes('+')) continue;
    const pushes = [...(marches.get(mv.from) ?? []), mv.san];
    marches.delete(mv.from);
    marches.set(mv.to, pushes);
    // The best move's own push is the best move's to say.
    if (n === 1) continue;
    const f = mv.to.charCodeAt(0); const r = Number(mv.to[1]) + (mover === 'w' ? 1 : -1);
    for (const df of [-1, 1]) {
      const sq = `${String.fromCharCode(f + df)}${r}` as Square;
      if (!/^[a-h][1-8]$/.test(sq)) continue;
      const p = b.get(sq);
      if (!p || p.color !== them || !NOUN[p.type]) continue;
      // The piece kicked stands there NOW: a piece the line only brings is not
      // on the board the student is looking at.
      const was = now.get(sq);
      if (!was || was.color !== them || was.type !== p.type) continue;
      if (b.attackers(mv.to, them).length > b.attackers(mv.to, mover).length) continue;
      const owner = whose === 'your' ? 'their' : 'your';
      const steps = pushes.length >= 2 ? `${pushes.slice(0, -1).join(', ')} and then ${pushes.at(-1)}` : mv.san;
      return { kind: 'kick', text: `The plan: ${steps}, to kick ${owner} ${NOUN[p.type]} off ${sq}.`, squares: [mv.to, sq], target: sq, starts: n - pushes.length };
    }
  }
  return null;
}

export interface PlanOfTheBoardIn {
  fen: string;
  /** The engine's lines on this board, best first (White's seat scores). */
  lines: readonly PlanLineIn[];
  student: Color;
  /** REQUIRED: may the plan name a move the student is still to find (Learn's
   *  live board holds it)? A road and a break name moves. */
  namesMoves: boolean;
}

/** THE ONE PLAN of this board for the side to move, or null. */
export function planOfTheBoard(i: PlanOfTheBoardIn): BoardPlan | null {
  const top = i.lines[0];
  if (!top || top.moves.length === 0) return null;
  if (top.mate != null || Math.abs(top.evaluation) >= DECIDED_CP) return null;
  let board: Chess;
  try { board = new Chess(i.fen); } catch { return null; }
  const mover = board.turn();
  const mine = mover === i.student;
  // A plan of the student's names moves they are still to find; theirs is
  // said whatever the surface.
  const names = i.namesMoves || !mine;
  if (isTactic(i.fen, top.moves, mover)) return null;
  const whose = mine ? 'your' : 'their';
  const moves = moverMoves(i.fen, top.moves, mover, SUPPORT_MOVES);
  const out: BoardPlan[] = [];

  const siege = siegeOf(i.fen, [top], whose);
  if (siege) out.push({ kind: 'siege', text: siege.text, squares: siege.squares, target: siege.squares[0] ?? null, starts: 0 });

  const st = stepsPlan(i.fen, top.moves);
  if (st && names) {
    const kind: BoardPlanKind = st.maneuver ? 'road' : 'steps';
    // Steps tied by nothing but a list are moves, not a plan.
    if (st.maneuver || st.aim) {
      const piece = st.maneuver?.from ?? null;
      const s = startsAt(moves, st.squares, st.aim, piece);
      if (s >= 0) out.push({ kind, text: planStepsText(st, whose), squares: st.squares, target: st.aim, starts: s });
    }
  }

  // The plans the structure earns, written to the student: theirs is not
  // re-seated, so the student's own board only.
  if (mine) {
    const sign = i.student === 'w' ? 1 : -1;
    for (const p of deriveNextPlanFacts(i.fen, mover, { namesStudentMoves: i.namesMoves, studentPovCp: top.evaluation * sign })) {
      const s = structureStarts(p.kind, p.squares, moves, board);
      if (s < 0) continue;
      out.push({ kind: p.kind, text: goalAndWay(openSentence(p.text)), squares: p.squares, target: p.squares[0] ?? null, starts: s });
    }
  }

  if (names) {
    const k = kickOf(i.fen, top.moves, mover, whose);
    if (k) out.push(k);
  }

  // THE BREAK the line builds to, a move or more from now (the best move's own
  // break is said by the best move).
  if (names) {
    const b = new Chess(i.fen);
    let lastTo: string | null = null;
    let moverCount = 0;
    for (const u of top.moves) {
      if (moverCount >= SUPPORT_MOVES) break;
      const before = b.fen();
      let mv;
      try { mv = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
      if (mv.color === mover) {
        if (moverCount > 0 && mv.piece === 'p') {
          const pb = pawnBreak(before, mv.san, whose, lastTo, true);
          if (pb) {
            out.push({ kind: 'break', text: breakPlanText(pb.text, whose), squares: pb.squares, target: pb.squares[1] ?? null, starts: moverCount });
            break;
          }
        }
        moverCount += 1;
      }
      lastTo = mv.to;
    }
  }

  if (out.length === 0) return null;
  out.sort((a, b) => a.starts - b.starts || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return out[0];
}
