import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildStudentStateBlock } from './studentStateBlock';

describe('buildStudentStateBlock', () => {
  describe('tempo thresholds (regression — PR #269)', () => {
    // The original tempo bug: every caller passed Date.now() as
    // lastUserInteractionMs, so elapsed was always ~0 and every
    // prompt got "Tempo: FAST — keep replies tight", which silently
    // cancelled Unlimited verbosity. The fix was a <2s floor that
    // treats "message just arrived" as no-signal.

    beforeEach(() => {
      // Freeze time so boundary arithmetic is deterministic.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('treats a timestamp less than 2s ago as no-signal (no FAST directive)', () => {
      // The original bug: caller passed Date.now() → elapsed ≈ 0 →
      // always 'fast' → every turn got "Keep replies tight".
      const block = buildStudentStateBlock({
        lastUserInteractionMs: Date.now() - 500, // half a second ago
      });
      expect(block).not.toMatch(/Tempo: FAST/);
    });

    it('flags FAST tempo when the gap is 2-10 seconds', () => {
      const block = buildStudentStateBlock({
        lastUserInteractionMs: Date.now() - 5_000,
      });
      expect(block).toMatch(/Tempo: FAST/);
    });

    it('flags THINKING tempo when the gap is 10-90 seconds', () => {
      const block = buildStudentStateBlock({
        lastUserInteractionMs: Date.now() - 30_000,
      });
      expect(block).toMatch(/Tempo: THINKING/);
    });

    it('flags IDLE tempo when the gap is over 90 seconds', () => {
      const block = buildStudentStateBlock({
        lastUserInteractionMs: Date.now() - 120_000,
      });
      expect(block).toMatch(/Tempo: IDLE/);
    });

    it('omits tempo entirely when no timestamp is passed', () => {
      const block = buildStudentStateBlock({});
      // No signals → no block at all.
      expect(block).toBe('');
    });
  });

  describe('move trend detection', () => {
    it('calls out a fresh blunder so the coach leads with empathy', () => {
      const block = buildStudentStateBlock({
        recentMoveClassifications: ['good', 'good', 'blunder'],
      });
      expect(block).toMatch(/JUST BLUNDERED/);
    });

    it('flags a good-run when the last 3-5 moves are strong', () => {
      const block = buildStudentStateBlock({
        recentMoveClassifications: ['great', 'brilliant', 'good', 'good'],
      });
      expect(block).toMatch(/good run/i);
    });

    it('flags a rough patch on two-plus-weak-moves-in-a-row', () => {
      const block = buildStudentStateBlock({
        recentMoveClassifications: ['mistake', 'blunder', 'good'],
      });
      expect(block).toMatch(/rough patch/i);
    });
  });

  describe('chat sentiment', () => {
    it('detects frustration cues in recent user messages', () => {
      const block = buildStudentStateBlock({
        recentChat: [
          { id: '1', role: 'user', content: 'ugh why did I do that', timestamp: 1 },
        ],
      });
      expect(block).toMatch(/FRUSTRATED/);
    });

    it('detects confidence cues when the student is on flow', () => {
      const block = buildStudentStateBlock({
        recentChat: [
          { id: '1', role: 'user', content: 'got it, feeling good', timestamp: 1 },
        ],
      });
      expect(block).toMatch(/CONFIDENT/);
    });

    it('stays neutral when cues cancel out or are absent', () => {
      const block = buildStudentStateBlock({
        recentChat: [
          { id: '1', role: 'user', content: 'what is a pin?', timestamp: 1 },
        ],
      });
      expect(block).not.toMatch(/FRUSTRATED|CONFIDENT/);
    });
  });

  describe('turn state', () => {
    it('tells the coach to keep it brief when it is the student\u2019s turn', () => {
      const block = buildStudentStateBlock({ turn: 'student' });
      expect(block).toMatch(/STUDENT's move/);
    });

    it('gives the coach room to be expansive on their own turn', () => {
      const block = buildStudentStateBlock({ turn: 'coach' });
      expect(block).toMatch(/COACH's move/);
    });
  });
});
