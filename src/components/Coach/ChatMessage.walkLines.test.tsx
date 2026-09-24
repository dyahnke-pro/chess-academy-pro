// The walk buttons on a coach answer that calculated lines (WO-DANYA-01 C).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../types';

const FEN = '3r2k1/5ppp/8/8/8/3B4/5PPP/3Q2K1 w - - 0 1';
const msg: ChatMessageType = {
  id: 'm1', role: 'assistant', content: 'Qd2? Then …', timestamp: 0,
  lines: [
    { label: 'Qd2', startFen: FEN, plies: [] },
    { label: 'Qe2', startFen: FEN, plies: [] },
  ],
};

describe('ChatMessage — walk a calculated line', () => {
  it('renders one Walk button per line and hands back THAT line', () => {
    const onWalkLine = vi.fn();
    render(<MemoryRouter><ChatMessage message={msg} onWalkLine={onWalkLine} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('message-walk-line-1'));
    expect(screen.getByTestId('message-walk-line-0').textContent).toBe('Walk Qd2');
    expect(onWalkLine).toHaveBeenCalledWith(msg.lines![1]);
  });
  it('NEGATIVE CONTROL: no handler, or no lines → no buttons', () => {
    const { rerender } = render(<MemoryRouter><ChatMessage message={msg} /></MemoryRouter>);
    expect(screen.queryByTestId('message-walk-lines')).toBeNull();
    rerender(<MemoryRouter><ChatMessage message={{ ...msg, lines: undefined }} onWalkLine={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByTestId('message-walk-lines')).toBeNull();
  });
});
