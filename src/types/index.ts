// ─── Puzzle ──────────────────────────────────────────────────────────────────

/** The chess piece that moves first in a puzzle (i.e. the solver's
 *  first move). Computed at curation time by applying the puzzle's
 *  first UCI move via chess.js — see scripts/tag-puzzle-moving-piece.mjs.
 *  Required by the kid section's per-piece puzzle filter (Lichess's
 *  `moves` field is UCI, not SAN, so the SAN's piece letter can't be
 *  derived without parsing the position). 'P' covers pawn pushes,
 *  pawn captures, and promotions; 'K' covers castling. */
export type MovingPiece = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

export interface PuzzleRecord {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  openingTags: string | null;
  popularity: number;
  nbPlays: number;
  /** First-move piece. Optional for backward compat with any
   *  pre-tagged puzzle records still hanging around in Dexie;
   *  the curated `puzzles.json` always populates it. */
  movingPiece?: MovingPiece;
  /** Provenance. 'lichess' = the CC0 Lichess puzzle DB (default for
   *  records in `puzzles.json`). 'training' = the hand-crafted /
   *  procedurally-generated sub-400 ELO pool that lives in
   *  `training-puzzles.json` — used by kid mode to bridge the gap
   *  between rating 100 (kid floor) and 400 (Lichess floor).
   *  'master' = the elite (2400+) CC0 pool lazy-fetched from
   *  `public/data/master-puzzles.json` for the Master Level ladder
   *  (see reachRating.ts + the 2026-09-14 reach-ladder plan). */
  source?: 'lichess' | 'training' | 'master';
  // SRS fields
  srsInterval: number;
  srsEaseFactor: number;
  srsRepetitions: number;
  srsDueDate: string;
  srsLastReview: string | null;
  userRating: number;
  attempts: number;
  successes: number;
}

// ─── Mistake Puzzles ─────────────────────────────────────────────────────────

export type MistakeClassification = 'inaccuracy' | 'mistake' | 'blunder' | 'miss';
export type MistakePuzzleStatus = 'unsolved' | 'solved' | 'mastered';
/** WHERE the game a slip came from was played. Mirrors `GameSource` minus
 *  `'master'` (a master game is never the student's, so it never writes a
 *  puzzle). `'import'` = a pasted PGN (2026-09-22, C9): it used to be
 *  unexpressible here, so every pasted game's slips were labelled "Coach". */
export type MistakePuzzleSourceMode = 'coach' | 'lichess' | 'chesscom' | 'import';
export type MistakeGamePhase = 'opening' | 'middlegame' | 'endgame';

export interface MistakeNarration {
  intro: string;
  moveNarrations: string[];
  outro: string;
  conceptHint: string; // Conceptual hint when player makes wrong move (e.g. "Think about reinforcing the center")
}

export interface MistakePuzzle {
  id: string;
  fen: string;
  playerMove: string;
  playerMoveSan: string;
  bestMove: string;
  bestMoveSan: string;
  moves: string;
  cpLoss: number;
  classification: MistakeClassification;
  gamePhase: MistakeGamePhase;
  moveNumber: number;
  sourceGameId: string;
  sourceMode: MistakePuzzleSourceMode;
  playerColor: 'white' | 'black';
  promptText: string;
  narration: MistakeNarration;
  createdAt: string;
  // Game context fields
  opponentName: string | null;
  gameDate: string | null;
  openingName: string | null;
  evalBefore: number | null;
  // SRS fields
  srsInterval: number;
  srsEaseFactor: number;
  srsRepetitions: number;
  srsDueDate: string;
  srsLastReview: string | null;
  status: MistakePuzzleStatus;
  attempts: number;
  successes: number;
  tacticType?: TacticType | null;
  /** The classifier revision that last computed `tacticType`
   *  (`TACTIC_TYPE_REV`, tacticTypeBackfill). Rows behind the current rev are
   *  re-tagged on boot through the ONE unified classifier so a student's
   *  weakness buckets never rest on the retired geometry tags. Absent on rows
   *  written before 2026-09-15. Additive, unindexed — no schema bump. */
  tacticTypeRev?: string;
  /** Set when the backfill could not recompute (inputs missing/illegal); the
   *  stored tag is KEPT, never guessed. */
  tacticTypeFlag?: 'no-inputs' | null;
  /** Positional-transformation motif (Phase 4) when the mistake is a trade
   *  error rather than a tactic — buckets it as its own "Unfavorable trades" /
   *  "Missed favorable trades" weakness instead of a generic phase bucket.
   *  Absent for tactical / other mistakes. */
  positionalMotif?: 'unfavorable-trade' | 'missed-favorable-trade' | null;
  /** Last solve-attempt duration in ms. Populated by gradeMistakePuzzle
   *  from the board's elapsedMs timer. Drives /weaknesses aggregation:
   *  "slow on skewers" / "fast on forks". Always recorded regardless
   *  of the visible-clock toggle — that's the whole point of the
   *  background-mode default. */
  lastSolveTimeMs?: number;
  /** Best (fastest correct) solve time in ms across all attempts.
   *  Null if never solved correctly. */
  bestSolveTimeMs?: number;
  /** Rolling history of solve times in ms (most-recent first, capped
   *  at the last 10 attempts to keep the record small). */
  solveTimes?: number[];
}

// ─── Find-the-Square (board-vision drill) ──────────────────────────────────

/** A single click during the Find-the-Square drill. David's spec
 *  2026-05-19: blank board, single pawn (a2 white / h7 black) shows
 *  the student's color, target square pops up, user clicks. Each
 *  click is logged — timing + correctness feed the /weaknesses
 *  aggregator as "blind squares" insights ("you're slow on g5, b3").
 *
 *  No adaptive tier system: every round is a random square. Sequence
 *  mode grows the per-round chain length as streak holds (2 → 3 → 4
 *  → 5); single mode is one square per round always. */
export interface FindSquareAttempt {
  id: string;
  timestamp: number;
  /** Student's playing color — drives pawn placement (a2 for white,
   *  h7 for black) and board orientation (pawn always at bottom). */
  color: 'white' | 'black';
  /** The square that was prompted (algebraic SAN, e.g. "h7"). */
  target: string;
  /** The square the student actually clicked. Equals `target` when
   *  `correct` is true. */
  clicked: string;
  correct: boolean;
  /** Time from target-shown to click in ms. */
  durationMs: number;
  /** Whether the rank/file coordinate ribbon was visible on the board
   *  when the student clicked. Surface toggle, persisted per-profile. */
  coordsShown: boolean;
  /** Voice mode = the coach spoke the target audibly instead of (or
   *  in addition to) showing it as text. */
  voiceMode: boolean;
  /** "single" = one square per round. "sequence" = N squares chained;
   *  the student must click them in order. */
  mode: 'single' | 'sequence';
  /** When mode === 'sequence', the total length of this round's
   *  sequence. Grows with streak: 2 → 3 → 4 → 5. */
  sequenceLength?: number;
  /** 0-based index within the sequence this attempt covers. */
  sequenceIndex?: number;
  /** Streak count at the START of this attempt (before grading). */
  streakBefore: number;
}

// ─── Opening Annotations ────────────────────────────────────────────────────

export interface AnnotationArrow {
  from: string;
  to: string;
  color?: string; // defaults to 'green' if omitted
  delay?: number; // seconds after annotation appears (default 0 = immediate)
}

export interface AnnotationHighlight {
  square: string;
  color?: string; // defaults to 'rgba(255, 255, 0, 0.4)' if omitted
  delay?: number; // seconds after annotation appears (default 0 = immediate)
}

export interface OpeningMoveAnnotation {
  san: string;
  /** Display annotation text (shown in the AnnotationCard). */
  annotation: string;
  /** Optional voice-narration text for this move. When present, the walkthrough
   *  will speak this string instead of `annotation` so the spoken script can
   *  diverge from the display text (e.g. simpler grammar, no abbreviations).
   *  When absent, callers fall back to a derived form of `annotation`. */
  narration?: string;
  /** Shorter narration used for higher speed tiers (Study/Review). When absent,
   *  the speed-tier sentence trim from `annotation` is used as today. */
  shortNarration?: string;
  pawnStructure?: string;
  plans?: string[];
  alternatives?: string[];
  moveOrderNote?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
  /** Optional one-sentence coach hint surfaced when the user asks for help. */
  coachHint?: string;
  /** Stockfish evaluation in centipawns at this move (positive = white better). */
  evaluation?: number;
}

// ─── Lesson Scripts (story-first master class) ────────────────────────────

/**
 * A LessonScript is a STORY-FIRST teaching unit: the narration is the
 * spine, and the board obeys it. Each beat shows a position (reached by
 * playing `moves` from the start), draws optional arrows / highlights,
 * and speaks `say`. Because every beat is an independent position
 * snapshot, the script can move pieces, rewind to an earlier position,
 * or branch to a sideline and come back — things a PGN-locked
 * walkthrough cannot do. Played by useStrictNarration (voice-gated).
 */
export interface LessonBeat {
  id: string;
  /** SAN moves from the start position that produce the shown position.
   *  A beat may rewind (fewer moves than the previous beat) or branch
   *  (a different line) — that's the whole point. */
  moves: string[];
  /** Spoken + displayed narration for this beat. The story, not the move. */
  say: string;
  /** Shorter spoken form for fast playback tiers. */
  sayShort?: string;
  /** Piece-vision / threat / intent arrows. Never drawn from a pawn. */
  arrows?: AnnotationArrow[];
  /** Key-square / pawn-idea / target highlights. */
  highlights?: AnnotationHighlight[];
  /** Board orientation for this beat (defaults to the script's side). */
  orientation?: 'white' | 'black';
}

export interface LessonScript {
  openingId: string;
  title: string;
  /** Approximate spoken length, minutes. Keep opening classes ≤ 15. */
  minutes: number;
  /** Default board orientation. */
  orientation: 'white' | 'black';
  beats: LessonBeat[];
  /** Lesson shape (David 2026-05-22 — depth gate). Default is `variation`
   *  (a real teachable line; must reach the depth gate's minimum-plies
   *  threshold). `roadmap` opts out of the depth gate — used for lessons
   *  that intentionally stop short of the middlegame because they're a
   *  pointer to the WEAPONS layer (e.g. Vienna vs 2…Nc6's 11-ply spine
   *  that fans out to Hamppe-Allgaier / Hamppe-Muzio / Pierce / Steinitz).
   *  `trap` is reserved for hand-authored named-trap beat lessons that
   *  live in their own files and are shorter by design. */
  kind?: 'variation' | 'roadmap' | 'trap';
  /** Independent-verification refs (concept:<id> | book:<openingId> | https URL)
   *  proving the line's ideas were checked against the books/online, not
   *  training recall. Gated for masterclass lessons (David 2026-05-25). */
  sources?: string[];
}

// ─── Common Mistakes ──────────────────────────────────────────────────────

