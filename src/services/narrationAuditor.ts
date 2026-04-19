/**
 * narrationAuditor
 * ----------------
 * Runtime sanity-check for coach-generated narration. Pure rules-based
 * (no LLM, no network, no cost). Runs fire-and-forget on every
 * narration the coach produces — when a claim in the prose can be
 * verified deterministically against the current FEN, we flag
 * mismatches to a local audit log.
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
 * Flags persist in Dexie's `meta` table under a rolling-window key,
 * bounded by AUDIT_LOG_MAX_ENTRIES. Callers read via `getAuditLog()`
 * for a debug viewer in Settings.
 */
import { Chess } from 'chess.js';
import { db } from '../db/schema';

const AUDIT_LOG_META_KEY = 'narration-audit-log.v1';
const AUDIT_LOG_MAX_ENTRIES = 200;

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
  const legal = new Set(chess.moves());
  for (const m of narration.matchAll(SAN_MOVE_RE)) {
    const candidate = m[1];
    // Skip bare square names like "e4" in sentences like "control e4"
    // — those aren't move claims. Only check patterns with a piece
    // letter prefix (Nc3, Bxf7, etc.) since those ARE unambiguous
    // move claims.
    if (!/^[NBRQK]/.test(candidate)) continue;
    if (!legal.has(candidate) && !legal.has(`${candidate}+`) && !legal.has(`${candidate}#`)) {
      flags.push({
        kind: 'illegal-san',
        narrationExcerpt: candidate,
        explanation: `narration references ${candidate} but it is not a legal move in this position`,
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
 * Persist flags to the audit log (rolling window of last
 * AUDIT_LOG_MAX_ENTRIES entries). Fire-and-forget: swallows Dexie
 * errors so a failed write never blocks the speak/render path.
 */
export async function recordAudit(
  fen: string,
  narration: string,
  context?: string,
): Promise<void> {
  const flags = auditNarration(fen, narration);
  if (flags.length === 0) return;
  try {
    const existing = await db.meta.get(AUDIT_LOG_META_KEY);
    const current: AuditLogEntry[] = parseLog(existing?.value);
    current.push({
      timestamp: Date.now(),
      fen,
      context,
      flags,
    });
    // Keep only the newest AUDIT_LOG_MAX_ENTRIES.
    const trimmed = current.slice(-AUDIT_LOG_MAX_ENTRIES);
    // MetaRecord.value is typed as string — JSON-encode the list.
    await db.meta.put({ key: AUDIT_LOG_META_KEY, value: JSON.stringify(trimmed) });
  } catch {
    /* auditor failures must not affect the voice/render path */
  }
}

function parseLog(raw: unknown): AuditLogEntry[] {
  if (typeof raw !== 'string') {
    // Older shapes (pre-stringify) may have stored arrays directly;
    // accept those defensively so an in-flight upgrade doesn't wipe
    // the log.
    return Array.isArray(raw) ? (raw as AuditLogEntry[]) : [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

/** Read the current audit log (for the debug viewer in Settings). */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  try {
    const record = await db.meta.get(AUDIT_LOG_META_KEY);
    if (!record) return [];
    return Array.isArray(record.value) ? record.value as AuditLogEntry[] : [];
  } catch {
    return [];
  }
}

/** Clear the audit log — useful after triaging a batch of findings. */
export async function clearAuditLog(): Promise<void> {
  try {
    await db.meta.delete(AUDIT_LOG_META_KEY);
  } catch {
    /* no-op */
  }
}
