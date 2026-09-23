import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { EnhancedGameCard } from './EnhancedGameCard';
import { buildGameRecord } from '../../test/factories';
import type { OpeningKey } from '../../types';

describe('EnhancedGameCard — the card reads the game as it is (walk 5, S1a/S1b)', () => {
  it('names the opening behind the stored key, never the raw slug', () => {
    const game = buildGameRecord({ openingId: 'b50-sicilian-defense-modern-variations' as OpeningKey, result: '0-1', white: 'Stockfish Bot', black: 'Player' });
    render(<EnhancedGameCard game={game} username="Player" />);
    expect(screen.queryByText('b50-sicilian-defense-modern-variations')).toBeNull();
    expect(screen.getByText(/Sicilian Defense: Modern Variations/)).toBeTruthy();
  });

  it('an unfinished game is UNFINISHED, not a LOSS', () => {
    const game = buildGameRecord({ result: '*', white: 'Player', black: 'Coach' });
    render(<EnhancedGameCard game={game} username="Player" />);
    expect(screen.getByText('UNFINISHED')).toBeTruthy();
    expect(screen.queryByText('LOSS')).toBeNull();
  });
});