export interface CommonMistake {
  fen: string;
  wrongMove: string;
  correctMove: string;
  /** Full Watch / Learn-FULL narration (hand-authored): why the wrong move is
   *  the error and what the correct move achieves. Board-focused prose. */
  explanation: string;
  /** Hand-authored ≤8-word LEARN cue (the LIMITED-verbosity register), spoken
   *  as the student plays the correct move. Move + a 3-5 word echo of the idea
   *  ("Nf6 — hit e4, grab the initiative"). Never generated; when absent, Learn
   *  falls back to plain move dictation (the non-curated tier). Masterclass
   *  openings MUST carry it — gated by commonMistakeNarration.test. */
  shortNarration?: string;
  /** Optional: the punishment played out as a narrated walkthrough.
   *  When set, the mistake renders as a "Watch the punishment" tile that
   *  mounts PlayableLinePlayer (locked WLPP grammar §1a) instead of the
   *  legacy static expand-card. moves[0] is always the wrongMove itself;
   *  moves[1..] are the punishment continuation that explains WHY it's
   *  bad. Annotations + arrows + highlights follow the same lead-the-eye
   *  rules as middlegame plans (§5a — orange=move squares, yellow=key
   *  squares, green=vision arrows; arrows must originate on a non-pawn
   *  piece with a clear sight-line per the lessonIntegrity gate). */
  punishmentLine?: PlayableMiddlegameLine;
}

// ─── Checkpoint Quiz ──────────────────────────────────────────────────────

export interface CheckpointQuizItem {
  fen: string;
  type?: 'move' | 'plan';
  // Move-type fields
  correctMove?: string;
  // Plan-type fields (multiple choice)
  question?: string;
  choices?: string[];
  correctIndex?: number;
  hint: string;
  concept: string;
}

export interface OpeningSubLine {
  name: string;
  type?: 'variation' | 'trap' | 'warning';
  moveAnnotations: OpeningMoveAnnotation[];
}

export interface OpeningAnnotations {
  openingId: string;
  moveAnnotations: OpeningMoveAnnotation[];
  subLines?: OpeningSubLine[];
}

// ─── Opening ─────────────────────────────────────────────────────────────────

export type SidelineFrequency = 'common' | 'uncommon' | 'rare';
export type SidelineDanger = 'safe' | 'tricky' | 'critical';

export interface OpeningVariation {
  name: string;
  pgn: string;
  explanation: string;
  /** Optional fuller overview for the variation's masterclass tab.
   *  Falls back to `explanation` when absent. */
  overview?: string;
  /** Optional per-variation key ideas (student-side plans) for the
   *  variation's masterclass tab. Falls back to the opening's when absent. */
  keyIdeas?: string[];
  frequency?: SidelineFrequency;
  danger?: SidelineDanger;
  deviationMove?: number;
  /** Optional starting FEN for puzzle-derived trap lines. When set,
   *  pgn is interpreted as moves played FROM setupFen rather than
   *  from the standard start position. Used by Lichess-puzzle-mined
   *  trap entries whose punishment begins from a middlegame position
   *  rather than move 1. See scripts/mine-puzzle-traps.mjs. */
  setupFen?: string;
  /** Optional provenance — where the trap content originated. */
  source?: string;
  /** Optional Stockfish-verified final-position evaluation
   *  ("+360cp" or "mate-in-3" from the student's perspective). */
  verifiedEval?: string;
}

// ─── Model Games ────────────────────────────────────────────────────────────

export interface ModelGameCriticalMoment {
  moveNumber: number;
  color: 'white' | 'black';
  // NO `fen`: stripped from the data 2026-07-22 ("replay is the truth"). The
  // type said it was required while no moment had one, so a reader compiled
  // and found nothing (the model-game cameo, dead two months). Replay the pgn.
  annotation: string;
  concept: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}

/**
 * A real game played by a pro, persisted as a coach reference so the
 * coach has FULL access to a player's actual games during teaching +
 * walkthroughs (David 2026-06-01). Built from the repertoire pipeline's
 * committed artifacts by `scripts/pro-repertoire/build-game-references.mjs`
 * into `src/data/pro-game-references.json` and loaded into Dexie. Unlike
 * `ModelGame` (hand-narrated, ~2/opening), these are the BREADTH layer:
 * many real games per variation, no per-move narration — the coach cites
 * "Naroditsky beat a 3176 here" and can walk the actual moves.
 */
export interface ProGameReference {
  id: string;
  /** App player id (e.g. "naroditsky") — matches pro-repertoires.json playerId. */
  playerId: string;
  /** Base opening id for coach detectOpening matching (e.g. "caro-kann"). */
  openingId: string;
  /** The pro opening id (e.g. "pro-naroditsky-caro-kann") for exact scoping. */
  proOpeningId: string;
  /** Slugified variation key (e.g. "classical"). */
  variation: string;
  /** Human-readable variation label (e.g. "Classical (4...Bf5)"). */
  variationLabel: string;
  white: string;
  black: string;
  /** The side the pro (student) played — a losing game for this side is
   *  excluded at build time (never cite the opening losing). */
  studentSide: 'white' | 'black';
  result: GameResult;
  opponentRating: number | null;
  date: string | null;
  /** Where the game came from. */
  source: 'chess.com' | 'otb' | 'lichess';
  url: string | null;
  eco: string | null;
  plyCount: number;
  /** Clean space-separated SAN (headers + clocks stripped), chess.js-validated. */
  pgn: string;
}

export interface ModelGame {
  id: string;
  openingId: string;
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  result: GameResult;
  year: number;
  event: string;
  pgn: string;
  /** The side the student plays in this opening. When set, a game where this
   *  side loses is excluded from coach grounding — a masterclass never cites
   *  its own opening losing (David 2026-05-21). */
  studentSide?: 'white' | 'black';
  /** The variation this game played, matched deterministically to its opening's
   *  variation by the game's identifying-prefix moves (classify-model-game-
   *  variations.mjs). Absent = main line. Drives per-variation scoping in
   *  ModelGamesSection so a variation tab shows games that played THAT line. */
  variation?: string;
  overview: string;
  criticalMoments: ModelGameCriticalMoment[];
  middlegameTheme: string;
  lessonSummary: string;
}

// ─── Middlegame Plans ───────────────────────────────────────────────────────

export interface PawnBreak {
  move: string;
  explanation: string;
  fen: string;
  arrows?: AnnotationArrow[];
}

export interface PieceManeuver {
  piece: string;
  route: string;
  explanation: string;
  arrows?: AnnotationArrow[];
}

export interface PlayableMiddlegameLine {
  fen: string;
  moves: string[];
  annotations: string[];
  /** Per-move arrows. arrows[i][0] is always the move played (origin→
   *  destination); arrows[i][1+] are vision arrows that lead the eye to
   *  the piece relationship the annotation describes. */
  arrows: AnnotationArrow[][];
  /** Per-move highlights — the squares the annotation names, so the eye
   *  lands on what the narration is talking about instead of hunting for
   *  pieces. Parallel to `moves` (highlights[i] = move i's squares). */
  highlights?: AnnotationHighlight[][];
  /** Per-move truncated LEARN cue — the short, hand-written line the voice
   *  speaks as the student plays move i, reinforcing the Watch lesson (David
   *  2026-05-24). When absent for a ply, Learn falls back to plain move
   *  dictation. Every cue is hand-authored and verified against its move —
   *  never generated. Parallel to `moves`. */
  learnCues?: string[];
  /** Idea-first prelude rendered on the STATIC critical position before any
   *  move fires (David 2026-05-26). Shown at the intro beat (demoMoveIndex < 0):
   *  narrate the plan's concept while markers lead the eye — GREEN `arrows` for
   *  the breaks + the long diagonals/files that open once the position cracks,
   *  and YELLOW `highlights` for BOTH the target weaknesses AND the key squares
   *  the pieces want to reach (outposts / maneuver destinations). Then the moves
   *  play the idea out. */
  intro?: {
    say: string;
    sayShort?: string;
    arrows?: AnnotationArrow[];
    highlights?: AnnotationHighlight[];
  };
  /** Independent-verification source refs (book:/concept:/reputable URL). */
  sources?: string[];
  title: string;
}

export interface MiddlegamePlan {
  id: string;
  openingId: string;
  criticalPositionFen: string;
  title: string;
  overview: string;
  pawnBreaks: PawnBreak[];
  pieceManeuvers: PieceManeuver[];
  strategicThemes: string[];
  endgameTransitions: string[];
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
  playableLines?: PlayableMiddlegameLine[];
}

// ─── Opening Narrations (DB-Driven Hybrid System) ─────────────────────────

export interface OpeningNarration {
  id: string;
  openingName: string;
  variation: string;
  moveSan: string;
  fen: string | null;
  narrations: string[];
  approved: boolean;
}

// ─── Content Generation (LLM Pipeline) ─────────────────────────────────────

export type GeneratedContentType =
  | 'model_game_annotation'
  | 'middlegame_plan'
  | 'sideline_explanation'
  | 'deep_annotation';

export interface GeneratedContent {
  id: string;
  openingId: string;
  type: GeneratedContentType;
  content: string;
  groundingData: string;
  generatedAt: string;
}

export interface DrillAttempt {
  correct: boolean;
  time: number;
  date: string;
}

export interface OpeningPlayResult {
  openingId: string;
  openingMovesTotal: number;
  openingMovesCorrect: number;
  firstDeviationMove: number | null;
  correctMoveAtDeviation: string | null;
  finalEval: number | null;
  recommendation: string;
}

export interface OpeningRecord {
  id: string;
  eco: string;
  name: string;
  pgn: string;
  uci: string;
  fen: string;
  color: 'white' | 'black';
  style: string;
  isRepertoire: boolean;
  overview: string | null;
  keyIdeas: string[] | null;
  traps: string[] | null;
  warnings: string[] | null;
  variations: OpeningVariation[] | null;
  // Drillable trap/warning lines for Train mode
  trapLines?: OpeningVariation[] | null;
  warningLines?: OpeningVariation[] | null;
  drillAccuracy: number;
  drillAttempts: number;
  lastStudied: string | null;
  // Woodpecker Method tracking
  woodpeckerReps: number;
  woodpeckerSpeed: number | null;   // avg seconds to complete main line
  woodpeckerLastDate: string | null; // ISO date of last Woodpecker drill
  // Per-variation mastery (parallel array to variations)
  variationAccuracy?: number[];
  // Last 10 drill attempts for rolling mastery calculation
  drillHistory?: DrillAttempt[];
  // Chess Reps-style line tracking (indices into variations array; the main
  // line uses MAIN_LINE_INDEX = -1). These drive the WLPP unlock ladder:
  // Watch→discovered, Learn→learned, Practice→perfected, Play→played. Each
  // rung unlocks the next; finishing Play unlocks the line's weapons.
  linesDiscovered?: number[];
  linesLearned?: number[];
  linesPerfected?: number[];
  linesPlayed?: number[];
  // Per-line "I already know this — unlock everything" escape (forward-lock
  // is for learners; this frees the rung + weapon gating for a given line).
  linesUnlockedAll?: number[];
  // Per-WEAPON WLPP rung completion (named traps / punish gems / warning
  // anti-traps). Keyed by the weapon's string id (trap.id / gemId / warning
  // id) — weapons aren't variation indices, so they can't ride the numeric
  // line arrays above. Value is the set of completed rungs; monotonic
  // (finishing Play backfills Watch/Learn/Practice). Drives the green check
  // on the trap/gem WLPP buttons.
  weaponRungs?: Record<string, Array<'watch' | 'learn' | 'practice' | 'play'>>;
  // Favorites (WO-3)
  isFavorite: boolean;
  // Gambit flag (true for openings loaded from gambits.json)
  isGambit?: boolean;
  // Pro repertoire link (null for personal/ECO openings)
  proPlayerId?: string | null;
}

