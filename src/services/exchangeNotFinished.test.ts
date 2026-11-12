// NO CLAIM BEFORE THE EXCHANGE IS OVER (task 172, 2026-11-11). Seven writers
// read every fact the teaching computers hand the lesson composer against the
// board and the engine lines; well over half of the false ones read the board
// ONE move after a capture. Each case below is a logged fact on its exact
// board, and each fails on the code before the one shared read
// (`material.exchangeEnd`).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { exchangeEnd } from './material';
import { moveDifference } from './weighedMoves';
import { moveAspects } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './captureRun';
import { moveJob, MINE, THEIRS } from './bookMoveWhy';
import { theirTarget, moveHit } from './threeFacts';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { moverLineProof } from './exchangeLedger';
import { pawnBreak } from './pawnBreak';
import { readFileSync } from 'node:fs';
import { lessonThought } from './moveThoughtFacts';
import { newLessonVoice } from './reviewMoveBriefing';
import { linesOf, replayPlies, type ReplayGame } from '../test/replayGame';

const NO_LINES = { a: null, b: null };
const aspectsOf = (fenBefore: string, san: string, moverIsStudent: boolean, follow: ReadonlyArray<readonly string[]> = []) =>
  moveAspects({ fenBefore, san, prev: NO_PREV_CAPTURE, moverIsStudent, follow })?.aspects ?? [];
const uciLine = (fen: string, sans: readonly string[]): string[] => {
  const c = new Chess(fen);
  return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
};

// The boards, from the captured fact sheets.
const PHILIDOR_3 = 'rnbqkbnr/ppp2ppp/3p4/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3';
const LONDON_8 = 'r1bq1rk1/pp3ppp/2nbpn2/2pp4/3P4/2PBP1B1/PP1N1PPP/R2QK1NR w KQ - 1 8';
const LONDON_7 = 'r1bqk2r/pp3ppp/2nbpn2/2pp4/3P1B2/2P1PN2/PP1N1PPP/R2QKB1R w KQkq - 3 7';
const QGA_3 = 'rnbqkbnr/ppp1pppp/8/8/2pP4/5N2/PP2PPPP/RNBQKB1R b KQkq - 1 3';
const QGD_2 = 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2';
const BENKO_BXF1 = 'rn1qkb1r/3ppp1p/b4np1/2pP4/4P3/2N5/PP3PPP/R1BQKBNR b KQkq - 0 7';
const BENKO_KXF1 = 'rn1qkb1r/3ppp1p/5np1/2pP4/4P3/2N5/PP3PPP/R1BQKbNR w KQkq - 0 8';
const BENKO_BXA6 = 'rnbqkb1r/3ppppp/p4n2/1PpP4/8/8/PP2PPPP/RNBQKBNR w KQkq - 0 5';
const LONDON_NXE4 = 'r4rk1/pp1n1ppp/2pqpn2/8/2PPN3/3Q1N2/PP3PPP/R4RK1 b - - 0 12';
const SCHLIEMANN_NXE5 = 'r1bqkbnr/pppp2pp/2n5/1B2N3/3Pp3/8/PPP2PPP/RNBQK2R b KQkq - 0 5';
const SCHLIEMANN_DXE4 = 'r1bqkbnr/ppp3pp/2n5/1B1pN3/4N3/8/PPPP1PPP/R1BQK2R b KQkq - 0 6';
const QGA_BXC4 = 'rnbqkb1r/ppp2ppp/4pn2/8/2pP4/4PN2/PP3PPP/RNBQKB1R w KQkq - 0 5';
const LONDON_BXD3 = 'rn2k2r/pp3ppp/2pqpn2/3p1b2/2PP4/2NBPN2/PP3PPP/R2QK2R b KQkq - 1 8';
const QID_BXF6 = 'r2qr1k1/2p3pp/np1ppb2/5pB1/p1PPb3/P4NP1/1P1QPPBP/2RR2K1 w - - 2 17';
const LONDON_QXE4 = 'r4rk1/pp1n1ppp/2pqpn2/8/2PPp3/2NQ1N2/PP3PPP/R4RK1 w - - 0 12';

