import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscussionPracticePanel } from './DiscussionPracticePanel';
import type { DiscussionPrompt } from '../../hooks/useDiscussionPractice';

/**
 * The "why did you play that?" probe is a CLEAN PROBE by default (SUPREME VOICE
 * LAW, David 2026-07-06): it carries ZERO board facts — not even good-vs-bad —
 * so the student's self-report isn't contaminated. The move-quality badge only
 * appears when the surface opts in via `showSeverity` (the REVIEW walk, David
 * 2026-07-10: "I need to know if it's a blunder or mistake I'm clicking on").
 */
const prompt: DiscussionPrompt = {
  question: "Why'd you play that?",
  fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  playedSan: 'e4',
  cpLoss: 120,
  shouldCount: true,
  gamePhase: 'opening',
  options: ['Win material', 'Develop a piece', 'Control the center'],
  severity: 'mistake',
};

const noop = (): void => undefined;

describe('DiscussionPracticePanel clean-probe contract', () => {
  it('hides the move-quality badge by default (live Learn/Play faucet)', () => {
    render(
      <DiscussionPracticePanel
        phase="asking"
        prompt={prompt}
        teach={null}
        onSubmit={vi.fn()}
        onSkip={noop}
        onDismissTeach={noop}
      />,
    );
    // The clean probe shows the question + the reason picker...
    expect(screen.getByText("Why'd you play that?")).toBeInTheDocument();
    expect(screen.getByTestId('discussion-reason-picker')).toBeInTheDocument();
    // ...but NEVER the severity/classification (would telegraph good-vs-bad).
    expect(screen.queryByTestId('discussion-severity')).toBeNull();
  });

  it('shows the badge only when the surface opts in (review walk)', () => {
    render(
      <DiscussionPracticePanel
        phase="asking"
        prompt={prompt}
        teach={null}
        onSubmit={vi.fn()}
        onSkip={noop}
        onDismissTeach={noop}
        showSeverity
      />,
    );
    expect(screen.getByTestId('discussion-severity')).toHaveTextContent(/mistake/i);
  });
});
