// Scaffold a new masterclass opening: stubs the lesson files + the tab-plan
// resolver, then prints the exact wiring edits + gate checklist (playbook
// §0.7). It does NOT auto-edit the shared files (registry.ts, variationTabs.ts,
// opening-manifests.json, OpeningDetailPage) — those have ordering/insertion
// nuance and registering an unauthored lesson would instantly red the gates;
// the author wires them once the beats are written.
//
//   node scripts/scaffold-opening.mjs <id> "<Display Name>" <white|black>
//   e.g. node scripts/scaffold-opening.mjs scotch-game "Scotch Game" white

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';

const [id, name, color] = process.argv.slice(2);
if (!id || !name || (color !== 'white' && color !== 'black')) {
  console.error('Usage: node scripts/scaffold-opening.mjs <id> "<Display Name>" <white|black>');
  process.exit(1);
}

// id (scotch-game) → camel (scotchGame) → Pascal (ScotchGame) → CONST (SCOTCH_GAME)
const camel = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const Pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
const CONST = id.replace(/-/g, '_').toUpperCase();
const idNoDash = id.replace(/-/g, '');

const lessonsDir = 'src/data/lessons';
const servicesDir = 'src/services';
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
  [`${servicesDir}/${camel}MasterclassTabs.ts`]: `// Tab → middlegame-plan map for ${name}. Wire into OpeningDetailPage's
// subjectPlanIds chain (playbook §0.7 STEP 4). Returns null for other openings
// so the chain falls through.
const ${CONST}_TAB_PLAN_IDS: Record<string, string> = {
  // main: 'mp-${idNoDash}-main',
  // '<lowercased tab label>': 'mp-${idNoDash}-<tab>',
};

export function get${Pascal}TabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== '${id}') return null;
  const planId = ${CONST}_TAB_PLAN_IDS[tabKey];
  return planId ? [planId] : null;
}
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
console.log(`3. OpeningDetailPage.tsx — add get${Pascal}TabPlanIds to the subjectPlanIds chain`);
console.log(`4. middlegame-plans.json — plans id 'mp-${idNoDash}-<tab>', openingId '${id}'; run add-leadeye-to-plans.mjs`);
console.log(`5. punish-gems: run mine-punish-gems.mjs, then author GEM_NARRATION in punishGemNarration.ts`);
console.log(`6. model-games.json — REAL games, studentSide '${color}', student winning; add '${id}' to modelGames-orientation PROTECTED`);
console.log(`7. checkpoint-quizzes.json + common-mistakes.json — keyed '${id}'`);
console.log(`8. opening-manifests.json — '${id}' content floors\n`);
console.log(`Gates that will enforce: lessonIntegrity, narrationAccuracy, wlppNarration (cue ≤8w + presence),`);
console.log(`  openingManifests, openingWiring, modelGames-orientation, punishGems, middlegamePlanner.`);
console.log(`Run: npm run ship-check`);
