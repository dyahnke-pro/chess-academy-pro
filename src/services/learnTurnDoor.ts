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
import { buildVoicePackage, joinSpoken, type VoiceFact, type VoiceFactKind, type VoicePackage } from './voicePackage';

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
  | 'causalChain'
  | 'kingSafety'
  | 'phase'
  | 'character';

export interface LaneRule {
  /** The kind the package ranks it as. */
  kind: VoiceFactKind;
  /** What the lane teaches, in one line. */
  why: string;
  /** How strongly it claims the LEAD of a turn (WO-1b). Higher leads. The order
   *  is his: what is urgent, then what just happened, then what a move is FOR,
   *  and the board DESCRIPTION last — the scoreboard (2026-09-29) found we
   *  describe the board where he explains the move. */
  lead: number;
  /** Rides every turn it has something, whatever leads — the safety floor
   *  (a threat or a hanging piece is never held behind a "why?") and the
   *  once-only opening name. */
  always?: true;
}

export const LEARN_LANES: Record<LearnLane, LaneRule> = {
  gem: { kind: 'gem', why: 'a verified punish the coach just handed over', lead: 100, always: true },
  tactic: { kind: 'tactic', why: 'a tactic the detectors proved for the student', lead: 90, always: true },
  threat: { kind: 'threat', why: 'danger to the student on this board', lead: 95, always: true },
  commentary: { kind: 'computed', why: 'the computed board read (playCommentary)', lead: 30 },
  behavior: { kind: 'observation', why: 'a Danya behaviour, rate-matched to his corpus', lead: 25 },
  curated: { kind: 'note', why: 'a masterclass beat authored for this position', lead: 58 },
  positional: { kind: 'observation', why: 'the positional read', lead: 25 },
  opening: { kind: 'opening', why: 'the opening named once, when it settles', lead: 45, always: true },
  structure: { kind: 'computed', why: 'the named pawn structure and its plan', lead: 40 },
  pieceQuality: { kind: 'computed', why: 'their best piece / your worst piece', lead: 35 },
  register: { kind: 'computed', why: 'but-turn / hedge / candidate compare, where the move is earned', lead: 64 },
  gap: { kind: 'computed', why: 'what the opponent’s move left undone', lead: 60 },
  positionFacts: { kind: 'computed', why: 'position facts, already through coachDecider', lead: 50 },
  priorityFirst: { kind: 'computed', why: 'the priority before the move', lead: 68 },
  rejectedTempting: { kind: 'computed', why: 'the tempting move and its refutation', lead: 66 },
  // Behind the walkability check (2026-09-29): walk 2 heard 3 false lines in 4
  // — routes read off one engine line the CURRENT board cannot walk. Learn
  // filters aims through planArc.aimWalkableNow, and a student plan the
  // student never heard is never "let go".
  planArc: { kind: 'plan', why: 'the plan taking shape / landing / given up — read twice, walkable from this board', lead: 70 },
  drawback: { kind: 'drawback', why: 'what the student’s own move handed over', lead: 83 },
  mistake: { kind: 'mistake', why: 'the mistake call-out', lead: 85 },
  coachMistake: { kind: 'coachMistake', why: 'the coach owning its own inaccuracy', lead: 84 },
  fundamental: { kind: 'drawback', why: 'the fundamental the move broke', lead: 82 },
  movePoint: { kind: 'computed', why: 'the point of the student’s clean move', lead: 62 },
  character: { kind: 'computed', why: 'what the position is about just changed — tactical, positional, converting or holding', lead: 73 },
  phase: { kind: 'computed', why: 'the game has changed phase — take stock of what the position is about now', lead: 72 },
  kingSafety: { kind: 'observation', why: 'your own king is still in the centre and castling is ready', lead: 55 },
  causalChain: { kind: 'tactic', why: 'a cross-move cause proven on the board — the earlier move that left the piece loose', lead: 80 },
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
  /** The lane that led, or null when nothing spoke (WO-1b). */
  lead: { lane: LearnLane; squares: readonly string[] } | null;
  /** Board-true facts the lead pick kept quiet — not a cap: a lower-ranked
   *  claim that shares nothing with the lead is a second thought, and one
   *  thought per turn is the rule. Recorded so the audit can see what the
   *  ranking cost. */
  held: LearnLane[];
}

