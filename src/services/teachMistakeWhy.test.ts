import { describe, expect, it } from 'vitest';
import { callInaccuracyDetailed, errorWhy, errorGradeSentence, pastBetterNameable, NO_SECOND_READ } from './inaccuracyCall';
import { bestMoveReason } from './deliberation';
import { quietMovePoint } from './reviewMoveTeaching';
import { slipQuestion } from './learnBoardTeaching';
import { slipCause } from './slipCause';
import { pvUciToSan } from './principleAttribution';

// David's Learn game, 2026-10-20 (Caro-Kann, Fantasy): 13.Bc3 was graded
// nothing on his phone and taught nothing. He asked for "what Bc3 allowed
// (Ne5 and the fork threat on e3), what the better move did, and the habit
// that catches it next time". Engine (depth 18): 13.a4 +0.73, 13.Bc3 −0.15,
// best reply …Ne5 (Bb5+ Bd7 f4 Ng4, aiming the knight at e3).
const BEFORE = 'r1b1kb1r/pp1n1ppp/1q2p3/3p4/3P4/3B1P2/PPPBN1PP/R2Q1RK1 w kq - 2 13';
const AFTER = 'r1b1kb1r/pp1n1ppp/1q2p3/3p4/3P4/2BB1P2/PPP1N1PP/R2Q1RK1 b kq - 3 13';
const BEST = 'a2a4 f8d6 d1e1 a7a5 g1h1 b6d8 e2c3 e8g8'.split(' ');
const REPLY = 'd7e5 d3b5 c8d7 f3f4 e5g4 b5d7 e8d7 f1f3'.split(' ');

const why = (playedSan: string, replyLineUci: string[], namesBetterMove: boolean) => errorWhy({ costCp: null, 
  secondReads: NO_SECOND_READ,
  fenBefore: BEFORE, playedSan, moverColor: 'white', bestSan: 'a4', bestLineUci: BEST, replyLineUci,
  missedMate: null, allowedMate: null, bestMate: null, quality: 'inaccuracy', priorMove: null,
  replySan: null, namesBetterMove,
});

describe('a mistake turn says what the move allowed, what the better move did, and the habit', () => {
  it('what Bc3 allowed: the bishop left e3, and …Ne5 puts the knight two moves from a fork there', () => {
    const ew = why('Bc3', REPLY, false);
    expect(ew.failed).toBe('Your bishop was guarding e3 — once it left, …Ne5 puts their knight two moves from e3, where it forks your queen on d1 and your rook on f1.');
    expect(ew.guardLeft).toBe('e3');
  });

  it('a move that keeps the bishop home does not get the claim (the same …Ne5 forks nothing)', () => {
    expect(why('Kh1', REPLY, false).failed).toBeNull();
    expect(why('Qe1', REPLY, false).failed).toBeNull();
  });

  it('what the better move did: a4 prepares a5 against the queen that pins d4', () => {
    expect(bestMoveReason(BEFORE, 'a4', 'w', { mateIn: null, opponentLastSan: 'Qb6' }))
      .toBe('prepares a5 to kick their queen off b6 and free your pawn on d4 from the pin');
    const said = errorGradeSentence(why('Bc3', REPLY, true), 'inaccuracy', 88);
    expect(said).toContain('a4 was the move — it would prepare a5 to kick their queen off b6 and free your pawn on d4 from the pin.');
    expect(said).not.toMatch(/grab space/);
  });

  it('the same reader teaches the move when the student plays it', () => {
    expect(quietMovePoint(BEFORE, 'a4')).toBe('Prepares a5, which would kick their queen off b6 — the queen pinning your pawn on d4.');
  });

  it('under a mistake\'s cost the grade speaks only on a mechanism, never on a bare cost', () => {
    const call = (replyLineUci: string[]) => callInaccuracyDetailed({
      secondReads: NO_SECOND_READ,
      namesBetterMove: false, fenBefore: BEFORE, playedSan: 'Bc3', bestSan: 'a4', bestLineUci: BEST, cpLoss: 88,
      missedMate: null, bestMate: null, allowedMate: null, moverEvalAfterCp: -15,
      scores: { bestWhiteCp: 73, playedWhiteCp: -15 }, side: 'student', moverColor: 'white',
      replyLineUci, replySan: null, replyKeptWin: null, priorMove: null,
    });
    const v = call(REPLY);
    expect(v.call?.said).toMatch(/^Bc3 was imprecise\. Your bishop was guarding e3/);
    expect(v.call?.guardLeft).toBe('e3');
    expect(call([]).declined).toBe('under-the-floor');
  });

  it('the better move is named only when it is no longer the student\'s to find', () => {
    // After …Ne5 the engine's move for White is Bb5+, not a4: a4 is past.
    expect(pastBetterNameable(BEFORE, 'Bc3', 'a4', REPLY, null)).toBe(true);
    // When the engine's next move for the student IS the better move, it waits.
    expect(pastBetterNameable(BEFORE, 'Bc3', 'a4', ['d7e5', 'a2a4'], null)).toBe(false);
    // A reply off the engine's line, or no line at all: unknown holds the move.
    expect(pastBetterNameable(BEFORE, 'Bc3', 'a4', REPLY, 'Bd6')).toBe(false);
    expect(pastBetterNameable(BEFORE, 'Bc3', 'a4', null, null)).toBe(false);
  });

  it('the habit: before a piece moves, what is it guarding (said once a game)', () => {
    const said = new Set<string>();
    const q = slipQuestion(BEFORE, 'Bc3', undefined, 'w', said, 0, 'e3');
    expect(q?.text).toBe('The question that catches this: before a piece moves, ask what it is guarding.');
    expect(slipQuestion(BEFORE, 'Bc3', undefined, 'w', said, 1, 'e3')).toBeNull();
  });

  it('the record files it as their threat, with the same words — not "your pieces reach fewer squares"', () => {
    const cause = slipCause({
      fen: BEFORE, playedSan: 'Bc3', bestSan: 'a4', pvAfterPlayed: pvUciToSan(AFTER, REPLY), pvAfterBest: [],
      evalBefore: 73, evalAfterPlayed: -15, phase: 'middlegame',
    });
    expect(cause?.tag).toBe('missed-opponents-threat');
    expect(cause?.coachNote).toContain('guarding e3');
  });
});

