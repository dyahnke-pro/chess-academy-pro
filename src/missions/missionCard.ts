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
 */

export type MissionPhase = 'opening' | 'middlegame' | 'endgame';

/** Every mission. A new member fails to compile until the registry
 *  (`registry.ts`, a `Record<MissionId, MissionCard>`) gives it a card. */
export type MissionId = 'develop-and-castle';

/** Why a move missed the mission. */
export type MissReason =
  /** A knight or bishop moved a second time, unforced, before the mission passed. */
  | 'repeat-move'
  /** The student's own king or rook moves took away castling on both sides. */
  | 'castling-lost';

/** How a mission ended in one game — one record row each. */
export type MissionOutcome =
  /** Passed with no miss on the way. Only these count toward graduation. */
  | 'pass-first-try'
  /** Passed after a miss (retried, or played on). */
  | 'pass-retry'
  /** Missed twice at the same decision: the coach showed the move and played on. */
  | 'miss-shown'
  /** The phase ended (the fallback move) before the mission passed. */
  | 'incomplete';

/** What the COACH may do while a card is live. Every dial is REQUIRED, so a
 *  card cannot inherit a posture it never chose. */
export interface CoachDials {
  /** May the coach's reply newly attack a student piece other than a pawn?
   *  (Pawn-on-pawn tension is always allowed.) */
  attacksOnPieces: 'on' | 'off';
  /** May the coach walk into its once-a-game planned trap (the taught slip)? */
  plannedTrap: 'on' | 'off';
}

/** The game as a check reads it: moves only, from the standard start. */
export interface MissionGame {
  /** The game's SAN moves from the standard starting position. */
  sans: readonly string[];
  studentColor: 'w' | 'b';
  /** Plies (0-based index into `sans`) whose miss the student chose to play
   *  on from — the check walks past them. */
  forgiven: ReadonlySet<number>;
}

export interface ShownMove { from: string; to: string }

export type MissionStatus =
  | { state: 'pending' }
  | { state: 'pass'; ply: number }
  | { state: 'miss'; ply: number; reason: MissReason; showMove?: ShownMove };

export interface MissionCard {
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
  passLine: string;
  coachDials: CoachDials;
  unlock: { after: readonly MissionId[] };
  graduate: { firstTryPasses: number };
  /** The student's move number at which a still-pending mission closes as
   *  `incomplete` and the phase is over for mission purposes. */
  closesAtMove: number;
  /** The check's module under `src/missions/checks/` — the gate requires its
   *  `.test.ts` beside it (a card without check tests does not ship). */
  checkModule: string;
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
  at: number;
}
