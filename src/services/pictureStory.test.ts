// THE PICTURE'S CONCLUSIONS AS STORY THREADS (the picture work wired into the
// game's story): on real boards, a target read unchanged across two moves is
// said once; a target that changes is said as the change with its cause off
// the two boards; a target or plan never switches with nothing changed on the
// board. Board: endgame-attacks-part-2#3 (pictureLedger.test — the target b5).
import { describe, it, expect } from 'vitest';
import { Chess, type Color } from 'chess.js';
import { readEveryComputer } from './boardBundle';
import { createStoryStore, threadLast, threadKey, PLAN_GOAL, conclusionLine, readStoryOf, threadsOfRead, type PictureConclusionId } from './gameStory';
import { tellPictureFacts, tellConclusion, conclusionCause } from './planThread';
import type { CoachFact } from './coachFact';

const A = '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29';
const after = (fen: string, ...sans: string[]): string => { const c = new Chess(fen); for (const s of sans) c.move(s); return c.fen(); };
const pictureOn = (fen: string, student: Color = 'w'): CoachFact[] =>
  readEveryComputer({ fen, student, lines: [], rating: 1800, history: [], priorMove: null, priorMoveSeat: null, priorLines: null })
    .filter((f) => f.computer === 'pictureTarget' || f.computer === 'pictureLedger');

