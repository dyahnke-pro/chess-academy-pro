// B3 (PLAN WO-STANDARD-01, 2026-09-22): EVERY live composer call carries the
// student model's need half, and every surface that GRADES or PLAYS a student
// move hands over the raw board data of that move. Blamed by STATEMENT: the
// exact object literal each surface hands `computePositionFacts`.
//
// Why a source gate beside the forwarding probes: a probe proves a wire fires
// TODAY; this one fails the build the day a fifth live surface is added by
// copying one of these calls without the field, and it pins the two shapes
// that make the wire unreopenable — `whyBestMove`'s input REQUIRES the context
// and `useLiveCoach` REQUIRES the history getter and the pre-move board.
//
// Negative control: delete `studentNeedContext: studentNeedRef.current,` from
// `usePositionNarration.ts` → the first test names that file.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string): string => readFileSync(p, 'utf8');

/** The object literal(s) handed to computePositionFacts in a file. */
function composerCalls(src: string): string[] {
  const out: string[] = [];
  let i = src.indexOf('computePositionFacts({');
  while (i >= 0) {
    let depth = 0;
    let j = src.indexOf('{', i);
    for (; j < src.length; j += 1) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') { depth -= 1; if (depth === 0) break; }
    }
    out.push(src.slice(i, j + 1));
    i = src.indexOf('computePositionFacts({', j);
  }
  return out;
}

const LIVE = [
  'src/hooks/useLiveCoach.ts',
  'src/hooks/usePhaseNarration.ts',
  'src/hooks/usePositionNarration.ts',
  'src/services/whyBestMove.ts',
] as const;

describe('the live composer calls carry the student model (B3)', () => {
  it('every live surface hands the composer studentNeedContext', () => {
    for (const f of LIVE) {
      const calls = composerCalls(read(f));
      expect(calls.length, `${f}: no computePositionFacts call found`).toBeGreaterThan(0);
      for (const c of calls) expect(c, `${f} composes without the need context`).toMatch(/studentNeedContext:/);
    }
  });

  it('the three hooks that see the student\'s move hand over lastMove; the Why button honestly does not', () => {
    for (const f of ['src/hooks/useLiveCoach.ts', 'src/hooks/usePhaseNarration.ts', 'src/hooks/usePositionNarration.ts']) {
      for (const c of composerCalls(read(f))) expect(c, `${f} never hands over the move just played`).toMatch(/lastMove/);
    }
    // The student is to move at a "Why?" tap — the last move is the opponent's.
    for (const c of composerCalls(read('src/services/whyBestMove.ts'))) expect(c).not.toMatch(/lastMove/);
  });

  it('useLiveCoach: the opponent\'s trigger passes lastMove: null, the student\'s passes the real cost', () => {
    const src = read('src/hooks/useLiveCoach.ts');
    expect(src).toMatch(/lastMove: null,/);
    expect(src).toMatch(/cpLoss: Math\.max\(0, \(studentBestEval \?\? studentEvalBefore\) - studentEvalAfter\)/);
  });

  it('the shapes are REQUIRED, so a new caller fails to compile rather than silently reopening this', () => {
    expect(read('src/services/whyBestMove.ts')).toMatch(/^\s*studentNeedContext: StudentNeedContext \| null;$/m);
    const live = read('src/hooks/useLiveCoach.ts');
    expect(live).toMatch(/^\s*getHistory: \(\) => readonly string\[\];$/m);
    expect(live).toMatch(/^\s*fenBefore: string;$/m);
    expect(read('src/hooks/usePhaseNarration.ts')).toMatch(/^\s*playerColor: 'white' \| 'black';$/m);
  });

  it('no live hook reads a mount-time line — the need hook takes a GETTER', () => {
    for (const f of ['src/hooks/useLiveCoach.ts', 'src/hooks/usePhaseNarration.ts', 'src/hooks/usePositionNarration.ts', 'src/components/Coach/CoachTeachPage.tsx', 'src/components/Coach/CoachGamePage.tsx', 'src/components/Openings/OpeningPlayMode.tsx']) {
      const src = read(f);
      const m = /useStudentNeed\(\{[\s\S]*?\}\)/.exec(src);
      expect(m, `${f} mounts no useStudentNeed`).not.toBeNull();
      expect(m![0], `${f} hands the need hook a snapshot line`).toMatch(/sans: (?:\(\) =>|args\.getHistory)/);
    }
  });
});
