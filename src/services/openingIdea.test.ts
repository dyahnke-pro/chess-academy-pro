import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { setOpeningIdentity, definingMoveIdea } from './openingIdentity';
import { moveWhy } from './deliberation';
import { readTurnInCode } from '../coach/chatTurnCodeReader';

beforeAll(() => {
  setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
});

describe("what's the idea of this opening (walk 5)", () => {
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
  const board = { fen: (() => { const c = new Chess(); sans.forEach((m) => c.move(m)); return c.fen(); })(), history: sans, studentColor: 'white' as const };

  it('is read as the opening question, not a plan', () => {
    for (const q of ["what's the idea of this opening?", 'what is this opening about', 'whats the point of the opening']) {
      expect(readTurnInCode(q, board)?.kind, q).toBe('name-opening');
    }
    expect(readTurnInCode("what's my plan?", board)?.kind).toBe('plan');
  });

  it("says what the Italian's key move does on this board, in the student's seat", () => {
    const a = definingMoveIdea('Italian Game: Giuoco Piano', sans, 'w', moveWhy, Chess);
    expect(a).toMatch(/^The key move is yours, Bc4 — it .*f7/);
    const b = definingMoveIdea('Italian Game: Giuoco Piano', sans, 'b', moveWhy, Chess);
    expect(b).toMatch(/^The key move is theirs, Bc4/);
  });

  it('is silent when the key move is not in this game', () => {
    expect(definingMoveIdea('Italian Game', ['d4', 'd5'], 'w', moveWhy, Chess)).toBeNull();
  });
});
