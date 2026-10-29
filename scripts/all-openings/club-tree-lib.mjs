// The club tree over one or more months (WO-ALL-OPENINGS-01 O2): every month
// built by `build-club-tree.mjs`, summed position by position, so a slip too
// rare in one month (the Fishing Pole, the Elephant trap) clears the gem bar
// on several. Read by the gem calculator and its recall gate alike.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;

/** `--months 2016-01,2016-02` (or the older `--month 2016-01`) → month list. */
export function monthsArg(argv) {
  const at = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const list = (at('months') ?? at('month') ?? '2016-01').split(',').map((s) => s.trim()).filter(Boolean);
  return list;
}

/** The label the months' outputs are filed under. */
export function monthsLabel(months) {
  return months.length === 1 ? months[0] : `${months[0]}..${months[months.length - 1]}`;
}

/** The months' trees summed: { nodes: { prefix: { n, m: { san: number[9] } } } }.
 *  A position kept in only some months counts what those months saw. */
export function loadClubTree(months) {
  const nodes = {};
  for (const month of months) {
    const tree = JSON.parse(readFileSync(`${root}data/sources/club-tree/${month}.json`, 'utf8'));
    for (const [key, node] of Object.entries(tree.nodes)) {
      const into = (nodes[key] ??= { n: 0, m: {} });
      into.n += node.n;
      for (const [san, arr] of Object.entries(node.m)) {
        const sum = (into.m[san] ??= new Array(arr.length).fill(0));
        for (let i = 0; i < arr.length; i += 1) sum[i] += arr[i];
      }
    }
  }
  return { nodes };
}

/** The tree by BOARD: move orders that reach the same position are one node,
 *  their games summed (a trap is a position, however it was reached), filed
 *  under the move order club players took most. Illegal keys are dropped.
 *  Each key is played from its parent's board (one move, not the whole line).
 *  → Map<board (FEN's first four fields), { key, n, m }>, one entry per board. */
export function nodesByBoard(tree) {
  const fens = new Map([['', new Chess().fen()]]);
  const fenOf = (key) => {
    if (fens.has(key)) return fens.get(key);
    const cut = key.lastIndexOf(' ');
    const parent = cut < 0 ? '' : key.slice(0, cut);
    const from = fenOf(parent);
    let fen = null;
    if (from) { try { const c = new Chess(from); c.move(key.slice(cut + 1)); fen = c.fen(); } catch { fen = null; } }
    fens.set(key, fen);
    return fen;
  };
  const groups = new Map();
  const keys = Object.keys(tree.nodes).sort((a, b) => a.length - b.length);
  for (const key of keys) {
    const node = tree.nodes[key];
    const fen = fenOf(key);
    if (!fen) continue;
    const board = fen.split(' ').slice(0, 4).join(' ');
    const g = groups.get(board);
    if (!g) { groups.set(board, { key, best: node.n, n: node.n, m: Object.fromEntries(Object.entries(node.m).map(([k, v]) => [k, [...v]])) }); continue; }
    g.n += node.n;
    if (node.n > g.best) { g.best = node.n; g.key = key; }
    for (const [san, arr] of Object.entries(node.m)) {
      const sum = (g.m[san] ??= new Array(arr.length).fill(0));
      for (let i = 0; i < arr.length; i += 1) sum[i] += arr[i];
    }
  }
  return new Map([...groups].map(([board, g]) => [board, { key: g.key, n: g.n, m: g.m }]));
}

/** The same, keyed by the move order club players took most: { [moveOrder]: { n, m } }. */
export function byBoard(tree) {
  const out = {};
  for (const g of nodesByBoard(tree).values()) out[g.key] = { n: g.n, m: g.m };
  return out;
}
