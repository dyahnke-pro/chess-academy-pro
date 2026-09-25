// The fork trick (re-walk 1380, 2026-09-25): 7.Bb3 in the Philidor sidesteps
// …Nxe4 Nxe4 d5; 7.O-O does not. The Four Knights shape is the textbook case.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { forkTrickFor, trickSidestepped } from './forkTrick';

const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };
const PHILIDOR = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O';

describe('forkTrick', () => {
  it('finds the textbook Four Knights trick: Nxe4, Nxe4, d5', () => {
    const t = forkTrickFor(fenAfter('e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4'), 'b');
    expect(t).toMatchObject({ capture: 'Nxe4', recapture: 'Nxe4', fork: 'd5' });
    expect(t?.victims.map((v) => v.square).sort()).toEqual(['c4', 'e4']);
  });

  it('Bb3 in the Philidor sidesteps it, named with its line', () => {
    const s = trickSidestepped(fenAfter(PHILIDOR), 'Bb3', 'w', 'their');
    expect(s?.text).toMatch(/Bb3/);
    expect(s?.text).toMatch(/their fork trick/);
    expect(s?.text).toMatch(/Nxe4, Nxe4, d5/);
    expect(s?.text).toMatch(/your bishop and knight/);
    // No square from the unplayed line — c4 is empty after Bb3, e4 holds a pawn.
    expect(s?.text).not.toMatch(/on (c4|e4)/);
  });

  it('negative control: O-O leaves the trick on, so it says nothing', () => {
    expect(trickSidestepped(fenAfter(PHILIDOR), 'O-O', 'w', 'their')).toBeNull();
  });

  it('a capture is never credited: the point of Bxb4 in the Evans is the pawn', () => {
    expect(trickSidestepped(fenAfter('e4 e5 Nf3 Nc6 Bc4 Bc5 b4'), 'Bxb4', 'b', 'their')).toBeNull();
  });

  it('negative control: no trick from the start position', () => {
    expect(forkTrickFor(new Chess().fen(), 'w')).toBeNull();
    expect(trickSidestepped(new Chess().fen(), 'e4', 'w', 'their')).toBeNull();
  });
});

describe('forkTrick reaches both surfaces', () => {
  it('Learn composer: the student\'s Bb3 carries the sidestep as a stopped clause', async () => {
    const { computePositionFacts } = await import('./positionFacts');
    const sans = (PHILIDOR + ' Bb3 Nc6').split(' ');
    const c = new Chess(); for (const s of sans.slice(0, 12)) c.move(s);
    const fenBefore = c.fen(); c.move('Bb3'); const mid = c.fen(); c.move('Nc6');
    const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
    const r = await computePositionFacts({ posture: 'walk', fen: c.fen(), moverColor: 'w', studentColor: 'w',
      analysis: { topLines: [line(1, 30), line(2, 20)], evaluation: 30, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 400, draw: 450, loss: 150 } },
      opponentLastMove: { fenBefore: mid, san: 'Nc6' },
      lastMove: { fenBefore, san: 'Bb3', cpLoss: 10, historySans: null, reads: null } } as never);
    expect(r.clauses.find((x) => x.kind === 'stopped')?.text).toMatch(/Bb3 .*their fork trick|defuses their fork trick/);
  }, 30_000); // the composer's cold import alone is ~4s

  it('review: the student\'s Bb3 carries a [stopped] facet', async () => {
    const { computeMoveFacets, NO_TEACHING_CONTEXT } = await import('./reviewFullData');
    const sans = (PHILIDOR + ' Bb3').split(' ');
    const c = new Chess(); for (const s of sans.slice(0, 12)) c.move(s);
    const fenBefore = c.fen(); c.move('Bb3');
    const facets = computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore, fenAfter: c.fen(), san: 'Bb3', ply: 13, moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 30, preMoveEval: 30, classification: 'good', bestMoveSan: null, prevCap: { square: null, capturedValue: 0 },
      allSans: sans, forcedRunStartPly: null, bestLineUci: [], replyBestSan: null });
    expect(facets.join(' ')).toMatch(/\[stopped\] .*their fork trick/);
  }, 30_000);
});
