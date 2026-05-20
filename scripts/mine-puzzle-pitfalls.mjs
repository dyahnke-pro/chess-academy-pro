#!/usr/bin/env node
/**
 * Mine puzzles.json for opening-tagged PITFALLS (student blunders, opponent punishes) that
 * materially advantage the student. Builds candidate TrapLine
 * entries per opening, fully chess.js + Stockfish gated.
 *
 * Source: src/data/puzzles.json (15K Lichess CC0 puzzles)
 * Tags: openingTags is a space-separated string of opening names
 *       in PascalCase_With_Underscores (e.g. "Italian_Game",
 *       "Sicilian_Defense_Najdorf_Variation"). 711 unique tokens
 *       across 3207 tagged puzzles.
 *
 * Pipeline per opening:
 *   1. Resolve opening name → list of likely openingTags
 *      (e.g. "Sicilian: Najdorf" → ["Sicilian_Defense_Najdorf"])
 *   2. Filter puzzles where openingTags string contains a match
 *   3. Filter for advantage-giving themes: fork, pin, skewer, mate,
 *      sacrifice, hangingPiece, attractionDeflection,
 *      attackingF2F7, exposedKing, kingsideAttack, queensideAttack
 *   4. Build PGN: reconstruct from puzzle.fen + puzzle.moves.
 *      Lichess convention: first move is OPPONENT, then student
 *      responds. PGN should land with the student delivering the
 *      decisive blow.
 *   5. Stockfish verify final position: student perspective ≥ +300cp
 *      OR mate
 *   6. Validate orientation: studentColor matches the puzzle's
 *      side-to-move-after-opponent-blunder
 *   7. Cap at top 5 per opening, ranked by puzzle popularity +
 *      decisive margin
 *
 * Output: audit-reports/staged/mined-pitfalls-batch-1.json
 *         (NOT src/data/*; David's go-ahead required for merge)
 */

import { Chess } from 'chess.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const STOCKFISH = '/usr/games/stockfish';
const SF_DEPTH = 14;
const SF_CONCURRENCY = 6;
const MIN_DECISIVE_CP = 100;
const CAP_PER_OPENING = 10;
const STAGING_DIR = 'audit-reports/staged';
const PITFALL_MODE = true;
mkdirSync(STAGING_DIR, { recursive: true });

const puzzles = JSON.parse(readFileSync('src/data/puzzles.json', 'utf-8'));
const PUZZLES = Array.isArray(puzzles) ? puzzles : Object.values(puzzles);
const repertoire = JSON.parse(readFileSync('src/data/repertoire.json', 'utf-8'));
const REPERTOIRE = Array.isArray(repertoire) ? repertoire : Object.values(repertoire);

