/**
 * narrationAuditor
 * ----------------
 * Runtime sanity-check for coach-generated narration. Pure rules-based
 * (no LLM, no network, no cost). Runs fire-and-forget on every
 * narration the coach produces — when a claim in the prose can be
 * verified deterministically against the current FEN, we flag
 * mismatches to the shared app-auditor log.
 *
 * What it catches:
 *   1. Piece-on-square claims that don't match the position
 *      ("the knight on f3" when f3 is empty, or holds a different piece)
 *   2. Hanging-piece claims when no piece of that type is actually
 *      hanging in the current position
 *   3. Check / checkmate claims that chess.js disagrees with
 *   4. SAN references that would be illegal in the current position
 *
 * What it doesn't catch (needs LLM or human):
 *   - Strategic assessments ("this keeps the initiative")
 *   - Plan claims ("preparing a kingside attack")
 *   - Opening-theory correctness
 *
 * Findings flow into `appAuditor.logAppAudit` so they appear
 * alongside every other audit kind in the unified Settings panel.
 */
import { Chess } from 'chess.js';
import { logAppAudit, getAppAuditLog } from './appAuditor';
import type { AuditEntry } from './appAuditor';

export interface AuditFlag {
  kind: 'piece-on-square' | 'hanging-piece' | 'check-claim' | 'mate-claim' | 'illegal-san';
  narrationExcerpt: string;
  explanation: string;
}

export interface AuditLogEntry {
  timestamp: number;
  fen: string;
  context?: string;
  flags: AuditFlag[];
}

/** SAN-move extractor (piece letter optional + destination square). */
const SAN_MOVE_RE = /\b((?:[NBRQK]x?)?[a-h][1-8])\b/g;

const PIECE_NAME_TO_LETTER: Record<string, string> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

/** Matches "the/a/your/our/my/their [color] <piece> on <square>" and
 *  similar — capturing the piece name + square. */
const PIECE_ON_SQUARE_RE = /\b(?:the|a|my|our|your|their|his|her|white(?:'s)?|black(?:'s)?)\s+(?:[a-z]+\s+)?(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi;

/** "hanging {piece}" / "undefended {piece}" / "loose {piece}" claims. */
const HANGING_PIECE_RE = /\b(?:hanging|undefended|loose|dropped)\s+(pawn|knight|bishop|rook|queen|king)\b/gi;

/** "check" claim — look for the phrases that unambiguously claim a
 *  current check state. Avoids "check this out" / "double-check" by
 *  requiring a chess-context adjacency. */
const CHECK_CLAIM_RE = /\b(?:in\s+check|delivers?\s+check|delivering\s+check|giving\s+check)\b/i;

/** "checkmate" / "mate in N" claims. */
const MATE_CLAIM_RE = /\b(?:checkmate|mate\s+in\s+\d+|forced\s+mate)\b/i;

/** Past-tense / historical hints that the SAN reference is recapping a
 *  past ply, not proposing a move from the current position. Common in
 *  review walk narration ("you played Nd2", "your Nd2 was strong",
 *  "after Nd2 the eval swung"). The window scanned is the 32 chars
 *  preceding the SAN so the regex can stay anchored on the verb
 *  without matching cross-sentence. Audit Finding 139 (build 6459def+).
 */
const PAST_TENSE_HINT_RE =
  /\b(?:had|played|missed|allowed|let|gave|chose|tried|considered|opted|after|when|earlier|before|previously|already|once|just|here|then|that\s+(?:was|move)|you\s+(?:were|did))\b[^.!?]*$/i;

/** Return a FEN identical to `fen` but with the side-to-move flipped
 *  (and en-passant cleared since a flip invalidates it). Used by the
 *  illegal-SAN check so the auditor can verify a move's legality from
 *  EITHER side's perspective — narrations frequently mention the
 *  opposite side's candidate moves ("you should've played Bd2"). */
function flipSideToMove(fen: string): string | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  // Clear en-passant — flipping the turn invalidates any prior ep target.
  parts[3] = '-';
  return parts.join(' ');
}

