#!/usr/bin/env node
// Build a deep MOVE TREE for one opening from the player's actual games.
// Walks every game that matches a starting-prefix filter, threads the
// move sequence into a trie, annotates each node with games / W-D-L,
// and outputs a serializable tree + the deepest spine (most-played
// path) + the top variations at each branch point.
//
// Usage:
//   node scripts/pro-repertoire/extract-opening-tree.mjs danielnaroditsky caro-kann
//
// Opening filters live in OPENINGS below; add new ones as needed.

import fs from 'node:fs';
import path from 'node:path';

const PLAYER = process.argv[2] || 'danielnaroditsky';
const OPENING_ID = process.argv[3] || 'caro-kann';
const SRC_DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);
const OUT_DIR = path.join('data', 'sources', `${PLAYER}-trees`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const OPENINGS = {
  'caro-kann': {
    name: 'Caro-Kann Defense',
    color: 'black',
    studentMoves: ['c6'],
    minPrefix: ['e4', 'c6'],
    maxDepth: 80,
  },
  'alapin-sicilian': {
    name: 'Alapin Sicilian',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c5', 'c3'],
    maxDepth: 80,
  },
  'najdorf': {
    name: 'Sicilian Najdorf',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    maxDepth: 80,
  },
  'kid': {
    name: "King's Indian Defense",
    color: 'black',
    studentMoves: [],
    minPrefix: ['d4', 'Nf6', 'c4', 'g6'],
    maxDepth: 80,
  },
  'alekhine': {
    name: "Alekhine's Defense",
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'Nf6'],
    maxDepth: 80,
  },
  'kia': {
    name: "King's Indian Attack",
    color: 'white',
    studentMoves: [],
    minPrefix: ['Nf3'],
    maxDepth: 80,
  },
  'caro-advance-white': {
    name: 'Caro-Kann Advance (White)',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c6', 'd4', 'd5', 'e5'],
    maxDepth: 80,
  },
  'scandinavian': {
    name: 'Scandinavian Defense',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'd5'],
    maxDepth: 80,
  },
  'qgd': {
    name: 'Queen Gambit Declined',
    color: 'black',
    studentMoves: [],
    minPrefix: ['d4', 'd5', 'c4', 'e6'],
    maxDepth: 80,
  },
  'french': {
    name: 'French Defense',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'e6'],
    maxDepth: 80,
  },
  'pirc': {
    name: 'Pirc Defense',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
    maxDepth: 80,
  },
  'rossolimo': {
    name: 'Anti-Sicilian Rossolimo/Moscow',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c5', 'Nf3'],
    maxDepth: 80,
  },
  'jobava-london': {
    name: 'Jobava London',
    color: 'white',
    studentMoves: [],
    minPrefix: ['d4', 'd5', 'Nc3'],
    maxDepth: 80,
  },
  'ruy-lopez': {
    name: 'Ruy Lopez',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    maxDepth: 80,
  },
  'fantasy-caro': {
    name: 'Fantasy Variation vs Caro-Kann',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c6', 'd4', 'd5', 'f3'],
    maxDepth: 80,
  },
  // ===== GOTHAM-SPECIFIC OPENINGS =====
  'trompowsky': {
    name: 'Trompowsky Attack',
    color: 'white',
    studentMoves: [],
    minPrefix: ['d4', 'Nf6', 'Bg5'],
    maxDepth: 80,
  },
  'english': {
    name: 'English Opening',
    color: 'white',
    studentMoves: [],
    minPrefix: ['c4'],
    maxDepth: 80,
  },
  'vienna': {
    name: 'Vienna Game',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'Nc3'],
    maxDepth: 80,
  },
  'caro-advance-white': {
    name: 'Caro-Kann Advance (White side)',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c6', 'd4', 'd5', 'e5'],
    maxDepth: 80,
  },
  'french-black': {
    name: 'French Defense (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'e6'],
    maxDepth: 80,
  },
  'pirc-black': {
    name: 'Pirc Defense (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'd6'],
    maxDepth: 80,
  },
  'closed-sicilian': {
    name: 'Closed Sicilian',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c5', 'Nc3'],
    maxDepth: 80,
  },
  'scandinavian-black': {
    name: 'Scandinavian Defense (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'd5'],
    maxDepth: 80,
  },
  'qgd-black': {
    name: "Queen's Gambit Declined (Black)",
    color: 'black',
    studentMoves: [],
    minPrefix: ['d4', 'd5', 'c4', 'e6'],
    maxDepth: 80,
  },
  'london': {
    name: 'London System',
    color: 'white',
    studentMoves: [],
    minPrefix: ['d4', 'd5', 'Bf4'],
    maxDepth: 80,
  },
  'italian': {
    name: 'Italian Game',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    maxDepth: 80,
  },
  'ponziani': {
    name: 'Ponziani Opening',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'Nf3', 'Nc6', 'c3'],
    maxDepth: 80,
  },
  'milner-barry': {
    name: 'Milner-Barry Gambit vs French',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Bd3'],
    maxDepth: 80,
  },
  'stafford-refute': {
    name: 'Stafford Gambit (refutation as White)',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6'],
    maxDepth: 80,
  },
  // ── Hikaru Nakamura (2026-05-31 build, data-discovered repertoire) ──
  'nimzo-larsen': {
    name: 'Nimzo-Larsen Attack',
    color: 'white',
    studentMoves: [],
    minPrefix: ['b3'],
    maxDepth: 80,
  },
  'pirc-modern': {
    name: 'Pirc / Modern Defense (1...g6)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'g6'],
    maxDepth: 80,
  },
  'hikaru-reti': {
    name: 'Réti / King\'s Indian Attack',
    color: 'white',
    studentMoves: [],
    minPrefix: ['Nf3'],
    maxDepth: 80,
  },
  'hikaru-closed-sicilian': {
    name: 'Closed / Grand Prix Sicilian',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c5', 'Nc3'],
    maxDepth: 80,
  },
  'hikaru-d3': {
    name: 'King\'s Pawn d3 (Mengarini)',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'd3'],
    maxDepth: 80,
  },
  'hikaru-caro-kann': {
    name: 'Caro-Kann (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'c6'],
    maxDepth: 80,
  },
  // ===== ERIC ROSEN-SPECIFIC OPENINGS =====
  // The whole 1.e4 e5 2.Nf3 Nf6 complex from BLACK's side — lets us see
  // the move-3 split (3.Nxe5 Stafford vs 3.Nc3 Four Knights vs 3.d4/3.Bc4).
  'petrov-stafford-complex': {
    name: 'Petrov / Stafford Complex (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'Nf3', 'Nf6'],
    maxDepth: 80,
  },
  // The true Stafford Gambit: 3.Nxe5 Nc6! 4.Nxc6 dxc6 — Rosen's signature.
  'stafford': {
    name: 'Stafford Gambit (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6'],
    maxDepth: 80,
  },
  // Rosen's Sicilian from Black's side (his biggest Black defense, 1916g).
  'rosen-sicilian': {
    name: 'Sicilian Defense (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'c5'],
    maxDepth: 80,
  },
  // Budapest Gambit — his signature ...e5 gambit vs d4 (258g).
  'budapest': {
    name: 'Budapest Gambit (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['d4', 'Nf6', 'c4', 'e5'],
    maxDepth: 80,
  },
  // Rosen's London from White's side, broad (d4 then Bf4 vs anything, 4483g).
  'rosen-london': {
    name: 'London System (White)',
    color: 'white',
    studentMoves: [],
    minPrefix: ['d4'],
    maxDepth: 80,
  },
  // Rosen's QGD from Black's side (725g).
  'rosen-qgd': {
    name: "Queen's Gambit Declined (Black)",
    color: 'black',
    studentMoves: [],
    minPrefix: ['d4', 'd5', 'c4', 'e6'],
    maxDepth: 80,
  },
  // Rosen's Scandinavian from Black's side (192g, his gambit lines).
  'rosen-scandinavian': {
    name: 'Scandinavian Defense (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'd5'],
    maxDepth: 80,
  },
  // Rosen's French from Black's side (187g).
  'rosen-french': {
    name: 'French Defense (Black)',
    color: 'black',
    studentMoves: [],
    minPrefix: ['e4', 'e6'],
    maxDepth: 80,
  },
  // Rosen's Closed Sicilian / Grand Prix from White's side (592g).
  'rosen-closed-sicilian': {
    name: 'Closed Sicilian / Grand Prix (White)',
    color: 'white',
    studentMoves: [],
    minPrefix: ['e4', 'c5', 'Nc3'],
    maxDepth: 80,
  },
  // ===== SAMAY RAINA-SPECIFIC OPENINGS (classical 1.e4 / 1…e5) =====
  'samay-open-sicilian': { name: 'Open Sicilian (White)', color: 'white', studentMoves: [], minPrefix: ['e4', 'c5', 'Nf3'], maxDepth: 80 },
  'samay-ruy': { name: 'Ruy Lopez (White)', color: 'white', studentMoves: [], minPrefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], maxDepth: 80 },
  'samay-italian': { name: 'Italian Game (White)', color: 'white', studentMoves: [], minPrefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], maxDepth: 80 },
  'samay-french-white': { name: 'French Defense (White)', color: 'white', studentMoves: [], minPrefix: ['e4', 'e6', 'd4', 'd5', 'Nc3'], maxDepth: 80 },
  'samay-caro-white': { name: 'Caro-Kann (White)', color: 'white', studentMoves: [], minPrefix: ['e4', 'c6', 'd4', 'd5', 'Nc3'], maxDepth: 80 },
  'samay-open-e5': { name: 'Open Games / …e5 (Black)', color: 'black', studentMoves: [], minPrefix: ['e4', 'e5'], maxDepth: 80 },
  'samay-sicilian-black': { name: 'Sicilian Defense (Black)', color: 'black', studentMoves: [], minPrefix: ['e4', 'c5'], maxDepth: 80 },
  'samay-scandi-black': { name: 'Scandinavian Defense (Black)', color: 'black', studentMoves: [], minPrefix: ['e4', 'd5'], maxDepth: 80 },
  // ===== CARUANA round 2 (2026-06-01): +4 to reach 8 openings =====
  'caruana-italian': { name: 'Italian Game (Caruana, White)', color: 'white', studentMoves: [], minPrefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], maxDepth: 80 },
  'caruana-french': { name: 'French Defense (Caruana, Black)', color: 'black', studentMoves: [], minPrefix: ['e4', 'e6'], maxDepth: 80 },
  'caruana-caro-kann': { name: 'Caro-Kann (Caruana, Black)', color: 'black', studentMoves: [], minPrefix: ['e4', 'c6'], maxDepth: 80 },
  'caruana-kid': { name: "King's Indian Defense (Caruana, Black)", color: 'black', studentMoves: [], minPrefix: ['d4', 'Nf6', 'c4', 'g6'], maxDepth: 80 },
};

