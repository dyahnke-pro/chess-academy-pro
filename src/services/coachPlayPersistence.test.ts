import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCoachPlayState,
  loadCoachPlayState,
  clearCoachPlayState,
  saveCoachPlayChat,
  loadCoachPlayChat,
} from './coachPlayPersistence';
import { db } from '../db/schema';
import type { ChatMessage, CoachGameState } from '../types';
import type { CoachPlayActiveState } from './coachPlayPersistence';

// Position + history after 1.e4 e5.
const E4E5_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

function buildGameState(overrides: Partial<CoachGameState> = {}): CoachGameState {
  return {
    gameId: 'game-1',
    playerColor: 'white',
    targetStrength: 1200,
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

// WO-RESUME-01 v2 snapshot — SAN history + game-state + clock are the
// new required fields; `sans` is what makes a snapshot restorable.
function buildState(overrides: Partial<CoachPlayActiveState> = {}): CoachPlayActiveState {
  return {
    fen: E4E5_FEN,
    sans: ['e4', 'e5'],
    lastMove: { from: 'e7', to: 'e5' },
    gameState: buildGameState(),
    clock: null,
    playerColor: 'white',
    difficulty: 'medium',
    timeControlId: undefined,
    subject: 'Sicilian Najdorf',
    halfMoveCount: 2,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('coachPlayPersistence', () => {
  beforeEach(async () => {
    await db.table('meta').clear();
  });

  it('returns null when nothing is saved', async () => {
    expect(await loadCoachPlayState()).toBeNull();
  });

  it('round-trips a saved state', async () => {
    const state = buildState();
    await saveCoachPlayState(state);
    const loaded = await loadCoachPlayState();
    expect(loaded).toEqual(state);
  });

  it('restores the SAN history + clock for a resumed timed game', async () => {
    const state = buildState({
      sans: ['e4', 'c5', 'Nf3'],
      lastMove: { from: 'g1', to: 'f3' },
      clock: { whiteMs: 178_000, blackMs: 181_500 },
      timeControlId: 'blitz-5-0',
      halfMoveCount: 3,
    });
    await saveCoachPlayState(state);
    const loaded = await loadCoachPlayState();
    expect(loaded?.sans).toEqual(['e4', 'c5', 'Nf3']);
    expect(loaded?.clock).toEqual({ whiteMs: 178_000, blackMs: 181_500 });
    expect(loaded?.lastMove).toEqual({ from: 'g1', to: 'f3' });
  });

  it('rejects a snapshot with no SAN history (cannot rebuild a game)', async () => {
    // A legacy/corrupt snapshot with only a FEN can't resume — treat as nothing.
    await db.table('meta').put({ key: 'coachPlayActive.v2', value: { ...buildState(), sans: [] } });
    expect(await loadCoachPlayState()).toBeNull();
  });

  it('overwrites the previous snapshot on repeat save', async () => {
    await saveCoachPlayState(buildState({ sans: ['e4'], halfMoveCount: 1, updatedAt: Date.now() - 1000 }));
    const later = buildState({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      sans: ['e4', 'e5', 'Nf3'],
      halfMoveCount: 3,
    });
    await saveCoachPlayState(later);
    const loaded = await loadCoachPlayState();
    expect(loaded?.fen).toBe(later.fen);
    expect(loaded?.halfMoveCount).toBe(3);
  });

  it('clearCoachPlayState drops the snapshot', async () => {
    await saveCoachPlayState(buildState({ playerColor: 'black', difficulty: 'hard' }));
    await clearCoachPlayState();
    expect(await loadCoachPlayState()).toBeNull();
  });

  it('drops stale snapshots (> 7 days old)', async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await saveCoachPlayState(buildState({ halfMoveCount: 10, updatedAt: eightDaysAgo }));
    expect(await loadCoachPlayState()).toBeNull();
    // And the stale record should have been cleared as a side-effect.
    const record = await db.table('meta').get('coachPlayActive.v2');
    expect(record).toBeUndefined();
  });

  it('keeps fresh snapshots (< 7 days old)', async () => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    await saveCoachPlayState(buildState({ halfMoveCount: 4, updatedAt: oneDayAgo }));
    const loaded = await loadCoachPlayState();
    expect(loaded).not.toBeNull();
    expect(loaded?.halfMoveCount).toBe(4);
  });

  // ───── in-game chat transcript (regression — PR #273) ─────
  // GameChatPanel's initialMessages + onMessagesUpdate hooks existed
  // but CoachGamePage wasn't wiring them — chat was lost on every
  // reload. saveCoachPlayChat / loadCoachPlayChat wired persistence
  // via a separate meta key so corruption can't break the main
  // resume flow.

  describe('chat transcript persistence', () => {
    const sampleChat = (): ChatMessage[] => [
      { id: '1', role: 'user', content: 'what is a fork?', timestamp: 1 },
      { id: '2', role: 'assistant', content: 'a move that hits two pieces', timestamp: 2 },
    ];

    it('returns [] when nothing is saved', async () => {
      expect(await loadCoachPlayChat()).toEqual([]);
    });

    it('round-trips a saved transcript', async () => {
      const chat = sampleChat();
      await saveCoachPlayChat(chat);
      expect(await loadCoachPlayChat()).toEqual(chat);
    });

    it('caps persisted transcript at 200 newest messages', async () => {
      const huge: ChatMessage[] = Array.from({ length: 250 }, (_, i) => ({
        id: String(i),
        role: (i % 2 === 0 ? 'user' : 'assistant'),
        content: `msg ${i}`,
        timestamp: i,
      }));
      await saveCoachPlayChat(huge);
      const loaded = await loadCoachPlayChat();
      expect(loaded).toHaveLength(200);
      // First retained message should be #50 (indexed 50), since
      // we keep the newest 200.
      expect(loaded[0].content).toBe('msg 50');
      expect(loaded[199].content).toBe('msg 249');
    });

    it('clearCoachPlayState drops the chat transcript alongside the snapshot', async () => {
      await saveCoachPlayChat(sampleChat());
      await clearCoachPlayState();
      expect(await loadCoachPlayChat()).toEqual([]);
    });
  });
});
