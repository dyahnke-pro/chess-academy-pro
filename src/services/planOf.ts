// THE PLAN COMPUTER (Coach Build Board, plan rounds 1–3): the board's plans,
// ranked by EVIDENCE, and only the strongest said.
//
// Candidates, each with its evidence:
//   line       — the plan the engine's best line starts (`planOfTheBoard`):
//                the strongest evidence there is;
//   structure  — a plan the pawns earn (`structureOf`), kept only when one of
//                the engine's lines plays its key move (or its first step)
//                among the mover's first three moves: its evidence falls with
//                that line's distance from the best. A concept plan no line
//                plays is dropped;
//   masters    — the break the master games from here play (`mastersPlanRead`),
//                its evidence the share of games — unless the engine's line
//                that starts with it is clearly worse (refuted).
// Every first move is PRICED for its side: the mover's from `lines`, the other
// side's from the pass read (`passLines`, the board with the other side to
// move) when the surface has one — so "their plan" is never a guess.
// Round 3: ONLY THE BEST-SUPPORTED PLAN is said (the second plan guessed: 41%
// of said plans matched a source). A plan with no pawn move (two weaknesses,
// regroup, the king's own blocker, the isolani, the square) is evidenced by a
// near-best line whose mover's first moves play it — a piece onto or at its
// squares, the blocker moved or the king castled, only piece moves for the
// regroup. Down two pawns or more with no forcing move in the best line, the
// plan is PASSIVE DEFENCE. A passer race the other side wins (`planRace`)
// takes the mover's own push off the list: the plan is to stop theirs.
// A plan whose first step is 50–100 cp off the best, played by a near-best
// line later, is a PLAN FOR LATER. PURE: no engine — the reads come in.
import { Chess, type Color, type Square } from 'chess.js';
import type { AnalysisLine } from '../types';
import { planOfTheBoard, type BoardPlan } from './planOfTheBoard';
import { structureOf, type StructurePlanRead } from './structureOf';
import { mastersPlanRead, type MovesAt } from './mastersPlanRead';
import { mastersBreakPlanWords, structurePlanWords } from './teachingSentence';
import { stemKeyOf } from '../utils/rotateStem';
import { detectPlanRace } from './planRace';

/** How far down a line the mover's key move may come and still count. */
const KEY_WITHIN_MOVES = 3;
/** A line more than this far off the best is no evidence for its plan. */
const EVIDENCE_GAP_CP = 100;
/** Down this much (mover POV) with nothing forcing in the best line: defend. */
const PASSIVE_DEFENCE_CP = -200;
/** A first step this far off the best is a plan for later, not for now. */
const LATER_MIN_CP = 50;
const LATER_MAX_CP = 100;
/** A masters break the engine's own line scores this much worse is refuted. */
const REFUTED_CP = 150;

export type PlanSource = 'line' | 'structure' | 'masters';

export interface PlanCandidate {
  source: PlanSource;
  side: Color;
  text: string;
  squares: string[];
  target: string | null;
  /** One claim per plan: the side, the kind and its key square. */
  claim: string;
  /** 0..1 — what the engine's lines (or the games) say for it. */
  evidence: number;
  /** The structure read behind it, when there is one. */
  structure?: StructurePlanRead;
  /** The engine-line plan behind it, when it is the line's. */
  board?: BoardPlan;
}

export interface PlanOfIn {
  fen: string;
  lines: readonly AnalysisLine[];
  student: Color;
  /** The student's own moves may be named (false in Learn). */
  namesMoves: boolean;
  /** The masters' moves at a board, when the surface has the book. */
  movesAt?: MovesAt | null;
  /** The pass read: lines on this board with the OTHER side to move. */
  passLines?: readonly AnalysisLine[] | null;
}

export interface PlanOfOut {
  /** The plan said for the side to move: the best-supported one only. */
  mover: PlanCandidate[];
  /** The other side's top plan, when its evidence is in (pass read or games). */
  other: PlanCandidate | null;
  /** A plan for later of the side to move, when one stands. */
  later: PlanCandidate | null;
}

