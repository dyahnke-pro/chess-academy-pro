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
import { isProof, type FactProof, type Proof } from './proof';
import { emitLearnTurn } from './coachDecisionEvents';
import { COMPUTER_ROLES } from './computerRoles';
import { buildVoicePackage, joinSpoken, type SpokenLine, type VoiceFact, type VoiceFactKind, type VoicePackage } from './voicePackage';

import { stakeValue, STAKED_FLOOR, type FactStakes } from './factStakes';
import { sameClaim } from './factSelector';
export { buildVoicePackage, describeVoicePackage, keptLines, markableSquares, spokenSentenceKeys } from './voicePackage';
export type { SpokenLine, DrawnLine } from './voicePackage';
export type { VoicePackage, VoiceFactKind } from './voicePackage';
export type { FactStakes } from './factStakes';

export type LearnLane =
  // ── the instant wave, spoken with the coach's reply ──
  | 'gem'
  | 'tactic'
  | 'prophylaxis'
  | 'threat'
  | 'commentary'
  | 'behavior'
  | 'openingIdea'
  | 'openingIdentity'
  | 'trapAhead'
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
  | 'foundMove'
  | 'heldMove'
  | 'slipAnswer'
  | 'moveIntent'
  | 'moveOrder'
  | 'theirMoveCost'
  | 'recapture'
  | 'kingAttack'
  | 'ruleException'
  | 'falseAlarm'
  | 'threatAnswer'
  | 'pushOrHold'
  | 'causalChain'
  | 'kingSafety'
  | 'phase'
  | 'character'
  | 'theirPurpose'
  | 'theirIntent'
  | 'tempo'
  | 'fileRace'
  | 'stalemate'
  | 'countMethod'
  | 'splitPosition'
  | 'timing'
  | 'checkMethod'
  | 'trade'
  | 'kneeJerk'
  | 'blunderCheck'
  | 'autopilot'
  | 'keepPressing'
  | 'pawnEnding'
  | 'strongChoice'
  | 'structureJudgement';

/** Lanes at or below this lead DESCRIBE the board (commentary, behaviour,
 *  the positional read, structure, piece quality) — the tier the scoreboard
 *  found we over-say. */
export const DESCRIPTION_LEAD = 40;

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

/** A lane's place in the DNA beat. */
export type DnaBeat = 'name' | 'affirm' | 'but' | 'refute' | 'their' | 'point' | 'verdict' | 'now';
const BEAT_ORDER: Record<DnaBeat, number> = { name: 0, affirm: 1, but: 2, refute: 3, their: 4, point: 5, verdict: 6, now: 7 };

/** Every lane answers where it sits in the DNA beat — a new lane fails to
 *  compile until it does. */
export const DNA_BEAT: Record<LearnLane, DnaBeat> = {
  opening: 'name', openingIdentity: 'name',
  foundMove: 'affirm', heldMove: 'affirm', slipAnswer: 'affirm', movePoint: 'affirm', moveIntent: 'affirm', recapture: 'affirm', kingAttack: 'affirm',
  ruleException: 'affirm', fileRace: 'affirm', trade: 'affirm', timing: 'affirm', strongChoice: 'affirm',
  falseAlarm: 'affirm', tempo: 'affirm', pushOrHold: 'affirm',
  mistake: 'but', drawback: 'but', fundamental: 'but', register: 'but', rejectedTempting: 'but', kneeJerk: 'but',
  moveOrder: 'refute', causalChain: 'refute',
  theirPurpose: 'their', theirIntent: 'their', theirMoveCost: 'their', coachMistake: 'their', gap: 'their',
  tactic: 'point', planArc: 'point', structureJudgement: 'point', openingIdea: 'point', structure: 'point', pieceQuality: 'point',
  positionFacts: 'point', commentary: 'point', positional: 'point', kingSafety: 'point', splitPosition: 'point',
  behavior: 'point',
  phase: 'verdict', character: 'verdict',
  threat: 'now', threatAnswer: 'now', prophylaxis: 'now', gem: 'now', trapAhead: 'now', priorityFirst: 'now', countMethod: 'now',
  checkMethod: 'now', stalemate: 'now', blunderCheck: 'now', autopilot: 'now', keepPressing: 'now', pawnEnding: 'now',
};

