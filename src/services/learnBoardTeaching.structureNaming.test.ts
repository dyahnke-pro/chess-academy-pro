import { describe, it, expect } from 'vitest';
import { structureNamingLine } from './learnBoardTeaching';

// The Learn lane's structure line, composed once (it used to be built on the
// page): the French chain named with its plan, keyed by its claim.
describe('structureNamingLine', () => {
  const FRENCH = 'r1bqkbnr/pp3ppp/2n1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 0 1';
  it('names the structure and its plan under the structure claim', () => {
    const r = structureNamingLine(FRENCH, 'w', null);
    expect(r?.text).toMatch(/French/);
    expect(r?.text).toMatch(/ — .+\.$/);
    expect(r?.claim).toMatch(/^structure:.*French/);
  });
  it('is silent where no structure has formed', () => {
    expect(structureNamingLine('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w', null)).toBeNull();
  });
});
