import { describe, it, expect } from 'vitest';
import { findAllowedChain } from './causalChain';

// Danya speedrun 0WPNVHZmYE8, 9…Nc3+ (Black, the student): "They can win your
// dark-squared bishop with Kxd2 — nothing is guarding it." Kxd2 drops the queen
// to …Nxd1; taking the bishop is no win.
describe('a win that drops more than it takes is not allowed', () => {
  it('Kxd2 is not offered as their win', () => {
    const sans = 'a3 e5 e4 Nf6 Ba6 bxa6 Nc3 Bb7 Nb5 axb5 b4 Nxe4 a4 Bxb4 Ba3 Bxd2+ Ke2 Nc3+'.split(' ');
    const chain = findAllowedChain(sans, sans.length, 'b');
    expect(chain?.nodes.some((n) => String(n.data?.move ?? '').startsWith('Kxd2')) ?? false).toBe(false);
  });
});
