import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecapSheet, RECAP_PHRASE } from './RecapSheet';
import { MISSIONS } from '../../missions/registry';

describe('RecapSheet', () => {
  it('one fixed phrase per phase result; an unplayed phase reads "not reached"', () => {
    render(<RecapSheet phaseCards={{ opening: MISSIONS['develop-and-castle'], middlegame: MISSIONS['free-piece-stay-ahead'] }} results={{ opening: 'pass-first-try' }} />);
    expect(screen.getByTestId('mission-recap-opening')).toHaveTextContent(RECAP_PHRASE['pass-first-try']);
    expect(screen.getByTestId('mission-recap-middlegame')).toHaveAttribute('data-outcome', 'incomplete');
    expect(screen.getByTestId('mission-recap-middlegame')).toHaveTextContent(RECAP_PHRASE.incomplete);
    expect(screen.queryByTestId('mission-recap-targeted')).not.toBeInTheDocument();
  });

  it('a boss recap reveals what it went after and how each held', () => {
    render(<RecapSheet phaseCards={{}} results={{}} targeted={[{ label: 'Develop & Castle', held: true }, { label: 'Tactically win an extra piece', held: false }, { label: 'Checkmate the king', held: null }]} />);
    expect(screen.getByTestId('mission-recap-targeted')).toHaveTextContent('Develop & Castle — you held it');
    expect(screen.getByTestId('mission-recap-targeted')).toHaveTextContent('Tactically win an extra piece — it got through');
    expect(screen.getByTestId('mission-recap-targeted')).toHaveTextContent('Checkmate the king — it never came up');
  });
});