describe('the one read of an exchange (material.exchangeEnd)', () => {
  it('…exd4 in the Philidor is taken straight back: level, and the pawn is gone', () => {
    const end = exchangeEnd(PHILIDOR_3, 'exd4');
    expect(end?.sans).toEqual(['Nxd4']);
    expect(end?.net).toBe(0);
    expect(end?.holds).toBe(false);
  });

  it('…Bxf1 in the Benko: the king takes back, so the bishop does not stay', () => {
    const end = exchangeEnd(BENKO_BXF1, 'Bxf1');
    expect(end?.sans).toEqual(['Kxf1']);
    expect(end?.pieceStays).toBe(false);
    expect(end?.net).toBe(0);
  });

  it('a capture nothing takes back ends with itself', () => {
    const end = exchangeEnd(QGA_BXC4, 'Bxc4');
    expect(end?.sans).toEqual([]);
    expect(end?.pieceStays).toBe(true);
    expect(end?.net).toBe(1);
  });

  it('a quiet move onto a guarded square holds', () => {
    const end = exchangeEnd(PHILIDOR_3, 'Nf6');
    expect(end?.sans).toEqual([]);
    expect(end?.holds).toBe(true);
  });
});

describe('two moves compared: the structure is read when the exchange is over (alsoGood)', () => {
  it('…exd4 leaves no doubled d-pawns: White takes back on d4 (Philidor, six lines)', () => {
    expect(moveDifference(PHILIDOR_3, 'Nf6', 'exd4', 'your', NO_LINES)?.kind).not.toBe('structure');
  });

  it('dxc5 leaves no doubled c-pawns: …Bxc5 takes back (London, five moves)', () => {
    expect(moveDifference(LONDON_8, 'Ngf3', 'dxc5', 'your', NO_LINES)?.kind).not.toBe('structure');
  });

  it('a pawn already doubled that steps forward is no new fault (…c5 with pawns on c7 and c4)', () => {
    expect(moveDifference(QGA_3, 'Nf6', 'c5', 'your', NO_LINES)?.kind).not.toBe('structure');
  });

  it('…dxc4 leaves no doubled c-pawns when the line it is read with wins the pawn back', () => {
    const follow = uciLine(QGD_2, ['dxc4', 'e3', 'Nf6', 'Bxc4']).slice(1);
    expect(moveDifference(QGD_2, 'e6', 'dxc4', 'their', { a: null, b: follow })?.kind).not.toBe('structure');
  });

  it('a bishop that is taken at once does nothing more from its square (Bxd6 against Bg3)', () => {
    expect(moveDifference(LONDON_7, 'Bg3', 'Bxd6', 'your', NO_LINES)?.kind).not.toBe('activity');
  });

  it('the structure is still said when it stands: bxc3 doubles the c-pawns, Nxc3 does not', () => {
    const d = moveDifference('4k3/8/8/8/8/2n5/1PPP4/1N2K3 w - - 0 1', 'Nxc3', 'bxc3', 'your', NO_LINES);
    expect(d?.kind).toBe('structure');
    expect(d?.text).toBe('Nxc3 keeps your pawns whole, and bxc3 leaves you doubled pawns on c3');
  });

  it('an isolated pawn that changes file by capturing is the same weak pawn, not a new one', () => {
    expect(moveDifference('4k3/8/8/8/8/2n5/1P6/1N2K3 w - - 0 1', 'Nxc3', 'bxc3', 'your', NO_LINES)?.kind).not.toBe('structure');
  });
});

