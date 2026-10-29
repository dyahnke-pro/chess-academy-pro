// The club tree over one or more months (WO-ALL-OPENINGS-01 O2): every month
// built by `build-club-tree.mjs`, summed position by position, so a slip too
// rare in one month (the Fishing Pole, the Elephant trap) clears the gem bar
// on several. Read by the gem calculator and its recall gate alike.
import { readFileSync } from 'node:fs';

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
