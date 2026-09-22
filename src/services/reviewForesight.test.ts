// FORESIGHT AS A SKILL on the review walk (David 2026-09-16: "Future moves, how
// to think, threat identification, that is teaching").
//
// The Italian, and the student is White. At ply 7 the move on the board is Ng5 —
// the Fried Liver idea, which sets up Nxf7 forking the queen on d8 and the rook
// on h8 (f7 is un-takeable because Bc4 covers it through the empty d5–e6
// diagonal, so Kxf7 is illegal). The student played the quiet d3 instead.
//
// Review already tells them what the better move was. This proves it also tells
// them what was READABLE BEFORE the shot existed — and only when this student's
// own record says they need the habit.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import type { WeaknessSignal } from './weaknessSignal';

const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5'];
const SHOT_PLY = 7; // White's d3, where Ng5 was the shot

function inputs(): ReviewMoveInput[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    const mv = c.move(san);
    if (!mv) throw new Error(`bad fixture san ${san}`);
    const flagged = i + 1 === SHOT_PLY;
    return {
      ply: i + 1,
      san: mv.san,
      isCoachMove: false,
      classification: flagged ? ('mistake' as const) : ('book' as const),
      evaluation: flagged ? -120 : 20,
      preMoveEval: 20,
      bestMove: flagged ? 'f3g5' : null,
      fenAfter: c.fen(),
    };
  });
}

const forkHole = (status: WeaknessSignal['lifecycleStatus']): WeaknessSignal[] => [{
  clusterId: 'analysis:tactic:fork',
  capabilityTag: null, proven: false, bucket: 'tactical',
  label: 'Missed forks',
  openCount: status === 'fixed' ? 0 : 4,
  total: status === 'fixed' ? 4 : 4,
  severity: 60,
  lifecycleStatus: status,
  trend: 'flat',
  puzzleThemes: ['fork'],
}];

const shotNarration = (weaknesses: WeaknessSignal[]): string =>
  buildReviewSegments(inputs(), 'white', 'Italian Game', false, 1400, weaknesses)
    .filter((s) => s.ply === SHOT_PLY)
    .map((s) => s.narration ?? '')
    .join(' ');

describe('review foresight — here was the signal', () => {
  it('FIRES for a student whose spine says they keep missing forcing shots', () => {
    const say = shotNarration(forkHole('persistent'));
    expect(say).toMatch(/signal was there/);
    expect(say).toContain('queen on d8');
    expect(say).toContain('rook on h8');
    expect(say).toContain('f7');
  });

  // The whole correction David made twice in one night: a beat that fires on
  // everyone regardless of their record is the drumbeat, not teaching.
  it('is SILENT for a student who has closed that hole', () => {
    expect(shotNarration(forkHole('fixed'))).not.toMatch(/signal was there/);
  });

  // Cold start is never mute — an unscored habit reads as owed, because a
  // student with no history has not proven they can see it.
  it('FIRES for a cold student with no profile at all', () => {
    expect(shotNarration([])).toMatch(/signal was there/);
  });

  it('never claims the guard square the shot itself creates', () => {
    const say = shotNarration(forkHole('persistent'));
    expect(say).not.toMatch(/backed up by/);
  });
});
