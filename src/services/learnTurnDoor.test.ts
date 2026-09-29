import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decideTurn, LEARN_LANES, type LearnLane } from './learnTurnDoor';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const TEACH = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
/** Code only — a comment may name a retired symbol to explain why it went. */
const TEACH_CODE = TEACH.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('learnTurnDoor — the lane table decides, not a kind whitelist', () => {
  it('every lane says what it teaches', () => {
    for (const [lane, rule] of Object.entries(LEARN_LANES)) {
      expect(rule.why.length, `${lane} has no stated reason`).toBeGreaterThan(10);
    }
  });

  it('a lane speaks (positive control)', () => {
    // True on FEN (the board grader refuses a false claim — a knight "on c3"
    // there is refused, which is the package doing its job).
    const text = 'Your knight on f3 attacks the pawn on e5.';
    const d = decideTurn([{ lane: 'pieceQuality', text, fen: FEN, squares: ['f3', 'e5'] }]);
    expect(d.pkg.spoken.length).toBeGreaterThan(0);
    expect(d.spoke).toEqual(['pieceQuality']);
  });

  it('the plan arc speaks (behind the walkability check)', () => {
    const d = decideTurn([{ lane: 'planArc', text: "Their plan is taking shape: the knight's walk to e5.", fen: FEN, squares: ['e5'] }]);
    expect(d.spoke).toEqual(['planArc']);
  });

  it('Learn filters every aim through aimWalkableNow before the arc sees it', () => {
    expect(TEACH_CODE).toMatch(/aimsOf\(plan\.theirs, 'opponent'\)\.filter\(\(a\) => aimWalkableNow\(/);
    expect(TEACH_CODE).toMatch(/aimsOf\(plan\.mine, 'student'\)\.filter\(\(a\) => aimWalkableNow\(/);
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

  it('the kind whitelist and the always-on DNA switch are gone', () => {
    expect(TEACH_CODE).not.toMatch(/DNA_VOICE_KINDS/);
    expect(TEACH_CODE).not.toMatch(/NARRATE_DNA_ONLY/);
  });

  it('every queued line names a real lane', () => {
    const lanes = new Set(Object.keys(LEARN_LANES) as LearnLane[]);
    const calls = [...TEACH_CODE.matchAll(/queueSpokenHint\([^;]*?,\s*'([a-zA-Z]+)'/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(10);
    for (const lane of calls) expect(lanes.has(lane as LearnLane), `unknown lane '${lane}'`).toBe(true);
  });
});

describe('G8.5 — no lane without a live producer, no producer without a lane', () => {
  // The backward look queues under its own verdict kind, one producer for three lanes.
  const VIA_BACKWARD_LOOK = new Set<LearnLane>(['drawback', 'mistake', 'coachMistake']);

  it('every lane in the table is fed by live code in CoachTeachPage', () => {
    for (const lane of Object.keys(LEARN_LANES) as LearnLane[]) {
      if (VIA_BACKWARD_LOOK.has(lane)) continue;
      const fed = new RegExp(`queueSpokenHint\\([^;]*'${lane}'|lane: '${lane}'`).test(TEACH_CODE);
      expect(fed, `lane '${lane}' is in the table and nothing feeds it`).toBe(true);
    }
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(cm\.fenAfter, look\.line, look\.kind\)/);
  });

  it('the producers deleted with their lanes stay deleted', () => {
    // Each of these computed text for a lane that never spoke (2026-09-29).
    for (const gone of ['engineReadLines', 'parseEvalSplit', 'forkOfferAt', 'buildForkTalk', 'buildThinkAloud',
      'lookaheadPlanRef', 'planSaidRef', 'planMarks(', 'trackABestReply', 'factLines', 'borrowedLine']) {
      expect(TEACH_CODE.includes(gone), `${gone} is back in CoachTeachPage`).toBe(false);
    }
  });
});