// ─── Pro Repertoires ────────────────────────────────────────────────────────

export interface ProPlayer {
  id: string;
  name: string;
  title: string;
  rating: number;
  style: string;
  description: string;
  imageInitials: string;
}

// ─── DB Meta ──────────────────────────────────────────────────────────────────

export interface MetaRecord {
  key: string;
  value: string;
}

// ─── Games ───────────────────────────────────────────────────────────────────

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'good'
  | 'book'
  | 'miss'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface MoveAnnotation {
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  /** Stockfish eval AFTER this move was played, in centipawns from
   *  White's perspective. +200 = White is up ~2 pawns. */
  evaluation: number | null;
  bestMove: string | null;
  /** Stockfish eval if the engine's best move had been played from the
   *  position BEFORE this move — same unit (centipawns, White POV) as
   *  `evaluation`. Used by review accuracy / missed-tactic / missed-
   *  opportunity surfaces to compare what the player got vs what they
   *  could have gotten. Undefined on annotations produced before this
   *  field existed — `gameNeedsAnalysis` flags those for re-analysis. */
  bestMoveEval: number | null;
  classification: MoveClassification;
  comment: string | null;
  /** Engine lines (UCI) persisted by the review's deep dive at a flagged ply:
   *  the punishment after the played move and the continuation after the best
   *  move. Corroboration for the fundamentals attributor — never its gate. */
  pv?: { afterPlayed: string[]; afterBest: string[] };
}

export type GameSource = 'lichess' | 'chesscom' | 'master' | 'import' | 'coach';
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

// ─── Platform Stats (Chess.com / Lichess import) ───────────────────────────

