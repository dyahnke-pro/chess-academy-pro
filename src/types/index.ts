// ─── Puzzle ──────────────────────────────────────────────────────────────────

export interface PuzzleRecord {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  openingTags: string | null;
  popularity: number;
  nbPlays: number;
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

// ─── Opening ─────────────────────────────────────────────────────────────────

export interface OpeningVariation {
  name: string;
  pgn: string;
  explanation: string;
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
  // Chess Reps-style line tracking (indices into variations array)
  linesDiscovered?: number[];
  linesPerfected?: number[];
  // Favorites (WO-3)
  isFavorite: boolean;
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
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface MoveAnnotation {
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  evaluation: number | null;
  bestMove: string | null;
  classification: MoveClassification;
  comment: string | null;
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
  result: GameResult;
  date: string;
  event: string;
  eco: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  source: GameSource;
  annotations: MoveAnnotation[] | null;
  coachAnalysis: string | null;
  isMasterGame: boolean;
  openingId: string | null;
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
  dailySessionMinutes: number;
  aiProvider: AiProvider;
  apiKeyEncrypted: string | null;
  apiKeyIv: string | null;
  anthropicApiKeyEncrypted: string | null;
  anthropicApiKeyIv: string | null;
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
  voiceSpeed: number;
  // Board Display (WO-5)
  highlightLastMove: boolean;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  pieceAnimationSpeed: PieceAnimationSpeed;
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
  // Import accounts
  chessComUsername?: string;
  lichessUsername?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  isKidMode: boolean;
  currentRating: number;
  puzzleRating: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastActiveDate: string;
  achievements: string[];
  skillRadar: SkillRadar;
  badHabits: BadHabit[];
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

export interface AnalysisLine {
  rank: number;
  evaluation: number;
  moves: string[];
  mate: number | null;
}

export interface StockfishAnalysis {
  bestMove: string;
  evaluation: number;
  isMate: boolean;
  mateIn: number | null;
  depth: number;
  topLines: AnalysisLine[];
  nodesPerSecond: number;
}

// ─── Coach ───────────────────────────────────────────────────────────────────

export type CoachDifficulty = 'easy' | 'medium' | 'hard';

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
  metadata?: {
    actions?: { type: string; id: string }[];
    annotations?: BoardAnnotationCommand[];
  };
}

export type CoachGameStatus = 'pregame' | 'playing' | 'postgame';
export type CoachGameResult = 'win' | 'loss' | 'draw' | 'ongoing';

export interface CoachGameMove {
  moveNumber: number;
  san: string;
  fen: string;
  isCoachMove: boolean;
  commentary: string;
  evaluation: number | null;
  classification: MoveClassification | null;
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
  | 'game_narrative_summary';

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
  additionalContext?: string;
}

// ─── Weakness Analysis ──────────────────────────────────────────────────────

export type WeaknessCategory =
  | 'tactics'
  | 'openings'
  | 'endgame'
  | 'time_management'
  | 'positional'
  | 'calculation';

export interface WeaknessItem {
  category: WeaknessCategory;
  label: string;
  metric: string;
  severity: number; // 0-100, higher = worse
  detail: string;
}

export interface WeaknessProfile {
  computedAt: string;
  items: WeaknessItem[];
  strengths: string[];
  overallAssessment: string;
}

export type ReviewMode = 'analysis' | 'whatif' | 'practice' | 'guided_lesson';

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

// ─── Achievement ──────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (profile: UserProfile) => boolean;
  xpReward: number;
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

export interface DetectedOpening {
  eco: string;
  name: string;
  plyCount: number;
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
