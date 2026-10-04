import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThinkingLessonBoard, lessonSquareStyles } from './ThinkingLessonBoard';
import type { LessonView } from '../../services/thinkingLessonSession';

const VIEW: LessonView = {
  active: true, step: 'their-targets', stage: 'guide', fen: '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1',
  found: ['c6'], wrong: ['a1'], shown: ['e5'], asking: true, prompt: 'Tap every piece of theirs you could win.',
  index: 2, total: 4,
};

describe('ThinkingLessonBoard', () => {
  it('paints found green over everything, wrong red, shown yellow', () => {
    const s = lessonSquareStyles({ ...VIEW, shown: ['c6', 'e5'] });
    expect(String(s.c6.background)).toMatch(/34,197,94/);
    expect(String(s.a1.background)).toMatch(/239,68,68/);
    expect(String(s.e5.background)).toMatch(/250,204,21/);
  });

  it('renders the stage, progress and prompt, and wires the buttons', () => {
    const onDontKnow = vi.fn();
    const onStop = vi.fn();
    render(<ThinkingLessonBoard view={VIEW} onTap={vi.fn()} onDontKnow={onDontKnow} onStop={onStop} />);
    expect(screen.getByTestId('thinking-lesson-stage').textContent).toBe('Your turn');
    expect(screen.getByTestId('thinking-lesson-progress').textContent).toBe('2 / 4');
    expect(screen.getByTestId('thinking-lesson-prompt').textContent).toMatch(/Tap every piece/);
    fireEvent.click(screen.getByTestId('thinking-lesson-dont-know'));
    fireEvent.click(screen.getByTestId('thinking-lesson-stop'));
    expect(onDontKnow).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when no lesson is running', () => {
    const { container } = render(<ThinkingLessonBoard view={{ ...VIEW, active: false }} onTap={vi.fn()} onDontKnow={vi.fn()} onStop={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('"I don\'t know" is disabled while the coach is talking', () => {
    render(<ThinkingLessonBoard view={{ ...VIEW, asking: false }} onTap={vi.fn()} onDontKnow={vi.fn()} onStop={vi.fn()} />);
    expect((screen.getByTestId('thinking-lesson-dont-know')).disabled).toBe(true);
  });
});
