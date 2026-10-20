import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { OpeningDetailPage } from './OpeningDetailPage';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetOpeningById = vi.fn();

const mockToggleFavorite = vi.fn();

const mockHasLessonScript = vi.fn((): boolean => true);

vi.mock('../../services/openingService', () => ({
  getOpeningById: (...args: unknown[]): unknown => mockGetOpeningById(...args),
  getMasteryPercent: (o: OpeningRecord) => Math.round(o.drillAccuracy * 100),
  needsReview: (o: OpeningRecord) => o.drillAttempts > 0 && o.drillAccuracy < 0.7,
  getLinesDiscovered: (o: OpeningRecord) => o.linesDiscovered?.length ?? 0,
  getLinesPerfected: (o: OpeningRecord) => o.linesPerfected?.length ?? 0,
  getTotalLines: (o: OpeningRecord) => o.variations?.length ?? 0,
  toggleFavorite: (...args: unknown[]): unknown => mockToggleFavorite(...args),
  updateDrillProgress: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: vi.fn().mockResolvedValue(undefined),
  recordDrillAttempt: vi.fn().mockResolvedValue(undefined),
  updateVariationProgress: vi.fn().mockResolvedValue(undefined),
  markLineDiscovered: vi.fn().mockResolvedValue(undefined),
  markLinePerfected: vi.fn().mockResolvedValue(undefined),
}));

// These tests render the BUILT opening detail page. Since 2026-07-16 the page
// reroutes a NON-built opening (no LessonScript) to the coach, so treat the
// mock `test-opening` as built by forcing hasLessonScript true; the rest of the
// lessons module stays real (getLessonScript still returns null for the mock,
// so the Watch view falls to WalkthroughMode exactly as before).
vi.mock('../../data/lessons', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/lessons')>()),
  hasLessonScript: (): boolean => mockHasLessonScript(),
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
  ),
}));

vi.mock('../Board/MiniBoard', () => ({
  MiniBoard: ({ fen, size }: { fen: string; size?: number }) => (
    <div data-testid="mini-board" data-fen={fen} data-size={String(size ?? 56)}>MiniBoard</div>
  ),
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

vi.mock('../../services/speechService', () => ({
  speechService: {
    speak: vi.fn(),
    stop: vi.fn(),
    setEnabled: vi.fn(),
    setRate: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const testOpening: OpeningRecord = buildOpeningRecord({
  id: 'test-opening',
  eco: 'C25',
  name: 'Vienna Game',
  pgn: 'e4 e5 Nc3',
  uci: 'e2e4 e7e5 b1c3',
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
  color: 'white',
  style: 'Classical, Flexible',
  overview: 'A flexible opening that delays d4.',
  keyIdeas: ['Control the center', 'Develop knights early'],
  traps: ['Vienna Gambit trap'],
  warnings: ['Watch for early d5 break'],
  variations: [
    { name: 'Vienna Gambit', pgn: 'e4 e5 Nc3 Nf6 f4', explanation: 'Sharp gambit play' },
    { name: 'Copycat', pgn: 'e4 e5 Nc3 Nc6', explanation: 'Mirror variation' },
  ],
  drillAccuracy: 0.8,
  drillAttempts: 5,
  lastStudied: '2026-03-01',
  woodpeckerReps: 7,
  woodpeckerSpeed: 18,
  woodpeckerLastDate: '2026-03-03',
  // MAIN_LINE_INDEX (-1) included, i.e. the main-line Watch is already finished.
  //
  // 🚨 THIS IS LOAD-BEARING, NOT INCIDENTAL. The detail page auto-starts the
  // main-line walkthrough for anyone who has NOT watched it, so with a
  // first-time fixture these tests do not merely fail — they RACE, because the
  // auto-start runs in an effect after the opening loads. One read-aloud test
  // passed and its sibling failed on identical setup, and the favourite test
  // passed locally and failed in ship-check. Every test in this file is about
  // the detail page a returning student sees, so the fixture says so outright
  // and the timing stops mattering. A test that wants the first-visit state
  // should override linesDiscovered explicitly.
  linesDiscovered: [-1, 0],
  linesPerfected: [],
});

function renderWithRoute(openingId: string = 'test-opening'): void {
  rtlRender(
    <MemoryRouter initialEntries={[`/openings/${openingId}`]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/openings/:id" element={<OpeningDetailPage />} />
          <Route path="/openings" element={<div data-testid="explorer-page">Explorer</div>} />
          <Route path="/coach/teach" element={<div data-testid="coach-teach-page">Coach Teach</div>} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

vi.mock('../../data/checkpoint-quizzes.json', () => ({
  default: {
    'test-opening': [
      { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', type: 'plan', question: 'Q1?', choices: ['a', 'b'], correctIndex: 0, hint: 'h', concept: 'c' },
      { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', type: 'plan', question: 'Q2?', choices: ['a', 'b'], correctIndex: 1, hint: 'h', concept: 'c' },
    ],
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OpeningDetailPage — the picked variation tab survives a close (persistent memory)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetOpeningById.mockResolvedValue(testOpening);
    mockHasLessonScript.mockReturnValue(true);
    const { db } = await import('../../db/schema');
    db.close(); await db.delete(); await db.open();
  });

  it('reopening without ?line= lands on the tab the student picked', async () => {
    const { db } = await import('../../db/schema');
    const { cleanup } = await import('@testing-library/react');
    renderWithRoute();
    await waitFor(() => expect(screen.getByTestId('variation-tab-1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('variation-tab-1'));
    await waitFor(async () => expect((await db.studentMemory.get('variation-tab:test-opening'))?.data).toEqual({ tabIndex: 1 }));
    cleanup();
    db.close();
    await db.open();
    renderWithRoute();
    await waitFor(() => expect(screen.getByTestId('variation-tab-1')).toHaveAttribute('aria-selected', 'true'));
  });

  it('the checkpoint quiz picks up at the question the student reached', async () => {
    const { remember } = await import('../../services/studentMemory');
    await remember('quiz-progress', 'test-opening', { index: 1, completed: false });
    renderWithRoute();
    await waitFor(() => expect(screen.getByTestId('checkpoint-quiz').textContent).toContain('Q2?'));
  });

  it('a finished checkpoint quiz stays finished', async () => {
    const { remember } = await import('../../services/studentMemory');
    await remember('quiz-progress', 'test-opening', { index: 1, completed: true });
    renderWithRoute();
    await waitFor(() => expect(screen.getByTestId('variation-tabs')).toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByTestId('checkpoint-quiz')).toBeNull();
  });

  it('nothing remembered lands on the main line', async () => {
    renderWithRoute();
    await waitFor(() => expect(screen.getByTestId('variation-tab-main')).toHaveAttribute('aria-selected', 'true'));
  });
});