const cfg = OPENINGS[OPENING_ID];
if (!cfg) { console.error(`unknown opening ${OPENING_ID}; available: ${Object.keys(OPENINGS).join(', ')}`); process.exit(1); }

// Fast PGN → SAN extractor (same as analyze-games.mjs).
const PGN_HEADER_END = /\n\n/;
const CLOCK_RE = /\{[^}]*\}/g;
const MOVE_NUM_RE = /\b\d+\.+\s*/g;
const RESULT_RE = /\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/;
const VARIATION_RE = /\([^()]*\)/g;
function pgnToSanMoves(pgnText) {
  const splitAt = pgnText.search(PGN_HEADER_END);
  if (splitAt < 0) return null;
  let body = pgnText.slice(splitAt).replace(CLOCK_RE, '');
  let prev; do { prev = body; body = body.replace(VARIATION_RE, ''); } while (body !== prev);
  body = body.replace(MOVE_NUM_RE, '').replace(RESULT_RE, '').trim();
  if (!body) return null;
  return body.split(/\s+/).filter(Boolean);
}

const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function isStandardChess(g) {
  if (g.rules && g.rules !== 'chess') return false;
  if (g.initial_setup && g.initial_setup !== '' && g.initial_setup !== STANDARD_START_FEN) return false;
  return true;
}

