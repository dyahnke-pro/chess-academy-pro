// Detect when the coach gave a NON-ANSWER — it connected and replied, but the
// reply didn't address the student's question (David 2026-06-14: he asked "what's
// the weakest aspect of my game?" and got an off-topic knight-fork blurb, then
// re-asked and got a greeting). These aren't crashes, so the $exception path
// never sees them. We emit `coach_non_answer` to PostHog; the error-watch cron
// picks it up and the autofix pipeline triages it — same flow as a crash.
//
// Two deterministic, high-precision signals (no LLM judge — G0):
//   1. FALLBACK/GREETING served to a real question (the coach punted).
//   2. RE-ASK — the student asks a near-duplicate of a recent question, which
//      means the PRIOR answer didn't satisfy. This is the signal that catches
//      the off-topic case a string-match can't.
import { captureEvent } from './analytics';

/** Known canned strings the coach emits when it ISN'T really answering. Matched
 *  case-insensitively as substrings of the normalized answer. Keep in sync with
 *  the greeting in CoachTeachPage and OFFLINE_FALLBACKS / failure text. */
const NON_ANSWER_MARKERS = [
  "i'm having trouble connecting",
  'coach is unavailable right now',
  'welcome to my classroom',
  'what would you like to learn',
  "let's work on that",
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Jaccard-ish overlap on content words (len > 2), relative to the smaller set
 *  so "what are my weaknesses" vs "what's my biggest weakness" scores high. */
function tokenOverlap(a: string, b: string): number {
  const wa = new Set(normalize(a).split(' ').filter((w) => w.length > 2));
  const wb = new Set(normalize(b).split(' ').filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter / Math.min(wa.size, wb.size);
}

/** Does the text read like a real question the coach should answer? Filters out
 *  greetings / one-word inputs so we don't flag those as non-answers. */
function looksLikeQuestion(q: string): boolean {
  if (/\?/.test(q)) return true;
  if (/^(what|why|how|where|when|which|who|is|are|can|could|should|do|does|did|tell|explain|show|find)\b/i.test(q.trim())) {
    return true;
  }
  return normalize(q).split(' ').length >= 3;
}

export interface NonAnswerInput {
  /** The student's message this turn. */
  question: string;
  /** The coach's reply this turn. */
  answer: string;
  /** The student's PRIOR questions this session (for re-ask detection). */
  priorUserQuestions?: string[];
  /** Which surface (coach-teach / coach-chat / …) for the report. */
  surface: string;
}

export interface NonAnswerResult {
  isNonAnswer: boolean;
  /** 'fallback-or-greeting' | 're-ask' | 'too-short' | '' */
  reason: string;
}

export function detectCoachNonAnswer(input: NonAnswerInput): NonAnswerResult {
  const q = (input.question ?? '').trim();
  const a = (input.answer ?? '').trim();
  if (!q || !looksLikeQuestion(q)) return { isNonAnswer: false, reason: '' };

  const an = normalize(a);

  // (1) the coach served a canned fallback / greeting to a real question.
  // Normalize the markers too so punctuation (apostrophes) matches.
  if (an && NON_ANSWER_MARKERS.some((m) => an.includes(normalize(m)))) {
    return { isNonAnswer: true, reason: 'fallback-or-greeting' };
  }

  // (2) re-ask: the student repeated a recent question → the prior reply missed.
  for (const prev of input.priorUserQuestions ?? []) {
    if (prev && looksLikeQuestion(prev) && tokenOverlap(q, prev) >= 0.8) {
      return { isNonAnswer: true, reason: 're-ask' };
    }
  }

  // (3) a real question got an empty / trivially short reply.
  if (a.length > 0 && a.length < 12) {
    return { isNonAnswer: true, reason: 'too-short' };
  }

  return { isNonAnswer: false, reason: '' };
}

/** Report a RE-ASK directly (the caller already determined the student repeated
 *  a recent question, so the prior answer missed). Emits the same
 *  `coach_non_answer` event the detector does, so the error-watch + autofix
 *  pipeline treats it identically. Never throws into the coach path. */
export function reportCoachReask(args: { surface: string; priorQuestion: string; reask: string }): void {
  try {
    captureEvent('coach_non_answer', {
      surface: args.surface,
      reason: 're-ask',
      question: args.priorQuestion.slice(0, 300),
      answerPreview: '(re-ask detected — the prior answer did not satisfy)',
      reask: args.reask.slice(0, 300),
    });
  } catch {
    /* never let reporting throw into the coach turn */
  }
}

/** Detect AND, if a non-answer, report it to PostHog. Returns the result.
 *  Never throws into the coach path. */
export function reportCoachNonAnswer(input: NonAnswerInput): NonAnswerResult {
  let result: NonAnswerResult = { isNonAnswer: false, reason: '' };
  try {
    result = detectCoachNonAnswer(input);
    if (result.isNonAnswer) {
      captureEvent('coach_non_answer', {
        surface: input.surface,
        reason: result.reason,
        question: input.question.slice(0, 300),
        answerPreview: input.answer.slice(0, 200),
      });
    }
  } catch {
    /* never let non-answer reporting throw into the coach turn */
  }
  return result;
}
