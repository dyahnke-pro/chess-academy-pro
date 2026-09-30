import { describe, it, expect } from 'vitest';
import { characterOf, stepCharacter, EMPTY_CHARACTER, type Character } from './positionCharacter';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
/** White is a rook up (Black's a8 rook gone). */
const WHITE_UP_ROOK = '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1';

describe('characterOf — what the position is about', () => {
  it('a level, quiet board is positional', () => {
    expect(characterOf({ fen: START, studentColor: 'white', tacticLive: false, bestGapCp: 20 })).toBe('positional');
  });

  it('the same material reads as conversion for the side ahead and defence for the side behind', () => {
    expect(characterOf({ fen: WHITE_UP_ROOK, studentColor: 'white', tacticLive: false, bestGapCp: null })).toBe('conversion');
    expect(characterOf({ fen: WHITE_UP_ROOK, studentColor: 'black', tacticLive: false, bestGapCp: null })).toBe('defence');
  });

  it('a live tactic or one clearly-best move makes it tactical — even a rook up', () => {
    expect(characterOf({ fen: WHITE_UP_ROOK, studentColor: 'white', tacticLive: true, bestGapCp: null })).toBe('tactical');
    expect(characterOf({ fen: START, studentColor: 'white', tacticLive: false, bestGapCp: 200 })).toBe('tactical');
    // Negative control: a small gap is not sharp.
    expect(characterOf({ fen: START, studentColor: 'white', tacticLive: false, bestGapCp: 60 })).toBe('positional');
  });
});

describe('stepCharacter — a switch is spoken only once it holds', () => {
  const run = (reads: Character[]): Array<string | null> => {
    let s = EMPTY_CHARACTER;
    const out: Array<string | null> = [];
    for (const r of reads) {
      const step = stepCharacter(s, r);
      s = step.next;
      out.push(step.switched?.to ?? null);
    }
    return out;
  };

  it('the first read settles silently', () => {
    expect(run(['positional'])).toEqual([null]);
  });

  it('one flickering read is not a switch; two in a row are', () => {
    expect(run(['positional', 'tactical', 'positional'])).toEqual([null, null, null]);
    expect(run(['positional', 'tactical', 'tactical'])).toEqual([null, null, 'tactical']);
  });

  it('switches back when the board does — tactical to positional to tactical', () => {
    expect(run(['positional', 'tactical', 'tactical', 'positional', 'positional', 'tactical', 'tactical']))
      .toEqual([null, null, 'tactical', null, 'positional', null, 'tactical']);
  });

  it('the words rotate on a counter, never at random', () => {
    let s = EMPTY_CHARACTER;
    const said: string[] = [];
    for (const r of ['positional', 'tactical', 'tactical', 'positional', 'positional', 'tactical', 'tactical'] as Character[]) {
      const step = stepCharacter(s, r);
      s = step.next;
      if (step.switched) said.push(step.switched.text);
    }
    expect(said).toHaveLength(3);
    expect(said[0]).not.toBe(said[2]); // two tactical switches, two different stems
  });
});

describe('the switch says WHY it turned sharp (walk 2026-09-30)', () => {
  it('names a live tactic, or the one move that works', () => {
    const settled = { ...EMPTY_CHARACTER, current: 'positional' as const };
    const hold = stepCharacter(settled, 'tactical', 'tactic').next;
    expect(stepCharacter(hold, 'tactical', 'tactic').switched?.text).toMatch(/there is a tactic on the board/);
    expect(stepCharacter(stepCharacter(settled, 'tactical', 'gap').next, 'tactical', 'gap').switched?.text).toMatch(/one move here is far better than the rest/);
  });
});

describe('sharpGap — a decided game has no sharp gap', () => {
  it('+9 against +6.5 is no question; +0.4 against -1.5 is', async () => {
    const { sharpGap } = await import('./positionCharacter');
    expect(sharpGap(907, 650)).toBe(0);
    expect(sharpGap(-900, -400)).toBe(0);
    expect(sharpGap(40, -150)).toBe(190);
    expect(sharpGap(500, 100)).toBe(400);
    expect(sharpGap(null, 10)).toBeNull();
  });
});
