import { describe, it, expect } from 'vitest';
import { characterOf, stepCharacter, type Character } from './positionCharacter';
import { EMPTY_CHARACTER_STATE } from './gameStory';

const NONE_SAID: Record<Character, number> = { tactical: 0, positional: 0, conversion: 0, defence: 0 };

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
    let s = EMPTY_CHARACTER_STATE;
    const out: Array<string | null> = [];
    for (const r of reads) {
      const step = stepCharacter(s, r, NONE_SAID);
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

  it('the words rotate on the switches HEARD, never at random', () => {
    let s = EMPTY_CHARACTER_STATE;
    const heard = { ...NONE_SAID };
    const said: string[] = [];
    for (const r of ['positional', 'tactical', 'tactical', 'positional', 'positional', 'tactical', 'tactical'] as Character[]) {
      const step = stepCharacter(s, r, heard);
      s = step.next;
      if (step.switched) { said.push(step.switched.text); heard[step.switched.to] += 1; }
    }
    expect(said).toHaveLength(3);
    expect(said[0]).not.toBe(said[2]); // two tactical switches, two different stems
  });

  it('a switch the door HELD spends no stem: the next one says the first words (P1-8c)', () => {
    const settled = { ...EMPTY_CHARACTER_STATE, current: 'positional' as const };
    const first = stepCharacter(stepCharacter(settled, 'tactical', NONE_SAID).next, 'tactical', NONE_SAID);
    const back = stepCharacter(stepCharacter(first.next, 'positional', NONE_SAID).next, 'positional', NONE_SAID);
    // Nothing was heard, so the turn back to sharp opens with the same stem.
    const again = stepCharacter(stepCharacter(back.next, 'tactical', NONE_SAID).next, 'tactical', NONE_SAID);
    expect(again.switched?.text).toBe(first.switched?.text);
  });
});

describe('the switch says WHY it turned sharp (walk 2026-09-30)', () => {
  it('names a live tactic, or the one move that works', () => {
    const settled = { ...EMPTY_CHARACTER_STATE, current: 'positional' as const };
    const hold = stepCharacter(settled, 'tactical', NONE_SAID, 'tactic').next;
    expect(stepCharacter(hold, 'tactical', NONE_SAID, 'tactic').switched?.text).toMatch(/there is a tactic on the board/);
    expect(stepCharacter(stepCharacter(settled, 'tactical', NONE_SAID, 'gap').next, 'tactical', NONE_SAID, 'gap').switched?.text).toMatch(/one move here is far better than the rest/);
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
