import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lessonThought, moveThoughtFacts } from './moveThoughtFacts';
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
    line: null, theirLast: n > 0 ? { fenBefore: fens[n - 1], san: sans[n - 1] } : null, reads: null, costCp: null,
  }, newLessonVoice(), null);
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
      line: ITALIAN.slice(n + 1, n + 1 + BRIEFING_LINE_PLIES), theirLast: { fenBefore: fens[n - 1], san: ITALIAN[n - 1] }, reads: null, costCp: null,
    }, newLessonVoice(), null);
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
    const text = lessonThought({ fenBefore: fen, san: 'Qh5+', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Kg8', 'Bxe6', 'fxe6'], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/Taking on e6 can wait — it isn't going anywhere\. The check comes first, and you take after\./);
  });
  it('their in-between move is said from your seat', () => {
    const fen = '3q2k1/ppp2ppp/1b6/8/8/4B3/PPP2PP1/7K b - - 0 1';
    const text = lessonThought({ fenBefore: fen, san: 'Qh4+', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Kg1', 'Bxe3', 'fxe3'], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/They don't take on e3 yet — it isn't going anywhere\. The check comes first, and they take after\./);
  });
  it('a quiet move that captures nothing later says no "not yet"', () => {
    const fen = '7k/ppp2pp1/4b3/8/8/1B6/PPP2PPP/3Q2K1 w - - 0 1';
    const text = lessonThought({ fenBefore: fen, san: 'h3', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Kg8', 'Kh1', 'Kh8'], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
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
    const text = lessonThought({ fenBefore: fenAfter(giuoco), san: 'O-O', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['O-O', 'Re1'], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).toBe('They play O-O — it castles their king into safety and swings the rook toward the center.');
  });
  it('their developing move says what it develops toward', () => {
    const text = lessonThought({ fenBefore: fenAfter(['e4', 'e5', 'Nf3']), san: 'Nc6', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Bb5', 'a6'], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
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
    const text = lessonThought({ fenBefore: c.fen(), san: 'h3', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Be7', 'O-O'], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).toContain('takes away g4: Bg4 would pin their knight on f3');
  });
});

// THE ENGINE'S READS REACH THE MOVE'S FACTS (WO-STORY-MATRIX-01 P1-9). The
// lesson ran a read on the student's first sixteen plies, spliced its weighing
// on as text after the thought, and threw the read away; the move's facts had
// no engine input at all. With the read, the tempting move is ruled out inside
// the thought, as a choice with the line that proves it.
describe('the move\'s choices come from the engine read', () => {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4, Black to move: …Nf6 is the move, …Qh4?? drops the queen.
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  const reads = {
    before: [
      { rank: 1, evaluation: -20, mate: null, moves: ['g8f6', 'd2d3'] },
      { rank: 2, evaluation: 600, mate: null, moves: ['d8h4', 'f3h4'] },
    ],
    after: [], passBefore: [], passAfter: [],
  };
  it('the tempting move is ruled out, with its line', () => {
    const text = lessonThought({ fenBefore: fen, san: 'Nf6', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, theirLast: null, reads, costCp: 0 }, newLessonVoice(), null);
    expect(text).toContain('Qh4? Then they answer Nxh4 — they win a queen.');
  });
  it('the opponent\'s move is not weighed for them', () => {
    const text = lessonThought({ fenBefore: fen, san: 'Nf6', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: null, theirLast: null, reads, costCp: 0 }, newLessonVoice(), null);
    expect(text).not.toContain('Qh4?');
  });
  it('no read, no weighing — never an invented one', () => {
    const text = lessonThought({ fenBefore: fen, san: 'Nf6', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).not.toContain('Qh4?');
  });
});

// WHAT THEIR MOVE AIMS AT IS ITS OWN FACT (WO-STORY-MATRIX-01 P1-9): it was
// said only inside the reply that answered it, so an aim the reply did not
// answer was never said.
describe('their move says what it aims at', () => {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Nc3, Black plays …d5: the pawn hits the bishop on c4.
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Nc3'];
  const c = new Chess();
  for (const s of sans) c.move(s);
  const fen = c.fen();
  const input = (line: string[]) => ({ fenBefore: fen, san: 'd5', prev: NO_PREV_CAPTURE, moverIsStudent: false, line, theirLast: null, phrases: null, reads: null, costCp: null });
  it('their move carries the aim as its own fact when the reply does not answer it', () => {
    const aim = moveThoughtFacts(input(['O-O'])).find((f) => f.computer === 'theirTarget');
    expect(aim?.text).toBe('Their d5 is aimed at your bishop on c4.');
    expect(aim?.step).toBe('theirs');
  });
  it('the reply that answers it says it instead (said once, with the answer)', () => {
    expect(moveThoughtFacts(input(['Qe2'])).some((f) => f.computer === 'theirTarget')).toBe(false);
  });
  it('the idea is said once on the move, whichever computer leads it', () => {
    const text = lessonThought({ ...input(['O-O']) }, newLessonVoice(), null);
    expect(text.match(/bishop on c4/g)?.length).toBe(1);
  });
});

// DANGER LEVELS IN THE LESSON (WO-STORY-MATRIX-01 P1-9): the counter-threat
// Learn's door says, now a fact of the move on every surface that composes it.
describe('a threat answered with a bigger one', () => {
  it('their move leaves a piece and hits a bigger one: said from your seat, with the line', () => {
    // counterThreat.test.ts: …Rd8 leaves the knight on f6 and hits the queen on d1.
    const BEFORE_RD8 = 'r3k2r/ppq2ppp/2p2n2/4P3/4P3/2P2B2/P1P3PP/R2Q1RK1 b kq - 0 14';
    const text = lessonThought({ fenBefore: BEFORE_RD8, san: 'Rd8', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: null, theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/the bigger threat comes first/);
  });
});

