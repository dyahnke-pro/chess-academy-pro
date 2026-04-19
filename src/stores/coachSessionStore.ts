/**
 * coachSessionStore
 * -----------------
 * Single source of truth for the agent coach across screens.
 *
 * Replaces the per-screen chat state with one persistent session that
 * follows the user between Home, Play, Analyze, etc. Holds:
 *   - the live conversation (mirrored to Dexie so it survives reload)
 *   - the current focus (game | opening | fen) the agent is working on
 *   - the current route (drawer publishes on every navigation)
 *   - a rolling log of executed actions so the next LLM turn knows
 *     what just happened
 *   - a narration queue consumed by play/analysis views in real time
 *
 * The store is provider-agnostic: actions are emitted by either DeepSeek
 * or Anthropic via the [[ACTION:...]] tag protocol parsed by
 * `coachActionDispatcher`.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/schema';
import type { ChatMessage } from '../types';

export type CoachFocusKind = 'game' | 'opening' | 'fen' | 'screen' | null;

export interface CoachFocus {
  kind: CoachFocusKind;
  value: string | null;
  label: string | null;
}

export interface CoachActionRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: 'ok' | 'error' | 'pending';
  message?: string;
  ts: number;
}

export interface PendingNarration {
  id: string;
  text: string;
  fen?: string;
  ts: number;
}

interface CoachSessionState {
  messages: ChatMessage[];
  isStreaming: boolean;
  focus: CoachFocus;
  currentRoute: string;
  recentActions: CoachActionRecord[];
  narrationMode: boolean;
  pendingNarration: PendingNarration | null;
  hydrated: boolean;
}

interface CoachSessionActions {
  appendMessage: (m: ChatMessage) => void;
  setMessages: (m: ChatMessage[]) => void;
  clearMessages: () => void;
  setStreaming: (v: boolean) => void;
  setFocus: (focus: Partial<CoachFocus>) => void;
  clearFocus: () => void;
  setCurrentRoute: (r: string) => void;
  recordAction: (a: CoachActionRecord) => void;
  setNarrationMode: (v: boolean) => void;
  pushNarration: (n: { text: string; fen?: string }) => void;
  consumeNarration: () => PendingNarration | null;
  hydrate: () => Promise<void>;
  reset: () => void;
}

const META_KEY = 'coachSession.v1';
const RECENT_ACTIONS_LIMIT = 20;
const MESSAGES_PERSIST_LIMIT = 60;

const EMPTY_FOCUS: CoachFocus = { kind: null, value: null, label: null };

const DEFAULT_STATE: CoachSessionState = {
  messages: [],
  isStreaming: false,
  focus: EMPTY_FOCUS,
  currentRoute: '/',
  recentActions: [],
  narrationMode: false,
  pendingNarration: null,
  hydrated: false,
};

export const useCoachSessionStore = create<CoachSessionState & CoachSessionActions>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    appendMessage: (m) => {
      // Trim the in-memory array on every append so long sessions
      // can't balloon before the next debounced persist fires. Prior
      // behaviour kept every message (could be 500+ after 90 min at
      // one msg / 10 sec). Persist layer also applies this cap, so
      // the in-memory trim just mirrors what hits disk.
      set((s) => {
        const next = [...s.messages, m];
        if (next.length > MESSAGES_PERSIST_LIMIT) {
          return { messages: next.slice(-MESSAGES_PERSIST_LIMIT) };
        }
        return { messages: next };
      });
      schedulePersist(get);
    },
    setMessages: (m) => {
      set({ messages: m });
      schedulePersist(get);
    },
    clearMessages: () => {
      set({ messages: [], recentActions: [] });
      schedulePersist(get);
    },
    setStreaming: (v) => set({ isStreaming: v }),
    setFocus: (focus) => {
      set((s) => ({
        focus: {
          kind: focus.kind ?? s.focus.kind,
          value: focus.value ?? s.focus.value,
          label: focus.label ?? s.focus.label,
        },
      }));
      schedulePersist(get);
    },
    clearFocus: () => {
      set({ focus: EMPTY_FOCUS });
      schedulePersist(get);
    },
    setCurrentRoute: (r) => set({ currentRoute: r }),
    recordAction: (a) => {
      set((s) => ({
        recentActions: [...s.recentActions, a].slice(-RECENT_ACTIONS_LIMIT),
      }));
      schedulePersist(get);
    },
    setNarrationMode: (v) => {
      set({ narrationMode: v });
      schedulePersist(get);
    },
    pushNarration: ({ text, fen }) => {
      set({
        pendingNarration: {
          id: `narr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text,
          fen,
          ts: Date.now(),
        },
      });
    },
    consumeNarration: () => {
      const current = get().pendingNarration;
      if (!current) return null;
      set({ pendingNarration: null });
      return current;
    },
    hydrate: async () => {
      const restored = await loadPersisted();
      if (restored) {
        set({
          messages: restored.messages,
          focus: restored.focus,
          recentActions: restored.recentActions,
          narrationMode: restored.narrationMode,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    },
    reset: () => {
      set({ ...DEFAULT_STATE, hydrated: true });
      void db.meta.delete(META_KEY);
    },
  })),
);

interface PersistedShape {
  messages: ChatMessage[];
  focus: CoachFocus;
  recentActions: CoachActionRecord[];
  narrationMode: boolean;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(get: () => CoachSessionState): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void writePersisted(get());
  }, 250);
}

async function writePersisted(state: CoachSessionState): Promise<void> {
  const payload: PersistedShape = {
    messages: state.messages.slice(-MESSAGES_PERSIST_LIMIT),
    focus: state.focus,
    recentActions: state.recentActions.slice(-RECENT_ACTIONS_LIMIT),
    narrationMode: state.narrationMode,
  };
  try {
    await db.meta.put({ key: META_KEY, value: JSON.stringify(payload) });
  } catch {
    // Persistence is best-effort. Losing it just means the next reload
    // starts fresh — the in-memory store still works.
  }
}

async function loadPersisted(): Promise<PersistedShape | null> {
  try {
    const row = await db.meta.get(META_KEY);
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as PersistedShape;
    return parsed;
  } catch {
    return null;
  }
}

/** Test-only: synchronously flush the pending persist timer. */
export function __flushPersistForTests(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    return writePersisted(useCoachSessionStore.getState());
  }
  return Promise.resolve();
}

/** Test-only: reset the store and clear persisted state. */
export function __resetCoachSessionStoreForTests(): void {
  useCoachSessionStore.setState({ ...DEFAULT_STATE, hydrated: true });
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}
