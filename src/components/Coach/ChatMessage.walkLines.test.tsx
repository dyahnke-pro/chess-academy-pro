// ONE PLAY-LINE BUTTON (David 2026-11-17): a coach answer's lines are played
// by the one button under the board, never by buttons inside the bubble.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../types';

const FEN = '3r2k1/5ppp/8/8/8/3B4/5PPP/3Q2K1 w - - 0 1';
const msg: ChatMessageType = {
  id: 'm1', role: 'assistant', content: 'Qd2? Then …', timestamp: 0,
  lines: [{ label: 'Qd2', startFen: FEN, plies: [] }],
};

describe('ChatMessage — no line buttons in the bubble', () => {
  it('an answer with lines renders no walk buttons of its own', () => {
    render(<MemoryRouter><ChatMessage message={msg} /></MemoryRouter>);
    expect(screen.queryByTestId('message-walk-lines')).toBeNull();
    expect(screen.queryByText(/^Walk /)).toBeNull();
  });
});
