// B4 (PLAN WO-STANDARD-01, 2026-09-22): the review's say-once ledgers are
// written AFTER `decide()` and the quiet-ply gate, and only for the facts that
// actually SPOKE. They used to be written while the candidate list was built —
// so a fact on a ply the need gate then silenced was ledgered as said, and its
// next appearance was dropped as a repeat the student never heard.
//
// THE SCENE: White has played the Alapin's first three plies right five times
// (`lineReps` 5 on plies 1–4), so ply 3 (c3) is a familiar, quiet opening ply
// and the need gate silences it. The `[opening]` facet naming the line is
// computed on ply 3 AND on ply 4 (Black's reply) with the same text. Under the
// old order ply 3 consumed it in `emittedStaticFacets` while saying nothing,
// and ply 4 dropped it as a repeat: the student never heard the name of the
// opening they were being reviewed on.
//
// Negative control (run and reverted): make `keep()` run its commit at once
// (`if (commit) commit();`) — the old order — and the first test fails.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';

const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3', 'd6'];
function inputs(): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 1, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
  });
}
// The walk names the opening with Learn's announcement (one namer).
const ALAPIN = "It's the Alapin Variation of the Sicilian Defense.";
const CENTRE_RULE = /pieces behind a strong center reach either wing/;

describe('review — the say-once ledgers commit after the door, for spoken facts only', () => {
  it('a fact computed on a need-silenced ply is NOT ledgered, so its next appearance speaks', async () => {
    const { setOpeningIdentity } = await import('./openingIdentity');
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    // Five clean games down this exact line: plies 1–4 are familiar, 5+ are not.
    const student = { ...coldStudent(1400), gamesPlayed: 5, lineReps: [5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const segs = buildReviewSegmentsForTests(inputs(), 'white', 'Sicilian Defense: Alapin Variation', true, 1400, [], student, 'g');
    // The premise: ply 1 (1.e4) really was silenced by need — and it computed
    // the centre rule ("pieces behind a strong center reach either wing").
    const ply1 = segs.find((s) => s.ply === 1)!;
    expect(ply1.need?.speak).toBe(false);
    expect(ply1.narration).toBeNull();
    // The contract: the rule's next appearance (7.d4) speaks — the silenced
    // ply did not spend it. (The opening's name was this test's vehicle until
    // the masters' plan left the walk, David 2026-11-06: the Alapin has no
    // identity line, so the walk no longer names it at all.)
    const ply7 = segs.find((s) => s.ply === 7)!;
    expect(ply7.narration ?? '').toMatch(CENTRE_RULE);
    // …and ONCE: the same rule is not re-said on the plies that follow (the
    // ledger still does its job — after the fact spoke).
    const later = segs.filter((s) => s.ply > 7).map((s) => s.narration ?? '').join(' ');
    expect(later).not.toMatch(CENTRE_RULE);
    // A cold student hears it on 1.e4 and not again on 7.d4.
    const cold = buildReviewSegmentsForTests(inputs(), 'white', 'Sicilian Defense: Alapin Variation', true, 1400, [], coldStudent(1400), 'g');
    expect(cold.find((s) => s.ply === 1)?.narration ?? '').toMatch(CENTRE_RULE);
    expect(cold.find((s) => s.ply === 7)?.narration ?? '').not.toMatch(CENTRE_RULE);
    setOpeningIdentity(null);
  }, 60_000);

  it('BLAMES BY STATEMENT: no ledger write inside the candidate loop; the commit reads what spoke', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    const loopStart = src.indexOf('const keptRaw: ReviewFacet[] = [];');
    const loopEnd = src.indexOf('const claimedRefrains = new Set<number>();');
    expect(loopStart).toBeGreaterThan(0);
    expect(loopEnd).toBeGreaterThan(loopStart);
    const loop = src.slice(loopStart, loopEnd).replace(/^\s*\/\/.*$/gm, '');
    // Strip every deferred commit closure (`() => X` / `() => { … }`); what is
    // left is the code that runs WHILE the candidate list is built.
    const eager = loop.replace(/\(\) => \{[\s\S]*?\}\)/g, '').replace(/\(\) => [^,\n]+/g, '');
    const LEDGERS = ['verdictReasonsSeen', 'standingSpoken', 'sacSpoken', 'oneShotTags', 'emittedStaticFacets', 'structAtomsSeen'];
    for (const ledger of LEDGERS) {
      // Non-vacuity: the loop DOES commit to every ledger (inside a closure)…
      expect(loop, `${ledger} is never committed from the loop?`).toMatch(new RegExp(`${ledger}\\.add\\(`));
      // …and never eagerly.
      expect(eager, `${ledger} is written eagerly inside the candidate loop`).not.toMatch(new RegExp(`${ledger}\\.add\\(`));
    }
    expect(eager).not.toMatch(/lastVerdictWord = /);
    // The plans live in the game's story (P1-8b): a thread is written only by
    // a commit, never while the candidates are built. The plan thread's
    // adoption is a named commit (`adoptPlanThread`), run only from `keep`.
    expect(loop, 'the story is never committed from the loop?').toMatch(/story\.commitThreads\(/);
    const adopt = /const adoptPlanThread = \(\): void => \{[\s\S]*?\n {6}\};/;
    expect(eager, 'the plan thread\'s adoption is defined in the loop').toMatch(adopt);
    const eagerOutsideAdopt = eager.replace(adopt, '');
    expect(eagerOutsideAdopt).not.toMatch(/story\.(?:commitThreads|commitFacts|setPlans)\(/);
    expect(eagerOutsideAdopt, 'the plan thread is adopted only by a commit').not.toMatch(/adoptPlanThread\(\)/);
    expect(eager).not.toMatch(/kingCenterTaught = true/);
    // The commit runs off what actually SPOKE — the door's verdict after the
    // turn's length (2026-10-15) — after the quiet-ply gate.
    const commit = src.indexOf('const spokenSet = new Set(uncappedParts);');
    const quietGate = src.indexOf('if (quietOpeningPly && needHere && !needHere.speak) {');
    expect(commit).toBeGreaterThan(quietGate);
    // The method habit is claimed on a SCRATCH set and committed only if spoken.
    expect(src).toMatch(/saidHabits: habitScratch,/);
    expect(src).toMatch(/for \(const h of habitScratch\) spokenHabits\.add\(h\)/);
  });
});

describe('review — the opening is named with what it is (review audit 2026-10-14)', () => {
  it('the name is said with what the opening is, on the move that identifies it — never with the masters\' plan', async () => {
    const { setOpeningIdentity } = await import('./openingIdentity');
    const real = JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')) as Record<string, never>;
    setOpeningIdentity(real);
    try {
      // The Smith-Morra has an identity: named on 3.d4 with what it is.
      const chess = new Chess();
      const smith = ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6'].map((san, i) => { chess.move(san); return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 1, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
      const sm = buildReviewSegmentsForTests(smith, 'white', 'Sicilian Defense: Smith-Morra Gambit', true, 1400, [], coldStudent(1400), 'g');
      expect(sm.find((s) => s.ply === 3)?.narration ?? '').toMatch(/This game is the Sicilian Defense: Smith-Morra Gambit\. It offers a pawn/);
      // The Alapin has none: a bare name is a description, so the walk does
      // not say it — and what the line is FOR from master games ("your break
      // is d4") is opening theory, the Theory button's (David 2026-11-06).
      const segs = buildReviewSegmentsForTests(inputs(), 'white', 'Sicilian Defense: Alapin Variation', true, 1400, [], coldStudent(1400), 'g');
      const said = segs.map((s) => s.narration ?? '').join(' ');
      expect(said).not.toContain(ALAPIN);
      expect(said).not.toMatch(/The plan in this structure/);
    } finally {
      setOpeningIdentity(null);
    }
  });
});
