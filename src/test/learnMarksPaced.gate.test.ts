// MARKS APPEAR AS THEY ARE MENTIONED (David 2026-10-19). Learn's live turn
// hands every line's arrows and highlights to the voice, which reveals them on
// `markPacing`'s schedule — never painted all at once when the reply lands.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');

describe('Learn marks are paced with the voice', () => {
  it('both waves speak with their marks', () => {
    expect(src).toMatch(/speakTrackA\(lines\.join\(' '\), instantMarks\)/);
    expect(src).toMatch(/speakTrackA\(hintPkg\.spoken, [^)]*arrows: uniqueArrows\(turnArrows\), highlights: owed/);
  });
  it('the reveal runs on the one schedule', () => {
    expect(src).toMatch(/scheduleMarks\(spoken, items\)/);
  });
  it('no kept-fact highlight or late arrow is painted ahead of its words', () => {
    expect(src).not.toMatch(/padDone\.then\(\(\) => \{\s*if \(liveFenRef\.current !== fenAfterReply\) return;\s*setHighlights/);
    expect(src).not.toMatch(/setArrows\(uniqueArrows\(\[\.\.\.\(seenMarkRef\.current \? \[seenMarkRef\.current\] : \[\]\), \.\.\.turnArrows\]\)\)/);
  });
});
