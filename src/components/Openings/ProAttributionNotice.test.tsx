import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProAttributionNotice } from './ProAttributionNotice';

/**
 * Locks the legal-mitigation language. The non-endorsement / non-affiliation
 * wording is the single highest-value mitigation against false-endorsement
 * (Lanham §43(a)) and right-of-publicity exposure on the pro surfaces — a
 * future edit must not silently weaken it.
 */
describe('ProAttributionNotice', () => {
  it('states no affiliation, no endorsement, and a public-games source (named player)', () => {
    render(<ProAttributionNotice playerName="Magnus Carlsen" />);
    const el = screen.getByTestId('pro-attribution-notice');
    const text = el.textContent ?? '';
    expect(text).toContain('Magnus Carlsen');
    expect(text).toMatch(/not affiliated/i);
    expect(text).toMatch(/does not endorse/i);
    expect(text).toMatch(/publicly available games/i);
    expect(text).toMatch(/not official or endorsed/i);
  });

  it('falls back to a generic plural subject when no player is named', () => {
    render(<ProAttributionNotice />);
    const text = screen.getByTestId('pro-attribution-notice').textContent ?? '';
    expect(text).toMatch(/featured players are not affiliated/i);
    expect(text).toMatch(/does not endorse/i);
  });
});
