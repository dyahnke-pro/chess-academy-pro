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
      const fed = new RegExp(`queueSpokenHint\\([^;]*'${lane}'|deferIf\\([^;]*'${lane}'|lane: '${lane}'|'${lane}' as const`).test(TEACH_CODE);
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

describe('WO-1b — one lead per turn', () => {
  const F3 = 'Your knight on f3 attacks the pawn on e5.';
  const C6 = 'Their knight on c6 defends the pawn on e5.';
  const F1 = 'Your bishop on f1 can come out to c4.';

  it('the highest-ranked survivor leads and OPENS the utterance', () => {
    const d = decideTurn([
      { lane: 'pieceQuality', text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'register', text: C6, fen: FEN, squares: ['c6', 'e5'] },
    ]);
    expect(d.lead?.lane).toBe('register');
    expect(d.pkg.spoken.startsWith('Their knight on c6')).toBe(true);
  });

  it('a fact that shares a square with the lead supports it; one that shares nothing is held', () => {
    const d = decideTurn([
      { lane: 'register', text: C6, fen: FEN, squares: ['c6', 'e5'] },
      { lane: 'pieceQuality', text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'behavior', text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ]);
    expect(d.spoke).toEqual(expect.arrayContaining(['register', 'pieceQuality']));
    // Negative control: the unrelated description is held, not spoken.
    expect(d.held).toContain('behavior');
    expect(d.pkg.spoken).not.toContain('f1');
  });

  it('SAFETY FLOOR — a threat speaks even when something else leads', () => {
    const d = decideTurn([
      { lane: 'gem', text: C6, fen: FEN, squares: ['c6'] },
      { lane: 'threat', text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ]);
    expect(d.lead?.lane).toBe('gem');
    expect(d.spoke).toContain('threat');
  });

  it('the late wave leads only by outranking the instant lead; safety still rides', () => {
    const prior = { lane: 'gem' as const, squares: ['a1'] };
    const d = decideTurn([
      { lane: 'pieceQuality', text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'threat', text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ], undefined, undefined, prior);
    expect(d.lead).toBeNull();
    expect(d.held).toEqual(['pieceQuality']);
    expect(d.spoke).toEqual(['threat']);
    // …and a higher-ranked late fact does lead.
    const lower = { lane: 'pieceQuality' as const, squares: ['a1'] };
    const d2 = decideTurn([{ lane: 'register', text: C6, fen: FEN, squares: ['c6'] }], undefined, undefined, lower);
    expect(d2.lead?.lane).toBe('register');
  });

  it('every lane declares a lead rank; the safety lanes are always-on', () => {
    for (const [lane, rule] of Object.entries(LEARN_LANES)) expect(typeof rule.lead, lane).toBe('number');
    expect(LEARN_LANES.threat.always).toBe(true);
    expect(LEARN_LANES.gem.always).toBe(true);
    // A character switch is said the move it happens or never — it rides.
    expect(LEARN_LANES.character.always).toBe(true);
    // Purpose outranks description — the scoreboard's finding, pinned.
    expect(LEARN_LANES.movePoint.lead).toBeGreaterThan(LEARN_LANES.pieceQuality.lead);
    expect(LEARN_LANES.planArc.lead).toBeGreaterThan(LEARN_LANES.behavior.lead);
  });
});

describe('WO-1b — board descriptions wait for the turn\'s one decision', () => {
  it('the instant wave carries only urgent lanes; descriptions are deferred to the late wave', () => {
    const start = TEACH_CODE.indexOf('const instantDecision = decideTurn([');
    const end = TEACH_CODE.indexOf('learnMemRef.current.spokenKeys);', start);
    const instantCall = TEACH_CODE.slice(start, end);
    for (const lane of ['commentary', 'behavior', 'positional', 'kingSafety']) {
      expect(instantCall, `${lane} speaks instantly again — it will lead the turn by arriving first`).not.toContain(`'${lane}'`);
    }
    // Positive control: the urgent lanes are still there.
    for (const lane of ['gem', 'tactic', 'threat']) expect(instantCall).toContain(`'${lane}'`);
    // …and the deferred ones reach the late wave.
    expect(TEACH_CODE).toMatch(/for \(const d of instant\.deferred\) queueSpokenHint\(/);
  });
});

describe('WO-2 — a verdict on a good move carries its reason', () => {
  it('clear-best speaks only with the move\'s computed point', () => {
    expect(TEACH_CODE).toMatch(/grade\.reason !== 'clear-best' \|\| !!goodPoint/);
    expect(TEACH_CODE).toMatch(/studentMovePoint\(fenBefore, move\.san/);
  });
});
