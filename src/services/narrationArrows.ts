// narrationArrows — derive a ply's arrows from the moves its narration NAMES,
// with every candidate verified before it is allowed to draw.
//
// David 2026-07-31: "It should be only the squares and threats mentioned in the
// narration. Nothing more, nothing less. That way everything blends together.
// Unified." — and "We need to make the arrows deterministic."
//
// This REPLACES the runtime prose-scrape in `mentionedMoveArrows`. The
// difference that matters is WHEN it runs: derivation happens offline, at bake
// time, where a wrong arrow can be rejected and reviewed. The old path derived
// arrows at render time with no gate, so three classes of false arrow shipped
// straight to the board (all three measured on the shipped Grand Prix / Glek
// narration, 2026-07-31):
//
//   "keeps the knight off f3"  → drew f2-f3   (f3 is a SQUARE reference)
//   "Bc4 (or Bb5)"             → drew c4-b5   (an ALTERNATIVE, resolved after
//                                              the probe had already played Bc4)
//   "Qe1-h4"                   → drew h2-h4   (COMPOUND notation; the trailing
//                                              square read as a pawn push)
//
// G0/G3: pure code. Nothing is invented — a token that doesn't resolve to a
// legal move from a real position draws nothing at all.
import { Chess } from 'chess.js';

/** A derived arrow plus the evidence for it, so a bake pass can be reviewed
 *  and a rejection can explain itself. */
export interface DerivedArrow {
  from: string;
  to: string;
  /** The SAN this arrow represents, as resolved on the board. */
  san: string;
  /** The exact prose token that produced it. */
  token: string;
  /** Character offset of `token` in the narration text — lets a caller align
   *  an arrow with the sentence that names it. */
  index: number;
  /** Whose move it is: the side to move at this position, or the opponent
   *  (a named reply, resolved via a null move). */
  side: 'mover' | 'opponent';
}

export interface DerivationResult {
  arrows: DerivedArrow[];
  /** Every token considered and rejected, with the reason — the gate's report. */
  rejected: Array<{ token: string; index: number; reason: string }>;
}

/** Compound move notation the prose uses for a plan: "Qe1-h4", "Nd2-f1-g3".
 *  Matched FIRST so the trailing square is never mistaken for a pawn push. */
const COMPOUND = /\b([KQRBN])([a-h][1-8])((?:-[a-h][1-8])+)/g;

const SAN_TOKEN =
  /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8])\b/g;

// A BARE coordinate ("d5") is a square NAME at least as often as a pawn move,
// so it only draws when nothing marks it as a reference. The bias is
// deliberate: a MISSING arrow is a papercut, a WRONG arrow is the bug David
// reported three times. Piece moves (Nf3, Bb5, Qh4) are unambiguous.
// CONTROL/RELATION language — "controlling e5", "control of e4", "supports
// e4", "the weak d5-square", "off f3". The verb can sit a couple of words back
// behind a preposition or article, which is exactly what a strictly-adjacent
// blocklist kept missing, so the window allows that bridge.
const SQUARE_CONTEXT_BEFORE =
  /\b(?:control|cover|support|guard|defend|protect|occupy|occupies|hold|dominate|target|watch|eye|hit|press|attack|blockade|clamp|owns?|claims?|weak(?:ness)?|outpost|square|file|rank|diagonal)\w*\s+(?:of\s+|on\s+|for\s+|over\s+|at\s+)?(?:the\s+)?$/i
  ;
// Plain positional prepositions immediately before the coordinate.
const SQUARE_PREPOSITION_BEFORE =
  /\b(on|onto|off|in|at|the|to|from|via|toward|towards|through|over|near|around|along|into|against)\s+$/i;
const SQUARE_CONTEXT_AFTER =
  /^\s*-?\s*(square|file|rank|diagonal|pawn|knight|bishop|rook|queen|king|outpost|break|push|is|was|becomes|falls|stays)\b/i;
