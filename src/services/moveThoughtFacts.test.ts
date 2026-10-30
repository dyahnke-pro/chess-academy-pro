import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lessonThought } from './moveThoughtFacts';
import { newLessonVoice, BRIEFING_LINE_PLIES } from './reviewMoveBriefing';
import { captureContextsAlong } from './pvPlayback';
import { NO_PREV_CAPTURE } from './captureRun';

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

// NOT YET — FIRST THIS (WO-ONE-COACH-01 gaps): the lesson said Danya's "not
// yet" on 0 of the 527 notes where he says it, though the computer was built.
describe('the lesson says "not yet — first this"', () => {
  it('a check first, the bishop on e6 taken after: the capture is not going anywhere', () => {
    const fen = '7k/ppp2pp1/4b3/8/8/1B6/PPP2PPP/3Q2K1 w - - 0 1';
    const text = lessonThought({ fenBefore: fen, san: 'Qh5+', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Kg8', 'Bxe6', 'fxe6'], theirLast: null }, newLessonVoice());
    expect(text).toMatch(/Taking on e6 can wait — it isn't going anywhere\. The check comes first, and you take after\./);
  });
  it('their in-between move is said from your seat', () => {
    const fen = '3q2k1/ppp2ppp/1b6/8/8/4B3/PPP2PP1/7K b - - 0 1';
    const text = lessonThought({ fenBefore: fen, san: 'Qh4+', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Kg1', 'Bxe3', 'fxe3'], theirLast: null }, newLessonVoice());
    expect(text).toMatch(/They don't take on e3 yet — it isn't going anywhere\. The check comes first, and they take after\./);
  });
  it('a quiet move that captures nothing later says no "not yet"', () => {
    const fen = '7k/ppp2pp1/4b3/8/8/1B6/PPP2PPP/3Q2K1 w - - 0 1';
    const text = lessonThought({ fenBefore: fen, san: 'h3', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Kg8', 'Kh1', 'Kh8'], theirLast: null }, newLessonVoice());
    expect(text).not.toMatch(/going anywhere|can wait/);
  });
});

// THEIR MOVE IS TAUGHT TOO (WO-ONE-COACH-01 Build 4): the fundamentals were
// said for the student's move only, so a lesson explained Danya's idea on
// 18.7% of his notes about the opponent's moves against 41.4% on the
// student's own.
describe("the opponent's move gets its fundamentals, from the student's seat", () => {
  const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
  it('their castling is said as theirs', () => {
    const giuoco = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'];
    const text = lessonThought({ fenBefore: fenAfter(giuoco), san: 'O-O', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['O-O', 'Re1'], theirLast: null }, newLessonVoice());
    expect(text).toBe('They play O-O — it castles their king into safety and swings the rook toward the center.');
  });
  it('their developing move says what it develops toward', () => {
    const text = lessonThought({ fenBefore: fenAfter(['e4', 'e5', 'Nf3']), san: 'Nc6', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Bb5', 'a6'], theirLast: null }, newLessonVoice());
    expect(text).toMatch(/^They play Nc6 — it develops into the game, fighting for the center on d4/);
  });
});

// THE STOP FOR BOTH SEATS (Danya bench 2026-10-30: "Black plays a6, preventing
// a bishop to b5" — his prevent notes are often about the opponent's move): the
// prophylaxis read was the student's move's alone.
describe("their prophylactic move says what it stops", () => {
  it('their h3 takes away the g4 pin, said from your seat', () => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'd6']) c.move(s);
    const text = lessonThought({ fenBefore: c.fen(), san: 'h3', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Be7', 'O-O'], theirLast: null }, newLessonVoice());
    expect(text).toContain('takes away g4: Bg4 would pin their knight on f3');
  });
});
