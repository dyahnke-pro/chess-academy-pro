// Fen-anchored main-line reconstruction for voiced files — the retroactive fix
// for rewind ("reanchor") corruption (David 2026-08-26).
//
// THE BUG IT REPLACES: the old walk kept the forward line by ply-monotonicity
// (`ply <= last` = rewind, skip). But a narrator who rewinds and then walks a
// NEW variation forward produces plies that climb ABOVE the previous max, so
// those rewind moves slipped the guard — and when they happened to be legal
// from the running board they were spliced onto the main line, dropping real
// moves (e.g. a recapture) and marching pieces backward (Nb1, Ng8). The KIA-vs-
// French matchup came out teaching White walking a knight onto a square where a
// pawn just wins it.
//
// THE FIX: a node may extend the line ONLY if its moves apply legally from the
// running board AND land exactly on that node's OWN recorded `fen`
// (board+turn+castling+ep). A rewind/analysis node's fen encodes a different
// board, so it can never match the running position — it is never spliced in.
// Reanchor nodes that ARE a fen-consistent forward continuation (a real move the
// narrator only showed after a rewind) safely fill gaps, so the true main line
// is recovered in full. Non-reanchor nodes are preferred at each step so the
// walk follows the actual game rather than a sideline.
import { Chess } from '../../node_modules/chess.js/dist/esm/chess.js';

const keyOf = (fen) => fen.split(' ').slice(0, 4).join(' '); // board + turn + castling + ep

/**
 * @returns {{ spine: Array<{san,movedBy,spoken?,kind?,teaches?,plans?}>,
 *             nodes: Array<{ply,lineSan:string[],fenAfter:string,spoken?,teaches?,plans?,kind?}> }}
 *   `spine` = one object per ply (used by the walkthrough/matchup tree builders).
 *   `nodes` = one object per accepted source node, with cumulative lineSan and the
 *   board after it (used by the corpus builder to emit a position-keyed note).
 */
export function reconstructSpineFen(moves) {
  const cand = (Array.isArray(moves) ? moves : []).map((m) => ({
    sans: Array.isArray(m.line) ? m.line : [],
    afterFen: typeof m.fen === 'string' ? m.fen : null,
    spoken: m.spoken,
    kind: m.kind,
    teaches: m.teaches,
    plans: m.plans,
    ply: m.ply,
    reanchor: !!m.reanchor,
  })).filter((n) => n.sans.length && n.afterFen);

  const g = new Chess();
  const spine = [];
  const nodes = [];
  const sansSoFar = [];
  const used = new Array(cand.length).fill(false);

  let advanced = true;
  while (advanced) {
    advanced = false;
    // Prefer a non-reanchor node (the real game); only then a fen-consistent
    // reanchor node (fills a gap the narrator showed after a rewind).
    for (const wantReanchor of [false, true]) {
      for (let i = 0; i < cand.length; i++) {
        if (used[i] || cand[i].reanchor !== wantReanchor) continue;
        const n = cand[i];
        const snap = g.fen();
        const applied = [];
        let ok = true;
        for (const s of n.sans) {
          try { if (!g.move(s)) { ok = false; break; } applied.push(s); } catch { ok = false; break; }
        }
        if (ok && keyOf(g.fen()) === keyOf(n.afterFen)) {
          for (let k = 0; k < applied.length; k++) {
            const isLast = k === applied.length - 1;
            sansSoFar.push(applied[k]);
            spine.push({
              san: applied[k],
              movedBy: (spine.length % 2 === 0) ? 'white' : 'black',
              spoken: isLast ? (n.spoken || undefined) : undefined,
              kind: isLast ? n.kind : undefined,
              teaches: isLast ? (n.teaches || undefined) : undefined,
              plans: isLast ? (n.plans || undefined) : undefined,
            });
          }
          nodes.push({
            ply: n.ply,
            lineSan: [...sansSoFar],
            fenAfter: g.fen(),
            spoken: n.spoken,
            teaches: n.teaches,
            plans: n.plans,
            kind: n.kind,
          });
          used[i] = true;
          advanced = true;
          break;
        } else {
          g.load(snap);
        }
      }
      if (advanced) break;
    }
  }
  return { spine, nodes };
}
