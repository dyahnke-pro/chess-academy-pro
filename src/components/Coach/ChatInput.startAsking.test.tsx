// The first keystroke of a question stops the coach (David 2026-09-24).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';

describe('ChatInput — onStartAsking', () => {
  it('fires once when the student starts typing, not on every keystroke', () => {
    const onStartAsking = vi.fn();
    render(<ChatInput onSend={vi.fn()} onStartAsking={onStartAsking} />);
    const input = screen.getByTestId('chat-text-input');
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.change(input, { target: { value: 'co' } });
    fireEvent.change(input, { target: { value: 'cou' } });
    expect(onStartAsking).toHaveBeenCalledTimes(1);
  });
  it('fires again for the NEXT question once the box was emptied', () => {
    const onStartAsking = vi.fn();
    render(<ChatInput onSend={vi.fn()} onStartAsking={onStartAsking} />);
    const input = screen.getByTestId('chat-text-input');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 'b' } });
    expect(onStartAsking).toHaveBeenCalledTimes(2);
  });
});
