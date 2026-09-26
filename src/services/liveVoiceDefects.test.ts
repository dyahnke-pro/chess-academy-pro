// WO-LIVE-VOICE-01 — the gates for defects found by READING what a real student
// heard on a 22-ply Learn game. Every one of these passed every gate the repo
// had at the time, which is why each assertion below is written against the
// PRODUCER rather than against a rendered sentence.
//
// Each test is NEGATIVE-CONTROLLED: reverting its fix turns it red. Where that
// is not self-evident the test says which edit breaks it.

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildDeliberation } from './deliberation';
import { tacticalReadFromLines, uncertaintyClause } from './tacticalRead';
import { buildGuidedFindChallenge } from './guidedFindTheMove';
import { callInaccuracy, callInaccuracyDetailed } from './inaccuracyCall';
import { backwardLook, lastCoachVerdictDecline } from './backwardLook';
import { beatSubject } from './curatedBeatSource';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { pickNarration } from './openingNarrationService';
import { getCorrectMoveMessage, getWelcomeMessage } from './gamesService';
import { assemblePositionAssessment, assembleTacticsAnswer } from './groundedAnswer';
import type { TacticsLiveContext } from '../coach/types';
import type { OpeningRecord } from '../types';

/** Scholar's mate — Black is checkmated, the board is final. */
const MATE_FEN = (() => {
  const c = new Chess();
  for (const m of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) c.move(m);
  return c.fen();
})();

describe('L1 — nothing advises a finished game', () => {
  it('the move-naming producers already refuse a terminal board', () => {
    // This is the MEASUREMENT behind putting the guard at the queue instead of
    // in each producer: these three cannot be the source of post-mate advice,
    // because each must resolve a move on the board and there are none.
    const c = new Chess(MATE_FEN);
    expect(c.isGameOver()).toBe(true);
    expect(c.moves()).toHaveLength(0);

    const stale = [{ rank: 1, moves: ['h1e1'], evaluation: 900, mate: null }];
    expect(buildDeliberation({
      fenBefore: MATE_FEN,
      analysis: { topLines: stale } as never,
      moverColor: 'b', opponentLastSan: null,
    })).toBeNull();
    expect(tacticalReadFromLines(MATE_FEN, [{ moves: ['h1e1'], evaluation: 900 }], 'black')).toBeNull();
    expect(buildGuidedFindChallenge(MATE_FEN, 'h1e1')).toBeNull();
  });

  it('the lanes that DID speak carry no FEN, so only the queue can hold the guard', async () => {
    // engineReadLines / pieceQualityLines take an analysis and an eval table —
    // no position — so a mated board is invisible to them. If either ever grows
    // a `fen` parameter this test should be revisited, not deleted.
    const engineRead = await import('./engineReadNarration');
    const pieceValue = await import('./pieceValueRead');
    expect(engineRead.engineReadLines).toHaveLength(3); // (analysis, studentColor, said)
    expect(pieceValue.pieceQualityLines).toHaveLength(4); // (values, studentColor, said, opts)
  });
});

describe('L1 — the guard sits at the one queue every late lane funnels through', () => {
  it('the Learn queue refuses any line bound to a finished position', async () => {
    // A SOURCE GATE, and deliberately so. `queueSpokenHint` is a closure inside
    // the component, and every late lane in Learn funnels through it — which is
    // exactly why the guard lives there rather than in fifteen producers. The
    // repo already gates this way where behaviour sits inside a surface
    // (`auditHarnessReach`, `noDeadCalibrationBubble`).
    //
    // NEGATIVE CONTROL: delete the `isGameOver()` early return in
    // `queueSpokenHint` and this goes red.
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const start = src.indexOf('const queueSpokenHint = useCallback(');
    expect(start, 'queueSpokenHint moved or was renamed').toBeGreaterThan(-1);
    const body = src.slice(start, start + 3000);
    expect(body).toMatch(/new Chess\(fen\)\.isGameOver\(\)/);
    // It must guard the QUEUED position, not some other board in scope.
    expect(body).not.toMatch(/liveFenRef\.current\)\.isGameOver/);
  });
});

