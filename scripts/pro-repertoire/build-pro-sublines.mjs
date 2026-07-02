#!/usr/bin/env node
// Build Level-3 SUBLINES for the ELITE PRO REPERTOIRE — from the PRO'S OWN GAME
// TREE, not theory (G9 spine-derivation rule; David 2026-07-02: "the lines NEED
// to be what the pros actually played against different opponent moves").
//
// A subline = an opponent deviation at an opponent-to-move node ALONG a variation
// spine, where the branch move is a move the PRO ACTUALLY FACED (from their
// chess.com/OTB corpus trie), walked along the pro's OWN most-played reply to the
// middlegame terminus. Threshold = 1 game (David: "even one game is enough").
//
// TEACH BOTH (David 2026-07-02): the walk follows the pro's PRACTICAL line
// (grounded in their games). We engine-eval the terminus from the STUDENT's
// perspective and record the pro's real W/D/L. When the practical line is
// dubious/losing per Stockfish we DO NOT drop it — we LABEL it (`dubious`) and
// compute the engine's best continuation (`engineBest`/`engineBestLine`) so the
// narration can teach the practical line AND the fix. "Humans aren't computers."
//
// Every move is chess.js-legal (validated) and comes from the pro's tree or the
// engine — nothing invented (G0/G3). No player names anywhere (pro-rep is
// depersonalized). Emits/merges pro-* keys into src/data/course-sublines.json.
//
// Usage:
//   node scripts/pro-repertoire/build-pro-sublines.mjs <pro-opening-id> [--write]
//   PRO_OPENING=pro-naroditsky-caro-kann node scripts/pro-repertoire/build-pro-sublines.mjs
// Without --write it prints a dry-run report and writes nothing.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const root = new URL('../../', import.meta.url).pathname;
const SF = '/usr/games/stockfish';

// Persistent engine (Stockfish 16). Piping all commands and closing stdin makes
// SF quit mid-search (premature bestmove, no score) — so keep ONE process with
// stdin OPEN and serialise requests, resolving each on its `bestmove`. Mirrors
// the proven pattern in scripts/soundness-sweep.mjs.
const engine = spawn(SF);
let engineDead = false;
engine.on('error', () => { engineDead = true; });
let queue = Promise.resolve();
/** UCI bestmove + score(cp, side-to-move POV) at a FEN. Serialised + async. */
function analyse(fen, depth = 14) {
  const run = () => new Promise((resolve) => {
    if (engineDead) return resolve(null);
    let cp = null; let uci = null; let done = false;
    const onData = (d) => {
      const s = d.toString();
      const sc = s.match(/score (cp|mate) (-?\d+)/g);
      if (sc) { const last = sc[sc.length - 1]; const mt = /mate (-?\d+)/.exec(last); cp = mt ? (Number(mt[1]) > 0 ? 100000 : -100000) : Number(/cp (-?\d+)/.exec(last)[1]); }
      const bm = /bestmove (\S+)/.exec(s);
      if (bm && !done) { done = true; uci = bm[1] === '(none)' ? null : bm[1]; engine.stdout.off('data', onData); clearTimeout(timer); resolve(uci ? { uci, cp: cp ?? 0 } : null); }
    };
    const timer = setTimeout(() => { if (!done) { done = true; engine.stdout.off('data', onData); resolve(uci ? { uci, cp: cp ?? 0 } : null); } }, 15000);
    engine.stdout.on('data', onData);
    engine.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
  });
  queue = queue.then(run, run);
  return queue;
}

/** SAN move for a UCI string at a FEN (or null). */
function uciToSan(fen, uci) {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m ? m.san : null;
  } catch { return null; }
}

function sansFromPgn(pgn) {
  const toks = pgn.trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));
  const c = new Chess(); const out = [];
  for (const t of toks) { try { out.push(c.move(t).san); } catch { return []; } }
  return out;
}

