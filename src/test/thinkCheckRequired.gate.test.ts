import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * EVERY QUESTION CARRIES ITS CHECK (David 2026-10-18: "Or after the move if it
 * was wrong"). A question built by hand — `${THINK_MARK}` in a template — has
 * no check, so the student would hear the full answer after a move that
 * already answered it. `thinkLine` (check required) is the only builder.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe('a think question is built only by thinkLine', () => {
  it('no source writes THINK_MARK into a template', () => {
    const offenders = walk('src')
      .filter((f) => !f.endsWith('thinkPause.ts'))
      .filter((f) => /\$\{THINK_MARK\}|‖/.test(readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')));
    expect(offenders).toEqual([]);
  });
});