describe('L2 — a claim about a piece that is not there is not made', () => {
  // The package now carries the board it is about (`TacticsLiveContext.fen`,
  // required — landed the same day as this test). Here that board is the
  // STARTING position: b5 is empty, so the package's own `hanging` entry is a
  // lie about its own board — the internal-inconsistency case. (A package that
  // is TRUE of its own board but stale for the student's is the OTHER case,
  // refused whole at the grounding gate — `coachService.staleTactics.integration.test`.)
  const hangingKnightOnB5: TacticsLiveContext = {
    fen: new Chess().fen(),
    immediate: [],
    hanging: [{ square: 'b5', piece: 'n', color: 'w' }],
    threats: [],
    opportunities: [],
    lookaheadDepth: 2,
  };

  it('the position assessment refuses a hanging claim the board does not support', () => {
    // b5 is empty in the starting position: the piece was captured long ago.
    // NEGATIVE CONTROL: drop the `pieceIsOn(...)` term from the `.find(...)` in
    // `assemblePositionAssessment` and this reads "Your knight on b5 is hanging."
    const start = new Chess().fen();
    const answer = assemblePositionAssessment({
      evalCp: null, mateIn: null, tactics: hangingKnightOnB5,
      studentColor: 'white', fen: start,
    });
    expect(answer?.facts ?? '').not.toMatch(/knight on b5 is hanging/i);
  });

  it('the tactics answer refuses it too — verified against the package\'s OWN fen, no parameter to forget', () => {
    // NEGATIVE CONTROL: drop the `pieceIsOn(tactics.fen, …)` term from the
    // hanging filter in `assembleTacticsAnswer` and this reads "Your knight on
    // b5 is hanging." There is no "no board" case any more: a package cannot
    // be built without one (`fen` is required at the single build site).
    expect(assembleTacticsAnswer(hangingKnightOnB5, 'white', null)?.facts ?? '')
      .not.toMatch(/knight on b5 is hanging/i);
  });

  it('a hanging claim that IS true still speaks — the guard is not a mute', () => {
    // A real undefended knight on b5, reachable by a black pawn on a6.
    const fen = '4k3/8/p7/1N6/8/8/8/4K3 b - - 0 1';
    const ctx: TacticsLiveContext = { ...hangingKnightOnB5, fen, hanging: [{ square: 'b5', piece: 'n', color: 'w' }] };
    expect(assembleTacticsAnswer(ctx, 'white', null)?.facts ?? '')
      .toMatch(/knight on b5 is hanging/i);
  });
});

describe('L3 — the voice never reports its own plumbing', () => {
  // ALL THREE BRANCHES, because the first cut of this test checked only the
  // "up" one — and the negative-control run then passed with the plumbing
  // restored on the "down" branch. A gate that covers one arm of a three-way
  // conditional is the same false green this work order is about.
  const MATERIAL_CASES = [
    { name: 'up', moves: ['e4', 'd5', 'exd5'], expect: /up 1 point of material/i },
    { name: 'down', moves: ['e4', 'd5', 'Nf3', 'dxe4'], expect: /down 1 point of material/i },
    { name: 'even', moves: ['e4', 'e5'], expect: /material is even/i },
  ];
  it.each(MATERIAL_CASES)('the no-engine-eval material read ($name) states the material and stops', ({ moves, expect: re }) => {
    // NEGATIVE CONTROL: restore "(no engine eval on this exact spot)" or "I
    // don't have an engine read on this exact position" on ANY branch and the
    // matching case fails. Narration voice rule 2 bans interface references.
    const c = new Chess();
    for (const m of moves) c.move(m);
    const answer = assemblePositionAssessment({
      evalCp: null, mateIn: null, tactics: null, studentColor: 'white', fen: c.fen(),
    });
    expect(answer?.facts ?? '').toMatch(re);
    expect(answer?.facts ?? '').not.toMatch(/engine/i);
  });
});

