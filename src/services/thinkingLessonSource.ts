// thinkingLessonSource — where "Learn how to think" positions come from
// (plan: "Positions"): the student's OWN games first, real puzzles second.
// Never an invented board (G3).
//
// Own games = the positions they faced right before their own mistakes:
//   1. `mistakePuzzles` (already cut at the student's move, with the game id);
//   2. analysed games through `findMistakePositions` (the same picker Analysis
//      Practice uses), for mistakes not yet turned into puzzles.
// Puzzles = the CC0 Lichess pool near the student's strength, set up at the
// student's move (the puzzle FEN is the position BEFORE the opponent's first
// move, so that move is applied first).
//
// The order is deterministic (no Math.random): newest own mistakes first, then
// puzzles nearest the student's rating. Which of these a lesson USES is decided
// by the step's fair-key filter (`pickFairPosition`), not here.
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { findMistakePositions } from './positionReadingService';
import { determinePlayerColor } from './mistakePuzzleService';
import { boardIdentity, type LessonPositionCandidate } from './thinkingPositions';
import { puzzleSeedSettled } from './puzzleService';

/** The longest a lesson waits for the boot puzzle seed before reading what is
 *  there (a fresh device asked within seconds of install got 2 boards). */
const SEED_WAIT_MS = 10_000;

export interface LessonUsernames { chesscom?: string; lichess?: string }

/** Analysed games read per lesson (a selection pool, not a narration cap). */
const GAME_POOL = 60;
/** Puzzles read around the student's rating (a selection pool). */
const PUZZLE_POOL = 300;
const PUZZLE_BAND = 300;

/** The puzzle's solution line in SAN from the student's board (after the
 *  setup move), or [] when any move fails to apply. */
export function puzzleLineSan(fen: string, movesUci: string): string[] {
  const uci = movesUci.trim().split(/\s+/);
  try {
    const c = new Chess(fen);
    const out: string[] = [];
    uci.forEach((u, i) => {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (i > 0) out.push(m.san);
    });
    return out;
  } catch {
    return [];
  }
}

/** The board after the puzzle's setup move — the student's turn. */
export function puzzleStartFen(fen: string, movesUci: string): string | null {
  const first = movesUci.trim().split(/\s+/)[0];
  if (!first || first.length < 4) return null;
  try {
    const c = new Chess(fen);
    c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] });
    return c.fen();
  } catch {
    return null;
  }
}

export async function loadLessonCandidates(opts: {
  usernames: LessonUsernames;
  rating: number;
}): Promise<LessonPositionCandidate[]> {
  const out: LessonPositionCandidate[] = [];
  const byId = new Map<string, LessonPositionCandidate>();
  const push = (c: LessonPositionCandidate): void => {
    const id = boardIdentity(c.fen);
    const had = byId.get(id);
    if (had) {
      // The same board from a second source fills what the first lacked
      // (a mistake puzzle has no previous move; the game replay does).
      if (!had.prevSan && c.prevSan) { had.prevSan = c.prevSan; had.beforeFen = c.beforeFen; }
      if (!had.playedSan && c.playedSan) had.playedSan = c.playedSan;
      return;
    }
    const copy = { ...c };
    byId.set(id, copy);
    out.push(copy);
  };

  try {
    const mistakes = await db.mistakePuzzles.toArray();
    mistakes
      .slice()
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .forEach((m) => push({ fen: m.fen, origin: 'game', gameId: m.sourceGameId, ply: m.moveNumber, ...(m.playerMoveSan ? { playedSan: m.playerMoveSan } : {}) }));
  } catch { /* no mistake store yet */ }

  try {
    const games = (await db.games.toArray())
      .filter((g) => g.pgn && g.annotations && g.annotations.length > 0)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, GAME_POOL);
    for (const game of games) {
      const username = game.source === 'chesscom' ? opts.usernames.chesscom
        : game.source === 'lichess' ? opts.usernames.lichess : undefined;
      const color = determinePlayerColor(game, username);
      if (!color) continue;
      const positions = findMistakePositions(
        game.pgn,
        (game.annotations ?? []).map((a) => ({ moveNumber: a.moveNumber, color: a.color, classification: a.classification ?? undefined })),
        color,
        { count: Number.POSITIVE_INFINITY },
      );
      // Replay once: the move before each position and the board before it.
      const fens: string[] = [];
      let history: string[] = [];
      try {
        const g = new Chess();
        g.loadPgn(game.pgn);
        history = g.history();
        const r = new Chess();
        fens.push(r.fen());
        for (const san of history) { r.move(san); fens.push(r.fen()); }
      } catch { history = []; }
      for (const p of positions) {
        const prevSan = p.ply >= 2 ? history[p.ply - 2] : undefined;
        const beforeFen = p.ply >= 2 ? fens[p.ply - 2] : undefined;
        push({
          fen: p.fen, origin: 'game', gameId: game.id, ply: p.ply, playedSan: p.playedNext ?? undefined,
          ...(prevSan && beforeFen ? { prevSan, beforeFen } : {}),
        });
      }
    }
  } catch { /* no games */ }

  try {
    await Promise.race([puzzleSeedSettled(), new Promise<void>((r) => setTimeout(r, SEED_WAIT_MS))]);
    const puzzles = await db.puzzles
      .where('rating')
      .between(opts.rating - PUZZLE_BAND, opts.rating + PUZZLE_BAND, true, true)
      .limit(PUZZLE_POOL)
      .toArray();
    puzzles
      .sort((a, b) => Math.abs(a.rating - opts.rating) - Math.abs(b.rating - opts.rating) || a.id.localeCompare(b.id))
      .forEach((p) => {
        const fen = puzzleStartFen(p.fen, p.moves);
        const line = puzzleLineSan(p.fen, p.moves);
        if (fen) push({ fen, origin: 'puzzle', puzzleId: p.id, ...(line.length > 0 ? { line } : {}) });
      });
  } catch { /* no puzzles seeded */ }

  return out;
}
