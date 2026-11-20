// THE PICTURE'S CONCLUSIONS, RECORDED (WO-PICTURE-01, both ways): the target,
// the plan's target and their counterplay are spoken by the picture computers;
// the move the student played answers them (held), leaves them at a cost
// (missed), or answers a different question (no evidence). Real boards: the
// counterplay and plan boards of `pictureLedger.test.ts`, and Danya's
// endgame-attacks #3 (audit-reports/danya-havecheck, its stored engine line).
import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { buildPicture } from './positionPicture';
import { ledgerOf, pictureAnswers, pictureConclusions, planTargetOf } from './pictureLedger';
import { positionPosed } from './moveInsight';
import { capabilityOutcomes, recordCapabilityEvidence, summariseEvidence } from './capabilityEvidence';
import { db } from '../db/schema';
import type { CoachFact } from './coachFact';
import type { EngineLine } from './engineLineRead';

const fact = (id: string, computer: string, fen: string, squares: string[]): CoachFact =>
  ({ id, computer, fen, squares, claims: [], text: `${id}.` } as unknown as CoachFact);
const uci = (fen: string, san: string): string => { const m = new Chess(fen).move(san); return `${m.from}${m.to}`; };

// Black to move; White's c2–c4 break is named by a fact, and …d4 (the best
// line) takes the lever away before it is played.
const BREAK = '4k3/8/8/3p4/8/8/2P5/4K3 b - - 0 1';
const BREAK_FACTS = [fact('test:break-c4', 'pawnBreak', BREAK, ['c4', 'd5'])];
const BREAK_LINES: EngineLine[] = [{ moves: ['d5d4', 'e1d2', 'e8d7'], cp: 0, mate: null }];
const breakConclusions = () => pictureConclusions(BREAK_FACTS, BREAK, BREAK_LINES)!;

// White to move; the a6 pawn is won by the knight in four moves, nothing of
// Black's can guard it in time.
const FAR = '7k/8/p7/8/8/8/8/6NK w - - 0 1';
const FAR_FACTS = [fact('test:a6', 'attackerDefenderCount', FAR, ['a6'])];

describe('their counterplay', () => {
  it('held: the move played kills the break (…d4 takes the lever away)', () => {
    expect(pictureAnswers(breakConclusions(), BREAK, 'd5d4', 'd5d4', 0)).toEqual([{ skill: 'allowed-counterplay', outcome: 'held' }]);
  });
  it('missed: a king move leaves the break on, and it cost', () => {
    expect(pictureAnswers(breakConclusions(), BREAK, uci(BREAK, 'Kd7'), 'd5d4', 120)).toEqual([{ skill: 'allowed-counterplay', outcome: 'broken' }]);
  });
  it('no evidence: the same move off the break, clean, answered another question', () => {
    expect(pictureAnswers(breakConclusions(), BREAK, uci(BREAK, 'Kd7'), 'd5d4', 10)).toEqual([]);
  });
  it('not posed: where the best line does not kill the break on the spot, nothing is asked', () => {
    const late: EngineLine[] = [{ moves: ['e8d7', 'e1d2', 'd5d4'], cp: 0, mate: null }];
    const c = pictureConclusions(BREAK_FACTS, BREAK, late)!;
    expect(pictureAnswers(c, BREAK, uci(BREAK, 'Kd7'), 'e8d7', 300)).toEqual([]);
  });
});

