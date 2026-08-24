#!/usr/bin/env node
/**
 * build-voiced-matchups.mjs — group the voiced DNA corpus by MATCHUP pairing
 * (White system vs Black defense) and merge each pairing's real videos into one
 * branching walkthrough. So "KIA vs French" is built from the actual video(s)
 * we have of that pairing — not a synthetic line (David 2026-08-24: "we build a
 * walkthrough of all videos we have of KIA vs French"). When NO video exists for
 * a pairing, the coach still falls back to the constructed line (planOpeningMatchup).
 *
 * RELIABILITY: the move-derived side detection is cross-checked against the
 * hand-verified `openingName` tag — a pairing is only emitted when the move
 * classification of the tagged side AGREES with the tag. That filters the
 * loose-heuristic misfires (a Scandinavian mislabeled "French", etc.).
 *
 * OUTPUT: src/data/voiced-matchups.json — one WalkthroughTree per pairing that
 * has ≥1 real video, same trie-merge + note-led beats as the single-opening
 * walkthroughs. G0/G3: moves from real games (chess.js-legal), prose is the DNA note.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from '../node_modules/chess.js/dist/esm/chess.js';

const SRC = 'data/video-narration-voiced';
const OUT = 'src/data/voiced-matchups.json';

/** Ply-monotonic legal main line (same as the single-opening builder). */
function reconstructSpine(moves) {
  const g = new Chess(); const out = []; let last = 0;
  for (const m of moves) {
    if (typeof m.ply === 'number' && m.ply <= last) continue;
    const line = Array.isArray(m.line) ? m.line : [];
    if (!line.length) continue;
    const snap = g.fen(); const applied = []; let ok = true;
    for (const s of line) { try { if (!g.move(s)) { ok = false; break; } applied.push(s); } catch { ok = false; break; } }
    if (!ok) { g.load(snap); continue; }
    for (let i = 0; i < applied.length; i++) {
      out.push({ san: applied[i], movedBy: (out.length % 2 === 0) ? 'white' : 'black',
        spoken: i === applied.length - 1 ? (m.spoken || undefined) : undefined,
        kind: i === applied.length - 1 ? m.kind : undefined });
    }
    if (typeof m.ply === 'number') last = m.ply;
  }
  return out;
}
const whiteSans = (spine) => spine.filter((_, i) => i % 2 === 0).map((n) => n.san);
const blackSans = (spine) => spine.filter((_, i) => i % 2 === 1).map((n) => n.san);

/** White system from White's first moves (tight signatures). */
function whiteSystem(spine) {
  const w = new Set(whiteSans(spine).slice(0, 9));
  const has = (...m) => m.every((x) => w.has(x));
  const any = (...m) => m.some((x) => w.has(x));
  if (has('g3', 'Bg2', 'd3') && any('Nf3', 'Ngf3', 'Nd2', 'Nbd2')) return "King's Indian Attack";
  if (has('d4', 'Bf4')) return 'London System';
  if (has('e4', 'Bc4')) return 'Italian Game';
  if (has('e4', 'Bb5')) return 'Ruy Lopez';
  if (has('e4', 'd4') && any('Nxd4')) return 'Scotch Game';
  if (has('e4', 'Nc3') && any('f4')) return 'Vienna Game';
  if (has('e4', 'f4')) return "King's Gambit";
  if (w.has('c4') && !w.has('d4') && !w.has('e4')) return 'English Opening';
  if (has('d4', 'c4')) return "Queen's Gambit";
  if (w.has('e4')) return "King's Pawn";
  if (w.has('d4')) return "Queen's Pawn";
  return null;
}
/** Black defense from Black's move ORDER (order matters: e6-before-d5 = French,
 *  d5-first vs e4 = Scandinavian, c6+d5 = Caro). */
function blackDefense(spine) {
  const b = blackSans(spine); const bs = new Set(b.slice(0, 9));
  const idx = (s) => b.indexOf(s);
  const before = (a, c) => idx(a) !== -1 && (idx(c) === -1 || idx(a) < idx(c));
  if (b[0] === 'd5') return 'Scandinavian Defense';         // 1...d5 vs e4
  if (bs.has('c6') && bs.has('d5') && before('c6', 'e6')) return 'Caro-Kann Defense';
  if (bs.has('e6') && bs.has('d5') && before('e6', 'c5') && !bs.has('c6')) return 'French Defense';
  if (bs.has('c5') && bs.has('g6')) return 'Sicilian Dragon';
  if (bs.has('c5')) return 'Sicilian Defense';
  if (b[0] === 'Nf6' && !bs.has('d5') && !bs.has('e5') && !bs.has('c5') && !bs.has('e6')) return "Alekhine's Defense";
  if ((bs.has('g6') && bs.has('Bg7') && bs.has('d6')) || (bs.has('Nf6') && bs.has('g6') && bs.has('Bg7') && !bs.has('c5'))) return "King's Indian Defense";
  if (b[0] === 'e5') return 'Open Game';
  return null;
}

