import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { boardStateAfter, boardVeto, inFluxAfter, mateInOneOnBoard, CALM_BOARD, ALL_FACT_KINDS } from './boardState';

function fenAfter(sans: string[]): { before: string; after: string; last: string } {
  const c = new Chess();
  for (const s of sans.slice(0, -1)) c.move(s);
  const before = c.fen();
  const last = sans[sans.length - 1];
  c.move(last);
  return { before, after: c.fen(), last };
}

describe('boardState — the board decides what may be said (hand walks 2026-09-25)', () => {
  it('…Bxf3 with Bxf3 coming is in flux (Caro-Kann, review said "you\'re a piece up")', () => {
    const { before, last } = fenAfter('e4 c6 Nf3 d5 e5 Bg4 Be2 e6 d4 c5 h3 Bxf3'.split(' '));
    expect(inFluxAfter(before, last)).toBe('f3');
  });

  it('a capture that cannot be taken back is not in flux', () => {
    // 1.e4 d5 2.exd5 — …Qxd5 takes back, so it IS in flux…
    const { before, last } = fenAfter('e4 d5 exd5'.split(' '));
    expect(inFluxAfter(before, last)).toBe('d5');
    // …while a bare pawn capture nothing can answer is not.
    expect(inFluxAfter('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', 'exd5')).toBeNull();
  });

  it('a mate in one on the board, and an engine mate for the side to move', () => {
    expect(mateInOneOnBoard('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1')).toBe(true);
    expect(mateInOneOnBoard('4r1k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1')).toBe(false);
    const quiet = new Chess('4r1k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1');
    const st = boardStateAfter(quiet.fen(), 'Kf8', '4rk2/5ppp/8/8/8/8/5PPP/3R2K1 w - - 1 2', 30000);
    expect(st.mateOnBoard).toBe(true); // engine mate for White, White to move
    // A forced mate for the side NOT to move is just as decided (after Bf4+
    // with mate coming, review said "trade pieces, not pawns").
    const theirs = boardStateAfter(quiet.fen(), 'Kf8', '4rk2/5ppp/8/8/8/8/5PPP/3R2K1 w - - 1 2', -30000);
    expect(theirs.mateOnBoard).toBe(true);
    const none = boardStateAfter(quiet.fen(), 'Kf8', '4rk2/5ppp/8/8/8/8/5PPP/3R2K1 w - - 1 2', 120);
    expect(none.mateOnBoard).toBe(false);
  });

  it('standing claims wait on a board in flux; the tactic and the verdict do not', () => {
    const flux = { inFlux: 'f3', mateOnBoard: false };
    expect(boardVeto('technique', flux)).toBe('in-flux');
    expect(boardVeto('loose', flux)).toBe('in-flux');
    expect(boardVeto('opp-target', flux)).toBe('in-flux');
    expect(boardVeto('tactic', flux)).toBeNull();
    expect(boardVeto('quality', flux)).toBeNull();
  });

  it('a claim ABOUT the piece in flux waits; the verdict on the capture does not', () => {
    // …Qxe1 with Rxe1 coming: "their queen on e1 pins your bishop" describes a
    // queen about to be taken (review tape 2026-09-25).
    const flux = { inFlux: 'e1', mateOnBoard: false };
    expect(boardVeto('tactic', flux, ['e1', 'd1', 'a1'])).toBe('in-flux');
    expect(boardVeto('does', flux, ['e1', 'e5'])).toBe('in-flux');
    expect(boardVeto('tactic', flux, ['c3', 'd2', 'e1'].slice(0, 2))).toBeNull();
    expect(boardVeto('quality', flux, ['e1'])).toBeNull();
  });

  it('beside a mate only the mate and the verdict speak', () => {
    const mate = { inFlux: null, mateOnBoard: true };
    expect(boardVeto('plan-now', mate)).toBe('beside-mate');
    expect(boardVeto('technique', mate)).toBe('beside-mate');
    expect(boardVeto('loose', mate)).toBe('beside-mate');
    expect(boardVeto('tactic', mate)).toBeNull();
    expect(boardVeto('quality', mate)).toBeNull();
  });

  it('a calm board vetoes nothing, and an unknown kind is never silenced', () => {
    for (const k of ALL_FACT_KINDS) expect(boardVeto(k, CALM_BOARD)).toBeNull();
    expect(boardVeto(null, { inFlux: 'e4', mateOnBoard: true })).toBeNull();
  });
});
