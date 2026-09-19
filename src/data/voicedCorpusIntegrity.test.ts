import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  toClauses,
  classifyClause,
  CONFIDENT_CUT_CLASSES,
} from '../services/narrationQuality.shared.mjs';

// ── THE VOICED CORPUS CANNOT REGRESS ────────────────────────────────────────
// David 2026-09-12: "make sure you build it so it cannot regress."
//
// The sweep removed chatter from 430 source files and rebuilt the two derived
// files the play surfaces actually read. Two distinct things can undo that, and
// neither is visible in a diff review:
//
//   1. A RE-FARM or a hand edit puts chatter back into the source.
//   2. The DERIVED FILES DRIFT FROM THEIR SOURCE — the failure mode already
//      living in this repo: `voiced-matchups.json` carries the 2026-08-28
//      perspective migration that `build-voiced-matchups.mjs` does not apply,
//      so regenerating it silently REVERTS 8,197 pronouns. Nothing catches that
//      today, which is why it has survived.
//
// These two tests close both. They assert the SHIPPED ARTIFACT, never that a
// script was run — a gate that checks "did the build happen" passes on a stale
// file.

const ROOT = join(__dirname, '../..');
const WALKTHROUGHS = join(ROOT, 'src/data/voiced-walkthroughs.json');
const TEACHINGS = join(ROOT, 'public/data/voiced-teachings.json');
const MATCHUPS = join(ROOT, 'src/data/voiced-matchups.json');

type Node = { idea?: string; asides?: { idea?: string }[]; children?: ({ node?: Node } & Node)[] };
type Root = { openingName?: string; tree: { root: Node } };

/** Every narrated string the walkthroughs ship. */
function spokenStrings(): string[] {
  const roots = JSON.parse(readFileSync(WALKTHROUGHS, 'utf8')) as Root[];
  const out: string[] = [];
  const walk = (n?: Node): void => {
    if (!n) return;
    if (n.idea) out.push(n.idea);
    for (const a of n.asides ?? []) if (a.idea) out.push(a.idea);
    for (const c of n.children ?? []) walk(c.node ?? c);
  };
  for (const r of roots) walk(r.tree.root);
  return out;
}

describe('the derived voiced files are in sync with their source', () => {
  // Re-runs the real builders and byte-compares. The builders are deterministic
  // (verified: identical md5 across consecutive runs), so a clean corpus is a
  // clean pass. Non-destructive — the originals are restored either way, so a
  // failure reports the drift instead of silently "fixing" it in the tree.
  // MATCHUPS IS IN HERE NOW, and it is the reason this test exists. Its
  // committed file carried the 2026-08-28 perspective migration that
  // build-voiced-matchups.mjs did not apply, so regenerating it REVERTED 8,197
  // pronouns — a landmine for whoever next ran the builder. Fixed at the root
  // (the corpus source is migrated and the depersonaliser no longer emits
  // first-person plural), so a rebuild now reproduces it exactly and this test
  // keeps it that way.
  it('rebuilding from data/video-narration-voiced reproduces all three files exactly', () => {
    const before = {
      w: readFileSync(WALKTHROUGHS),
      t: readFileSync(TEACHINGS),
      m: readFileSync(MATCHUPS),
    };
    try {
      for (const script of [
        'scripts/build-voiced-walkthroughs.mjs',
        'scripts/build-voiced-teachings.mjs',
        'scripts/build-voiced-matchups.mjs',
      ]) execFileSync('node', [script], { cwd: ROOT, stdio: 'ignore' });
      const after = {
        w: readFileSync(WALKTHROUGHS),
        t: readFileSync(TEACHINGS),
        m: readFileSync(MATCHUPS),
      };
      // voiced-teachings.json stamps a "generatedAt" DATE. Comparing it raw made
      // this gate fail the moment the clock crossed midnight UTC — a false alarm
      // every day for anyone who had not rebuilt that day, which is exactly how
      // a gate teaches people to ignore it. Neutralise that one field and keep
      // the byte comparison everywhere else.
      const stable = (b: Buffer): string =>
        b.toString('utf8').replace(/"generatedAt":\s*"[^"]*"/, '"generatedAt":"<stamp>"');

      for (const [key, name, script] of [
        ['w', 'voiced-walkthroughs.json', 'build-voiced-walkthroughs.mjs'],
        ['t', 'voiced-teachings.json', 'build-voiced-teachings.mjs'],
        ['m', 'voiced-matchups.json', 'build-voiced-matchups.mjs'],
      ] as const) {
        expect(
          stable(after[key]) === stable(before[key]),
          `${name} is not what its source builds — rerun scripts/${script} and commit`,
        ).toBe(true);
      }
    } finally {
      writeFileSync(WALKTHROUGHS, before.w);
      writeFileSync(TEACHINGS, before.t);
      writeFileSync(MATCHUPS, before.m);
    }
  }, 120_000);
});

