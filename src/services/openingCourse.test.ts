import { describe, it, expect } from 'vitest';
import { buildCourse } from './openingCourse';
import { buildOpeningRecord } from '../test/factories';
import { MAIN_LINE_INDEX } from '../utils/wlppLadder';

// A non-CURATED id keeps buildVariationTabs deterministic: tabs = every
// variation in data order, so chapter order == variation order.
function course(overrides = {}) {
  return buildCourse(
    buildOpeningRecord({
      id: 'test-course-opening',
      name: 'Test Opening',
      overview: 'A solid, principled opening. It fights for the center.',
      variations: [
        { name: 'The Advance', pgn: '1.e4 c6 2.d4 d5 3.e5', explanation: 'White grabs space; we break with c5.' },
        { name: 'The Exchange', pgn: '1.e4 c6 2.d4 d5 3.exd5', explanation: 'Symmetrical; we play the minority attack.' },
        { name: 'The Fantasy', pgn: '1.e4 c6 2.d4 d5 3.f3', explanation: 'Take on f3 and punish the weakness.' },
      ],
      ...overrides,
    }),
  );
}

describe('buildCourse', () => {
  it('makes a chapter for the trunk plus each variation, numbered in order', () => {
    const c = course();
    expect(c.total).toBe(4); // main line + 3 variations
    expect(c.chapters.map((ch) => ch.n)).toEqual([1, 2, 3, 4]);
    expect(c.chapters[0]).toMatchObject({ lineIndex: MAIN_LINE_INDEX, isMainLine: true, label: 'Main Line' });
    expect(c.chapters.slice(1).map((ch) => ch.label)).toEqual(['The Advance', 'The Exchange', 'The Fantasy']);
    expect(c.chapters.slice(1).map((ch) => ch.lineIndex)).toEqual([0, 1, 2]);
  });

  it('derives the chapter summary from overview (trunk) and explanation (variations)', () => {
    const c = course();
    expect(c.chapters[0].summary).toBe('A solid, principled opening.');
    expect(c.chapters[1].summary).toBe('White grabs space; we break with c5.');
  });

  it('prefers variation.overview over explanation for the summary', () => {
    const c = course({
      variations: [
        { name: 'The Advance', pgn: '1.e4', explanation: 'short', overview: 'The fuller masterclass overview. More text here.' },
      ],
    });
    expect(c.chapters[1].summary).toBe('The fuller masterclass overview.');
  });

  it('handles an opening with no variations — just the trunk chapter', () => {
    const c = course({ variations: [] });
    expect(c.total).toBe(1);
    expect(c.chapters[0].isMainLine).toBe(true);
  });

  it('reports 0% with the first step on Watch of chapter 1 when nothing is done', () => {
    const c = course();
    expect(c.percent).toBe(0);
    expect(c.completedChapters).toBe(0);
    expect(c.currentChapter).toBe(1);
    expect(c.complete).toBe(false);
    expect(c.nextStep).toEqual({ chapterN: 1, lineIndex: MAIN_LINE_INDEX, rung: 'watch' });
  });

  it('rolls per-rung completion into chapter and course percentages', () => {
    // Main line: Watch+Learn done (2/4). Advance: Watch done (1/4). Rest: 0.
    const c = course({
      linesDiscovered: [MAIN_LINE_INDEX, 0],
      linesLearned: [MAIN_LINE_INDEX],
    });
    expect(c.chapters[0].percent).toBe(50);
    expect(c.chapters[0].status).toBe('in-progress');
    expect(c.chapters[1].percent).toBe(25);
    // 3 of 16 rungs done across 4 chapters → 19%.
    expect(c.percent).toBe(19);
    expect(c.completedChapters).toBe(0);
  });

  it('points Next up at the first incomplete rung of the first incomplete chapter', () => {
    // Chapter 1 fully done; chapter 2 (Advance) has Watch done → next is Learn.
    const c = course({
      linesDiscovered: [MAIN_LINE_INDEX, 0],
      linesLearned: [MAIN_LINE_INDEX],
      linesPerfected: [MAIN_LINE_INDEX],
      linesPlayed: [MAIN_LINE_INDEX],
    });
    expect(c.chapters[0].status).toBe('complete');
    expect(c.completedChapters).toBe(1);
    expect(c.currentChapter).toBe(2);
    expect(c.nextStep).toEqual({ chapterN: 2, lineIndex: 0, rung: 'learn' });
  });

  it('reaches the finish line: complete, no next step, current chapter is the last', () => {
    const allLines = [MAIN_LINE_INDEX, 0, 1, 2];
    const c = course({
      linesDiscovered: allLines,
      linesLearned: allLines,
      linesPerfected: allLines,
      linesPlayed: allLines,
    });
    expect(c.complete).toBe(true);
    expect(c.percent).toBe(100);
    expect(c.completedChapters).toBe(4);
    expect(c.currentChapter).toBe(4);
    expect(c.nextStep).toBeNull();
  });

  it('attaches frequency-ranked sublines from the data file to variation chapters', () => {
    // caro-kann is in course-sublines.json; variation chapters pick up their
    // sublines by index. The main-line chapter carries none (v1).
    const c = buildCourse(
      buildOpeningRecord({
        id: 'caro-kann',
        name: 'Caro-Kann Defence',
        color: 'black',
        variations: [{ name: 'Classical', pgn: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', explanation: 'x' }],
      }),
    );
    expect(c.chapters[0].sublines).toEqual([]); // main line — none
    const variationChapter = c.chapters[1];
    expect(variationChapter.sublines.length).toBeGreaterThan(0);
    // ranked most → least common
    const games = variationChapter.sublines.map((s) => s.games);
    expect(games).toEqual([...games].sort((a, b) => b - a));
    // every subline carries a frequency %
    for (const s of variationChapter.sublines) expect(typeof s.pct).toBe('number');
  });

  it('leaves sublines empty for an opening not in the data file', () => {
    const c = course();
    for (const ch of c.chapters) expect(ch.sublines).toEqual([]);
  });

  it('marks Watch unlocked and later rungs locked until the prior is done', () => {
    const c = course();
    const rungs = c.chapters[0].rungs;
    expect(rungs.find((r) => r.rung === 'watch')?.unlocked).toBe(true);
    expect(rungs.find((r) => r.rung === 'learn')?.unlocked).toBe(false);
  });
});
