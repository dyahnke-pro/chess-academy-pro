/**
 * isCriticalThreat — the proactive-tactic-alert criticality gate.
 *
 * David 2026-06-01: the in-game coach "points out every pin even if it's
 * not critical … mainly in the opening." The detector flags every
 * geometric pattern in the Stockfish PV; this gate keeps only the ones
 * that actually matter — a forced mate, or the opponent winning material
 * (read off the source PV line's eval) — with a stricter bar in the
 * opening. Eval is stored from WHITE's perspective.
 */
import { describe, it, expect } from 'vitest';
import {
  isCriticalThreat,
  CRITICAL_THREAT_CP,
  CRITICAL_THREAT_CP_OPENING,
} from './tacticAlertService';

const t = (
  lineEval: number,
  lineMate: number | null = null,
): { lineEval: number; lineMate: number | null } => ({ lineEval, lineMate });

describe('isCriticalThreat', () => {
  it('suppresses a harmless opening pin (≈ equal eval)', () => {
    // White student, opponent "pin" in a line that evaluates to +0.2 (white).
    expect(isCriticalThreat(t(20), 'w', true)).toBe(false);
    expect(isCriticalThreat(t(-40), 'w', true)).toBe(false); // slightly worse, still not critical
  });

  it('fires when the opponent genuinely wins material (middlegame bar)', () => {
    // White student losing ~2 pawns in the line → critical past the 1.5 bar.
    expect(isCriticalThreat(t(-200), 'w', false)).toBe(true);
  });

  it('applies the stricter opening bar', () => {
    // -2.0 clears the middlegame bar (150) but NOT the opening bar (250).
    expect(isCriticalThreat(t(-200), 'w', false)).toBe(true);
    expect(isCriticalThreat(t(-200), 'w', true)).toBe(false);
    // -3.0 clears even the opening bar.
    expect(isCriticalThreat(t(-300), 'w', true)).toBe(true);
  });

  it('reads eval from the student\'s perspective (black student)', () => {
    // Eval is white-perspective. +250 (white winning) means the BLACK
    // student is losing 2.5 → critical.
    expect(isCriticalThreat(t(250), 'b', false)).toBe(true);
    // -250 (black winning) is NOT a threat to the black student.
    expect(isCriticalThreat(t(-250), 'b', false)).toBe(false);
  });

  it('always fires on a forced mate regardless of eval', () => {
    expect(isCriticalThreat(t(0, 3), 'w', true)).toBe(true);
    expect(isCriticalThreat(t(0, -2), 'b', true)).toBe(true);
  });

  it('uses the documented thresholds', () => {
    expect(CRITICAL_THREAT_CP).toBe(150);
    expect(CRITICAL_THREAT_CP_OPENING).toBe(250);
    // Exactly at the bar counts as critical (≤ -bar).
    expect(isCriticalThreat(t(-CRITICAL_THREAT_CP), 'w', false)).toBe(true);
    expect(isCriticalThreat(t(-(CRITICAL_THREAT_CP - 1)), 'w', false)).toBe(false);
  });
});
