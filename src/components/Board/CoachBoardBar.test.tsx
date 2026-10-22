import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoachBoardBar } from './CoachBoardBar';

describe('CoachBoardBar — the one bar on every board', () => {
  it('always renders the same six buttons; a null handler greys, never hides', () => {
    const onWhy = vi.fn();
    render(<CoachBoardBar onBack={null} onForward={null} onHint={null} onRead={null} onWhy={onWhy} onPlayLine={null} />);
    for (const b of ['back', 'forward', 'hint', 'read', 'why', 'line']) {
      expect(screen.getByTestId(`board-bar-${b}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('board-bar-line')).toBeDisabled();
    expect(screen.getByTestId('board-bar-why')).toBeEnabled();
    fireEvent.click(screen.getByTestId('board-bar-why'));
    expect(onWhy).toHaveBeenCalledTimes(1);
  });

  it('keeps each surface’s own selectors through testIds', () => {
    render(<CoachBoardBar onBack={() => undefined} onForward={null} onHint={null} onRead={null} onWhy={null} onPlayLine={null} hintLevel={2} testIds={{ back: 'nav-prev', hint: 'hint-button' }} />);
    expect(screen.getByTestId('nav-prev')).toBeEnabled();
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '2');
  });

  // 2026-10-22: a sideways-scrolling extras row hid Review's last button
  // ("Explore …") past the right edge at 375px. Every extra sits in the row
  // itself and the row wraps; the layout proof is audit-board-bar-fold.
  it('wraps the extras row, never scrolls it sideways', () => {
    render(<CoachBoardBar onBack={null} onForward={null} onHint={null} onRead={null} onWhy={null} onPlayLine={null} extras={<><button>A</button><button>B</button></>} />);
    const row = screen.getByTestId('coach-board-bar-extras');
    expect(row.className).toContain('flex-wrap');
    expect(row.className).not.toMatch(/overflow-x-(auto|scroll)/);
    expect([...row.children].map((c) => c.tagName)).toEqual(['BUTTON', 'BUTTON']);
  });
});
