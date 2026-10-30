// Precompute frequency-derived SUBLINES for each masterclass opening's variations
// from offline game data (the masters DB first; see `forkMovesAt` for the order).
// A subline = an opponent deviation at an opponent-to-move node ALONG the
// variation spine, played in >= N games, walked along the most-played
// continuation to the middlegame, RANKED most->least common with its frequency
// %. Grounded (G3): every fork from real games, nothing invented.
// Emits compact src/data/course-sublines.json (the 37MB DB never ships to client).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

// Every subline walks to the middlegame through the ONE course walker
// (scripts/course-replies/line-walk.mjs): masters' most played from ≥ 8 games,
// the student's moves engine-checked, a known mistake answered with its
// punishment, and an engine that finishes its search. The one-shot
// `execFileSync(stockfish)` that stood here closed stdin at once, so Stockfish
// quit before searching and returned the first legal move — 4.a3 / 5.b3 in
// sublines wherever the masters ran dry (measured 2026-10-27).
import { Engine } from './course-replies/engine.mjs';
import { walkToMiddlegame, indexKnownMistakes } from './course-replies/line-walk.mjs';
import { explorerLookup } from './course-replies/lichess-explorer.mjs';
const engine = new Engine();

const root = new URL('..', import.meta.url).pathname;
const db = JSON.parse(readFileSync(root + 'public/data/openings-masters-db.json', 'utf8')).positions;
const rep = JSON.parse(readFileSync(root + 'src/data/repertoire.json', 'utf8'));
const manifests = JSON.parse(readFileSync(root + 'src/data/opening-manifests.json', 'utf8'));
const eco = JSON.parse(readFileSync(root + 'src/data/openings-lichess.json', 'utf8'));
const ecoEntries = (Array.isArray(eco) ? eco : eco.openings || Object.values(eco)).filter(e => e && e.pgn && e.name);
const reps = Array.isArray(rep) ? rep : rep.openings || Object.values(rep);
let antiOpenings = [];
try { antiOpenings = JSON.parse(readFileSync(root + 'src/data/anti-openings.json', 'utf8')); } catch { /* not built yet */ }
let gambits = [];
try { const g = JSON.parse(readFileSync(root + 'src/data/gambits.json', 'utf8')); gambits = Array.isArray(g) ? g : g.openings || g.gambits || []; } catch { /* none */ }
const masterclassIds = Object.keys(manifests).filter(k => !k.startsWith('_'));
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;

