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
// HIS FLOW (David 2026-11-19: "identify the steps Danya goes through to
// formulate a plan and then build the computer around that flow"). Read off
// 66 of his written plan moments (the ideas of each board in the order he
// says them) and 250 live ones (scratchpad planflow/flow.md):
//   0. IS THERE A PLAN AT ALL — a tactic first, or a decided game, and he
//      plans nothing (10 of 66 boards say the tactic first; his decided
//      boards' "plans" are habits);
//   1. who stands better (said before the plan on 34 of 66: the read's own
//      verdict step says it, never this computer);
//   2. WHAT THE BOARD TURNS ON — their weak pawn (14), what they want (14),
//      the structure (9), the worst piece ("the passive queen on e2 — improve
//      it"); said right before the plan;
//   3. THE PLAN, a goal and a way (said 2nd or 3rd on 46 of 66);
//   4. the route's detail and what to stop on the way (after it, 13);
//   and the check that it works is the engine's best line, the plan's proof.
// So the plan is read the way he forms it: step 0 the gate, step 2 the reason
// (`PlanReason`, one table `REASONS` in his order of need), step 3 the plan,
// and the best line the check. Each step is a computer's, never a guess:
//   - the board's target (`opponentTargets`, the one weak-pawn computer): the
//     plan aimed at it wins at the same move. The read's own target step says
//     the pawn and why it is weak, so the plan does not say it again;
//   - the road's piece is the side's one worst piece (`findWorstPlacedPiece`):
//     "Your knight on a5 is stuck on the rim. It has a better road …";
//   - the structure sends the play to a wing (`structureSignature`'s locked
//     centre, for a wing break): "The centre is locked, so the play goes to
//     the queenside.";
//   - what they want: their break the best move takes away (`breakStopped`):
//     "They want the …c5 break, so take it away first."
// A reason is said one sentence before the plan, and the plan then says its
// piece as "it" (the full name once). No reason proven, the plan alone. At the
// same move a plan with a proven reason beats one without (his plans come
// from what the board turns on).
//
// PURE: chess.js, the lines handed in and the plan computers. Dual use: the
// plan a read teaches is the plan a student's next moves can be checked
// against (its squares and its piece).
import { Chess, type Color, type Square } from 'chess.js';
import { planSteps, type PlanSteps } from './planSteps';
import { siegeOf } from './boardPlan';
import { deriveNextPlanFacts, findWorstPlacedPiece, structurePlanFact, worstReason, type PlanKind } from './nextPlans';
import { pawnBreak } from './pawnBreak';
import { openSentence } from '../utils/openSentence';
import { sideMaterial } from './pieceValues';
import { structureSignature } from './boardStructure';
import { opponentTargets } from './targetSelector';
import { breakStopped } from './breakTiming';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { isUndevelopedInOpening } from '../utils/undeveloped';

export type BoardPlanKind = 'siege' | 'road' | 'kick' | PlanKind | 'break' | 'steps';

/** The step of his flow that leads to the plan (step 2 above). */
export type PlanReasonStep = 'target' | 'their-idea' | 'worst-piece' | 'structure';

export interface PlanReason {
  step: PlanReasonStep;
  /** The step said before the plan, or null when the read says it as its own
   *  step (the board's target, `targetLine`) and the plan only follows it. */
  text: string | null;
  squares: string[];
  /** The say-once claims of the computer that proved the step, when its own
   *  fact says the same thing (their break stopped: `breakStopped`'s). */
  claims?: string[];
}

export interface BoardPlan {
  kind: BoardPlanKind;
  /** The read in his order: the step that led to the plan, then the plan. */
  text: string;
  /** The step that led to it, when a computer proved one. */
  why: PlanReason | null;
  /** The plan's own sentence (the goal and the way). */
  planText: string;
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

/** The mover's material lead on the board (the one side-material sum). */
function material(b: Chess, c: Color): number {
  const fen = b.fen();
  return sideMaterial(fen, c) - sideMaterial(fen, c === 'w' ? 'b' : 'w');
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
function kickOf(fen: string, line: readonly string[], mover: Color, whose: 'your' | 'their'): Cand | null {
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
      const steps = pushes.length >= 2 ? `${pushes[0]}, then ${pushes.at(-1)}` : mv.san;
      return { kind: 'kick', text: `${whose === 'your' ? 'Your' : 'Their'} plan is to kick ${owner} ${NOUN[p.type]} off ${sq}. The ${mv.to[0]}-pawn does it: ${steps}.`, squares: [mv.to, sq], target: sq, starts: n - pushes.length };
    }
  }
  return null;
}

