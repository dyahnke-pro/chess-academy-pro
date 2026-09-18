// teachingSelector — THE ONE SELECTOR (unified-coach N1, David 2026-09-15:
// "I want the coach to view each game like a master level puzzle. Not each
// move." / "One unified coach, whose abilities are the same no matter where in
// the app you are.").
//
// Reads a whole sequence ONCE — a finished game, a taught line, a live game so
// far — and emits one package: the THESIS (what the sequence is about), the
// MOMENTS it turned on (≤ MAX_MOMENTS, rating-scaled, contested-gated), the
// CAUSAL CHAIN linking them, and the set of plies ON THAT THREAD. It does not
// know which surface called it (invariant 1 of
// docs/plans/2026-09-15-one-coach-need-selector.md §3.0): `surface` is accepted
// for the audit trail only and never changes the package — the gate asserts
// deep-equality across surfaces.
//
// Everything here is COMPUTED from the existing fact-computers (invariant 2 —
// this module is the only narration caller of them): `turningPointCandidates`
// (reviewTurningPoint — the same moments the review card asks about),
// `landedTacticTeaching` (dnaLineNarrator → computePlyFacts → tacticInvariant),
// `buildCausalChain`, `structurePlan`. `renderThesis` is a DNA-register
// TEMPLATE over those facts: the register (retrospective / present) is the
// caller's declared surface contract; the model may phrase it via `voiceFacts`,
// it never chooses it (G0).
//
// What this phase deliberately does NOT do: gate the existing per-ply beats.
// `onThread` is handed to every surface so N2 (the need score + R2 retirement)
// can gate on it TOGETHER with need — gating on the thread alone would silence
// every ply off the thread today, which is the July "there is no coach
// narration" failure the CLAUDE.md standard forbids reopening.
import { Chess, type Color } from 'chess.js';
import type { CoachSurface } from '../coach/types';
import { computeNeed, coldStudent, type StudentNeedContext, type NeedVerdict } from './needScore';
import { matchTacticPattern, boostFor } from './weaknessSignal';
import type { TacticPatternType } from '../types/tacticTypes';
import { turningPointCandidates, moveLabel, spokenMoveLabel, type TurningPointSegmentLike } from './reviewTurningPoint';
import { landedTacticTeaching } from './dnaLineNarrator';
import { buildCausalChain, type CausalChain } from './causalChain';
import { structurePlan } from './boardPlan';
import { foldPlans, type PlanPly } from './planMemory';
import { tacticWord } from './pvPlayback';
import { capabilitiesShown } from './capabilityEvidence';

export interface SelectorPly {
  /** 1-based ply. */
  ply: number;
  san: string;
  fenBefore: string;
  fenAfter: string;
  playerColor: 'white' | 'black';
  /** White-POV centipawns, as the review walk carries them. Absent on a taught
   *  line (no engine record) — then only landed tactics can be moments. */
  evalBefore?: number | null;
  evalAfter?: number | null;
  classification?: string | null;
}

/** What the sequence IS: a finished game, a taught line, or a live game so far. */
export type SequenceKind = 'game' | 'line' | 'live';

export interface SelectorInput {
  plies: readonly SelectorPly[];
  studentColor: 'white' | 'black';
  rating?: number;
  kind: SequenceKind;
  /** Audit trail only — never changes the package (invariant 1). */
  surface?: CoachSurface;
  /** THE STUDENT (N2). When given, every student ply gets a computed need
   *  verdict (`needByPly`); absent = a cold student (the rating prior teaches). */
  student?: StudentNeedContext;
}

export interface Moment {
  ply: number;
  /** "18… Rd8" — the review card's label, shared. */
  label: string;
  kind: 'swing' | 'landed-tactic';
  /** Mover-POV cost in pawns for a swing moment; null for a landed tactic on a
   *  sequence without evals. */
  swingPawns: number | null;
  /** The tactic type that LANDED on this ply (`computePlyFacts.tacticLanded`),
   *  when one did — a swing moment can carry one too. */
  tactic: string | null;
  fenBefore: string;
  san: string;
}

export interface Thesis {
  kind: 'turned' | 'landed' | 'plan' | 'none';
  ply: number | null;
  label: string | null;
  swingPawns: number | null;
  tactic: string | null;
  /** The structure→plan sentence (`structurePlan`) for a quiet taught line. */
  plan: string | null;
  /** The root-cause node kind of the causal chain, when one links the moments. */
  chainRoot: string | null;
}

