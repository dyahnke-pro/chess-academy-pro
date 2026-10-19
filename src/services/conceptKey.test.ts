import { describe, it, expect } from 'vitest';
import { conceptInstanceKey } from './conceptKey';

describe('a discovery in waiting is one claim while its king walks (replay 2026-10-19)', () => {
  it('same blocker and slider, king on f8 then f7: one key, from either producer', () => {
    expect(conceptInstanceKey('discovered_attack', ['f6', 'f1', 'f8'])).toBe(conceptInstanceKey('discovery', ['f6', 'f1', 'f7']));
  });
  it('a pin keeps every square in its key', () => {
    expect(conceptInstanceKey('pin', ['b7', 'f3', 'h1'])).not.toBe(conceptInstanceKey('pin', ['b7', 'f3', 'g2']));
  });
});
