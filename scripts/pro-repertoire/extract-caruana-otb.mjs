#!/usr/bin/env node
// extract-caruana-otb.mjs — turn the pgnmentor Caruana.pgn OTB collection
// (6,007 real classical games, 2002-2026) into the jsonl shape that
// build-game-references.mjs Source 3 ingests (data/sources/caruana-otb/*.jsonl).
//
// David 2026-06-01: "I want this build on par with Gotham and Naroditsky. Find
// more data from other databases." Caruana is an OTB classical player — his
// chess.com blitz corpus fanned out by move 8, so the original build had only
// 7 variations / 0 game references. This pulls his REAL tournament games.
//
// Source PGN: data/sources/caruana-pgnmentor/Caruana.pgn (gitignored).
// Classification: each game is matched to one of Caruana's 8 pro openings by
// the identifying move prefix on the side Caruana plays; variation is tagged
// from the game's ECO code (real, data-grounded — pgnmentor carries [ECO]).
//
// Usage: node scripts/pro-repertoire/extract-caruana-otb.mjs

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'data', 'sources', 'caruana-pgnmentor', 'Caruana.pgn');
const OUT_DIR = path.join(ROOT, 'data', 'sources', 'caruana-otb');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Identifying prefix per opening (SAN), on Caruana's side. Longest match wins.
// Kept deliberately short — the IDENTIFYING line, not the deep spine — so it
// captures every game in that opening regardless of how the game continued.
const OPENINGS = [
  { id: 'ruy-lopez',    color: 'white', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { id: 'italian',      color: 'white', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { id: 'najdorf',      color: 'black', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  { id: 'taimanov',     color: 'black', prefix: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6'] },
  { id: 'nimzo-indian', color: 'black', prefix: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { id: 'french',       color: 'black', prefix: ['e4', 'e6', 'd4', 'd5'] },
  { id: 'caro-kann',    color: 'black', prefix: ['e4', 'c6'] },
  { id: 'kid',          color: 'black', prefix: ['d4', 'Nf6', 'c4', 'g6'] },
];
OPENINGS.sort((a, b) => b.prefix.length - a.prefix.length);

// ECO → human variation label (per opening family). Falls back to the bare ECO.
function ecoLabel(openingId, eco) {
  if (!eco) return { variation: 'main', label: 'Main line' };
  return { variation: eco.toLowerCase(), label: eco };
}

function splitGames(txt) {
  return txt.split(/\n\n(?=\[Event )/).map((s) => s.trim()).filter(Boolean);
}
function header(raw, key) {
  const m = raw.match(new RegExp(`\\[${key} "([^"]*)"\\]`));
  return m ? m[1] : null;
}
const isCaruana = (h) => !!h && h.toLowerCase().includes('caruana');

const raw = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
const games = splitGames(raw);
console.error(`[extract] ${games.length} games in source`);

// Bound the breadth layer: keep the strongest-opponent games, diverse across
// ECO-variations, so it mirrors Naroditsky's ~50/opening (not 448 of one line)
// and the bundle stays reasonable (lazy-load kicks in later per the doctrine).
const MAX_PER_ECO = 6;
const MAX_PER_OPENING = 60;
const studentLost = (result, side) =>
  (side === 'white' && result === '0-1') || (side === 'black' && result === '1-0');

const cand = {}; // openingId -> array of candidate game objects
let matched = 0, classified = 0, tooShort = 0, losses = 0;

for (const g of games) {
  const white = header(g, 'White');
  const black = header(g, 'Black');
  const cWhite = isCaruana(white), cBlack = isCaruana(black);
  if (!cWhite && !cBlack) continue;
  matched++;
  const studentSide = cWhite ? 'white' : 'black';

  let chess = new Chess();
  let sans;
  try { chess.loadPgn(g, { sloppy: true }); sans = chess.history(); }
  catch { continue; }
  if (sans.length < 12) { tooShort++; continue; }

  const cls = OPENINGS.find((o) => o.color === studentSide && o.prefix.every((mv, i) => sans[i] === mv));
  if (!cls) continue;
  classified++;

  const result = header(g, 'Result') || '*';
  if (studentLost(result, studentSide)) { losses++; continue; } // wins + draws only

  const eco = header(g, 'ECO');
  const { variation, label } = ecoLabel(cls.id, eco);
  const dateRaw = header(g, 'Date');
  const date = dateRaw ? dateRaw.slice(0, 7).replace(/\./g, '-') : null;
  const oppRating = Number(header(g, studentSide === 'white' ? 'BlackElo' : 'WhiteElo')) || null;
  const isWin = !studentLost(result, studentSide) && result !== '1/2-1/2';

  (cand[cls.id] = cand[cls.id] || []).push({
    eco: eco || 'zzz', oppRating: oppRating || 0, isWin, plies: sans.length,
    obj: {
      white, black, studentSide,
      result,
      opponent: studentSide === 'white' ? black : white,
      opponentRating: oppRating,
      date,
      openingId: cls.id,
      proOpeningId: `pro-caruana-${cls.id}`,
      variation,
      variationLabel: label,
      eco,
      url: header(g, 'Site'),
      // append the result token so build-game-references' cleanPgn recovers it
      pgn: sans.join(' ') + ' ' + result,
    },
  });
}

let written = 0;
for (const [id, list] of Object.entries(cand)) {
  // rank: wins before draws, then stronger opponent, then deeper game
  list.sort((a, b) => (b.isWin - a.isWin) || (b.oppRating - a.oppRating) || (b.plies - a.plies));
  const perEco = {};
  const picked = [];
  for (const c of list) {
    if (picked.length >= MAX_PER_OPENING) break;
    perEco[c.eco] = (perEco[c.eco] || 0);
    if (perEco[c.eco] >= MAX_PER_ECO) continue;
    perEco[c.eco]++;
    picked.push(c.obj);
  }
  fs.writeFileSync(path.join(OUT_DIR, `${id}.jsonl`), picked.map((o) => JSON.stringify(o)).join('\n') + '\n');
  written += picked.length;
  console.error(`  ${id.padEnd(14)} ${picked.length} kept (of ${list.length} wins+draws)`);
}
console.error(`[extract] matched ${matched}, classified ${classified}, dropped ${losses} losses, wrote ${written} (tooShort ${tooShort}) -> ${path.relative(ROOT, OUT_DIR)}`);
