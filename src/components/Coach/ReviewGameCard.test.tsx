import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/utils';
import { buildGameRecord } from '../../test/factories';
import { ReviewGameCard } from './ReviewGameCard';

vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { glowBrightness: 100 } }),
}));

const identity = { profileName: 'David', chessComUsername: 'Knight_Mare_01' };

describe('ReviewGameCard — WIN / LOSS from the resolved side, never a raw 1-0', () => {
  it('a Black win shows a green WIN, and the opponent only', () => {
    const game = buildGameRecord({ source: 'chesscom', white: 'KaiserlicheHoheit', black: 'Knight_Mare_01', result: '0-1' });
    render(<ReviewGameCard game={game} onClick={() => undefined} identity={identity} />);
    const badge = screen.getByTestId('review-game-outcome');
    expect(badge).toHaveTextContent('WIN');
    expect(badge.getAttribute('data-outcome')).toBe('win');
    expect(badge.className).toMatch(/emerald/);
    expect(screen.getByText(/vs KaiserlicheHoheit/)).toBeTruthy();
    expect(screen.queryByText('0-1')).toBeNull();
  });

  it('the same 0-1 as White is a red LOSS', () => {
    const game = buildGameRecord({ source: 'chesscom', white: 'Knight_Mare_01', black: 'someone', result: '0-1' });
    render(<ReviewGameCard game={game} onClick={() => undefined} identity={identity} />);
    const badge = screen.getByTestId('review-game-outcome');
    expect(badge).toHaveTextContent('LOSS');
    expect(badge.className).toMatch(/red/);
  });

  it('coach games resolve without any identity', () => {
    const game = buildGameRecord({ source: 'coach', white: 'David', black: 'Stockfish Bot', result: '1-0' });
    render(<ReviewGameCard game={game} onClick={() => undefined} />);
    expect(screen.getByTestId('review-game-outcome')).toHaveTextContent('WIN');
    expect(screen.getAllByText(/vs Coach/).length).toBeGreaterThan(0);
  });

  it('draw is neutral; an unresolved identity is a ? with a hint, not a guess', () => {
    const draw = buildGameRecord({ source: 'lichess', white: 'Knight_Mare_01', black: 'x', result: '1/2-1/2' });
    const { unmount } = render(<ReviewGameCard game={draw} onClick={() => undefined} identity={identity} />);
    expect(screen.getByTestId('review-game-outcome')).toHaveTextContent('DRAW');
    unmount();
    const unknown = buildGameRecord({ source: 'lichess', white: 'alice', black: 'bob', result: '1-0' });
    render(<ReviewGameCard game={unknown} onClick={() => undefined} identity={identity} />);
    const badge = screen.getByTestId('review-game-outcome');
    expect(badge).toHaveTextContent('?');
    expect(badge.getAttribute('data-outcome')).toBe('unknown');
    expect(badge.getAttribute('title')).toMatch(/Settings/);
  });
});
