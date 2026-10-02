import { describe, it, expect } from 'vitest';
import { kneeJerk } from './kneeJerk';

describe('kneeJerk (P3 method beat)', () => {
  it('fires when the automatic recapture cost and the best was elsewhere', () => {
    expect(kneeJerk('Bxf6', 'gxf6', 'Qh5', 180)).toMatch(/^Taking back was the reflex/);
  });
  it('silent when the recapture was best, cheap, or not a recapture', () => {
    expect(kneeJerk('Bxf6', 'gxf6', 'Qxf6', 180)).toBeNull();
    expect(kneeJerk('Bxf6', 'gxf6', 'Qh5', 40)).toBeNull();
    expect(kneeJerk('Nf3', 'Nf6', 'e5', 180)).toBeNull();
    expect(kneeJerk('Bxf6', 'Nd5', 'Qh5', 180)).toBeNull();
  });
});
