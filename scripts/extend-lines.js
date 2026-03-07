/**
 * extend-lines.js
 *
 * Reads repertoire.json, extends main-line PGNs, extends hand-curated
 * variation PGNs, adds trapLines arrays, then writes the result back.
 *
 * Every PGN is validated move-by-move through chess.js.
 *
 * Usage:  node scripts/extend-lines.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPERTOIRE_PATH = path.resolve(
  __dirname,
  '../src/data/repertoire.json'
);

// ---------------------------------------------------------------------------
// 1. Main-line PGN extensions  (id -> new pgn)
// ---------------------------------------------------------------------------
const MAIN_LINE_EXTENSIONS = {
  'vienna-game':
    'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 O-O Nf3 d6 O-O',
  'vienna-gambit':
    'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 d3 Qh4+ g3 Nxg3 Nf3 Qh5 Nxd5',
  'scotch-game':
    'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O d6',
  'scotch-gambit':
    'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5',
  'bishops-opening':
    'e4 e5 Bc4 Nf6 d3 Bc5 Nf3 d6 O-O O-O c3',
  'evans-gambit':
    'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6',
  'kings-gambit':
    'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 d4 d6 Nd3 Nxe4 Bxf4 Bg7 Be2 O-O O-O',
  'danish-gambit':
    'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d6 Nf3 Nf6 O-O Be7 Nc3',
  'italian-giuoco-piano':
    'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O',
  'two-knights':
    'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6',
  'fried-liver-attack':
    'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4 O-O c6 d4',
  'reti-opening':
    'Nf3 d5 c4 d4 e3 Nc6 exd4 Nxd4 Nxd4 Qxd4 Nc3 e5 d3 Nf6 Be2 Bc5 O-O O-O',
  'london-system':
    'd4 Nf6 Nf3 d5 Bf4 c5 e3 Nc6 c3 Qb6 Qb3 c4 Qc2 Bf5 Qxf5',
  'jobava-london':
    'd4 Nf6 Nc3 d5 Bf4 c5 e3 a6 Nf3 Nc6 Be2 cxd4 exd4 Bf5 O-O e6 Re1 Be7',
  'queens-gambit':
    'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5',
  'catalan-opening':
    'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4',
  'kings-indian-attack':
    'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4 d3 Nbd7 Nbd2 e5 e4 Be7 Re1',
  'trompowsky-attack':
    'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5 Bd3 Nc6 c3 Nf6 Nf3 Bg4 Nbd2 e6 O-O Be7',
  'birds-opening':
    'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5 c3',
  'goring-gambit':
    'e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Bb4 Bc4 d6 O-O Nf6 Nd5',
  'sicilian-black-lion':
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Be2 e5 Nb3 Be7 O-O O-O Be3',
  'sicilian-najdorf':
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3',
  'sicilian-dragon':
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4',
  'caro-kann':
    'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7',
  'french-defence':
    'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O Nf3 Nbc6 Bd3 f5 Qg3',
  'pirc-modern':
    'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 Be3 e5 dxe5 dxe5',
  'scandinavian-defence':
    'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4 O-O-O Nbd7',
  'kings-indian-defence':
    'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7',
  'nimzo-indian':
    'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6 Bg5 Bb7 e3',
  'grunfeld-defence':
    'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1',
  'dutch-defence':
    'd4 f5 c4 Nf6 g3 e6 Bg2 Be7 Nf3 O-O O-O d5 b3 c6 Bb2',
  'queens-indian':
    'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3',
  'budapest-gambit':
    'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 Nxe5 Nxe5 e3 Be7',
  'benko-gambit':
    'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 Nf3 Bg7 g3 O-O Kg2',
  'benoni-defence':
    'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O O-O Re8 Nd2 Na6',
  'old-indian-defence':
    'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4 Be7 Be2 O-O O-O c6 d5',
  'alekhine-defence':
    'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 d5',
  'philidor-defence':
    'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O a4 c6 Re1 exd4 Nxd4',
  'owens-defence':
    'e4 b6 d4 Bb7 Nc3 e6 Nf3 Bb4 Bd3 Nf6 O-O O-O Bg5 d6 Qe2',
  'leningrad-dutch':
    'd4 f5 c4 Nf6 g3 g6 Bg2 Bg7 Nf3 O-O O-O d6 Nc3 c6 d5',
};

// ---------------------------------------------------------------------------
// 2. Variation PGN extensions  (openingId -> [{ name, pgn }])
// ---------------------------------------------------------------------------
const VARIATION_EXTENSIONS = {
  'vienna-game': [
    {
      name: 'Vienna Gambit',
      pgn: 'e4 e5 Nc3 Nf6 f4 exf4 d4 d5 exd5 Nxd5 Nxd5 Qxd5 Bxf4 Be7 Nf3 O-O Bd3',
    },
    {
      name: 'Vienna Game: Stanley Variation',
      pgn: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 Nf3 O-O O-O Bg4 Na4 Bb6 Nxb6 axb6',
    },
    {
      name: 'Vienna Game vs 2...Nc6',
      pgn: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6 O-O h6 Bxf4 gxf4',
    },
  ],
  'bishops-opening': [
    {
      name: 'Urusov Gambit',
      pgn: 'e4 e5 Bc4 Nf6 d4 exd4 Nf3 d5 exd5 Bb4+ c3 dxc3 bxc3 Ba5 O-O Nxd5 Qb3',
    },
    {
      name: 'Vienna Hybrid',
      pgn: 'e4 e5 Bc4 Nf6 Nc3 Bc5 d3 O-O f4 d6 Nf3 Nc6 Na4 Bb6 Nxb6 axb6 O-O',
    },
    {
      name: 'Classical Variation',
      pgn: 'e4 e5 Bc4 Bc5 Nf3 Nf6 d3 Nc6 c3 d6 Bb3 a5 O-O O-O Nbd2 Be6 Re1',
    },
  ],
  'vienna-gambit': [
    {
      name: 'Gambit Declined: 3...d5',
      pgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 d3 Nc5 d4 Ne6 Nf3 Be7 Bd3 O-O O-O c5',
    },
  ],
  'danish-gambit': [
    {
      name: 'Danish Gambit Declined',
      pgn: 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Be2 Bb4+ Nc3 Bxf3 Bxf3 Qc4 O-O',
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Trap lines  (openingId -> trapLines array)
// ---------------------------------------------------------------------------
const TRAP_LINES = {
  'vienna-game': [
    {
      name: 'Vienna Trap (Nd5 wins)',
      pgn: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8',
      explanation:
        "After Black takes on e4, White plays Qh5 creating threats. If Black doesn't find the best defense, Nd5 or Nxc7 wins material.",
    },
    {
      name: 'Frankenstein-Dracula Attack',
      pgn: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7 Nf3 Nc6 Nxe5 g6 Qe2 Nxe5 d4',
      explanation:
        "The Frankenstein-Dracula variation leads to wild tactics. White sacrifices material for a dangerous attack against Black's king.",
    },
  ],
  'italian-giuoco-piano': [
    {
      name: "Legal's Mate Trap",
      pgn: 'e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5 Nxe5 Bxd1 Bxf7+ Ke7 Nd5',
      explanation:
        "The classic Legal's Mate trap. White sacrifices the queen but delivers checkmate with minor pieces. Even if Black avoids mate, White wins material.",
    },
    {
      name: 'Fried Liver Preview',
      pgn: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4 O-O c6 d4',
      explanation:
        "The Fried Liver Attack sacrifices a knight on f7 to expose Black's king. White gets a powerful attack with Qf3+ forcing the king into the center.",
    },
  ],
  'queens-gambit': [
    {
      name: 'Elephant Trap',
      pgn: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8',
      explanation:
        'The Elephant Trap in the QGD. If White captures too eagerly with Nxd5, Black wins the queen with the Bb4+ pin.',
    },
  ],
  'caro-kann': [
    {
      name: 'Advance Variation Trap',
      pgn: 'e4 c6 d4 d5 e5 Bf5 Bd3 Bxd3 Qxd3 e6 Nf3 Qa5+ Nbd2 Qa6 Qxa6 Nxa6',
      explanation:
        "In the Advance Variation, Black's bishop comes out before the pawns close the position. The queen trade leads to a solid position for Black.",
    },
  ],
  'french-defence': [
    {
      name: 'Winawer Poisoned Pawn',
      pgn: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4 Ne2 Nbc6 f4 Bd7 Qd3',
      explanation:
        'The Poisoned Pawn in the Winawer. White takes on g7 but Black gets strong counterplay with central pressure and queenside attack.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate a space-separated move string by playing each move through
 * chess.js. Returns { valid: true } or { valid: false, error: string }.
 */
