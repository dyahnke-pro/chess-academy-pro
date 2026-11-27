import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isAttackingMove, judgeKingAttackMove, KING_ATTACK_MISS_LINE } from './kingAttackJudge';
import { attackPosed, findAttackPlant } from './attackPlant';
import { FOCUS_IDLE, focusAttackAsk, stepFocus, type FocusEffect, type FocusRunState } from './focusRunner';
import { planPhases, pregameLine } from './focusRotation';
import type { FocusSetup } from './focusSetup';
import type { CoachLine, SlipRead } from '../../missions/earnedSlip';

// Real middlegames from the pro game references (public/data/pro-game-references.json),
// each read by native Stockfish (depth 11, five lines) — the read is stored here.
/** pgref-aman-caro-kann-variation-1-nf3-0003, move 13: Bxh7+ takes the pawn in
 *  front of their castled king; the game played Qg3. */
const H7 = 'r2qrbk1/pp1n1ppp/2p1pn2/6B1/3P3Q/3B1N2/PPP2PPP/R3R1K1 w - - 9 13';
const H7_READ = [
  { moves: ['d3h7', 'f6h7', 'g5d8', 'a8d8'], evaluation: 495, mate: null },
  { moves: ['d4d5', 'h7h6', 'd5e6', 'e8e6'], evaluation: 178, mate: null },
  { moves: ['a1d1', 'h7h6', 'g5c1', 'd8c7'], evaluation: 108, mate: null },
  { moves: ['g2g4', 'h7h6', 'g5d2', 'g7g6'], evaluation: 87, mate: null },
  { moves: ['h4g3', 'd8a5', 'a2a4', 'a7a6'], evaluation: 82, mate: null },
];
/** pgref-aman-caro-kann-variation-1-nf3-0002, move 27: Bxg7 strips the king, and the game played it. */
const G7 = '5rk1/5ppp/p5b1/3pB3/1P1Q4/8/5PPP/2q2NK1 w - - 0 27';
const G7_READ = [
  { moves: ['e5g7', 'f8e8', 'g7h8', 'f7f6'], evaluation: -172, mate: null },
  { moves: ['b4b5', 'c1c4', 'b5a6', 'f7f6'], evaluation: -332, mate: null },
  { moves: ['h2h4', 'f7f6', 'e5d6', 'f8c8'], evaluation: -380, mate: null },
  { moves: ['d4d5', 'h7h5', 'h2h3', 'c1b1'], evaluation: -413, mate: null },
  { moves: ['h2h3', 'f7f6', 'e5d6', 'f8e8'], evaluation: -452, mate: null },
];

describe('the attack on the king, scored both ways on real middlegames', () => {
  it('Qg3 instead of Bxh7+: the attack let go — a miss, taught as the habit', () => {
    expect(isAttackingMove(H7, 'd3h7')).toBe(true);
    expect(judgeKingAttackMove(H7, 'Qg3', H7_READ)).toEqual([{ tag: 'missed-king-attack', outcome: 'broken', line: KING_ATTACK_MISS_LINE }]);
  });
  it('Bxg7 played: held', () => {
    expect(judgeKingAttackMove(G7, 'Bxg7', G7_READ)).toEqual([{ tag: 'missed-king-attack', outcome: 'held', line: null }]);
  });
  it('the board poses it — the same question the plant asks', () => {
    expect(attackPosed(H7, H7_READ)).toBe('d3h7');
    expect(attackPosed(H7, null)).toBeNull();
  });
});

