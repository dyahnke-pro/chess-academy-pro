#!/usr/bin/env node

/**
 * enrich-repertoire.mjs
 *
 * Enriches repertoire.json with deeper lines from the Lichess chess-openings
 * database (TSV files at /tmp/chess-openings/{a,b,c,d,e}.tsv).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// 1. Read repertoire.json
// ---------------------------------------------------------------------------
const REPERTOIRE_PATH = join(
  import.meta.dirname,
  '..',
  'src',
  'data',
  'repertoire.json',
);
const repertoire = JSON.parse(readFileSync(REPERTOIRE_PATH, 'utf8'));

// ---------------------------------------------------------------------------
// 2. Read all Lichess TSV files
// ---------------------------------------------------------------------------
const TSV_DIR = '/tmp/chess-openings';
const TSV_FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];

const lichessEntries = [];

for (const file of TSV_FILES) {
  const content = readFileSync(join(TSV_DIR, file), 'utf8');
  const lines = content.trim().split('\n');
  // Skip the header row
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length >= 3) {
      lichessEntries.push({
        eco: parts[0].trim(),
        name: parts[1].trim(),
        pgn: parts[2].trim(),
      });
    }
  }
}

console.log(`Loaded ${lichessEntries.length} Lichess entries from ${TSV_FILES.length} files.`);

// ---------------------------------------------------------------------------
// 3. Strip move numbers from PGN
// ---------------------------------------------------------------------------
function cleanPgn(pgn) {
  return pgn.replace(/\d+\.\s*/g, '').trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// 4. ECO range map and name matching rules
// ---------------------------------------------------------------------------

function parseEco(eco) {
  return {
    letter: eco[0].toUpperCase(),
    num: parseInt(eco.slice(1), 10),
  };
}

function ecoInRange(eco, range) {
  const parsed = parseEco(eco);
  if (range.includes('-')) {
    const [startStr, endStr] = range.split('-');
    const start = parseEco(startStr);
    const end = parseEco(endStr);
    if (parsed.letter !== start.letter) return false;
    return parsed.num >= start.num && parsed.num <= end.num;
  }
  const single = parseEco(range);
  return parsed.letter === single.letter && parsed.num === single.num;
}

function ecoInAnyRange(eco, ranges) {
  return ranges.some((range) => ecoInRange(eco, range));
}

