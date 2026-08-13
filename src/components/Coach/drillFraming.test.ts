// THE FRAMING BEAT (David 2026-08-13: "Add the framing beat") — a drill
// starts with one hand-written teaching line naming what it sharpens and
// what to look for, before the board demands a move. Source-pinned: the
// framing map lives inline at the drill-announce site so the intro is
// authored, never generated.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('drill framing beat', () => {
  const TEACH = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
  it('the framing map exists and rides the drill intro', () => {
    expect(TEACH).toContain("Let's sharpen your forks");
    expect(TEACH).toMatch(/\$\{framing\}\$\{drill\.prompt\}/);
  });
  it('framing keys off the aid slug or label, never the LLM', () => {
    expect(TEACH).toContain("drill.aid.includes(k) || drill.label.toLowerCase().includes(k)");
  });
});
