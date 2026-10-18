import { describe, it, expect } from 'vitest';
import {
  scoreEvent, levelOf, computeSkillMeters, eventsFromRecord, meterOfTag, meterNamedIn, skillMetersAnswer,
  START_RD, RATED_ANSWERS, FAMILIARITY_DECAY, METER_OF_TAG,
  type MeterState, type HeldRow, type SlipRow, type SkillEvent,
} from './skillMeters';
import { MISCONCEPTION_TAGS } from '../data/misconceptionTags';

const settled: MeterState = { rating: 1400, rd: 80, events: 40 };
const step = (s: MeterState, score: 0 | 1, difficulty: number, weight = 1): number =>
  scoreEvent(s, { score, difficulty, weight }).rating - s.rating;

describe('skill meters — the gap decides the points', () => {
  it('an easy question answered pays almost nothing; a hard one pays a lot', () => {
    const easy = step(settled, 1, 900);
    const hard = step(settled, 1, 1800);
    expect(easy).toBeGreaterThan(0);
    expect(easy).toBeLessThan(3);
    expect(hard).toBeGreaterThan(easy * 10);
  });

  it('missing an easy one costs a lot; missing a hard one costs little', () => {
    const missEasy = step(settled, 0, 900);
    const missHard = step(settled, 0, 1800);
    expect(missEasy).toBeLessThan(missHard * 5);
    expect(missEasy).toBeLessThan(-5);
    expect(missHard).toBeGreaterThan(-5);
  });

  it('an inaccuracy (half weight) costs about half a mistake', () => {
    const full = step(settled, 0, 1400, 1);
    const half = step(settled, 0, 1400, 0.5);
    expect(half / full).toBeGreaterThan(0.4);
    expect(half / full).toBeLessThan(0.6);
  });

  it('a new skill moves fast, a settled one slowly', () => {
    const fresh: MeterState = { rating: 1400, rd: START_RD, events: 0 };
    expect(Math.abs(step(fresh, 1, 1400))).toBeGreaterThan(Math.abs(step(settled, 1, 1400)) * 3);
  });
});

describe('anchored to the student rating', () => {
  const ev = (meter: SkillEvent['meter'], score: 0 | 1, at: number): SkillEvent =>
    ({ meter, key: `${meter}-${at}`, score, difficulty: 1400, weight: 1, at });

  it('a bias every skill shares moves no meter off the student rating', () => {
    // Every answered question held: unanchored, every meter would climb far
    // above 1400; anchored, they all sit at the student's own rating.
    const events: SkillEvent[] = [];
    for (let i = 0; i < 40; i++) for (const m of ['tactics', 'endgames', 'development'] as const) events.push(ev(m, 1, i));
    const m = computeSkillMeters(events, 1400).filter((x) => x.events > 0);
    for (const x of m) expect(Math.round(x.rating)).toBe(1400);
  });

  it("a skill weaker than the student's others reads below their rating", () => {
    const events: SkillEvent[] = [];
    for (let i = 0; i < 40; i++) {
      events.push(ev('endgames', 1, i));
      events.push(ev('tactics', i % 2 === 0 ? 0 : 1, i));
    }
    const m = computeSkillMeters(events, 1400);
    const end = m.find((x) => x.id === 'endgames')!;
    const tac = m.find((x) => x.id === 'tactics')!;
    expect(end.rating).toBeGreaterThan(1400);
    expect(tac.rating).toBeLessThan(1400);
  });
});

describe('levels move both ways', () => {
  it('a level drops when the rating falls below its line', () => {
    expect(levelOf(1405).level).toBeGreaterThan(levelOf(1395).level);
    let s: MeterState = { rating: 1405, rd: 80, events: 40 };
    const before = levelOf(s.rating).level;
    for (let i = 0; i < 3; i++) s = scoreEvent(s, { score: 0, difficulty: 900, weight: 1 });
    expect(levelOf(s.rating).level).toBeLessThan(before);
  });
});

