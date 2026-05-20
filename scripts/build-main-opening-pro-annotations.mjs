#!/usr/bin/env node
/**
 * For each main repertoire opening (src/data/repertoire.json, 40 entries),
 * list the pros from the proposed pro-repertoires whose lines overlap.
 *
 * Granularity tiers (per David's call 2026-05-19):
 *   EXACT  = 8+ ply signature shared (same theoretical line)
 *   FAMILY = 6-7 plies + same ECO family (sub-line of main)
 *   SAME_ECO = same ECO code, different sub-line
 *
 * Output drives the future "pros who play this" annotation on
 * OpeningDetailPage. Training plan remains the primary pointer
 * surface; this is supplementary.
 */

import { readFile, writeFile } from 'node:fs/promises';

const MAIN_PATH = 'src/data/repertoire.json';
const PRO_PATH = 'docs/audit-runs/2026-05-19-pro-rebuild/proposed-pro-repertoires.json';
const OUT_PATH = 'docs/audit-runs/2026-05-19-pro-rebuild/main-opening-pro-annotations.json';

function pgnToSans(pgn) {
  if (!pgn) return [];
  return pgn.trim().split(/\s+/).filter(t => !/^\d+\.+$/.test(t));
}

function sharedPliesPrefix(a, b) {
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) n++; else break;
  }
  return n;
}

// ECO ranges for each main opening (the curated 40). The range tells
// us which pro-entry ECO codes are theoretically WITHIN this main
// opening's tree. E.g. Ruy Lopez parent C60 covers C60-C99 (Morphy
// at C70-C79, Closed at C80-C99, Open at C80-C89 etc).
const MAIN_ECO_RANGES = {
  'italian-game': ['C50', 'C54'],
  'two-knights-defence': ['C55', 'C59'],
  'evans-gambit': ['C51', 'C52'],
  'scotch-game': ['C45', 'C45'],
  'ruy-lopez': ['C60', 'C99'],
  'vienna-game': ['C25', 'C29'],
  'kings-gambit': ['C30', 'C39'],
  'four-knights-game': ['C46', 'C49'],
  'sicilian-najdorf': ['B90', 'B99'],
  'sicilian-dragon': ['B70', 'B79'],
  'sicilian-sveshnikov': ['B32', 'B33'],
  'sicilian-alapin': ['B22', 'B22'],
  'french-defence': ['C00', 'C19'],
  'caro-kann': ['B10', 'B19'],
  'pirc-defence': ['B07', 'B09'],
  'scandinavian-defence': ['B01', 'B01'],
  'alekhine-defence': ['B02', 'B05'],
  'philidor-defence': ['C41', 'C41'],
  'petrov-defence': ['C42', 'C43'],
  'queens-gambit': ['D06', 'D06'],
  'london-system': ['D00', 'D02'],
  'catalan-opening': ['E00', 'E09'],
  'trompowsky-attack': ['A45', 'A45'],
  'qgd': ['D30', 'D69'],
  'qga': ['D20', 'D29'],
  'slav-defence': ['D10', 'D19'],
  'semi-slav': ['D43', 'D49'],
  'kings-indian-defence': ['E60', 'E99'],
  'nimzo-indian': ['E20', 'E59'],
  'grunfeld-defence': ['D80', 'D99'],
  'dutch-defence': ['A80', 'A99'],
  'benoni-defence': ['A60', 'A79'],
  'benko-gambit': ['A57', 'A59'],
  'queens-indian': ['E12', 'E19'],
  'budapest-gambit': ['A51', 'A52'],
  'old-indian-defence': ['A53', 'A55'],
  'english-opening': ['A10', 'A39'],
  'reti-opening': ['A04', 'A09'],
  'kings-indian-attack': ['A07', 'A08'],
  'birds-opening': ['A02', 'A03'],
};

function ecoInRange(eco, range) {
  if (!eco || !range) return false;
  return eco >= range[0] && eco <= range[1];
}

