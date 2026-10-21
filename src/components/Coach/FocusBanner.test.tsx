import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FocusBanner } from './FocusBanner';

describe('FocusBanner', () => {
  it('draws nothing when no focus owns the game', () => {
    const { container } = render(<FocusBanner view={{ focus: null, announced: false, paused: null }} onTryAgain={vi.fn()} onPlayOn={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('names an announced focus and offers no rewind while the game plays', () => {
    render(<FocusBanner view={{ focus: 'loose-pieces', announced: true, paused: null }} onTryAgain={vi.fn()} onPlayOn={vi.fn()} />);
    expect(screen.getByTestId('focus-banner').textContent).toContain('Loose pieces');
    expect(screen.queryByTestId('focus-rewind')).toBeNull();
  });

  it('keeps an unannounced focus hidden', () => {
    render(<FocusBanner view={{ focus: 'tactics', announced: false, paused: null }} onTryAgain={vi.fn()} onPlayOn={vi.fn()} />);
    expect(screen.getByTestId('focus-banner').textContent).not.toContain('Tactics');
    expect(screen.getByTestId('focus-banner').textContent).toContain('Watching one thing');
  });

  it('a taught miss offers Try again and Play on, and each reaches its hand', () => {
    const tryAgain = vi.fn();
    const playOn = vi.fn();
    render(<FocusBanner view={{ focus: 'loose-pieces', announced: true, paused: { deciding: false } }} onTryAgain={tryAgain} onPlayOn={playOn} />);
    expect(screen.getByTestId('focus-try-again').textContent).toContain('Try again');
    fireEvent.click(screen.getByTestId('focus-try-again'));
    fireEvent.click(screen.getByTestId('focus-play-on'));
    expect(tryAgain).toHaveBeenCalledTimes(1);
    expect(playOn).toHaveBeenCalledTimes(1);
  });

  it('the deciding blunder offers "Take it back"', () => {
    render(<FocusBanner view={{ focus: 'kings', announced: true, paused: { deciding: true } }} onTryAgain={vi.fn()} onPlayOn={vi.fn()} />);
    expect(screen.getByTestId('focus-try-again').textContent).toContain('Take it back');
    expect(screen.getByTestId('focus-banner').getAttribute('data-paused')).toBe('deciding');
  });
});
