// A LINE OF MOVES IS SPOKEN AS A LIST, NEVER RUN TOGETHER (Learn tape
// 2026-10-06: "…bishop takes d4 bishop to d3 …bishop takes c3, check b-pawn
// takes c3" — SANs joined by spaces, spelled out back to back). Spoken lines
// use `andList` ("a, b and c"). Keys and labels that are never spoken are named.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/services');
/** Files whose space-joined SANs are lookup keys, not speech. */
const NOT_SPOKEN = new Set(['danyaTeachingService.ts']);
const JOINED = /\$\{[^}]*[sS]ans?\b[^}]*\.join\(' '\)\}/;

describe('spoken move lists', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !NOT_SPOKEN.has(f));
  it('the gate can see the services (non-vacuous)', () => expect(files.length).toBeGreaterThan(50));
  it('NEGATIVE CONTROL: the pattern catches the old shape', () => {
    expect(JOINED.test('`That wins ${w.what}: ${w.sans.join(\' \')}.`')).toBe(true);
    expect(JOINED.test('`That wins ${w.what}: ${andList(w.sans)}.`')).toBe(false);
  });
  it('no service speaks SANs joined by spaces', () => {
    const offenders: string[] = [];
    for (const f of files) {
      readFileSync(join(DIR, f), 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*\/\//.test(line) || /summary:|details:|logAppAudit/.test(line)) return;
        if (JOINED.test(line)) offenders.push(`${f}:${i + 1} ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
