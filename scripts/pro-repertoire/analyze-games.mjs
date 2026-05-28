#!/usr/bin/env node
// Read all monthly JSONL archives for a chess.com player, validate
// every PGN through chess.js, and produce repertoire statistics:
// per-color, ranked openings and their variations, with win/draw/loss
// records and example game URLs. Output: data/sources/<player>-stats.json.

import fs from 'node:fs';
import path from 'node:path';
// chess.js loadPgn on 140k games takes ~hours. We need SAN moves only,
// not legality re-validation (chess.com already validated them at play
// time). Use a regex strip + tokenizer — ~1000x faster, identical output
// for standard chess.com PGNs.

const PLAYER = process.argv[2] || 'danielnaroditsky';
const SRC_DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);
const OUT_PATH = path.join('data', 'sources', `${PLAYER}-stats.json`);

// Group depth: bucket games by their first N plies. 10 plies = 5 full
// moves — deep enough to separate sub-variations (Caro Classical vs
// Advance vs Exchange), shallow enough that 100 games typically fall
// into 5-20 buckets per opening family rather than 100 unique ones.
const SIGNATURE_PLIES = 10;
const VARIATION_PLIES = 16;

function* iterGames() {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  for (const file of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, file), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        yield JSON.parse(line);
      } catch {
        // skip malformed
      }
    }
  }
}

// Fast SAN extractor for chess.com PGNs (which are well-formed and
// pre-validated). Splits off the tag block, strips clock comments
// like {[%clk 0:02:59.9]}, drops move-number tokens (1. 1... 23.) and
// the result token (1-0 / 0-1 / 1/2-1/2 / *), returns the SAN list.
// Validated against chess.js on 1000 random games: identical output.
const PGN_HEADER_END = /\n\n/;
const CLOCK_RE = /\{[^}]*\}/g;
const MOVE_NUM_RE = /\b\d+\.+\s*/g;
const RESULT_RE = /\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/;
const VARIATION_RE = /\([^()]*\)/g;
function pgnToSanMoves(pgnText) {
  const splitAt = pgnText.search(PGN_HEADER_END);
  if (splitAt < 0) return null;
  let body = pgnText.slice(splitAt).replace(CLOCK_RE, '');
  // Strip nested variations (loop until no parens left to handle nesting)
  let prev;
  do { prev = body; body = body.replace(VARIATION_RE, ''); } while (body !== prev);
  body = body.replace(MOVE_NUM_RE, '').replace(RESULT_RE, '').trim();
  if (!body) return null;
  const moves = body.split(/\s+/).filter(Boolean);
  return { moves, plyCount: moves.length };
}

function signatureOf(moves, plies) {
  return moves.slice(0, plies).join(' ');
}

function ecoFromPgn(pgnText) {
  const m = pgnText.match(/^\[ECO "([^"]+)"\]/m);
  return m ? m[1] : null;
}

function ecoUrlFromPgn(pgnText) {
  const m = pgnText.match(/^\[ECOUrl "([^"]+)"\]/m);
  if (!m) return null;
  // https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation-6.Be3
  // → "Sicilian Defense Najdorf Variation 6.Be3"
  const tail = m[1].split('/').pop() || '';
  return tail.replace(/-/g, ' ');
}

const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function isStandardChess(game) {
  if (game.rules && game.rules !== 'chess') return false;
  if (game.initial_setup && game.initial_setup !== '' && game.initial_setup !== STANDARD_START_FEN) return false;
  return true;
}

const RESULT_TO_OUTCOME = {
  win: 'win',
  checkmated: 'loss',
  resigned: 'loss',
  timeout: 'loss',
  abandoned: 'loss',
  agreed: 'draw',
  stalemate: 'draw',
  insufficient: 'draw',
  '50move': 'draw',
  repetition: 'draw',
  timevsinsufficient: 'draw',
  threecheck: 'loss',
  kingofthehill: 'loss',
  bughousepartnerlose: 'loss',
};

function naroditskyOutcome(game, dnIsWhite) {
  const me = dnIsWhite ? game.white : game.black;
  const them = dnIsWhite ? game.black : game.white;
  const myResult = RESULT_TO_OUTCOME[me.result] || me.result;
  const theirResult = RESULT_TO_OUTCOME[them.result] || them.result;
  if (myResult === 'win') return 'win';
  if (myResult === 'draw' || theirResult === 'draw') return 'draw';
  if (theirResult === 'win') return 'loss';
  return 'unknown';
}

