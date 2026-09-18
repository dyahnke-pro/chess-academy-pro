#!/usr/bin/env node
/**
 * state-of-build — LEVEL II of the four levels of context, DERIVED not typed.
 *
 * CLAUDE.md's four-levels rule says every build gains I (the foundation),
 * II (the state), III (the surface) and IV (the code) before it starts.
 * Level III has been ungameable since `surface-map.mjs --verify` landed:
 * ship-check REGENERATES the map and fails the push when it differs, so a map
 * written before the change cannot match the code after it.
 *
 * 🚨 LEVEL II HAD NO SUCH GATE, and on 2026-09-18 that cost a whole session's
 * findings: the state of the build — SENSE recording 30 misses against 3 holds,
 * review reaching ZERO corpus files, 39 files reading the wrong rating — lived
 * in a chat transcript and nowhere else. A session that skips II builds
 * something real into a place that already had a blocker in front of it.
 *
 * A rule in CLAUDE.md is a CONVENTION, and this project's own doctrine says
 * conventions rot while gates do not. So level II is DERIVED from the code the
 * same way level III is: every number below is measured, none is typed, and
 * `--verify` fails the push when the committed state no longer matches what
 * the code says. The state cannot go stale silently.
 *
 *   node scripts/state-of-build.mjs            # regenerate docs/STATE.md
 *   node scripts/state-of-build.mjs --verify   # ship-check gate: fail if stale
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'docs/STATE.md';

/** Every non-test source file under a directory, recursively. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
  }
  return out;
}

const FILES = walk('src');
const read = (f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };
/**
 * Files whose SOURCE matches.
 *
 * 🚨 `exclude` is not optional politeness — the FIRST run of this generator
 * reported "Green has a reader" because `capabilityEvidence.ts` matched its own
 * exported `getCapabilityProfile`. A module defining a thing is not a module
 * CONSUMING it, and a self-match flips the single most important line in this
 * report to the opposite of the truth. Always exclude the definer.
 */
const filesMatching = (re, exclude = []) =>
  FILES.filter((f) => !exclude.some((x) => f.endsWith(x)) && re.test(read(f)));

/**
 * THE MEASUREMENTS. Each one answers a question the foundation asks, so a
 * number moving is a statement about the LOOP, not a statistic.
 */
function measure() {
  // SENSE — the loop records failure well and success barely. The ratio is the
  // single sharpest number in the app: raise-only data means the coach can get
  // louder about you and never quieter.
  const missWriters = filesMatching(
    /captureMisconception|recordTagDrillResult|upsertWeakSpot|openingWeakSpots|mistakePuzzles\.(add|bulkAdd|put)/,
  ).length;
  const holdWriters = filesMatching(/recordCapabilitiesShown|capabilitiesShown/, ['services/capabilityEvidence.ts']).length;
  // GREEN IS WRITE-ONLY until something READS the profile. That reader is what
  // turns silence from a guess into a computed verdict.
  const greenReaders = filesMatching(/getCapabilityProfile/, ['services/capabilityEvidence.ts']).length;

  // MODEL — the adaptive estimate vs the raw store read. CLAUDE.md's locked
  // rule: a surface does not pick a rating, it reads the ONE estimate.
  const adaptiveRating = filesMatching(/getPlayerRating/, ['services/playerRatingService.ts']).length;
  const rawRating = filesMatching(/currentRating/).length;
  const inlineDefaults = FILES.reduce(
    (n, f) => n + (read(f).match(/\?\?\s*1200/g)?.length ?? 0), 0,
  );

  // SAY — a surface that coaches without the corpus coaches from nothing.
  const CORPUS = /teachingNoteForBoard|noteAtPosition|teachingSourceForBoard|tacticNoteForPuzzleThemes|endgameNoteForLesson/;
  const corpusReach = Object.fromEntries(
    [
      // 🚨 MEASURE THE PRODUCER, NOT THE RENDERER. This read only
      // `CoachGameReview`, but review's narration is built by
      // `buildReviewSegments` in coachFeatureService — the component just
      // renders what it returns. The 🚨 it printed was RIGHT (review really
      // had no corpus), but it would have gone on printing 0 after a correct
      // fix, and an instrument that cannot see the fix is the next session's
      // wild goose chase.
      ['review', 'src/components/Coach/CoachGameReview|src/services/coachFeatureService'],
      ['teach', 'src/components/Coach/CoachTeachPage'],
      ['tactics', 'src/components/Tactics'],
      ['endgame', 'src/components/Coach/CoachEndgame'],
      ['read-position', 'src/hooks/usePositionNarration'],
    ].map(([name, prefixes]) => [
      name,
      // A surface can be more than one file — the renderer AND its producer.
      FILES.filter((f) => prefixes.split('|').some((p) => f.startsWith(p)) && CORPUS.test(read(f))).length,
    ]),
  );

  // GROWTH — the app grows by adding computers, and each one costs N wirings
  // while every surface composes its own. This is the tax on the one mechanism.
  const factImports = (f) =>
    new Set([...read(f).matchAll(/from '(?:\.\.\/)+services\/([A-Za-z0-9_]+)'/g)].map((m) => m[1])).size;
  const surfaceTax = Object.fromEntries(
    [
      'src/components/Coach/CoachTeachPage.tsx',
      'src/components/Coach/CoachGamePage.tsx',
      'src/components/Coach/CoachGameReview.tsx',
    ].filter((f) => FILES.includes(f)).map((f) => [f.split('/').pop(), factImports(f)]),
  );

  return { missWriters, holdWriters, greenReaders, adaptiveRating, rawRating, inlineDefaults, corpusReach, surfaceTax };
}

