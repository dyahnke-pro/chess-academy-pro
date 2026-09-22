// B3 (PLAN WO-STANDARD-01, 2026-09-22): the need context's LINE half is read at
// FIRE time, from whatever the surface's history says then — never from the
// history captured when the effect ran.
//
// The bug this pins: Learn mounted the hook with an EMPTY history, the loader
// memoised `lineReps = []` against it, and every ply of every game then scored
// unfamiliarity 50 — the term that silences a line played right five times was
// dead on the surface it was built for.
//
// Negative control: restore the old body (load `contextForLine` once in the
// effect with `sansRef.current`, return a plain `useRef`) → the read after the
// history grows still reports the mount-time line and the second test fails.
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { StudentNeedBase } from '../services/studentNeedLoader';
import type { MoveAnnotation } from '../types';

const clean = (sans: readonly string[]): MoveAnnotation[] => sans.map((san, i) => ({
  moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
  evaluation: 20, bestMove: null, bestMoveEval: 20, classification: 'good', comment: null,
}));
const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
const game = (sans: readonly string[]) => ({
  id: `g-${sans.length}`, pgn: '', white: 'alex', black: 'x', result: '1-0' as const, date: '', event: '', eco: 'C60',
  whiteElo: 1200, blackElo: 1200, source: 'lichess' as const, annotations: clean(sans), coachAnalysis: null,
  isMasterGame: false, openingId: null, fullyAnalyzed: true,
});
const BASE: StudentNeedBase = {
  rating: 1200, studentColor: 'white', openingId: null, gamesPlayed: 5,
  signals: [], bookDepartures: [], capabilities: new Map(),
  games: [], analysed: Array.from({ length: 5 }, () => game([...LINE, 'Ba4'])), inOpening: [],
  names: { lichessUsername: 'alex', chessComUsername: undefined },
};

vi.mock('../services/studentNeedLoader', async (orig) => ({
  ...(await orig<typeof import('../services/studentNeedLoader')>()),
  loadStudentNeedBase: vi.fn(async () => BASE),
}));
vi.mock('../stores/appStore', () => ({ useAppStore: { getState: () => ({ activeProfile: { currentRating: 1200 } }) } }));

const { useStudentNeed } = await import('./useStudentNeed');

describe('useStudentNeed — the line is read when the context is read', () => {
  it('before the base lands it is the cold student (TEACH)', () => {
    const { result } = renderHook(() => useStudentNeed({ studentColor: 'white', sans: () => [] }));
    expect(result.current.current.gamesPlayed).toBe(0);
    expect(result.current.current.rating).toBe(1200);
  });

  it('the history grows with NO re-render and the familiarity follows it', async () => {
    const history: string[] = [];
    const { result } = renderHook(() => useStudentNeed({ studentColor: 'white', sans: () => history }));
    await vi.waitFor(() => expect(result.current.current.gamesPlayed).toBe(5));
    // Mount-time line: empty. Only the position after it is known.
    expect(result.current.current.lineReps).toHaveLength(1);
    // Six plies later, read again — same mount, same ref, no effect re-run.
    history.push(...LINE);
    const ctx = result.current.current;
    expect(ctx.lineReps).toHaveLength(LINE.length + 1);
    // The student has stood here five times and played it right: familiar.
    expect(ctx.lineReps![LINE.length]).toBe(5);
  });

  it('an ARRAY line still works — Learn passes one', async () => {
    const { result } = renderHook(() => useStudentNeed({ studentColor: 'white', sans: LINE }));
    await vi.waitFor(() => expect(result.current.current.gamesPlayed).toBe(5));
    expect(result.current.current.lineReps).toHaveLength(LINE.length + 1);
  });
});
