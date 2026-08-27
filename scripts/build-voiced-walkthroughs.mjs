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
import { reconstructSpineFen } from './voiced-authoring/fen-spine.mjs';
import { depersonalize } from './voiced-authoring/depersonalize.mjs';

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
  // Fen-anchored: never splices a narrator's rewind (see
  // scripts/voiced-authoring/fen-spine.mjs). Re-derive the cumulative `path`
  // this builder's trie keys on.
  const { spine, asides } = reconstructSpineFen(moves);
  const sansSoFar = [];
  for (const n of spine) { sansSoFar.push(n.san); n.path = sansSoFar.join(' '); }
  // Attach the rewind ASIDES (the "why this, not that" teaching the main-line
  // walk couldn't play out) to the spine node they branch FROM, so the
  // walkthrough speaks them inline with the mentioned-move arrows (David
  // 2026-08-27). afterSpineIndex -1 (branches from the start) → the first ply.
  for (const a of (asides || [])) {
    const ti = a.afterSpineIndex < 0 ? 0 : a.afterSpineIndex;
    if (ti >= spine.length) continue;
    (spine[ti].asides ||= []).push({ spoken: a.spoken, arrows: a.arrows, kind: a.kind });
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

  // Depersonalize the opening NAME too — some carry a pro-specific annotation
  // ("Scandinavian Defense (750 speedrun)") that leaks into the intro/outro.
  const key = depersonalize(j.openingName || 'Unknown') || 'Unknown';
  if (!groups.has(key)) groups.set(key, { sideVotes: { white: 0, black: 0 }, videos: [] });
  const g = groups.get(key);
  // MAJORITY vote for the student's side — a single mis-tagged video must not
  // flip the board (David 2026-08-26: "Jobava is being taught from the wrong
  // color. Should be white." — the FIRST of 12 Jobava videos was tagged black
  // while 11 were white, and the builder took the first).
  g.sideVotes[j.studentSide === 'black' ? 'black' : 'white'] += 1;
  g.videos.push({ id, spine });
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
          asides: [],
        });
      }
      const node = cur.children.get(san);
      if (step.spoken && !node.spoken) { node.spoken = step.spoken; node.kind = step.kind; }
      // Merge the rewind asides for this position (dedup by spoken text so two
      // videos covering the same line don't double a "why not X" beat).
      if (step.asides && step.asides.length) {
        const seen = new Set(node.asides.map((x) => x.spoken));
        for (const a of step.asides) { if (a.spoken && !seen.has(a.spoken)) { node.asides.push(a); seen.add(a.spoken); } }
      }
      cur = node;
    }
  }

  // Prune tails that carry no narration downstream (keep the tree tight — end a
  // branch at its last narrated node so we never trail into silent filler).
  function lastNarratedDepth(node) {
    let deepest = (node.spoken || (node.asides && node.asides.length)) ? 0 : -1;
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
    // The rewind asides — the "why this, not that" teaching, spoken inline at
    // this position with the mentioned-move arrows (never played out).
    if (node.asides && node.asides.length) {
      out.asides = node.asides.map((a) => ({
        idea: a.spoken,
        shortIdea: toShort(a.spoken),
        arrows: (a.arrows || []).map((ar) => ({ from: ar.from, to: ar.to })),
      }));
    }
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
for (const [openingName, { sideVotes, videos }] of groups) {
  const studentSide = sideVotes.black > sideVotes.white ? 'black' : 'white';
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
