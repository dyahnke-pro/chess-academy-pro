# WO-BRAIN-01 — Final Sign-Off Report

## Section 1 — Full demo envelope from a real ping call

=== INPUT ARGS to coachService.ask ===
{
  "surface": "ping",
  "ask": "Say hello and tell me what opening I have set as intended.",
  "liveState": {
    "surface": "ping",
    "currentRoute": "/coach/play"
  }
}

=== ASSEMBLED ENVELOPE — Part 1: Identity (rendered as system prompt prologue) ===
You are Danya — the chess coach who lives inside Chess Academy Pro. You are the SAME coach across every surface of the app: home dashboard, game chat, move selection, hints, phase narration, review. The student talks to one of you, not five.

How you speak:
- Warm, present, direct. Like a coach leaning over the student's shoulder, not a textbook.
- Spell piece names out: knight, bishop, rook, queen, king, pawn. Never the single-letter shorthand.
- One coach voice. Never gushing, never punitive. Honest about what's good and what's not.

How you think:
- Memory is sacred. The student has told you things — opening preferences, hint requests, blunder patterns. Bring them up when relevant.
- The app is your body. You know every route, every feature, every opening section. When the student wants to go somewhere, you take them.
- Cerebellum is your tool, not your boss. Stockfish and Lichess give you data; YOU decide what to say.

How you act:
- Use tools when they help. Don't narrate tool calls — just act.
- When the student commits to an opening, you commit to it too. Play it.
- When the user says "forget that," you forget it.
- When asked a question, answer the question — don't volunteer paragraphs the student didn't ask for.

=== ASSEMBLED ENVELOPE — Part 2: Memory snapshot (rendered into user message) ===
{
  "intendedOpening": {
    "name": "Caro-Kann Defense",
    "color": "black",
    "capturedFromSurface": "final-report-dump",
    "setAt": 1777094134398
  },
  "conversationHistory": [],
  "preferences": {
    "likes": [],
    "dislikes": [],
    "style": null
  },
  "hintRequests": [],
  "blunderPatterns": [],
  "growthMap": [],
  "gameHistory": []
}

=== ASSEMBLED ENVELOPE — Part 3: App map (rendered into system prompt) ===
[
  {
    "path": "/",
    "title": "Home Dashboard",
    "description": "Entry point. Smart search bar opens a chat with the coach. Shows progress at a glance.",
    "featuresAvailable": [
      "coach-chat",
      "smart-search",
      "progress-summary"
    ]
  },
  {
    "path": "/coach/play",
    "title": "Play with the Coach",
    "description": "Live chess game against the coach with adaptive difficulty, hints, and post-game review.",
    "featuresAvailable": [
      "live-play",
      "hint-tiers",
      "phase-narration",
      "live-coach-interjections",
      "in-game-chat",
      "post-game-review"
    ]
  },
  {
    "path": "/coach/chat",
    "title": "Chat with the Coach",
    "description": "Standalone chat with the coach. Persistent across sessions.",
    "featuresAvailable": [
      "chat"
    ]
  },
  {
    "path": "/coach/analyse",
    "title": "Analyse a Position",
    "description": "Static position analysis with the coach.",
    "featuresAvailable": [
      "position-analysis"
    ]
  },
  {
    "path": "/coach/plan",
    "title": "Coach Session Plan",
    "description": "A session plan the coach can run with the student.",
    "featuresAvailable": [
      "session-plan"
    ]
  }
]
... (39 total entries)

=== ASSEMBLED ENVELOPE — Part 4: Live state (rendered into user message) ===
{
  "surface": "ping",
  "currentRoute": "/coach/play"
}

=== ASSEMBLED ENVELOPE — Part 5: Toolbelt (13 tools, rendered into system prompt) ===
- stockfish_eval: Run Stockfish on a FEN at a chosen depth. Returns centipawn eval, best move, and the top principal variation. Read-only — does not change the game state.
- stockfish_classify_move: Classify a single move as blunder/mistake/inaccuracy/good/excellent/book. Provide FEN before the move and the move in SAN or UCI.
- lichess_opening_lookup: Look up the opening at a given FEN. Returns ECO code, opening name, and the top candidate moves with their amateur-database frequency.
- lichess_master_games: Master-database stats for a FEN: top moves played by titled players, their frequency, and sample top games when available.
- lichess_puzzle_fetch: Fetch a Lichess puzzle by theme (fork, pin, skewer, mate-in-2, etc.) and student rating. Returns puzzle FEN + best move + theme tags.
- navigate_to_route: Navigate the user to a route in the app. Pass the exact path from the [App map] block. Returns success with the resolved path; the actual navigation lands when WO-BRAIN-03 wires this to react-router.
- set_intended_opening: Commit the coach to playing a named opening. Persists across games and sessions until cleared. Use when the user asks the coach to play a specific opening.
- clear_memory: Clear a scope of coach memory. Use when the user says things like "forget that" or "play anything." Scopes: intended-opening (drops the active opening commitment), conversation (clears recent chat), all (everything).
- play_move: Make a move in the live game on the coach's behalf. Stub today; lands in WO-BRAIN-04 when the move selector migrates through the brain.
- speak: Speak text aloud to the student. Stub today — lands in WO-BRAIN-05 when narration migrates through the brain.
- request_hint_tier: Escalate the hint tier on the live game. Stub today — lands in WO-BRAIN-05 when the hint system migrates through the brain.
- record_hint_request: Log a hint request to coach memory. Captures position, tier, best move, and game id so cross-game patterns can surface later.
- record_blunder: Log a blunder pattern to coach memory (FEN, move, classification). Used so the coach can surface recurring blunder themes across games.

