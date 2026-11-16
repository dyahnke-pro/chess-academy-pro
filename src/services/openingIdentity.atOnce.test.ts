import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess, type Square } from 'chess.js';
import { openingIdentityLine, setOpeningIdentity, type LiveIdentityBoard } from './openingIdentity';

// David 2026-11-16: "It didn't state the opening name until move 3. The Karo
// can be identified right away." The name speaks at once — and with its idea,
// so it is never a bare name (the why standard: opening names are teaching).

const live = (sans: string[]): LiveIdentityBoard => {
  const b = new Chess(); for (const s of sans) b.move(s);
  const fen = b.fen();
  return {
    pieceAt: (sq) => { const x = b.get(sq as Square); return x ? { color: x.color, type: x.type } : null; },
    canPlay: (san, side) => { const p = fen.split(' '); p[1] = side; p[3] = '-'; try { return !!new Chess(p.join(' ')).move(san); } catch { return false; } },
  };
};

describe('the opening is named at once, with what it is for', () => {
  beforeAll(() => setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8'))));
  afterAll(() => setOpeningIdentity(null));
  it('Scandinavian, the student Black: the pawn it hits, and their usual capture', () => {
    const t = openingIdentityLine('Scandinavian Defense', 'b', 'seat', live(['e4', 'd5']), true)?.text ?? '';
    expect(t).toMatch(/hits their pawn on e4 at once, so they .*take on d5/);
  });
  it('Scandinavian, the student White: the pawn it hits — never the capture that is theirs to choose', () => {
    const t = openingIdentityLine('Scandinavian Defense', 'w', 'seat', live(['e4', 'd5']), true)?.text ?? '';
    expect(t).toBe('It hits your pawn on e4 at once.');
  });
  it("David's Caro, the student White: the identity line never repeats the move's own 'prepares d5'", () => {
    // c6's own reason says it prepares d5 (computeMoveFundamentals); the
    // identity said it again right before it (gotham-jelena lesson baseline).
    const t = openingIdentityLine('Caro-Kann Defense', 'w', 'seat', live(['e4', 'c6']), true)?.text ?? '';
    expect(t).not.toMatch(/prepares the push/);
  });
  it("NEGATIVE CONTROL: a Caro student is never told the move they are about to play", () => {
    expect(openingIdentityLine('Caro-Kann Defense', 'b', 'seat', live(['e4', 'c6']), true)?.text ?? '').not.toMatch(/d5/);
  });
});
