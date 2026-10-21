import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MissionCardSheet } from './MissionCardSheet';
import { MISSIONS } from '../../missions/registry';

const DC = MISSIONS['develop-and-castle'];
const MG = MISSIONS['free-piece-stay-ahead'];

describe('MissionCardSheet', () => {
  it("lists the game's missions one line each, the watched habits, and starts on tap", () => {
    const onStart = vi.fn();
    render(<MissionCardSheet cards={[MG]} watchers={[DC]} canReplay={[]} onStart={onStart} onReplay={vi.fn()} />);
    expect(screen.getByTestId('mission-card-line-middlegame')).toHaveTextContent('Take the free piece');
    expect(screen.getByTestId('mission-card-watching')).toHaveTextContent('Develop & Castle');
    fireEvent.click(screen.getByTestId('mission-card-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('offers "Show me again" only where a briefing can be replayed', () => {
    const onReplay = vi.fn();
    render(<MissionCardSheet cards={[DC, MG]} watchers={[]} canReplay={[MG]} onStart={vi.fn()} onReplay={onReplay} />);
    expect(screen.queryByTestId(`mission-card-replay-${DC.id}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`mission-card-replay-${MG.id}`));
    expect(onReplay).toHaveBeenCalledWith(MG);
  });

  it('with every mission learned, it says the coach is only watching', () => {
    render(<MissionCardSheet cards={[]} watchers={[DC]} canReplay={[]} onStart={vi.fn()} onReplay={vi.fn()} />);
    expect(screen.getByTestId('mission-card-none')).toBeInTheDocument();
  });
});
