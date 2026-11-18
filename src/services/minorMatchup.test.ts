import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { minorMatchup, minorMatchupOn, minorMatchupLine } from './minorMatchup';
import { assemblePositionAssessment } from './groundedAnswer';
import { readBoard } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import { lockedPawnPairs, structureSignature } from './boardStructure';

// Danya, voiced note vc-6-d45BL5GoY-35 (his Black, move 17): after Bxe4 he
// takes back with the knight. White's bishop on e3 is shut in by its own c5
// and f4, and the black knight lands on e4, where no white pawn can kick it.
const DANYA_NXE4 = 'r4rk1/p4ppp/4pn2/2P5/1pp1BP2/4B1P1/PP5P/R2R2K1 b - - 0 17';
// Danya, voiced notes vc-gpHLc41XR04-51..53 (his White, move 24): …Qxe5 takes
// the last knight he had, leaving their knight on b4 against his bishop on g2
// with his a4, c4 and d3 locked on light squares — at -52 he calls that knight
// "a monster".
const DANYA_QXE5 = '4rr2/2q2pkp/1p4p1/p1p1N3/PnPpP2P/3P2P1/3Q1PB1/2R1R1K1 b - - 0 24';
// Lichess puzzle 01PcY (move 47): Rxb5 takes the knight, leaving White's
// bishop on f4 against the knight on a8 on an open board, pawns on both wings.
const PUZZLE_RXB5 = 'n6k/4rpp1/2P4p/1n3R2/4pB1P/8/5PP1/6K1 w - - 0 47';
// Lichess puzzle 0DByK (move 39): …Kxd7 takes the rook, leaving the black
// knight on e6 against the bishop on g2, nothing locked, pawns on both wings.
const PUZZLE_KXD7 = '8/pp1R4/2pkn2p/5pP1/3P4/P3K3/1P4B1/8 b - - 0 39';
// Negative controls. Lichess puzzle 03Ws6 (move 56): knight against bishop on
// a closed board, but the black pawns on d5, f5 and h5 stand on light squares
// and the bishop is dark — a good bishop, so the knight is not better.
const PUZZLE_GOOD_BISHOP = '8/2k1N3/8/2Pp1p1p/3P1P1P/8/1pK5/2b5 b - - 1 56';
// Lichess puzzle 0AzKx (move 50): the only locks are on the b- and h-files,
// the rim — no closed centre, nothing said.
const PUZZLE_EDGE_LOCKS = '8/8/6p1/3k1b1p/7P/1pKN2P1/1P6/8 b - - 1 50';
// The wrong-bishop draw. The app's own drawn-pattern lesson
// (src/data/drawn-patterns.json, wrong-rook-pawn-bishop, Greco's draw):
// k7/8/PK6/8/8/8/8/B7. No board in puzzles.json or Danya's games reaches it
// (searched two plies deep), so the trade is that lesson board one move
// earlier: a black knight on d4 that the dark bishop takes.
const LESSON_DRAW = 'k7/8/PK6/8/8/8/8/B7 b - - 0 1';
const LESSON_TRADE = 'k7/8/PK6/8/3n4/8/8/B7 w - - 0 1';
// The same lesson's right-bishop board (positions[1]): a light bishop, a win.
const LESSON_RIGHT = 'k7/8/PK6/8/8/8/8/1B6 w - - 0 1';

const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

describe('lockedPawnPairs: the one locked-pawn reader', () => {
  it('reads every head-to-head pair, and the locked centre counts its c–f files', () => {
    const fen = after(DANYA_QXE5, 'Qxe5');
    expect(lockedPawnPairs(new Chess(fen)).map((p) => p.white).sort()).toEqual(['a4', 'c4', 'd3']);
    expect(structureSignature(fen)?.lockedCenter).toBe(true);
  });
});

