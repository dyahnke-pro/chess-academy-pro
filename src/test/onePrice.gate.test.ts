// ONE PRICE FOR A MOVE (#2 root cause 4, 2026-10-20). A live move's cost is
// read inside ONE search that scores the played move against the best one —
// `playedMoveGrade.liveMovePrice`, memoized per (position, move) so the door,
// the record, the label and Play all read the same number. Kg5
// (5k2/1p6/3p2P1/p7/3nPK2/2N5/8/8 w) was 63 at the door and 115 in the record
// because each surface subtracted its own pair of reads.
//
// This gate fails on any statement in a LIVE-board producer that builds a cost
// by subtracting two evaluations (a read before minus a read after, a fan's
// eval minus a probe). Blamed by STATEMENT, comments stripped. The one
// sanctioned subtraction is `moveCost.mateSwingCostCp`, for a mate on the
// board, where there is no centipawn price.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Every live-board producer of a move's cost: Learn, Play, the hooks they
 *  run, and the computers those hand a move to. Review is out of scope: it
 *  reads the batch analysis's stored one-search `costCp`. */
const LIVE_FILES: readonly string[] = [
  'src/components/Coach/CoachTeachPage.tsx',
  'src/components/Coach/CoachGamePage.tsx',
  ...readdirSync('src/hooks')
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join('src/hooks', f)),
  'src/services/liveFundamental.ts',
  'src/services/learnFundamentalNarration.ts',
  'src/services/positionFacts.ts',
  'src/services/learnBoardTeaching.ts',
  'src/services/orderTeaching.ts',
  'src/services/backwardLook.ts',
  'src/services/inaccuracyCall.ts',
  'src/services/slipDetector.ts',
  'src/services/discussionPractice.ts',
];

/** A subtraction of two evaluations: an identifier naming an eval / a "before"
 *  / an "if best" read, minus one naming an eval / an "after" read. */
const TWO_READ_SUBTRACTION = /\b[\w.?]*(?:[eE]val|[bB]efore|IfBest)\w*\)?\s*-\s*\(?[\w.?]*(?:[eE]val|[aA]fter)\w*/;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, '');
}

/** Each offending statement as `file:line: text`. */
function twoReadCosts(file: string, src: string): string[] {
  const out: string[] = [];
  stripComments(src).split('\n').forEach((line, i) => {
    if (TWO_READ_SUBTRACTION.test(line)) out.push(`${file}:${i + 1}: ${line.trim()}`);
  });
  return out;
}

describe('one price for a move — no live surface subtracts two reads', () => {
  it('no live-board producer builds a move\'s cost from two evaluations', () => {
    const offenders = LIVE_FILES.flatMap((f) => twoReadCosts(f, readFileSync(f, 'utf8')));
    expect(offenders, 'price the move with liveMovePrice (or moveCost.mateSwingCostCp for a mate)').toEqual([]);
  });

  it('NEGATIVE CONTROL: the detector catches each producer this gate replaced', () => {
    // The lines as they stood before the one price, one per producer.
    const old = [
      'const cpLoss = coachEvalIfBest - coachEvalAfter;',                                   // Play's coach-move veto
      '      ? evalBeforeMover - evalAfterMover',                                           // liveFundamental fallback
      '  return Math.max(0, (before - after) * sign);',                                     // positionFacts.gradedLoss
      '          ? capEval(preMoveEval) - capEval(analysis.evaluation)',                    // Play's student move
      '      ? input.evalBeforeCp - input.evalAfterCp',                                     // slipDetector
      '      const cpLoss = price ? price.costCp : evalBeforeMover - evalAfterMover;',      // the record's mate path
      '          cpLoss: Math.max(0, (studentBestEval ?? studentEvalBefore) - studentEvalAfter),', // useLiveCoach
    ];
    for (const line of old) expect(twoReadCosts('old', line), line).toHaveLength(1);
  });

  it('the one price is where every live surface reads it from', () => {
    const teach = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const play = readFileSync('src/components/Coach/CoachGamePage.tsx', 'utf8');
    const record = readFileSync('src/hooks/useDiscussionPractice.ts', 'utf8');
    for (const [name, src] of [['Learn', teach], ['Play', play], ['the record', record]] as const) {
      expect(src, `${name} prices moves with liveMovePrice`).toMatch(/\bliveMovePrice\(/);
    }
  });
});