export const LEARN_LANES: Record<LearnLane, LaneRule> = {
  gem: { kind: 'gem', why: 'a verified punish the coach just handed over', lead: 100, always: true },
  tactic: { kind: 'tactic', why: 'a tactic the detectors proved for the student', lead: 90, always: true },
  threat: { kind: 'threat', why: 'danger to the student on this board', lead: 95, always: true },
  commentary: { kind: 'computed', why: 'the computed board read (playCommentary)', lead: 30 },
  behavior: { kind: 'observation', why: 'a Danya behaviour, rate-matched to his corpus', lead: 25 },
  // The opening's plan counted off master games (P2 #0): the break each side
  // actually goes for, with its share. Computed, never authored.
  openingIdea: { kind: 'computed', why: 'the pawn break master games from here go for, with its share', lead: 61 },
  // What the opening IS (the identity computer): what it provokes, the
  // structure its master main line reaches, a lasting gambit, sharpness, OTB
  // master games. Said once per game, right after the name.
  // Rides with the name (walk 2026-09-30, game 1: held all game because it
  // shares no square with the move being discussed).
  openingIdentity: { kind: 'computed', why: 'what the named opening provokes, aims for and costs — computed from the master database', lead: 44, always: true },
  // Practical lore: the student's natural move here is a known, engine-verified
  // trap (a curated gem). Said BEFORE the move; names the move to be careful
  // with, never the refutation.
  trapAhead: { kind: 'computed', why: 'a natural-looking move here is a known trap club players fall into', lead: 73 },
  positional: { kind: 'observation', why: 'the positional read', lead: 25 },
  opening: { kind: 'opening', why: 'the opening named once, when it settles', lead: 45, always: true },
  structure: { kind: 'computed', why: 'the named pawn structure and its plan', lead: 40 },
  pieceQuality: { kind: 'computed', why: 'their best piece / your worst piece', lead: 35 },
  register: { kind: 'computed', why: 'but-turn / hedge / candidate compare, where the move is earned', lead: 64 },
  gap: { kind: 'computed', why: 'what the opponent’s move left undone', lead: 60 },
  positionFacts: { kind: 'computed', why: 'position facts, already through coachDecider', lead: 50 },
  priorityFirst: { kind: 'computed', why: 'the priority before the move', lead: 68 },
  // PROPHYLAXIS (census rank 2): the quiet move that stops their pin or kick before it lands.
  prophylaxis: { kind: 'computed', why: 'the quiet move that stops their next pin or kick before it lands', lead: 66 },
  rejectedTempting: { kind: 'computed', why: 'the tempting move and its refutation', lead: 66 },
  // Behind the walkability check (2026-09-29): walk 2 heard 3 false lines in 4
  // — routes read off one engine line the CURRENT board cannot walk. Learn
  // filters aims through planArc.aimWalkableNow, and a student plan the
  // student never heard is never "let go".
  // Always rides (2026-09-30): it spoke 0 times in 252 walked plies, held
  // behind every stronger lead, though the computer fired 41 times offline on
  // 20 of his games. Their plan advancing IS the why of their move.
  planArc: { kind: 'plan', why: 'the plan taking shape / advancing / landing / given up — read twice, walkable from this board', lead: 70, always: true },
  // THE VERDICT ON THE STUDENT'S OWN MOVE always rides (Learn walk
  // 2026-10-01, game 1: …Rf6 threw −0.2 → −2.9 and the turn spoke only the
  // back-rank warning — the grade shared no square with it, so it was held).
  // backwardLook returns ONE of these two per move, so this adds one sentence.
  drawback: { kind: 'drawback', why: 'what the student’s own move handed over', lead: 83, always: true },
  mistake: { kind: 'mistake', why: 'the mistake call-out', lead: 85, always: true },
  coachMistake: { kind: 'coachMistake', why: 'the coach owning its own inaccuracy', lead: 84 },
  fundamental: { kind: 'drawback', why: 'the fundamental the move broke', lead: 82 },
  movePoint: { kind: 'computed', why: 'the point of the student’s clean move', lead: 62 },
  // The verdict on a GOOD move at a decision moment (P2 #2): the student found
  // one of the only moves that held, and why the others failed.
  foundMove: { kind: 'computed', why: 'the student found one of the only moves that held — and why the rest failed', lead: 79 },
  // THE ANSWER TO A HELD QUESTION (David 2026-10-02): at a deciding moment the
  // move was held back; once the student has played, it is revealed with its
  // reason. Always rides — a question posed and never answered is a tease.
  heldMove: { kind: 'computed', why: 'the move held back at a deciding moment, revealed after the student answered', lead: 80, always: true },
  slipAnswer: { kind: 'computed', why: 'the answer to the opponent\'s slip, revealed after the student moved from the board the coach said to look at', lead: 80, always: true },
  // What a quiet move is FOR — the reply it took away or the move it made
  // possible, both engine-proven (moveIntent). His most frequent point on a
  // clean move, and the one a board description never says.
  moveIntent: { kind: 'computed', why: 'what the student’s move prevents or prepares, engine-proven', lead: 75 },
  // "X first — Y straight away would have run into R" (census #1, his most
  // frequent missing point). Engine-proven by playing the follow-up first.
  // What THEIR move cost them (census #5): a hole your knight can use, their
  // own bishop shut in, castling given up, lasting structural damage.
  // Which piece takes back, and why (census #8): the file it opens, the
  // doubled pawn it avoids, the queen that would be hit with tempo.
  // Bringing pieces to their king (census #2): a shelter pawn taken, a
  // defender removed, a piece brought over or heading there next.
  kingAttack: { kind: 'computed', why: 'how the student’s move adds to the attack on their king', lead: 76 },
  // A rule broken for a reason (census #10): the same piece twice, a pawn in
  // front of your own king, the queen out early — the engine agrees, and the
  // board says why here.
  // Don't panic (census #7): their threat was real, the engine's move ignored
  // it, and the student played that move — "you didn't have to react".
  // Push for a win or hold (census #14): what a pawn up or down is worth in
  // THIS ending, while the engine keeps it better-not-won / worse-not-lost.
  pushOrHold: { kind: 'computed', why: 'whether the ending is worth pressing or holding, by its type', lead: 60 },
  // The answer to the threat the instant wave just named (census T4): question
  // first, then what the engine's move does about it. Always rides — a threat
  // said without its answer is the describing he never does.
  threatAnswer: { kind: 'computed', why: 'what to do about the threat just named — take, step out, kick, block, guard, or it can wait', lead: 81, always: true },
  falseAlarm: { kind: 'computed', why: 'a threat the student rightly ignored, and what answers it', lead: 72 },
  ruleException: { kind: 'computed', why: 'a beginner’s rule the move breaks, and why it is right here', lead: 73 },
  recapture: { kind: 'computed', why: 'which piece takes back and why — compared with the other recapture', lead: 66 },
  theirMoveCost: { kind: 'computed', why: 'what the opponent’s move cost them that the student can use', lead: 74 },
  moveOrder: { kind: 'computed', why: 'why the move had to come first — the follow-up played first loses material', lead: 77 },
  // ALWAYS rides: a switch is said once, the move it happens — held behind a
  // threat it is lost for good (Fried Liver walk 2026-09-29: the turn to sharp
  // came WITH the threat, lost the lead to it, and was never heard).
  character: { kind: 'computed', why: 'what the position is about just changed — tactical, positional, converting or holding', lead: 73, always: true },
  // THEIR MOVE'S PURPOSE (hand walk 2026-09-30, Ruy …g6: "g6 has a point: it
  // stops the mate with Qxh7" was HELD behind "Qd3 takes aim at the center" —
  // both rode `positionFacts` and offer order picked). The scoreboard's
  // "their move's purpose" is one of his biggest teaching kinds (4% landed);
  // it is what just happened, so it outranks every description.
  theirPurpose: { kind: 'computed', why: "what the opponent's move was FOR — the threat of yours it stopped", lead: 74 },
  // What their QUIET move prepares (P2 #5), engine-proven from their seat.
  theirIntent: { kind: 'computed', why: "what the opponent's quiet move prepares — engine-proven from their seat", lead: 73 },
  // TEMPO, COUNTED (P2 #7): their piece's third move while the student develops.
  // The contested open file, taken by the student's rook (planRace, live).
  fileRace: { kind: 'computed', why: 'you both wanted the open file and your rook took it first', lead: 64 },
  tempo: { kind: 'computed', why: 'their piece keeps moving in the opening while you develop — free moves, counted', lead: 70 },
  // A STRONG PLAYER'S CHOICE (P3, depersonalized): what a strong player plays here.
  strongChoice: { kind: 'computed', why: 'what a strong player chooses in this exact position, from real games', lead: 57 },
  // THE SAFETY HABITS (P3 method beats): close the beat after the grade.
  blunderCheck: { kind: 'computed', why: 'the move left a piece they simply took — the habit that catches it', lead: 61 },
  autopilot: { kind: 'computed', why: 'the popular move here cost — the moment to stop and check', lead: 59 },
  keepPressing: { kind: 'computed', why: 'winning, and a slow move gave them time — keep forcing', lead: 58 },
  pawnEnding: { kind: 'computed', why: 'the last pieces came off — count the pawn ending; the outside passer is a decoy', lead: 62 },
  // QUESTION THE KNEE-JERK (P3 method beat): closes the beat after the grade.
  kneeJerk: { kind: 'computed', why: 'the reflex recapture cost — ask what comes first', lead: 60 },
  // WAS THE TRADE A GOOD DEAL (P3, T3 #45).
  trade: { kind: 'computed', why: 'the trade you just made — good or bad deal, and why', lead: 68 },
  // THREE WAYS TO MEET CHECK (P3 method beat): once per game, before the student moves.
  checkMethod: { kind: 'computed', why: 'you are in check and the king move is not the best answer — list all three', lead: 78 },
  // THE TIMING (P3, parity with review): the move is right NOW because of what came first.
  timing: { kind: 'computed', why: 'why this move works now and did not a move earlier', lead: 69 },
  // STALEMATE WATCH (P2 #9): the one move that throws away a won game.
  // Count before you take (P3 how-to-calculate): a real exchange square, the count said.
  // Split the position (P3 method beat): opposite-side castling, two races.
  splitPosition: { kind: 'computed', why: 'the kings are on opposite wings — the board is two races', lead: 66 },
  countMethod: { kind: 'computed', why: 'an exchange is on — count attackers against defenders before you take', lead: 77 },
  stalemate: { kind: 'computed', why: 'you are winning and one of your moves would stalemate them', lead: 81 },
  phase: { kind: 'computed', why: 'the game has changed phase — take stock of what the position is about now', lead: 72 },
  kingSafety: { kind: 'observation', why: 'your own king is still in the centre and castling is ready', lead: 55 },
  // THE STRUCTURE JUDGEMENTS (batch 6, `structureReads`): the second weakness,
  // the key pawn, the semi-outpost, the right piece, the route that fails, the
  // fighting line — a plan-layer reason, proven by its squares or its line.
  // Below what a move is FOR, above the board descriptions.
  structureJudgement: { kind: 'computed', why: 'a structural judgement — the weakness to aim at, the square, the piece, the route or the plan — proven on the board', lead: 54 },
  causalChain: { kind: 'tactic', why: 'a cross-move cause proven on the board — the earlier move that left the piece loose', lead: 80 },
};

