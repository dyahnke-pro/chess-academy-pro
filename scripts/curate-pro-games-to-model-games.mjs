#!/usr/bin/env node
/**
 * Curates raw-fetched.json (2000 verified pro games) into the
 * model-games.json registry the coach + ModelGamesSection consume.
 *
 * For each pro opening in pro-repertoires.json:
 *   1. Identify the pro slug (carlsen/hikaru/...) from the opening id
 *   2. Take the opening's PGN prefix (first ~6 plies) as the line signature
 *   3. Filter the pro's 200 fetched games to those whose first ~6 plies
 *      match the line signature (via chess.js replay)
 *   4. Rank candidates by:
 *      - decisive result preferred (1-0 / 0-1 over 1/2-1/2)
 *      - strong opponent (rating > 2400 preferred)
 *      - longer games preferred (proxy for "full game to mate/resignation")
 *      - more recent preferred
 *   5. Pick top 2 per opening, validate FULL pgn through chess.js
 *   6. Build ModelGame entry with FACTUAL fallback prose (no LLM spend)
 *
 * Writes results to src/data/model-games.json (additive — preserves
 * the existing 20 entries already in the file).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const RAW_PATH = 'docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json';
const PRO_PATH = 'src/data/pro-repertoires.json';
const MODEL_PATH = 'src/data/model-games.json';

/** Strip chess.com PGN headers, return just the SAN move sequence. */
function pgnToSans(pgn) {
  if (!pgn) return [];
  // chess.com PGN has full headers; lichess returns plain or annotated SAN
  // Strip header lines (lines starting with [)
  const lines = pgn.split('\n');
  const moveLines = lines.filter(l => !l.trim().startsWith('['));
  const moveText = moveLines.join(' ');
  // Strip comments {...}, NAG codes (e.g. $1), move numbers (1., 1...), and result tokens
  let cleaned = moveText
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\.+/g, ' ')
    .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.split(/\s+/).filter(Boolean);
}

/** Replay sans via chess.js, return list of legal sans played + error if any. */
function validatePgnSans(sans) {
  const chess = new Chess();
  const valid = [];
  for (let i = 0; i < sans.length; i++) {
    try { chess.move(sans[i]); valid.push(sans[i]); }
    catch (e) { return { ok: false, validCount: valid.length, errorIndex: i, errorMove: sans[i], errorMsg: e.message }; }
  }
  return { ok: true, validCount: valid.length, finalFen: chess.fen(), isOver: chess.isGameOver(), result: chess.isCheckmate() ? (chess.turn() === 'b' ? '1-0' : '0-1') : (chess.isDraw() ? '1/2-1/2' : null) };
}

/** Check if game's first N plies match opening's first N plies. */
function gameMatchesOpening(gameSans, openingSans, requiredPlies = 6) {
  if (gameSans.length < requiredPlies || openingSans.length < requiredPlies) return false;
  for (let i = 0; i < requiredPlies; i++) {
    if (gameSans[i] !== openingSans[i]) return false;
  }
  return true;
}

function rankGame(g, sans, validation) {
  let score = 0;
  if (g.result === '1-0' || g.result === '0-1') score += 100; // decisive
  // Average opponent rating (the non-pro side)
  const proIsWhite = (g.white || '').toLowerCase().includes((g._proSlug || '').toLowerCase()) || g.white === g._proName;
  const oppRating = proIsWhite ? (g.blackRating || g.blackElo || 0) : (g.whiteRating || g.whiteElo || 0);
  if (oppRating > 2700) score += 50;
  else if (oppRating > 2500) score += 30;
  else if (oppRating > 2300) score += 15;
  score += Math.min(sans.length, 60) / 60 * 30; // longer = better (cap at 60 plies)
  // More recent (year ≥ 2020 = bonus)
  const year = parseInt((g.date || '').slice(0, 4), 10) || 0;
  if (year >= 2022) score += 10;
  else if (year >= 2019) score += 5;
  return score;
}

const PRO_PROFILES = {
  carlsen:        { display: 'Magnus Carlsen', chesscomUser: 'magnuscarlsen', lichessUsers: ['drnykterstein', 'drdrunkenstein'] },
  hikaru:         { display: 'Hikaru Nakamura', chesscomUser: 'hikaru', lichessUsers: ['penguingm1'] },
  caruana:        { display: 'Fabiano Caruana', chesscomUser: 'fabianocaruana', lichessUsers: ['lachesis-'] },
  firouzja:       { display: 'Alireza Firouzja', chesscomUser: 'firouzja2003', lichessUsers: ['alireza2003'] },
  naroditsky:     { display: 'Daniel Naroditsky', chesscomUser: 'danielnaroditsky', lichessUsers: ['daniel_naroditsky'] },
  gothamchess:    { display: 'Levy Rozman (GothamChess)', chesscomUser: 'gothamchess', lichessUsers: ['levyrozman'] },
  praggnanandhaa: { display: 'Rameshbabu Praggnanandhaa', chesscomUser: 'rpragchess', lichessUsers: ['rpragchess'] },
  niemann:        { display: 'Hans Niemann', chesscomUser: 'hansontwitch', lichessUsers: [] },
  dubov:          { display: 'Daniil Dubov', chesscomUser: 'duhless', lichessUsers: ['daniil_dubov'] },
  annacramling:   { display: 'Anna Cramling', chesscomUser: 'annacramling', lichessUsers: ['annacramling'] },
};

