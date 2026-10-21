import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MissionBriefing } from '../../missions/missionCard';

// The board is stubbed: a drop is a button, so the try is driven without drag events.
const drops: Array<(a: { sourceSquare: string; targetSquare: string | null }) => boolean> = [];
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: (props: { fen: string; arrows?: Array<{ startSquare: string; endSquare: string }>; onPieceDrop?: (a: { sourceSquare: string; targetSquare: string | null }) => boolean }) => {
    if (props.onPieceDrop) drops.push(props.onPieceDrop);
    return <div data-testid="board" data-fen={props.fen} data-arrows={(props.arrows ?? []).map((a) => `${a.startSquare}${a.endSquare}`).join(',')} />;
  },
}));

import { BriefingFlow, DEMO_STEP_MS } from './BriefingFlow';

/** A real K+Q mate (the demo) and a mate-in-one try (Qb7#). */
const B: MissionBriefing = {
  novel: true,
  idea: 'Box the king with your queen, bring your king, then mate.',
  demoFen: 'k7/8/1QK5/8/8/8/8/8 w - - 0 1',
  demoSans: ['Qb7#'],
  tryFen: 'k7/8/1QK5/8/8/8/8/8 w - - 0 1',
  tryAnswersUci: ['b6b7'],
};
const lastDrop = (from: string, to: string): void => { act(() => { drops[drops.length - 1]({ sourceSquare: from, targetSquare: to }); }); };

describe('BriefingFlow', () => {
  afterEach(() => { vi.useRealTimers(); drops.length = 0; });

  it('idea → demo (played out with arrows) → try; the right move earns a check', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<BriefingFlow title="K+Q mate" briefing={B} mode="full" orientation="white" onDone={onDone} />);
    expect(screen.getByTestId('mission-briefing-idea')).toHaveTextContent('Box the king');
    fireEvent.click(screen.getByTestId('mission-briefing-next'));
    expect(screen.getByTestId('mission-briefing-try')).toBeDisabled();
    act(() => { vi.advanceTimersByTime(DEMO_STEP_MS); });
    expect(screen.getByTestId('board')).toHaveAttribute('data-arrows', 'b6b7');
    fireEvent.click(screen.getByTestId('mission-briefing-try'));
    lastDrop('b6', 'b7');
    expect(screen.getByTestId('mission-briefing-right')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mission-briefing-done'));
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('a wrong try draws the answer, and the game still starts', () => {
    const onDone = vi.fn();
    render(<BriefingFlow title="K+Q mate" briefing={B} mode="try-only" orientation="white" onDone={onDone} />);
    expect(screen.getByTestId('mission-briefing')).toHaveAttribute('data-step', 'try');
    lastDrop('b6', 'b5');
    expect(screen.getByTestId('mission-briefing-shown')).toBeInTheDocument();
    expect(screen.getByTestId('board')).toHaveAttribute('data-arrows', 'b6b7');
    fireEvent.click(screen.getByTestId('mission-briefing-done'));
    expect(onDone).toHaveBeenCalledWith(false);
  });
});