describe('minorMatchup: the good knight against the bad bishop', () => {
  it('Danya\'s …Nxe4: you trade into a good knight against their bad bishop', () => {
    const r = minorMatchup(DANYA_NXE4, 'Nxe4', 'b');
    expect(r?.winner).toBe('b');
    expect(r?.text).toMatch(/your good knight against their bad bishop/);
    expect(r?.text).toContain('Their bishop on e3 is stuck behind its own pawns on c5 and f4.');
    expect(r?.text).toContain('Your knight on e4 stands where no pawn of theirs can ever kick it.');
  });
  it('the other seat hears it as theirs', () => {
    const r = minorMatchup(DANYA_NXE4, 'Nxe4', 'w');
    expect(r?.text).toMatch(/their good knight against your bad bishop/);
    expect(r?.text).toContain('Your bishop on e3 is stuck behind its own pawns on c5 and f4.');
  });
  it('Danya\'s …Qxe5: a closed board, his pawns fixed on his bishop\'s colour, their knight on an outpost', () => {
    const r = minorMatchup(DANYA_QXE5, 'Qxe5', 'w');
    expect(r?.text).toContain('They trade into a good knight against your bishop.');
    expect(r?.text).toContain('The pawns are locked on the a-, c- and d-files, and your pawns on a4, c4 and d3 are stuck on light squares, the colour of your bishop on g2.');
    expect(r?.text).toContain('Their knight on b4 stands where no pawn of yours can ever kick it.');
  });
  it('said once: his next moves keep the same matchup and say nothing', () => {
    let fen = after(DANYA_QXE5, 'Qxe5');
    for (const san of ['f4', 'Qe6', 'e5', 'f6', 'Kh2']) {
      expect(minorMatchup(fen, san, 'w')).toBeNull();
      fen = after(fen, san);
    }
    // The standing read still holds it.
    const st = minorMatchupOn(fen);
    expect(st?.better).toBe('knight');
    expect(minorMatchupLine(st!, 'w', fen)).toMatch(/^It is their knight against your bishop\./);
    // One coach: the chat's "how do I stand?" says the same standing read.
    const chat = assemblePositionAssessment({ bestUci: null, line: null, tempting: null, evalCp: 0, mateIn: null, studentColor: 'white', fen });
    expect(chat?.facts).toContain('It is their knight against your bishop.');
  });
});

describe('minorMatchup: the bishop on an open board', () => {
  it('puzzle 01PcY Rxb5: your free bishop against their knight', () => {
    const r = minorMatchup(PUZZLE_RXB5, 'Rxb5', 'w');
    expect(r?.winner).toBe('w');
    expect(r?.text).toMatch(/That trade leaves your free bishop against their knight\./);
    expect(r?.text).toContain('so your bishop on f4 covers either side at once');
    expect(r?.text).toContain('Their knight has no square to settle on');
    expect(minorMatchup(PUZZLE_RXB5, 'Rxb5', 'b')?.text).toMatch(/their free bishop against your knight/);
  });
  it('puzzle 0DByK …Kxd7: a king\'s capture, not a trade of minors', () => {
    const r = minorMatchup(PUZZLE_KXD7, 'Kxd7', 'w');
    expect(r?.text).toMatch(/^That capture leaves their knight against your bishop\./);
    expect(r?.text).toMatch(/Your bishop is (the better piece|worth more than their knight now)\./);
  });
});

describe('minorMatchup: where it must stay quiet', () => {
  it('a good bishop on a closed board: the knight is not better', () => {
    expect(minorMatchupOn(after(PUZZLE_GOOD_BISHOP, 'Be3'))).toBeNull();
    expect(minorMatchup(PUZZLE_GOOD_BISHOP, 'Be3', 'w')).toBeNull();
  });
  it('locks on the rim alone do not close the board', () => {
    expect(minorMatchup(PUZZLE_EDGE_LOCKS, 'Be6', 'w')).toBeNull();
  });
  it('a trade in flight is not the matchup: after Bxe4 the knight takes back', () => {
    // The board before Danya's …Nxe4 is the board after White's Bxe4.
    expect(minorMatchupOn(DANYA_NXE4)).toBeNull();
  });
});

describe('minorMatchup: the wrong-coloured bishop', () => {
  it('the trade into it: your bishop and pawn cannot win', () => {
    const r = minorMatchup(LESSON_TRADE, 'Bxd4', 'w');
    expect(r?.winner).toBe('b');
    expect(r?.text).toMatch(/bishop on d4 is the wrong colour/);
    expect(r?.text).toContain('The a6 pawn is a rook pawn, and the bishop never touches its promotion corner on a8.');
    expect(minorMatchup(LESSON_TRADE, 'Bxd4', 'b')?.text).toMatch(/^Their bishop (on d4 is the wrong colour for their pawn, so you hold the draw|and pawn cannot beat you here)/);
  });
  it('said on the move that makes it, not inside the drawn ending, and never for the right bishop', () => {
    expect(minorMatchup(LESSON_DRAW, 'Kb8', 'b')).toBeNull();
    expect(minorMatchup(LESSON_RIGHT, 'Bf5', 'w')).toBeNull();
  });
});

describe('the one registry and the one composer', () => {
  it('comes out of the registry with the winner\'s seat', () => {
    const f = readBoard('minorMatchup', { fenBefore: DANYA_NXE4, san: 'Nxe4', student: 'b' });
    expect(f?.computer).toBe('minorMatchup');
    expect(f?.seat).toBe('student');
    expect(readBoard('minorMatchup', { fenBefore: DANYA_NXE4, san: 'Nxe4', student: 'w' })?.seat).toBe('opponent');
  });
  it('a lesson or Review move that makes the matchup carries it', () => {
    const facts = moveThoughtFacts({
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: DANYA_NXE4, san: 'Nxe4', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 0, reads: null,
    });
    expect(facts.some((f) => f.computer === 'minorMatchup' && /bishop on e3 is stuck/.test(f.text))).toBe(true);
  });
});
