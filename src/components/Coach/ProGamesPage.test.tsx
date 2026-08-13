// The Pro Games rewatch surface must actually surface the games.
//
// 🔒 DAVID 2026-08-13: "The pro games under coach tab are so users can rewatch
// how any pro plays a certain opening. Make sure that's wired in, it's not
// dead weight." The 2,209-game reference corpus had no user-facing consumer at
// all — the full-map audit filed it as dead weight before David corrected what
// it was FOR. Per the locked rule, a wire that does not fire is not a wire:
// these tests put REAL reference rows in front of the page and require real
// games to come out the other side, through every step a user clicks.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProGamesPage, referenceToViewerGame, groupByOpening } from './ProGamesPage';
import { storeGameReferences } from '../../services/proGameReferenceService';
import { db } from '../../db/schema';
import type { ProGameReference } from '../../types';

vi.mock('../Openings/ModelGameViewer', () => ({
  ModelGameViewer: ({ game }: { game: { white: string; black: string } }) => (
    <div data-testid="mock-viewer">{game.white} vs {game.black}</div>
  ),
}));

const REF: ProGameReference = {
  id: 'pgref-test-1',
  playerId: 'naroditsky',
  openingId: 'caro-kann',
  proOpeningId: 'pro-naroditsky-caro-kann',
  variation: 'two-knights',
  variationLabel: 'Two Knights',
  white: 'DanielNaroditsky',
  black: 'StrongOpponent',
  studentSide: 'white',
  result: '1-0',
  opponentRating: 3105,
  date: '2025-11-02',
  source: 'chess.com',
  url: 'https://www.chess.com/game/live/1',
  eco: null,
  plyCount: 6,
  pgn: 'e4 c6 Nc3 d5 Nf3 Bg4',
} as ProGameReference;

beforeEach(async () => {
  await db.proGameReferences.clear();
});

describe('a real reference reaches the screen through real clicks', () => {
  it('player → opening → game list → viewer', async () => {
    await storeGameReferences([REF]);
    const user = userEvent.setup();
    render(<ProGamesPage />);

    // Step 1: the pro roster renders and Naroditsky is on it.
    const player = await screen.findByTestId('pro-games-player-naroditsky');
    await user.click(player);

    // Step 2: his Caro-Kann group appears, counted from the Dexie store —
    // the exact read path that had no consumer.
    const opening = await screen.findByTestId('pro-games-opening-pro-naroditsky-caro-kann');
    expect(opening.textContent).toContain('1 game');
    await user.click(opening);

    // Step 3: the game row shows the real fields.
    const row = await screen.findByTestId('pro-games-game-pgref-test-1');
    expect(row.textContent).toContain('DanielNaroditsky vs StrongOpponent');
    expect(row.textContent).toContain('3105');
    await user.click(row);

    // Step 4: the viewer mounts with the adapted game.
    await waitFor(() => {
      expect(screen.getByTestId('mock-viewer').textContent)
        .toContain('DanielNaroditsky vs StrongOpponent');
    });
  });

  it('an empty store shows the honest empty state, not a spinner forever', async () => {
    const user = userEvent.setup();
    render(<ProGamesPage />);
    await user.click(await screen.findByTestId('pro-games-player-naroditsky'));
    // fetch is absent in this environment, so the loader resolves empty — the
    // page must land on the empty state rather than hang on "Loading…".
    await screen.findByTestId('pro-games-empty');
  });
});

describe('the adapter tells the viewer the truth', () => {
  it('maps every field it claims, invents nothing about the moves', () => {
    const g = referenceToViewerGame(REF);
    expect(g.pgn).toBe(REF.pgn);
    expect(g.result).toBe('1-0');
    expect(g.studentSide).toBe('white');
    // The opponent's rating lands on the opponent's side.
    expect(g.blackElo).toBe(3105);
    expect(g.whiteElo).toBeNull();
    expect(g.year).toBe(2025);
    // The overview is assembled from the reference's own fields only.
    expect(g.overview).toContain('Two Knights');
    expect(g.overview).toContain('3105');
    expect(g.overview).toContain('chess.com');
  });

  it('groups by opening, most games first, strongest opponents first inside', () => {
    const mk = (id: string, opening: string, rating: number): ProGameReference =>
      ({ ...REF, id, proOpeningId: opening, opponentRating: rating });
    const groups = groupByOpening([
      mk('a', 'pro-x-caro-kann', 2000),
      mk('b', 'pro-x-caro-kann', 3000),
      mk('c', 'pro-x-vienna', 2500),
    ]);
    expect(groups[0].proOpeningId).toBe('pro-x-caro-kann');
    expect(groups[0].label).toBe('Caro Kann');
    expect(groups[0].games.map((g) => g.id)).toEqual(['b', 'a']);
  });
});
