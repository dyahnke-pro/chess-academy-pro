import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LessonScript } from '../types';

const generateOpening = vi.fn();
vi.mock('./openingGenerator', () => ({ generateOpening: (...a: unknown[]): unknown => generateOpening(...a) }));
const walkthroughLesson = vi.fn();
vi.mock('./walkthroughLesson', () => ({ walkthroughLesson: (...a: unknown[]): unknown => walkthroughLesson(...a) }));

const { generatedLessonFor, lessonBeatsOnLine, __resetGeneratedLessons } = await import('./generatedLesson');

const MOVES = ['e4', 'e5', 'Bc4', 'Nc6'];
const script = (beats: LessonScript['beats']): LessonScript => ({ openingId: 'o', title: 't', minutes: 1, orientation: 'white', beats, kind: 'variation' });

describe('generatedLessonFor', () => {
  beforeEach(() => { __resetGeneratedLessons(); generateOpening.mockReset(); walkthroughLesson.mockReset(); });

  it('builds once per line and walks the line\'s own moves', async () => {
    generateOpening.mockResolvedValue({ ok: true, tree: { root: {} } });
    walkthroughLesson.mockReturnValue(script([{ id: 'a', moves: ['e4'], say: 'x' }]));
    const args = { name: "Bishop's Opening", eco: 'C23', moves: MOVES, openingId: 'o', color: 'white' as const };
    const a = await generatedLessonFor(args);
    const b = await generatedLessonFor(args);
    expect(a).toBe(b);
    expect(generateOpening).toHaveBeenCalledTimes(1);
    expect(generateOpening.mock.calls[0][1]).toEqual({ entryOverride: { canonicalName: "Bishop's Opening", eco: 'C23', moves: MOVES } });
    expect(walkthroughLesson.mock.calls[0][4]).toEqual(MOVES);
  });

  it('a failed build is not kept, and never rejects', async () => {
    generateOpening.mockRejectedValueOnce(new Error('boom'));
    const args = { name: 'X', eco: '', moves: MOVES, openingId: 'o', color: 'black' as const };
    expect(await generatedLessonFor(args)).toBeNull();
    generateOpening.mockResolvedValue({ ok: true, tree: { root: {} } });
    walkthroughLesson.mockReturnValue(script([{ id: 'a', moves: ['e4'], say: 'x' }]));
    expect(await generatedLessonFor(args)).not.toBeNull();
    expect(generateOpening).toHaveBeenCalledTimes(2);
  });
});

describe('lessonBeatsOnLine', () => {
  it('lays each spoken beat on its own move, only while the lesson walked the line', () => {
    const beats = lessonBeatsOnLine(script([
      { id: '0', moves: ['e4'], say: 'Takes the centre.', sayShort: 'Centre.' },
      { id: '1', moves: ['e4', 'e5'], say: '   ' },
      { id: '2', moves: ['e4', 'e5', 'Nf3'], say: 'Off the line.' },
      { id: '3', moves: ['e4', 'e5', 'Bc4'], say: 'Eyes f7.', arrows: [{ from: 'c4', to: 'f7' }] },
      { id: '4', moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], say: 'Past the line.' },
    ]), MOVES);
    expect(beats).toEqual([
      { atMove: 0, say: 'Takes the centre.', sayShort: 'Centre.' },
      { atMove: 2, say: 'Eyes f7.', arrows: [{ from: 'c4', to: 'f7' }] },
    ]);
  });
});

describe('overlayBeats', () => {
  it('lays beats on a line that starts mid-game: words, cues, arrows never twice, pawn arrows as highlights', async () => {
    const { overlayBeats: overlay } = await import('./generatedLesson');
    const line = {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      moves: ['Nf3', 'Nc6'],
      annotations: ['', ''],
      arrows: [[{ from: 'g1', to: 'f3' }], [{ from: 'b8', to: 'c6' }]],
      highlights: [[], []],
    };
    const out = overlay(line, [
      { atMove: 1, say: 'Before the line.' },
      { atMove: 2, say: 'Hits e5.', sayShort: 'Hits e5.', arrows: [{ from: 'g1', to: 'f3' }, { from: 'f3', to: 'e5' }, { from: 'd2', to: 'd4' }] },
    ], 2);
    expect(out.annotations).toEqual(['Hits e5.', '']);
    expect(out.learnCues).toEqual(['Hits e5.', '']);
    expect(out.arrows[0]).toEqual([{ from: 'g1', to: 'f3' }, { from: 'f3', to: 'e5' }]);
    expect(out.highlights?.[0]).toEqual([{ square: 'd4', color: 'rgba(255,214,0,0.88)' }]);
  });
});
