// A piece's trip is read off the line that follows (P4: the Italian's Nbd2 —
// "the queen-knight heads for the kingside by the long road: d2, then f1,
// then on to e3"). Real masterclass lines.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pieceRoute } from './pieceRoute';
import { newLessonVoice, BRIEFING_LINE_PLIES } from './reviewMoveBriefing';
import { lessonThought } from './moveThoughtFacts';
import { captureContextsAlong } from './pvPlayback';

const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7 Be3 Bxe3 Nxe3 Ne7 a4 Ng6'.split(' ');
const RUY = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3'.split(' ');

function fenAt(moves: readonly string[], n: number): string {
  const c = new Chess();
  for (const s of moves.slice(0, n)) c.move(s);
  return c.fen();
}

describe('pieceRoute — the trip a piece makes down the line', () => {
  it('the Italian\'s Nbd2 is the start of the knight\'s trip to e3, by way of f1', () => {
    const r = pieceRoute(fenAt(ITALIAN, 16), 'Nbd2', ITALIAN.slice(17));
    expect(r?.text).toBe('sending the knight on to e3, by way of f1');
    expect(r?.path).toEqual(['d2', 'f1', 'e3']);
  });

  it('one more move is the piece\'s next move, not a trip (their …Ne7, then …Ng6)', () => {
    expect(pieceRoute(fenAt(ITALIAN, 25), 'Ne7', ITALIAN.slice(26))).toBeNull();
  });

  it('a piece that waits three moves has finished its trip (the Vienna\'s Nc3)', () => {
    const vienna = 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 c6 Bb3 d6 Nf3 O-O O-O a5 a3 Re8 Ne2 Na6 Ng3 Nc7 c3 Ne6 Nf5'.split(' ');
    expect(pieceRoute(fenAt(vienna, 2), 'Nc3', vienna.slice(3))).toBeNull();
    expect(pieceRoute(fenAt(vienna, 16), 'Ne2', vienna.slice(17))?.text).toBe('sending the knight on to f5, by way of g3');
  });

  it('a bishop chased back by pawns is retreating, not travelling (the Ruy\'s Bb5)', () => {
    expect(pieceRoute(fenAt(RUY, 4), 'Bb5', RUY.slice(5))).toBeNull();
  });

  it('no trip when the piece does not move again', () => {
    expect(pieceRoute(fenAt(ITALIAN, 12), 'Re1', ITALIAN.slice(13))).toBeNull();
  });
});

describe('the lesson beat says the trip', () => {
  it('Nbd2 in the Italian lesson names the trip', () => {
    const fens: string[] = [new Chess().fen()];
    const c = new Chess();
    for (const s of ITALIAN) { c.move(s); fens.push(c.fen()); }
    const runs = captureContextsAlong(fens[0], ITALIAN);
    const voice = newLessonVoice();
    const n = 17;
    const text = lessonThought({
      fenBefore: fens[n - 1], san: ITALIAN[n - 1], prev: runs[n - 1], moverIsStudent: true,
      line: ITALIAN.slice(n, n + BRIEFING_LINE_PLIES),
      theirLast: { fenBefore: fens[n - 2], san: ITALIAN[n - 2] },
    }, voice);
    expect(text).toMatch(/sending the knight on to e3, by way of f1|sends the knight on to e3, by way of f1/);
  });
});
