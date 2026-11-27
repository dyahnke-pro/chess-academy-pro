import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { HoldRecord } from '../../services/holdRate';
import { FOCUS_SKILLS, pickPhase, planPhases, pregameLine, worstFirst } from './focusRotation';
import { FOCUS_IDLE, stepFocus, type FocusEffect, type FocusRunState } from './focusRunner';
import type { FocusSetup } from './focusSetup';
import { setUpFocusGame } from './focusSetup';
import { DEVELOP_MISS_PHRASE } from '../../missions/checks/developAndCastle';

const hold = (rate: number): HoldRecord => ({ posed: 20, held: Math.round(20 * rate), heldWeight: 20 * rate, missed: 20 * (1 - rate), rate });
const BEGINNER = new Set(['beginner'] as const);

describe('one focus per phase, rotated through the red and grey skills, worst first', () => {
  const holds = new Map<MisconceptionTagId, HoldRecord>([
    ['passive-king-endgame', hold(0.4)],
    ['passed-pawn-neglected', hold(0.6)],
    ['passive-rook', hold(0.95)],
  ]);
  it('worst first: red by its hold, then grey, then amber, then green', () => {
    expect(worstFirst(FOCUS_SKILLS['endgame-technique'], holds)).toEqual(['passive-king-endgame', 'passed-pawn-neglected', 'passive-rook']);
  });
  it('the worst red first; then the next one after the last, never the same twice running', () => {
    expect(pickPhase('endgame', holds, BEGINNER, null).skill).toBe('passive-king-endgame');
    expect(pickPhase('endgame', holds, BEGINNER, 'passive-king-endgame').skill).toBe('passed-pawn-neglected');
    // round the list of the skills the record needs — the green one is not in it
    expect(pickPhase('endgame', holds, BEGINNER, 'passed-pawn-neglected').skill).toBe('passive-king-endgame');
  });
  it('the middlegame chooses between tactics and the attack on the king by the same record', () => {
    const allGreen = new Map<MisconceptionTagId, HoldRecord>(FOCUS_SKILLS.tactics.map((t) => [t, hold(1)]));
    const p = pickPhase('middlegame', allGreen, BEGINNER, null);
    expect(p).toEqual({ focus: 'attack-king', skill: 'missed-king-attack', state: 'grey' });
    const kingGreen = new Map(allGreen).set('missed-king-attack', hold(1)).set('missed-your-pin', hold(0.3));
    expect(pickPhase('middlegame', kingGreen, BEGINNER, null)).toMatchObject({ focus: 'tactics', skill: 'missed-your-pin', state: 'red' });
  });
  it('the tactics focus is a real motif, never the free piece', () => {
    expect(FOCUS_SKILLS.tactics).not.toContain('missed-your-free-piece');
  });
  it('the pre-game line names the game\'s foci and rotates with them', () => {
    const a = planPhases(holds, BEGINNER, {});
    const b = planPhases(holds, BEGINNER, { opening: a.opening.skill, endgame: a.endgame.skill });
    expect(pregameLine(a)).toContain('in the endgame, an active king');
    expect(pregameLine(b)).toContain('in the endgame, pushing passed pawns');
    expect(pregameLine(a)).not.toEqual(pregameLine(b));
    expect(pregameLine(a)).toContain('at least one chance this game for a winning tactic');
  });
  it('the setup reads the last game\'s picks and the line follows', () => {
    const s0 = setUpFocusGame({ holds, games: [], rand: () => 0, tempoBest: 0, carry: [], lastPicks: {} });
    const s1 = setUpFocusGame({ holds, games: [], rand: () => 0, tempoBest: 0, carry: [], lastPicks: { endgame: s0.phases.endgame.skill } });
    expect(s0.phases.endgame.skill).toBe('passive-king-endgame');
    expect(s1.phases.endgame.skill).toBe('passed-pawn-neglected');
    expect(s1.line).toBe(pregameLine(s1.phases));
  });
});

// ── THE OPENING: develop and castle, scored both ways (real games) ──────────
const plan = planPhases(new Map(), BEGINNER, {});
const setup = (): FocusSetup => ({
  focus: 'tactics', rung: 0, reason: 'seed', window: [], seatStates: { defend: 'grey', exploit: 'grey' }, levels: ['beginner'],
  targetPly: 99, phases: plan, line: pregameLine(plan), tempoBest: 0, tagStates: {}, carry: [],
});

/** Plays `sans` from the start as `student`, feeding the runner a board and
 *  the student's move each turn, the coach's moves straight to the board. */
function walk(sans: readonly string[], student: 'w' | 'b'): { state: FocusRunState; effects: FocusEffect[] } {
  let state = stepFocus(FOCUS_IDLE, { kind: 'start', setup: setup() }).state;
  const all: FocusEffect[] = [];
  const c = new Chess();
  sans.forEach((san, i) => {
    const fenBefore = c.fen();
    if (c.turn() === student) {
      state = stepFocus(state, { kind: 'board', fen: fenBefore, prevFen: null, beforeTheirMove: null, ply: i + 1, student, lines: null, steered: false, planted: null, plantLines: null }).state;
      c.move(san);
      const s = stepFocus(state, { kind: 'moved', move: { fenBefore, san, fenAfter: c.fen(), student, cpLoss: null, lines: null } });
      state = s.state; all.push(...s.effects);
    } else c.move(san);
  });
  return { state, effects: all };
}
const skillRows = (es: FocusEffect[]) => es.filter((e): e is Extract<FocusEffect, { kind: 'record-skill' }> => e.kind === 'record-skill');

describe('the opening focus: develop and castle, read off the Campaign card\'s rule', () => {
  it('the Two Knights 4.Ng5 moves a knight twice: a miss, said in the card\'s fixed words', () => {
    const { effects } = walk(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'], 'w');
    expect(skillRows(effects)).toEqual([expect.objectContaining({ tag: 'neglected-development', outcome: 'broken', san: 'Ng5', phase: 'opening', spoke: true })]);
    expect(effects).toContainEqual({ kind: 'say', text: DEVELOP_MISS_PHRASE, line: 'phase-miss' });
  });
  it('the Ruy Lopez 5.O-O: castled in the opening — held; 4.Ba4 stood attacked, no miss', () => {
    const { effects, state } = walk(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'], 'w');
    expect(skillRows(effects)).toEqual([expect.objectContaining({ tag: 'king-stuck-center', outcome: 'held', san: 'O-O', spoke: false })]);
    // Castled with the rooks home: the ONE detector ends the opening there.
    expect(state.phase).toBe('middlegame');
  });
  it('the game records which skill each phase it reached taught, for the next rotation', () => {
    const { state } = walk(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'], 'w');
    const end = stepFocus(state, { kind: 'game-over', at: 1 });
    const result = end.effects.find((e): e is Extract<FocusEffect, { kind: 'end' }> => e.kind === 'end')?.result;
    expect(result?.phases).toEqual({ opening: plan.opening.skill });
  });
});
