/**
 * ONE "WHY IS THIS THE BEST MOVE" (hard walk 2026-10-10). Three answers each
 * decided this on their own, so the mate rule had to be fixed three times and
 * the setup screen gave two reasons for the same Rh1. `bestMoveReason`
 * (deliberation.ts) is the one computer; every why-best answer reads it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
});
const code = (p: string): string => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('one why-best computer', () => {
  it('only bestMoveReason states that a move starts a forced mate', () => {
    const owners = files(SRC).filter((p) => /starts a forced mate/.test(code(p))).map((p) => p.slice(SRC.length + 1));
    expect(owners).toEqual(['services/deliberation.ts']);
  });
  it.each([
    'services/deliberation.ts',
    'services/groundedAnswer.ts',
    'services/whyBestMove.ts',
    'services/inaccuracyCall.ts',
  ])('%s reads bestMoveReason', (f) => {
    expect(code(join(SRC, f))).toMatch(/bestMoveReason\(/);
  });
});
