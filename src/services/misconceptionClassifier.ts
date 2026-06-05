// Misconception classifier — turns a slip (position + played vs best +
// the student's stated reason) into ONE closed-set misconception tag via
// the LLM. The LLM picks from the fixed menu (or 'none' / 'other' +
// label); it never invents a tag and never emits chess moves — only a
// classification + a one-line spoken-safe teaching note. Shared by
// Discussion Practice (live) and Game Review (past games).

import { Chess } from 'chess.js';
import { getCoachChatResponse } from './coachApi';
import { stripDisprovenSentences } from './boardClaimValidator';
import { logAppAudit } from './appAuditor';
import {
  buildMisconceptionTagMenu,
  isMisconceptionTagId,
} from '../data/misconceptionTags';

export interface ClassifyMisconceptionInput {
  fen: string;
  playedSan: string;
  /** Engine best and/or the masters' move, for context. */
  bestSan?: string;
  mastersTopSan?: string;
  /** Plain-English eval summary, e.g. "drops about a pawn and a half".
   *  NEVER a raw centipawn number in spoken text. */
  evalSummary?: string;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  /** What the student said when asked "why did you play that?" — voice
   *  or text. Absent when skipped or auto-analysed. */
  userReason?: string;
}

export interface MisconceptionClassification {
  /** Closed-set tag id, or 'none' when the move is actually fine. */
  tag: string;
  /** Free-text error label — present only when tag === 'other'. */
  customLabel?: string;
  /** One-line spoken-safe teaching note (no SAN read as letters, no
   *  digits, no interface references). */
  coachNote: string;
}

const SYSTEM_PROMPT = [
  'You are a chess coach classifying ONE move into a fixed misconception',
  'taxonomy so it can be drilled later. You will be given the position, the',
  'move the student played, the better move, an eval summary, and (sometimes)',
  'the student\'s own reason for the move.',
  '',
  buildMisconceptionTagMenu(),
  '',
  'Respond with ONLY a JSON object, no prose, no code fence:',
  '{"tag": "<id|none|other>", "customLabel": "<short label, only if tag is other>",',
  ' "coachNote": "<one short sentence teaching the lesson>"}',
  '',
  'Rules for coachNote: speak plainly about the position (name a square, a',
  'piece, or a principle). No move letters read aloud, no percentages, no',
  'first person, no references to buttons or the app. If the student gave a',
  'reason, address THAT reasoning. Keep it to one sentence.',
].join('\n');

/** Strip a leading/trailing ```json fence if the model added one. */
function stripFence(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

/** Classify a slip into the closed-set taxonomy. Returns null when the
 *  LLM output can't be parsed or carries an off-vocabulary tag (the
 *  hallucination guard) — callers then skip logging rather than store
 *  junk. A `{ tag: 'none' }` result means "the move was actually fine". */
export async function classifyMisconception(
  input: ClassifyMisconceptionInput,
): Promise<MisconceptionClassification | null> {
  const facts = [
    `Position (FEN): ${input.fen}`,
    `Phase: ${input.gamePhase ?? 'unknown'}`,
    `Move played: ${input.playedSan}`,
    input.bestSan ? `Better move: ${input.bestSan}` : '',
    input.mastersTopSan ? `Masters usually play: ${input.mastersTopSan}` : '',
    input.evalSummary ? `Engine: ${input.evalSummary}` : '',
    input.userReason ? `Student's reason: "${input.userReason}"` : 'Student gave no reason.',
    '',
    'Classify this move. Return the JSON object only.',
  ].filter(Boolean).join('\n');

  let raw: string;
  try {
    raw = await getCoachChatResponse(
      [{ role: 'user', content: facts }],
      SYSTEM_PROMPT,
      undefined,
      'bad_habit_report',
      350,
      undefined,
      undefined,
      true, // skipPersonality — keep the JSON clean
    );
  } catch {
    return null;
  }

  let parsed: { tag?: unknown; customLabel?: unknown; coachNote?: unknown };
  try {
    parsed = JSON.parse(stripFence(raw)) as { tag?: unknown; customLabel?: unknown; coachNote?: unknown };
  } catch {
    return null;
  }

  const tag = typeof parsed.tag === 'string' ? parsed.tag.trim() : '';
  const rawNote = typeof parsed.coachNote === 'string' ? parsed.coachNote.trim() : '';
  if (!tag) return null;

  // 🔒 GROUND THE SPOKEN NOTE — FAIL-CLOSED (David 2026-06-05: "make damn
  // sure that note is grounded and the gate FULLY CLOSES EVERY TIME there is
  // a contradiction"). The tag is closed-set (validated below), but
  // `coachNote` is free LLM prose that gets SPOKEN to teach the slip, and the
  // prompt asks it to "name a square, a piece, or a principle." An ungrounded
  // note can hallucinate ("the knight on f6 is hanging" with no knight on
  // f6). chess.js is the truth: drop any sentence whose board-claim is
  // provably false before it's ever spoken. FAIL-CLOSED: if the FEN can't be
  // parsed (so the board can't be verified at all) we drop the ENTIRE note
  // rather than speak an unverifiable claim — never pass through unchecked.
  let coachNote = '';
  try {
    new Chess(input.fen); // throws on an unparseable FEN → fail closed below
    const { clean, dropped } = stripDisprovenSentences(rawNote, input.fen);
    coachNote = clean;
    if (dropped.length > 0) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: 'misconceptionClassifier.coachNote',
        summary: `dropped ${dropped.length} disproven sentence(s) from coachNote (tag=${tag})`,
        details: dropped.map((d) => d.sentence).join(' | ').slice(0, 300),
        fen: input.fen,
      });
    }
  } catch {
    coachNote = ''; // unverifiable board → speak nothing
    void logAppAudit({
      kind: 'claim-validator-trip',
      category: 'subsystem',
      source: 'misconceptionClassifier.coachNote',
      summary: `dropped entire coachNote — FEN unparseable, cannot verify board claims (tag=${tag})`,
      fen: input.fen,
    });
  }

  if (tag === 'none') {
    return { tag: 'none', coachNote };
  }
  if (!isMisconceptionTagId(tag)) return null;

  const customLabel = typeof parsed.customLabel === 'string' ? parsed.customLabel.trim() : '';
  if (tag === 'other' && !customLabel) return null;

  return {
    tag,
    customLabel: tag === 'other' ? customLabel : undefined,
    coachNote,
  };
}
