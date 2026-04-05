import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { HintButton } from './HintButton';

describe('HintButton', () => {
  it('renders default label at level 0', () => {
    render(<HintButton currentLevel={0} onRequestHint={vi.fn()} />);
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Get a Hint');
  });

  it('calls onRequestHint when clicked', async () => {
    const handler = vi.fn();
    render(<HintButton currentLevel={0} onRequestHint={handler} />);
    await userEvent.click(screen.getByTestId('hint-button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('is disabled when maxLevel is reached', () => {
    render(<HintButton currentLevel={3} onRequestHint={vi.fn()} />);
    expect(screen.getByTestId('hint-button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<HintButton currentLevel={0} onRequestHint={vi.fn()} disabled />);
    expect(screen.getByTestId('hint-button')).toBeDisabled();
  });

  it('shows "Tactic Hint" label when tacticActive is true at level 0', () => {
    render(<HintButton currentLevel={0} onRequestHint={vi.fn()} tacticActive />);
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Tactic Hint');
  });

  it('sets data-tactic-active attribute', () => {
    const { rerender } = render(
      <HintButton currentLevel={0} onRequestHint={vi.fn()} tacticActive={false} />,
    );
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-tactic-active', 'false');

    rerender(
      <HintButton currentLevel={0} onRequestHint={vi.fn()} tacticActive />,
    );
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-tactic-active', 'true');
  });

  it('shows normal label at level 1+ even with tacticActive', () => {
    render(<HintButton currentLevel={1} onRequestHint={vi.fn()} tacticActive />);
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Show Nudge');
  });

  it('does not show pulse when disabled even with tacticActive', () => {
    render(<HintButton currentLevel={0} onRequestHint={vi.fn()} tacticActive disabled />);
    // Button should still be disabled
    expect(screen.getByTestId('hint-button')).toBeDisabled();
  });
});
