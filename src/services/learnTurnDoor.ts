/**
 * learnTurnDoor — the ONE place a Learn free-play turn decides what it says
 * (WO-COACH-TEACHER WO-1, David 2026-09-29: "Start the decider door").
 *
 * A Learn turn used to assemble its voice in two places inside
 * `CoachTeachPage`, each calling `buildVoicePackage` and then filtering by a
 * KIND whitelist (`DNA_VOICE_KINDS`). A whitelist of kinds cannot tell two
 * lanes of the same kind apart, and it silently dropped a whole lane that was
 * built to speak: the plan arc (2026-09-27, "There it is — … That was the
 * plan") carries kind `plan`, which the whitelist never listed, so on a real
 * 42-ply prod game it said nothing at all.
 *
 * So the unit of decision is the LANE, not the kind. Every lane that can speak
 * in Learn is declared here with the kind it speaks as and whether it speaks,
 * in a `Record` over the union — a new lane fails to compile until someone
 * answers for it. Nothing is silenced by accident any more: a lane that stays
 * quiet says so in this table, with the reason.
 *
 * Slice 1 (this file): route + record, behaviour-preserving. Ordering and dedupe are still
 * `buildVoicePackage`'s. Picking ONE lead per turn is the next slice.
 */
import { buildVoicePackage, type VoiceFact, type VoiceFactKind, type VoicePackage } from './voicePackage';

export { buildVoicePackage, describeVoicePackage, markableSquares, spokenSentenceKeys } from './voicePackage';
export type { VoicePackage, VoiceFactKind } from './voicePackage';

export type LearnLane =
  // ── the instant wave, spoken with the coach's reply ──
  | 'gem'
  | 'tactic'
  | 'threat'
  | 'commentary'
  | 'behavior'
  | 'curated'
  | 'positional'
  // ── the late wave, spoken when the engine read settles ──
  | 'opening'
  | 'structure'
  | 'engineRead'
  | 'pieceQuality'
  | 'evalSplit'
  | 'register'
  | 'gap'
  | 'positionFacts'
  | 'fork'
  | 'priorityFirst'
  | 'rejectedTempting'
  | 'planArc'
  | 'lookaheadPlan'
  | 'borrowed'
  | 'drawback'
  | 'mistake'
  | 'coachMistake'
  | 'fundamental'
  | 'movePoint';

export interface LaneRule {
  /** The kind the package ranks it as. */
  kind: VoiceFactKind;
  /** Whether this lane may reach the voice at all. */
  speaks: boolean;
  /** Why, in one line — required when `speaks` is false, so a silent lane is
   *  a stated decision and never an omission. */
  why: string;
}

