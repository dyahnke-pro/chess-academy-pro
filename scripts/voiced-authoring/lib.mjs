// Shared helpers for authoring voiced narrations. See docs/voiced-narration-pipeline.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from '../../node_modules/chess.js/dist/esm/chess.js';

export const BANK = 'data/video-narration';
export const VOICED = 'data/video-narration-voiced';

/** Recover a banked video from git (the raw bank is gitignored / not in the tree).
 *  Run once per id:  git show 09120f6:data/video-narration/<id>.json > data/video-narration/<id>.json */
export function readBank(id) {
  return JSON.parse(readFileSync(`${BANK}/${id}.json`, 'utf8'));
}

/** THE AUTHORING CHOKEPOINT. `A` maps bank-move array-index → the authored beat:
 *  { explains, teaches?, plans?, kind?, reanchor? }. Every OTHER move is silent ("").
 *  Copies {ply,t,fen,line} straight from the bank (position + timestamp preserved). */
export function build(id, opening, side, A) {
  const bank = readBank(id);
  const out = {
    videoId: bank.videoId, title: bank.title, openingName: opening, studentSide: side,
    voice: 'danya-dna', rewrittenAt: new Date().toISOString().slice(0, 10), source: `yt:${id}`,
    moves: bank.moves.map((m, i) => {
      const a = A[i];
      return {
        ply: m.ply, t: m.t, fen: m.fen, line: m.line,
        spoken: a ? a.explains : '',
        ...(a?.kind ? { kind: a.kind } : {}),
        ...(a?.teaches ? { teaches: a.teaches } : {}),
        ...(a?.plans ? { plans: a.plans } : {}),
        ...(a?.reanchor ? { reanchor: true } : {}),
      };
    }),
  };
  writeFileSync(`${VOICED}/${id}.json`, JSON.stringify(out, null, 1));
  return out;
}

/** Reconstruct the real game main line (ply-monotonic, legal). Same logic the
 *  walkthrough + corpus builders use. */
export function spine(moves) {
  const g = new Chess(); const out = []; let last = 0;
  for (const m of moves) {
    if (typeof m.ply === 'number' && m.ply <= last) continue;
    const line = Array.isArray(m.line) ? m.line : [];
    if (!line.length) continue;
    const snap = g.fen(); const applied = []; let ok = true;
    for (const s of line) { try { if (!g.move(s)) { ok = false; break; } applied.push(s); } catch { ok = false; break; } }
    if (!ok) { g.load(snap); continue; }
    for (const s of applied) out.push(s);
    if (typeof m.ply === 'number') last = m.ply;
  }
  return out;
}
