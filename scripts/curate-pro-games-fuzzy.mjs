#!/usr/bin/env node
/**
 * Second-pass curator using FEN-based transposition matching for
 * pro openings the first-pass curator couldn't match by first-N-plies.
 *
 * For each unmatched opening:
 *   1. Compute the "signature FEN" — position after the canonical
 *      PGN's first 6-8 plies
 *   2. For each of the pro's 200 games, replay through 20 plies and
 *      collect every reached FEN
 *   3. If any of the game's FENs (core fields only — ignore move
 *      counters) matches the opening's signature, the game DID
 *      reach this line via transposition
 *   4. Pick top 2 by the same ranking as v1, validate, add as
 *      model-games entry
 *
 * Output: appends fuzzy matches to src/data/model-games.json.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const RAW_PATH = 'docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json';
const PRO_PATH = 'src/data/pro-repertoires.json';
const MODEL_PATH = 'src/data/model-games.json';

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

function pgnToSans(pgn) {
  if (!pgn) return [];
  const lines = pgn.split('\n');
  const moveLines = lines.filter(l => !l.trim().startsWith('['));
  const moveText = moveLines.join(' ');
  return moveText
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\.+/g, ' ')
    .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/).filter(Boolean);
}

function fenCore(fen) {
  if (!fen) return null;
  return fen.split(' ').slice(0, 4).join(' '); // pieces + side + castle + en passant
}

function reachedFensInGame(sans, maxPlies = 20) {
  const chess = new Chess();
  const fens = new Set();
  fens.add(fenCore(chess.fen()));
  for (let i = 0; i < Math.min(sans.length, maxPlies); i++) {
    try { chess.move(sans[i]); fens.add(fenCore(chess.fen())); }
    catch { return fens; }
  }
  return fens;
}

function signatureFensForOpening(openingSans) {
  const chess = new Chess();
  const fens = [];
  for (let i = 0; i < Math.min(openingSans.length, 12); i++) {
    try { chess.move(openingSans[i]); }
    catch { return fens; }
    // Take FENs at depth 4, 6, 8, 10 plies as "signature positions"
    if (i + 1 === 4 || i + 1 === 6 || i + 1 === 8 || i + 1 === 10) {
      fens.push({ ply: i + 1, fen: fenCore(chess.fen()) });
    }
  }
  return fens;
}

function detectProSlug(openingId) {
  const m = openingId.match(/^pro-([a-z]+)-/);
  return m ? m[1] : null;
}

function isThePro(userName, profile) {
  const u = (userName || '').toLowerCase();
  return u === profile.chesscomUser.toLowerCase() || profile.lichessUsers.some((lu) => u === lu.toLowerCase());
}

function validateSans(sans) {
  const c = new Chess();
  for (const s of sans) { try { c.move(s); } catch { return { ok: false }; } }
  return { ok: true, total: sans.length };
}

function rankGame(g, profile) {
  let score = 0;
  if (g.result === '1-0' || g.result === '0-1') score += 100;
  const proIsWhite = isThePro(g.white, profile);
  const oppRating = proIsWhite ? (g.blackRating || 0) : (g.whiteRating || 0);
  if (oppRating > 2700) score += 50;
  else if (oppRating > 2500) score += 30;
  else if (oppRating > 2300) score += 15;
  const sansLen = g._sans?.length ?? 0;
  score += Math.min(sansLen, 60) / 60 * 30;
  const year = parseInt((g.date || '').slice(0, 4), 10) || 0;
  if (year >= 2022) score += 10;
  else if (year >= 2019) score += 5;
  return score;
}

async function main() {
  const raw = JSON.parse(await readFile(RAW_PATH, 'utf-8'));
  const pro = JSON.parse(await readFile(PRO_PATH, 'utf-8'));
  const existing = JSON.parse(await readFile(MODEL_PATH, 'utf-8'));
  const openings = pro.openings ?? [];

  // Pre-process raw games + compute FEN reach per game
  const proGames = {};
  for (const [slug, games] of Object.entries(raw.pros)) {
    proGames[slug] = [];
    for (const g of games) {
      const sans = pgnToSans(g.pgn);
      if (sans.length < 8) continue;
      const v = validateSans(sans);
      if (!v.ok) continue;
      proGames[slug].push({ ...g, _sans: sans, _reachedFens: reachedFensInGame(sans, 20) });
    }
  }
  console.log('processed game counts:');
  for (const [s, g] of Object.entries(proGames)) console.log(`  ${s}: ${g.length}`);

  // Set of already-covered openingIds
  const covered = new Set(existing.filter(e => e.openingId.startsWith('pro-')).map(e => e.openingId));
  const unmatched = openings.filter(o => !covered.has(o.id));
  console.log(`\nopenings still needing matches: ${unmatched.length}`);

  const newEntries = [];
  const stillNoMatch = [];

  for (const opening of unmatched) {
    const slug = detectProSlug(opening.id);
    const profile = PRO_PROFILES[slug];
    if (!profile) {
      stillNoMatch.push({ id: opening.id, name: opening.name, reason: `no fetch profile for slug='${slug}'` });
      continue;
    }
    const games = proGames[slug] || [];
    if (games.length === 0) {
      stillNoMatch.push({ id: opening.id, name: opening.name, reason: `no games fetched for ${slug}` });
      continue;
    }
    const openingSans = pgnToSans(opening.pgn);
    const sigFens = signatureFensForOpening(openingSans);
    if (sigFens.length === 0) {
      stillNoMatch.push({ id: opening.id, name: opening.name, reason: 'opening PGN unparseable' });
      continue;
    }
    // Find games that reached any signature position
    const candidates = [];
    for (const g of games) {
      for (const sig of sigFens) {
        if (g._reachedFens.has(sig.fen)) { candidates.push({ ...g, _matchedAtPly: sig.ply }); break; }
      }
    }
    if (candidates.length === 0) {
      stillNoMatch.push({ id: opening.id, name: opening.name, reason: `0 of ${games.length} games transposed into this line` });
      continue;
    }
    candidates.sort((a, b) => rankGame(b, profile) - rankGame(a, profile));
    const picks = candidates.slice(0, 2);
    console.log(`  ✓ ${opening.id} (${slug}) — ${candidates.length} fuzzy matches, picked ${picks.length}`);

    for (let i = 0; i < picks.length; i++) {
      const g = picks[i];
      const sansClean = g._sans.join(' ');
      const proIsWhite = isThePro(g.white, profile);
      const event = (g.source === 'chess.com' ? 'Chess.com' : 'Lichess') + ' ' + (g.timeControl || 'Online') + ' Game';
      const year = parseInt((g.date || '').slice(0, 4), 10) || new Date().getFullYear();
      newEntries.push({
        id: `mg-${opening.id}-${i}-fuzzy`,
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
        transposedAtPly: g._matchedAtPly,
        overview: `${profile.display} as ${proIsWhite ? 'White' : 'Black'} vs ${proIsWhite ? g.black : g.white} (${proIsWhite ? g.blackRating ?? '?' : g.whiteRating ?? '?'}) — transposed into ${opening.name} via move order, ${g.timeControl ?? 'online'} ${year}.`,
        criticalMoments: [],
        middlegameTheme: opening.name,
        lessonSummary: `${profile.display} reaches the ${opening.name} position by transposition. Watch the full game from move 1.`,
      });
    }
  }

  console.log('');
  console.log(`new fuzzy matches found: ${newEntries.length}`);
  console.log(`still no match: ${stillNoMatch.length}`);
  console.log(`---STILL NO MATCH (action: remove from pro-repertoires OR fetch more games):`);
  for (const e of stillNoMatch) console.log(`  ${e.id} | ${e.name} | ${e.reason}`);

  // Write outputs
  const merged = [...existing, ...newEntries];
  await writeFile(MODEL_PATH, JSON.stringify(merged, null, 2) + '\n');
  await writeFile('docs/audit-runs/2026-05-19-pro-games-gen/unmatched-after-fuzzy.json', JSON.stringify({ generatedAt: new Date().toISOString(), unmatched: stillNoMatch }, null, 2));
  console.log(`\nwrote ${merged.length} total entries to ${MODEL_PATH}`);
  console.log(`wrote unmatched list to docs/audit-runs/2026-05-19-pro-games-gen/unmatched-after-fuzzy.json`);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
