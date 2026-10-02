import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { refutedFromFan, provenPrefix } from './refutedAlternativeCore';

// Hand walk 800 (Ruy Exchange, student Black): after 4.Bxc6 the tape said
// "31% of players at your level play bxc6 here, and it loses material: bxc6 —
// you win a bishop." The alternative's own recapture was counted as its proof.
const c = new Chess();
for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6']) c.move(m);
const FEN = c.fen();

describe('refuted alternative — the proof is against the mover', () => {
  it('a recapture is not "loses material"', () => {
    const r = refutedFromFan({
      fenBefore: FEN,
      playedSan: 'dxc6',
      candidates: [{ san: 'bxc6', games: 310, pct: 31, source: 'amateur' }, { san: 'dxc6', games: 690, pct: 69, source: 'amateur' }],
      fan: [
        { evaluation: -10, moves: ['d7c6', 'e1g1'] },
        { evaluation: 300, moves: ['b7c6', 'e1g1', 'f7f6'] },
      ],
      moverWB: 'b',
    });
    expect(r).not.toBeNull();
    expect(r?.text).not.toMatch(/loses material/);
    expect(r?.text).not.toMatch(/you win a bishop/);
    expect(r?.text).toMatch(/costs about|gives away about/);
  });

  it('a line that really loses material still proves it', () => {
    const b = new Chess();
    for (const m of ['e4', 'e5', 'Nf3']) b.move(m);
    // …f6?? is not a loss; …Qg5?? walks into Nxg5.
    const out = provenPrefix(b.fen(), ['Qg5', 'Nxg5'], 'b');
    expect(out.proofResult).toBe('they win a queen');
    expect(out.lineSans).toEqual(['Qg5', 'Nxg5']);
  });
});

describe('droppedJob — the alternative fails because its piece had a job (census #11)', () => {
  it('Ng5 walks the f3-knight off e5, and …Nxe5 takes it', async () => {
    const { droppedJob } = await import('./refutedAlternativeCore');
    // The pawn on e5 is guarded only by the knight on f3; the knight leaves, …Nxe5 wins it.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4P3/8/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 4';
    expect(droppedJob(fen, ['Ng5', 'Nxe5'])).toBe('the knight on f3 was guarding e5');
  });

  it('a piece that moved INTO the capture is a hang, not a job', async () => {
    const { droppedJob } = await import('./refutedAlternativeCore');
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4P3/8/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 4';
    expect(droppedJob(fen, ['Nd4', 'Nxd4'])).toBeNull();
  });

  it('the proven line names the job it dropped', async () => {
    const { renderRefutedAlternative } = await import('./refutedAlternativeCore');
    const text = renderRefutedAlternative({
      alt: 'Ng5', games: 120, pct: 40, costCp: 150, line: null, concept: null,
      lineSans: ['…Nxe5'], proofResult: 'they win a pawn', source: 'amateur',
      job: 'the knight on f3 was guarding e5',
    }, 'Qe2', 1);
    expect(text).toMatch(/, but the knight on f3 was guarding e5: …Nxe5 — they win a pawn\./);
  });
});
