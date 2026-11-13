import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { introHead } from '../test/introPattern';
import { Chess } from 'chess.js';
import { lessonThought, moveThoughtFacts, LESSON_STUDENT_LANE } from './moveThoughtFacts';
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
  return lessonThought({ story: false, theory: true,
    fenBefore: fens[n], san: sans[n], prev: runs[n], moverIsStudent: mover === studentSide,
    line: null, history: sans.slice(0, n), theirLast: n > 0 ? { fenBefore: fens[n - 1], san: sans[n - 1] } : null, reads: null, costCp: null,
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

  it('Ba4 out of the pawn\'s reach is one rescue — the job and the rule said once', () => {
    const line = lessonLineFor(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'], 'white');
    expect(line).toMatch(/out of (the pawn's )?reach/);
    expect(line.match(/out of (the pawn's )?reach/g) ?? []).toHaveLength(1);
  });

  it('…d6 guards e5 once — never "guards e5" and then "supports the center, guarding e5"', () => {
    const line = lessonLineFor(['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Bc5', 'Bc4', 'd6'], 'black');
    expect(line).toMatch(/e5/);
    expect(line.split(/(?<=[.!?])\s/).filter((s) => /e5/.test(s)).length).toBe(1);
  });

  it('the opponent\'s move is said from the student\'s seat ("They play …")', () => {
    const line = lessonLineFor(['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Bc5', 'Bc4', 'd6'], 'white');
    expect(line).toMatch(new RegExp(`^${introHead('opponent', 'd6', 'now')}`));
  });

  it('the line ahead still names the trip (the Italian\'s Nbd2)', () => {
    const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Ba7 Nf1 Ne7 Ng3 Ng6 d4'.split(' ');
    const c = new Chess();
    const fens: string[] = [];
    for (const s of ITALIAN) { fens.push(c.fen()); c.move(s); }
    const runs = captureContextsAlong(fens[0], ITALIAN);
    const n = 16;
    const text = lessonThought({ story: false, theory: true,
      fenBefore: fens[n], san: ITALIAN[n], prev: runs[n], moverIsStudent: true,
      line: ITALIAN.slice(n + 1, n + 1 + BRIEFING_LINE_PLIES), history: ITALIAN.slice(0, n), theirLast: { fenBefore: fens[n - 1], san: ITALIAN[n - 1] }, reads: null, costCp: null,
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
    // "Can wait" is an engine claim: the reads put the check ahead of taking now.
    const reads = { before: [{ rank: 1, evaluation: 300, mate: null, moves: ['d1h5', 'h8g8', 'b3e6', 'f7e6'] }, { rank: 2, evaluation: 0, mate: null, moves: ['b3e6', 'f7e6'] }], passBefore: [], after: [], passAfter: [] };
    const text = lessonThought({ story: false, theory: true, fenBefore: fen, san: 'Qh5+', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Kg8', 'Bxe6', 'fxe6'], history: [], theirLast: null, reads, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/Taking on e6 can wait — it isn't going anywhere\. The check comes first, and you take after\./);
  });
  it('their in-between move is said from your seat', () => {
    const fen = '3q2k1/ppp2ppp/1b6/8/8/4B3/PPP2PP1/7K b - - 0 1';
    const reads = { before: [{ rank: 1, evaluation: -300, mate: null, moves: ['d8h4', 'h1g1', 'b6e3', 'f2e3'] }, { rank: 2, evaluation: 0, mate: null, moves: ['b6e3', 'f2e3'] }], passBefore: [], after: [], passAfter: [] };
    const text = lessonThought({ story: false, theory: true, fenBefore: fen, san: 'Qh4+', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Kg1', 'Bxe3', 'fxe3'], history: [], theirLast: null, reads, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/They don't take on e3 yet — it isn't going anywhere\. The check comes first, and they take after\./);
  });
  it('no reads, no "can wait": the engine was never asked whether taking now is better (KG main Nc3)', () => {
    const fen = '7k/ppp2pp1/4b3/8/8/1B6/PPP2PPP/3Q2K1 w - - 0 1';
    const text = lessonThought({ story: false, theory: true, fenBefore: fen, san: 'Qh5+', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Kg8', 'Bxe6', 'fxe6'], history: [], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).not.toMatch(/can wait/);
  });
  it('a quiet move that captures nothing later says no "not yet"', () => {
    const fen = '7k/ppp2pp1/4b3/8/8/1B6/PPP2PPP/3Q2K1 w - - 0 1';
    const text = lessonThought({ story: false, theory: true, fenBefore: fen, san: 'h3', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Kg8', 'Kh1', 'Kh8'], history: [], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
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
    const text = lessonThought({ story: false, theory: true, fenBefore: fenAfter(giuoco), san: 'O-O', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['O-O', 'Re1'], history: [], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).toBe('They castle kingside — it tucks their king into safety and swings the rook toward the center.');
  });
  it('their developing move says what it develops toward', () => {
    const text = lessonThought({ story: false, theory: true, fenBefore: fenAfter(['e4', 'e5', 'Nf3']), san: 'Nc6', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Bb5', 'a6'], history: [], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    // The plain develop is what anyone sees: it comes after the move's reason.
    expect(text).toMatch(/develops into the game, fighting for the center on d4/);
  });
});

// THE STOP FOR BOTH SEATS (Danya bench 2026-10-30: "Black plays a6, preventing
// a bishop to b5" — his prevent notes are often about the opponent's move): the
// prophylaxis read was the student's move's alone.
describe("their prophylactic move says what it stops", () => {
  it('their h3 takes away the g4 pin, said from your seat', () => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'd6']) c.move(s);
    const text = lessonThought({ story: false, theory: true, fenBefore: c.fen(), san: 'h3', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: ['Be7', 'O-O'], history: [], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    // Which of the two readers of the same stop leads is the fitted policy's
    // choice (`thought-policy.json`); the idea, from the student's seat, is the test.
    expect(text).toMatch(/your bishop off g4.*pin their knight on f3|takes away g4: Bg4 would pin their knight on f3/);
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
  // Whether the weighing is SAID is the composer's fitted choice (a step bar,
  // `thought-policy.json`); that the read reaches the move's facts as a
  // choice with its line is what this tests.
  const factsOf = (moverIsStudent: boolean, r: typeof reads | null): string[] =>
    moveThoughtFacts({ story: false, theory: true, fenBefore: fen, san: 'Nf6', prev: NO_PREV_CAPTURE, moverIsStudent, line: null, history: [], theirLast: null, reads: r, costCp: r ? 0 : null, tense: 'now', phrases: newLessonVoice().phrases }).map((f) => f.text);
  it('the tempting move is ruled out, with its line', () => {
    expect(factsOf(true, reads).some((t) => t.includes('Qh4? Then they answer Nxh4 — they win a queen.'))).toBe(true);
  });
  it('the opponent\'s move is not weighed for them', () => {
    expect(factsOf(false, reads).some((t) => t.includes('Qh4?'))).toBe(false);
  });
  it('no read, no weighing — never an invented one', () => {
    expect(factsOf(true, null).some((t) => t.includes('Qh4?'))).toBe(false);
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
  const input = (line: string[]) => ({ story: false, theory: true, tense: 'now' as const, fenBefore: fen, san: 'd5', prev: NO_PREV_CAPTURE, moverIsStudent: false, line, history: sans, theirLast: null, phrases: null, reads: null, costCp: null });
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
    const text = lessonThought({ story: false, theory: true, fenBefore: BEFORE_RD8, san: 'Rd8', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: null, history: [], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/the bigger threat comes first/);
  });
});


// TWO PLANS ON THE BOARD IN THE LESSON (WO-STORY-MATRIX-01 P1-9): Learn's plan
// chooser, read off the fan after their move, now a fact of their move.
describe('their move leaves two plans', () => {
  // planChooser.test.ts's board, dated move 12: after …Nf6 the engine's two
  // best lines for White carry two plans that come out level.
  const before = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 11';
  const A = ['d2d3', 'f8c5', 'c2c3', 'd7d6', 'b1d2', 'a7a6', 'd2f1', 'e8g8', 'f1g3'];
  const B = ['b1c3', 'f8c5', 'd2d3', 'd7d6', 'c1g5', 'h7h6', 'g5h4', 'g7g5', 'h4g3'];
  const reads = { before: [], after: [{ rank: 1, evaluation: 30, mate: null, moves: A }, { rank: 2, evaluation: 20, mate: null, moves: B }], passBefore: [], passAfter: [] };
  it('both plans are said on their move', () => {
    const text = lessonThought({ story: false, theory: true, fenBefore: before, san: 'Nf6', prev: NO_PREV_CAPTURE, moverIsStudent: false, line: null, history: [], theirLast: null, reads, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/Two plans hold here — getting the knight to f1, or getting the bishop to h4\./);
  });
  it('never on the student\'s own move (the plans are theirs to choose next)', () => {
    const text = lessonThought({ story: false, theory: true, fenBefore: before, san: 'Nf6', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: [], theirLast: null, reads, costCp: null }, newLessonVoice(), null);
    expect(text).not.toMatch(/Two plans/);
  });
});

// THE ORDER MATTERS IN THE LESSON (moveOrder, census #1; WO-STORY-MATRIX-01
// P1-9): the lesson reads the follow-up played first, and the move's facts
// say why this move had to come first. His own position (moveOrder.test.ts).
describe('the move that had to come first', () => {
  it('Be3 first — Nc3 straight away would have run into …Qxd4', async () => {
    const points = (await import('./__fixtures__/moveOrder-his.json')).default as Array<{ game: string; ply: number; fenBefore: string; x: string; y: string; xLine: { cp: number; pv: string[] }; yFirst: { cp: number; pv: string[] } }>;
    const p = points.find((q) => q.game === '1rcEbI44WqE' && q.ply === 13)!;
    const y = new Chess(p.fenBefore).move(p.y);
    const reads = {
      before: [], passBefore: [], passAfter: [],
      after: [{ rank: 1, evaluation: p.xLine.cp, mate: null, moves: p.xLine.pv }],
      followFirst: { uci: `${y.from}${y.to}`, line: { rank: 1, evaluation: p.yFirst.cp, mate: null, moves: p.yFirst.pv } },
    };
    const text = lessonThought({ story: false, theory: true, fenBefore: p.fenBefore, san: p.x, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: [], theirLast: null, reads, costCp: null }, newLessonVoice(), null);
    expect(text).toMatch(/Be3 first — Nc3 straight away would have run into …Qxd4|The order matters: Be3 before Nc3/);
  });
});

describe('the structural choice on the board, after their move (linesStructure, P1-9c-5)', () => {
  // 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 — Black's two best lines differ in kind.
  const c = new Chess();
  for (const s of ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4']) c.move(s);
  const fenBefore = c.fen();
  const reads = {
    before: [], passBefore: [], passAfter: [],
    after: [
      { rank: 1, evaluation: 20, mate: null, moves: ['b4c3', 'b2c3', 'e8g8'] },
      { rank: 2, evaluation: 30, mate: null, moves: ['e8g8', 'f1d3'] },
    ],
  };
  const base = { fenBefore, san: 'e3', prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, reads, costCp: null, phrases: null };
  it('a lesson names the fighting move and the quiet one, on their move', () => {
    const f = moveThoughtFacts({ story: false, theory: true, tense: 'now', ...base, moverIsStudent: false }).find((x) => x.source === 'structureLines');
    expect(f?.text).toBe('It\'s level, so make chances: Bxc3 creates the imbalance, bishop for knight and doubled pawns for them. O-O keeps it quiet.');
    expect(f?.idea).toBe('plan');
  });
  it('never on the student\'s own move — the read is the choice after theirs', () => {
    expect(moveThoughtFacts({ story: false, theory: true, tense: 'now', ...base, moverIsStudent: true }).some((x) => x.source === 'structureLines')).toBe(false);
  });
});

describe('what the move prepares reaches the lesson, proven against the pass reads (P1-9c-5)', () => {
  // Naroditsky's speedrun 1PI3xfMiUE4, ply 15: Kh1 so that f4 comes (stored reads).
  it('Kh1 says it prepares f4, said once', async () => {
    const fixture = (await import('./__fixtures__/moveIntent-1PI3xfMiUE4.json')).default as Record<string, { fenBefore: string; san: string; before: { cp: number | null; mate: number | null; pv: string[] }[]; after: { cp: number | null; mate: number | null; pv: string[] }[]; passBefore: { cp: number | null; mate: number | null; pv: string[] }[]; passAfter: { cp: number | null; mate: number | null; pv: string[] }[] }>;
    const m = fixture['15'];
    const lines = (r: typeof m.before) => r.map((l, k) => ({ rank: k + 1, evaluation: l.cp ?? 0, moves: l.pv, mate: l.mate }));
    const reads = { before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter) };
    const input = { story: false, theory: true, fenBefore: m.fenBefore, san: m.san, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: [], theirLast: null, reads, costCp: 0 };
    const voice = newLessonVoice();
    expect(lessonThought(input, voice, null)).toMatch(/so that f4|prepares f4/);
    // Without the pass reads there is no proof, and no purpose line.
    expect(lessonThought({ ...input, reads: { ...reads, passBefore: [], passAfter: [] } }, newLessonVoice(), null)).not.toMatch(/so that f4|prepares f4/);
  });
});

describe("Learn's student-move lanes reach the lesson (WO-STORY-MATRIX-01 P1-9c)", () => {
  it('every lane the bundle can emit has a lesson answer — said as an idea, or null with its reason', async () => {
    const { readFileSync } = await import('node:fs');
    const learn = readFileSync('src/services/learnBoardTeaching.ts', 'utf8');
    const start = learn.indexOf('export function studentMoveTeaching');
    const body = learn.slice(start, learn.indexOf('\nexport function', start + 1));
    const order = readFileSync('src/services/orderTeaching.ts', 'utf8');
    const lanes = new Set([...`${body}\n${order}`.matchAll(/teachingFact\('([A-Za-z]+)'/g)].map((m) => m[1]));
    expect(lanes.size).toBeGreaterThan(10);
    for (const lane of lanes) expect(Object.prototype.hasOwnProperty.call(LESSON_STUDENT_LANE, lane), lane).toBe(true);
  });
  it('a lesson says which piece takes back, and why (QGD Exchange …exd5)', () => {
    const sans = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5'];
    const c = new Chess();
    const fens: string[] = [];
    for (const s of sans) { fens.push(c.fen()); c.move(s); }
    const text = lessonThought({ story: false, theory: true,
      fenBefore: fens[7], san: 'exd5', prev: captureContextsAlong(fens[0], sans)[7], moverIsStudent: true,
      line: ['Bg5', 'Be7'], history: sans.slice(0, 7), theirLast: { fenBefore: fens[6], san: 'cxd5' }, reads: null, costCp: null,
    }, newLessonVoice(), null);
    expect(text).toMatch(/Qxd5 would just lose the queen to Nxd5/);
  });
});

// A FIXED PHRASE AT MOST TWICE (the WHY rule, round 5): the long horizon of a
// file opened rides its first two such moves in a lesson or a game.
describe('the long horizon is said twice a lesson, then the change alone', () => {
  it('the third file opened says only that it opens', () => {
    const fen = 'rnbqkbnr/ppp2ppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3';
    const phrases = new Map<string, number>();
    const said = [1, 2, 3].map(() => moveThoughtFacts({ story: false, theory: true, tense: 'now', fenBefore: fen, san: 'exd5', moverIsStudent: true, prev: NO_PREV_CAPTURE, line: null, theirLast: null, history: [], phrases, reads: null, costCp: null })
      .find((f) => f.kind === 'aspect-opens-file')?.text ?? '');
    expect(said[0]).toMatch(/opens the e-file, a road for the rooks from now on\.$/);
    expect(said[1]).toMatch(/a road for the rooks from now on/);
    expect(said[2]).toMatch(/opens the e-file\.$/);
  });
});

// A DEEP FACT THAT TAKES THE PIECE THE MOVE ALREADY ATTACKS is one idea, said
// once (decision baseline 2026-11-12, Sicilian Closed …Re2: "Re2 attacks their
// pawn on c2. It also takes their pawn on c2 next, where it hits their pawn on b2").
describe('a deep fact that takes the attacked piece is not said twice', () => {
  it('…Re2 attacking c2 does not also say it takes c2 next', () => {
    const fen = '4rr2/p6k/1p1N3p/2p5/8/3P4/PPP4P/6RK b - - 2 28';
    const facts = moveThoughtFacts({ story: false, theory: true, fenBefore: fen, san: 'Re2', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Ne4', 'Rxc2'], history: [], theirLast: null, reads: null, costCp: null, tense: 'now', phrases: newLessonVoice().phrases });
    const deep = facts.find((f) => f.source === 'deepFact');
    // The square it takes rides on the fact, so the composer's one-idea-per-
    // square rule holds it behind the move's own attack on c2.
    expect(deep?.text).toContain('taking their pawn on c2 next');
    expect(deep?.squares).toContain('c2');
  });
});

describe('onlyMove (gap B6)', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('names the next best and what it gives up when only the played move holds', async () => {
    const { onlyMove } = await import('./moveThoughtFacts');
    expect(onlyMove(start, 'e2e4', [{ moves: ['e2e4'], evaluation: 40 }, { moves: ['g1f3'], evaluation: -260 }])).toEqual({ secondSan: 'Nf3', gives: 'gives up far more' });
  });
  it('says nothing when the played move is not the best, or another move holds too', async () => {
    const { onlyMove } = await import('./moveThoughtFacts');
    expect(onlyMove(start, 'd2d4', [{ moves: ['e2e4'], evaluation: 40 }, { moves: ['d2d4'], evaluation: -170 }])).toBeNull();
    expect(onlyMove(start, 'e2e4', [{ moves: ['e2e4'], evaluation: 40 }, { moves: ['d2d4'], evaluation: 30 }])).toBeNull();
  });
});

describe('a plain stopped check never leads a move with a real job', () => {
  it('Nc3 against …Qd5 leads with the tempo on the queen, not …Qe4+', () => {
    const c = new Chess(); for (const m of ['e4', 'd5', 'exd5', 'Qxd5']) c.move(m);
    const said = lessonThought({ story: false, theory: false, fenBefore: c.fen(), san: 'Nc3', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: ['e4', 'd5', 'exd5', 'Qxd5'], theirLast: null, reads: null, costCp: null }, newLessonVoice(), null);
    expect(said).not.toMatch(/^[^.]*Qe4/);
  });
});


describe('a costly move is said with what it allows (fix 1, 2026-11-13)', () => {
  const L = (rows: Array<{ cp: number | null; mate: number | null; pv: string[] }>) => rows.map((r, k) => ({ rank: k + 1, evaluation: r.cp ?? 0, mate: r.mate, moves: r.pv }));
  const thought = (fen: string, san: string, before: Parameters<typeof L>[0], after: Parameters<typeof L>[0], costCp: number): string => {
    const facts = moveThoughtFacts({ story: false, theory: false, tense: 'now', fenBefore: fen, san, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: [], theirLast: null,
      reads: { before: L(before), after: L(after), passBefore: [], passAfter: [] }, costCp, phrases: newLessonVoice().phrases });
    return facts.map((f) => f.text).join(' ');
  };
  it("the Stafford's Bxd8 wins no queen: it runs into mate", () => {
    const said = thought('r1bqk2r/ppp2ppp/2p5/2b3B1/4n3/3P4/PPP2PPP/RN1QKB1R w KQkq - 0 7', 'Bxd8',
      [{ cp: -369, mate: null, pv: ['d1e2', 'd8g5', 'f2f4', 'c5f2', 'e1d1', 'g5f4'] }],
      [{ cp: null, mate: -2, pv: ['c5f2', 'e1e2', 'c8g4'] }], 9999);
    expect(said).not.toMatch(/wins a queen/);
    expect(said).toMatch(/walks into mate: they play …?Bxf2\+, you answer Ke2 and they play …?Bg4#/);
  });
  it('Ke2 against …Qh4 is said with the mate it allows', () => {
    const said = thought('rnb1k1nr/pppp1ppp/8/2b1P3/4P2q/8/PPPP2PP/RNBQKBNR w KQkq - 1 4', 'Ke2',
      [{ cp: -346, mate: null, pv: ['g2g3', 'h4e4', 'd1e2', 'e4h1', 'g1f3', 'b8c6'] }],
      [{ cp: null, mate: -1, pv: ['h4e4'] }], 9999);
    expect(said).toMatch(/Qxe4#/);
  });
  // Bench 2026-11-13: the surface's cost is null for a mate read (no number),
  // and 3.Ke2?? in the Scandinavian was said to "prepare Qe1".
  it('a move that walks into mate is said so even when the cost is not a number', () => {
    const facts = moveThoughtFacts({ story: false, theory: false, tense: 'now', fenBefore: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', san: 'Ke2', prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: [], theirLast: null,
      reads: { before: L([{ cp: 0, mate: null, pv: ['b1c3', 'd5a5'] }]), after: L([{ cp: null, mate: -1, pv: ['d5e4'] }]), passBefore: [], passAfter: [] }, costCp: null, phrases: newLessonVoice().phrases });
    expect(facts.map((f) => f.text).join(' ')).toMatch(/walks into mate: they play …?Qe4#/);
    expect(facts.map((f) => f.text).join(' ')).not.toMatch(/prepares/);
  });
});

describe('a gambit is one claim (bench 2026-11-13)', () => {
  it('the Vienna Gambit says its gift once: the idea and the verdict, not the opening line too', async () => {
    const { setOpeningIdentity } = await import('./openingIdentity');
    const { setOpeningPositions } = await import('./openingPositions');
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')) as Record<string, [string, number]>);
    const cases = JSON.parse(readFileSync('src/test/fixtures/gambit-cases.json', 'utf8')) as Array<{ id: string; san: string; fen: string; after: Array<{ moves: string[]; evaluation: number; mate: number | null }> }>;
    const c = cases.find((x) => x.id === 'vc-wb_e4_e5-215')!;
    const facts = moveThoughtFacts({ story: true, theory: true, tense: 'now', fenBefore: c.fen, san: c.san, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: ['e4', 'e5', 'Nc3', 'Nc6'], theirLast: null,
      reads: { before: [], after: c.after.map((l, k) => ({ rank: k + 1, ...l })), passBefore: [], passAfter: [] }, costCp: null, phrases: newLessonVoice().phrases });
    const said = facts.map((f) => f.text).join(' ');
    expect(said).toMatch(/offers a pawn: if they play exf4/);
    expect((said.match(/offers a pawn/g) ?? []).length).toBe(1);
  });
});

describe('a move that loses big is not credited (bench 2026-11-13)', () => {
  it('Bxe6+?? is no gambit and stops nothing; what it allows is the lesson', () => {
    const cases = JSON.parse(readFileSync('src/test/fixtures/gambit-cases.json', 'utf8')) as Array<{ id: string; san: string; fen: string; before?: Array<{ moves: string[]; evaluation: number; mate: number | null }>; after: Array<{ moves: string[]; evaluation: number; mate: number | null }> }>;
    const c = cases.find((x) => x.id === 'vc-wb_e4_e5-747')!;
    const R = (ls: typeof c.after) => ls.map((l, k) => ({ rank: k + 1, ...l }));
    const cost = (c.before?.[0]?.evaluation ?? 0) - c.after[0].evaluation;
    expect(cost).toBeGreaterThanOrEqual(100);
    const facts = moveThoughtFacts({ story: false, theory: false, tense: 'now', fenBefore: c.fen, san: c.san, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: [], theirLast: null,
      reads: { before: R(c.before ?? []), after: R(c.after), passBefore: [], passAfter: [] }, costCp: cost, phrases: newLessonVoice().phrases });
    const said = facts.map((f) => f.text).join(' ');
    expect(said).not.toMatch(/stops …h6/);
    expect(said).not.toMatch(/gives a pawn/);
  });
});

describe('a blunder is not praised (round-2 read 2026-11-13)', () => {
  it('…e6?? dropping the queen to Bxd8 says what it loses, not that it opens a diagonal', () => {
    const cases = JSON.parse(readFileSync('src/test/fixtures/gambit-cases.json', 'utf8')) as Array<{ id: string; san: string; fen: string; before?: Array<{ moves: string[]; evaluation: number; mate: number | null }>; after: Array<{ moves: string[]; evaluation: number; mate: number | null }> }>;
    const c = cases.find((x) => x.id === 'vc-wb_d4_d5-72')!;
    const R = (ls: typeof c.after) => ls.map((l, k) => ({ rank: k + 1, ...l }));
    const cost = c.after[0].evaluation - (c.before?.[0]?.evaluation ?? 0);
    expect(cost).toBeGreaterThanOrEqual(300);
    const facts = moveThoughtFacts({ story: false, theory: false, tense: 'now', fenBefore: c.fen, san: c.san, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: null, history: [], theirLast: null,
      reads: { before: R(c.before ?? []), after: R(c.after), passBefore: [], passAfter: [] }, costCp: cost, phrases: newLessonVoice().phrases });
    const said = facts.map((f) => f.text).join(' ');
    expect(said).not.toMatch(/opens the diagonal|supports the center/);
    expect(said).toMatch(/queen/);
  });
});

// Bench r10 2026-11-13, Bg2 (wb_Nf3_c5): the move's job said "clears the way
// to castle next move" and its purpose said it again ("Your Bg2 clears the way
// to castle.") — one claim, two computers, two keys.
describe('castling made ready is said once', () => {
  it('Bg2 says it clears the way to castle once', async () => {
    const { linesOf } = await import('../test/replayGame');
    const c = JSON.parse(readFileSync('src/test/fixtures/castle-prep-bg2.json', 'utf8')) as { fen: string; san: string; before: never[]; after: never[]; passBefore: never[]; passAfter: never[] };
    const reads = { before: linesOf(c.before), after: linesOf(c.after), passBefore: linesOf(c.passBefore), passAfter: linesOf(c.passAfter) };
    const text = lessonThought({ story: false, theory: true, fenBefore: c.fen, san: c.san, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['g6', 'O-O'], history: ['Nf3', 'c5', 'g3', 'Nc6'], theirLast: null, reads, costCp: 4 }, newLessonVoice(), null);
    expect(text).toMatch(/castle/);
    expect((text.match(/way to castle|so you can castle/g) ?? []).length).toBe(1);
  });
});

// Blind grade 2026-11-13, the Elephant Gambit's Nxe5: "it stops …Nf6" with
// nothing said of what …Nf6 would have done — and …Nf6 is still a sound move.
describe('a quiet move is stopped only with what it would have done', () => {
  it('Nxe5 does not "stop …Nf6"', async () => {
    const { linesOf } = await import('../test/replayGame');
    const c = JSON.parse(readFileSync('src/test/fixtures/stop-quiet-nxe5.json', 'utf8')) as { fen: string; san: string; before: never[]; after: never[]; passBefore: never[]; passAfter: never[] };
    const reads = { before: linesOf(c.before), after: linesOf(c.after), passBefore: linesOf(c.passBefore), passAfter: linesOf(c.passAfter) };
    const text = lessonThought({ story: false, theory: true, fenBefore: c.fen, san: c.san, prev: NO_PREV_CAPTURE, moverIsStudent: true, line: ['Bd6', 'd4'], history: ['e4', 'e5', 'Nf3', 'd5'], theirLast: null, reads, costCp: 26 }, newLessonVoice(), null);
    expect(text).not.toMatch(/stops …Nf6/);
  });
});
