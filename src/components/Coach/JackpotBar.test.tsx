import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { JackpotBar, type JackpotGain } from './JackpotBar';

const draw = (streak: number, gain: JackpotGain | null): void => {
  render(<MotionConfig transition={{ duration: 0 }}><JackpotBar streak={streak} gain={gain} /></MotionConfig>);
};
const g = (over: Partial<JackpotGain>): JackpotGain => ({ id: 'g', coins: 40, label: 'Decision', from: 110, to: 150, jackpot: false, ...over });

describe('JackpotBar — pops up on a payout, then fades', () => {
  it('is not on screen without a payout', () => {
    draw(0, null);
    expect(screen.queryByTestId('jackpot-bar')).toBeNull();
  });
  it('pops up with the coins and what paid them', () => {
    draw(0, g({}));
    expect(screen.getByTestId('jackpot-bar')).toBeTruthy();
    expect(screen.getByTestId('jackpot-gain').textContent).toContain('+40');
    expect(screen.getByTestId('jackpot-gain').textContent).toContain('Decision');
    expect(screen.queryByTestId('jackpot-edges')).toBeNull();
  });
  it('the multiplier appears only once the streak earns it, and names it on the payout', () => {
    draw(2, g({ id: 'a' }));
    expect(screen.queryByTestId('jackpot-multiplier')).toBeNull();
  });
  it('a streak of 5 burns at x3', () => {
    draw(5, g({ id: 'b' }));
    expect(screen.getByTestId('jackpot-multiplier').textContent).toBe('×3');
    expect(screen.getByTestId('jackpot-gain').textContent).toContain('Decision ×3');
  });
  it('a payout that crosses a level flashes the screen edges', () => {
    draw(0, g({ id: 'c', coins: 150, label: 'Checkmate', from: 60, to: 210, jackpot: true }));
    expect(screen.getByTestId('jackpot-edges')).toBeTruthy();
  });
});
