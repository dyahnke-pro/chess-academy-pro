#!/usr/bin/env node
/**
 * Adds variations[] to each entry in proposed-pro-repertoires.json.
 * For each pro repertoire entry:
 *   1. Find the games in this pro's archive that share the same
 *      first-6-plies signature (the entry's "main line")
 *   2. Group those games by their NEXT 4-6 plies (depth 7-13)
 *   3. Each subgroup with 2+ games becomes a variation
 *   4. Pick top 2 most-played continuations as variations[]
 *
 * Each variation gets:
 *   - name: derived from ECO + opening DB
 *   - pgn: extended PGN through the sub-line
 *   - explanation: "{pro} played this sub-line N times..."
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const RAW_PATH = 'docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json';
const PROP_PATH = 'docs/audit-runs/2026-05-19-pro-rebuild/proposed-pro-repertoires.json';
const ECO_PATH = 'src/data/openings-lichess.json';

function pgnToSans(pgn) {
  if (!pgn) return [];
  const lines = pgn.split('\n');
  const moveLines = lines.filter(l => !l.trim().startsWith('['));
  return moveLines.join(' ').replace(/\{[^}]*\}/g, ' ').replace(/\$\d+/g, ' ').replace(/\d+\.+/g, ' ').replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function validate(sans) {
  const c = new Chess();
  for (const s of sans) { try { c.move(s); } catch { return false; } }
  return true;
}

function ecoPgnSans(pgn) {
  const c = new Chess(); const out = [];
  for (const t of (pgn || '').trim().split(/\s+/).filter(t => !/^\d+\.+$/.test(t))) {
    try { const m = c.move(t); out.push(m.san); } catch { break; }
  }
  return out;
}

const raw = JSON.parse(await readFile(RAW_PATH, 'utf-8'));
const proposal = JSON.parse(await readFile(PROP_PATH, 'utf-8'));
const ecoDb = JSON.parse(await readFile(ECO_PATH, 'utf-8'));
const ecoParsed = ecoDb.map(e => ({ ...e, _sans: ecoPgnSans(e.pgn || '') })).filter(e => e._sans.length > 0);

const PROFILE_USERNAMES = {
  carlsen: 'magnuscarlsen', hikaru: 'hikaru', caruana: 'fabianocaruana',
  firouzja: 'firouzja2003', naroditsky: 'danielnaroditsky', gothamchess: 'gothamchess',
  praggnanandhaa: 'rpragchess', niemann: 'hansontwitch', dubov: 'duhless', annacramling: 'annacramling',
};

// Index pro games by player + signature
const proGames = {};
for (const [slug, games] of Object.entries(raw.pros)) {
  proGames[slug] = games.map(g => ({ ...g, _sans: pgnToSans(g.pgn) })).filter(g => g._sans.length >= 12 && validate(g._sans));
}

function lookupOpeningName(sans) {
  let best = null;
  for (const e of ecoParsed) {
    if (e._sans.length > sans.length) continue;
    let isPrefix = true;
    for (let i = 0; i < e._sans.length; i++) {
      if (e._sans[i] !== sans[i]) { isPrefix = false; break; }
    }
    if (isPrefix && (!best || e._sans.length > best._sans.length)) best = e;
  }
  return best;
}

let totalVariationsAdded = 0;
for (const entry of proposal.openings) {
  const username = PROFILE_USERNAMES[entry.playerId];
  if (!username) continue;
  const games = proGames[entry.playerId] || [];
  const mainSig = entry.firstMovesSignature.split(' ');
  // Find games matching the main signature
  const matching = games.filter(g => {
    if (g._sans.length < mainSig.length + 4) return false;
    for (let i = 0; i < mainSig.length; i++) if (g._sans[i] !== mainSig[i]) return false;
    const isProWhite = (g.white || '').toLowerCase() === username.toLowerCase();
    return (entry.color === 'white') === isProWhite;
  });
  if (matching.length < 3) { entry.variations = []; continue; }

  // Try multiple sub-depths. Shallower (10) catches more 2+ game
  // overlap; deeper (12, 14) catches more specific middlegame
  // branches. Pick the depth that produces the most variations
  // distinct from entry's main line.
  const entryPgnSans = pgnToSans(entry.pgn);
  let bestSubSorted = [];
  let bestSubDepth = 10;
  for (const subDepth of [10, 12, 14]) {
    const subGroups = new Map();
    for (const g of matching) {
      if (g._sans.length < subDepth) continue;
      const subSig = g._sans.slice(0, subDepth).join(' ');
      if (!subGroups.has(subSig)) subGroups.set(subSig, []);
      subGroups.get(subSig).push(g);
    }
    const entryPgnKey = entryPgnSans.slice(0, subDepth).join(' ');
    const sorted = [...subGroups.entries()]
      .filter(([sig, gs]) => gs.length >= 2 && sig !== entryPgnKey)
      .sort((a, b) => b[1].length - a[1].length);
    if (sorted.length > bestSubSorted.length) {
      bestSubSorted = sorted;
      bestSubDepth = subDepth;
    }
  }
  // Fallback: if no 2+ game variations at any depth, try 1-game variations
  // at depth 14 (so single instances of named sublines still surface).
  if (bestSubSorted.length === 0) {
    const subDepth = 14;
    const subGroups = new Map();
    for (const g of matching) {
      if (g._sans.length < subDepth) continue;
      const subSig = g._sans.slice(0, subDepth).join(' ');
      if (!subGroups.has(subSig)) subGroups.set(subSig, []);
      subGroups.get(subSig).push(g);
    }
    const entryPgnKey = entryPgnSans.slice(0, subDepth).join(' ');
    bestSubSorted = [...subGroups.entries()]
      .filter(([sig]) => sig !== entryPgnKey)
      .sort((a, b) => b[1].length - a[1].length);
    bestSubDepth = subDepth;
  }
  const variations = [];
  for (const [subSig, subGames] of bestSubSorted.slice(0, 6)) {
    const subSans = subSig.split(' ');
    const ecoMatch = lookupOpeningName(subSans);
    const isProWhite = entry.color === 'white';
    const wins = subGames.filter(g => (isProWhite ? g.result === '1-0' : g.result === '0-1')).length;
    variations.push({
      name: ecoMatch ? ecoMatch.name : `${entry.canonicalOpeningName || entry.name} subline`,
      eco: ecoMatch?.eco || null,
      pgn: subSans.join(' '),
      gamesPlayed: subGames.length,
      wins,
      draws: subGames.filter(g => g.result === '1/2-1/2').length,
      losses: subGames.length - wins - subGames.filter(g => g.result === '1/2-1/2').length,
    });
  }
  // Take top 3 variations
  const finalVars = variations.slice(0, 3);
  // Disambiguate duplicate names — same canonical name + different sub-line
  const nameCounts = {};
  for (const v of finalVars) nameCounts[v.name] = (nameCounts[v.name] || 0) + 1;
  const nameSeen = {};
  for (const v of finalVars) {
    if (nameCounts[v.name] > 1) {
      nameSeen[v.name] = (nameSeen[v.name] || 0) + 1;
      v.name = `${v.name} (continuation ${nameSeen[v.name]})`;
    }
  }
  entry.variations = finalVars;
  totalVariationsAdded += finalVars.length;
}

console.log(`added ${totalVariationsAdded} variations across ${proposal.openings.length} entries`);
console.log(`avg ${(totalVariationsAdded / proposal.openings.length).toFixed(1)} variations per entry`);
await writeFile(PROP_PATH, JSON.stringify(proposal, null, 2) + '\n');
console.log(`wrote ${PROP_PATH}`);

// Sample
console.log('\n=== sample with variations ===');
const sample = proposal.openings.find(o => (o.variations || []).length >= 2);
if (sample) {
  console.log(sample.name);
  console.log('  main pgn:', sample.pgn);
  for (const v of sample.variations) console.log(`  variation: ${v.name} (${v.gamesPlayed}g, ${v.wins}W/${v.draws}D/${v.losses}L) — ${v.pgn.slice(0, 80)}...`);
}
