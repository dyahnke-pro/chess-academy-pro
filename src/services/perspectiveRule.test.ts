// ONE perspective rule, one string. The gate exists because the law was written
// FIVE times in five wordings and every copy drifted the same way: each banned
// "we / our / us" and none banned a gendered pronoun, so the coach said
// "White takes, and for the moment HE's up a point of material" to a Black
// student while passing `perspectiveVoice.test.ts`.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { perspectiveRule } from './perspectiveRule';

describe('the rule itself', () => {
  it('names the student\'s colour so "your" resolves', () => {
    expect(perspectiveRule('student', 'black')).toContain('playing as black');
    expect(perspectiveRule('student', 'white')).toContain('playing as white');
  });

  it('bans a gendered pronoun for a player — the clause every copy was missing', () => {
    for (const mode of ['student', 'coach-is-opponent', 'spectator'] as const) {
      expect(perspectiveRule(mode)).toMatch(/he \/ him \/ his/);
      expect(perspectiveRule(mode)).toMatch(/they \/ their/);
    }
  });

  it('keeps the two sanctioned exceptions intact', () => {
    // The coach playing the opponent cannot call itself "they".
    expect(perspectiveRule('coach-is-opponent')).toMatch(/"I \/ my"/);
    expect(perspectiveRule('coach-is-opponent')).toMatch(/never "they"/i);
    // A spectator model game is the one place bare colours are right.
    expect(perspectiveRule('spectator')).toMatch(/"White" and "Black"/);
    expect(perspectiveRule('spectator')).toMatch(/Never "you \/ your"/);
  });

  it('bans we/our/us in every mode — the original rule, not lost in the merge', () => {
    for (const mode of ['student', 'coach-is-opponent', 'spectator'] as const) {
      expect(perspectiveRule(mode)).toMatch(/we \/ our \/ us/);
    }
  });
});

const SRC = join(process.cwd(), 'src');
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

describe('no sixth copy', () => {
  it('nothing hand-writes the perspective law any more', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (f.endsWith('perspectiveRule.ts')) continue;
      // Blame by LINE, and skip comment lines. Four files describe the rule in
      // a comment about the prose they COMPUTE — that is documentation, not a
      // sixth copy of the prompt, and a gate that cannot tell the difference
      // reports four innocent files (it did, first run).
      const lines = readFileSync(f, 'utf8').split('\n');
      const hit = lines.findIndex((line) => {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
        return /NEVER\s+(?:say\s+)?["“]?we\s*[/"”]/i.test(line) || /"we \/ our \/ us"/.test(line);
      });
      if (hit >= 0) offenders.push(`${f.replace(process.cwd() + '/', '')}:${hit + 1}`);
    }
    expect(offenders, `hand-written perspective rule — import perspectiveRule() instead:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('every generator prompt that declares a side also carries the rule', () => {
    // "Student plays: <side>" without the rule is exactly the hole that let the
    // drill, find-the-move and punish prompts address nobody in particular.
    const body = readFileSync(join(SRC, 'services/openingGenerator.ts'), 'utf8');
    const declares = (body.match(/Student plays: \$\{studentSide\}/g) ?? []).length;
    const rules = (body.match(/perspectiveRule\('student', studentSide\)/g) ?? []).length;
    expect(declares).toBeGreaterThanOrEqual(3);
    expect(rules).toBeGreaterThanOrEqual(declares);
  });
});
