#!/usr/bin/env node
// THE TEMPLATE COUNT (CLAUDE.md, ONE RENDERER WRITES THE TEACHING SENTENCE):
// every hand-written teaching sentence — a string or template literal that
// reads as spoken English to the student (three words or more, addressing a
// side: you / your / they / their / it / the) — per file, in src/services and
// in the surfaces that compose their own speech. The renderer's own sentences
// are counted with the SAME rule and reported apart (`countRenderer`), so the
// count is honest both ways: a template moved into the renderer leaves the
// outside count and shows up inside it; a try or a threat worded by its
// computer (not a `text:` field) is still counted. `--write` refreshes the
// baseline (only ever to LOWER it).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
export const RENDERER = 'src/services/teachingSentence.ts';
/** Surfaces that compose their own spoken/shown words outside the deciders. */
export const COMPOSING_SURFACES = [
  'src/services/groundedAnswer.ts', 'src/services/coachApi.ts', 'src/components/Puzzles/MistakePuzzleBoard.tsx',
  'src/components/Puzzles/PuzzleBoard.tsx', 'src/components/Openings/MiddlegamePractice.tsx', 'src/components/Coach/CoachGameReview.tsx',
  'src/hooks/useLiveCoach.ts', 'src/services/trainingAidRouter.ts', 'src/services/endgameTablebaseService.ts',
  'src/services/refutedAlternative.ts', 'src/services/deliberation.ts', 'src/services/mistakeNarrationVoice.ts',
  'src/services/openingSectionNarrator.ts', 'src/services/gameReviewService.ts', 'src/services/tacticalRead.ts',
  'src/services/teachingSelector.ts', 'src/services/coachChatText.ts', 'src/data/fundamentalLessons.ts',
  'src/components/Coach/CoachTeachPage.tsx',
];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
/** Comments and log/audit lines are not speech. */
const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
  .split('\n').filter((l) => !/console\.|logAppAudit|throw new|new Error\(|import |export \* from/.test(l)).join('\n');
/** A literal's words with every `${…}` read as one word. */
const flatten = (body) => body.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, 'X');
const ADDRESSES = /\b(?:you|your|they|their|it|the)\b/i;
/** A teaching sentence: starts like a sentence, three words or more, and
 *  addresses a side or a piece. */
export function isSentence(body) {
  const t = flatten(body).trim();
  if (!/^[A-Z…X]/.test(t)) return false;
  if ((t.match(/[A-Za-z']+/g) ?? []).length < 3) return false;
  if (!/\s/.test(t) || /^[A-Z_]+$/.test(t)) return false;
  return ADDRESSES.test(t);
}
export function sentencesIn(src) {
  const s = strip(src);
  const lits = [...s.matchAll(/`((?:[^`\\]|\\.|\$\{(?:[^{}]|\{[^{}]*\})*\})*)`|'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
  return lits.filter(isSentence).length;
}
const files = (root) => [
  ...walk(join(root, 'src/services')).filter((p) => p.endsWith('.ts') && !/\.(test|measure|gate)\.ts$|\.d\.ts$/.test(p)).map((p) => p.slice(root.length + 1)),
  ...COMPOSING_SURFACES,
];
export function countTemplates(root = process.cwd()) {
  const out = {};
  for (const f of new Set(files(root))) {
    if (f === RENDERER) continue;
    let src; try { src = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    const n = sentencesIn(src);
    if (n > 0) out[f] = n;
  }
  return out;
}
/** The sentences the renderer writes, counted by the same rule. */
export function countRenderer(root = process.cwd()) {
  return sentencesIn(readFileSync(join(root, RENDERER), 'utf8'));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const c = countTemplates();
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  console.log(`${Object.keys(c).length} files, ${total} templates outside the renderer; ${countRenderer()} in it`);
  if (process.argv.includes('--top')) for (const [f, n] of Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(n, f);
  if (process.argv.includes('--write')) writeFileSync('src/test/fixtures/sentence-templates.baseline.json', `${JSON.stringify(c, null, 1)}\n`);
}
