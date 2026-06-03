/**
 * HALLUCINATION AUDIT — FUZZER (pass 16)
 * ======================================
 * David: "make each test harder than the last."
 *
 * Hand-picked cases prove the categories I thought of. A fuzzer proves the
 * gate against ground truth across thousands of random positions × random
 * claims — surfacing any position/phrasing combo where the gate's verdict
 * disagrees with chess.js, or where it throws. The oracle is chess.js itself,
 * so a mismatch is a real bug (the pass-3/13 lesson: get the oracle right and
 * only generate claims whose truth is unambiguous).
 */
import { describe, it, expect } from 'vitest';
import { Chess, type Square, type PieceSymbol } from 'chess.js';
import { validateBoardClaims } from './boardClaimValidator';

const PIECE_WORD: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const TYPES: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];
const FILES = 'abcdefgh';
const ALL: Square[] = [];
for (const f of FILES) for (let r = 1; r <= 8; r++) ALL.push(`${f}${r}` as Square);

// Deterministic PRNG (mulberry32) so a failure is reproducible.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function randomPosition(rand: () => number): Chess {
  const c = new Chess();
  const plies = 4 + Math.floor(rand() * 40);
  for (let i = 0; i < plies; i++) {
    const m = c.moves();
    if (!m.length) break;
    c.move(m[Math.floor(rand() * m.length)]);
  }
  return c;
}

describe('HALLUCINATION AUDIT pass 16 — fuzzer (gate verdict vs chess.js oracle)', () => {
  it('piece-on-square: 4000 random claims, verdict always matches ground truth', { timeout: 30000 }, () => {
    const rand = rng(0xC0FFEE);
    const mismatches: string[] = [];
    let checked = 0;
    for (let p = 0; p < 400; p++) {
      const c = randomPosition(rand);
      const fen = c.fen();
      for (let k = 0; k < 10; k++) {
        const sq = ALL[Math.floor(rand() * 64)];
        const type = TYPES[Math.floor(rand() * 6)];
        // Plain assertive present claim — unambiguous (no negation/future/maxim).
        const claim = `The ${PIECE_WORD[type]} on ${sq} is part of the position.`;
        const here = c.get(sq);
        const claimTrue = !!here && here.type === type;          // type-only (no colour asserted)
        let verdict: boolean;
        try { verdict = validateBoardClaims(claim, fen).ok; }
        catch (e) { mismatches.push(`THREW on "${claim}" @ ${fen}: ${String(e)}`); continue; }
        // gate ok===true must mean claimTrue; gate ok===false must mean !claimTrue
        if (verdict !== claimTrue) mismatches.push(`${verdict ? 'MISSED lie' : 'FALSE POS'}: "${claim}" @ ${fen} (here=${here ? here.type : 'empty'})`);
        checked++;
      }
    }
    console.log(`\n[fuzz] piece-on-square: ${checked} claims, ${mismatches.length} mismatches`);
    expect(mismatches.slice(0, 12), mismatches.slice(0, 12).join('\n')).toEqual([]);
  });

  it('check-state: 800 random "you are in check" claims match chess.inCheck()', { timeout: 30000 }, () => {
    const rand = rng(0x1234BEEF);
    const mismatches: string[] = [];
    let checked = 0;
    for (let p = 0; p < 800; p++) {
      const c = randomPosition(rand);
      const fen = c.fen();
      const claimTrue = c.inCheck();
      let verdict: boolean;
      try { verdict = validateBoardClaims('You are in check.', fen).ok; }
      catch (e) { mismatches.push(`THREW @ ${fen}: ${String(e)}`); continue; }
      if (verdict !== claimTrue) mismatches.push(`${verdict ? 'MISSED' : 'FALSE POS'} check @ ${fen} (inCheck=${claimTrue})`);
      checked++;
    }
    console.log(`[fuzz] check-state: ${checked} claims, ${mismatches.length} mismatches`);
    expect(mismatches.slice(0, 12), mismatches.slice(0, 12).join('\n')).toEqual([]);
  });

  it('never throws on a batch of random/garbage FEN-ish strings (fails open)', () => {
    const rand = rng(7);
    for (let i = 0; i < 200; i++) {
      const garbage = Array.from({ length: Math.floor(rand() * 40) }, () => String.fromCharCode(32 + Math.floor(rand() * 90))).join('');
      expect(() => validateBoardClaims('The knight on f6 is strong.', garbage)).not.toThrow();
    }
  });
});
