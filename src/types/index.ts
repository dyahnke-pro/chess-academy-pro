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
  drillAccuracy: number;
  drillAttempts: number;
  lastStudied: string | null;
  // Woodpecker Method tracking
  woodpeckerReps: number;
  woodpeckerSpeed: number | null;   // avg seconds to complete main line
  woodpeckerLastDate: string | null; // ISO date of last Woodpecker drill
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

// ─── User Profile ─────────────────────────────────────────────────────────────

export type CoachPersonality = 'kasparov' | 'fischer' | 'danya';

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
  apiKeyEncrypted: string | null;
  apiKeyIv: string | null;
  preferredModel: {
    commentary: string;
    analysis: string;
    reports: string;
  };
  monthlyBudgetCap: number | null;
  estimatedSpend: number;
  elevenlabsKeyEncrypted: string | null;
  elevenlabsKeyIv: string | null;
  voiceIdDanya: string;
  voiceIdKasparov: string;
  voiceIdFischer: string;
  voiceSpeed: number;
}

export interface UserProfile {
  id: string;
  name: string;
  isKidMode: boolean;
  coachPersonality: CoachPersonality;
  currentRating: number;
  puzzleRating: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastActiveDate: string;
  achievements: string[];
  unlockedCoaches: string[];
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

export type CoachExpression = 'neutral' | 'encouraging' | 'excited' | 'disappointed' | 'thinking';

export type HintLevel = 0 | 1 | 2 | 3;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    actions?: { type: string; id: string }[];
    expression?: CoachExpression;
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
  coachPersonality: CoachPersonality;
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
  | 'session_plan_generation';

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
    style: string;
    weaknesses: string[];
  };
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