const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const movesAt = (fen) => db[key(fen)] || [];
function sansFromPgn(pgn) {
  const toks = pgn.trim().split(/\s+/).map(t => t.replace(/^\d+\.(\.\.)?/, '')).filter(t => t && !/^\d+\.?$/.test(t));
  const c = new Chess(); const out = [];
  for (const t of toks) { try { out.push(c.move(t).san); } catch { return []; } }
  return out;
}
// Precompute ECO names once: normalized-SAN-pgn -> name (prefix map).
const ecoMap = new Map();
for (const e of ecoEntries) { const p = sansFromPgn(e.pgn).join(' '); if (p && !ecoMap.has(p)) ecoMap.set(p, e.name); }
function nameFor(sans) {
  for (let len = sans.length; len >= 2; len--) { const n = ecoMap.get(sans.slice(0, len).join(' ')); if (n) return n; }
  return null;
}
const knownMistakes = indexKnownMistakes([
  ...JSON.parse(readFileSync(root + 'src/data/punish-gems.json', 'utf8')),
  ...JSON.parse(readFileSync(root + 'src/data/gambit-punish-gems.json', 'utf8')),
]);
// A subline runs at least two student moves past the opponent's deviation.
function walkMostPlayed(startSans, studentColor, openingId, maxPlies = 30) {
  return walkToMiddlegame(startSans, { studentColor, engine, masters: db, knownMistakes, openingId, minLength: startSans.length + 4, maxPlies });
}
// Fork candidates come from the project's own OFFLINE data, never the live
// app's /api/lichess-explorer: a script spending that budget takes lookups
// from real users (WO-COURSE-01, 2026-10-28). In order: the masters DB; where
// it is thin (<2 real choices), the master tree (TWIC 2200+ classical, every
// board reached in 10+ games to move 20) and then the strong-online tree
// (Lichess elite) — the trees the app's own lesson walks read first
// (`src/services/masterTree.ts`); then, for a pro opening, the pro's own game
// tree; and only then the club explorer, called directly with the owner's
// token (`course-replies/lichess-explorer.mjs`) when one is configured.
function loadTreeBoards(dir) {
  const boards = new Map();
  let files = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json'); } catch { return boards; }
  for (const f of files) {
    for (const [k, rows] of Object.entries(JSON.parse(readFileSync(dir + f, 'utf8')))) {
      if (Array.isArray(rows)) boards.set(k, rows.map((r) => ({ san: r[0], games: r[1] })));
    }
  }
  return boards;
}
const TREES = [
  { source: 'master-tree', boards: loadTreeBoards(root + 'public/data/master-tree/') },
  { source: 'online-tree', boards: loadTreeBoards(root + 'public/data/online-tree/') },
];
const PRO_TREE_DIR = {
  naroditsky: 'danielnaroditsky', aman: 'chessbrah', caruana: 'fabianocaruana',
  carlsen: 'magnuscarlsen', ericrosen: 'imrosen', gothamchess: 'gothamchess',
  hikaru: 'hikaru', samayraina: 'samayraina',
};
/** The pro's own game tree for a pro opening (rooted after its minPrefix), or null. */
function proTreeFor(o) {
  if (!o.playerId || !PRO_TREE_DIR[o.playerId]) return null;
  const dir = `${root}data/sources/${PRO_TREE_DIR[o.playerId]}-trees/`;
  const slug = o.id.replace(new RegExp(`^pro-${o.playerId}-`), '');
  for (const name of [slug, `${o.playerId === 'samayraina' ? 'samay' : o.playerId}-${slug}`]) {
    if (existsSync(dir + name + '.json')) {
      const doc = JSON.parse(readFileSync(dir + name + '.json', 'utf8'));
      return { tree: doc.tree, prefix: doc.minPrefix ?? [] };
    }
  }
  return null;
}
function proMovesAt(pro, spinePrefix) {
  if (!pro || spinePrefix.length < pro.prefix.length) return [];
  if (pro.prefix.some((s, i) => spinePrefix[i] !== s)) return [];
  let node = pro.tree;
  for (const s of spinePrefix.slice(pro.prefix.length)) { node = node?.children?.[s]; if (!node) return []; }
  return Object.entries(node.children ?? {}).map(([san, k]) => ({ san, games: k.games ?? 0 }));
}
async function clubMovesAt(fenBefore) {
  if (!process.env.LICHESS_TOKEN && !process.env.LICHESS_TOKEN_FILE) return [];
  try {
    const d = await explorerLookup(fenBefore, { db: 'lichess', ratings: '1400,1600,1800,2000', speeds: 'blitz,rapid' });
    return (d?.moves || []).map((m) => ({ san: m.san, games: (m.white || 0) + (m.draws || 0) + (m.black || 0) }));
  } catch { return []; }
}
const realChoices = (ms) => {
  const tot = ms.reduce((s, x) => s + x.games, 0) || 1;
  return ms.filter((x) => x.games >= Math.max(4, tot * 0.02)).length;
};
async function forkMovesAt(fenBefore, spinePrefix, pro) {
  const m = movesAt(fenBefore);
  if (realChoices(m) >= 2) return { moves: m, source: 'masters' };
  for (const t of TREES) {
    const tm = t.boards.get(key(fenBefore)) ?? [];
    if (realChoices(tm) >= 2) return { moves: tm, source: t.source };
  }
  const pm = proMovesAt(pro, spinePrefix);
  if (realChoices(pm) >= 2) return { moves: pm, source: 'pro-tree' };
  const club = await clubMovesAt(fenBefore);
  return club.length >= 2 ? { moves: club, source: 'club' } : { moves: m, source: 'masters' };
}
// MERGE_FROM_PLY (below): fork only where a rebuilt line changed.
const FORK_FROM_PLY = process.env.MERGE_TABS ? Number(process.env.MERGE_FROM_PLY ?? 0) : 0;
async function buildSublines(variationPgn, studentColor, openingId, pro = null) {
  const spine = sansFromPgn(variationPgn);
  if (spine.length < 2) return [];
  const oppIsWhite = studentColor === 'black';
  // Establishment ply: the variation's identity is set when its ECO name first
  // specializes (gains a ':' sub-variation). Branch ONLY after that, so sublines
  // are the opponent's choices WITHIN this variation, not the system-level fork
  // (which IS another chapter). Floor at 4 so we never branch on moves 1-2.
  let establishment = 4;
  for (let k = 2; k <= spine.length; k++) { const nm = nameFor(spine.slice(0, k)); if (nm && nm.includes(':')) { establishment = Math.max(4, k); break; } }
  const c = new Chess(); const subs = [];
  for (let i = 0; i < spine.length; i++) {
    const fenBefore = c.fen();
    const opponentNode = (c.turn() === 'w') === oppIsWhite;
    if (opponentNode && i >= establishment && i >= FORK_FROM_PLY) {
      const { moves: ms } = await forkMovesAt(fenBefore, spine.slice(0, i), pro);
      const total = ms.reduce((s, m) => s + m.games, 0) || 1;
      const spineMove = spine[i];
      const thresh = Math.max(4, total * 0.02);
      for (const m of ms) {
        if (m.san === spineMove || m.games < thresh) continue;
        const dev = await walkMostPlayed([...spine.slice(0, i), m.san], studentColor, openingId, i + 1 + 22);
        subs.push({ triggerMove: m.san, atPly: i, games: m.games, pct: Math.round((m.games / total) * 100),
          name: nameFor(dev) || `${m.san} line`, moves: dev, reachesMiddlegame: reachesMiddlegame(dev.join(' ')).pass });
      }
    }
    try { c.move(spine[i]); } catch { break; }
  }
  return subs.sort((a, b) => b.games - a.games).slice(0, 10);
}

