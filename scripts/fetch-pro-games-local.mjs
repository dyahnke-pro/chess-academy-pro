#!/usr/bin/env node
/**
 * RUN THIS FROM DAVID'S LAPTOP (sandbox can't reach Chess.com / Lichess).
 *
 * Fetches verified games from Chess.com + Lichess public APIs for
 * each named pro in pro-repertoires.json, filtered by the ECO range
 * of the opening line that pro represents.
 *
 * Output: docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json
 * Format: { games: [{ openingId, source, sourceUrl, white, black, ... pgn }] }
 *
 * Then I curate from this (2-3 games per pro opening, validate via
 * chess.js, add Haiku concept-narration per David's spec).
 *
 * Run: node scripts/fetch-pro-games-local.mjs
 * Time: ~10-15 min (rate-limited per provider)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const PRO_FILE = 'src/data/pro-repertoires.json';
const OUT_DIR = 'docs/audit-runs/2026-05-19-pro-games-gen';
const OUT_PATH = join(OUT_DIR, 'raw-fetched.json');

// Chess.com usernames + Lichess handles for each named pro. Verified
// via their public profiles.
const PRO_PROFILES = {
  carlsen:        { chesscom: 'MagnusCarlsen', lichess: ['DrNykterstein', 'DrDrunkenstein'] },
  hikaru:         { chesscom: 'Hikaru', lichess: ['penguingm1'] },
  caruana:        { chesscom: 'FabianoCaruana', lichess: ['Lachesis-'] },
  firouzja:       { chesscom: 'Firouzja2003', lichess: ['alireza2003'] },
  naroditsky:     { chesscom: 'DanielNaroditsky', lichess: ['Daniel_Naroditsky'] },
  gothamchess:    { chesscom: 'GothamChess', lichess: ['levyrozman'] },
  praggnanandhaa: { chesscom: 'Rpragchess', lichess: ['rpragchess'] },
  niemann:        { chesscom: 'Hansontwitch', lichess: [] },
  dubov:          { chesscom: 'Duhless', lichess: ['Daniil_Dubov'] },
  annacramling:   { chesscom: 'AnnaCramling', lichess: ['AnnaCramling'] },
};

const PER_PRO_GAME_CAP = 200; // pull up to 200 games per pro across sources
const REQUEST_DELAY_MS = 300; // avoid hammering APIs

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchChesscomArchives(username) {
  // GET /pub/player/<username>/games/archives → list of monthly URLs
  const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
  if (!archivesRes.ok) return [];
  const { archives } = await archivesRes.json();
  // Pull the most recent 24 months
  const recent = archives.slice(-24);
  const games = [];
  for (const url of recent) {
    if (games.length >= PER_PRO_GAME_CAP) break;
    await sleep(REQUEST_DELAY_MS);
    const r = await fetch(url);
    if (!r.ok) continue;
    const { games: monthGames = [] } = await r.json();
    for (const g of monthGames) {
      if (!g.pgn) continue;
      games.push({
        source: 'chess.com',
        sourceUrl: g.url,
        white: g.white.username,
        black: g.black.username,
        whiteRating: g.white.rating,
        blackRating: g.black.rating,
        result: g.white.result === 'win' ? '1-0' : (g.black.result === 'win' ? '0-1' : '1/2-1/2'),
        timeControl: g.time_class,
        date: new Date(g.end_time * 1000).toISOString().slice(0, 10),
        eco: g.eco,
        pgn: g.pgn,
      });
      if (games.length >= PER_PRO_GAME_CAP) break;
    }
  }
  return games;
}

async function fetchLichessGames(username) {
  // GET /api/games/user/<username>?max=200&pgnInJson=false&clocks=false&perfType=blitz,rapid,classical
  // Lichess returns NDJSON for the JSON endpoint, or raw PGN for the PGN endpoint
  const url = `https://lichess.org/api/games/user/${username}?max=${PER_PRO_GAME_CAP}&perfType=blitz,rapid,classical&opening=true&clocks=false&evals=false&analysed=false&literate=false`;
  const r = await fetch(url, { headers: { Accept: 'application/x-ndjson' } });
  if (!r.ok) return [];
  const text = await r.text();
  const games = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let j;
    try { j = JSON.parse(line); } catch { continue; }
    if (!j.pgn) continue;
    games.push({
      source: 'lichess',
      sourceUrl: `https://lichess.org/${j.id}`,
      white: j.players?.white?.user?.name || j.players?.white?.name || 'unknown',
      black: j.players?.black?.user?.name || j.players?.black?.name || 'unknown',
      whiteRating: j.players?.white?.rating ?? null,
      blackRating: j.players?.black?.rating ?? null,
      result: j.winner === 'white' ? '1-0' : (j.winner === 'black' ? '0-1' : '1/2-1/2'),
      timeControl: j.perf,
      date: new Date(j.createdAt).toISOString().slice(0, 10),
      eco: j.opening?.eco,
      openingName: j.opening?.name,
      pgn: j.pgn,
    });
  }
  return games;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const doc = JSON.parse(await readFile(PRO_FILE, 'utf-8'));
  const openings = doc.openings ?? [];

  // Unique pros
  const proSlugs = new Set();
  for (const o of openings) {
    const m = o.id.match(/^pro-([a-z]+)-/);
    if (m) proSlugs.add(m[1]);
  }

  const allGames = {};
  for (const slug of proSlugs) {
    const profile = PRO_PROFILES[slug];
    if (!profile) { console.warn(`[fetch] no profile mapping for ${slug}`); continue; }
    console.log(`[fetch] ${slug} — chess.com=${profile.chesscom} lichess=${profile.lichess.join(',')}`);
    allGames[slug] = [];
    if (profile.chesscom) {
      try {
        const cg = await fetchChesscomArchives(profile.chesscom);
        allGames[slug].push(...cg);
        console.log(`         chess.com: ${cg.length} games`);
      } catch (e) { console.warn(`         chess.com error: ${e.message}`); }
    }
    for (const lh of profile.lichess) {
      try {
        const lg = await fetchLichessGames(lh);
        allGames[slug].push(...lg);
        console.log(`         lichess[${lh}]: ${lg.length} games`);
      } catch (e) { console.warn(`         lichess[${lh}] error: ${e.message}`); }
      await sleep(REQUEST_DELAY_MS * 2);
    }
    // Snapshot
    await writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), pros: allGames }, null, 2));
  }
  const total = Object.values(allGames).reduce((s, a) => s + a.length, 0);
  console.log(`\n[fetch] DONE — ${total} total games across ${Object.keys(allGames).length} pros`);
  console.log(`[fetch] output: ${OUT_PATH}`);
  console.log(`[fetch] now commit + push so the sandbox session can curate from this file.`);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
