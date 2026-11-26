// FAMOUS-TRAP RECALL GATE (David 2026-11-26: "ALL 23 famous traps found, and the
// Theory button finds every famous trap in any opening"). Every trap of the
// recall set is in the famous-trap index on its own board and slip, and the
// Theory's trap read NAMES it at the move before the slip — from both seats.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { famousTrapsAt, famousTrapRead, famousTrapName, famousOutcome } from '../services/famousTraps';
import { FAMOUS, WIKI_EXTRA } from './famousTrapRecallSet';

const sameMove = (fen: string, a: string, b: string): boolean => {
  try { const x = new Chess(fen).move(a); const y = new Chess(fen).move(b); return x.from === y.from && x.to === y.to; } catch { return false; }
};

describe('famous-trap recall', () => {
  for (const f of [...FAMOUS, ...WIKI_EXTRA]) {
    it(`${f.name}: in the index and named before the slip, both seats`, () => {
      const moves = f.line.split(' ');
      const c = new Chess();
      for (const m of moves.slice(0, -1)) c.move(m);
      const fenBefore = c.fen();
      const last = moves[moves.length - 1];
      const board = new Chess(fenBefore); board.move(last);
      const entry = famousTrapsAt(board.fen()).find((t) => sameMove(board.fen(), t.slip, f.slip));
      expect(entry, `${f.name}: no index entry for ${f.slip} on its board`).toBeTruthy();
      if (!entry) return;
      const name = famousTrapName(entry.name);
      const mover = new Chess(fenBefore).turn();
      const theirs = famousTrapRead({ fenBefore, san: last, mover, student: mover });
      const ours = famousTrapRead({ fenBefore, san: last, mover, student: mover === 'w' ? 'b' : 'w' });
      expect(theirs?.text, `${f.name} (their slip)`).toContain(name);
      expect(ours?.text, `${f.name} (your slip)`).toMatch(/^Watch out: this is /);
      // Never a piece the engine does not hold.
      expect(famousOutcome(entry, 'you').words.length).toBeGreaterThan(0);
    });
  }
});