export interface TimeControlStats {
  rating: number;
  best: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface PlatformStats {
  platform: 'chesscom' | 'lichess';
  username: string;
  fetchedAt: string;
  rapid?: TimeControlStats;
  blitz?: TimeControlStats;
  bullet?: TimeControlStats;
  puzzleRating?: number;
}

export interface GameRecord {
  id: string;
  pgn: string;
  white: string;
  black: string;
  /**
   * WHICH SIDE THE STUDENT PLAYED, when the writer knows it.
   *
   * `ModelGame` has carried this field for years; a game the student actually
   * PLAYED had nowhere to state it, so every reader had to INFER the seat from
   * the names — `resolvePlayerColor` matches a stored username, or spots an
   * engine name on a coach game. Both work until neither applies (a PGN import
   * whose username was never stored, a game seeded by a harness), and then the
   * resolver returns null and the caller defaults to 'white' for board
   * orientation. That default rode into the narration seat, where a guess is
   * worse than none: a BLACK student heard their own moves attributed to the
   * opponent, including the one ply the engine flagged.
   *
   * Optional because it is honestly unknown for an old row or a bare PGN —
   * absent means "infer it", which is the behaviour that existed before. Every
   * writer that KNOWS (both coach-game save paths know their `playerColor`)
   * now says so instead of leaving it to be guessed back out of a name.
   */
  studentSide?: 'white' | 'black';
  /** A seeded DEMO game, never the student's (WO-STANDARD-01 D5). Written by
   *  `reviewSampleGames.buildGameRecord`; read through `isFixtureGame`, which
   *  also honours the `sample-` id prefix for rows seeded before this field
   *  existed. Absent on every real game — the student's games never set it. */
  fixture?: true;
  /** Plies (1-based) where the coach ANNOUNCED the critical moment before the
   *  student moved (Learn's live statement). A find at one of these is
   *  PROMPTED — recorded grey, never as unaided evidence (T3, 2026-09-20). */
  promptedPlies?: number[];
  result: GameResult;
  date: string;
  event: string;
  eco: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  source: GameSource;
  /** How the game ended, straight from the platform: lichess `status`
   *  ("mate" / "resign" / "outoftime" / "aborted" / …) or the chess.com
   *  loser/draw result string ("checkmated" / "resigned" / "timeout" /
   *  "abandoned" / "agreed" / …). Lets the weakness engine later
   *  distinguish an honest result from a disconnect/abort. Optional —
   *  absent on older records + non-import sources. */
  termination?: string;
  annotations: MoveAnnotation[] | null;
  coachAnalysis: string | null;
  isMasterGame: boolean;
  /** The ONE opening key (see `OpeningKey`). Null when the game left every
   *  named line before its first move matched — never a name. */
  openingId: OpeningKey | null;
  /** Stamp of the key-minting revision that last wrote `openingId`
   *  (`openingKeyBackfill.ts`); absent on rows written before A1. */
  openingKeyRev?: string;
  /** True when analyzeAllGames has completed full Stockfish per-move
   *  analysis on this game. False / undefined for freshly-imported
   *  games that only have sparse detectBlunders annotations. Every
   *  consumer that needs accuracy, move-quality stats, or weakness
   *  profiling should check this flag instead of guessing from
   *  annotation density (the old `annotations.length >= moves/2`
   *  heuristic). */
  fullyAnalyzed?: boolean;
  /** Stockfish search depth the per-move eval curve was produced at
   *  (gameAnalysisService `ANALYSIS_DEPTH`). Drives accuracy: a shallow
   *  search misses the punishment of dubious moves and reads accuracy
   *  HIGH. When this is below the current `ANALYSIS_DEPTH`, the game is
   *  re-analyzed so the percentage tracks the deeper, more chess.com-
   *  aligned number. Undefined on records analyzed before this field
   *  existed (depth 12) → treated as stale and refreshed once. */
  analysisDepth?: number;
  /** Time control the game was played under (chessClock TIME_CONTROLS id).
   *  Undefined for unlimited / untimed games. */
  timeControlId?: string;
  /** Per-ply remaining clock (ms) for the side that just moved, BEFORE their
   *  increment. Parallel to annotations. Seeds the time-trouble detector.
   *  Undefined for untimed games. */
  clockRemainingMs?: number[];
  /** Persisted walk narration (reviewNarrationCache). Keyed on the
   *  annotations + settings + narration revision, so re-opening a reviewed
   *  game is instant and a deepened annotation invalidates it. Opaque here —
   *  the cache module owns the shape. */
  reviewNarration?: {
    rev: number;
    key: string;
    narration: unknown;
    savedAt: number;
  };
}

// ─── Flashcards ──────────────────────────────────────────────────────────────

export type FlashcardType = 'best_move' | 'name_opening' | 'explain_idea';

export interface FlashcardRecord {
  id: string;
  openingId: string;
  type: FlashcardType;
  questionFen: string;
  questionText: string;
  answerMove: string | null;
  answerText: string;
  srsInterval: number;
  srsEaseFactor: number;
  srsRepetitions: number;
  srsDueDate: string;
  srsLastReview: string | null;
}

// ─── Settings Enums (WO-5) ───────────────────────────────────────────────────

export type PieceAnimationSpeed = 'none' | 'fast' | 'medium' | 'slow';
export type CoachVerbosity = 'none' | 'fast' | 'medium' | 'slow' | 'unlimited';

/** How much the coach says at live phase transitions (opening→middlegame
 *  and middlegame→endgame). Separate from CoachVerbosity because the
 *  surfaces have different shapes: phase narration fires at most twice
 *  per game; in-game commentary can fire every move. Added by
 *  WO-PHASE-NARRATION-01. */
export type PhaseNarrationVerbosity = 'off' | 'brief' | 'standard' | 'full';

/** Unified narration setting — controls when and how much the coach
 *  speaks across every surface (per-move during play, phase
 *  transitions, Learn-with-Coach walkthroughs, tactic alerts).
 *  Replaces the previous three overlapping controls.
 *    - 'silent' → no spoken narration anywhere
 *    - 'brief'  → short narration only (key moments per move; first
 *                 sentence on phase transitions; `shortNarration` on
 *                 walkthrough steps)
 *    - 'full'   → full narration (legacy behavior — coach talks freely)
 *  Defaults to 'full' for users who haven't touched the setting. Older
 *  per-surface preferences are still read by `resolveCoachNarration`
 *  so existing user profiles keep their effective verbosity. */
export type CoachNarration = 'silent' | 'brief' | 'full';
export type MoveMethod = 'drag' | 'click' | 'both';
export type AiProvider = 'deepseek' | 'anthropic';

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface SkillRadar {
  opening: number;
  tactics: number;
  endgame: number;
  memory: number;
  calculation: number;
}

export interface BadHabit {
  id: string;
  description: string;
  occurrences: number;
  lastSeen: string;
  isResolved: boolean;
}

export interface UserPreferences {
  theme: string;
  boardColor: string;
  pieceSet: string;
  showEvalBar: boolean;
  showEngineLines: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  /** Coach-specific voice narration toggle, persisted separately
   *  from `voiceEnabled` so the user can silence the coach without
   *  disabling all in-app audio. Defaults to true (trainer-mode
   *  default) and syncs with appStore.coachVoiceOn. */
  coachVoiceOn?: boolean;
  /** Language for hand-authored lesson narration (say/sayShort). Default 'en'
   *  (English source of truth). When set to a supported code (e.g. 'es'), the
   *  masterclass Watch narration is shown + spoken in that language from the
   *  lazy-loaded per-language pack (src/data/lessons/i18n/), falling back to
   *  English for any beat/opening without a translation. The spoken voice
   *  follows automatically (the TTS layer picks a native Polly voice by the
   *  text's language). UI chrome stays English. */
  narrationLanguage?: string;
  /** Show the named tactic (Skewer / Fork / Pin / etc.) at the top
   *  of every mistake-puzzle. When OFF the chip is hidden so the
   *  student can find the tactic blind. Toggle lives next to the
   *  chip itself. Defaults to true (named-tactic shown). */
  puzzleShowTacticName?: boolean;
  /** When ON: show a visible countdown chip from puzzleClockTargetSec
   *  → 0 (time-pressure mode, opt-in). When OFF (default): clock
   *  runs silently in the background, count-up only, and gets
   *  logged into the puzzle record as solveTimeMs so /weaknesses
   *  can aggregate "slow on X tactic" insights. David's design
   *  2026-05-19: "count up if no setting is chosen but run in
   *  background. this information will be sent to weaknesses. if
   *  user selects a timer then it shows on page and counts down
   *  to add time pressure." */
  puzzleTimerOn?: boolean;
  /** Target seconds for the visible countdown mode. Defaults to 60.
   *  Ignored when puzzleTimerOn is false (background mode). */
  puzzleClockTargetSec?: number;
  dailySessionMinutes: number;
  aiProvider: AiProvider;
  apiKeyEncrypted: string | null;
  apiKeyIv: string | null;
  anthropicApiKeyEncrypted: string | null;
  anthropicApiKeyIv: string | null;
  /** Supabase anon key stored encrypted via cryptoService. Paired
   *  with supabaseAnonKeyIv. Optional so older profiles without the
   *  sync feature wired up don't need a migration. */
  supabaseAnonKeyEncrypted?: string | null;
  supabaseAnonKeyIv?: string | null;
  preferredModel: {
    commentary: string;
    analysis: string;
    reports: string;
  };
  monthlyBudgetCap: number | null;
  estimatedSpend: number;
  elevenlabsKeyEncrypted: string | null;
  elevenlabsKeyIv: string | null;
  elevenlabsVoiceId: string | null;
  // Amazon Polly TTS (server-side, no API key in browser)
  cloudEnabled: boolean;
  pollyVoice: string;
  voiceSpeed: number;
  // Kokoro TTS (open-source, in-browser)
  kokoroEnabled: boolean;
  kokoroVoiceId: string;
  // System voice (Web Speech API)
  systemVoiceURI: string | null;
  // Board Display (WO-5)
  highlightLastMove: boolean;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  pieceAnimationSpeed: PieceAnimationSpeed;
  // Piece Sound Customization (WO-COACH-PIECE-SOUND-CUSTOM). Layered ON
  // TOP of the existing style-set / event-type defaults so move /
  // capture / castle / check stay distinguishable. Each value is
  // 0–100; defaults below produce the current sound character.
  /** Pitch multiplier 0–100 (0 = 0.5×, 50 = 1.0×, 100 = 2.0×). */
  pieceSoundPitch?: number;
  /** Tone (low-pass filter brightness) 0–100 (0 = warmest, 100 = brightest). */
  pieceSoundTone?: number;
  /** Waveform character 0–100 — continuous blend across
   *  sine → triangle → square → sawtooth. 0 = pure sine. */
  pieceSoundWaveform?: number;
  /** Length multiplier 0–100 (0 = 0.5×, 50 = 1.0×, 100 = 2.0×). */
  pieceSoundLength?: number;
  boardOrientation: boolean;
  // Feedback & Coaching (WO-5)
  moveQualityFlash: boolean;
  showHints: boolean;
  // Game Behavior (WO-5)
  moveMethod: MoveMethod;
  moveConfirmation: boolean;
  autoPromoteQueen: boolean;
  // Master Control (WO-5)
  masterAllOff: boolean;
  // Coach Gameplay Settings
  coachBlunderAlerts?: boolean;
  coachTacticAlerts?: boolean;
  coachPositionalTips?: boolean;
  coachMissedTacticTakeback?: boolean;
  coachReviewVoice?: boolean;
  /** In-the-moment "why did you play that?" interjection during live play
   *  (Play with Coach, opening Play rung, middlegame play). When off, the
   *  coach stops interrupting your moves to ask — silent weakness capture
   *  (Practice mode) is unaffected. Defaults to on. */
  coachInGameDiscussion?: boolean;
  /** Coached game review: the coach asks "why did you play that?" at each of
   *  your blunder plies during the review walk and logs the answer. When off,
   *  review is STANDALONE — a plain walk-through with no coach interjection
   *  (the manual "add this game's mistakes" button still works). Defaults to on. */
  coachedReview?: boolean;
  /** Opt-in (default OFF): "quiz me as we walk" — during a game review, pause on
   *  the position BEFORE each of the student's mistakes and ask them to read it
   *  (graded against the engine + board) before revealing the move. A vision
   *  test at your own mistakes; non-blocking, skippable, inline (never a modal). */
  readingChallengesInReview?: boolean;
  /** Show the coach's board markers — move ARROWS + square HIGHLIGHTS — together.
   *  Off hides both on every coach board; the on-board Coach Tips button toggles
   *  this same persisted value (David 2026-09-13). Default ON. An explicit Hint
   *  the student taps still draws its arrow. */
  coachBoardMarkersOn?: boolean;
  coachVerbosity?: CoachVerbosity;
  /** Live phase-transition narration verbosity. 'off' silences the
   *  coach at phase boundaries; 'brief'/'standard'/'full' set the
   *  depth. Default 'standard'. Added by WO-PHASE-NARRATION-01. */
  phaseNarrationVerbosity?: PhaseNarrationVerbosity;
  /** Coach personality voice — picks the body of the system prompt.
   *  See `src/coach/sources/personalities.ts`. Defaults to 'default'
   *  (the original Danya voice). WO-COACH-PERSONALITIES (PR B). */
  coachPersonality?: import('../coach/types').CoachPersonality;
  /** Per-personality Polly voice override. Empty / missing entries
   *  fall back to PERSONALITY_VOICE_DEFAULTS in voiceService.ts.
   *  WO-COACH-PERSONALITY-VOICE — voice + personality are orthogonal
   *  dials. Lets the user pair any voice with any personality
   *  ("drill-sergeant Ruth" / "flirtatious Stephen"). */
  coachPersonalityVoices?: Partial<
    Record<import('../coach/types').CoachPersonality, string>
  >;
  /** Per-personality SECONDARY voice override. Used for short alerts
   *  / interjections (tactic warnings, opponent-blunder live-coach
   *  calls) so the user hears a different timbre for "watch out"
   *  than for the main narration. WO-VOICE-LAYER-01 (b). When unset,
   *  falls back to PERSONALITY_SECONDARY_VOICE_DEFAULTS in
   *  voiceService.ts. */
  coachPersonalitySecondaryVoices?: Partial<
    Record<import('../coach/types').CoachPersonality, string>
  >;
  /** Profanity dial. Default 'none'. Settings UI seeds the dial with
   *  the per-personality default at first selection (e.g.
   *  drill-sergeant → 'hard'), but once a value is stored here it
   *  overrides the personality default until the user resets it. */
  coachProfanity?: import('../coach/types').IntensityLevel;
  /** Mockery dial. Default 'none'. */
  coachMockery?: import('../coach/types').IntensityLevel;
  /** Flirt dial. Default 'none'. */
  coachFlirt?: import('../coach/types').IntensityLevel;
  /**
   * Controls when the coach invokes the LLM for per-move commentary
   * during play-against games.
   *   - 'key-moments' (default): only blunders, mistakes, brilliants,
   *     and greats trigger an LLM call. Other moves use a short
   *     deterministic tactic suffix or stay silent. Cuts per-game
   *     LLM spend ~60%.
   *   - 'every-move': legacy — call the LLM on every move (expensive).
   *   - 'off': never call the LLM mid-game; commentary comes purely
   *     from the local tactic classifier.
   * When unset, treat as 'key-moments' so users who haven't touched
   * the setting automatically benefit from the cost reduction.
   */
  coachCommentaryVerbosity?: 'key-moments' | 'every-move' | 'off';
  /** Unified narration verbosity — see CoachNarration. Replaces the
   *  three legacy controls (coachVerbosity, phaseNarrationVerbosity,
   *  coachCommentaryVerbosity) with one Silent/Brief/Full choice
   *  honored across every narration path. The legacy fields are still
   *  read by resolveCoachNarration as a migration fallback. */
  coachNarration?: CoachNarration;
  /** Speak the calculation-drill concept hint aloud when it appears
   *  (after a wrong first attempt). On by default; the user can turn it
   *  off in Settings. Routed through voiceService.speakLecture, so it
   *  still stays silent when coachNarration is 'silent'. */
  calcHintVoice?: boolean;
  /** @deprecated DEAD FIELD as of 2026-09-16 — nothing reads it. It used to
   *  select the full-detail inventory register for the post-game review walk;
   *  David cut that register after reading its output, and its Settings row was
   *  removed with it. The field stays declared ONLY so profiles that already
   *  persisted it remain valid — do not re-wire it, and do not add a new
   *  preference that turns the inventory register back on. */
  reviewFullDetail?: boolean;
  /** THE HOME OPENINGS, one per colour (WO-HOME-OPENING-01 A3). Written only
   *  by `homeOpeningService`: the computer's volume pick (`source:'computed'`,
   *  re-derived as the record moves) or the student's one-tap override
   *  (`source:'student'`, never overwritten by a recompute). */
  homeOpenings?: Partial<Record<'white' | 'black', HomeOpeningChoiceRecord | null>>;
  /** How much the coach says PER TURN when it does talk. Wired through
   *  to the brain's TEACH_MODE_ADDITION + OPERATOR_BASE_BODY teaching
   *  block to clamp response length. (Distinct from the older
   *  `coachVerbosity` field above, which controls speech *pace*.)
   *    - 'minimal'  → one short sentence, ≤8 words ("Nf6 — your move.")
   *    - 'normal'   → one short sentence, ≤15 words (default)
   *    - 'verbose'  → full lecture shape, no length cap (set up
   *                   positions, demonstrate, name the IDEA, etc.)
   *  When unset, treat as 'normal'. */
  coachResponseLength?: 'minimal' | 'normal' | 'verbose';
  // Neon Glow Settings
  glowBrightness?: number;         // 0–200, default 100 — master dimmer for all glow
  boardGlowColor?: string;         // rgb string e.g. "0, 229, 255" — single color for all squares
  whitePieceGlowColor?: string;    // rgb string e.g. "0, 255, 136" — glow color for white pieces
  blackPieceGlowColor?: string;    // rgb string e.g. "168, 85, 247" — glow color for black pieces
  // Import accounts
  chessComUsername?: string;
  lichessUsername?: string;
  // Auto-import scheduler — bookkeeping for the biweekly background sync
  // started at app boot. Epoch ms timestamp of the most recent successful
  // import per service; the scheduler skips a service whose stamp is less
  // than AUTO_IMPORT_INTERVAL_MS old. Set to null/undefined to force a
  // run on next boot.
  lastChessComAutoImportAt?: number | null;
  lastLichessAutoImportAt?: number | null;
  // Lichess API token (encrypted, for puzzle activity/dashboard)
  lichessTokenEncrypted?: string | null;
  lichessTokenIv?: string | null;
  // Audit-stream dev tooling — when both are set, every audit log
  // entry POSTs to `auditStreamUrl` with `x-audit-secret:
  // auditStreamSecret` so Claude (or any external watcher) can poll
  // the stream in near real time. Off by default. Previously stored
  // in localStorage; migrated to Dexie per the CLAUDE.md "no
  // localStorage" rule. Owner: `appAuditor.streamAuditEntry` reads
  // a module-level cache that mirrors these; `NarrationAuditPanel`
  // is the only writer.
  auditStreamUrl?: string | null;
  auditStreamSecret?: string | null;
  // Productization Phase 1 — when true, PostHog product analytics is
  // suppressed for this device (Settings → Privacy). Undefined/false =
  // analytics on (only matters when VITE_POSTHOG_KEY is set; without a
  // key analytics is a no-op regardless).
  analyticsOptOut?: boolean | null;
  /**
   * Persistent "what the coach has learned about this student" notes.
   * Short natural-language observations emitted by the coach (via the
   * `[[REMEMBER: ...]]` tag in its replies) and injected into every
   * coach prompt so advice stays consistent over time. Bounded to
   * avoid runaway growth; see coachMemoryService for limits.
   */
  coachMemory?: string[];
  /**
   * Persisted "reach rating" ladder state — the one adaptive-difficulty
   * controller shared by Tactics / Train-Mistakes / Teach-Tactics / Review
   * (see src/services/reachRating.ts + docs/plans/2026-09-14-adaptive-reach-ladder.md).
   * NOT session-reset: the edge the player climbed to is still there next
   * session. `reachState` is the general tactics ladder; `masterReachState`
   * is the separate elite (2400+) Master Level ladder so a bad day at 2600
   * never craters the normal number. Non-indexed, so no Dexie schema bump.
   * Absent ⇒ seed on first use from puzzleRating + STRETCH_SEED.
   */
  reachState?: import('../services/reachRating').ReachState;
  masterReachState?: import('../services/reachRating').ReachState;
}

export interface UserProfile {
  id: string;
  name: string;
  isKidMode: boolean;
  currentRating: number;
  puzzleRating: number;
  /** THE ANCHOR FOR THE ADAPTIVE ESTIMATE — written ONCE, never rewritten by
   *  the estimate it anchors.
   *
   *  The running K=32 ELO over the student's coach games used to start from
   *  `currentRating`, which `calibrateStrength` then overwrote with the result
   *  — so every boot re-scored the SAME games from the number the last boot
   *  wrote. Measured: a new player drifted 800 -> 990 and a losing one
   *  1200 -> 888 across ten app opens, on zero new games. That number sets the
   *  teach bar, the tactic-scan depth, the explorer band, the hint tier and the
   *  alert multiplier, so a student crossed real behaviour boundaries by
   *  opening the app.
   *
   *  With a fixed anchor the estimate is a PURE FUNCTION of their games:
   *  re-running it converges instead of drifting, and no two students share a
   *  moving target. Absent on profiles that predate this field — read it as
   *  `DEFAULT_STUDENT_RATING`, which is what the first calibration stores. */
  ratingBaseline?: number;
  /** Separate Elo rating for the endgame puzzle pool (mating
   *  patterns, calc, lesson drills). Tracked independently from
   *  the general tactic puzzleRating so a flurry of easy
   *  pawn-endings doesn't deflate the general tactic rating
   *  (and vice versa). Default 1200; updated K=32 Elo against
   *  the puzzle's Lichess rating on each endgame puzzle attempt. */
  endgameRating?: number;
  /** Kid-mode per-piece adaptive rating. One number per ChessPiece;
   *  starts at 100 (sub-Lichess floor — kid sees the training-pool
   *  puzzles in puzzles.json/training-puzzles.json first), capped
   *  100-2000. +25 on a correct puzzle / -15 on a wrong one. Read
   *  via kidRatingService.getKidRating with a 100 fallback so
   *  pre-migration profiles still work. Schema v26 seeds defaults
   *  for existing profiles. */
  kidRatingByPiece?: Partial<Record<ChessPiece, number>>;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastActiveDate: string;
  skillRadar: SkillRadar;
  badHabits: BadHabit[];
  /** WLPP "I already know this" expert passes — a lifetime budget of one per
   *  color. The value is the openingId that consumed that color's pass, so
   *  weapons stay gated on every OTHER opening and nobody can click past the
   *  ladder for free. Undefined ⇒ both passes still available. */
  weaponUnlockPasses?: { white?: string; black?: string };
  /** Whether the player's baseline strength has been established (from
   *  imported games or the first-run skill picker). Absent/false ⇒ the
   *  app still runs on the seeded default and must calibrate on next
   *  boot — this is how the retroactive fix reaches the existing cohort
   *  whose profiles predate calibration. Set true once a real signal
   *  (imports) or an explicit picker choice has seeded BOTH currentRating
   *  and puzzleRating. See strengthCalibrationService. */
  strengthCalibrated?: boolean;
  /** Consent for sending gameplay data (board positions, chat questions,
   *  and — when the mic is used — the spoken transcript) to the third-party
   *  AI + voice providers (DeepSeek, Anthropic, AWS Polly) that power the
   *  coach. Apple Guideline 5.1.1(i)/5.1.2(i) require an explicit in-app
   *  permission BEFORE any such data is shared — the privacy policy alone is
   *  not sufficient. Undefined ⇒ not yet asked; the blocking first-run
   *  AiConsentModal prompts once (this is also how existing profiles, which
   *  predate the field, get asked on their next launch). 'granted' ⇒ AI
   *  coach features are enabled; 'denied' ⇒ every coach call is blocked and
   *  re-prompts. Revocable in Settings. */
  aiDataConsent?: 'granted' | 'denied';
  preferences: UserPreferences;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export type SessionBlockType =
  | 'opening_review'
  | 'puzzle_drill'
  | 'flashcards'
  | 'game_analysis'
  | 'endgame_drill'
  | 'master_game_study';

export interface SessionBlock {
  type: SessionBlockType;
  targetMinutes: number;
  openingId?: string;
  puzzleTheme?: string;
  gameId?: string;
  completed: boolean;
}

export interface SessionPlan {
  blocks: SessionBlock[];
  totalMinutes: number;
}

export interface SessionRecord {
  id: string;
  date: string;
  profileId: string;
  durationMinutes: number;
  plan: SessionPlan;
  completed: boolean;
  puzzlesSolved: number;
  puzzleAccuracy: number;
  xpEarned: number;
  coachSummary: string | null;
}

// ─── SRS ─────────────────────────────────────────────────────────────────────

export type SrsGrade = 'again' | 'hard' | 'good' | 'easy';

export interface SrsResult {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string;
}

// ─── Stockfish ───────────────────────────────────────────────────────────────

/** Win/draw/loss, as PERMILLE (0-1000), from the perspective the line is
 *  normalized to. Stockfish's own read of how the position actually ends —
 *  present only when `UCI_ShowWDL` is on and the build supports it. */
export interface WdlRead {
  win: number;
  draw: number;
  loss: number;
}

export interface AnalysisLine {
  rank: number;
  evaluation: number;
  moves: string[];
  mate: number | null;
  /** Stockfish's win/draw/loss for THIS line. Null when the engine did not
   *  report it (older build, or the option failed to take). */
  wdl?: WdlRead | null;
  /** How deep this line was actually searched, past the nominal `depth` — the
   *  engine's own statement of how hard it looked down this branch. */
  seldepth?: number | null;
  /** The score is a bound, not a settled value: the search cut off before
   *  proving it. A claim built on a bound is weaker than one built on an exact
   *  score, and until now nothing downstream could tell the difference. */
  bound?: 'lower' | 'upper' | null;
}

export interface StockfishAnalysis {
  bestMove: string;
  evaluation: number;
  isMate: boolean;
  mateIn: number | null;
  depth: number;
  topLines: AnalysisLine[];
  nodesPerSecond: number;
  /** THE ENGINE'S OWN READ OF THE OUTCOME, for the best line, white-POV.
   *
   *  David 2026-08-15: "I want every stockfish point narrated at the computed
   *  narration tier." This is the first of them and the most teachable: a
   *  student cannot picture +0.7, and can picture holding a position three
   *  times in four. */
  wdl?: WdlRead | null;
  /** Deepest ply the search actually reached on the principal line. */
  seldepth?: number | null;
  /** Nodes searched, and how long it took — the engine's statement of how much
   *  work is behind the number. A shallow, fast read and a deep, laboured one
   *  should not be spoken with the same confidence. */
  nodes?: number | null;
  timeMs?: number | null;
  /** Transposition-table saturation, permille. High means the engine is
   *  recycling its own table and the read is cheaper than it looks. */
  hashfull?: number | null;
}

// ─── Coach ───────────────────────────────────────────────────────────────────

export type CoachDifficulty = 'easy' | 'medium' | 'hard';

/**
 * What the STUDENT ASKED FOR, which may be nothing at all.
 *
 * 🔴 TWO TYPES NAMED `CoachDifficulty` USED TO EXIST (found 2026-09-21 while
 * hoisting difficulty onto one source): this three-member one, and a FOUR-member
 * copy in `coachAgent.ts` that added `'auto'`. Same name, different members, no
 * relationship declared — so which one a file got depended on which module it
 * imported from, and nothing failed when it got the wrong one. That is the
 * duplicated-enum rot the standing rule opens with (`discovery` vs
 * `discovered_attack`), in a type rather than a string.
 *
 * They are NOT the same question, which is why the fix is a rename and not a
 * merge. `CoachDifficulty` is a SETTING — three values a toggle can produce.
 * `'auto'` is a PARSE OUTCOME: `parseCoachIntent` says it when the student's
 * sentence named no difficulty at all ("play me"), and `resolveConfig` reads it
 * as medium. A toggle can never emit it and should not be able to.
 *
 * Declaring the superset here, off the base, makes that relationship the type
 * system's job: add a difficulty and both follow, and a setting can never be
 * assigned an `'auto'` that no UI can produce.
 */
export type RequestedDifficulty = CoachDifficulty | 'auto';

export type HintLevel = 0 | 1 | 2 | 3;

// ─── Board Annotations ──────────────────────────────────────────────────────

export interface BoardArrow {
  startSquare: string;
  endSquare: string;
  color: string;
}

export interface BoardHighlight {
  square: string;
  color: string;
}

/** One move of a line the board can draw and walk. */
export interface WalkPly {
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

/** A computed line the board DRAWS (arrows) and WALKS (a button) — one shape
 *  across Learn chat and review, so a spoken line is never re-derived for the
 *  board (WO-DANYA-01, David 2026-09-24: "arrows draw the lines, button press
 *  to walk it"). */
export interface WalkableLine {
  /** What the walk button names — the line's first move. */
  label: string;
  startFen: string;
  plies: WalkPly[];
}

export interface GhostMoveData {
  fromSquare: string;
  toSquare: string;
  /** Piece code like 'wN', 'bQ' — matches pieceSetService keys */
  piece: string;
  capturedSquare: string | null;
}

export interface BoardAnnotationCommand {
  type: 'arrow' | 'highlight' | 'show_position' | 'practice' | 'clear';
  arrows?: BoardArrow[];
  highlights?: BoardHighlight[];
  fen?: string;
  label?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /**
   * How this message was produced.
   * - 'voice' — the user spoke this (or the assistant is replying to a
   *   voice turn). UI hides the text bubble and shows a speaking
   *   indicator; TTS is the primary output.
   * - 'text' (default) — user typed it / reading is the primary output.
   * Assistant messages inherit this from the preceding user turn so
   * the reply honours the same modality.
   */
  modality?: 'voice' | 'text';
  /**
   * Tappable answer chips the coach offered ON THIS message — a "did you
   * mean one of these?" picker. Rendered INLINE beneath the bubble so they
   * persist with the question in the transcript. Previously the picker only
   * lived in the transient input-bar `coachChoices` state, so typing the
   * next message stranded the question with no chips (David 2026-07-18
   * screenshot: three "Did you mean one of these?" prompts, zero chips).
   *
   * 🔒 THE CHIP'S LABEL AND ITS COMMAND ARE TWO FIELDS, NOT ONE STRING
   * (found on prod by the Learn audit, 2026-09-17).
   *
   * This was `string[]`, doing both jobs at once, and the fuzzy "did you mean"
   * picker set it to the bare canonical opening names. So a student who typed
   * "lets play the scandinavian lasker variaton" — misspelled, therefore
   * routed to the picker — tapped a chip that submitted a BARE NAME, and a
   * bare name routes to TEACH. Their ask to PLAY became a lesson.
   *
   * The opening identifies WHAT they meant; it does not identify what they
   * ASKED FOR. Same class as the seat and register guards shipped the same
   * day: an identity term dropped at a selection boundary. Two required
   * fields mean a new picker cannot quietly reuse the label as the command.
   */
  choices?: ChatChoice[];
  /** Lines this answer calculated — drawn as arrows while it is spoken and
   *  walkable on the board with a button (WO-DANYA-01 C). */
  lines?: WalkableLine[];
  metadata?: {
    actions?: { type: string; id: string }[];
    annotations?: BoardAnnotationCommand[];
  };
}

/** A tappable coach chip: what the student SEES, and what tapping it SENDS.
 *  Both required — see `ChatMessage.choices`. */
export interface ChatChoice {
  /** Shown on the chip. */
  label: string;
  /** Submitted to `handleSubmit` on tap. Usually the label; it differs when
   *  the chip has to carry the student's INTENT as well as their subject. */
  submit: string;
}

export type CoachGameStatus = 'pregame' | 'playing' | 'blunder_pause' | 'gameover' | 'postgame';
export type CoachGameResult = 'win' | 'loss' | 'draw' | 'ongoing';

export interface CoachGameMove {
  moveNumber: number;
  san: string;
  fen: string;
  isCoachMove: boolean;
  commentary: string;
  evaluation: number | null;
  classification: MoveClassification | null;
  /** Persisted engine lines from the annotation (see MoveAnnotation.pv). */
  pv?: { afterPlayed: string[]; afterBest: string[] };
  expanded: boolean;
  bestMove: string | null;
  bestMoveEval: number | null;
  preMoveEval: number | null;
}

export interface KeyMoment {
  moveNumber: number;
  fen: string;
  explanation: string;
  type: 'blunder' | 'brilliant' | 'turning_point';
}

export interface CoachGameState {
  gameId: string;
  playerColor: 'white' | 'black';
  targetStrength: number;
  moves: CoachGameMove[];
  hintsUsed: number;
  currentHintLevel: HintLevel;
  takebacksUsed: number;
  status: CoachGameStatus;
  result: CoachGameResult;
  keyMoments: KeyMoment[];
}

export type CoachTask =
  | 'move_commentary'
  | 'hint'
  | 'puzzle_feedback'
  | 'post_game_analysis'
  | 'daily_lesson'
  | 'bad_habit_report'
  | 'weekly_report'
  | 'deep_analysis'
  | 'opening_overview'
  | 'chat_response'
  | 'game_commentary'
  | 'game_opening_line'
  | 'game_post_review'
  | 'position_analysis_chat'
  | 'session_plan_generation'
  | 'weakness_report'
  | 'interactive_review'
  | 'whatif_commentary'
  | 'game_narrative_summary'
  | 'model_game_annotation'
  | 'middlegame_plan_generation'
  | 'sideline_explanation'
  | 'smart_search'
  | 'explore_reaction'
  | 'intent_classify'
  | 'kid_puzzle_gen';

export interface CoachContext {
  fen: string;
  lastMoveSan: string | null;
  moveNumber: number;
  pgn: string;
  openingName: string | null;
  stockfishAnalysis: StockfishAnalysis | null;
  playerMove: string | null;
  moveClassification: MoveClassification | null;
  playerProfile: {
    rating: number;
    weaknesses: string[];
  };
  /** The STUDENT's color, as a code-computed fact (G0). When set, the
   *  threat/opportunity framing in the grounded tactics block is built from
   *  the student's side — NOT the FEN side-to-move. Callers that narrate right
   *  after the student's move (phase transitions, per-move commentary) MUST set
   *  this, or the block gets framed from the opponent's side (the FEN flips to
   *  the opponent's turn) and the coach voices the student as the wrong color.
   *  Omit it only when the student is genuinely on move (stm == student). */
  perspective?: 'w' | 'b';
  additionalContext?: string;
}

export interface OpeningAnnotationContext {
  fen: string;
  moveNumber: number;
  openingName: string | null;
  lastMoves: string[];
  currentMoveSan: string | null;
  additionalContext?: string;
}

// ─── Weakness Analysis ──────────────────────────────────────────────────────

export type WeaknessCategory =
  | 'tactics'
  | 'openings'
  | 'opening_weakspots'
  | 'endgame'
  | 'calculation'
  | 'positional'
  | 'time_management';

export interface WeaknessTrainingAction {
  route: string;
  buttonLabel: string;
  state?: Record<string, unknown>;
}

export interface WeaknessItem {
  category: WeaknessCategory;
  label: string;
  metric: string;
  severity: number; // 0-100, higher = worse
  detail: string;
  trainingAction?: WeaknessTrainingAction;
}

export interface StrengthItem {
  title: string;
  detail: string;
  category: WeaknessCategory;
  metric: string;
}

export interface WeaknessProfile {
  computedAt: string;
  items: WeaknessItem[];
  strengths: string[];
  strengthItems: StrengthItem[];
  overallAssessment: string;
}

// ─── Weakness-to-Drill System ───────────────────────────────────────────────

export interface WeaknessTheme {
  theme: string;
  specificPattern: string;
  frequency: number;
  sampleFens: string[];
  avgCentipawnLoss: number;
}

export interface WeaknessDrillItem {
  mistakePuzzle: MistakePuzzle;
  themeKey: string;
}

export interface WeaknessDrillSession {
  themes: WeaknessTheme[];
  drillItems: WeaknessDrillItem[];
  generatedAt: string;
}

export type ReviewMode = 'analysis' | 'whatif' | 'practice' | 'guided_lesson';

// ─── Opening Weak Spots ─────────────────────────────────────────────────────

export interface OpeningWeakSpot {
  id: string;
  openingId: string;
  openingName: string;
  fen: string;
  moveIndex: number;
  correctMoveSan: string;
  failCount: number;
  lastFailedAt: string;
  lastDrilledAt: string | null;
}

/** A single tagged misconception — the shared bucket fed by Discussion
 *  Practice (live), Game Review (past games), and import-time auto-
 *  analysis. `tag` is always an id from the closed MISCONCEPTION_TAGS
 *  set (or 'other' with a `customLabel`). The Training Plan reads these
 *  to prioritise drills. */
export type MisconceptionSource =
  | 'discussion-practice'
  | 'game-review'
  | 'auto-analysis';

/** Adaptive-loop state per tagged instance. `open` = active weakness;
 *  `improving` = drilled successfully at least once; `mastered` =
 *  graduated out (stops counting / drilling). */
// A misconception NEVER graduates out (David 2026-05-21: "it should never
// graduate out! just reduce the amount of times you see it"). 'open' = due
// now; 'improving' = spaced into the future. 'mastered' is legacy — old rows
// carrying it are treated as due again so nothing ever drops permanently.
export type MisconceptionStatus = 'open' | 'improving' | 'mastered';

export interface MisconceptionTagRecord {
  id: string;
  /** Closed-set id from MISCONCEPTION_TAGS (incl. 'other'). */
  tag: string;
  /** The specific fundamental the attributor proved (a FundamentalId), when the
   *  slip was attributed — finer than `tag` (several fundamentals share a tag).
   *  Non-indexed, optional; absent on board-heuristic tags + pre-existing rows.
   *  Powers the per-fundamental scorecard (David 2026-09-07). */
  fundamentalId?: string;
  /** Free-text error label, present only when tag === 'other'. */
  customLabel?: string;
  source: MisconceptionSource;
  createdAt: number;
  /** Position where the slip happened (full FEN). */
  fen: string;
  /** The move the user actually played (SAN). */
  playedSan?: string;
  /** The move that was best — engine PV or the masters' move (SAN). */
  bestSan?: string;
  /** Centipawn loss vs best, when known (from Stockfish). */
  cpLoss?: number;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  openingId?: string;
  openingName?: string;
  /** What the user said when asked "why did you play that?" — voice or
   *  text. Absent when skipped or auto-analysed. */
  userReason?: string;
  /** The coach's one-line teaching note tied to this instance. */
  coachNote?: string;
  /** Source game id, for review / auto-analysis entries. */
  sourceGameId?: string;
  status: MisconceptionStatus;
  /** SRS level — consecutive successful drills. Indexes the spacing
   *  interval; higher = seen less often. Never removes the instance. */
  masteryHits: number;
  /** When this instance is next due to resurface. Absent (or in the past)
   *  = due now. Lengthens with each success, snaps back on a miss. */
  dueAt?: number;
  lastDrilledAt?: number;
  /** True = this slip COUNTS toward the formal weakness profile (the
   *  learned/count-against gate). False = display-only: it still shows in
   *  Thinking Errors / the misconception bucket, but the weakness analysis
   *  ignores it (an un-learned / first-exposure line). Absent on legacy rows =
   *  treated as counted. */
  counted?: boolean;
  /** THE TAG WAS COMPUTED WITHOUT THE ENGINE'S BEST MOVE (C2, 2026-09-22): a
   *  `%eval` import carries the eval curve and no best move, so the classifier
   *  could only read the board after the move and the fundamentals attributor
   *  never ran. Such a row is NOT a verdict — it is re-attributed by the next
   *  sweep once the deep dive lands a best move, and this clears. Absent on a
   *  row whose classification had the full input. */
  attributionPending?: boolean;
}


export interface ReviewState {
  mode: ReviewMode;
  currentMoveIndex: number;
  whatIfMoves: string[];
  whatIfStartFen: string | null;
}

export interface CriticalMoment {
  moveNumber: number;
  fen: string;
  playerMove: string;
  bestMove: string;
  evaluation: number;
  bestEvaluation: number;
  explanation: string;
  type: 'blunder' | 'mistake' | 'inaccuracy' | 'brilliant' | 'turning_point';
  relatedWeakness: string | null;
}

// ─── Game Phase Analysis ─────────────────────────────────────────────────────

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

export interface PhaseAccuracy {
  phase: GamePhase;
  accuracy: number;
  moveCount: number;
  mistakes: number;
}

// ─── Missed Tactic Detection ─────────────────────────────────────────────────

export type TacticType =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered_attack'
  | 'back_rank'
  | 'hanging_piece'
  | 'promotion'
  | 'deflection'
  | 'overloaded_piece'
  | 'trapped_piece'
  | 'clearance'
  | 'interference'
  | 'zwischenzug'
  | 'x_ray'
  | 'double_check'
  | 'removing_the_guard'
  /** A DELIVERED forced mate on the solution line (P4b, 2026-09-15). Added so
   *  the unified classifier never has to call a missed smothered mate a
   *  "fork" (the old geometry did) or drop it as an unnamed sequence. Weakness
   *  bucket "Missed checkmates"; a live `mate_threat` concept joins to it. */
  | 'checkmate'
  | 'tactical_sequence';

export interface MissedTactic {
  moveIndex: number;
  playerMoved: string;
  bestMove: string;
  fen: string;
  evalSwing: number;
  tacticType: TacticType;
  explanation: string;
}

// ─── Game Insights ──────────────────────────────────────────────────────────

export type InsightsTab = 'overview' | 'openings' | 'mistakes' | 'tactics' | 'patterns' | 'misconceptions';

export interface OverviewInsights {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  winRateWhite: number;
  winRateBlack: number;
  avgElo: number;
  avgAccuracy: number;
  /** How many analysed games `avgAccuracy` rests on (walk 6, W1: a 95% headline
   *  read off 1 of 932 games). A headline with no basis stated is a false claim. */
  accuracyGames: number;
  highestBeaten: { name: string; elo: number; gameId: string } | null;
  lowestLostTo: { name: string; elo: number; gameId: string } | null;
  classificationCounts: MoveClassificationCounts;
  totalMoves: number;
  avgMovesPerGame: number;
  avgBrilliantsPerGame: number;
  avgMistakesPerGame: number;
  avgBlundersPerGame: number;
  avgInaccuraciesPerGame: number;
  bestMoveAgreement: number;
  phaseAccuracy: PhaseAccuracy[];
  accuracyWhite: number;
  accuracyBlack: number;
  strengths: string[];
  /** Games with full Stockfish per-move analysis (drives every accuracy
   *  and move-quality stat above). */
  analyzedGameCount: number;
  /** Games imported but lacking full per-move analysis. When > 0 the UI
   *  surfaces a CTA — otherwise the user sees 0% across the board with
   *  no hint why. */
  gamesNeedingAnalysis: number;
}

export interface OpeningAggregateStats {
  name: string;
  eco: string | null;
  /** The color the player HAD in these games. An ECO can be two different
   *  openings depending on side (B07 = White "Anti-Pirc" vs Black "Pirc"), so
   *  win-rate / best / worst results are aggregated per-color, not per-ECO —
   *  and the UI keys/labels off this to keep the two sides distinct. */
  color?: 'white' | 'black';
  openingId: string | null;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgAccuracy: number;
  gameIds: string[];
}

export interface OpeningInsights {
  repertoireCoverage: { inBook: number; offBook: number };
  mostPlayedWhite: OpeningAggregateStats[];
  mostPlayedBlack: OpeningAggregateStats[];
  winRateByOpening: OpeningAggregateStats[];
  /** Top-5 openings (≥3 games) by best win-rate — surfaces "which
   *  openings treat you well" as a standalone report. Same data as
   *  winRateByOpening but pre-trimmed for the UI section. */
  bestResults: OpeningAggregateStats[];
  /** Top-5 openings (≥3 games) by worst win-rate — surfaces "which
   *  openings you struggle most against." */
  worstResults: OpeningAggregateStats[];
  drillAccuracyByOpening: { name: string; accuracy: number; attempts: number }[];
  strengths: string[];
  /** Games the player had with each colour — the denominator for the volume
   *  floor (openingVolumeFloor): a line leads a "weakest/strongest" verdict only
   *  at ≥10 games or ≥5% of THIS colour's games, never a 3-game 0% (PLAN §E2). */
  gamesByColor: { white: number; black: number };
}

export interface CostlyMistake {
  gameId: string;
  moveNumber: number;
  san: string;
  cpLoss: number;
  classification: string;
  opponentName: string;
  date: string;
  openingName: string | null;
  phase: MistakeGamePhase;
}

export interface MistakeInsights {
  errorBreakdown: { blunders: number; mistakes: number; inaccuracies: number };
  missedWins: number;
  avgCpLoss: number;
  errorsByPhase: { phase: GamePhase; errors: number; avgCpLoss: number }[];
  errorsBySituation: { winning: number; equal: number; losing: number };
  thrownWins: number;
  lateGameCollapses: number;
  costliestMistakes: CostlyMistake[];
  puzzleProgress: { unsolved: number; solved: number; mastered: number };
  totalGames: number;
  strengths: string[];
}

export interface TacticalMoment {
  gameId: string;
  moveNumber: number;
  san: string;
  fen: string;
  evalSwing: number;
  tacticType: TacticType;
  explanation: string;
  opponentName: string;
  date: string;
  openingName: string | null;
}

export interface TacticInsights {
  tacticsFound: { brilliant: number; great: number };
  avgBrilliantsPerGame: number;
  avgGreatPerGame: number;
  tacticsByType: { type: TacticType; count: number }[];
  bestSequences: TacticalMoment[];
  worstMisses: TacticalMoment[];
  missedByType: { type: TacticType; count: number; avgCost: number }[];
  foundVsMissed: { found: number; missed: number };
  awarenessRate: number;
  missedByPhase: { phase: GamePhase; count: number }[];
  totalGames: number;
  strengths: string[];
}

// ─── Classified Tactics (persisted) ─────────────────────────────────────────

export interface ClassifiedTactic {
  id: string;
  sourceGameId: string;
  moveIndex: number;
  fen: string;
  bestMoveUci: string;
  bestMoveSan: string;
  playerMoveUci: string;
  playerMoveSan: string;
  playerColor: 'white' | 'black';
  tacticType: TacticType;
  /** See `MistakePuzzle.tacticTypeRev`. */
  tacticTypeRev?: string;
  tacticTypeFlag?: 'no-inputs' | null;
  evalSwing: number;
  explanation: string;
  // Game context
  opponentName: string | null;
  gameDate: string | null;
  openingName: string | null;
  // Training tracking
  puzzleAttempts: number;
  puzzleSuccesses: number;
  createdAt: string;
}

export interface TacticMotifStats {
  tacticType: TacticType;
  missedInGames: number;
  puzzleAttempts: number;
  puzzleAccuracy: number;
  gameAwareness: number;
}

// ─── Tactics Training Program ────────────────────────────────────────────────

export type SetupPuzzleDifficulty = 1 | 2 | 3;
export type SetupPuzzleStatus = 'unsolved' | 'solved' | 'mastered';

export interface SetupPuzzle {
  id: string;
  setupFen: string;
  solutionMoves: string;
  tacticFen: string;
  tacticMoves: string;
  tacticType: TacticType;
  difficulty: SetupPuzzleDifficulty;
  sourceGameId: string | null;
  sourceMistakePuzzleId: string | null;
  playerColor: 'white' | 'black';
  openingName: string | null;
  srsInterval: number;
  srsEaseFactor: number;
  srsRepetitions: number;
  srsDueDate: string;
  srsLastReview: string | null;
  status: SetupPuzzleStatus;
  attempts: number;
  successes: number;
  createdAt: string;
}

export interface TacticTypeStats {
  tacticType: TacticType;
  puzzleAccuracy: number;
  puzzleAttempts: number;
  gameMissCount: number;
  gameSpotCount: number;
  gameTotalOccurrences: number;
  gameSpotRate: number;
  gap: number;
  byPhase: Record<MistakeGamePhase, number>;
  byOpening: Record<string, number>;
}

export interface TacticalProfile {
  computedAt: string;
  stats: TacticTypeStats[];
  totalGamesMissed: number;
  totalGamesAnalyzed: number;
  weakestTypes: TacticType[];
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface AppTheme {
  id: string;
  name: string;
  colors: {
    bg: string;
    bgSecondary: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    success: string;
    error: string;
    warning: string;
  };
}

// ─── Kid Mode ────────────────────────────────────────────────────────────────

export type ChessPiece = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface KidLesson {
  piece: ChessPiece;
  title: string;
  description: string;
  fen: string;
  highlightSquares: string[];
}

// ─── Pawn's Journey ──────────────────────────────────────────────────────────

export type JourneyChapterId =
  | 'pawn'
  | 'rook'
  | 'bishop'
  | 'knight'
  | 'queen'
  | 'king'
  | 'tactics'
  | 'first-game';

export const JOURNEY_CHAPTER_ORDER: readonly JourneyChapterId[] = [
  'pawn',
  'rook',
  'bishop',
  'knight',
  'queen',
  'king',
  'tactics',
  'first-game',
] as const;

export interface JourneyLesson {
  id: string;
  title: string;
  story: string;
  fen: string;
  highlightSquares: string[];
  instruction: string;
}

export interface JourneyPuzzle {
  id: string;
  fen: string;
  solution: string[];
  /** Other first moves that ALSO satisfy the puzzle's goal — accepted
   *  as correct alongside solution[0]. Used for puzzles where several
   *  moves legitimately achieve the lesson (e.g. a discovered check
   *  that works from two bishop squares), so the kid isn't marked
   *  wrong for a genuinely correct answer. */
  altSolutions?: string[];
  hint: string;
  successMessage: string;
}

export interface JourneyChapter {
  id: JourneyChapterId;
  title: string;
  subtitle: string;
  icon: string;
  lessons: JourneyLesson[];
  puzzles: JourneyPuzzle[];
  storyIntro: string;
  storyOutro: string;
  requiredPuzzleScore: number;
}

export interface JourneyChapterProgress {
  chapterId: JourneyChapterId;
  lessonsCompleted: number;
  puzzlesCompleted: number;
  puzzlesCorrect: number;
  completed: boolean;
  bestScore: number;
  completedAt: string | null;
}

export interface JourneyProgress {
  chapters: Partial<Record<JourneyChapterId, JourneyChapterProgress>>;
  currentChapterId: JourneyChapterId;
  startedAt: string;
  completedAt: string | null;
}

// ─── Kid Game Config ─────────────────────────────────────────────────────────

// ─── Board Utils ────────────────────────────────────────────────────────────

/** THE ONE OPENING KEY (WO-STANDARD-01 A1, 2026-09-22). The Dexie `openings`
 *  id, minted ONLY by `openingKey.ts` from (eco, name) — the same slug
 *  `dataLoader` seeds. Branded so a NAME ("Sicilian Defense: Bowdler Attack"),
 *  a book-corpus id or a bare string cannot be assigned where a key belongs:
 *  four writers used four key spaces and the departure + result terms never
 *  joined. A new writer now fails to compile until it mints a real key. */
export type OpeningKey = string & { readonly __openingKey: true };

/** Persisted shape of a home-opening choice (mirrors `HomeOpeningChoice` in
 *  `homeOpening.ts`; declared here so the profile type stays a leaf). */
export interface HomeOpeningChoiceRecord {
  family: string;
  key: OpeningKey;
  games: number;
  score: number;
  source: 'computed' | 'student';
  chosenAt: number;
}

export interface DetectedOpening {
  eco: string;
  name: string;
  plyCount: number;
  /** The one key for this entry — what every game record stores. */
  key: OpeningKey;
}

export interface CapturedPieces {
  white: string[];
  black: string[];
}

export interface GameAccuracy {
  white: number;
  black: number;
  moveCount: number;
}

export interface MoveClassificationCounts {
  brilliant: number;
  great: number;
  good: number;
  book: number;
  miss: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

export interface GameAnalysisSummary {
  accuracy: GameAccuracy;
  classificationCounts: MoveClassificationCounts;
  phaseBreakdown: PhaseAccuracy[];
  missedTactics: MissedTactic[];
  keyMoments: KeyMoment[];
  playerColor: 'white' | 'black';
  result: CoachGameResult;
}

export type KidGameId = 'pawns-journey' | 'fairy-tale';

export interface KidGameConfig {
  gameId: KidGameId;
  title: string;
  icon: string;
  routePrefix: string;
  chapters: JourneyChapter[];
  chapterOrder: readonly JourneyChapterId[];
}

// ─── Mini-Games ─────────────────────────────────────────────────────────────

export type MiniGameId = 'pawn-wars' | 'blocker';

export type MiniGameDifficulty = 1 | 2 | 3;

export type MiniGameHighlightMode = 'all' | 'danger' | 'none';

export type MiniGamePhase = 'intro' | 'playing' | 'won' | 'lost';

export interface MiniGameAiConfig {
  /** Probability (0–1) of making the scored "best" move vs a random pawn move */
  bestMoveChance: number;
  /** Whether AI tries to block/capture the player's most advanced pawn */
  blocksAdvancedPawn: boolean;
  /** Whether AI prioritises pushing its own most advanced pawn */
  prioritizesAdvancement: boolean;
  /** For Blocker: file index (0-based, c=0 d=1 e=2 f=3) of the AI's target pawn */
  targetPawnFile?: string;
}

export interface MiniGameLevelConfig {
  level: MiniGameDifficulty;
  title: string;
  description: string;
  /** Starting FEN — kings placed in corners for chess.js legality */
  startFen: string;
  /** Player colour */
  playerColor: 'w' | 'b';
  /** Which square highlights to show */
  highlightMode: MiniGameHighlightMode;
  /** Whether the AI's target pawn is visually marked (Blocker only) */
  showTargetPawn: boolean;
  /** AI behaviour */
  aiConfig: MiniGameAiConfig;
  /** Narrative intro spoken before game */
  storyIntro: string;
  /** Narrative on win */
  storyWin: string;
  /** Narrative on loss */
  storyLoss: string;
}

export interface MiniGameLevelProgress {
  completed: boolean;
  stars: number;
  hintsUsed: number;
}

export interface MiniGameProgress {
  levels: Partial<Record<number, MiniGameLevelProgress>>;
}

// ─── Guided Game Tutorial ───────────────────────────────────────────────────

export interface GuidedMove {
  /** Move number (1-based, shared by white/black pairs) */
  moveNumber: number;
  /** Standard algebraic notation, e.g. "e4", "Bc4", "Qxf7#" */
  san: string;
  /** FEN position AFTER this move */
  fen: string;
  /** 'w' for White's move, 'b' for Black's move */
  color: 'w' | 'b';
  /** If true, the app auto-animates this move. If false, the kid plays it. */
  autoPlay: boolean;
  /** Coach narration displayed and spoken at this move */
  narration?: string;
  /** Squares to highlight on the board */
  highlightSquares?: string[];
  /** Teaching concept label, e.g. "center control", "development" */
  teachingConcept?: string;
  /** If true, awards a milestone star */
  isMilestone?: boolean;
  /** Feedback text when the kid plays the wrong move */
  wrongMoveResponse?: string;
}

export type GuidedGameDifficulty = 1 | 2 | 3;

export interface GuidedGame {
  id: string;
  title: string;
  description: string;
  difficulty: GuidedGameDifficulty;
  estimatedMinutes: number;
  storyIntro: string;
  storyOutro: string;
  /** Starting FEN (usually the standard starting position) */
  startFen: string;
  /** The player's color in this game */
  playerColor: 'w' | 'b';
  moves: GuidedMove[];
}

export interface GuidedGameProgress {
  completed: boolean;
  stars: number;
  bestTime: number | null;
}

// ─── Lichess Opening Explorer ────────────────────────────────────────────────

export interface LichessExplorerGame {
  id: string;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  winner: 'white' | 'black' | null;
  year: number;
  month: string;
}

export interface LichessExplorerMove {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
  game: LichessExplorerGame | null;
}

export interface LichessExplorerResult {
  white: number;
  draws: number;
  black: number;
  moves: LichessExplorerMove[];
  topGames: LichessExplorerGame[];
  opening: { eco: string; name: string } | null;
}

// ─── Lichess Cloud Eval ──────────────────────────────────────────────────────

export interface LichessCloudEvalPv {
  moves: string;
  cp?: number;
  mate?: number;
}

export interface LichessCloudEval {
  fen: string;
  knodes: number;
  depth: number;
  pvs: LichessCloudEvalPv[];
}

// ─── Lichess Puzzle Dashboard ────────────────────────────────────────────────

export interface LichessPuzzleThemeResult {
  firstWins: number;
  replayWins: number;
  nb: number;
}

export interface LichessPuzzleDashboard {
  days: number;
  global: LichessPuzzleThemeResult;
  themes: Record<string, { results: LichessPuzzleThemeResult }>;
}

// ─── Lichess Puzzle Activity ─────────────────────────────────────────────────

export interface LichessPuzzleActivityEntry {
  date: number;
  puzzleId: string;
  win: boolean;
}

// ─── Bishop Mini-Games ──────────────────────────────────────────────────────

export type BishopGamePhase = 'menu' | 'playing' | 'won' | 'lost';

export interface BishopVsPawnsLevel {
  level: number;
  description: string;
  bishopStart: string;
  pawnSquares: string[];
  showBishopMoves: boolean;
  showThreatenedSquares: boolean;
}

export interface ColorWarsLevel {
  level: number;
  description: string;
  lightBishopStart: string;
  darkBishopStart: string;
  enemyPieces: Array<{ square: string; piece: string }>;
  timerSeconds: number;
  showBishopMoves: boolean;
  showEnemyGlow: boolean;
}

// ─── Smart Search ────────────────────────────────────────────────────────────

export type SmartSearchCategory = 'opening' | 'game' | 'mistake' | 'puzzle';

export interface SmartSearchResult {
  category: SmartSearchCategory;
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

export interface SearchIntent {
  table: 'openings' | 'games' | 'mistakePuzzles' | 'puzzles';
  filters: SearchFilter[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
}

export interface SearchFilter {
  field: string;
  op: 'eq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean;
}

// ─── Endgame Progress ────────────────────────────────────────────────────────

/** Per-position progress record for the endgame lesson surface.
 *  Tracks whether the student has played a given position perfectly
 *  on their first try (mastery), the running play count, and the
 *  last play timestamp. The composite id `${lessonId}::${fen}`
 *  scopes records to a specific position within a specific lesson
 *  so the same FEN appearing in two lessons gets two records.
 *
 *  `mastered` is sticky — once true, subsequent plays don't unset
 *  it. The student earned mastery; we don't take it away if they
 *  later make a mistake on a retry. */
export interface EndgameProgressRecord {
  /** Composite key: `<lessonId>::<fen>`. */
  id: string;
  /** Lesson slug — index for "all positions in a lesson" queries. */
  lessonId: string;
  /** Position FEN this record describes. */
  fen: string;
  /** True once the student has completed the playout on first try
   *  without a wrong drop. Sticky — never goes false after going
   *  true. */
  mastered: boolean;
  /** Total number of times the student has completed the playout
   *  for this position. */
  timesPlayed: number;
  /** Total number of wrong-move attempts across all plays. Used
   *  for "you needed N tries" UX. */
  totalWrongAttempts: number;
  /** Unix ms timestamp of the last completed playout. */
  lastPlayedAt: number;
}

// ─── SRS opening trainer (Chessable MoveTrainer-style) ───────────────────────
//
// One card per position where it's the student's side to move within an
// enrolled opening line. SM-2 scheduling: correct moves push next-review
// further out exponentially; misses reset to 1 day + decrement ease.
//
// The card identity is the FEN-before-move, not the SAN. That way Italian
// Game lines that transpose to the same position via different move orders
// share a single card. SAN is stored as the "expected answer" string.

export interface SrsOpeningCard {
  /** `${openingId}::${normalizedFenBefore}` — stable across enrollment cycles. */
  id: string;
  /** Source opening (eg `italian-game`). */
  openingId: string;
  /** Display name of the variation this position came from. May be the
   *  opening's main line if the position is on the main PGN. */
  variationName: string;
  /** FEN before the student's move. */
  fenBefore: string;
  /** Expected SAN — what the student should play. Stripped of check
   *  marks (`+`, `#`) and decorators (`!`, `?`) for forgiving comparison. */
  expectedSan: string;
  /** Move history leading to fenBefore, as a space-separated SAN string.
   *  Used to render the "X moves into the Italian Game…" context line. */
  pgnPrefix: string;
  /** Side the student plays (matches opening.color or variation override). */
  studentColor: 'white' | 'black';
  /** SM-2 ease factor. Starts at 2.5; ranges 1.3 – 2.6+. */
  ease: number;
  /** Days until next review. 0 = same-day, 1 = tomorrow. */
  intervalDays: number;
  /** Unix ms — when this card next needs review. */
  nextReviewAt: number;
  /** Total successful reviews. */
  successes: number;
  /** Total times the student got it wrong. Drives lapse-count UX. */
  lapses: number;
  /** Unix ms of the last review attempt (success OR fail). */
  lastReviewedAt: number | null;
  /** Unix ms of when this card was first enrolled. */
  createdAt: number;
}