export function auditNarration(
  fen: string,
  narration: string,
): AuditFlag[] {
  const flags: AuditFlag[] = [];
  if (!narration || narration.length < 10) return flags;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return flags; // Bad FEN — nothing to check against.
  }

  // 1. Piece-on-square claims — dedup by (piece, square) pair so
  //    "your queen on f3" + "the queen on f3" count as one flag.
  const pieceOnSquareSeen = new Set<string>();
  for (const m of narration.matchAll(PIECE_ON_SQUARE_RE)) {
    const [full, pieceName, square] = m;
    const key = `${pieceName.toLowerCase()}::${square.toLowerCase()}`;
    if (pieceOnSquareSeen.has(key)) continue;
    pieceOnSquareSeen.add(key);
    const expected = PIECE_NAME_TO_LETTER[pieceName.toLowerCase()];
    if (!expected) continue;
    const actual = chess.get(square as never) as { type: string } | null;
    if (!actual || actual.type !== expected) {
      flags.push({
        kind: 'piece-on-square',
        narrationExcerpt: full,
        explanation: actual
          ? `claims ${pieceName} on ${square}, but ${square} holds a ${actual.type}`
          : `claims ${pieceName} on ${square}, but ${square} is empty`,
      });
    }
  }

  // 2. Hanging-piece claims — naive check: look at pieces of that
  //    type belonging to the side-to-move's OPPONENT (since the
  //    narration typically warns the student about a hanging
  //    opponent piece). Flag only when NO piece of that type has
  //    zero defenders — i.e., the claim is clearly wrong.
  for (const m of narration.matchAll(HANGING_PIECE_RE)) {
    const [full, pieceName] = m;
    const letter = PIECE_NAME_TO_LETTER[pieceName.toLowerCase()];
    if (!letter || letter === 'k') continue; // kings can't hang
    const board = chess.board();
    const candidates: string[] = [];
    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.type === letter) candidates.push(sq.square);
      }
    }
    if (candidates.length === 0) {
      flags.push({
        kind: 'hanging-piece',
        narrationExcerpt: full,
        explanation: `claims hanging ${pieceName}, but no ${pieceName}s are on the board`,
      });
    }
    // Not-hanging-but-on-board is too fiddly to verify without a real
    // attack/defender count — skip to avoid false positives.
  }

  // 3. Check claim
  if (CHECK_CLAIM_RE.test(narration) && !chess.inCheck()) {
    // Only flag when the narration makes an UNAMBIGUOUS check claim
    // AND the position isn't actually in check.
    flags.push({
      kind: 'check-claim',
      narrationExcerpt: 'check claim',
      explanation: 'narration references a check but the position is not in check',
    });
  }

  // 4. Mate claim
  if (MATE_CLAIM_RE.test(narration) && !chess.isCheckmate()) {
    // "Mate in N" narrations are common without chess.js confirming
    // (it only detects mate-now, not mate-in-N). Skip "mate in N"
    // unless the move count is 1.
    const mateInMatch = /mate\s+in\s+(\d+)/i.exec(narration);
    if (mateInMatch) {
      const n = parseInt(mateInMatch[1], 10);
      if (n === 1 && !chess.isCheckmate()) {
        // The current position should be 1-move-from-mate, not
        // mate-now, so we can't verify without engine — skip.
      }
    } else if (/\b(checkmate|forced\s+mate)\b/i.test(narration) && !chess.isCheckmate()) {
      flags.push({
        kind: 'mate-claim',
        narrationExcerpt: 'checkmate claim',
        explanation: 'narration claims checkmate but the position is not mate',
      });
    }
  }

  // 5. Illegal SAN references — skip castling (it's always O-O or O-O-O
  //    regardless of position) and the auditor produces noise on
  //    castling mentions.
  //    Build legality sets for BOTH colors. Coach narration often
  //    discusses what the OTHER side could do ("you should've played
  //    Bd2", "I'll play Qe4 next"); checking only the current side-to-
  //    move's legal moves false-positives every cross-color reference.
  //    Production audit (build 4933e8e) caught this on "axb4, c3, even
  //    Bd2 — any of those picks up a piece" — Bd2 is white's move, but
  //    the FEN was black-to-move at audit time, so the lone-side check
  //    flagged it as illegal.
  const legalCurrentSide = new Set(chess.moves());
  const flippedFen = flipSideToMove(fen);
  const legalOpposingSide = (() => {
    if (!flippedFen) return new Set<string>();
    try {
      return new Set(new Chess(flippedFen).moves());
    } catch {
      return new Set<string>();
    }
  })();
  const isLegalForEitherSide = (san: string): boolean => {
    return (
      legalCurrentSide.has(san) ||
      legalCurrentSide.has(`${san}+`) ||
      legalCurrentSide.has(`${san}#`) ||
      legalOpposingSide.has(san) ||
      legalOpposingSide.has(`${san}+`) ||
      legalOpposingSide.has(`${san}#`)
    );
  };
  for (const m of narration.matchAll(SAN_MOVE_RE)) {
    const candidate = m[1];
    const matchIndex = m.index ?? 0;
    // Skip bare square names like "e4" in sentences like "control e4"
    // — those aren't move claims. Only check patterns with a piece
    // letter prefix (Nc3, Bxf7, etc.) since those ARE unambiguous
    // move claims.
    if (!/^[NBRQK]/.test(candidate)) continue;
    if (!isLegalForEitherSide(candidate)) {
      // Past-tense / current-position reference: if the destination
      // square already holds a piece of the matching type, the
      // narration is referencing the piece's CURRENT location
      // ("You had Nd2 defending e4") rather than proposing a move.
      // The SAN parses as illegal only because the piece is already
      // there. Production audit (build e2a96ed) caught this exact
      // false positive on Nd2 right after the knight moved to d2.
      const pieceLetter = candidate.charAt(0).toLowerCase();
      const destSquare = candidate.slice(-2);
      const occupant = chess.get(destSquare as never) as { type: string } | null;
      if (occupant && occupant.type === pieceLetter) continue;
      // Historical / past-tense reference: review walk narration often
      // recaps past plies ("you played Nd2 here, which let me grab the
      // pawn"). The SAN refers to a past board state, not a candidate
      // for the current position. Audit Finding 139 (build 6459def+)
      // caught this on a knight that moved off d2 several plies before
      // the narrated ply. Skip when a past-tense verb sits in the
      // 32-char window before the SAN — the window covers normal
      // sentence shapes ("After Nd2", "you had Nd2") without leaking
      // across sentences.
      const windowStart = Math.max(0, matchIndex - 32);
      const preceding = narration.slice(windowStart, matchIndex).toLowerCase();
      if (PAST_TENSE_HINT_RE.test(preceding)) continue;
      flags.push({
        kind: 'illegal-san',
        narrationExcerpt: candidate,
        explanation: `narration references ${candidate} but it is not a legal move for either side in this position`,
      });
    }
  }

  // De-dup flags: same kind + same excerpt → keep one
  const seen = new Set<string>();
  return flags.filter((f) => {
    const k = `${f.kind}::${f.narrationExcerpt}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Run the rules-based checks and persist any findings. Fire-and-forget:
 * swallows write errors via appAuditor so a failed log never blocks
 * the speak/render path. One appAuditor entry per flag — the panel
 * groups them by originating narration.
 */
export async function recordAudit(
  fen: string,
  narration: string,
  context?: string,
): Promise<void> {
  const flags = auditNarration(fen, narration);
  if (flags.length === 0) return;
  await Promise.all(
    flags.map((flag) =>
      logAppAudit({
        kind: flag.kind,
        category: 'narration',
        source: context ?? 'narration',
        summary: flag.explanation,
        details: flag.narrationExcerpt && flag.narrationExcerpt !== flag.kind
          ? `excerpt: "${flag.narrationExcerpt}"`
          : undefined,
        fen,
        context,
      }),
    ),
  );
}

/** Narration-only slice of the unified audit log — filter by category
 *  so the existing panel and tests keep working while we transition to
 *  the unified UI. */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const all = await getAppAuditLog();
  const byFen = new Map<string, AuditLogEntry>();
  for (const entry of all) {
    if (entry.category !== 'narration' || !entry.fen) continue;
    const key = `${entry.timestamp}::${entry.fen}`;
    const existing = byFen.get(key);
    const flag: AuditFlag = {
      kind: entry.kind as AuditFlag['kind'],
      narrationExcerpt: extractExcerpt(entry) ?? entry.kind,
      explanation: entry.summary,
    };
    if (existing) {
      existing.flags.push(flag);
    } else {
      byFen.set(key, {
        timestamp: entry.timestamp,
        fen: entry.fen,
        context: entry.context,
        flags: [flag],
      });
    }
  }
  return Array.from(byFen.values());
}

/** Clear the entire unified log (narration + app + subsystem). */
export async function clearAuditLog(): Promise<void> {
  const { clearAppAuditLog } = await import('./appAuditor');
  await clearAppAuditLog();
}

function extractExcerpt(entry: AuditEntry): string | null {
  if (!entry.details) return null;
  const match = entry.details.match(/excerpt:\s*"([^"]+)"/);
  return match ? match[1] : null;
}
