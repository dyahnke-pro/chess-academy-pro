// The course as the reply tools read it (WO-COURSE-01 D): every opening the
// app teaches, with its main line, its variations (the spine — what the tabs
// play) and every taught line (the spine plus the curated reply lines in
// course-sublines.json). The club-reply builder's reader: the same reading the
// explorer walk did (its own copy in explorer-walk.mjs, proven identical on all
// 167 openings 2026-10-29), so the walk's "no taught line covers it" and the
// builder's re-check read the same course. The walk should import this one.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import gambitName from './gambit-name.cjs';

export const { isGambitName } = gambitName;

/** A board without its move counters — the explorer's and the masters DB's key. */
export const pos = (fen) => fen.split(' ').slice(0, 4).join(' ');

export const tokens = (pgn) =>
  (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

/** The moves every main line / variation shares — where the opening starts. */
export function commonPrefix(seqs) {
  const out = [];
  for (let i = 0; ; i++) {
    const m = seqs[0]?.[i];
    if (!m || seqs.some((s) => s[i] !== m)) return out;
    out.push(m);
  }
}

const COURSE_FILES = ['repertoire', 'gambits', 'anti-openings', 'pro-repertoires'];

/**
 * Every course opening. `spine[0]` is the main line, `spine[1 + i]` variation
 * i; `lines` is the spine followed by every curated reply line.
 * @param {string} root  repo root (with a trailing slash)
 * @param {string[] | null} only  opening ids to keep, or null for all
 */
export function courseOpenings(root, only = null) {
  const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
  const arr = (raw) => (Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw));
  const subs = J('src/data/course-sublines.json');
  const out = [];
  for (const file of COURSE_FILES) {
    let list = [];
    try { list = arr(J(`src/data/${file}.json`)); } catch { /* none */ }
    for (const o of list) {
      if (!o?.id || !o.pgn || (only && !only.includes(o.id))) continue;
      const variations = (o.variations ?? []).map((v) => ({ name: v.name ?? '', sans: tokens(v.pgn) }));
      const spine = [tokens(o.pgn), ...variations.map((v) => v.sans).filter((t) => t.length)];
      const sublines = [];
      for (const [tab, list2] of Object.entries(subs[o.id] ?? {})) for (const s of list2) sublines.push({ tab: Number(tab), ...s });
      out.push({
        id: o.id, name: o.name, color: o.color ?? 'white', file,
        main: tokens(o.pgn), variations, spine, sublines,
        lines: [...spine, ...sublines.map((s) => s.moves)],
      });
    }
  }
  return out;
}

/**
 * The boards the course teaches, by board: the moves of the FIRST taught line
 * (main, then variations, then reply lines) that reaches each, and every move a
 * taught line plays there. Moves are normalised SAN from chess.js.
 * @returns {Map<string, { path: string[], next: Set<string>, line: number }>}
 */
export function taughtBoards(lines) {
  const at = new Map();
  lines.forEach((line, li) => {
    const c = new Chess();
    const path = [];
    for (const san of line) {
      const k = pos(c.fen());
      let m;
      try { m = c.move(san); } catch { break; }
      if (!m) break;
      const node = at.get(k) ?? { path: [...path], next: new Set(), line: li };
      node.next.add(m.san);
      at.set(k, node);
      path.push(m.san);
    }
    const end = pos(c.fen());
    if (!at.has(end)) at.set(end, { path: [...path], next: new Set(), line: li });
  });
  return at;
}
