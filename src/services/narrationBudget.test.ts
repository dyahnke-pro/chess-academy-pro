// The airtime budget is the only limit that is allowed to drop a note which
// has already been judged TRUE, RELEVANT and NEW — so its contract has to be
// narrow and provable. Two rules carry the honesty: the first note always
// speaks in full, and a note is skipped whole rather than clipped.
import { describe, it, expect } from 'vitest';
import {
  narrationWordBudget, fitToBudget, boardPhase,
} from './narrationBudget';

const words = (n: number): string => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('narrationWordBudget', () => {
  it('silences nothing extra at silent, and matches the G5 cap at brief', () => {
    expect(narrationWordBudget({ verbosity: 'silent', phase: 'opening', importance: 'keystone' }))
      .toBe(0);
    // 30 words is applyBriefVoiceCap's contract; generating to the same number
    // means the downstream clip has nothing to cut mid-thought.
    expect(narrationWordBudget({ verbosity: 'brief', phase: 'middlegame', importance: 'keystone' }))
      .toBe(30);
  });

  it('pays more for a moment worth stopping on', () => {
    const at = (importance: 'routine' | 'decision' | 'keystone'): number =>
      narrationWordBudget({ verbosity: 'full', phase: 'opening', importance });
    expect(at('routine')).toBeLessThan(at('decision'));
    expect(at('decision')).toBeLessThan(at('keystone'));
  });

  it('leaves the median speaking ply alone', () => {
    // Measured over the repertoire walk: p50 is 47 words. A budget that bites
    // the typical ply is a cap wearing a different hat, so the floor tier has
    // to sit above it.
    expect(narrationWordBudget({ verbosity: 'full', phase: 'opening', importance: 'routine' }))
      .toBeGreaterThan(47);
  });

  it('gives plans more room than technique', () => {
    const p = (phase: 'opening' | 'middlegame' | 'endgame'): number =>
      narrationWordBudget({ verbosity: 'full', phase, importance: 'routine' });
    expect(p('middlegame')).toBeGreaterThan(p('opening'));
    expect(p('endgame')).toBeLessThan(p('opening'));
  });
});

describe('fitToBudget', () => {
  it('speaks the first note in full even when it alone busts the budget', () => {
    const long = words(300);
    expect(fitToBudget([long, words(5)], 70)).toEqual([long]);
  });

  it('never returns a clipped note', () => {
    const parts = [words(40), words(40), words(40)];
    for (const kept of fitToBudget(parts, 100)) {
      expect(parts).toContain(kept);
    }
  });

  it('skips a note that will not fit and keeps looking behind it', () => {
    // The reason skip-and-continue matters: one long note in second place must
    // not silence the short ones queued behind it.
    const first = words(20);
    const huge = words(500);
    const small = words(10);
    const kept = fitToBudget([first, huge, small], 70);
    expect(kept).toEqual([first, small]);
  });

  it('preserves rank — it never reorders to pack the budget tighter', () => {
    const parts = [words(10), words(10), words(10)];
    expect(fitToBudget(parts, 70)).toEqual(parts);
  });

  it('drops blank parts and survives an empty queue', () => {
    expect(fitToBudget([], 70)).toEqual([]);
    expect(fitToBudget(['  ', ''], 70)).toEqual([]);
  });
});

describe('boardPhase', () => {
  it('reads the phase off the board, not off a note tag', () => {
    expect(boardPhase(START, 1)).toBe('opening');
    // Queens gone is an endgame however few moves have been played — the same
    // test noteLineGuard uses, kept in step deliberately.
    expect(boardPhase('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', 4)).toBe('endgame');
    expect(boardPhase(undefined, 30)).toBe('middlegame');
  });
});
