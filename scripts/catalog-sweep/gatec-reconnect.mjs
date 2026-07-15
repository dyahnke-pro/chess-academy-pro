// Gate C reconnector: for each breaking plan, hunt its criticalPositionFen
// across the player's committed corpus-tree paths (spine + variations + full
// trie). When a tree path (a) reaches the plan's position and (b) extends the
// entry's own main/variation pgn as a prefix, propose extending that pgn to
// the anchor — Gate D order: fix the skeleton, narration untouched.
import { Chess } from 'chess.js';
import fs from 'fs';
import path from 'path';

const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));
const gatec = JSON.parse(fs.readFileSync('audit-reports/masterclass-sweep/gatec2.json', 'utf8'));
const repertoire = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8')).openings;
const anti = JSON.parse(fs.readFileSync('src/data/anti-openings.json', 'utf8'));

const planById = new Map(plans.map((p) => [p.id, p]));
const entryById = new Map();
for (const e of [...repertoire, ...pro, ...anti]) entryById.set(e.id, e);

function fenKey(fen) { return fen.split(' ').slice(0, 2).join(' '); }

const TREE_DIRS = {
  gothamchess: 'data/sources/gothamchess-trees',
  naroditsky: 'data/sources/danielnaroditsky-trees',
  samayraina: 'data/sources/samayraina-trees',
  caruana: 'data/sources/fabianocaruana-trees',
  carlsen: 'data/sources/magnuscarlsen-trees',
  hikaru: 'data/sources/hikaru-trees',
  ericrosen: 'data/sources/imrosen-trees',
};
function playerOf(openingId) {
  const m = openingId.match(/^pro-([a-z]+)-/);
  return m ? m[1] : null;
}

// Build per-player fen index lazily: fenKey -> shortest sans path
const playerIndex = new Map();
function indexPlayer(player) {
  if (playerIndex.has(player)) return playerIndex.get(player);
  const idx = new Map();
  const dir = TREE_DIRS[player];
  const files = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('model-games')) : [];
  const add = (sansPath, fen) => {
    const k = fenKey(fen);
    const cur = idx.get(k);
    if (!cur || sansPath.length < cur.length) idx.set(k, [...sansPath]);
  };
  for (const f of files) {
    let t;
    try { t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    // prefix moves consumed before the trie root (minPrefix)
    const prefix = t.minPrefix ?? [];
    const walkSans = (sans) => {
      const c = new Chess();
      const p = [];
      for (const m of sans) { try { if (!c.move(m)) break; } catch { break; } p.push(m); add(p, c.fen()); }
    };
    if (t.spine?.sans) walkSans([...prefix, ...t.spine.sans]);
    for (const v of t.variations ?? []) {
      const sans = v.sans ?? (typeof v.pgn === 'string' ? v.pgn.trim().split(/\s+/) : null);
      if (sans) walkSans([...prefix, ...sans]);
    }
    if (t.tree) {
      // DFS the trie
      const stack = [[t.tree, (() => { const c = new Chess(); const p = []; for (const m of prefix) { try { if (!c.move(m)) break; } catch { break; } p.push(m); } return p; })()]];
      while (stack.length) {
        const [node, p] = stack.pop();
        for (const [san, child] of Object.entries(node.children ?? {})) {
          const c = new Chess();
          let ok = true;
          for (const m of p) { try { if (!c.move(m)) { ok = false; break; } } catch { ok = false; break; } }
          if (!ok) continue;
          try { if (!c.move(san)) continue; } catch { continue; }
          const np = [...p, san];
          add(np, c.fen());
          stack.push([child, np]);
        }
      }
    }
  }
  playerIndex.set(player, idx);
  return idx;
}

const results = { extend: [], foundNoPrefix: [], notFound: [], noTree: [] };
for (const brk of gatec.break) {
  const plan = planById.get(brk.id);
  const entry = entryById.get(brk.openingId);
  if (!plan || !entry) { results.notFound.push({ ...brk, why: 'plan/entry missing' }); continue; }
  const player = playerOf(brk.openingId);
  if (!player || !TREE_DIRS[player]) { results.noTree.push(brk); continue; }
  const idx = indexPlayer(player);
  const want = fenKey(plan.criticalPositionFen);
  const found = idx.get(want);
  if (!found) { results.notFound.push(brk); continue; }
  // does it extend one of the entry's lines?
  const lines = [{ name: '<main>', pgn: entry.pgn }, ...(entry.variations ?? []).map((v) => ({ name: v.name, pgn: v.pgn }))];
  let best = null;
  for (const ln of lines) {
    if (!ln.pgn) continue;
    const sans = ln.pgn.trim().split(/\s+/);
    if (sans.length <= found.length && sans.every((m, i) => m === found[i])) {
      if (!best || sans.length > best.sansLen) best = { line: ln.name, sansLen: sans.length };
    }
  }
  if (best) results.extend.push({ id: brk.id, openingId: brk.openingId, line: best.line, from: best.sansLen, to: found.length, newPgn: found.join(' ') });
  else results.foundNoPrefix.push({ id: brk.id, openingId: brk.openingId, treePathLen: found.length, treePath: found.join(' ') });
}
console.log(`extendable=${results.extend.length} found-but-no-prefix=${results.foundNoPrefix.length} not-found=${results.notFound.length} no-tree(masterclass/etc)=${results.noTree.length}`);
console.log('\n== EXTENDABLE (tree path extends an existing line to the anchor):');
for (const r of results.extend) console.log(`  ${r.openingId} :: ${r.id} | ${r.line} ${r.from}p → ${r.to}p`);
console.log('\n== FOUND ON TREE BUT NO ENTRY-LINE PREFIX (candidate new/changed variation):');
for (const r of results.foundNoPrefix.slice(0, 20)) console.log(`  ${r.openingId} :: ${r.id} (${r.treePathLen}p)`);
console.log('\n== NOT FOUND IN TREES:');
for (const r of results.notFound.slice(0, 30)) console.log(`  ${r.openingId} :: ${r.id}`);
console.log('\n== NO TREE (masterclass / repertoire-only):');
for (const r of results.noTree) console.log(`  ${r.openingId} :: ${r.id}`);
fs.writeFileSync('audit-reports/masterclass-sweep/gatec-reconnect.json', JSON.stringify(results, null, 1));
