/**
 * gamePgnReplay — replay a stored game's PGN, REPAIR what can be repaired, and
 * EXPLAIN what cannot, in a sentence that names the game (WO-STANDARD-01 H3).
 *
 * THE DEFECT. A Learn game (`teach-1788396074396`, a native user, build
 * ff5ed1a2b, PostHog `$exception` ×2) could not open in review: chess.js's
 * `loadPgn` threw, `adaptGameRecord` returned null, and the student read a
 * blank "We could not replay this game from its PGN". Nothing said WHICH game
 * or WHY. The shape behind it was a Learn game persisted as `history.join(' ')`
 * from a lesson position — headerless bare SANs whose first move is illegal
 * from the standard start (fixed at the SAVE site on 2026-09-03; rows written
 * before that still sit in Dexie on real devices).
 *
 * THE RULE. A row whose PGN carries a `[FEN]`/`[SetUp]` header replays FROM
 * that position, move by move — chess.js's parser is not the judge, the board
 * is. A row with no header replays from the standard start. A move that is
 * illegal from the position before it ends the replay: with a legal prefix the
 * game is REPAIRED to that prefix and says so; with none it FAILS with a
 * sentence naming the game and the move that broke it. Never a blank.
 *
 * Zero React, zero Dexie — a leaf, so the gate can hold the real shapes.
 */
import { Chess } from 'chess.js';

export const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface PgnRepair {
  /** 0-based ply index of the first move that could not be played. */
  droppedFromPly: number;
  /** The move token that failed, as stored. */
  san: string;
  /** One sentence for the student. */
  note: string;
}

export type PgnReplayResult =
  | { ok: true; startFen: string; sans: string[]; repair: PgnRepair | null }
  | { ok: false; reason: string };

/** The `[FEN "…"]` header value, when the PGN carries one. */
export function startFenFromHeaders(pgn: string): string | null {
  const m = /\[FEN\s+"([^"]+)"\]/i.exec(pgn);
  return m ? m[1].trim() : null;
}

/** Bare move tokens: headers, comments, variations, NAGs, move numbers and
 *  result markers stripped. `1... e5` and `1. e4` both yield their SAN. */
export function movetextTokens(pgn: string): string[] {
  const body = pgn
    .replace(/\[[^\]]*\]/g, ' ')          // tag pairs
    .replace(/\{[^}]*\}/g, ' ')            // comments
    .replace(/\([^)]*\)/g, ' ')            // variations (one level is all a stored game has)
    .replace(/\$\d+/g, ' ')                // NAGs
    .replace(/;[^\n]*/g, ' ');             // rest-of-line comments
  return body
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.(\.\.)?/, '').trim())
    .filter((t) => t.length > 0)
    .filter((t) => !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
    .filter((t) => !/^\d+\.?$/.test(t));   // a bare "12." left after a newline split
}

/**
 * @param pgn   the stored PGN
 * @param label how the caller names this game to the student — e.g.
 *              "your Learn game from 2026-09-02" — so the sentence is about
 *              THIS game, never a generic shrug.
 */
export function replayGamePgn(pgn: string, label: string): PgnReplayResult {
  // FAST PATH — chess.js parses it whole. Its `.before` on the first verbose
  // move is the true start (the header FEN when there was one).
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const sans = c.history();
    if (sans.length > 0) {
      const startFen = c.history({ verbose: true })[0]?.before ?? STANDARD_START_FEN;
      return { ok: true, startFen, sans, repair: null };
    }
  } catch {
    /* fall through to the move-by-move replay — the board decides, not the parser */
  }

  const headerFen = startFenFromHeaders(pgn);
  const tokens = movetextTokens(pgn);
  if (tokens.length === 0) {
    return { ok: false, reason: `${label} has no moves recorded, so there is nothing to replay.` };
  }

  let board: Chess;
  try {
    board = new Chess(headerFen ?? STANDARD_START_FEN);
  } catch {
    return { ok: false, reason: `${label} was saved with a starting position the board cannot load, so it cannot be replayed.` };
  }
  const startFen = board.fen();
  const sans: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    let mv: ReturnType<Chess['move']> | null = null;
    try { mv = board.move(tokens[i]); } catch { mv = null; }
    if (!mv) {
      const moveNo = Math.floor(i / 2) + 1;
      const side = i % 2 === 0 ? 'White' : 'Black';
      if (sans.length === 0) {
        const reason = headerFen
          ? `${label} cannot be replayed: its first move, ${tokens[i]}, is not legal from the position it was saved with.`
          : `${label} cannot be replayed: its moves start from a lesson position that was not saved with the game, so ${tokens[i]} is not legal from the opening position. Games saved by Learn before 2026-09-03 have this shape.`;
        return { ok: false, reason };
      }
      const note = `${label} was cut short at move ${moveNo} (${side}'s ${tokens[i]} is not legal from the position before it) — the first ${sans.length} ${sans.length === 1 ? 'move is' : 'moves are'} shown.`;
      return { ok: true, startFen, sans, repair: { droppedFromPly: i, san: tokens[i], note } };
    }
    sans.push(mv.san);
  }
  return { ok: true, startFen, sans, repair: null };
}