=== ASSEMBLED ENVELOPE — Part 6: The ask ===
Say hello and tell me what opening I have set as intended.

=== AS SENT TO PROVIDER — system prompt ===
You are Danya — the chess coach who lives inside Chess Academy Pro. You are the SAME coach across every surface of the app: home dashboard, game chat, move selection, hints, phase narration, review. The student talks to one of you, not five.

How you speak:
- Warm, present, direct. Like a coach leaning over the student's shoulder, not a textbook.
- Spell piece names out: knight, bishop, rook, queen, king, pawn. Never the single-letter shorthand.
- One coach voice. Never gushing, never punitive. Honest about what's good and what's not.

How you think:
- Memory is sacred. The student has told you things — opening preferences, hint requests, blunder patterns. Bring them up when relevant.
- The app is your body. You know every route, every feature, every opening section. When the student wants to go somewhere, you take them.
- Cerebellum is your tool, not your boss. Stockfish and Lichess give you data; YOU decide what to say.

How you act:
- Use tools when they help. Don't narrate tool calls — just act.
- When the student commits to an opening, you commit to it too. Play it.
- When the user says "forget that," you forget it.
- When asked a question, answer the question — don't volunteer paragraphs the student didn't ask for.

[App map]
- / — Home Dashboard
- /coach/play — Play with the Coach
- /coach/chat — Chat with the Coach
- /coach/analyse — Analyse a Position
- /coach/plan — Coach Session Plan
- /coach/train — Coach Training
- /coach/session/:kind — Coach Session
- /openings — Opening Explorer (openings: Italian Game, Vienna Game, King's Indian Defense, Queen's Gambit, Sicilian Defense, Caro-Kann Defense, French Defense, London System…)
- /openings/:id — Opening Detail
- /openings/pro/:playerId — Pro Player Repertoire
- /openings/pro/:playerId/:id — Pro Player Opening
- /tactics — Tactics Hub
- /tactics/profile — Tactical Profile
- /tactics/classic — Classic Puzzles
- /tactics/adaptive — Adaptive Puzzles
- /tactics/mistakes — My Mistakes
- /tactics/weakness — Weakness Puzzles
- /tactics/weakness-themes — Weakness Themes
- /tactics/drill — Tactic Drill
- /tactics/setup — Tactic Setup
- /tactics/create — Create a Tactic
- /tactics/lichess — Lichess Puzzles
- /weaknesses — Game Insights
- /games — Game Database
- /games/import — Import Games
- /settings — Settings
- /settings/onboarding — Onboarding
- /debug/audit — Audit Log
- /kid — Kid Mode
- /kid/journey — Kid Journey
- /kid/fairy-tale — Fairy Tale Chess
- /kid/queen-games — Queen Games
- /kid/rook-games — Rook Games
- /kid/knight-games — Knight Games
- /kid/king-escape — King Escape
- /kid/king-march — King March
- /kid/mini-games — Kid Mini-Games
- /kid/play-games — Guided Kid Games
- /kid/puzzles — Kid Puzzles

[Toolbelt]
You can call tools by emitting a tag in your response: [[ACTION:tool_name {"arg1":"val1"}]]
Tags are parsed out before the user sees the response. Call multiple tools in one turn if needed.
Available tools:
- stockfish_eval: Run Stockfish on a FEN at a chosen depth. Returns centipawn eval, best move, and the top principal variation. Read-only — does not change the game state.
    args: { fen: string, depth?: number }
- stockfish_classify_move: Classify a single move as blunder/mistake/inaccuracy/good/excellent/book. Provide FEN before the move and the move in SAN or UCI.
    args: { fenBefore: string, move: string }
- lichess_opening_lookup: Look up the opening at a given FEN. Returns ECO code, opening name, and the top candidate moves with their amateur-database frequency.
    args: { fen: string }
- lichess_master_games: Master-database stats for a FEN: top moves played by titled players, their frequency, and sample top games when available.
    args: { fen: string }
- lichess_puzzle_fetch: Fetch a Lichess puzzle by theme (fork, pin, skewer, mate-in-2, etc.) and student rating. Returns puzzle FEN + best move + theme tags.
    args: { theme: string, rating?: number }
