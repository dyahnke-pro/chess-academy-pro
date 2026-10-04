import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { findWorstPlacedPiece } from './nextPlans';

// Clean-pass review walk 2026-10-04, G2 (VRUh4Qgh) ply 23: "The plan changes
// here — now it's to rescue your worst piece, your bishop on c8 …" and, in the
// same ply, "Your bishop on c8 is doing nothing where it sits — improving it is
// the biggest gain on the board." One fact, said twice.
describe('the bad-piece line stays quiet where the plan already names the piece', () => {
  it('the plan computer names the c8 bishop on that board', () => {
    const PGN = readFileSync('src/services/__fixtures__/VRUh4Qgh.pgn', 'utf8');
    const g = new Chess(); g.loadPgn(PGN);
    const c = new Chess(); for (const san of g.history().slice(0, 23)) c.move(san);
    expect(findWorstPlacedPiece(c, 'b')?.sq).toBe('c8');
  });
  it('the review bad-piece pass checks the plan with the one worst-piece finder', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    const pass = src.slice(src.indexOf('const best = await badPieceDone.promise;'), src.indexOf("mark('badPiece');"));
    expect(pass).toMatch(/findWorstPlacedPiece\(new Chess\(b\.seg\.fenAfter\), b\.color\)/);
    expect(pass).toMatch(/if \(best && !planNamesIt\(best\)\)/);
  });
});