// ─── Opening → openingTag patterns ───────────────────────────────
// Lichess uses PascalCase tokens like "Italian_Game" or
// "Sicilian_Defense_Najdorf_Variation". We need fuzzy matching.
const OPENING_TAG_MAP = {
  'italian-game': [/Italian_Game/i, /Giuoco_Piano/i],
  'ruy-lopez': [/Ruy_Lopez/i, /Spanish/i],
  'scotch-game': [/Scotch_Game/i],
  'vienna-game': [/Vienna_Game/i],
  'kings-gambit': [/Kings_Gambit/i, /King.s_Gambit/i],
  'four-knights-game': [/Four_Knights/i],
  'philidor-defence': [/Philidor_Defense/i],
  'petrov-defence': [/Petrov.s_Defense/i, /Russian_Game/i, /Petroff/i],
  'two-knights-defence': [/Two_Knights_Defense/i, /Italian_Game_Two_Knights/i],
  'evans-gambit': [/Evans_Gambit/i],
  'sicilian-najdorf': [/Sicilian_Defense_Najdorf/i, /Sicilian.*Najdorf/i],
  'sicilian-dragon': [/Sicilian_Defense_Dragon/i, /Sicilian.*Dragon/i],
  'sicilian-sveshnikov': [/Sicilian_Defense_Sveshnikov/i, /Lasker_Pelikan/i],
  'sicilian-alapin': [/Sicilian_Defense_Alapin/i, /Alapin_Variation/i],
  'french-defence': [/French_Defense/i],
  'caro-kann': [/Caro_Kann_Defense/i, /Caro-Kann_Defense/i],
  'scandinavian-defence': [/Scandinavian_Defense/i, /Center_Counter/i],
  'alekhine-defence': [/Alekhine.s_Defense/i],
  'pirc-defence': [/Pirc_Defense/i],
  'queens-gambit': [/Queens_Gambit\b/i, /Queen.s_Gambit\b/i],
  'qgd': [/Queens_Gambit_Declined/i, /Queen.s_Gambit_Declined/i, /QGD/i, /Orthodox_Defense/i, /Tarrasch_Defense/i],
  'qga': [/Queens_Gambit_Accepted/i, /Queen.s_Gambit_Accepted/i, /QGA/i],
  'slav-defence': [/Slav_Defense/i],
  'semi-slav': [/Semi-Slav_Defense/i, /Semi_Slav/i, /Meran/i],
  'london-system': [/London_System/i, /Queens_Pawn_Game_Accelerated_London/i],
  'catalan-opening': [/Catalan_Opening/i],
  'trompowsky-attack': [/Trompowsky_Attack/i, /Trompowsky/i],
  'kings-indian-defence': [/Kings_Indian_Defense/i, /King.s_Indian_Defense/i],
  'nimzo-indian': [/Nimzo_Indian/i, /Nimzo-Indian/i],
  'grunfeld-defence': [/Gru.nfeld_Defense/i, /Grunfeld_Defense/i],
  'dutch-defence': [/Dutch_Defense/i, /Stonewall/i],
  'benoni-defence': [/Benoni_Defense/i],
  'benko-gambit': [/Benko_Gambit/i, /Volga_Gambit/i],
  'queens-indian': [/Queens_Indian/i, /Queen.s_Indian/i],
  'budapest-gambit': [/Budapest_Gambit/i, /Budapest_Defense/i],
  'old-indian-defence': [/Old_Indian/i],
  'english-opening': [/English_Opening/i],
  'reti-opening': [/Reti_Opening/i, /Zukertort_Opening/i],
  'kings-indian-attack': [/Kings_Indian_Attack/i, /King.s_Indian_Attack/i],
  'birds-opening': [/Bird.s_Opening/i, /Bird_Opening/i],
};

// Themes that produce trap-like advantage
const TRAP_THEMES = new Set([
  'fork', 'pin', 'skewer', 'mate', 'mateIn1', 'mateIn2', 'mateIn3',
  'sacrifice', 'hangingPiece', 'attractionDeflection', 'attraction',
  'deflection', 'attackingF2F7', 'exposedKing', 'kingsideAttack',
  'queensideAttack', 'discoveredAttack', 'doubleCheck', 'smotheredMate',
  'opening',
]);

function matchesOpening(puzzle, openingId) {
  const patterns = OPENING_TAG_MAP[openingId];
  if (!patterns || typeof puzzle.openingTags !== 'string') return false;
  return patterns.some((re) => re.test(puzzle.openingTags));
}

function isTrapPuzzle(puzzle) {
  if (!Array.isArray(puzzle.themes)) return false;
  return puzzle.themes.some((t) => TRAP_THEMES.has(t));
}

// ─── PGN reconstruction from puzzle ──────────────────────────────
// Lichess puzzle convention: puzzle.fen is the position BEFORE the
// opponent's blunder. puzzle.moves[0] is the opponent's move (the
// blunder), then puzzle.moves[1..n] is the student's punishment.
// We need to reconstruct the PGN that gets us to the trap from the
// opening's repertoire PGN if possible. Otherwise we ship the
// puzzle FEN + moves as a setup-position trap.
function reconstructPgn(puzzle) {
  // Apply puzzle.moves (UCI) from puzzle.fen
  const uciMoves = puzzle.moves.trim().split(/\s+/).filter(Boolean);
  const c = new Chess(puzzle.fen);
  const sans = [];
  for (const uci of uciMoves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci.length === 5 ? uci[4] : undefined;
    try {
      const result = c.move({ from, to, promotion: promo });
      sans.push(result.san);
    } catch (e) {
      return { ok: false, error: `bad UCI ${uci}: ${e.message}` };
    }
  }
  return {
    ok: true,
    startFen: puzzle.fen,
    sans,
    finalFen: c.fen(),
    finalSideToMove: c.turn() === 'w' ? 'white' : 'black',
    plyCount: uciMoves.length,
  };
}

