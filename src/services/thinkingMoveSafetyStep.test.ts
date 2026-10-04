import { describe, it, expect } from 'vitest';
import { afterPlayedMove, moveSafetyKit, moveSafetyPrompt } from './thinkingMoveSafetyStep';

// White plays Bc4?? into …Rc8's file? Use a clear blunder: White's bishop
// d3→c4 walks onto a square the black rook on c8 hits, unguarded.
const BEFORE = '2r1k3/8/8/8/8/3B4/8/4K3 w - - 0 1';

describe('step 10 — is my move safe', () => {
  it('shows the board after the student\'s real move, from their side, with a lead', () => {
    const c = afterPlayedMove({ fen: BEFORE, origin: 'game', gameId: 'g1', playedSan: 'Bc4' });
    expect(c?.fen.split(' ')[1]).toBe('w');
    expect(c?.fen.startsWith('2r1k3/8/8/8/2B5/')).toBe(true);
    expect(c?.lead).toMatch(/bishop to c4/);
  });

  it('the key is what that move left hanging', () => {
    const c = afterPlayedMove({ fen: BEFORE, origin: 'game', playedSan: 'Bc4' })!;
    expect(moveSafetyKit().keyFor(c.fen)?.key).toEqual(['c4']);
  });

  it('a candidate with no played move is dropped', () => {
    expect(afterPlayedMove({ fen: BEFORE, origin: 'puzzle' })).toBeNull();
    expect(afterPlayedMove({ fen: BEFORE, origin: 'game', playedSan: 'Qh9' })).toBeNull();
  });

  it('the prompt never says how many', () => {
    for (let i = 0; i < 2; i++) expect(moveSafetyPrompt(i)).not.toMatch(/\d|one more|two|three/i);
  });
});
