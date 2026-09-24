// The recapture that closes an even trade is not a win (prod audit 2026-09-23:
// "It won their queen on f6" on …gxf6 after Qxf6 Qxf6). `describeMoveMerit`
// reads only the board BEFORE the move, so it needs the previous capture.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { describeMoveMerit } from './groundedAnswer';

// The audited game's own prefix (lichess b6Ltr4hi): …Qxf6 Qxf6, Black to recapture.
const beforeRecapture = (() => {
  const g = new Chess();
  for (const m of ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'c6', 'e3', 'Bf5', 'Qf3', 'Bg6', 'Bxf6', 'Qxf6', 'Qxf6']) g.move(m);
  return g.fen();
})();

describe('a recapture is never a win', () => {
  it('without the previous capture it reads as winning the queen (why the param is required)', () => {
    expect(describeMoveMerit(beforeRecapture, 'gxf6', 'black', null) ?? '').toMatch(/wins their queen/);
  });
  it('taking back the queen that just took yours is not "wins their queen"', () => {
    const said = describeMoveMerit(beforeRecapture, 'gxf6', 'black', { square: 'f6', capturedValue: 9 }) ?? '';
    expect(said).not.toMatch(/wins/);
  });
  it('capturing MORE than was taken is still a win', () => {
    // Previous move took a pawn on f6; taking a queen there is a real gain.
    expect(describeMoveMerit(beforeRecapture, 'gxf6', 'black', { square: 'f6', capturedValue: 1 }) ?? '').toMatch(/wins their queen/);
  });
});
