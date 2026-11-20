#!/usr/bin/env node
// THE TEMPLATE COUNT (CLAUDE.md, ONE RENDERER WRITES THE TEACHING SENTENCE):
// every hand-written teaching sentence outside the renderer — `text: \`` in
// src/services, and every sentence-shaped template literal (a capitalised
// word then a space) in the surfaces that compose their own speech — per
// file. `--write` refreshes the baseline (only ever to LOWER it).
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
];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
export function countTemplates(root = process.cwd()) {
  const out = {};
  const services = walk(join(root, 'src/services')).filter((p) => p.endsWith('.ts') && !/\.test\.ts$/.test(p)).map((p) => p.slice(root.length + 1));
  for (const f of new Set([...services, ...COMPOSING_SURFACES])) {
    if (f === RENDERER) continue;
    let src; try { src = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    const text = (src.match(/text: `/g) ?? []).length;
    const sentences = COMPOSING_SURFACES.includes(f) ? (src.match(/`[A-Z…][a-z]+ [^`]*`/g) ?? []).length : 0;
    if (text + sentences > 0) out[f] = text + sentences;
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const c = countTemplates();
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  console.log(`${Object.keys(c).length} files, ${total} templates`);
  if (process.argv.includes('--write')) writeFileSync('src/test/fixtures/sentence-templates.baseline.json', `${JSON.stringify(c, null, 1)}\n`);
}
