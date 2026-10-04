import { describe, it, expect } from 'vitest';
import { ownPositionsHole } from './HeatMapPanel';
import type { UnifiedWeakness } from '../../services/weaknessSpine';

const hole = (tag: string, capabilityTag: string, openCount: number): UnifiedWeakness =>
  ({ tag, capabilityTag, openCount }) as unknown as UnifiedWeakness;

describe('heat map Practice — only the student\'s own positions (David 2026-10-04)', () => {
  it('offers the hole built from their games', () => {
    const own = hole('analysis:hanging-piece', 'hung-material', 3);
    expect(ownPositionsHole([own], 'hung-material')).toBe(own);
  });

  it('hides Practice when the only hole is not from their games', () => {
    expect(ownPositionsHole([hole('coach:hung-material', 'hung-material', 5)], 'hung-material')).toBeNull();
  });

  it('hides Practice when every own position is already cleared', () => {
    expect(ownPositionsHole([hole('analysis:hanging-piece', 'hung-material', 0)], 'hung-material')).toBeNull();
  });
});
