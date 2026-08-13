// The corpus must never call the CAPTURER "down" material.
//
// 🔒 hp-54v (2026-08-13, David heard it live in a Benko lesson): a farmed
// note read "After White takes the Benko pawn, he's down a pawn but leads in
// development and controls the center" — the distillation fused Black's
// compensation (down a pawn, development lead) and White's assets (extra
// pawn, center) into one "he". The generation prompt never sees a spliced
// note and the runtime material gate exempts hypotheticals ("After …"), so
// a wrong note repeats in every lesson that splices it, forever, with every
// gate green. The corpus is the fix point (fix the package, not the gate).
//
// This scans the SHIPPED corpus files on disk for the inverted shape — the
// side that just CAPTURED described as down material — so a re-farm that
// regenerates the note wrong fails the build instead of shipping the lie.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'glob';

const INVERTED_SHAPE =
  /(?:after|once|when)\s+(?:white|black)\s+(?:takes|captures|grabs|wins)\b[^.!?]{0,80}?\b(?:he|she|it)'?s?\s+(?:is\s+)?down\b/gi;

describe('corpus material-direction integrity', () => {
  it('no note describes the capturing side as down material', () => {
    const files = [
      ...globSync('public/data/*.json'),
      ...globSync('src/data/*teachings*.json'),
      ...globSync('src/data/*corpus*.json'),
    ].filter((f) => existsSync(f));
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const f of files) {
      const raw = readFileSync(f, 'utf8');
      for (const m of raw.matchAll(INVERTED_SHAPE)) {
        offenders.push(`${f}: …${raw.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 100).replace(/\s+/g, ' ')}`);
      }
    }
    expect(offenders, offenders.join('\n')).toHaveLength(0);
  });

  it('hp-54v carries the corrected accounting', () => {
    const raw = readFileSync('public/data/corpus-spoken.json', 'utf8');
    expect(raw).toContain('Black is down a pawn but leads in development, while White keeps the extra pawn');
    expect(raw).not.toContain("he's down a pawn but leads in development and controls the center");
  });
});
