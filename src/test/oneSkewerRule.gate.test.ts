/**
 * ONE SKEWER RULE (census 2026-10-10). Three detectors held three skewer
 * rules and drifted (one was "ported to match" and drifted again), so the
 * same move was taught as a skewer on one surface and not caught on another.
 * Every function that decides a skewer now calls `pinGeometry.isRealSkewer`
 * (or reads `detectTactics`, which does); one with its own rule fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** The body of each `function …skewer…(` declaration, to its closing brace. */
function skewerFunctions(src: string): Array<{ name: string; body: string }> {
  const out: Array<{ name: string; body: string }> = [];
  const re = /function\s+(\w*[Ss]kewer\w*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // The body opens at the `{` ending the signature line (a return type such
    // as `{ behind: string }` sits before it).
    const open = src.indexOf('{\n', m.index);
    let depth = 0; let i = open;
    for (; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') { depth -= 1; if (depth === 0) break; }
    }
    out.push({ name: m[1], body: src.slice(open, i + 1) });
  }
  return out;
}

describe('one skewer rule', () => {
  it('every skewer detector decides through isRealSkewer', () => {
    const offenders: string[] = [];
    for (const file of walk('src', [])) {
      if (file.endsWith('pinGeometry.ts')) continue;
      const src = readFileSync(file, 'utf8');
      for (const f of skewerFunctions(src)) {
        // Deciding through the rule, or reading the detector that does.
        if (!/isRealSkewer\(|detectTactics\(/.test(f.body)) offenders.push(`${file}: ${f.name}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
