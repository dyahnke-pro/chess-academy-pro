// Third-pass Gate C reconnector: BFS through the masters-DB position graph
// (public/data/openings-masters-db.json — real master moves only, G3-legal)
// from every position along an entry's lines toward the plan's anchor, depth
// <= MAXD plies. Emits connector paths for later soundness-eval + apply.
import { Chess } from 'chess.js';
import fs from 'fs';

const MAXD = 8;
const gatecExtend = JSON.parse(fs.readFileSync('audit-reports/masterclass-sweep/gatec-extend.json', 'utf8'));
const reconnect = JSON.parse(fs.readFileSync('audit-reports/masterclass-sweep/gatec-reconnect.json', 'utf8'));
const deepHits = JSON.parse(fs.readFileSync('audit-reports/masterclass-sweep/gatec-deep-hits.json', 'utf8'));
const plans = new Map(JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8')).map((p) => [p.id, p]));
const repertoire = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8')).openings;
const anti = JSON.parse(fs.readFileSync('src/data/anti-openings.json', 'utf8'));
const entryOf = (id) => repertoire.find((x) => x.id === id) ?? pro.find((x) => x.id === id) ?? anti.find((x) => x.id === id);
const db = JSON.parse(fs.readFileSync('public/data/openings-masters-db.json', 'utf8')).positions;

// db keyed by fen without counters: "<placement> <turn> <castle> <ep>"
const dbKey = (fen) => fen.split(' ').slice(0, 4).join(' ');
const anchorKey = (fen) => fen.split(' ').slice(0, 2).join(' ');

// remaining = accepted-pass leftovers: everything in reconnect.notFound/foundNoPrefix/noTree
// minus ids accepted by the extend pass
const done = new Set((gatecExtend.accepted ?? []).map((a) => a.pid));
const targets = [...reconnect.notFound, ...reconnect.foundNoPrefix, ...reconnect.noTree].filter((t) => !done.has(t.id) && plans.has(t.id));

const results = { connected: [], unreachable: [] };
for (const t of targets) {
  const plan = plans.get(t.id);
  const entry = entryOf(plan.openingId);
  if (!entry) { results.unreachable.push({ id: t.id, why: 'no entry' }); continue; }
  const want = anchorKey(plan.criticalPositionFen);
  const lines = [{ name: '<main>', pgn: entry.pgn }, ...(entry.variations ?? []).map((v) => ({ name: v.name, pgn: v.pgn }))];
  let found = null;
  for (const ln of lines) {
    if (!ln.pgn || found) continue;
    const sans = ln.pgn.trim().split(/\s+/);
    // walk the line; from each position (deepest first for longest prefix), BFS
    const positions = [];
    const c = new Chess();
    positions.push({ fen: c.fen(), depthIdx: 0 });
    let legal = true;
    for (let i = 0; i < sans.length; i++) { try { if (!c.move(sans[i])) { legal = false; break; } } catch { legal = false; break; } positions.push({ fen: c.fen(), depthIdx: i + 1 }); }
    if (!legal) continue;
    for (let pi = positions.length - 1; pi >= Math.max(0, positions.length - 6) && !found; pi--) {
      const start = positions[pi];
      // BFS over masters-DB moves
      const q = [[start.fen, []]];
      const seen = new Set([dbKey(start.fen)]);
      while (q.length) {
        const [fen, path] = q.shift();
        if (path.length >= MAXD) continue;
        const node = db[dbKey(fen)];
        if (!node) continue;
        const moves = Array.isArray(node) ? node : node.moves ?? [];
        for (const mv of moves) {
          const san = mv.san ?? mv.s ?? mv;
          const c2 = new Chess(fen);
          let r; try { r = c2.move(san); } catch { continue; }
          if (!r) continue;
          const nf = c2.fen();
          if (anchorKey(nf) === want) {
            found = { line: ln.name, prefixPlies: start.depthIdx, connector: [...path, san], newPgn: [...sans.slice(0, start.depthIdx), ...path, san].join(' ') };
            break;
          }
          const k = dbKey(nf);
          if (!seen.has(k)) { seen.add(k); q.push([nf, [...path, san]]); }
        }
        if (found) break;
      }
    }
  }
  if (found) { results.connected.push({ id: t.id, openingId: plan.openingId, ...found }); console.log(`CONNECT ${plan.openingId} :: ${t.id} | ${found.line}@${found.prefixPlies} +${found.connector.length}p via masters`); }
  else results.unreachable.push({ id: t.id, openingId: plan.openingId });
}
console.log(`\nconnected=${results.connected.length} unreachable=${results.unreachable.length}`);
for (const u of results.unreachable) console.log(`  UNREACHABLE ${u.openingId ?? ''} :: ${u.id}`);
fs.writeFileSync('audit-reports/masterclass-sweep/gatec-masters-bfs.json', JSON.stringify(results, null, 1));
