// NO SEMICOLON IS READ ALOUD (the human voice, CLAUDE.md § THE COACH TALKS
// LIKE A PERSON: "One idea a sentence. No dash chains, no semicolons read
// aloud"). The prod focus audit of 2026-11-09 still heard two: the plan
// choice ("the stronger is X; Y falls short") and the reply branches ("If they
// had taken on g4 …; if they had played …"), both joined with '; '. A list of
// clauses is said with the list helper (`andList`) or a sentence each; a coach
// line never joins its parts on a semicolon. Blamed by statement.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/services', 'src/coach', 'src/utils'];
/** Never spoken, each for its reason. */
const NOT_SPOKEN = new Map<string, string>([
  ['src/services/openingGenerator.ts', 'the grounding facts handed to the phrasing model'],
  ['src/coach/envelope.ts', "the phrasing model's prompt"],
  ['src/services/liveTacticsContext.ts', "the phrasing model's prompt block"],
  ['src/services/lichessHealthProbe.ts', 'an audit row'],
]);
/** An audit row's text is read by an audit, never said. */
const AUDIT_ROW = /\b(summary|details):\s*`/;
const JOIN_SEMI = /\.join\(\s*(['"`]); \1\s*\)/;
const TEMPLATE_SEMI = /`[^`]*\$\{[^}]+\}; [^`]*\$\{[^}]+\}[^`]*`/;

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('no semicolon is read aloud', () => {
  it('no coach line joins its parts with "; " — by join or in a template', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root, [])) {
        if (NOT_SPOKEN.has(file)) continue;
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          const code = line.replace(/^\s*\/\/.*$/, '');
          if (AUDIT_ROW.test(code)) return;
          if (JOIN_SEMI.test(code) || TEMPLATE_SEMI.test(code)) offenders.push(`${file}:${i + 1}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
  it('the template check sees a semicolon between two filled parts (negative control)', () => {
    expect(TEMPLATE_SEMI.test('`the stronger is ${a}; ${b} falls short`')).toBe(true);
    expect(JOIN_SEMI.test("clauses.join('; ')")).toBe(true);
  });
});
