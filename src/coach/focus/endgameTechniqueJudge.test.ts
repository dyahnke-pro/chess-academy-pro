import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { ENDGAME_MISS_LINE, judgeEndgameMove } from './endgameTechniqueJudge';
import { FOCUS_IDLE, stepFocus, type FocusEffect, type FocusRunState } from './focusRunner';
import { planPhases, pregameLine } from './focusRotation';
import type { FocusSetup } from './focusSetup';
import { focusTradesScorer, TRADE_LEAD_CP } from '../../missions/scorers/focusTrades';
import type { ScoringContext } from '../../missions/moveScoring';

// Real endings from the pro game references (public/data/pro-game-references.json),
// each read by native Stockfish (depth 12, five lines) — the read is stored here.
/** pgref-aman-anti-caro-two-knights-bg4-deep-0173, move 60: White's a-pawn is
 *  passed and a5-a6 is the move; the game played g5. */
const A_PASSER = '4k3/8/7p/P4K2/6P1/6P1/5P2/8 w - - 3 60';
const A_PASSER_READ = [
  { moves: ['a5a6', 'e8d8', 'a6a7', 'd8c7'], evaluation: 867, mate: null },
  { moves: ['f5g6', 'e8d7', 'f2f4', 'd7c7'], evaluation: 717, mate: null },
  { moves: ['f2f4', 'e8d8', 'f5g6', 'd8d7'], evaluation: 703, mate: null },
  { moves: ['g4g5', 'h6g5', 'a5a6', 'e8d7'], evaluation: 695, mate: null },
  { moves: ['f2f3', 'e8d8', 'a5a6', 'd8c7'], evaluation: 665, mate: null },
];
/** pgref-aman-caro-kann-variation-1-nf3-0005, move 40: Black pushed the c-passer. */
const C_PASSER = '8/RB3p2/1p2pk1p/2p1r1p1/8/7P/6PK/8 b - - 3 40';
const C_PASSER_READ = [
  { moves: ['c5c4', 'h2g3', 'e5c5', 'b7e4'], evaluation: -248, mate: null },
  { moves: ['b6b5', 'b7a6', 'c5c4', 'a7c7'], evaluation: -144, mate: null },
  { moves: ['e5e1', 'b7c6', 'c5c4', 'c6e8'], evaluation: -70, mate: null },
  { moves: ['e5f5', 'b7a6', 'f6e5', 'a7c7'], evaluation: -69, mate: null },
  { moves: ['g5g4', 'a7a6', 'b6b5', 'h3g4'], evaluation: -66, mate: null },
];
/** The same game, move 44: …Ke5 brings the king in; the game played …Rc3. */
const KING_IN = '8/5p2/1p2pk1p/2r3p1/8/5BKP/2p3P1/2R5 b - - 1 44';
const KING_IN_READ = [
  { moves: ['f6e5', 'f3h5', 'b6b5', 'h5f7'], evaluation: -482, mate: null },
  { moves: ['f6f5', 'g3f2', 'f5f4', 'f3h5'], evaluation: -240, mate: null },
  { moves: ['c5c3', 'g3f2', 'f6e5', 'f2e1'], evaluation: -208, mate: null },
  { moves: ['c5c4', 'g3f2', 'f6e5', 'f2e3'], evaluation: -169, mate: null },
  { moves: ['b6b5', 'f3e4', 'b5b4', 'c1c2'], evaluation: -150, mate: null },
];

describe('the endgame focus: technique, scored both ways on real endings', () => {
  it('g5 instead of a6: the passed pawn left sitting — a miss, taught as the habit', () => {
    expect(judgeEndgameMove(A_PASSER, 'g5', A_PASSER_READ)).toEqual([{ tag: 'passed-pawn-neglected', outcome: 'broken', line: ENDGAME_MISS_LINE['passed-pawn-neglected'] }]);
  });
  it('twin: a6 itself holds it', () => {
    expect(judgeEndgameMove(A_PASSER, 'a6', A_PASSER_READ)).toEqual([{ tag: 'passed-pawn-neglected', outcome: 'held', line: null }]);
  });
  it('…c4 pushes the passer — held', () => {
    expect(judgeEndgameMove(C_PASSER, 'c4', C_PASSER_READ)).toEqual([{ tag: 'passed-pawn-neglected', outcome: 'held', line: null }]);
  });
  it('…Rc3 instead of …Ke5: the king kept passive — a miss', () => {
    expect(judgeEndgameMove(KING_IN, 'Rc3', KING_IN_READ)).toEqual([{ tag: 'passive-king-endgame', outcome: 'broken', line: ENDGAME_MISS_LINE['passive-king-endgame'] }]);
  });
  it('no read, no verdict — a question the board did not clearly pose is never scored', () => {
    expect(judgeEndgameMove(A_PASSER, 'g5', null)).toEqual([]);
  });
});