export interface LaneFact {
  lane: LearnLane;
  text: string;
  fen: string;
  squares?: readonly string[];
  /** The lines the sentence says — see `VoiceFact.lines`. */
  lines?: readonly SpokenLine[];
  /** Only for lanes whose producer decides the kind itself (the backward look
   *  returns drawback | mistake | coachMistake). */
  kind?: VoiceFactKind;
  /** The claims this line makes, so a claim already said is dropped (the
   *  claim ledger, `voicePackage`). */
  claims?: readonly string[];
  /** What rides on it (`factStakes`) — the door orders by this first. */
  stakes?: FactStakes;
  /** ITS PROOF, OR WHY IT NEEDS NONE — REQUIRED (root cause, David
   *  2026-10-07): a producer that cannot answer this cannot speak. */
  proof: FactProof;
}

/** DANGER speaks first, whatever else is on the board (David 2026-10-05:
 *  "threat first"): an insight before "your knight is attacked" is backwards. */
export const DANGER_LANES: ReadonlySet<LearnLane> = new Set<LearnLane>(['threat', 'threatAnswer']);

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
  /** Lanes that spoke their SHORT phrasing because the student's own record
   *  proves the skill (David 2026-09-30: "Short phrasing when green"). */
  faded: LearnLane[];
  /** THE PROOF LEDGER — the same contract as `CoachDecision` (one coach P1,
   *  2026-10-07): the proof of every fact that SPOKE, keyed by its spoken
   *  text, and the lanes that spoke a conclusion on the `stated` escape. */
  proofOf: ReadonlyMap<string, Proof>;
  unproven: number;
  unprovenLanes: LearnLane[];
}

