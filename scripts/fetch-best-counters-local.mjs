#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Chess } from 'chess.js';
const TOKEN = process.env.LICHESS_TOKEN || process.env.LICHESS_API_KEY;
if (!TOKEN) { console.error('Set LICHESS_API_KEY env var'); process.exit(1); }
const OUT_DIR = 'docs/audit-runs/2026-05-19-best-counters';
const OUT_PATH = join(OUT_DIR, 'best-counters.json');
const MIN_GAMES_MOVE = 20;
const MIN_GAMES_POSITION = 50;
const DELAY = 250;
const AUTH = { headers: { Authorization: `Bearer ${TOKEN}` } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function fenAtPly(pgn, plyMax) {
  const c = new Chess(); const toks = pgn.trim().split(/\s+/).filter(t => !/^\d+\.+$/.test(t));
  let played = 0;
  for (const t of toks) { if (played >= plyMax) break; try { c.move(t); played++; } catch { break; } }
  return { fen: c.fen(), pliesPlayed: played };
}
const side = fen => fen.split(' ')[1] === 'w' ? 'white' : 'black';
async function explorerMasters(fen) { const r = await fetch(`https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=12&topGames=4`, AUTH); return r.ok ? r.json() : null; }
async function explorerLichess(fen) { const r = await fetch(`https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fen)}&moves=12&topGames=4&speeds=blitz,rapid,classical&ratings=2200,2500`, AUTH); return r.ok ? r.json() : null; }
function pickBest(data, stm) {
  if (!data?.moves?.length) return null;
  return data.moves.map(m => {
    const total = (m.white||0) + (m.draws||0) + (m.black||0);
    if (total < MIN_GAMES_MOVE) return null;
    const wins = stm === 'white' ? (m.white||0) : (m.black||0);
    return { san: m.san, uci: m.uci, total, wins, draws: m.draws||0, losses: stm==='white'?(m.black||0):(m.white||0), winRate: wins/total };
  }).filter(Boolean).sort((a,b)=>b.winRate-a.winRate)[0] || null;
}
async function fetchGamePgn(id) { const r = await fetch(`https://lichess.org/game/export/${id}?pgnInJson=false`, { headers: { Accept: 'application/x-chess-pgn', Authorization: `Bearer ${TOKEN}` } }); return r.ok ? r.text() : null; }
async function tryDepth(fen) {
  await sleep(DELAY);
  let data = await explorerMasters(fen).catch(() => null);
  let source = 'masters'; let total = data ? ((data.white||0) + (data.draws||0) + (data.black||0)) : 0;
  let best = total >= MIN_GAMES_POSITION ? pickBest(data, side(fen)) : null;
  if (!best) {
    await sleep(DELAY);
    data = await explorerLichess(fen).catch(() => null);
    source = 'lichess-2200plus'; total = data ? ((data.white||0) + (data.draws||0) + (data.black||0)) : 0;
    best = total >= MIN_GAMES_POSITION ? pickBest(data, side(fen)) : null;
  }
  return { data, source, total, best };
}
async function findBest(o) {
  if (!o.pgn) return { error: 'no PGN' };
  for (const plyMax of [14, 10, 8, 6, 4]) {
    const { fen, pliesPlayed } = fenAtPly(o.pgn, plyMax);
    if (pliesPlayed === 0) continue;
    const stm = side(fen);
    const { data, source, total, best } = await tryDepth(fen);
    if (!best) continue;
    const c = new Chess(fen); try { c.move(best.san); } catch { continue; }
    const rep = data.topGames?.find(g => g.winner) || data.topGames?.[0];
    let pgn = null;
    if (rep?.id) { await sleep(DELAY); pgn = await fetchGamePgn(rep.id).catch(() => null); }
    return { pliesAtQuery: pliesPlayed, dbSource: source, tailFen: fen, sideToMove: stm, totalGamesAtPosition: total,
      bestResponse: { san: best.san, uci: best.uci, games: best.total, winsForResponder: best.wins, lossesForResponder: best.losses, draws: best.draws, winRate: best.winRate },
      bestResponseFen: c.fen(),
      repGame: rep ? { id: rep.id, white: rep.white?.name || 'Unknown', whiteRating: rep.white?.rating ?? null, black: rep.black?.name || 'Unknown', blackRating: rep.black?.rating ?? null, year: rep.year, month: rep.month, result: rep.winner === 'white' ? '1-0' : (rep.winner === 'black' ? '0-1' : '1/2-1/2'), sourceUrl: `https://lichess.org/${rep.id}`, fullPgn: pgn } : null,
    };
  }
  return { error: 'no usable result' };
}
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const rep = JSON.parse(await readFile('src/data/repertoire.json', 'utf-8'));
  const pro = JSON.parse(await readFile('src/data/pro-repertoires.json', 'utf-8'));
  const gam = JSON.parse(await readFile('src/data/gambits.json', 'utf-8'));
  const all = [
    ...(Array.isArray(rep) ? rep : Object.values(rep)).map(o => ({ ...o, _s: 'repertoire' })),
    ...(pro.openings || []).map(o => ({ ...o, _s: 'pro' })),
    ...(Array.isArray(gam) ? gam : Object.values(gam)).map(o => ({ ...o, _s: 'gambit' })),
  ];
  console.log(`processing ${all.length} openings`);
  const results = [];
  for (let i = 0; i < all.length; i++) {
    const o = all[i];
    const r = await findBest(o);
    results.push({ openingId: o.id, source: o._s, openingName: o.name, openingColor: o.color, ...r });
    const tag = r.bestResponse ? `✓ ${r.bestResponse.san} (${(r.bestResponse.winRate*100).toFixed(1)}%/${r.bestResponse.games}g)` : `✗ ${r.error}`;
    console.log(`  [${i+1}/${all.length}] ${o.id} — ${tag}`);
    if (i % 20 === 0) await writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  }
  await writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), totalProcessed: results.length, results }, null, 2));
  console.log(`\nDONE — ${results.filter(r => r.bestResponse).length}/${results.length}`);
}
main().catch(e => { console.error(e); process.exit(1); });
