#!/usr/bin/env node
// fetch-otb-games.mjs — pull REAL over-the-board tournament games for a
// pro and write them in the shape build-game-references.mjs ingests
// (source:"otb"). The OTB half of the "both sources" decision (David
// 2026-06-01): classical players (Carlsen, Caruana, Gukesh, Pragg,
// Firouzja, …) get their real tournament games; streamers stay on the
// refreshed chess.com corpus.
//
// Sources (reachable from the sandbox — both return PGN text):
//   --broadcast <lichessRoundId>   GET lichess.org/api/broadcast/round/<id>.pgn
//   --pgn-url <url>                 any PGN file (e.g. a TWIC export)
// Both flags repeatable. Games are filtered to the player (--name header
// match), classified to one of the player's pro openings by move prefix,
// and tagged with studentSide. Losing games for the student side are kept
// here (raw) — build-game-references.mjs drops them at reference time.
//
// Usage:
//   node scripts/pro-repertoire/fetch-otb-games.mjs <appPlayerId> \
//     --name "Magnus Carlsen" --broadcast <roundId> [--broadcast <roundId> ...] \
//     [--pgn-url <url>] [--since YYYY-MM]

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const APP_PLAYER = process.argv[2];
if (!APP_PLAYER || APP_PLAYER.startsWith('--')) {
  console.error('usage: fetch-otb-games.mjs <appPlayerId> --name "<player>" (--broadcast <id> | --pgn-url <url>)... [--since YYYY-MM]');
  process.exit(1);
}

function multiArg(flag) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === flag && process.argv[i + 1]) out.push(process.argv[i + 1]);
  }
  return out;
}
function oneArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const NAME = oneArg('--name');
if (!NAME) { console.error('--name "<player display name>" is required (matches PGN White/Black headers)'); process.exit(1); }
const SINCE = oneArg('--since'); // YYYY-MM
const broadcasts = multiArg('--broadcast');
const pgnUrls = multiArg('--pgn-url');
if (broadcasts.length === 0 && pgnUrls.length === 0) {
  console.error('provide at least one --broadcast <roundId> or --pgn-url <url>');
  process.exit(1);
}

const ROOT = process.cwd();
const USERNAME = { naroditsky: 'danielnaroditsky', gothamchess: 'gothamchess', hikaru: 'hikaru', ericrosen: 'imrosen' };
const username = USERNAME[APP_PLAYER] || APP_PLAYER;
const OUT_DIR = path.join(ROOT, 'data', 'sources', `${username}-otb`);
fs.mkdirSync(OUT_DIR, { recursive: true });
const UA = 'chess-academy-pro pro-repertoire builder (dyahnke@gmail.com)';

// ─── Build opening-prefix map from this player's pro openings ────────────────
const proRep = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'pro-repertoires.json'), 'utf8'));
const proOpenings = proRep.openings.filter((o) => o.playerId === APP_PLAYER);
if (proOpenings.length === 0) { console.error(`no pro openings for "${APP_PLAYER}"`); process.exit(1); }