describe('L4 — a refusal names the guard that refused', () => {
  const fenBefore = (() => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']) c.move(m);
    return c.fen();
  })();

  it('122cp and 184cp are ABOVE the floor and do produce a verdict', () => {
    // The backlog concluded the floor was "mis-scaled or inverted" from a log
    // line reading "under the floor". It is neither — MISTAKE_CP is 100.
    for (const cpLoss of [122, 184]) {
      expect(callInaccuracy({
        fenBefore, playedSan: 'Nf6', bestSan: 'Bc5', bestLineUci: ['f8c5', 'c2c3'],
        cpLoss, missedMate: null, allowedMate: null, side: 'coach', moverColor: 'black',
      })).not.toBeNull();
    }
  });

  it('each refusal path reports its own distinct reason', () => {
    const base = {
      fenBefore, playedSan: 'Nf6', bestSan: 'Bc5', bestLineUci: ['f8c5'],
      missedMate: null, allowedMate: null, side: 'coach' as const, moverColor: 'black' as const,
    };
    // NEGATIVE CONTROL: collapse these back to a bare `return null` and every
    // one of these reads the same, which is exactly the bug.
    // 40cp is refused EARLIER, by the quality guard — below INACCURACY_CP it is
    // not even an inaccuracy. The floor band is 50..<100: an inaccuracy the
    // coach deliberately does not stop for. That these two report differently
    // is the whole point of the change.
    expect(callInaccuracyDetailed({ ...base, cpLoss: 40 }).declined).toBe('quality-not-worth-saying');
    expect(callInaccuracyDetailed({ ...base, cpLoss: 60 }).declined).toBe('under-the-floor');
    expect(callInaccuracyDetailed({ ...base, cpLoss: 184, bestSan: null }).declined).toBe('no-better-move-supplied');
    // PLAYING THE BEST MOVE is SHADOWED by the quality guard and never reaches
    // its own arm: `classifyMove({ wasBest: true })` returns 'best', which is
    // not in WORTH_SAYING, so the first guard answers. Asserted as it ACTUALLY
    // behaves rather than as the arm reads — a test written to the code's
    // apparent shape instead of its measured one is how a dead branch acquires
    // a green test and outlives the reason it was added.
    expect(callInaccuracyDetailed({ ...base, cpLoss: 184, playedSan: 'Bc5' }).declined).toBe('quality-not-worth-saying');
    // Bh6 needs the g7 pawn out of the way, so it is illegal here. (Qh4 is
    // NOT — the e-pawn is on e5, so the d8-h4 diagonal is open. Checked against
    // chess.js rather than eyeballed, which is the same discipline this whole
    // work order is about.)
    expect(callInaccuracyDetailed({ ...base, cpLoss: 184, bestSan: 'Bh6' }).declined).toBe('best-move-illegal-here');
    expect(callInaccuracyDetailed({ ...base, cpLoss: 184 }).declined).toBeUndefined();
  });

  it('backwardLook publishes the reason its coach lane declined', () => {
    const got = backwardLook({ replySan: null,
      fenBefore, fenAfter: fenBefore, playedSan: 'Nf6', bestSan: null,
      cpLoss: 184, studentColor: 'black', side: 'coach',
    });
    expect(got).toBeNull();
    expect(lastCoachVerdictDecline()).toBe('no-better-move-supplied');
  });
});