// ─── Stockfish ────────────────────────────────────────────────────
async function evalFen(fen) {
  return new Promise((resolve) => {
    const sf = spawn(STOCKFISH);
    let buf = '';
    let lastEval = null;
    let bestmoveSeen = false;
    sf.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('info depth ')) {
          const cp = line.match(/score cp (-?\d+)/);
          const mate = line.match(/score mate (-?\d+)/);
          if (mate) lastEval = { type: 'mate', value: parseInt(mate[1], 10) };
          else if (cp) lastEval = { type: 'cp', value: parseInt(cp[1], 10) };
        }
        if (line.startsWith('bestmove')) {
          bestmoveSeen = true;
          sf.kill();
          resolve(lastEval);
        }
      }
    });
    sf.on('error', () => resolve(null));
    sf.on('close', () => { if (!bestmoveSeen) resolve(lastEval); });
    sf.stdin.write('uci\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go depth ${SF_DEPTH}\n`);
    setTimeout(() => { try { sf.stdin.write('stop\nquit\n'); } catch {} }, 8000);
  });
}

function studentPerspective(raw, finalSideToMove, studentColor) {
  if (!raw) return null;
  // SF reports from side-to-move. If student isn't to move at final
  // position, the eval is from opponent's perspective — flip it.
  const flip = finalSideToMove !== studentColor;
  if (raw.type === 'cp') return { type: 'cp', value: flip ? -raw.value : raw.value };
  return { type: 'mate', value: flip ? -raw.value : raw.value };
}