const ECO_MAP = {
  'vienna-game': {
    ecoRanges: ['C25-C26'],
    namePrefixes: ['Vienna Game'],
  },
  'vienna-gambit': {
    ecoRanges: ['C29'],
    namePrefixes: ['Vienna Gambit'],
  },
  'italian-game': {
    ecoRanges: ['C50-C54'],
    namePrefixes: ['Italian Game', 'Giuoco'],
  },
  'italian-giuoco-piano': {
    ecoRanges: ['C50-C54'],
    namePrefixes: ['Italian Game', 'Giuoco'],
  },
  'evans-gambit': {
    ecoRanges: ['C51-C52'],
    namePrefixes: ['Evans Gambit'],
  },
  'scotch-game': {
    ecoRanges: ['C44-C45'],
    namePrefixes: ['Scotch Game', 'Scotch Opening'],
  },
  'scotch-gambit': {
    ecoRanges: ['C44-C45'],
    namePrefixes: ['Scotch Gambit'],
  },
  'ruy-lopez': {
    ecoRanges: ['C60-C99'],
    namePrefixes: ['Ruy Lopez'],
  },
  'kings-gambit': {
    ecoRanges: ['C30-C39'],
    namePrefixes: ["King's Gambit"],
  },
  'london-system': {
    ecoRanges: ['D00'],
    namePrefixes: ['London System'],
  },
  'jobava-london': {
    ecoRanges: ['D00'],
    namePrefixes: ['Jobava London'],
  },
  'queens-gambit': {
    ecoRanges: ['D06-D69'],
    namePrefixes: ["Queen's Gambit"],
  },
  'catalan-opening': {
    ecoRanges: ['E00-E09'],
    namePrefixes: ['Catalan'],
  },
  'birds-opening': {
    ecoRanges: ['A02-A03'],
    namePrefixes: ['Bird'],
  },
  'english-opening': {
    ecoRanges: ['A10-A39'],
    namePrefixes: ['English'],
  },
  'reti-opening': {
    ecoRanges: ['A04-A09'],
    namePrefixes: ['Reti', 'Réti'],
  },
  'kings-indian-attack': {
    ecoRanges: ['A07-A08'],
    namePrefixes: ["King's Indian Attack"],
  },
  'trompowsky-attack': {
    ecoRanges: ['A45'],
    namePrefixes: ['Trompowsky'],
  },
  'torre-attack': {
    ecoRanges: ['A46'],
    namePrefixes: ['Torre Attack'],
  },
  'colle-system': {
    ecoRanges: ['D05'],
    namePrefixes: ['Colle'],
  },
  'stonewall-attack': {
    ecoRanges: ['D00'],
    namePrefixes: ['Stonewall'],
  },
  'larsen-nimzo': {
    ecoRanges: ['A01'],
    namePrefixes: ['Nimzo-Larsen', 'Larsen'],
  },
  'ponziani-opening': {
    ecoRanges: ['C44'],
    namePrefixes: ['Ponziani'],
  },
  'sicilian-najdorf': {
    ecoRanges: ['B90-B99'],
    namePrefixes: ['Sicilian'],
    nameContains: ['Najdorf'],
  },
  'sicilian-dragon': {
    ecoRanges: ['B70-B79'],
    namePrefixes: ['Sicilian'],
    nameContains: ['Dragon'],
  },
  'sicilian-sveshnikov': {
    ecoRanges: ['B33-B39'],
    namePrefixes: ['Sicilian'],
    nameContains: ['Sveshnikov'],
  },
  'sicilian-black-lion': {
    ecoRanges: ['B50-B59'],
    namePrefixes: ['Sicilian'],
    nameContains: ['Lion'],
  },
  'french-defense': {
    ecoRanges: ['C00-C19'],
    namePrefixes: ['French Def'],
  },
  'french-defence': {
    ecoRanges: ['C00-C19'],
    namePrefixes: ['French Def'],
  },
  'caro-kann': {
    ecoRanges: ['B10-B19'],
    namePrefixes: ['Caro-Kann'],
  },
  'pirc-defense': {
    ecoRanges: ['B07-B09'],
    namePrefixes: ['Pirc'],
  },
  'pirc-modern': {
    ecoRanges: ['B06-B09'],
    namePrefixes: ['Pirc', 'Modern'],
  },
  'kings-indian-defense': {
    ecoRanges: ['E60-E99'],
    namePrefixes: ["King's Indian Def"],
    nameExcludes: ['Attack'],
  },
  'kings-indian-defence': {
    ecoRanges: ['E60-E99'],
    namePrefixes: ["King's Indian Def"],
    nameExcludes: ['Attack'],
  },
  'nimzo-indian-defense': {
    ecoRanges: ['E20-E59'],
    namePrefixes: ['Nimzo-Indian'],
  },
  'nimzo-indian': {
    ecoRanges: ['E20-E59'],
    namePrefixes: ['Nimzo-Indian'],
  },
  'queens-indian-defense': {
    ecoRanges: ['E12-E19'],
    namePrefixes: ["Queen's Indian"],
  },
  'queens-indian': {
    ecoRanges: ['E12-E19'],
    namePrefixes: ["Queen's Indian"],
  },
  'grunfeld-defense': {
    ecoRanges: ['D80-D99'],
    namePrefixes: ['Gr'],
    nameContains: ['nfeld'],
  },
  'grunfeld-defence': {
    ecoRanges: ['D80-D99'],
    namePrefixes: ['Gr'],
    nameContains: ['nfeld'],
  },
  'dutch-defense': {
    ecoRanges: ['A80-A99'],
    namePrefixes: ['Dutch'],
  },
  'dutch-defence': {
    ecoRanges: ['A80-A99'],
    namePrefixes: ['Dutch'],
  },
  'leningrad-dutch': {
    ecoRanges: ['A80-A89'],
    namePrefixes: ['Dutch'],
    nameContains: ['Leningrad'],
  },
  'slav-defense': {
    ecoRanges: ['D10-D19'],
    namePrefixes: ['Slav Def'],
    nameExcludes: ['Semi-Slav'],
  },
  'semi-slav-defense': {
    ecoRanges: ['D43-D49'],
    namePrefixes: ['Semi-Slav'],
  },
  'benoni-defense': {
    ecoRanges: ['A60-A79'],
    namePrefixes: ['Benoni'],
  },
  'benoni-defence': {
    ecoRanges: ['A60-A79'],
    namePrefixes: ['Benoni'],
  },
  'benko-gambit': {
    ecoRanges: ['A57-A59'],
    namePrefixes: ['Benko'],
  },
  'alekhine-defense': {
    ecoRanges: ['B02-B05'],
    namePrefixes: ['Alekhine'],
  },
  'alekhine-defence': {
    ecoRanges: ['B02-B05'],
    namePrefixes: ['Alekhine'],
  },
  'scandinavian-defense': {
    ecoRanges: ['B01'],
    namePrefixes: ['Scandinavian'],
  },
  'scandinavian-defence': {
    ecoRanges: ['B01'],
    namePrefixes: ['Scandinavian'],
  },
  'philidor-defense': {
    ecoRanges: ['C41'],
    namePrefixes: ['Philidor'],
  },
  'philidor-defence': {
    ecoRanges: ['C41'],
    namePrefixes: ['Philidor'],
  },
  'petroff-defense': {
    ecoRanges: ['C42-C43'],
    namePrefixes: ['Petrov', 'Petroff', 'Russian Game'],
  },
  'budapest-gambit': {
    ecoRanges: ['A51-A52'],
    namePrefixes: ['Budapest'],
  },
  'bishops-opening': {
    ecoRanges: ['C23-C24'],
    namePrefixes: ["Bishop's Opening"],
  },
  'danish-gambit': {
    ecoRanges: ['C21'],
    namePrefixes: ['Danish Gambit'],
  },
  'two-knights': {
    ecoRanges: ['C55-C59'],
    namePrefixes: ['Two Knights', 'Italian Game: Two Knights'],
  },
  'fried-liver-attack': {
    ecoRanges: ['C57-C58'],
    namePrefixes: ['Italian Game'],
    nameContains: ['Fried Liver'],
  },
  'goring-gambit': {
    ecoRanges: ['C44'],
    namePrefixes: ['Scotch'],
    nameContains: ['Göring', 'Goring'],
  },
  'owens-defence': {
    ecoRanges: ['B00'],
    namePrefixes: ["Owen's Def", 'Owen Defense'],
  },
  'old-indian-defence': {
    ecoRanges: ['A53-A55'],
    namePrefixes: ['Old Indian'],
  },
};