- navigate_to_route: Navigate the user to a route in the app. Pass the exact path from the [App map] block. Returns success with the resolved path; the actual navigation lands when WO-BRAIN-03 wires this to react-router.
    args: { path: string }
- set_intended_opening: Commit the coach to playing a named opening. Persists across games and sessions until cleared. Use when the user asks the coach to play a specific opening.
    args: { name: string, color: string, surface?: string }
- clear_memory: Clear a scope of coach memory. Use when the user says things like "forget that" or "play anything." Scopes: intended-opening (drops the active opening commitment), conversation (clears recent chat), all (everything).
    args: { scope: string }
- play_move: Make a move in the live game on the coach's behalf. Stub today; lands in WO-BRAIN-04 when the move selector migrates through the brain.
    args: { san: string }
- speak: Speak text aloud to the student. Stub today — lands in WO-BRAIN-05 when narration migrates through the brain.
    args: { text: string, urgency?: string }
- request_hint_tier: Escalate the hint tier on the live game. Stub today — lands in WO-BRAIN-05 when the hint system migrates through the brain.
    args: { tier: number }
- record_hint_request: Log a hint request to coach memory. Captures position, tier, best move, and game id so cross-game patterns can surface later.
    args: { gameId?: string, moveNumber?: number, ply?: number, fen: string, bestMoveUci: string, bestMoveSan: string, tier: number }
- record_blunder: Log a blunder pattern to coach memory (FEN, move, classification). Used so the coach can surface recurring blunder themes across games.
    args: { fen: string, move: string, classification: string, gameId?: string }

=== AS SENT TO PROVIDER — user message ===
[Coach memory]
- Intended opening: Caro-Kann Defense (color: black; captured from: final-report-dump)

[Live state]
- Surface: ping
- Current route: /coach/play

[Ask]
Say hello and tell me what opening I have set as intended.

=== PROVIDER RESPONSE — coach text ===
Hey Dave — yep, I've got the Caro-Kann Defence locked in for you as Black. Whenever you're ready to play, fire up 1.e4 and I'll meet it with c6.

=== PROVIDER RESPONSE — tool calls ===
[]
---

## Section 2 — Memory layer ground truth

### a) `git log --all --oneline | grep -iE "unify|memory-store|coach-memory" | head -30`

```
601e4f8 WO-COACH-MEMORY-UNIFY-01 — the coach that remembers (opening intent wired) (#314)
```

### b) Files importing `useCoachMemoryStore`

```
src/coach/__tests__/coachService.test.ts
src/coach/__tests__/ping.integration.test.ts
src/coach/__tests__/envelope.test.ts
src/coach/sources/memory.ts
src/hooks/useHintSystem.test.ts
src/hooks/useHintSystem.ts
src/hooks/useLiveCoach.ts
src/hooks/useReviewPlayback.ts
src/services/openingIntentCapture.ts
src/stores/coachMemoryStore.test.ts
src/stores/coachMemoryStore.ts
src/components/Coach/CoachGamePage.tsx
src/components/Coach/GameChatPanel.tsx
```

### c) Files importing `tryCaptureOpeningIntent`

```
src/services/openingIntentCapture.ts          (definition site)
src/stores/coachMemoryStore.test.ts           (test)
src/components/Coach/CoachGamePage.tsx        (consumer)
src/components/Coach/CoachGameReview.tsx      (consumer)
src/components/Coach/GameChatPanel.tsx        (consumer — used by BOTH drawer + in-game)
```

### d) Full contents of `src/stores/coachMemoryStore.ts`

