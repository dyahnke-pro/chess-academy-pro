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
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';

const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3', 'd6'];
function inputs(): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 1, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
  });
}
const ALAPIN = 'The line so far is the Sicilian Defense: Alapin Variation.';

describe('review — the say-once ledgers commit after the door, for spoken facts only', () => {
  it('a fact computed on a need-silenced ply is NOT ledgered, so its next appearance speaks', () => {
    // Five clean games down this exact line: plies 1–4 are familiar, 5+ are not.
    const student = { ...coldStudent(1400), gamesPlayed: 5, lineReps: [5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const segs = buildReviewSegments(inputs(), 'white', 'Sicilian Defense: Alapin Variation', true, 1400, [], student, 'g');
    const ply3 = segs.find((s) => s.ply === 3)!;
    const ply4 = segs.find((s) => s.ply === 4)!;
    // The premise: ply 3 really was silenced by need.
    expect(ply3.need?.speak).toBe(false);
    expect(ply3.narration).toBeNull();
    // The contract: the opening's name, first spoken on ply 4, is heard.
    expect(ply4.narration ?? '').toContain(ALAPIN);
    // …and ONCE: the same static line is not re-said on the plies that follow
    // (the ledger still does its job — after the fact spoke).
    const later = segs.filter((s) => s.ply > 4).map((s) => s.narration ?? '').join(' ');
    expect(later).not.toContain(ALAPIN);
  });

  it('BLAMES BY STATEMENT: no ledger write inside the candidate loop; the commit reads decision.spoken', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    const loopStart = src.indexOf('const keptRaw: string[] = [];');
    const loopEnd = src.indexOf('const claimedRefrains = new Set<number>();');
    expect(loopStart).toBeGreaterThan(0);
    expect(loopEnd).toBeGreaterThan(loopStart);
    const loop = src.slice(loopStart, loopEnd).replace(/^\s*\/\/.*$/gm, '');
    // Strip every deferred commit closure (`() => X` / `() => { … }`); what is
    // left is the code that runs WHILE the candidate list is built.
    const eager = loop.replace(/\(\) => \{[\s\S]*?\}\)/g, '').replace(/\(\) => [^,\n]+/g, '');
    const LEDGERS = ['verdictReasonsSeen', 'planGoalsSeen', 'standingSpoken', 'sacSpoken', 'oneShotTags', 'emittedStaticFacets', 'structAtomsSeen', 'recurrenceLabelsSeen'];
    for (const ledger of LEDGERS) {
      // Non-vacuity: the loop DOES commit to every ledger (inside a closure)…
      expect(loop, `${ledger} is never committed from the loop?`).toMatch(new RegExp(`${ledger}\\.add\\(`));
      // …and never eagerly.
      expect(eager, `${ledger} is written eagerly inside the candidate loop`).not.toMatch(new RegExp(`${ledger}\\.add\\(`));
    }
    expect(eager).not.toMatch(/lastVerdictWord = /);
    expect(eager).not.toMatch(/lastRaceVerdict = /);
    expect(eager).not.toMatch(/kingCenterTaught = true/);
    // The commit runs off the door's verdict, after the quiet-ply gate.
    const commit = src.indexOf('const spokenSet = new Set(decision.spoken);');
    const quietGate = src.indexOf('if (quietOpeningPly && needHere && !needHere.speak) {');
    expect(commit).toBeGreaterThan(quietGate);
    // The method habit is claimed on a SCRATCH set and committed only if spoken.
    expect(src).toMatch(/saidHabits: habitScratch,/);
    expect(src).toMatch(/for \(const h of habitScratch\) spokenHabits\.add\(h\)/);
  });
});
