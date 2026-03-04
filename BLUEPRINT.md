# BLUEPRINT.md — Chess Academy Pro Technical Specification

This document is the single source of truth for all technical decisions. Load it into every Claude Code session alongside the relevant work order.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Schemas](#2-data-schemas)
3. [Stockfish Integration](#3-stockfish-integration)
4. [LLM Coach System](#4-llm-coach-system)
5. [Spaced Repetition System](#5-spaced-repetition-system)
6. [Opening Database](#6-opening-database)
7. [Puzzle System](#7-puzzle-system)
8. [External API Contracts](#8-external-api-contracts)
9. [Theme System](#9-theme-system)
10. [Gamification System](#10-gamification-system)
11. [Kid Mode](#11-kid-mode)
12. [Adaptive Training Session Generator](#12-adaptive-training-session-generator)
13. [Hosting & Deployment](#13-hosting--deployment)
14. [Platform Detection & Dual Engine Strategy](#14-platform-detection--dual-engine-strategy)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React UI Layer                         │
│  (Components, Routing, Themes, Animations)               │
├──────────────────────────────────────────────────────────┤
│                  Zustand State Layer                      │
│  (Runtime state: current game, session, UI, settings)    │
├──────────┬──────────┬────────────┬───────────────────────┤
│ Stockfish│ Coach    │ SRS Engine │ Data Services         │
│ Service  │ Service  │            │ (CRUD for Dexie)      │
│ (Worker) │ (Claude) │ (SM-2)     │                       │
├──────────┴──────────┴────────────┴───────────────────────┤
│              Dexie.js / IndexedDB Layer                   │
│  (Puzzles, Games, SRS Cards, User Progress, Settings)    │
└──────────────────────────────────────────────────────────┘
         │                    │                  │
    Stockfish WASM      Claude API         Lichess/Chess.com
    (Web Worker)     (Direct browser)       (REST APIs)
```

### Routing Structure

```
/                       → Dashboard (daily session, streaks, quick actions)
/play                   → Play vs AI bot
/puzzles                → Puzzle trainer (SRS-driven)
/puzzles/blitz          → Timed puzzle blitz
/openings               → Opening explorer (tree view)
/openings/:id           → Specific opening detail + drill
/flashcards             → SRS flashcard review
/games                  → Master games database
/games/:id              → Game viewer with coach commentary
/games/import           → Import from Lichess/Chess.com
/analysis               → Free analysis board with Stockfish
/stats                  → Performance & stats dashboard
/kid                    → Kid Mode entry
/kid/learn/:piece       → Learn individual piece
/kid/play               → Kid-friendly play
/kid/puzzles            → Kid puzzles (simplified)
/settings               → App settings, API key, theme, profile
/settings/onboarding    → First-run API key setup
```

### Service Layer

All business logic lives in `src/services/`. Components never call APIs or engine directly.

```
src/services/
  stockfishEngine.ts    → Singleton. Wraps Stockfish Web Worker. UCI protocol.
  coachApi.ts           → Singleton. Claude API calls, streaming, caching, offline fallback.
  coachPrompts.ts       → System prompts for all 3 coach personalities.
  srsEngine.ts          → Pure functions. SM-2 scheduling algorithm.
  puzzleService.ts      → Puzzle selection, adaptive difficulty, theme weighting.
  openingService.ts     → Opening tree traversal, drill logic, repertoire management.
  gameImportService.ts  → Lichess + Chess.com API integration, PGN parsing.
  flashcardService.ts   → Flashcard generation, review scheduling.
  sessionGenerator.ts   → Daily training session builder.
  achievementService.ts → XP, levels, badges, unlockable checks.
  themeService.ts       → Theme switching, custom theme persistence.
  speechService.ts      → Web Speech API TTS wrapper.
  cryptoService.ts      → API key encryption/decryption (Web Crypto API).
  analyticsService.ts   → Bad habit detection, performance tracking.
  dbService.ts          → Dexie instance, migration management, data export/import.
```

---

## 2. Data Schemas

### Dexie Database Schema (src/db/schema.ts)

```typescript
// Database: ChessAcademyDB, version 1

interface PuzzleRecord {
  id: string;                    // Lichess puzzle ID
  fen: string;                   // Position FEN (before opponent's move)
  moves: string;                 // UCI moves (space-separated)
  rating: number;                // Glicko-2 puzzle rating
  themes: string[];              // e.g., ['fork', 'middlegame', 'short']
  openingTags: string | null;    // ECO-style opening tag
  popularity: number;            // -100 to 100
  nbPlays: number;
  // SRS fields
  srsInterval: number;          // Days until next review
  srsEaseFactor: number;        // SM-2 ease factor (default 2.5)
  srsRepetitions: number;       // Consecutive correct count
  srsDueDate: string;           // ISO date string
  srsLastReview: string | null; // ISO date string
  userRating: number;           // User's adaptive puzzle rating
  attempts: number;             // Total attempts
  successes: number;            // Total correct
}

interface OpeningRecord {
  id: string;                    // Slug: "vienna-gambit"
  eco: string;                   // ECO code: "C29"
  name: string;                  // "Vienna Gambit"
  pgn: string;                   // SAN moves: "1.e4 e5 2.Nc3 Nf6 3.f4"
  uci: string;                   // UCI moves
  fen: string;                   // Final position FEN
  color: 'white' | 'black';
  style: string;                 // "Gambit, Aggressive"
  isRepertoire: boolean;         // true = user's personal repertoire
  // Repertoire-only fields (null for general ECO entries)
  overview: string | null;       // Coach-voice overview text
  keyIdeas: string[] | null;     // List of key plans
  traps: string[] | null;        // Common traps
  warnings: string[] | null;     // "Watch out for" items
  variations: OpeningVariation[] | null;
  // Progress tracking
  drillAccuracy: number;         // 0-1, rolling accuracy in drill mode
  drillAttempts: number;
  lastStudied: string | null;    // ISO date
}

interface OpeningVariation {
  name: string;                  // "Main Line", "Knight Variation"
  pgn: string;                   // SAN moves for this variation
  explanation: string;           // Coach commentary
}

interface GameRecord {
  id: string;                    // UUID or Lichess/Chess.com game ID
  pgn: string;                   // Full PGN
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  date: string;                  // ISO date
  event: string;
  eco: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  source: 'lichess' | 'chesscom' | 'master' | 'import';
  annotations: MoveAnnotation[] | null;
  coachAnalysis: string | null;  // Cached LLM analysis
  isMasterGame: boolean;
  openingId: string | null;      // Link to OpeningRecord
}

interface MoveAnnotation {
  moveNumber: number;
  color: 'white' | 'black';
  san: string;                   // The move played
  evaluation: number | null;     // Stockfish eval (centipawns)
  bestMove: string | null;       // Engine best move (SAN)
  classification: 'brilliant' | 'great' | 'good' | 'book' |
                  'inaccuracy' | 'mistake' | 'blunder';
  comment: string | null;        // Coach or annotator comment
}

interface FlashcardRecord {
  id: string;                    // UUID
  openingId: string;             // Link to OpeningRecord
  type: 'best_move' | 'name_opening' | 'explain_idea';
  questionFen: string;           // Board position to show
  questionText: string;          // "What is White's best move here?"
  answerMove: string | null;     // SAN move (for best_move type)
  answerText: string;            // Full answer text
  // SRS fields (same as PuzzleRecord)
  srsInterval: number;
  srsEaseFactor: number;
  srsRepetitions: number;
  srsDueDate: string;
  srsLastReview: string | null;
}

interface UserProfile {
  id: string;                    // 'main' or 'kid'
  name: string;
  isKidMode: boolean;
  coachPersonality: 'kasparov' | 'fischer' | 'danya';
  currentRating: number;         // Estimated rating
  puzzleRating: number;          // Adaptive puzzle rating
  xp: number;
  level: number;
  currentStreak: number;         // Days
  longestStreak: number;
  streakFreezes: number;
  lastActiveDate: string;        // ISO date
  achievements: string[];        // Achievement IDs
  unlockedCoaches: string[];     // 'danya' always, others earned
  skillRadar: SkillRadar;
  badHabits: BadHabit[];
  preferences: UserPreferences;
}

interface SkillRadar {
  opening: number;       // 0-100
  tactics: number;
  endgame: number;
  memory: number;
  calculation: number;
}

interface BadHabit {
  id: string;
  description: string;       // "Moving the same piece twice in the opening"
  occurrences: number;
  lastSeen: string;          // ISO date
  isResolved: boolean;
}

interface UserPreferences {
  theme: string;                 // Theme ID
  boardColor: string;            // Board color scheme
  pieceSet: string;              // Piece set name
  showEvalBar: boolean;
  showEngineLines: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  dailySessionMinutes: number;   // Target: 45-60
  apiKeyEncrypted: string | null;
  apiKeyIv: string | null;       // AES-GCM IV
  preferredModel: {
    commentary: string;          // 'claude-haiku-4-5-20251001'
    analysis: string;            // 'claude-sonnet-4-5-20250514'
    reports: string;             // 'claude-opus-4-5-20250514'
  };
  monthlyBudgetCap: number | null; // USD
  estimatedSpend: number;          // USD this month
}

interface SessionRecord {
  id: string;                    // UUID
  date: string;                  // ISO date
  profileId: string;             // 'main' or 'kid'
  durationMinutes: number;
  plan: SessionPlan;
  completed: boolean;
  puzzlesSolved: number;
  puzzleAccuracy: number;
  xpEarned: number;
  coachSummary: string | null;   // Post-session coach feedback
}

interface SessionPlan {
  blocks: SessionBlock[];
  totalMinutes: number;
}

interface SessionBlock {
  type: 'opening_review' | 'puzzle_drill' | 'flashcards' |
        'game_analysis' | 'endgame_drill' | 'master_game_study';
  targetMinutes: number;
  openingId?: string;
  puzzleTheme?: string;
  gameId?: string;
  completed: boolean;
}

// Dexie table definitions
// db.version(1).stores({
//   puzzles:    'id, rating, *themes, srsDueDate, userRating',
//   openings:   'id, eco, name, color, isRepertoire',
//   games:      'id, source, eco, date, isMasterGame, openingId',
//   flashcards: 'id, openingId, type, srsDueDate',
//   profiles:   'id',
//   sessions:   'id, date, profileId',
// });
```

---

## 3. Stockfish Integration

### Architecture

```
React Component
    │
    ▼
useStockfish() hook
    │
    ▼
StockfishEngine service (singleton)
    │
    ▼
Web Worker (stockfish.js WASM)
```

### Platform Detection & Build Selection

```typescript
// src/services/stockfishEngine.ts

function getStockfishBuild(): string {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Always use lite single-threaded on mobile (7MB)
    return '/stockfish/stockfish-nnue-16-single.js';
  }

  if (hasSharedArrayBuffer) {
    // Desktop with COOP/COEP headers: use lite multi-threaded
    return '/stockfish/stockfish-nnue-16-multi.js';
  }

  // Desktop without headers: lite single-threaded
  return '/stockfish/stockfish-nnue-16-single.js';
}
```

### UCI Protocol Wrapper

```typescript
interface StockfishAnalysis {
  bestMove: string;          // UCI format: "e2e4"
  evaluation: number;        // Centipawns from side-to-move perspective
  isMate: boolean;
  mateIn: number | null;
  depth: number;
  topLines: AnalysisLine[];  // Top 3 lines (MultiPV 3)
  nodesPerSecond: number;
}

interface AnalysisLine {
  rank: number;              // 1, 2, or 3
  evaluation: number;
  moves: string[];           // UCI moves
  mate: number | null;
}

// Key UCI commands used:
// 'uci'                          → initialize
// 'isready'                      → wait for ready
// 'ucinewgame'                   → reset for new game
// 'setoption name MultiPV value 3'  → show top 3 lines
// 'setoption name Threads value N'  → set thread count
// 'position fen <FEN>'           → set position
// 'go depth <N>'                 → search to depth N
// 'go movetime <ms>'             → search for N milliseconds
// 'stop'                         → stop current search
```

### Depth Settings

| Context | Depth | Estimated Time (mobile) |
|---------|-------|------------------------|
| Puzzle validation | 12 | <1s |
| Quick eval (during play) | 15 | 1-2s |
| Post-move analysis | 18 | 3-5s |
| Post-game full analysis | 20 | 5-10s per move |
| Deep analysis (desktop) | 24 | 10-20s per move |

### Eval Bar Display

- Vertical bar on the side of the board
- White side = positive eval, black side = negative
- Scale: clamp to [-10, +10] centipawns for display
- Mate scores shown as "M3", "M-2" etc.
- Bar smoothly animates between positions
- Toggleable in settings

---

## 4. LLM Coach System

### Architecture

```
User action (move, puzzle, etc.)
    │
    ▼
CoachService.getCommentary(context)
    │
    ├─ Online? ──► Claude API (streaming)
    │                 │
    │                 ├─ Haiku: live move commentary
    │                 ├─ Sonnet: post-game analysis, daily lessons
    │                 └─ Opus: weekly reports, deep analysis
    │
    └─ Offline? ──► Template fallback (personality-specific)
                      │
                      └─ Stockfish data + pre-written templates
```

### API Key Management

```typescript
// src/services/cryptoService.ts

// Uses Web Crypto API (AES-256-GCM)
// Key derived from app-specific constant + device entropy

async function encryptApiKey(plainKey: string): Promise<{ encrypted: string; iv: string }>;
async function decryptApiKey(encrypted: string, iv: string): Promise<string>;

// Stored in Dexie UserPreferences:
//   apiKeyEncrypted: base64-encoded ciphertext
//   apiKeyIv: base64-encoded IV
```

### Model Routing

```typescript
type CoachTask =
  | 'move_commentary'      // → Haiku (fast, cheap)
  | 'hint'                 // → Haiku
  | 'puzzle_feedback'      // → Haiku
  | 'post_game_analysis'   // → Sonnet
  | 'daily_lesson'         // → Sonnet
  | 'bad_habit_report'     // → Sonnet
  | 'weekly_report'        // → Opus
  | 'deep_analysis'        // → Opus
  | 'opening_overview'     // → Sonnet

const MODEL_MAP: Record<CoachTask, string> = {
  move_commentary:    'claude-haiku-4-5-20251001',
  hint:               'claude-haiku-4-5-20251001',
  puzzle_feedback:    'claude-haiku-4-5-20251001',
  post_game_analysis: 'claude-sonnet-4-5-20250514',
  daily_lesson:       'claude-sonnet-4-5-20250514',
  bad_habit_report:   'claude-sonnet-4-5-20250514',
  weekly_report:      'claude-opus-4-5-20250514',
  deep_analysis:      'claude-opus-4-5-20250514',
  opening_overview:   'claude-sonnet-4-5-20250514',
};
```

### Coach Personality System Prompts

Each coach has a base system prompt structured as:

```
[IDENTITY & ROLE]
[PERSONALITY TRAITS — Big Five dimensions]
[COMMUNICATION STYLE — tone, vocabulary, sentence patterns]
[CHESS PHILOSOPHY — what they value, what they hate]
[RESPONSE FORMAT — how to structure output]
[BEHAVIORAL RULES — stay in character, use Stockfish data, etc.]
[FEW-SHOT EXAMPLES — 3-4 example interactions]
```

The system prompt is placed at the START of the messages array with `cache_control: { type: "ephemeral" }` to enable Anthropic prompt caching (90% cost reduction on cached tokens).

### Chess Context Format (sent as user message)

```
Position (FEN): rnbqkb1r/pppppppp/5n2/4P3/2B5/8/PPPP1PPP/RNBQK1NR b KQkq - 0 3
Last move: e4-e5 (White pushed the e-pawn)
Move number: 3 (Black to move)
Game PGN (last 5 moves): 1.e4 e5 2.Bc4 Nf6 3.e5
Opening: Bishop's Opening / Berlin Defense

Stockfish evaluation: +0.8 (White is slightly better)
Stockfish best move: Nd5 (eval: +0.3 after Nd5)
Top 3 lines:
  1. Nd5 (+0.3): Nd5 c3 c6 d4 Be7
  2. Ne4 (+0.9): Ne4 d3 Nc5 Qe2 d6
  3. d5 (+1.2): d5 Bb3 Bc5 d3 O-O

Player's move: d5
Eval after player's move: +1.2
Classification: Inaccuracy (Nd5 was better by 0.9cp)

Player profile: ~1420 ELO, aggressive style, studying Vienna Game
Current weakness: Tends to advance pawns instead of developing pieces
```

### Streaming Implementation

```typescript
// Use @anthropic-ai/sdk with dangerouslyAllowBrowser: true
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: decryptedKey,
  dangerouslyAllowBrowser: true,
});

const stream = client.messages.stream({
  model: modelForTask,
  max_tokens: maxTokensForTask,
  system: [
    {
      type: 'text',
      text: coachSystemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [{ role: 'user', content: chessContext }],
});
```

### Token Budgets

| Task | Max Tokens | Estimated Cost (Haiku/Sonnet/Opus) |
|------|------------|-----------------------------------|
| Move commentary | 200 | ~$0.005 |
| Hint | 100 | ~$0.002 |
| Puzzle feedback | 150 | ~$0.003 |
| Post-game analysis | 1000 | ~$0.018 |
| Daily lesson | 500 | ~$0.011 |
| Bad habit report | 600 | ~$0.014 |
| Weekly report | 1500 | ~$0.025 |
| Opening overview | 800 | ~$0.015 |

### Offline Fallback Templates

When API is unavailable, use pre-written templates interpolated with Stockfish data:

```typescript
interface TemplateContext {
  classification: MoveClassification;
  evalDelta: number;
  bestMove: string;
  playerMove: string;
  isCapture: boolean;
  isCheck: boolean;
  isCastling: boolean;
  phase: 'opening' | 'middlegame' | 'endgame';
}

// Templates stored per personality, per classification, per phase
// Example: danyaTemplates.middlegame.inaccuracy[0]
// "That wasn't quite right — {bestMove} was stronger here because it
//  keeps more pressure on the position. Your move {playerMove} lets
//  the opponent equalize. But no worries, let's keep going!"
```

### Cost Tracking

Track every API call in a Dexie table:

```typescript
interface ApiUsageRecord {
  id: string;
  date: string;
  model: string;
  task: CoachTask;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costUsd: number;         // Calculated from token counts
}
```

Display running monthly total in settings. Warn at 80% and 100% of budget cap.

---

## 5. Spaced Repetition System

### SM-2 Algorithm Implementation

```typescript
// src/services/srsEngine.ts

interface SrsCard {
  interval: number;        // Days until next review
  easeFactor: number;      // Minimum 1.3, default 2.5
  repetitions: number;     // Consecutive correct answers
}

type SrsGrade = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = Again (complete blackout)
// 1 = Hard (wrong, but recognized after seeing answer)
// 2 = Hard (correct, but with serious difficulty)
// 3 = Good (correct with some hesitation)
// 4 = Good (correct with ease)
// 5 = Easy (trivial)

// UI buttons map to:
// "Again" → grade 0 → interval reset to 1 day
// "Hard"  → grade 2 → interval * 1.2
// "Good"  → grade 3 → interval * easeFactor
// "Easy"  → grade 5 → interval * easeFactor * 1.3

function calculateNextReview(card: SrsCard, grade: SrsGrade): SrsCard {
  let { interval, easeFactor, repetitions } = card;

  if (grade < 3) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  return { interval, easeFactor, repetitions };
}
```

### SRS Display on Buttons

Each button shows the next review date:
- "Again" → "< 1 day"
- "Hard" → "2 days"
- "Good" → "6 days"
- "Easy" → "14 days"

Calculate these preview values before rendering using the current card state.

---

## 6. Opening Database

### Data Sources

1. **Full ECO Database:** `lichess-org/chess-openings` — 3,546 entries, TSV format
   - Fields: `eco`, `name`, `pgn`, `uci`, `epd`
   - Downloaded and converted to JSON at build time
   - Stored in `src/data/openings-eco.json`

2. **Extended Database:** `hayatbiralem/eco.json` — 12,000+ variations
   - Used for deeper transposition detection
   - Stored in `src/data/openings-extended.json`

3. **User Repertoire:** Custom annotated data — 40 openings (20 White, 20 Black)
   - Stored in `src/data/repertoire/*.json` (one file per opening)
   - Contains: overview, variations, key ideas, traps, warnings
   - Initial content generated by LLM coach, refined over time

### Opening Tree Structure

```typescript
interface OpeningTreeNode {
  fen: string;              // Position after this move
  san: string;              // Move in SAN notation ("e4", "Nf3")
  uci: string;              // Move in UCI notation ("e2e4")
  eco: string | null;       // ECO code if this position has one
  name: string | null;      // Opening name if recognized
  comment: string | null;   // Coach annotation
  isMainLine: boolean;
  isRepertoire: boolean;    // Part of user's repertoire?
  children: OpeningTreeNode[];
}
```

### White Repertoire (20 openings)

| # | Opening | Moves | ECO |
|---|---------|-------|-----|
| 1 | Vienna Game | 1.e4 e5 2.Nc3 | C25 |
| 2 | Vienna Gambit | 1.e4 e5 2.Nc3 Nf6 3.f4 | C29 |
| 3 | Scotch Game | 1.e4 e5 2.Nf3 Nc6 3.d4 | C45 |
| 4 | Scotch Gambit | 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4 | C44 |
| 5 | Bishop's Opening | 1.e4 e5 2.Bc4 | C23 |
| 6 | Evans Gambit | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 | C51 |
| 7 | King's Gambit | 1.e4 e5 2.f4 | C30 |
| 8 | Danish Gambit | 1.e4 e5 2.d4 exd4 3.c3 | C21 |
| 9 | Italian / Giuoco Piano | 1.e4 e5 2.Nf3 Nc6 3.Bc4 | C50 |
| 10 | Two Knights (as White) | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 | C57 |
| 11 | Fried Liver Attack | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 | C57 |
| 12 | Reti Opening | 1.Nf3 d5 2.c4 | A09 |
| 13 | London System (Aggressive) | 1.d4 Nf6 2.Nf3 d5 3.Bf4 | D00 |
| 14 | Jobava London | 1.d4 Nf6 2.Nc3 d5 3.Bf4 | D00 |
| 15 | Queen's Gambit | 1.d4 d5 2.c4 | D06 |
| 16 | Catalan Opening | 1.d4 Nf6 2.c4 e6 3.g3 | E00 |
| 17 | King's Indian Attack | 1.Nf3 d5 2.g3 | A07 |
| 18 | Trompowsky Attack | 1.d4 Nf6 2.Bg5 | A45 |
| 19 | Bird's Opening | 1.f4 | A02 |
| 20 | Goring Gambit | 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.c3 | C44 |

### Black Repertoire (20 openings)

| # | Opening | Moves | ECO |
|---|---------|-------|-----|
| 1 | Sicilian Black Lion | 1.e4 c5 2.Nf3 d6 ...Nbd7 | B50 |
| 2 | Sicilian Najdorf | 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 | B90 |
| 3 | Sicilian Dragon | 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 | B70 |
| 4 | Caro-Kann Defence | 1.e4 c6 | B10 |
| 5 | French Defence | 1.e4 e6 | C00 |
| 6 | Pirc / Modern Defence | 1.e4 d6 2.d4 Nf6 | B07 |
| 7 | Scandinavian Defence | 1.e4 d5 | B01 |
| 8 | King's Indian Defence | 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 | E60 |
| 9 | Nimzo-Indian Defence | 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 | E20 |
| 10 | Grunfeld Defence | 1.d4 Nf6 2.c4 g6 3.Nc3 d5 | D80 |
| 11 | Dutch Defence | 1.d4 f5 | A80 |
| 12 | Queen's Indian Defence | 1.d4 Nf6 2.c4 e6 3.Nf3 b6 | E15 |
| 13 | Budapest Gambit | 1.d4 Nf6 2.c4 e5 | A51 |
| 14 | Benko Gambit | 1.d4 Nf6 2.c4 c5 3.d5 b5 | A57 |
| 15 | Benoni Defence | 1.d4 Nf6 2.c4 c5 3.d5 e6 | A60 |
| 16 | Old Indian Defence | 1.d4 Nf6 2.c4 d6 | A53 |
| 17 | Alekhine's Defence | 1.e4 Nf6 | B02 |
| 18 | Philidor Defence | 1.e4 e5 2.Nf3 d6 | C41 |
| 19 | Owen's Defence | 1.e4 b6 | B00 |
| 20 | Leningrad Dutch | 1.d4 f5 2.c4 Nf6 3.g3 g6 | A87 |

---

## 7. Puzzle System

### Data Source

Lichess puzzle database: ~4.6M puzzles, CSV format.

**For the app, pre-filter to a manageable subset:**
- Filter: rating 600-2400, popularity > 0, themes not empty
- Target: ~500,000 puzzles stored locally
- Initial load: ~50,000 puzzles (matching user's rating band +/- 400)
- Lazy load more as user's rating changes

### Puzzle CSV Format (from Lichess)

```
PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
00008,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,f2g3 e6e7 b2b1 b3c1 b1c1 h6c1,1852,74,97,44456,crushing hangingPiece long middlegame,https://lichess.org/787zsVup/black#48,
```

### Theme Mapping

The 10 required tactical themes map to Lichess theme tags:

| App Theme | Lichess Tags |
|-----------|-------------|
| Forks | `fork` |
| Pins & Skewers | `pin`, `skewer` |
| Discovered Attacks | `discoveredAttack` |
| Back Rank Mates | `backRankMate` |
| Sacrifices | `sacrifice` |
| Deflection & Decoy | `deflection` |
| Zugzwang | `zugzwang` |
| Endgame Technique | `endgame`, `rookEndgame`, `pawnEndgame`, `bishopEndgame`, `knightEndgame`, `queenEndgame` |
| Opening Traps | `openingTrap` (custom: match opening tags to user's repertoire) |
| Mating Nets | `mateIn1`, `mateIn2`, `mateIn3`, `mateIn4`, `mateIn5`, `smotheredMate`, `hookMate`, `arabianMate`, `anastasiaMate` |

### Adaptive Difficulty

```typescript
// User starts at their estimated rating (e.g., 1420)
// After each puzzle:
function updatePuzzleRating(
  userRating: number,
  puzzleRating: number,
  correct: boolean
): number {
  const K = 32; // K-factor
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - userRating) / 400));
  const score = correct ? 1 : 0;
  return Math.round(userRating + K * (score - expected));
}

// Puzzle selection: pick puzzles within userRating +/- 200
// Weighted toward weakest themes
```

---

## 8. External API Contracts

### Lichess API

```
Base URL: https://lichess.org/api

# Get user games (NDJSON format)
GET /api/games/user/{username}
  ?max=50
  &rated=true
  &analysed=true
  &opening=true
  ?since={timestamp_ms}
Headers:
  Accept: application/x-ndjson

# Get user profile
GET /api/user/{username}

# No API key needed. Rate limit: 20 req/sec.
```

### Chess.com Published Data API

```
Base URL: https://api.chess.com/pub

# Get monthly archives list
GET /player/{username}/games/archives

# Get games for a month (PGN format)
GET /player/{username}/games/{YYYY}/{MM}

# Get player stats
GET /player/{username}/stats

# No API key needed. Rate limit: reasonable use.
```

---

## 9. Theme System

### 7 Themes

```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  colors: {
    background: string;      // Page background
    surface: string;         // Card/panel background
    surfaceAlt: string;      // Alternate surface
    primary: string;         // Primary accent
    primaryHover: string;
    secondary: string;       // Secondary accent
    text: string;            // Primary text
    textMuted: string;       // Secondary text
    border: string;
    success: string;
    error: string;
    warning: string;
  };
  boardColors: {
    light: string;           // Light squares
    dark: string;            // Dark squares
    highlight: string;       // Last move highlight
    selected: string;        // Selected piece
  };
}

const THEMES: ThemeDefinition[] = [
  { id: 'classic-wood',    name: 'Classic Wood',     /* warm browns */ },
  { id: 'dark-premium',    name: 'Dark Premium',     /* near-black + gold */ },
  { id: 'bold-red',        name: 'Bold Red & Black', /* dramatic contrast */ },
  { id: 'light-minimal',   name: 'Light & Minimal',  /* white, clean */ },
  { id: 'midnight-blue',   name: 'Midnight Blue',    /* navy + silver */ },
  { id: 'forest-green',    name: 'Forest Green',     /* tournament hall */ },
  { id: 'custom',          name: 'Custom Builder',   /* user-defined */ },
];
```

### Piece Sets

- `classic` — Standard Staunton (default)
- `modern` — Clean, contemporary design
- `minimalist` — Flat, geometric
- `3d` — Pseudo-3D rendered pieces
- `cartoon` — Fun, child-friendly (Kid Mode default)

### Board Color Schemes

- `classic` — Cream / brown
- `walnut` — Warm wood tones
- `blue` — Light blue / navy
- `green` — Light green / dark green (tournament style)
- `pink` — Light pink / magenta (Kid Mode option)

---

## 10. Gamification System

### XP Sources

| Action | XP |
|--------|-----|
| Solve a puzzle (correct) | 10 + (puzzle_rating - user_rating) / 100 |
| Complete a training session | 50 |
| Finish an opening drill | 25 |
| Review flashcards (10+ cards) | 15 |
| Import and analyze a game | 20 |
| Daily login (streak) | 5 * streak_day (max 50) |
| Study a master game | 15 |

### Level Titles

| Level | Title | XP Required |
|-------|-------|------------|
| 1 | Pawn | 0 |
| 2 | Knight | 200 |
| 3 | Bishop | 500 |
| 4 | Rook | 1,000 |
| 5 | Queen | 2,000 |
| 6 | King | 4,000 |
| 7 | Grandmaster | 8,000 |
| 8+ | Super GM | 8,000 + 4,000 per level |

### Coach Unlocks

- Level 1: Danya (default)
- Level 5: Kasparov
- Level 10: Fischer
- Level 15: Custom coach builder

### Achievement IDs

```
streak_3, streak_7, streak_30, streak_100
puzzles_10, puzzles_100, puzzles_500, puzzles_1000
accuracy_90_20, accuracy_95_10
opening_scholar_white, opening_scholar_black, opening_scholar_all
vienna_warrior, black_lion_master
endgame_king, tactics_master
first_import, first_analysis
kid_first_check, kid_capture_10, kid_all_pieces
```

---

## 11. Kid Mode

### Profile

- Separate `UserProfile` with `isKidMode: true`
- Name + avatar (selectable from presets)
- No rating display — stars and stickers instead
- Coach always uses Danya personality with simplified language

### Piece Learning Sequence

1. King (how it moves, can't move into check)
2. Rook (straight lines)
3. Bishop (diagonals)
4. Queen (combines rook + bishop)
5. Knight (L-shape, can jump)
6. Pawn (forward, captures diagonal, promotion basics)

### Mini Games

- **Capture the Pawn!** — One piece vs scattered pawns, capture them all
- **Put the King in Check!** — Find the checking move
- **Escape!** — King must escape from threats
- **Knight's Tour** — Move knight to visit all highlighted squares

### Visual Differences

- Larger board (fills screen)
- Cartoon piece set by default
- Pink/pastel board option
- Animated star rewards for correct moves
- No eval bar, no engine lines
- Simple language in all UI text

### Parent Dashboard

- View child's progress (pieces learned, mini-games completed)
- Time spent per session
- No detailed stats — just encouragement metrics

---

## 12. Adaptive Training Session Generator

### Daily Session Algorithm

```typescript
function generateDailySession(profile: UserProfile): SessionPlan {
  const targetMinutes = profile.preferences.dailySessionMinutes; // 45-60
  const blocks: SessionBlock[] = [];

  // 1. Opening Review (25% of time)
  const weakestOpening = getWeakestRepertoireOpening(profile);
  blocks.push({
    type: 'opening_review',
    targetMinutes: Math.round(targetMinutes * 0.25),
    openingId: weakestOpening.id,
    completed: false,
  });

  // 2. Puzzle Drill (35% of time)
  const weakestTheme = getWeakestPuzzleTheme(profile);
  blocks.push({
    type: 'puzzle_drill',
    targetMinutes: Math.round(targetMinutes * 0.35),
    puzzleTheme: weakestTheme,
    completed: false,
  });

  // 3. Flashcards (15% of time)
  blocks.push({
    type: 'flashcards',
    targetMinutes: Math.round(targetMinutes * 0.15),
    completed: false,
  });

  // 4. Game Analysis or Master Game Study (25% of time)
  const hasUnanalyzedGames = checkUnanalyzedGames(profile);
  blocks.push({
    type: hasUnanalyzedGames ? 'game_analysis' : 'master_game_study',
    targetMinutes: Math.round(targetMinutes * 0.25),
    completed: false,
  });

  return { blocks, totalMinutes: targetMinutes };
}
```

---

## 13. Hosting & Deployment

### Static Hosting

**Primary: Cloudflare Pages** (free)
- Unlimited bandwidth
- Global CDN
- Automatic HTTPS
- Custom domain support
- Deploy from GitHub: `npm run build` → publish `dist/`

### COOP/COEP Headers (for Stockfish multi-threading on desktop)

Add to `_headers` file in `public/`:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

**Note:** These headers break loading cross-origin resources (fonts, CDN scripts) unless they have CORS headers. All assets must be self-hosted or served with proper CORS. The Claude API supports this because `anthropic-dangerous-direct-browser-access` header opts into CORS.

### iOS Deployment

- Apple Developer Account ($99/year)
- Capacitor 8.1.0 builds via Xcode
- Distribution via TestFlight (internal tester)
- 90-day build expiration → re-upload periodically

### Build Commands

```bash
npm run build              # Vite production build → dist/
npx cap sync ios           # Sync web assets to iOS project
npx cap open ios           # Open in Xcode
npx cap build ios          # Build IPA
```

---

## 14. Platform Detection & Dual Engine Strategy

```typescript
// src/utils/platform.ts

interface PlatformInfo {
  isMobile: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  hasSharedArrayBuffer: boolean;
  supportsMultiThread: boolean;
  recommendedDepth: number;
  stockfishBuild: 'lite-single' | 'lite-multi';
}

function detectPlatform(): PlatformInfo {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const supportsMultiThread = hasSharedArrayBuffer && !isMobile;

  return {
    isMobile,
    isIOS,
    isDesktop: !isMobile,
    hasSharedArrayBuffer,
    supportsMultiThread,
    recommendedDepth: isMobile ? 15 : 22,
    stockfishBuild: supportsMultiThread ? 'lite-multi' : 'lite-single',
  };
}
```

This allows the app to use full multi-threaded Stockfish on the MacBook Air and gracefully degrade to single-threaded on iPhone, all from the same codebase.