/** A road or a list of steps said the way a person says it: one idea a
 *  sentence, never three squares in one (the human-squares rule) — the piece
 *  and its first stop, then where it ends and what it hits there; a list of
 *  steps is what they line up on, then the step that starts it. */
export function stepsText(p: PlanSteps, whose: 'your' | 'their', fromTheMove: boolean): string {
  const Who = whose === 'your' ? 'Your' : 'Their';
  const owner = whose === 'your' ? 'their' : 'your';
  const aimed = p.aim ? (p.aimPiece ? `${owner} ${p.aimPiece} on ${p.aim}` : `${p.aim}, next to ${owner} king`) : null;
  // A ROAD THE SHOWN MOVE STARTS goes on from where the move lands: the move
  // is said by its own facts, so the road is said from there, never as "the
  // knight on f1 has a better road" beside "Ng3 heads for their king".
  if (p.maneuver && fromTheMove && p.maneuver.route.length >= 2) {
    const m = p.maneuver;
    const rest = m.route.slice(1);
    const end = rest[rest.length - 1];
    const next = rest.length === 1 ? `Next, the ${m.piece} goes on to ${end}.` : `Next, the ${m.piece} goes on to ${rest[0]}. It ends on ${end}.`;
    return aimed ? `${next} There it lines up on ${aimed}.` : next;
  }
  if (p.maneuver) {
    const m = p.maneuver;
    const end = m.route[m.route.length - 1];
    const lead = m.route.length === 1 ? `${Who} ${m.piece} on ${m.from} has a better square: ${end}.`
      : `${Who} ${m.piece} on ${m.from} has a better road, by way of ${m.route[0]}.`;
    const ends = m.route.length === 1 ? '' : aimed ? ` It ends on ${end}, lined up on ${aimed}.` : ` It ends on ${end}.`;
    return `${lead}${m.route.length === 1 && aimed ? ` There it lines up on ${aimed}.` : ends}`;
  }
  const first = p.steps[0];
  const start = first.castle ? 'castling' : first.brk ? `the ${first.san} break` : first.san;
  return `${Who} pieces line up on ${aimed ?? 'one target'}. It starts with ${start}.`;
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
  const out: Cand[] = [];

  const siege = siegeOf(i.fen, [top], whose);
  if (siege) out.push({ kind: 'siege', text: siege.text, squares: siege.squares, target: siege.squares[0] ?? null, starts: 0 });

  const st = stepsPlan(i.fen, top.moves);
  if (st && names) {
    const kind: BoardPlanKind = st.maneuver ? 'road' : 'steps';
    // Steps tied by nothing but a list are moves, not a plan.
    if (st.maneuver || st.aim) {
      const piece = st.maneuver?.from ?? null;
      const s = startsAt(moves, st.squares, st.aim, piece);
      const fromTheMove = s === 0 && !!st.maneuver && st.maneuver.from === top.moves[0].slice(0, 2);
      if (s >= 0) out.push({ kind, text: stepsText(st, whose, fromTheMove), squares: st.squares, target: st.aim, starts: s,
        ...(st.maneuver ? { road: { from: st.maneuver.from, piece: st.maneuver.piece, end: st.maneuver.route[st.maneuver.route.length - 1], fromTheMove } } : {}) });
    }
  }

  // A ROAD JUDGED BY WHAT IT HITS AT ITS END, its steps spread through the
  // line (Danya: "the bishop via f7-g6 adds pressure on the seventh", "Rd7-f7
  // toward f2" with king moves between the rook's steps).
  if (names) {
    const far = attackRoadOf(i.fen, top.moves, mover, whose);
    if (far) out.push(far);
  }

  // The plans the structure earns, written to the student: theirs is not
  // re-seated, so the student's own board only.
  if (mine) {
    const sign = i.student === 'w' ? 1 : -1;
    // A passer that cannot run is no plan to push: their runner queens first,
    // a piece stops it, or their king takes it (`structurePlanFact` reads the
    // race). Danya, pawn endgames #2: "the instinctive push of the c-pawn is
    // wrong — stop the g-pawn first".
    const trump = structurePlanFact(i.fen, mover)?.id ?? '';
    const passerRuns = !/^(passer-race:them|passer-stopped|passer-caught|passer-blockaded)/.test(trump);
    for (const p of deriveNextPlanFacts(i.fen, mover, { namesStudentMoves: i.namesMoves, studentPovCp: top.evaluation * sign })) {
      if (p.kind === 'passer' && !passerRuns) continue;
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
  // STEP 2 of his flow: the step that led to each plan, proven by its computer.
  let target: string | null | undefined;
  const boardTarget = (): string | null => (target === undefined ? (target = opponentTargets(i.fen, mover)[0]?.square ?? null) : target);
  const reasons = out.map((c) => reasonOf(i.fen, board, c, top.moves, mover, whose, names, boardTarget));
  const order = out.map((c, k) => ({ c, r: reasons[k] }));
  // The line starts it soonest; at the same move, a plan whose reason the
  // board proves (his plans come from what the board turns on), then the more
  // specific plan.
  // A siege says its own reason ("it is isolated, so no pawn can ever guard
  // it — pieces have to").
  const reasoned = (x: { c: Cand; r: PlanReason | null }): boolean => !!x.r || x.c.kind === 'siege';
  order.sort((a, b) => a.c.starts - b.c.starts || Number(!reasoned(a)) - Number(!reasoned(b)) || ORDER.indexOf(a.c.kind) - ORDER.indexOf(b.c.kind));
  const { c, r } = order[0];
  const planText = r?.text ? referBack(c.text, r) : c.text;
  return { kind: c.kind, text: r?.text ? `${r.text} ${planText}` : planText, why: r, planText,
    squares: [...new Set([...(r?.squares ?? []), ...c.squares])], target: c.target, starts: c.starts };
}

/** A plan candidate, before its reason is read. */
interface Cand {
  kind: BoardPlanKind;
  text: string;
  squares: string[];
  target: string | null;
  starts: number;
  /** A road's piece: where it stands, its name, and whether the best move is
   *  its first step. */
  road?: { from: string; piece: string; end: string; fromTheMove: boolean };
}

const PIECE_WORD: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

interface ReasonIn { fen: string; board: Chess; c: Cand; line: readonly string[]; mover: Color; whose: 'your' | 'their'; names: boolean;
  /** The board's target, read once for every candidate. */
  boardTarget: () => string | null }

/** STEP 2 — what the board turns on, the step that led to this plan, each
 *  read by its computer. One table, so a new step must say how it is proven. */
const REASONS: Record<PlanReasonStep, (r: ReasonIn) => PlanReason | null> = {
  'worst-piece': ({ board, c, mover, whose }) => worstPieceReason(board, c, mover, whose),
  target: ({ c, boardTarget }) => targetReason(c, boardTarget()),
  structure: ({ fen, c }) => structureReason(fen, c),
  // What they want is the reason only for a plan the best move itself
  // starts: the move that takes their break away is the plan's first step.
  'their-idea': ({ fen, c, line, mover, whose, names }) => (c.starts === 0 && names ? theirIdeaReason(fen, line, mover, whose) : null),
};
/** The plan's own object first (its piece, its target, the structure it
 *  plays on); what they want when the plan names none of those. */
const REASON_ORDER: readonly PlanReasonStep[] = ['worst-piece', 'target', 'structure', 'their-idea'];

function reasonOf(fen: string, board: Chess, c: Cand, line: readonly string[], mover: Color, whose: 'your' | 'their', names: boolean, boardTarget: () => string | null): PlanReason | null {
  for (const step of REASON_ORDER) {
    const r = REASONS[step]({ fen, board, c, line, mover, whose, names, boardTarget });
    if (r) return r;
  }
  return null;
}

/** The road's piece is the side's ONE worst piece (`findWorstPlacedPiece`):
 *  "Your knight on a5 is stuck on the rim." */
function worstPieceReason(board: Chess, c: Cand, mover: Color, whose: 'your' | 'their'): PlanReason | null {
  if (c.kind !== 'road' || !c.road) return null;
  const w = findWorstPlacedPiece(board, mover);
  if (!w || w.sq !== c.road.from) return null;
  // A rook off its open file leads only a road that ends on that file ("still
  // off the open e-file" before a road to d5 says two things that disagree).
  if (w.kind === 'no-file-rook' && c.road.end[0] !== w.file) return null;
  const Who = whose === 'your' ? 'Your' : 'Their';
  // One claim with the worst piece's own fact (`pieceWish`).
  return { step: 'worst-piece', text: `${Who} ${PIECE_WORD[w.type]} on ${w.sq} ${worstReason(w)}.`, squares: [w.sq], claims: [`wish:${w.sq}`] };
}

/** The plan aims at THE BOARD'S TARGET — the weak pawn of theirs the one
 *  target computer names first (`opponentTargets`: isolated, backward or
 *  left behind, ranked by the count on it). The read's own target step says
 *  that pawn and why it is weak (`targetLine`), so here the step only decides
 *  the plan; the plan's sentence names the pawn it goes after. A kick's
 *  target is a piece. */
function targetReason(c: Cand, t: string | null): PlanReason | null {
  if (c.kind === 'kick' || !t || !(c.target === t || c.squares.includes(t))) return null;
  return { step: 'target', text: null, squares: [t] };
}

/** THE STRUCTURE sends the play to a wing: a break on a wing file while the
 *  centre is locked (two central files locked head to head,
 *  `structureSignature`) — "the centre is closed, so the play is on the
 *  wings". */
function structureReason(fen: string, c: Cand): PlanReason | null {
  if (c.kind !== 'break' || !c.squares[0]) return null;
  const f = c.squares[0][0];
  if (!'abgh'.includes(f)) return null;
  if (!structureSignature(fen)?.lockedCenter) return null;
  const wing = f <= 'd' ? 'queenside' : 'kingside';
  return { step: 'structure', squares: [], text: rotateStem([
    `The centre is locked, so the play goes to the ${wing}.`,
    `With the centre locked, the fight is on the ${wing}.`,
  ], stemKeyOf(`${fen}|plan-structure`)) };
}

/** WHAT THEY WANT — their break that the best move takes away (the one
 *  computer of a stopped break, `breakStopped`: a break with a reason, safe
 *  before the move, illegal or losing its pawn after it). */
function theirIdeaReason(fen: string, line: readonly string[], mover: Color, whose: 'your' | 'their'): PlanReason | null {
  const best = line[0];
  if (!best) return null;
  let san: string;
  try { san = new Chess(fen).move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }).san; } catch { return null; }
  const x = breakStopped(fen, san);
  if (!x) return null;
  const brk = `${mover === 'w' ? '…' : ''}${x.brk.san}`;
  const text = whose === 'your'
    ? rotateStem([`They want the ${brk} break, so take it away first.`, `Their idea is the ${brk} break. Take it away first.`], stemKeyOf(`${fen}|their-idea|${x.brk.san}`))
    : `You want the ${brk} break, so they take it away first.`;
  return { step: 'their-idea', text, squares: [x.brk.to], claims: [x.key, `stops-break:${brk}`] };
}

