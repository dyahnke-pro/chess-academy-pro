#!/usr/bin/env node
/**
 * Runtime audit: opens the chat panel on a sample of openings,
 * asks a standard set of questions, and captures:
 *   - audit-stream POST bodies (claim-validator-trip,
 *     arrow-claim-validator, master-play-enforcement-fallback,
 *     narration-text-clipped, voice-speak-invoked source mix)
 *   - the coach response text
 *   - SAN-shaped tokens in the response (G3 hallucination check)
 *   - [BOARD: arrow:from-to:color] markers (G6 arrow check)
 *
 * Output: docs/audit-runs/2026-05-19-runtime-chat/findings.json
 *
 * Designed for: 10 openings × 2 questions × ~30s per = ~10 min.
 * Single browser, no parallelism.
 */

import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const OUT_DIR = process.env.AUDIT_OUT_DIR ?? 'docs/audit-runs/2026-05-19-runtime-chat';
const OUT_PATH = join(OUT_DIR, 'findings.json');

const OPENINGS = (process.env.OPENINGS ?? [
  'italian-game',
  'sicilian-najdorf',
  'ruy-lopez',
  'french-defence',
  'caro-kann',
  'kings-gambit',
  'queens-gambit',
  'london-system',
  'pro-firouzja-vienna',
  'pro-naroditsky-scotch',
].join(',')).split(',');

const QUESTIONS = [
  "What's the main idea of this opening?",
  "What if my opponent deviates with a different second move?",
];

const SAN_RX = /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?|O-O-O|O-O)\b/g;
const ARROW_RX = /\[BOARD:\s*arrow:([a-h][1-8])-([a-h][1-8]):([a-z]+)\]/g;

async function runOpening(page, id, allEvents) {
  const result = { id, mounted: false, chatOpened: false, questions: [], events: [] };
  await page.goto(`${BASE_URL}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const mounted = await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  result.mounted = mounted;
  if (!mounted) return result;
  await page.waitForTimeout(1500);

  // Launch walkthrough so chat is in context
  const wt = page.locator('[data-testid="walkthrough-btn"]').first();
  if (!(await wt.isVisible().catch(() => false))) return result;
  await wt.click({ timeout: 5000 });
  await page.locator('[data-testid="walkthrough-mode"]').waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Advance a few plies for context
  for (let i = 0; i < 4; i++) {
    const next = page.locator('[data-testid="nav-next"]').first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  // Open chat
  const chatBtn = page.locator('[data-testid="chat-button"], [aria-label*="chat" i]').first();
  if (!(await chatBtn.isVisible().catch(() => false))) {
    return result;
  }
  await chatBtn.click({ timeout: 5000 });
  result.chatOpened = true;
  await page.waitForTimeout(1500);

  for (const q of QUESTIONS) {
    const qRes = { question: q, response: '', sans: [], arrows: [], events: [] };
    const startEvtIdx = allEvents.length;
    // Find chat input
    const input = page.locator('input[type="text"], textarea').last();
    if (!(await input.isVisible().catch(() => false))) {
      qRes.error = 'no chat input';
      result.questions.push(qRes);
      continue;
    }
    await input.fill(q);
    await page.keyboard.press('Enter').catch(() => {});
    // Wait for response — up to 30s
    await page.waitForTimeout(30000);
    // Capture last assistant message
    const messages = await page.locator('[data-testid="coach-message"], .message-assistant, [data-role="assistant"]').all();
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      qRes.response = (await last.textContent().catch(() => '')) ?? '';
    } else {
      // Fall back: get text of the last chat-panel div
      qRes.response = (await page.locator('[data-testid="chat-panel"], [data-testid="chat-bubble"]').last().textContent().catch(() => '')) ?? '';
    }
    // Extract SAN tokens
    const sanMatches = [...qRes.response.matchAll(SAN_RX)].map((m) => m[0]);
    qRes.sans = [...new Set(sanMatches)];
    // Extract arrow markers
    const arrowMatches = [...qRes.response.matchAll(ARROW_RX)].map((m) => `${m[1]}-${m[2]}:${m[3]}`);
    qRes.arrows = [...new Set(arrowMatches)];
    // Capture events from this question
    qRes.events = allEvents.slice(startEvtIdx);
    result.questions.push(qRes);
    await page.waitForTimeout(2000);
  }
  return result;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  const allEvents = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try { const b = req.postDataJSON?.(); if (b) allEvents.push({ at: Date.now(), ...b }); } catch {}
    }
  });

  // Boot + seed
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 120_000 }).catch(() => {});

  const results = [];
  for (const id of OPENINGS) {
    console.log(`\n=== ${id} ===`);
    const r = await runOpening(page, id, allEvents);
    results.push(r);
    console.log(`mounted=${r.mounted} chatOpened=${r.chatOpened} qs=${r.questions.length}`);
    for (const q of r.questions) {
      console.log(`  Q: ${q.question}`);
      console.log(`    response chars: ${q.response.length}, SANs: ${q.sans.length}, arrows: ${q.arrows.length}, events: ${q.events.length}`);
      const eventKinds = q.events.map((e) => e.event || e.kind).filter(Boolean);
      const counts = {};
      for (const k of eventKinds) counts[k] = (counts[k] || 0) + 1;
      const summary = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(' ');
      if (summary) console.log(`    events: ${summary}`);
    }
    await writeFile(OUT_PATH, JSON.stringify({
      generatedAt: new Date().toISOString(),
      openings: results,
      totalEvents: allEvents.length,
    }, null, 2));
  }
  await browser.close();
  console.log('\nWrote', OUT_PATH);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