function sansFromPgnMoves(pgnSpine) {
  const c = new Chess();
  for (const san of pgnSpine.trim().split(/\s+/).filter(Boolean)) {
    try { c.move(san); } catch { break; }
  }
  return c.history();
}
// Each pro opening contributes its spine prefix + each variation prefix.
// Longest matching prefix wins so a sub-variation beats the base.
const PREFIXES = [];
for (const o of proOpenings) {
  const baseId = o.id.replace(new RegExp(`^pro-${APP_PLAYER}-`), '');
  const spine = sansFromPgnMoves(o.pgn);
  if (spine.length >= 2) PREFIXES.push({ openingId: baseId, proOpeningId: o.id, color: o.color, prefix: spine.slice(0, 8), label: 'Main line', variation: 'main' });
  for (const v of o.variations || []) {
    const vs = sansFromPgnMoves(v.pgn);
    if (vs.length >= 3) PREFIXES.push({ openingId: baseId, proOpeningId: o.id, color: o.color, prefix: vs.slice(0, 10), label: v.name, variation: v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
  }
}
PREFIXES.sort((a, b) => b.prefix.length - a.prefix.length);

function classify(sans) {
  for (const p of PREFIXES) {
    if (p.prefix.every((mv, i) => sans[i] === mv)) return p;
  }
  return null;
}

// ─── PGN splitting + header parsing ──────────────────────────────────────────
function splitGames(pgnText) {
  // Each game starts with a [Event ...] tag block.
  return pgnText.split(/\n\n(?=\[Event )/).map((s) => s.trim()).filter(Boolean);
}
function header(raw, key) {
  const m = raw.match(new RegExp(`\\[${key} "([^"]*)"\\]`));
  return m ? m[1] : null;
}
function nameMatches(h) {
  if (!h) return false;
  const a = h.toLowerCase();
  const b = NAME.toLowerCase();
  // "Naroditsky, Daniel" or "Daniel Naroditsky" — match on the surname token.
  const surname = b.split(/[ ,]+/).sort((x, y) => y.length - x.length)[0];
  return a.includes(b) || (surname && a.includes(surname));
}

async function fetchPgn(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/x-chess-pgn, text/plain' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  const sources = [
    ...broadcasts.map((id) => ({ label: `broadcast-${id}`, url: `https://lichess.org/api/broadcast/round/${id}.pgn` })),
    ...pgnUrls.map((url, i) => ({ label: `pgnurl-${i}`, url })),
  ];
  let matched = 0, classified = 0, written = 0;
  for (const src of sources) {
    let text;
    try { text = await fetchPgn(src.url); }
    catch (e) { console.error(`  [skip] ${src.label}: ${e.message}`); continue; }
    const lines = [];
    for (const raw of splitGames(text)) {
      const white = header(raw, 'White');
      const black = header(raw, 'Black');
      const playerIsWhite = nameMatches(white);
      const playerIsBlack = nameMatches(black);
      if (!playerIsWhite && !playerIsBlack) continue;
      matched++;
      const date = header(raw, 'Date') || header(raw, 'UTCDate');
      const ym = date ? date.slice(0, 7).replace(/\./g, '-') : null;
      if (SINCE && ym && ym < SINCE) continue;

      let chess = new Chess();
      let sans;
      try { chess.loadPgn(raw, { sloppy: true }); sans = chess.history(); }
      catch { continue; }
      if (sans.length < 12) continue;
      const cls = classify(sans);
      if (!cls) continue; // not one of this player's repertoire openings
      classified++;
      const studentSide = playerIsWhite ? 'white' : 'black';
      if (studentSide !== cls.color) continue; // opening is for the other colour
      const result = header(raw, 'Result') || '*';
      const opponent = playerIsWhite ? black : white;
      const opponentRating = Number(header(raw, playerIsWhite ? 'BlackElo' : 'WhiteElo')) || null;
      lines.push(JSON.stringify({
        white, black, studentSide, result,
        opponent, opponentRating,
        date: ym,
        openingId: cls.openingId,
        proOpeningId: cls.proOpeningId,
        variation: cls.variation,
        variationLabel: cls.label,
        eco: header(raw, 'ECO'),
        url: header(raw, 'Site'),
        pgn: sans.join(' '),
      }));
    }
    if (lines.length > 0) {
      fs.writeFileSync(path.join(OUT_DIR, `${src.label}.jsonl`), lines.join('\n') + '\n');
      written += lines.length;
      console.log(`  [${src.label}] wrote ${lines.length} ${APP_PLAYER} games`);
    } else {
      console.log(`  [${src.label}] 0 matching/classified games`);
    }
  }
  console.log(`[otb] ${APP_PLAYER}: matched ${matched} by name, ${classified} classified, ${written} written -> ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
