/**
 * quiz_user_for_move — REAL (WO-COACH-LICHESS-OPENINGS).
 *
 * Pauses narration and asks the user to find a specific move on the
 * board. The surface puts the board into "find the move" mode,
 * shows the prompt, waits for the user to play, and resolves with
 * { ok, played, expected? } so the coach can react.
 *
 * Use this in a guided opening tour to turn one-way narration into
 * an interactive lesson:
 *   coach: speaks "White just played e4. What's Black's most
 *           popular reply?"
 *   coach: quiz_user_for_move { expectedSan: 'e5', prompt: '...' }
 *   surface: shows prompt, waits for user move
 *   user: plays e5 → { ok: true, played: 'e5' }
 *   coach: speaks praise + advances to next move
 *
 * If the surface didn't wire `onQuizUserForMove` (e.g. running on
 * a non-interactive surface like the standalone chat or a static
 * test harness), returns a graceful no-op.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const quizUserForMoveTool: Tool = {
  name: 'quiz_user_for_move',
  category: 'cerebrum',
  kind: 'write',
  description:
    "Ask the student to find a specific move on the live board. Surfaces a prompt + 'find the move' mode, waits for them to play, and returns { ok, played } when they're done. ok=true if the played move matches expectedSan or any allowAlternatives entry; ok=false otherwise (with the played SAN so you can narrate feedback). Use to build an interactive lesson — quiz them between narration steps rather than just lecturing.",
  parameters: {
    type: 'object',
    properties: {
      expectedSan: {
        type: 'string',
        description: 'The SAN of the move you want the student to find (e.g. "Nf3", "e5", "O-O").',
      },
      prompt: {
        type: 'string',
        description:
          "Prompt shown to the student while they're finding the move. Keep it short (under 80 chars) — the surface displays it as a single line over the board.",
      },
      allowAlternatives: {
        type: 'string',
        description:
          'Optional. Comma-separated SAN list of alternative moves that should also be accepted as correct (e.g. for transpositions). The surface treats any of these as ok=true.',
      },
    },
    required: ['expectedSan', 'prompt'],
  },
  async execute(args, ctx) {
    const expectedSan = typeof args.expectedSan === 'string' ? args.expectedSan.trim() : '';
    const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : '';
    if (!expectedSan) return { ok: false, error: 'expectedSan is required' };
    if (!prompt) return { ok: false, error: 'prompt is required' };

    const allowAlternatives =
      typeof args.allowAlternatives === 'string'
        ? args.allowAlternatives
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    if (!ctx?.onQuizUserForMove) {
      // Production audit (build 26bbad4) caught the brain calling
      // quiz_user_for_move on /coach/teach where no UI is wired —
      // the old "ok=true stub" path made the brain believe it had
      // quizzed the student and continue narrating as if a quiz
      // had happened. The student saw nothing. Return ok=false so
      // the brain knows the quiz didn't actually run and either
      // explains the limitation, skips the quiz, or asks the
      // question conversationally in chat instead.
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'quizUserForMoveTool.execute',
        summary: `quiz_user_for_move unsupported on this surface (no onQuizUserForMove wired)`,
      });
      return {
        ok: false,
        error:
          'quiz_user_for_move is not supported on this surface. The student will not see a quiz prompt. Instead, ask the question conversationally in your text response and wait for them to reply with the move — they can play it on the board and tell you what they did.',
      };
    }

    try {
      const result = await ctx.onQuizUserForMove({
        expectedSan,
        prompt,
        allowAlternatives,
      });
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'quizUserForMoveTool',
        summary:
          result.ok
            ? `quiz_user_for_move expectedSan=${expectedSan} played=${'played' in result ? result.played : '?'} ok`
            : `quiz_user_for_move expectedSan=${expectedSan} ${'played' in result ? `played=${result.played}` : `reason=${'reason' in result ? result.reason : '?'}`} rejected`,
        fen: ctx.liveFen,
      });
      if (result.ok) {
        return {
          ok: true,
          result: { played: result.played, expected: expectedSan },
        };
      }
      // Surface returned a structured failure — pass it through.
      if ('played' in result) {
        return {
          ok: false,
          result: { played: result.played, expected: result.expected ?? expectedSan },
        };
      }
      return { ok: false, error: 'reason' in result ? result.reason : 'rejected' };
    } catch (err) {
      return {
        ok: false,
        error: `onQuizUserForMove threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
