// A directive must never be speakable (David 2026-08-01, from prod: the coach
// read "The coach replied g5 — it is already on the board; never suggest
// playing it." out loud). That sentence was authored as model INPUT and lived
// in the `facts` string, and every guard in voiceFacts falls back to serving
// facts verbatim — so a tripped guard spoke the instruction.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('facts vs directives', () => {
  it('the move-narration FACTS string carries no instruction to the model', () => {
    const page = src('src/components/Coach/CoachTeachPage.tsx');
    const start = page.indexOf('moveNarrationFacts:');
    const end = page.indexOf('moveNarrationDirectives:', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const factsBlock = page.slice(start, end);
    // The two directives that were being spoken.
    expect(factsBlock).not.toMatch(/never suggest playing it/i);
    expect(factsBlock).not.toMatch(/Narrate the coach's reply/i);
  });

  it('voiceFacts sends directives to the model but never into `facts`', () => {
    const api = src('src/services/coachApi.ts');
    // Present in the prompt...
    expect(api).toMatch(/HOW TO SAY IT \(instructions for you — never speak these\)/);
    // ...and the fallback still serves `facts`, which no longer holds them.
    expect(api).toMatch(/return facts\.trim\(\);/);
  });

  it('the directives actually reach voiceFacts', () => {
    const api = src('src/services/coachApi.ts');
    expect(api).toMatch(/directives: grounding\.moveNarrationDirectives/);
  });
});
