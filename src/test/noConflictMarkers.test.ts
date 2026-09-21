/**
 * No tracked file may carry an unresolved merge-conflict marker.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR, AND IT WAS MINE (2026-09-21). Commit
 * `da94024b9` — titled "the board carried a second copy of itself — reconciled
 * and gated" — RESOLVED a duplicated `OUTLINE.md` and left `<<<<<<< HEAD`,
 * `=======` and `>>>>>>> origin/main` sitting in the file. Five further commits
 * carried them, including two that edited text inside the conflict region.
 *
 * Three gates were green over it the whole time, each correctly scoped and each
 * blind:
 *   - the duplicate-HEADING check: a marker is not a heading;
 *   - the duplicate-ITEM-LINE check I added the same day: a marker is not an
 *     item line;
 *   - `outlineCoverage`'s id/bucket checks: markers cite no ids.
 * Adding a fourth narrow check to that file would have been the same mistake a
 * third time. The honest generalisation is that a conflict marker in ANY
 * tracked file is always a defect, never a style choice — so blame it once,
 * repo-wide, instead of per-file forever.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS. The markers were not inert. They fenced
 * two live claims off from each other: my side said G1's bundle-hash rule was
 * "FOR DAVID TO DECIDE", while the other side — origin/main, which had it
 * right — recorded that David HAD decided and `CLAUDE.md` already carried the
 * replacement. The board asserted both, and the `=======` is the reason nobody
 * noticed they were the same question. A duplicate is noise; a duplicate behind
 * a conflict marker is two answers with a wall between them.
 *
 * IT IS ALSO THE CHEAPEST POSSIBLE CHECK. `git grep` over tracked files only —
 * no walking `node_modules`, no `dist`, no untracked scratch.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');

/** Tracked files carrying a conflict marker at the start of a line. */
function conflicted(): string[] {
  // `git grep -n` exits 1 when there are no matches, which is the GREEN case.
  try {
    const out = execFileSync(
      'git',
      ['grep', '-nE', '^(<<<<<<< |=======$|>>>>>>> )', '--', '.'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    return out.split('\n').filter(Boolean);
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    if (e.status === 1) return [];
    throw err;
  }
}

describe('no unresolved merge-conflict markers in tracked files', () => {
  it('the search itself works — a negative control on the regex', () => {
    // A gate whose pattern silently stopped matching would report zero forever,
    // which is exactly the shape of failure this repo keeps paying for. Prove
    // the pattern fires on the three markers and, just as importantly, does NOT
    // fire on the prose that legitimately mentions them.
    const re = /^(<<<<<<< |=======$|>>>>>>> )/;
    expect(re.test('<<<<<<< HEAD')).toBe(true);
    expect(re.test('=======')).toBe(true);
    expect(re.test('>>>>>>> origin/main')).toBe(true);

    // Markdown rules and prose must not trip it, or the gate gets muted.
    expect(re.test('==========='), 'a markdown setext rule is not a marker').toBe(false);
    expect(re.test('  ======='), 'an indented separator is not a marker').toBe(false);
    expect(re.test('the `=======` line is the conflict separator')).toBe(false);
    expect(re.test('<<<<<<<'), 'a bare marker with no branch name is not the git form').toBe(false);
  });

  it('finds none in the repo', () => {
    const hits = conflicted();
    expect(
      hits,
      `Unresolved merge-conflict marker(s) in tracked files:\n  ${hits.join('\n  ')}\n` +
        'A conflict was committed without being resolved. Read BOTH sides before deleting ' +
        'either — they are usually two answers to the same question, and the newer one is ' +
        'not always the one below the separator.',
    ).toEqual([]);
  });
});