/** THE FADE. A lane that teaches a skill the student has PROVEN (green on the
 *  heat map — `capabilityProven`) says only its first sentence: the point, not
 *  the lesson again. Not a cap (G4.5): the student's own record decides, and
 *  grey or red keeps the full teaching. Only lanes whose HELD half is wired
 *  fade — a skill the app cannot see the student answer can never be green. */
export function fadeWhenGreen(lane: LearnLane, text: string, green: ReadonlySet<string> | null): string {
  if (!green || green.size === 0) return text;
  const role = COMPUTER_ROLES[lane];
  if (!role || !role.tag || role.held.state !== 'wired' || !green.has(role.tag)) return text;
  const first = text.split(/(?<=[.!?])\s+(?=[A-Z"“])/)[0];
  return first && first.length < text.length ? first : text;
}

/** Lanes that always ride for a beginner: the principle, said every time. */
export const BEGINNER_ALWAYS: ReadonlySet<LearnLane> = new Set<LearnLane>(['fundamental', 'ruleException']);

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
  /** The tags the student's record has PROVEN (`loadProvenTags`) — lanes on
   *  them fade to their short phrasing. Null when the record is not loaded. */
  green?: ReadonlySet<string> | null,
  /** Beginner mode (`isBeginnerMode`): the fundamental behind a slip and the
   *  beginner's rule a move breaks ride every turn instead of competing for
   *  the lead (David 2026-10-02: "Explain fundamentals"). Register only — the
   *  other lanes decide exactly as for anyone else. */
  beginner = false,
): TurnDecision {
  const offered: LearnLane[] = [];
  const faded: LearnLane[] = [];
  const open: Array<VoiceFact & { lane: LearnLane }> = [];
  for (const f of facts) {
    if (!f.text.trim()) continue;
    offered.push(f.lane);
    const text = fadeWhenGreen(f.lane, f.text, green ?? null);
    if (text !== f.text && !faded.includes(f.lane)) faded.push(f.lane);
    open.push({ lane: f.lane, kind: f.kind ?? LEARN_LANES[f.lane].kind, text, fen: f.fen, squares: f.squares, claims: f.claims, lines: f.lines, proof: f.proof });
  }
  const verified = buildVoicePackage(open.map(({ kind, text, fen, squares, claims, lines }) => ({ kind, text, fen, squares, claims, lines })), alreadySaid, priorKeys);
  // Which lane each surviving fact came from (the package may trim the text).
  const laneOf = (k: VoiceFact): LearnLane | undefined =>
    open.find((o) => o.text === k.text || (k.text.length > 0 && o.text.includes(k.text)))?.lane;
  const survivors = verified.kept
    .map((k) => ({ fact: k, lane: laneOf(k) }))
    .filter((x): x is { fact: VoiceFact; lane: LearnLane } => x.lane !== undefined);

  // ONE ORDER, NO HOLD (David 2026-10-05: "If there are 5 important facts or a
  // plan that comes from the move then the user needs to hear it"). The door
  // no longer picks one thought and holds the rest: every survivor of the
  // package speaks. What decides the SEQUENCE is computed, not a lane table:
  //   1. danger first (the threat, and what to do about it);
  //   2. then the fact with the most at stake (`factStakes.stakeValue`);
  //   3. then the rest in his turn grammar (the DNA beat), stakes first
  //      inside a beat, the lane table only as the tie-break for facts that
  //      carry no stakes.
  const stakeOf = (lane: LearnLane, text: string): number => {
    const f = open.find((o) => o.lane === lane && (o.text === text || o.text.includes(text)));
    const st = f ? facts.find((x) => x.lane === lane && x.text.trim() && (x.text === f.text || fadeWhenGreen(x.lane, x.text, green ?? null) === f.text))?.stakes : undefined;
    return stakeValue(st) ?? 0;
  };
  const value = (x: { fact: VoiceFact; lane: LearnLane }): number => stakeOf(x.lane, x.fact.text) || LEARN_LANES[x.lane].lead;
  // ONE CLAIM, ONE SEAT (unity U6, Learn walk #26: the d5 pawn was "a
  // discovered attack in waiting" for them AND "pinned by your rook" — one
  // geometry read from both sides). Facts about the same squares collapse to
  // the one that matters: danger first, then the bigger stake. Squares are
  // the facts' own, coupled at emission — never read back out of the prose.
  const subsumed = new Set<{ fact: VoiceFact; lane: LearnLane }>();
  for (const a of survivors) {
    if (subsumed.has(a)) continue;
    for (const b of survivors) {
      if (a === b || subsumed.has(b)) continue;
      if (!sameClaim({ sq: a.fact.squares ?? [], family: null }, { sq: b.fact.squares ?? [], family: null })) continue;
      const ad = DANGER_LANES.has(a.lane); const bd = DANGER_LANES.has(b.lane);
      // A MOVE'S VERDICT IS ITS OWN CLAIM: its cost ("it left e5 short of a
      // defender") shares squares with what the move does ("it attacks e5")
      // and is not the same claim. One geometry read from two seats (a pin
      // and the discovery behind it) still collapses; danger still subsumes.
      if (!ad && !bd && (DNA_BEAT[a.lane] === 'but') !== (DNA_BEAT[b.lane] === 'but')) continue;
      const loser = ad !== bd ? (ad ? b : a) : value(b) > value(a) ? a : b;
      subsumed.add(loser);
      if (loser === a) break;
    }
  }
  let top: { fact: VoiceFact; lane: LearnLane } | null = null;
  for (const x of survivors) {
    if (subsumed.has(x)) continue;
    if (!top) { top = x; continue; }
    const xd = DANGER_LANES.has(x.lane); const td = DANGER_LANES.has(top.lane);
    if (xd !== td) { if (xd) top = x; continue; }
    if (value(x) > value(top)) top = x;
  }
  const priorValue = priorLead ? LEARN_LANES[priorLead.lane].lead : -1;
  const ownLead = top && (!priorLead || DANGER_LANES.has(top.lane) || value(top) > priorValue) ? top : null;
  const anchor = ownLead ? (ownLead.fact.squares ?? []) : (priorLead?.squares ?? []);

  const keep: VoiceFact[] = [];
  const spoke: LearnLane[] = [];
  const held: LearnLane[] = [];
  for (const x of survivors) {
    // A DESCRIPTION — nothing at stake, from a lane that describes the board
    // (or an unstaked board-read riding position facts) — speaks only as
    // SUPPORT: it must touch the lead's squares AND add one of its own. "Your
    // queen on d3 takes aim at the center" beside "g6 stops the mate" is the
    // board described where he explains the move (hand walks 2026-09-30).
    // Everything staked or teaching speaks, however many there are.
    const describes = x !== ownLead && stakeOf(x.lane, x.fact.text) === 0 && !(beginner && BEGINNER_ALWAYS.has(x.lane))
      && (LEARN_LANES[x.lane].lead <= DESCRIPTION_LEAD || x.lane === 'positionFacts');
    const sq = x.fact.squares ?? [];
    const restates = describes && !(sq.some((q) => anchor.includes(q)) && sq.some((q) => !anchor.includes(q)));
    // A DANGER TURN STAYS ON THE DANGER (prod tape 2026-10-06: a hanging queen
    // and, in the same breath, a slow-plan test and "leave the capture hanging
    // over them" — 171 words). While a threat leads, another fact speaks if it
    // touches the danger's squares, is bigger news by stake, or must ride;
    // the rest waits for a calm board. Relevance, not a count.
    const offTopic = !!ownLead && DANGER_LANES.has(ownLead.lane) && x !== ownLead && !DANGER_LANES.has(x.lane)
      // A must-ride lane still rides — unless it is a board IDEA (the point
      // beat: their plan, the structure), which keeps until the board calms.
      && (LEARN_LANES[x.lane].always !== true || DNA_BEAT[x.lane] === 'point') && !(beginner && BEGINNER_ALWAYS.has(x.lane))
      && !sq.some((q) => anchor.includes(q)) && value(x) < value(ownLead);
    // IMPORTANT IS COMPUTED, NOT COUNTED (David 2026-10-06: "if there are 5
    // important facts … the user needs to hear it" AND "it must not be
    // laborious"). With no hold at all a turn ran 80–95 words a move (prod,
    // 25-move game) against his 35–50. A fact that neither supports the lead
    // (shares a square) nor must ride speaks when it is IMPORTANT: at least a
    // pawn at stake (`factStakes`, discounted by distance). Five such facts,
    // five sentences; a pile of small asides waits.
    const important = stakeOf(x.lane, x.fact.text) >= STAKED_FLOOR + 100;
    const aside = !!ownLead && x !== ownLead && !DANGER_LANES.has(x.lane)
      && LEARN_LANES[x.lane].always !== true && !(beginner && BEGINNER_ALWAYS.has(x.lane))
      && !sq.some((q) => anchor.includes(q)) && !important;
    if (subsumed.has(x)) { if (!held.includes(x.lane)) held.push(x.lane); continue; }
    if (!restates && !offTopic && !aside) {
      keep.push(x.fact);
      if (!spoke.includes(x.lane)) spoke.push(x.lane);
    } else if (!held.includes(x.lane)) held.push(x.lane);
  }
  const laneFor = (f: VoiceFact): LearnLane | undefined => survivors.find((x) => x.fact === f)?.lane;
  const beatOf = (f: VoiceFact): number => {
    const lane = laneFor(f);
    return lane ? BEAT_ORDER[DNA_BEAT[lane]] : BEAT_ORDER.point;
  };
  const tier = (f: VoiceFact): number => {
    const lane = laneFor(f);
    if (lane && DANGER_LANES.has(lane)) return 0;
    return ownLead && f === ownLead.fact ? 1 : 2;
  };
  const worth = (f: VoiceFact): number => { const lane = laneFor(f); return lane ? value({ fact: f, lane }) : 0; };
  keep.sort((a, b) => tier(a) - tier(b) || beatOf(a) - beatOf(b) || worth(b) - worth(a));
  const pkg: VoicePackage = {
    spoken: joinSpoken(keep),
    kept: keep,
    dropped: [
      ...verified.dropped,
      ...survivors.filter((x) => !keep.includes(x.fact)).map((x) => ({ fact: x.fact, reason: 'a description that adds nothing to the lead' })),
    ],
  };
  const lead = ownLead ? { lane: ownLead.lane, squares: ownLead.fact.squares ?? [] } : null;
  // THE PROOF LEDGER over what spoke — the proof travels with the fact from
  // its producer (`LaneFact.proof`), never re-derived.
  const proofOf = new Map<string, Proof>();
  const unprovenLanes: LearnLane[] = [];
  for (const k of keep) {
    const lane = laneFor(k);
    const src = lane ? open.find((o) => o.lane === lane && (o.text === k.text || o.text.includes(k.text))) : undefined;
    if (!src) continue;
    if (isProof(src.proof)) proofOf.set(k.text, src.proof);
    else if (src.proof && src.proof.none === 'stated' && lane && !unprovenLanes.includes(lane)) unprovenLanes.push(lane);
  }
  // EMIT every decision (the algo-audit rule): a door whose decisions cannot be
  // inspected can only be judged by reading the tape.
  if (offered.length > 0) emitLearnTurn({ offered: [...offered], spoke: [...spoke], lead: lead?.lane ?? null, held: [...held], faded: [...faded], unproven: unprovenLanes.length, unprovenLanes: [...unprovenLanes] });
  return { pkg, offered, spoke, lead, held, faded, proofOf, unproven: unprovenLanes.length, unprovenLanes };
}

/** One line for the audit log: which lanes were offered and which spoke. */
export function describeTurnDecision(d: TurnDecision): string {
  return `lanes offered=[${d.offered.join(',')}] spoke=[${d.spoke.join(',')}] lead=${d.lead?.lane ?? '-'} held=[${d.held.join(',')}]`;
}
