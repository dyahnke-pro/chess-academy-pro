import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const SOURCES = ['https://lichess.org/study/SSWMLB7R/K9ptMklR', 'concept:pos-development'];

// Stafford variation tabs — keyed `pro-ericrosen-stafford::<Variation Name>`
// (must match the variation names in pro-repertoires.json). All moves are
// chess.js-verified (scripts/verify-stafford-spine.mjs + the variation check);
// arrows are sight-line-legal and every marker square is named in its prose.
export const PRO_ERICROSEN_STAFFORD_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-ericrosen-stafford::Nxc6 Main Line': {
    openingId: 'pro-ericrosen-stafford',
    sources: SOURCES,
    title: 'Stafford — Nxc6 Main Line',
    minutes: 6,
    orientation: 'black',
    beats: [
      {
        id: 'mainline-structure',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5'],
        arrows: [{ from: 'c5', to: 'f2', color: VIS }],
        highlights: [{ square: 'f2', color: KEY }],
        say: "This is the soundest line and the one you'll meet most: White takes on c6 and props the centre with d3. You answer Bc5, and already the bishop is glaring at f2. Material is even — what you own is the bishop pair, the open d-file, and faster development. The plan from here writes itself.",
        sayShort: '…Bc5 — even material, bishop eyes f2.',
      },
      {
        id: 'mainline-bishop-out',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5'],
        arrows: [{ from: 'c8', to: 'g4', color: VIS }],
        highlights: [{ square: 'g4', color: KEY }],
        say: "The light-squared bishop wants g4. From there it pins nothing yet but eyes the soft kingside light squares and ties White's hands — every time White wants to play Nf3 or Be2, that bishop is waiting. Develop with tempo; never let White finish his pieces in peace.",
        sayShort: 'Bishop to g4 — pin the light squares.',
      },
      {
        id: 'mainline-queen',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5'],
        arrows: [{ from: 'd8', to: 'd3', color: VIS }, { from: 'f6', to: 'e4', color: VIS }],
        highlights: [{ square: 'd3', color: KEY }, { square: 'e4', color: SOFT }],
        say: "The two pressure points are d3 and e4. The queen leans down the open file at the d3-pawn; the f6-knight keeps watching e4. If White ever loosens with f3 or a careless bishop move, the e4-pawn falls or the f2-point cracks. Castle, double on the d-file, and let the bishops do the rest.",
        sayShort: 'Queen on d3, knight on e4 — squeeze both.',
      },
      {
        id: 'mainline-deep',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be2', 'h5', 'c3', 'Ng4', 'd4', 'Bb6', 'h3', 'Nf6', 'Bg5', 'Qd7'],
        arrows: [{ from: 'b6', to: 'd4', color: VIS }],
        highlights: [{ square: 'd4', color: KEY }, { square: 'h5', color: SOFT }],
        say: "Carry the main line into the middlegame. White claims the centre with d4, but the dark bishop retreats to the long diagonal and bites at the d4-pawn, while the h5-pawn has already cramped White's kingside and the queen comes to d7 to connect the rooks. White has the bigger pawn centre; Black has the two bishops, the open file, and the easier moves — exactly the trade the Stafford is built on.",
        sayShort: 'Middlegame: bishop bites d4, h5 cramps.',
      },
    ],
  },
  'pro-ericrosen-stafford::Knight Retreat 4.Nf3': {
    openingId: 'pro-ericrosen-stafford',
    sources: SOURCES,
    title: 'Stafford — Knight Retreat 4.Nf3',
    minutes: 4,
    orientation: 'black',
    beats: [
      {
        id: 'retreat-grab',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nf3'],
        arrows: [{ from: 'f6', to: 'e4', color: VIS }],
        highlights: [{ square: 'e4', color: KEY }],
        say: "Sometimes White chickens out of the trade and retreats the knight to f3. That hands you the simplest path of all — the e4-pawn is now hanging, defended by nothing.",
        sayShort: 'Nf3 retreat — e4 hangs.',
      },
      {
        id: 'retreat-equalize',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nf3', 'Nxe4'],
        highlights: [{ square: 'e4', color: KEY }],
        say: "Nxe4 takes it back. Now material is dead level, your knight sits proud on e4, and you've kept the easy, harmonious development the Stafford promises. No fireworks needed — just a clean, equal game where you're the more comfortable side.",
        sayShort: '…Nxe4 — pawn back, comfortable game.',
      },
      {
        id: 'retreat-deep',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nf3', 'Nxe4', 'Qe2', 'Qe7', 'd3', 'Nf6', 'Qxe7+', 'Bxe7', 'Be2', 'O-O', 'O-O', 'd5', 'Nc3', 'd4'],
        arrows: [{ from: 'c6', to: 'd4', color: VIS }],
        highlights: [{ square: 'd4', color: KEY }],
        say: "If White hunts the e4-knight with Qe2, just trade queens and develop. By the middlegame Black is castled, both knights are out, and the d-pawn has marched to d4 to grab space and cramp White. It's dead equal with zero risk — the boring-but-clean face of the Stafford, perfect when the opponent declines the trade.",
        sayShort: 'Equal middlegame, pawn cramps on d4.',
      },
    ],
  },
  'pro-ericrosen-stafford::f7 Sacrifice 4.Nxf7': {
    openingId: 'pro-ericrosen-stafford',
    sources: SOURCES,
    title: 'Stafford — f7 Sacrifice 4.Nxf7',
    minutes: 4,
    orientation: 'black',
    beats: [
      {
        id: 'sac-fork',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxf7'],
        arrows: [{ from: 'f7', to: 'd8', color: VIS }, { from: 'f7', to: 'h8', color: VIS }],
        highlights: [{ square: 'd8', color: SOFT }, { square: 'h8', color: SOFT }],
        say: "The greedy try: Nxf7, snatching a pawn and forking the queen on d8 and the rook on h8. It looks terrifying, and against an unprepared player it wins. But it's a bluff — White is giving up a whole knight for one pawn.",
        sayShort: 'Nxf7 — the forking bluff.',
      },
      {
        id: 'sac-take',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxf7', 'Kxf7'],
        say: "Just take it — the king grabs the knight. Yes, it steps out, but not one White piece is developed to exploit it. You're up a knight for a pawn; bring the bishop out, lift a rook, and tuck the king away. The extra piece decides. Welcome this sacrifice — it's a gift.",
        sayShort: '…Kxf7 — up a piece, king is fine.',
      },
      {
        id: 'sac-deep',
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxf7', 'Kxf7', 'Bc4+', 'Ke8', 'O-O', 'Bc5', 'c3', 'd6', 'd4', 'Bb6', 'Bg5', 'h6', 'Bh4', 'g5'],
        arrows: [{ from: 'b6', to: 'd4', color: VIS }],
        highlights: [{ square: 'd4', color: KEY }, { square: 'g5', color: SOFT }, { square: 'h6', color: SOFT }],
        say: "White throws in a check to muddy things, but Black calmly steps the king back and finishes developing. Deep in the line Black is still a whole piece up: the dark bishop rakes at the d4-pawn, and the g5- and h6-pawns roll forward to chase White's far-flung bishop off the board. The king is safe, the material is decisive — this is why the f7-grab is a gift, not a threat.",
        sayShort: 'Up a piece; g5–h6 roll, bishop hits d4.',
      },
    ],
  },
};
