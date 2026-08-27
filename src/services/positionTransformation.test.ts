import { describe, it, expect } from 'vitest';
import { detectPositionTransformation, transformationLabel, transformationPrompt } from './positionTransformation';

describe('detectPositionTransformation', () => {
  it('flags an even trade the opponent can recapture as an unfavorable-trade', () => {
    // Italian: after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 White to move.
    // Bxf7+? is a capture; but for an even trade take a knight-for-knight-ish
    // shape: build a position where NxN is recapturable at even material.
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 — bishop takes knight, dxc6 recaptures.
    const fen = 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    const r = detectPositionTransformation(fen, 'b5c6', 'b5a4');
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('unfavorable-trade');
    expect(r!.captured).toBe('n'); // took the knight on c6
  });

  it('does NOT flag winning material (grabbing a hanging piece) as a trade', () => {
    // A free capture with no recapture is a tactic, not a transformation.
    // White queen takes an undefended pawn on e5 (nothing recaptures).
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPQPPP/RNB1KBNR w KQkq - 0 1';
    const r = detectPositionTransformation(fen, 'e2e5', 'e2e5');
    expect(r).toBeNull(); // e5 pawn is undefended → not a trade
  });

  it('flags a declined recapturable engine capture as missed-favorable-trade', () => {
    // Same Ruy position: engine wants Bxc6 (a real exchange), player plays a
    // quiet non-capture (O-O) instead → missed the transformation.
    const fen = 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    const r = detectPositionTransformation(fen, 'e1g1', 'b5c6');
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('missed-favorable-trade');
  });

  it('returns null on a quiet non-capture with a non-capture best move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(detectPositionTransformation(fen, 'e2e4', 'd2d4')).toBeNull();
  });

  it('returns null on malformed input', () => {
    expect(detectPositionTransformation('', 'e2e4', 'd2d4')).toBeNull();
    expect(detectPositionTransformation('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'zz', 'd2d4')).toBeNull();
  });

  it('renders a board-true label + prompt', () => {
    const r = { kind: 'unfavorable-trade' as const, captured: 'n' };
    expect(transformationLabel(r)).toBe('Unfavorable trades');
    expect(transformationPrompt(r)).toMatch(/trade of the knight/i);
  });
});
