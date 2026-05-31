// Focused post-deploy audit (G1) for the 2026-05-31 model-games layer.
// Verifies the previously-ZERO-model openings now seed real games into Dexie
// on prod. Reads db.modelGames (READS work in the sandbox per CLAUDE.md);
// asserts each target opening has ≥1 game with a real (non-boilerplate)
// overview and studentSide set.
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const TARGETS = ['pirc-defence','petrov-defence','philidor-defence','qgd','qga','slav-defence','semi-slav','kings-indian-defence','grunfeld-defence','benoni-defence','queens-indian','old-indian-defence','two-knights-defence','schliemann-defence'];

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs(), headless: true });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

console.log('navigating', URL);
await page.goto(`${URL}/openings/slav-defence`, { waitUntil: 'domcontentloaded' });

// Let the deferred seed run (model games land in the heavy backfill ~45-60s).
console.log('waiting for deferred seed (model games)…');
let counts = {};
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(5000);
  counts = await page.evaluate(async (targets) => {
    const out = {};
    try {
      const req = indexedDB.open('ChessAcademyDB');
      const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
      if (!db.objectStoreNames.contains('modelGames')) return { __nostore: true };
      const tx = db.transaction('modelGames', 'readonly');
      const store = tx.objectStore('modelGames');
      const all = await new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      for (const t of targets) {
        const g = all.filter((x) => x.openingId === t);
        out[t] = { n: g.length, sample: g[0] ? `${g[0].white} v ${g[0].black}` : null, studentSide: g[0]?.studentSide, ovOk: g[0]?.overview && g[0].overview.length > 39 };
      }
    } catch (e) { return { __err: String(e) }; }
    return out;
  }, TARGETS);
  const seeded = Object.values(counts).filter((c) => c && c.n > 0).length;
  console.log(`  poll ${i}: ${seeded}/${TARGETS.length} openings have games`);
  if (seeded >= TARGETS.length) break;
}

let pass = 0, fail = 0;
for (const t of TARGETS) {
  const c = counts[t];
  if (c && c.n > 0 && c.studentSide && c.ovOk) { console.log(`  ✓ ${t}: ${c.n} games (${c.sample})`); pass++; }
  else { console.log(`  ✗ ${t}: ${JSON.stringify(c)}`); fail++; }
}
console.log(`\nRESULT: ${pass}/${TARGETS.length} openings seeded real model games; ${fail} failed`);

await browser.close();
process.exit(fail > 0 ? 1 : 0);
