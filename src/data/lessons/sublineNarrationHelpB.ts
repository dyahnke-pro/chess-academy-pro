import type { SublineNarration } from '../../services/sublineLesson';

// HELPER B — overflow help for the d4/flank narration tail (David 2026-06-18).
// OVERRIDE LAYER: spread AFTER D4Flank, so a key authored here SUPERSEDES the
// intro-only version in sublineNarrationD4Flank.ts (deeper teach-past-deviation
// wins). Owned by ONE helper session. Author full per-move-beat versions for
// your assigned openings ONLY (Benoni/Benko/gambits/Dutch — see the WO). Do not
// touch any other group/helper file. Key: `${openingId}::${variationIndex}::${triggerMove}@${atPly}`.
export const SUBLINE_NARRATION_HELP_B: Record<string, SublineNarration> = {};
