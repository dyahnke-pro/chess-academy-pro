// mentionedMoveArrows — LEAD THE EYE on every move the narration MENTIONS
// (David 2026-07-30: "I also want arrows pointing out other moves that are
// mentioned during the narrations. The Glek has many other lines mentioned
// during the opening with NO arrows pointing them out. Very difficult for
// beginners and intermediates to follow. Lead the eye!").
//
// G6 already mandates an arrow for every SAN a coach CHAT reply mentions;
// this extends the same contract to lesson beats and walkthrough narration.
// Pure code (G0): SAN tokens are parsed from the prose and resolved against
// the live position with chess.js — a token that isn't a legal move grounds
// nothing and draws nothing.
//
// SEQUENTIAL ROADS: narration often names a whole plan — "h3, then Kh2, Nd2,
// and f4". Only the first move is legal *now*; the rest belong to the road.
// So tokens are resolved in prose order against a PROBE board that plays each
// resolved move: h3 arrows and plays, then Kh2 resolves on the resulting
// position, and the whole road lights up in order. A token that fails on the
// probe gets one try against the ORIGINAL position (a parallel mention, e.g.
// "instead of Bg5"); failing both, it is skipped.
import { Chess } from 'chess.js';
import type { AnnotationArrow } from '../types';

/** Green vision arrow — the playbook's lead-the-eye colour for non-move
 *  reference arrows (matches LessonPlayer's default). */
const VISION = 'rgba(40,185,95,0.92)';

const SAN_TOKEN =
  /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8])\b/g;

/** A bare square token ("d5") is also how prose NAMES squares — "the d5
 *  square", "weak on d5". Only treat it as a pawn-push mention when the
 *  surrounding words don't mark it as a square reference. */
function isSquareNameContext(text: string, index: number, token: string): boolean {
  if (!/^[a-h][1-8]$/.test(token)) return false;
  const before = text.slice(Math.max(0, index - 12), index).toLowerCase();
  const after = text.slice(index + token.length, index + token.length + 12).toLowerCase();
  return /\b(on|the|at|to|square|from)\s*$/.test(before) || /^\s*-?(square|file|rank|diagonal|pawn|knight|bishop|rook|queen|king)/.test(after);
}

const MAX_ARROWS = 6;

/** Null-move: same position, other side to move (ep square cleared). */
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
    const legal = board.moves({ verbose: true });
    const hit = legal.find((m) => m.san.replace(/[+#]$/, '') === bare);
    return hit ? { from: hit.from, to: hit.to, san: hit.san } : null;
  } catch {
    return null;
  }
}

/** Arrows for every move the prose mentions, resolved against `fen`.
 *  `exclude` suppresses duplicates of authored arrows and the beat's own
 *  move (its squares are auto-painted by the player). Deterministic. */
export function mentionedMoveArrows(
  text: string,
  fen: string,
  exclude: Array<{ from: string; to: string }> = [],
): AnnotationArrow[] {
  if (!text || !fen) return [];
  let probe: Chess;
  let original: Chess;
  try {
    probe = new Chess(fen);
    original = new Chess(fen);
  } catch {
    return [];
  }
  const seen = new Set(exclude.map((a) => `${a.from}-${a.to}`));
  const out: AnnotationArrow[] = [];
  // Deliberately NOT excluding pawn-origin arrows here: unlike authored vision
  // arrows (lessonIntegrity bans pawn origins for sight-line reasons), a
  // mentioned-move arrow shows a MOVE, and pawn moves are moves.
  for (const match of text.matchAll(SAN_TOKEN)) {
    const m = match[0];
    if (out.length >= MAX_ARROWS) break;
    if (isSquareNameContext(text, match.index ?? 0, m)) continue;
    // Road-first: resolve on the probe and PLAY it so the next token of the
    // named plan resolves on the resulting position. A road is usually ONE
    // side's plan ("h3, Kh2, Nd2, f4"), so when the probe's turn blocks the
    // next step, retry with the turn flipped (null-move) and continue there.
    let hit = resolveOn(probe, m);
    if (hit) {
      try { probe.move(hit.san); } catch { /* keep arrowing */ }
    } else {
      const flippedFen = flipTurn(probe.fen());
      if (flippedFen) {
        const flipped = resolveOn(new Chess(flippedFen), m);
        if (flipped) {
          hit = flipped;
          try { probe = new Chess(flippedFen); probe.move(hit.san); } catch { /* keep arrowing */ }
        }
      }
      if (!hit) hit = resolveOn(original, m); // parallel mention from the live position
    }
    if (!hit) continue;
    const key = `${hit.from}-${hit.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from: hit.from, to: hit.to, color: VISION });
  }
  return out;
}
