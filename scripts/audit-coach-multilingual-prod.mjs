// MULTILINGUAL SEAM AUDIT (coach audit 2026-09-11, Workstream 2 / D).
// The coach normalizes non-English input to English before routing
// (translateToEnglish) and translates the answer back at the voice chokepoint.
// So the multilingual RISK is not the detectors — it's that seam: a mistranslated
// question misroutes. This drives real NATIVE questions per language against the
// live dispatch on prod and asserts each gets a substantive, on-topic reply
// (NOT the stock/greeting fall-through). Any miss feeds a phrasing back into the
// ONE English matrix — never a per-language regex.
//
// usage: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//        AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//        node scripts/audit-coach-multilingual-prod.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = `ml-${Date.now().toString(36)}`;

// Native, correct core chess questions. `kind` says which lane the seam should
// reach; `expect` is a language-agnostic on-topic check (chess terms survive
// verbatim through the fidelity net regardless of reply language).
const PROBES = [
  { lang: 'Spanish',    best: '¿Cuál es la mejor jugada aquí?',        concept: '¿Qué es una horquilla?' },
  { lang: 'French',     best: 'Quel est le meilleur coup ici ?',       concept: "Qu'est-ce qu'une fourchette ?" },
  { lang: 'German',     best: 'Was ist der beste Zug hier?',           concept: 'Was ist eine Gabel?' },
  { lang: 'Portuguese', best: 'Qual é o melhor lance aqui?',           concept: 'O que é um garfo?' },
  { lang: 'Italian',    best: 'Qual è la mossa migliore qui?',         concept: "Cos'è una forchetta?" },
  { lang: 'Russian',    best: 'Какой лучший ход здесь?',               concept: 'Что такое вилка?' },
  { lang: 'Japanese',   best: 'ここでの最善手は何ですか？',              concept: 'フォークとは何ですか？' },
  { lang: 'Arabic',     best: 'ما هي أفضل نقلة هنا؟',                   concept: 'ما هي الشوكة؟' },
];

const STOCK = /i can'?t verify that precisely|what are we working on today|did you mean one of these|hit a snag|i don’t have a specific lesson/i;
// On-topic markers that survive translation (SAN + chess nouns are preserved
// verbatim by the fidelity net; the reply names a move or a fork idea).
const BEST_OK = /\b(e4|d4|nf3|nc3|bc4|c4|g3|best|engine)\b|[A-Z][a-h][1-8]/i;
const CONCEPT_OK = /\b(fork|forks|horquilla|fourchette|gabel|garfo|forchetta|вилк|フォーク|شوك|two pieces|attacks two|at once)\b/i;

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch {} }, RUN_ID);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

async function boot() {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(11000);
  const bub = page.locator('[data-testid="strength-calibration-bubble"]').first();
  if (await bub.isVisible().catch(() => false)) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ force: true }).catch(() => {}); await bub.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); }
  for (const t of ['ai-consent-allow', 'page-help-modal-close', 'page-help-got-it']) { const el = page.locator(`[data-testid="${t}"]`).first(); if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); } }
}
async function ask(q) {
  const t = page.locator('[data-testid="teach-transcript"]:visible').first();
  const lines = async () => ((await t.innerText().catch(() => '')) || '').split('\n').map((l) => l.trim()).filter((l) => l.length >= 8);
  const base = await lines();
  const box = page.locator('[data-testid="chat-text-input"]:visible:not([disabled])').first();
  await box.waitFor({ timeout: 90000 }).catch(() => {});
  await box.click({ force: true }); await box.pressSequentially(q, { delay: 8 }); await box.press('Enter');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const now = await lines();
    const fresh = now.filter((l) => !base.includes(l) && !l.includes(q.slice(0, 8)));
    if (fresh.length) { await page.waitForTimeout(1500); return fresh.join(' '); }
  }
  return '';
}

const results = [];
console.log(`[multilingual] ${PROBES.length} languages, run ${RUN_ID}, target ${BASE}`);
// A live move so best-move has something to read.
await boot();
try { await page.locator('[data-square="e2"]').first().click({ force: true }); await page.waitForTimeout(400); await page.locator('[data-square="e4"]').first().click({ force: true }); await page.waitForTimeout(6000); } catch {}

for (const p of PROBES) {
  for (const [kind, q, ok] of [['best-move', p.best, BEST_OK], ['concept', p.concept, CONCEPT_OK]]) {
    await boot();
    if (kind === 'best-move') { try { await page.locator('[data-square="e2"]').first().click({ force: true }); await page.waitForTimeout(300); await page.locator('[data-square="e4"]').first().click({ force: true }); await page.waitForTimeout(5000); } catch {} }
    const reply = await ask(q);
    const stock = STOCK.test(reply);
    const onTopic = ok.test(reply);
    const pass = !!reply && !stock && onTopic;
    results.push({ lang: p.lang, kind, pass, q, reply: reply.slice(0, 120) });
    console.log(`${pass ? '✅' : '❌'} ${p.lang} ${kind} :: "${q}" → ${reply ? `"${reply.slice(0, 90)}"` : '(no reply)'}${stock ? ' [STOCK]' : ''}${!onTopic && reply ? ' [off-topic]' : ''}`);
  }
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} multilingual probes routed on-topic`);
console.log(`pageerrors: ${errs.length}`);
const dir = `audit-reports/coach-multilingual-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, errs }, null, 2));
console.log(`report: ${dir}/report.json`);
await browser.close();
process.exitCode = passed === results.length ? 0 : 1;
