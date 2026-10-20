// Review audit on prod (2026-10-13): "And there's a deeper threat brewing — if
// they sit still, it runs knight takes g4 — you win a bishop" named no owner
// until its last clause. The deep-threat projection is the student's line.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('the deeper threat names its owner', () => {
  const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
  it('says "you have" and "your line"', () => {
    expect(src).toMatch(/And you have a deeper threat brewing — if they sit still, your line goes/);
  });
  it('the ownerless wording is gone', () => {
    expect(src).not.toMatch(/And there's a deeper threat brewing/);
  });
});
