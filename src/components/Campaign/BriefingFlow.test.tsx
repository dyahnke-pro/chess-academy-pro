import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MissionBriefing } from '../../missions/missionCard';

// The board is stubbed: a drop is a button, so the try is driven without drag events.
const drops: Array<(a: { sourceSquare: string; targetSquare: string | null }) => boolean> = [];
const taps: Array<(a: { square: string }) => void> = [];
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: (props: { fen: string; arrows?: Array<{ startSquare: string; endSquare: string }>; onPieceDrop?: (a: { sourceSquare: string; targetSquare: string | null }) => boolean; onSquareClick?: (a: { square: string }) => void }) => {
    if (props.onPieceDrop) drops.push(props.onPieceDrop);
    if (props.onSquareClick) taps.push(props.onSquareClick);
    return <div data-testid="board" data-fen={props.fen} data-arrows={(props.arrows ?? []).map((a) => `${a.startSquare}${a.endSquare}`).join(',')} />;
  },
}));

import { BriefingFlow, DEMO_STEP_MS } from './BriefingFlow';
import { briefingFor, mirrorFen } from './briefingMirror';
import { Chess } from 'chess.js';

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
  afterEach(() => { vi.useRealTimers(); drops.length = 0; taps.length = 0; });

  it('the try takes two taps as well as a drag (a phone)', () => {
    const onDone = vi.fn();
    render(<BriefingFlow title="K+Q mate" briefing={B} mode="try-only" orientation="white" onDone={onDone} />);
    act(() => { taps[taps.length - 1]({ square: 'b6' }); });
    act(() => { taps[taps.length - 1]({ square: 'b7' }); });
    expect(screen.getByTestId('mission-briefing-right')).toBeInTheDocument();
  });

  it('idea → demo (played out with arrows) → try; the right move earns a check', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<BriefingFlow title="K+Q mate" briefing={B} mode="full" orientation="white" onDone={onDone} />);
    expect(screen.getByTestId('mission-briefing-idea')).toHaveTextContent('Box the king');
    fireEvent.click(screen.getByTestId('mission-briefing-next'));
    expect(screen.getByTestId('mission-briefing-try')).toBeEnabled();
    act(() => { vi.advanceTimersByTime(DEMO_STEP_MS); });
    expect(screen.getByTestId('board')).toHaveAttribute('data-arrows', 'b6b7');
    fireEvent.click(screen.getByTestId('mission-briefing-try'));
    lastDrop('b6', 'b7');
    expect(screen.getByTestId('mission-briefing-right')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mission-briefing-done'));
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('the demo can be skipped at its first move — the try comes at once', () => {
    vi.useFakeTimers();
    const LONG: MissionBriefing = { ...B, demoFen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', demoSans: ['Qd7', 'Ke4', 'Ke2', 'Ke5'] };
    render(<BriefingFlow title="K+Q mate" briefing={LONG} mode="full" orientation="white" onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mission-briefing-next'));
    fireEvent.click(screen.getByTestId('mission-briefing-try'));
    expect(screen.getByTestId('mission-briefing')).toHaveAttribute('data-step', 'try');
    expect(screen.getByTestId('mission-briefing-ask')).toBeInTheDocument();
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

  it('a briefing written for White is mirrored for a Black student — every move still legal, the try still mate', () => {
    expect(mirrorFen('k7/8/1QK5/8/8/8/8/8 w - - 0 1')).toBe('8/8/8/8/8/1qk5/8/K7 b - - 0 1');
    const black = briefingFor(B, 'b');
    expect(new Chess(black.tryFen).turn()).toBe('b');
    expect(black.demoSans).toEqual(['Qb2#']);
    const t = new Chess(black.tryFen);
    t.move({ from: black.tryAnswersUci[0].slice(0, 2), to: black.tryAnswersUci[0].slice(2, 4) });
    expect(t.isCheckmate()).toBe(true);
    // Already the student's colour: unchanged.
    expect(briefingFor(B, 'w')).toBe(B);
  });

  it("the real K+Q briefing mirrors for Black: the demo replays legally and still mates, every try answer mates", async () => {
    const { MISSIONS } = await import('../../missions/registry');
    const real = MISSIONS['kq-mate'].briefing;
    expect(real).toBeDefined();
    if (!real) return;
    const black = briefingFor(real, 'b');
    const demo = new Chess(black.demoFen);
    for (const san of black.demoSans) demo.move(san);
    expect(demo.isCheckmate()).toBe(true);
    for (const u of black.tryAnswersUci) {
      const t = new Chess(black.tryFen);
      t.move({ from: u.slice(0, 2), to: u.slice(2, 4), ...(u[4] ? { promotion: u[4] } : {}) });
      expect(t.isCheckmate()).toBe(true);
    }
  });
});

