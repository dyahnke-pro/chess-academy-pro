// MODEL GAMES AND ENDGAMES FOR EVERY LINE (WO-ALL-OPENINGS-01 O6; David
// 2026-10-28: "The builder needs to be able to build all aspects of the
// opening tabs on the fly. Middle games, gems, end game, etc."). Built offline
// from The Week in Chess (the games the master tree was counted from: both
// players 2200+, standard start, no blitz), read whole.
//
// For every board the master tree holds from 50+ games, at plies 10–40:
//   • a MODEL GAME per side — the strongest decisive win for that side that
//     passed through the board (winner's rating, then the loser's);
//   • the ENDGAMES that side won from there — each kind (rook and pawns, rook
//     and minor piece, …) with its share of those wins and the strongest game
//     that won it, walked in from the ply the ending began (the endgame
//     doctrine: a real master game of the same line carried into its ending).
// Shipped as lookups (never kept on the phone): an index by board hash and the
// games by id.
//
//   node scripts/all-openings/build-model-games.mjs --shard 0/3   (×3, the tree build's split)
//   node scripts/all-openings/build-model-games.mjs --merge --shards 3
//   [--limit N]  only the first N issues (a speed test)
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const SRC = `${root}data/sources/twic/`;
const KEYS = `${root}data/sources/twic-tree/`;
const OUT = `${root}data/sources/twic-models/`;
const PUB = `${root}public/data/model-games/`;
mkdirSync(OUT, { recursive: true });
const MIN_ELO = 2200;
const MIN_BOARD_GAMES = 50;
const FIRST_PLY = 10;
const LAST_PLY = 40;
const GAME_FILES = 64;
const log = (s) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

const header = (h, tag) => h.match(new RegExp(`\\[${tag} "([^"]*)"\\]`))?.[1] ?? '';
const BAD_EVENT = /blitz|bullet|armageddon|blindfold|chess960|fischer random|960/i;
const boardKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

/** FNV-1a, the master tree's own (`masterTree.boardHash`). */
export function boardHash(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

function issues() {
  const all = readdirSync(SRC).filter((f) => /^twic\d+g\.zip$/.test(f)).sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10));
  const limit = Number(arg('limit', 0)); // a speed test: the first N issues
  return limit ? all.slice(0, limit) : all;
}

function* gamesOf(zip) {
  let text;
  try { text = execFileSync('unzip', ['-p', SRC + zip], { maxBuffer: 512 * 1024 * 1024 }).toString('latin1'); } catch { return; }
  for (const block of text.split(/\r?\n(?=\[Event )/)) {
    const split = block.search(/\r?\n\r?\n/);
    if (split < 0) continue;
    const h = block.slice(0, split);
    const w = Number(header(h, 'WhiteElo')); const b = Number(header(h, 'BlackElo'));
    if (!(w >= MIN_ELO && b >= MIN_ELO)) continue;
    if (header(h, 'FEN') || header(h, 'SetUp') === '1') continue;
    const variant = header(h, 'Variant');
    if (variant && !/standard/i.test(variant)) continue;
    if (BAD_EVENT.test(header(h, 'Event'))) continue;
    const result = header(h, 'Result');
    if (result !== '1-0' && result !== '0-1') continue; // a model game is a win
    let mt = block.slice(split).replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
    for (let k = 0; k < 6 && mt.includes('('); k += 1) mt = mt.replace(/\([^()]*\)/g, ' ');
    const sans = mt.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/)
      .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
    if (sans.length < 20) continue;
    // The tree build's key (its first 24 plies), so its dedupe sets apply.
    const key = `${header(h, 'White')}|${header(h, 'Black')}|${header(h, 'Date')}|${header(h, 'Round')}|${sans.slice(0, 24).join(' ')}`;
    yield {
      key, sans, result, wElo: w, bElo: b,
      white: header(h, 'White'), black: header(h, 'Black'), event: header(h, 'Event'),
      year: Number(header(h, 'Date').slice(0, 4)) || null,
    };
  }
}

const VAL = { n: 3, b: 3, r: 5, q: 9 };
/** The kind of ending on a board, or null when it is not one yet: the queens
 *  are off and each side has at most a rook and a minor piece (or two rooks),
 *  or a queen and nothing else. Pure. */
