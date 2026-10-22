import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 🔒 A BOARD MOVE RETIRES THE PREVIOUS TURN'S VOICE QUEUE (clean-pass walk
// 2026-10-03, G1 ply 45→47). The verdict on 23.Bxf6+ was spoken after the
// student had already played 24.Rc7+, so "That trades your active bishop…"
// named the wrong move. Track A drops a chained line only when its generation
// changes; the student's move must advance it, as a typed question does.
describe('a student move retires last turn\'s queued lines', () => {
  it('handleStudentMove bumps trackAGenRef', () => {
    const src = readFileSync(resolve(__dirname, 'CoachTeachPage.tsx'), 'utf8');
    const start = src.indexOf('const handleStudentMove = useCallback(');
    expect(start).toBeGreaterThan(0);
    // The body runs to where the move is processed (the pre-move FEN is read
    // there), so both must land BEFORE it. Bounded by that line, never by a
    // fixed character count: a 6,000-character window broke the day three
    // unrelated lines were added above it (2026-10-22).
    const end = src.indexOf('const fenBefore = liveFenRef.current', start);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end).replace(/\/\/.*$/gm, '');
    const stop = body.indexOf('voiceService.stop();');
    const bump = body.indexOf('trackAGenRef.current += 1');
    expect(stop).toBeGreaterThan(0);
    expect(bump).toBeGreaterThan(stop);
  });
});
