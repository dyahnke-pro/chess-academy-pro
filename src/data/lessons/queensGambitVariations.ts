import type { LessonScript } from '../../types';

// TODO(masterclass §0.7 STEP 1b): one LessonScript per variation tab, keyed
// EXACTLY "queens-gambit::<Exact Variation Name>". sayShort ≤8 words each.
export const QUEENS_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  // 'queens-gambit::Some Variation': { openingId: 'queens-gambit', title: '...', minutes: 10,
  //   orientation: 'white', beats: [ ... ] },
};
