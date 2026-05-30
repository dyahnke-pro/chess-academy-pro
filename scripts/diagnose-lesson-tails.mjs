#!/usr/bin/env node
// DIAGNOSTIC (David 2026-05-29, step "a"): rank every opening/variation lesson
// by how far its authored line runs PAST the point where it's still common
// theory — the "tail overhang". For each lesson we find the deepest position
// on its own line that clears a "still common" bar (masters >= 50, else strong
// online >= 300; pro lessons use the player's own corpus >= 30), and compare
// that depth to where the lesson actually ends.
//
// Output: console table (worst overhang first) + audit-reports/lesson-tails.json.
// This is READ-ONLY — it changes no content. It tells us which deep tails to
// trim (step "c"). The lessonDepth gate floors variation lessons at 20 plies
// (move 10), so a lesson whose common-depth < move 10 can't be trimmed to the
// data without becoming a `roadmap` — those are flagged.
//
// Run: node scripts/diagnose-lesson-tails.mjs   (needs the explorer proxy)
import { Chess } from 'chess.js';
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const COMMON_MASTER = 50;   // "still common" master-game bar for the cut point
const COMMON_ONLINE = 300;  // fallback: strong online games (2000+)
const COMMON_PRO = 30;      // pro corpus: still common in the player's own games
const GATE_MIN_PLIES = 20;  // lessonDepth floor for `variation` lessons
const ONLINE_RATINGS = '2000,2200,2500', ONLINE_SPEEDS = 'blitz,rapid,classical';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fen4 = (f) => f.split(' ').slice(0, 4).join(' ');
const moveNo = (ply) => Math.ceil(ply / 2);

async function loadLessons() {
  const outfile = join(tmpdir(), `lb-${Date.now()}.mjs`);
  await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile, loader: { '.json': 'json' }, logLevel: 'error' });
  return (await import(outfile)).getAllLessonScripts();
}
function longestMoves(les) { let b = les.beats[0]; for (const x of les.beats) if (x.moves.length > b.moves.length) b = x; return b.moves; }
function uci(ms) { const c = new Chess(); return ms.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); }
async function ecount(ms, src) {
  const extra = src === 'lichess' ? `&ratings=${ONLINE_RATINGS}&speeds=${ONLINE_SPEEDS}` : '';
  try { const r = await fetch(`${PROXY}?source=${src}&play=${uci(ms).join(',')}${extra}`); if (!r.ok) return null; const j = await r.json(); return (j.white || 0) + (j.draws || 0) + (j.black || 0); }
  catch { return null; }
}
// deepest ply on the line with count >= floor (counts are monotone in depth).
async function deepestCommon(ms, src, floor) {
  let lo = 2, hi = ms.length, best = null;
  while (lo <= hi) { const mid = (lo + hi) >> 1; const n = await ecount(ms.slice(0, mid), src); await sleep(110); if (n != null && n >= floor) { best = { ply: mid, games: n }; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
// pro trees
const PLAYER_DIR = { naroditsky: 'danielnaroditsky', gothamchess: 'gothamchess' };
const cache = new Map();
function proIndex(player) {
  const user = PLAYER_DIR[player]; if (!user) return null;
  if (cache.has(user)) return cache.get(user);
  const dir = `data/sources/${user}-trees`; if (!existsSync(dir)) { cache.set(user, null); return null; }
  const idx = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json') || f.includes('model')) continue;
    let t; try { t = JSON.parse(readFileSync(join(dir, f), 'utf-8')); } catch { continue; }
    if (!t.tree || !Array.isArray(t.minPrefix)) continue;
    const c = new Chess(); let ok = true; for (const m of t.minPrefix) { try { c.move(m); } catch { ok = false; break; } } if (!ok) continue;
    const walk = (node, ch) => { const k = fen4(ch.fen()); if ((node.games || 0) > (idx.get(k) || 0)) idx.set(k, node.games || 0); for (const [san, kid] of Object.entries(node.children || {})) { const n = new Chess(ch.fen()); let mv; try { mv = n.move(san); } catch { mv = null; } if (mv) walk(kid, n); } };
    walk(t.tree, c);
  }
  cache.set(user, idx); return idx;
}
function proDeepest(player, ms) { const idx = proIndex(player); if (!idx) return null; const c = new Chess(); let best = null; for (let i = 0; i < ms.length; i++) { try { c.move(ms[i]); } catch { break; } const g = idx.get(fen4(c.fen())); if (g && g >= COMMON_PRO) best = { ply: i + 1, games: g }; } return best; }

(async () => {
  const lessons = await loadLessons();
  const rows = [];
  for (const { key, lesson } of lessons) {
    const ms = longestMoves(lesson);
    const finalPly = ms.length;
    const id = lesson.openingId || '';
    const kind = lesson.kind || 'variation';
    let common = null, pool = '';
    if (id.startsWith('pro-')) { common = proDeepest(id.split('-')[1], ms); pool = 'pro'; }
    else {
      common = await deepestCommon(ms, 'masters', COMMON_MASTER); pool = 'master';
      if (!common) { common = await deepestCommon(ms, 'lichess', COMMON_ONLINE); pool = common ? 'online' : ''; }
    }
    const commonPly = common ? common.ply : 0;
    const overhang = finalPly - commonPly;
    const trimTo = Math.max(commonPly, GATE_MIN_PLIES);
    rows.push({
      key, kind, pool, finalPly, finalMove: moveNo(finalPly),
      commonPly, commonMove: moveNo(commonPly), commonGames: common?.games ?? 0,
      overhang, trimToPly: Math.min(trimTo, finalPly), trimToMove: moveNo(Math.min(trimTo, finalPly)),
      belowGate: commonPly < GATE_MIN_PLIES, // common runs out before move 10
    });
  }
  rows.sort((a, b) => b.overhang - a.overhang);
  mkdirSync('audit-reports', { recursive: true });
  writeFileSync('audit-reports/lesson-tails.json', JSON.stringify(rows, null, 2) + '\n');
  const overext = rows.filter((r) => r.overhang >= 4);
  console.log(`\n${lessons.length} lessons. ${overext.length} with overhang >= 4 plies (authored 2+ moves past where the line is still common).\n`);
  console.log('WORST 30 OVER-EXTENDED TAILS (overhang = plies past the still-common point):');
  console.log('overhang  final  common  games   pool    belowGate?  key');
  for (const r of rows.slice(0, 30)) {
    console.log(`  ${String(r.overhang).padStart(2)}plies  m${String(r.finalMove).padStart(2)}  m${String(r.commonMove).padStart(2)}    ${String(r.commonGames).padStart(6)}  ${r.pool.padEnd(6)}  ${r.belowGate ? 'YES' : ' no'}        ${r.key}`);
  }
  const below = rows.filter((r) => r.belowGate && r.pool);
  console.log(`\n${below.length} lessons whose theory thins BEFORE move ${moveNo(GATE_MIN_PLIES)} — can't trim to data without going under the depth gate (would need kind:'roadmap').`);
  const noData = rows.filter((r) => !r.pool);
  console.log(`${noData.length} lessons with NO common position found at all (very offbeat / sharp).`);
})();
