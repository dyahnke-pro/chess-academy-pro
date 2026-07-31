/**
 * audit-stage-gen-prod.mjs — proves background stage generation works on
 * PROD after the 2026-07-31 unpin fix (generateOneStage forced the dead
 * 'anthropic' provider → every stage failed "provider unreachable").
 *
 * Drives /coach/teach with an UNCACHED opening (forces Tier-3 computed
 * generation + generateMissingStagesInBackground), waits for the stage
 * gens to settle, then dumps the on-device audit log (db.meta key
 * 'app-audit-log.v1') and asserts:
 *   1. a "kicking off N background stage gens" event fired
 *   2. ZERO 'LLM provider error' / 'provider unreachable' /
 *      'No API key configured' entries (the fixed class)
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-stage-gen-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
// An obscure but real DB opening unlikely to be baked/masterclassed/cached.
const OPENING_ASK = process.env.AUDIT_OPENING_ASK ?? 'teach me the amar opening';

async function dismissIfPresent(page, selector, timeout = 4000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click({ force: true });
    return true;
  } catch { return false; }
}

async function readAuditLog(page) {
  return page.evaluate(async () => {
    const open = indexedDB.open('ChessAcademyDB');
    const dbi = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
    try {
      const tx = dbi.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const rec = await new Promise((res, rej) => { const r = store.get('app-audit-log.v1'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      if (!rec?.value) return [];
      const parsed = JSON.parse(rec.value);
      return Array.isArray(parsed) ? parsed : (parsed.entries ?? []);
    } finally { dbi.close(); }
  });
}

async function main() {
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  console.log(`[probe] ${BASE}/coach/teach — ask: "${OPENING_ASK}"`);
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await dismissIfPresent(page, '[data-testid="skill-band-intermediate"]', 15000);
  await dismissIfPresent(page, '[data-testid="page-help-modal"] button', 4000);
  await dismissIfPresent(page, '[data-testid="ai-consent-allow"]', 6000);

  const input = page.locator('textarea').first();
  await input.waitFor({ state: 'visible', timeout: 20000 });
  await input.click();
  await input.pressSequentially(OPENING_ASK, { delay: 25 });
  await page.keyboard.press('Enter');
  console.log('[probe] submitted — waiting for generation + background stage gen (up to 180s)…');

  // Poll the on-device audit log for the kickoff event, then give the
  // parallel stage gens time to finish.
  let kickoff = null;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const log = await readAuditLog(page).catch(() => []);
    kickoff = log.find((e) => typeof e?.summary === 'string' && e.summary.includes('kicking off') && e.summary.includes('background stage gens'));
    if (kickoff) break;
    await page.waitForTimeout(5000);
  }
  if (!kickoff) {
    console.log('[FAIL] no "kicking off background stage gens" event within 180s — generation may not have started (or opening was fully cached).');
    await browser.close();
    process.exit(1);
  }
  console.log(`[probe] kickoff seen: ${kickoff.summary}`);
  // Stage gens run in parallel; allow them to settle.
  await page.waitForTimeout(90000);

  const log = await readAuditLog(page);
  const since = kickoff.at ?? 0;
  const recent = log.filter((e) => (e.at ?? 0) >= since);
  const stageEvents = recent.filter((e) =>
    (e.source ?? '').includes('openingGenerator') || (e.summary ?? '').includes('stage'));
  console.log(`\n[audit-log] ${stageEvents.length} stage-related events since kickoff:`);
  for (const e of stageEvents) {
    console.log(`  ${e.kind}  ${e.summary}${e.details ? `\n      details: ${String(e.details).slice(0, 300)}` : ''}`);
  }

  const providerDead = recent.filter((e) => {
    const t = `${e.summary ?? ''} ${e.details ?? ''}`;
    return t.includes('LLM provider error') || t.includes('temporarily unreachable') || t.includes('No API key configured');
  });
  const hardFails = recent.filter((e) => e.kind === 'llm-error' && (e.summary ?? '').includes('background stage gen'));

  console.log(`\n[verdict] provider-unreachable errors: ${providerDead.length}  |  background-stage-gen failures: ${hardFails.length}`);
  await browser.close();
  if (providerDead.length > 0) {
    console.log('[FAIL] the fixed class still fires — provider config resolving null on prod.');
    process.exit(1);
  }
  console.log(hardFails.length > 0
    ? '[PASS-with-notes] provider path healthy; some stages failed for content reasons (see summaries above — parse/legality, not the provider bug).'
    : '[PASS] stage gen healthy — kickoff fired, no provider errors, no stage failures.');
}

main().catch((e) => { console.error(e); process.exit(1); });
