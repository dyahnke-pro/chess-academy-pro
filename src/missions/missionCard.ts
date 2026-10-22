/**
 * MISSIONS — Learn teaches ONE habit per phase (WO-MISSIONS-01, David
 * 2026-10-21).
 *
 * Learn's narration said too much because every producer asked "is my fact
 * worth hearing?" on its own and nothing owned the turn. A mission owns it:
 * the coach announces one habit for the phase, stays silent while the student
 * plays, rewinds a miss with one FIXED phrase, and celebrates a pass. A new
 * teaching idea is a new CARD — data plus one pure check — never a new code
 * path that speaks. One runner (`missionRunner`) plays any card.
 *
 * A leaf: types only. The check a card carries is pure (chess.js), so the
 * same card can later run as a SILENT WATCHER over a graduated habit — the
 * runner decides whether a card speaks, the card only says what the board did.
 *
 * THE ID UNIONS ARE DECLARATION MAPS (WO-CAMPAIGN-MASTER, Phase 0). Each union
 * is the key set of an interface, so a lane adds its members from its OWN
 * file by module augmentation —
 *
 *   declare module '../missionCard' {
 *     interface MissionIdMap { 'kq-mate': true }
 *     interface MissReasonMap { stalemate: true }
 *   }
 *
 * — and every `Record<…>` keyed by that union (the registry first of all)
 * fails to compile until the new member has its entry. Nobody edits this file
 * to add a card.
 */
import type { SkillMeterId } from '../services/skillMeters';


export type MissionPhase = 'opening' | 'middlegame' | 'endgame';

/** WHICH LEARN THE PAGE IS (David 2026-10-21). `/coach/campaign` — "The
 *  Campaign" — is the missions pilot: the mission owns every turn of the game.
 *  `/coach/teach` is the classic Learn, untouched: its voice is SET ASIDE from
 *  the Campaign, not deleted. One page, two doors; every door declares which. */
export type LearnMode = 'classic' | 'campaign';

/** Every mission. A new member fails to compile until the registry
 *  (`registry.ts`, a `Record<MissionId, MissionCard>`) gives it a card. */
export interface MissionIdMap {
  'develop-and-castle': true;
  'free-piece-stay-ahead': true;
}
export type MissionId = keyof MissionIdMap;

/** Why a move missed the mission. */
export interface MissReasonMap {
  /** A knight or bishop moved a second time, unforced, before the mission passed. */
  'repeat-move': true;
  /** The student's own king or rook moves took away castling on both sides. */
  'castling-lost': true;
  /** The coach left a piece to be won and the student's next move did not take it. */
  'missed-free-piece': true;
  /** Ahead in material, the student let the coach win back 3 or more and drop
   *  the lead below +2. */
  'gave-back-material': true;
}
export type MissReason = keyof MissReasonMap;

/** A curated starting position a phase can begin from when a live game will
 *  not reliably reach the card's target (docs/CAMPAIGN.md §5). */
export interface ScenarioIdMap {
  /** King and queen against a lone king, the student's colour (Level 1 endgame). */
  'kq-vs-k': true;
}
export type ScenarioId = keyof ScenarioIdMap;

/** A board pattern a card steers toward or plants (Lane D owns the checks). */
export interface PatternIdMap {
  'free-piece': true;
  'knight-fork': true;
  'back-rank-mate': true;
  'smothered-mate': true;
  'scholars-mate-defence': true;
  pin: true;
  'kr-box-mate': true;
  'kp-king-in-front': true;
  'connect-rooks': true;
}
export type PatternId = keyof PatternIdMap;

/** A pattern's board check (Lane D writes them; the steer scorer and the boss
 *  scorers read them — one shape for both). PURE: chess.js only. */
export interface PatternDefinition {
  id: PatternId;
  /** Is the pattern on this board for `side` — the side it favours (the one
   *  that can take the free piece, fork, mate, …)? */
  present: (fen: string, side: 'w' | 'b') => boolean;
  /** Boards that look like the pattern with one condition missing; `present`
   *  must say false on every one (the fail twins). */
  failTwins: readonly string[];
}

/** A boss: a named personality closing a tier (docs/CAMPAIGN.md §7). */
export interface BossIdMap {
  /** Tier 1: grabs pawns, leaves pieces loose, neglects its back rank. */
  grabber: true;
}
export type BossId = keyof BossIdMap;

/** Why the coach found no slip to play on a turn (WO-MISSIONS-02, the earned
 *  piece §6a) — counted per turn, logged when the plant window closes empty. */
export type PlantReject =
  /** The coach is in check or can win material itself — that comes first. */
  | 'mid-exchange'
  /** None of the coach's own candidates is a slip: each costs it less than a
   *  mistake, gives check, or leaves a piece hanging (a hand-over). */
  | 'no-slip'
  /** The student's best line after the slip wins no piece. */
  | 'no-line'
  /** It wins a piece, but sooner or later than the dial's depth asks. */
  | 'wrong-depth'
  /** After the line the student does not stand at +2.0 or better. */
  | 'not-winning'
  /** The engine read did not come back inside the cap. */
  | 'no-read';

