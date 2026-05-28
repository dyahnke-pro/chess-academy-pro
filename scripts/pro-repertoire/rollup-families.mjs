#!/usr/bin/env node
// Roll up the per-signature stats into opening FAMILIES (one entry
// per canonical "this is what he plays as White against this") using
// a hand-curated set of canonical-PGN prefixes. The signature
// bucketing is too granular (10-ply prefix = sub-variation level);
// a family rollup gives us the actual "top openings" list to build.

import fs from 'node:fs';
import path from 'node:path';

const PLAYER = process.argv[2] || 'danielnaroditsky';
const STATS_PATH = path.join('data', 'sources', `${PLAYER}-stats.json`);
const OUT_PATH = path.join('data', 'sources', `${PLAYER}-families.json`);

// Opening family signatures: ordered list. First match wins. Each
// family declares (a) its canonical opening NAME, (b) a list of
// prefix patterns (SAN-token arrays — first N tokens of the game's
// SAN sequence must equal one of these to assign the game to this
// family), (c) the COLOR the family belongs to from the student's
// perspective. Order matters: more specific patterns FIRST so they
// claim games before broader patterns sweep them up.
const FAMILIES = [
  // ===== White (Naroditsky as White, picking the opening) =====
  // 1.e4 systems
  { name: 'Italian Game',     color: 'white', prefixes: [['e4','e5','Nf3','Nc6','Bc4']] },
  { name: 'Ruy Lopez',        color: 'white', prefixes: [['e4','e5','Nf3','Nc6','Bb5']] },
  { name: 'Scotch Game',      color: 'white', prefixes: [['e4','e5','Nf3','Nc6','d4']] },
  { name: 'Four Knights Game',color: 'white', prefixes: [['e4','e5','Nf3','Nc6','Nc3','Nf6']] },
  { name: 'Vienna Game',      color: 'white', prefixes: [['e4','e5','Nc3']] },
  { name: 'King\'s Gambit',   color: 'white', prefixes: [['e4','e5','f4']] },
  { name: 'Ponziani Opening', color: 'white', prefixes: [['e4','e5','Nf3','Nc6','c3']] },
  // After 1.e4 anything-else by Black
  { name: 'Alapin Sicilian',  color: 'white', prefixes: [['e4','c5','c3']] },
  { name: 'Open Sicilian',    color: 'white', prefixes: [['e4','c5','Nf3','d6','d4'], ['e4','c5','Nf3','Nc6','d4'], ['e4','c5','Nf3','e6','d4']] },
  { name: 'Anti-Sicilian (Rossolimo/Moscow)', color: 'white', prefixes: [['e4','c5','Nf3','Nc6','Bb5'], ['e4','c5','Nf3','d6','Bb5+']] },
  { name: 'Closed Sicilian',  color: 'white', prefixes: [['e4','c5','Nc3']] },
  { name: 'Caro-Kann Advance',color: 'white', prefixes: [['e4','c6','d4','d5','e5']] },
  { name: 'Caro-Kann Exchange',color:'white', prefixes: [['e4','c6','d4','d5','exd5']] },
  { name: 'Fantasy Caro-Kann',color: 'white', prefixes: [['e4','c6','d4','d5','f3']] },
  { name: 'Caro-Kann Main',   color: 'white', prefixes: [['e4','c6','d4','d5','Nc3'], ['e4','c6','d4','d5','Nd2']] },
  { name: 'French Defense',   color: 'white', prefixes: [['e4','e6','d4']] },
  { name: 'Scandinavian Defense', color: 'white', prefixes: [['e4','d5']] },
  { name: 'Pirc / Modern',    color: 'white', prefixes: [['e4','d6','d4'], ['e4','g6','d4']] },
  { name: 'Alekhine\'s Defense', color: 'white', prefixes: [['e4','Nf6']] },
  // 1.d4 systems
  { name: 'Queen\'s Gambit',  color: 'white', prefixes: [['d4','d5','c4']] },
  { name: 'London System',    color: 'white', prefixes: [['d4','d5','Nf3','Nf6','Bf4'], ['d4','Nf6','Nf3','d5','Bf4'], ['d4','d5','Bf4']] },
  { name: 'Jobava London',    color: 'white', prefixes: [['d4','d5','Nc3']] },
  { name: 'Trompowsky Attack',color: 'white', prefixes: [['d4','Nf6','Bg5']] },
  { name: 'Catalan',          color: 'white', prefixes: [['d4','Nf6','c4','e6','g3']] },
  { name: 'King\'s Indian (White side)', color: 'white', prefixes: [['d4','Nf6','c4','g6']] },
  { name: 'Nimzo / QID',      color: 'white', prefixes: [['d4','Nf6','c4','e6','Nc3'], ['d4','Nf6','c4','e6','Nf3']] },
  { name: 'Slav / Semi-Slav', color: 'white', prefixes: [['d4','d5','c4','c6'], ['d4','d5','c4','e6']] },
  // 1.Nf3 systems
  { name: 'King\'s Indian Attack', color: 'white', prefixes: [['Nf3'], ['g3']] },
  // 1.c4
  { name: 'English Opening',  color: 'white', prefixes: [['c4']] },

  // ===== Black (Naroditsky as Black, responding) =====
  // vs 1.e4
  { name: 'Sicilian Najdorf', color: 'black', prefixes: [['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6']] },
  { name: 'Sicilian (other)', color: 'black', prefixes: [['e4','c5']] },
  { name: 'Caro-Kann',        color: 'black', prefixes: [['e4','c6']] },
  { name: 'French Defense',   color: 'black', prefixes: [['e4','e6']] },
  { name: 'Scandinavian Defense', color: 'black', prefixes: [['e4','d5']] },
  { name: 'Pirc Defense',     color: 'black', prefixes: [['e4','d6']] },
  { name: 'Modern Defense',   color: 'black', prefixes: [['e4','g6']] },
  { name: 'Alekhine\'s Defense', color: 'black', prefixes: [['e4','Nf6']] },
  { name: 'Petroff Defense',  color: 'black', prefixes: [['e4','e5','Nf3','Nf6']] },
  { name: 'Open Games (Spanish/Italian/etc as Black)', color: 'black', prefixes: [['e4','e5']] },
  // vs 1.d4
  { name: 'King\'s Indian Defense', color: 'black', prefixes: [['d4','Nf6','c4','g6'], ['d4','Nf6','Nf3','g6','c4','Bg7']] },
  { name: 'Grünfeld Defense', color: 'black', prefixes: [['d4','Nf6','c4','g6','Nc3','d5'], ['d4','Nf6','c4','g6','Nf3','Bg7','Nc3','d5']] },
  { name: 'Nimzo-Indian',     color: 'black', prefixes: [['d4','Nf6','c4','e6','Nc3','Bb4']] },
  { name: 'Queen\'s Indian',  color: 'black', prefixes: [['d4','Nf6','c4','e6','Nf3','b6']] },
  { name: 'Slav Defense',     color: 'black', prefixes: [['d4','d5','c4','c6']] },
  { name: 'Semi-Slav',        color: 'black', prefixes: [['d4','d5','c4','e6','Nc3','Nf6','Nf3','c6'], ['d4','d5','c4','e6','Nf3','Nf6','Nc3','c6']] },
  { name: 'Queen\'s Gambit Declined', color: 'black', prefixes: [['d4','d5','c4','e6']] },
  { name: 'd4 with d6/g6 (Indian)', color: 'black', prefixes: [['d4','Nf6']] },
  { name: 'Dutch Defense',    color: 'black', prefixes: [['d4','f5']] },
  // vs 1.c4 / 1.Nf3
  { name: 'vs English',       color: 'black', prefixes: [['c4']] },
  { name: 'vs Reti',          color: 'black', prefixes: [['Nf3']] },
];

