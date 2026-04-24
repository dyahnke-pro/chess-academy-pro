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

/** Schema-only — not populated in this WO. */
export interface CoachMemoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

/** Schema-only — not populated in this WO. */
export interface CoachPreferences {
  likes: string[];
  dislikes: string[];
  style: 'sharp' | 'positional' | 'solid' | null;
}

/** Schema-only — not populated in this WO. */
export interface HintRequestRecord {
  id: string;
  fen: string;
  pattern: string | null;
  ts: number;
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
