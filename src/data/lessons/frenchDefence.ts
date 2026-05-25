import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision / intent), YELLOW
// highlights (a key square the narration names). Orange move-squares are
// auto-painted by the player — don't author them.
const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
void ATK; void KEY; // remove once used

// TODO(masterclass §0.7 STEP 1a): author the main-line beats. Every beat:
//   { id, moves, say (full Watch prose), sayShort (≤8-word Learn cue),
//     arrows?, highlights? }
// MOVES come from openings-lichess.json / chess.js (G3) — never invented.
// say = full explanation (FULL narration mode); sayShort = "move + 3-5 word
// echo" (LIMITED mode). Both are gated.
export const FRENCH_DEFENCE_LESSON: LessonScript = {
  openingId: 'french-defence',
  title: 'French Defence — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    // { id: 'open', moves: ['e4', 'e5'], say: '...', sayShort: '… — …' },
  ],
};
