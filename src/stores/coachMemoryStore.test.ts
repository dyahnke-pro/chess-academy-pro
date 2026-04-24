import { describe, it, expect, beforeEach, vi } from 'vitest';

const auditCalls: { kind: string; summary: string }[] = [];
vi.mock('../services/appAuditor', () => ({
  logAppAudit: vi.fn((entry: { kind: string; summary: string }) => {
    auditCalls.push({ kind: entry.kind, summary: entry.summary });
    return Promise.resolve();
  }),
}));

import {
  useCoachMemoryStore,
  __resetCoachMemoryStoreForTests,
  __flushCoachMemoryPersistForTests,
} from './coachMemoryStore';
import {
  tryCaptureOpeningIntent,
  tryCaptureForgetIntent,
} from '../services/openingIntentCapture';
import { db } from '../db/schema';

beforeEach(async () => {
  auditCalls.length = 0;
  __resetCoachMemoryStoreForTests();
  await db.meta.delete('coachMemory.v1');
});

describe('useCoachMemoryStore.setIntendedOpening', () => {
  it('writes intent and emits coach-memory-intent-set audit', () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    const intent = useCoachMemoryStore.getState().intendedOpening;
    expect(intent).not.toBeNull();
    expect(intent?.name).toBe('Caro-Kann Defense');
    expect(intent?.color).toBe('black');
    expect(intent?.capturedFromSurface).toBe('test');
    expect(intent?.setAt).toBeGreaterThan(0);
    expect(auditCalls.some((c) => c.kind === 'coach-memory-intent-set')).toBe(true);
  });

  it('overwrites the prior intent on a new set', () => {
    const s = useCoachMemoryStore.getState();
    s.setIntendedOpening({ name: 'Caro-Kann Defense', color: 'black', capturedFromSurface: 'a' });
    s.setIntendedOpening({ name: 'Sicilian Defense', color: 'black', capturedFromSurface: 'b' });
    expect(useCoachMemoryStore.getState().intendedOpening?.name).toBe('Sicilian Defense');
    expect(auditCalls.filter((c) => c.kind === 'coach-memory-intent-set')).toHaveLength(2);
  });
});

describe('useCoachMemoryStore.clearIntendedOpening', () => {
  it('clears intent and emits coach-memory-intent-cleared with reason', () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    useCoachMemoryStore.getState().clearIntendedOpening('user-said-forget');
    expect(useCoachMemoryStore.getState().intendedOpening).toBeNull();
    const cleared = auditCalls.find((c) => c.kind === 'coach-memory-intent-cleared');
    expect(cleared).toBeTruthy();
    expect(cleared?.summary).toMatch(/user-said-forget/);
  });

  it('is a no-op when there is no current intent', () => {
    useCoachMemoryStore.getState().clearIntendedOpening('user-said-forget');
    expect(auditCalls.some((c) => c.kind === 'coach-memory-intent-cleared')).toBe(false);
  });
});

describe('useCoachMemoryStore persistence', () => {
  it('roundtrips intent through Dexie via hydrate', async () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    await __flushCoachMemoryPersistForTests();

    // Simulate a cold start: in-memory reset, then hydrate from Dexie.
    useCoachMemoryStore.setState({
      intendedOpening: null,
      conversationHistory: [],
      preferences: { likes: [], dislikes: [], style: null },
      hintRequests: [],
      blunderPatterns: [],
      growthMap: [],
      gameHistory: [],
      hydrated: false,
    });
    await useCoachMemoryStore.getState().hydrate();

    const restored = useCoachMemoryStore.getState().intendedOpening;
    expect(restored?.name).toBe('Caro-Kann Defense');
    expect(restored?.color).toBe('black');
    expect(useCoachMemoryStore.getState().hydrated).toBe(true);
  });
});

describe('tryCaptureOpeningIntent', () => {
  it('captures Caro-Kann from a chat message and writes to the store', () => {
    const result = tryCaptureOpeningIntent(
      'Play the Caro-Kann against me as Black.',
      'home-chat',
      'white',
    );
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Caro-Kann Defense');
    expect(result?.color).toBe('black');
    const intent = useCoachMemoryStore.getState().intendedOpening;
    expect(intent?.name).toBe('Caro-Kann Defense');
    expect(intent?.capturedFromSurface).toBe('home-chat');
  });

  it('captures Sicilian and records the surface label', () => {
    const result = tryCaptureOpeningIntent(
      "Let's play the Sicilian.",
      'in-game-chat',
      'black',
    );
    expect(result?.name).toBe('Sicilian Defense');
    expect(useCoachMemoryStore.getState().intendedOpening?.capturedFromSurface).toBe('in-game-chat');
  });

  it('returns null and writes nothing on an unrelated message', () => {
    const result = tryCaptureOpeningIntent('What is my rating?', 'home-chat', 'white');
    expect(result).toBeNull();
    expect(useCoachMemoryStore.getState().intendedOpening).toBeNull();
  });

  it('returns null on an unknown opening name', () => {
    const result = tryCaptureOpeningIntent(
      'play the Totally Made Up Opening against me',
      'home-chat',
      'white',
    );
    expect(result).toBeNull();
    expect(useCoachMemoryStore.getState().intendedOpening).toBeNull();
  });
});

describe('tryCaptureForgetIntent', () => {
  it('clears a prior intent on "forget the Caro-Kann"', () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    const cleared = tryCaptureForgetIntent('Forget the Caro-Kann.', 'in-game-chat');
    expect(cleared).toBe(true);
    expect(useCoachMemoryStore.getState().intendedOpening).toBeNull();
    const audit = auditCalls.find((c) => c.kind === 'coach-memory-intent-cleared');
    expect(audit?.summary).toMatch(/user-said-forget/);
  });

  it('clears on "play anything"', () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Sicilian Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    const cleared = tryCaptureForgetIntent("Let's play anything.", 'in-game-chat');
    expect(cleared).toBe(true);
    const audit = auditCalls.find((c) => c.kind === 'coach-memory-intent-cleared');
    expect(audit?.summary).toMatch(/user-said-play-anything/);
  });

  it('returns false when there is no current intent', () => {
    const cleared = tryCaptureForgetIntent('Forget the Caro-Kann.', 'in-game-chat');
    expect(cleared).toBe(false);
  });

  it('returns false on a message that does not ask to forget', () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'test',
    });
    const cleared = tryCaptureForgetIntent('Can you explain this move?', 'in-game-chat');
    expect(cleared).toBe(false);
    expect(useCoachMemoryStore.getState().intendedOpening?.name).toBe('Caro-Kann Defense');
  });
});