// ECO naming (position-prefix → canonical name), for labelling sublines.
const eco = JSON.parse(readFileSync(root + 'src/data/openings-lichess.json', 'utf8'));
const ecoEntries = (Array.isArray(eco) ? eco : eco.openings || Object.values(eco)).filter((e) => e && e.pgn && e.name);
const ecoMap = new Map();
for (const e of ecoEntries) { const p = sansFromPgn(e.pgn).join(' '); if (p && !ecoMap.has(p)) ecoMap.set(p, e.name); }
function nameFor(sans) {
  for (let len = sans.length; len >= 2; len--) { const n = ecoMap.get(sans.slice(0, len).join(' ')); if (n) return n; }
  return null;
}

// playerId → tree-dir prefix.
const TREE_DIR = {
  naroditsky: 'danielnaroditsky', aman: 'chessbrah', caruana: 'fabianocaruana',
  carlsen: 'magnuscarlsen', ericrosen: 'imrosen', gothamchess: 'gothamchess',
  hikaru: 'hikaru', samayraina: 'samayraina',
};

/** Resolve the tree file for a pro opening. Tries the id slug, then a few known
 *  aliases; returns null (with a log) when the pro has no tree for it. */
function treePathFor(opening) {
  const dir = TREE_DIR[opening.playerId];
  if (!dir) return null;
  const slug = opening.id.replace(new RegExp(`^pro-${opening.playerId}-`), '');
  // Tree filenames don't always match the opening slug (e.g. `alapin` opening →
  // `alapin-sicilian.json` tree). Aliases bridge the known mismatches.
  const ALIAS = {
    alapin: 'alapin-sicilian',
    'anti-sicilian': 'rossolimo', // GothamChess anti-Sicilian = the Bb5 Rossolimo tree
    'french-defense': 'french-black',
    'pirc-defense': 'pirc-black',
  };
  const candidates = [slug, slug.replace(/^pro-/, ''), ALIAS[slug]].filter(Boolean);
  for (const s of candidates) {
    const p = `${root}data/sources/${dir}-trees/${s}.json`;
    if (existsSync(p)) return p;
  }
  return null;
}

/** The trie node reached by playing `sans` — the tree is rooted AFTER the
 *  opening's `minPrefix`, so skip those plies and walk children for the rest.
 *  Returns null if any post-prefix move isn't in the trie (the pro never went
 *  there). */
function nodeAt(tree, sans, minPrefixLen) {
  let node = tree;
  for (let i = minPrefixLen; i < sans.length; i++) {
    node = node?.children?.[sans[i]] ?? null;
    if (!node) return null;
  }
  return node;
}

/** Walk a tree from `startSans` along the MOST-PLAYED child at every node until
 *  the middlegame terminus or the tree runs dry; then extend along Stockfish
 *  best-play so every line reaches a middlegame. Returns the full SAN line
 *  (validated). The tree is rooted after `minPrefixLen` plies. */
async function walkProMostPlayed(tree, startSans, minPrefixLen, maxPlies = 30) {
  const c = new Chess();
  let node = tree;
  const out = [];
  for (let i = 0; i < startSans.length; i++) {
    const s = startSans[i];
    const mv = safeMove(c, s);
    if (!mv) return out; // shouldn't happen — startSans pre-validated
    c.move(mv); out.push(s);
    if (i >= minPrefixLen) node = node?.children?.[s] ?? null;
  }
  while (out.length < maxPlies) {
    if (reachesMiddlegame(out.join(' ')).pass) break;
    const kids = node?.children ? Object.entries(node.children) : [];
    if (kids.length) {
      const [san, child] = kids.sort((a, b) => (b[1].games || 0) - (a[1].games || 0))[0];
      const mv = safeMove(c, san);
      if (!mv) break;
      c.move(mv); out.push(mv.san); node = child; continue;
    }
    // Tree dry — extend along engine best-play to a real middlegame.
    const a = await analyse(c.fen(), 12);
    if (!a) break;
    const san = uciToSan(c.fen(), a.uci);
    if (!san) break;
    c.move(san); out.push(san); node = null;
  }
  return out;
}

function safeMove(chess, san) {
  try { const c = new Chess(chess.fen()); return c.move(san); } catch { return null; }
}

