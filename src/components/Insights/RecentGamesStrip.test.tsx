import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { db } from '../../db/schema';
import { buildGameRecord, buildUserProfile, resetFactoryCounter } from '../../test/factories';
import { RecentGamesStrip, RECENT_GAMES_LIMIT } from './RecentGamesStrip';

// The most recent games belong at the TOP of the Weaknesses overview (David
// 2026-09-05: "that needs to be somewhere more visible!"). Pinned here: newest
// first, capped, master games excluded, See-all routes to the full list, and
// nothing renders on an empty library (the page's empty state owns that).

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function day(n: number): string {
  return `2026-08-${String(n).padStart(2, '0')}`;
}

beforeEach(async () => {
  resetFactoryCounter();
  mockNavigate.mockReset();
  await db.delete();
  await db.open();
});

describe('RecentGamesStrip', () => {
  it('renders nothing when the library is empty', async () => {
    const { container } = render(<RecentGamesStrip />);
    // Give the read a tick to resolve, then assert the strip stayed absent.
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="recent-games-strip"]')).toBeNull();
  });

  it('shows the newest games first, capped, with master games excluded', async () => {
    await db.profiles.put(buildUserProfile({ preferences: { ...buildUserProfile().preferences, chessComUsername: 'david' } }));
    const games = Array.from({ length: RECENT_GAMES_LIMIT + 3 }, (_, i) =>
      buildGameRecord({ white: 'david', black: `opp-${i}`, date: day(i + 1), isMasterGame: false }));
    // A master game dated NEWER than everything must still be excluded.
    const master = buildGameRecord({ white: 'Carlsen', black: 'Caruana', date: day(28), isMasterGame: true });
    await db.games.bulkPut([...games, master]);

    render(<RecentGamesStrip />);
    await waitFor(() => expect(screen.getByTestId('recent-games-strip')).toBeInTheDocument());
    const cards = screen.getAllByTestId('enhanced-game-card');
    expect(cards).toHaveLength(RECENT_GAMES_LIMIT);
    // Newest non-master game first (opp-7, dated day 8), never the master game.
    expect(cards[0].textContent).toContain('opp-7');
    expect(screen.queryByText(/Caruana/)).toBeNull();
  });

  it('"See all" opens the full games list', async () => {
    await db.games.put(buildGameRecord({ date: day(3), isMasterGame: false }));
    render(<RecentGamesStrip />);
    await waitFor(() => expect(screen.getByTestId('recent-games-see-all')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recent-games-see-all'));
    expect(mockNavigate).toHaveBeenCalledWith('/weaknesses/games');
  });
});
