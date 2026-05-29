#!/usr/bin/env node
// Generalized trap miner — color-aware. Supersedes the per-opening
// mine-alapin-traps.mjs / mine-kid-traps.mjs copies. Scans Naroditsky's
// chess.com corpus for opponent blunders that he punished concretely,
// in the opening the caller names.
//
// Usage:
//   node scripts/pro-repertoire/mine-traps.mjs <openingKey>
//   node scripts/pro-repertoire/mine-traps.mjs najdorf alekhine kia ...
//
// Output per opening:
//   data/sources/danielnaroditsky-<openingKey>-trap-candidates.json
//
// Method (identical to the Alapin reference, generalized for color):
//   1. Filter games to Naroditsky-as-<studentColor> WINS in the opening
//      (matched by a SAN prefix).
//   2. Replay ply-by-ply tracking material from the STUDENT's perspective.
//   3. Find an OPPONENT move that drops ≥3 of the opponent's material
//      within a 5-ply punishment window, in the move 4-25 band.
//   4. The trap starts at the position BEFORE the blunder; record the
//      blunder + punishment + the full prefix.
//   5. Group by (positionFen :: blunderSan) — same key across many games
//      means many opponents fell into the same trap = strong candidate.
//   6. Write candidates occurring in ≥2 games, sorted by frequency.

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// openingKey -> { color, prefix }. Prefix is the minimal identifying SAN
// sequence. studentColor = the side Naroditsky plays.
const OPENINGS = {
  najdorf: {
    color: 'black',
    // Open Sicilian Najdorf: ...d6, ...Nf6, ...a6 against the Open
    prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  },
  alekhine: {
    color: 'black',
    prefix: ['e4', 'Nf6', 'e5', 'Nd5'],
  },
  kia: {
    color: 'white',
    // King's Indian Attack — the g3/Bg2/d3 reversed-KID setup via Nf3.
    prefix: ['Nf3', 'Nf6', 'g3'],
  },
  rossolimo: {
    color: 'white',
    // Anti-Sicilian Bb5: Rossolimo (2...Nc6 3.Bb5) + Moscow (2...d6 3.Bb5+).
    // Two prefixes — handled below by the matchesAny helper.
    prefixes: [
      ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'],
      ['e4', 'c5', 'Nf3', 'd6', 'Bb5+'],
    ],
  },
  jobava: {
    color: 'white',
    prefix: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4'],
  },
  ruy: {
    color: 'white',
    prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
  },
};

function pgnToSan(pgnText) {
  const i = pgnText.search(/\n\n/);
  if (i < 0) return null;
  let b = pgnText.slice(i).replace(/\{[^}]*\}/g, '');
  let prev;
  do {
    prev = b;
    b = b.replace(/\([^()]*\)/g, '');
  } while (b !== prev);
  b = b
    .replace(/\b\d+\.+\s*/g, '')
    .replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
    .trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}

