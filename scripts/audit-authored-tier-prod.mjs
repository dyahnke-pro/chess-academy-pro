// Does the HAND-WRITTEN tier actually reach the voice on prod?
//
// 🔒 THIS TIER SHIPPED DEAD ONCE ALREADY. Its first cut was handed the
// generator's own `entry` — a DB record with no `variations` — so the lookup
// could never return anything, while every unit test passed because they
// exercised the function against a correct fixture. Absence of errors proves
// nothing here; only authored words coming out of the running app do.
//
// So this drives a real lesson on prod and asks the app itself which authored
// variations spoke, at which plies, in which words.
//
// It does NOT grep the spoken lines for authored sentences, which was this
// script's first idea and was unprovable by construction: PASS 2 hands every
// line to the house-voice reword, so the authored words are deliberately
// rephrased before they are ever spoken. Nothing literal survives to match on,
// and a run that found nothing could not tell "the tier is dead" from "the
// reword did its job." The app now emits `openingGenerator.authoredTier` with
// the pre-reword text, which answers the question the phrase-match could not.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `authored-${Math.random().toString(36).slice(2, 9)}`;
const ASK = process.env.AUDIT_ASK ?? 'teach me the italian game';
const OPENING = process.env.AUDIT_OPENING ?? 'Italian Game';
const OUT = `audit-reports/authored-tier-${new Date().toISOString().replace(/[:.]/g, '-')}`;

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Distinctive multi-word phrases from the authored prose for this opening. */
function authoredPhrases(openingName) {
  const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
  const entry = rep.find((e) => (e.name ?? '').toLowerCase() === openingName.toLowerCase());
  if (!entry) throw new Error(`no repertoire entry named "${openingName}"`);
  const out = [];
  for (const v of entry.variations ?? []) {
    const text = (v.explanation ?? '').trim();
    if (!text) continue;
    // Take a run of words long enough that the model could not coincidentally
    // produce it, short enough to survive the house-voice reword's edits.
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const words = sentence.trim().split(/\s+/);
      if (words.length < 7) continue;
      out.push({ variation: v.name, phrase: words.slice(0, 7).join(' ').toLowerCase() });
    }
  }
  return out;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const phrases = authoredPhrases(OPENING);
  console.log(`[authored] ${phrases.length} distinctive authored phrase(s) for "${OPENING}"`);

  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(`localStorage.setItem('auditRunId', ${JSON.stringify(RUN_ID)});`);
  const page = await ctx.newPage();

  const spoken = [];
  const authoredEvents = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('request', (req) => {
    if (!req.url().includes('/api/audit')) return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      for (const e of (body.events ?? body.entries ?? [body])) {
        if (String(e.source ?? '') === 'openingGenerator.authoredTier') {
          authoredEvents.push({ summary: e.summary, details: e.details });
        }
        const text = e.narrationText ?? e.summary ?? '';
        if (String(e.kind ?? '').includes('narration') || String(e.kind ?? '').includes('voice')) {
          if (text) spoken.push({ source: e.source, text: String(text) });
        }
      }
    } catch { /* not ours */ }
  });

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  // Onboarding + consent gates, or nothing below is interactive.
  for (const [wait, click] of [
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="page-help-modal"]', '[data-testid="page-help-close"]'],
  ]) {
    try {
      await page.locator(wait).first().waitFor({ state: 'visible', timeout: 12_000 });
      await page.locator(click).first().click({ timeout: 8000, force: true });
      await sleep(1200);
    } catch { /* gate absent on this run */ }
  }

  const box = page.locator('textarea').first();
  await box.waitFor({ state: 'visible', timeout: 60_000 });
  // pressSequentially, not fill — the React textarea needs real key events or
  // the send stays disabled and the message never submits.
  await box.pressSequentially(ASK, { delay: 12 });
  await page.keyboard.press('Enter');

  // A broad family name opens the line PICKER, not a lesson — and the authored
  // tier only speaks INSIDE a lesson, at a variation's departing move. An audit
  // that sits on the picker proves nothing about the tier, so pick a line.
  // (A "click if visible" that silently no-ops is how a run reports coverage it
  // never had; this one says which branch it took.)
  let picked = 'none (went straight to a lesson)';
  try {
    await page.locator('[data-testid="line-picker"]').first().waitFor({ state: 'visible', timeout: 45_000 });
    // The line tiles are keyed by ECO (`line-picker-C50`). The picker's OWN
    // controls share that prefix — `line-picker-mode-play` / `-mode-face` /
    // `-dismiss` — and the first run clicked the Play TOGGLE and called it a
    // line, then reported the tier dead on a lesson it never opened. Match the
    // ECO shape so a control can never be mistaken for content.
    const opts = page.locator(
      '[data-testid="line-picker"] button[data-testid^="line-picker-"]'
      + ':not([data-testid*="-mode-"]):not([data-testid="line-picker-dismiss"])',
    );
    const n = await opts.count();
    if (n === 0) throw new Error('line picker rendered with no lines to pick');
    const label = (await opts.first().innerText()).replace(/\s+/g, ' ').trim();
    await opts.first().click({ timeout: 8000, force: true });
    picked = `${label} (of ${n})`;
  } catch (e) {
    if (String(e).includes('no lines to pick')) throw e;
  }
  console.log(`[authored] line picked: ${picked}`);

  // A cold generation is slow; the tier only exists inside a generated lesson.
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline && authoredEvents.length === 0) await sleep(4000);
  // Belt and braces: if an authored sentence DID survive the reword verbatim,
  // say so — it costs nothing and it is the strongest possible evidence.
  const said = spoken.map((s) => s.text.toLowerCase()).join(' \n ');
  const hits = phrases.filter((p) => said.includes(p.phrase));

  await page.screenshot({ path: `${OUT}/final.png`, fullPage: true }).catch(() => {});
  await browser.close();

  const report = {
    runId: RUN_ID, base: BASE, ask: ASK, opening: OPENING, picked,
    authoredPhrasesChecked: phrases.length,
    spokenLines: spoken.length,
    authoredEvents,
    hits,
    pageErrors,
    spoken: spoken.slice(0, 60),
  };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

  console.log(`\n──────── AUTHORED TIER ────────`);
  console.log(`line picked             ${picked}`);
  console.log(`spoken lines captured   ${spoken.length}`);
  console.log(`authored-tier events    ${authoredEvents.length}`);
  for (const a of authoredEvents) {
    console.log(`   ✓ ${a.summary}`);
    try {
      const d = JSON.parse(a.details ?? '{}');
      if (d.firstText) console.log(`     first authored line (pre-reword): "${d.firstText}"`);
      if (d.plies) console.log(`     plies: ${JSON.stringify(d.plies)}`);
    } catch { /* details are a bonus */ }
  }
  console.log(`verbatim phrase hits    ${hits.length} (0 is expected — PASS 2 rewords)`);
  console.log(`page errors             ${pageErrors.length}`);
  console.log(`report                  ${OUT}/report.json`);
  console.log(`PostHog: SELECT properties.source, properties.narration_text FROM events`);
  console.log(`  WHERE event='coach_narration_spoken' AND properties.audit_run_id='${RUN_ID}'`);

  if (pageErrors.length > 0) { console.log('❌ page errors during the run'); process.exit(1); }
  if (authoredEvents.length === 0) {
    // NOT an automatic fail: the tier speaks at variation-ENTRY plies, and a
    // lesson that never leaves the main line has no such ply. Say which it is
    // rather than guessing.
    console.log(`⏳ the authored tier did not fire in this lesson (${spoken.length} spoken line(s)).`);
    console.log(`   Either the lesson stayed on the main line (no variation entered),`);
    console.log(`   or the tier is not reaching the voice. Re-run against a variation ask.`);
    process.exit(2);
  }
  console.log('✅ authored prose reached the voice on prod');
}

main().catch((e) => { console.error('ERROR', e); process.exit(1); });
