import { describe, it, expect } from 'vitest';
import { attributePrinciples, FUNDAMENTAL_TAG } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';
import { fundamentalLines } from './learnFundamentalNarration';

// PP on the PP (David 2026-10-05). The French with 4.Bg5: the bishop pins the
// f6-knight to the queen on d8, and e4-e5 attacks it with a pawn — the knight
// cannot step away without dropping the queen. Black's 4…a6 is a waste move
// that leaves the pin standing; 4…Be7 (the book move) breaks it.
const PINNED = ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'a6'];

describe('missed-pin-pressure — FOR the student', () => {
  it('names the skipped pile-on when e5 was the move and they played a3', () => {
    const out = attributePrinciples({
      historySans: [...PINNED, 'a3'], bestSan: 'e5', classification: 'mistake',
      replySan: null, pvAfterPlayed: ['Be7'],
    });
    const a = out.find((x) => x.id === 'missed-pin-pressure');
    expect(a, JSON.stringify(out.map((x) => x.id))).toBeTruthy();
    expect(a!.tag).toBe(FUNDAMENTAL_TAG['missed-pin-pressure']);
    expect(a!.tag).toBe('missed-tactic');
    expect(a!.facts).toMatchObject({ better: 'e5', piece: 'knight', square: 'f6', pinnerSq: 'g5', behind: 'queen', behindSq: 'd8' });
    expect(a!.evidence.squares).toContain('f6');
    const v = renderFundamentalVerdict([a!], { replySan: null, ply: 0, seen: new Set() });
    expect(v).toMatch(/pinned/);
    expect(v).toMatch(/e5/);
    expect(v).not.toMatch(/\b(we|our|us)\b/i);
    // The named move gets its arrow (G6).
    expect(fundamentalLines(a!, 'x', 'a3', true)[0]?.sans).toEqual(['e5']);
  });

  it('stays silent when the student PLAYED the pile-on (nothing missed)', () => {
    const out = attributePrinciples({
      historySans: [...PINNED, 'e5'], bestSan: 'exd5', classification: 'inaccuracy', replySan: null,
    });
    expect(out.map((x) => x.id)).not.toContain('missed-pin-pressure');
  });

  it('stays silent when the pile-on is still there after their reply (not missed yet)', () => {
    const out = attributePrinciples({
      historySans: [...PINNED, 'a3'], bestSan: 'e5', classification: 'mistake',
      replySan: null, pvAfterPlayed: ['h6'],
    });
    // After …h6 the bishop on g5 still pins and e5 still piles on.
    expect(out.map((x) => x.id)).not.toContain('missed-pin-pressure');
  });
});

describe('ignored-pin-pressure — AGAINST the student', () => {
  it('names their pile-on when the student left the pinned knight to it', () => {
    const out = attributePrinciples({
      historySans: PINNED, bestSan: 'Be7', classification: 'mistake',
      replySan: 'e5',
    });
    const a = out.find((x) => x.id === 'ignored-pin-pressure');
    expect(a, JSON.stringify(out.map((x) => x.id))).toBeTruthy();
    expect(a!.tag).toBe('missed-opponents-threat');
    expect(a!.facts).toMatchObject({ pile: 'e5', played: 1, piece: 'knight', square: 'f6', behind: 'queen', better: 'Be7' });
    const v = renderFundamentalVerdict([a!], { replySan: 'e5', ply: 0, seen: new Set() });
    expect(v).toMatch(/Your knight on f6 is pinned to the queen on d8/);
    expect(v).toMatch(/piled on with e5/);
  });

  it('reads the engine reply when the real one is not known yet', () => {
    const out = attributePrinciples({
      historySans: PINNED, bestSan: 'Be7', classification: 'mistake',
      replySan: null, pvAfterPlayed: ['e5', 'h6'],
    });
    expect(out.find((x) => x.id === 'ignored-pin-pressure')?.facts.played).toBe(0);
  });

  it('stays silent when the reply is not a pile-on', () => {
    const out = attributePrinciples({
      historySans: PINNED, bestSan: 'Be7', classification: 'mistake', replySan: 'Nf3',
    });
    expect(out.map((x) => x.id)).not.toContain('ignored-pin-pressure');
  });
});