describe('the better move answers what the mistake allowed (Learn audit 2026-10-20)', () => {
  // Scandinavian, 6…Nc6 let h3xg4 take the bishop. The better move's reason
  // was "it would walk the bishop on g4 round to g6, by way of f5" — a route,
  // not what Bf5 did about the pawn.
  const B6 = 'rn2kb1r/ppp1pppp/5n2/q7/3P2b1/2N2N1P/PPP2PP1/R1BQKB1R b KQkq - 0 6';
  const BF5 = 'g4f5 g2g4 f5g6 f3e5 e7e6 h3h4 b8c6 e5c4'.split(' ');
  const AFTER_NC6 = 'h3g4 e8c8 f1d3 f6g4 c1d2 g7g6 c3b5 c6b4'.split(' ');
  const ew = (bestSan: string, bestLine: string[]) => errorWhy({ costCp: null, 
    secondReads: NO_SECOND_READ,
    fenBefore: B6, playedSan: 'Nc6', moverColor: 'black', bestSan, bestLineUci: bestLine, replyLineUci: AFTER_NC6,
    missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null,
    replySan: null, namesBetterMove: true,
  });
  it('Bf5 moves the bishop off g4 before their pawn takes it', () => {
    // Move 6 draws the third of the four rotated phrasings.
    expect(ew('Bf5', BF5).better).toBe('Bf5 was the move — it would rescue the bishop on g4 — their pawn was about to take it.');
  });
  it('the rescue reason rotates by move number, so one game never says it the same way three times running (prod Learn 2026-10-28)', () => {
    const at = (fullmove: number) => errorWhy({ costCp: null, 
      secondReads: NO_SECOND_READ,
      fenBefore: B6.replace(/ 6$/, ` ${fullmove}`), playedSan: 'Nc6', moverColor: 'black', bestSan: 'Bf5', bestLineUci: BF5, replyLineUci: AFTER_NC6,
      missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, replySan: null, namesBetterMove: true,
    }).better ?? '';
    const said = [6, 7, 8, 9].map(at);
    expect(new Set(said).size).toBe(4);
    for (const s of said) expect(s).toMatch(/^Bf5 was the move — it would .*bishop.*g4.*pawn/);
    expect(at(6)).toBe(at(6));
  });
  it('a better move that takes something is left to the other readers', () => {
    expect(ew('Bxf3', 'g4f3 d1f3 c7c6'.split(' ')).better ?? '').not.toMatch(/off g4 before/);
  });
});

describe('the book question is posed from the openings DB (heat map, 2026-10-20)', () => {
  it('a student move still in book is a question the board asked; past the window it is not', async () => {
    const { capabilityPliesFromAnnotations } = await import('./autoAnalyzeGame');
    const { Chess } = await import('chess.js');
    const sans = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7'.split(' ');
    const c = new Chess();
    const fens = [c.fen()];
    const annotations = sans.map((san, i) => {
      c.move(san);
      fens.push(c.fen());
      return { moveNumber: Math.floor(i / 2) + 1, color: (i % 2 === 0 ? 'white' as const : 'black' as const), san, evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'book' as const, comment: null };
    });
    const plies = capabilityPliesFromAnnotations(annotations, 'white', fens);
    const asked = (ply: number): boolean => !!plies.find((p) => p.fenBefore === fens[ply])?.alsoPosed?.some((q) => q.tag === 'left-book-early');
    expect(asked(6)).toBe(true);   // 4.Ba4 — the Ruy is theory here
    expect(asked(2)).toBe(false);  // 2.Nf3 — too early to leave book
  });
});