// ---------------------------------------------------------------------------
// 5. Match Lichess entries to repertoire openings
// ---------------------------------------------------------------------------

function matchesOpening(entry, rule) {
  // Check ECO range
  if (!ecoInAnyRange(entry.eco, rule.ecoRanges)) return false;

  // Check name prefix (OR logic)
  const prefixMatch = rule.namePrefixes.some((prefix) =>
    entry.name.startsWith(prefix),
  );
  if (!prefixMatch) return false;

  // Check nameContains (AND logic — all must be present)
  if (rule.nameContains) {
    const allContained = rule.nameContains.every((substr) =>
      entry.name.includes(substr),
    );
    if (!allContained) return false;
  }

  // Check nameExcludes (NONE must be present)
  if (rule.nameExcludes) {
    const anyExcluded = rule.nameExcludes.some((substr) =>
      entry.name.includes(substr),
    );
    if (anyExcluded) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// 6-8. Enrich each repertoire opening
// ---------------------------------------------------------------------------

const summary = [];

for (const opening of repertoire) {
  const rule = ECO_MAP[opening.id];
  if (!rule) {
    summary.push({
      name: opening.name,
      added: 0,
      total: opening.variations?.length || 0,
      note: '(no ECO mapping)',
    });
    continue;
  }

  // Find matching Lichess entries
  const matches = lichessEntries.filter((entry) =>
    matchesOpening(entry, rule),
  );

  // Existing PGNs for deduplication (normalized)
  const existingPgns = new Set();

  // Add the main PGN
  const mainPgnClean = cleanPgn(opening.pgn);
  existingPgns.add(mainPgnClean);

  // Add existing variation PGNs
  if (!opening.variations) opening.variations = [];
  for (const v of opening.variations) {
    existingPgns.add(cleanPgn(v.pgn));
  }

  let addedCount = 0;

  for (const match of matches) {
    const matchPgn = cleanPgn(match.pgn);

    // Skip duplicates
    if (existingPgns.has(matchPgn)) continue;

    // Create new variation
    opening.variations.push({
      name: match.name,
      pgn: matchPgn,
      explanation: `The ${match.name}. A theoretical line in the ${opening.name}.`,
    });

    existingPgns.add(matchPgn);
    addedCount++;
  }

  summary.push({
    name: opening.name,
    added: addedCount,
    total: opening.variations.length,
  });
}

// ---------------------------------------------------------------------------
// 8. Write enriched data back
// ---------------------------------------------------------------------------
writeFileSync(REPERTOIRE_PATH, JSON.stringify(repertoire, null, 2) + '\n', 'utf8');

// ---------------------------------------------------------------------------
// 9. Print summary
// ---------------------------------------------------------------------------
console.log('\n=== Enrichment Summary ===\n');
let totalAdded = 0;
for (const entry of summary) {
  const note = entry.note ? ` ${entry.note}` : '';
  console.log(`${entry.name}: +${entry.added} new variations (total ${entry.total})${note}`);
  totalAdded += entry.added;
}
console.log(`\nTotal new variations added: ${totalAdded}`);
console.log('Enriched repertoire written to:', REPERTOIRE_PATH);