/** The plan's sentence after its reason: the reason's object said once in full,
 *  then "that pawn" / "it" (the human-voice rule 3). */
function referBack(text: string, r: PlanReason): string {
  if (r.step === 'worst-piece') {
    return text
      .replace(/^(Your|Their) (knight|bishop|rook|queen) on [a-h][1-8] has/, 'It has')
      .replace(/^Next, the (knight|bishop|rook|queen) goes on/, 'Next, it goes on');
  }
  return text;
}

/** How many of the mover's moves in the best line a spread-out road may use. */
const ROAD_MOVES = 5;

const ALL_SQUARES: Square[] = [];
for (const f of 'abcdefgh') for (let r = 1; r <= 8; r += 1) ALL_SQUARES.push(`${f}${r}` as Square);

/** The squares next to the king of `c` on `b`. */
function kingZone(b: Chess, c: Color): Square[] {
  const k = b.findPiece({ type: 'k', color: c })[0];
  if (!k) return [];
  return ALL_SQUARES.filter((s) => s !== k && Math.abs(s.charCodeAt(0) - k.charCodeAt(0)) <= 1 && Math.abs(Number(s[1]) - Number(k[1])) <= 1);
}

/** The square a slider on `from` reaches along one line THROUGH exactly one
 *  piece of `them` (the x-ray: the rook on f7 "toward f2" past the knight on
 *  f3), when that square is one of `goal`; with the piece it looks through. */
