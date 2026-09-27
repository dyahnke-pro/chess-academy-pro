// Hand walk 2026-09-27 — Najdorf, student Black at 1500, a game Naroditsky
// teaches move by move (vc-38QzSkFRn4E). Every flagged line is pinned on the
// real board it was heard on.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readPosition } from './positionalRead';
import { detectBehaviors } from './danyaBehaviors';
import { findColorComplexWeakness } from './positionReadingService';
import { detectKingExposure } from './kingSafety';
import { threatMadeWhy } from './deliberation';
import { latentForkClause } from './latentFork';
import { principleLine } from './moveFundamentals';
import { buildVoicePackage } from './voicePackage';
import { kingActivation } from './positionReadingService';

const GAME = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Nf3 Nc6 e5 Nxe5 Nxe5 dxe5 Qxd8+ Kxd8 Bd3 e6 O-O Kc7 f4 Bd6 fxe5 Bxe5 Ne4 Bd7 Nxf6 gxf6 c3 Bc6 Bf4 Bxf4 Rxf4 f5 a4 Rad8 Be2 Rd2 Bf3 Bxf3 gxf3 Rxb2 Rc4+ Kb8 Rb4 Kc7 Rc4+ Kb8 Rb4 Rxb4 cxb4 Rd8 Kg2 Rd2+ Kg3 Rb2 h4 Rxb4 a5 e5 Re1 f6 h5 Rb3 Ra1 e4 Rf1 Rxf3+ Rxf3 exf3 Kxf3 b6 axb6 a5'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const s of GAME.slice(0, n)) c.move(s); return c.fen(); };

describe('Najdorf 1500 hand walk — the flags stay fixed', () => {
  it('no colour-complex hole when nothing of theirs can sit on it (rook ending, ply 42)', () => {
    const fen = fenAt(44);
    expect(findColorComplexWeakness(fen)).toEqual([]);
    expect(readPosition(fen, 'black').some((o) => o.kind === 'complex')).toBe(false);
  });
  it('no king-shelter lecture without their queen (ply 46)', () => {
    expect(detectKingExposure(fenAt(46), 'b')).toBeNull();
  });
  it('their passer on b6 is the danger, never "a weakness — pile up on it" (ply 74)', () => {
    const fen = fenAt(75);
    const hits = detectBehaviors({ fen, studentColor: 'b' });
    expect(hits.some((h) => /b6 is a weakness/.test(h.fact))).toBe(false);
  });
  it('no pawn-break talk at move two (ply 4)', () => {
    expect(readPosition(fenAt(3), 'black').some((o) => o.kind === 'lever')).toBe(false);
  });
  it('"why e5?" can say what e5 does: it attacks the knight on f6 (ply 13)', () => {
    expect(threatMadeWhy(fenAt(12), 'e5', 'w')).toBe('attacks the knight on f6');
  });
  it('the fork warning is one sentence, so no tail can be left standing alone', () => {
    const text = latentForkClause({ forker: 'white', square: 'e4', moves: 2, via: 'c3', targets: [{ piece: 'k', square: 'd6' }, { piece: 'q', square: 'f6' }] } as never, 'black');
    expect(text.split(/(?<=[.!?])\s+/).length).toBe(1);
  });
  it('c5 fights for d4 from the side — never "stakes out the center" — and survives the board gate (ply 2)', () => {
    const fen = fenAt(1);
    const p = principleLine(fen, 'c5', 'black', new Set(), 0);
    expect(p?.text).toMatch(/fight for d4 from the side/);
    expect(p?.text).not.toMatch(/stake out/);
    const pkg = buildVoicePackage([{ kind: 'computed', text: p?.text ?? '', fen: fenAt(3) }]);
    expect(pkg.spoken).toBe(p?.text);
  });
  it('the king walk never buries its own bishop — no "starting with d7" with Bc8 at home (ply 18)', () => {
    expect(kingActivation(fenAt(19), 'b')?.to).not.toBe('d7');
  });
});
