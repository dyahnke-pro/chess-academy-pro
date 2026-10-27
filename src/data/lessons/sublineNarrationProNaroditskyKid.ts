import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration for the Naroditsky King's Indian Defence (student
// BLACK) — frequent opponent deviations across the variations, grounded in his
// KID teaching (transcript reference-only, prose original, house voice). The KID
// plan is structural: when the centre locks, Black storms the kingside with
// …f5-f4; against the fianchetto/quiet setups Black leans on …e5, …c6 and …Qa5.
// Keyed `${openingId}::${variationIndex}::${triggerMove}@${atPly}`.

const K = ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];

export const SUBLINE_NARRATION_PRO_NAR_KID: Record<string, SublineNarration> = {
  'pro-naroditsky-kid::2::e3@6': {
    intro: { say: "e3 — a modest, solid setup that declines the big centre. Answer with …O-O and …d6, then …e5 or …c5 to claim your share of the centre. Against the quiet e3 the KID has an easy, comfortable game — no cramping, no danger.", sayShort: 'e3 — …d6 then …e5 or …c5.' }, sources: K,
  },
};
