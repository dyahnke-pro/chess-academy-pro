import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * G0 ENFORCEMENT GATE — the mechanical teeth behind "the LLM decides nothing."
 *
 * The G0 law (CLAUDE.md) was written EIGHT times and ignored for THREE MONTHS
 * because a written rule is something a session reads and then ignores. This
 * gate makes a violation impossible to miss: it FREEZES the count of band-aid
 * signatures (validator regens + prompts that beg the LLM not to hallucinate)
 * in the coach LLM path. Add a new one — a `validateClaims` call, a regen, a
 * "cite NO / use EXACTLY / run it through the engine" instruction — and the
 * count grows past the baseline and THIS TEST FAILS, blocking the push.
 *
 * The baseline can ONLY SHRINK. As the grounding inversion removes a validator
 * (the answer is computed, so there's nothing to validate), LOWER the baseline
 * to the new count. NEVER raise it. When it reaches 0, the inversion is done
 * and the disease is gone.
 *
 * If this test is failing because you ADDED a band-aid: STOP. You're treating
 * the symptom. Compute the answer in code and route it through `voiceFacts`
 * (the one sanctioned chokepoint). See
 * docs/plans/2026-06-10-coach-inversion-WORKORDER.md.
 */
const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string): string => readFileSync(join(here, rel), 'utf8');

// The coach LLM-decision surface this gate watches.
const WATCHED = [
  'coachApi.ts',
  '../coach/coachService.ts',
] as const;

// Disease signatures: the LLM is still deciding and we're patching it.
const BANDAID_RE = /cite NO [a-z]|use EXACTLY|never name a different|regenerat[a-z]+|run the (?:position )?through the engine|run it through the engine/gi;
const VALIDATOR_RE = /validateClaims\(|validateArrowClaims\(|validateTacticClaims\(/g;

// 🔒 BASELINE — ONLY EVER LOWER THIS.
//    2026-06-10: started at 9.
//    STEP C (kill the regen loop): 9 → 4. Removed the 2 regen `validateClaims`
//    passes + `buildRetryAddendum` (Regenerate / cite NO move / Cite NO %).
//    STEP D (intent inversions + cleanup): 4 → 1. Reworded the stock fallback
//    to stop punting "run the position through the engine", and reworded the
//    two false-positive doc/comments (the law quoted in the voiceFacts
//    doc-comment + the coachService isBestMoveQuestion comment) so the gate
//    measures REAL band-aids, not quotes of the rule.
//    The remaining 1 is the SINGLE silent `validateClaims` backstop on the
//    general chat-fallback path — kept deliberately per STEP C ("keep ONE
//    validator pass as a silent backstop; ZERO regens"). It drops to 0 only
//    when that general path is fully inverted too (every chat turn assembled),
//    so the backstop has nothing left to guard. Until then, 1 is the honest
//    floor — do NOT delete the backstop just to hit 0 (that removes the safety
//    net, not the disease).
const BASELINE = 1;

describe('G0 gate — the LLM decides nothing (band-aid baseline, can only shrink)', () => {
  it('keeps the band-aid count at or below the frozen baseline', () => {
    let count = 0;
    const perFile: Record<string, number> = {};
    for (const rel of WATCHED) {
      const src = read(rel);
      const n = (src.match(BANDAID_RE)?.length ?? 0) + (src.match(VALIDATOR_RE)?.length ?? 0);
      perFile[rel] = n;
      count += n;
    }
    // A failure here means a band-aid was ADDED. Fix the root (compute + voiceFacts),
    // don't raise the baseline. If you REMOVED one, lower BASELINE to `count`.
    expect(count, `band-aid markers by file: ${JSON.stringify(perFile)} — if you ADDED one, route through voiceFacts instead (G0). If you REMOVED one, lower BASELINE to ${count}.`).toBeLessThanOrEqual(BASELINE);
  });

  it('the voiceFacts chokepoint still exists (never delete the one sanctioned path)', () => {
    expect(read('coachApi.ts')).toContain('export async function voiceFacts');
  });
});
