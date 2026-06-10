/**
 * arrowEngine — the SINGLE authority for board arrows (G0).
 *
 * Arrows are the last surface where the LLM used to decide chess
 * content. They are now ALL computed in code, from one module, so
 * there is one standard — never the LLM picking from/to or color.
 *
 * Two arrow PURPOSES, one path (David 2026-06-10, "all arrows from
 * the same path, no 2 separate standards"):
 *
 *  - VISION (lead-the-eye): walkthrough / plan arrows that direct the
 *    student's eye — "the knight heads to d5", "the bishop eyes f7".
 *    Two deterministic categories, both read straight off the board /
 *    move list, no engine needed (green cue, not an eval verdict):
 *      (a) THREAT     — the most valuable square the moved piece now
 *                       attacks (capture / check / sensitive square).
 *      (b) LOOK-AHEAD — where that SAME piece moves NEXT on the line.
 *    Never the move's own from→to (the board animates that).
 *
 *  - CANDIDATE: arrows for a move the coach SUGGESTS or JUDGES in chat
 *    ("you could play Nf3", "watch the Ng5 threat"). Geometry from
 *    chess.js; COLOR from Stockfish rank (green=#1, blue=#2,
 *    yellow=#3, red=outside top-3 / real eval loss). One multipv
 *    analysis ranks every mentioned candidate at once.
 *
 * Pure utility module: chess.js is passed where a constructor is
 * needed, and the engine is injected as an analyzer callback, so this
 * file has no hard dep on the engine singleton and stays unit-testable.
 */
import { Chess, type Move, type Square } from 'chess.js';

export type FromTo = { from: string; to: string };
export type ArrowColor = 'green' | 'blue' | 'yellow' | 'red';
/** One ply of a played line: where it moved from/to, whose move, and
 *  the post-move FEN (so threat reads off the resulting position). */
export type LineMove = { from: string; to: string; color: 'w' | 'b'; fen: string };

// ── VISION arrows (deterministic, no engine) ───────────────────────

const SENSITIVE_SQUARES = new Set(['f7', 'f2', 'h7', 'h2', 'g7', 'g2']);
const ARROW_PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Flip the side-to-move in a FEN (and clear en-passant) so we can
 *  generate the moves of the side that JUST moved — that reveals what
 *  the piece on its destination square now attacks. Returns null when
 *  the flip would be illegal (e.g. the move was a check, leaving the
 *  opponent's king in check with the mover to move) — the threat is
 *  then self-evident from the SAN's +, and we skip the arrow. */
function withSideToMove(fen: string, color: 'w' | 'b'): string | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  parts[1] = color;
  parts[3] = '-';
  return parts.join(' ');
}

/** THREAT arrow: the single most valuable square the piece now on
 *  `toSquare` attacks. Null when it threatens nothing concrete. */
export function computeThreatArrow(postFen: string, movedColor: 'w' | 'b', toSquare: string): FromTo | null {
  const flipped = withSideToMove(postFen, movedColor);
  if (!flipped) return null;
  const probe = new Chess();
  try {
    probe.load(flipped);
  } catch {
    return null; // illegal flipped position (the move was a check) → skip
  }
  let best: { to: string; score: number } | null = null;
  let moves: Move[];
  try {
    moves = probe.moves({ square: toSquare as Square, verbose: true });
  } catch {
    return null;
  }
  for (const m of moves) {
    let score = 0;
    if (m.isCapture()) score += 10 + (m.captured ? ARROW_PIECE_VALUE[m.captured] ?? 0 : 0);
    if (m.san.includes('+') || m.san.includes('#')) score += 6;
    if (SENSITIVE_SQUARES.has(m.to)) score += 2;
    if (score > 0 && (!best || score > best.score)) best = { to: m.to, score };
  }
  return best ? { from: toSquare, to: best.to } : null;
}

/** LOOK-AHEAD arrow: where the piece now on seq[i].to moves NEXT on
 *  the line (the first later same-colour move departing that square). */
export function computeLookAheadArrow(seq: LineMove[], i: number): FromTo | null {
  const square = seq[i].to;
  const color = seq[i].color;
  for (let j = i + 1; j < seq.length; j += 1) {
    if (seq[j].color !== color) continue;
    if (seq[j].from === square) {
      return seq[j].to === square ? null : { from: square, to: seq[j].to };
    }
  }
  return null;
}

/** Per-ply lead-the-eye (VISION) arrows for a played line — threat +
 *  look-ahead, computed from board geometry alone. Max 2 per ply,
 *  deduped. These are green cues (applied by the renderer / caller). */
export function computeLeadEyeArrows(seq: LineMove[]): FromTo[][] {
  return seq.map((mv, i) => {
    const arrows: FromTo[] = [];
    const threat = computeThreatArrow(mv.fen, mv.color, mv.to);
    if (threat) arrows.push(threat);
    const ahead = computeLookAheadArrow(seq, i);
    if (ahead && !arrows.some((a) => a.from === ahead.from && a.to === ahead.to)) {
      arrows.push(ahead);
    }
    return arrows;
  });
}

// ── CANDIDATE arrows (chat — geometry in code, color from Stockfish) ─

