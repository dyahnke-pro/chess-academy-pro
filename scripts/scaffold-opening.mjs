// Scaffold a new masterclass opening: stubs the lesson files, then prints the
// exact wiring edits + gate checklist (playbook §0.7). It does NOT auto-edit
// the shared files (registry.ts, variationTabs.ts, opening-manifests.json, the
// tab-plan table src/data/tabPlans.ts) — those have ordering/insertion nuance
// and registering an unauthored lesson would instantly red the gates; the
// author wires them once the beats are written.
//
//   node scripts/scaffold-opening.mjs <id> "<Display Name>" <white|black>
//   e.g. node scripts/scaffold-opening.mjs scotch-game "Scotch Game" white

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';

const [id, name, color] = process.argv.slice(2);
if (!id || !name || (color !== 'white' && color !== 'black')) {
  console.error('Usage: node scripts/scaffold-opening.mjs <id> "<Display Name>" <white|black>');
  process.exit(1);
}

// id (scotch-game) → camel (scotchGame) → CONST (SCOTCH_GAME)
const camel = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const CONST = id.replace(/-/g, '_').toUpperCase();
const idNoDash = id.replace(/-/g, '');

const lessonsDir = 'src/data/lessons';
mkdirSync(lessonsDir, { recursive: true });

const files = {
  [`${lessonsDir}/${camel}.ts`]: `import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision / intent), YELLOW
// highlights (a key square the narration names). Orange move-squares are
// auto-painted by the player — don't author them.
const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
void ATK; void KEY; // remove once used

// TODO(masterclass §0.7 STEP 1a): author the main-line beats. Every beat:
//   { id, moves, say (full Watch prose), sayShort (≤8-word Learn cue),
//     arrows?, highlights? }
// MOVES come from openings-lichess.json / chess.js (G3) — never invented.
// say = full explanation (FULL narration mode); sayShort = "move + 3-5 word
// echo" (LIMITED mode). Both are gated.
export const ${CONST}_LESSON: LessonScript = {
  openingId: '${id}',
  title: '${name} — A Master Class',
  minutes: 12,
  orientation: '${color}',
  beats: [
    // { id: 'open', moves: ['e4', 'e5'], say: '...', sayShort: '… — …' },
  ],
};
`,
  [`${lessonsDir}/${camel}Variations.ts`]: `import type { LessonScript } from '../../types';

// TODO(masterclass §0.7 STEP 1b): one LessonScript per variation tab, keyed
// EXACTLY "${id}::<Exact Variation Name>". sayShort ≤8 words each.
export const ${CONST}_VARIATION_LESSONS: Record<string, LessonScript> = {
  // '${id}::Some Variation': { openingId: '${id}', title: '...', minutes: 10,
  //   orientation: '${color}', beats: [ ... ] },
};
`,
};

let created = 0;
for (const [path, content] of Object.entries(files)) {
  if (existsSync(path)) { console.log(`SKIP (exists): ${path}`); continue; }
  writeFileSync(path, content);
  console.log(`created: ${path}`);
  created++;
}

console.log(`\n=== ${created} file(s) created. Now wire it (playbook §0.7) ===\n`);
console.log(`1. registry.ts — add to the OPENINGS array (after authoring beats):`);
console.log(`     import { ${CONST}_LESSON } from './${camel}';`);
console.log(`     import { ${CONST}_VARIATION_LESSONS } from './${camel}Variations';`);
console.log(`     { main: ${CONST}_LESSON, variations: ${CONST}_VARIATION_LESSONS },\n`);
console.log(`2. variationTabs.ts — add CURATED['${id}'] = [{ test: /regex/i, label: 'Tab' }, …]`);
console.log(`3. src/data/tabPlans.ts — add the opening's row to TAB_PLAN_TABLE (every curated tab explicit, [] when it has no plan):`);
console.log(`     '${id}': { key: 'label', tabs: { main: ['mp-${idNoDash}-main'], '<lowercased tab label>': ['mp-${idNoDash}-<tab>'] } },`);
console.log(`   then re-record the snapshot: TAB_PLANS_SNAPSHOT_WRITE=1 npx vitest run src/services/tabPlans.snapshot.test.ts`);
console.log(`4. middlegame-plans.json — plans id 'mp-${idNoDash}-<tab>', openingId '${id}'; run add-leadeye-to-plans.mjs`);
console.log(`5. punish-gems: run mine-punish-gems.mjs, then author GEM_NARRATION in punishGemNarration.ts`);
console.log(`6. model-games.json — REAL games, studentSide '${color}', student winning; add '${id}' to modelGames-orientation PROTECTED`);
console.log(`7. checkpoint-quizzes.json + common-mistakes.json — keyed '${id}'`);
console.log(`8. opening-manifests.json — '${id}' content floors\n`);
console.log(`Gates that will enforce: lessonIntegrity, narrationAccuracy, wlppNarration (cue ≤8w + presence),`);
console.log(`  openingManifests, openingWiring, modelGames-orientation, punishGems, middlegamePlanner.`);
console.log(`Run: npm run ship-check`);