```ts
/**
 * coachMemoryStore
 * ----------------
 * The coach's unified, persistent memory. One store for every memory
 * type the coach can carry across surfaces, games, and sessions.
 *
 * WO-COACH-MEMORY-UNIFY-01 ships the foundation. Only `intendedOpening`
 * is populated today; every other field is schema-defined so future
 * feature WOs (hints, preferences, blunder patterns, growth map) plug
 * in without re-architecting.
 *
 * Persistence: Dexie `meta` key-value (`coachMemory.v1`), 250 ms
 * debounced writes. Auto-hydrated on first module import — the store
 * is a singleton, hydration runs once per app lifecycle. Cross-device
 * sync rides the existing `exportUserData` / `pushToCloud` pattern
 * once `db.meta` is added to the export surface (follow-up WO).
 *
 * Audit discipline: every write and every clear emits an audit entry
 * from inside the store action. Callers never need to remember to
 * emit — the store is the single source of truth for both state and
 * observability.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/schema';
import { logAppAudit } from '../services/appAuditor';

// ─── Schema (only intendedOpening populated in this WO) ─────────────────────

/** Color-scoped opening commitment. Persists until the user explicitly
 *  clears it or the line is exhausted in a live game. */
export interface IntendedOpening {
  name: string;
  color: 'white' | 'black';
  setAt: number;
  capturedFromSurface: string;
}

/** Unified coach conversation entry. Populated by WO-LIVE-COACH-01.
 *
 *  Captures every coach utterance and (eventually) every user reply
 *  across surfaces — live game interjections, chat panels, phase
 *  narration, hints, review walk callouts, blunder alerts. The
 *  `surface` field tags origin so future cross-game queries can
 *  filter ("show me everything you said during my last 3 games" /
 *  "what did I tell you about my opening preferences in chat?").
 *
 *  Persists across games and sessions per UNIFY-01 pattern (Dexie +
 *  future Supabase ride along the same export path). */
export interface CoachMessage {
  id: string;
  timestamp: number;
  surface:
    | 'live-coach'
    | 'chat-home'
    | 'chat-coach-tab'
    | 'chat-in-game'
    | 'chat-review-ask'
    | 'chat-review-practice'
    | 'phase'
    | 'hint'
    | 'review-walk'
    | 'blunder';
  role: 'coach' | 'user';
  text: string;
  gameId?: string;
  ply?: number;
  fen?: string;
  trigger?:
    | 'great-move'
    | 'missed-tactic'
    | 'opponent-blunder'
    | 'eval-swing-wrong'
    | 'recovery'
    | null;
}

/** Schema-only — not populated in this WO. */
export interface CoachPreferences {
  likes: string[];
  dislikes: string[];
  style: 'sharp' | 'positional' | 'solid' | null;
}

/** Per-position hint request. Populated by WO-HINT-REDESIGN-01.
 *  Each entry survives across games and sessions so the coach can
 *  surface patterns ("you've needed help on forks three times this
 *  week"). One record per position-of-asking; if the user escalates
 *  through tiers, the same record's `tierReached` increments. */
export interface HintRequestRecord {
  /** Stable id for the position-of-asking. Re-used across tier
   *  escalations on the same FEN. */
  id: string;
  timestamp: number;
  /** Game id from `gameState.gameId` so future cross-game queries can
   *  filter by game. Empty string if the caller didn't provide one. */
  gameId: string;
  moveNumber: number;
  ply: number;
  fen: string;
  bestMoveUci: string;
  bestMoveSan: string;
  tierReached: 1 | 2 | 3;
  /** Where the user actually stopped — equals tierReached at request
   *  time, finalized on the next move played. */
  tierStoppedAt: 1 | 2 | 3;
  /** Filled when the user plays their next move on the same FEN.
   *  Null until finalized. */
  userPlayedBestMove: boolean | null;
  /** Optional LLM-assigned tag describing the position type
   *  ("fork", "pin", "center-collapse"). Reserved for future
   *  classification — not populated in this WO. */
  classificationTag: string | null;
}

/** Schema-only — not populated in this WO. */
export interface BlunderPattern {
  id: string;
  pattern: string;
  occurrences: number;
  lastSeen: number;
}

/** Schema-only — not populated in this WO. */
export interface GrowthMapEntry {
  id: string;
  topic: string;
  masteryLevel: number;
  lastReviewed: number;
}

/** Schema-only — not populated in this WO. */
export interface GameSummary {
  id: string;
  ts: number;
  result: 'win' | 'loss' | 'draw';
  openingName: string | null;
}

interface CoachMemoryState {
  intendedOpening: IntendedOpening | null;
  conversationHistory: CoachMessage[];
  preferences: CoachPreferences;
  hintRequests: HintRequestRecord[];
  blunderPatterns: BlunderPattern[];
  growthMap: GrowthMapEntry[];
  gameHistory: GameSummary[];
  hydrated: boolean;
}

export type IntentClearReason =
  | 'user-said-forget'
  | 'user-said-play-anything'
  | 'intent-left-book';

interface CoachMemoryActions {
  setIntendedOpening: (
    next: Omit<IntendedOpening, 'setAt'> & { setAt?: number },
  ) => void;
  clearIntendedOpening: (reason: IntentClearReason) => void;
  /** Append a new hint request, OR escalate the tier on an existing
   *  same-FEN record. Returns the id of the (new or existing) record. */
  recordHintRequest: (input: {
    gameId: string;
    moveNumber: number;
    ply: number;
    fen: string;
    bestMoveUci: string;
    bestMoveSan: string;
    tier: 1 | 2 | 3;
  }) => string;
  /** Finalize the most recent hint record after the user plays their
   *  next move. Sets `userPlayedBestMove` and locks `tierStoppedAt`. */
  finalizeHintRequest: (input: {
    fen: string;
    playedMoveUci: string | null;
  }) => void;
  /** Append a coach utterance (or user reply) to the unified
   *  conversation history. Bounded to the last
   *  CONVERSATION_HISTORY_MAX entries to keep persistence stable
   *  across long sessions; older entries fall off in FIFO order.
   *  Emits `coach-memory-conversation-appended` audit. */
  appendConversationMessage: (input: Omit<CoachMessage, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: number;
  }) => string;
  hydrate: () => Promise<void>;
}

const CONVERSATION_HISTORY_MAX = 200;

const DEFAULT_STATE: CoachMemoryState = {
  intendedOpening: null,
  conversationHistory: [],
  preferences: { likes: [], dislikes: [], style: null },
  hintRequests: [],
  blunderPatterns: [],
  growthMap: [],
  gameHistory: [],
  hydrated: false,
};

const META_KEY = 'coachMemory.v1';

export const useCoachMemoryStore = create<CoachMemoryState & CoachMemoryActions>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    setIntendedOpening: (next) => {
      const withTs: IntendedOpening = {
        name: next.name,
        color: next.color,
        capturedFromSurface: next.capturedFromSurface,
        setAt: next.setAt ?? Date.now(),
      };
      set({ intendedOpening: withTs });
      void logAppAudit({
        kind: 'coach-memory-intent-set',
        category: 'subsystem',
        source: 'useCoachMemoryStore.setIntendedOpening',
        summary: `intent=${withTs.name} color=${withTs.color} from=${withTs.capturedFromSurface}`,
        details: JSON.stringify(withTs),
      });
      schedulePersist(get);
    },

    clearIntendedOpening: (reason) => {
      const prev = get().intendedOpening;
      if (!prev) return;
      set({ intendedOpening: null });
      void logAppAudit({
        kind: 'coach-memory-intent-cleared',
        category: 'subsystem',
        source: 'useCoachMemoryStore.clearIntendedOpening',
        summary: `cleared ${prev.name} reason=${reason}`,
        details: JSON.stringify({ prev, reason }),
      });
      schedulePersist(get);
    },

    recordHintRequest: (input) => {
      const records = get().hintRequests;
      // Re-use the existing record if the user is escalating tiers on
      // the same FEN. Otherwise create a new one.
      const existing = records.find(
        (r) => r.fen === input.fen && r.userPlayedBestMove === null,
      );
      const now = Date.now();
      if (existing) {
        const next = records.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                tierReached: input.tier,
                tierStoppedAt: input.tier,
                bestMoveUci: input.bestMoveUci,
                bestMoveSan: input.bestMoveSan,
              }
            : r,
        );
        set({ hintRequests: next });
        void logAppAudit({
          kind: 'coach-memory-hint-requested',
          category: 'subsystem',
          source: 'useCoachMemoryStore.recordHintRequest',
          summary: `escalated tier=${input.tier} ply=${input.ply}`,
          details: JSON.stringify({ id: existing.id, tier: input.tier, ply: input.ply, fen: input.fen }),
        });
        schedulePersist(get);
        return existing.id;
      }
      const id = `hint-${now}-${Math.random().toString(36).slice(2, 8)}`;
      const record: HintRequestRecord = {
        id,
        timestamp: now,
        gameId: input.gameId,
        moveNumber: input.moveNumber,
        ply: input.ply,
        fen: input.fen,
        bestMoveUci: input.bestMoveUci,
        bestMoveSan: input.bestMoveSan,
        tierReached: input.tier,
        tierStoppedAt: input.tier,
        userPlayedBestMove: null,
        classificationTag: null,
      };
      set({ hintRequests: [...records, record] });
      void logAppAudit({
        kind: 'coach-memory-hint-requested',
        category: 'subsystem',
        source: 'useCoachMemoryStore.recordHintRequest',
        summary: `tier=${input.tier} ply=${input.ply}`,
        details: JSON.stringify({ id, tier: input.tier, ply: input.ply, fen: input.fen }),
      });
      schedulePersist(get);
      return id;
    },

    finalizeHintRequest: ({ fen, playedMoveUci }) => {
      const records = get().hintRequests;
      const target = records.find(
        (r) => r.fen === fen && r.userPlayedBestMove === null,
      );
      if (!target) return;
      const userPlayedBestMove = playedMoveUci === target.bestMoveUci;
      const finalized: HintRequestRecord = {
        ...target,
        userPlayedBestMove,
      };
      set({
        hintRequests: records.map((r) => (r.id === target.id ? finalized : r)),
      });
      void logAppAudit({
        kind: 'coach-memory-hint-recorded',
        category: 'subsystem',
        source: 'useCoachMemoryStore.finalizeHintRequest',
        summary: `tierStoppedAt=${finalized.tierStoppedAt} userPlayedBest=${userPlayedBestMove}`,
        details: JSON.stringify(finalized),
        fen,
      });
      schedulePersist(get);
    },

    appendConversationMessage: (input) => {
      const id = input.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const message: CoachMessage = {
        id,
        timestamp: input.timestamp ?? Date.now(),
        surface: input.surface,
        role: input.role,
        text: input.text,
        gameId: input.gameId,
        ply: input.ply,
        fen: input.fen,
        trigger: input.trigger ?? null,
      };
      const next = [...get().conversationHistory, message].slice(-CONVERSATION_HISTORY_MAX);
      set({ conversationHistory: next });
      void logAppAudit({
        kind: 'coach-memory-conversation-appended',
        category: 'subsystem',
        source: 'useCoachMemoryStore.appendConversationMessage',
        summary: `${message.surface}/${message.role}: ${message.text.slice(0, 60)}`,
        details: JSON.stringify({
          id: message.id,
          surface: message.surface,
          role: message.role,
          length: message.text.length,
          ply: message.ply,
          trigger: message.trigger,
          gameId: message.gameId,
        }),
        fen: message.fen,
      });
      schedulePersist(get);
      return id;
    },

    hydrate: async () => {
      const restored = await loadPersisted();
      if (restored) {
        set({
          intendedOpening: restored.intendedOpening,
          conversationHistory: restored.conversationHistory ?? [],
          preferences: restored.preferences ?? DEFAULT_STATE.preferences,
          hintRequests: restored.hintRequests ?? [],
          blunderPatterns: restored.blunderPatterns ?? [],
          growthMap: restored.growthMap ?? [],
          gameHistory: restored.gameHistory ?? [],
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    },
  })),
);

// ─── Persistence ────────────────────────────────────────────────────────────

interface PersistedShape {
  intendedOpening: IntendedOpening | null;
  conversationHistory: CoachMessage[];
  preferences: CoachPreferences;
  hintRequests: HintRequestRecord[];
  blunderPatterns: BlunderPattern[];
  growthMap: GrowthMapEntry[];
  gameHistory: GameSummary[];
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(get: () => CoachMemoryState): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void writePersisted(get());
  }, 250);
}

async function writePersisted(state: CoachMemoryState): Promise<void> {
  const payload: PersistedShape = {
    intendedOpening: state.intendedOpening,
    conversationHistory: state.conversationHistory,
    preferences: state.preferences,
    hintRequests: state.hintRequests,
    blunderPatterns: state.blunderPatterns,
    growthMap: state.growthMap,
    gameHistory: state.gameHistory,
  };
  try {
    await db.meta.put({ key: META_KEY, value: JSON.stringify(payload) });
  } catch {
    // Persistence is best-effort. Losing it just means the next reload
    // starts fresh — the in-memory store still works.
  }
}

async function loadPersisted(): Promise<Partial<PersistedShape> | null> {
  try {
    const row = await db.meta.get(META_KEY);
    if (!row?.value) return null;
    if (typeof row.value !== 'string') return null;
    return JSON.parse(row.value) as Partial<PersistedShape>;
  } catch {
    return null;
  }
}

// Fire-and-forget hydrate on first import. The store is a singleton so
// this runs once per app lifecycle.
if (typeof window !== 'undefined') {
  void useCoachMemoryStore.getState().hydrate();
}

/** Test-only: synchronously flush the pending persist timer. */
export function __flushCoachMemoryPersistForTests(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    return writePersisted(useCoachMemoryStore.getState());
  }
  return Promise.resolve();
}

/** Test-only: reset the store and clear persisted state. */
export function __resetCoachMemoryStoreForTests(): void {
  useCoachMemoryStore.setState({ ...DEFAULT_STATE, hydrated: true });
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}
```