/** Canonical family from a hand-verified openingName tag — for the cross-check. */
function taggedFamily(name) {
  const l = (name || '').toLowerCase();
  if (/king.?s indian attack|\bkia\b/.test(l)) return "King's Indian Attack";
  if (/london/.test(l)) return 'London System';
  if (/french/.test(l)) return 'French Defense';
  if (/caro.?kann/.test(l)) return 'Caro-Kann Defense';
  if (/scandinav/.test(l)) return 'Scandinavian Defense';
  if (/sicilian.*dragon|dragon/.test(l)) return 'Sicilian Dragon';
  if (/sicilian/.test(l)) return 'Sicilian Defense';
  if (/alekhine/.test(l)) return "Alekhine's Defense";
  if (/king.?s indian defen|\bkid\b/.test(l)) return "King's Indian Defense";
  if (/ruy lopez/.test(l)) return 'Ruy Lopez';
  if (/italian|giuoco|two knights/.test(l)) return 'Italian Game';
  if (/scotch/.test(l)) return 'Scotch Game';
  if (/vienna/.test(l)) return 'Vienna Game';
  if (/king.?s gambit/.test(l)) return "King's Gambit";
  if (/grunfeld|gr[üu]nfeld/.test(l)) return 'Grünfeld Defense';
  return null;
}
const inferColor = (fam) => /defense|defence|dragon|alekhine|caro|french|scandinav|grunfeld|grünfeld|king.?s indian defen/i.test(fam) && !/attack/i.test(fam) ? 'black' : 'white';

const files = readdirSync(SRC).filter((f) => f.endsWith('.json'));
const groups = new Map(); // "White vs Black" -> { studentSide, videos:[{id,spine}] }
const skipped = [];
for (const f of files) {
  const j = JSON.parse(readFileSync(`${SRC}/${f}`, 'utf8'));
  const id = j.videoId || f.replace('.json', '');
  const spine = reconstructSpine(j.moves);
  if (spine.length < 6 || !spine.some((n) => n.spoken)) continue;
  const W = whiteSystem(spine), B = blackDefense(spine);
  if (!W || !B) { skipped.push([id, `unclassified W=${W} B=${B}`]); continue; }
  // "vs Open Game" (…e5) is not a matchup — it's the White opening's own main
  // reply, already covered by the single-opening walkthrough. Only keep a
  // DISTINCT Black defense (French, Sicilian, Caro, Scandi, Alekhine, KID, …).
  if (B === 'Open Game') { skipped.push([id, 'vs Open Game (not a matchup)']); continue; }
  // cross-check: the tagged family must agree with the move-classification of the side it names.
  const tag = taggedFamily(j.openingName);
  if (tag) {
    const tagColor = inferColor(tag);
    const moveSide = tagColor === 'white' ? W : B;
    if (moveSide !== tag) { skipped.push([id, `tag "${tag}" != move ${tagColor}=${moveSide}`]); continue; }
  }
  const key = `${W} vs ${B}`;
  if (!groups.has(key)) groups.set(key, { white: W, black: B, videos: [] });
  groups.get(key).videos.push({ id, spine });
}

// print survey
const ent = [...groups.entries()].sort((a, b) => b[1].videos.length - a[1].videos.length);
console.log(`ACCEPTED MATCHUP PAIRINGS (${ent.length}):`);
for (const [k, g] of ent) console.log(String(g.videos.length).padStart(2), k, g.videos.length <= 4 ? '[' + g.videos.map((v) => v.id).join(',') + ']' : '');
console.log(`\nskipped ${skipped.length} (unclassified or tag-disagree). KIA vs French check:`);
const kia = groups.get("King's Indian Attack vs French Defense");
console.log('  KIA vs French:', kia ? kia.videos.map((v) => v.id).join(',') : 'NONE');

if (process.argv.includes('--survey')) process.exit(0);

// ---- build merged trees (same shape as single-opening builder) ----
function toShort(text) { if (!text) return undefined; const first = (text.split(/(?<=[.!?])\s/)[0] || text).trim(); const w = first.split(/\s+/); return w.length > 28 ? w.slice(0, 28).join(' ') + '…' : first; }
function buildTree(name, videos) {
  const root = { san: null, movedBy: null, children: new Map() };
  for (const v of videos) {
    let cur = root;
    for (const step of v.spine) {
      if (!cur.children.has(step.san)) cur.children.set(step.san, { san: step.san, movedBy: step.movedBy, children: new Map(), spoken: undefined });
      const node = cur.children.get(step.san);
      if (step.spoken && !node.spoken) node.spoken = step.spoken;
      cur = node;
    }
  }
  function lastNarrated(n) { let d = n.spoken ? 0 : -1; for (const c of n.children.values()) { const x = lastNarrated(c); if (x >= 0 && x + 1 > d) d = x + 1; } return d; }
  (function prune(n) { for (const [san, c] of [...n.children]) { if (lastNarrated(c) < 0) n.children.delete(san); else prune(c); } })(root);
  function toWt(n) { const children = [...n.children.values()].map((c) => ({ node: toWt(c) })); const idea = n.spoken || ''; const out = { san: n.san, movedBy: n.movedBy, idea, children }; const s = toShort(idea); if (s) out.shortIdea = s; return out; }
  return { openingName: name, eco: '', intro: `Let's walk through ${name} — White plays the ${name.split(' vs ')[0]}, Black answers with the ${name.split(' vs ')[1]}. Watch how they meet.`, outro: `That's how ${name} plays out.`, root: toWt(root) };
}
const out = [];
for (const [key, g] of ent) {
  const tree = buildTree(key, g.videos);
  let narrated = 0, total = 0;
  (function c(n) { total++; if (n.idea) narrated++; (n.children || []).forEach((x) => c(x.node)); })(tree.root);
  if (narrated === 0) continue;
  out.push({ id: key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), matchupName: key, whiteSystem: g.white, blackDefense: g.black, videoIds: g.videos.map((v) => v.id), narratedNodes: narrated, totalNodes: total, tree });
}
out.sort((a, b) => b.narratedNodes - a.narratedNodes);
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\nwrote ${out.length} matchup walkthroughs -> ${OUT}`);