describe('L5 — a second lesson on the same move does not re-announce it', () => {
  it('the subject is recognised from the beat’s own moves, never invented', () => {
    expect(beatSubject('Bc4 — the Italian bishop.', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])).toBe('Bc4');
    expect(beatSubject('Bc4 — the Italian bishop, pointed straight at f7.', ['e4', 'e5', 'Bc4'])).toBe('Bc4');
    expect(beatSubject('c3 — quiet, but loaded.', ['e4', 'e5', 'c3'])).toBe('c3');
    // A leading token that is NOT one of the beat's own moves is not a subject.
    expect(beatSubject('Nf6 is the reply you must know.', ['e4', 'e5', 'Bc4'])).toBeNull();
    // Prose that does not open on a move gets null rather than a guess.
    expect(beatSubject('The centre is the whole story here.', ['e4', 'e5'])).toBeNull();
  });

  it('the two real Italian beats that repeated share one subject', () => {
    // These are the exact pair read off the live walk. They differ in ID and in
    // wording, so neither the ID set nor the sentence-novelty set could see them.
    const a = beatSubject('Bc4 — the Italian bishop.', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    const b = beatSubject('Bc4 — the Italian bishop, pointed straight at f7.', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    expect(a).toBe(b);
    expect(a).not.toBeNull();
  });
});

describe('L6 — stems are rotated, not rolled', () => {
  const VARIANTS = ['one', 'two', 'three'];

  it('the same key always draws the same stem, and keys spread', () => {
    expect(rotateStem(VARIANTS, 7)).toBe(rotateStem(VARIANTS, 7));
    expect(new Set([0, 1, 2].map((k) => rotateStem(VARIANTS, k))).size).toBe(3);
  });

  it('stemKeyOf is stable and spreads across close inputs', () => {
    expect(stemKeyOf('abc')).toBe(stemKeyOf('abc'));
    expect(stemKeyOf('abc')).not.toBe(stemKeyOf('abd'));
    expect(stemKeyOf('')).toBeGreaterThanOrEqual(0);
  });

  it('pickNarration is resume-safe — same record, same sentence, every call', () => {
    // NEGATIVE CONTROL: put `Math.random` back and this fails within a few runs.
    const rec = { id: 'n1', openingName: 'Italian', variation: '', moveSan: 'Bc4', fen: null, approved: true, narrations: ['a', 'b', 'c', 'd', 'e'] };
    const first = pickNarration(rec);
    for (let i = 0; i < 50; i += 1) expect(pickNarration(rec)).toBe(first);
    // A different record may legitimately draw differently — variety survives.
    const others = new Set(['n2', 'n3', 'n4', 'n5', 'n6', 'n7'].map((id) => pickNarration({ ...rec, id })));
    expect(others.size).toBeGreaterThan(1);
  });

  it('gamesService messages are keyed, not rolled', () => {
    for (let i = 0; i < 20; i += 1) expect(getCorrectMoveMessage(3)).toBe(getCorrectMoveMessage(3));
    const opening = { id: 'op-1', name: 'Italian Game', color: 'white' } as unknown as OpeningRecord;
    for (let i = 0; i < 20; i += 1) expect(getWelcomeMessage(opening)).toBe(getWelcomeMessage(opening));
  });

  it('no narration stem module rolls Math.random any more', async () => {
    const fs = await import('node:fs');
    for (const f of ['src/services/mistakeNarration.ts', 'src/services/openingNarrationService.ts']) {
      const body = fs.readFileSync(f, 'utf8')
        .split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n');
      expect(body, `${f} still rolls a stem`).not.toMatch(/Math\.random/);
    }
  });
});

describe('L7 — a SAN in a subject slot reads as a noun phrase (#51)', () => {
  it('the close-call hedge says "the queen taking on d5", never "the queen takes d5"', () => {
    // Verified rather than assumed: PLAN listed this as open; `uncertaintyClause`
    // already routes both move slots through `sayMoveNoun`.
    const read = {
      fen: new Chess().fen(), studentColor: 'white' as const,
      bestMoveSan: 'e4', bestMoveUci: 'e2e4', line: [], checkPlies: [],
      verdict: { kind: 'edge' as const, text: 'a small edge' },
      keyTactic: null, tempting: null,
      closeAlternative: { san: 'Qxd5', gapCp: 20 },
    };
    const said = uncertaintyClause(read as never, { spoken: true });
    expect(said).toContain('the queen taking on d5');
    expect(said).not.toMatch(/the queen takes d5/);
  });
});
