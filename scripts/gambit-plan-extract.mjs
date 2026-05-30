#!/usr/bin/env node
// Gambit middlegame-plan + endgame-handoff extractor (David 2026-05-30).
// For each per-variation opening spine, anchors at the WIDE-CORPUS middlegame
// entry (≥ WIDE games on the line — NOT the deep terminus, per the wider-corpus
// rule) and walks the games that reached it FORWARD. Every student-side fork at
// ≥ PLAN_PCT across the wide corpus = one middlegame plan. When the corpus thins
// below PLAYABLE, that ply is the ENDGAME handoff — records its FEN + game count
// so the endgame step can pull the real games and walk them into the ending.
//
// The LLM never picks a move; this only reads what the master games actually
// played (G3 / show-your-work §1b). Output: data/sources/gambit-plans/<id>.json
//
// Run: node scripts/gambit-plan-extract.mjs            (all __ variation spines)
//      node scripts/gambit-plan-extract.mjs sm__accepted-main   (one)
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const WIDE = Number(process.env.WIDE ?? 120);      // wide-corpus middlegame-entry floor
const PLAN_PCT = Number(process.env.PLAN_PCT ?? 0.10); // ≥10% fork = a plan
const PLAYABLE = Number(process.env.PLAYABLE ?? 50);   // below this = endgame handoff
const WALK = Number(process.env.WALK ?? 12);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const G = (m) => (m.white || 0) + (m.draws || 0) + (m.black || 0);
const uci = (ms) => { const c = new Chess(); return ms.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); };
async function fetchR(u) { for (let i = 0; i < 6; i++) { try { const r = await fetch(u); if (r.ok) return r.json(); } catch { /* cert skew / transient */ } await sleep(400 * (i + 1)); } return null; }
async function exp(ms, src) { const e = src === 'lichess' ? '&ratings=2000,2200,2500&speeds=blitz,rapid,classical' : ''; return fetchR(`${PROXY}?source=${src}&play=${uci(ms).join(',')}${e}`); }
async function dist(ms) { let j = await exp(ms, 'masters'); let src = 'masters'; if (!j || G(j) < 60) { const k = await exp(ms, 'lichess'); if (k) { j = k; src = 'lichess'; } } await sleep(120); return { j, src, tot: j ? G(j) : 0 }; }
const fenOf = (ms) => { const c = new Chess(); ms.forEach((m) => c.move(m)); return c.fen(); };

// student side per spine-id prefix (white gambits vs black gambits)
const WHITE_PREFIX = new Set(['kg', 'ev', 'sc', 'vi', 'da', 'sm']);
const studentOf = (id) => (WHITE_PREFIX.has(id.split('__')[0]) ? 'w' : 'b');

async function extract(file) {
  const id = file.replace(/\.json$/, '');
  const s = JSON.parse(readFileSync(`data/sources/opening-spines/${file}`));
  const student = studentOf(id);
  // back off from deep terminus to the wide-corpus middlegame entry
  let ms = [...s.spine];
  while (ms.length > 10) { const { tot } = await dist(ms); if (tot >= WIDE) break; ms.pop(); }
  const mgEntryMove = Math.ceil(ms.length / 2);
  const planForks = [];
  let endgame = null;
  for (let i = 0; i < WALK; i++) {
    const { j, tot, src } = await dist(ms);
    if (!j || !j.moves?.length || tot < PLAYABLE) { endgame = { afterMove: Math.ceil(ms.length / 2), fen: fenOf(ms), games: tot, line: [...ms] }; break; }
    const sideToMove = (ms.length % 2 === 0) ? 'w' : 'b';
    const top = j.moves[0];
    const options = j.moves.filter((m) => G(m) / tot >= PLAN_PCT).map((m) => ({ san: m.san, pct: Math.round(G(m) / tot * 100), games: G(m) }));
    if (sideToMove === student && options.length >= 2) {
      planForks.push({ afterMove: Math.ceil((ms.length + 1) / 2), fen: fenOf(ms), corpus: tot, source: src, options });
    }
    ms.push(top.san);
  }
  const out = { id, openingId: s.openingId, student, mgEntryMove, planCount: planForks.length, planForks, endgame, walkedTo: Math.ceil(ms.length / 2), generatedAt: new Date().toISOString() };
  mkdirSync('data/sources/gambit-plans', { recursive: true });
  writeFileSync(`data/sources/gambit-plans/${id}.json`, JSON.stringify(out, null, 2) + '\n');
  const eg = endgame ? `endgame@m${endgame.afterMove}(${endgame.games}g)` : 'no-thin';
  console.log(`[plans] ${id.padEnd(22)} MGentry m${mgEntryMove}  studentForks=${planForks.length}  ${eg}`);
  return out;
}

(async () => {
  const only = process.argv[2];
  const files = only ? [`${only}.json`] : readdirSync('data/sources/opening-spines').filter((f) => f.includes('__'));
  for (const f of files) { try { await extract(f); } catch (e) { console.log(`[plans] ${f} ERROR ${e.message}`); } }
  console.log('[plans] done');
})();
