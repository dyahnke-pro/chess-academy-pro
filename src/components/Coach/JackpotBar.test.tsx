import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { JackpotBar } from './JackpotBar';

const draw = (xp: number, streak: number, gain: Parameters<typeof JackpotBar>[0]['gain'] = null): void => {
  render(<MotionConfig transition={{ duration: 0 }}><JackpotBar xp={xp} streak={streak} gain={gain} /></MotionConfig>);
};

describe('JackpotBar — the gold slot-machine bar', () => {
  it('shows the level the XP stands at, and how far into it', () => {
    draw(150, 0);
    expect(screen.getByTestId('jackpot-bar').dataset.level).toBe('2');
    expect(screen.getByTestId('jackpot-level').textContent).toBe('2');
    expect(screen.getByText('50/200 XP')).toBeTruthy();
  });
  it('the multiplier appears only once the streak earns it', () => {
    draw(0, 2);
    expect(screen.queryByTestId('jackpot-multiplier')).toBeNull();
  });
  it('a streak of 5 burns at ×3', () => {
    draw(0, 5);
    expect(screen.getByTestId('jackpot-multiplier').textContent).toBe('×3');
  });
  it('a payout pops its coins and what paid them', () => {
    draw(40, 3, { id: 'g1', coins: 40, label: 'Decision', jackpot: false });
    expect(screen.getByTestId('jackpot-gain').textContent).toContain('+40');
    expect(screen.getByTestId('jackpot-gain').textContent).toContain('Decision ×2');
    expect(screen.queryByTestId('jackpot-edges')).toBeNull();
  });
  it('a payout that crosses a level flashes the screen edges', () => {
    draw(110, 0, { id: 'g2', coins: 150, label: 'Checkmate', jackpot: true });
    expect(screen.getByTestId('jackpot-edges')).toBeTruthy();
  });
});
