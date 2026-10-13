import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 2026-10-13, parity with Review's mating ply: Learn's lanes stop at a
// finished board and the reply line fires only when THEY mate, so a student's
// own mate said nothing about the mate. The game-over effect speaks the one
// producer (`continuationResult` → `mateDescription`) on the final board.
describe('Learn names the student\'s own mate', () => {
  const src = readFileSync(join(__dirname, 'CoachTeachPage.tsx'), 'utf8');
  it('the game-over effect speaks the named mate when the student won by mate', () => {
    expect(src).toMatch(/if \(won\) \{\s*const mateLine = continuationResult\(true, false, game\.turn, [^)]*game\.fen\);/);
    expect(src).toMatch(/speakComputed\(mateLine/);
  });
  it('the reply line names THEIR mate from the board', () => {
    expect(src).toMatch(/buildInstantReplyLine\(\{[^}]*fenAfter: ip\.fen\(\) \}\)/);
  });
});