const flip = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** The mover-POV score of a line (mate as a big number). */
function scoreOf(l: AnalysisLine, mover: Color): number {
  const s = mover === 'w' ? 1 : -1;
  if (l.mate != null) return (l.mate * s > 0 ? 100_000 : -100_000);
  return l.evaluation * s;
}

/** The mover's moves of a line, in order (every other ply from the start). */
function moverUcis(l: AnalysisLine): string[] {
  return l.moves.filter((_, i) => i % 2 === 0).slice(0, KEY_WITHIN_MOVES).map((u) => u.slice(0, 4));
}

/** A pawn's road, from its square to its goal on the same file: every push of
 *  that pawn along it plays the plan (b4 then b5 is the b-pawn to b5). */
interface Road { from: string; to: string }
function onRoad(u: string, r: Road): boolean {
  if (u.slice(0, 2) === r.from && u.slice(2, 4) === r.to) return true;
  if (r.from[0] !== r.to[0] || u[0] !== r.from[0] || u[2] !== r.from[0]) return false;
  const lo = Math.min(Number(r.from[1]), Number(r.to[1])); const hi = Math.max(Number(r.from[1]), Number(r.to[1]));
  const a = Number(u[1]); const b = Number(u[3]);
  return a >= lo && a <= hi && b >= lo && b <= hi && a !== b;
}

/** The evidence the lines give a plan whose key (or first) move runs along
 *  `roads`: the best line that plays one of them among the mover's first
 *  moves, falling with its distance from the best line. */
function lineEvidence(lines: readonly AnalysisLine[], mover: Color, roads: readonly Road[]): { e: number; gap: number; first: boolean } | null {
  if (!lines.length) return null;
  const best = scoreOf(lines[0], mover);
  let out: { e: number; gap: number; first: boolean } | null = null;
  for (const l of lines) {
    const ms = moverUcis(l);
    const at = ms.findIndex((u) => roads.some((r) => onRoad(u, r)));
    if (at < 0) continue;
    const gap = Math.max(0, best - scoreOf(l, mover));
    if (gap > EVIDENCE_GAP_CP) continue;
    const e = Math.max(0, 1 - gap / (2 * EVIDENCE_GAP_CP)) * (at === 0 ? 1 : 0.9);
    if (!out || e > out.e) out = { e, gap, first: at === 0 };
  }
  return out;
}

/** THE EVIDENCE FOR A PLAN WITH NO PAWN MOVE: the best near-best line whose
 *  mover's first moves play it, by the plan's own test. */
