import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildCoachContextSnapshot, formatCoachContextSnapshot } from './coachContextSnapshot';
import {
  useCoachSessionStore,
  __resetCoachSessionStoreForTests,
} from '../stores/coachSessionStore';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';

vi.mock('./weaknessAnalyzer', () => ({
  getStoredWeaknessProfile: vi.fn(async () => ({
    computedAt: '2025-01-01',
    overallAssessment: 'Solid tactically, weak in endgames.',
    items: [
      { label: 'Endgames', metric: '40% accuracy', severity: 70, detail: 'd' },
      { label: 'IQP positions', metric: '50% accuracy', severity: 55, detail: 'd' },
    ],
    strengths: [],
  })),
}));

describe('buildCoachContextSnapshot', () => {
  beforeEach(async () => {
    __resetCoachSessionStoreForTests();
    resetFactoryCounter();
    await db.games.clear();
    useAppStore.getState().setLastBoardSnapshot({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      source: 'play-session',
      label: 'Play vs. Coach',
    });
  });

  it('captures route, board, library, focus, and weakness', async () => {
    await db.games.bulkAdd([
      buildGameRecord({ id: 'g-1', date: '2024-12-01' }),
      buildGameRecord({ id: 'g-2', date: '2024-12-02' }),
      buildGameRecord({ id: 'g-3', date: '2024-12-03' }),
    ]);
    useCoachSessionStore.getState().setCurrentRoute('/coach/play');
    useCoachSessionStore.getState().setFocus({ kind: 'opening', value: 'KIA', label: "King's Indian Attack" });

    const snapshot = await buildCoachContextSnapshot();
    expect(snapshot.route).toBe('/coach/play');
    expect(snapshot.board?.fen).toContain('rnbqkbnr');
    expect(snapshot.library.totalGames).toBe(3);
    expect(snapshot.library.recentGames).toHaveLength(3);
    expect(snapshot.library.recentGames[0].id).toBe('g-3');
    expect(snapshot.focus?.value).toBe('KIA');
    expect(snapshot.weakness?.topItems[0]).toContain('Endgames');
  });

  it('renders a compact human-readable text block', async () => {
    await db.games.add(buildGameRecord({ id: 'g-1', date: '2025-01-01' }));
    useCoachSessionStore.getState().setCurrentRoute('/coach/chat');
    const snapshot = await buildCoachContextSnapshot();
    const text = formatCoachContextSnapshot(snapshot);
    expect(text).toContain('[Session State]');
    expect(text).toContain('route: /coach/chat');
    expect(text).toContain('library: 1 games imported');
    expect(text).toContain('id=g-1');
    expect(text).toContain('narration mode: off');
  });

  it('reports library: 0 games when empty', async () => {
    const snapshot = await buildCoachContextSnapshot();
    expect(snapshot.library.totalGames).toBe(0);
    const text = formatCoachContextSnapshot(snapshot);
    expect(text).toContain('library: 0 games imported');
  });
});
