import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const dispatch = vi.fn();
vi.mock('../../coach/dispatchCoachTurn', () => ({ dispatchCoachTurn: (...a: unknown[]) => dispatch(...a) }));
vi.mock('../../services/voiceService', () => ({ voiceService: { stop: vi.fn(), speakGrounded: vi.fn(async () => undefined) } }));

import { BoardQuestionBox } from './BoardQuestionBox';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const LINE = { label: 'd5', startFen: FEN, plies: [] };

const ask = (q: string): void => {
  fireEvent.change(screen.getByTestId('t-input'), { target: { value: q } });
  fireEvent.click(screen.getByTestId('t-send'));
};

beforeEach(() => { dispatch.mockReset(); });

describe('BoardQuestionBox', () => {
  it('asks through the one door with the board, shows the answer and its proof', async () => {
    dispatch.mockResolvedValue({ text: 'They can attack your bishop with d5.', lines: [LINE] });
    const walk = vi.fn();
    render(<BoardQuestionBox fen={FEN} studentColor="white" route="/tactics/setup" onWalkLine={walk} engineBestMoveUci="d7d5" testIdPrefix="t" />);
    ask('can they attack my bishop?');
    await waitFor(() => expect(screen.getByTestId('t-reply').textContent).toBe('They can attack your bishop with d5.'));
    const [input] = dispatch.mock.calls[0] as [{ surface: string; ask: string; liveState: { fen: string; engineBestMoveUci: string; whoseTurn: string } }];
    expect(input.ask).toBe('can they attack my bishop?');
    expect(input.liveState).toMatchObject({ fen: FEN, engineBestMoveUci: 'd7d5', whoseTurn: 'black' });
    fireEvent.click(screen.getByTestId('t-walk-line-btn'));
    expect(walk).toHaveBeenCalledWith(LINE);
  });
  it('"show me" plays the line straight away', async () => {
    dispatch.mockResolvedValue({ text: 'Playing the line out on the board, from d5 exd5.', lines: [LINE], autoWalk: LINE });
    const walk = vi.fn();
    render(<BoardQuestionBox fen={FEN} studentColor="white" route="/tactics" onWalkLine={walk} testIdPrefix="t" />);
    ask('show me');
    await waitFor(() => expect(walk).toHaveBeenCalledWith(LINE));
  });
  it('falls back to the screen\'s computed answer when the coach has nothing', async () => {
    dispatch.mockRejectedValue(new Error('offline'));
    const fallback = vi.fn(async () => 'Nxe5 wins the pawn.');
    render(<BoardQuestionBox fen={FEN} studentColor="white" route="/tactics" onWalkLine={vi.fn()} fallback={fallback} testIdPrefix="t" />);
    ask('why?');
    await waitFor(() => expect(screen.getByTestId('t-reply').textContent).toBe('Nxe5 wins the pawn.'));
  });
});
