import { describe, it, expect } from 'vitest';
import {
  applyDontKnow, applySilence, applyTap, completeLine, foundLine, MAX_WRONG_TAPS,
  newQuestion, nudgeLine, stagesFor, summariseAnswer,
} from './thinkingLesson';

describe('thinkingLesson — stages', () => {
  it('teaches a red or grey step in full and only reviews a green one', () => {
    expect(stagesFor('grey')).toEqual(['show', 'guide', 'solo']);
    expect(stagesFor('red')).toEqual(['show', 'guide', 'solo']);
    expect(stagesFor('green')).toEqual(['solo']);
  });
});

describe('thinkingLesson — taps', () => {
  it('finds every key square, then completes held and unprompted', () => {
    let q = newQuestion(['c6', 'e5'], 1000);
    const a = applyTap(q, 'c6', 1500);
    expect(a.outcome).toEqual({ kind: 'found', square: 'c6', remaining: 1 });
    q = a.state;
    const b = applyTap(q, 'e5', 2500);
    expect(b.outcome).toEqual({ kind: 'complete', square: 'e5' });
    const s = summariseAnswer(b.state);
    expect(s).toMatchObject({ held: true, prompted: false, help: 'none', msToFirst: 500, msBetween: [1000], foundCount: 2, keySize: 2 });
  });

  it('a repeat tap on a found square is ignored, not counted', () => {
    const q = applyTap(newQuestion(['c6', 'e5'], 0), 'c6', 1).state;
    const r = applyTap(q, 'c6', 2);
    expect(r.outcome.kind).toBe('ignored');
    expect(r.state.taps).toEqual(['c6']);
  });

  it('a wrong tap is not held, and the third shows the rest', () => {
    let q = newQuestion(['c6'], 0);
    for (let i = 1; i < MAX_WRONG_TAPS; i++) {
      const r = applyTap(q, i === 1 ? 'a1' : 'a2', i);
      expect(r.outcome.kind).toBe('wrong');
      q = r.state;
    }
    const last = applyTap(q, 'a3', 9);
    expect(last.outcome).toEqual({ kind: 'reveal', square: 'a3', missing: ['c6'] });
    const s = summariseAnswer(last.state);
    expect(s.held).toBe(false);
    expect(s.prompted).toBe(true);
    expect(s.extras).toEqual(['a1', 'a2', 'a3']);
  });

  it('a right answer reached after a wrong tap is complete but not held', () => {
    let q = applyTap(newQuestion(['c6'], 0), 'a1', 1).state;
    q = applyTap(q, 'c6', 2).state;
    const s = summariseAnswer(q);
    expect(s.foundCount).toBe(1);
    expect(s.held).toBe(false);
    expect(s.prompted).toBe(false);
  });

  it('dedupes a key so a doubled square cannot demand two taps', () => {
    expect(newQuestion(['c6', 'c6'], 0).key).toEqual(['c6']);
  });
});

describe('thinkingLesson — silence', () => {
  it('waits while nothing is found yet', () => {
    expect(applySilence(newQuestion(['c6', 'e5'], 0)).outcome).toEqual({ kind: 'none' });
  });

  it('nudges once after a partial answer, then shows the rest', () => {
    const q = applyTap(newQuestion(['c6', 'e5', 'g7'], 0), 'c6', 1).state;
    const first = applySilence(q);
    expect(first.outcome).toEqual({ kind: 'nudge', remaining: 2 });
    const second = applySilence(first.state);
    expect(second.outcome).toEqual({ kind: 'reveal', missing: ['e5', 'g7'] });
    const s = summariseAnswer(second.state);
    expect(s.help).toBe('show');
    expect(s.prompted).toBe(true);
  });

  it('a nudge then finishing counts as prompted, not held', () => {
    let q = applyTap(newQuestion(['c6', 'e5'], 0), 'c6', 1).state;
    q = applySilence(q).state;
    q = applyTap(q, 'e5', 2).state;
    const s = summariseAnswer(q);
    expect(s.foundCount).toBe(2);
    expect(s.held).toBe(false);
    expect(s.help).toBe('nudge');
  });
});

describe('thinkingLesson — I don\'t know', () => {
  it('is honest data: helped, and the rest is shown', () => {
    const r = applyDontKnow(applyTap(newQuestion(['c6', 'e5'], 0), 'c6', 1).state);
    expect(r.missing).toEqual(['e5']);
    expect(summariseAnswer(r.state)).toMatchObject({ help: 'dont-know', prompted: true, held: false });
  });
});

describe('thinkingLesson — lines', () => {
  it('does not reveal the count on the first right tap', () => {
    expect(foundLine(2, 0)).not.toMatch(/\d|one more/);
  });

  it('names the count after the first tap and rotates on the key', () => {
    expect(foundLine(1, 1)).toMatch(/one more/i);
    expect(foundLine(3, 1)).toMatch(/3 more/);
    expect(nudgeLine(1, 0)).not.toBe(nudgeLine(1, 1));
  });

  it('praises only a clean answer', () => {
    const clean = summariseAnswer(applyTap(newQuestion(['c6'], 0), 'c6', 1).state);
    const helped = summariseAnswer(applyDontKnow(newQuestion(['c6'], 0)).state);
    expect(completeLine(clean, 0)).toBeTruthy();
    expect(completeLine(helped, 0)).toBeNull();
  });
});
