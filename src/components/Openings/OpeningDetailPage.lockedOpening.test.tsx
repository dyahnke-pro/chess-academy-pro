/**
 * THE LOCKED OPENING (David 2026-11-12): once a free user has spent their free
 * opening, any other opening opens its page and its main-line Watch — nothing
 * else. Every other tap shows the opening wall, and the wall pops up ON ITS
 * OWN when that free Watch ends — once per opening; after that the unlock bar
 * on the page is the way back to it.
 *
 * Driven through the real page: only the wall, the lesson player and the
 * board are stubbed, so the decision under test is the page's own.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { OpeningDetailPage, OPEN_ON_LOCKED_OPENING } from './OpeningDetailPage';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';
import { db } from '../../db/schema';
import { useFreeTierStore } from '../../stores/freeTierStore';

const mockGetOpeningById = vi.fn();
const mockCanView = vi.fn((): boolean => false);

vi.mock('../../services/gamesCourseRecord', () => ({
  gamesCourseRecord: (): Promise<null> => Promise.resolve(null),
}));

vi.mock('../../services/openingService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/openingService')>()),
  getOpeningById: (...args: unknown[]): unknown => mockGetOpeningById(...args),
  toggleFavorite: vi.fn().mockResolvedValue(true),
  markRungComplete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    isPro: false,
    status: 'free',
    source: 'none',
    expiresAt: null,
    isResolving: false,
    lastError: null,
    trialDaysLeft: null,
    isTrial: false,
    gateEnabled: true,
    ownedOpeningIds: [],
    shouldShowPaywall: true,
  }),
}));

// Whether THIS opening is theirs is the one answer under test's control; the
// opening is a sold course, never the members-only library.
vi.mock('../../services/freeTierService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/freeTierService')>()),
  canViewOpening: (): boolean => mockCanView(),
  isMembersOnlyOpening: (): boolean => false,
}));

vi.mock('../../services/billingService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/billingService')>()),
  getOpeningOffer: () => Promise.resolve({
    openingId: 'locked-test', productId: 'opening.locked_test', priceString: '$0.99',
    priceAmount: 0.99, currency: 'USD', title: 'Locked Test',
  }),
}));

vi.mock('../Paywall/PaywallPage', () => ({
  PaywallPage: ({ moment, onLeave }: { moment?: string; onLeave?: () => void }) => (
    <div data-testid={`wall-${moment ?? 'none'}`}>
      <button type="button" data-testid="wall-leave" onClick={() => onLeave?.()}>Not now</button>
    </div>
  ),
}));

vi.mock('./LessonPlayer', () => ({
  LessonPlayer: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="lesson-player">
      <button type="button" data-testid="finish-watch" onClick={() => onComplete?.()}>finish</button>
    </div>
  ),
}));

vi.mock('../../data/lessons', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/lessons')>()),
  hasLessonScript: (): boolean => true,
  getLessonScript: () => ({ openingId: 'locked-test', beats: [] }),
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: () => <div data-testid="chess-board">Board</div>,
}));
vi.mock('../Board/MiniBoard', () => ({
  MiniBoard: () => <div data-testid="mini-board">MiniBoard</div>,
}));
vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({ playMoveSound: vi.fn(), playCelebration: vi.fn(), playEncouragement: vi.fn() }),
}));

const lockedOpening: OpeningRecord = buildOpeningRecord({
  id: 'locked-test',
  eco: 'C50',
  name: 'Italian Game',
  pgn: 'e4 e5 Nf3 Nc6 Bc4',
  color: 'white',
  variations: [{ name: 'Two Knights', pgn: 'e4 e5 Nf3 Nc6 Bc4 Nf6', explanation: 'Sharp' }],
  // The main-line Watch already done, so the page does not auto-start it.
  linesDiscovered: [-1],
  linesPerfected: [],
});

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/openings/locked-test']}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/openings/:id" element={<OpeningDetailPage />} />
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('a locked opening opens its page and the main-line Watch, nothing else', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetOpeningById.mockResolvedValue(lockedOpening);
    mockCanView.mockReturnValue(false);
    useFreeTierStore.setState((s) => ({ hydrated: true, row: { ...s.row, freeOpeningId: 'other', freeOpeningIds: ['other'] } }));
    await db.studentMemory.clear();
  });

  it('only the page and the main-line Watch are open on a locked opening', () => {
    const open = Object.entries(OPEN_ON_LOCKED_OPENING).filter(([, v]) => v).map(([k]) => k).sort();
    expect(open).toEqual(['detail', 'walkthrough']);
  });

  it('Learn, Practice and Play show the wall, and "Not now" comes back to the opening, never Home', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('learn-btn')).toBeInTheDocument());
    for (const btn of ['learn-btn', 'practice-btn', 'play-btn']) {
      fireEvent.click(screen.getByTestId(btn));
      await waitFor(() => expect(screen.getByTestId('wall-locked-action')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('wall-leave'));
      await waitFor(() => expect(screen.getByTestId('learn-btn')).toBeInTheDocument());
      expect(screen.queryByTestId('home-page')).toBeNull();
    }
  });

  it('the main-line Watch plays free, and the wall pops up when it ends — once', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('walkthrough-btn')).toBeInTheDocument());
    expect(screen.queryByTestId('opening-unlock-bar')).toBeNull();

    fireEvent.click(screen.getByTestId('walkthrough-btn'));
    expect(screen.getByTestId('lesson-player')).toBeInTheDocument();
    expect(screen.queryByTestId('wall-locked-action')).toBeNull();
    fireEvent.click(screen.getByTestId('finish-watch'));
    await waitFor(() => expect(screen.getByTestId('wall-after-watch')).toBeInTheDocument());

    // Not now → back on the page, with the unlock bar priced by the store.
    fireEvent.click(screen.getByTestId('wall-leave'));
    await waitFor(() => expect(screen.getByTestId('opening-unlock-bar')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('opening-unlock-bar').textContent).toContain('$0.99'));

    // A replay does not throw the wall again.
    fireEvent.click(screen.getByTestId('walkthrough-btn'));
    fireEvent.click(screen.getByTestId('finish-watch'));
    await waitFor(() => expect(screen.getByTestId('opening-unlock-bar')).toBeInTheDocument());
    expect(screen.queryByTestId('wall-after-watch')).toBeNull();

    // The bar is the way back to it.
    fireEvent.click(screen.getByTestId('opening-unlock-bar'));
    await waitFor(() => expect(screen.getByTestId('wall-after-watch')).toBeInTheDocument());
  });

  it('the pop-up is remembered across visits: a fresh page shows the bar, not the wall', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('walkthrough-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('walkthrough-btn'));
    fireEvent.click(screen.getByTestId('finish-watch'));
    await waitFor(() => expect(screen.getByTestId('wall-after-watch')).toBeInTheDocument());
    document.body.innerHTML = '';

    renderPage();
    await waitFor(() => expect(screen.getByTestId('opening-unlock-bar')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('walkthrough-btn'));
    fireEvent.click(screen.getByTestId('finish-watch'));
    await waitFor(() => expect(screen.getByTestId('learn-btn')).toBeInTheDocument());
    expect(screen.queryByTestId('wall-after-watch')).toBeNull();
  });

  it('their own opening: no wall anywhere, no pop-up after Watch, no bar', async () => {
    mockCanView.mockReturnValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('learn-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('walkthrough-btn'));
    fireEvent.click(screen.getByTestId('finish-watch'));
    await waitFor(() => expect(screen.getByTestId('learn-btn')).toBeInTheDocument());
    expect(screen.queryByTestId('wall-after-watch')).toBeNull();
    expect(screen.queryByTestId('opening-unlock-bar')).toBeNull();
    fireEvent.click(screen.getByTestId('learn-btn'));
    expect(screen.queryByTestId('wall-locked-action')).toBeNull();
  });
});
