import type { LessonScript } from '../../types';

// TODO(masterclass §0.7 STEP 1b): one LessonScript per variation tab, keyed
// EXACTLY "french-defence::<Exact Variation Name>". sayShort ≤8 words each.
export const FRENCH_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  // 'french-defence::Some Variation': { openingId: 'french-defence', title: '...', minutes: 10,
  //   orientation: 'black', beats: [ ... ] },
};