describe('what a move does: nothing counted that the take-back removes (moveAspects)', () => {
  it('bxa6 creates no passed pawn on a6: …Bxa6 takes it next move — the passer that stands is the a2 pawn (Benko)', () => {
    const passer = aspectsOf(BENKO_BXA6, 'bxa6', false).find((a) => a.kind === 'aspect-passer');
    // True on the board the move leaves and on the board the exchange ends on,
    // whichever of their three pieces takes on a6: Black has no a- or b-pawn.
    expect(passer?.verb).toBe('creates a passed pawn on a2');
  });

  it('…Bxe4 opens no d-file: the knight can take back as well as the d-pawn (Sicilian, move 23)', () => {
    expect(aspectsOf('r2r4/pb4k1/1p5p/2p5/3bB3/2NP1R2/PPP4P/5R1K b - - 3 23', 'Bxe4', true).map((a) => a.kind)).not.toContain('aspect-opens-file');
  });

  it('exd5 opens the e-file even though …Qxd5 takes back: the file is open on the board the exchange ends on', () => {
    const files = aspectsOf('rnbqkbnr/ppp2ppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', 'exd5', false).find((a) => a.kind === 'aspect-opens-file');
    expect(files?.verb).toBe('opens the e-file');
  });

  it('…dxe4 does not win a knight when the line takes one straight back on c6 (Schliemann)', () => {
    const wins = aspectsOf(SCHLIEMANN_DXE4, 'dxe4', true, [['Nxc6', 'Qg5', 'Qe2']]).find((a) => a.kind === 'aspect-wins');
    expect(wins).toBeUndefined();
  });

  it('with no line known the board is all there is: the knight is taken and nothing retakes on e4', () => {
    const wins = aspectsOf(SCHLIEMANN_DXE4, 'dxe4', true, []).find((a) => a.kind === 'aspect-wins');
    expect(wins?.verb).toMatch(/wins a knight/);
  });

  it('a capture that only gets the gambit pawn back wins it back (QGA Bxc4)', () => {
    const wins = aspectsOf(QGA_BXC4, 'Bxc4', false).find((a) => a.kind === 'aspect-wins');
    expect(wins?.verb).toMatch(/wins a pawn back/);
    expect(wins?.verb).not.toMatch(/nothing can take back/);
  });
});

describe('a capture’s job is what it nets when the exchange is over (moveJob)', () => {
  it('…Nxe4 gets them no knight for the pawn: Qxe4 takes it back (London)', () => {
    const job = moveJob(LONDON_NXE4, 'Nxe4', 'b', THEIRS, { to: 'e4', captured: 'p', promoted: false }, []);
    expect(job?.clause ?? '').not.toMatch(/gets them a knight/);
  });

  it('…Nxe5 gets you no knight for the pawn: dxe5 takes it back (Schliemann)', () => {
    const job = moveJob(SCHLIEMANN_NXE5, 'Nxe5', 'b', MINE, { to: 'e5', captured: 'p', promoted: false }, []);
    expect(job?.clause ?? '').not.toMatch(/gets you a knight/);
  });

  it('Bxc4 costs you no pawn: it is the gambit pawn coming back (QGA)', () => {
    const job = moveJob(QGA_BXC4, 'Bxc4', 'w', THEIRS, null, []);
    expect(job?.clause ?? '').not.toMatch(/nothing can take back|costs you a pawn|free pawn/);
    expect(job?.clause ?? '').toMatch(/wins a pawn back/);
  });

  it('…dxe4 is no free knight when the line takes one back on c6 (Schliemann)', () => {
    const job = moveJob(SCHLIEMANN_DXE4, 'dxe4', 'b', MINE, null, [['Nxc6', 'Qg5', 'Qe2']]);
    expect(job).toBeNull();
  });

  it('a take-back that really comes out ahead is still said (Kxf7 after Nxf7: a knight for the pawn)', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7']) c.move(m);
    const job = moveJob(c.fen(), 'Kxf7', 'b', MINE, { to: 'f7', captured: 'p', promoted: false }, []);
    expect(job?.clause).toMatch(/gets you a knight for the pawn they took/);
  });
});

