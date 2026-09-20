// THE POLL-DEADLINE GATE (2026-09-20).
//
// Two audits independently hung on the same shape, hours apart, and neither
// noticed until a renderer wedged in front of a person:
//
//   const until = async (fn, ms, step) => {
//     const t0 = Date.now();
//     while (Date.now() - t0 < ms) { if (await fn()) return true; ... }
//   };
//
// The clock is evaluated only BETWEEN iterations, so a predicate that never
// settles means the loop never returns to its own condition. It READS as a
// bounded wait and is unbounded against exactly the failure it exists to
// bound. A `try/catch` does not save it either: a catch handles a THROW, and a
// wedged renderer never throws — it simply never answers.
//
// The cure is `until` from `scripts/audit-lib/wedge-watch.mjs`, which races
// each predicate against the REMAINING budget (so a legitimately slow read
// keeps every second it is owed, while a hung one ends the wait, not the run).
//
// This gate does two jobs. The HARD one has no baseline: a script may not
// import the shared `until` and ALSO carry its own implementation, because a
// second binding shadows the import with no test failing — every test still
// exercises the shared one by name. An ALIAS (`const until = sharedUntil;`) is
// fine and deliberately allowed; it is a second IMPLEMENTATION that is banned.
// The SHRINK-ONLY one counts the scripts still carrying the shape, so the
// backlog can only go down (CLAUDE.md sealed-gates rule).
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.mjs$/.test(p)) out.push(p);
  }
  return out;
}

/** `while (Date.now() - t0 < ms)` / `for (;Date.now() - t0 < ms;)` — the shape. */
const POLL_SHAPE = /(?:while|for)\s*\(\s*;?\s*Date\.now\(\)\s*-\s*\w+\s*</;
/** A hand-rolled `until` — a binding whose right-hand side is a FUNCTION, not an alias. */
const OWN_UNTIL_IMPL = /(?:const|let|var)\s+until\s*=\s*(?:async\s*)?(?:\(|function)|function\s+until\s*\(/;
const IMPORTS_SHARED_UNTIL = /import\s*\{[^}]*\buntil\b[^}]*\}\s*from\s*['"][^'"]*wedge-watch\.mjs['"]/;

/**
 * Strip comments before matching. The first cut of this gate failed its own
 * non-vacuity check by flagging `wedge-watch.mjs` — whose header QUOTES the bad
 * shape in order to explain it. A gate that blames by TEXT rather than by
 * STATEMENT accuses the documentation of the crime it documents; CLAUDE.md
 * records the same trap catching four innocent files.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

const FILES = walk('scripts');

describe('audit poll deadlines', () => {
  it('no script both imports the shared `until` and defines its own — a second binding shadows the import silently', () => {
    const shadowed = FILES.filter((f) => {
      const src = readFileSync(f, 'utf8');
      const c = code(src);
      return IMPORTS_SHARED_UNTIL.test(c) && OWN_UNTIL_IMPL.test(c);
    });
    expect(shadowed, `these import the bounded \`until\` and then redefine it: ${shadowed.join(', ')}`).toEqual([]);
  });

  // Measured 2026-09-20. Lower it when you convert scripts; NEVER raise it.
  const POLL_SHAPE_BASELINE = 64;
  it(`at most ${POLL_SHAPE_BASELINE} scripts still hand-roll a between-iteration deadline`, () => {
    const carriers = FILES.filter((f) => POLL_SHAPE.test(code(readFileSync(f, 'utf8'))));
    expect(carriers.length, `worst offenders first: ${carriers.slice(0, 8).join(', ')}`).toBeLessThanOrEqual(POLL_SHAPE_BASELINE);
  });

  it('the gate is NON-VACUOUS — it can see the shape and the shared helper does not carry it', () => {
    // A gate that matches nothing passes forever. Prove both directions.
    expect(POLL_SHAPE.test('while (Date.now() - t0 < ms) { await fn(); }')).toBe(true);
    expect(OWN_UNTIL_IMPL.test('const until = async (fn, ms) => {};')).toBe(true);
    expect(OWN_UNTIL_IMPL.test('const until = sharedUntil;')).toBe(false); // an alias is not an implementation
    // The helper QUOTES the bad shape in its header to explain it — a gate that
    // reads comments would accuse the cure of being the disease.
    expect(POLL_SHAPE.test(readFileSync('scripts/audit-lib/wedge-watch.mjs', 'utf8'))).toBe(true);
    expect(POLL_SHAPE.test(code(readFileSync('scripts/audit-lib/wedge-watch.mjs', 'utf8')))).toBe(false);
  });
});
