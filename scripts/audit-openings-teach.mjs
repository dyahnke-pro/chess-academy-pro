#!/usr/bin/env node
/**
 * audit-openings-teach.mjs — HAND-MADE, walked play-by-play.
 * David 2026-06-02: dashboard navigation; next-3-best-moves from the
 * board; middlegame plans after the opening; PLAY the Evans Gambit & the
 * Ruy Lopez then have the coach explain them + give middlegame plans;
 * test openings we DON'T have saved (Grob/Sokolsky) — accurate explain
 * or honest "no data", no fabrication; and "teach Levy's London vs KID".
 * Capture-only — Claude judges every answer by hand. Per-section guards.
 *   AUDIT_SANDBOX=1 node scripts/audit-openings-teach.mjs
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
const OUT_DIR = `audit-reports/openings-teach-${stamp}`;
const PMAP = { wP: 'P', wN: 'N', wB: 'B', wR: 'R', wQ: 'Q', wK: 'K', bP: 'p', bN: 'n', bB: 'b', bR: 'r', bQ: 'q', bK: 'k' };
const ACK = /board'?s?\s+(?:is\s+)?set|position\s+set|you'?re\s+playing|taking too long|try again in a moment|drill lines|lines just loaded|what'?s your next test/i;
const log = (s) => console.log(s);
const transcript = [];

async function snap(page) { return page.$$eval('[data-testid="chat-message-assistant"]', (els) => els.map((e) => { const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b && b.textContent ? b.textContent : ''; let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); return t.trim(); })); }
async function scrapeFen(page) { const m = await page.evaluate(() => { const o = {}; document.querySelectorAll('[data-piece]').forEach((q) => { let n = q, s = q.getAttribute('data-square'); while (n && !s) { n = n.parentElement; s = n && n.getAttribute && n.getAttribute('data-square'); } if (s && /^[a-h][1-8]$/.test(s)) o[s] = q.getAttribute('data-piece'); }); return o; }); if (!Object.keys(m).length) return null; const r = []; for (let R = 8; R >= 1; R--) { let row = '', e = 0; for (const f of 'abcdefgh') { const x = m[f + R]; if (x && PMAP[x]) { if (e) { row += e; e = 0; } row += PMAP[x]; } else e++; } if (e) row += e; r.push(row); } return r.join('/'); }
async function askOnce(page, prompt) { const before = await snap(page); const bs = new Set(before); const i = page.locator('[data-testid="chat-text-input"]'); await i.waitFor({ state: 'visible', timeout: 12000 }); await i.click(); await i.fill(prompt); await page.locator('[data-testid="chat-send-btn"]').click(); try { await page.waitForFunction((prev) => { const A = /board'?s?\s+set|you'?re playing|taking too long/i; const els = [...document.querySelectorAll('[data-testid="chat-message-assistant"]')]; return els.some((e) => { const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b && b.textContent ? b.textContent : ''; let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); t = t.trim(); return t.length > 8 && !prev.includes(t) && !A.test(t); }); }, before, { timeout: T }); } catch { return '(timeout)'; } let pl = -1, st = 0, r = ''; for (let k = 0; k < 35; k++) { await page.waitForTimeout(700); const a = await snap(page); const fr = a.filter((t) => !bs.has(t) && !ACK.test(t)); const cur = fr.length ? fr.reduce((x, y) => (y.length > x.length ? y : x)) : ''; if (cur.length === pl) { st++; if (st >= 2) { r = cur; break; } } else st = 0; pl = cur.length; r = cur; } return r || '(empty)'; }
async function ask(page, prompt) { let r = await askOnce(page, prompt); if (r === '(timeout)' || r === '(empty)') { await page.waitForTimeout(2000); r = await askOnce(page, prompt); } return r; }
async function drainAck(page, beforeTexts, ms = 26000) { const bs = new Set(beforeTexts); const t0 = Date.now(); let prev = -1, st = 0; while (Date.now() - t0 < ms) { await page.waitForTimeout(700); const a = await snap(page); const fr = a.filter((t) => !bs.has(t)); if (!fr.length) continue; const lg = fr.reduce((m, t) => Math.max(m, t.length), 0); if (lg > 15 && lg === prev) { st++; if (st >= 3) return; } else st = 0; prev = lg; } }
async function gotoS(page, path, mount) { await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); if (mount) await page.locator(`[data-testid="${mount}"]`).waitFor({ timeout: 20000 }).catch(() => {}); await page.waitForTimeout(4000); try { if (await page.locator('[data-testid="page-help-modal"]').count()) await page.keyboard.press('Escape'); } catch {} }
async function pickWhite(page) { try { const cs = page.locator('[data-testid="color-selector"]'); if (await cs.count()) { const w = page.getByRole('button', { name: /white/i }); if (await w.count()) await w.first().click().catch(() => {}); await page.waitForTimeout(2000); } } catch {} }
async function playMove(page, san) { const before = await scrapeFen(page); const bt = await snap(page); const i = page.locator('[data-testid="chat-text-input"]'); await i.click(); await i.fill(`play ${san}`); await page.locator('[data-testid="chat-send-btn"]').click(); for (let k = 0; k < 22; k++) { await page.waitForTimeout(800); const n = await scrapeFen(page); if (n && n !== before) break; } await drainAck(page, bt, 22000); return scrapeFen(page); }
async function waitForSeed(page, ms = 75000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const c = await page.evaluate(async () => { try { const req = indexedDB.open('ChessAcademyDB'); await new Promise((r) => { req.onsuccess = () => r(); req.onerror = () => r(); }); const db = req.result; if (!db.objectStoreNames.contains('openings')) { db.close(); return 0; } const tx = db.transaction('openings', 'readonly'); const n = await new Promise((r) => { const g = tx.objectStore('openings').count(); g.onsuccess = () => r(g.result); g.onerror = () => r(0); }); db.close(); return n; } catch { return 0; } }); if (c > 1500) return c; await page.waitForTimeout(3000); } return -1; }
function legalSans(fen) { try { return new Chess(fen).moves(); } catch { return []; } }
const guard = async (label, fn) => { try { await fn(); } catch (e) { log(`  \x1b[33m[${label}] section error (continuing): ${String(e?.message ?? e).slice(0, 90)}\x1b[0m`); } };
function rec(section, label, prompt, answer, extra = {}) { transcript.push({ section, label, prompt, answer, ...extra }); log(`\n\x1b[36m[${section}] ${label}\x1b[0m`); if (extra.url) log(`  → URL: ${extra.url}`); if (extra.fen) log(`  FEN: ${extra.fen}`); if (extra.legal) log(`  LEGAL (${extra.legal.length}): ${extra.legal.join(' ')}`); if (prompt) log(`  Q: ${prompt}`); log(`  A: ${(answer || '').slice(0, 750)}`); }

async function navProbe(page, term, note) {
  let url = '(no nav)';
  try {
    await gotoS(page, '/', null);
    const si = page.locator('[data-testid="smart-search-input"]'); await si.waitFor({ state: 'visible', timeout: 10000 }); await si.click(); await si.fill(''); await si.fill(term); await page.waitForTimeout(2800);
    const agent = page.locator('[data-testid="agent-action-option"]'); const result = page.locator('[data-testid="search-result"]');
    if (await agent.count()) await agent.first().click({ timeout: 8000 }).catch(() => {});
    else if (await result.count()) await result.first().click({ timeout: 8000 }).catch(() => {});
    else await si.press('Enter');
    await page.waitForTimeout(3500); url = page.url();
  } catch (e) { url = '(err: ' + String(e?.message ?? e).slice(0, 50) + ')'; }
  rec('DASH-NAV', term, '', `→ ${url}`, { url, note });
}

async function playLineAndAsk(page, section, moves, openingName) {
  await gotoS(page, '/coach/play', 'coach-game-page'); await pickWhite(page);
  let fen = null;
  for (const mv of moves) { const f = await playMove(page, mv); if (f) fen = f; }
  rec(section, 'explain', `I'm playing the ${openingName} as White here (moves: ${moves.join(' ')}). Explain this opening — the key idea and why these moves.`, await ask(page, `I'm playing the ${openingName} as White here. Explain this opening — the key idea and why these moves.`), { fen, legal: legalSans(fen ?? '') });
  rec(section, 'middlegame-plan', `What's my concrete middlegame plan as White in the ${openingName} from this position — pawn breaks and piece maneuvers?`, await ask(page, `What's my concrete middlegame plan as White in the ${openingName} from this position — pawn breaks and piece maneuvers?`), { fen });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  log(`[openings-teach] base=${BASE_URL} out=${OUT_DIR}`);
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, userAgent: 'AuditCoachPlayBot/1.0 (openings-teach)' });
  await ctx.addInitScript(autoDismissCalibration); const page = await ctx.newPage();
  await gotoS(page, '/', null); await page.getByText('Chess Academy Pro', { exact: true }).first().waitFor({ timeout: 30000 }).catch(() => {});
  const seeded = await waitForSeed(page); log(`[seed] openings store count = ${seeded}`);

  // ── A. DASHBOARD NAVIGATION (seed-waited) ───────────────────────
  await guard('A-nav', async () => {
    log(`\n\x1b[1m═══ A. DASHBOARD NAVIGATION ═══\x1b[0m`);
    await navProbe(page, 'Caro-Kann', 'open the Caro-Kann opening page');
    await navProbe(page, "King's Indian Defense", "open the King's Indian Defense page");
    await navProbe(page, 'take me to the tactics trainer', 'navigate to /tactics');
    await navProbe(page, 'play the French Defense against me', 'play-against session');
    await navProbe(page, 'review my last game', 'navigate to /coach/review');
  });

  // ── B. NEXT-3-BEST-MOVES ────────────────────────────────────────
  await guard('B-best3', async () => {
    log(`\n\x1b[1m═══ B. NEXT-3-BEST-MOVES (live board) ═══\x1b[0m`);
    await gotoS(page, '/coach/play', 'coach-game-page'); await pickWhite(page);
    await playMove(page, 'e4'); await playMove(page, 'Nf3'); let fen = await playMove(page, 'Bc4'); if (!fen) fen = await scrapeFen(page);
    rec('BEST-3', 'opening-pos', 'What are my three best moves here, and a one-line reason for each? Give the moves.', await ask(page, 'What are my three best moves here, and a one-line reason for each? Give the moves.'), { fen, legal: legalSans(fen ?? '') });
  });

  // ── C. MIDDLEGAME PLAN (live) ───────────────────────────────────
  await guard('C-plan', async () => {
    log(`\n\x1b[1m═══ C. MIDDLEGAME PLAN (live position) ═══\x1b[0m`);
    let fen = await scrapeFen(page);
    rec('MID-PLAN', 'live', "We're out of the opening — what's my middlegame plan here? Concrete breaks and maneuvers.", await ask(page, "We're out of the opening — what's my middlegame plan here? Concrete breaks and maneuvers."), { fen });
  });

  // ── D. EVANS GAMBIT (play + explain + plan) ─────────────────────
  await guard('D-evans', async () => {
    log(`\n\x1b[1m═══ D. EVANS GAMBIT ═══\x1b[0m`);
    await playLineAndAsk(page, 'EVANS', ['e4', 'Nf3', 'Bc4', 'b4'], 'Evans Gambit');
  });

  // ── E. RUY LOPEZ (play + explain + plan) ────────────────────────
  await guard('E-ruy', async () => {
    log(`\n\x1b[1m═══ E. RUY LOPEZ ═══\x1b[0m`);
    await playLineAndAsk(page, 'RUY', ['e4', 'Nf3', 'Bb5'], 'Ruy Lopez');
  });

  // ── F. NON-SAVED OPENINGS (explain or honest no-data) ───────────
  await guard('F-unsaved', async () => {
    log(`\n\x1b[1m═══ F. NON-SAVED OPENINGS (Grob / Sokolsky / offbeat) ═══\x1b[0m`);
    await gotoS(page, '/coach/chat', 'coach-chat-page');
    rec('UNSAVED', 'grob', 'Explain the Grob (1.g4) — the idea, and is it sound?', await ask(page, 'Explain the Grob opening (1.g4) — the idea behind it, and is it sound?'), {});
    rec('UNSAVED', 'sokolsky', "Explain the Sokolsky / Orangutan (1.b4) — White's plan and the main ideas.", await ask(page, "Explain the Sokolsky / Orangutan (1.b4) — White's plan and the main ideas."), {});
    rec('UNSAVED', 'halloween', 'Explain the Halloween Gambit in the Four Knights — is the knight sac on e5 sound?', await ask(page, 'Explain the Halloween Gambit in the Four Knights (4.Nxe5) — is the knight sacrifice sound?'), {});
  });

  // ── G. LEVY'S LONDON vs the KING'S INDIAN ───────────────────────
  await guard('G-london', async () => {
    log(`\n\x1b[1m═══ G. LEVY'S LONDON vs KID ═══\x1b[0m`);
    await gotoS(page, '/coach/chat', 'coach-chat-page');
    rec('LONDON', 'teach', "Teach me Levy's London System against the King's Indian setup — how do I play the London when Black fianchettoes the g7-bishop?", await ask(page, "Teach me the London System against the King's Indian setup (Levy / GothamChess style) — how do I play the London when Black fianchettoes the g7-bishop?"), {});
    rec('LONDON', 'plan', 'In that London-vs-KID structure, what is my concrete middlegame plan as White — pawn breaks and where my pieces go?', await ask(page, 'In that London-vs-KID structure, what is my concrete middlegame plan as White — pawn breaks and where my pieces go?'), {});
  });

  // ── H. OPENING FROM A PRO NOT IN OUR REPERTOIRE ─────────────────
  // Repertoire pros: Naroditsky, GothamChess, Rosen, Hikaru, Caruana,
  // Samay, Aman, Carlsen. So probe pros NOT in the set — watch for
  // FABRICATION (inventing a "repertoire we have" for them) vs honest
  // teaching grounded in the opening's real theory.
  await guard('H-nonrepPro', async () => {
    log(`\n\x1b[1m═══ H. OPENING FROM A PRO NOT IN OUR REPERTOIRE ═══\x1b[0m`);
    await gotoS(page, '/coach/chat', 'coach-chat-page');
    rec('NONREP-PRO', 'ding-favorite', "Teach me Ding Liren's favorite opening as White — what does he play and what's the key idea?", await ask(page, "Teach me Ding Liren's favorite opening as White — what does he open with and what's the key idea behind it?"), {});
    rec('NONREP-PRO', 'nepo-petroff', "Teach me how Nepomniachtchi plays the Petroff Defense as Black — the main line and the plan.", await ask(page, "Teach me how Ian Nepomniachtchi plays the Petroff Defense as Black — the main line and Black's plan."), {});
    rec('NONREP-PRO', 'finegold-london', "Ben Finegold always says 'never play f3' and loves the London — teach me his London System approach.", await ask(page, "Ben Finegold loves the London System. Teach me how he recommends playing it — his key principles and move order."), {});
  });

  await writeFile(join(OUT_DIR, 'transcript.json'), JSON.stringify(transcript, null, 2));
  log(`\n[openings-teach] DONE — ${transcript.length} captures. ${OUT_DIR}/transcript.json`);
  await browser.close(); process.exit(0);
}
main().catch((e) => { console.error('[openings-teach] fatal:', e); process.exit(1); });
