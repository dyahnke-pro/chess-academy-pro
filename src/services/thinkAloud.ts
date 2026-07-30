// thinkAloud — Danya-style deliberation at real decision points while the
// STUDENT plays (David 2026-07-11 "#1 I like, but the user should be playing"
// + the principle-then-exception combine; design:
// docs/plans/2026-07-11-danya-style-remaining.md #20).
//
// The coach thinks out loud about what the position WANTS — the reads, the
// ideas in the air, why the tempting move fails — and NEVER hands the move.
// Honesty by construction (same as the question suite): the fact block is
// guaranteed not to contain the engine's best-move SAN, so the phrasing
// model cannot leak what it was never given.
//
// G0: every fact is computed — positional reads (SEE/scope/pawn structure),
// engine line-2 punishment geometry, principle checks — plus the curated
// teaching note when the corpus covers the position.

import { Chess } from 'chess.js';
import { developmentRead, kingSafetyRead, findPieceQuality, findWeakPawns, findPawnBreaks } from './positionReadingService';
import { describeMoveGeometry } from './groundedAnswer';
import { detectPrincipleViolations } from './principleDetector';
import { teachingNoteForBoard, teachingBeatText } from './danyaTeachingService';

export interface ThinkAloudLine {
  /** SAN of the line's first move (student POV candidates). */
  san: string;
  /** Student-POV centipawns. */
  evalCp: number;
  /** The engine's reply SAN, when known (line[1]). */
  replySan?: string;
}

export interface ThinkAloudMoment {
  /** The computed deliberation block for the narration (live register). */
  facts: string;
  /** The withheld answer — for telemetry only, NEVER included in facts. */
  withheldSan: string;
}

/** Decision-moment gap: line 1 must beat line 2 by at least this much for
 *  there to be "something to find". */
export const THINK_ALOUD_MIN_GAP_CP = 80;
/** Skip when the game is already decided — deliberation reads as noise. */
export const THINK_ALOUD_MAX_ABS_EVAL_CP = 500;

/**
 * Build a think-aloud moment from the student-to-move position. Returns null
 * unless this is a genuine decision point. `lines` are the engine's top lines
 * from THIS fen, student POV, best first.
 */
export function buildThinkAloud(opts: {
  fen: string;
  historySans: string[];
  studentColor: 'white' | 'black';
  lines: ThinkAloudLine[];
}): ThinkAloudMoment | null {
  const { fen, historySans, studentColor, lines } = opts;
  if (lines.length < 2) return null;
  const [best, second] = lines;
  if (!best?.san || typeof best.evalCp !== 'number' || typeof second?.evalCp !== 'number') return null;
  if (Math.abs(best.evalCp) > THINK_ALOUD_MAX_ABS_EVAL_CP) return null;

  const principles = (() => {
    try { return detectPrincipleViolations(historySans); } catch { return []; }
  })();
  const gap = best.evalCp - second.evalCp;
  const isDecisionMoment = gap >= THINK_ALOUD_MIN_GAP_CP;
  if (!isDecisionMoment && principles.length === 0) return null;

  const color: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const facts: string[] = [];

  // 1. The reads — square-anchored, chess.js/SEE-computed.
  try {
    const dev = developmentRead(fen, color);
    const ks = kingSafetyRead(fen, color);
    if (dev && dev.developedMinors < dev.totalMinors) {
      facts.push(`${dev.totalMinors - dev.developedMinors} of the student's minor pieces are still undeveloped.`);
    }
    if (ks && !ks.castled) facts.push(`The student's king has not castled.`);
    const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
    const quality = findPieceQuality(fen).filter((q) => q.color === color).slice(0, 2);
    for (const q of quality) {
      facts.push(`The student's ${NAME[q.piece] ?? 'piece'} on ${q.square} is ${q.quality === 'good' ? 'strong' : 'poor'} (${q.reason}).`);
    }
    const weak = findWeakPawns(fen, color === 'w' ? 'b' : 'w');
    if (weak.isolated.length > 0) facts.push(`The opponent's isolated pawn${weak.isolated.length > 1 ? 's' : ''} on ${weak.isolated.join(', ')} ${weak.isolated.length > 1 ? 'are' : 'is'} a long-term target.`);
    const breaks = findPawnBreaks(fen).slice(0, 2);
    if (breaks.length > 0) facts.push(`Candidate pawn break${breaks.length > 1 ? 's' : ''}: ${breaks.join(', ')}.`);
  } catch { /* each read is a bonus */ }

  // 2. The tempting-but-second-best beat — line 2 CAN be named (it's not the
  //    answer); its punishment is the teaching.
  if (isDecisionMoment && second.san) {
    let punish = '';
    if (second.replySan) {
      try {
        const c = new Chess(fen);
        c.move(second.san);
        const g = describeMoveGeometry(c.fen(), second.replySan, studentColor === 'white' ? 'black' : 'white');
        punish = g ? ` — the reply ${second.replySan} ${g}` : ` — ${second.replySan} is the punishing reply`;
      } catch { /* geometry is a bonus */ }
    }
    facts.push(`${second.san} looks natural here but concretely falls short (about ${(gap / 100).toFixed(1)} pawns worse than the position's best)${punish}.`);
  }

  // 3. Principle-then-exception.
  for (const p of principles.slice(0, 1)) {
    facts.push(`Principle in the air: ${p.principle} ${p.observed}`);
  }

  // 4. The curated teaching note at this exact position, when covered.
  try {
    const note = teachingNoteForBoard(historySans, fen);
    // The whole beat, `plans` included — that field carries what the position
    // is heading toward, which is exactly what a deliberation should weigh.
    if (note) facts.push(`Coaching note for this position: ${teachingBeatText(note)}`);
  } catch { /* bonus */ }

  if (facts.length === 0) return null;

  // THE LEAK GUARD (honesty by construction): the answer's SAN must not
  // appear anywhere in the block. A read that happens to name it (e.g. a
  // pawn-break square colliding with the best move) is dropped.
  const bare = best.san.replace(/[+#]$/, '');
  const safe = facts.filter((f) => !f.includes(bare));
  if (safe.length === 0) return null;

  const block =
    `THINK ALOUD (the student is choosing a move — deliberate, do NOT answer): ` +
    `open deliberatively (e.g. "Let's think about what this position wants…"), weave these computed reads into 2-4 sentences, ` +
    `and STOP without recommending, naming, or hinting at any specific move for the student. ` +
    `The reads: ${safe.join(' ')}`;

  return { facts: block, withheldSan: best.san };
}
