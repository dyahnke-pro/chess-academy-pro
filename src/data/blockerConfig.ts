import type { MiniGameLevelConfig } from '../types';

/**
 * Blocker — 4 vs 4 pawns, player on rank 3, AI on rank 6, files c–f.
 * The AI has a designated target pawn it prioritises advancing.
 * Player must promote first while stopping the target pawn.
 * Kings on a1/h8 for chess.js legality.
 */

const START_FEN = '7k/8/2pppp2/8/8/2PPPP2/8/K7 w - - 0 1';

export const BLOCKER_LEVELS: MiniGameLevelConfig[] = [
  {
    level: 1,
    title: 'Stop the Pawn',
    description: 'Block the marked pawn while racing your own forward!',
    startFen: START_FEN,
    playerColor: 'w',
    highlightMode: 'all',
    showTargetPawn: true,
    aiConfig: {
      bestMoveChance: 0.4,
      blocksAdvancedPawn: false,
      prioritizesAdvancement: false,
      targetPawnFile: 'd',
    },
    storyIntro:
      "See that special pawn? The enemy really wants to get it across! Stop it while pushing your own pawns forward. Red squares are dangerous, green squares are safe!",
    storyWin:
      "You blocked the enemy and got through first! Great strategy!",
    storyLoss:
      "The enemy's pawn slipped through! Try to block it next time!",
  },
  {
    level: 2,
    title: 'Pawn Duel',
    description: 'The enemy captures now! Only danger squares shown.',
    startFen: START_FEN,
    playerColor: 'w',
    highlightMode: 'danger',
    showTargetPawn: true,
    aiConfig: {
      bestMoveChance: 0.65,
      blocksAdvancedPawn: true,
      prioritizesAdvancement: true,
      targetPawnFile: 'e',
    },
    storyIntro:
      "The enemy is getting clever — it captures AND pushes hard! Watch the red danger squares and plan your moves wisely.",
    storyWin:
      "Outstanding! You kept control and promoted first. You won the Pawn Duel!",
    storyLoss:
      "That enemy pawn was tricky! Analyse what happened and try again.",
  },
  {
    level: 3,
    title: 'Master Blocker',
    description: 'No highlights, no target marker. Figure it out!',
    startFen: START_FEN,
    playerColor: 'w',
    highlightMode: 'none',
    showTargetPawn: false,
    aiConfig: {
      bestMoveChance: 0.85,
      blocksAdvancedPawn: true,
      prioritizesAdvancement: true,
      targetPawnFile: 'e',
    },
    storyIntro:
      "No hints this time! You need to figure out which pawn the enemy is pushing and stop it — all while racing your own pawns. Good luck!",
    storyWin:
      "Masterful! You figured it all out on your own. You are the Master Blocker!",
    storyLoss:
      "That was the hardest challenge. Study the board and give it another shot!",
  },
];
