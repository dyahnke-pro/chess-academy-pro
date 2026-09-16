import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ── THE EVAL UNIT IS "POINTS", NEVER "PAWNS" (David 2026-09-16) ─────────────
// The review's quality facet has always said "costing about 0.5 points", but
// 37 other sites said "pawns" — including the turning-point reveal David read
// back: "The game turned at move 12, knight to e5 — about 2.0 pawns."
// One board, two vocabularies for the same number.
//
// EXEMPT: structureProse.ts, which says "your pawns are doubled on the d-file"
// — that is the PIECE, not the unit, and must never be rewritten.

const DIR = join(process.cwd(), 'src/services');
const PIECE_PAWN_FILES = new Set(['structureProse.ts']);
// `${...} pawns` — a template value followed by the unit word.
const UNIT_PAWNS = /\}\s+pawns\b/;

describe('eval units', () => {
  const files = readdirSync(DIR).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !PIECE_PAWN_FILES.has(f),
  );

  it('the gate can see the services directory (non-vacuous)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no service renders an evaluation in "pawns"', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(DIR, f), 'utf8');
      src.split('\n').forEach((line, i) => {
        if (UNIT_PAWNS.test(line)) offenders.push(`${f}:${i + 1}  ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders, `say "points", not "pawns":\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the piece sense is still allowed where it belongs', () => {
    const src = readFileSync(join(DIR, 'structureProse.ts'), 'utf8');
    expect(UNIT_PAWNS.test(src)).toBe(true);
  });
});