/** The door. Every Learn free-play utterance is assembled here. */
export function decideTurn(
  facts: readonly LaneFact[],
  /** What this turn has already said out loud (see `buildVoicePackage`). */
  alreadySaid?: string,
  /** Every phrase already spoken this game. */
  priorKeys?: ReadonlySet<string>,
  /** The lead an EARLIER wave of this same turn already spoke. This wave may
   *  only lead if it outranks it; otherwise it speaks support and safety only,
   *  so a turn stays one thought across its two waves. */
  priorLead?: { lane: LearnLane; squares: readonly string[] } | null,
): TurnDecision {
  const offered: LearnLane[] = [];
  const open: Array<VoiceFact & { lane: LearnLane }> = [];
  for (const f of facts) {
    if (!f.text.trim()) continue;
    offered.push(f.lane);
    open.push({ lane: f.lane, kind: f.kind ?? LEARN_LANES[f.lane].kind, text: f.text, fen: f.fen, squares: f.squares });
  }
  const verified = buildVoicePackage(open.map(({ kind, text, fen, squares }) => ({ kind, text, fen, squares })), alreadySaid, priorKeys);
  // Which lane each surviving fact came from (the package may trim the text).
  const laneOf = (k: VoiceFact): LearnLane | undefined =>
    open.find((o) => o.text === k.text || (k.text.length > 0 && o.text.includes(k.text)))?.lane;
  const survivors = verified.kept
    .map((k) => ({ fact: k, lane: laneOf(k) }))
    .filter((x): x is { fact: VoiceFact; lane: LearnLane } => x.lane !== undefined);

  // THE LEAD — the highest-ranked survivor; offer order breaks ties.
  let top: { fact: VoiceFact; lane: LearnLane } | null = null;
  for (const x of survivors) if (!top || LEARN_LANES[x.lane].lead > LEARN_LANES[top.lane].lead) top = x;
  const ownLead = top && (!priorLead || LEARN_LANES[top.lane].lead > LEARN_LANES[priorLead.lane].lead) ? top : null;
  const anchor = ownLead ? (ownLead.fact.squares ?? []) : (priorLead?.squares ?? []);
  const shares = (sq: readonly string[] | undefined): boolean => (sq ?? []).some((q) => anchor.includes(q));

  const keep: VoiceFact[] = [];
  const spoke: LearnLane[] = [];
  const held: LearnLane[] = [];
  for (const x of survivors) {
    const speak = x === ownLead || LEARN_LANES[x.lane].always === true || shares(x.fact.squares);
    if (speak) {
      keep.push(x.fact);
      if (!spoke.includes(x.lane)) spoke.push(x.lane);
    } else if (!held.includes(x.lane)) held.push(x.lane);
  }
  // The lead OPENS the thought; the rest follow in the package's own order.
  if (ownLead) keep.sort((a, b) => (a === ownLead.fact ? -1 : b === ownLead.fact ? 1 : 0));
  const pkg: VoicePackage = {
    spoken: joinSpoken(keep),
    kept: keep,
    dropped: [
      ...verified.dropped,
      ...survivors.filter((x) => !keep.includes(x.fact)).map((x) => ({ fact: x.fact, reason: 'held — not the lead and shares nothing with it' })),
    ],
  };
  const lead = ownLead ? { lane: ownLead.lane, squares: ownLead.fact.squares ?? [] } : null;
  return { pkg, offered, spoke, lead, held };
}

/** One line for the audit log: which lanes were offered and which spoke. */
export function describeTurnDecision(d: TurnDecision): string {
  return `lanes offered=[${d.offered.join(',')}] spoke=[${d.spoke.join(',')}] lead=${d.lead?.lane ?? '-'} held=[${d.held.join(',')}]`;
}
