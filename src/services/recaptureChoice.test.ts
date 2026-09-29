// Recapture choice (census #8) on his own games.
import { describe, it, expect } from 'vitest';
import { recaptureChoice } from './recaptureChoice';
import fixture from './__fixtures__/recaptureChoice-his.json';

interface P { key: string; fen: string; san: string }
const at = (key: string): P => {
  const p = (fixture as P[]).find((x) => x.key === key);
  if (!p) throw new Error(key);
  return p;
};

describe('recaptureChoice — which piece takes back, and why', () => {
  it('knight, not queen: "a queen on d4 would be vulnerable to …c5"', () => {
    const p = at('IMBSR0A9nJs:11');
    const out = recaptureChoice(p.fen, p.san, null);
    expect(out).toMatch(/Nxd4, taking back with the knight — the knight lands in the centre on d4/);
    expect(out).toMatch(/Qxd4 would put the queen on d4, where …c5 hits it/);
  });

  it('drops the tempo argument when their actual reply is that very move', () => {
    // They answered Nxd4 with …c5, which hits the knight too — so "a queen on
    // d4 would be hit by …c5" is no difference between the two recaptures.
    const p = at('IMBSR0A9nJs:11');
    expect(recaptureChoice(p.fen, p.san, null, 'c5') ?? '').not.toMatch(/c5 hits it/);
  });

  it('queen, not the pawn: "keeping the structure intact"', () => {
    const p = at('Dj_hLEdDpAg:12');
    expect(recaptureChoice(p.fen, p.san, null)).toMatch(/…Qxc6, not …bxc6, which would double your pawns on the c-file/);
  });

  it('teaches the better recapture when the engine prefers it', () => {
    const p = at('CQFSXmfxMV8:47');
    // Qxd3 was played; if the engine had wanted cxd3, the line would name it.
    expect(recaptureChoice(p.fen, p.san, 'cxd3') ?? '').toMatch(/^Better to take back with the c-pawn — cxd3/);
  });

  it('says nothing for a move that is not a capture', () => {
    expect(recaptureChoice('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4', null)).toBeNull();
  });

  it('says nothing when only one piece can take back', () => {
    // 1.e4 d5 2.exd5 — only the queen can take back on d5.
    expect(recaptureChoice('rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', 'Qxd5', null)).toBeNull();
  });
});
