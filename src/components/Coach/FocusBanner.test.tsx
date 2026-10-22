import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FocusBanner } from './FocusBanner';
import type { FocusView } from '../../coach/focus/useFocusRunner';

const hands = () => ({ onTryAgain: vi.fn(), onPlayOn: vi.fn(), onShowMe: vi.fn() });
const view = (over: Partial<FocusView> = {}): FocusView => ({ focus: 'tactics', rung: 0, paused: null, ...over });

describe('FocusBanner', () => {
  it('draws nothing when no focus owns the game', () => {
    const { container } = render(<FocusBanner view={view({ focus: null, rung: null })} {...hands()} />);
    expect(container.firstChild).toBeNull();
  });

  it('names the focus and the student\'s rung, and offers no rewind while the game plays', () => {
    render(<FocusBanner view={view({ rung: 2 })} {...hands()} />);
    expect(screen.getByTestId('focus-banner').textContent).toContain('Tactics');
    expect(screen.getByTestId('focus-rung').textContent).toBe('Strong intermediate');
    expect(screen.queryByTestId('focus-rewind')).toBeNull();
  });

  it('a taught miss offers Try again and Play on — never Show me — and each reaches its hand', () => {
    const h = hands();
    render(<FocusBanner view={view({ paused: { deciding: false, showMe: false } })} {...h} />);
    expect(screen.getByTestId('focus-try-again').textContent).toContain('Try again');
    expect(screen.queryByTestId('focus-show-me')).toBeNull();
    fireEvent.click(screen.getByTestId('focus-try-again'));
    fireEvent.click(screen.getByTestId('focus-play-on'));
    expect(h.onTryAgain).toHaveBeenCalledTimes(1);
    expect(h.onPlayOn).toHaveBeenCalledTimes(1);
  });

  it('after a second miss (rung 0): Show me, the student\'s tap — and Play on', () => {
    const h = hands();
    render(<FocusBanner view={view({ paused: { deciding: false, showMe: true } })} {...h} />);
    expect(screen.getByTestId('focus-banner').getAttribute('data-paused')).toBe('show-me');
    expect(screen.queryByTestId('focus-try-again')).toBeNull();
    fireEvent.click(screen.getByTestId('focus-show-me'));
    expect(h.onShowMe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('focus-play-on')).toBeTruthy();
  });

  it('the deciding blunder offers "Take it back"', () => {
    render(<FocusBanner view={view({ rung: 1, paused: { deciding: true, showMe: false } })} {...hands()} />);
    expect(screen.getByTestId('focus-try-again').textContent).toContain('Take it back');
    expect(screen.getByTestId('focus-banner').getAttribute('data-paused')).toBe('deciding');
  });
});
