// Rebuild named MAIN lines / VARIATIONS whose tail the engine refutes, through
// the ONE course walker (WO-COURSE-01 C). Same root cause as the subline repair:
// the anti-opening builder's one-shot `execFileSync(stockfish)` quit before
// searching and printed its first legal move, so where the masters data ran
// dry a line went on with a3 / b3 / …g5 / …g4 junk for BOTH sides.
//
// The cut is the first ply where the masters did NOT play that move from that
// board in ≥ MIN_GAMES games — the moves before it are the real opening and
// stand; the rest is walked again. Only the keys passed are touched: a line a
// lesson is written over is never rebuilt here (its beats would describe moves
// that are gone), so pass only lines with no lesson on them.
//
// Usage: node scripts/course-replies/repair-course-lines.mjs <file> <key>… [--write]
//   <file>  src/data/anti-openings.json (or any course file with id/pgn/variations)
//   <key>   <openingId>::main | <openingId>::var-<i>, optionally `@<ply>` to cut
//           at that ply (the first student move the engine refutes) instead of
//           at the first move the masters never played
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine.mjs';
import { walkToMiddlegame, indexKnownMistakes, MIN_GAMES } from './line-walk.mjs';

const root = new URL('../..', import.meta.url).pathname;
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const [file, ...keys] = args.filter((a) => a !== '--write');
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const raw = J(file);
const list = Array.isArray(raw) ? raw : raw.openings ?? Object.values(raw);
const masters = J('public/data/openings-masters-db.json').positions;
const knownMistakes = indexKnownMistakes([...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]);
const pos = (fen) => fen.split(' ').slice(0, 4).join(' ');
const tokens = (pgn) => pgn.trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

/** First ply the masters never played from that board in ≥ MIN_GAMES games. */
function firstUnsupported(sans, from) {
  const c = new Chess();
  for (let i = 0; i < sans.length; i++) {
    const games = (masters[pos(c.fen())] ?? []).find((m) => m.san === sans[i])?.games ?? 0;
    if (i >= from && games < MIN_GAMES) return i;
    c.move(sans[i]);
  }
  return sans.length;
}

const engine = new Engine();
const report = [];
for (const keyArg of keys) {
  const [key, atArg] = keyArg.split('@');
  const [id, which] = key.split('::');
  const o = list.find((x) => x?.id === id);
  if (!o) throw new Error(`no opening ${id}`);
  const target = which === 'main' ? o : o.variations?.[Number(which.replace('var-', ''))];
  if (!target) throw new Error(`no line ${key}`);
  const sans = tokens(target.pgn);
  // Never cut inside the opening's own start (the weapon the course teaches).
  const start = tokens(o.pgn).findIndex((s, i) => s !== sans[i]);
  const keepFrom = which === 'main' ? 0 : Math.max(0, start === -1 ? sans.length : start);
  const cut = atArg !== undefined ? Number(atArg) : firstUnsupported(sans, keepFrom);
  const moves = await walkToMiddlegame(sans.slice(0, cut), {
    studentColor: o.color, engine, masters, knownMistakes, openingId: id,
    minLength: Math.max(cut + 1 + Number(process.env.SHOW_PLIES ?? 0), 14, process.env.KEEP_LENGTH ? sans.length : 0), maxPlies: Math.max(sans.length, 14) + 16,
  });
  report.push({ key: keyArg, cut, before: sans.slice(cut).join(' '), after: moves.slice(cut).join(' ') });
  target.pgn = moves.join(' ');
}
engine.quit();
// The loader computes fen/uci from the pgn; a stored copy only drifts (19 of 35
// anti-openings carried a board their moves no longer reach).
if (file.endsWith('anti-openings.json')) for (const o of list) { delete o.uci; delete o.fen; }
for (const r of report) console.log(`${r.key}  cut@${r.cut}\n  was: ${r.before}\n  now: ${r.after}`);
if (WRITE) writeFileSync(root + file, JSON.stringify(raw, null, 1) + '\n');
console.log(WRITE ? `[repair-lines] wrote ${report.length} line(s) to ${file}` : '[repair-lines] dry run');