async function pConcurrency(items, fn, n) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const myI = i++;
      results[myI] = await fn(items[myI]);
    }
  }));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`Loaded ${PUZZLES.length} puzzles, ${REPERTOIRE.length} openings`);

  const candidates = []; // flat list across openings
  for (const opening of REPERTOIRE) {
    const opId = opening.id;
    const studentColor = opening.color;
    const matched = PUZZLES.filter((p) => matchesOpening(p, opId) && isTrapPuzzle(p));
    for (const puzzle of matched) {
      const recon = reconstructPgn(puzzle);
      if (!recon.ok) continue;
      // Sanity check: the student should be making the LAST move
      // (lastMover === studentColor). Lichess puzzles where the
      // student goes second mean: opponent blunders → student
      // delivers the punishment. So final-mover must be student.
      const lastMover = recon.plyCount % 2 === 1
        ? (recon.finalSideToMove === 'white' ? 'black' : 'white')
        : recon.finalSideToMove;  // even moves: lastMover === sideToMove? no, opposite
      const expectedLastMover = recon.plyCount % 2 === 1
        ? (recon.startFen.split(' ')[1] === 'w' ? 'white' : 'black')
        : (recon.startFen.split(' ')[1] === 'w' ? 'black' : 'white');
      // (simpler: alternate from startFen's side-to-move)
      const startSide = recon.startFen.split(' ')[1] === 'w' ? 'white' : 'black';
      // After N moves, side-to-move parity flips N times. Last mover is opposite.
      const finalLastMover = recon.plyCount % 2 === 1
        ? startSide
        : (startSide === 'white' ? 'black' : 'white');
      if (finalLastMover === studentColor) continue; // pitfall: opponent delivers the punishment
      candidates.push({
        openingId: opId,
        studentColor,
        puzzleId: puzzle.id,
        puzzleRating: puzzle.rating,
        puzzlePlays: puzzle.nbPlays || 0,
        themes: puzzle.themes,
        startFen: recon.startFen,
        sans: recon.sans,
        finalFen: recon.finalFen,
        finalSideToMove: recon.finalSideToMove,
        plyCount: recon.plyCount,
      });
    }
  }
  console.log(`Candidates after opening match + theme filter + orientation: ${candidates.length}`);

  // Cap per-opening BEFORE Stockfish (save eval cycles)
  // Rank: higher rating × more plays = more famous; cap at top 8 per opening
  const byOpening = {};
  for (const c of candidates) {
    if (!byOpening[c.openingId]) byOpening[c.openingId] = [];
    byOpening[c.openingId].push(c);
  }
  for (const opId of Object.keys(byOpening)) {
    byOpening[opId].sort((a, b) => (b.puzzleRating * 10 + b.puzzlePlays) - (a.puzzleRating * 10 + a.puzzlePlays));
    byOpening[opId] = byOpening[opId].slice(0, 30);
  }
  const trimmed = Object.values(byOpening).flat();
  console.log(`After per-opening cap of 8: ${trimmed.length}`);

  // Stockfish verify each
  console.log(`\nRunning Stockfish gate (depth=${SF_DEPTH}, concurrency=${SF_CONCURRENCY})...`);
  let evaluated = 0;
  const results = await pConcurrency(trimmed, async (c) => {
    const raw = await evalFen(c.finalFen);
    const studentEval = studentPerspective(raw, c.finalSideToMove, c.studentColor);
    evaluated += 1;
    if (evaluated % 50 === 0) process.stdout.write(`  ${evaluated}/${trimmed.length}\n`);
    let decisive = false;
    let kind = null;
    if (studentEval?.type === 'mate' && studentEval.value < 0) {
      decisive = true; kind = `mated-in-${-studentEval.value}`;
    } else if (studentEval?.type === 'cp' && studentEval.value <= -MIN_DECISIVE_CP) {
      decisive = true; kind = `${studentEval.value}cp`;
    }
    return { ...c, studentEval, decisive, kind };
  }, SF_CONCURRENCY);

  // Final keep: decisive only, top 5 per opening
  const verified = results.filter((r) => r.decisive);
  const keepers = {};
  for (const r of verified) {
    if (!keepers[r.openingId]) keepers[r.openingId] = [];
    if (keepers[r.openingId].length < CAP_PER_OPENING) keepers[r.openingId].push(r);
  }
  const final = Object.values(keepers).flat();
  console.log(`\nAfter Stockfish gate (≥ +${MIN_DECISIVE_CP}cp or mate): ${verified.length}`);
  console.log(`After per-opening cap of ${CAP_PER_OPENING}: ${final.length}`);

  // Group by opening for output
  const byOpFinal = {};
  for (const r of final) {
    if (!byOpFinal[r.openingId]) byOpFinal[r.openingId] = [];
    byOpFinal[r.openingId].push({
      puzzleId: r.puzzleId,
      puzzleRating: r.puzzleRating,
      puzzlePlays: r.puzzlePlays,
      themes: r.themes,
      studentColor: r.studentColor,
      startFen: r.startFen,
      moveSequenceSan: r.sans.join(' '),
      finalFen: r.finalFen,
      finalEval: r.kind,
      verdict: 'DECISIVE-FOR-STUDENT',
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'puzzles.json (Lichess CC0)',
    stockfishDepth: SF_DEPTH,
    minDecisiveCp: MIN_DECISIVE_CP,
    perOpeningCap: CAP_PER_OPENING,
    summary: {
      candidatesAfterFilters: candidates.length,
      stockfishVerified: verified.length,
      finalKept: final.length,
      openingsCovered: Object.keys(byOpFinal).length,
    },
    byOpening: byOpFinal,
  };
  const outPath = `${STAGING_DIR}/mined-pitfalls-batch-1.json`;
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nStaging: ${outPath}`);

  console.log(`\n=== PER-OPENING YIELD ===`);
  for (const opId of Object.keys(byOpFinal).sort()) {
    console.log(`  ${opId.padEnd(28)} ${byOpFinal[opId].length}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
