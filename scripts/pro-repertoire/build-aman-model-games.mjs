#!/usr/bin/env node
// Build correctly-colored model games for Aman (chessbrah) openings.
// Scans the corpus directly: keeps games where chessbrah is on the STUDENT's
// color AND won AND the game reaches the variation prefix, ranked by opponent
// rating + depth. Emits bare-SAN PGN + facts. Overviews authored separately.
//
// Usage: node build-aman-model-games.mjs   (writes /tmp/aman-model-games.json)
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const PLAYER = 'chessbrah';
const DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);

// opening -> { color, variations: { key: {label, prefix} } }  (from deep-build map)
const OPENINGS = {
  'pro-aman-sicilian-kan': { color: 'black', vars: {
    'open-main': ['e4','c5','Nf3','e6','d4','cxd4','Nxd4','a6','Nc3','Qc7','Bd3'],
    'taimanov-nc6': ['e4','c5','Nf3','e6','d4','cxd4','Nxd4','Nc6'],
    'maroczy-c4': ['e4','c5','Nf3','e6','d4','cxd4','Nxd4','a6','c4'],
    'alapin-c3': ['e4','c5','c3'],
  }},
  'pro-aman-nimzo-indian': { color: 'black', vars: {
    'rubinstein-e3': ['d4','Nf6','c4','e6','Nc3','Bb4','e3'],
    'bogo-nf3': ['d4','Nf6','c4','e6','Nf3','Bb4+'],
    'classical-qc2': ['d4','Nf6','c4','e6','Nc3','Bb4','Qc2'],
  }},
  'pro-aman-caro-kann': { color: 'black', vars: {
    'advance-bf5': ['e4','c6','d4','d5','e5','Bf5'],
    'two-knights': ['e4','c6','Nf3'],
    'exchange': ['e4','c6','d4','d5','exd5'],
  }},
  'pro-aman-reti': { color: 'white', vars: {
    'vs-d5-qgd': ['Nf3','d5'],
    'vs-g6-kia': ['Nf3','g6'],
    'double-fianch': ['Nf3','Nf6','g3'],
  }},
  'pro-aman-ruy-lopez': { color: 'white', vars: {
    'morphy-a6': ['e4','e5','Nf3','Nc6','Bb5','a6'],
    'berlin': ['e4','e5','Nf3','Nc6','Bb5','Nf6'],
    'exchange-a6': ['e4','e5','Nf3','Nc6','Bb5','a6','Bxc6'],
  }},
  'pro-aman-open-sicilian': { color: 'white', vars: {
    'najdorf-a6': ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6'],
    'classical-nc6': ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','Nc6'],
    'dragon-g6': ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','g6'],
  }},
  'pro-aman-rossolimo': { color: 'white', vars: {
    'g6-fianch': ['e4','c5','Nf3','Nc6','Bb5','g6'],
    'e6-line': ['e4','c5','Nf3','Nc6','Bb5','e6'],
    'd6-moscow': ['e4','c5','Nf3','d6','Bb5+'],
  }},
  'pro-aman-french-white': { color: 'white', vars: {
    'winawer-bb4': ['e4','e6','d4','d5','Nc3','Bb4'],
    'classical-nf6': ['e4','e6','d4','d5','Nc3','Nf6'],
    'rubinstein-dxe4': ['e4','e6','d4','d5','Nc3','dxe4'],
  }},
  'pro-aman-anti-caro': { color: 'white', vars: {
    'two-knights-bg4': ['e4','c6','Nc3','d5','Nf3','Bg4'],
    'two-knights-dxe4': ['e4','c6','Nc3','d5','Nf3','dxe4'],
    'g6-line': ['e4','c6','Nc3','d5','Nf3','g6'],
  }},
};

// load all games once into memory as {sans, white, black, result, whiteElo, blackElo, url, date, timeClass}
const games = [];
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(DIR, f), 'utf8').split('\n')) {
    if (!line) continue;
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (g.rules && g.rules !== 'chess') continue;
    if (!g.pgn) continue;
    const white = (g.white?.username || '');
    const black = (g.black?.username || '');
    if (white.toLowerCase() !== PLAYER && black.toLowerCase() !== PLAYER) continue;
    let chess; try { chess = new Chess(); chess.loadPgn(g.pgn, { sloppy: true }); } catch { continue; }
    const sans = chess.history();
    if (sans.length < 20) continue;
    games.push({
      sans, white, black,
      result: (g.pgn.match(/\[Result "([^"]+)"\]/) || [])[1] || '',
      whiteElo: +((g.pgn.match(/\[WhiteElo "([^"]+)"\]/) || [])[1] || 0),
      blackElo: +((g.pgn.match(/\[BlackElo "([^"]+)"\]/) || [])[1] || 0),
      url: g.url || '',
      date: (g.end_time ? new Date(g.end_time * 1000).toISOString().slice(0, 10) : ''),
      timeClass: g.time_class || '',
    });
  }
}
process.stderr.write(`loaded ${games.length} chessbrah games\n`);

function matchesPrefix(sans, prefix) {
  if (sans.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (sans[i] !== prefix[i]) return false;
  return true;
}

const result = {};
for (const [openingId, cfg] of Object.entries(OPENINGS)) {
  const studentIsWhite = cfg.color === 'white';
  result[openingId] = {};
  for (const [vk, prefix] of Object.entries(cfg.vars)) {
    const cands = games.filter((g) => {
      const chessbrahWhite = g.white.toLowerCase() === PLAYER;
      if (chessbrahWhite !== studentIsWhite) return false; // student color only
      const won = studentIsWhite ? g.result === '1-0' : g.result === '0-1';
      if (!won) return false;
      if (!matchesPrefix(g.sans, prefix)) return false;
      return true;
    }).map((g) => ({
      ...g,
      oppElo: studentIsWhite ? g.blackElo : g.whiteElo,
      opp: studentIsWhite ? g.black : g.white,
    })).sort((a, b) => (b.oppElo - a.oppElo) || (b.sans.length - a.sans.length));
    // top 3 distinct opponents, opponent >= 2300
    const seen = new Set(); const picks = [];
    for (const c of cands) {
      if (c.oppElo < 2300) continue;
      if (seen.has(c.opp)) continue;
      seen.add(c.opp); picks.push(c);
      if (picks.length >= 3) break;
    }
    result[openingId][vk] = picks.map((p) => ({
      opp: p.opp, oppElo: p.oppElo, result: p.result, date: p.date,
      timeClass: p.timeClass, url: p.url, plies: p.sans.length,
      studentSide: cfg.color, pgn: p.sans.join(' '),
    }));
  }
}
fs.writeFileSync('/tmp/aman-model-games.json', JSON.stringify(result, null, 1));
// summary
for (const [oid, vs] of Object.entries(result)) {
  for (const [vk, arr] of Object.entries(vs)) {
    process.stderr.write(`${oid}/${vk}: ${arr.length} wins  ${arr.map((a) => `${a.opp}(${a.oppElo})`).join(', ')}\n`);
  }
}
