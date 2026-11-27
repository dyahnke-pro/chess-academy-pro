import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// YOUR OWN TAKEBACK NEVER MAKES A PUZZLE (David 2026-10-23). The page marks
// the exact move the student undid (the bar's Takeback, a takeback in chat),
// the 6-s grade reads the mark, and the coach's own rewind (Go back and
// castle) is not the student's. This replaced a board snapshot taken 6 s
// after the move, which a takeback at 7 s never reached and nothing read.
const PAGE = readFileSync(resolve(__dirname, '../components/Coach/CoachTeachPage.tsx'), 'utf8');

describe('the student\'s own takeback is marked exactly', () => {
  it('a move played on a looked-back board marks every ply it undoes as the student\'s own', () => {
    // No Takeback button (2026-11-24): the different move is the takeback,
    // through takeBackPlies(n, true), which marks each ply.
    expect(PAGE).toMatch(/takeBackPlies\(play\.plies, true\)/);
    expect(PAGE).toMatch(/return n > 0 \? takeBackPlies\(n, true\)/);
    expect(PAGE).toMatch(/for \(let i = 0; i < count; i\+\+\) \{\s*noteUndonePly\(pliesBefore - i, own\);/);
  });
  it('every takeback in chat is the student\'s own; the castling rewind is the coach\'s', () => {
    expect(PAGE).toMatch(/const handleTakeBack = useCallback\(\(count: number\)[^\n]*=> takeBackPlies\(count, true\)/);
    expect(PAGE).toMatch(/focusTakeBackRef\.current = \(count: number\) => takeBackPlies\(count, false\);/);
  });
  it('the grade reads the mark, never a board snapshot alone', () => {
    expect(PAGE).toMatch(/const takenBack = ownTakenBackRef\.current\.has\(moveSerial\) \|\|/);
    expect(PAGE).not.toMatch(/takenBack: gameRef\.current\.history\[/);
  });
});
