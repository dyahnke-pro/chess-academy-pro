#!/usr/bin/env node
/**
 * PERSISTENT HAND-DRIVE HARNESS — one browser, one command at a time from
 * /tmp/hd_cmd.json → /tmp/hd_res.json, so the audit is driven BY HAND across
 * tool calls (David 2026-07-24: "run the audit yourself, not a bot").
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
const CMD = '/tmp/hd_cmd.json', RES = '/tmp/hd_res.json';
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const page = await (await browser.newContext(sandboxContextOptions())).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') { const x = m.text(); if (!/Download the React|favicon|ERR_|Manifest|preload/i.test(x)) errs.push('CONSOLE: ' + x.slice(0, 180)); } });
let recent = [], lastPiece = null;
const PMAP = { wP: 'P', wN: 'N', wB: 'B', wR: 'R', wQ: 'Q', wK: 'K', bP: 'p', bN: 'n', bB: 'b', bR: 'r', bQ: 'q', bK: 'k' };
async function buildFen(turn) {
  const m = await page.evaluate(() => { const o = {}; for (const el of document.querySelectorAll('[data-square]')) { const pc = el.querySelector('[data-piece]'); if (pc) o[el.getAttribute('data-square')] = pc.getAttribute('data-piece'); } return o; });
  const rows = []; for (let r = 8; r >= 1; r--) { let e = 0, row = ''; for (const f of 'abcdefgh') { const p = m[f + r]; if (p) { if (e) { row += e; e = 0; } row += PMAP[p] || ''; } else e++; } if (e) row += e; rows.push(row); }
  return rows.join('/') + ` ${turn} - - 0 1`;
}
async function dump() {
  return page.evaluate(() => { const out = []; for (const el of document.querySelectorAll('[data-testid]')) { const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue; const t = el.getAttribute('data-testid'); const tag = el.tagName.toLowerCase(); if (tag === 'button' || /modal|popup|callout|prompt|card|toast|banner|consent|help|calib|continue|unlock|rung|play-mode|difficulty|why|show-the-line/i.test(t)) { const txt = (el.innerText || '').replace(/\s+/g, ' ').slice(0, 44); out.push(`${tag}[${t}]${el.disabled ? '(disabled)' : ''} "${txt}"`); } } return [...new Set(out)]; });
}
async function exec(c) {
  try {
    if (c.action === 'nav') { await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(1500); return { url: page.url() }; }
    if (c.action === 'reload') { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); return { url: page.url() }; }
    if (c.action === 'dump') { return { url: page.url(), buttons: await dump() }; }
    if (c.action === 'click') { const l = page.locator(`[data-testid="${c.testid}"]`).first(); await l.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {}); await l.click({ force: !!c.force, timeout: c.timeout || 8000 }); await page.waitForTimeout(c.wait || 1500); return { clicked: c.testid, url: page.url() }; }
    if (c.action === 'text') { return { testid: c.testid, text: await page.locator(`[data-testid="${c.testid}"]`).first().innerText({ timeout: 4000 }).catch(() => null) }; }
    if (c.action === 'count') { return { testid: c.testid, count: await page.locator(`[data-testid="${c.testid}"]`).count() }; }
    if (c.action === 'seed') { await page.evaluate(async ({ rating, secret }) => { try { localStorage.setItem('auditMoveHook', '1'); } catch {} const dbs = await indexedDB.databases(); const nm = (dbs.find((d) => /chess/i.test(d.name || '')) || {}).name; if (!nm) return; await new Promise((res) => { const q = indexedDB.open(nm); q.onsuccess = () => { const db = q.result; if (!db.objectStoreNames.contains('profiles')) return res(); const tx = db.transaction('profiles', 'readwrite'); const ps = tx.objectStore('profiles'); const g = ps.getAll(); g.onsuccess = () => { for (const p of g.result) { p.preferences = p.preferences || {}; p.preferences.voiceEnabled = true; p.preferences.coachNarration = 'full'; if (secret) p.preferences.auditStreamSecret = secret; p.rating = rating; ps.put(p); } }; tx.oncomplete = () => res(); }; q.onerror = () => res(); setTimeout(res, 5000); }); }, { rating: c.rating || 600, secret: c.secret || '' }); return { seeded: true }; }
    if (c.action === 'seedfen') { const ok = await page.evaluate((fen) => (typeof window.__seedFen === 'function' ? window.__seedFen(fen) : null), c.fen); await page.waitForTimeout(c.wait || 5000); return { seededFen: ok }; }
    if (c.action === 'playmove') { const ok = await page.evaluate(({ f, t }) => { if (typeof window.__playMove === 'function') { window.__playMove(f, t); return true; } return false; }, { f: c.from, t: c.to }); await page.waitForTimeout(c.wait || 2500); return { played: ok ? `${c.from}${c.to}` : 'not-my-turn' }; }
    if (c.action === 'smartmove') { const fen = await buildFen(c.color || 'b'); let g; try { g = new Chess(fen); } catch { return { err: 'badfen', fen }; } const mv = g.moves({ verbose: true }); if (!mv.length) return { err: 'nomoves' }; const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; const back = (c.color || 'b') === 'b' ? ['a8', 'b8', 'c8', 'd8', 'f8', 'g8', 'h8'] : ['a1', 'b1', 'c1', 'd1', 'f1', 'g1', 'h1']; const sc = (m) => { let s = Math.random() * 0.6; const gain = m.captured ? V[m.captured] - V[g.get(m.from).type] : 0; if (m.captured && gain >= 1) s += 30 + gain * 2; else if (m.captured) s -= 8; if (m.san.includes('+')) s += 2; if (m.san === 'O-O' || m.san === 'O-O-O') s += 18; if (/[nb]/.test(m.piece) && back.includes(m.from)) s += 14; if (m.piece === 'q') s -= 6; if (m.piece === 'r') s -= 7; if (m.piece === 'k' && m.san.length < 3) s -= 12; if (m.piece === 'p' && ['d', 'e', 'c'].includes(m.to[0])) s += 5; if (recent.includes(m.piece + m.to)) s -= 25; if (lastPiece === m.piece && !m.captured) s -= 7; return s; }; mv.sort((a, b) => sc(b) - sc(a)); const m = mv[0]; recent.push(m.piece + m.to); if (recent.length > 6) recent.shift(); lastPiece = m.piece; const ok = await page.evaluate(({ f, t }) => { if (typeof window.__playMove === 'function') { window.__playMove(f, t); return true; } return false; }, { f: m.from, t: m.to }); await page.waitForTimeout(c.wait || 3500); return { played: ok ? m.san : 'not-my-turn' }; }
    if (c.action === 'errors') { return { errors: errs.slice() }; }
    if (c.action === 'quit') { setTimeout(() => { browser.close(); process.exit(0); }, 200); return { bye: true }; }
    return { err: 'unknown action ' + c.action };
  } catch (e) { return { err: String(e).slice(0, 160) }; }
}
writeFileSync(RES, JSON.stringify({ id: 0, ready: true }));
let last = 0;
console.log('handdrive ready');
for (;;) {
  await new Promise((r) => setTimeout(r, 300));
  if (!existsSync(CMD)) continue;
  let c; try { c = JSON.parse(readFileSync(CMD, 'utf8')); } catch { continue; }
  if (!c || c.id === last) continue;
  last = c.id;
  const data = await exec(c);
  writeFileSync(RES, JSON.stringify({ id: c.id, action: c.action, ...data, errCount: errs.length }));
}