describe('the runner teaches the endgame pick, and records every endgame skill', () => {
  const plan = { ...planPhases(new Map(), new Set(['beginner']), {}), endgame: { focus: 'endgame-technique' as const, skill: 'passed-pawn-neglected' as const, state: 'grey' as const } };
  const setup: FocusSetup = {
    focus: 'tactics', rung: 2, reason: 'seed', window: [], seatStates: { defend: 'grey', exploit: 'grey' }, levels: ['beginner'],
    targetPly: 999, phases: plan, line: pregameLine(plan), tempoBest: 0, tagStates: {}, carry: [],
  };
  const inEndgame = (): FocusRunState => ({ ...stepFocus(FOCUS_IDLE, { kind: 'start', setup }).state, phase: 'endgame' });
  const play = (st: FocusRunState, fen: string, san: string, lines: typeof A_PASSER_READ) => {
    const student = fen.split(' ')[1] === 'w' ? 'w' : 'b';
    const s1 = stepFocus(st, { kind: 'board', fen, prevFen: null, beforeTheirMove: null, ply: 119, student, lines, steered: false, planted: null, plantLines: null }).state;
    const c = new Chess(fen); c.move(san);
    return stepFocus(s1, { kind: 'moved', move: { fenBefore: fen, san, fenAfter: c.fen(), student, cpLoss: null, lines } });
  };
  const rows = (es: FocusEffect[]) => es.filter((e): e is Extract<FocusEffect, { kind: 'record-skill' }> => e.kind === 'record-skill');
  it('the pick\'s miss is said in its fixed words and filed', () => {
    const { effects } = play(inEndgame(), A_PASSER, 'g5', A_PASSER_READ);
    expect(effects).toContainEqual({ kind: 'say', text: ENDGAME_MISS_LINE['passed-pawn-neglected'], line: 'phase-miss' });
    expect(rows(effects)).toEqual([expect.objectContaining({ tag: 'passed-pawn-neglected', outcome: 'broken', phase: 'endgame', spoke: true })]);
  });
  it('another endgame skill is recorded silently — one focus speaks a phase', () => {
    const { effects } = play(inEndgame(), KING_IN, 'Rc3', KING_IN_READ);
    expect(effects.some((e) => e.kind === 'say' && e.line === 'phase-miss')).toBe(false);
    expect(rows(effects)).toEqual([expect.objectContaining({ tag: 'passive-king-endgame', outcome: 'broken', spoke: false })]);
  });
  it('a green skill is never told, still recorded', () => {
    const st = { ...inEndgame(), setup: { ...setup, tagStates: { 'passed-pawn-neglected': 'green' as const } } };
    const { effects } = play(st, A_PASSER, 'g5', A_PASSER_READ);
    expect(effects.some((e) => e.kind === 'say' && e.line === 'phase-miss')).toBe(false);
    expect(rows(effects)).toHaveLength(1);
  });
});

describe('the coach prefers trades in an ending the student leads — same strength', () => {
  /** pgref-aman-caro-kann-variation-1-nf3-0005, move 62: White (the coach)
   *  is lost; f3xe4 Kxe4 is an equal trade. */
  const ENDING = '8/8/8/4k1p1/4ppP1/5P1K/1p6/8 w - - 0 62';
  const ctx = (over: Partial<ScoringContext> = {}): ScoringContext => ({
    fen: ENDING, coach: 'w', windowCp: 150, coachEvalCp: -900, pattern: null, phase: null, bossId: null, targets: [],
    focus: { id: 'tactics', levels: new Set(['beginner']), needs: new Set() }, ...over,
  });
  it('likes the equal trade, not the quiet move', () => {
    expect(focusTradesScorer({ uci: 'f3e4', cpLoss: 0 }, ctx())).toBe(1);
    expect(focusTradesScorer({ uci: 'h3g2', cpLoss: 0 }, ctx())).toBe(0);
  });
  it('only while the student leads by a piece, only in a focus game', () => {
    expect(focusTradesScorer({ uci: 'f3e4', cpLoss: 0 }, ctx({ coachEvalCp: -(TRADE_LEAD_CP - 1) }))).toBe(0);
    expect(focusTradesScorer({ uci: 'f3e4', cpLoss: 0 }, ctx({ focus: null }))).toBe(0);
  });
  it('never before the ending', () => {
    const middlegame = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7';
    expect(focusTradesScorer({ uci: 'c4f7', cpLoss: 0 }, ctx({ fen: middlegame }))).toBe(0);
  });
});