function xrayAt(b: Chess, from: Square, type: string, them: Color, goal: readonly Square[]): { sq: Square; through: Square } | null {
  const dirs = type === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : type === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
    : type === 'q' ? [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]] : [];
  const f0 = from.charCodeAt(0) - 97; const r0 = Number(from[1]) - 1;
  for (const [df, dr] of dirs) {
    let through: Square | null = null;
    for (let k = 1; k < 8; k += 1) {
      const f = f0 + df * k; const r = r0 + dr * k;
      if (f < 0 || f > 7 || r < 0 || r > 7) break;
      const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
      if (through && goal.includes(sq)) return { sq, through };
      const p = b.get(sq);
      if (!p) continue;
      if (through || p.color !== them || p.type === 'k') break;
      through = sq;
    }
  }
  return null;
}

/** Can a piece of `type` and `c` on `at` reach `to` in one move on `b` (the
 *  piece itself taken off `start`)? */
function reachesInOne(b: Chess, start: Square, at: Square, to: Square, type: string, c: Color): boolean {
  try {
    const x = new Chess(b.fen());
    x.remove(start);
    if (x.get(at)) return false;
    x.put({ type: type as 'n', color: c }, at);
    const parts = x.fen().split(' '); parts[1] = c; parts[3] = '-';
    return new Chess(parts.join(' '), { skipValidation: true }).moves({ square: at, verbose: true }).some((m) => m.to === to);
  } catch { return false; }
}