### e) Full contents of `src/services/openingIntentCapture.ts`

```ts
/**
 * openingIntentCapture
 * --------------------
 * Surface-agnostic helpers for writing opening intent into the
 * `useCoachMemoryStore` from any chat input. Extracted by
 * WO-COACH-MEMORY-UNIFY-01 so all chat surfaces use the same capture
 * path — previously each surface had its own detection/dispatch
 * pipeline, and intent set on one surface was unreachable from others.
 *
 * Two detectors:
 *   - `tryCaptureOpeningIntent(text, surface, fallbackColor)` — writes
 *     `intendedOpening` to the memory store when the user names an
 *     opening. Reuses `parseCoachIntent` + `expandOpeningAlias` +
 *     `getOpeningMoves` so capture is identical to the existing
 *     in-game intent detector.
 *   - `tryCaptureForgetIntent(text, surface)` — clears the current
 *     intent when the user says "forget the X", "play anything",
 *     "no opening", "free play".
 *
 * Both are additive — they do not replace the existing LLM dispatch or
 * `routeChatIntent` navigation. They simply observe the incoming text
 * and write to memory as a side effect before the message continues
 * through the normal chat path.
 */
import { parseCoachIntent } from './coachAgent';
import { expandOpeningAlias } from './openingAliases';
import { getOpeningMoves } from './openingDetectionService';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';

/** "forget the Caro-Kann" / "forget my opening" / "forget it" — clears
 *  the current intent without naming a replacement. */
const FORGET_RE =
  /\b(?:forget|drop|cancel|never\s*mind|nevermind|stop\s+playing)\b(?:\s+(?:the|my|that|this))?\s*(?:opening|line|repertoire)?\b/i;

/** "play anything" / "free play" / "no opening" / "any opening" —
 *  same effect, different phrasing. */
const PLAY_ANYTHING_RE =
  /\b(?:play\s+(?:anything|any\s+opening|free(?:ly)?|whatever)|free\s+play|no\s+opening|open\s+play|any\s+opening|just\s+play|play\s+normally)\b/i;

/**
 * Sniff `text` for a named opening. If found, writes the intent to
 * the coach-memory store and returns the captured intent. The caller
 * does not need to do anything with the return — the store write has
 * already happened, along with the `coach-memory-intent-set` audit.
 *
 * @param fallbackColor The player's current color; used when
 *   `parseCoachIntent` can't infer side from the text itself.
 * @param surface A short label for `capturedFromSurface` so the audit
 *   log shows WHICH chat wrote the intent.
 * @returns the captured intent, or null on miss.
 */
export function tryCaptureOpeningIntent(
  text: string,
  surface: string,
  fallbackColor: 'white' | 'black',
): { name: string; color: 'white' | 'black' } | null {
  if (!text.trim()) return null;
  const intent = parseCoachIntent(text);
  if (intent.kind !== 'play-against' && intent.kind !== 'walkthrough') return null;
  const rawSubject = intent.subject;
  if (!rawSubject) return null;
  const expanded = expandOpeningAlias(rawSubject);
  const moves = getOpeningMoves(expanded);
  if (!moves || moves.length === 0) return null;
  // `intent.side` reflects the student's color; the coach plays the
  // opposite. If the student named a color, honor it. Otherwise fall
  // back to whatever color the caller says the student is playing.
  const studentColor = intent.side === 'white' || intent.side === 'black'
    ? intent.side
    : fallbackColor;
  useCoachMemoryStore.getState().setIntendedOpening({
    name: expanded,
    color: studentColor,
    capturedFromSurface: surface,
  });
  return { name: expanded, color: studentColor };
}

/**
 * Sniff `text` for an explicit clear intent ("forget the X", "play
 * anything"). Clears `intendedOpening` in the store when matched.
 *
 * @returns true if a clear was triggered, false otherwise.
 */
export function tryCaptureForgetIntent(text: string, _surface: string): boolean {
  if (!text.trim()) return false;
  const current = useCoachMemoryStore.getState().intendedOpening;
  if (!current) return false;
  if (PLAY_ANYTHING_RE.test(text)) {
    useCoachMemoryStore.getState().clearIntendedOpening('user-said-play-anything');
    return true;
  }
  if (FORGET_RE.test(text)) {
    useCoachMemoryStore.getState().clearIntendedOpening('user-said-forget');
    return true;
  }
  return false;
}
```