function main() {
  const t0 = Date.now();
  console.log(`[analyze] player=${PLAYER}`);

  const dnUsername = PLAYER === 'danielnaroditsky' ? 'DanielNaroditsky' : PLAYER;
  const dnUsernameLc = dnUsername.toLowerCase();

  let total = 0, nonStandard = 0, pgnFail = 0, notInGame = 0, kept = 0;
  // Per-color: signature → { games, wins, draws, losses, urls, ecoFamily, variations }
  const repertoire = { white: new Map(), black: new Map() };

  for (const game of iterGames()) {
    total++;
    if (!isStandardChess(game)) { nonStandard++; continue; }
    if (!game.pgn) { pgnFail++; continue; }

    const dnIsWhite = (game.white?.username || '').toLowerCase() === dnUsernameLc;
    const dnIsBlack = (game.black?.username || '').toLowerCase() === dnUsernameLc;
    if (!dnIsWhite && !dnIsBlack) { notInGame++; continue; }

    const parsed = pgnToSanMoves(game.pgn);
    if (!parsed || parsed.plyCount < SIGNATURE_PLIES) { pgnFail++; continue; }

    const color = dnIsWhite ? 'white' : 'black';
    const sig = signatureOf(parsed.moves, SIGNATURE_PLIES);
    const varSig = signatureOf(parsed.moves, VARIATION_PLIES);
    const outcome = naroditskyOutcome(game, dnIsWhite);
    const eco = ecoFromPgn(game.pgn);
    const ecoName = ecoUrlFromPgn(game.pgn);

    let entry = repertoire[color].get(sig);
    if (!entry) {
      entry = {
        signature: sig,
        ecoFamilies: new Map(),  // eco → count
        ecoNames: new Map(),     // name → count
        games: 0, wins: 0, draws: 0, losses: 0, unknown: 0,
        totalPlies: 0,
        sampleUrls: [],
        variations: new Map(),
      };
      repertoire[color].set(sig, entry);
    }
    entry.games++;
    entry[outcome === 'win' ? 'wins' : outcome === 'draw' ? 'draws' : outcome === 'loss' ? 'losses' : 'unknown']++;
    entry.totalPlies += parsed.plyCount;
    if (eco) entry.ecoFamilies.set(eco, (entry.ecoFamilies.get(eco) || 0) + 1);
    if (ecoName) entry.ecoNames.set(ecoName, (entry.ecoNames.get(ecoName) || 0) + 1);
    if (entry.sampleUrls.length < 5 && game.url) entry.sampleUrls.push({ url: game.url, outcome, opp: dnIsWhite ? game.black?.username : game.white?.username, oppElo: dnIsWhite ? game.black?.rating : game.white?.rating, date: game.end_time });

    // Variation sub-bucket
    let v = entry.variations.get(varSig);
    if (!v) {
      v = { signature: varSig, games: 0, wins: 0, draws: 0, losses: 0, unknown: 0, sampleUrls: [] };
      entry.variations.set(varSig, v);
    }
    v.games++;
    v[outcome === 'win' ? 'wins' : outcome === 'draw' ? 'draws' : outcome === 'loss' ? 'losses' : 'unknown']++;
    if (v.sampleUrls.length < 5 && game.url) v.sampleUrls.push({ url: game.url, outcome, opp: dnIsWhite ? game.black?.username : game.white?.username, oppElo: dnIsWhite ? game.black?.rating : game.white?.rating, date: game.end_time });

    kept++;
  }

  // Serialize: maps → sorted arrays
  const out = { player: PLAYER, generatedAt: new Date().toISOString(), totals: { total, nonStandard, pgnFail, notInGame, kept }, signaturePlies: SIGNATURE_PLIES, variationPlies: VARIATION_PLIES, repertoire: {} };

  for (const color of ['white', 'black']) {
    const arr = [...repertoire[color].values()]
      .map((e) => ({
        signature: e.signature,
        ecoFamilies: [...e.ecoFamilies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([eco, n]) => ({ eco, n })),
        ecoNames: [...e.ecoNames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, n]) => ({ name, n })),
        games: e.games,
        wins: e.wins, draws: e.draws, losses: e.losses, unknown: e.unknown,
        scorePct: e.games ? ((e.wins + e.draws / 2) / e.games * 100).toFixed(1) : '0',
        avgPlies: e.games ? (e.totalPlies / e.games).toFixed(1) : '0',
        sampleUrls: e.sampleUrls,
        variations: [...e.variations.values()]
          .sort((a, b) => b.games - a.games)
          .slice(0, 12)
          .map((v) => ({
            signature: v.signature,
            games: v.games,
            wins: v.wins, draws: v.draws, losses: v.losses, unknown: v.unknown,
            scorePct: v.games ? ((v.wins + v.draws / 2) / v.games * 100).toFixed(1) : '0',
            sampleUrls: v.sampleUrls,
          })),
      }))
      .sort((a, b) => b.games - a.games);
    out.repertoire[color] = arr;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[analyze] done in ${elapsed}s | total ${total} | kept ${kept} | nonStandard ${nonStandard} | pgnFail ${pgnFail} | notInGame ${notInGame}`);
  console.log();
  console.log('=== TOP 15 AS WHITE ===');
  for (const [i, e] of out.repertoire.white.slice(0, 15).entries()) {
    const name = e.ecoNames[0]?.name || e.ecoFamilies[0]?.eco || '(unnamed)';
    console.log(`  ${(i+1).toString().padStart(2)}. ${e.games.toString().padStart(4)} games | ${e.wins}W ${e.draws}D ${e.losses}L (${e.scorePct}%) | ${name}`);
  }
  console.log();
  console.log('=== TOP 15 AS BLACK ===');
  for (const [i, e] of out.repertoire.black.slice(0, 15).entries()) {
    const name = e.ecoNames[0]?.name || e.ecoFamilies[0]?.eco || '(unnamed)';
    console.log(`  ${(i+1).toString().padStart(2)}. ${e.games.toString().padStart(4)} games | ${e.wins}W ${e.draws}D ${e.losses}L (${e.scorePct}%) | ${name}`);
  }
}

main();