export type PlantScan = Partial<Record<PlantReject, number>>;

/** The shot a coach's slip left (the earned free piece, §6a). */
export interface PlantedShot {
  /** The square the piece falls on. */
  square: string;
  /** The student's winning line from the slip's board: student first, UCI,
   *  ending on the capture. The coach defends along it. */
  line: readonly string[];
  /** The student's moves before the capture (the `plantDepth` dial). */
  depth: number;
  /** Other first moves the engine rates within 50 cp of the line's — a
   *  student who plays one has not missed the shot. */
  alts: readonly string[];
}

/** What the runner knows about a game beyond its moves. */
export interface MissionContext {
  /** The coach's slip and the ply it was played on. */
  planted?: PlantedShot & { ply: number };
}

/** How a mission ended in one game — one record row each. */
export type MissionOutcome =
  /** Passed with no miss on the way. Only these count toward graduation. */
  | 'pass-first-try'
  /** Passed after a miss (retried, or played on). */
  | 'pass-retry'
  /** Missed twice at the same decision: the coach showed the move and played on. */
  | 'miss-shown'
  /** Missed with no rewind and no word — a silent watcher, or a card whose
   *  `rewinds` dial is `none`. Nothing was shown. */
  | 'missed'
  /** The phase ended (the fallback move) before the mission passed. */
  | 'incomplete';

/** One dial the record can turn, its values easiest first (`ladder.ts`). */
export interface DialRung {
  dial: keyof CoachDials;
  values: readonly CoachDials[keyof CoachDials][];
}

/** What the COACH may do while a card is live. Every dial is REQUIRED, so a
 *  card cannot inherit a posture it never chose. */
export interface CoachDials {
  /** May the coach's reply newly attack a student piece other than a pawn?
   *  (Pawn-on-pawn tension is always allowed.) */
  attacksOnPieces: 'on' | 'off';
  /** May the coach walk into its once-a-game planned trap (the taught slip)? */
  plannedTrap: 'on' | 'off';
  /** Does the coach play ONE slip that lets the student win a piece
   *  (WO-MISSIONS-02, earned §6a)? */
  plantFreePiece: 'on' | 'off';
  /** How deep the student must see to win it: the moves BEFORE the capture
   *  (1 = a key move, the coach's answer, then the capture). On the card's
   *  ladder — the record deepens it (docs/CAMPAIGN.md §6a). */
  plantDepth: 1 | 2 | 3;
  /** How the coach treats equal trades inside its acceptable window: seek
   *  them (games reach the ending sooner), play them normally, or avoid them. */
  trades: 'eager' | 'normal' | 'reluctant';
  /** How a miss is answered. `every-miss`: pause before the coach replies,
   *  the fixed phrase, "Try again" / "Play on". `none`: no pause and no word —
   *  the miss is recorded and the game plays on (boss games, watchers).
   *  `mission-only`: its meaning is David's to set (asked 2026-10-21); until
   *  then the runner treats it as `every-miss`. */
  rewinds: 'every-miss' | 'mission-only' | 'none';
  /** Centipawn-Elo added to the coach's playing strength while the card is
   *  live (negative = softer). 0 = the student's own level. */
  strengthOffset: number;
  /** How hard the coach steers, among moves acceptable at its level, toward
   *  the card's `pattern` (the `steer` scorer). */
  steer: 'off' | 'weak' | 'strong';
}

/** The game as a check reads it: its moves, from the standard start or from
 *  the curated position a scenario phase began on. */
export interface MissionGame {
  /** The game's SAN moves from the starting position (`startFen`, or the
   *  standard start). */
  sans: readonly string[];
  /** A scenario phase's curated position; absent = the standard start. */
  startFen?: string;
  studentColor: 'w' | 'b';
  /** Plies (0-based index into `sans`) whose miss the student chose to play
   *  on from — the check walks past them. */
  forgiven: ReadonlySet<number>;
  /** The ply the card went live; the check judges no earlier ply. */
  startPly: number;
  context?: MissionContext;
}

export interface ShownMove { from: string; to: string }

export type MissionStatus =
  | { state: 'pending' }
  | { state: 'pass'; ply: number }
  | { state: 'miss'; ply: number; reason: MissReason; showMove?: ShownMove }
  /** The card's phase ended on the board (an ending reached) without the pass. */
  | { state: 'incomplete'; ply: number };

/** The short lesson before a NEW idea (Lane C shows it): the idea in one
 *  sentence on one board, a demo played out, then one try. */
export interface MissionBriefing {
  /** The concept is new to a Level 1 student (shown the first time, and the
   *  try step again on reactivation). */
  novel: boolean;
  idea: string;
  demoFen: string;
  demoSans: readonly string[];
  tryFen: string;
  /** Every UCI move that counts as the right answer on `tryFen`. */
  tryAnswersUci: readonly string[];
}

/** When a still-pending card closes `incomplete`: at a fixed student move
 *  number, or a number of the student's moves after it went live (a scenario
 *  phase starts at an unknown move). Exactly one is set. */
