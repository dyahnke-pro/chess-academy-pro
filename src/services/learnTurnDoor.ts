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
 * in Learn is declared here with the kind it speaks as, in a `Record` over the
 * union — a new lane fails to compile until someone answers for it.
 *
 * THERE ARE NO CLOSED LANES (G8.5, 2026-09-29). Five used to sit here marked
 * silent — the engine read, the eval split, the book fork, borrowed teaching,
 * the look-ahead paragraph — while their producers kept computing text nobody
 * heard. Closing a lane means deleting its producer and its row; a lane in
 * this table has a live producer (`learnTurnDoor.test.ts` holds both halves).
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
  | 'pieceQuality'
  | 'register'
  | 'gap'
  | 'positionFacts'
  | 'priorityFirst'
  | 'rejectedTempting'
  | 'planArc'
  | 'drawback'
  | 'mistake'
  | 'coachMistake'
  | 'fundamental'
  | 'movePoint'
  | 'causalChain';

export interface LaneRule {
  /** The kind the package ranks it as. */
  kind: VoiceFactKind;
  /** What the lane teaches, in one line. */
  why: string;
}

export const LEARN_LANES: Record<LearnLane, LaneRule> = {
  gem: { kind: 'gem', why: 'a verified punish the coach just handed over' },
  tactic: { kind: 'tactic', why: 'a tactic the detectors proved for the student' },
  threat: { kind: 'threat', why: 'danger to the student on this board' },
  commentary: { kind: 'computed', why: 'the computed board read (playCommentary)' },
  behavior: { kind: 'observation', why: 'a Danya behaviour, rate-matched to his corpus' },
  curated: { kind: 'note', why: 'a masterclass beat authored for this position' },
  positional: { kind: 'observation', why: 'the positional read' },
  opening: { kind: 'opening', why: 'the opening named once, when it settles' },
  structure: { kind: 'computed', why: 'the named pawn structure and its plan' },
  pieceQuality: { kind: 'computed', why: 'their best piece / your worst piece' },
  register: { kind: 'computed', why: 'but-turn / hedge / candidate compare, where the move is earned' },
  gap: { kind: 'computed', why: 'what the opponent’s move left undone' },
  positionFacts: { kind: 'computed', why: 'position facts, already through coachDecider' },
  priorityFirst: { kind: 'computed', why: 'the priority before the move' },
  rejectedTempting: { kind: 'computed', why: 'the tempting move and its refutation' },
  // Behind the walkability check (2026-09-29): walk 2 heard 3 false lines in 4
  // — routes read off one engine line the CURRENT board cannot walk. Learn
  // filters aims through planArc.aimWalkableNow, and a student plan the
  // student never heard is never "let go".
  planArc: { kind: 'plan', why: 'the plan taking shape / landing / given up — read twice, walkable from this board' },
  drawback: { kind: 'drawback', why: 'what the student’s own move handed over' },
  mistake: { kind: 'mistake', why: 'the mistake call-out' },
  coachMistake: { kind: 'coachMistake', why: 'the coach owning its own inaccuracy' },
  fundamental: { kind: 'drawback', why: 'the fundamental the move broke' },
  movePoint: { kind: 'computed', why: 'the point of the student’s clean move' },
  causalChain: { kind: 'tactic', why: 'a cross-move cause proven on the board — the earlier move that left the piece loose' },
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
  const open: Array<VoiceFact & { lane: LearnLane }> = [];
  for (const f of facts) {
    if (!f.text.trim()) continue;
    offered.push(f.lane);
    open.push({ lane: f.lane, kind: f.kind ?? LEARN_LANES[f.lane].kind, text: f.text, fen: f.fen, squares: f.squares });
  }
  const pkg = buildVoicePackage(open.map(({ kind, text, fen, squares }) => ({ kind, text, fen, squares })), alreadySaid, priorKeys);
  const spoke: LearnLane[] = [];
  for (const k of pkg.kept) {
    const hit = open.find((o) => o.text === k.text || k.text.length > 0 && o.text.includes(k.text));
    if (hit && !spoke.includes(hit.lane)) spoke.push(hit.lane);
  }
  return { pkg, offered, spoke };
}

/** One line for the audit log: which lanes were offered and which spoke. */
export function describeTurnDecision(d: TurnDecision): string {
  return `lanes offered=[${d.offered.join(',')}] spoke=[${d.spoke.join(',')}]`;
}
