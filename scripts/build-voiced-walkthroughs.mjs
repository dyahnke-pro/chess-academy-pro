#!/usr/bin/env node
/**
 * build-voiced-walkthroughs.mjs — merge the voiced DNA corpus into branching
 * walkthroughs the app can render.
 *
 * INPUT:  data/video-narration-voiced/<id>.json  (our-words DNA beats,
 *         each { ply, t, fen, line:SAN[], spoken, kind?, teaches? }).
 * OUTPUT: src/data/voiced-walkthroughs.json  — one WalkthroughTree per
 *         openingName, built by merging every video of that opening.
 *
 * THE ALGORITHM (per opening):
 *   1. For each video, reconstruct its MAIN LINE = the longest beat `line`
 *      that is fully legal from the start position (chess.js). Analysis /
 *      rewind fragments that don't validate are dropped.
 *   2. Index each video's spoken beats by their exact SAN path.
 *   3. Merge every video's main line into a trie: shared prefix = shared
 *      spine, first divergence = a branch (fork). Each node carries the
 *      spoken note authored for that exact position (the note LEADS the
 *      beat — G0); silent plies auto-advance.
 *   4. Emit a WalkthroughTree (root san:null; FENs computed at runtime).
 *
 * G0/G3: moves come from the bank (real games, chess.js-legal); the prose
 * is the hand-authored our-words note. Nothing is invented here.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from '../node_modules/chess.js/dist/esm/chess.js';

const SRC = 'data/video-narration-voiced';
const OUT = 'src/data/voiced-walkthroughs.json';

/** legal? replay the SAN array from the start; return true iff every move applies. */
function lineIsLegal(sans) {
  const c = new Chess();
  for (const s of sans) {
    try { if (!c.move(s)) return false; } catch { return false; }
  }
  return true;
}

/** first sentence of `text`, capped to ~28 words — the Brief register. */
function toShort(text) {
  if (!text) return undefined;
  const first = (text.split(/(?<=[.!?])\s/)[0] || text).trim();
  const words = first.split(/\s+/);
  const clipped = words.length > 28 ? words.slice(0, 28).join(' ') + '…' : first;
  return clipped;
}

const files = readdirSync(SRC).filter((f) => f.endsWith('.json'));
/** openingName -> { studentSide, videos: [{ id, spine:[{san,movedBy,path,spoken,kind}] }] } */
const groups = new Map();

/** Reconstruct one video's MAIN LINE from its beats.
 * The `line` field holds the move(s) made AT that beat (not a cumulative
 * path). The real game is the beats whose `ply` strictly increases and whose
 * moves apply legally from the running position; rewind/analysis beats (ply
 * jumps back, or moves that don't apply) are skipped. */
function reconstructSpine(moves) {
  const game = new Chess();
  const sansSoFar = [];
  const spine = [];
  let lastPly = 0;
  for (const m of moves) {
    if (typeof m.ply === 'number' && m.ply <= lastPly) continue; // rewind
    const line = Array.isArray(m.line) ? m.line : [];
    if (!line.length) continue;
    const snapshot = game.fen();
    const applied = [];
    let ok = true;
    for (const s of line) {
      try { if (!game.move(s)) { ok = false; break; } applied.push(s); } catch { ok = false; break; }
    }
    if (!ok) { game.load(snapshot); continue; }
    for (let i = 0; i < applied.length; i++) {
      sansSoFar.push(applied[i]);
      const isLast = i === applied.length - 1;
      spine.push({
        san: applied[i],
        movedBy: sansSoFar.length % 2 === 1 ? 'white' : 'black',
        path: sansSoFar.join(' '),
        spoken: isLast ? m.spoken || undefined : undefined,
        kind: isLast ? m.kind : undefined,
      });
    }
    if (typeof m.ply === 'number') lastPly = m.ply;
  }
  return spine;
}

for (const f of files) {
  const j = JSON.parse(readFileSync(`${SRC}/${f}`, 'utf8'));
  const id = j.videoId || f.replace('.json', '');
  const moves = Array.isArray(j.moves) ? j.moves : [];
  const spine = reconstructSpine(moves);
  if (spine.length < 2) continue;
  if (!spine.some((n) => n.spoken)) continue; // no narration to show

  const key = j.openingName || 'Unknown';
  if (!groups.has(key)) groups.set(key, { studentSide: j.studentSide || 'white', videos: [] });
  groups.get(key).videos.push({ id, spine });
}

/** Trie node -> WalkthroughTree node. */
function emitTree(openingName, studentSide, videos) {
  // trie: path-string -> { san, movedBy, sansSoFar, children:Map<san,node>, spoken, kind }
  const root = { san: null, movedBy: null, path: '', children: new Map() };

  for (const v of videos) {
    let cur = root;
    for (const step of v.spine) {
      const san = step.san;
      if (!cur.children.has(san)) {
        cur.children.set(san, {
          san,
          movedBy: step.movedBy,
          path: step.path,
          children: new Map(),
          spoken: undefined,
          kind: undefined,
        });
      }
      const node = cur.children.get(san);
      if (step.spoken && !node.spoken) { node.spoken = step.spoken; node.kind = step.kind; }
      cur = node;
    }
  }

  // Prune tails that carry no narration downstream (keep the tree tight — end a
  // branch at its last narrated node so we never trail into silent filler).
  function lastNarratedDepth(node) {
    let deepest = node.spoken ? 0 : -1;
    for (const ch of node.children.values()) {
      const d = lastNarratedDepth(ch);
      if (d >= 0 && d + 1 > deepest) deepest = d + 1;
    }
    return deepest;
  }
  function prune(node) {
    for (const [san, ch] of [...node.children]) {
      if (lastNarratedDepth(ch) < 0) node.children.delete(san);
      else prune(ch);
    }
  }
  prune(root);

  // convert to WalkthroughTree shape
  function toWt(node) {
    const children = [...node.children.values()].map((ch) => ({ node: toWt(ch) }));
    const idea = node.spoken || '';
    const out = {
      san: node.san,
      movedBy: node.movedBy,
      idea,
      children,
    };
    const short = toShort(idea);
    if (short) out.shortIdea = short;
    return out;
  }

  const rootWt = toWt(root);
  return {
    openingName,
    eco: '',
    intro: `Let's walk through the ${openingName}. Watch the ideas as the moves play out.`,
    outro: `That's the heart of the ${openingName}.`,
    root: rootWt,
  };
}

const out = [];
for (const [openingName, { studentSide, videos }] of groups) {
  const tree = emitTree(openingName, studentSide, videos);
  // count narrated nodes
  let narrated = 0, total = 0;
  (function count(n){ total++; if (n.idea) narrated++; (n.children||[]).forEach(c=>count(c.node)); })(tree.root);
  out.push({
    id: openingName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    openingName,
    studentSide,
    videoIds: videos.map((v) => v.id),
    narratedNodes: narrated,
    totalNodes: total,
    tree,
  });
}

out.sort((a, b) => b.narratedNodes - a.narratedNodes);
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`wrote ${out.length} voiced walkthroughs -> ${OUT}`);
for (const o of out.slice(0, 12)) {
  console.log(`  ${o.narratedNodes}/${o.totalNodes} nodes  ${o.videoIds.length}vid  ${o.openingName}`);
}
