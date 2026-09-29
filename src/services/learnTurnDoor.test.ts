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

  it('an OPEN lane speaks (positive control)', () => {
    // True on FEN (the board grader refuses a false claim — a knight "on c3"
    // there is refused, which is the package doing its job).
    const text = 'Your knight on f3 attacks the pawn on e5.';
    const d = decideTurn([{ lane: 'pieceQuality', text, fen: FEN, squares: ['f3', 'e5'] }]);
    expect(d.pkg.spoken.length).toBeGreaterThan(0);
    expect(d.spoke).toEqual(['pieceQuality']);
  });

  it('the plan arc stays closed until WO-2 validates its aims', () => {
    // Two live walks, 2026-09-29: 3 of 4 lines false. Re-opening it is a
    // deliberate edit to LEARN_LANES with a walk behind it.
    const d = decideTurn([{ lane: 'planArc', text: "Their plan is taking shape: the bishop's walk to c3.", fen: FEN }]);
    expect(d.pkg.spoken).toBe('');
    expect(d.closed).toEqual(['planArc']);
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
    // pieceQuality and engineRead are both kind 'computed'; only one is open.
    expect(LEARN_LANES.pieceQuality.kind).toBe(LEARN_LANES.register.kind);
    expect(LEARN_LANES.pieceQuality.speaks).toBe(true);
    expect(LEARN_LANES.engineRead.kind).toBe(LEARN_LANES.pieceQuality.kind);
    expect(LEARN_LANES.engineRead.speaks).toBe(false);
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