function matches(moves, prefix) {
  if (moves.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (moves[i] !== prefix[i]) return false;
  return true;
}

function matchesAny(moves, cfg) {
  if (cfg.prefixes) return cfg.prefixes.some((p) => matches(moves, p));
  return matches(moves, cfg.prefix);
}

function materialBalance(chess) {
  let white = 0;
  let black = 0;
  for (const p of chess.board().flat().filter(Boolean)) {
    const v = PIECE_VALUE[p.type] ?? 0;
    if (p.color === 'w') white += v;
    else black += v;
  }
  // diff from the STUDENT's perspective is applied by the caller
  return { white, black };
}

function mineOpening(openingKey) {
  const cfg = OPENINGS[openingKey];
  if (!cfg) {
    console.error(`Unknown opening "${openingKey}". Known: ${Object.keys(OPENINGS).join(', ')}`);
    return;
  }
  const studentIsWhite = cfg.color === 'white';
  const wantResult = studentIsWhite ? '1-0' : '0-1';

  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl'));
  let totalGames = 0;
  let openingGames = 0;
  let blundersFound = 0;
  const trapsByPattern = new Map();

  for (const f of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      let g;
      try {
        g = JSON.parse(line);
      } catch {
        continue;
      }
      totalGames++;
      if (!g.pgn) continue;
      const naroIsWhite = (g.white?.username || '').toLowerCase() === 'danielnaroditsky';
      const naroIsBlack = (g.black?.username || '').toLowerCase() === 'danielnaroditsky';
      if (studentIsWhite ? !naroIsWhite : !naroIsBlack) continue;
      const result = g.pgn.match(/\[Result "([^"]+)"\]/)?.[1];
      if (result !== wantResult) continue;
      const moves = pgnToSan(g.pgn);
      if (!moves || !matchesAny(moves, cfg)) continue;
      openingGames++;

      const opp = studentIsWhite ? g.black : g.white;

      // Replay tracking material from the STUDENT's perspective. We look
      // for an OPPONENT move that loses ≥3 student-favoured material within
      // 5 plies. studentMoveParity: white moves are even plies (0,2,...),
      // black moves are odd. The opponent's move parity is the opposite.
      const chess = new Chess();
      let lastDiff = 0; // student - opponent
      const oppMoveIsParity = studentIsWhite ? 1 : 0; // opponent moves on these plies

      for (let ply = 0; ply < moves.length - 1; ply++) {
        try {
          chess.move(moves[ply]);
        } catch {
          break;
        }
        const { white, black } = materialBalance(chess);
        const diff = studentIsWhite ? white - black : black - white;
        const isOpponentMove = ply % 2 === oppMoveIsParity;
        if (!isOpponentMove) {
          lastDiff = diff;
          continue;
        }
        // Opponent just moved. Look ahead up to 5 plies; find the best
        // student-favoured swing.
        const clone = new Chess(chess.fen());
        let swing = diff;
        for (let k = 1; k <= 5 && ply + k < moves.length; k++) {
          try {
            clone.move(moves[ply + k]);
          } catch {
            break;
          }
          const { white: w2, black: b2 } = materialBalance(clone);
          const d2 = studentIsWhite ? w2 - b2 : b2 - w2;
          if (d2 > swing) swing = d2;
        }
        const cliff = swing - lastDiff;
        if (cliff >= 3 && ply >= 6 && ply <= 50) {
          const beforeChess = new Chess();
          for (let k = 0; k < ply; k++) beforeChess.move(moves[k]);
          const beforeFen = beforeChess.fen();
          const blunderSan = moves[ply];
          const punish = moves.slice(ply, ply + 7);
          const key = `${beforeFen}::${blunderSan}`;
          if (!trapsByPattern.has(key)) trapsByPattern.set(key, []);
          trapsByPattern.get(key).push({
            url: g.url,
            opponent: opp?.username,
            opponentRating: opp?.rating,
            ply,
            cliff,
            punish,
            prefixMoves: moves.slice(0, ply),
          });
          blundersFound++;
          break; // one trap per game
        }
        lastDiff = diff;
      }
    }
  }

  console.log(
    `[${openingKey}] scanned ${totalGames} games; ${openingGames} are Naroditsky-${cfg.color} wins; ` +
      `${blundersFound} blunder positions; ${trapsByPattern.size} unique patterns.`,
  );

  const sorted = [...trapsByPattern.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log(`\n=== [${openingKey}] TOP TRAP PATTERNS (≥3 games) ===`);
  let printed = 0;
  for (const [key, games] of sorted) {
    if (games.length < 3) continue;
    if (printed >= 12) break;
    const [beforeFen, blunderSan] = key.split('::');
    const sample = games[0];
    const moveNum = Math.ceil((sample.ply + 1) / 2);
    console.log(`#${printed + 1} — ${games.length} games — opp blunder ${blunderSan} at move ${moveNum}`);
    console.log(`  prefix:  ${sample.prefixMoves.join(' ')}`);
    console.log(`  punish:  ${sample.punish.join(' ')}`);
    const tops = games
      .filter((x) => x.opponentRating)
      .sort((a, b) => b.opponentRating - a.opponentRating)
      .slice(0, 3);
    for (const ex of tops) console.log(`    vs ${ex.opponent} (${ex.opponentRating}) — ${ex.url}`);
    console.log();
    printed++;
  }

  const out = `data/sources/danielnaroditsky-${openingKey}-trap-candidates.json`;
  fs.writeFileSync(
    out,
    JSON.stringify(
      sorted
        .filter(([, games]) => games.length >= 2)
        .map(([key, games]) => {
          const [beforeFen, blunderSan] = key.split('::');
          // sort samples by opponent rating desc so authoring sees the
          // strongest victims first
          const samples = [...games].sort(
            (a, b) => (b.opponentRating || 0) - (a.opponentRating || 0),
          );
          return { beforeFen, blunderSan, count: games.length, samples: samples.slice(0, 6) };
        }),
      null,
      2,
    ),
  );
  console.log(`[${openingKey}] candidates (≥2 games) → ${out}\n`);
}

const args = process.argv.slice(2);
const keys = args.length ? args : Object.keys(OPENINGS);
for (const k of keys) mineOpening(k);
