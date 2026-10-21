import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MissionBanner } from './MissionBanner';
import { IDLE, stepMission } from '../../missions/missionRunner';
import { MISSIONS } from '../../missions/registry';

const CARD = MISSIONS['develop-and-castle'];
const live = stepMission(IDLE, { kind: 'start', cards: [CARD] }).state;
const paused = stepMission(live, { kind: 'moved', game: { sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Ng5'], studentColor: 'w' }, fenBefore: '', candidatesUci: [] }).state;

describe('MissionBanner', () => {
  it('renders nothing with no mission', () => {
    const { container } = render(<MissionBanner view={IDLE} onTryAgain={vi.fn()} onPlayOn={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('a live mission shows its name and progress, and no rewind', () => {
    render(<MissionBanner view={live} onTryAgain={vi.fn()} onPlayOn={vi.fn()} />);
    expect(screen.getByText('Mission: Develop & Castle')).toBeInTheDocument();
    expect(screen.getByTestId('mission-progress')).toHaveTextContent('0/4 pieces out');
    expect(screen.queryByTestId('mission-rewind')).not.toBeInTheDocument();
  });

  it('a miss shows "Try again" and "Play on", each wired to its hand', () => {
    const tryAgain = vi.fn();
    const playOn = vi.fn();
    render(<MissionBanner view={paused} onTryAgain={tryAgain} onPlayOn={playOn} />);
    expect(screen.getByTestId('mission-banner')).toHaveAttribute('data-phase', 'paused');
    fireEvent.click(screen.getByTestId('mission-try-again'));
    fireEvent.click(screen.getByTestId('mission-play-on'));
    expect(tryAgain).toHaveBeenCalledTimes(1);
    expect(playOn).toHaveBeenCalledTimes(1);
  });

  it('a phase that ended before the pass says which phase', () => {
    const mg = MISSIONS['free-piece-stay-ahead'];
    const over = { ...stepMission(IDLE, { kind: 'start', cards: [mg] }).state, phase: 'resolved' as const, outcome: 'incomplete' as const };
    render(<MissionBanner view={over} onTryAgain={vi.fn()} onPlayOn={vi.fn()} />);
    expect(screen.getByText('Mission: Take the free piece')).toBeInTheDocument();
    expect(screen.getByTestId('mission-progress')).toHaveTextContent('Middlegame over');
  });
});
