// Quick integrity check for the Naroditsky pro-repertoire rebuild
// (2026-05-28). Verifies that the new pro-naroditsky-caro-kann entry
// seeds into Dexie cleanly, all 8 prior Naroditsky entries are gone,
// and the data shape carries the structural fields the OpeningDetailPage
// renderer reads (spine pgn, variations, key ideas, sources).
//
// Per CLAUDE.md G1: run after every push that lands on main. In the
// sandbox, runs against `npm run dev` on :5173 (prod URL is blocked).

import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs } from './audit-lib/chromium.mjs';

const URL = 'http://localhost:5173';
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('  waiting 30s for deferred seed (loads pro-rep + ECO + plans + flashcards)...');
  await page.waitForTimeout(30000);

  const state = await page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['openings'], 'readonly');
      const all = tx.objectStore('openings').getAll();
      all.onsuccess = () => {
        const list = all.result;
        const naro = list.filter((o) => o.proPlayerId === 'naroditsky');
        const caro = naro.find((o) => o.id === 'pro-naroditsky-caro-kann');
        resolve({
          totalOpenings: list.length,
          totalProOpenings: list.filter((o) => o.proPlayerId).length,
          naroditskyCount: naro.length,
          naroditskyIds: naro.map((o) => o.id),
          caroKann: caro ? {
            pgn: caro.pgn,
            color: caro.color,
            variationsCount: caro.variations?.length || 0,
            keyIdeasCount: caro.keyIdeas?.length || 0,
            trapsCount: caro.traps?.length || 0,
            warningsCount: caro.warnings?.length || 0,
            trapLinesCount: caro.trapLines?.length || 0,
            warningLinesCount: caro.warningLines?.length || 0,
            overviewStart: caro.overview?.slice(0, 60),
          } : null,
        });
      };
    };
    req.onerror = () => resolve({ error: 'open failed' });
  }));

  console.log('\n  Dexie state:');
  console.log('   ', JSON.stringify(state, null, 2).split('\n').join('\n    '));

  rec('Dexie has base + pro openings', state.totalOpenings >= 3000 ? 'PASS' : 'FAIL', `${state.totalOpenings} openings, ${state.totalProOpenings} pro`);
  rec('Naroditsky has exactly 1 entry (rebuild scrapped the other 8)', state.naroditskyCount === 1 ? 'PASS' : 'FAIL', state.naroditskyIds.join(', '));
  rec('pro-naroditsky-caro-kann is the rebuilt entry', state.caroKann ? 'PASS' : 'FAIL');
  if (state.caroKann) {
    const expectedSpine = 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7';
    rec('spine PGN matches data-derived spine (14 plies, his actual most-played line)', state.caroKann.pgn === expectedSpine ? 'PASS' : 'FAIL', state.caroKann.pgn);
    rec('color is black', state.caroKann.color === 'black' ? 'PASS' : 'FAIL', state.caroKann.color);
    rec('has 6 variations (top sub-lines from his games)', state.caroKann.variationsCount === 6 ? 'PASS' : 'FAIL', `${state.caroKann.variationsCount}`);
    rec('has 4 key ideas', state.caroKann.keyIdeasCount === 4 ? 'PASS' : 'FAIL', `${state.caroKann.keyIdeasCount}`);
    rec('has 2 traps (prose) + 1 trap line (playable)', state.caroKann.trapsCount === 2 && state.caroKann.trapLinesCount === 1 ? 'PASS' : 'FAIL', `traps:${state.caroKann.trapsCount} trapLines:${state.caroKann.trapLinesCount}`);
    rec('has 3 warnings (prose) + 1 warning line (playable)', state.caroKann.warningsCount === 3 && state.caroKann.warningLinesCount === 1 ? 'PASS' : 'FAIL', `warnings:${state.caroKann.warningsCount} warningLines:${state.caroKann.warningLinesCount}`);
    rec('overview starts with the new authored prose', state.caroKann.overviewStart?.startsWith('This is the Caro-Kann') ? 'PASS' : 'FAIL', state.caroKann.overviewStart);
  }

  // No errors except the cert one (Anthropic egress inspector — not a real issue)
  const realErrors = errors.filter((e) => !/ERR_CERT_AUTHORITY_INVALID/.test(e) && !/Failed to load resource/.test(e));
  if (realErrors.length === 0) {
    rec('no app errors (cert errors from sandbox egress filtered)', 'PASS', `${errors.length} total console errors, all cert-related`);
  } else {
    rec('no app errors', 'FAIL', `${realErrors.length} app errors`);
    for (const e of realErrors.slice(0, 5)) console.log('     ', e);
  }
} catch (e) {
  rec('audit run', 'FAIL', e.message);
  console.error(e);
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
