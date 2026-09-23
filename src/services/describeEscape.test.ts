import { describe, it, expect } from 'vitest';
import { describeEscape, assembleEngineReasoning } from './groundedAnswer';

// Walk 5 (S3b): the student's own mistake — Black to move, the f6 knight hit
// by the e5 pawn. The engine's Nd5 was explained as just "The engine plays Nd5".
const FEN = 'r4rk1/1pqbbppp/p3pn2/2n1P3/P2N4/2N5/BPP1Q1PP/R1B2RK1 b - - 0 14';

describe('describeEscape — a move whose point is getting out of an attack', () => {
  it('names the knight leaving the pawn\'s attack', () => {
    expect(describeEscape(FEN, 'Nd5')).toMatch(/takes the knight on f6 out of the pawn's attack/);
  });
  it('never claims "safe" when the landing square can be won', () => {
    expect(describeEscape(FEN, 'Nd5')).not.toMatch(/safe square/);
  });
  it('is silent for a piece nobody attacks, and for a capture', () => {
    expect(describeEscape(FEN, 'Rac8')).toBeNull();
    expect(describeEscape('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'exd5')).toBeNull();
  });
  it('the engine explanation now carries the reason', () => {
    const a = assembleEngineReasoning({ fenBefore: FEN, pvSan: ['Nd5'], moverColor: 'black' });
    expect(a?.facts ?? '').toMatch(/The engine plays Nd5 — it takes the knight on f6 out of the pawn's attack/);
  });
});
