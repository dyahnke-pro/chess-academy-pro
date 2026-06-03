/**
 * HALLUCINATION AUDIT — FUZZER 2: COLOR + NEGATION (pass 18)
 * =========================================================
 * Pass 16 fuzzed type-only presence + check. This fuzzes two dimensions with
 * INDEPENDENT chess.js oracles (not a re-implementation of the gate):
 *   (a) COLOR-specified claims — "the white knight on c6" must match the real
 *       colour, not just the type.
 *   (b) NEGATION / absence — "there is no knight on f6" (the pass-7 fix) must
 *       be kept iff the square really lacks that piece, flagged iff it's there.
 * A mismatch vs chess.js is a real bug.
 */
import { describe, it, expect } from 'vitest';
import { Chess, type Square, type PieceSymbol } from 'chess.js';
import { validateBoardClaims } from './boardClaimValidator';

const PIECE_WORD: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const TYPES: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];
const ALL: Square[] = [];
for (const f of 'abcdefgh') for (let r = 1; r <= 8; r++) ALL.push(`${f}${r}` as Square);

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function randomPosition(rand: () => number): Chess {
  const c = new Chess();
  const plies = 4 + Math.floor(rand() * 40);
  for (let i = 0; i < plies; i++) { const m = c.moves(); if (!m.length) break; c.move(m[Math.floor(rand() * m.length)]); }
  return c;
}

describe('HALLUCINATION AUDIT pass 18 — color + negation fuzz (chess.js oracle)', () => {
  it('COLOR claims: 3000 random "the <color> <piece> on <sq>" match ground truth', { timeout: 30000 }, () => {
    const rand = rng(0xC01017);
    const mism: string[] = [];
    let n = 0;
    for (let p = 0; p < 300; p++) {
      const c = randomPosition(rand);
      const fen = c.fen();
      for (let k = 0; k < 10; k++) {
        const sq = ALL[Math.floor(rand() * 64)];
        const type = TYPES[Math.floor(rand() * 6)];
        const colorWord = rand() < 0.5 ? 'white' : 'black';
        const color = colorWord === 'white' ? 'w' : 'b';
        const claim = `The ${colorWord} ${PIECE_WORD[type]} on ${sq} is active.`;
        const here = c.get(sq);
        const claimTrue = !!here && here.type === type && here.color === color;
        let verdict: boolean;
        try { verdict = validateBoardClaims(claim, fen).ok; } catch (e) { mism.push(`THREW: ${claim} @ ${fen}: ${e}`); continue; }
        if (verdict !== claimTrue) mism.push(`${verdict ? 'MISSED' : 'FALSEPOS'}: "${claim}" @ ${fen} (here=${here ? here.color + here.type : 'empty'})`);
        n++;
      }
    }
    console.log(`\n[fuzz2] color: ${n} claims, ${mism.length} mismatches`);
    expect(mism.slice(0, 12), mism.slice(0, 12).join('\n')).toEqual([]);
  });

  it('NEGATION/absence: 3000 random "there is no <piece> on <sq>" match ground truth (pass-7 fix)', { timeout: 30000 }, () => {
    const rand = rng(0xABCDEF);
    const mism: string[] = [];
    let n = 0;
    for (let p = 0; p < 300; p++) {
      const c = randomPosition(rand);
      const fen = c.fen();
      for (let k = 0; k < 10; k++) {
        const sq = ALL[Math.floor(rand() * 64)];
        const type = TYPES[Math.floor(rand() * 6)];
        const claim = `There is no ${PIECE_WORD[type]} on ${sq} right now.`;
        const here = c.get(sq);
        // absence claim is TRUE (keep) iff the square does NOT hold that piece type.
        const claimTrue = !(here && here.type === type);
        let verdict: boolean;
        try { verdict = validateBoardClaims(claim, fen).ok; } catch (e) { mism.push(`THREW: ${claim} @ ${fen}: ${e}`); continue; }
        if (verdict !== claimTrue) mism.push(`${verdict ? 'MISSED false-absence' : 'CENSORED true-absence'}: "${claim}" @ ${fen} (here=${here ? here.type : 'empty'})`);
        n++;
      }
    }
    console.log(`[fuzz2] negation: ${n} claims, ${mism.length} mismatches`);
    expect(mism.slice(0, 12), mism.slice(0, 12).join('\n')).toEqual([]);
  });
});