function matchesPrefix(moves, prefix) {
  if (moves.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (moves[i] !== prefix[i]) return false;
  return true;
}

function assignFamily(moves, color) {
  for (const fam of FAMILIES) {
    if (fam.color !== color) continue;
    for (const prefix of fam.prefixes) {
      if (matchesPrefix(moves, prefix)) return fam.name;
    }
  }
  return null;
}

function main() {
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
  const families = { white: new Map(), black: new Map() };

  for (const color of ['white', 'black']) {
    for (const sig of stats.repertoire[color]) {
      const moves = sig.signature.split(/\s+/).filter(Boolean);
      const famName = assignFamily(moves, color) || '(uncategorized)';
      let fam = families[color].get(famName);
      if (!fam) {
        fam = {
          name: famName,
          color,
          games: 0, wins: 0, draws: 0, losses: 0,
          signatureCount: 0,
          topSignatures: [],
        };
        families[color].set(famName, fam);
      }
      fam.games += sig.games;
      fam.wins += sig.wins;
      fam.draws += sig.draws;
      fam.losses += sig.losses;
      fam.signatureCount++;
      fam.topSignatures.push({
        signature: sig.signature,
        games: sig.games,
        wins: sig.wins, draws: sig.draws, losses: sig.losses,
        scorePct: sig.scorePct,
        ecoName: sig.ecoNames[0]?.name || null,
        variations: sig.variations.slice(0, 6),
        sampleUrls: sig.sampleUrls.slice(0, 3),
      });
    }
  }

  const out = { player: PLAYER, generatedAt: new Date().toISOString(), families: {} };
  for (const color of ['white', 'black']) {
    const arr = [...families[color].values()]
      .map((f) => ({ ...f, scorePct: f.games ? ((f.wins + f.draws/2) / f.games * 100).toFixed(1) : '0', topSignatures: f.topSignatures.sort((a,b) => b.games - a.games).slice(0, 8) }))
      .sort((a, b) => b.games - a.games);
    out.families[color] = arr;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`[rollup] wrote ${OUT_PATH}`);

  for (const color of ['white', 'black']) {
    console.log();
    console.log(`=== TOP FAMILIES AS ${color.toUpperCase()} ===`);
    for (const [i, f] of out.families[color].slice(0, 25).entries()) {
      const sigInfo = f.signatureCount > 1 ? ` (${f.signatureCount} sub-lines)` : '';
      console.log(`  ${(i+1).toString().padStart(2)}. ${f.games.toString().padStart(5)} games | ${f.wins}W ${f.draws}D ${f.losses}L (${f.scorePct}%) | ${f.name}${sigInfo}`);
    }
  }
}

main();