function render(m) {
  const zero = Object.entries(m.corpusReach).filter(([, n]) => n === 0).map(([k]) => k);
  return `# STATE — level II of the four levels of context

> GENERATED by \`node scripts/state-of-build.mjs\`. Do not hand-edit — ship-check
> regenerates this and fails the push if it differs, so the state is proven
> FRESH rather than merely present. Every number is measured from the code.
>
> Read this AFTER the foundation (CLAUDE.md, level I) and BEFORE mapping a
> surface (level III). It answers: where does my work fit, and what does it
> already have a blocker in front of it?

## SENSE — does the loop record what happens to the student?

- **${m.missWriters}** modules record a MISS.
- **${m.holdWriters}** record a HOLD (\`capabilityEvidence\`).
- **${m.greenReaders}** read the capability profile back.

${m.greenReaders === 0
  ? '🚨 **GREEN IS WRITE-ONLY.** Success is recorded and nothing consumes it, so every\ndata term stays RAISE-ONLY: the coach can get louder about you and never\nquieter. Until a reader exists, silence is a guess rather than a computed\nverdict, and GREY cannot be told apart from proven.'
  : 'Green has a reader — the heat map can lower as well as raise.'}

## MODEL — is the student model fed the adaptive rating?

- **${m.adaptiveRating}** files read \`getPlayerRating\` (the adaptive estimate).
- **${m.rawRating}** read \`currentRating\` off the store directly.
- **${m.inlineDefaults}** inline \`?? 1200\` fallbacks.

The locked rule is that a surface does not PICK a rating; it reads the one
estimate and threads it down. NB the rating's job is STRENGTH, never how much
the coach says — an unrated player gets the full detectors (CLAUDE.md).

## SAY — which surfaces can reach the corpus?

${Object.entries(m.corpusReach).map(([k, n]) => `- **${k}**: ${n} file(s)`).join('\n')}

${zero.length
  ? `🚨 **ZERO on: ${zero.join(', ')}.** A surface that coaches without the corpus\ncoaches from nothing — and review is where the diagnosis happens.`
  : 'Every listed surface reaches the corpus.'}

## GROWTH — the third-coach tax

RAW direct \`services/\` imports per surface — the cost of adding one new
computer. NB this is the raw count, deliberately NOT the gated one: the
fact-computer count (which excludes infrastructure) lives in
\`surfaceComposition.scan.test.ts\`, and duplicating its INFRA list here would be
exactly the drifting-constant the rot rule bans.

${Object.entries(m.surfaceTax).map(([k, n]) => `- **${k}**: ${n}`).join('\n')}

Each surface composing its own producer is the tax on the ONE mechanism the app
grows by. Shrink-only; \`surfaceComposition.scan.test.ts\` holds the ceiling.
`;
}

const current = render(measure());
if (process.argv.includes('--verify')) {
  const committed = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
  if (committed === null) {
    console.error(`state-of-build: ${OUT} is MISSING. Run: node scripts/state-of-build.mjs`);
    process.exit(1);
  }
  if (committed !== current) {
    console.error(
      `state-of-build: ${OUT} is STALE — the code has moved since it was written.\n`
      + 'Level II of the four levels cannot be trusted while it disagrees with the\n'
      + 'code. Run: node scripts/state-of-build.mjs',
    );
    process.exit(1);
  }
  console.log('state-of-build: STATE.md is fresh');
} else {
  writeFileSync(OUT, current);
  console.log(`state-of-build: wrote ${OUT}`);
}