export const LEARN_LANES: Record<LearnLane, LaneRule> = {
  gem: { kind: 'gem', speaks: true, why: 'a verified punish the coach just handed over' },
  tactic: { kind: 'tactic', speaks: true, why: 'a tactic the detectors proved for the student' },
  threat: { kind: 'threat', speaks: true, why: 'danger to the student on this board' },
  commentary: { kind: 'computed', speaks: true, why: 'the computed board read (playCommentary)' },
  behavior: { kind: 'observation', speaks: true, why: 'a Danya behaviour, rate-matched to his corpus' },
  curated: { kind: 'note', speaks: true, why: 'a masterclass beat authored for this position' },
  positional: { kind: 'observation', speaks: true, why: 'the positional read' },
  opening: { kind: 'opening', speaks: true, why: 'the opening named once, when it settles' },
  structure: { kind: 'computed', speaks: true, why: 'the named pawn structure and its plan' },
  engineRead: { kind: 'computed', speaks: false, why: 'engine eval narration is not his DNA (2026-08-23); the producer is also gated off at the call site' },
  pieceQuality: { kind: 'computed', speaks: true, why: 'their best piece / your worst piece' },
  evalSplit: { kind: 'computed', speaks: false, why: 'eval-term split is not his DNA (2026-08-23); gated off at the call site' },
  register: { kind: 'computed', speaks: true, why: 'but-turn / hedge / candidate compare, where the move is earned' },
  gap: { kind: 'computed', speaks: true, why: 'what the opponent’s move left undone' },
  positionFacts: { kind: 'computed', speaks: true, why: 'position facts, already through coachDecider' },
  fork: { kind: 'fork', speaks: false, why: 'book fork-in-the-road is not his DNA (2026-08-23); gated off at the call site' },
  priorityFirst: { kind: 'computed', speaks: true, why: 'the priority before the move' },
  rejectedTempting: { kind: 'computed', speaks: true, why: 'the tempting move and its refutation' },
  // CLOSED, with a measured reason (2026-09-29). Built 2026-09-27 to speak, it
  // was silenced by accident by the old kind whitelist. Opened here, its first
  // live line was board-FALSE: 3UqPa5eV2e0 ply 37, "Their plan is taking shape:
  // the knight's walk to h2" with the knight going f6→d5, away from h2, and h2
  // covered by the king. Fixed and re-opened in WO-2 (the plan thread), never
  // spoken before it is true.
  planArc: { kind: 'plan', speaks: false, why: 'board-false on its first live walk (3UqPa5eV2e0 ply 37) — re-opened by WO-2 once the aim reading is proven' },
  lookaheadPlan: { kind: 'plan', speaks: false, why: 'the whole look-ahead paragraph; the plan arc speaks the plan instead (WO-2 folds it into the one thought)' },
  borrowed: { kind: 'borrowed', speaks: false, why: 'corpus teaching borrowed from another board — no corpus notes in Learn free play (2026-09-23)' },
  drawback: { kind: 'drawback', speaks: true, why: 'what the student’s own move handed over' },
  mistake: { kind: 'mistake', speaks: true, why: 'the mistake call-out' },
  coachMistake: { kind: 'coachMistake', speaks: true, why: 'the coach owning its own inaccuracy' },
  fundamental: { kind: 'drawback', speaks: true, why: 'the fundamental the move broke' },
  movePoint: { kind: 'computed', speaks: true, why: 'the point of the student’s clean move' },
};

export interface LaneFact {
  lane: LearnLane;
  text: string;
  fen: string;
  squares?: readonly string[];
  /** Only for lanes whose producer decides the kind itself (the backward look
   *  returns drawback | mistake | coachMistake). */
  kind?: VoiceFactKind;
}

export interface TurnDecision {
  pkg: VoicePackage;
  /** Lanes offered this turn, in the order they were offered. */
  offered: LearnLane[];
  /** Lanes whose fact reached the voice. */
  spoke: LearnLane[];
  /** Lanes refused by the lane table, before the package saw them. */
  closed: LearnLane[];
}

/** The door. Every Learn free-play utterance is assembled here. */
export function decideTurn(
  facts: readonly LaneFact[],
  /** What this turn has already said out loud (see `buildVoicePackage`). */
  alreadySaid?: string,
  /** Every phrase already spoken this game. */
  priorKeys?: ReadonlySet<string>,
): TurnDecision {
  const offered: LearnLane[] = [];
  const closed: LearnLane[] = [];
  const open: Array<VoiceFact & { lane: LearnLane }> = [];
  for (const f of facts) {
    if (!f.text.trim()) continue;
    offered.push(f.lane);
    const rule = LEARN_LANES[f.lane];
    if (!rule.speaks) { closed.push(f.lane); continue; }
    open.push({ lane: f.lane, kind: f.kind ?? rule.kind, text: f.text, fen: f.fen, squares: f.squares });
  }
  const pkg = buildVoicePackage(open.map(({ kind, text, fen, squares }) => ({ kind, text, fen, squares })), alreadySaid, priorKeys);
  const spoke: LearnLane[] = [];
  for (const k of pkg.kept) {
    const hit = open.find((o) => o.text === k.text || k.text.length > 0 && o.text.includes(k.text));
    if (hit && !spoke.includes(hit.lane)) spoke.push(hit.lane);
  }
  return { pkg, offered, spoke, closed };
}

/** One line for the audit log: which lanes were offered, spoke, or were closed. */
export function describeTurnDecision(d: TurnDecision): string {
  return `lanes offered=[${d.offered.join(',')}] spoke=[${d.spoke.join(',')}] closed=[${d.closed.join(',')}]`;
}