describe('a piece that is taken straight back aims at nothing', () => {
  it('…Bxd3 is not aimed at the c4 pawn: Qxd3 takes the bishop (London)', () => {
    expect(theirTarget({ fenBefore: LONDON_BXD3, san: 'Bxd3' }, true)).toBeNull();
  });

  it('Bxf6 is not aimed at the queen on d8: the bishop is taken (Queen’s Indian)', () => {
    expect(theirTarget({ fenBefore: QID_BXF6, san: 'Bxf6' }, true)).toBeNull();
  });

  it('the moved piece hits nothing from a square it is taken on', () => {
    expect(moveHit(BENKO_BXF1, 'Bxf1')).toBeNull();
  });

  it('a piece that stays still aims: Bg5 at the knight it pins', () => {
    const c = new Chess();
    for (const m of ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6']) c.move(m);
    expect(theirTarget({ fenBefore: c.fen(), san: 'Bg5' }, true)?.square).toBe('f6');
  });
});

describe('the board teacher credits nothing to a piece the take-back removes', () => {
  it('…Bxf1 goes after no pawn on g2: Kxf1 takes the bishop (Benko, three lines)', () => {
    expect(buildReviewMoveTeachingFact(BENKO_BXF1, 'Bxf1', true, null)?.text ?? '').not.toMatch(/g2/);
  });

  it('Kxf1 is a forced take-back, not a step toward safety (Benko, three lines)', () => {
    expect(buildReviewMoveTeachingFact(BENKO_KXF1, 'Kxf1', false, null)?.text ?? '').not.toMatch(/safety/);
  });

  it('…Nxe4 bears down on nothing: the knight is taken on e4 (London)', () => {
    expect(buildReviewMoveTeachingFact(LONDON_NXE4, 'Nxe4', false, null)).toBeNull();
  });
});

describe('a line that only gets material back wins it back', () => {
  it('Nxe4 …Nxe4 Qxe4 after …dxe4: the pawn comes back, no pawn is won (London)', () => {
    const proof = moverLineProof(LONDON_QXE4, uciLine(LONDON_QXE4, ['Nxe4', 'Nxe4', 'Qxe4']), 'w');
    expect(proof?.short ?? '').not.toMatch(/you win a pawn$/);
    expect(proof?.short ?? '').toMatch(/you win a pawn back$/);
  });

  it('a line that wins material from a level board still wins it', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4']) c.move(m);
    // Not a claim about theory: a line whose ledger is one pawn up, from level.
    const proof = moverLineProof(c.fen(), uciLine(c.fen(), ['Nxe5', 'Ne6', 'd3']), 'w');
    expect(proof?.short ?? '').toMatch(/you win a pawn$/);
  });
});

// ── The Queen's Gambit sheet (appended to the log while this work was on) ──
const QG_EXCHANGE_B5 = 'r1bqr1k1/1p3ppp/2pb1nn1/3p2B1/1P1P4/2NBPN2/2Q2PPP/1R3RK1 w - - 1 15';
const QG_EXCHANGE_B4 = 'r1bqr1k1/1p2bppp/2p2nn1/p2p2B1/3P4/P1NBPN2/1PQ2PPP/1R3RK1 w - - 1 13';
const QG_EXCHANGE_AXB4 = 'r1bqr1k1/1p2bppp/2p2nn1/p2p2B1/1P1P4/P1NBPN2/2Q2PPP/1R3RK1 b - - 0 13';
const QG_BXE7 = 'rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9';

describe('a pawn state is credited to the move that made it', () => {
  it('b5 concedes no isolated pawn: the b-pawn was isolated on b4 before it moved (Exchange QGD)', () => {
    expect(aspectsOf(QG_EXCHANGE_B5, 'b5', true).map((a) => a.kind)).not.toContain('aspect-own-weakness');
  });

  it('…dxc4 concedes no doubled c-pawns in a line that takes the pawn back three moves on', () => {
    const kinds = aspectsOf(QGD_2, 'dxc4', false, [['e3', 'Nf6', 'Bxc4', 'e6']]).map((a) => a.kind);
    expect(kinds).not.toContain('aspect-own-weakness');
    // With no line known the board is all there is, and on it the pawns are doubled.
    expect(aspectsOf(QGD_2, 'dxc4', false).map((a) => a.kind)).toContain('aspect-own-weakness');
  });

  it('…axb4 isolates no a-pawn: it takes back on b4 next move (Exchange QGD)', () => {
    expect(buildReviewMoveTeachingFact(QG_EXCHANGE_AXB4, 'axb4', false, null)?.text ?? '').not.toMatch(/a-pawn is isolated/);
  });
});

describe('a pawn break opens what is open when the trade is over', () => {
  it('b4: after …axb4 the a-pawn can take back, so the b-file is not what opens', () => {
    // The a-pawn takes back in the lesson's line, but a piece can take on b4
    // too, so which file opens is their choice of capturer: neither is named.
    const text = pawnBreak(QG_EXCHANGE_B4, 'b4', 'your', null)?.text ?? '';
    expect(text).not.toMatch(/b-file/);
  });
});

describe('a fork by a piece that is taken straight back is no fork', () => {
  it('Bxe7 hits no queen and rook "at once": …Qxe7 takes the bishop (Queen’s Gambit, two lines)', () => {
    const job = moveJob(QG_BXE7, 'Bxe7', 'w', MINE, null, []);
    expect(job?.kind).not.toBe('fork');
  });
});