/** A ROAD JUDGED BY WHAT IT ATTACKS AT ITS END. One piece's steps in the best
 *  line, the mover's first five moves, spread out (other moves between them),
 *  nothing captured and no check before its last step; a road that goes
 *  somewhere (no square twice, no stop it could skip, every stop empty now);
 *  safe where it ends. It is a plan when the end gives the piece a job it does
 *  not have now: a square next to their king (hit, or looked at through one
 *  piece of theirs down a line), or the board's target pawn. Beside our rooks
 *  on their second rank the job is joining them (Danya, rooks on the seventh
 *  revisited #2: "the bishop via f7-g6, to add pressure on the seventh and
 *  make mate real"). */
function attackRoadOf(fen: string, line: readonly string[], mover: Color, whose: 'your' | 'their'): Cand | null {
  const now = new Chess(fen);
  const them: Color = mover === 'w' ? 'b' : 'w';
  const b = new Chess(fen);
  /** Each moved piece's road, by the square it stands on in the line. */
  const roads = new Map<string, { from: Square; type: string; route: Square[]; first: number; stops: Chess[] }>();
  let n = 0;
  let best: { from: Square; type: string; route: Square[]; first: number; stops: Chess[] } | null = null;
  for (const u of line) {
    if (n >= ROAD_MOVES) break;
    let mv;
    try { mv = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    if (mv.captured || mv.san.includes('+') || mv.san.includes('#')) break;
    if (mv.color !== mover) continue;
    n += 1;
    if (mv.piece === 'p' || mv.piece === 'k' || mv.san.startsWith('O-O')) continue;
    const r = roads.get(mv.from) ?? { from: mv.from, type: mv.piece, route: [], first: n - 1, stops: [] };
    roads.delete(mv.from);
    r.route.push(mv.to);
    r.stops.push(new Chess(b.fen()));
    roads.set(mv.to, r);
    // The longest road so far ends here; a later step of the same piece
    // extends it.
    if (r.route.length >= 2 && (!best || r.route.length >= best.route.length)) best = { ...r, route: [...r.route], stops: [...r.stops] };
  }
  if (!best) return null;
  const { from, type, route, first, stops } = best;
  const end = stops[stops.length - 1];
  const last = route[route.length - 1];
  // Three stops at most: a longer road names more squares than a person says.
  if (route.length > 3) return null;
  const walked = [from, ...route];
  if (new Set(walked).size !== walked.length) return null;
  const own = now.get(from);
  if (!own || own.color !== mover || own.type !== type) return null;
  if (isUndevelopedInOpening(fen, mover, type, from)) return null;
  // Every stop is empty on the board now (a road onto a square its own piece
  // holds is said against a board the student is not looking at).
  if (route.some((sq) => now.get(sq))) return null;
  // A stop it could skip is the engine waiting, not a piece travelling.
  for (let a = 0; a + 2 < walked.length; a += 1) {
    for (let z = a + 2; z < walked.length; z += 1) if (reachesInOne(now, from, walked[a], walked[z], type, mover)) return null;
  }
  // Safe where it ends: no pawn hits it, and it is hit no more often than guarded.
  const hitBy = end.attackers(last, them);
  if (hitBy.some((s) => end.get(s)?.type === 'p')) return null;
  if (hitBy.length > end.attackers(last, mover).length) return null;
  const hits = (bd: Chess, at: Square, sq: Square): boolean => bd.attackers(sq, mover).includes(at);
  const Who = whose === 'your' ? 'Your' : 'Their';
  const owner = whose === 'your' ? 'their' : 'your';
  const lead = `${Who} ${NOUN[type]} on ${from} has a better road, by way of ${route[0]}.`;
  // The job is the END's: a stop before it that already has it makes the
  // road the shorter one (the rook on b4 already hits c4 before a4).
  const earlier = stops.slice(0, -1).map((bd, k) => ({ bd, sq: route[k] }));
  const via = route.length === 3 ? ` It goes on by ${route[1]}.` : '';
  // THE KING'S SQUARES: hit from the end, and not from where it stands now.
  const zoneEnd = kingZone(end, them);
  const zoneNow = kingZone(now, them);
  const newHit = zoneEnd.find((sq) => hits(end, last, sq) && !(zoneNow.includes(sq) && hits(now, from, sq))
    && !earlier.some((e) => kingZone(e.bd, them).includes(sq) && hits(e.bd, e.sq, sq)));
  const key = stemKeyOf(`${fen}|attack-road|${from}`);
  if (newHit) {
    // Their second rank, where our rooks already stand.
    const second = them === 'b' ? '7' : '2';
    const rooks = end.findPiece({ type: 'r', color: mover }).filter((s) => s[1] === second && s !== last);
    const join = newHit[1] === second && rooks.length > 0
      ? ` On ${last} it joins ${whose} rook${rooks.length > 1 ? 's' : ''} on the ${second === '7' ? 'seventh' : 'second'} rank. It hits ${newHit}, next to ${owner} king.`
      : rotateStem([` On ${last} it hits ${newHit}, next to ${owner} king.`, ` From ${last} it hits ${newHit}, right next to ${owner} king.`], key);
    return { kind: 'road', text: `${lead}${via}${join}`, squares: [from, ...route, newHit], target: newHit, starts: first,
      road: { from, piece: NOUN[type], end: last, fromTheMove: false } };
  }
  // Looked at down a line through one piece of theirs.
  const xNow = xrayAt(now, from, type, them, zoneNow);
  const x = xNow || earlier.some((e) => xrayAt(e.bd, e.sq, type, them, kingZone(e.bd, them))) ? null : xrayAt(end, last, type, them, zoneEnd);
  if (x) {
    const fileOrDiag = x.sq[0] === last[0] ? `down the ${last[0]}-file ` : '';
    const text = `${lead}${via} On ${last} it aims ${fileOrDiag}at ${x.sq}, next to ${owner} king.`;
    return { kind: 'road', text, squares: [from, ...route, x.sq], target: x.sq, starts: first,
      road: { from, piece: NOUN[type], end: last, fromTheMove: false } };
  }
  // The board's target pawn.
  const t = opponentTargets(fen, mover)[0]?.square as Square | undefined;
  if (t && hits(end, last, t) && !hits(now, from, t) && !earlier.some((e) => hits(e.bd, e.sq, t))) {
    return { kind: 'road', text: `${lead}${via} On ${last} it hits ${owner} pawn on ${t}.`, squares: [from, ...route, t], target: t, starts: first,
      road: { from, piece: NOUN[type], end: last, fromTheMove: false } };
  }
  return null;
}