export interface TeachingPackage {
  thesis: Thesis;
  /** Biggest first; ≤ MAX_MOMENTS. */
  moments: Moment[];
  chain: CausalChain | null;
  /** Plies that are links in the thread: every moment + every chain node ply.
   *  N2 gates per-ply beats on this together with the need score. */
  onThread: ReadonlySet<number>;
  kind: SequenceKind;
  /** N2 — the student term: per STUDENT ply, does this student need the quiet
   *  teaching beat here? (Moments / must-defend / mate speak on their own
   *  importance regardless.) Computed from `input.student` (cold when absent). */
  needByPly: ReadonlyMap<number, NeedVerdict>;
  /** N3 — plan memory: per ply, the structure→plan in force and whether this
   *  ply ANNOUNCES it (first time / structure changed) or merely carries it. A
   *  surface speaks the plan on 'announce' and refers to progress otherwise —
   *  never re-announces. */
  planByPly: ReadonlyMap<number, PlanPly>;
}

export const MAX_MOMENTS = 3;

const NONE: Thesis = { kind: 'none', ply: null, label: null, swingPawns: null, tactic: null, plan: null, chainRoot: null };

function toSegment(p: SelectorPly): TurningPointSegmentLike {
  return {
    ply: p.ply,
    moveNumber: Math.ceil(p.ply / 2),
    san: p.san,
    playerColor: p.playerColor,
    evalBefore: p.evalBefore ?? null,
    evalAfter: p.evalAfter ?? null,
    classification: p.classification ?? null,
    fenBefore: p.fenBefore,
  };
}

/** The student-hole boost for a moment, in centipawns (N5): `boostFor` (0–30)
 *  of the weakness the moment's landed tactic matches, else 0. */
export function weaknessBoostCp(tactic: string | null, signals: readonly import('./weaknessSignal').WeaknessSignal[]): number {
  if (!tactic || signals.length === 0) return 0;
  const m = matchTacticPattern(tactic as TacticPatternType, signals);
  return m ? boostFor(m) : 0;
}

/** Swing candidates re-ranked by swing + the student's hole (N5). Pure;
 *  an empty profile returns the input order. */
export function rankSwingCandidates<T extends { ply: number; swingPawns: number }>(
  swings: readonly T[],
  landedByPly: ReadonlyMap<number, string>,
  signals: readonly import('./weaknessSignal').WeaknessSignal[],
): T[] {
  if (signals.length === 0) return [...swings];
  const score = (c: T): number => c.swingPawns * 100 + weaknessBoostCp(landedByPly.get(c.ply) ?? null, signals);
  return [...swings].sort((a, b) => score(b) - score(a));
}

/**
 * The one game-level read. Pure, deterministic, chess.js-only (no engine call
 * — it consumes the eval record the caller already has), so it is cheap enough
 * to run on every review open, every lesson generation and every phase
 * transition.
 */
