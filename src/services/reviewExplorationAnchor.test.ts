import { describe, it, expect } from 'vitest';
import { explorationAnchorAction } from './reviewExplorationAnchor';

describe('explorationAnchorAction — review walk exploration auto-clear (freeze fix)', () => {
  it('resets the anchor when no exploration is active', () => {
    expect(explorationAnchorAction(false, null, 5)).toBe('reset');
    expect(explorationAnchorAction(false, 5, 5)).toBe('reset');
    expect(explorationAnchorAction(false, 3, 9)).toBe('reset');
  });

  it('SELF-ANCHORS when exploration is active but no caller set the anchor (the bug)', () => {
    // ~20 setWalkExplorationFen sites never stamped the anchor ref; without a
    // self-anchor the overlay could never be torn down. It must anchor here.
    expect(explorationAnchorAction(true, null, 41)).toBe('anchor');
    expect(explorationAnchorAction(true, null, 0)).toBe('anchor');
  });

  it('HOLDS while the overlay stays on its anchor ply (a walkout stepping a hypothetical line)', () => {
    expect(explorationAnchorAction(true, 41, 41)).toBe('hold');
  });

  it('CLEARS the moment the student navigates off the anchor ply — the freeze fix', () => {
    // David's repro: mistake at ply 41 starts a better-line walkout, he clicks
    // forward (42, 43, 44). Each step must tear the overlay down so the board
    // follows the live line instead of staying pinned.
    expect(explorationAnchorAction(true, 41, 42)).toBe('clear');
    expect(explorationAnchorAction(true, 41, 44)).toBe('clear');
    expect(explorationAnchorAction(true, 41, 40)).toBe('clear'); // back also clears
  });
});
