// The import→review handoff must actually appear, and must never nag.
//
// 🚨 WHY. Every user who pressed import succeeded, Stockfish ran, and the
// weaknesses landed — 234 for one new user in a single session — and then both
// new importers went straight to /weaknesses and left without ever opening a
// review. The analysis was paid for and shown to nobody. This card is the one
// tap between them, so "does it render for a real game" is the contract.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../db/schema';
import { buildGameRecord } from '../../test/factories';
import { ReviewLastGameCard } from './ReviewLastGameCard';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));

function renderCard(): void {
  render(<MemoryRouter><ReviewLastGameCard /></MemoryRouter>);
}

describe('ReviewLastGameCard', () => {
  beforeEach(async () => {
    navigate.mockClear();
    await db.games.clear();
    await db.meta.clear();
  });

  it('renders nothing on a fresh install — no game, no nag', async () => {
    renderCard();
    await waitFor(() => expect(screen.queryByTestId('dashboard-review-last-game')).toBeNull());
  });

  it('offers the most recent game the user actually played', async () => {
    await db.games.bulkPut([
      buildGameRecord({ id: 'g-old', date: '2026-09-01', isMasterGame: false }),
      buildGameRecord({ id: 'g-new', date: '2026-09-11', isMasterGame: false }),
    ]);
    renderCard();
    await waitFor(() => expect(screen.getByTestId('dashboard-review-last-game')).toBeTruthy());
    await userEvent.click(screen.getByTestId('dashboard-review-last-game-open'));
    expect(navigate).toHaveBeenCalledWith('/coach/review/g-new');
  });

  it('never offers a seeded sample game as "your last game"', async () => {
    await db.games.bulkPut([
      buildGameRecord({ id: 'sample-morphy-opera-1858', date: '2026-09-11', isMasterGame: false }),
      buildGameRecord({ id: 'master-x', date: '2026-09-10', isMasterGame: true }),
    ]);
    renderCard();
    await waitFor(() => expect(screen.queryByTestId('dashboard-review-last-game')).toBeNull());
  });

  it('is dismissible and stays dismissed — front and centre, not mandatory', async () => {
    await db.games.put(buildGameRecord({ id: 'g-1', date: '2026-09-11', isMasterGame: false }));
    renderCard();
    await waitFor(() => expect(screen.getByTestId('dashboard-review-last-game')).toBeTruthy());
    await userEvent.click(screen.getByTestId('dashboard-review-last-game-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('dashboard-review-last-game')).toBeNull());

    // A reload must not bring it back — a dismissed suggestion that returns is
    // a nag, which is exactly what "not mandatory" rules out.
    cleanup();
    renderCard();
    await waitFor(() => expect(screen.queryAllByTestId('dashboard-review-last-game')).toHaveLength(0));
  });

  it('advances to the next game once one has been opened', async () => {
    await db.games.bulkPut([
      buildGameRecord({ id: 'g-a', date: '2026-09-10', isMasterGame: false }),
      buildGameRecord({ id: 'g-b', date: '2026-09-11', isMasterGame: false }),
    ]);
    renderCard();
    await waitFor(() => expect(screen.getByTestId('dashboard-review-last-game')).toBeTruthy());
    await userEvent.click(screen.getByTestId('dashboard-review-last-game-open'));
    await waitFor(async () => expect(await db.meta.get('dashboard.reviewLastGame.actioned.v1')).toBeTruthy());

    // Remount clean — two live cards would make "which one did I click?"
    // decide the assertion, which is how this test first went flaky.
    cleanup();
    renderCard();
    await waitFor(() => expect(screen.getByTestId('dashboard-review-last-game')).toBeTruthy());
    await userEvent.click(screen.getByTestId('dashboard-review-last-game-open'));
    expect(navigate).toHaveBeenLastCalledWith('/coach/review/g-a');
  });
});
