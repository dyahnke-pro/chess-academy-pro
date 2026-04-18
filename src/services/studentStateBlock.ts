/**
 * studentStateBlock
 * ------------------
 * Builds a compact [StudentState] prompt block the coach can read to
 * get a read on the student's current mood and tempo — the thing a
 * real trainer picks up from watching the student at the board.
 *
 * Signals tracked:
 *  - Recent move quality trend (just blundered? on a streak?)
 *  - Last interaction recency (deep in thought? blitzing through?)
 *  - Recent chat sentiment (frustration words, confidence cues)
 *  - Turn state (waiting on student vs coach to move)
 *
 * The prompt uses this block to adapt tone: empathize after a
 * blunder, keep it punchy when the student is moving fast, take
 * more time when they're between games. Replaces the prior
 * "pure-prose only" approach where the LLM had to guess from
 * move history.
 */
import type { ChatMessage, MoveClassification } from '../types';

export interface StudentStateInput {
  /** Recent moves, newest last. Used to detect a streak or blunder. */
  recentMoveClassifications?: (MoveClassification | null)[];
  /** Chat messages, newest last. Used for sentiment cues. */
  recentChat?: ChatMessage[];
  /** Timestamp (ms) of the most recent user input (move or chat).
   *  Used to infer tempo: seconds-since-last is "fast"; minutes is
   *  "thinking"; long idle is "between games". */
  lastUserInteractionMs?: number;
  /** Whose turn it is, if relevant. */
  turn?: 'student' | 'coach' | 'neither';
  /** Current route/context the student is on. */
  contextLabel?: string;
}

/** Words / phrases that suggest the student is frustrated or stuck.
 *  Case-insensitive. Hit list intentionally small so false positives
 *  (e.g. "I'm stuck on study") are rare. */
const FRUSTRATION_CUES = [
  'ugh', 'damn', 'wtf', 'why did i', 'i always', "i can't", "i can never",
  'hate this', 'hate that', 'stuck', 'no idea', 'lost again', 'blundered',
  'stupid move', 'dumb', 'terrible', 'awful', 'frustrated',
];

/** Words that suggest confidence / flow state. */
const CONFIDENCE_CUES = [
  'nice', 'got it', 'i see', 'that worked', 'easy', 'crushed', 'dominated',
  'let\'s go', 'on fire', 'feeling good',
];

function sentimentFromChat(chat: ChatMessage[] | undefined): 'frustrated' | 'confident' | 'neutral' {
  if (!chat || chat.length === 0) return 'neutral';
  const recent = chat.filter((m) => m.role === 'user').slice(-3).map((m) => m.content.toLowerCase()).join(' ');
  if (!recent) return 'neutral';
  const hasFrustration = FRUSTRATION_CUES.some((cue) => recent.includes(cue));
  const hasConfidence = CONFIDENCE_CUES.some((cue) => recent.includes(cue));
  if (hasFrustration && !hasConfidence) return 'frustrated';
  if (hasConfidence && !hasFrustration) return 'confident';
  return 'neutral';
}

function tempoFromLastInteraction(lastMs: number | undefined): 'fast' | 'thinking' | 'idle' | 'unknown' {
  if (lastMs === undefined) return 'unknown';
  const elapsedSec = (Date.now() - lastMs) / 1000;
  if (elapsedSec < 10) return 'fast';
  if (elapsedSec < 90) return 'thinking';
  return 'idle';
}

function moveTrendFromClassifications(cls: (MoveClassification | null)[] | undefined): string | null {
  if (!cls || cls.length === 0) return null;
  const last = cls.slice(-5).filter((c): c is MoveClassification => c !== null);
  if (last.length === 0) return null;
  const recentMost = last[last.length - 1];
  if (recentMost === 'blunder') return 'JUST BLUNDERED — student likely frustrated; lead with empathy before teaching.';
  if (recentMost === 'mistake') return 'Just made a mistake — acknowledge it warmly, then teach the refutation.';
  if (recentMost === 'brilliant' || recentMost === 'great') return 'Just played a strong move — give them a moment of recognition, then move on.';
  // Streaks
  const badCount = last.filter((c) => c === 'blunder' || c === 'mistake').length;
  const goodCount = last.filter((c) => c === 'brilliant' || c === 'great' || c === 'good').length;
  if (badCount >= 2) return 'Rough patch (2+ weak moves in a row) — student may be tilted; be extra patient.';
  if (goodCount >= 3) return 'On a good run — stay positive, push their thinking deeper.';
  return null;
}

/**
 * Format a compact [StudentState] block for injection into the
 * coach's system context. Returns an empty string when no useful
 * signals are available so callers can unconditionally concat.
 */
export function buildStudentStateBlock(input: StudentStateInput): string {
  const parts: string[] = [];

  const trend = moveTrendFromClassifications(input.recentMoveClassifications);
  if (trend) parts.push(`Move trend: ${trend}`);

  const sentiment = sentimentFromChat(input.recentChat);
  if (sentiment === 'frustrated') {
    parts.push('Chat sentiment: FRUSTRATED — student has expressed frustration recently. Acknowledge it briefly ("that\'s a tough one", "yeah, that one gets everyone") before diving into the teaching.');
  } else if (sentiment === 'confident') {
    parts.push('Chat sentiment: CONFIDENT — student is feeling the flow. Match their energy, push them harder.');
  }

  const tempo = tempoFromLastInteraction(input.lastUserInteractionMs);
  if (tempo === 'fast') {
    parts.push('Tempo: FAST — student is moving quickly. Keep replies tight and skip preamble so they can keep playing.');
  } else if (tempo === 'thinking') {
    parts.push('Tempo: THINKING — student is deliberating. A brief, pointed comment is fine; don\'t interrupt their thinking with a lecture.');
  } else if (tempo === 'idle') {
    parts.push('Tempo: IDLE — student has stepped away from the board for a while. It\'s a natural place to go deeper if they return with a question.');
  }

  if (input.turn === 'student') {
    parts.push('Turn state: it is the STUDENT\'s move. Keep it brief so they can play.');
  } else if (input.turn === 'coach') {
    parts.push('Turn state: it is the COACH\'s move (yours). You can be more expansive — they\'re waiting.');
  }

  if (input.contextLabel) {
    parts.push(`Context: ${input.contextLabel}.`);
  }

  if (parts.length === 0) return '';
  return ['[StudentState — read the room before replying]', ...parts].join('\n');
}
