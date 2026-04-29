import { describe, it, expect } from 'vitest';
import { tryRouteIntent } from './coachIntentRouter';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('tryRouteIntent — play_move verbs', () => {
  it('routes "play e4" from start', () => {
    const r = tryRouteIntent('play e4', { currentFen: STARTING_FEN });
    expect(r).toEqual({ kind: 'play_move', san: 'e4' });
  });

  it('routes "push pawn to e4"', () => {
    const r = tryRouteIntent('push pawn to e4', { currentFen: STARTING_FEN });
    expect(r).toEqual({ kind: 'play_move', san: 'e4' });
  });

  it('routes "play knight to f3"', () => {
    const r = tryRouteIntent('play knight to f3', { currentFen: STARTING_FEN });
    expect(r).toEqual({ kind: 'play_move', san: 'Nf3' });
  });
});

describe('tryRouteIntent — take/capture verbs (regression: audit cycle 8)', () => {
  // Position after 1.e4 e5 2.Nf3 d6 — white can legally play Nxe5
  // (the Philidor-pawn-grab line). Used for every capture test below.
  const FEN_NXE5 =
    'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

  it('routes "take the pawn on e5" → Nxe5', () => {
    const r = tryRouteIntent('take the knight to e5', { currentFen: FEN_NXE5 });
    expect(r).toEqual({ kind: 'play_move', san: 'Nxe5' });
  });

  it('routes "capture knight e5"', () => {
    const r = tryRouteIntent('capture knight e5', { currentFen: FEN_NXE5 });
    expect(r).toEqual({ kind: 'play_move', san: 'Nxe5' });
  });

  it('routes "take it" with bare destination — "take on e5" → Nxe5', () => {
    const r = tryRouteIntent('take on e5', { currentFen: FEN_NXE5 });
    expect(r).toEqual({ kind: 'play_move', san: 'Nxe5' });
  });

  it('does NOT route "take it back" as play_move — take_back wins', () => {
    const r = tryRouteIntent('take it back', { currentFen: STARTING_FEN });
    expect(r).toEqual({ kind: 'take_back_move', count: 1 });
  });

  it('routes "take both back" → take_back_move count=2', () => {
    const r = tryRouteIntent('take both back', { currentFen: STARTING_FEN });
    expect(r).toEqual({ kind: 'take_back_move', count: 2 });
  });

  it('falls through to LLM when capture target is ambiguous (no unique legal capture)', () => {
    // Starting position — "take on e4" has zero legal moves there for
    // either side, so the bare-destination path returns null and the
    // LLM owns the disambiguation.
    const r = tryRouteIntent('take on e4', { currentFen: STARTING_FEN });
    expect(r).toBeNull();
  });

  it('falls through to LLM on speech-recognition failures like "take the night"', () => {
    // No "knight" word + no square → router can't help. LLM owns it.
    const r = tryRouteIntent('take the night', { currentFen: STARTING_FEN });
    expect(r).toBeNull();
  });
});

describe('tryRouteIntent — non-matches fall through to LLM', () => {
  it('returns null for question-style asks', () => {
    expect(tryRouteIntent('what should I play here?', { currentFen: STARTING_FEN })).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(tryRouteIntent('   ', { currentFen: STARTING_FEN })).toBeNull();
  });
});
