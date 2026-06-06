import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const BASE = 'https://chess-academy-pro.vercel.app';
const USER = process.env.TEST_USER ?? 'german11';
const PLATFORM = process.env.TEST_PLATFORM ?? 'lichess';
const log = (s) => console.log(s);
const exe = await resolveChromiumExecutable(false);
const br = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await br.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0,200)));
page.on('console', (m) => { if (m.type()==='error') errs.push('[console] '+m.text().slice(0,180)); });
const idbCount = (store) => page.evaluate((s) => new Promise((res) => {
  const r = indexedDB.open('ChessAcademyDB');
  r.onsuccess = () => { try { const db=r.result; if(!db.objectStoreNames.contains(s)){res('no-store');return;} const c=db.transaction(s,'readonly').objectStore(s).count(); c.onsuccess=()=>res(c.result); c.onerror=()=>res('err'); } catch(e){res('ex:'+e.message);} };
  r.onerror = () => res('open-err');
}), store);

log(`\n===== LIVE IMPORT+ANALYZE — ${PLATFORM}/${USER} =====\n`);
// 1. Import
await page.goto(`${BASE}/games/import`, { waitUntil:'domcontentloaded', timeout:30000 });
await page.locator('[data-testid="import-page"]').waitFor({ timeout:20000 }).catch(()=>{});
await page.waitForTimeout(1500);
await page.locator(`[data-testid="platform-${PLATFORM}"]`).click().catch((e)=>log('platform click: '+e.message));
await page.locator('[data-testid="username-input"]').fill(USER);
await page.locator('[data-testid="import-btn"]').click();
log('import started…');
let imported = false;
for (let i=0;i<40;i++){
  await page.waitForTimeout(2000);
  if (await page.locator('[data-testid="import-result"],[data-testid="import-stats"]').count()){ imported=true; break; }
  if (await page.locator('[data-testid="import-error"]').count()){ log('IMPORT ERROR: '+await page.locator('[data-testid="import-error"]').innerText().catch(()=>'')); break; }
}
const gamesCount = await idbCount('games');
log(`import done=${imported} | games in DB=${gamesCount}`);

// 2. Weaknesses + Analyze
await page.goto(`${BASE}/weaknesses`, { waitUntil:'domcontentloaded', timeout:30000 });
await page.waitForTimeout(5000);
const cta = page.locator('[data-testid="analyze-games-cta"]').first();
const ctaCount = await cta.count();
log(`analyze-games-cta present=${ctaCount>0}` + (ctaCount? ` | label="${(await cta.innerText().catch(()=>'')).replace(/\s+/g,' ')}"`:''));
if (ctaCount){ await cta.click().catch((e)=>log('cta click: '+e.message)); log('clicked Analyze — running Stockfish…'); }

// 3. Poll mistakePuzzles as analysis runs
for (const t of [15,30,45,60,90,120,160,200]){
  await page.waitForTimeout((t - ([0,15,30,45,60,90,120,160][[15,30,45,60,90,120,160,200].indexOf(t)]))*1000);
  const mp = await idbCount('mistakePuzzles');
  const ct = await idbCount('classifiedTactics');
  log(`  t+${t}s: mistakePuzzles=${mp} classifiedTactics=${ct}`);
  if (typeof mp==='number' && mp>0) { log('  ✓ mistakes are populating'); break; }
}
// final: check mistakes tab UI
await page.locator('[data-testid="tab-mistakes"]').click().catch(()=>{});
await page.waitForTimeout(3000);
const rows = await page.locator('[data-testid^="mistake-row"],[data-testid^="mistake-card"]').count();
log(`\nmistakes tab rows visible: ${rows}`);
log(`\nERRORS (${errs.length}):`); errs.slice(0,15).forEach(e=>log('  • '+e));
log('\n===== END =====');
await br.close();
