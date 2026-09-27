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

  // hp-54v belonged to hangingpawns, removed from the registry 2026-09-21, and
  // its bake entry was pruned 2026-09-26 with the rest of the dead creators —
  // so the positive "carries the corrected accounting" check has nothing left
  // to find. The negative half is what protects students: the lie never ships.
  it('hp-54v inverted accounting never ships', () => {
    const raw = readFileSync('public/data/corpus-spoken.json', 'utf8');
    expect(raw.length).toBeGreaterThan(1000);
    expect(raw).not.toContain("he's down a pawn but leads in development and controls the center");
  });
});