describe('the plan\'s target', () => {
  const plan = () => planTargetOf(ledgerOf(buildPicture(FAR_FACTS), FAR)!, 'w')!;
  const firstStep = () => `g1${plan().best.decisive!.route[0]}`;
  it('held: the move played is the knight\'s first step on its route to a6', () => {
    const c = pictureConclusions(FAR_FACTS, FAR, [{ moves: [firstStep()], cp: 0, mate: null }])!;
    expect(pictureAnswers(c, FAR, firstStep(), firstStep(), 0)).toEqual([{ skill: 'missed-plan-route', outcome: 'held' }]);
  });
  it('missed: a king move that cost leaves the plan unstarted', () => {
    const c = pictureConclusions(FAR_FACTS, FAR, [{ moves: [firstStep()], cp: 0, mate: null }])!;
    expect(pictureAnswers(c, FAR, 'h1h2', firstStep(), 90)).toEqual([{ skill: 'missed-plan-route', outcome: 'broken' }]);
    expect(pictureAnswers(c, FAR, 'h1h2', firstStep(), 0)).toEqual([]);
  });
  it('not posed: when the best move is not on the route, the plan is not what the board asked', () => {
    const c = pictureConclusions(FAR_FACTS, FAR, [{ moves: ['h1h2'], cp: 0, mate: null }])!;
    expect(pictureAnswers(c, FAR, 'h1g2', 'h1h2', 200)).toEqual([]);
  });
  it('seat-checked: the board of the other side to move poses nothing to the student', () => {
    const blackToMove = FAR.replace(' w ', ' b ');
    const c = pictureConclusions([fact('test:a6', 'attackerDefenderCount', blackToMove, ['a6'])], blackToMove, [{ moves: ['h8g8'], cp: 0, mate: null }]);
    expect(c ? pictureAnswers(c, blackToMove, 'h8h7', 'h8g8', 200) : []).toEqual([]);
  });
});

describe('the one scoring of a move', () => {
  // Danya's endgame-attacks #3: White's target is the b5 pawn, and the best
  // line's Be2 brings the bishop at it.
  const ENDGAME = '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29';
  const ENDGAME_LINE = ['f1e2', 'b7e7', 'e2b5', 'a4a3', 'b2a3', 'e7a3', 'd4d8', 'g8h7', 'd8d2', 'a3c5'];
  const picture = (san: string, cpLoss: number | null) =>
    positionPosed(ENDGAME, { bestLine: ENDGAME_LINE, played: { san, cpLoss } }).filter((p) => p.tag === 'missed-weak-target');
  it('held: Be2, the move that brings one more unit at b5, through the record\'s own read', () => {
    expect(picture('Be2', 0)).toEqual([{ tag: 'missed-weak-target', posedImportance: 60 }]);
  }, 30000);
  it('missed: Kg2 adds nothing at b5, and it cost', () => {
    expect(picture('Kg2', 120)).toEqual([{ tag: 'missed-weak-target', posedImportance: 60, outcome: 'broken' }]);
  }, 30000);
  it('no evidence: Kg2 played clean answered another question; with no move played, nothing is posed', () => {
    expect(picture('Kg2', 0)).toEqual([]);
    expect(positionPosed(ENDGAME, { bestLine: ENDGAME_LINE }).some((p) => p.tag === 'missed-weak-target')).toBe(false);
  }, 30000);

  it('a missed conclusion stays broken on a costly move whose slip was about something else', () => {
    const rows = capabilityOutcomes({
      fenBefore: BREAK, playedSan: 'Kd7', moverColor: 'black', cpLoss: 250, slipTag: 'hung-material', bestSan: 'd4',
      alsoPosed: [{ tag: 'allowed-counterplay', posedImportance: 65, outcome: 'broken' }],
    });
    expect(rows.find((r) => r.tag === 'allowed-counterplay')?.outcome).toBe('broken');
  });

  it('a held conclusion on a clean move is held', () => {
    const rows = capabilityOutcomes({
      fenBefore: BREAK, playedSan: 'd4', moverColor: 'black', cpLoss: 0, bestSan: 'd4',
      alsoPosed: [{ tag: 'allowed-counterplay', posedImportance: 65 }],
    });
    expect(rows.find((r) => r.tag === 'allowed-counterplay')?.outcome).toBe('held');
  });
});

describe('prompted counts neither way', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });
  it('a held row the coach prompted is written, and the profile does not read it', async () => {
    const n = await recordCapabilityEvidence({
      fenBefore: BREAK, playedSan: 'd4', moverColor: 'black', cpLoss: 0, bestSan: 'd4', origin: 'play', prompted: true,
      alsoPosed: [{ tag: 'allowed-counterplay', posedImportance: 65 }],
    });
    expect(n).toBeGreaterThan(0);
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.some((r) => r.tag === 'allowed-counterplay' && r.prompted)).toBe(true);
    expect(summariseEvidence(rows, []).get('allowed-counterplay')).toBeUndefined();
  });
});