// A token written the way a MOVE is written — a capture or a check — is never
// a square name.
const MOVE_SHAPED = /[x+#]/;

// An ALTERNATIVE is not the next step of a plan — it branches from the SAME
// position. "Bc4 (or Bb5)", "d4 instead of d3", "Nf3 rather than Nc3".
const ALTERNATIVE_BEFORE = /\b(or|instead\s+of|rather\s+than|versus|vs\.?|not|never|avoid(?:ing)?)\s*\(?\s*$/i;

const MAX_ARROWS = 6;

/** Null move: same position, other side to move. Lets the prose name the
 *  OPPONENT's reply ("Black answers …d6") from a position where it isn't
 *  their turn yet. */
function flipTurn(fen: string): string | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  return parts.join(' ');
}

function resolveOn(board: Chess, sanRaw: string): { from: string; to: string; san: string } | null {
  const bare = sanRaw.replace(/[+#]$/, '');
  try {
    const hit = board.moves({ verbose: true }).find((m) => m.san.replace(/[+#]$/, '') === bare);
    return hit ? { from: hit.from, to: hit.to, san: hit.san } : null;
  } catch {
    return null;
  }
}

/** Spans covered by compound notation, so their inner squares are skipped by
 *  the plain SAN pass. */
function compoundSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  for (const m of text.matchAll(COMPOUND)) {
    const i = m.index ?? 0;
    spans.push({ start: i, end: i + m[0].length });
  }
  return spans;
}

/**
 * Derive the arrows for ONE ply.
 *
 * @param text  the narration spoken at this ply
 * @param fen   the position AFTER the ply's move (what the student is looking at)
 * @param exclude squares already arrowed (the trail) so nothing doubles up
 */
export function deriveNarrationArrows(
  text: string,
  fen: string,
  exclude: Array<{ from: string; to: string }> = [],
): DerivationResult {
  const rejected: Array<{ token: string; index: number; reason: string }> = [];
  if (!text || !fen) return { arrows: [], rejected };

  let original: Chess;
  try {
    original = new Chess(fen);
  } catch {
    return { arrows: [], rejected };
  }
  const flippedFen = flipTurn(fen);
  const flipped = flippedFen ? new Chess(flippedFen) : null;

  // A PLAN's steps chain ("h3, then Kh2, Nd2, and f4") so each resolves on the
  // position the previous one made. An ALTERNATIVE does not — it is measured
  // from where we actually are. ONE chain board, advanced only by plan steps.
  let chain = new Chess(fen);

  const spans = compoundSpans(text);
  const insideCompound = (i: number): boolean => spans.some((s) => i > s.start && i < s.end);

  const seen = new Set(exclude.map((a) => `${a.from}-${a.to}`));
  const arrows: DerivedArrow[] = [];

  // A coordinate LIST shares one classification. "control d5 and f5" is two
  // square references; "play d6, e6, or g6" is three moves. Guarding only the
  // head left the tail drawing arrows in the first case (caught by the shadow
  // diff across the baked openings, 2026-07-31) — so the head's verdict is
  // inherited by every item joined to it by a list connective.
  let listHead: { end: number; isSquareRef: boolean } | null = null;
  const LIST_JOIN = /^[\s,]*(and|or|,)?[\s,]*\(?$/i;

  const consider = (token: string, index: number, alternative: boolean): void => {
    // Never drop a mention silently — a capped tail reads as full coverage
    // when it isn't, so the overflow is recorded for the review pass.
    if (arrows.length >= MAX_ARROWS) {
      rejected.push({ token, index, reason: `over the ${MAX_ARROWS}-arrow cap for one ply` });
      return;
    }
    const before = text.slice(Math.max(0, index - 24), index);
    const after = text.slice(index + token.length, index + token.length + 14);

    if (/^[a-h][1-8]$/.test(token) && !MOVE_SHAPED.test(token)) {
      const gap = listHead && index > listHead.end ? text.slice(listHead.end, index) : null;
      const inList = gap !== null && gap.length <= 8 && LIST_JOIN.test(gap);
      const isSquareRef = inList && listHead
        ? listHead.isSquareRef
        : SQUARE_CONTEXT_BEFORE.test(before)
          || SQUARE_PREPOSITION_BEFORE.test(before)
          || SQUARE_CONTEXT_AFTER.test(after);
      listHead = { end: index + token.length, isSquareRef };
      if (isSquareRef) {
        rejected.push({ token, index, reason: 'square reference, not a move' });
        return;
      }
    } else {
      listHead = { end: index + token.length, isSquareRef: false };
    }

    // An ALTERNATIVE branches from the live position and must never advance
    // the chain, or the next mention resolves from a position the game never
    // reached ("Bc4 (or Bb5)" drew the bishop moving ON from c4).
    // A PLAN step continues from wherever the chain is.
    // Either way: try the side to move, then the other side via a null move,
    // since prose freely names the opponent's reply.
    const base = alternative ? original : chain;
    const baseFlippedFen = flipTurn(base.fen());
    const candidates: Array<{ board: Chess; side: DerivedArrow['side'] }> = [
      { board: base, side: 'mover' },
      ...(baseFlippedFen ? [{ board: new Chess(baseFlippedFen), side: 'opponent' as const }] : []),
    ];
    // A plan step that fits neither may still be a parallel mention from the
    // real position — try that last rather than drawing nothing.
    if (!alternative) {
      candidates.push({ board: original, side: 'mover' });
      if (flipped) candidates.push({ board: new Chess(flipped.fen()), side: 'opponent' });
    }

    for (const { board, side } of candidates) {
      const hit = resolveOn(board, token);
      if (!hit) continue;
      const key = `${hit.from}-${hit.to}`;
      if (seen.has(key)) {
        rejected.push({ token, index, reason: 'duplicate of an existing arrow' });
        return;
      }
      seen.add(key);
      arrows.push({ from: hit.from, to: hit.to, san: hit.san, token, index, side });
      if (!alternative) {
        try {
          board.move(hit.san);
          chain = new Chess(board.fen());
        } catch { /* the arrow stands; the chain just stops advancing */ }
      }
      return;
    }
    rejected.push({ token, index, reason: 'no legal move matches from this position' });
  };

  // Compound notation first — "Qe1-h4" is ONE move to its final square.
  for (const m of text.matchAll(COMPOUND)) {
    const index = m.index ?? 0;
    const squares = m[3].split('-').filter(Boolean);
    const dest = squares[squares.length - 1];
    consider(`${m[1]}${dest}`, index, ALTERNATIVE_BEFORE.test(text.slice(Math.max(0, index - 24), index)));
  }

  for (const m of text.matchAll(SAN_TOKEN)) {
    const index = m.index ?? 0;
    if (insideCompound(index)) continue;
    consider(m[0], index, ALTERNATIVE_BEFORE.test(text.slice(Math.max(0, index - 24), index)));
  }

  return { arrows, rejected };
}
