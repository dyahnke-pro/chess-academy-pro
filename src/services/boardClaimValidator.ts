/**
 * Board-claim validator — the RUNTIME board-fact guard that was missing.
 *
 * The app's hallucination guards (G3 / DB-as-truth, claimValidator,
 * arrowClaimValidator) all protect the MOVES: the coach can't play or
 * name an illegal / fabricated move because moves come from the DB +
 * Stockfish and are chess.js-validated. But the free-text PROSE that
 * explains a move was never checked against the board at runtime —
 * `narrationAccuracy` does that, but only at BUILD time on hand-authored
 * JSON lessons, never on live LLM output. That gap let an in-game hint
 * say "Black's queen on b6 pins the knight on f3 to your king" — a
 * geometrically impossible pin (b6 / f3 / e1 aren't collinear, and the
 * a7-g1 diagonal is blocked by d4) on a real, correctly-placed set of
 * pieces. The move (Be2) was real; the SENTENCE lied.
 *
 * This module validates two classes of board-fact claim in free text
 * against a FEN, with chess.js as the source of truth:
 *
 *   1. PIECE-ON-SQUARE — "the knight on f3", "queen on b6", "f6-knight".
 *      Flagged when that square does NOT currently hold a piece of the
 *      named type (and color, when the text states one explicitly).
 *
 *   2. PIN / SKEWER GEOMETRY — "A pins/skewers B to C". Flagged when the
 *      three resolved squares are NOT a valid line for the pinning piece
 *      with the pinned piece between them (the impossible-pin case).
 *
 * DESIGN PRINCIPLE — only flag PROVABLY-false claims; stay silent when
 * unsure (David: "empty > generic > invented"; never strip a valid
 * claim). Concretely:
 *   - Piece-on-square checks skip clauses that talk about a FUTURE /
 *     hypothetical position ("after Be2…", "if O-O…", "then Re1…") —
 *     those describe a board that doesn't exist yet, so the current FEN
 *     can't judge them.
 *   - Pin/skewer checks only evaluate a claim when all three squares
 *     resolve to concrete squares AND the pinner/pinned squares actually
 *     hold the named piece types NOW (so the claim is about the present
 *     board). Anything unresolved is left alone.
 *
 * Pure / read-only. Callers decide what to do with violations (the hint
 * path drops the offending sentence before it's spoken).
 */
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';

export type BoardClaimKind = 'piece-on-square' | 'pin-geometry';

export interface BoardClaimViolation {
  kind: BoardClaimKind;
  /** The offending phrase, verbatim from the text. */
  claim: string;
  /** Plain-language reason it's false (for audits / debugging). */
  reason: string;
}

export interface BoardClaimResult {
  ok: boolean;
  violations: BoardClaimViolation[];
}

const PIECE_WORD_TO_TYPE: Record<string, PieceSymbol> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};
const TYPE_TO_PIECE_WORD: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Clauses describing a position that doesn't exist yet — the current
 *  FEN can't adjudicate piece-on-square claims inside them. Pin GEOMETRY
 *  is still checked separately (it gates on present pieces). */
const FUTURE_MARKER_RE = /\b(after|if|once|then|would|will|could|should|when|next|prepares?|preparing|plan(?:s|ning)?|threatens?|going to|about to)\b/i;

function isSquare(s: string): s is Square {
  return /^[a-h][1-8]$/.test(s);
}

function fileIdx(sq: string): number { return sq.charCodeAt(0) - 97; }
function rankIdx(sq: string): number { return sq.charCodeAt(1) - 49; }

/** All squares strictly between `a` and `c` if they share a rank, file,
 *  or diagonal; null when the two squares are not on one straight line. */
function lineBetween(a: string, c: string): string[] | null {
  const df = fileIdx(c) - fileIdx(a);
  const dr = rankIdx(c) - rankIdx(a);
  const adf = Math.abs(df), adr = Math.abs(dr);
  const straight = (df === 0 || dr === 0);
  const diagonal = (adf === adr && adf !== 0);
  if (!straight && !diagonal) return null;
  if (adf === 0 && adr === 0) return null;
  const steps = Math.max(adf, adr);
  const sf = Math.sign(df), sr = Math.sign(dr);
  const out: string[] = [];
  for (let i = 1; i < steps; i++) {
    const f = fileIdx(a) + sf * i;
    const r = rankIdx(a) + sr * i;
    out.push(String.fromCharCode(97 + f) + String.fromCharCode(49 + r));
  }
  return out;
}