describe('chatter cannot grow back into the shipped narration', () => {
  // A SHRINK-ONLY CEILING, not zero. The residue is real and understood: these
  // are cut-class clauses sitting BEFORE the last keeper in their sentence, which
  // `trimPassage` spares on purpose — dropping "A strong opponent met us with the
  // bishop to c4, and we castled" out of the middle of its sentence leaves the
  // fragment "— an unfamiliar setup for both sides." Removing one means REWRITING
  // its sentence by hand, which is how this number came down from 38.
  //
  // Lower it whenever you clear some. NEVER raise it.
  const CEILING = 34;

  // Named because they are DELIBERATE KEEPS adjudicated by hand, not oversights.
  // Each trips a cut class while carrying teaching the class has no way to see.
  const KEPT_ON_PURPOSE = [
    // Migrated he->they with the corpus (2026-09-19). The KEEP is a decision
    // about the clause's SUBSTANCE — it is teaching, not chatter — and the
    // pronoun was never what the ruling was about. Updated rather than dropped:
    // dropping it would retire a real decision to make a test pass.
    'they should have played a bishop to e2 to avoid the center fork trick.',
    "This game is really about recovery technique when you're lost, and the principles are these.",
    'This game is famous because Fischer shows, in vivid, textbook fashion —',
  ];

  const chatter = (): { clause: string; klass: string }[] => {
    const seen = new Set<string>();
    const out: { clause: string; klass: string }[] = [];
    for (const text of spokenStrings()) {
      for (const clause of toClauses(text)) {
        const v = classifyClause(clause);
        if (v.disposition !== 'cut' || !CONFIDENT_CUT_CLASSES.includes(v.class)) continue;
        if (seen.has(clause)) continue;
        seen.add(clause);
        out.push({ clause, klass: v.class });
      }
    }
    return out;
  };

  it(`voiced-walkthroughs.json ships at most ${CEILING} distinct chatter clauses`, () => {
    const found = chatter();
    if (found.length > CEILING) {
      const sample = found.slice(0, 8).map((f) => `  [${f.klass}] ${f.clause.slice(0, 92)}`).join('\n');
      throw new Error(
        `${found.length} distinct chatter clauses ship (ceiling ${CEILING}).\n` +
          `Either the corpus regained chatter, or the classifier loosened. Sample:\n${sample}`,
      );
    }
    expect(found.length).toBeLessThanOrEqual(CEILING);
  });

  // THE FIRST VERSION OF THIS TEST WAS VACUOUS AND PASSED AT ZERO. It read
  // `Object.values(file)` as if the file were an array of notes and asked each
  // for `.text`. The file is an OBJECT — {generatedAt, videosDistilled,
  // noteCount, notes} — so it scanned a date string and two numbers, found
  // nothing, and reported a clean corpus. The notes live under `notes`, and the
  // prose is `explains` / `teaches` / `plans`, any of which may be a string OR
  // an array. Read correctly, the real number is the same 34 as the
  // walkthroughs — both derive from the same source, so the same residue rides
  // through. A gate that can only pass is worse than no gate; this one is
  // negative-controlled below.
  it(`voiced-teachings.json ships at most ${CEILING} distinct chatter clauses`, () => {
    const file = JSON.parse(readFileSync(TEACHINGS, 'utf8')) as {
      notes: Record<string, unknown>[];
    };
    expect(file.notes.length, 'no notes read — the file shape changed').toBeGreaterThan(1000);
    const seen = new Set<string>();
    for (const n of file.notes) {
      const prose = ['explains', 'teaches', 'plans']
        .flatMap((f) => (Array.isArray(n[f]) ? (n[f] as unknown[]) : [n[f]]))
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      for (const text of prose) {
        for (const clause of toClauses(text)) {
          const v = classifyClause(clause);
          if (v.disposition === 'cut' && CONFIDENT_CUT_CLASSES.includes(v.class)) seen.add(clause);
        }
      }
    }
    expect(seen.size).toBeLessThanOrEqual(CEILING);
  });

  it('the deliberate keeps are still present — they are decisions, not leftovers', () => {
    const all = spokenStrings().join('\n');
    for (const keep of KEPT_ON_PURPOSE) expect(all, `deliberate keep vanished: ${keep}`).toContain(keep);
  });
});
