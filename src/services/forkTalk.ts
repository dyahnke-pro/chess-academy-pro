// forkTalk — "two roads here" (David 2026-07-11: "when there is a fork in the
// road the coach could talk about both options… like the Vienna gambit
// declined — Qf3 and Nf3 — what both moves do, advantages and disadvantages").
//
// The deliberation complement to guided find-the-move: the question fires when
// ONE move is clearly best; the fork-talk fires when the top options are near-
// EQUAL but lead to different games. The coach deliberates both roads and the
// student answers BY PLAYING — never a card, never a block. Max 3 per game
// (the caller enforces), one road-affirming clause after the pick, then quiet.
//
// G0: every fact here is computed — engine evals/gaps, chess.js geometry,
// named DB continuations. The narration deliberates; it never picks.

import { Chess } from 'chess.js';
import { describeMoveGeometry } from './groundedAnswer';
import { detectOpening, findContinuationsAtPly } from './openingDetectionService';
import { noteAtPosition } from './danyaTeachingService';

export interface ForkOptionInput {
  /** UCI of the candidate ("g1f3"). */
  uci: string;
  /** Mover-POV centipawns for this line (higher = better for the student). */
  evalCp: number;
}

export interface ForkOption {
  san: string;
  from: string;
  to: string;
  /** Named DB line this move heads into, when the DB knows one. */
  headsInto: string | null;
  /** Computed character: 'sharp' (capture/check/attacking geometry) or 'solid'. */
  character: 'sharp' | 'solid';
  /** What the move does (geometry), when nameable. */
  does: string | null;
  /** Curated teaching note for this exact continuation, when the corpus
   *  covers it — the idea + plan taught for this road. */
  teachingNote: string | null;
}

export interface ForkTalk {
  options: ForkOption[];
  /** The computed facts block for the narration (live register deliberation). */
  facts: string;
  /** One arrow per road (green first road, blue second). */
  arrows: Array<{ startSquare: string; endSquare: string; color: string }>;
  /** Road-affirm clauses, keyed by SAN — spoken AFTER the student picks. */
  affirmBySan: Record<string, string>;
}

/** Max mover-POV gap between roads for a genuine fork. */
export const FORK_MAX_GAP_CP = 40;
const ROAD_COLORS = ['#22c55e', '#3b82f6'];

function probe(fen: string, uci: string): { san: string; from: string; to: string; isCapture: boolean; isCheck: boolean; piece: string } | null {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    return { san: mv.san, from: mv.from, to: mv.to, isCapture: !!mv.captured, isCheck: c.isCheck(), piece: mv.piece };
  } catch {
    return null;
  }
}

/**
 * Detect + build a fork-talk from the engine's top lines at `fen` (student to
 * move). Returns null unless there are ≥2 near-equal options (gap ≤
 * FORK_MAX_GAP_CP) with genuinely different characters — different piece, or
 * sharp-vs-solid — so two move-orders of the same idea never qualify.
 * Everything computed; empty > generic > invented.
 */
export function buildForkTalk(opts: {
  fen: string;
  historySans: string[];
  options: ForkOptionInput[];
}): ForkTalk | null {
  const { fen, historySans } = opts;
  if (opts.options.length < 2) return null;
  const sorted = [...opts.options].sort((a, b) => b.evalCp - a.evalCp);
  const near = sorted.filter((o) => sorted[0].evalCp - o.evalCp <= FORK_MAX_GAP_CP).slice(0, 2);
  if (near.length < 2) return null;

  const mover: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
  const det = (() => { try { return detectOpening(historySans); } catch { return null; } })();
  const continuations = (() => { try { return findContinuationsAtPly(historySans); } catch { return new Map<string, { name: string; eco: string }>(); } })();

  const built: ForkOption[] = [];
  for (const o of near) {
    const p = probe(fen, o.uci);
    if (!p) return null;
    let does: string | null = null;
    try { does = describeMoveGeometry(fen, p.san, mover); } catch { /* bonus */ }
    const headsIntoRaw = continuations.get(p.san)?.name ?? null;
    const headsInto = headsIntoRaw && det && headsIntoRaw === det.name ? null : headsIntoRaw;
    // Sharp = forcing chess (a capture, a check, or concrete tactical
    // geometry). A developing move that merely "attacks a pawn" is still
    // solid chess — the eager version misread every Nf3 as sharp.
    const character: ForkOption['character'] =
      p.isCapture || p.isCheck || (does !== null && /fork|pin|skewer|wins|mate/i.test(does))
        ? 'sharp'
        : 'solid';
    // TEACHING note for this exact road (David 2026-07-12: fork deliberations
    // carry what he TEACHES about each continuation when the corpus covers it).
    let teachingNote: string | null = null;
    try {
      const note = noteAtPosition([...historySans, p.san]);
      if (note) teachingNote = `${note.teaches}${note.plans ? ` ${note.plans}` : ''}`.trim();
    } catch { /* corpus is a bonus, never a blocker */ }
    built.push({ san: p.san, from: p.from, to: p.to, headsInto, character, does, teachingNote });
  }

  // A genuine fork needs DIFFERENT lives: a different mover piece, or a
  // sharp-vs-solid character split. Same-piece same-character alternatives
  // are move-order noise, not a road choice — even when the DB happens to
  // name both (Nf3 vs Nh3 are both quiet knight moves, not two roads).
  const [a, b] = built;
  const pa = probe(fen, near[0].uci);
  const pb = probe(fen, near[1].uci);
  const distinct = (pa && pb && pa.piece !== pb.piece) || a.character !== b.character;
  if (!distinct) return null;

  const gapPawns = ((sorted[0].evalCp - near[1].evalCp) / 100).toFixed(1);
  const describe = (o: ForkOption): string => {
    const bits: string[] = [];
    if (o.does) bits.push(`it ${o.does}`);
    if (o.headsInto) bits.push(`it heads into the ${o.headsInto}`);
    bits.push(o.character === 'sharp' ? 'the game turns sharp and forcing' : 'a solid, patient game — develop and keep the tension');
    if (o.teachingNote) bits.push(`coaching note for this road: ${o.teachingNote}`);
    return `${o.san}: ${bits.join('; ')}`;
  };
  const facts =
    `FORK IN THE ROAD — two real options here, near-equal (engine gap about ${gapPawns} pawns). ` +
    `Road one — ${describe(a)}. Road two — ${describe(b)}. ` +
    `Deliberate BOTH roads for the student — what each move does and the kind of game it leads to — ` +
    `and END by asking which game they want to play. Do NOT recommend one; the student answers by playing.`;

  const affirm = (o: ForkOption): string =>
    o.character === 'sharp'
      ? `The sharp road — from here the initiative is the whole point, so keep the pressure on.`
      : `The patient road — finish development and let the position ripen before it opens.`;

  return {
    options: built,
    facts,
    arrows: built.map((o, i) => ({ startSquare: o.from, endSquare: o.to, color: ROAD_COLORS[i] ?? ROAD_COLORS[0] })),
    affirmBySan: Object.fromEntries(built.map((o) => [o.san, affirm(o)])),
  };
}
