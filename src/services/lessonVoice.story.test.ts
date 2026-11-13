// A LESSON LINE KEEPS WHAT IT SAID IN THE ONE PER-GAME STORY (WO-STORY-MATRIX-01
// P1-8e). The lesson's say-once memory was a private set of keys; it is the
// line's `GameStory` now, written at the ply each move is said on, and a
// branch takes a copy of the spine's story.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { forkLessonVoice, newLessonVoice, BRIEFING_LINE_PLIES } from './reviewMoveBriefing';
import { lessonThought } from './moveThoughtFacts';
import { NO_PREV_CAPTURE, prevCaptureOf } from './pvPlayback';

const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+'];

function sayLine(sans: readonly string[], voice: ReturnType<typeof newLessonVoice>): string[] {
  const c = new Chess();
  let prev = NO_PREV_CAPTURE;
  let last: { fenBefore: string; san: string } | null = null;
  return sans.map((san, i) => {
    const fenBefore = c.fen();
    if (last) prev = prevCaptureOf(last.fenBefore, last.san, prev);
    c.move(san);
    const said = lessonThought({ story: false, theory: true, fenBefore, san, moverIsStudent: i % 2 === 0, prev, line: sans.slice(i + 1, i + 1 + BRIEFING_LINE_PLIES), history: sans.slice(0, i), theirLast: last, reads: null, costCp: null }, voice, null);
    last = { fenBefore, san };
    return said;
  });
}

describe('a lesson line keeps what it said in its story', () => {
  it('what the line says is in its story, at the ply it was said', () => {
    const voice = newLessonVoice();
    const said = sayLine(LINE, voice);
    expect(said.some((s) => s.length > 0)).toBe(true);
    const sentences = voice.story.current().sentences;
    expect(sentences.size).toBeGreaterThan(0);
    // Each key is held at a ply of the line, never past its end.
    for (const ply of sentences.values()) expect(ply).toBeLessThan(LINE.length);
    // The ledger the composer reads is that story.
    for (const k of sentences.keys()) expect(voice.keys.has(k)).toBe(true);
  });

  it('a branch remembers the spine, and the spine never hears the branch', () => {
    const spine = newLessonVoice();
    sayLine(LINE.slice(0, 6), spine);
    const before = new Set(spine.story.current().sentences.keys());
    const branch = forkLessonVoice(spine);
    for (const k of before) expect(branch.keys.has(k)).toBe(true);
    sayLine(LINE, branch);
    expect(branch.story.current().sentences.size).toBeGreaterThan(before.size);
    expect(new Set(spine.story.current().sentences.keys())).toEqual(before);
  });
});
