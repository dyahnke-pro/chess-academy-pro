import type {
  UserProfile,
  PuzzleRecord,
  OpeningRecord,
  GameRecord,
  FlashcardRecord,
  SessionRecord,
  CoachGameState,
  ChatMessage,
  SessionPlan,
  SkillRadar,
  UserPreferences,
  BadHabit,
  MiniGameProgress,
  ProPlayer,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

let counter = 0;

function nextId(prefix: string = 'test'): string {
  return `${prefix}_${++counter}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── UserProfile ────────────────────────────────────────────────────────────

function buildDefaultPreferences(overrides?: Partial<UserPreferences>): UserPreferences {
  return {
    theme: 'dark-premium',
    boardColor: 'classic',
    pieceSet: 'staunton',
    showEvalBar: true,
    showEngineLines: true,
    soundEnabled: true,
    voiceEnabled: false,
    dailySessionMinutes: 45,
    aiProvider: 'deepseek',
    apiKeyEncrypted: null,
    apiKeyIv: null,
    anthropicApiKeyEncrypted: null,
    anthropicApiKeyIv: null,
    preferredModel: {
      commentary: 'deepseek-chat',
      analysis: 'deepseek-reasoner',
      reports: 'deepseek-reasoner',
    },
    monthlyBudgetCap: null,
    estimatedSpend: 0,
    elevenlabsKeyEncrypted: null,
    elevenlabsKeyIv: null,
    elevenlabsVoiceId: null,
    voiceSpeed: 1.0,
    highlightLastMove: true,
    showLegalMoves: true,
    showCoordinates: true,
    pieceAnimationSpeed: 'medium',
    boardOrientation: true,
    moveQualityFlash: false,
    showHints: true,
    moveMethod: 'both',
    moveConfirmation: false,
    autoPromoteQueen: true,
    masterAllOff: false,
    chessComUsername: undefined,
    lichessUsername: undefined,
    ...overrides,
  };
}

function buildDefaultSkillRadar(overrides?: Partial<SkillRadar>): SkillRadar {
  return {
    opening: 50,
    tactics: 50,
    endgame: 50,
    memory: 50,
    calculation: 50,
    ...overrides,
  };
}

interface UserProfileOverrides extends Omit<Partial<UserProfile>, 'preferences' | 'skillRadar'> {
  preferences?: Partial<UserPreferences>;
  skillRadar?: Partial<SkillRadar>;
}

export function buildUserProfile(overrides?: UserProfileOverrides): UserProfile {
  const { preferences, skillRadar, ...rest } = overrides ?? {};
  return {
    id: nextId('profile'),
    name: 'Test Player',
    isKidMode: false,
    currentRating: 1420,
    puzzleRating: 1400,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 0,
    lastActiveDate: today(),
    achievements: [],
    badHabits: rest.badHabits ?? [],
    preferences: buildDefaultPreferences(preferences),
    ...rest,
    skillRadar: buildDefaultSkillRadar(skillRadar),
  };
}

// ─── PuzzleRecord ───────────────────────────────────────────────────────────

export function buildPuzzleRecord(overrides?: Partial<PuzzleRecord>): PuzzleRecord {
  return {
    id: nextId('puzzle'),
    fen: 'r1bqkbnr/pppppppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    moves: 'd2d4 e5d4 f3d4',
    rating: 1400,
    themes: ['fork'],
    openingTags: null,
    popularity: 90,
    nbPlays: 1000,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: today(),
    srsLastReview: null,
    userRating: 1200,
    attempts: 0,
    successes: 0,
    ...overrides,
  };
}

// ─── OpeningRecord ──────────────────────────────────────────────────────────

export function buildOpeningRecord(overrides?: Partial<OpeningRecord>): OpeningRecord {
  return {
    id: nextId('opening'),
    eco: 'B20',
    name: 'Sicilian Defense',
    pgn: '1.e4 c5',
    uci: 'e2e4 c7c5',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    color: 'black',
    style: 'aggressive',
    isRepertoire: true,
    overview: 'The Sicilian Defense is the most popular response to 1.e4.',
    keyIdeas: ['Fight for the d4 square', 'Counter-attack on the queenside'],
    traps: ['Siberian Trap in the Smith-Morra'],
    warnings: ['Be careful of the Keres Attack'],
    variations: [
      { name: 'Najdorf', pgn: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6', explanation: 'Most popular variation' },
    ],
    drillAccuracy: 0,
    drillAttempts: 0,
    lastStudied: null,
    woodpeckerReps: 0,
    woodpeckerSpeed: null,
    woodpeckerLastDate: null,
    isFavorite: false,
    ...overrides,
  };
}

// ─── GameRecord ─────────────────────────────────────────────────────────────

export function buildGameRecord(overrides?: Partial<GameRecord>): GameRecord {
  return {
    id: nextId('game'),
    pgn: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 1-0',
    white: 'Player1',
    black: 'Player2',
    result: '1-0',
    date: '2024-01-15',
    event: 'Casual Game',
    eco: 'C65',
    whiteElo: 1500,
    blackElo: 1400,
    source: 'lichess',
    annotations: null,
    coachAnalysis: null,
    isMasterGame: false,
    openingId: null,
    ...overrides,
  };
}

// ─── FlashcardRecord ────────────────────────────────────────────────────────

export function buildFlashcardRecord(overrides?: Partial<FlashcardRecord>): FlashcardRecord {
  return {
    id: nextId('flashcard'),
    openingId: 'opening_1',
    type: 'best_move',
    questionFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    questionText: 'What is the best response to 1.e4?',
    answerMove: 'c5',
    answerText: 'The Sicilian Defense (1...c5) fights for the center asymmetrically.',
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: today(),
    srsLastReview: null,
    ...overrides,
  };
}

// ─── SessionRecord ──────────────────────────────────────────────────────────

function buildDefaultSessionPlan(overrides?: Partial<SessionPlan>): SessionPlan {
  return {
    blocks: [
      { type: 'opening_review', targetMinutes: 10, completed: false },
      { type: 'puzzle_drill', targetMinutes: 15, completed: false },
      { type: 'flashcards', targetMinutes: 10, completed: false },
      { type: 'game_analysis', targetMinutes: 10, completed: false },
    ],
    totalMinutes: 45,
    ...overrides,
  };
}

export function buildSessionRecord(overrides?: Partial<SessionRecord>): SessionRecord {
  return {
    id: nextId('session'),
    date: today(),
    profileId: 'profile_1',
    durationMinutes: 45,
    plan: buildDefaultSessionPlan(overrides?.plan),
    completed: false,
    puzzlesSolved: 0,
    puzzleAccuracy: 0,
    xpEarned: 0,
    coachSummary: null,
    ...overrides,
  };
}

// ─── CoachGameState ─────────────────────────────────────────────────────────

export function buildCoachGameState(overrides?: Partial<CoachGameState>): CoachGameState {
  return {
    gameId: nextId('coach_game'),
    playerColor: 'white',
    targetStrength: 1300,
    moves: [],
    hintsUsed: 0,
    currentHintLevel: 0,
    takebacksUsed: 0,
    status: 'playing',
    result: 'ongoing',
    keyMoments: [],
    ...overrides,
  };
}

// ─── ChatMessage ────────────────────────────────────────────────────────────

export function buildChatMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: nextId('msg'),
    role: 'user',
    content: 'Hello coach!',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── BadHabit ───────────────────────────────────────────────────────────────

export function buildBadHabit(overrides?: Partial<BadHabit>): BadHabit {
  return {
    id: nextId('habit'),
    description: 'Weak at forks',
    occurrences: 3,
    lastSeen: today(),
    isResolved: false,
    ...overrides,
  };
}

export function buildMiniGameProgress(
  overrides?: Partial<MiniGameProgress>,
): MiniGameProgress {
  return {
    levels: {},
    ...overrides,
  };
}

// ─── ProPlayer ─────────────────────────────────────────────────────────────

export function buildProPlayer(overrides?: Partial<ProPlayer>): ProPlayer {
  return {
    id: nextId('player'),
    name: 'Test Player',
    title: 'GM',
    rating: 2700,
    style: 'Aggressive, Dynamic',
    description: 'A test chess player.',
    imageInitials: 'TP',
    ...overrides,
  };
}

// ─── Reset counter (call in beforeEach if needed) ───────────────────────────

export function resetFactoryCounter(): void {
  counter = 0;
}
