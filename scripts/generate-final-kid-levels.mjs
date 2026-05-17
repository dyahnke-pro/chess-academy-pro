#!/usr/bin/env node
// Phase 7d — fills the remaining gaps from P7c with hand-tuned bands:
//   - queen maze: 8 obstacles, par [3, 7]  (forces detours past walls)
//   - rook maze:  8 obstacles, par [3, 8]
//   - bishop maze: 6 obstacles, par [3, 7]
//   - pawn sweep: requires all targets to be in pawn's diagonal-reach
//     trail; uses constrained search rather than random rejection.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = 'abcdefgh';
function fileIdx(s) { return FILES.indexOf(s[0]); }
function rankIdx(s) { return parseInt(s[1], 10) - 1; }
function sq(f, r) { return `${FILES[f]}${r + 1}`; }
function inBoard(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }

function slide(from, blocked, dirs, maxSteps = 7) {
  const out = []; let f = fileIdx(from), r = rankIdx(from);
  for (const [df, dr] of dirs) {
    let cf = f + df, cr = r + dr, steps = 0;
    while (inBoard(cf, cr) && steps < maxSteps) {
      const s = sq(cf, cr);
      if (blocked.has(s)) break;
      out.push(s); cf += df; cr += dr; steps += 1;
    }
  }
  return out;
}
const ROOK_DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const QUEEN_DIRS = [...ROOK_DIRS, ...BISHOP_DIRS];

function getMazeMoves(piece, from, blocked) {
  if (piece === 'queen') return slide(from, blocked, QUEEN_DIRS);
  if (piece === 'rook')  return slide(from, blocked, ROOK_DIRS);
  if (piece === 'bishop') return slide(from, blocked, BISHOP_DIRS);
  return [];
}

function getSweepMoves(piece, from, obstacles, targets) {
  if (piece !== 'pawn') return [];
  const f = fileIdx(from), r = rankIdx(from);
  if (r >= 7) return [];
  const out = [];
  for (const df of [-1, 1]) {
    const cf = f + df, cr = r + 1;
    if (!inBoard(cf, cr)) continue;
    const s = sq(cf, cr);
    if (obstacles.has(s)) continue;
    if (targets.has(s)) out.push(s);
  }
  const pushOne = sq(f, r + 1);
  if (!obstacles.has(pushOne) && !targets.has(pushOne)) out.push(pushOne);
  return out;
}

function bfsMazeMin(piece, start, target, obstacles) {
  const blocked = new Set(obstacles);
  if (blocked.has(start) || blocked.has(target)) return -1;
  const seen = new Map([[start, 0]]);
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    const d = seen.get(cur);
    if (cur === target) return d;
    for (const nx of getMazeMoves(piece, cur, blocked)) {
      if (!seen.has(nx)) { seen.set(nx, d + 1); q.push(nx); }
    }
  }
  return -1;
}

