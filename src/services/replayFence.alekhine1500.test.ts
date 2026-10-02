// Hand walk 2026-09-27 — Alekhine Four Pawns, student White at 1500, a game
// Naroditsky teaches move by move (vc-1rcEbI44WqE). Each flag pinned on the
// real board it was heard on.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { strategicWhyLed, strategicClaims } from './moveFundamentals';
import { betterMoveReason } from './inaccuracyCall';
import { detectBehaviors } from './danyaBehaviors';
import { detectLatentDanger, latentDangerClause } from './latentDanger';
import { detectTactics } from './tacticsDetector';
import { gapEchoedByVerdict } from './opponentGap';
import { callInaccuracy } from './inaccuracyCall';
import { conceptInstanceKey } from './conceptKey';

const GAME = 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 Qd7 Nf3 Bg4 Be2 O-O-O c5 Nd5 Nxd5 Qxd5 Kf2 e6 h3 Bf5 Qa4 Qe4 Qa3 Qc2 b4 Be7 b5 Nb8 Qxa7 Bd3 Rhe1 Bxb5 Rab1 Qa4 Qxa4 Bxa4 Nd2 f6 Nc4 Bc6 Bf3 fxe5 Nxe5 Rhf8 Kg3 Bxf3 Nxf3 Nc6 Bf2 Rf6 Re4 Rd5 Rbe1 Kd7 Kh2 h6 Bg3 g5 Be5 Nxe5'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const s of GAME.slice(0, n)) c.move(s); return c.fen(); };

describe('Alekhine 1500 hand walk — the flags stay fixed', () => {
  it('Be5 with …Nxe5 on is a trade offer, never "lands on the e5 outpost" (ply 67)', () => {
    expect(strategicWhyLed(fenAt(66), 'Be5', 'white') ?? '').not.toMatch(/outpost/);
  });
  it('one battery on e6 is one claim, whichever back square the stack uses (ply 61)', () => {
    expect(conceptInstanceKey('battery', ['e1', 'e4', 'e6'])).toBe(conceptInstanceKey('battery', ['e2', 'e4', 'e6']));
    expect(conceptInstanceKey('fork', ['a', 'b'])).not.toBe(conceptInstanceKey('fork', ['a', 'c']));
  });
  it('the Learn memory is reset only by the board going backwards — no mid-turn "length <= 2" reset (ply 5)', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).not.toMatch(/chainHistory\.length\s*<=\s*2\)\s*\{\s*resetPerGameMemory\(\)/);
  });
});

describe('back rank (Alekhine ply 75)', () => {
  it('no "back rank can be invaded" when the only check lands on a square the bishop covers', () => {
    const t = detectTactics('3k4/1pprb3/4p1r1/2P3pp/3PR3/4N2P/P5PK/5R2 w - - 2 39').tactics;
    expect(t.some((x) => x.type === 'back_rank')).toBe(false);
  });
});

describe('one move, one voice (Alekhine ply 79)', () => {
  it('the gap line stands down when a concept already tells the same fork', () => {
    const fork = { kind: 'concept', text: 'After Ne5, your knight on e5 forks their rook on d7 and their rook on g6.', squares: ['e5', 'd7', 'g6'] };
    expect(gapEchoedByVerdict('Ne5', [fork], 'e5')).toBe(true);
    expect(gapEchoedByVerdict('Ne5', [fork], 'c5')).toBe(false);
  });
});

describe('the reason must be what the played move did NOT do (Alekhine ply 37)', () => {
  // 19.Qxa7?? took the a-pawn; "Rhc1 was the move — it would win a pawn" said
  // right after it is no reason at all.
  const fen = '1nkr3r/ppp1bppp/4p3/1PP1Pb2/3P4/Q3BN1P/P1q1BKP1/R6R w - - 1 19';
  const line = ['h1c1', 'c2e4', 'a3a7', 'b8d7'];
  it('no "win a pawn" when the played move already took a pawn', () => {
    expect(betterMoveReason(fen, 'Qxa7', 'Rhc1', line, 'white', null) ?? '').not.toMatch(/win a pawn/);
  });
  it('NEGATIVE CONTROL: a quiet played move still hears it', () => {
    expect(betterMoveReason(fen, 'Kg1', 'Rhc1', line, 'white', null)).toMatch(/win a pawn/);
  });
});

describe('one pawn break, one saying (Alekhine ply 75)', () => {
  // "g4 is the pawn break that cracks the position open" then, one breath
  // later, "The plan here: grab space on the kingside with g4".
  const fen = '3k4/1pprb3/4p1r1/2P3pp/3PR3/4N2P/P5PK/5R2 w - - 2 39';
  it('the behaviour and the plan clause carry the same claim key', () => {
    const brk = detectBehaviors({ fen, studentColor: 'white' }).find((h) => h.id === 'pawn-break');
    expect(brk?.keys).toContain('break-g4');
    expect(strategicClaims(fen, 'g4', 'white')).toContain('break-g4');
  });
});

describe('a pin in waiting names the line (Alekhine plies 19 + 33)', () => {
  it('names their bishop, the knight holding the line shut, and what moving it does', () => {
    const d = detectLatentDanger('2kr1b1r/pppqpppp/1nn5/4P3/2PP2b1/2N1BN2/PP2B1PP/R2QK2R w KQ - 9 11', 'w', { latentOnly: true });
    expect(latentDangerClause(d!)).toBe('heads up: their bishop on g4 looks through your knight on f3 at your bishop on e2 and your queen behind it — move the knight and the bishop is pinned.');
  });
  it('a pawn pinned in waiting is not an alarm', () => {
    const d = detectLatentDanger('2kr3r/ppp1bppp/2n1p3/2P1Pb2/1P1P4/Q3BN1P/P1q1BKP1/R6R w - - 1 18', 'w', { latentOnly: true });
    expect(d?.frontPiece).not.toBe('p');
  });
});

describe('removal of the defender needs something left to win (Alekhine ply 41)', () => {
  it('Qxa4 Bxa4 is a queen trade, not a removal: the bishop recaptures and leaves', () => {
    const t = detectTactics('1nkr3r/Qpp1bppp/4p3/1bP1P3/q2P4/4BN1P/P3BKP1/1R2R3 w - - 2 22').tactics;
    expect(t.some((x) => x.type === 'removal_of_guard' && x.involvedSquares.includes('a4'))).toBe(false);
  });
});

describe('a trade is not an entry (Alekhine ply 49)', () => {
  it('"it let them in with Bxf3" is not said of a bishop trade', () => {
    const call = callInaccuracy({ priorMove: null,
      fenBefore: '1nkr3r/1pp1b1pp/2b1pp2/2P1P3/2NP4/4B2P/P3BKP1/1R2R3 w - - 2 25',
      playedSan: 'Bf3', bestSan: 'Rb4', bestLineUci: ['b1b4', 'f6e5', 'c4e5', 'c6d5'],
      cpLoss: 150, missedMate: null, allowedMate: null, moverEvalAfterCp: 50,
      side: 'student', moverColor: 'white',
      replyLineUci: ['c6f3', 'g2f3', 'f6e5', 'd4e5'], replySan: 'fxe5',
    });
    expect(call?.said ?? '').not.toMatch(/in with Bxf3/);
  });
});
