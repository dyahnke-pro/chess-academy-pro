import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import type { PuzzleRecord } from '../../types';

const PUZZLE: PuzzleRecord = {
  id: 'dr-1', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', moves: 'e7e5 g1f3', rating: 1800,
  themes: ['fork'], openingTags: null, popularity: 80, nbPlays: 1000, srsInterval: 0, srsEaseFactor: 2.5,
  srsRepetitions: 0, srsDueDate: '2026-01-01', srsLastReview: null, userRating: 1200, attempts: 0, successes: 0,
};

vi.mock('../../services/puzzleService', async (orig) => ({
  ...(await orig<typeof import('../../services/puzzleService')>()),
  seedPuzzles: () => Promise.resolve(),
  seedLongPuzzles: () => Promise.resolve(),
}));
vi.mock('../../services/adaptivePuzzleService', async (orig) => ({
  ...(await orig<typeof import('../../services/adaptivePuzzleService')>()),
  getNextAdaptivePuzzle: () => Promise.resolve(PUZZLE),
}));
vi.mock('../../services/puzzleDepth', () => ({ solverMoves: () => 2 }));
vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});
vi.mock('../../services/appAuditor', () => ({ logAppAudit: vi.fn() }));
vi.mock('../Tactics/TacticsPageHeader', () => ({ TacticsPageHeader: () => null }));
vi.mock('./PuzzleBoard', () => ({
  PuzzleBoard: ({ onComplete }: { onComplete: (o: unknown) => void }) => (
    <button data-testid="solve" onClick={() => onComplete({ correct: true, usedHint: false, hadRetry: false, showedSolution: false, cleanMoves: 2, solveTimeMs: 1000 })}>solve</button>
  ),
}));

import { DeepRunPage } from './DeepRunPage';

beforeEach(async () => {
  db.close(); await db.delete(); await db.open();
  const profile = buildUserProfile({ id: 'main', puzzleRating: 1200 });
  await db.profiles.put(profile);
  await db.puzzles.put(PUZZLE);
  useAppStore.setState({ activeProfile: profile });
});

describe('Deep Run — a solve moves the puzzle rating (persistent memory)', () => {
  it('a clean solve writes the new rating to the profile', async () => {
    render(<MemoryRouter><DeepRunPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('deep-run-start')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('deep-run-start'));
    await waitFor(() => expect(screen.getByTestId('solve')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('solve'));
    await waitFor(async () => expect((await db.profiles.get('main'))?.puzzleRating).toBeGreaterThan(1200));
    expect(useAppStore.getState().activeProfile?.puzzleRating).toBeGreaterThan(1200);
  });
});
