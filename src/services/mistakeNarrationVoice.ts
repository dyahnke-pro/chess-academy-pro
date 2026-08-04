// mistakeNarrationVoice — hand the computed mistake FACTS to the phrasing model.
//
// David 2026-08-04: "Gotta put it in the package to the llm. Follow the same
// principles as teach me x opening." And: "the note must lead and the computed
// facts fill behind it."
//
// This is the tactics surface's half of the G0 contract, and it mirrors the
// walkthrough exactly:
//
//   PASS 1 — `generateMistakeNarration` (the LEAF, sync, no model) computes the
//            facts: the distilled corpus note first, the board read behind it,
//            the standing, the swing. It is board-gated and always ships.
//   PASS 2 — this module hands those facts to `voiceFacts`, the one grounding
//            chokepoint, which phrases them in the coach's voice.
//
// The model DECIDES nothing. It receives finished facts and re-says them; every
// guard inside `voiceFacts` (number fidelity, containment, must-preserve) falls
// back to serving the computed prose verbatim, so a phrasing failure degrades to
// PASS 1 rather than to silence or to invention.
//
// Kept in its own module deliberately: `mistakeNarration.ts` is a pure leaf that
// the live in-game capture path calls synchronously. Importing `coachApi` into
// it would drag the provider stack into that path and make it async for no gain.
import { voiceFacts } from './coachApi';
import { gradeNarrationText } from './coachAnswerGates';
import { logAppAudit } from './appAuditor';
import type { MistakeNarration } from '../types';
import type { NarrationParams } from './mistakeNarration';

/** The register this surface speaks in — R1 from the corpus plan.
 *
 *  A mistake puzzle is a fragment of the student's OWN game, replayed after the
 *  fact, so it is PAST tense and 2nd person. That is the opposite of the
 *  walkthrough's present-tense live demo, and the two must not blur (the locked
 *  two-register law, 2026-07-19).
 *
 *  These are DIRECTIVES, not facts: they travel in `opts.directives` so they can
 *  never be spoken. A prod incident put prompt instructions in the student's ear
 *  by appending them to `facts` — see the comment on `voiceFacts.directives`. */
const REGISTER_DIRECTIVES = [
  'This is the student\'s OWN game, replayed after it finished. Speak in the PAST tense, second person.',
  'Do NOT praise. Do NOT open with "That\'s it", "Correct", "Nice find", "Well played", "Perfect" or any acknowledgment.',
  'Do NOT restate a move that is already named — say the idea, not the notation, and never twice.',
  'Do NOT name a move as the answer; the student is about to be asked to find it.',
  'Say nothing you were not given. No new squares, pieces, tactics or evaluations.',
  'Keep it tight — this is spoken aloud over a board.',
].join(' ');

/** How long the phrasing model gets before we ship PASS 1 and move on.
 *
 *  Puzzle generation runs over a whole GAME at a time — a dozen mistakes per
 *  game, a batch of games per import — so an unbounded call here does not
 *  degrade one narration, it stalls the entire pipeline behind it. PASS 1 is
 *  already a complete, board-gated answer, so waiting is never worth it.
 *
 *  It also keeps this out of the tests' way: with no provider configured the
 *  underlying call simply never settles, and an unbounded await turned three
 *  puzzle-service specs into 5s timeouts. A bounded race is the honest fix for
 *  both, rather than mocking the symptom away in the specs. */
const PHRASING_BUDGET_MS = 4000;

function withTimeout<T>(p: Promise<T>): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), PHRASING_BUDGET_MS);
    p.then((v) => { clearTimeout(timer); resolve(v); })
      .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

/**
 * Phrase a computed mistake narration in the coach's voice.
 *
 * Returns the narration unchanged when the model is unavailable, declines, or
 * produces something the board gate rejects — PASS 1 is always a shippable
 * answer, so there is never a reason to fail loudly here.
 *
 * Only the INTRO is voiced. That is where the distilled note lands and where
 * the teaching happens; the per-move lines are single computed clauses
 * ("It wins the rook on d1") whose phrasing the model cannot improve and could
 * only endanger. Extending this to the move lines wants the walkthrough's
 * numbered-script + strict-JSON shape so each line stays pinned to its own ply.
 */
export async function voiceMistakeNarration(
  narration: MistakeNarration,
  params: NarrationParams,
): Promise<MistakeNarration> {
  const facts = narration.intro?.trim();
  if (!facts) return narration;

  try {
    const phrased = await withTimeout(voiceFacts(facts, {
      directives: REGISTER_DIRECTIVES,
      intent: 'mistake-review',
      // The played move must survive verbatim: the student is looking at the
      // board it was played on, and a corrupted SAN (d4→e4) is a chess
      // hallucination the number-fidelity net cannot catch.
      mustPreserve: [params.playerMoveSan].filter(Boolean),
    }));

    const cleaned = phrased?.trim();
    if (!cleaned || cleaned === facts) return narration;

    // Belt and braces: re-grade the phrased line against the very board it
    // describes. `voiceFacts` protects numbers and tokens, not board truth.
    const graded = gradeNarrationText(cleaned, params.fen, 'mistakeNarration.voiced')?.trim();
    if (!graded) return narration;

    // The answer must not leak. The phrasing model was told not to name it, but
    // a directive is not a guarantee — this is (rule #8), so it is enforced.
    const solutionTo = params.moves.trim().split(/\s+/)[0]?.slice(2, 4);
    if (solutionTo && new RegExp(`\\b${solutionTo}\\b`).test(graded) && !new RegExp(`\\b${solutionTo}\\b`).test(facts)) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: 'mistakeNarrationVoice.spoilerGuard',
        summary: `phrasing introduced the solution square ${solutionTo} — serving computed prose`,
      });
      return narration;
    }

    return { ...narration, intro: graded };
  } catch {
    return narration; // phrasing is a bonus; the computed facts already ship
  }
}
