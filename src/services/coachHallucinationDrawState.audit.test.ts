/**
 * HALLUCINATION AUDIT — STALEMATE / DRAW STATE (pass 15)
 * =====================================================
 * Completes the board-STATE family (check / checkmate / stalemate / draw).
 * Stalemate and insufficient-material are exact, FEN-determinable rule terms
 * → low-FP gates. Deliberately NOT gated: a bare "this is a draw" (a fuzzy
 * assessment, not a rule claim) and threefold repetition (a FEN-built
 * position has no move history, so the validator cannot know it).
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { validateBoardClaims } from './boardClaimValidator';

const NORMAL = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const STALEMATE = 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1';   // black to move, stalemated
const KvK = 'k7/8/8/8/8/8/8/K7 w - - 0 1';            // insufficient material

describe('HALLUCINATION AUDIT pass 15 — stalemate / draw state', () => {
  it('sanity: test FENs are what we think', () => {
    expect(new Chess(STALEMATE).isStalemate()).toBe(true);
    expect(new Chess(KvK).isInsufficientMaterial()).toBe(true);
    expect(new Chess(NORMAL).isStalemate()).toBe(false);
    expect(new Chess(NORMAL).isInsufficientMaterial()).toBe(false);
  });

  it('CATCHES a false stalemate claim on a normal position', () => {
    expect(validateBoardClaims('This is stalemate.', NORMAL).ok).toBe(false);
    expect(validateBoardClaims('Stalemate!', NORMAL).ok).toBe(false);
  });
  it('KEEPS a real stalemate claim', () => {
    expect(validateBoardClaims('This is stalemate.', STALEMATE).ok).toBe(true);
  });

  it('CATCHES a false "insufficient material" claim (queens on the board)', () => {
    expect(validateBoardClaims('It is a draw by insufficient material.', NORMAL).ok).toBe(false);
  });
  it('KEEPS a real insufficient-material claim (K vs K)', () => {
    expect(validateBoardClaims('This is a draw by insufficient material.', KvK).ok).toBe(true);
  });

  it('does NOT gate a bare "this is a draw" assessment (fuzzy, not a rule claim)', () => {
    expect(validateBoardClaims('Objectively this is a draw with best play.', NORMAL).ok).toBe(true);
    expect(validateBoardClaims("It's a draw here.", NORMAL).ok).toBe(true);
  });
  it('does NOT gate a threefold-repetition claim (FEN carries no history)', () => {
    expect(validateBoardClaims('This is a draw by threefold repetition.', NORMAL).ok).toBe(true);
  });
});
