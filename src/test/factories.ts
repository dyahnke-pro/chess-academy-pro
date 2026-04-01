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
  MistakePuzzle,
  ModelGame,
  MiddlegamePlan,
  GeneratedContent,
  CommonMistake,
  CheckpointQuizItem,
  SetupPuzzle,
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
    pollyEnabled: false,
    pollyVoice: 'ruth',
    kokoroEnabled: true,
    kokoroVoiceId: 'af_bella',
    systemVoiceURI: null,
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

// ─── MistakePuzzle ─────────────────────────────────────────────────────────

export function buildMistakePuzzle(overrides?: Partial<MistakePuzzle>): MistakePuzzle {
  return {
    id: nextId('mistake'),
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    playerMove: 'f3g5',
    playerMoveSan: 'Ng5',
    bestMove: 'd2d4',
    bestMoveSan: 'd4',
    moves: 'd2d4 d7d5 c4b5',
    cpLoss: 150,
    classification: 'mistake',
    gamePhase: 'opening',
    moveNumber: 4,
    sourceGameId: 'game_1',
    sourceMode: 'coach',
    playerColor: 'white',
    promptText: 'This move cost you. What should you have played?',
    narration: {
      intro: 'You played Ng5, but d4 was significantly better — that cost you around 1.5 pawns.',
      moveNarrations: ['Good — d4 is the right move here.', 'Nice, Bb5. Keep going.'],
      outro: 'In the opening, piece development and center control are everything.',
      conceptHint: 'Consider reinforcing your control of the center.',
    },
    createdAt: new Date().toISOString(),
    opponentName: 'Stockfish Bot',
    gameDate: '2024-01-15',
    openingName: 'Italian Game',
    evalBefore: 0.3,
    srsInterval: 0,
    srsEaseFactor: 0,
    srsRepetitions: 0,
    srsDueDate: today(),
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    ...overrides,
  };
}

// ─── ModelGame ─────────────────────────────────────────────────────────────

export function buildModelGame(overrides?: Partial<ModelGame>): ModelGame {
  return {
    id: nextId('model-game'),
    openingId: 'italian-game',
    white: 'Morphy',
    black: 'Duke of Brunswick',
    whiteElo: null,
    blackElo: null,
    result: '1-0',
    year: 1858,
    event: 'Paris Opera',
    pgn: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
    overview: 'The Opera Game demonstrates the power of rapid development and open lines.',
    criticalMoments: [
      {
        moveNumber: 10,
        color: 'white',
        fen: 'rn1qkb1r/ppp2ppp/5n2/1B2p3/4P3/1QN5/PPP2PPP/R1B1K2R b KQkq - 1 10',
        annotation: 'White has a commanding lead in development. The queen and bishop battery targets f7.',
        concept: 'Development advantage',
      },
    ],
    middlegameTheme: 'Rapid development and tactical finish',
    lessonSummary: 'Develop your pieces quickly and punish opponents who waste time.',
    ...overrides,
  };
}

// ─── MiddlegamePlan ────────────────────────────────────────────────────────

export function buildMiddlegamePlan(overrides?: Partial<MiddlegamePlan>): MiddlegamePlan {
  return {
    id: nextId('plan'),
    openingId: 'italian-game',
    criticalPositionFen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    title: 'Central Expansion with d4',
    overview: 'White aims to establish a strong pawn center with c3 and d4, then use the open lines to attack the kingside.',
    pawnBreaks: [
      {
        move: 'd3-d4',
        explanation: 'The key central break. After proper preparation with c3, d4 opens the center when White has superior development.',
        fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 0 8',
      },
    ],
    pieceManeuvers: [
      {
        piece: 'Knight',
        route: 'Nb1-d2-f1-g3',
        explanation: 'The knight reroutes to g3 to support the f5 advance and control key kingside squares.',
      },
    ],
    strategicThemes: ['Control the d4 square', 'Kingside attack with f4-f5'],
    endgameTransitions: ['Trade into a favorable bishop endgame with the bishop pair'],
    ...overrides,
  };
}

// ─── GeneratedContent ──────────────────────────────────────────────────────

export function buildGeneratedContent(overrides?: Partial<GeneratedContent>): GeneratedContent {
  return {
    id: nextId('content'),
    openingId: 'italian-game',
    type: 'middlegame_plan',
    content: 'The Italian Game middlegame revolves around central control...',
    groundingData: '{"topMoves": "d4: 5000 games"}',
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Common Mistakes ────────────────────────────────────────────────────────

export function buildCommonMistake(overrides?: Partial<CommonMistake>): CommonMistake {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    wrongMove: 'f6',
    correctMove: 'e5',
    explanation: 'f6 weakens the kingside. Play e5 instead.',
    ...overrides,
  };
}

// ─── Checkpoint Quiz ────────────────────────────────────────────────────────

export function buildCheckpointQuiz(overrides?: Partial<CheckpointQuizItem>): CheckpointQuizItem {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    correctMove: 'e5',
    hint: 'Mirror the center pawn.',
    concept: 'Symmetrical Response',
    ...overrides,
  };
}

// ─── Setup Puzzle ──────────────────────────────────────────────────────────

export function buildSetupPuzzle(overrides?: Partial<SetupPuzzle>): SetupPuzzle {
  return {
    id: nextId('setup'),
    // Position where Nf3 is a valid prep move (white to play)
    setupFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
    solutionMoves: 'g1f3',
    tacticFen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 1',
    tacticMoves: 'd2d4',
    tacticType: 'fork',
    difficulty: 1,
    sourceGameId: null,
    sourceMistakePuzzleId: null,
    playerColor: 'white',
    openingName: null,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: today(),
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    createdAt: today(),
    ...overrides,
  };
}

// ─── Reset counter (call in beforeEach if needed) ───────────────────────────

export function resetFactoryCounter(): void {
  counter = 0;
}
