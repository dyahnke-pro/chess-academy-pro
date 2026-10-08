import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// G3: a stage that carries MOVES (drill, find-the-move, punish) comes from the
// database or nowhere. The model used to be the fallback and wrote whole lines,
// SANs included, when the DB had too little (deleted 2026-10-08). This pins it:
// the only stage prompt the model can see is the prose-only `concepts` one.
const SRC = readFileSync(join(__dirname, 'openingGenerator.ts'), 'utf-8');

describe('openingGenerator — the model never supplies a stage with moves', () => {
  it('returns before the model call for every stage but concepts', () => {
    const guard = SRC.indexOf("if (stage !== 'concepts') {");
    const modelCall = SRC.indexOf('const systemPrompt = buildConceptsStagePrompt(openingName);');
    expect(guard).toBeGreaterThan(-1);
    expect(modelCall).toBeGreaterThan(guard);
  });

  it('carries no model schema for a move-bearing stage', () => {
    for (const shape of ['interface DrillLine {', 'interface FindMoveQuestion {', 'interface PunishLesson {']) {
      expect(SRC.includes(shape), shape).toBe(false);
    }
  });
});