export function endgameKind(c) {
  const side = { w: { q: 0, r: 0, minor: 0, pts: 0 }, b: { q: 0, r: 0, minor: 0, pts: 0 } };
  for (const row of c.board()) for (const p of row) {
    if (!p || p.type === 'k' || p.type === 'p') continue;
    const s = side[p.color];
    if (p.type === 'q') s.q += 1; else if (p.type === 'r') s.r += 1; else s.minor += 1;
    s.pts += VAL[p.type];
  }
  const q = side.w.q + side.b.q; const r = side.w.r + side.b.r; const minor = side.w.minor + side.b.minor;
  if (q > 0) return q <= 2 && r === 0 && minor === 0 ? 'queen' : null;
  if (side.w.pts > 8 || side.b.pts > 8) return null;
  if (r === 0 && minor === 0) return 'king and pawn';
  if (r === 0) return 'minor piece';
  if (minor === 0) return 'rook';
  return 'rook and minor piece';
}

/** One shard: every board's best model game per side and its endgame tallies. */
function runShard(i, n) {
  const mine = issues().filter((_, k) => k % n === i);
  const earlier = new Set();
  for (let j = 0; j < i; j += 1) for (const k of JSON.parse(readFileSync(`${KEYS}keys-${j}.json`, 'utf8'))) earlier.add(k);
  const targets = targetBoards();
  log(`shard ${i}/${n}: ${mine.length} issues, ${targets.size} target boards`);
  // board → { w: {wins, best, bestScore, eg: {kind: [count, best, score]}}, b: … }
  const boards = new Map();
  const games = new Map(); // id → game (kept only while some board points at it)
  const seen = new Set();
  let read = 0; const t0 = Date.now();
  for (const [k, zip] of mine.entries()) {
    for (const g of gamesOf(zip)) {
      if (seen.has(g.key) || earlier.has(g.key)) continue;
      seen.add(g.key);
      const c = new Chess();
      const canon = [];
      const passed = [];
      let eg = null;
      for (let ply = 0; ply < g.sans.length; ply += 1) {
        let mv;
        try { mv = c.move(g.sans[ply]); } catch { break; }
        canon.push(mv.san);
        const at = ply + 1;
        if (at >= FIRST_PLY && at <= LAST_PLY) {
          const key = boardKey(c.fen());
          if (targets.has(key)) passed.push(key);
        }
        if (!eg) { const kind = endgameKind(c); if (kind) eg = { ply: at, kind }; }
      }
      if (canon.length < 20 || passed.length === 0) continue;
      read += 1;
      const winner = g.result === '1-0' ? 'w' : 'b';
      const score = (winner === 'w' ? g.wElo : g.bElo) + (winner === 'w' ? g.bElo : g.wElo) / 2;
      const id = `${i}-${read}`;
      let used = false;
      for (const key of new Set(passed)) {
        let bd = boards.get(key);
        if (!bd) { bd = {}; boards.set(key, bd); }
        const s = (bd[winner] ??= { wins: 0, best: null, score: 0, eg: {} });
        s.wins += 1;
        if (score > s.score) { s.score = score; s.best = id; used = true; }
        if (eg) {
          const e = (s.eg[eg.kind] ??= [0, null, 0]);
          e[0] += 1;
          if (score > e[2]) { e[2] = score; e[1] = id; used = true; }
        }
      }
      if (used) games.set(id, { white: g.white, black: g.black, wElo: g.wElo, bElo: g.bElo, event: g.event, year: g.year, result: g.result, sans: canon, eg });
    }
    if ((k + 1) % 20 === 0 || k === mine.length - 1) log(`shard ${i}/${n} ${k + 1}/${mine.length} issues, ${read} games through a target, ${boards.size} boards, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  // Only the games some board still points at.
  const keep = new Set();
  for (const bd of boards.values()) for (const s of Object.values(bd)) { keep.add(s.best); for (const e of Object.values(s.eg)) keep.add(e[1]); }
  const out = { boards: Object.fromEntries(boards), games: Object.fromEntries([...games].filter(([id]) => keep.has(id))) };
  writeFileSync(`${OUT}part-${i}.tmp`, JSON.stringify(out));
  renameSync(`${OUT}part-${i}.tmp`, `${OUT}part-${i}.json`);
  log(`shard ${i}/${n} DONE: ${read} games, ${boards.size} boards, ${keep.size} games kept`);
}

function targetBoards() {
  const dir = `${root}public/data/master-tree/`;
  const set = new Set();
  for (const f of readdirSync(dir)) {
    if (!/^(root|s\d+)\.json$/.test(f)) continue;
    for (const [k, rows] of Object.entries(JSON.parse(readFileSync(dir + f, 'utf8')))) {
      if (rows.reduce((a, r) => a + r[1], 0) >= MIN_BOARD_GAMES) set.add(k);
    }
  }
  return set;
}

/** An ending kind is shown when this share of the side's wins reached it. */
const ENDGAME_SHARE = 0.15;

function merge(n) {
  const boards = new Map();
  const games = new Map();
  for (let i = 0; i < n; i += 1) {
    const part = JSON.parse(readFileSync(`${OUT}part-${i}.json`, 'utf8'));
    for (const [id, g] of Object.entries(part.games)) games.set(id, g);
    for (const [key, bd] of Object.entries(part.boards)) {
      const cur = boards.get(key) ?? {};
      for (const side of ['w', 'b']) {
        const s = bd[side];
        if (!s) continue;
        const c = (cur[side] ??= { wins: 0, best: null, score: 0, eg: {} });
        c.wins += s.wins;
        if (s.score > c.score) { c.score = s.score; c.best = s.best; }
        for (const [kind, e] of Object.entries(s.eg)) {
          const ce = (c.eg[kind] ??= [0, null, 0]);
          ce[0] += e[0];
          if (e[2] > ce[2]) { ce[2] = e[2]; ce[1] = e[1]; }
        }
      }
      boards.set(key, cur);
    }
  }
  // Renumber the games that survive and shard them; index boards by hash.
  const used = new Map();
  const gid = (id) => { if (!used.has(id)) used.set(id, used.size); return used.get(id); };
  const index = Array.from({ length: 256 }, () => ({}));
  let withEndgame = 0;
  for (const [key, bd] of boards) {
    const entry = {};
    for (const side of ['w', 'b']) {
      const s = bd[side];
      if (!s?.best || !games.has(s.best)) continue;
      const endings = Object.entries(s.eg)
        .filter(([, e]) => e[1] && games.has(e[1]) && e[0] / s.wins >= ENDGAME_SHARE)
        .sort((a, b) => b[1][0] - a[1][0])
        .map(([kind, e]) => ({ kind, share: Math.round((e[0] / s.wins) * 100), game: gid(e[1]) }));
      if (endings.length) withEndgame += 1;
      entry[side] = { wins: s.wins, game: gid(s.best), endings };
    }
    if (Object.keys(entry).length) index[parseInt(boardHash(key).slice(0, 2), 16)][key] = entry;
  }
  rmSync(PUB, { recursive: true, force: true });
  mkdirSync(`${PUB}index`, { recursive: true });
  mkdirSync(`${PUB}games`, { recursive: true });
  index.forEach((part, h) => writeFileSync(`${PUB}index/${h.toString(16).padStart(2, '0')}.json`, JSON.stringify(part)));
  const files = Array.from({ length: GAME_FILES }, () => ({}));
  for (const [id, n2] of used) {
    const g = games.get(id);
    files[n2 % GAME_FILES][n2] = { ...g, sans: g.sans.join(' ') };
  }
  files.forEach((f, k) => writeFileSync(`${PUB}games/${k}.json`, JSON.stringify(f)));
  writeFileSync(`${PUB}meta.json`, JSON.stringify({ boards: boards.size, games: used.size, gameFiles: GAME_FILES, endgameShare: ENDGAME_SHARE, minBoardGames: MIN_BOARD_GAMES }));
  log(`merged: ${boards.size} boards, ${used.size} games, ${withEndgame} board-sides with an ending → ${PUB}`);
}

if (has('merge')) merge(Number(arg('shards', 3)));
else if (arg('shard')) { const [i, n] = arg('shard').split('/').map(Number); runShard(i, n); }
else if (!existsSync(SRC)) console.error('no TWIC issues at data/sources/twic');
