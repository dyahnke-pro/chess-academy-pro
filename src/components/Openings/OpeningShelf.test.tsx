import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { OpeningShelf } from './OpeningShelf';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';

const OPENINGS: OpeningRecord[] = [
  buildOpeningRecord({ id: 'vienna', name: 'Vienna Game', color: 'white', pgn: 'e4 e5 Nc3' }),
  buildOpeningRecord({ id: 'english', name: 'English Opening', color: 'white', pgn: 'c4' }),
  buildOpeningRecord({ id: 'sicilian-alapin', name: 'Sicilian: Alapin', color: 'black', pgn: 'e4 c5 c3' }),
  buildOpeningRecord({ id: 'caro', name: 'Caro-Kann Defence', color: 'black', pgn: 'e4 c6' }),
  buildOpeningRecord({ id: 'kid', name: "King's Indian Defence", color: 'black', pgn: 'd4 Nf6 c4 g6' }),
  buildOpeningRecord({ id: 'dutch', name: 'Dutch Defence', color: 'black', pgn: 'd4 f5' }),
];

function renderShelf(url = '/openings', onOpen = vi.fn()): void {
  render(
    <MemoryRouter initialEntries={[url]}>
      <MotionConfig transition={{ duration: 0 }}>
        <OpeningShelf openings={OPENINGS} onOpen={onOpen} />
      </MotionConfig>
    </MemoryRouter>,
  );
}

const ids = (root: HTMLElement): (string | null)[] =>
  within(root).getAllByTestId(/^opening-card-/).map((el) => el.getAttribute('data-testid'));

describe('OpeningShelf', () => {
  it('opens on White, A–Z, with counts on the switch', () => {
    renderShelf();
    expect(ids(screen.getByTestId('shelf-white'))).toEqual(['opening-card-english', 'opening-card-vienna']);
    expect(screen.getByTestId('side-toggle-white')).toHaveTextContent('2');
    expect(screen.getByTestId('side-toggle-black')).toHaveTextContent('4');
  });

  it('Black splits vs 1.e4 and vs 1.d4 & others, A–Z within each', () => {
    renderShelf();
    fireEvent.click(screen.getByTestId('side-toggle-black'));
    expect(screen.queryByTestId('shelf-white')).not.toBeInTheDocument();
    expect(ids(screen.getByTestId('shelf-black-vs-e4'))).toEqual(['opening-card-caro', 'opening-card-sicilian-alapin']);
    expect(ids(screen.getByTestId('shelf-black-vs-other'))).toEqual(['opening-card-dutch', 'opening-card-kid']);
    expect(screen.getByText('Sicilian vs the Alapin')).toBeInTheDocument();
  });

  it('restores the side from the URL', () => {
    renderShelf('/openings?side=black');
    expect(screen.getByTestId('shelf-black-vs-e4')).toBeInTheDocument();
  });

  it('opens the tapped opening', () => {
    const onOpen = vi.fn();
    renderShelf('/openings', onOpen);
    fireEvent.click(screen.getByTestId('opening-card-vienna'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'vienna' }));
  });
});
