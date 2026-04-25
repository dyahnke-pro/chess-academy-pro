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

/** A coach-or-user turn the memory store remembers across surfaces and
 *  sessions. WO-BLUNDER-COACH-READ wires the first writer (the blunder
 *  alert). Future surfaces (live coach, hints, post-game review) plug
 *  in by calling `appendConversationMessage` with their own `surface`. */
export type CoachMemorySurface =
  | 'blunder'
  | 'live-coach'
  | 'phase'
  | 'hint'
  | 'review'
  | 'chat';

export interface CoachMemoryMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  ts: number;
  surface: CoachMemorySurface;
  gameId: string | null;
  ply: number | null;
  fen: string | null;
  /** Live-coach trigger label when this entry came from a trigger
   *  (e.g. 'eval-swing-wrong'). Null for self-surfaces like blunder
   *  which are their own surface, not a live-coach trigger. */
  trigger: string | null;
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
  conversationHistory: CoachMemoryMessage[];
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
  /** Append a coach-or-user turn to the conversation history. Persists
   *  across reloads so the coach can reason over past surfaces ("you
   *  hung your bishop in three games this week"). Emits
   *  `coach-memory-conversation-appended`. */
  appendConversationMessage: (input: {
    surface: CoachMemorySurface;
    role: 'user' | 'coach';
    text: string;
    gameId?: string | null;
    ply?: number | null;
    fen?: string | null;
    trigger?: string | null;
  }) => string;
  hydrate: () => Promise<void>;
}

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
      const ts = Date.now();
      const id = `msg-${ts}-${Math.random().toString(36).slice(2, 8)}`;
      const message: CoachMemoryMessage = {
        id,
        role: input.role,
        text: input.text,
        ts,
        surface: input.surface,
        gameId: input.gameId ?? null,
        ply: input.ply ?? null,
        fen: input.fen ?? null,
        trigger: input.trigger ?? null,
      };
      set({ conversationHistory: [...get().conversationHistory, message] });
      void logAppAudit({
        kind: 'coach-memory-conversation-appended',
        category: 'subsystem',
        source: 'useCoachMemoryStore.appendConversationMessage',
        summary: `surface=${message.surface} role=${message.role} len=${message.text.length}`,
        details: JSON.stringify({
          id,
          surface: message.surface,
          role: message.role,
          gameId: message.gameId,
          ply: message.ply,
          trigger: message.trigger,
          textPreview: message.text.slice(0, 80),
        }),
        fen: message.fen ?? undefined,
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
  conversationHistory: CoachMemoryMessage[];
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
