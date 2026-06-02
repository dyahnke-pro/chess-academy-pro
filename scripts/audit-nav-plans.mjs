#!/usr/bin/env node
/**
 * audit-nav-plans.mjs — HAND-MADE, hard, focused on the identified
 * weaknesses (David 2026-06-02): dashboard NAVIGATION, the coach's
 * NEXT-3-BEST-MOVES from the live board, and MIDDLEGAME PLANS after the
 * opening. Capture-only — Claude judges every answer by hand.
 *   AUDIT_SANDBOX=1 node scripts/audit-nav-plans.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const T = 70_000;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/nav-plans-${stamp}`;
const PMAP = { wP: 'P', wN: 'N', wB: 'B', wR: 'R', wQ: 'Q', wK: 'K', bP: 'p', bN: 'n', bB: 'b', bR: 'r', bQ: 'q', bK: 'k' };
const ACK = /board'?s?\s+(?:is\s+)?set|position\s+set|you'?re\s+playing|taking too long|try again in a moment|drill lines|lines just loaded|what'?s your next test/i;
const log = (s) => console.log(s);
const transcript = [];

async function snap(page) { return page.$$eval('[data-testid="chat-message-assistant"]', (els) => els.map((e) => { const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b && b.textContent ? b.textContent : ''; let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); return t.trim(); })); }
async function scrapeFen(page) { const m = await page.evaluate(() => { const o = {}; document.querySelectorAll('[data-piece]').forEach((q) => { let n = q, s = q.getAttribute('data-square'); while (n && !s) { n = n.parentElement; s = n && n.getAttribute && n.getAttribute('data-square'); } if (s && /^[a-h][1-8]$/.test(s)) o[s] = q.getAttribute('data-piece'); }); return o; }); if (!Object.keys(m).length) return null; const r = []; for (let R = 8; R >= 1; R--) { let row = '', e = 0; for (const f of 'abcdefgh') { const x = m[f + R]; if (x && PMAP[x]) { if (e) { row += e; e = 0; } row += PMAP[x]; } else e++; } if (e) row += e; r.push(row); } return r.join('/'); }
async function askOnce(page, prompt) { const before = await snap(page); const bs = new Set(before); const i = page.locator('[data-testid="chat-text-input"]'); await i.waitFor({ state: 'visible', timeout: 12000 }); await i.click(); await i.fill(prompt); await page.locator('[data-testid="chat-send-btn"]').click(); try { await page.waitForFunction((prev) => { const A = /board'?s?\s+set|you'?re playing|taking too long/i; const els = [...document.querySelectorAll('[data-testid="chat-message-assistant"]')]; return els.some((e) => { const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b && b.textContent ? b.textContent : ''; let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); t = t.trim(); return t.length > 8 && !prev.includes(t) && !A.test(t); }); }, before, { timeout: T }); } catch { return '(timeout)'; } let pl = -1, st = 0, r = ''; for (let k = 0; k < 30; k++) { await page.waitForTimeout(700); const a = await snap(page); const fr = a.filter((t) => !bs.has(t) && !ACK.test(t)); const cur = fr.length ? fr.reduce((x, y) => (y.length > x.length ? y : x)) : ''; if (cur.length === pl) { st++; if (st >= 2) { r = cur; break; } } else st = 0; pl = cur.length; r = cur; } return r || '(empty)'; }
async function ask(page, prompt) { let r = await askOnce(page, prompt); if (r === '(timeout)' || r === '(empty)') { await page.waitForTimeout(2000); r = await askOnce(page, prompt); } return r; }
async function drainAck(page, beforeTexts, ms = 26000) { const bs = new Set(beforeTexts); const t0 = Date.now(); let prev = -1, st = 0; while (Date.now() - t0 < ms) { await page.waitForTimeout(700); const a = await snap(page); const fr = a.filter((t) => !bs.has(t)); if (!fr.length) continue; const lg = fr.reduce((m, t) => Math.max(m, t.length), 0); if (lg > 15 && lg === prev) { st++; if (st >= 3) return; } else st = 0; prev = lg; } }
async function gotoS(page, path, mount) { await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); if (mount) await page.locator(`[data-testid="${mount}"]`).waitFor({ timeout: 20000 }).catch(() => {}); await page.waitForTimeout(4000); try { if (await page.locator('[data-testid="page-help-modal"]').count()) await page.keyboard.press('Escape'); } catch {} }
async function pickWhite(page) { try { const cs = page.locator('[data-testid="color-selector"]'); if (await cs.count()) { const w = page.getByRole('button', { name: /white/i }); if (await w.count()) await w.first().click().catch(() => {}); await page.waitForTimeout(2000); } } catch {} }
async function playMove(page, san) { const before = await scrapeFen(page); const bt = await snap(page); const i = page.locator('[data-testid="chat-text-input"]'); await i.click(); await i.fill(`play ${san}`); await page.locator('[data-testid="chat-send-btn"]').click(); for (let k = 0; k < 20; k++) { await page.waitForTimeout(800); const n = await scrapeFen(page); if (n && n !== before) break; } await drainAck(page, bt, 20000); return scrapeFen(page); }

/** Legal SANs of a FEN (for judging move recommendations). */
function legalSans(fen) { try { return new Chess(fen).moves(); } catch { return []; } }

