/**
 * 🔒 OUTCOME SENTENCES COME FROM THE LEDGER (WO-OUTCOME-01 D, 2026-10-03).
 *
 * "It would win your bishop", "that hung the knight", "it can't be held" are
 * claims about what a line NETS, and only `exchangeLedger` settles that. A
 * sentence composed from a one-square swap count was the source of every false
 * material line the walks found (a pawn "won" the line handed back, a piece
 * "hung" that the engine's line never takes).
 *
 * Code that composes outcome wording is counted per file against a baseline
 * that may only SHRINK: a NEW outcome sentence fails here until it is either
 * produced by the ledger's renderer or proven over the engine line by it and
 * consciously added. Hand-written lesson prose (`src/data`) is board-checked by
 * the narration-accuracy gate instead and is out of scope here.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import baseline from './outcomeSentences.baseline.json';

export const OUTCOME = /\b(would win|wins? the (?:pawn|knight|bishop|rook|queen|exchange)|winning the (?:pawn|knight|bishop|rook|queen|exchange)|you can win|can't be held|it falls\b|would (?:simply )?have dropped|hung the|is hanging|was hanging|for free\b|for nothing\b|wins it outright|is free material|drops (?:a|the|about))/i;

/** The ledger's own renderer — the one place outcome words are produced. */
const RENDERER = new Set(['src/services/exchangeLedger.ts']);
const ROOTS = ['src/services', 'src/components', 'src/hooks', 'src/coach', 'src/utils'];

export function countOutcomeLines(text: string): number {
  let n = 0;
  for (const l of text.split('\n')) {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('*')) continue;
    const lits = l.match(/`[^`]*`|'[^'\n]*'|"[^"\n]*"/g) ?? [];
    if (lits.some((x) => OUTCOME.test(x))) n += 1;
  }
  return n;
}

function scan(): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) {
        const key = p.split(path.sep).join('/');
        if (RENDERER.has(key)) continue;
        const n = countOutcomeLines(fs.readFileSync(p, 'utf8'));
        if (n > 0) out[key] = n;
      }
    }
  };
  for (const r of ROOTS) if (fs.existsSync(r)) walk(r);
  return out;
}

describe('outcome sentences only from the ledger', () => {
  it('the scanner sees an outcome sentence (non-vacuous)', () => {
    expect(countOutcomeLines("return `They're eyeing ${san} — it would win ${what}.`;")).toBe(1);
    expect(countOutcomeLines('// it would win the knight — a comment')).toBe(0);
    expect(countOutcomeLines("return `Their knight attacks your bishop on ${sq}.`;")).toBe(0);
  });

  it('no file composes more outcome sentences than its baseline', () => {
    const now = scan();
    const base = baseline as Record<string, number>;
    const grew = Object.entries(now)
      .filter(([f, n]) => n > (base[f] ?? 0))
      .map(([f, n]) => `${f}: ${n} (baseline ${base[f] ?? 0})`);
    expect(grew, `outcome wording added outside the ledger — prove it over the line with exchangeLedger, or say the board fact:\n  ${grew.join('\n  ')}`).toEqual([]);
  });

  it('the baseline only shrinks — lower it when a site is migrated', () => {
    const now = scan();
    const stale = Object.entries(baseline as Record<string, number>)
      .filter(([f, n]) => (now[f] ?? 0) < n)
      .map(([f, n]) => `${f}: baseline ${n}, now ${now[f] ?? 0}`);
    expect(stale, `lower these baseline entries:\n  ${stale.join('\n  ')}`).toEqual([]);
  });
});