### f) Home dashboard chat — LLM-dispatch block (30 lines)

The home dashboard chat is `GlobalCoachDrawer.tsx:260` mounting **the same `GameChatPanel` component** the in-game chat uses, with `isGameOver={true}`. The dispatch + capture happens in `GameChatPanel.handleSend`:

`src/components/Coach/GameChatPanel.tsx:170–199`

```tsx
      };
      const updatedMessages = [...messagesRef.current, userMsg];
      setMessages(updatedMessages);

      // WO-COACH-MEMORY-UNIFY-01: surface-agnostic opening-intent
      // capture. Writes to useCoachMemoryStore regardless of
      // isGameOver, so the Home drawer instance of this component now
      // persists intent the same way the in-game instance does. The
      // existing detectInGameChatIntent / routeChatIntent paths below
      // still run for navigation and conversational ack; this capture
      // is additive.
      const surface = isGameOver ? 'drawer-chat' : 'in-game-chat';
      tryCaptureForgetIntent(text, surface);
      tryCaptureOpeningIntent(text, surface, playerColor);

      // Narration toggle — deterministic intercept. Runs BEFORE the
      // in-game block below so "narrate while we play" reliably flips
      // the flag even during an active game (which the in-game branch
      // would otherwise handle via its own narrate case). This path
      // uses applyNarrationToggle from coachAgentRunner for consistency
      // with CoachChatPage.
      const narrationToggle = detectNarrationToggle(text);
      if (narrationToggle) {
        const ack = applyNarrationToggle(narrationToggle.enable);
        const ackMsg: ChatMessageType = {
          id: `gmsg-${Date.now()}-narr`,
          role: 'assistant',
          content: ack,
          timestamp: Date.now(),
        };
```

