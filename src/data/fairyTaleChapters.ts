import type { JourneyChapter } from '../types';

export const FAIRY_TALE_CHAPTERS: JourneyChapter[] = [
  // ─── Chapter 1: The Humble Hero ─────────────────────────────────────────────
  {
    id: 'pawn',
    title: 'The Humble Hero',
    subtitle: 'A humble hero answers the call',
    icon: '\u265F',
    storyIntro:
      'Once upon a time, in the enchanted Kingdom of Sixty-Four Squares, ' +
      'there lived a little pawn on the very edge of the board. ' +
      'He was the smallest piece in the kingdom — overlooked by the mighty rooks, ' +
      'ignored by the swift bishops, and laughed at by the tricky knights. ' +
      'But deep inside, this little pawn carried a secret: a spark of destiny. ' +
      'An ancient prophecy whispered that one day, the humblest piece on the board ' +
      'would cross the entire kingdom, face impossible trials, and be transformed ' +
      'into the most powerful piece of all. ' +
      'Today, that journey begins. One step forward into the unknown. ' +
      'Are you brave enough to guide this little pawn to greatness?',
    storyOutro:
      'The little pawn took its first brave steps across the kingdom! ' +
      'You learned how pawns march forward one square at a time, ' +
      'leap two squares on their very first move, and capture enemies diagonally ' +
      'like tiny warriors striking from the side. ' +
      'And you discovered the pawn\'s greatest secret — promotion! ' +
      'When a pawn reaches the far side of the board, it transforms into a queen. ' +
      'This is the spark of destiny that burns inside every pawn. ' +
      'But the journey is far from over. The kingdom is vast, ' +
      'and many trials await. The next challenge lies in the shadow of ' +
      'a great stone fortress. Onward, little pawn!',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'pawn-lesson-1',
        title: 'First Steps',
        story:
          'In the Kingdom of Sixty-Four Squares, pawns are the foot soldiers — ' +
          'the brave hearts who march at the front of every battle. ' +
          'They may be small, but without them, no army can win. ' +
          'A pawn moves forward one square at a time, straight ahead, never looking back. ' +
          'It takes courage to only move forward, but that is the way of the pawn.',
        fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        highlightSquares: ['e3', 'e4'],
        instruction:
          'This pawn on e2 can move to e3 or e4. Pawns always move straight ahead!',
      },
      {
        id: 'pawn-lesson-2',
        title: 'The Double Step',
        story:
          'Here is a secret passed down through generations of pawns: ' +
          'when a pawn stands on its starting square, it may gather all its courage ' +
          'and leap forward two squares in one mighty bound! ' +
          'But this great leap can only be done once — the very first time the pawn moves. ' +
          'After that, it is back to one careful step at a time.',
        fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        highlightSquares: ['e4'],
        instruction:
          'From its starting position on the second rank, a pawn can jump two squares to e4!',
      },
      {
        id: 'pawn-lesson-3',
        title: 'Capture!',
        story:
          'Now here is something tricky about pawns — they are sneaky fighters! ' +
          'A pawn does not capture the same way it moves. Instead of going straight, ' +
          'a pawn strikes diagonally — one square forward to the left or right — ' +
          'like a small warrior lunging sideways with a tiny sword. ' +
          'Enemies standing directly ahead are safe from capture, ' +
          'but enemies on the diagonal? Watch out!',
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
        successMessage: 'The little pawn charges forward with courage! Two squares in one mighty leap!',
      },
      {
        id: 'pawn-puzzle-2',
        fen: '4k3/8/8/4p3/3P4/8/8/4K3 w - - 0 1',
        solution: ['dxe5'],
        hint: 'Pawns capture diagonally!',
        successMessage: 'A swift diagonal strike! The pawn defeats its enemy like a true warrior.',
      },
      {
        id: 'pawn-puzzle-3',
        fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
        solution: ['a8=Q+'],
        hint: 'When a pawn reaches the other side, it becomes a queen!',
        successMessage:
          'The pawn reaches the end of the world and is transformed! ' +
          'A blinding light — and a mighty queen stands where a humble pawn once was. This is promotion!',
      },
    ],
  },

  // ─── Chapter 2: The Stone Guardian ─────────────────────────────────────────
  {
    id: 'rook',
    title: 'The Stone Guardian',
    subtitle: 'A fortress of straight-line power',
    icon: '\u265C',
    storyIntro:
      'The little pawn\'s journey leads to a great stone fortress at the edge of the kingdom. ' +
      'High above, a mighty tower stands watch — the Rook, guardian of the castle. ' +
      'For centuries, the Stone Guardian has protected the kingdom\'s borders, ' +
      'sending its power crashing down long corridors and open battlefields in devastating straight lines. ' +
      'Nothing escapes its reach along the files and ranks of the board. ' +
      '"Little pawn," rumbles the guardian\'s deep voice, ' +
      '"to continue your quest, you must learn the ways of the tower. ' +
      'Straight and true — that is how the rook fights."',
    storyOutro:
      'The Stone Guardian bows its great tower in respect. ' +
      '"You have learned well, little one. You now understand the power of straight lines — ' +
      'how a rook controls entire files and ranks, and how the devastating back rank checkmate ' +
      'can end a battle in one thunderous move." ' +
      'The fortress gates swing open, revealing a path deeper into the enchanted kingdom. ' +
      'Strange lights flicker in the distance — the glow of arcane magic. ' +
      'The next trial awaits in the domain of a powerful wizard...',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'rook-lesson-1',
        title: 'Straight Lines',
        story:
          'The Stone Guardian demonstrates its power with a thunderous crash. ' +
          'The rook moves in straight lines — along any file (up and down) ' +
          'or any rank (left and right) — as far as it wants! ' +
          'Like a cannonball rolling down a castle hallway, nothing can stop it ' +
          'until it hits a wall or another piece.',
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
          'The Guardian reveals a secret of fortress warfare: open files. ' +
          'A rook is happiest on an open file — a column with no pawns blocking the way. ' +
          'From there, it can zoom all the way from one end of the board to the other, ' +
          'like a sentinel patrolling an empty corridor from watchtower to dungeon.',
        fen: '4k3/4p3/8/8/8/8/4P3/R3K3 w - - 0 1',
        highlightSquares: ['a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'],
        instruction:
          'The a-file is completely open! The rook on a1 controls every square on that file.',
      },
      {
        id: 'rook-lesson-3',
        title: 'Back Rank Power',
        story:
          '"Now witness the most devastating weapon in the fortress arsenal," ' +
          'says the Guardian. "The back rank checkmate." ' +
          'When the enemy king is trapped behind its own pawns with no escape, ' +
          'a rook can crash down the file and deliver checkmate on the last rank. ' +
          'The king\'s own soldiers become its prison walls!',
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
          'CHECKMATE! The Stone Guardian\'s power crashes down the file! ' +
          'The enemy king is trapped behind its own soldiers. The back rank mate!',
      },
      {
        id: 'rook-puzzle-2',
        fen: '4k3/8/8/4n3/8/8/8/4R1K1 w - - 0 1',
        solution: ['Rxe5+'],
        hint: 'Look for an undefended piece the rook can capture!',
        successMessage:
          'You captured the knight! The rook strikes in a straight line — nothing escapes the Guardian.',
      },
      {
        id: 'rook-puzzle-3',
        fen: '3k4/2n5/8/8/8/8/6K1/2R5 w - - 0 1',
        solution: ['Rxc7'],
        hint: 'The rook can slide straight up the file to capture a piece!',
        successMessage:
          'The rook zooms up the c-file and claims its prize! Straight and true — the way of the Guardian.',
      },
    ],
  },

  // ─── Chapter 3: The Lightning Wizard ───────────────────────────────────────
  {
    id: 'bishop',
    title: 'The Lightning Wizard',
    subtitle: 'Master of diagonal magic',
    icon: '\u265D',
    storyIntro:
      'Beyond the stone fortress, the path winds into an ancient forest ' +
      'crackling with arcane energy. Lightning flickers between the trees, ' +
      'and the air hums with magic. This is the domain of the Bishop — ' +
      'the Lightning Wizard of the chessboard. ' +
      'Cloaked in mystery, the wizard commands the power of the diagonals. ' +
      'With a sweep of its staff, bolts of lightning shoot across the board ' +
      'from corner to corner — striking enemies from impossibly far away. ' +
      '"Come closer, little pawn," whispers the wizard, eyes glowing. ' +
      '"I will teach you the ancient art of diagonal magic. ' +
      'But beware — even a wizard has limits. ' +
      'I am bound to one color for all eternity."',
    storyOutro:
      'The Lightning Wizard lowers its staff and nods with approval. ' +
      '"You have grasped the way of diagonal magic, little one. ' +
      'You understand how lightning strikes across the board from corner to corner, ' +
      'and you know my eternal secret — I can only walk on one color of square, forever. ' +
      'That is why two wizards together, one on light and one on dark, ' +
      'form the legendary Bishop Pair — covering every diagonal in the kingdom." ' +
      'The forest parts, revealing a moonlit meadow. ' +
      'Hoofbeats echo in the darkness. Something fast and unpredictable approaches — ' +
      'a creature that moves like no other...',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'bishop-lesson-1',
        title: 'Diagonal Lightning',
        story:
          'The wizard raises its staff and lightning crackles across the board! ' +
          'The bishop moves diagonally — as far as it wants in any diagonal direction. ' +
          'Upper-left, upper-right, lower-left, lower-right — ' +
          'bolts of magical energy streaking from one corner of the board to the other. ' +
          'No piece is safe from the wizard\'s long-range diagonal strikes.',
        fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1',
        highlightSquares: [
          'a1', 'b2', 'c3', 'e5', 'f6', 'g7', 'h8',
          'a7', 'b6', 'c5', 'e3', 'f2', 'g1',
        ],
        instruction:
          'The bishop on d4 controls all the highlighted diagonal squares. Lightning reaches every corner!',
      },
      {
        id: 'bishop-lesson-2',
        title: 'Light and Dark',
        story:
          '"Now I will share with you my deepest secret," the wizard says softly. ' +
          '"I am bound by an ancient spell. A bishop that starts on a light square ' +
          'will ALWAYS stay on light squares — forever. ' +
          'And a bishop on a dark square stays on dark squares for all eternity. ' +
          'My lightning can only strike along my color. ' +
          'That is why a kingdom needs two wizards — one of light, one of shadow — ' +
          'to protect every diagonal in the realm."',
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
        hint: 'Look diagonally! Can the wizard strike with a bolt of lightning?',
        successMessage:
          'ZAP! A bolt of diagonal lightning strikes the knight! The wizard\'s magic is deadly accurate.',
      },
      {
        id: 'bishop-puzzle-2',
        fen: '4k3/8/8/8/2r5/8/8/4KB2 w - - 0 1',
        solution: ['Bxc4'],
        hint: 'The wizard can shoot lightning along the diagonal to capture the rook!',
        successMessage:
          'CRACK! Lightning arcs across the board and the rook falls! The wizard strikes from afar.',
      },
      {
        id: 'bishop-puzzle-3',
        fen: '4k3/6r1/8/8/8/8/1B6/4K3 w - - 0 1',
        solution: ['Bxg7'],
        hint: 'The wizard\'s lightning can reach all the way across the board!',
        successMessage:
          'The wizard unleashes a massive bolt from one corner to the other! ' +
          'The rook never saw it coming. That is the true range of diagonal magic.',
      },
    ],
  },

  // ─── Chapter 4: The Shadow Stallion ────────────────────────────────────────
  {
    id: 'knight',
    title: 'The Shadow Stallion',
    subtitle: 'A creature that defies all rules',
    icon: '\u265E',
    storyIntro:
      'In the moonlit meadow, hoofbeats grow louder. A shape bursts from the shadows — ' +
      'the Knight, a wild stallion that moves like no other creature in the kingdom. ' +
      'While every other piece slides along straight lines or diagonals, ' +
      'the Shadow Stallion leaps through the air in an L-shaped arc, ' +
      'landing on squares that seem impossible to reach. ' +
      'It can even jump over other pieces as if they were not there! ' +
      '"You cannot follow the rules to catch me, little pawn," the stallion laughs. ' +
      '"I AM the exception to every rule. Learn my ways, ' +
      'and you will master the most unpredictable weapon on the board — the fork!"',
    storyOutro:
      'The Shadow Stallion rears up and whinnies with pride. ' +
      '"You have tamed what others call untameable! ' +
      'You understand the L-shaped leap, the power to jump over any obstacle, ' +
      'and the deadly art of the fork — attacking two enemies at once ' +
      'so your opponent can only save one." ' +
      'The stallion kneels and offers its back. "Ride with me, little pawn. ' +
      'Our next destination is the Crystal Palace, ' +
      'where the most powerful piece in all the land holds court."',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'knight-lesson-1',
        title: 'The L-Shape',
        story:
          'The stallion rears up and demonstrates its legendary move. ' +
          'The knight moves in an L-shape: two squares in one direction, ' +
          'then one square to the side. It is the only piece in the entire kingdom ' +
          'that does not travel in a straight line. ' +
          'From a single square, it can land on up to eight different destinations — ' +
          'each one an L-shaped leap away.',
        fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1',
        highlightSquares: ['c2', 'e2', 'b3', 'f3', 'b5', 'f5', 'c6', 'e6'],
        instruction:
          'From d4, the knight can jump to 8 different squares! Each one is an L-shape away.',
      },
      {
        id: 'knight-lesson-2',
        title: 'Jumping Over',
        story:
          '"Here is my greatest power," the stallion whispers. ' +
          '"I can jump over anything — friends, enemies, walls of pawns — nothing stops me!" ' +
          'The knight is the only piece that can leap over other pieces in its path. ' +
          'Even when completely surrounded, the Shadow Stallion soars through the air ' +
          'and lands exactly where it pleases.',
        fen: '4k3/8/8/2PPP3/2PNP3/2PPP3/8/4K3 w - - 0 1',
        highlightSquares: ['c2', 'e2', 'b3', 'f3', 'b5', 'f5', 'c6', 'e6'],
        instruction:
          'Even though the knight is completely surrounded by pawns, it can jump to any of the highlighted squares!',
      },
      {
        id: 'knight-lesson-3',
        title: 'The Fork!',
        story:
          '"Now for my most devastating trick," says the stallion with a gleam in its eye. ' +
          '"The fork!" A fork is when one piece attacks two or more enemies at the same time. ' +
          'The opponent can only save one of their pieces, so you capture the other! ' +
          'Knights are the undisputed masters of the fork — ' +
          'their tricky L-shape lets them attack from angles no one expects.',
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
        hint: 'Can the stallion leap to a square where it attacks both the king and the rook?',
        successMessage:
          'FORK! The Shadow Stallion lands between the king and the rook, attacking both at once! The rook is doomed.',
      },
      {
        id: 'knight-puzzle-2',
        fen: '8/4k3/1q6/8/8/2N5/8/4K3 w - - 0 1',
        solution: ['Nd5+'],
        hint: 'Find the L-shaped jump that attacks the king AND the queen at the same time!',
        successMessage:
          'The stallion strikes from the shadows! A royal fork — king and queen attacked at once. The queen is lost!',
      },
      {
        id: 'knight-puzzle-3',
        fen: '4k3/8/8/8/2b5/8/3N4/4K3 w - - 0 1',
        solution: ['Nxc4'],
        hint: 'The knight can capture a piece with its L-shaped jump!',
        successMessage:
          'The Shadow Stallion pounces! An L-shaped leap and the bishop is captured from an impossible angle.',
      },
    ],
  },

  // ─── Chapter 5: The Sorceress Queen ────────────────────────────────────────
  {
    id: 'queen',
    title: 'The Sorceress Queen',
    subtitle: 'The most powerful piece in all the land',
    icon: '\u265B',
    storyIntro:
      'The Crystal Palace blazes with light. Seated on a throne of diamond and starfire ' +
      'is the Queen — the most powerful piece on the entire chessboard. ' +
      'She is part Stone Guardian and part Lightning Wizard, ' +
      'commanding both the straight-line power of the rook ' +
      'and the diagonal magic of the bishop, combined into one unstoppable force. ' +
      'Wherever she turns her gaze, her power reaches across the entire battlefield. ' +
      '"Little pawn," she says, her voice echoing through the crystal halls, ' +
      '"I see the spark of destiny in you. You carry within you the seed of what I am. ' +
      'One day, if you are brave enough to reach the far side of the board, ' +
      'you will become... me. But first, you must understand my power."',
    storyOutro:
      'The Sorceress Queen descends from her throne and places a gentle hand on the pawn\'s head. ' +
      '"You have seen my full strength — the power of straight lines and diagonals united. ' +
      'From the center of the board, I can reach 27 squares. ' +
      'No piece in the kingdom can match that." ' +
      'She smiles knowingly. "And one day, this power will be yours. ' +
      'But remember — with great power comes great danger. ' +
      'I am so valuable that losing me can mean losing the entire war. ' +
      'Wield this power wisely." ' +
      'The pawn nods, feeling the spark of destiny burn brighter within. ' +
      'But before transformation can come, there is one more piece to meet — ' +
      'the most important piece of all...',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'queen-lesson-1',
        title: 'Rook + Bishop',
        story:
          'The Sorceress Queen demonstrates her staggering power. ' +
          'She combines the strength of the Stone Guardian (rook) ' +
          'and the Lightning Wizard (bishop) into one unstoppable piece. ' +
          'Straight lines along files and ranks? She commands those. ' +
          'Diagonal bolts of lightning? She wields those too. ' +
          'As far as she wants, in any of eight directions!',
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
          'When the Sorceress Queen stands at the center of the board, ' +
          'her power radiates outward in every direction like a blazing star. ' +
          'She can reach more squares than any other piece in the kingdom. ' +
          'That is why bringing your queen to an active, central position ' +
          'is one of the most powerful strategies in chess.',
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
          'The Sorceress Queen strikes with diagonal magic! The knight falls before her power.',
      },
      {
        id: 'queen-puzzle-2',
        fen: '4k3/8/2r3b1/8/8/8/6Q1/4K3 w - - 0 1',
        solution: ['Qxc6+'],
        hint: 'Can the queen capture a piece along the diagonal?',
        successMessage:
          'The queen unleashes a bolt of diagonal magic with check! The rook is captured and the king trembles.',
      },
      {
        id: 'queen-puzzle-3',
        fen: '7k/5K2/5Q2/8/8/8/8/8 w - - 0 1',
        solution: ['Qg7#'],
        hint: 'The queen can deliver checkmate with support from the king!',
        successMessage:
          'CHECKMATE! The Sorceress Queen and the king work as one, trapping the enemy in the corner. Unstoppable!',
      },
    ],
  },

  // ─── Chapter 6: The Wise King ──────────────────────────────────────────────
  {
    id: 'king',
    title: 'The Wise King',
    subtitle: 'The heart of the kingdom',
    icon: '\u265A',
    storyIntro:
      'At the very heart of the Kingdom of Sixty-Four Squares sits the King ' +
      'upon his golden throne. He is old and wise, and he moves slowly — ' +
      'just one square at a time. But do not be fooled by his pace. ' +
      'The king is the most important piece on the entire board. ' +
      'If the king falls, the kingdom falls. Everything — every battle, ' +
      'every sacrifice, every clever trick — exists to protect the king or capture the enemy\'s. ' +
      '"Little pawn," the king speaks gravely, "you have met the warriors and wizards of my court. ' +
      'Now you must learn the most crucial lesson of all: how to keep me safe, ' +
      'and how to trap the enemy king. ' +
      'For in the end, chess is not about capturing pieces — it is about the king."',
    storyOutro:
      'The Wise King rises from his throne and places his crown upon the little pawn\'s head — ' +
      'just for a moment. "You understand now, little hero. ' +
      'The king moves one careful step at a time, but he is the heart of everything. ' +
      'You learned about check — when the king is under attack and must escape. ' +
      'And you learned the ancient art of castling, ' +
      'where the king and rook move together to build an unbreakable fortress." ' +
      'The king takes back his crown and smiles. ' +
      '"You are almost ready for your final trial. ' +
      'But first, you must learn the battle tactics of war — ' +
      'the pins, forks, and discovered attacks that decide the fate of kingdoms."',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'king-lesson-1',
        title: 'One Step at a Time',
        story:
          'The king can move one square in any direction — forward, backward, left, right, ' +
          'or diagonally. Eight possible steps from the center of the board. ' +
          'He is the slowest piece in the kingdom, but he is also the most precious. ' +
          'Every other piece exists to serve and protect him.',
        fen: '8/8/8/8/4K3/8/8/7k w - - 0 1',
        highlightSquares: ['d3', 'e3', 'f3', 'd4', 'f4', 'd5', 'e5', 'f5'],
        instruction:
          'The king on e4 can move to any of the 8 surrounding squares — one step at a time!',
      },
      {
        id: 'king-lesson-2',
        title: 'What is Check?',
        story:
          'When an enemy piece attacks the king, we call it "check" — ' +
          'a direct threat to the crown! A king in check MUST escape immediately. ' +
          'There are three ways to escape: move the king to a safe square, ' +
          'block the attack with another piece, or capture the attacker. ' +
          'If none of these are possible? That is checkmate — game over!',
        fen: '4k3/8/8/8/8/8/5b2/4K3 w - - 0 1',
        highlightSquares: ['e1', 'f2'],
        instruction:
          'The bishop on f2 is attacking the white king — that is check! The king must escape.',
      },
      {
        id: 'king-lesson-3',
        title: 'Castling',
        story:
          'The king has one special trick — a magical move called castling! ' +
          'The king slides two squares toward a rook, and the rook jumps to the other side. ' +
          'In one move, the king hides behind a wall of pawns ' +
          'while the rook leaps into battle position. ' +
          'It is the only move in chess where two pieces move at the same time, ' +
          'and it can only be done once per game!',
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
          'The Wise King captures the rook himself! Sometimes the best defense is a bold counterattack.',
      },
      {
        id: 'king-puzzle-2',
        fen: '5k2/8/8/8/8/8/6K1/R7 w - - 0 1',
        solution: ['Ra8+', 'Ke7'],
        hint: 'Use the rook to give check on the back rank!',
        successMessage:
          'Check! The enemy king is driven from its hiding place. Now the hunt begins!',
      },
      {
        id: 'king-puzzle-3',
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        solution: ['O-O'],
        hint: 'There is a special move that puts your king behind a wall of pawns!',
        successMessage:
          'You castled! The king retreats behind its fortress walls while the rook rushes to the front lines. Brilliant strategy!',
      },
    ],
  },

  // ─── Chapter 7: Battle Plans ───────────────────────────────────────────────
  {
    id: 'tactics',
    title: 'Battle Plans',
    subtitle: 'The secret weapons of war',
    icon: '\u2694\uFE0F',
    storyIntro:
      'The little pawn has met every piece in the kingdom — ' +
      'the Stone Guardian, the Lightning Wizard, the Shadow Stallion, ' +
      'the Sorceress Queen, and the Wise King. ' +
      'But knowing how each piece moves is not enough to win a war. ' +
      '"Now," says the king, "you must learn the battle tactics — ' +
      'the clever tricks that turn the tide of battle. ' +
      'The pin, the fork, and the discovered attack. ' +
      'These are the secret weapons that separate common foot soldiers from true champions. ' +
      'Master these, and you will be ready for your final trial."',
    storyOutro:
      'The little pawn looks out across the battlefield with new eyes. ' +
      'Where once it saw only squares and pieces, now it sees patterns — ' +
      'deadly pins that freeze enemies in place, devastating forks ' +
      'that attack two targets at once, and cunning discovered attacks ' +
      'that unleash hidden power like opening a trapdoor. ' +
      '"You are ready," the king declares. "Ready for your final trial — ' +
      'your very first real battle. If you succeed, the prophecy will be fulfilled. ' +
      'The little pawn who dared to dream will be transformed forever."',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'tactics-lesson-1',
        title: 'The Pin',
        story:
          'A pin is one of the most elegant weapons in chess. ' +
          'Imagine an enemy piece standing between your attacker and something even more valuable — ' +
          'like a king or queen. The middle piece is pinned — it cannot move, ' +
          'because moving it would expose the treasure behind it! ' +
          'The pinned piece is frozen in place, helpless and stuck.',
        fen: '4k3/3r4/8/8/B7/8/8/4K3 w - - 0 1',
        highlightSquares: ['a4', 'd7', 'e8'],
        instruction:
          'The bishop on a4 pins the rook on d7 to the king on e8 along the diagonal. The rook cannot move without exposing the king!',
      },
      {
        id: 'tactics-lesson-2',
        title: 'The Fork',
        story:
          'The fork is the Shadow Stallion\'s favorite trick, but any piece can do it! ' +
          'A fork is when one piece attacks two or more enemies at the same time. ' +
          'Your opponent is forced to make an impossible choice — ' +
          'save one piece, but lose the other. It is like a warrior standing ' +
          'at a crossroads, swinging a sword in both directions at once.',
        fen: '4k3/8/8/8/8/3N4/8/4K3 w - - 0 1',
        highlightSquares: ['d3', 'c5'],
        instruction:
          'If the knight jumps to c5, it could attack a king on e6 and a rook on a4 at the same time — a fork!',
      },
      {
        id: 'tactics-lesson-3',
        title: 'Discovered Attack',
        story:
          'The discovered attack is the sneakiest tactic of all. ' +
          'You move one piece out of the way, and the piece behind it ' +
          'launches a surprise attack — like opening a door to reveal a loaded cannon! ' +
          'The enemy never sees it coming because they were watching ' +
          'the piece that moved, not the one hiding behind it.',
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
          'You pinned the knight to the king! It is frozen in place — the Lightning Wizard\'s diagonal trap!',
      },
      {
        id: 'tactics-puzzle-2',
        fen: 'r3k3/8/8/8/3N4/8/8/4K3 w - - 0 1',
        solution: ['Nc6'],
        hint: 'Find the square where the knight attacks both the king and the rook!',
        successMessage:
          'The Shadow Stallion strikes again! A devastating fork — the king and rook attacked at once. The rook will fall!',
      },
      {
        id: 'tactics-puzzle-3',
        fen: '3qk3/8/8/3B4/8/8/8/3RK3 w - - 0 1',
        solution: ['Bc6+', 'Ke7'],
        hint: 'Move the bishop to give check — what happens to the piece behind it?',
        successMessage:
          'Discovered attack! The wizard\'s lightning gives check, and the Stone Guardian\'s power is unleashed against the queen! Brilliant!',
      },
    ],
  },

  // ─── Chapter 8: The Final Battle ───────────────────────────────────────────
  {
    id: 'first-game',
    title: 'The Final Battle',
    subtitle: 'The pawn\'s destiny is fulfilled',
    icon: '\uD83C\uDFC6',
    storyIntro:
      'The moment of destiny has arrived. Everything the little pawn has learned — ' +
      'the bravery of the foot soldier, the power of the Stone Guardian, ' +
      'the lightning magic of the wizard, the impossible leaps of the Shadow Stallion, ' +
      'the overwhelming strength of the Sorceress Queen, and the wisdom of the king — ' +
      'it all leads to this. ' +
      'The final battle. A real chess game from first move to last. ' +
      'This is the legendary Scholar\'s Mate — a swift, decisive attack ' +
      'that strikes at the enemy kingdom\'s weakest point. ' +
      'Guide your pieces wisely, little pawn. ' +
      'Victory is within reach — and with it, your transformation.',
    storyOutro:
      'CHECKMATE! The enemy kingdom falls! ' +
      'As the final piece crashes home, something extraordinary happens. ' +
      'The little pawn — the one who started this journey on the very edge of the board, ' +
      'small and overlooked and laughed at by the bigger pieces — begins to glow. ' +
      'A column of golden light erupts around it. ' +
      'The foot soldier rises, growing taller, stronger, brighter, until... ' +
      'a QUEEN stands where a pawn once was. ' +
      'The prophecy is fulfilled! The humblest piece in the kingdom, ' +
      'through courage, learning, and sheer determination, ' +
      'has been transformed into the most powerful piece on the board. ' +
      'Congratulations, champion. You have completed the Fairy Tale Quest. ' +
      'But remember — every queen was once a pawn who never gave up. ' +
      'Now go play real games, and carry that spark of destiny with you always.',
    requiredPuzzleScore: 2,
    lessons: [
      {
        id: 'first-game-lesson-1',
        title: 'Opening Moves',
        story:
          'Every great battle begins with the opening — the first moves that set the stage for war. ' +
          'White advances the king\'s pawn two squares to control the center of the board. ' +
          'Black responds with the same move. Both armies plant their flags in the middle of the battlefield. ' +
          'The fight for the center has begun!',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        highlightSquares: ['e4', 'e5'],
        instruction:
          'Both sides played their pawns to the center. This is the start of many chess games!',
      },
      {
        id: 'first-game-lesson-2',
        title: 'Developing the Attack',
        story:
          'Now the Lightning Wizard enters the battle! The bishop flies to c4, ' +
          'aiming its diagonal magic straight at the f7 pawn. ' +
          'Why f7? Because it is the weakest square in the enemy kingdom — ' +
          'defended only by the king himself. ' +
          'This is the target. This is where the battle will be decided.',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
        highlightSquares: ['c4', 'f7'],
        instruction:
          'The bishop on c4 aims straight at f7! This is the weakest square in Black\'s position.',
      },
      {
        id: 'first-game-lesson-3',
        title: 'The Checkmate!',
        story:
          'The Sorceress Queen joins the battle — and the end is near. ' +
          'She takes her position on f3, aiming at the same weak f7 square. ' +
          'Two powerful pieces targeting one defenseless point. ' +
          'If the queen reaches f7, protected by the bishop, it is checkmate. ' +
          'The enemy king has no escape. The kingdom falls!',
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
        hint: 'Send the Lightning Wizard to aim at the weak f7 square!',
        successMessage:
          'The wizard takes aim! The bishop flies to c4, targeting the enemy\'s weakest point.',
      },
      {
        id: 'first-game-puzzle-2',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 2',
        solution: ['Qf3'],
        hint: 'Summon the Sorceress Queen to join the attack on f7!',
        successMessage:
          'The Sorceress Queen enters the battlefield! Two pieces now aim at the enemy\'s weak spot.',
      },
      {
        id: 'first-game-puzzle-3',
        fen: 'rnb1kbnr/pppp1Qpp/8/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 3',
        solution: ['Kd8', 'Qxf8#'],
        hint: 'The king is in check from the queen on f7! Where can it escape? Then finish the battle!',
        successMessage:
          'CHECKMATE! The Sorceress Queen delivers the final blow! ' +
          'The enemy kingdom falls, and the little pawn\'s quest is complete. ' +
          'You are a champion!',
      },
    ],
  },
];