/** SAN-token regex — the common move shapes the coach mentions in
 *  prose (pawn/piece moves, captures, promotions, castling).
 *  Relocated from the now-deleted arrowClaimValidator. */
const SAN_TOKEN_RE = /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?[+#]?)\b(?![a-z])/g;

/** SAN-shaped tokens that are actually descriptive square references
 *  ("the e4 square", "Black's d-file") — not move mentions. */
const NON_MOVE_PHRASE_PRECEDERS = new Set([
  'the', 'a', 'on', 'at', 'square', 'pawn', 'piece', 'file',
  'rank', 'diagonal', 'point', 'about', 'around', 'near',
]);

/** Strip `[BOARD: ...]` directives so the SAN scan doesn't match the
 *  coordinates inside an arrow marker (and so we can re-derive arrows
 *  from scratch, discarding any the LLM may have emitted). */
export function stripBoardMarkers(text: string): string {
  return text.replace(/\[BOARD:[^\]]*\]/g, ' ');
}

/** Every SAN-shaped move the coach mentioned in prose, descriptive
 *  square-references filtered out. Markers stripped first. */
export function extractMentionedSans(text: string): string[] {
  const cleaned = stripBoardMarkers(text);
  const out: string[] = [];
  let match: RegExpExecArray | null;
  SAN_TOKEN_RE.lastIndex = 0;
  while ((match = SAN_TOKEN_RE.exec(cleaned)) !== null) {
    const san = match[0];
    const before = cleaned.slice(Math.max(0, match.index - 16), match.index);
    const precedingWord = before.trim().split(/\s+/).pop()?.toLowerCase() ?? '';
    if (NON_MOVE_PHRASE_PRECEDERS.has(precedingWord)) continue;
    out.push(san);
  }
  return out;
}

/** Resolve a SAN to its from→to squares, trying the running position,
 *  then the original FEN, then turn-flipped variants (the coach often
 *  cites hypothetical / opponent / branch moves that aren't legal for
 *  the side to move). Mirrors the old synthesizeMissingArrows retry. */
export function resolveSanToArrow(san: string, fens: string[]): FromTo | null {
  for (const fen of fens) {
    for (const f of [fen, toggleTurn(fen)]) {
      try {
        const probe = new Chess(f);
        const mv = probe.move(san, { strict: false });
        if (mv) return { from: mv.from, to: mv.to };
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

function toggleTurn(fen: string): string {
  const parts = fen.split(' ');
  if (parts.length < 2) return fen;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  return parts.join(' ');
}

/** A move the engine ranked at this position. */
export interface RankedCandidate {
  from: string;
  to: string;
  rank: number; // 1-based multipv rank
}

/** Engine analyzer injected by the caller (adapts the stockfish
 *  singleton). Returns the top moves at `fen`, ranked. */
export type MultipvAnalyzer = (fen: string) => Promise<RankedCandidate[]>;

/** Color a candidate by its engine rank. Green=#1, blue=#2, yellow=#3,
 *  red = outside the top 3 (the coach mentioned a move the engine
 *  doesn't rate among the best — usually a threat to avoid or a
 *  mistake to warn against). */
export function colorForRank(rank: number | null): ArrowColor {
  if (rank === 1) return 'green';
  if (rank === 2) return 'blue';
  if (rank === 3) return 'yellow';
  return 'red';
}

/** Inject CANDIDATE arrows for every move the coach mentioned: strip
 *  any LLM-emitted markers, extract SANs, resolve geometry in code,
 *  color by one multipv analysis, append `[BOARD: arrow:from-to:color]`
 *  markers. The LLM never picks geometry or color.
 *
 *  `fen` is the position the prose describes. `analyze` ranks the
 *  position's top moves (one engine call). Returns the text with
 *  code-derived markers and the list injected. */
export async function injectCandidateArrows(
  text: string,
  fen: string,
  analyze: MultipvAnalyzer,
): Promise<{ text: string; injected: { san: string; color: ArrowColor }[] }> {
  const base = stripBoardMarkers(text).replace(/\s+/g, ' ').trim();
  const sans = Array.from(new Set(extractMentionedSans(text)));
  if (sans.length === 0) return { text: base, injected: [] };

  let ranked: RankedCandidate[] = [];
  try {
    ranked = await analyze(fen);
  } catch {
    ranked = [];
  }
  const rankOf = (a: FromTo): number | null => {
    const hit = ranked.find((r) => r.from === a.from && r.to === a.to);
    return hit ? hit.rank : null;
  };

  const markers: string[] = [];
  const injected: { san: string; color: ArrowColor }[] = [];
  const seen = new Set<string>();
  for (const san of sans) {
    const arrow = resolveSanToArrow(san, [fen]);
    if (!arrow) continue;
    const key = `${arrow.from}-${arrow.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const color = colorForRank(rankOf(arrow));
    markers.push(`[BOARD: arrow:${arrow.from}-${arrow.to}:${color}]`);
    injected.push({ san, color });
  }
  if (markers.length === 0) return { text: base, injected: [] };
  return { text: `${base} ${markers.join(' ')}`, injected };
}
