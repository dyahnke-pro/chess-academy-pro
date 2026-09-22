/**
 * A NOISE AUDIT EVENT IS A LYING INSTRUMENT (WO-STANDARD-01 H5).
 *
 * `phase_transition_suppressed`: 941 native rows in 30 days on four devices —
 * 512 "skipped: coach move (ply N)", 428 "no-fire" one per student ply, ONE
 * real suppression. The plan below decides when a row is worth writing; the
 * page holds only the ref. The source scan is the second half: the page must
 * consult the plan and must not have kept the per-ply coach-move row.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  planPhaseNoFireAudit, phaseDiagnosticSignature, type PhaseTransitionDiagnostic,
} from './phaseTransitionDetector';

function diag(over: Partial<PhaseTransitionDiagnostic> = {}): PhaseTransitionDiagnostic {
  return {
    moveNumber: 9, san: 'Nf6', isCoachMove: false, fullMoveNumber: 5,
    phase: 'opening', studentCastled: false, studentRooksOnBackRank: false,
    developedMinors: { white: 2, black: 1, total: 3 }, majorPieceCaptured: false,
    endgameByMaterialFallback: false, openingToMiddlegameFired: false, middlegameToEndgameFired: false,
    ...over,
  };
}

describe('planPhaseNoFireAudit', () => {
  it('a coach move never writes — the detector declines it by contract', () => {
    const p = planPhaseNoFireAudit({ isCoachMove: true }, diag({ isCoachMove: true }), null);
    expect(p.write).toBe(false);
    expect(!p.write && p.why).toBe('coach-move');
  });
  it('the first student no-fire writes', () => {
    const p = planPhaseNoFireAudit({ isCoachMove: false }, diag(), null);
    expect(p.write).toBe(true);
  });
  it('the NEXT ply with the same inputs does NOT write — once per signature, not per ply', () => {
    const first = planPhaseNoFireAudit({ isCoachMove: false }, diag(), null);
    const sig = first.write ? first.signature : null;
    const again = planPhaseNoFireAudit({ isCoachMove: false }, diag({ moveNumber: 11, san: 'a6' }), sig);
    expect(again.write).toBe(false);
    expect(!again.write && again.why).toBe('unchanged');
  });
  it('NEGATIVE CONTROL — a changed input writes again', () => {
    const first = planPhaseNoFireAudit({ isCoachMove: false }, diag(), null);
    const sig = first.write ? first.signature : null;
    const moved = planPhaseNoFireAudit({ isCoachMove: false }, diag({ developedMinors: { white: 3, black: 1, total: 4 } }), sig);
    expect(moved.write).toBe(true);
    const castled = planPhaseNoFireAudit({ isCoachMove: false }, diag({ studentCastled: true }), sig);
    expect(castled.write).toBe(true);
  });
  it('the signature ignores the move itself and the ply — those are what made it per-ply', () => {
    expect(phaseDiagnosticSignature(diag({ san: 'a6', moveNumber: 11 }))).toBe(phaseDiagnosticSignature(diag()));
  });
  it('a 40-ply opening stretch with three real changes is four rows, not forty', () => {
    let sig: string | null = null;
    let rows = 0;
    for (let ply = 1; ply <= 40; ply += 1) {
      const coach = ply % 2 === 0;
      const dev = ply < 10 ? 2 : ply < 20 ? 4 : ply < 30 ? 6 : 8;
      const p = planPhaseNoFireAudit({ isCoachMove: coach }, diag({ moveNumber: ply, developedMinors: { white: dev / 2, black: dev / 2, total: dev } }), sig);
      if (p.write) { rows += 1; sig = p.signature; }
    }
    expect(rows).toBe(4);
  });
});

describe('CoachGamePage consults the plan', () => {
  const src = readFileSync(resolve(__dirname, '../components/Coach/CoachGamePage.tsx'), 'utf8');
  it('the per-ply coach-move row is gone', () => {
    expect(src).not.toContain('skipped: coach move');
  });
  it('the no-fire row goes through planPhaseNoFireAudit', () => {
    expect(src).toContain('planPhaseNoFireAudit(lastMove, diag, phaseNoFireSigRef.current)');
  });
});