export type MissionClosing =
  | { closesAtMove: number; closesAfterMoves?: undefined }
  | { closesAfterMoves: number; closesAtMove?: undefined };

export type MissionCard = MissionCardFields & MissionClosing;

export interface MissionCardFields {
  id: MissionId;
  level: number;
  phase: MissionPhase;
  /** The banner's name for it. */
  title: string;
  /** Said once, at the start of the phase. */
  announce: string;
  /** PURE and deterministic (chess.js only — no engine, no model). */
  check: (game: MissionGame) => MissionStatus;
  /** A short read of how far the student is, for the banner ("2/4 out"). */
  progress: (game: MissionGame) => string;
  /** The move the coach shows after a second miss at one decision: the
   *  engine's preference among the moves the mission wants. `candidatesUci`
   *  is the engine's read of the board before the miss, best first. */
  showMove: (fenBefore: string, studentColor: 'w' | 'b', candidatesUci: readonly string[]) => ShownMove | null;
  /** Said on every miss — FIXED wording, never rotated: repetition builds the habit. */
  missPhrase: string;
  /** A fixed phrase per miss reason, where the card has more than one; a
   *  reason without one says `missPhrase`. */
  missPhraseFor?: Partial<Record<MissReason, string>>;
  passLine: string;
  coachDials: CoachDials;
  /** The dials the record turns for THIS card, easiest value first, in the
   *  order it turns them up (`ladder.ts`). Absent = the shared ladder (the
   *  coach's strength). The earned piece deepens its shot before the coach
   *  plays stronger (docs/CAMPAIGN.md §6a). */
  ladder?: readonly DialRung[];
  unlock: { after: readonly MissionId[] };
  graduate: { firstTryPasses: number };
  /** The check's module under `src/missions/checks/` — the gate requires its
   *  `.test.ts` beside it (a card without check tests does not ship). */
  checkModule: string;
  /** LIVE: judged as the game is played (pure, or one read inside the iOS 2 s
   *  cap). POST: judged only in the recap (deeper reads). CARD SHIP RULE. */
  classification: 'live' | 'post';
  /** The share of games in which the card's target position or plant must
   *  actually occur (audit-measured) before the card ships. */
  arrivalBar: number;
  /** The phase starts from a curated position instead of the live board. */
  scenario?: { providerId: ScenarioId };
  briefing?: MissionBriefing;
  /** The slot's other cards, rotated by practice (Lane B). */
  siblings?: readonly MissionId[];
  /** The skill meter this habit trains — the join a boss reads to find the
   *  student's weakest taught habits (`weakness.ts`); mistake tags reach a
   *  card through the same meter (`METER_OF_TAG`). */
  skill: SkillMeterId;
  /** The pattern the card steers toward or plants. */
  pattern?: PatternId;
}

/** One record row: how one mission went in one game. */
export interface MissionResultRecord {
  /** `${gameId}:${missionId}` — one row per mission per game; a second write
   *  for the same pair overwrites rather than duplicates. */
  id: string;
  gameId: string;
  missionId: MissionId;
  level: number;
  phase: MissionPhase;
  color: 'white' | 'black';
  outcome: MissionOutcome;
  missPly?: number;
  reason?: MissReason;
  /** Cards that plant a free piece: whether one was planted this game (the
   *  arrival-rate audit reads it). */
  plantFound?: boolean;
  /** The phase began from a curated position, not the live game. */
  scenario?: boolean;
  /** A graduated card ran silently over this game (it spoke nothing). */
  watcher?: boolean;
  /** How many ladder steps above the card's own dials the coach played this
   *  game (`ladder.dialLevel`). Graduation counts only passes at the card's
   *  graduation level. Absent on rows written before 2026-10-21 = 0. */
  harder?: number;
  at: number;
}

/** Where a card's dials stand now, turned by the auto-dial loop (Lane B).
 *  Keyed by mission; absent = the card's own dials. */
export interface DialStateRecord {
  missionId: MissionId;
  dials: CoachDials;
  /** The dial moved last — the one a falling first-try rate turns back. */
  lastMoved: keyof CoachDials | null;
  /** When the last step was taken (null = never); the games since are counted
   *  off the record, never kept as a tally that could drift. */
  movedAt: number | null;
  updatedAt: number;
}

/** One boss game (Lane E). */
export interface BossAttemptRecord {
  /** `${bossId}:${gameId}`. */
  id: string;
  bossId: BossId;
  gameId: string;
  result: 'win' | 'draw' | 'loss';
  /** The habits the boss went after, weakest first (revealed in the recap). */
  targeted: MissionId[];
  at: number;
}

/** Did a card's target position or plant occur in a game — the live arrival
 *  count the CARD SHIP RULE reads (Lane D). */
export interface PatternStatRecord {
  /** `${missionId}:${gameId}`. */
  id: string;
  missionId: MissionId;
  patternId: PatternId;
  gameId: string;
  arrived: boolean;
  at: number;
}