export function selectTeaching(input: SelectorInput): TeachingPackage {
  const { plies, kind } = input;
  const rating = input.rating ?? 1500;
  const studentWB: Color = input.studentColor === 'white' ? 'w' : 'b';
  if (plies.length === 0) return { thesis: NONE, moments: [], chain: null, onThread: new Set(), kind, needByPly: new Map(), planByPly: new Map() };

  // 1. Landed tactics, per ply (cheap; the same computer the live beat speaks).
  const landedByPly = new Map<number, string>();
  for (const p of plies) {
    try {
      const landed = landedTacticTeaching(p.fenBefore, p.san);
      if (landed) landedByPly.set(p.ply, landed.type);
    } catch { /* an illegal ply is not a moment */ }
  }

  // 2. Swing moments — the review card's own candidates, biggest first…
  const swingsRaw = turningPointCandidates(plies.map(toSegment), rating);
  // …RE-RANKED BY THE STUDENT'S HOLES (unified-coach N5): a moment whose landed
  // tactic is a hole this student keeps falling in outranks a moment of EQUAL
  // criticality that is not. The boost is `boostFor` (0–30, lifecycle-keyed,
  // the same number positionFacts uses), read in centipawns so it re-orders
  // comparable swings and never vaults a subtlety over a real blunder.
  // Deterministic; an empty profile → identity order (the card and the
  // selector still agree on the biggest swing).
  const signals = input.student?.signals ?? [];
  const weaknessCp = (ply: number): number => weaknessBoostCp(landedByPly.get(ply) ?? null, signals);
  const swings = rankSwingCandidates(swingsRaw, landedByPly, signals);
  const byPly = new Map(plies.map((p) => [p.ply, p] as const));
  const moments: Moment[] = [];
  const seen = new Set<number>();
  for (const c of swings) {
    if (moments.length >= MAX_MOMENTS) break;
    const p = byPly.get(c.ply);
    if (!p) continue;
    moments.push({ ply: c.ply, label: c.label, kind: 'swing', swingPawns: c.swingPawns, tactic: landedByPly.get(c.ply) ?? null, fenBefore: p.fenBefore, san: p.san });
    seen.add(c.ply);
  }
  // 3. Landed tactics fill the remaining slots — the student's holes first
  //    (N5), then game order.
  const landedOrder = [...plies].sort((a, b) => weaknessCp(b.ply) - weaknessCp(a.ply) || a.ply - b.ply);
  for (const p of landedOrder) {
    if (moments.length >= MAX_MOMENTS) break;
    const t = landedByPly.get(p.ply);
    if (!t || seen.has(p.ply)) continue;
    moments.push({ ply: p.ply, label: moveLabel(toSegment(p)), kind: 'landed-tactic', swingPawns: null, tactic: t, fenBefore: p.fenBefore, san: p.san });
    seen.add(p.ply);
  }

  // 4. The chain through the top moment (root cause → tactic), when one exists.
  let chain: CausalChain | null = null;
  const top = moments[0];
  if (top) {
    try {
      chain = buildCausalChain({ historySans: plies.slice(0, top.ply).map((p) => p.san), focusPly: top.ply });
    } catch { chain = null; }
  }
  const onThread = new Set<number>(moments.map((m) => m.ply));
  if (chain) for (const n of chain.nodes) if (typeof n.ply === 'number') onThread.add(n.ply);

  // 5. The thesis — one computed fact the whole package serves.
  let thesis: Thesis = NONE;
  if (top && top.kind === 'swing') {
    thesis = { kind: 'turned', ply: top.ply, label: top.label, swingPawns: top.swingPawns, tactic: top.tactic, plan: null, chainRoot: chain?.nodes[0]?.kind ?? null };
  } else if (top) {
    thesis = { kind: 'landed', ply: top.ply, label: top.label, swingPawns: null, tactic: top.tactic, plan: null, chainRoot: chain?.nodes[0]?.kind ?? null };
  } else if (kind === 'line') {
    const last = plies[plies.length - 1];
    let plan: string | null = null;
    try { plan = structurePlan(last.fenAfter, studentWB); } catch { plan = null; }
    if (plan) thesis = { kind: 'plan', ply: last.ply, label: null, swingPawns: null, tactic: null, plan, chainRoot: null };
  }

  // 6. THE STUDENT TERM (N2) — need per student ply, from the student's own
  //    data (cold → the rating prior). The tactic a moment landed is the ply's
  //    concept for the weakness match; the thread membership is the thesis term.
  const student = input.student ?? coldStudent(rating);
  const tacticByPly = new Map<number, string | null>(moments.map((m) => [m.ply, m.tactic] as const));
  const needByPly = new Map<number, NeedVerdict>();
  for (const p of plies) {
    if (p.playerColor !== input.studentColor) continue;
    const tactic = tacticByPly.get(p.ply) ?? landedByPly.get(p.ply) ?? null;
    // WHAT THIS PLY PROVED, from the same computer that RECORDS it. The dual-use
    // rule: `capabilitiesShown` is how a held row gets written at review time,
    // and reading it here is how the coach learns it may go quiet. No second
    // fact-to-hole mapping is authored — the join is computed from the board.
    //
    // The cp loss is derived from the WHITE-POV evals the walk carries, and the
    // sign is the trap this repo has been bitten by before, so it is spelled
    // out: white loses when the number FALLS, black when it RISES. A wrong sign
    // here would hand a blunder to `capabilitiesShown` as a clean move.
    const cpLoss = (p.evalBefore == null || p.evalAfter == null)
      ? null
      : Math.max(0, p.playerColor === 'white' ? p.evalBefore - p.evalAfter : p.evalAfter - p.evalBefore);
    let capabilityTags: string[] = [];
    try {
      capabilityTags = capabilitiesShown(p.fenBefore, p.san, p.playerColor, cpLoss).map((c) => c.tag);
    } catch { capabilityTags = []; }
    needByPly.set(p.ply, computeNeed({
      ply: p.ply, studentMove: true,
      conceptId: tactic as import('../types/tacticTypes').TacticPatternType | null,
      onThread: onThread.has(p.ply),
      capabilityTags: capabilityTags as readonly import('../data/misconceptionTags').MisconceptionTagId[],
    }, student));
  }

  // 7. PLAN MEMORY (N3) — announced once, carried until the structure changes.
  let planByPly: Map<number, PlanPly>;
  try { planByPly = foldPlans(plies, input.studentColor); } catch { planByPly = new Map(); }

  return { thesis, moments, chain, onThread, kind, needByPly, planByPly };
}

