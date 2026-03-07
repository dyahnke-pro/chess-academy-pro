import { JOURNEY_CHAPTER_ORDER } from '../types';
import type { KidGameConfig } from '../types';
import { JOURNEY_CHAPTERS } from './journeyChapters';
import { FAIRY_TALE_CHAPTERS } from './fairyTaleChapters';

export const PAWNS_JOURNEY_CONFIG: KidGameConfig = {
  gameId: 'pawns-journey',
  title: "Pawn's Journey",
  icon: '\uD83D\uDDFA\uFE0F',
  routePrefix: '/kid/journey',
  chapters: JOURNEY_CHAPTERS,
  chapterOrder: JOURNEY_CHAPTER_ORDER,
};

export const FAIRY_TALE_CONFIG: KidGameConfig = {
  gameId: 'fairy-tale',
  title: 'Fairy Tale Quest',
  icon: '\uD83C\uDFF0',
  routePrefix: '/kid/fairy-tale',
  chapters: FAIRY_TALE_CHAPTERS,
  chapterOrder: JOURNEY_CHAPTER_ORDER,
};

export const KID_GAME_CONFIGS: KidGameConfig[] = [
  PAWNS_JOURNEY_CONFIG,
  FAIRY_TALE_CONFIG,
];