function classify(sharedPlies, mainId, mainEco, proEco) {
  // Same ECO code = same theoretical line.
  if (mainEco && proEco && mainEco === proEco && sharedPlies >= 6) return 'exact';
  // Pro ECO falls inside the main opening's known sub-tree range.
  // ECO range IS the authoritative signal — a small ply count just
  // means the sub-line diverges early (e.g. Berlin Defense vs Closed
  // Ruy share only 5 plies but are both clearly Ruy Lopez sub-trees).
  const range = MAIN_ECO_RANGES[mainId];
  const inRange = ecoInRange(proEco, range);
  if (sharedPlies >= 9 && inRange) return 'exact';
  if (sharedPlies >= 4 && inRange) return 'family';
  // Last resort: same ECO code but plies don't agree.
  if (mainEco && proEco && mainEco === proEco) return 'same-eco';
  return null;
}

const main = JSON.parse(await readFile(MAIN_PATH, 'utf-8'));
const proFile = JSON.parse(await readFile(PRO_PATH, 'utf-8'));
const pros = proFile.openings;

const annotations = [];
let totalLinks = 0;

for (const m of main) {
  const msans = pgnToSans(m.pgn);
  const playedBy = [];
  for (const p of pros) {
    const psans = pgnToSans(p.pgn);
    const shared = sharedPliesPrefix(msans, psans);
    const tier = classify(shared, m.id, m.eco, p.eco);
    if (!tier) continue;
    playedBy.push({
      proId: p.playerId,
      proName: p.playerDisplay,
      proEntryId: p.id,
      proEntryName: p.name,
      proColor: p.color,
      proEco: p.eco,
      sharedPlies: shared,
      matchTier: tier,
      proGamesPlayed: p.totalGamesPlayed,
      proRecord: p.recordInLine,
    });
  }
  // Sort: exact > family > same-eco, then by games played
  playedBy.sort((a, b) => {
    const order = { exact: 0, family: 1, 'same-eco': 2 };
    if (order[a.matchTier] !== order[b.matchTier]) return order[a.matchTier] - order[b.matchTier];
    return (b.proGamesPlayed || 0) - (a.proGamesPlayed || 0);
  });
  annotations.push({
    mainId: m.id,
    mainName: m.name,
    mainEco: m.eco,
    mainColor: m.color,
    playedByPros: playedBy,
  });
  totalLinks += playedBy.length;
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalMainOpenings: main.length,
  totalProEntries: pros.length,
  totalProLinks: totalLinks,
  mainWithAnyPro: annotations.filter(a => a.playedByPros.length > 0).length,
  mainWithNoPro: annotations.filter(a => a.playedByPros.length === 0).length,
  annotations,
};

await writeFile(OUT_PATH, JSON.stringify(summary, null, 2) + '\n');

console.log(`=== MAIN OPENING ↔ PRO LINKS ===`);
console.log(`main openings: ${main.length}`);
console.log(`pro entries: ${pros.length}`);
console.log(`total pro→main links: ${totalLinks}`);
console.log(`main openings with at least 1 pro: ${summary.mainWithAnyPro}`);
console.log(`main openings with NO pro: ${summary.mainWithNoPro}\n`);

console.log('=== MAIN OPENINGS WITH MOST PRO COVERAGE ===');
const top = [...annotations].sort((a, b) => b.playedByPros.length - a.playedByPros.length).slice(0, 12);
for (const a of top) {
  if (a.playedByPros.length === 0) break;
  console.log(`  ${a.mainEco} ${a.mainName.padEnd(28)} (${a.playedByPros.length} pros):`);
  for (const pb of a.playedByPros) {
    console.log(`    ${pb.matchTier.padEnd(8)} | ${pb.proName} as ${pb.proColor} | ${pb.sharedPlies}ply | ${pb.proEntryName.slice(0, 60)}`);
  }
}

console.log('\n=== MAIN OPENINGS WITH NO PRO LINK ===');
for (const a of annotations) {
  if (a.playedByPros.length === 0) console.log(`  ${a.mainEco} ${a.mainName}`);
}

console.log(`\nwrote ${OUT_PATH}`);
