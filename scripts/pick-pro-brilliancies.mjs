#!/usr/bin/env node
/**
 * Hand-picks 3-5 captivating winning games per pro from the
 * raw-fetched.json archive (2000 games across 10 pros). Each pick
 * is a WIN by the pro against a strong opponent in a sharp/interesting
 * opening.
 *
 * Output: docs/audit-runs/2026-05-19-pro-games-gen/picks.json
 * Format: { picks: { <proSlug>: [<scoredGame>...] }, summary }
 *
 * This is a DISCOVERY step. The actual writes to pro-repertoires.json
 * and model-games.json happen in a follow-up script after David
 * reviews the picks.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const RAW_PATH = 'docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json';
const OUT_PATH = 'docs/audit-runs/2026-05-19-pro-games-gen/picks.json';

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

// Known other-pro usernames (for "named opponent" bonus)
const NAMED_PRO_USERNAMES = new Set([
  'magnuscarlsen', 'hikaru', 'fabianocaruana', 'firouzja2003', 'danielnaroditsky',
  'gothamchess', 'rpragchess', 'hansontwitch', 'duhless', 'annacramling',
  'drnykterstein', 'drdrunkenstein', 'penguingm1', 'lachesis-', 'alireza2003',
  'daniel_naroditsky', 'levyrozman', 'daniil_dubov',
  // Other strong pros that might appear as opponents
  'wesleyso', 'so', 'nepo', 'ianmnepo', 'levonaronian', 'mvllbest',
  'ding-liren', 'liren', 'anish-giri', 'erigaisi', 'arjuneragaisi',
  'gukeshdommaraju', 'gukesh', 'pragg', 'rpragchess',
]);

// Opening characterization — score boost for sharp/exciting lines
function classifyOpeningInterest(eco, firstFewSans) {
  let bonus = 0;
  const firstMoves = firstFewSans.slice(0, 6).join(' ');
  // Gambits + aggressive systems get big bonus
  if (/^e4 e5 f4/.test(firstMoves)) bonus += 40; // King's Gambit
  if (/Bxf7|Nxf7|Bxc6.*dxc6.*Nxe5/.test(firstFewSans.join(' '))) bonus += 30; // sacrifices
  if (/^e4 c5 Nf3 d6 d4 cxd4/.test(firstMoves)) bonus += 25; // Open Sicilian
  if (/^e4 c5 Nf3 e6 d4 cxd4/.test(firstMoves)) bonus += 20; // Taimanov / Kan
  if (/^e4 e5 Nf3 Nc6 Bc4/.test(firstMoves)) bonus += 15; // Italian — can be sharp
  if (/^d4 Nf6 c4 g6/.test(firstMoves)) bonus += 20; // KID / Gruenfeld
  if (/^d4 Nf6 c4 e6 Nc3 Bb4/.test(firstMoves)) bonus += 15; // Nimzo
  if (/^e4 c6 d4 d5 Nc3 dxe4/.test(firstMoves)) bonus += 10; // Caro-Kann main
  if (/^e4 e5 Nf3 Nc6 Bb5/.test(firstMoves)) bonus += 5; // Ruy Lopez
  // Penalize boring openings
  if (/^d4 d5 c4 e6 Nc3 Nf6 cxd5/.test(firstMoves)) bonus -= 20; // QGD Exchange
  if (/^d4 d5 Nf3 Nf6 e3/.test(firstMoves)) bonus -= 15; // London System
  if (/^Nf3 Nf6 g3 g6/.test(firstMoves)) bonus -= 10; // Symmetrical
  return bonus;
}

function pgnToSans(pgn) {
  if (!pgn) return [];
  const lines = pgn.split('\n');
  const moveLines = lines.filter(l => !l.trim().startsWith('['));
  return moveLines.join(' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\.+/g, ' ')
    .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
    .replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function isThePro(userName, profile) {
  const u = (userName || '').toLowerCase();
  return u === profile.chesscomUser.toLowerCase() || profile.lichessUsers.some((lu) => u === lu.toLowerCase());
}

function validateSans(sans) {
  const c = new Chess();
  for (const s of sans) { try { c.move(s); } catch { return false; } }
  return true;
}

function isPgnFamousOpening(firstSans) {
  // Detect common opening names from first 4-6 plies (rough labels)
  const seq = firstSans.slice(0, 6).join(' ');
  const dict = [
    ['Ruy Lopez', /^e4 e5 Nf3 Nc6 Bb5/],
    ['Italian Game', /^e4 e5 Nf3 Nc6 Bc4/],
    ['Scotch Game', /^e4 e5 Nf3 Nc6 d4/],
    ['Petroff Defense', /^e4 e5 Nf3 Nf6/],
    ['Sicilian Najdorf', /^e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6/],
    ['Sicilian Dragon', /^e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6/],
    ['Sicilian Sveshnikov', /^e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5/],
    ['Sicilian Open', /^e4 c5 Nf3 .. d4 cxd4/],
    ['Sicilian Rossolimo', /^e4 c5 Nf3 Nc6 Bb5/],
    ['Sicilian Alapin', /^e4 c5 c3/],
    ['Sicilian Defense', /^e4 c5/],
    ['French Defense', /^e4 e6/],
    ['Caro-Kann', /^e4 c6/],
    ['Pirc Defense', /^e4 d6 d4 Nf6/],
    ['Modern Defense', /^e4 g6/],
    ['Alekhine Defense', /^e4 Nf6/],
    ['Scandinavian Defense', /^e4 d5/],
    ["King's Gambit", /^e4 e5 f4/],
    ["King's Indian Defense", /^d4 Nf6 c4 g6/],
    ['Gruenfeld Defense', /^d4 Nf6 c4 g6 Nc3 d5/],
    ['Nimzo-Indian', /^d4 Nf6 c4 e6 Nc3 Bb4/],
    ["Queen's Indian", /^d4 Nf6 c4 e6 Nf3 b6/],
    ['Benoni Defense', /^d4 Nf6 c4 c5 d5/],
    ['Benko Gambit', /^d4 Nf6 c4 c5 d5 b5/],
    ['Dutch Defense', /^d4 f5/],
    ['Catalan Opening', /^d4 Nf6 c4 e6 g3/],
    ["Queen's Gambit Accepted", /^d4 d5 c4 dxc4/],
    ["Queen's Gambit Declined", /^d4 d5 c4 e6/],
    ['Slav Defense', /^d4 d5 c4 c6/],
    ['London System', /^d4 d5 Nf3 Nf6 Bf4|^d4 Nf6 Bf4|^d4 d5 Bf4/],
    ['Trompowsky Attack', /^d4 Nf6 Bg5/],
    ['English Opening', /^c4/],
    ["King's Indian Attack", /^Nf3 .. g3/],
    ['Vienna Game', /^e4 e5 Nc3/],
    ['Four Knights', /^e4 e5 Nf3 Nc6 Nc3/],
    ["Bird's Opening", /^f4/],
  ];
  for (const [name, rx] of dict) {
    if (rx.test(seq)) return name;
  }
  return 'Other';
}

function score(g, profile) {
  if (!isThePro(g.white, profile) && !isThePro(g.black, profile)) return null; // sanity
  const proIsWhite = isThePro(g.white, profile);
  const proWon = (proIsWhite && g.result === '1-0') || (!proIsWhite && g.result === '0-1');
  if (!proWon) return null;
  const sans = pgnToSans(g.pgn);
  if (sans.length < 20) return null; // skip short blitz pre-mates
  if (!validateSans(sans)) return null;
  const oppRating = proIsWhite ? (g.blackRating || 0) : (g.whiteRating || 0);
  const opponent = proIsWhite ? g.black : g.white;
  const isNamedOpponent = NAMED_PRO_USERNAMES.has((opponent || '').toLowerCase());
  const year = parseInt((g.date || '').slice(0, 4), 10) || 0;

  let s = 0;
  // Opponent strength — the single biggest factor
  if (oppRating > 3200) s += 80;
  else if (oppRating > 3000) s += 60;
  else if (oppRating > 2800) s += 45;
  else if (oppRating > 2600) s += 30;
  else if (oppRating > 2400) s += 15;
  else s += 0;
  // Named-pro opponent
  if (isNamedOpponent) s += 25;
  // Game length (proxy for "full game to mate/resign")
  if (sans.length >= 60) s += 25;
  else if (sans.length >= 40) s += 15;
  else if (sans.length >= 30) s += 8;
  // Opening interest
  s += classifyOpeningInterest(g.eco, sans);
  // Recency
  if (year >= 2024) s += 15;
  else if (year >= 2022) s += 10;
  else if (year >= 2020) s += 5;
  // Decisive checkmate (the very last move is # or game ended in mate)
  const lastSan = sans[sans.length - 1] || '';
  if (lastSan.includes('#')) s += 20;
  // Long game with check sequence at end suggests attacking finish
  if (sans.slice(-6).join(' ').match(/\+/g)?.length >= 2) s += 10;

  return {
    score: s,
    proIsWhite,
    opponent,
    oppRating,
    isNamedOpponent,
    sans,
    year,
    openingLabel: isPgnFamousOpening(sans),
    pgnFull: g.pgn,
  };
}

async function main() {
  const raw = JSON.parse(await readFile(RAW_PATH, 'utf-8'));
  const picks = {};
  const allCandidates = [];

  for (const [slug, profile] of Object.entries(PRO_PROFILES)) {
    const games = raw.pros[slug] || [];
    const scored = [];
    for (const g of games) {
      const s = score(g, profile);
      if (s) scored.push({ slug, profile, game: g, ...s });
    }
    scored.sort((a, b) => b.score - a.score);
    // Pick top 5 but with DIVERSITY by openingLabel — at most 2 per label
    const picked = [];
    const labelCounts = {};
    for (const s of scored) {
      const lc = labelCounts[s.openingLabel] || 0;
      if (lc >= 2) continue;
      if (picked.length >= 5) break;
      picked.push(s);
      labelCounts[s.openingLabel] = lc + 1;
    }
    picks[slug] = picked.map(p => ({
      score: p.score,
      proIsWhite: p.proIsWhite,
      opponent: p.opponent,
      oppRating: p.oppRating,
      isNamedOpponent: p.isNamedOpponent,
      year: p.year,
      openingLabel: p.openingLabel,
      pliesLen: p.sans.length,
      lastSan: p.sans.at(-1),
      sourceUrl: p.game.sourceUrl,
      result: p.game.result,
      date: p.game.date,
      timeControl: p.game.timeControl,
      whiteUser: p.game.white,
      blackUser: p.game.black,
      whiteRating: p.game.whiteRating,
      blackRating: p.game.blackRating,
      firstSans: p.sans.slice(0, 14).join(' '),
      sans: p.sans.join(' '),
    }));
    allCandidates.push({ slug, profile: profile.display, totalScored: scored.length, picked: picked.length });
  }

  const summary = allCandidates.map(c => `${c.profile}: ${c.totalScored} wins scored, picked ${c.picked}`);
  await writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), summary, picks }, null, 2));

  console.log('\n=== PICKS SUMMARY ===');
  for (const c of allCandidates) console.log(`  ${c.profile}: ${c.totalScored} wins → picked ${c.picked}`);
  console.log('');
  console.log('=== DETAIL ===');
  for (const [slug, list] of Object.entries(picks)) {
    if (list.length === 0) { console.log(`\n${PRO_PROFILES[slug].display}: NO PICKS`); continue; }
    console.log(`\n${PRO_PROFILES[slug].display}:`);
    for (const p of list) {
      const side = p.proIsWhite ? 'W' : 'B';
      console.log(`  [${p.score}] ${side} vs ${p.opponent} (${p.oppRating}) — ${p.openingLabel} — ${p.year} ${p.timeControl} — ${p.pliesLen} plies — ${p.lastSan}`);
      console.log(`    ${p.sourceUrl}`);
      console.log(`    ${p.firstSans}...`);
    }
  }
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