function pieceEvidence(fen: string, lines: readonly AnalysisLine[], mover: Color, s: StructurePlanRead): number | null {
  if (!lines.length) return null;
  const best = scoreOf(lines[0], mover);
  let out: number | null = null;
  for (const l of lines) {
    const gap = Math.max(0, best - scoreOf(l, mover));
    if (gap > EVIDENCE_GAP_CP) continue;
    let c: Chess;
    try { c = new Chess(fen); } catch { return null; }
    const moves: Array<{ piece: string; from: string; to: string; san: string; captured?: string }> = [];
    // A piece of the mover's that lands hitting one of the weak pawns.
    let hitsWeakness = false;
    for (let k = 0; k < Math.min(l.moves.length, KEY_WITHIN_MOVES * 2); k += 1) {
      const u = l.moves[k];
      let m;
      try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
      if (!m) break;
      if (k % 2 !== 0) continue;
      moves.push(m);
      const to = m.to;
      if (m.piece !== 'p' && s.squares.some((x) => c.attackers(x as Square, mover).includes(to))) hitsWeakness = true;
    }
    const plays = ((): boolean => {
      switch (s.kind) {
        case 'two-weaknesses': return hitsWeakness;
        case 'regroup': return moves.length > 0 && moves.every((m) => m.piece !== 'p' && !m.captured && !/[+#]/.test(m.san));
        case 'king-blocked': return moves.some((m) => m.from === s.target || /^O-O/.test(m.san));
        case 'isolani': case 'square': case 'bad-bishop': return moves.some((m) => m.piece !== 'p' && s.squares.includes(m.to));
        default: return false;
      }
    })();
    if (!plays) continue;
    const e = Math.max(0, 1 - gap / (2 * EVIDENCE_GAP_CP)) * 0.9;
    if (out === null || e > out) out = e;
  }
  return out;
}

function structureCandidates(i: PlanOfIn, side: Color, lines: readonly AnalysisLine[], key: number): { now: PlanCandidate[]; later: PlanCandidate[] } {
  const now: PlanCandidate[] = []; const later: PlanCandidate[] = [];
  const mine = side === i.student;
  const whose = mine ? 'your' : 'their';
  const names = i.namesMoves || !mine;
  for (const s of structureOf(i.fen, side)) {
    const roads: Road[] = [s.key, s.first].filter((x): x is { from: string; to: string; hits: string | null } => !!x);
    // A structure plan with no move (the isolani, the square, the bad bishop)
    // is evidenced by the board itself only beside a line's plan, never alone.
    const claim = `plan:${side}:${s.kind}:${s.target ?? s.squares[0] ?? ''}`;
    // THE PLAN FOR LATER, read first: its first step 50–100 off the best now,
    // and the best line plays it later on — not a plan for this move.
    if (roads.length && lines.length) {
      const best = scoreOf(lines[0], side);
      const starts = lines.find((l) => roads.some((r) => onRoad(l.moves[0]?.slice(0, 4) ?? '', r)));
      const gap = starts ? best - scoreOf(starts, side) : null;
      const bestFirst = roads.some((r) => onRoad(lines[0].moves[0]?.slice(0, 4) ?? '', r));
      const bestLater = !bestFirst && lines[0].moves.filter((_, k) => k % 2 === 0).slice(1, 6).some((u) => roads.some((r) => onRoad(u.slice(0, 4), r)));
      if (gap !== null && gap >= LATER_MIN_CP && gap <= LATER_MAX_CP && bestLater) {
        const text = structurePlanWords(s, whose, names, key, true);
        if (text) later.push({ source: 'structure', side, text, squares: s.squares, target: s.target, claim, evidence: 0, structure: s });
        continue;
      }
    }
    const ev = roads.length ? lineEvidence(lines, side, roads)?.e ?? null : pieceEvidence(i.fen, lines, side, s);
    if (ev !== null) {
      const text = structurePlanWords(s, whose, names, key);
      if (text) now.push({ source: 'structure', side, text, squares: s.squares, target: s.target, claim, evidence: ev, structure: s });
    }
  }
  return { now, later };
}

function mastersCandidate(i: PlanOfIn, side: Color, lines: readonly AnalysisLine[]): PlanCandidate | null {
  if (!i.movesAt) return null;
  const r = (() => { try { return mastersPlanRead(i.fen, i.movesAt); } catch { return null; } })();
  const brk = side === 'w' ? r?.white : r?.black;
  if (!brk) return null;
  const mine = side === i.student;
  // The engine's own line from the break, when it has one, may refute it.
  const starts = lines.find((l) => (l.moves[0] ?? '').slice(2, 4) === brk.square && (l.moves[0] ?? '').slice(0, 2) === brk.from);
  if (starts && lines.length && scoreOf(lines[0], side) - scoreOf(starts, side) > REFUTED_CP) return null;
  const read: StructurePlanRead = { side, kind: 'chain', key: { from: brk.from, to: brk.square, hits: null }, first: null, squares: [brk.square], target: brk.square };
  const names = i.namesMoves || !mine;
  const brkWord = names ? brk.san.replace(/^…/, '') : `the ${brk.from[0]}-pawn`;
  const text = mastersBreakPlanWords(mine, brkWord);
  return { source: 'masters', side, text, squares: [brk.square], target: brk.square, claim: `plan:${side}:break:${brk.square}`, evidence: brk.share, structure: read };
}

/** PASSIVE DEFENCE: the mover is down two pawns or more and the best line
 *  forces nothing in its first moves — no check, no capture. */
function passiveDefence(i: PlanOfIn, mover: Color, key: number): PlanCandidate | null {
  const best = i.lines[0];
  if (!best || scoreOf(best, mover) > PASSIVE_DEFENCE_CP || best.mate != null) return null;
  let c: Chess;
  try { c = new Chess(i.fen); } catch { return null; }
  for (let k = 0; k < Math.min(best.moves.length, KEY_WITHIN_MOVES * 2); k += 1) {
    const u = best.moves[k];
    let m;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    if (!m) return null;
    if (k % 2 === 0 && (m.captured || /[+#]/.test(m.san))) return null;
  }
  const s: StructurePlanRead = { side: mover, kind: 'passive-defence', key: null, first: null, squares: [], target: null };
  const text = structurePlanWords(s, mover === i.student ? 'your' : 'their', i.namesMoves || mover !== i.student, key);
  return text ? { source: 'line', side: mover, text, squares: [], target: null, claim: `plan:${mover}:passive-defence`, evidence: 0.8, structure: s } : null;
}

/** Same plan twice (one claim, or one square): keep the stronger. */
function dedupe(cs: PlanCandidate[]): PlanCandidate[] {
  const out: PlanCandidate[] = [];
  for (const c of [...cs].sort((a, b) => b.evidence - a.evidence)) {
    if (out.some((o) => o.claim === c.claim || (o.target && o.target === c.target) || o.squares.some((x) => c.squares[0] === x))) continue;
    out.push(c);
  }
  return out;
}

/** THE BOARD'S PLANS, ranked by evidence (see the header). */
export function planOf(i: PlanOfIn): PlanOfOut {
  let mover: Color;
  try { mover = new Chess(i.fen).turn(); } catch { return { mover: [], other: null, later: null }; }
  const key = stemKeyOf(`plan|${i.fen.split(' ').slice(0, 2).join(' ')}`);
  const cands: PlanCandidate[] = [];
  const line = (() => { try { return planOfTheBoard({ fen: i.fen, lines: i.lines, student: i.student, namesMoves: i.namesMoves }); } catch { return null; } })();
  if (line) cands.push({ source: 'line', side: mover, text: line.text, squares: line.squares, target: line.target, claim: `plan:${mover}:${line.kind}:${line.target ?? line.squares[0] ?? ''}`, evidence: 1, board: line });
  const st = structureCandidates(i, mover, i.lines, key);
  cands.push(...st.now);
  const m = mastersCandidate(i, mover, i.lines);
  if (m) cands.push(m);
  const pd = passiveDefence(i, mover, key);
  if (pd) cands.push(pd);
  // THE RACE THEY WIN: their passed pawn queens first, so pushing ours is not
  // the plan — stopping theirs is (the race itself is `planRaceClause`'s).
  const race = (() => { try { return detectPlanRace(i.fen, mover); } catch { return null; } })();
  const lostRace = race?.kind === 'passer-race' && !race.youQueenFirst;
  const ranked = dedupe(cands.filter((c) => !(lostRace && c.structure?.kind === 'majority')));
  // Only the best-supported plan is said.
  const said = ranked.slice(0, 1);
  // The other side's plan, priced on the pass read; else the games only.
  const otherSide = flip(mover);
  const pass = i.passLines ?? [];
  const otherCands = dedupe([
    ...(pass.length ? structureCandidates(i, otherSide, pass, key).now : []),
    ...((): PlanCandidate[] => { const x = mastersCandidate(i, otherSide, pass); return x ? [x] : []; })(),
  ]);
  const laterPick = st.later.find((l) => !said.some((s) => s.claim === l.claim || s.target === l.target)) ?? null;
  return { mover: said, other: otherCands[0] ?? null, later: laterPick };
}
