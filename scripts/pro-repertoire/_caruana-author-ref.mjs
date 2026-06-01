import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from './../../src/data/variationMiddlegameDepth.shared.mjs';

const DEEP = {
  'caruana-ruy-lopez': 'caruana-ruy-lopez-berlin-d3',
  'caruana-nimzo-indian': 'caruana-nimzo-indian-classical-oo',
  'caruana-najdorf': 'caruana-najdorf-english-bg5',
  'caruana-taimanov': 'caruana-taimanov-main-nc6',
};
function descend(root, sans) { let n = root; for (const s of sans) { const ch = n.children || {}; if (!ch[s]) return null; n = ch[s]; } return n; }
function bestChild(n) { const ch = n.children || {}; let best = null; for (const [san, node] of Object.entries(ch)) { if (!best || (node.games || 0) > best.games) best = { san, node, games: node.games || 0 }; } return best; }

const out = [];
for (const oid of Object.keys(DEEP)) {
  const tree = JSON.parse(readFileSync(`data/sources/fabianocaruana-trees/${oid}.json`, 'utf8'));
  const deep = JSON.parse(readFileSync(`data/sources/fabianocaruana-deep/${DEEP[oid]}.json`, 'utf8'));
  const spine = (deep.spineMoves || []).slice();
  let node = descend(tree.tree, spine);
  while (node && spine.length < 20) { const b = bestChild(node); if (!b || b.games < 2) break; spine.push(b.san); node = b.node; }
  const pgn = spine.join(' ');
  const mg = reachesMiddlegame(pgn);
  const c = new Chess(); const rows = [];
  for (const san of spine) { const side = c.turn() === 'w' ? 'W' : 'B'; const m = c.move(san); rows.push(`${m.san}(${side},${m.from}${m.to})`); }
  out.push(`OPENING ${oid} color=${deep.color} plies=${spine.length} reachesMiddlegame=${mg.pass}`);
  out.push(`PGN ${pgn}`);
  out.push(`PLY ${rows.join(' ')}`);
  // model games (wins only for student side)
  const wins = (deep.topModelGames || []).filter((g) => g.outcome === 'win');
  out.push(`WINS ${wins.map((g) => `${g.opponent}(${g.opponentRating})/${g.plyCount}p`).join(' | ')}`);
  out.push('');
}
writeFileSync('/tmp/caruana-ref.txt', out.join('\n'));
console.log('done');