export type ThesisRegister = 'retrospective' | 'present';

/**
 * The thesis as one DNA-register sentence in the caller's declared register.
 * A TEMPLATE over computed facts — the model may phrase it through
 * `voiceFacts`, it never chooses it. '' when there is nothing to say.
 */
export function renderThesis(t: Thesis, register: ThesisRegister): string {
  const word = t.tactic ? tacticWord(t.tactic) : null;
  // The thesis is SPOKEN, so the locator drops its move-number prefix (G9.4).
  const label = t.label ? spokenMoveLabel(t.label) : t.label;
  switch (t.kind) {
    case 'turned': {
      const swing = t.swingPawns !== null ? ` — about ${t.swingPawns.toFixed(1)} points` : '';
      return register === 'retrospective'
        ? `The game turned at ${label}${swing}${word ? `; a ${word} landed there` : ''}.`
        : `This turns at ${label}${swing}${word ? ` — the ${word} lands there` : ''}.`;
    }
    case 'landed':
      return register === 'retrospective'
        ? `The moment was ${label}: the ${word ?? 'tactic'} landed there.`
        : `Watch ${label} — that is where the ${word ?? 'tactic'} lands.`;
    case 'plan':
      return t.plan ?? '';
    case 'none':
      return '';
  }
}

/** Build selector plies from a SAN history (chess.js replays it; an illegal
 *  SAN truncates the sequence there — never a throw). Evals optional. */
export function pliesFromSans(sans: readonly string[], evals?: readonly (number | null)[]): SelectorPly[] {
  const c = new Chess();
  const out: SelectorPly[] = [];
  let before = c.fen();
  let evalBefore: number | null = 0;
  for (let i = 0; i < sans.length; i++) {
    let mv: ReturnType<Chess['move']> | null;
    try { mv = c.move(sans[i]); } catch { break; }
    if (!mv) break;
    const evalAfter = evals ? (evals[i] ?? null) : undefined;
    out.push({
      ply: i + 1, san: mv.san, fenBefore: before, fenAfter: c.fen(),
      playerColor: mv.color === 'w' ? 'white' : 'black',
      ...(evals ? { evalBefore, evalAfter } : {}),
    });
    before = c.fen();
    if (evals) evalBefore = evalAfter ?? evalBefore;
  }
  return out;
}

/** The review walk's segments carry everything the selector needs. Structural
 *  type so the component never imports a review-only shape into the selector. */
export interface SegmentLike {
  ply: number;
  san: string;
  fenBefore: string;
  fenAfter: string;
  playerColor: 'white' | 'black';
  evalBefore: number | null;
  evalAfter: number | null;
  classification: string | null;
}

export function selectTeachingForSegments(
  segments: ReadonlyArray<SegmentLike>,
  studentColor: 'white' | 'black',
  rating: number | undefined,
  surface: CoachSurface,
  student?: StudentNeedContext,
): TeachingPackage {
  return selectTeaching({
    plies: segments.map((s) => ({ ply: s.ply, san: s.san, fenBefore: s.fenBefore, fenAfter: s.fenAfter, playerColor: s.playerColor, evalBefore: s.evalBefore, evalAfter: s.evalAfter, classification: s.classification })),
    studentColor, rating, kind: 'game', surface, student,
  });
}

/** The serializable slice of a package a cached WalkthroughTree carries
 *  (`WalkthroughTree.teaching`): facts only, no Sets, no chain object. */
export interface TreeTeaching {
  thesis: Thesis;
  momentPlies: number[];
  onThread: number[];
  chainRoot: string | null;
  /** N2 — student plies whose need cleared the bar at generation time. */
  needPlies: number[];
}

export function summarizeTeaching(pkg: TeachingPackage): TreeTeaching {
  return {
    thesis: pkg.thesis,
    momentPlies: pkg.moments.map((m) => m.ply),
    onThread: [...pkg.onThread].sort((a, b) => a - b),
    chainRoot: pkg.chain?.nodes[0]?.kind ?? null,
    needPlies: [...pkg.needByPly.entries()].filter(([, v]) => v.speak).map(([ply]) => ply).sort((a, b) => a - b),
  };
}
