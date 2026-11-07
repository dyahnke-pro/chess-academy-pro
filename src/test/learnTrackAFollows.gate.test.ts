// THE REPLY'S FIRST LINE FOLLOWS THIS MOVE'S OWN LINES, NEVER CUTS THEM (focus
// prod audit 2026-11-07, record game 3, ply 15). The student's 8.Be3 answered
// an asked chance and skipped a ready castle: the focus said the credit and the
// castling reminder, chained, before the coach replied. When the reply landed,
// Track A — the door's instant line — opened with `voiceService.stop()` and a
// fresh chain: the credit was cut, the reminder was pushed behind the reply's
// line and the next move dropped it. The `castle-watch` row said reminder; the
// voice never did (audit F14: 1 reminder row, 0 reminder lines).
//
// The previous turn is retired where the board moves — handleStudentMove stops
// the voice and moves Track A's generation on BEFORE the focus or a mission
// reads the move — so by the time the reply's first line speaks, the chain
// holds only this move's own lines. Track A appends to them.
// Scanned with comments stripped, so a comment naming a call is not a call.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const PAGE = strip(readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8'));

describe("the reply's first line follows the lines said about the student's move", () => {
  it('Track A starting neither stops the voice nor drops the chain', () => {
    const start = PAGE.indexOf('trackAStarted = true;');
    const end = PAGE.indexOf('const heard = stripThink(line);', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const opening = PAGE.slice(start, end);
    expect(opening).not.toMatch(/voiceService\.stop\(\)/);
    expect(opening).not.toMatch(/speechChainRef\.current = Promise\.resolve\(\)/);
    // The owed answer joins the chain behind them, too — a line spoken beside
    // the chain races it, and the later of two waiting lines cuts the earlier.
    expect(opening).not.toMatch(/speechChainRef\.current = speakLearn\(/);
  });

  it('the previous turn is retired where the board moves, before the focus and the mission read the move', () => {
    const move = PAGE.indexOf('const handleStudentMove = useCallback(');
    const stop = PAGE.indexOf('voiceService.stop();', move);
    const gen = PAGE.indexOf('trackAGenRef.current += 1;', move);
    const mission = PAGE.indexOf('missionRef.current.moved(', move);
    const focus = PAGE.indexOf('focusRef.current.moved(', move);
    expect(move).toBeGreaterThan(0);
    expect(stop).toBeGreaterThan(move);
    expect(stop).toBeLessThan(mission);
    expect(gen).toBeGreaterThan(move);
    expect(gen).toBeLessThan(focus);
  });
});
