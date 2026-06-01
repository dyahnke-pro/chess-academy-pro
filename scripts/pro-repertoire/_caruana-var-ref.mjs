import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from './../../src/data/variationMiddlegameDepth.shared.mjs';

// One strong non-main variation per opening, extended via tree to middlegame.
const VARS = {
  'caruana-ruy-lopez': { deep: 'caruana-ruy-lopez-morphy-a6', tree: 'caruana-ruy-lopez', name: 'Exchange vs …a6' },
  'caruana-nimzo-indian': { deep: 'caruana-nimzo-indian-rubinstein-c5', tree: 'caruana-nimzo-indian', name: 'Rubinstein with …c5' },
  'caruana-najdorf': { deep: 'caruana-najdorf-classical-be2', tree: 'caruana-najdorf', name: 'Classical 6.Be2' },
  'caruana-taimanov': { deep: 'caruana-taimanov-qc7', tree: 'caruana-taimanov', name: '…Qc7 system' },
};
function descend(root, sans) { let n = root; for (const s of sans) { const ch = n.children || {}; if (!ch[s]) return null; n = ch[s]; } return n; }
function bestChild(n) { const ch = n.children || {}; let best = null; for (const [san, node] of Object.entries(ch)) { if (!best || (node.games || 0) > best.games) best = { san, node, games: node.games || 0 }; } return best; }

const out = [];
for (const [oid, cfg] of Object.entries(VARS)) {
  const tree = JSON.parse(readFileSync(`data/sources/fabianocaruana-trees/${cfg.tree}.json`, 'utf8'));
  const deep = JSON.parse(readFileSync(`data/sources/fabianocaruana-deep/${cfg.deep}.json`, 'utf8'));
  const spine = (deep.spineMoves || []).slice();
  let node = descend(tree.tree, spine);
  while (node && spine.length < 20) { const b = bestChild(node); if (!b || b.games < 2) break; spine.push(b.san); node = b.node; }
  const pgn = spine.join(' ');
  const mg = reachesMiddlegame(pgn);
  const c = new Chess(); const rows = [];
  for (const san of spine) { const side = c.turn() === 'w' ? 'W' : 'B'; const m = c.move(san); rows.push(`${m.san}(${side},${m.from}${m.to})`); }
  out.push(`VAR ${oid} :: ${cfg.name} | plies=${spine.length} mg=${mg.pass}`);
  out.push(`PGN ${pgn}`);
  out.push(`PLY ${rows.join(' ')}`);
  out.push('');
}
writeFileSync('/tmp/caruana-var.txt', out.join('\n'));
console.log('done');
