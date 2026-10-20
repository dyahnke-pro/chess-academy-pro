/**
 * learnTranscript — EVERYTHING THE COACH DID IN ONE LEARN GAME, kept with the
 * game (David 2026-10-19: "you need full observability").
 *
 * The rolling audit log is shared by every subsystem, so a background sweep can
 * push a whole game out of it: two of David's drops in a row held 300 rows of a
 * record rebuild and none of the game he sent them to explain. This keeps the
 * game's own entries apart — every spoken line, every turn decision, the seat,
 * the takebacks — under its own meta key while the game is live, and on the
 * saved `GameRecord` (`coachTranscript`) once it ends, so a data drop always
 * carries the last game whole.
 *
 * Fed by `appAuditor`'s tap (every `logAppAudit` entry while a game is open).
 */
import { db } from '../db/schema';

interface TranscriptEntry {
  /** ms since the game started. */
  t: number;
  kind: string;
  source: string;
  summary: string;
  fen?: string;
  details?: string;
}

interface LearnTranscript {
  gameId: string;
  seat: 'white' | 'black';
  startedAt: number;
  entries: TranscriptEntry[];
}

/** The live game's transcript, persisted so a quit mid-game keeps it. */
const LEARN_TRANSCRIPT_KEY = 'learn-transcript.current';
/** A long game with a talkative coach stays well under this; it bounds a runaway loop, not a game. */
const MAX_ENTRIES = 6000;
/** Kinds that say nothing about the game being played. */
const NOT_THE_GAME = new Set(['memory-snapshot', 'scroll-hint-state', 'app-foreground', 'audit-stream-truncated']);

let current: LearnTranscript | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistSoon(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (current) void db.meta.put({ key: LEARN_TRANSCRIPT_KEY, value: JSON.stringify(current) }).catch(() => undefined);
  }, 2000);
}

/** Open a transcript for a new Learn game (or a new seat in the same one). */
export function startLearnTranscript(gameId: string, seat: 'white' | 'black'): void {
  if (current?.gameId === gameId) {
    if (current.seat !== seat) noteLearnEntry({ kind: 'learn-seat', source: 'learnTranscript', summary: `seat ${current.seat} → ${seat}` });
    current.seat = seat;
    persistSoon();
    return;
  }
  current = { gameId, seat, startedAt: Date.now(), entries: [] };
  noteLearnEntry({ kind: 'learn-seat', source: 'learnTranscript', summary: `game ${gameId}, student plays ${seat}` });
}

/** Record one entry if a Learn game is open. Never throws. */
export function noteLearnEntry(e: { kind: string; source: string; summary: string; fen?: string; details?: string }): void {
  if (!current || NOT_THE_GAME.has(e.kind) || current.entries.length >= MAX_ENTRIES) return;
  current.entries.push({
    t: Date.now() - current.startedAt,
    kind: e.kind,
    source: e.source,
    summary: e.summary,
    ...(e.fen ? { fen: e.fen } : {}),
    ...(e.details ? { details: e.details.slice(0, 4000) } : {}),
  });
  persistSoon();
}

/** The transcript of `gameId`, for the saved game record — null when another game is open. */
export function learnTranscriptFor(gameId: string): LearnTranscript | null {
  return current?.gameId === gameId ? current : null;
}

/** Close the transcript (leaving Learn). The persisted copy stays until the next game. */
export function stopLearnTranscript(): void {
  if (current) void db.meta.put({ key: LEARN_TRANSCRIPT_KEY, value: JSON.stringify(current) }).catch(() => undefined);
  current = null;
}
