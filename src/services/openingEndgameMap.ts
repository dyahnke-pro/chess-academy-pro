import { getEndgameLessonById } from './endgameLessonsService';
import type { EndgameLesson } from '../types/endgameLesson';

// Which of the 27 curated endgame lessons each opening steers toward.
// A default fundamental set keeps every opening's Endgame masterclass
// section populated; per-opening overrides emphasise the endgames that
// opening actually reaches. We never invent positions — every id here
// resolves to a hand-authored lesson with verified FENs + solutions.

const DEFAULT_ENDGAMES = [
  'opposition',
  'key-squares',
  'lucena-position',
  'philidor-rook-ending',
  'rooks-behind-passed-pawns',
  'active-rook',
];

const OVERRIDES: Record<string, string[]> = {
  // The Ruy is famous for rook endings and clean king-and-pawn play;
  // the Exchange/Berlin steer toward opposite-coloured bishops too.
  'ruy-lopez': [
    'opposition',
    'key-squares',
    'lucena-position',
    'philidor-rook-ending',
    'rooks-behind-passed-pawns',
    'opposite-color-bishops',
  ],
};

/**
 * The endgame lessons relevant to an opening, in teaching order.
 * Falls back to the universal fundamentals when no override exists.
 */
export function getEndgameLessonsForOpening(openingId: string): EndgameLesson[] {
  const ids = OVERRIDES[openingId] ?? DEFAULT_ENDGAMES;
  return ids
    .map((id) => getEndgameLessonById(id))
    .filter((l): l is EndgameLesson => l !== null);
}