/** Engine best line (SAN) from a FEN, N plies. The student plays first from this
 *  position (it's their reply to the deviation), so it's the "fix" to teach.
 *  Moves are relative to `fen` (a mid-game position), so we can't use the
 *  from-start `reachesMiddlegame` here — just return up to `plies` best moves. */
async function engineBestLine(fen, plies = 6) {
  const c = new Chess(fen);
  const line = [];
  for (let i = 0; i < plies; i++) {
    const a = await analyse(c.fen(), 14);
    if (!a) break;
    const san = uciToSan(c.fen(), a.uci);
    if (!san) break;
    c.move(san); line.push(san);
  }
  return line;
}

/** Student-POV centipawns from a FEN: engine cp is side-to-move POV. */
async function studentEval(fen, studentIsWhite) {
  const a = await analyse(fen, 14);
  if (!a) return null;
  const whitePov = (new Chess(fen).turn() === 'w') ? a.cp : -a.cp;
  return studentIsWhite ? whitePov : -whitePov;
}

const DUBIOUS_CP = -100; // student worse than ~ -1.0 pawn = label as dubious (teach the fix too)

async function buildSublinesForVariation(tree, variationPgn, studentColor, minPrefixLen, mainSpine = []) {
  const spine = sansFromPgn(variationPgn);
  if (spine.length < 2) return [];
  const studentIsWhite = studentColor === 'white';
  const oppIsWhite = studentColor === 'black';
  // Establishment ply: branch only after the variation's identity is set (its
  // ECO name first specialises with a ':'), floored at 4 so we never branch on
  // moves 1-2 (that's the system-level fork = another variation, not a subline).
  let establishment = 4;
  for (let k = 2; k <= spine.length; k++) { const nm = nameFor(spine.slice(0, k)); if (nm && nm.includes(':')) { establishment = Math.max(4, k); break; } }
  // Divergence floor: don't branch AT (or before) the ply where this variation
  // parts from the main line — at that ply the "siblings" are literally the OTHER
  // variation tabs (e.g. every Najdorf var diverges at White's 6th; branching
  // there just re-derives Be3/Be2/h3/Bc4). Push establishment past it so sublines
  // are genuine deviations WITHIN this variation, not duplicates of the tab set.
  if (mainSpine.length) {
    let div = 0;
    while (div < spine.length && div < mainSpine.length && spine[div] === mainSpine[div]) div++;
    // Only push past a REAL fork. If the variation never diverges within its own
    // length (div === spine.length → it IS the main trunk, e.g. a Giuoco-Piano
    // tab whose pgn equals the opening's main pgn), don't suppress its sublines —
    // its opponent deviations are genuine, not duplicate tabs. Branch from the
    // normal establishment like any trunk line.
    if (div < spine.length) establishment = Math.max(establishment, div + 1);
  }

  const c = new Chess();
  const subs = [];
  for (let i = 0; i < spine.length; i++) {
    const opponentNode = (c.turn() === 'w') === oppIsWhite;
    // Tree node at THIS position (rooted after minPrefix). null before the prefix
    // ends or if the pro never reached here.
    const node = i >= minPrefixLen ? nodeAt(tree, spine.slice(0, i), minPrefixLen) : null;
    const kids = node?.children ?? {};
    if (opponentNode && i >= establishment && kids && Object.keys(kids).length) {
      const total = Object.values(kids).reduce((s, k) => s + (k.games || 0), 0) || 1;
      const spineMove = spine[i];
      for (const [san, child] of Object.entries(kids)) {
        if (san === spineMove) continue;
        const games = child.games || 0;
        if (games < 1) continue; // threshold = 1 (David)
        // Legality: the branch move must be legal here.
        if (!safeMove(c, san)) continue;
        const line = await walkProMostPlayed(tree, [...spine.slice(0, i), san], minPrefixLen, i + 1 + 22);
        if (line.length <= i) continue;
        const termFen = fenAfter(line);
        if (!termFen) continue;
        const sEval = await studentEval(termFen, studentIsWhite);
        const dubious = sEval !== null && sEval < DUBIOUS_CP;
        let engineBest = null; let engineBestFrom = null;
        if (dubious) {
          // The fix: the engine's best line from the position AFTER the opponent's
          // deviation (i.e. where the student chooses the reply).
          const afterDev = fenAfter([...spine.slice(0, i), san]);
          if (afterDev) {
            const bl = await engineBestLine(afterDev, 6);
            if (bl.length) { engineBest = bl[0]; engineBestFrom = bl; }
          }
        }
        subs.push({
          triggerMove: san, atPly: i, games,
          record: { wins: child.wins || 0, draws: child.draws || 0, losses: child.losses || 0 },
          pct: Math.round((games / total) * 100),
          name: nameFor(line) || `${san} line`,
          moves: line,
          reachesMiddlegame: reachesMiddlegame(line.join(' ')).pass,
          evalCp: sEval, dubious,
          ...(engineBest ? { engineBest, engineBestLine: engineBestFrom } : {}),
        });
      }
    }
    // Advance the board down the spine (the tree node is recomputed per ply via
    // nodeAt above).
    if (!safeMove(c, spine[i])) break;
    c.move(spine[i]);
  }
  return subs.sort((a, b) => b.games - a.games).slice(0, 12);
}