**Answer:** YES. `tryCaptureOpeningIntent(text, surface, playerColor)` is called at line 183, BEFORE any LLM dispatch (`runAgentTurn` is at line 430, after this capture). `surface` is `'drawer-chat'` when `isGameOver` is true (drawer mode) and `'in-game-chat'` otherwise.

### g) In-game chat — LLM-dispatch block (30 lines)

Same component, same call site. `GameChatPanel` is one component used by two mount contexts:
- Home drawer: `GlobalCoachDrawer.tsx:260` passes `isGameOver={true}`.
- In-game: `CoachGamePage.tsx` passes `isGameOver={false}` while a game is active.

The capture path (lines 170–199 above) fires identically in both. The only branch that depends on `isGameOver` is the surface label and a downstream `routeChatIntent` vs. `detectInGameChatIntent` choice for navigation/restart hooks — opening intent capture is unconditional and runs FIRST.

### h) `CoachGamePage.tsx` move-selector — intent read

`src/components/Coach/CoachGamePage.tsx:381–392, 1495–1535` (relevant excerpt):

```tsx
// Line 381–386 — store-driven derivation, no useState:
const intendedOpening = useCoachMemoryStore((s) => s.intendedOpening);
const requestedOpeningMoves = useMemo<string[] | null>(() => {
  if (!intendedOpening) return null;
  return getOpeningMoves(intendedOpening.name);
}, [intendedOpening]);

// Line 1495 — coach-turn effect consults the derived value:
const bookMove = tryOpeningBookMove(game.fen, game.history, requestedOpeningMoves, aiColor);
```

