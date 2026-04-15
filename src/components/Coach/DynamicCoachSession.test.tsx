import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicCoachSession } from './DynamicCoachSession';

describe('DynamicCoachSession', () => {
  it('renders children inside the wrapper', () => {
    render(
      <DynamicCoachSession title="Middlegame plan" onExit={vi.fn()}>
        <div data-testid="inner">hello</div>
      </DynamicCoachSession>,
    );
    expect(screen.getByTestId('dynamic-coach-session')).toBeInTheDocument();
    expect(screen.getByTestId('inner')).toHaveTextContent('hello');
  });

  it('exposes the title in the floating pill', () => {
    render(
      <DynamicCoachSession title="Walkthrough: Sicilian" onExit={vi.fn()}>
        <div>body</div>
      </DynamicCoachSession>,
    );
    // The pill is hidden on mobile but still in the DOM.
    const pill = screen.getByTestId('dynamic-coach-session-exit');
    expect(pill).toHaveTextContent('Walkthrough: Sicilian');
  });

  it('calls onExit when the pill is clicked', () => {
    const onExit = vi.fn();
    render(
      <DynamicCoachSession title="Analyze" onExit={onExit}>
        <div>body</div>
      </DynamicCoachSession>,
    );
    fireEvent.click(screen.getByTestId('dynamic-coach-session-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