function fenAfter(sans) {
  const c = new Chess();
  for (const s of sans) { const mv = safeMove(c, s); if (!mv) return null; c.move(mv); }
  return c.fen();
}

// --- main ---
const arg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.env.PRO_OPENING;
const write = process.argv.includes('--write');
if (!arg) { console.error('need a pro-opening-id (arg or PRO_OPENING env)'); process.exit(1); }

const pro = JSON.parse(readFileSync(root + 'src/data/pro-repertoires.json', 'utf8'));
const opening = pro.openings.find((o) => o.id === arg);
if (!opening) { console.error(`no such pro opening: ${arg}`); process.exit(1); }

const treePath = treePathFor(opening);
if (!treePath) { console.error(`no tree file for ${arg} (player ${opening.playerId})`); process.exit(1); }
const treeDoc = JSON.parse(readFileSync(treePath, 'utf8'));
const tree = treeDoc.tree;
const minPrefixLen = (treeDoc.minPrefix || []).length;
console.log(`opening ${opening.id} | color ${opening.color} | tree ${treePath.replace(root, '')} | games ${treeDoc.totals?.games ?? treeDoc.tree?.games} | minPrefix ${JSON.stringify(treeDoc.minPrefix)} (${minPrefixLen} plies)`);

const mainSpine = sansFromPgn(opening.pgn || '');
const perVar = {};
let count = 0;
for (let idx = 0; idx < (opening.variations || []).length; idx++) {
  const v = opening.variations[idx];
  const subs = await buildSublinesForVariation(tree, v.pgn, opening.color, minPrefixLen, mainSpine);
  if (subs.length) { perVar[idx] = subs; count += subs.length; }
  console.log(`  [${idx}] ${v.name.padEnd(34)} sublines=${subs.length}` +
    (subs.length ? ` (dubious=${subs.filter((s) => s.dubious).length})` : ''));
  for (const s of subs.slice(0, 4)) {
    console.log(`      ${s.triggerMove.padEnd(6)} ${String(s.pct + '%').padEnd(4)} ${s.games}g ` +
      `W${s.record.wins}/D${s.record.draws}/L${s.record.losses} eval=${s.evalCp}cp ` +
      `${s.dubious ? `DUBIOUS→best ${s.engineBest}` : 'sound'} "${s.name}" ${s.moves.length}plies`);
  }
}
console.log(`\n${opening.id}: ${count} sublines across ${Object.keys(perVar).length} variations`);
try { engine.stdin.write('quit\n'); engine.kill(); } catch { /* already gone */ }

if (write) {
  const path = root + 'src/data/course-sublines.json';
  const all = JSON.parse(readFileSync(path, 'utf8'));
  all[opening.id] = perVar;
  writeFileSync(path, JSON.stringify(all));
  console.log(`merged ${opening.id} into src/data/course-sublines.json (now ${Object.keys(all).length} openings)`);
} else {
  console.log('[dry-run] nothing written (pass --write to merge into course-sublines.json)');
}