const RESULT_TO = { win:'win', checkmated:'loss', resigned:'loss', timeout:'loss', abandoned:'loss', agreed:'draw', stalemate:'draw', insufficient:'draw', '50move':'draw', repetition:'draw', timevsinsufficient:'draw' };
function outcomeOf(game, studentIsWhite) {
  const me = studentIsWhite ? game.white : game.black;
  const them = studentIsWhite ? game.black : game.white;
  const mine = RESULT_TO[me.result] || me.result;
  const theirs = RESULT_TO[them.result] || them.result;
  if (mine === 'win') return 'win';
  if (mine === 'draw' || theirs === 'draw') return 'draw';
  if (theirs === 'win') return 'loss';
  return 'unknown';
}

function makeNode() { return { games: 0, wins: 0, draws: 0, losses: 0, children: new Map(), bestUrls: [] }; }

function* iterGames() {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  for (const file of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, file), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try { yield JSON.parse(line); } catch {}
    }
  }
}

function main() {
  const t0 = Date.now();
  const dnLc = PLAYER.toLowerCase();
  const root = makeNode();
  let total = 0, kept = 0;

  for (const game of iterGames()) {
    total++;
    if (!isStandardChess(game) || !game.pgn) continue;
    const isWhite = (game.white?.username || '').toLowerCase() === dnLc;
    const isBlack = (game.black?.username || '').toLowerCase() === dnLc;
    if (!isWhite && !isBlack) continue;
    if (cfg.color === 'white' && !isWhite) continue;
    if (cfg.color === 'black' && !isBlack) continue;

    const moves = pgnToSanMoves(game.pgn);
    if (!moves || moves.length < cfg.minPrefix.length + 2) continue;

    let prefixMatch = true;
    for (let i = 0; i < cfg.minPrefix.length; i++) {
      if (moves[i] !== cfg.minPrefix[i]) { prefixMatch = false; break; }
    }
    if (!prefixMatch) continue;

    const outcome = outcomeOf(game, isWhite);
    const oppRating = isWhite ? game.black?.rating : game.white?.rating;

    // Walk into the trie starting from the prefix tail (we record only the
    // moves AFTER the minPrefix so the root represents the post-prefix position).
    let node = root;
    node.games++;
    node[outcome === 'win' ? 'wins' : outcome === 'draw' ? 'draws' : outcome === 'loss' ? 'losses' : 'unknown']++;
    const depth = Math.min(moves.length, cfg.minPrefix.length + cfg.maxDepth);
    for (let i = cfg.minPrefix.length; i < depth; i++) {
      const san = moves[i];
      let child = node.children.get(san);
      if (!child) { child = makeNode(); node.children.set(san, child); }
      child.games++;
      child[outcome === 'win' ? 'wins' : outcome === 'draw' ? 'draws' : outcome === 'loss' ? 'losses' : 'unknown']++;
      if (outcome === 'win' && child.bestUrls.length < 5 && game.url && oppRating >= 2400) {
        child.bestUrls.push({ url: game.url, opp: isWhite ? game.black?.username : game.white?.username, oppElo: oppRating, date: game.end_time });
      }
      node = child;
    }
    kept++;
  }

  // Compute "spine" — at each branch take the most-played child until we drop below MIN_BRANCH_GAMES.
  // Lowered 2026-05-28 (David: "we go deep into every line!"). The aggregate
  // spine extends as long as ≥5 of his games stayed on the most-played path;
  // past that we transition to representative-game tracking for the
  // middlegame/endgame tail.
  const MIN_BRANCH_GAMES = Math.max(5, Math.floor(root.games * 0.001));
  function findSpine(node, accSans) {
    if (node.children.size === 0) return accSans;
    const sorted = [...node.children.entries()].sort((a,b) => b[1].games - a[1].games);
    const [topSan, topNode] = sorted[0];
    if (topNode.games < MIN_BRANCH_GAMES) return accSans;
    return findSpine(topNode, [...accSans, topSan]);
  }
  const spine = findSpine(root, []);

  // Collect all "fat" branches (≥MIN_BRANCH_GAMES) as separate variation candidates.
  // For each branch off the spine, record the alternative move + games + most-played continuation.
  function collectBranchesAlongSpine(node, depth = 0, accSans = []) {
    const out = [];
    const spineSan = spine[depth];
    if (!spineSan || !node.children.has(spineSan)) return out;
    const spineChild = node.children.get(spineSan);
    for (const [san, child] of node.children) {
      if (san === spineSan) continue;
      if (child.games < MIN_BRANCH_GAMES) continue;
      // Pull this branch's own spine
      const subSpine = findSpine(child, [san]);
      out.push({
        depthFromOriginPrefix: depth,
        prefixToHere: accSans.slice(),     // SANs played to reach this branch point
        branchSan: san,
        games: child.games,
        wins: child.wins, draws: child.draws, losses: child.losses,
        scorePct: child.games ? ((child.wins + child.draws/2) / child.games * 100).toFixed(1) : '0',
        continuation: subSpine,
        bestUrls: child.bestUrls,
      });
    }
    out.push(...collectBranchesAlongSpine(spineChild, depth + 1, [...accSans, spineSan]));
    return out;
  }
  const variations = collectBranchesAlongSpine(root).sort((a,b) => b.games - a.games);

  // Serialize the WHOLE TRIE up to a reasonable depth, dropping cold paths.
  // Anything <MIN_TRIE_GAMES is omitted from the serialized form to keep the
  // output small; the spine + variations array carries the meaningful structure.
  const MIN_TRIE_GAMES = Math.max(5, Math.floor(root.games * 0.001));
  function serializeNode(node, depth) {
    const out = { games: node.games, wins: node.wins, draws: node.draws, losses: node.losses, children: {} };
    if (depth >= cfg.maxDepth) return out;
    for (const [san, child] of node.children) {
      if (child.games < MIN_TRIE_GAMES) continue;
      out.children[san] = serializeNode(child, depth + 1);
    }
    return out;
  }
  const tree = serializeNode(root, 0);

  const out = {
    player: PLAYER,
    openingId: OPENING_ID,
    openingName: cfg.name,
    color: cfg.color,
    minPrefix: cfg.minPrefix,
    generatedAt: new Date().toISOString(),
    totals: { totalGamesScanned: total, gamesMatchingOpening: kept, minBranchGames: MIN_BRANCH_GAMES, minTrieGames: MIN_TRIE_GAMES },
    rootStats: { games: root.games, wins: root.wins, draws: root.draws, losses: root.losses, scorePct: root.games ? ((root.wins + root.draws/2) / root.games * 100).toFixed(1) : '0' },
    spine: { sans: spine, prefixPlies: cfg.minPrefix.length, totalPlies: cfg.minPrefix.length + spine.length },
    variations,
    tree,
  };

  const outPath = path.join(OUT_DIR, `${OPENING_ID}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  const elapsed = ((Date.now() - t0)/1000).toFixed(1);
  console.log(`[tree] ${OPENING_ID} done in ${elapsed}s | scanned ${total} | matched ${kept} | spine ${spine.length} plies past prefix`);
  console.log();
  console.log(`Opening: ${cfg.name} — ${cfg.color} — ${kept} games (${out.rootStats.scorePct}%)`);
  console.log(`SPINE: ${cfg.minPrefix.join(' ')} ║ ${spine.join(' ')}`);
  console.log();
  console.log(`Top variations off the spine (≥${MIN_BRANCH_GAMES} games):`);
  for (const [i, v] of variations.slice(0, 12).entries()) {
    const ply = v.depthFromOriginPrefix + cfg.minPrefix.length + 1;
    const pre = v.prefixToHere.join(' ');
    console.log(`  ${(i+1).toString().padStart(2)}. ply ${ply} after [${pre}]: ${v.branchSan} (${v.games}g ${v.scorePct}%) → ${v.continuation.slice(1).join(' ')}`);
  }
  console.log();
  console.log(`Best wins for narration/model-games (root):`);
  function gatherTopWins(node, accSans, depth, acc) {
    if (depth >= 12) return;
    if (node.bestUrls?.length && depth >= 6) {
      for (const u of node.bestUrls) acc.push({ ...u, atDepth: depth, prefixPlayed: accSans.join(' ') });
    }
    for (const [san, child] of node.children) {
      gatherTopWins(child, [...accSans, san], depth + 1, acc);
    }
  }
  const wins = [];
  gatherTopWins(root, [], 0, wins);
  wins.sort((a, b) => (b.oppElo || 0) - (a.oppElo || 0));
  for (const w of wins.slice(0, 10)) {
    console.log(`  [${w.oppElo}] ${w.opp} — ${w.url} — past prefix: ${w.prefixPlayed.slice(0, 80)}`);
  }
}

main();