function rec(section, label, prompt, answer, extra) { transcript.push({ section, label, prompt, answer, ...extra }); log(`\n\x1b[36m[${section}] ${label}\x1b[0m`); if (extra && extra.url) log(`  → URL: ${extra.url}`); if (extra && extra.fen) log(`  FEN: ${extra.fen}`); if (extra && extra.legal) log(`  LEGAL MOVES (${extra.legal.length}): ${extra.legal.join(' ')}`); if (prompt) log(`  Q: ${prompt}`); log(`  A: ${(answer || '').slice(0, 700)}`); }

async function navProbe(page, term, expectNote) {
  await gotoS(page, '/', null);
  let url = '(no nav)';
  try {
    const si = page.locator('[data-testid="smart-search-input"]'); await si.waitFor({ state: 'visible', timeout: 10000 }); await si.click(); await si.fill(''); await si.fill(term); await page.waitForTimeout(2500);
    const agent = page.locator('[data-testid="agent-action-option"]'); const result = page.locator('[data-testid="search-result"]');
    const before = page.url();
    if (await agent.count()) { await agent.first().click(); }
    else if (await result.count()) { await result.first().click(); }
    else { await si.press('Enter'); }
    await page.waitForTimeout(3500);
    url = page.url();
  } catch (e) { url = '(err: ' + String(e?.message ?? e).slice(0, 60) + ')'; }
  rec('DASH-NAV', term, '', `navigated to: ${url}`, { url, note: expectNote });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  log(`[nav-plans] base=${BASE_URL} out=${OUT_DIR}`);
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, userAgent: 'AuditCoachPlayBot/1.0 (nav-plans)' });
  await ctx.addInitScript(autoDismissCalibration); const page = await ctx.newPage();
  await gotoS(page, '/', null); await page.getByText('Chess Academy Pro', { exact: true }).first().waitFor({ timeout: 30000 }).catch(() => {});

  // ── A. DASHBOARD NAVIGATION ─────────────────────────────────────
  log(`\n\x1b[1m═══ A. DASHBOARD NAVIGATION (ask it to take me places) ═══\x1b[0m`);
  await navProbe(page, 'Caro-Kann', 'open the Caro-Kann opening page (/openings/...)');
  await navProbe(page, "King's Indian Defense", 'open the King\'s Indian Defense page');
  await navProbe(page, 'take me to the tactics trainer', 'navigate to /tactics');
  await navProbe(page, 'play the French Defense against me', 'navigate to a play-against session');
  await navProbe(page, 'review my last game', 'navigate to /coach/review');

  // ── B. NEXT 3 BEST MOVES (live board position) ──────────────────
  log(`\n\x1b[1m═══ B. NEXT-3-BEST-MOVES (from the board position) ═══\x1b[0m`);
  await gotoS(page, '/coach/play', 'coach-game-page'); await pickWhite(page);
  await playMove(page, 'e4'); await playMove(page, 'Nf3'); let fen = await playMove(page, 'Bc4'); if (!fen) fen = await scrapeFen(page);
  rec('BEST-3', 'opening-position', 'What are my three best moves here, and why each one? Give the moves.', await ask(page, 'What are my three best moves here, and why each one? Give the moves.'), { fen, legal: legalSans(fen) });
  await playMove(page, 'd3'); await playMove(page, 'O-O'); fen = await scrapeFen(page) ?? fen;
  rec('BEST-3', 'after-castle', 'List my top 3 candidate moves in this exact position and a one-line reason for each.', await ask(page, 'List my top 3 candidate moves in this exact position and a one-line reason for each.'), { fen, legal: legalSans(fen) });

  // ── C. MIDDLEGAME PLANS after the opening ───────────────────────
  log(`\n\x1b[1m═══ C. MIDDLEGAME PLANS (after the opening) ═══\x1b[0m`);
  fen = await scrapeFen(page) ?? fen;
  rec('MID-PLAN', 'plan-now', "We're out of the opening now — what's my middlegame plan from this position? Concrete pawn breaks and piece maneuvers.", await ask(page, "We're out of the opening now — what's my middlegame plan from this position? Concrete pawn breaks and piece maneuvers."), { fen });
  // teach-surface middlegame-plan question for a named opening
  await gotoS(page, '/coach/chat', 'coach-chat-page');
  rec('MID-PLAN', 'french-plan', 'In the French Defense Advance Variation, what is Black\'s middlegame plan after the opening? Concrete breaks.', await ask(page, 'In the French Defense Advance Variation, what is Black\'s middlegame plan after the opening? Concrete breaks.'), {});
  rec('MID-PLAN', 'kid-plan', "In the King's Indian Defense once the center is closed, what's Black's concrete middlegame plan?", await ask(page, "In the King's Indian Defense once the center is closed, what's Black's concrete middlegame plan?"), {});

  await writeFile(join(OUT_DIR, 'transcript.json'), JSON.stringify(transcript, null, 2));
  log(`\n[nav-plans] DONE — ${transcript.length} captures. ${OUT_DIR}/transcript.json`);
  await browser.close(); process.exit(0);
}
main().catch((e) => { console.error('[nav-plans] fatal:', e); process.exit(1); });
