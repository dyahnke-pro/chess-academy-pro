// LEVY'S LINES, MERGED (WO-OPENINGS-REWRITE-01 R4). The swarm wrote one file per
// slice (`docs/levy-lines/*.json`): lines he TEACHES in his videos (a videoId and
// the idea) and lines he PLAYS (his chess.com / OTB games, with counts and score).
// One line can turn up in several files, so this merges them by their moves,
// keeps every source, re-checks legality with chess.js, and groups the result
// by side and the first moves the lines share, so they can be shaped into
// openings, tabs and reply lines.
//
//   node scripts/levy-lines/merge.mjs   → docs/levy-lines/_merged.json + _merged.md
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const DIR = 'docs/levy-lines';
const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const byMoves = new Map();
let read = 0;
let illegal = 0;

for (const f of files) {
  const j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
  const lines = Array.isArray(j) ? j : j.lines ?? [];
  for (const l of lines) {
    read += 1;
    const sans = Array.isArray(l.moves) ? l.moves.map(String) : String(l.moves).trim().split(/\s+/);
    const c = new Chess();
    try { for (const s of sans) c.move(s); } catch { illegal += 1; continue; }
    const key = `${l.side}|${sans.join(' ')}`;
    const e = byMoves.get(key) ?? {
      side: l.side, moves: sans, names: new Set(), openings: new Set(), kinds: new Set(), statuses: new Set(),
      videos: [], games: 0, score: null, masters: l.masters ?? null, amateur: l.amateur ?? null, evalCp: l.evalCp ?? null,
      ideas: [], extends: new Set(), files: new Set(), endFen: c.fen(),
    };
    e.names.add(l.name); e.openings.add(l.opening); e.kinds.add(l.kind); e.statuses.add(l.status); e.files.add(f);
    if (l.extendsId) e.extends.add(l.extendsId);
    if (l.videoId) e.videos.push({ id: l.videoId, title: l.videoTitle, minute: l.minute });
    if (l.idea) e.ideas.push(l.idea);
    if (typeof l.games === 'number') { e.games += l.games; if (typeof l.score === 'number') e.score = l.score; }
    byMoves.set(key, e);
  }
}

// A line that another line of the same side simply continues is folded into
// the longer one (it teaches nothing the longer line does not play).
const all = [...byMoves.values()];
const prefixOf = (a, b) => a.moves.length < b.moves.length && a.side === b.side && a.moves.every((m, k) => b.moves[k] === m);
const kept = all.filter((a) => !all.some((b) => prefixOf(a, b) && (a.videos.length === 0 || b.videos.length > 0)));

// Group by side + the first four moves (the opening's identity).
const groups = new Map();
for (const l of kept) {
  const g = `${l.side} ${l.moves.slice(0, 4).join(' ')}`;
  (groups.get(g) ?? groups.set(g, []).get(g)).push(l);
}

const out = kept.map((l) => ({
  side: l.side, moves: l.moves.join(' '), names: [...l.names], openings: [...l.openings], kinds: [...l.kinds],
  statuses: [...l.statuses], extends: [...l.extends], taught: l.videos.length > 0, videos: l.videos, played: l.games,
  score: l.score, masters: l.masters, amateur: l.amateur, evalCp: l.evalCp, ideas: l.ideas, endFen: l.endFen, files: [...l.files],
}));
writeFileSync(`${DIR}/_merged.json`, JSON.stringify(out, null, 1));

const md = [`# Levy's lines, merged — ${read} read, ${illegal} illegal dropped, ${byMoves.size} distinct, ${kept.length} after folding prefixes`, ''];
md.push(`taught in a video: ${out.filter((l) => l.taught).length} · played only: ${out.filter((l) => !l.taught).length} · already in his section (duplicate): ${out.filter((l) => l.statuses.includes('duplicate')).length}`, '');
for (const [g, ls] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  md.push(`## ${g} — ${ls.length} lines (${ls.filter((l) => l.videos.length).length} taught)`);
  for (const l of ls.sort((a, b) => (b.videos.length - a.videos.length) || (b.games - a.games))) {
    md.push(`- ${[...l.names][0]} [${[...l.kinds].join('/')}, ${[...l.statuses].join('/')}${l.videos.length ? `, ${l.videos.length} video` : ''}${l.games ? `, ${l.games} games` : ''}${l.evalCp != null ? `, ${l.evalCp}cp` : ''}]: ${l.moves.join(' ')}`);
  }
  md.push('');
}
writeFileSync(`${DIR}/_merged.md`, md.join('\n'));
console.log(md[0]); console.log(md[2]); console.log(`${groups.size} groups`);