describe('the picture\'s conclusions are threads of the game\'s story', () => {
  it('a target unchanged across two moves is said once (Review: told, kept, committed)', () => {
    const story = createStoryStore('g');
    const first = tellPictureFacts(pictureOn(A), story.current(), 'w');
    expect(first.find((f) => f.computer === 'pictureTarget')?.text).toMatch(/pawn on b5/);
    story.commitFacts(1, first);
    expect(threadLast(story.current(), threadKey('student', PLAN_GOAL.pictureTarget))?.variant).toBe('b5');
    // 30.Kg2 Kh7: nothing touched b5 — the same target, the same ledger.
    const next = pictureOn(after(A, 'Kg2', 'Kh7'));
    expect(next.find((f) => f.computer === 'pictureTarget')?.conclusion?.variant).toBe('b5');
    const second = tellPictureFacts(next, story.current(), 'w');
    expect(second.map((f) => f.computer)).toEqual([]);
  });

  it('a changed target is said as the change, with its cause off the board', () => {
    const story = createStoryStore('g');
    story.commitFacts(1, tellPictureFacts(pictureOn(A), story.current(), 'w'));
    // 30.Bxb5 Kh7: the pawn on b5 is taken — the target moves to a4.
    const now = after(A, 'Bxb5', 'Kh7');
    const told = tellPictureFacts(pictureOn(now), story.current(), 'w');
    const t = told.find((f) => f.computer === 'pictureTarget');
    expect(t?.text).toBe('Their pawn on b5 is gone. The target is now the pawn on a4: three of your pieces and pawns can get at it, and only two of theirs can guard it.');
    // The change is a new claim (the b5 claim said before must not hold it).
    expect(t?.claims.every((k) => k.includes('@'))).toBe(true);
    story.commitFacts(3, told);
    expect(threadLast(story.current(), threadKey('student', PLAN_GOAL.pictureTarget))?.variant).toBe('a4');
  });

  it('the cause reads the relations on the two squares: guarded now, hit now', () => {
    // 30.Qb6 Qc6: their queen comes to c6 and guards b5.
    expect(conclusionCause(A, after(A, 'Qb6', 'Qc6'), 'b5', 'c6', 'w')).toBe('their pawn on b5 is guarded by their queen on c6 now');
    // 30.Qd7 Qc8: the new target is hit by your queen.
    expect(conclusionCause(A, after(A, 'Qd7', 'Qc8'), 'b5', 'c8', 'w')).toBe('your queen on d7 now hits their queen on c8');
    // NEGATIVE: nothing on b5 or d5 changed.
    expect(conclusionCause(A, after(A, 'Kg2', 'Kh7'), 'b5', 'd5', 'w')).toBeNull();
  });

  it('a plan never switches with nothing changed on the board — held; a verdict word says its own change', () => {
    const story = createStoryStore('g');
    const plan = (variant: string, fen: string, square: string): PictureConclusionId => ({
      key: threadKey('student', PLAN_GOAL.picturePlan), variant, fen, square, changedText: 'The plan changes here: x.', needsCause: true,
    });
    story.commitThreads(1, [conclusionLine(plan('siege:b5', A, 'b5'))]);
    // The same board read again with another plan (the engine wobbling): held.
    expect(tellConclusion(story.current(), plan('outpost:d5', A, 'd5'), 'w').told).toBe('held');
    // Two moves on, nothing on b5 or d5 changed: still held.
    expect(tellConclusion(story.current(), plan('outpost:d5', after(A, 'Kg2', 'Kh7'), 'd5'), 'w').told).toBe('held');
    // The same plan: not news.
    expect(tellConclusion(story.current(), plan('siege:b5', after(A, 'Kg2', 'Kh7'), 'b5'), 'w').told).toBe('same');
    // The pawn on b5 taken: the plan changes, with its cause.
    const r = tellConclusion(story.current(), plan('siege:a4', after(A, 'Bxb5', 'Kh7'), 'a4'), 'w');
    expect([r.told, r.cause]).toEqual(['changed', 'their pawn on b5 is gone']);
    const facts = tellPictureFacts([{ text: 'x', claims: ['k'], conclusion: plan('outpost:d5', A, 'd5') }], story.current(), 'w');
    expect(facts).toEqual([]);
    // A verdict needs no board cause: its own tries carry it.
    const verdict = (variant: string): PictureConclusionId => ({ key: threadKey('student', PLAN_GOAL.pictureVerdict), variant, fen: A, square: null, changedText: 'v2', needsCause: false });
    story.commitThreads(1, [conclusionLine(verdict('hard-to-finish:1'))]);
    expect(tellConclusion(story.current(), verdict('hard-to-finish:1'), 'w').told).toBe('same');
    expect(tellConclusion(story.current(), verdict('works-now:2'), 'w').told).toBe('changed');
  });

  it('Learn: an offered conclusion is stated only when the door keeps its line, and a takeback forgets it', () => {
    const story = createStoryStore('g');
    const [t] = tellPictureFacts(pictureOn(A), story.current(), 'w').filter((f) => f.computer === 'pictureTarget');
    story.offer(A, { text: t.text, thread: conclusionLine(t.conclusion as PictureConclusionId) });
    story.commitKept(1, A, []);
    expect(threadLast(story.current(), threadKey('student', PLAN_GOAL.pictureTarget))).toBeNull();
    story.offer(A, { text: t.text, thread: conclusionLine(t.conclusion as PictureConclusionId) });
    story.commitKept(2, A, [{ text: t.text }]);
    expect(threadLast(story.current(), threadKey('student', PLAN_GOAL.pictureTarget))?.at?.square).toBe('b5');
    // The checkpoint carries the board and square.
    const back = createStoryStore('x');
    back.restore(story.serialize());
    expect(threadLast(back.current(), threadKey('student', PLAN_GOAL.pictureTarget))?.at).toEqual({ fen: A, square: 'b5' });
    story.rewind(1);
    expect(threadLast(story.current(), threadKey('student', PLAN_GOAL.pictureTarget))).toBeNull();
  });

  it('the read\'s snapshot of the story is plain data and tells the same', () => {
    const story = createStoryStore('g');
    story.commitFacts(1, tellPictureFacts(pictureOn(A), story.current(), 'w'));
    const snap = structuredClone(readStoryOf(story.current()));
    const next = pictureOn(after(A, 'Kg2', 'Kh7'));
    expect(tellPictureFacts(next, threadsOfRead(snap), 'w')).toEqual(tellPictureFacts(next, story.current(), 'w'));
    expect(tellPictureFacts(next, threadsOfRead(snap), 'w')).toEqual([]);
  });
});