/** Can a piece of `type` move along the line direction from `a` to `c`? */
function sliderMatchesLine(type: PieceSymbol, a: string, c: string): boolean {
  const df = fileIdx(c) - fileIdx(a);
  const dr = rankIdx(c) - rankIdx(a);
  const straight = (df === 0 || dr === 0);
  const diagonal = (Math.abs(df) === Math.abs(dr));
  if (type === 'q') return straight || diagonal;
  if (type === 'r') return straight;
  if (type === 'b') return diagonal;
  return false; // knight / pawn / king cannot pin along a ray
}

interface PieceRef { type: PieceSymbol; color?: 'w' | 'b'; square?: string; }

const COLOR_WORD: Record<string, 'w' | 'b'> = { white: 'w', black: 'b' };

/** Pull the LAST piece reference out of a phrase (used for the pinner,
 *  which sits before the verb). Handles "queen on b6", "b6 queen",
 *  "b6-queen", "white queen", "queen". */
function lastPieceRef(phrase: string): PieceRef | null {
  const refs = allPieceRefs(phrase);
  return refs.length ? refs[refs.length - 1] : null;
}
/** Pull the FIRST piece reference out of a phrase (pinned / target sit
 *  after the verb). */
function firstPieceRef(phrase: string): PieceRef | null {
  const refs = allPieceRefs(phrase);
  return refs.length ? refs[0] : null;
}

function allPieceRefs(phrase: string): PieceRef[] {
  const out: PieceRef[] = [];
  // "white? (piece) (on|at|from)? square?" and reversed "square(-| )piece".
  const fwd = /\b(white|black)?\s*(pawn|knight|bishop|rook|queen|king)\b(?:\s*(?:on|at|from)?\s*([a-h][1-8]))?/gi;
  const rev = /\b([a-h][1-8])\s*[-–]?\s*(pawn|knight|bishop|rook|queen|king)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = fwd.exec(phrase)) !== null) {
    // Optional capture groups are typed `string` but are `undefined` at
    // runtime when the group didn't match — cast to keep the guard honest.
    const sq = m[3] as string | undefined;
    out.push({
      type: PIECE_WORD_TO_TYPE[m[2].toLowerCase()],
      color: m[1] ? COLOR_WORD[m[1].toLowerCase()] : undefined,
      square: sq ? sq.toLowerCase() : undefined,
      // @ts-expect-error attach offset for ordering
      _at: m.index,
    });
  }
  while ((m = rev.exec(phrase)) !== null) {
    out.push({
      type: PIECE_WORD_TO_TYPE[m[2].toLowerCase()],
      square: m[1].toLowerCase(),
      // @ts-expect-error attach offset for ordering
      _at: m.index,
    });
  }
  return out.sort((a, b) =>
    ((a as unknown as { _at: number })._at) - ((b as unknown as { _at: number })._at));
}

/** Resolve a PieceRef to a concrete square that currently holds the named
 *  piece type (and color, if specified). Returns null when it can't be
 *  resolved unambiguously to a present piece — caller then SKIPS (no
 *  false positive). */
function resolvePresentSquare(chess: Chess, ref: PieceRef): string | null {
  if (ref.square && isSquare(ref.square)) {
    const p = chess.get(ref.square);
    if (p && p.type === ref.type && (!ref.color || p.color === ref.color)) return ref.square;
    return null; // named square doesn't hold the named piece → not a present claim
  }
  // No explicit square — resolve only if exactly one matching piece exists.
  const matches: string[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === ref.type && (!ref.color || cell.color === ref.color)) {
        matches.push(cell.square);
      }
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

/** Resolve the pin target. "king" → that color's king square; otherwise a
 *  normal present-piece resolution. The king behind a pinned piece is the
 *  SAME color as the pinned piece, so we don't need the student's color. */
function resolveTargetSquare(chess: Chess, ref: PieceRef, pinnedColor: 'w' | 'b'): string | null {
  if (ref.type === 'k') {
    if (ref.square && isSquare(ref.square)) {
      const p = chess.get(ref.square);
      return p && p.type === 'k' ? ref.square : null;
    }
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === pinnedColor) return cell.square;
      }
    }
    return null;
  }
  return resolvePresentSquare(chess, { ...ref, color: ref.color ?? pinnedColor });
}

