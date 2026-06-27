/**
 * positionReadingGrader — the LLM grading layer for Analysis Practice.
 *
 * G0 discipline: the LLM does NOT analyze the position. The analysis is already
 * done in code (positionReadingService) and handed to the model as the ANSWER
 * KEY. The model's ONLY job is to decide whether the student's free-text read
 * matches that key — a closed-world match, inventing no chess facts. The pure
 * deterministic grader (`gradeReadingAnswerDeterministic`) is the offline
 * fallback and the source of truth whenever the model is unavailable or returns
 * anything unparseable.
 */
import { getCoachChatResponse } from './coachApi';
import {
  gradeReadingAnswerDeterministic,
  type ReadingQuestion,
  type ReadingGrade,
  type ReadingVerdict,
} from './positionReadingService';

const GRADER_SYSTEM =
  'You grade a chess student\'s READ of a position. You do NOT analyze the position yourself — ' +
  'the correct analysis is GIVEN to you as the answer key. Judge ONLY against that key. Introduce ' +
  'no chess fact that is not in the key. Output ONLY a compact JSON object, nothing else.';

function buildGraderPrompt(q: ReadingQuestion, userAnswer: string): string {
  const concepts = q.negative
    ? 'The position is quiet — the CORRECT read is that there is nothing concrete to find.'
    : `Key things to mention: ${q.acceptTokens.join(', ') || '(see the answer key)'}.`;
  return [
    `QUESTION: ${q.prompt}`,
    `ANSWER KEY (the truth, computed by the engine + board): ${q.answer}`,
    concepts,
    `THE STUDENT SAID: "${userAnswer}"`,
    '',
    'Decide: "correct" = identified the key idea/square; "partial" = right theme but missed the',
    'specific square/idea; "wrong" = missed it or claimed something the key contradicts.',
    'Respond with ONLY: {"verdict":"correct|partial|wrong","feedback":"<= 15 words, second person>"}',
  ].join('\n');
}

const VALID: ReadingVerdict[] = ['correct', 'partial', 'wrong'];

/** Pull the {verdict, feedback} object out of a possibly-chatty model reply. */
function parseGrade(raw: string): { verdict: ReadingVerdict; feedback: string } | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as { verdict?: unknown; feedback?: unknown };
    const verdict = typeof obj.verdict === 'string' ? obj.verdict.toLowerCase().trim() : '';
    if (!VALID.includes(verdict as ReadingVerdict)) return null;
    const feedback = typeof obj.feedback === 'string' ? obj.feedback.slice(0, 140) : '';
    return { verdict: verdict as ReadingVerdict, feedback };
  } catch {
    return null;
  }
}

/**
 * Grade a student's read. Tries the LLM (natural-language understanding); falls
 * back to the deterministic matcher on any error / unparseable reply. The
 * `correctAnswer` surfaced to the student is ALWAYS the computed answer key —
 * never model prose — so a wrong grade can't show an invented "right answer".
 */
export async function gradeReadingAnswer(q: ReadingQuestion, userAnswer: string): Promise<ReadingGrade> {
  const fallback = gradeReadingAnswerDeterministic(q, userAnswer);
  try {
    const reply = await getCoachChatResponse(
      [{ role: 'user', content: buildGraderPrompt(q, userAnswer) }],
      GRADER_SYSTEM,
      undefined,
      'hint',
      120,
    );
    const parsed = parseGrade(reply);
    if (!parsed) return fallback;
    return {
      verdict: parsed.verdict,
      correctAnswer: q.answer, // ALWAYS the computed key — never the model's words
      note: parsed.feedback || fallback.note,
    };
  } catch {
    return fallback;
  }
}
