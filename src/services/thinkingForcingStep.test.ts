import { describe, it, expect } from 'vitest';
import { captureReason, checkReason, checkSquaresKey, forcingKit, forcingPrompt, forcingQuestionFor, forcingWrongTapLine, winningCapturesKey } from './thinkingForcingStep';

// White rook a1 and knight f3; black king e8. Checks: Ra8+ (a8), Rae1? no —
// rook on a1 checks along the 8th only from a8; knight checks from d6? f3→
// d4/e5/g5/h4/h2/g1/e1/d2: Ng5? no. So the only check is Ra8+.
const ONE_CHECK = '4k3/8/8/8/8/5N2/8/R3K3 w - - 0 1';
// Add a bishop on b1: Bg6+ (g6) and Ba2? no; b1-h7 diagonal: Bg6+ hits e8 via f7.
const TWO_CHECKS = '4k3/8/8/8/8/5N2/8/RB2K3 w - - 0 1';

describe('step 6 — forcing moves: checks', () => {
  it('lists every checking square', () => {
    expect(checkSquaresKey(ONE_CHECK)?.key).toEqual(['a8']);
    expect(new Set(checkSquaresKey(TWO_CHECKS)?.key)).toEqual(new Set(['a8', 'g6']));
  });
  it('a side in check is not asked this question', () => {
    expect(checkSquaresKey('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1')).toBeNull();
  });
  it('names the piece that checks from each square', () => {
    expect(checkReason(ONE_CHECK, 'a8')).toMatch(/From a8: your rook gives check/);
  });
  it('a wrong tap is answered with the method, for whichever question the board asks', () => {
    if (forcingQuestionFor(ONE_CHECK) === 'checks') {
      expect(forcingWrongTapLine(ONE_CHECK, 'h8')).toMatch(/None of your pieces can move there/);
      expect(forcingWrongTapLine(ONE_CHECK, 'a5')).toMatch(/does not hit their king/);
    } else {
      expect(forcingWrongTapLine(ONE_CHECK, 'h8')).toMatch(/Tap the piece you would capture/);
      expect(forcingWrongTapLine(ONE_CHECK, 'f3')).toMatch(/yours/);
    }
  });
  it('the question alternates by board and the prompt follows the same key', () => {
    expect(forcingQuestionFor(0)).toBe('checks');
    expect(forcingQuestionFor(1)).toBe('captures');
    expect(forcingPrompt(0)).toMatch(/check/i);
    expect(forcingPrompt(1)).toMatch(/come out ahead|win material/i);
  });
  it('winning captures: their piece you take for a profit', () => {
    // White knight on f3 can take the loose black bishop on e5.
    const fen = '4k3/8/8/4b3/8/5N2/8/4K3 w - - 0 1';
    expect(winningCapturesKey(fen)?.key).toEqual(['e5']);
    expect(captureReason(fen, 'e5')).toMatch(/Taking the bishop on e5 comes out ahead/);
  });
  it('the prompt never says how many', () => {
    for (let i = 0; i < 2; i++) expect(forcingPrompt(i)).not.toMatch(/\d|one more|two|three/i);
  });
  it('the kit is wired', () => {
    expect(forcingKit().step).toBe('forcing-moves');
  });
});
