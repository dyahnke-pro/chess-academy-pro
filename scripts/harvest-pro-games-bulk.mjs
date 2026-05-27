#!/usr/bin/env node
/**
 * Phase 0 BULK game harvest (David 2026-05-27: "gather all data possible on
 * their games then we decide what to build").
 *
 * Pulls each pro's full game history from BOTH platforms and classifies every
 * game by opening / color / result / time-control, then ranks their most-played
 * variations. This is the large DB we pick variations from BEFORE building.
 *
 *   chess.com:  /pub/player/<h>/games/archives  -> monthly PGN bundles (ECO tagged)
 *   lichess:    /api/games/user/<h>?opening=true -> NDJSON (opening.name/eco, winner)
 *
 * Both reachable direct from this sandbox (verified 2026-05-27). Per-player
 * output: docs/audit-runs/2026-05-27-pro-provenance/games/<playerId>.json
 * (written incrementally). Run: node scripts/harvest-pro-games-bulk.mjs
 *   PLAYERS=gothamchess,ericrosen node scripts/harvest-pro-games-bulk.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = 'docs/audit-runs/2026-05-27-pro-provenance/games';
const MAX_CHESSCOM_GAMES = Number(process.env.MAX_CC ?? 12000); // newest-first cap
const MAX_LICHESS_GAMES = Number(process.env.MAX_LI ?? 12000);
const CC_DELAY_MS = 250;

// chess.com handles are lowercase; lichess handles verified via /api/user.
const PROFILES = {
  naroditsky:     { chesscom: 'danielnaroditsky', lichess: 'Daniel_Naroditsky', type: 'teacher+elite' },
  gothamchess:    { chesscom: 'gothamchess', lichess: 'levyrozman', type: 'teacher' },
  ericrosen:      { chesscom: 'imrosen', lichess: 'EricRosen', type: 'teacher' },
  carlsen:        { chesscom: 'magnuscarlsen', lichess: 'DrNykterstein', type: 'elite' },
  hikaru:         { chesscom: 'hikaru', lichess: 'penguingm1', type: 'elite+streamer' },
  caruana:        { chesscom: 'fabianocaruana', lichess: 'Lachesis-', type: 'elite' },
  firouzja:       { chesscom: 'firouzja2003', lichess: 'alireza2003', type: 'elite' },
  dubov:          { chesscom: 'duhless', lichess: 'Daniil_Dubov', type: 'elite+streamer' },
  gukesh:         { chesscom: 'gukeshdommaraju', lichess: 'DommarajuGukesh', type: 'elite' },
  praggnanandhaa: { chesscom: 'rpragchess', lichess: 'rpragchess', type: 'elite' },
  niemann:        { chesscom: 'hansontwitch', lichess: null, type: 'elite' },
  annacramling:   { chesscom: 'annacramling', lichess: 'AnnaCramling', type: 'teacher' },
  chesswithakeem: { chesscom: 'chesswithakeem', lichess: 'ChessWithAkeem', type: 'teacher' },
  samayraina:     { chesscom: 'samayraina', lichess: 'samayraina', type: 'teacher' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = (pgn, name) => { const m = pgn.match(new RegExp(`\\[${name} "([^"]*)"\\]`)); return m ? m[1] : null; };

async function fetchJson(url, ms = 30000) {
  for (let a = 0; a < 4; a += 1) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'ChessAcademyPro harvest (dyahnke@gmail.com)' }, signal: AbortSignal.timeout(ms) });
      if (r.status === 429) { await sleep(3000 * (a + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(1500 * (a + 1)); }
  }
  return null;
}

// One classified record per game (PGN tags only — no full movetext stored).
function record(playerId, color, eco, opening, result, tc, url, sans) {
  return { color, eco, opening, result, tc, url, line: sans };
}

async function harvestChesscom(handle, playerId) {
  const arch = await fetchJson(`https://api.chess.com/pub/player/${handle}/games/archives`);
  if (!arch?.archives?.length) return [];
  const months = [...arch.archives].reverse(); // newest first
  const out = [];
  for (const url of months) {
    if (out.length >= MAX_CHESSCOM_GAMES) break;
    await sleep(CC_DELAY_MS);
    const data = await fetchJson(url, 45000);
    for (const g of data?.games ?? []) {
      if (!g.pgn || g.rules !== 'chess') continue;
      const w = (g.white?.username ?? '').toLowerCase();
      const color = w === handle ? 'white' : 'black';
      const res = g.white?.result === 'win' ? '1-0' : g.black?.result === 'win' ? '0-1' : '1/2-1/2';
      const movetext = (g.pgn.split(/\n\n/)[1] ?? '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').trim().split(/\s+/).slice(0, 16).join(' ');
      out.push(record(playerId, color, tag(g.pgn, 'ECO'), tag(g.pgn, 'ECOUrl')?.split('/openings/')[1]?.replace(/-/g, ' ') ?? null, res, g.time_class, g.url, movetext));
    }
  }
  return out;
}

async function harvestLichess(handle, playerId) {
  if (!handle) return [];
  const url = `https://lichess.org/api/games/user/${handle}?max=${MAX_LICHESS_GAMES}&opening=true&perfType=blitz,rapid,classical&pgnInJson=false&clocks=false&evals=false`;
  for (let a = 0; a < 3; a += 1) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/x-ndjson', 'User-Agent': 'ChessAcademyPro harvest (dyahnke@gmail.com)' }, signal: AbortSignal.timeout(180000) });
      if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
      if (!r.ok) return [];
      const text = await r.text();
      const out = [];
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let g; try { g = JSON.parse(line); } catch { continue; }
        const color = g.players?.white?.user?.name?.toLowerCase() === handle.toLowerCase() ? 'white' : 'black';
        const res = g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2';
        out.push(record(playerId, color, g.opening?.eco ?? null, g.opening?.name ?? null, res, g.speed, `https://lichess.org/${g.id}`, null));
      }
      return out;
    } catch { await sleep(2000 * (a + 1)); }
  }
  return [];
}

// Strip trailing move-notation tokens (chess.com ECO-URL names carry the full
// variation, e.g. "...Maroczy Bind Formation 5...Bg7 6.Be3"); keep variation
// granularity, drop the move noise. Lichess names ("Sicilian: Najdorf") pass
// through clean.
function cleanName(name) {
  if (!name) return null;
  const toks = name.replace(/_/g, ' ').split(/\s+/);
  const cut = toks.findIndex((t) => /\d/.test(t) || t.includes('...') || /^O-O/.test(t));
  return (cut >= 0 ? toks.slice(0, cut) : toks).join(' ').replace(/\s+:/g, ':').trim() || null;
}

function aggregate(playerId, games) {
  // Rank by VARIATION (cleaned opening name) per color; track tc + win-rate + urls.
  const byKey = new Map();
  const SERIOUS = new Set(['rapid', 'classical', 'daily']);
  for (const g of games) {
    const fam = cleanName(g.opening) ?? `ECO ${g.eco ?? '?'}`;
    const key = `${g.color}::${fam}`;
    let e = byKey.get(key);
    if (!e) { e = { color: g.color, family: fam, games: 0, serious: 0, w: 0, d: 0, l: 0, ecos: {}, sampleUrls: [] }; byKey.set(key, e); }
    e.games += 1;
    if (SERIOUS.has(g.tc)) e.serious += 1;
    const won = (g.color === 'white' && g.result === '1-0') || (g.color === 'black' && g.result === '0-1');
    const drew = g.result === '1/2-1/2';
    if (won) e.w += 1; else if (drew) e.d += 1; else e.l += 1;
    if (g.eco) e.ecos[g.eco] = (e.ecos[g.eco] ?? 0) + 1;
    if (e.sampleUrls.length < 5 && g.url) e.sampleUrls.push(g.url);
  }
  const rows = [...byKey.values()].map((e) => ({ ...e, score: Math.round((e.w + e.d / 2) / e.games * 100), topEco: Object.entries(e.ecos).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }));
  return {
    white: rows.filter((r) => r.color === 'white').sort((a, b) => b.games - a.games),
    black: rows.filter((r) => r.color === 'black').sort((a, b) => b.games - a.games),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const only = (process.env.PLAYERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const ids = only.length ? only : Object.keys(PROFILES);
  for (const playerId of ids) {
    const p = PROFILES[playerId];
    if (!p) { process.stderr.write(`skip unknown ${playerId}\n`); continue; }
    try {
      process.stderr.write(`\n=== ${playerId} (cc:${p.chesscom} li:${p.lichess ?? '-'}) ===\n`);
      const cc = await harvestChesscom(p.chesscom, playerId);
      process.stderr.write(`  chess.com: ${cc.length} games\n`);
      const li = await harvestLichess(p.lichess, playerId);
      process.stderr.write(`  lichess:   ${li.length} games\n`);
      const all = [...cc, ...li];
      const agg = aggregate(playerId, all);
      // Drop the per-game movetext from the persisted raw to keep files light;
      // eco+opening is enough to re-rank by variation later.
      const lean = all.map(({ line, ...rest }) => rest);
      const payload = { playerId, profile: p, totalGames: all.length, ccGames: cc.length, liGames: li.length, generatedAt: new Date().toISOString(), ranking: agg, games: lean };
      await writeFile(join(OUT_DIR, `${playerId}.json`), JSON.stringify(payload, null, 2));
      process.stderr.write(`  -> wrote ${playerId}.json (${all.length} games)\n`);
      for (const c of ['white', 'black']) {
        process.stderr.write(`  ${c}:\n`);
        agg[c].slice(0, 8).forEach((r) => process.stderr.write(`    ${String(r.games).padStart(5)}g (${r.serious} serious) ${r.score}%  ${r.topEco ?? '?'}  ${r.family}\n`));
      }
    } catch (err) {
      process.stderr.write(`  !! ${playerId} failed: ${err?.message ?? err}\n`);
    }
  }
  process.stderr.write('\nDONE\n');
}

main();