const out = {}; let totalSubs = 0;
// MERGE_TABS builds only the tabs it names (a rebuilt tab's replies), and may
// name a pro opening: its tab is forked from the same offline data, with the
// pro's own game tree as a source (`proTreeFor`). A pro reply's eval and
// dubious flag are then set from the grounding cache by
// `course-replies/refresh-pro-evals.mjs`.
const mergeTabs = process.env.MERGE_TABS
  ? process.env.MERGE_TABS.split(',').map((x) => { const [id, tab] = x.split(':'); return { id, tab: Number(tab) }; })
  : null;
let proOpenings = [];
try { const pr = JSON.parse(readFileSync(root + 'src/data/pro-repertoires.json', 'utf8')); proOpenings = Array.isArray(pr) ? pr : pr.openings || []; } catch { /* none */ }
const targets = [
  ...masterclassIds.map(id => reps.find(x => x && x.id === id)).filter(o => o && o.variations),
  ...antiOpenings.filter(o => o && o.variations && o.variations.length),
  ...gambits.filter(o => o && o.variations && o.variations.length),
  ...(mergeTabs ? proOpenings.filter((o) => o && o.variations && mergeTabs.some((m) => m.id === o.id)) : []),
];
for (const o of targets) {
  if (only && !only.has(o.id)) continue;
  if (mergeTabs && !mergeTabs.some((m) => m.id === o.id)) continue;
  const perVar = {};
  const pro = o.id.startsWith('pro-') ? proTreeFor(o) : null;
  for (let idx = 0; idx < o.variations.length; idx++) {
    if (mergeTabs && !mergeTabs.some((m) => m.id === o.id && m.tab === idx)) continue;
    const subs = await buildSublines(o.variations[idx].pgn, o.color, o.id, pro);
    if (subs.length) { perVar[idx] = subs; totalSubs += subs.length; }
  }
  if (Object.keys(perVar).length) out[o.id] = perVar;
  console.log(`${o.id.padEnd(24)} ${o.color.padEnd(5)} vars=${o.variations.length} sublines/var=[${o.variations.map((v,i)=>(perVar[i]?.length||0)).join(',')}]`);
}
// MERGE_TABS="openingId:tab,…" — a tab whose line was rebuilt gets the replies
// it is missing (its old ones were pruned as orphans), merged into the file:
// replies the tab already has are kept as they are, narration and all, and the
// tab still holds at most 10, most-played first. MERGE_FROM_PLY=<n> takes new
// replies only from ply n on — the rebuilt part of the line — so the slots the
// orphans left are refilled where the line changed, not by early replies every
// sibling tab already shows.
if (process.env.MERGE_TABS) {
  const file = JSON.parse(readFileSync(root + 'src/data/course-sublines.json', 'utf8'));
  const fromPly = Number(process.env.MERGE_FROM_PLY ?? 0);
  for (const t of process.env.MERGE_TABS.split(',')) {
    const [id, tab] = t.split(':');
    const have = file[id]?.[tab] ?? [];
    const keyOf = (x) => `${x.triggerMove}@${x.atPly}`;
    const fresh = (out[id]?.[tab] ?? []).filter((x) => x.atPly >= fromPly && !have.some((h) => keyOf(h) === keyOf(x)));
    const merged = [...have, ...fresh].sort((a, z) => z.games - a.games).slice(0, 10);
    (file[id] ??= {})[tab] = merged;
    console.log(`[merge] ${id}:${tab} had ${have.length}, +${merged.length - have.length} new: ${merged.filter((x) => fresh.includes(x)).map(keyOf).join(' ')}`);
  }
  writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(file));
} else if (!only) { writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(out)); console.log(`\nwrote src/data/course-sublines.json — ${Object.keys(out).length} openings, ${totalSubs} sublines`); }
else {
  console.log(`\n[dry-run] ${totalSubs} sublines. Sample (caro-kann var 1):`);
  const s = out['caro-kann']?.[1] || Object.values(out)[0]?.[Object.keys(Object.values(out)[0])[0]] || [];
  for (const x of (s||[]).slice(0,6)) console.log(`  ${x.triggerMove.padEnd(5)} ${String(x.pct+'%').padEnd(5)} (${x.games}g) "${x.name}" ${x.moves.length}plies mg=${x.reachesMiddlegame}`);
}
engine.quit();