describe('the record → events', () => {
  const held = (o: Partial<HeldRow>): HeldRow => ({ tag: 'hung-material', outcome: 'held', fen: 'F1 w - - 0 1', playedSan: 'Nf3', recordedAt: 1, prompted: false, origin: 'review', ...o });
  const slip = (o: Partial<SlipRow>): SlipRow => ({ tag: 'hung-material', fen: 'F1 w - - 0 1', playedSan: 'Qh5', createdAt: 1, source: 'auto-analysis', ...o });
  const flat = () => ({ difficulty: 1400, scale: 400 });
  const breaks = () => true;

  it('one position, one score: a live miss on both records counts once', () => {
    const ev = eventsFromRecord([held({ outcome: 'broken', playedSan: 'Qh5' })], [slip({ source: 'discussion-practice' })], flat, breaks);
    expect(ev).toHaveLength(1);
    expect(ev[0].score).toBe(0);
  });

  it("an analysed game's slip row is not scored again — the record already scored that move", () => {
    expect(eventsFromRecord([], [slip({ source: 'auto-analysis' }), slip({ source: 'game-review', fen: 'F3 w - - 0 1' })], flat, breaks)).toHaveLength(0);
  });

  it('a live slip counts only where the one scoring breaks that skill', () => {
    expect(eventsFromRecord([], [slip({ source: 'discussion-practice' })], flat, () => false)).toHaveLength(0);
  });

  it('a prompted answer earns nothing; a lesson tap is not a game move', () => {
    expect(eventsFromRecord([held({ prompted: true }), held({ origin: 'lesson', fen: 'F2 w - - 0 1' })], [], flat, breaks)).toHaveLength(0);
  });

  it('a repeated right answer at the same position pays less each time', () => {
    const ev = eventsFromRecord([held({ recordedAt: 1 }), held({ recordedAt: 2 }), held({ recordedAt: 3 })], [], flat, breaks);
    expect(ev.map((e) => e.weight)).toEqual([1, FAMILIARITY_DECAY, FAMILIARITY_DECAY ** 2]);
  });

  it('a skill with no calibrated difficulty scores nothing', () => {
    expect(eventsFromRecord([], [slip({ source: 'discussion-practice' })], () => null, breaks)[0].weight).toBe(0);
  });

  it('a skill with no evidence reads not rated', () => {
    const m = computeSkillMeters([], 1400);
    expect(m.every((x) => !x.rated && x.rd === START_RD)).toBe(true);
    expect(RATED_ANSWERS).toBeGreaterThan(0);
  });
});

describe('every heat-map skill has a meter', () => {
  it('the map covers the tag list', () => {
    for (const t of MISCONCEPTION_TAGS) {
      if (t.id === 'other') continue;
      expect(meterOfTag(t.id), t.id).not.toBeNull();
    }
    expect(Object.keys(METER_OF_TAG).length).toBe(MISCONCEPTION_TAGS.length - 1);
  });
});

describe('chat reads the meters', () => {
  it('finds the skill a question names', () => {
    expect(meterNamedIn("what's my tactics level?")).toBe('tactics');
    expect(meterNamedIn('how are my endgames')).toBe('endgames');
    expect(meterNamedIn('how good is my calculation')).toBe('calculation');
    expect(meterNamedIn('what are my levels')).toBeNull();
  });

  it('answers a named skill with its level, or says it is not rated', () => {
    const m = computeSkillMeters([], 1400);
    expect(skillMetersAnswer(m, 'tactics')).toMatch(/not rated yet/);
    const rated = m.map((x) => (x.id === 'tactics' ? { ...x, rated: true, rating: 1460, level: 11, toNext: 0.6, events: 40 } : x));
    expect(skillMetersAnswer(rated, 'tactics')).toMatch(/Tactics: Level 11, about 1460/);
  });

  it('lists the rated meters weakest first, and nothing when none is rated', () => {
    const m = computeSkillMeters([], 1400);
    expect(skillMetersAnswer(m, null)).toBeNull();
    const two = m.map((x) => (x.id === 'tactics' ? { ...x, rated: true, rating: 1500, level: 12 } : x.id === 'endgames' ? { ...x, rated: true, rating: 1100, level: 8 } : x));
    expect(skillMetersAnswer(two, null)).toMatch(/weakest first: Endgames Level 8.*Tactics Level 12.*weakest is Endgames; your strongest is Tactics/);
  });
});

describe('a live slip is scored by its measured cost', () => {
  it('a slip under a pawn does not break the skill', async () => {
    const { liveSlipBreaks } = await import('./skillMetersLoader');
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    const slip = { tag: 'hung-material', fen, playedSan: 'f6', createdAt: 1, source: 'discussion-practice' };
    expect(liveSlipBreaks({ ...slip, cpLoss: 60 })).toBe(false);
  }, 30_000);
});
