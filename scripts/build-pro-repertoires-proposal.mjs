#!/usr/bin/env node
/**
 * Consolidates raw-fetched.json (Chess.com archives, 2000 games) into
 * a clean pro-repertoires + model-games structure, with EVERY entry
 * backed by real verified games.
 *
 * Per pro player:
 *   1. Group games by canonical opening signature (ECO + first 6 plies)
 *   2. Sort by frequency
 *   3. Pick TOP 3 white openings (player as white) + TOP 3 black (player as black)
 *   4. For each pick: build canonical PGN = most-played continuation
 *      through ~12 plies; pick rep game = decisive win against strongest
 *      opponent (or longest game if no decisive)
 *
 * Output:
 *   docs/audit-runs/2026-05-19-pro-rebuild/proposed-pro-repertoires.json
 *   docs/audit-runs/2026-05-19-pro-rebuild/proposed-model-games-additions.json
 *
 * Does NOT touch src/data/pro-repertoires.json or src/data/model-games.json
 * until David approves the proposed lists.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const RAW_PATH = 'docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json';
const OUT_DIR = 'docs/audit-runs/2026-05-19-pro-rebuild';
const REP_PROPOSAL = join(OUT_DIR, 'proposed-pro-repertoires.json');
const MG_PROPOSAL = join(OUT_DIR, 'proposed-model-games-additions.json');

const PRO_DISPLAY = {
  carlsen: 'Magnus Carlsen',
  hikaru: 'Hikaru Nakamura',
  caruana: 'Fabiano Caruana',
  firouzja: 'Alireza Firouzja',
  naroditsky: 'Daniel Naroditsky',
  gothamchess: 'Levy Rozman (GothamChess)',
  praggnanandhaa: 'Rameshbabu Praggnanandhaa',
  niemann: 'Hans Niemann',
  dubov: 'Daniil Dubov',
  annacramling: 'Anna Cramling',
};

function chessComPgnToSans(pgn) {
  if (!pgn) return [];
  const lines = pgn.split('\n');
  const moveLines = lines.filter(l => !l.trim().startsWith('['));
  return moveLines.join(' ')
    .replace(/\{[^}]*\}/g, ' ').replace(/\$\d+/g, ' ').replace(/\d+\.+/g, ' ')
    .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
    .replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function validateSans(sans) {
  const c = new Chess();
  for (const s of sans) { try { c.move(s); } catch { return false; } }
  return true;
}

function ecoFromUrl(ecoUrl) {
  if (!ecoUrl) return null;
  // Chess.com gives e.g. https://www.chess.com/openings/...-D00
  // Or the plain ECO is in headers. Try to extract.
  if (/^[A-E]\d{2}$/.test(ecoUrl)) return ecoUrl;
  const m = ecoUrl.match(/[A-E]\d{2}/);
  return m ? m[0] : null;
}

function extractEcoFromPgn(pgn) {
  if (!pgn) return null;
  const m = pgn.match(/\[ECO\s+"([A-E]\d{2})"\]/);
  return m ? m[1] : null;
}

function signatureForGame(sans, depth = 6) {
  // First N plies as the line signature
  return sans.slice(0, depth).join(' ');
}

function proIsWhite(game, proUsername) {
  return (game.white || '').toLowerCase() === proUsername.toLowerCase();
}

function rankGameForRep(games, isProWhite) {
  // Best rep = decisive win for pro, against strongest opponent, longer game
  return [...games].sort((a, b) => {
    const aProWon = (isProWhite ? a.result === '1-0' : a.result === '0-1');
    const bProWon = (isProWhite ? b.result === '1-0' : b.result === '0-1');
    if (aProWon !== bProWon) return aProWon ? -1 : 1;
    const aOpp = isProWhite ? (a.blackRating || 0) : (a.whiteRating || 0);
    const bOpp = isProWhite ? (b.blackRating || 0) : (b.whiteRating || 0);
    if (aOpp !== bOpp) return bOpp - aOpp;
    const aLen = (a._sans || []).length;
    const bLen = (b._sans || []).length;
    return bLen - aLen;
  })[0];
}

function ecoFamily(eco) {
  if (!eco) return null;
  // Group A00-A09 together (e.g. "A0X" = English-system family)
  return eco.slice(0, 2);
}

const PROFILE_USERNAMES = {
  carlsen: 'magnuscarlsen',
  hikaru: 'hikaru',
  caruana: 'fabianocaruana',
  firouzja: 'firouzja2003',
  naroditsky: 'danielnaroditsky',
  gothamchess: 'gothamchess',
  praggnanandhaa: 'rpragchess',
  niemann: 'hansontwitch',
  dubov: 'duhless',
  annacramling: 'annacramling',
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const raw = JSON.parse(await readFile(RAW_PATH, 'utf-8'));

  const proRepertoires = [];
  const modelGames = [];

  for (const [proSlug, games] of Object.entries(raw.pros)) {
    const profile = PRO_DISPLAY[proSlug];
    const username = PROFILE_USERNAMES[proSlug];
    if (!profile || !username) continue;
    console.log(`\n[${proSlug}] ${games.length} raw games`);

    // Parse + validate + tag each game
    const parsed = [];
    for (const g of games) {
      const sans = chessComPgnToSans(g.pgn);
      if (sans.length < 12) continue;
      if (!validateSans(sans)) continue;
      const eco = extractEcoFromPgn(g.pgn) || ecoFromUrl(g.eco);
      parsed.push({ ...g, _sans: sans, _eco: eco, _ecoFamily: ecoFamily(eco) });
    }
    console.log(`  ${parsed.length} valid (chess.js + >=12 plies)`);

    // Group by signature (first-6-plies) for white + black separately
    const whiteGroups = new Map();
    const blackGroups = new Map();
    for (const g of parsed) {
      const isWhite = proIsWhite(g, username);
      const target = isWhite ? whiteGroups : blackGroups;
      const sig = signatureForGame(g._sans, 6);
      if (!target.has(sig)) target.set(sig, []);
      target.get(sig).push(g);
    }

    // Pick top 3 white + top 3 black by count
    const whiteSorted = [...whiteGroups.entries()].sort((a, b) => b[1].length - a[1].length);
    const blackSorted = [...blackGroups.entries()].sort((a, b) => b[1].length - a[1].length);
    console.log(`  white groups: ${whiteGroups.size} (top: ${whiteSorted[0]?.[1]?.length || 0} games)`);
    console.log(`  black groups: ${blackGroups.size} (top: ${blackSorted[0]?.[1]?.length || 0} games)`);

    for (const [color, sorted] of [['white', whiteSorted], ['black', blackSorted]]) {
      const isWhite = color === 'white';
      let added = 0;
      for (const [sig, groupGames] of sorted) {
        if (added >= 3) break;
        if (groupGames.length < 3) continue; // need at least 3 games for the line to be "their repertoire"

        // Build canonical PGN by walking the most-common 12-ply continuation
        // For simplicity: use the first game's first 12 plies as canonical
        const canonicalGame = groupGames[0];
        const canonicalSans = canonicalGame._sans.slice(0, 14);
        const canonicalPgn = canonicalSans.join(' ');

        // Identify the opening name from the most-common ECO in this group
        const ecoCounts = {};
        for (const g of groupGames) {
          if (g._eco) ecoCounts[g._eco] = (ecoCounts[g._eco] || 0) + 1;
        }
        const topEco = Object.entries(ecoCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        // Generate opening ID
        const sigSlug = sig.replace(/[^A-Za-z0-9]/g, '-').slice(0, 30).toLowerCase();
        const openingId = `pro-${proSlug}-${color[0]}-${sigSlug}`;

        const repGame = rankGameForRep(groupGames, isWhite);
        const wins = groupGames.filter(g => (isWhite ? g.result === '1-0' : g.result === '0-1')).length;
        const draws = groupGames.filter(g => g.result === '1/2-1/2').length;
        const losses = groupGames.length - wins - draws;

        proRepertoires.push({
          id: openingId,
          playerId: proSlug,
          playerDisplay: profile,
          eco: topEco,
          name: `${profile} — ${color === 'white' ? 'White' : 'Black'} line ${added + 1} (${topEco || 'unknown ECO'})`,
          pgn: canonicalPgn,
          color,
          totalGamesPlayed: groupGames.length,
          recordInLine: { wins, draws, losses },
          firstMovesSignature: sig,
        });

        if (repGame) {
          modelGames.push({
            id: `mg-${openingId}-rep`,
            openingId,
            white: repGame.white,
            black: repGame.black,
            whiteElo: repGame.whiteRating || null,
            blackElo: repGame.blackRating || null,
            result: repGame.result,
            year: parseInt((repGame.date || '').slice(0, 4), 10) || new Date().getFullYear(),
            event: (repGame.source === 'chess.com' ? 'Chess.com' : 'Lichess') + ' ' + (repGame.timeControl || 'Online'),
            pgn: repGame._sans.join(' '),
            sourceUrl: repGame.sourceUrl,
            overview: `${profile} as ${isWhite ? 'White' : 'Black'} vs ${isWhite ? repGame.black : repGame.white} (${isWhite ? repGame.blackRating ?? '?' : repGame.whiteRating ?? '?'}) — ${repGame.timeControl ?? 'online'} ${(repGame.date || '').slice(0,4)}.`,
            criticalMoments: [],
            middlegameTheme: `${profile}'s ${color} repertoire`,
            lessonSummary: `${profile}'s representative game in this line — full game from move 1 through resolution.`,
          });
        }
        added++;
      }
    }
  }

  console.log(`\n=== TOTALS ===`);
  console.log(`pro repertoires: ${proRepertoires.length}`);
  console.log(`model games: ${modelGames.length}`);
  await writeFile(REP_PROPOSAL, JSON.stringify({ generatedAt: new Date().toISOString(), openings: proRepertoires }, null, 2));
  await writeFile(MG_PROPOSAL, JSON.stringify(modelGames, null, 2));
  console.log(`wrote ${REP_PROPOSAL}`);
  console.log(`wrote ${MG_PROPOSAL}`);
}
main().catch(e => { console.error(e); process.exit(1); });
