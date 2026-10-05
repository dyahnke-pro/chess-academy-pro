import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThinkingLessonBoard, lessonSquareStyles } from './ThinkingLessonBoard';
import type { LessonView } from '../../services/thinkingLessonSession';

const VIEW: LessonView = {
  active: true, step: 'their-targets', stage: 'guide', fen: '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1',
  found: ['c6'], wrong: ['a1'], shown: ['e5'], focus: [], asking: true, prompt: 'Tap every piece of theirs you could win.',
  index: 2, total: 4, choices: [], choosing: false,
};

describe('ThinkingLessonBoard', () => {
  it('paints found green over everything, wrong red, shown yellow', () => {
    const s = lessonSquareStyles({ ...VIEW, shown: ['c6', 'e5'] });
    expect(String(s.c6.background)).toMatch(/34,197,94/);
    expect(String(s.a1.background)).toMatch(/239,68,68/);
    expect(String(s.e5.background)).toMatch(/250,204,21/);
  });

  it('paints the follow-up chain\'s piece blue, under found/wrong/shown', () => {
    const s = lessonSquareStyles({ ...VIEW, focus: ['d4', 'c6'] });
    expect(String(s.d4.background)).toMatch(/59,130,246/);
    expect(String(s.c6.background)).toMatch(/34,197,94/);
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
    expect(screen.getByTestId('thinking-lesson-dont-know')).toHaveProperty('disabled', true);
  });

  it('a mixed round shows the step chips while it asks which question the board asks, and forwards the pick', () => {
    const onChoose = vi.fn();
    const mixed: LessonView = {
      ...VIEW, step: 'mixed', stage: 'solo', asking: false, choosing: true, prompt: 'Which question does this board ask?',
      found: [], wrong: [], shown: [],
      choices: [{ step: 'am-i-safe', label: 'Am I safe?' }, { step: 'their-targets', label: 'Where are their targets?' }],
    };
    render(<ThinkingLessonBoard view={mixed} onTap={vi.fn()} onDontKnow={vi.fn()} onStop={vi.fn()} onChoose={onChoose} />);
    expect(screen.getByTestId('thinking-lesson-prompt').textContent).toMatch(/Which question/);
    expect(screen.getByTestId('thinking-lesson-choice-am-i-safe').textContent).toBe('Am I safe?');
    fireEvent.click(screen.getByTestId('thinking-lesson-choice-their-targets'));
    expect(onChoose).toHaveBeenCalledWith('their-targets');
    // "I don't know" is live at a step choice too.
    expect(screen.getByTestId('thinking-lesson-dont-know')).toHaveProperty('disabled', false);
  });

  it('no chips outside a step choice, or on a surface without onChoose', () => {
    const chips = [{ step: 'am-i-safe', label: 'Am I safe?' }];
    const { rerender } = render(<ThinkingLessonBoard view={{ ...VIEW, choices: chips }} onTap={vi.fn()} onDontKnow={vi.fn()} onStop={vi.fn()} onChoose={vi.fn()} />);
    expect(screen.queryByTestId('thinking-lesson-choices')).toBeNull();
    rerender(<ThinkingLessonBoard view={{ ...VIEW, choices: chips, choosing: true, asking: false }} onTap={vi.fn()} onDontKnow={vi.fn()} onStop={vi.fn()} />);
    expect(screen.queryByTestId('thinking-lesson-choices')).toBeNull();
  });
});
