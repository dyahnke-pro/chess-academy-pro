import type { JourneyChapter } from '../types';

export const JOURNEY_CHAPTERS: JourneyChapter[] = [
  // ─── Chapter 1: The Brave Pawn ──────────────────────────────────────────────
  {
    id: 'pawn',
    title: 'The Brave Pawn',
    subtitle: 'Learn how pawns move and capture',
    icon: '\u265F',
    storyIntro:
      'Once upon a time, a little pawn stood at the edge of the chessboard. ' +
      'Though small, this pawn dreamed of crossing the entire board and becoming a queen. ' +
      'Your adventure begins with a single step forward!',
    storyOutro:
      'Amazing! You learned how pawns march forward, leap two squares on their first move, ' +
      'and capture diagonally. The brave pawn even made it to the other side and became a queen! ' +
      'Every great journey starts with a single pawn move.',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'pawn-lesson-1',
        title: 'First Steps',
        story:
          'Pawns are the smallest soldiers on the chessboard, but they are very brave. ' +
          'A pawn moves forward one square at a time, straight ahead. It never moves backward!',
        fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        highlightSquares: ['e3', 'e4'],
        instruction:
          'This pawn on e2 can move to e3 or e4. Pawns always move straight ahead!',
      },
      {
        id: 'pawn-lesson-2',
        title: 'The Double Step',
        story:
          'Here is a special secret: when a pawn is still on its starting square, ' +
          'it can leap forward two squares in one big jump! But it can only do this once.',
        fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        highlightSquares: ['e4'],
        instruction:
          'From its starting position on the second rank, a pawn can jump two squares to e4!',
      },
      {
        id: 'pawn-lesson-3',
        title: 'Capture!',
        story:
          'Pawns are sneaky — they don\'t capture the same way they move. ' +
          'Instead of going straight, pawns capture diagonally, one square forward to the left or right.',
        fen: '4k3/8/8/3p1p2/4P3/8/8/4K3 w - - 0 1',
        highlightSquares: ['d5', 'f5'],
        instruction:
          'The white pawn on e4 can capture the black pawn on d5 or f5 by moving diagonally!',
      },
    ],
    puzzles: [
      {
        id: 'pawn-puzzle-1',
        fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        solution: ['e4'],
        hint: 'Pawns can move two squares from their starting position!',
        successMessage: 'Great job! The pawn charged forward two squares!',
      },
      {
        id: 'pawn-puzzle-2',
        fen: '4k3/8/8/4p3/3P4/8/8/4K3 w - - 0 1',
        solution: ['dxe5'],
        hint: 'Pawns capture diagonally!',
        successMessage: 'You captured the enemy pawn! Pawns are sneaky attackers.',
      },
      {
        id: 'pawn-puzzle-3',
        fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
        solution: ['a8=Q+'],
        hint: 'When a pawn reaches the other side, it becomes a queen!',
        successMessage:
          'The pawn made it all the way across and became a mighty queen! This is called promotion.',
      },
    ],
  },

  // ─── Chapter 2: The Castle Tower ────────────────────────────────────────────
  {
    id: 'rook',
    title: 'The Castle Tower',
    subtitle: 'Master straight-line movement',
    icon: '\u265C',
    storyIntro:
      'High above the kingdom stands a mighty castle tower. The rook is like that tower — ' +
      'it moves in powerful straight lines across the whole board. ' +
      'Nothing can escape its long reach along files and ranks!',
    storyOutro:
      'The castle tower has shared its secrets with you! You now know that rooks are strongest ' +
      'on open files and the back rank. A rook on an open file controls the entire battlefield. ' +
      'Use this power wisely!',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'rook-lesson-1',
        title: 'Straight Lines',
        story:
          'The rook is a powerful piece that moves in straight lines. ' +
          'It can slide along any file (up and down) or rank (left and right) as far as it wants!',
        fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1',
        highlightSquares: [
          'd1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8',
          'a4', 'b4', 'c4', 'e4', 'f4', 'g4', 'h4',
        ],
        instruction:
          'The rook on d4 can move to any highlighted square — along the entire file or rank!',
      },
      {
        id: 'rook-lesson-2',
        title: 'Controlling Files',
        story:
          'A rook is happiest on an open file — a column with no pawns blocking the way. ' +
          'From there, it can zoom all the way from one end of the board to the other!',
        fen: '4k3/4p3/8/8/8/8/4P3/R3K3 w - - 0 1',
        highlightSquares: ['a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'],
        instruction:
          'The a-file is completely open! The rook on a1 controls every square on that file.',
      },
      {
        id: 'rook-lesson-3',
        title: 'Back Rank Power',
        story:
          'One of the rook\'s most devastating tricks is the back rank checkmate. ' +
          'If the enemy king is trapped behind its own pawns, a rook can deliver checkmate on the last rank!',
        fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1',
        highlightSquares: ['a8'],
        instruction:
          'The black king is trapped behind its pawns. If the rook reaches a8, it is checkmate!',
      },
    ],
    puzzles: [
      {
        id: 'rook-puzzle-1',
        fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1',
        solution: ['Ra8#'],
        hint: 'The king is trapped behind its own pawns. Can you deliver checkmate on the back rank?',
        successMessage:
          'Checkmate! The rook slid all the way across to trap the king. That is the back rank mate!',
      },
      {
        id: 'rook-puzzle-2',
        fen: '4k3/8/8/4n3/8/8/8/4R1K1 w - - 0 1',
        solution: ['Rxe5+'],
        hint: 'Look for an undefended piece the rook can capture!',
        successMessage:
          'You captured the knight! Always look for undefended pieces your rook can grab.',
      },
      {
        id: 'rook-puzzle-3',
        fen: '3k4/2n5/8/8/8/8/6K1/2R5 w - - 0 1',
        solution: ['Rxc7'],
        hint: 'The rook can slide straight up the file to capture a piece!',
        successMessage:
          'You captured the knight! The rook zoomed up the c-file in a straight line. Great rook play!',
      },
    ],
  },

  // ─── Chapter 3: The Diagonal Runner ─────────────────────────────────────────
  {
    id: 'bishop',
    title: 'The Diagonal Runner',
    subtitle: 'Slide along the diagonals',
    icon: '\u265D',
    storyIntro:
      'Meet the bishop — a swift runner who zooms along the diagonals of the chessboard. ' +
      'Bishops are clever pieces that can strike from far away. ' +
      'But they have one quirk: they always stay on the same color square!',
    storyOutro:
      'You have mastered the diagonal runner! Remember, a bishop can only ever reach half ' +
      'the squares on the board. That is why having both bishops — one on light squares and ' +
      'one on dark squares — is called "the bishop pair" and is very powerful.',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'bishop-lesson-1',
        title: 'Diagonal Movement',
        story:
          'The bishop glides along diagonals as far as it wants. ' +
          'It can move to the upper-left, upper-right, lower-left, or lower-right — but always diagonally!',
        fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1',
        highlightSquares: [
          'a1', 'b2', 'c3', 'e5', 'f6', 'g7', 'h8',
          'a7', 'b6', 'c5', 'e3', 'f2', 'g1',
        ],
        instruction:
          'The bishop on d4 controls all the highlighted diagonal squares. It can reach far corners of the board!',
      },
      {
        id: 'bishop-lesson-2',
        title: 'Light and Dark',
        story:
          'Here is the bishop\'s secret: it never changes color! A bishop that starts on a light square ' +
          'will ALWAYS stay on light squares. A bishop on a dark square stays on dark squares forever.',
        fen: '4k3/8/8/8/8/5B2/2B5/4K3 w - - 0 1',
        highlightSquares: ['c2', 'f3'],
        instruction:
          'The bishop on c2 is on a light square and can only reach other light squares. ' +
          'The bishop on f3 is on a dark square and can only reach dark squares!',
      },
    ],
    puzzles: [
      {
        id: 'bishop-puzzle-1',
        fen: '4k3/8/8/8/5n2/8/8/2B1K3 w - - 0 1',
        solution: ['Bxf4'],
        hint: 'Look diagonally! Can the bishop capture something?',
        successMessage:
          'You snatched the knight! The bishop zoomed along the diagonal to capture it.',
      },
      {
        id: 'bishop-puzzle-2',
        fen: '4k3/8/8/8/2r5/8/8/4KB2 w - - 0 1',
        solution: ['Bxc4'],
        hint: 'The bishop can slide along the diagonal to capture the rook!',
        successMessage:
          'Excellent! You captured the rook with your bishop. Diagonals are powerful!',
      },
      {
        id: 'bishop-puzzle-3',
        fen: '4k3/6r1/8/8/8/8/1B6/4K3 w - - 0 1',
        solution: ['Bxg7'],
        hint: 'The bishop can reach all the way across the board diagonally!',
        successMessage:
          'You grabbed the rook! The bishop reached all the way across the board diagonally.',
      },
    ],
  },

  // ─── Chapter 4: The Tricky Horse ────────────────────────────────────────────
  {
    id: 'knight',
    title: 'The Tricky Horse',
    subtitle: 'Jump in L-shapes',
    icon: '\u265E',
    storyIntro:
      'The knight is the trickiest piece on the board — it moves in an L-shape and can jump ' +
      'over other pieces! No wall can stop a knight. ' +
      'It is also the master of the fork, attacking two pieces at once!',
    storyOutro:
      'You have tamed the tricky horse! The knight\'s L-shaped jump and ability to fork ' +
      'multiple pieces make it one of the most dangerous pieces on the board. ' +
      'Keep practicing those forks — they win games!',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'knight-lesson-1',
        title: 'The L-Shape',
        story:
          'The knight moves in an L-shape: two squares in one direction, then one square to the side. ' +
          'It is the only piece that does not move in a straight line!',
        fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1',
        highlightSquares: ['c2', 'e2', 'b3', 'f3', 'b5', 'f5', 'c6', 'e6'],
        instruction:
          'From d4, the knight can jump to 8 different squares! Each one is an L-shape away.',
      },
      {
        id: 'knight-lesson-2',
        title: 'Jumping Over',
        story:
          'The knight has a superpower — it can jump over any piece in its way! ' +
          'Even when surrounded by friendly or enemy pieces, the knight leaps right over them.',
        fen: '4k3/8/8/2PPP3/2PNP3/2PPP3/8/4K3 w - - 0 1',
        highlightSquares: ['c2', 'e2', 'b3', 'f3', 'b5', 'f5', 'c6', 'e6'],
        instruction:
          'Even though the knight is completely surrounded by pawns, it can jump to any of the highlighted squares!',
      },
      {
        id: 'knight-lesson-3',
        title: 'The Fork!',
        story:
          'A fork is when one piece attacks two or more enemy pieces at the same time. ' +
          'Knights are the best at forking because their tricky L-shape can reach unexpected squares!',
        fen: '4k3/8/8/8/8/5N2/8/4K3 w - - 0 1',
        highlightSquares: ['d4', 'e5'],
        instruction:
          'If the knight jumps to d4 or e5, it could attack multiple pieces at once. This is a fork!',
      },
    ],
    puzzles: [
      {
        id: 'knight-puzzle-1',
        fen: '2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
        solution: ['Nd6+'],
        hint: 'Can the knight jump to a square where it attacks both the king and the rook?',
        successMessage:
          'Fork! The knight attacks the king AND the rook at the same time! The rook is lost.',
      },
      {
        id: 'knight-puzzle-2',
        fen: '8/4k3/1q6/8/8/2N5/8/4K3 w - - 0 1',
        solution: ['Nd5+'],
        hint: 'Find the L-shaped jump that attacks the king AND the queen at the same time!',
        successMessage:
          'Knight fork! The knight attacks the king and queen at the same time. The queen is lost!',
      },
      {
        id: 'knight-puzzle-3',
        fen: '4k3/8/8/8/2b5/8/3N4/4K3 w - - 0 1',
        solution: ['Nxc4'],
        hint: 'The knight can capture a piece with its L-shaped jump!',
        successMessage:
          'You captured the bishop! Knights can surprise pieces from unexpected angles.',
      },
    ],
  },

  // ─── Chapter 5: The Mighty Queen ────────────────────────────────────────────
  {
    id: 'queen',
    title: 'The Mighty Queen',
    subtitle: 'The most powerful piece',
    icon: '\u265B',
    storyIntro:
      'The queen is the most powerful piece on the entire chessboard! ' +
      'She can move like a rook (straight lines) AND like a bishop (diagonals). ' +
      'With so much power, the queen can control the whole battlefield!',
    storyOutro:
      'You have unlocked the power of the mighty queen! She combines the strength of the rook ' +
      'and the bishop into one incredible piece. But remember — the queen is so valuable that ' +
      'you must be careful not to lose her!',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'queen-lesson-1',
        title: 'Rook + Bishop',
        story:
          'The queen moves like a rook and a bishop combined. ' +
          'She can go straight along files and ranks, AND diagonally — as far as she wants!',
        fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1',
        highlightSquares: [
          'd1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8',
          'a4', 'b4', 'c4', 'e4', 'f4', 'g4', 'h4',
          'a1', 'b2', 'c3', 'e5', 'f6', 'g7', 'h8',
          'a7', 'b6', 'c5', 'e3', 'f2', 'g1',
        ],
        instruction:
          'Look at all those squares the queen controls! She combines the power of the rook and bishop.',
      },
      {
        id: 'queen-lesson-2',
        title: 'Queen Power',
        story:
          'From the center of the board, the queen can reach more squares than any other piece. ' +
          'That is why getting your queen to an active, central position is so strong!',
        fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1',
        highlightSquares: ['d4'],
        instruction:
          'A queen in the center of the board controls 27 squares! That is more than any other piece.',
      },
    ],
    puzzles: [
      {
        id: 'queen-puzzle-1',
        fen: '4k3/8/8/5n2/8/8/8/1Q2K3 w - - 0 1',
        solution: ['Qxf5'],
        hint: 'The queen can capture pieces along diagonals or straight lines!',
        successMessage:
          'You captured the knight! The queen used her diagonal power to grab it.',
      },
      {
        id: 'queen-puzzle-2',
        fen: '4k3/8/2r3b1/8/8/8/6Q1/4K3 w - - 0 1',
        solution: ['Qxc6+'],
        hint: 'Can the queen capture a piece along the diagonal?',
        successMessage:
          'You captured the rook with check! The queen attacked along the diagonal. Amazing!',
      },
      {
        id: 'queen-puzzle-3',
        fen: '7k/5K2/5Q2/8/8/8/8/8 w - - 0 1',
        solution: ['Qg7#'],
        hint: 'The queen can deliver checkmate with support from the king!',
        successMessage:
          'Checkmate! The queen and king worked together to trap the enemy king in the corner!',
      },
    ],
  },

  // ─── Chapter 6: The Royal Ruler ─────────────────────────────────────────────
  {
    id: 'king',
    title: 'The Royal Ruler',
    subtitle: 'Protect your king, attack theirs',
    icon: '\u265A',
    storyIntro:
      'The king is the most important piece in chess — if your king is trapped, the game is over! ' +
      'The king moves slowly, just one square at a time, but it has a special trick called castling. ' +
      'Learn to keep your king safe while finding ways to attack the enemy king!',
    storyOutro:
      'You now understand the royal ruler! The king may be slow, but keeping it safe is the ' +
      'whole point of chess. And when you learn to put the enemy king in check and checkmate, ' +
      'you become truly dangerous!',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'king-lesson-1',
        title: 'One Step at a Time',
        story:
          'The king can move one square in any direction — forward, backward, left, right, or diagonally. ' +
          'It is slow, but it can go anywhere!',
        fen: '8/8/8/8/4K3/8/8/7k w - - 0 1',
        highlightSquares: ['d3', 'e3', 'f3', 'd4', 'f4', 'd5', 'e5', 'f5'],
        instruction:
          'The king on e4 can move to any of the 8 surrounding squares — one step at a time!',
      },
      {
        id: 'king-lesson-2',
        title: 'What is Check?',
        story:
          'When a piece attacks the enemy king, we say the king is "in check." ' +
          'A king in check MUST escape immediately — by moving, blocking, or capturing the attacker!',
        fen: '4k3/8/8/8/8/8/5b2/4K3 w - - 0 1',
        highlightSquares: ['e1', 'f2'],
        instruction:
          'The bishop on f2 is attacking the white king — that is check! The king must escape.',
      },
      {
        id: 'king-lesson-3',
        title: 'Castling',
        story:
          'Castling is a special move where the king and rook move together! ' +
          'The king slides two squares toward the rook, and the rook jumps to the other side. ' +
          'This helps tuck your king away safely.',
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        highlightSquares: ['g1', 'c1'],
        instruction:
          'The king can castle kingside (to g1) or queenside (to c1). Both move the king to safety!',
      },
    ],
    puzzles: [
      {
        id: 'king-puzzle-1',
        fen: '4k3/8/8/8/8/8/5r2/4K3 w - - 0 1',
        solution: ['Kxf2'],
        hint: 'The king is being attacked! Can it capture the attacker?',
        successMessage:
          'The king captured the rook and escaped check! Sometimes the best defense is a good attack.',
      },
      {
        id: 'king-puzzle-2',
        fen: '5k2/8/8/8/8/8/6K1/R7 w - - 0 1',
        solution: ['Ra8+', 'Ke7'],
        hint: 'Use the rook to give check on the back rank!',
        successMessage:
          'Check! You drove the king forward. Forcing the king out of safety is a great strategy!',
      },
      {
        id: 'king-puzzle-3',
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        solution: ['O-O'],
        hint: 'There is a special move that puts your king behind a wall of pawns!',
        successMessage:
          'You castled kingside! Your king is now safe behind the pawns with the rook ready to fight.',
      },
    ],
  },

  // ─── Chapter 7: Battle Plans ────────────────────────────────────────────────
  {
    id: 'tactics',
    title: 'Battle Plans',
    subtitle: 'Simple tricks to win pieces',
    icon: '\u2694\uFE0F',
    storyIntro:
      'Now that you know how all the pieces move, it is time to learn battle tactics! ' +
      'Tactics are clever tricks that help you win your opponent\'s pieces. ' +
      'The three most important tactics are the pin, the fork, and the discovered attack!',
    storyOutro:
      'You are now a tactical warrior! Pins, forks, and discovered attacks are the secret ' +
      'weapons of every chess champion. Keep your eyes open for these patterns in every game — ' +
      'they appear more often than you think!',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'tactics-lesson-1',
        title: 'The Pin',
        story:
          'A pin is when a piece cannot move because moving it would expose a more valuable piece behind it. ' +
          'The pinned piece is stuck like a butterfly pinned to a board!',
        fen: '4k3/3r4/8/8/B7/8/8/4K3 w - - 0 1',
        highlightSquares: ['a4', 'd7', 'e8'],
        instruction:
          'The bishop on a4 pins the rook on d7 to the king on e8 along the diagonal. The rook cannot move without exposing the king!',
      },
      {
        id: 'tactics-lesson-2',
        title: 'The Fork',
        story:
          'A fork is when one piece attacks two or more enemy pieces at the same time. ' +
          'The opponent can only save one piece, so you win the other!',
        fen: '4k3/8/8/8/8/3N4/8/4K3 w - - 0 1',
        highlightSquares: ['d3', 'c5'],
        instruction:
          'If the knight jumps to c5, it could attack a king on e6 and a rook on a4 at the same time — a fork!',
      },
      {
        id: 'tactics-lesson-3',
        title: 'Discovered Attack',
        story:
          'A discovered attack is sneaky: you move one piece out of the way, and the piece behind it ' +
          'launches a surprise attack! It is like opening a door to reveal a cannon.',
        fen: '3qk3/8/8/3N4/8/8/8/3RK3 w - - 0 1',
        highlightSquares: ['d5', 'd1', 'd8'],
        instruction:
          'If the knight on d5 moves away, the rook on d1 will attack the queen on d8. That is a discovered attack!',
      },
    ],
    puzzles: [
      {
        id: 'tactics-puzzle-1',
        fen: '4k3/8/2n5/8/8/1B6/8/3K4 w - - 0 1',
        solution: ['Ba4', 'Kd7'],
        hint: 'Move the bishop to a square where it lines up with the knight AND the king behind it!',
        successMessage:
          'You pinned the knight! It cannot move because the king is behind it on the same diagonal.',
      },
      {
        id: 'tactics-puzzle-2',
        fen: 'r3k3/8/8/8/3N4/8/8/4K3 w - - 0 1',
        solution: ['Nc6'],
        hint: 'Find the square where the knight attacks both the king and the rook!',
        successMessage:
          'Knight fork! The knight attacks the king and the rook. You will win the rook!',
      },
      {
        id: 'tactics-puzzle-3',
        fen: '3qk3/8/8/3B4/8/8/8/3RK3 w - - 0 1',
        solution: ['Bc6+', 'Ke7'],
        hint: 'Move the bishop to give check — what happens to the piece behind it?',
        successMessage:
          'Discovered attack! The bishop gave check, and now the rook attacks the queen. Brilliant!',
      },
    ],
  },

  // ─── Chapter 8: Your First Game ─────────────────────────────────────────────
  {
    id: 'first-game',
    title: 'Your First Game',
    subtitle: 'Play through a real chess game!',
    icon: '\uD83C\uDFC6',
    storyIntro:
      'It is time to put everything together and play through a real chess game! ' +
      'This is the famous Scholar\'s Mate — a quick checkmate in just four moves. ' +
      'Follow along and learn how to attack the weak f7 square!',
    storyOutro:
      'Congratulations, champion! You played through your first complete chess game and learned ' +
      'about the Scholar\'s Mate. Now you know how important it is to protect the f7 square ' +
      'and develop your pieces with a plan. You are ready to play real games!',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'first-game-lesson-1',
        title: 'Opening Moves',
        story:
          'Every chess game starts with the opening. White plays e4 to control the center, ' +
          'and Black replies with e5. Good openings develop pieces toward the center!',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        highlightSquares: ['e4', 'e5'],
        instruction:
          'Both sides played their pawns to the center. This is the start of many chess games!',
      },
      {
        id: 'first-game-lesson-2',
        title: 'Developing the Attack',
        story:
          'White brings out the bishop to c4, pointing at the f7 pawn. ' +
          'The f7 square is weak because only the king defends it!',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
        highlightSquares: ['c4', 'f7'],
        instruction:
          'The bishop on c4 aims straight at f7! This is the weakest square in Black\'s position.',
      },
      {
        id: 'first-game-lesson-3',
        title: 'The Checkmate!',
        story:
          'White brings the queen to f3, then to f7 for checkmate! ' +
          'The queen is protected by the bishop, and the king has no escape. Game over!',
        fen: 'rnb1kbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        highlightSquares: ['f3', 'f7'],
        instruction:
          'The queen on f3 threatens Qxf7#. If Black does not defend f7, it is checkmate next move!',
      },
    ],
    puzzles: [
      {
        id: 'first-game-puzzle-1',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        solution: ['Bc4'],
        hint: 'Develop a piece that aims at the weak f7 square!',
        successMessage:
          'The bishop flies to c4, targeting the f7 pawn. The attack is building!',
      },
      {
        id: 'first-game-puzzle-2',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 2',
        solution: ['Qf3'],
        hint: 'Bring the queen out to help attack f7!',
        successMessage:
          'The queen joins the attack on f7. Two pieces are now aiming at the weak spot!',
      },
      {
        id: 'first-game-puzzle-3',
        fen: 'rnb1kbnr/pppp1Qpp/8/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 3',
        solution: ['Kd8', 'Qxf8#'],
        hint: 'The king is in check from the queen on f7! Where can it escape? Then finish the game!',
        successMessage:
          'Checkmate! The queen captured on f8 and the king has nowhere to run. You completed the Scholar\'s Mate!',
      },
    ],
  },
];
