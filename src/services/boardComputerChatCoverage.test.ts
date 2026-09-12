import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── BUILT-BUT-UNWIRED GATE (David 2026-09-09) ────────────────────────────────
// The disease this repo keeps hitting: a board-awareness COMPUTER is built and
// wired into ONE surface (usually automatic narration) but never reaches the
// typed chat Q&A — so the coach can TEACH a fact in Watch and then fail to
// ANSWER the same question 30s later. It's a PARITY bug, and the only reliable
// way to catch it is mechanically: enumerate every computer, assert each is
// either consumed by the chat answer path (groundedAnswer.ts) or explicitly
// declared narration-only/internal. A NEW computer that is neither FAILS here,
// forcing the author to wire a chat lane (positionalTopic + assemblePositional
// Answer branch, or a dispatchPureAspect case) or justify the exception.
//
// David: "These are the types of fixes you need to be making... can you logic
// your way through this next time?" — this test IS that logic, made permanent.

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string): string => readFileSync(join(here, rel), 'utf8');

const READING = read('positionReadingService.ts');
// The chat answer path: groundedAnswer holds every assemble*/answerBoardQuestion
// lane the unified brain (getCoachChatResponse) calls.
const CHAT_PATH = read('groundedAnswer.ts');

/** Every `export function` name in positionReadingService. */
function exportedFns(src: string): string[] {
  const out: string[] = [];
  const re = /export function ([a-zA-Z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

// Legitimately NOT a chat lane — pure geometry helpers, internal scan primitives,
// narration renderers, and computers already reached THROUGH another chat lane.
// Adding a name here is a deliberate, reviewed exception; keep it justified.
const NOT_A_CHAT_LANE = new Set<string>([
  // low-level helpers other computers call
  'seeSequence', 'minorCanReachSquare', 'pieceScope', 'pressureCount',
  'forcingPrefix', 'findForcingCandidates',
  // pin/legality-aware SEE primitive (2026-09-12) — reached through the chat
  // path via `landingIsSafe` / `capturesWinMaterial` (both consumed by
  // groundedAnswer's describeMoveGeometry), not a Q&A lane of its own.
  'legalSeeGain',
  // reached through an existing chat lane, not on their own
  'findHangingBySee',          // behind the hanging/loose lane (seeGain)
  // narration / reading-drill renderers + graders (not typed Q&A)
  'formatReadingFacts', 'samplePositionsFromGame', 'findMistakePositions',
  'buildReadingQuestions', 'readingHint', 'gradeReadingAnswerDeterministic',
]);

describe('board-awareness computers all reach the chat Q&A (built-but-unwired gate)', () => {
  const fns = exportedFns(READING);

  it('positionReadingService still exports a real set of computers', () => {
    expect(fns.length).toBeGreaterThan(30);
  });

  it.each(fns.filter((f) => !NOT_A_CHAT_LANE.has(f)))(
    '%s is consumed by the chat answer path (groundedAnswer.ts)',
    (fn) => {
      const referenced = new RegExp(`\\b${fn}\\b`).test(CHAT_PATH);
      expect(
        referenced,
        `${fn} is a board computer that no chat lane consumes. Wire it into ` +
        `getCoachChatResponse's grounded answer (a positionalTopic matcher + an ` +
        `assemblePositionalAnswer branch, or a dispatchPureAspect case) so the ` +
        `typed coach can answer it — or add it to NOT_A_CHAT_LANE with a reason ` +
        `if it is a pure helper / narration-only renderer.`,
      ).toBe(true);
    },
  );
});