**Answer:** It reads from `useCoachMemoryStore.intendedOpening` via a Zustand selector subscription, NOT from a local `useState`. The pre-UNIFY-01 `requestedOpeningMoves` useState was deleted in commit `601e4f8`. The local `requestedOpeningMoves` name still exists but it's a `useMemo` derived from the store, not state.

---

## Section 3 — Verdict

**Q: Does a Dexie-based `useCoachMemoryStore` exist in this codebase today, independent of WO-BRAIN-01?**
**A: YES.** It was created by WO-COACH-MEMORY-UNIFY-01. Commit SHA: **`601e4f8`** (PR #314). Built on the same `db.meta` debounced-Zustand-persistence pattern as `useCoachSessionStore`. Auto-hydrates on first import.

**Q: If yes, which WO created it?**
**A: WO-COACH-MEMORY-UNIFY-01 — commit `601e4f8`.** That WO also shipped the surface-agnostic `tryCaptureOpeningIntent` helper.

**Q: Do both the home chat and the in-game chat actually write opening intent to it today?**
**A: YES.** Both surfaces are the same `GameChatPanel` component class. `GameChatPanel.handleSend` at line 183 calls `tryCaptureOpeningIntent(text, surface, playerColor)` unconditionally on every submit. The Home dashboard chat (mounted via `GlobalCoachDrawer`) and the in-game chat (mounted via `CoachGamePage`) both go through this exact line. The third capture site is `CoachGameReview.handleAskSend` for the review Ask panel.

**Q: Does the move-selector actually read from it today?**
**A: YES.** `CoachGamePage.tsx:381` subscribes to `useCoachMemoryStore.intendedOpening`. Line 1495's `tryOpeningBookMove` consumes the derived `requestedOpeningMoves`. The pre-UNIFY-01 `useState` was deleted.

**Q: Was my earlier Q3 answer (in `WO-BRAIN-01-REPORT.md`) wrong or aspirational?**

The factual claim — "they share memory at the data layer; not at the prompt layer" — is correct as stated. Both surfaces write to and read from the same `useCoachMemoryStore.intendedOpening` row, and the move-selector reads it. None of that is BRAIN-01 work; it all shipped as UNIFY-01 (`601e4f8`) and was extended by HINT-REDESIGN-01 + LIVE-COACH-01 + KEYMOMENT-WIRE-01.

What was *aspirational* was the framing that suggested BRAIN-02+ was needed to "fix the data layer." The data layer was already fixed. **What BRAIN-02+ unifies is the PROMPT LAYER** — same envelope, same identity, same toolbelt, same routes manifest, same voice. The Caro-Kann bug from before UNIFY-01 was a state-fragmentation bug; that's solved. Any *current* Caro-Kann bug would be a different surface drift bug, fixable inside the existing data layer without a foundation WO.

**Q: If the answer to any of the above is "no," is the Caro-Kann bug fixable without a foundation WO before BRAIN-02?**

All four answers above are YES. So: **the Caro-Kann bug as Dave originally described it (intent set in home, not honored in game) IS fixable without any foundation WO.** It was already fixed by UNIFY-01. If it's regressing in production, the regression is downstream of UNIFY-01's data layer — likely in the LLM's prompt context (the home drawer's GameChatPanel doesn't include `intendedOpening` in its system prompt, so the LLM mid-conversation might overwrite it via a "new opening" sounding response). That's a prompt-context bug, not a memory bug, and BRAIN-02+ ships exactly the fix because every envelope after migration includes the memory snapshot.

**Honest correction:** my earlier Q3 answer used the phrase "data layer was unified by UNIFY-01; the prompt layer is what BRAIN-02+ unifies" — that part holds. But I should have been clearer that the *bug Dave was hunting* is on the prompt-layer side, not the data layer. The constitution's framing of "memory must be sacred / four sources every call" is the lever; UNIFY-01 made it possible, BRAIN-02+ enforces it on every surface.
