import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decideTurn, LEARN_LANES, type LearnLane } from './learnTurnDoor';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const TEACH = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
/** Code only — a comment may name a retired symbol to explain why it went. */
const TEACH_CODE = TEACH.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('learnTurnDoor — the lane table decides, not a kind whitelist', () => {
  it('every silent lane says why', () => {
    for (const [lane, rule] of Object.entries(LEARN_LANES)) {
      expect(rule.why.length, `${lane} has no stated reason`).toBeGreaterThan(10);
    }
  });

  it('the plan arc speaks — the lane the kind whitelist silenced', () => {
    const text = 'There it is — their knight on g3. That was the plan.';
    const d = decideTurn([{ lane: 'planArc', text, fen: FEN, squares: ['g3'] }]);
    expect(d.pkg.spoken).toContain('That was the plan');
    expect(d.spoke).toEqual(['planArc']);
    expect(d.closed).toEqual([]);
  });

  it('a closed lane is refused BEFORE the package and recorded as closed', () => {
    // Negative control: the same sentence on a closed lane never speaks.
    const text = 'Your pieces are well coordinated and the position is balanced.';
    const d = decideTurn([{ lane: 'borrowed', text, fen: FEN }]);
    expect(d.pkg.spoken).toBe('');
    expect(d.offered).toEqual(['borrowed']);
    expect(d.closed).toEqual(['borrowed']);
  });

  it('two lanes of ONE kind are told apart (a kind whitelist cannot)', () => {
    // lookaheadPlan and planArc are both kind 'plan'; only one is open.
    expect(LEARN_LANES.planArc.kind).toBe(LEARN_LANES.lookaheadPlan.kind);
    expect(LEARN_LANES.planArc.speaks).toBe(true);
    expect(LEARN_LANES.lookaheadPlan.speaks).toBe(false);
  });

  it('a producer-decided kind rides through (the backward look)', () => {
    const d = decideTurn([{ lane: 'coachMistake', text: 'I slipped there — that knight move left f7 loose.', fen: FEN }]);
    expect(d.pkg.kept[0]?.kind).toBe('coachMistake');
  });
});

describe('the gate — Learn assembles its voice ONLY through the door', () => {
  it('no buildVoicePackage call on a live turn in CoachTeachPage', () => {
    // The one allowed call is the empty package for a finished game.
    const calls = TEACH_CODE.match(/buildVoicePackage\(/g) ?? [];
    expect(calls.length, 'a turn assembled its voice outside decideTurn').toBeLessThanOrEqual(1);
    expect(TEACH_CODE).toMatch(/buildVoicePackage\(\[\]\)/);
  });

  it('the kind whitelist is gone', () => {
    expect(TEACH_CODE).not.toMatch(/DNA_VOICE_KINDS/);
  });

  it('every queued line names a real lane', () => {
    const lanes = new Set(Object.keys(LEARN_LANES) as LearnLane[]);
    const calls = [...TEACH_CODE.matchAll(/queueSpokenHint\([^;]*?,\s*'([a-zA-Z]+)'/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(10);
    for (const lane of calls) expect(lanes.has(lane as LearnLane), `unknown lane '${lane}'`).toBe(true);
  });
});
