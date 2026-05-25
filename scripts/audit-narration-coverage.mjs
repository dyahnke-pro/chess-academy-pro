// COMPREHENSIVE narration-verification audit (David 2026-05-25). Enumerates
// EVERY surface in the app that carries hand-authored teaching prose and reports
// coverage: how many units have a full register, a short register, and a recorded
// independent-verification source. The single picture of what's gated vs open.
// Read-only. Run: node scripts/audit-narration-coverage.mjs
import { readFileSync, readdirSync } from 'node:fs';

const J = (p) => JSON.parse(readFileSync(`src/data/${p}`, 'utf8'));
const rows = [];
const add = (surface, units, full, short, sourced, gatedFull, gatedSrc) =>
  rows.push({ surface, units, full, short, sourced, gatedFull, gatedSrc });

// 1. Beat-lessons (main opening lines + variations + named traps) — regex-scan .ts
const lessonDir = 'src/data/lessons';
const lessonFiles = readdirSync(lessonDir).filter((f) => f.endsWith('.ts') && !/\.(test)\.ts$/.test(f) && !/^(index|registry|punishGem|narrationAccuracy|narrationGrounding|lessonDepth|lessonIntegrity|lessonTabIntegrity|pircIntegrity|courseScope|mastersCoverage|openingWiring)/.test(f));
let bSay = 0, bShort = 0, bSrc = 0;
for (const f of lessonFiles) {
  const t = readFileSync(`${lessonDir}/${f}`, 'utf8');
  bSay += (t.match(/\bsay:\s*['"`]/g) || []).length;
  bShort += (t.match(/\bsayShort:\s*['"`]/g) || []).length;
  bSrc += (t.match(/\bsources:\s*\[/g) || []).length;
}
add('beat-lessons (main+variation+trap)', bSay, bSay, bShort, bSrc, false, true);

// 2. Punish-gems
const gems = J('punish-gems.json');
const gemNarr = readFileSync(`${lessonDir}/punishGemNarration.ts`, 'utf8');
const gemKeys = new Set([...gemNarr.matchAll(/^  ['"]([a-z0-9-]+:[^'"]+)['"]: \{\n([\s\S]*?)\n  \},$/gm)].map((m) => m[1]));
const gemSrc = [...gemNarr.matchAll(/^  ['"]([a-z0-9-]+:[^'"]+)['"]: \{\n([\s\S]*?)\n  \},$/gm)].filter((m) => m[2].includes('sources:')).length;
add('punish-gems', gems.length, gemKeys.size, gemKeys.size, gemSrc, true, true);

// 3. Middlegame-plan playableLines
const plans = J('middlegame-plans.json');
let pL = 0, pFull = 0, pShort = 0, pSrc = 0;
for (const p of plans) for (const l of (p.playableLines || [])) { pL++; if ((l.annotations || []).length) pFull++; if ((l.learnCues || []).length) pShort++; if ((l.sources || []).length) pSrc++; }
add('middlegame-plan lines', pL, pFull, pShort, pSrc, true, true);

// 4. Common mistakes
const cm = Object.values(J('common-mistakes.json')).flat();
add('common mistakes', cm.length, cm.filter((m) => (m.explanation || '').trim()).length, cm.filter((m) => (m.shortNarration || '').trim()).length, cm.filter((m) => (m.sources || []).length).length, true, true);

// 5. Model games (overview / lessonSummary / annotations) + sources
const mg = [...J('model-games.json'), ...(J('vienna-model-games.json').games || [])];
add('model games', mg.length, mg.filter((g) => (g.overview || '').trim()).length, mg.filter((g) => (g.lessonSummary || '').trim()).length, mg.filter((g) => (g.sources || []).length).length, false, true);

// 6. Pro-repertoires (per-variation explanation) + sources
const pro = J('pro-repertoires.json').openings || [];
let vTot = 0, vExpl = 0, vSrc = 0;
for (const o of pro) for (const v of (o.variations || [])) { vTot++; if ((v.explanation || '').trim()) vExpl++; if ((v.sources || []).length) vSrc++; }
add('pro-repertoire variations', vTot, vExpl, 0, vSrc, false, true);

// 7. Endgame (narration.why + position.explanation + source)
let eUnits = 0, eFull = 0, eSrc = 0;
for (const f of ['endgame-principles.json', 'pawn-endings.json', 'rook-endings.json', 'drawn-patterns.json']) {
  try { for (const e of J(f)) { eUnits++; if (e.narration?.why || e.explanation) eFull++; if (e.narration?.history || e.source) eSrc++; } } catch {}
}
add('endgame lessons', eUnits, eFull, 0, eSrc, false, true);

// 8. Mating patterns
let mUnits = 0, mFull = 0, mSrc = 0;
try { for (const p of J('mating-patterns.json')) { mUnits++; if (p.narration?.intro) mFull++; if (p.narration?.history) mSrc++; } } catch {}
add('mating patterns', mUnits, mFull, 0, mSrc, false, true);

// 9. Checkpoint quizzes (hint prose)
let qUnits = 0, qHint = 0;
try { const q = J('checkpoint-quizzes.json'); const items = Array.isArray(q) ? q : Object.values(q).flat(); for (const it of items) { qUnits++; if ((it.hint || '').trim()) qHint++; } } catch {}
add('checkpoint quizzes', qUnits, qHint, 0, 0, false, false);

// 10. Gambits
let gTot = 0, gExpl = 0, gSrc = 0;
try { for (const o of J('gambits.json')) for (const v of (o.variations || [])) { gTot++; if ((v.explanation || '').trim()) gExpl++; if (v.source || (v.sources || []).length) gSrc++; } } catch {}
add('gambit variations', gTot, gExpl, 0, gSrc, false, false);

const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
console.log('\n COMPREHENSIVE NARRATION AUDIT — coverage by surface\n');
console.log(' surface                             units   full   short  sourced   gated(full/src)');
console.log(' ' + '-'.repeat(82));
for (const r of rows) {
  console.log(
    ` ${r.surface.padEnd(35)} ${String(r.units).padStart(5)}  ${`${pct(r.full, r.units)}%`.padStart(5)}  ${`${pct(r.short, r.units)}%`.padStart(5)}  ${`${pct(r.sourced, r.units)}%`.padStart(6)}    ${r.gatedFull ? '✓' : '·'} / ${r.gatedSrc ? '✓' : '·'}`,
  );
}
console.log('\n  full/short/sourced = % of units with a full register, short register, recorded source.');
console.log('  gated = a ship-check test enforces it (· = no gate yet).\n');