function validatePgn(pgn, label) {
  const chess = new Chess();
  const moves = pgn.trim().split(/\s+/);

  for (let i = 0; i < moves.length; i++) {
    try {
      chess.move(moves[i]);
    } catch {
      return {
        valid: false,
        error: '[' + label + '] Illegal move "' + moves[i] + '" at index ' + i +
               ' (after: ' + moves.slice(0, i).join(' ') + ')',
      };
    }
  }
  return { valid: true };
}

/**
 * Insert trapLines right after the warnings key in an opening object,
 * preserving key order.
 */
function insertTrapLines(opening, trapLines) {
  const result = {};
  for (const key of Object.keys(opening)) {
    result[key] = opening[key];
    if (key === 'warnings') {
      result.trapLines = trapLines;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const raw = fs.readFileSync(REPERTOIRE_PATH, 'utf-8');
  const repertoire = JSON.parse(raw);

  let updatedCount = 0;
  let variationCount = 0;
  let trapCount = 0;
  let errorCount = 0;

  // Build a map by id for quick access
  const byId = new Map();
  repertoire.forEach((o, i) => byId.set(o.id, i));

  // --- Apply main-line extensions ---
  for (const [id, newPgn] of Object.entries(MAIN_LINE_EXTENSIONS)) {
    const idx = byId.get(id);
    if (idx === undefined) {
      console.error('ERROR: Opening "' + id + '" not found in repertoire -- skipping main-line extension.');
      errorCount++;
      continue;
    }
    const check = validatePgn(newPgn, 'main:' + id);
    if (!check.valid) {
      console.error(check.error);
      errorCount++;
      continue;
    }
    repertoire[idx].pgn = newPgn;
    updatedCount++;
    console.log('  main-line updated: ' + id);
  }

  // --- Apply variation extensions ---
  for (const [id, varUpdates] of Object.entries(VARIATION_EXTENSIONS)) {
    const idx = byId.get(id);
    if (idx === undefined) {
      console.error('ERROR: Opening "' + id + '" not found -- skipping variation extensions.');
      errorCount++;
      continue;
    }
    const opening = repertoire[idx];

    for (const vu of varUpdates) {
      const varIdx = opening.variations.findIndex((v) => v.name === vu.name);
      if (varIdx === -1) {
        console.error('ERROR: Variation "' + vu.name + '" not found in "' + id + '" -- skipping.');
        errorCount++;
        continue;
      }
      const check = validatePgn(vu.pgn, 'var:' + id + '/' + vu.name);
      if (!check.valid) {
        console.error(check.error);
        errorCount++;
        continue;
      }
      opening.variations[varIdx].pgn = vu.pgn;
      variationCount++;
      console.log('  variation updated: ' + id + ' -> ' + vu.name);
    }
  }

  // --- Add trap lines ---
  for (const [id, traps] of Object.entries(TRAP_LINES)) {
    const idx = byId.get(id);
    if (idx === undefined) {
      console.error('ERROR: Opening "' + id + '" not found -- skipping trap lines.');
      errorCount++;
      continue;
    }

    // Validate every trap PGN
    let allValid = true;
    for (const trap of traps) {
      const check = validatePgn(trap.pgn, 'trap:' + id + '/' + trap.name);
      if (!check.valid) {
        console.error(check.error);
        errorCount++;
        allValid = false;
      }
    }
    if (!allValid) {
      console.error('  Skipping trapLines for "' + id + '" due to validation errors.');
      continue;
    }

    repertoire[idx] = insertTrapLines(repertoire[idx], traps);
    trapCount++;
    console.log('  trapLines added: ' + id + ' (' + traps.length + ' traps)');
  }

  // --- Write back ---
  fs.writeFileSync(REPERTOIRE_PATH, JSON.stringify(repertoire, null, 2) + '\n', 'utf-8');

  console.log('\n--- Summary ---');
  console.log('Main lines updated:  ' + updatedCount);
  console.log('Variations updated:  ' + variationCount);
  console.log('Trap lines added:    ' + trapCount);
  console.log('Errors:              ' + errorCount);

  if (errorCount > 0) {
    console.log('\nNote: Errors above were logged and those PGNs were skipped. All valid updates were applied.');
    process.exit(1);
  }
}

main();
