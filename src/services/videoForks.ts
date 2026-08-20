/**
 * videoForks — the alternative lines a lesson actually showed, at the position
 * it showed them.
 *
 * David 2026-08-17: *"what i like about his videos and what i want to carry over
 * are the teachings about the other lines… i want Learn with coach to touch on
 * them as well so the user knows there are other options at certain
 * forks/positions."*
 *
 * A teacher rewinds for one reason — to go back and show a different option — so
 * a lesson's rewinds ARE its alternative-lines content, already grouped by
 * position. That is why these may be spoken when a generated list may not: the
 * options are the moves that APPEARED ON SCREEN, so "there are two other tries
 * here" is a claim about the video and the video is the evidence. Asking a model
 * what else could be played produces fluent, sometimes-wrong lines with nothing
 * to check them against (G0).
 *
 * Learn NAMES the fork; Review WALKS it. This module serves the naming half —
 * one sentence, no continuation — because a lesson that recites every branch is
 * the wordiness David has already objected to once.
 */
import { Chess } from 'chess.js';
import VIDEO_DATA from '../data/video-teachings.json';
import { sanToSpeech } from '../utils/sanToSpeech';

export interface VideoForkOption {
  san: string;
  /** Seconds into the source lesson where this option is taken up. */
  t: number;
  continuation: string;
}

export interface VideoFork {
  fen: string;
  lineSan: string[];
  ply: number;
  options: VideoForkOption[];
  source: string;
}

const posKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

const byPosition = new Map<string, VideoFork>();
for (const fork of ((VIDEO_DATA as { forks?: VideoFork[] }).forks ?? [])) {
  const key = posKey(fork.fen);
  // First one wins: two lessons forking at the same board are teaching the same
  // choice, and naming it twice in one walkthrough is noise.
  if (!byPosition.has(key)) byPosition.set(key, fork);
}

/** Every fork the corpus carries, for measurement and for the gate. */
export const ALL_VIDEO_FORKS: readonly VideoFork[] = (VIDEO_DATA as { forks?: VideoFork[] }).forks ?? [];

/** The fork a lesson showed at THIS board, or null.
 *
 *  Position-keyed, never name-keyed — the same rule the notes follow. A fork is
 *  a claim about one specific board and reaching it any other way is how
 *  teaching authored elsewhere ends up spoken here. */
export function forkAt(fen: string | null | undefined): VideoFork | null {
  if (!fen) return null;
  return byPosition.get(posKey(fen)) ?? null;
}

/**
 * One sentence naming the other tries at this position, or null.
 *
 * EVERY OPTION IS RE-CHECKED AGAINST THE LIVE BOARD before it is named. The
 * emitter already proved each option legal at the fork's own FEN, but the board
 * in front of the student is reached by a transposition often enough that the
 * cheap re-check is worth it: naming a move that cannot be played there is
 * exactly the false claim this corpus exists to avoid.
 *
 * `played` is the move the lesson goes on to make, and is left out of the list —
 * the student is about to see it, so calling it an alternative is confusing.
 */
export function forkSentence(fen: string | null | undefined, played?: string | null): string | null {
  const fork = forkAt(fen);
  if (!fork || !fen) return null;
  const board = new Chess(fen);
  const others: string[] = [];
  for (const opt of fork.options) {
    if (played && opt.san === played) continue;
    let ok = false;
    try { ok = !!board.move(opt.san); } catch { ok = false; }
    if (!ok) continue;
    board.undo();
    if (!others.includes(opt.san)) others.push(opt.san);
  }
  if (others.length === 0) return null;
  // Spoken, not written: `sanToSpeech` is what every other narration path uses,
  // so the voice says "knight to f6" rather than reading letters aloud.
  const spoken = others.map((san) => sanToSpeech(san));
  if (spoken.length === 1) return `There is another try here: ${spoken[0]}.`;
  const last = spoken[spoken.length - 1];
  return `There are other tries here: ${spoken.slice(0, -1).join(', ')} and ${last}.`;
}
