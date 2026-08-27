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
import { depersonalize } from './depersonalize.mjs';

const keyOf = (fen) => fen.split(' ').slice(0, 4).join(' '); // board + turn + castling + ep

// A piece on its OWN colour's original starting square. A narrator's rewind /
// "what-if I retreat" analysis (Qd2→Qd1, Nf3→Ng1, …Bg7→…Bf8, Nc3→Nb1, …Ng8,
// Bf4→Bc1) marches a developed piece back HOME — something a real opening line
// never does. Fen-anchoring can't catch it because a retreat is a perfectly
// legal continuation of the running board; this is the extra signal that does.
const START = {
  w: { a1: 'r', b1: 'n', c1: 'b', d1: 'q', e1: 'k', f1: 'b', g1: 'n', h1: 'r' },
  b: { a8: 'r', b8: 'n', c8: 'b', d8: 'q', e8: 'k', f8: 'b', g8: 'n', h8: 'r' },
};
// Only in the OPENING (first ~24 plies) — a move-60 endgame knight maneuver
// (Nf3-g1-e2) legitimately touches g1 and must NOT be rejected.
const OPENING_PLIES = 24;
const isRetreatToStart = (mv, plyIndex) =>
  plyIndex < OPENING_PLIES && !mv.captured && START[mv.color]?.[mv.to] === mv.piece;

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
    spoken: depersonalize(m.spoken),
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
          try {
            const mv = g.move(s);
            if (!mv) { ok = false; break; }
            // Reject the whole node the instant it retreats a piece home in the
            // opening — that's narrator analysis, not the game (see isRetreatToStart).
            if (isRetreatToStart(mv, spine.length + applied.length)) { ok = false; break; }
            applied.push(s);
          } catch { ok = false; break; }
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

  // ── THE REWIND ASIDES (David 2026-08-27) ────────────────────────────────
  // The beats the main-line walk COULDN'T use — a narrator's rewind /
  // "why this move and not that one" / recap. They carry the deepest teaching
  // (the WHY), and the old builder discarded them. Recover each: anchor it to
  // the spine ply it branches FROM (its from-board == a spine node's board), so
  // the walkthrough can speak it as an inline aside at that position. `spineFens`
  // = the board after each accepted spine ply; index -1 = the start position.
  const spineFens = [];
  {
    const gg = new Chess();
    for (const s of spine) { try { gg.move(s.san); } catch { /* keep going */ } spineFens.push(gg.fen()); }
  }
  const froms = [{ idx: -1, fen: new Chess().fen() }, ...spineFens.map((fen, idx) => ({ idx, fen }))];
  const asides = [];
  for (let i = 0; i < cand.length; i++) {
    if (used[i]) continue;
    const n = cand[i];
    if (!n.spoken || !n.sans.length) continue;
    for (const from of froms) {
      const gg = new Chess();
      try { gg.load(from.fen); } catch { continue; }
      let ok = true;
      // Capture the from→to of every move the aside MENTIONS. The aside is
      // spoken WITHOUT playing the line out, so the board must arrow the moves
      // it names (David 2026-08-27, the G6 lead-the-eye rule) — the student
      // sees "knight to c3" as an arrow, never hunts for it.
      const arrows = [];
      for (const s of n.sans) {
        try { const mv = gg.move(s); if (!mv) { ok = false; break; } arrows.push({ from: mv.from, to: mv.to, san: mv.san }); }
        catch { ok = false; break; }
      }
      if (ok && keyOf(gg.fen()) === keyOf(n.afterFen)) {
        asides.push({ afterSpineIndex: from.idx, spoken: n.spoken, arrows, teaches: n.teaches || undefined, kind: n.kind || undefined });
        break;
      }
    }
  }
  return { spine, nodes, asides };
}