/** Split into rough sentence units for clause-level future-marker gating. */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

/** Validate every board-fact claim in `text` against `fen`. */
export function validateBoardClaims(text: string, fen: string): BoardClaimResult {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { ok: true, violations: [] }; // unparseable FEN → can't judge
  }
  const violations: BoardClaimViolation[] = [];

  // ── (1) PIN / SKEWER GEOMETRY ─────────────────────────────────────
  // "A pins/skewers B to C". Evaluated across the whole text (not gated
  // on future markers) because it only fires when A and B are pieces
  // PRESENT on the board now — a future pin won't have its pieces placed.
  const verbRe = /\b(pins?|pinning|skewers?|skewering)\b/gi;
  let vm: RegExpExecArray | null;
  while ((vm = verbRe.exec(text)) !== null) {
    const verbStart = vm.index;
    const verbEnd = verbRe.lastIndex;
    // pinner phrase = the clause before the verb (sentence-bounded, ~110
    // chars). Commas / dashes are KEPT so an earlier "knight on f3" stays
    // available for pronoun resolution ("…queen on b6 pins IT to …").
    const preRaw = text.slice(Math.max(0, verbStart - 110), verbStart);
    const pre = preRaw.split(/[.;!?]/).pop() ?? preRaw;
    // post = after verb up to a sentence end; split on " to " for target.
    const postRaw = text.slice(verbEnd, verbEnd + 90).split(/[.;!?]/)[0] ?? '';
    const toSplit = postRaw.split(/\bto\b/i);
    const pinnedPhrase = toSplit[0] ?? '';
    const targetPhrase = toSplit.slice(1).join(' to ');

    const pinner = lastPieceRef(pre);
    if (!pinner) continue;
    // Pinner must be a slider; if not (e.g. "the knight pins"), that's
    // checkable too — a knight/pawn/king cannot pin along a ray.
    const pinnerSq = resolvePresentSquare(chess, pinner);
    if (!pinnerSq) continue; // can't confirm a present pinner → skip

    // Resolve the pinned piece. Direct reference first; then a BOUNDED
    // pronoun fallback ("pins it / this / that") → the nearest OTHER
    // present piece named before the verb (the production phrasing was
    // "…the knight on f3 — … the queen on b6 pins it to your king").
    const pinned = firstPieceRef(pinnedPhrase);
    let pinnedSq = pinned ? resolvePresentSquare(chess, pinned) : null;
    if (!pinnedSq && /\b(it|this|that|them)\b/i.test(pinnedPhrase)) {
      const preRefs = allPieceRefs(pre);
      for (let i = preRefs.length - 1; i >= 0; i--) {
        const sq = resolvePresentSquare(chess, preRefs[i]);
        if (sq && sq !== pinnerSq) { pinnedSq = sq; break; }
      }
    }
    if (!pinnedSq) continue; // can't confirm a present pinned piece → skip
    const pinnedPiece = chess.get(pinnedSq as Square);
    if (!pinnedPiece) continue;

    // Resolve target. If no explicit target phrase, default to the king
    // behind the pinned piece (the canonical pin) only when stated.
    let targetSq: string | null = null;
    const target = targetPhrase ? firstPieceRef(targetPhrase) : null;
    if (target) targetSq = resolveTargetSquare(chess, target, pinnedPiece.color);
    else continue; // no target named → not enough to disprove; skip

    if (!targetSq) continue;

    const claim = text.slice(Math.max(0, verbStart - 40), Math.min(text.length, verbEnd + 60)).trim();

    // The pinner piece type: prefer the actual piece on pinnerSq.
    const pinnerPiece = chess.get(pinnerSq as Square);
    const pinnerType = pinnerPiece ? pinnerPiece.type : pinner.type;

    // (a) pinner can't move along any ray (knight/pawn/king "pins").
    if (pinnerType === 'n' || pinnerType === 'p' || pinnerType === 'k') {
      violations.push({
        kind: 'pin-geometry',
        claim,
        reason: `a ${TYPE_TO_PIECE_WORD[pinnerType]} cannot pin along a line`,
      });
      continue;
    }
    // (b) the three squares must be one line with the pinned between.
    const between = lineBetween(pinnerSq, targetSq);
    const collinearWithPinnedBetween = between !== null && between.includes(pinnedSq);
    if (!collinearWithPinnedBetween) {
      violations.push({
        kind: 'pin-geometry',
        claim,
        reason: `${pinnerSq}, ${pinnedSq} and ${targetSq} are not on one line (no pin)`,
      });
      continue;
    }
    // (c) the pinner's piece type must match the line direction.
    //
    // We deliberately do NOT flag a line that is collinear but blocked by
    // an extra piece — "Bb5 pins Nc6 [to the king]" with a pawn on d7 is
    // common, colloquially-fine coaching (a relative pin). Only HARD
    // geometric impossibilities are flagged, never a nuance of usage.
    if (!sliderMatchesLine(pinnerType, pinnerSq, targetSq)) {
      violations.push({
        kind: 'pin-geometry',
        claim,
        reason: `a ${TYPE_TO_PIECE_WORD[pinnerType]} on ${pinnerSq} does not move along ${pinnerSq}-${targetSq}`,
      });
    }
  }

  // ── (2) PIECE-ON-SQUARE (present-tense clauses only) ──────────────
  for (const sentence of splitSentences(text)) {
    if (FUTURE_MARKER_RE.test(sentence)) continue; // hypothetical board — skip
    const claims: Array<{ type: PieceSymbol; color?: 'w' | 'b'; square: string; raw: string }> = [];
    const fwd = /\b(white|black)?\s*(pawn|knight|bishop|rook|queen|king)\s+(?:on|at)\s+([a-h][1-8])\b/gi;
    const rev = /\b(?:the\s+)?([a-h][1-8])\s*[-–]\s*(pawn|knight|bishop|rook|queen|king)\b/gi;
    let pm: RegExpExecArray | null;
    while ((pm = fwd.exec(sentence)) !== null) {
      claims.push({
        type: PIECE_WORD_TO_TYPE[pm[2].toLowerCase()],
        color: pm[1] ? COLOR_WORD[pm[1].toLowerCase()] : undefined,
        square: pm[3].toLowerCase(),
        raw: pm[0].trim(),
      });
    }
    while ((pm = rev.exec(sentence)) !== null) {
      claims.push({
        type: PIECE_WORD_TO_TYPE[pm[2].toLowerCase()],
        square: pm[1].toLowerCase(),
        raw: pm[0].trim(),
      });
    }
    for (const c of claims) {
      if (!isSquare(c.square)) continue;
      const p = chess.get(c.square);
      if (!p) {
        violations.push({ kind: 'piece-on-square', claim: c.raw, reason: `${c.square} is empty` });
      } else if (p.type !== c.type) {
        violations.push({
          kind: 'piece-on-square',
          claim: c.raw,
          reason: `${c.square} holds a ${TYPE_TO_PIECE_WORD[p.type]}, not a ${TYPE_TO_PIECE_WORD[c.type]}`,
        });
      } else if (c.color && p.color !== c.color) {
        violations.push({
          kind: 'piece-on-square',
          claim: c.raw,
          reason: `the piece on ${c.square} is ${p.color === 'w' ? 'white' : 'black'}, not ${c.color === 'w' ? 'white' : 'black'}`,
        });
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

/** Split `text` into sentences and drop any whose board-claims are
 *  provably false. Returns the cleaned text plus the dropped sentences
 *  and their violations (for auditing). Used to keep a disproven
 *  tactical sentence from ever being spoken / displayed. */
export function stripDisprovenSentences(
  text: string,
  fen: string,
): { clean: string; dropped: Array<{ sentence: string; violations: BoardClaimViolation[] }> } {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  const dropped: Array<{ sentence: string; violations: BoardClaimViolation[] }> = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const { violations } = validateBoardClaims(trimmed, fen);
    if (violations.length > 0) dropped.push({ sentence: trimmed, violations });
    else kept.push(trimmed);
  }
  return { clean: kept.join(' ').trim(), dropped };
}