describe('a tactic is landed by a piece that stays to make it', () => {
  it('Bxf6 lands no pin: …gxf6 takes the bishop next move (Ponziani)', () => {
    expect(aspectsOf('r1bqk2r/pp1pnppp/1b3n2/3p2B1/4P3/2N2N2/PP3PPP/R2QKB1R w KQkq - 0 10', 'Bxf6', true).map((a) => a.kind)).not.toContain('aspect-tactic-lands');
  });

  it('a pin by a piece nothing takes is still landed (Qa4 pins the knight on c6 to the king)', () => {
    expect(aspectsOf('r1bqkbnr/ppp2ppp/2n5/3pp3/4P3/2P2N2/PP1P1PPP/RNBQKB1R w KQkq - 0 4', 'Qa4', true).map((a) => a.kind)).toContain('aspect-tactic-lands');
  });
});

describe('a fact that only restates the board never silences the one that says why', () => {
  it('…Bxe4 (taken straight back) still says the trade is a good one — "it trades bishops" does not stand in for it', () => {
    const games = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: (ReplayGame & { id: string })[] }).games;
    const p = replayPlies(games.find((g) => g.id === 'sicilianClosed1000')!)[45];
    expect(p.san).toBe('Bxe4');
    const said = lessonThought({ theory: true,
      fenBefore: p.fenBefore, san: p.san, prev: p.prev, moverIsStudent: p.own, line: p.line, theirLast: p.theirLast, history: p.history,
      reads: { before: linesOf(p.before), after: linesOf(p.after), passBefore: [], passAfter: [] }, costCp: p.costCp,
    }, newLessonVoice(), null);
    expect(said).toContain('Bxe4 is a good trade — it takes off their bishop that was bearing down on your king.');
    expect(said).not.toMatch(/lands a pin/);
  });
});

describe('a quiet move starts no exchange', () => {
  it('f4 opens no f-file: it is a pawn push, and whether …Qxf4 takes it is theirs to choose (Schliemann, move 9)', () => {
    expect(aspectsOf('r1b1kb1r/ppp3pp/2N2n2/1B4q1/4p3/8/PPPPQPPP/R1B1K2R w KQkq - 3 9', 'f4', false).map((a) => a.kind)).not.toContain('aspect-opens-file');
  });
});

describe('a discovery in waiting is set up, never landed', () => {
  it('Nxc6 lands no discovered attack: the knight stepped in front of its bishop, nothing was uncovered (Schliemann)', () => {
    const kinds = (moveAspects({ fenBefore: 'r1bqkbnr/ppp3pp/2n5/1B2N3/4p3/8/PPPP1PPP/R1BQK2R w KQkq - 0 7', san: 'Nxc6', prev: NO_PREV_CAPTURE, moverIsStudent: false, follow: [] })?.aspects ?? []).map((a) => a.kind);
    expect(kinds).not.toContain('aspect-tactic-lands');
  });
});

describe('a file runs toward the king only when it reaches it', () => {
  it('…dxc6 half-opens the d-file, and not "toward your king": the king is on e1 behind its own d-pawn (Stafford)', () => {
    const t = buildReviewMoveTeachingFact('r1bqkb1r/pppp1ppp/2N2n2/8/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 4', 'dxc6', false, null)?.text ?? '';
    expect(t).toBe('Half-opens the d-file for the rooks.');
  });

  it('fxe3 half-opens the f-file, and not "toward their king" on e8 behind the f7 pawn (Stafford)', () => {
    const t = buildReviewMoveTeachingFact('r2qkb1r/pppb1ppp/2n5/8/Q7/2N1nN2/PPP2PPP/2KR1B1R w kq - 0 11', 'fxe3', true, null)?.text ?? '';
    expect(t).toBe('Half-opens the f-file for the rooks.');
  });

  it('a file their king stands on still runs toward it (…gxf6 half-opens the g-file with the king on g1)', () => {
    const t = buildReviewMoveTeachingFact('r1bqk2r/ppp2ppp/2np1B2/2b1p3/2B1P3/3P1N2/PPP2PPP/RN1Q1RK1 b kq - 0 7', 'gxf6', false, null)?.text ?? '';
    expect(t).toMatch(/^Half-opens the g-file for the rooks, toward your king/);
  });
});
