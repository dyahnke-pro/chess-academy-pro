import type { MiniGameLevelConfig } from '../types';

/**
 * Pawn Wars — pure pawn race.  Both sides advance 8 pawns from starting
 * ranks.  First to promote wins.  Kings on a1/h8 for chess.js legality.
 */

const START_FEN = '7k/pppppppp/8/8/8/8/PPPPPPPP/K7 w - - 0 1';

export const PAWN_WARS_LEVELS: MiniGameLevelConfig[] = [
  {
    level: 1,
    title: 'Pawn Skirmish',
    description: 'Race your pawns forward! Red and green squares help you.',
    startFen: START_FEN,
    playerColor: 'w',
    highlightMode: 'all',
    showTargetPawn: false,
    aiConfig: {
      bestMoveChance: 0.3,
      blocksAdvancedPawn: false,
      prioritizesAdvancement: false,
    },
    storyIntro:
      'Your little pawns are all lined up and ready to march! Push them forward and be the first to reach the other side. Watch the colors — red squares are dangerous, green squares are safe!',
    storyWin:
      'Amazing! Your pawn made it all the way across! You won the Pawn Skirmish!',
    storyLoss:
      "Oh no, the enemy pawn snuck through first! Don't worry, you can try again!",
  },
  {
    level: 2,
    title: 'Pawn Clash',
    description: 'The enemy captures now! Only danger squares are shown.',
    startFen: START_FEN,
    playerColor: 'w',
    highlightMode: 'danger',
    showTargetPawn: false,
    aiConfig: {
      bestMoveChance: 0.6,
      blocksAdvancedPawn: true,
      prioritizesAdvancement: true,
    },
    storyIntro:
      "The enemy pawns are getting smarter — they'll try to capture yours! Red squares show where it's dangerous. Plan your moves carefully!",
    storyWin:
      'Brilliant! You out-raced a tough opponent. You won the Pawn Clash!',
    storyLoss:
      "That was a close one! The enemy got through first. Give it another go!",
  },
  {
    level: 3,
    title: 'Pawn Battle',
    description: 'No more highlights. You must see the danger yourself!',
    startFen: START_FEN,
    playerColor: 'w',
    highlightMode: 'none',
    showTargetPawn: false,
    aiConfig: {
      bestMoveChance: 0.9,
      blocksAdvancedPawn: true,
      prioritizesAdvancement: true,
    },
    storyIntro:
      'This is the real deal! No colored squares to help you. Think carefully about every move, and race your pawns to the finish!',
    storyWin:
      'Incredible! You beat the strongest opponent with no help at all! You are a true Pawn Warrior!',
    storyLoss:
      "That was really tough! The enemy was playing their best. Take a breath and try again — you can do it!",
  },
];