function detectProSlug(openingId) {
  const m = openingId.match(/^pro-([a-z]+)-/);
  return m ? m[1] : null;
}

function isThePro(userName, profile) {
  const u = (userName || '').toLowerCase();
  return u === profile.chesscomUser.toLowerCase() || profile.lichessUsers.some((lu) => u === lu.toLowerCase());
}

async function main() {
  const raw = JSON.parse(await readFile(RAW_PATH, 'utf-8'));
  const pro = JSON.parse(await readFile(PRO_PATH, 'utf-8'));
  const existing = JSON.parse(await readFile(MODEL_PATH, 'utf-8'));
  const openings = pro.openings ?? [];

  console.log(`pro openings: ${openings.length}`);
  console.log(`raw games available across pros:`);
  for (const [slug, games] of Object.entries(raw.pros)) console.log(`  ${slug}: ${games.length}`);

  // Pre-process raw games: parse sans + cache per pro
  const proGames = {};
  for (const [slug, games] of Object.entries(raw.pros)) {
    proGames[slug] = [];
    for (const g of games) {
      const sans = pgnToSans(g.pgn);
      if (sans.length < 8) continue; // too short to be useful
      const v = validatePgnSans(sans);
      if (!v.ok) continue; // skip illegal PGNs
      proGames[slug].push({ ...g, _sans: sans, _validation: v, _proSlug: slug, _proName: PRO_PROFILES[slug]?.display });
    }
    console.log(`  ${slug}: ${proGames[slug].length} games passed chess.js validation`);
  }

  const newEntries = [];
  let openingsWithGames = 0;
  let openingsNoMatch = 0;

  for (const opening of openings) {
    const slug = detectProSlug(opening.id);
    if (!slug) continue;
    const profile = PRO_PROFILES[slug];
    if (!profile) continue;
    const games = proGames[slug] || [];
    const openingSans = pgnToSans(opening.pgn);
    if (openingSans.length === 0) continue;

    // Try progressively shorter prefix matches: 8 plies, 6, 4
    let candidates = [];
    for (const plyDepth of [8, 6, 4]) {
      if (openingSans.length < plyDepth) continue;
      candidates = games.filter(g => gameMatchesOpening(g._sans, openingSans, plyDepth));
      if (candidates.length >= 2) break;
    }

    if (candidates.length === 0) {
      console.log(`  ✗ ${opening.id} (${slug}) — no matching games in pro's 200`);
      openingsNoMatch++;
      continue;
    }

    // Rank + pick top 2
    candidates.sort((a, b) => rankGame(b, b._sans, b._validation) - rankGame(a, a._sans, a._validation));
    const picks = candidates.slice(0, 2);
    openingsWithGames++;
    console.log(`  ✓ ${opening.id} (${slug}) — ${candidates.length} candidates, picked ${picks.length}`);

    for (let i = 0; i < picks.length; i++) {
      const g = picks[i];
      const sansClean = g._sans.join(' '); // re-serialized clean SAN sequence
      const proIsWhite = isThePro(g.white, profile);
      const event = (g.source === 'chess.com' ? 'Chess.com' : 'Lichess') + ' ' + (g.timeControl || 'Online') + ' Game';
      const year = parseInt((g.date || '').slice(0, 4), 10) || new Date().getFullYear();
      const entry = {
        id: `mg-${opening.id}-${i}`,
        openingId: opening.id,
        white: g.white || 'Unknown',
        black: g.black || 'Unknown',
        whiteElo: g.whiteRating || null,
        blackElo: g.blackRating || null,
        result: g.result || '*',
        year,
        event,
        pgn: sansClean,
        sourceUrl: g.sourceUrl,
        // Per David's directive: no LLM narration. Factual fallback only.
        overview: `${profile.display} as ${proIsWhite ? 'White' : 'Black'} vs ${proIsWhite ? g.black : g.white} (${proIsWhite ? g.blackRating ?? '?' : g.whiteRating ?? '?'}) — ${opening.name}, ${g.timeControl ?? 'online'} ${year}.`,
        criticalMoments: [],
        middlegameTheme: opening.name,
        lessonSummary: `Full game by ${profile.display} in the ${opening.name} line. Watch how the pro handles the position end to end.`,
      };
      newEntries.push(entry);
    }
  }

  console.log('');
  console.log(`pros openings with matched games: ${openingsWithGames}`);
  console.log(`pros openings with NO matching games: ${openingsNoMatch}`);
  console.log(`new model-game entries to add: ${newEntries.length}`);

  // Merge: preserve existing 20, append new (replace if id collision)
  const byId = new Map(existing.map(e => [e.id, e]));
  for (const e of newEntries) byId.set(e.id, e);
  const merged = [...byId.values()];

  // Write
  await writeFile(MODEL_PATH, JSON.stringify(merged, null, 2) + '\n');
  console.log(`wrote ${merged.length} total entries to ${MODEL_PATH}`);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