describe('the runner in an attack middlegame', () => {
  const base = planPhases(new Map(), new Set(['beginner']), {});
  const plan = { ...base, middlegame: { focus: 'attack-king' as const, skill: 'missed-king-attack' as const, state: 'grey' as const } };
  const setup: FocusSetup = {
    focus: 'tactics', rung: 2, reason: 'seed', window: [], seatStates: { defend: 'grey', exploit: 'grey' }, levels: ['beginner'],
    targetPly: 999, phases: plan, line: pregameLine(plan), tempoBest: 0, tagStates: {}, carry: [],
  };
  const mid = (): FocusRunState => ({ ...stepFocus(FOCUS_IDLE, { kind: 'start', setup }).state, phase: 'middlegame' });
  it('the attack pick\'s miss is said and filed; the attack is now shown, so no plant is asked', () => {
    const s1 = stepFocus(mid(), { kind: 'board', fen: H7, prevFen: null, beforeTheirMove: null, ply: 25, student: 'w', lines: H7_READ, steered: false, planted: null, plantLines: null }).state;
    expect(s1.attackShown).toBe(true);
    expect(focusAttackAsk(s1, 27, H7)).toBe(false);
    const c = new Chess(H7); c.move('Qg3');
    const { effects } = stepFocus(s1, { kind: 'moved', move: { fenBefore: H7, san: 'Qg3', fenAfter: c.fen(), student: 'w', cpLoss: null, lines: H7_READ } });
    expect(effects).toContainEqual({ kind: 'say', text: KING_ATTACK_MISS_LINE, line: 'phase-miss' });
    expect(effects.filter((e): e is Extract<FocusEffect, { kind: 'record-skill' }> => e.kind === 'record-skill')).toEqual([expect.objectContaining({ tag: 'missed-king-attack', outcome: 'broken', phase: 'middlegame' })]);
  });
  it('before an attack has been on the board, the plant is asked — only in the attack focus\'s middlegame', () => {
    expect(focusAttackAsk(mid(), 25, H7)).toBe(true);
    expect(focusAttackAsk({ ...mid(), phase: 'opening' }, 25, H7)).toBe(false);
    const tactics = { ...mid(), setup: { ...setup, phases: base } };
    expect(focusAttackAsk(tactics, 25, H7)).toBe(base.middlegame.focus === 'attack-king');
  });
});

describe('the attack plant — a real slip that opens the coach\'s own king', () => {
  // The same game, move 12: Black (the coach) played …Bf8 (the H7 board
  // follows), a slip hanging nothing that leaves Bxh7+. Native Stockfish,
  // depth 11, on both boards — the reads are stored here.
  const BF8_BEFORE = 'r2qr1k1/pp1nbppp/2p1pn2/6B1/3P3Q/3B1N2/PPP2PPP/R3R1K1 b - - 8 12';
  const BF8_AFTER = 'r2qrbk1/pp1n1ppp/2p1pn2/6B1/3P3Q/3B1N2/PPP2PPP/R3R1K1 w - - 9 13';
  const lines: CoachLine[] = [
    { uci: 'h7h6', coachCp: -21, pv: ['h7h6', 'g5d2', 'c6c5', 'h4g3', 'f6h5', 'g3h3', 'h5f6', 'd2e3', 'd8c7', 'a1d1', 'c5c4'] },
    { uci: 'e7f8', coachCp: -459, pv: ['e7f8', 'd3h7', 'f6h7', 'g5d8', 'a8d8', 'f3g5', 'h7g5', 'h4g5', 'd7f6', 'g5a5'] },
  ];
  const AFTER_READ = [
    { moves: ['d3h7', 'f6h7', 'g5d8', 'a8d8'], evaluation: 459, mate: null },
    { moves: ['d4d5', 'd8b6', 'd5e6', 'e8e6'], evaluation: 167, mate: null },
    { moves: ['g2g4', 'h7h6', 'g5d2', 'g7g6'], evaluation: 108, mate: null },
    { moves: ['a1d1', 'h7h6', 'g5c1', 'c6c5'], evaluation: 87, mate: null },
    { moves: ['c2c4', 'f8e7', 'e1e3', 'd7f8'], evaluation: 81, mate: null },
  ];
  const read: SlipRead = (fen) => Promise.resolve(fen.split(' ').slice(0, 2).join(' ') === BF8_AFTER.split(' ').slice(0, 2).join(' ') ? { topLines: AFTER_READ } : { topLines: [] });
  it('…Bf8 is planted: the board it leaves poses Bxh7+', async () => {
    expect(new Chess(BF8_BEFORE).move('Bf8').after).toBe(BF8_AFTER);
    const { pick, scan } = await findAttackPlant(BF8_BEFORE, lines, read);
    expect(pick, JSON.stringify(scan)).toMatchObject({ uci: 'e7f8', attackUci: 'd3h7', dropCp: 438 });
  });
  it('twin: a read that poses no attack plants nothing', async () => {
    const quiet: SlipRead = () => Promise.resolve({ topLines: AFTER_READ.slice(1) });
    const { pick, scan } = await findAttackPlant(BF8_BEFORE, lines, quiet);
    expect(pick).toBeNull();
    expect(scan['no-attack']).toBe(1);
  });
});
