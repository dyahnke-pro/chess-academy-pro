// TRAP CENSUS, source 2 of 3 — the Lichess puzzle database (WO-COURSE-01).
// David 2026-10-27: "make sure we are not missing any traps. I know we are."
//
// Every Lichess puzzle starts on the board where a real player blundered: its
// FEN is the position BEFORE the blunder, `Moves[0]` is the blunder, the rest
// is the punishment the puzzle asks for. So a puzzle whose starting board lies
// on one of our course lines, with the opponent to move, is a trap a real
// opponent walked into right there. This lists every such (board, blunder) on
// our lines with the puzzles behind it, and whether the course already teaches
// it as a gem. It DISCOVERS candidates only: each is engine-graded and read by
// hand before it ships (CLAUDE.md: traps are found by hand, every one verified).
//
// Usage: zstd -dc data/sources/lichess-puzzles/lichess_db_puzzle.csv.zst |
//          node scripts/course-replies/trap-census-puzzles.mjs
// → audit-reports/trap-census-puzzles.json
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arr = (raw) => (Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw));
const tokens = (pgn) => (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));
const pos = (fen) => fen.split(' ').slice(0, 4).join(' ');
const MAX_MOVE = Number(process.env.MAX_MOVE ?? 20);

// ── every board on a course line where the OPPONENT is to move ──────────────
const openings = ['repertoire', 'pro-repertoires', 'gambits', 'anti-openings'].flatMap((f) => arr(J(`src/data/${f}.json`))).filter((o) => o?.id && o.pgn);
const subs = J('src/data/course-sublines.json');
const at = new Map(); // pos → [{ openingId, line, ply, path }]
let boards = 0;
function index(o, line, sans) {
  const me = o.color === 'white' ? 'w' : 'b';
  const c = new Chess();
  for (let i = 0; i <= sans.length; i++) {
    const fen = c.fen();
    if (fen.split(' ')[1] !== me) {
      const k = pos(fen);
      const list = at.get(k) ?? [];
      if (!list.some((x) => x.openingId === o.id && x.line === line)) {
        list.push({ openingId: o.id, line, ply: i, path: sans.slice(0, i).join(' ') });
        at.set(k, list);
        boards++;
      }
    }
    if (i === sans.length) break;
    try { c.move(sans[i]); } catch { break; }
  }
}
for (const o of openings) {
  index(o, 'main', tokens(o.pgn));
  (o.variations ?? []).forEach((v, i) => v.pgn && index(o, `var-${i}`, tokens(v.pgn)));
  for (const [tab, list] of Object.entries(subs[o.id] ?? {})) for (const s of list) index(o, `sub-${tab}::${s.triggerMove}@${s.atPly}`, s.moves);
}

// ── the gems the course already teaches, by (opening, board, move) ──────────
const known = new Set();
for (const g of [...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]) {
  const c = new Chess();
  try { for (const s of tokens(g.lineMoves)) c.move(s); } catch { continue; }
  known.add(`${g.openingId}|${pos(c.fen())}|${g.inaccuracy}`);
}

// ── stream the puzzles ───────────────────────────────────────────────────────
const hits = new Map(); // `${pos}|${uci}` → aggregate
let read = 0;
let early = 0;
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  if (read++ === 0) continue; // header
  const f = line.split(',');
  const fen = f[1];
  const move = Number(fen.split(' ')[5]);
  if (!(move <= MAX_MOVE)) continue;
  early++;
  const where = at.get(pos(fen));
  if (!where) continue;
  const uci = f[2].split(' ');
  const key = `${pos(fen)}|${uci[0]}`;
  const h = hits.get(key) ?? { fen, blunderUci: uci[0], solutions: new Map(), puzzles: 0, plays: 0, ratings: [], themes: new Map(), sample: f[8], where };
  h.puzzles++;
  h.plays += Number(f[6]) || 0;
  h.ratings.push(Number(f[3]));
  h.solutions.set(uci.slice(1).join(' '), (h.solutions.get(uci.slice(1).join(' ')) ?? 0) + 1);
  for (const t of f[7].split(' ')) h.themes.set(t, (h.themes.get(t) ?? 0) + 1);
  hits.set(key, h);
  if (read % 1_000_000 === 0) console.log(`[puzzles] ${read} read · ${early} early · ${hits.size} on our lines`);
}

// ── name the moves, mark what the course already has ────────────────────────
const out = [];
for (const h of hits.values()) {
  const c = new Chess(h.fen);
  const b = c.move({ from: h.blunderUci.slice(0, 2), to: h.blunderUci.slice(2, 4), promotion: h.blunderUci[4] });
  const [solUci] = [...h.solutions.entries()].sort((a, z) => z[1] - a[1])[0];
  const punish = [];
  for (const u of solUci.split(' ')) { try { punish.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
  const openingsHere = [...new Set(h.where.map((w) => w.openingId))];
  out.push({
    blunder: b.san,
    punish,
    puzzles: h.puzzles,
    plays: h.plays,
    ratingMedian: h.ratings.sort((a, z) => a - z)[h.ratings.length >> 1],
    themes: [...h.themes.entries()].sort((a, z) => z[1] - a[1]).slice(0, 5).map(([t]) => t),
    sample: h.sample,
    fen: h.fen,
    path: h.where[0].path,
    where: h.where.map((w) => `${w.openingId}::${w.line}@${w.ply}`),
    knownIn: openingsHere.filter((id) => known.has(`${id}|${pos(h.fen)}|${b.san}`)),
    missingIn: openingsHere.filter((id) => !known.has(`${id}|${pos(h.fen)}|${b.san}`)),
  });
}
out.sort((a, z) => z.puzzles - a.puzzles);
writeFileSync(root + 'audit-reports/trap-census-puzzles.json', JSON.stringify({ boards, read: read - 1, early, candidates: out }, null, 1));
const missing = out.filter((x) => x.missingIn.length);
console.log(`[puzzles] ${boards} course boards (opponent to move) · ${read - 1} puzzles · ${early} by move ${MAX_MOVE} · ${out.length} (board, blunder) pairs on our lines · ${missing.length} not taught as a gem in at least one opening`);