function bfsSweepMin(piece, start, targets, obstacles) {
  const obsSet = new Set(obstacles);
  const startMask = (1 << targets.length) - 1;
  const seen = new Map();
  const key = (p, m) => `${p}:${m}`;
  seen.set(key(start, startMask), 0);
  const q = [[start, startMask]];
  while (q.length) {
    const [pos, mask] = q.shift();
    const d = seen.get(key(pos, mask));
    if (mask === 0) return d;
    const tSet = new Set();
    for (let i = 0; i < targets.length; i++) if (mask & (1 << i)) tSet.add(targets[i]);
    const moves = getSweepMoves(piece, pos, obsSet, tSet);
    for (const nx of moves) {
      let nm = mask;
      for (let i = 0; i < targets.length; i++) {
        if ((mask & (1 << i)) && targets[i] === nx) { nm &= ~(1 << i); break; }
      }
      const k = key(nx, nm);
      if (!seen.has(k)) { seen.set(k, d + 1); q.push([nx, nm]); }
    }
  }
  return -1;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randSq(rand) { return sq(Math.floor(rand() * 8), Math.floor(rand() * 8)); }
function pickN(rand, n, exclude) {
  const set = new Set(exclude); const out = [];
  let tries = 0;
  while (out.length < n && tries++ < 300) {
    const s = randSq(rand);
    if (!set.has(s)) { set.add(s); out.push(s); }
  }
  return out;
}

function genMazeLevel(piece, rand, obstacleCount, parMin, parMax) {
  for (let tries = 0; tries < 1500; tries++) {
    const start = randSq(rand);
    let target;
    do { target = randSq(rand); } while (target === start);
    const obs = pickN(rand, obstacleCount, [start, target]);
    const min = bfsMazeMin(piece, start, target, obs);
    if (min < parMin || min > parMax) continue;
    return { pieceStart: start, target, obstacles: obs, par: min };
  }
  return null;
}

// Pawn sweep: targets must lie along a path the pawn can reach with
// diagonal captures (so each target is reachable via a 1-step
// diagonal jump from some pawn position obtainable by prior moves).
function genPawnSweep(rand, targetCount) {
  for (let tries = 0; tries < 800; tries++) {
    const startFile = Math.floor(rand() * 8);
    const startRank = 1 + Math.floor(rand() * 3); // ranks 2-4
    const start = sq(startFile, startRank);
    // Build a diagonal trail forward, alternating left/right.
    const targets = [];
    let f = startFile, r = startRank;
    let ok = true;
    for (let i = 0; i < targetCount; i++) {
      // Move forward 1, with left/right alternation
      const df = (i % 2 === 0) ? 1 : -1;
      const nf = f + df, nr = r + 1;
      if (!inBoard(nf, nr) || nr > 7) { ok = false; break; }
      const t = sq(nf, nr);
      targets.push(t);
      f = nf; r = nr;
    }
    if (!ok) continue;
    // De-dup targets vs start
    if (targets.some((t, i) => targets.indexOf(t) !== i || t === start)) continue;
    const min = bfsSweepMin('pawn', start, targets, []);
    if (min < 0) continue;
    return { pieceStart: start, targets, obstacles: [], par: min };
  }
  return null;
}

// ─── Run ────────────────────────────────────────────────────────────
const newMazeLevels = [];
const newSweepLevels = [];

// Queen, rook, bishop maze (5 each).
const MAZE_PIECES = ['queen', 'rook', 'bishop'];
const MAZE_PARAMS = {
  queen:  { obstacles: 9, parMin: 3, parMax: 7 },
  rook:   { obstacles: 9, parMin: 3, parMax: 8 },
  bishop: { obstacles: 6, parMin: 3, parMax: 7 },
};
let seed = 19000;
for (const piece of MAZE_PIECES) {
  const rand = mulberry32(seed++);
  const params = MAZE_PARAMS[piece];
  let added = 0;
  const seenKeys = new Set();
  while (added < 5) {
    const lvl = genMazeLevel(piece, rand, params.obstacles, params.parMin, params.parMax);
    if (!lvl) { console.error('gen fail', piece, 'after', added); break; }
    const k = `${lvl.pieceStart}-${lvl.target}-${lvl.obstacles.sort().join(',')}`;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    const pcLabel = piece[0].toUpperCase() + piece.slice(1);
    newMazeLevels.push({
      piece, id: 6 + added,
      name: `${pcLabel} Path ${added + 6}`,
      pieceStart: lvl.pieceStart, target: lvl.target, obstacles: lvl.obstacles, par: lvl.par,
    });
    added++;
  }
}

// Pawn sweep (5 levels).
{
  const rand = mulberry32(seed++);
  let added = 0;
  const seenKeys = new Set();
  while (added < 5) {
    // Mix 2-target and 3-target levels.
    const tc = added < 3 ? 2 : 3;
    const lvl = genPawnSweep(rand, tc);
    if (!lvl) { console.error('pawn sweep gen fail at', added); break; }
    const k = `${lvl.pieceStart}-${lvl.targets.sort().join(',')}`;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    newSweepLevels.push({
      piece: 'pawn', id: 6 + added,
      name: `Pawn Hunt ${added + 6}`,
      pieceStart: lvl.pieceStart, targets: lvl.targets, obstacles: lvl.obstacles, par: lvl.par,
    });
    added++;
  }
}

console.log('generated:', newMazeLevels.length, 'maze +', newSweepLevels.length, 'sweep');

function spliceInto(filePath, newEntries, kind) {
  let src = readFileSync(filePath, 'utf8');
  const idx = src.lastIndexOf('];');
  if (idx < 0) throw new Error(`no closing bracket in ${filePath}`);
  const insertion = newEntries.map((l) => {
    const obstacles = JSON.stringify(l.obstacles);
    if (kind === 'maze') {
      return `  {\n    piece: '${l.piece}', id: ${l.id}, name: '${l.name}',\n    pieceStart: '${l.pieceStart}', target: '${l.target}', obstacles: ${obstacles}, par: ${l.par},\n  },`;
    } else {
      const targets = JSON.stringify(l.targets);
      return `  {\n    piece: '${l.piece}', id: ${l.id}, name: '${l.name}',\n    pieceStart: '${l.pieceStart}', targets: ${targets}, obstacles: ${obstacles}, par: ${l.par},\n  },`;
    }
  }).join('\n');
  const updated = src.slice(0, idx) + '\n  // ── Phase 7d — final band-2 fill (queen/rook/bishop maze + pawn sweep) ──\n' + insertion + '\n' + src.slice(idx);
  writeFileSync(filePath, updated);
}

if (newMazeLevels.length > 0) spliceInto(resolve(ROOT, 'src/data/pieceMazeLevels.ts'), newMazeLevels, 'maze');
if (newSweepLevels.length > 0) spliceInto(resolve(ROOT, 'src/data/pieceSweepLevels.ts'), newSweepLevels, 'sweep');
console.log('appended ✓');
