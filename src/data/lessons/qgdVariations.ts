import type { LessonScript } from '../../types';

// TODO(masterclass §0.7 STEP 1b): one LessonScript per variation tab, keyed
// EXACTLY "qgd::<Exact Variation Name>". sayShort ≤8 words each.
export const QGD_VARIATION_LESSONS: Record<string, LessonScript> = {
  // 'qgd::Some Variation': { openingId: 'qgd', title: '...', minutes: 10,
  //   orientation: 'black', beats: [ ... ] },
};
