// Trap-claims must be backed by the engine (David 2026-08-27: "if the narrations
// say there's a trap, it must be backed by the gem finder"). This gate reads the
// Stockfish verification manifest (`trap-engine-verification.json`, regenerated
// by scripts/audit-traps-stockfish.mjs + scripts/triage-traps.mjs) and fails the
// build if any SHIPPED pro-rep trap/warning is unverified or contradicts its
// engine verdict — so an unbacked "weapon you can spring" can never reach a user.
//
// It runs data-only (no engine) so it's fast enough for ship-check; the engine
// pass that produces the manifest runs offline when trap content changes.
import { describe, it, expect } from 'vitest';
import proRep from './pro-repertoires.json';
import classifications from './trap-line-classifications.json';
import manifest from './trap-engine-verification.json';

interface Verdict { role: 'trap' | 'warning'; cp: number | null; kind: string | null; status: string }
const V = (manifest as { verification: Record<string, Verdict> }).verification;
const CLS = (classifications as { classifications: Record<string, string> }).classifications;
const openings = (proRep as { openings: Array<{ id: string; trapLines?: Array<{ name: string }>; warningLines?: Array<{ name: string }> }> }).openings;

describe('pro-rep trap-claims are engine-backed (no unbacked weapon reaches a user)', () => {
  it('every shipped trapLine + warningLine has a Stockfish verdict in the manifest', () => {
    const unverified: string[] = [];
    for (const op of openings) {
      for (const t of op.trapLines ?? []) if (!V[`${op.id}::${t.name}`]) unverified.push(`${op.id}::${t.name}`);
      for (const w of op.warningLines ?? []) if (!V[`${op.id}::${w.name}`]) unverified.push(`WARN ${op.id}::${w.name}`);
    }
    // A new trap/warning must be run through the audit+triage before it ships.
    expect(unverified).toEqual([]);
  });

  it('no shipped trapLine is a LOSER (the engine says the student ends worse)', () => {
    const losers: string[] = [];
    for (const op of openings) {
      for (const t of op.trapLines ?? []) {
        const v = V[`${op.id}::${t.name}`];
        if (v && v.cp != null && v.cp < -50) losers.push(`${op.id}::${t.name} (${v.cp}cp)`);
      }
    }
    expect(losers).toEqual([]);
  });

  it('a trapLine classified `trap` (a decisive weapon) is verified ≥ +200cp or mate', () => {
    const soft: string[] = [];
    for (const op of openings) {
      for (const t of op.trapLines ?? []) {
        const key = `${op.id}::${t.name}`;
        if (CLS[key] !== 'trap') continue; // mistake/theme are softer chips, not "spring this and win"
        const v = V[key];
        if (v && v.cp != null && v.cp < 200) soft.push(`${key} (${v.cp}cp, classified trap)`);
      }
    }
    expect(soft).toEqual([]);
  });

  it('every shipped warningLine actually PUNISHES the student (≤ -100cp) — no toothless warnings', () => {
    const toothless: string[] = [];
    for (const op of openings) {
      for (const w of op.warningLines ?? []) {
        const v = V[`${op.id}::${w.name}`];
        if (v && v.cp != null && v.cp > -100) toothless.push(`${op.id}::${w.name} (${v.cp}cp)`);
      }
    }
    expect(toothless).toEqual([]);
  });
});
