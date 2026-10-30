import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lessonThought } from './moveThoughtFacts';
import { newLessonVoice, BRIEFING_LINE_PLIES } from './reviewMoveBriefing';
import { captureContextsAlong } from './pvPlayback';

/** The lesson's line for the last move of `sans`, as a lesson would say it. */
function lessonLineFor(sans: string[], studentSide: 'white' | 'black'): string {
  const c = new Chess();
  const fens: string[] = [];
  for (const s of sans) { fens.push(c.fen()); c.move(s); }
  const n = sans.length - 1;
  const runs = captureContextsAlong(fens[0], sans);
  const mover: 'white' | 'black' = n % 2 === 0 ? 'white' : 'black';
  return lessonThought({
    fenBefore: fens[n], san: sans[n], prev: runs[n], moverIsStudent: mover === studentSide,
    line: null, theirLast: n > 0 ? { fenBefore: fens[n - 1], san: sans[n - 1] } : null,
  }, newLessonVoice());
}

// Positions from Danya's own notes (the voiced corpus), where the Danya bench
// (2026-10-30) found the lesson picking the wrong computer.
describe('the lesson says the move\'s real idea (WO-ONE-COACH-01)', () => {
  it('h3 stopping …Bg4 leads with the g4 idea, not "luft" (vc--FRuDd_oXz4-17: "denying the bishop the g4-square")', () => {
    const line = lessonLineFor(['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'Bb4', 'd5', 'Ne7', 'Bd3', 'd6', 'O-O', 'Bxc3', 'bxc3', 'Ng6', 'h3'], 'white');
    const first = line.split(/(?<=[.!?])\s/)[0];
    expect(first).toMatch(/g4/);
    expect(first).not.toMatch(/luft/);
  });

  it('…Ng4 says it goes after the bishop that guards c5 (vc--9fPYlSEkJ0-14: "it hits the bishop … regain the pawn")', () => {
    const line = lessonLineFor(['d4', 'd5', 'g3', 'Nf6', 'Bh3', 'Bxh3', 'Nxh3', 'c5', 'Be3', 'Nc6', 'c3', 'e6', 'dxc5', 'Ng4'], 'black');
    expect(line).toMatch(/e3/);
  });

  it('…d6 guards e5 once — never "guards e5" and then "supports the center, guarding e5"', () => {
    const line = lessonLineFor(['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Bc5', 'Bc4', 'd6'], 'black');
    expect(line).toMatch(/e5/);
    expect(line.split(/(?<=[.!?])\s/).filter((s) => /e5/.test(s)).length).toBe(1);
  });

  it('the opponent\'s move is said from the student\'s seat ("They play …")', () => {
    const line = lessonLineFor(['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Bc5', 'Bc4', 'd6'], 'white');
    expect(line).toMatch(/^They play d6/);
  });

  it('the line ahead still names the trip (the Italian\'s Nbd2)', () => {
    const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Ba7 Nf1 Ne7 Ng3 Ng6 d4'.split(' ');
    const c = new Chess();
    const fens: string[] = [];
    for (const s of ITALIAN) { fens.push(c.fen()); c.move(s); }
    const runs = captureContextsAlong(fens[0], ITALIAN);
    const n = 16;
    const text = lessonThought({
      fenBefore: fens[n], san: ITALIAN[n], prev: runs[n], moverIsStudent: true,
      line: ITALIAN.slice(n + 1, n + 1 + BRIEFING_LINE_PLIES), theirLast: { fenBefore: fens[n - 1], san: ITALIAN[n - 1] },
    }, newLessonVoice());
    // The trip is said beside what the move does now (the learned values put
    // develop and the trip a hair apart, so the order is the bench's).
    expect(text).toMatch(/knight on to g3, by way of f1/);
  });
});
