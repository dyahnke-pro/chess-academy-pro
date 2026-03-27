import type { GuidedGame } from '../types';

/**
 * Curated guided game tutorials for the kids section.
 * Every FEN and move has been validated with chess.js.
 */
export const GUIDED_GAMES: GuidedGame[] = [
  // ─── Game 1: Scholar's Mate ───────────────────────────────────────────────
  {
    id: 'scholars-mate',
    title: 'The Scholar\'s Surprise',
    description: 'Learn the famous 4-move checkmate!',
    difficulty: 1,
    estimatedMinutes: 2,
    playerColor: 'w',
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    storyIntro:
      'Welcome to your first real chess game! ' +
      'You will play as White and learn the Scholar\'s Mate — ' +
      'a sneaky 4-move checkmate that attacks the weakest square in Black\'s position. ' +
      'Follow the coach\'s instructions and play each move!',
    storyOutro:
      'Checkmate in just 4 moves! You used the bishop and queen together ' +
      'to attack the weak f7 square. The Scholar\'s Mate is one of the fastest ' +
      'checkmates in chess. Now you know how to do it — and how to stop it!',
    moves: [
      {
        moveNumber: 1, san: 'e4', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        narration: 'Start by pushing your king\'s pawn two squares to control the center!',
        highlightSquares: ['e2', 'e4'],
        teachingConcept: 'center control',
        wrongMoveResponse: 'Try moving the pawn from e2 to e4 — grab the center!',
      },
      {
        moveNumber: 1, san: 'e5', color: 'b', autoPlay: true,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        narration: 'Black fights for the center too. Now it\'s time to bring out a piece!',
      },
      {
        moveNumber: 2, san: 'Bc4', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
        narration: 'Slide the bishop to c4! It aims straight at f7, the weakest spot in Black\'s position.',
        highlightSquares: ['f1', 'c4', 'f7'],
        teachingConcept: 'development',
        isMilestone: true,
        wrongMoveResponse: 'Move the bishop from f1 to c4 — point it at f7!',
      },
      {
        moveNumber: 2, san: 'Nc6', color: 'b', autoPlay: true,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
        narration: 'Black develops a knight. Good defense, but we have a plan!',
      },
      {
        moveNumber: 3, san: 'Qf3', color: 'w', autoPlay: false,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        narration: 'Bring the queen to f3! Now BOTH the queen and bishop are targeting f7.',
        highlightSquares: ['d1', 'f3', 'f7'],
        teachingConcept: 'attacking a weakness',
        isMilestone: true,
        wrongMoveResponse: 'Move the queen from d1 to f3 — join the attack on f7!',
      },
      {
        moveNumber: 3, san: 'Bc5', color: 'b', autoPlay: true,
        fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        narration: 'Black develops the bishop, but forgot to defend f7! Time to strike!',
      },
      {
        moveNumber: 4, san: 'Qxf7#', color: 'w', autoPlay: false,
        fen: 'r1bqk1nr/pppp1Qpp/2n5/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
        narration: 'Capture on f7 with the queen — CHECKMATE! The bishop on c4 protects the queen, and the king has nowhere to run!',
        highlightSquares: ['f7', 'c4'],
        teachingConcept: 'checkmate',
        isMilestone: true,
        wrongMoveResponse: 'Capture the pawn on f7 with your queen — it\'s checkmate!',
      },
    ],
  },

  // ─── Game 2: Fool's Mate ─────────────────────────────────────────────────
  {
    id: 'fools-mate',
    title: 'The Fastest Checkmate',
    description: 'See the quickest possible checkmate — just 2 moves!',
    difficulty: 1,
    estimatedMinutes: 1,
    playerColor: 'b',
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    storyIntro:
      'This time you play as Black! White is about to make two terrible moves ' +
      'that weaken the king. Can you spot the checkmate in just 2 moves? ' +
      'This is the fastest possible checkmate in chess — Fool\'s Mate!',
    storyOutro:
      'Checkmate in only 2 moves! White weakened the diagonal to the king ' +
      'by pushing the f and g pawns. The queen swooped in for the kill. ' +
      'Lesson learned: never weaken the squares around your king!',
    moves: [
      {
        moveNumber: 1, san: 'f3', color: 'w', autoPlay: true,
        fen: 'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
        narration: 'White plays f3 — a bad move! It weakens the diagonal toward the king.',
        highlightSquares: ['f3'],
        teachingConcept: 'king safety',
      },
      {
        moveNumber: 1, san: 'e5', color: 'b', autoPlay: false,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
        narration: 'Push your pawn to e5! This opens the diagonal for your queen.',
        highlightSquares: ['e7', 'e5'],
        isMilestone: true,
        wrongMoveResponse: 'Move the pawn from e7 to e5 — open the queen\'s path!',
      },
      {
        moveNumber: 2, san: 'g4', color: 'w', autoPlay: true,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
        narration: 'White plays g4 — another terrible move! Now the diagonal to the king is wide open.',
        highlightSquares: ['g4', 'h4', 'e1'],
        teachingConcept: 'weakened king',
      },
      {
        moveNumber: 2, san: 'Qh4#', color: 'b', autoPlay: false,
        fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
        narration: 'Queen to h4 — CHECKMATE! The king is trapped with no escape. That\'s Fool\'s Mate!',
        highlightSquares: ['h4', 'e1'],
        teachingConcept: 'checkmate',
        isMilestone: true,
        wrongMoveResponse: 'Move your queen to h4 — it\'s checkmate!',
      },
    ],
  },

  // ─── Game 3: Légal's Mate ────────────────────────────────────────────────
  {
    id: 'legals-mate',
    title: 'The Knight\'s Trap',
    description: 'Sacrifice the queen and deliver a surprise checkmate!',
    difficulty: 2,
    estimatedMinutes: 3,
    playerColor: 'w',
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    storyIntro:
      'This is Légal\'s Mate — one of the most beautiful traps in chess! ' +
      'You will sacrifice your queen on purpose, then use your knights and bishop ' +
      'to deliver a stunning checkmate. Can Black resist taking the queen? ' +
      'Let\'s find out!',
    storyOutro:
      'What a game! You sacrificed your queen and Black thought they were winning. ' +
      'But the bishop check on f7 forced the king out, and the knight on d5 delivered checkmate! ' +
      'Sometimes giving up your biggest piece leads to the greatest victory.',
    moves: [
      {
        moveNumber: 1, san: 'e4', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        narration: 'Start with e4 — control the center!',
        highlightSquares: ['e2', 'e4'],
        wrongMoveResponse: 'Push the e-pawn to e4!',
      },
      {
        moveNumber: 1, san: 'e5', color: 'b', autoPlay: true,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        narration: 'Black matches your center pawn.',
      },
      {
        moveNumber: 2, san: 'Nf3', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        narration: 'Bring out the knight to f3! It attacks Black\'s e5 pawn.',
        highlightSquares: ['g1', 'f3'],
        teachingConcept: 'development',
        wrongMoveResponse: 'Develop the knight from g1 to f3!',
      },
      {
        moveNumber: 2, san: 'Nc6', color: 'b', autoPlay: true,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        narration: 'Black defends e5 with the knight.',
      },
      {
        moveNumber: 3, san: 'Bc4', color: 'w', autoPlay: false,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        narration: 'Bishop to c4 — the Italian Game! Aiming at f7 again.',
        highlightSquares: ['f1', 'c4'],
        isMilestone: true,
        wrongMoveResponse: 'Slide the bishop to c4!',
      },
      {
        moveNumber: 3, san: 'd6', color: 'b', autoPlay: true,
        fen: 'r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
        narration: 'Black plays d6 to support e5. A solid move.',
      },
      {
        moveNumber: 4, san: 'Nc3', color: 'w', autoPlay: false,
        fen: 'r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 1 4',
        narration: 'Develop the other knight to c3! Build your army.',
        highlightSquares: ['b1', 'c3'],
        teachingConcept: 'development',
        wrongMoveResponse: 'Bring the knight from b1 to c3!',
      },
      {
        moveNumber: 4, san: 'Bg4', color: 'b', autoPlay: true,
        fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5',
        narration: 'Black pins your knight to the queen with the bishop on g4! Or so they think...',
        highlightSquares: ['g4', 'f3', 'd1'],
        teachingConcept: 'pin',
      },
      {
        moveNumber: 5, san: 'Nxe5', color: 'w', autoPlay: false,
        fen: 'r2qkbnr/ppp2ppp/2np4/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R b KQkq - 0 5',
        narration: 'Take the pawn on e5 with your knight! Black thinks your knight was pinned, but you\'re setting a trap.',
        highlightSquares: ['f3', 'e5'],
        teachingConcept: 'sacrifice',
        isMilestone: true,
        wrongMoveResponse: 'Capture on e5 with the knight — spring the trap!',
      },
      {
        moveNumber: 5, san: 'Bxd1', color: 'b', autoPlay: true,
        fen: 'r2qkbnr/ppp2ppp/2np4/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6',
        narration: 'Black takes the queen! They think they\'re winning. But watch what happens next...',
        highlightSquares: ['g4', 'd1'],
      },
      {
        moveNumber: 6, san: 'Bxf7+', color: 'w', autoPlay: false,
        fen: 'r2qkbnr/ppp2Bpp/2np4/4N3/4P3/2N5/PPPP1PPP/R1BbK2R b KQkq - 0 6',
        narration: 'Bishop captures on f7 with CHECK! The king must move!',
        highlightSquares: ['c4', 'f7'],
        teachingConcept: 'discovered attack',
        wrongMoveResponse: 'Capture on f7 with the bishop — check!',
      },
      {
        moveNumber: 6, san: 'Ke7', color: 'b', autoPlay: true,
        fen: 'r2q1bnr/ppp1kBpp/2np4/4N3/4P3/2N5/PPPP1PPP/R1BbK2R w KQ - 1 7',
        narration: 'The king steps to e7 — the only escape. Now finish it!',
        highlightSquares: ['e7'],
      },
      {
        moveNumber: 7, san: 'Nd5#', color: 'w', autoPlay: false,
        fen: 'r2q1bnr/ppp1kBpp/2np4/3NN3/4P3/8/PPPP1PPP/R1BbK2R b KQ - 2 7',
        narration: 'Knight to d5 — CHECKMATE! The king is surrounded. You sacrificed your queen and won!',
        highlightSquares: ['c3', 'd5'],
        teachingConcept: 'checkmate',
        isMilestone: true,
        wrongMoveResponse: 'Jump the knight to d5 — it\'s checkmate!',
      },
    ],
  },

  // ─── Game 4: Queen Power Attack ──────────────────────────────────────────
  {
    id: 'queen-power',
    title: 'Queen on the Attack',
    description: 'Punish a bad move and win with the queen!',
    difficulty: 1,
    estimatedMinutes: 2,
    playerColor: 'w',
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    storyIntro:
      'Black is going to make a mistake by weakening their king too early. ' +
      'You will use your knight and queen to punish them! ' +
      'Watch how powerful the queen is when she gets into the attack.',
    storyOutro:
      'Amazing! Black weakened their position with f6, and you jumped right in. ' +
      'The queen checked on h5, then captured two pawns while giving check. ' +
      'When your opponent weakens their king, strike fast with the queen!',
    moves: [
      {
        moveNumber: 1, san: 'e4', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        narration: 'Start with e4 to control the center!',
        highlightSquares: ['e2', 'e4'],
        wrongMoveResponse: 'Push the e-pawn to e4!',
      },
      {
        moveNumber: 1, san: 'e5', color: 'b', autoPlay: true,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        narration: 'Black plays e5. A normal start.',
      },
      {
        moveNumber: 2, san: 'Nf3', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        narration: 'Develop the knight and attack e5!',
        highlightSquares: ['g1', 'f3'],
        isMilestone: true,
        wrongMoveResponse: 'Bring the knight to f3!',
      },
      {
        moveNumber: 2, san: 'f6', color: 'b', autoPlay: true,
        fen: 'rnbqkbnr/pppp2pp/5p2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
        narration: 'Black plays f6 — a big mistake! This weakens the king and doesn\'t defend well.',
        highlightSquares: ['f6'],
        teachingConcept: 'weakened king',
      },
      {
        moveNumber: 3, san: 'Nxe5', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppp2pp/5p2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3',
        narration: 'Take the pawn! Black\'s f6 doesn\'t protect e5 properly.',
        highlightSquares: ['f3', 'e5'],
        teachingConcept: 'capturing',
        wrongMoveResponse: 'Capture the e5 pawn with your knight!',
      },
      {
        moveNumber: 3, san: 'fxe5', color: 'b', autoPlay: true,
        fen: 'rnbqkbnr/pppp2pp/8/4p3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
        narration: 'Black recaptures, but now the king\'s diagonal is wide open!',
        highlightSquares: ['e8', 'h5'],
      },
      {
        moveNumber: 4, san: 'Qh5+', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppp2pp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KB1R b KQkq - 1 4',
        narration: 'Queen to h5 — CHECK! The king is in trouble!',
        highlightSquares: ['d1', 'h5'],
        teachingConcept: 'check',
        isMilestone: true,
        wrongMoveResponse: 'Bring the queen to h5 with check!',
      },
      {
        moveNumber: 4, san: 'g6', color: 'b', autoPlay: true,
        fen: 'rnbqkbnr/pppp3p/6p1/4p2Q/4P3/8/PPPP1PPP/RNB1KB1R w KQkq - 0 5',
        narration: 'Black blocks with g6, but the queen has another target...',
      },
      {
        moveNumber: 5, san: 'Qxe5+', color: 'w', autoPlay: false,
        fen: 'rnbqkbnr/pppp3p/6p1/4Q3/4P3/8/PPPP1PPP/RNB1KB1R b KQkq - 0 5',
        narration: 'Capture e5 with check! The queen keeps attacking!',
        highlightSquares: ['h5', 'e5'],
        wrongMoveResponse: 'Take the e5 pawn with your queen — it\'s check!',
      },
      {
        moveNumber: 5, san: 'Qe7', color: 'b', autoPlay: true,
        fen: 'rnb1kbnr/ppppq2p/6p1/4Q3/4P3/8/PPPP1PPP/RNB1KB1R w KQkq - 1 6',
        narration: 'Black blocks with the queen. But your queen can grab more!',
      },
      {
        moveNumber: 6, san: 'Qxh8', color: 'w', autoPlay: false,
        fen: 'rnb1kbnQ/ppppq2p/6p1/8/4P3/8/PPPP1PPP/RNB1KB1R b KQq - 0 6',
        narration: 'Capture the rook on h8! You won a whole rook. The queen is unstoppable!',
        highlightSquares: ['e5', 'h8'],
        teachingConcept: 'winning material',
        isMilestone: true,
        wrongMoveResponse: 'Capture the rook on h8!',
      },
    ],
  },

  // ─── Game 5: Blackburne Shilling Gambit ──────────────────────────────────
  {
    id: 'blackburne-shilling',
    title: 'The Knight\'s Revenge',
    description: 'Play as Black and deliver a surprise smothered mate!',
    difficulty: 3,
    estimatedMinutes: 3,
    playerColor: 'b',
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    storyIntro:
      'You are Black in this game, and you have a tricky trap prepared! ' +
      'White will think they are winning by capturing your pawns, ' +
      'but you will use your queen and knight together to deliver ' +
      'a beautiful smothered checkmate. This is the Blackburne Shilling Gambit!',
    storyOutro:
      'What an incredible finish! White thought they were clever capturing pawns, ' +
      'but your queen invaded and the knight delivered the final blow. ' +
      'The king was trapped behind its own pieces — smothered mate! ' +
      'Sometimes the best attack is the one your opponent doesn\'t see coming.',
    moves: [
      {
        moveNumber: 1, san: 'e4', color: 'w', autoPlay: true,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        narration: 'White opens with e4.',
      },
      {
        moveNumber: 1, san: 'e5', color: 'b', autoPlay: false,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        narration: 'Match with e5 — fight for the center!',
        highlightSquares: ['e7', 'e5'],
        wrongMoveResponse: 'Play e5 to fight for the center!',
      },
      {
        moveNumber: 2, san: 'Nf3', color: 'w', autoPlay: true,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        narration: 'White develops the knight, attacking your e5 pawn.',
      },
      {
        moveNumber: 2, san: 'Nc6', color: 'b', autoPlay: false,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        narration: 'Defend e5 with the knight! Normal development.',
        highlightSquares: ['b8', 'c6'],
        isMilestone: true,
        wrongMoveResponse: 'Bring the knight to c6 to defend e5!',
      },
      {
        moveNumber: 3, san: 'Bc4', color: 'w', autoPlay: true,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        narration: 'White plays Bc4, the Italian Game. Now spring the trap!',
      },
      {
        moveNumber: 3, san: 'Nd4', color: 'b', autoPlay: false,
        fen: 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        narration: 'Jump the knight to d4! It threatens the knight on f3 and sets the trap.',
        highlightSquares: ['c6', 'd4'],
        teachingConcept: 'tactical trap',
        wrongMoveResponse: 'Jump the knight to d4 — set the trap!',
      },
      {
        moveNumber: 4, san: 'Nxe5', color: 'w', autoPlay: true,
        fen: 'r1bqkbnr/pppp1ppp/8/4N3/2BnP3/8/PPPP1PPP/RNBQK2R b KQkq - 0 4',
        narration: 'White grabs the e5 pawn, thinking they are winning material. But they fell into the trap!',
        highlightSquares: ['e5'],
      },
      {
        moveNumber: 4, san: 'Qg5', color: 'b', autoPlay: false,
        fen: 'r1b1kbnr/pppp1ppp/8/4N1q1/2BnP3/8/PPPP1PPP/RNBQK2R w KQkq - 1 5',
        narration: 'Queen to g5! Attack the knight on e5 and threaten Qxg2!',
        highlightSquares: ['d8', 'g5', 'e5', 'g2'],
        teachingConcept: 'double threat',
        isMilestone: true,
        wrongMoveResponse: 'Move the queen to g5 — attack the knight and threaten g2!',
      },
      {
        moveNumber: 5, san: 'Nxf7', color: 'w', autoPlay: true,
        fen: 'r1b1kbnr/pppp1Npp/8/6q1/2BnP3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
        narration: 'White takes the f7 pawn with the knight, trying to fork king and rook. But you have something better!',
      },
      {
        moveNumber: 5, san: 'Qxg2', color: 'b', autoPlay: false,
        fen: 'r1b1kbnr/pppp1Npp/8/8/2BnP3/8/PPPP1PqP/RNBQK2R w KQkq - 0 6',
        narration: 'Capture g2 with the queen! Now you are threatening the rook on h1.',
        highlightSquares: ['g5', 'g2', 'h1'],
        wrongMoveResponse: 'Take the g2 pawn with your queen!',
      },
      {
        moveNumber: 6, san: 'Rf1', color: 'w', autoPlay: true,
        fen: 'r1b1kbnr/pppp1Npp/8/8/2BnP3/8/PPPP1PqP/RNBQKR2 b Qkq - 1 6',
        narration: 'White saves the rook. But your queen can go deeper!',
      },
      {
        moveNumber: 6, san: 'Qxe4+', color: 'b', autoPlay: false,
        fen: 'r1b1kbnr/pppp1Npp/8/8/2Bnq3/8/PPPP1P1P/RNBQKR2 w Qkq - 0 7',
        narration: 'Take the e4 pawn with check! The queen is devastating.',
        highlightSquares: ['g2', 'e4'],
        teachingConcept: 'check',
        isMilestone: true,
        wrongMoveResponse: 'Capture e4 with your queen — it gives check!',
      },
      {
        moveNumber: 7, san: 'Be2', color: 'w', autoPlay: true,
        fen: 'r1b1kbnr/pppp1Npp/8/8/3nq3/8/PPPPBP1P/RNBQKR2 b Qkq - 1 7',
        narration: 'White blocks with the bishop. Now the knight delivers the final blow!',
      },
      {
        moveNumber: 7, san: 'Nf3#', color: 'b', autoPlay: false,
        fen: 'r1b1kbnr/pppp1Npp/8/8/4q3/5n2/PPPPBP1P/RNBQKR2 w Qkq - 2 8',
        narration: 'Knight to f3 — CHECKMATE! The king is smothered behind its own pieces. Incredible!',
        highlightSquares: ['d4', 'f3', 'e1'],
        teachingConcept: 'smothered mate',
        isMilestone: true,
        wrongMoveResponse: 'Jump the knight to f3 — it\'s checkmate!',
      },
    ],
  },
];
