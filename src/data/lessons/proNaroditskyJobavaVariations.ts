import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-development'];

// Jobava variation tab — keyed `pro-naroditsky-jobava-london::<name>`. White,
// DB-anchored (d4 d5 Nc3 Nf6 Bf4 g6, anchors 6), chess.js-verified.
export const PRO_NARODITSKY_JOBAVA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-jobava-london::vs ...g6 Fianchetto': {
    openingId: 'pro-naroditsky-jobava-london',
    sources: SRC,
    title: 'Jobava — vs …g6 Fianchetto (h4!)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'g6-h4',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'h4'],
        highlights: [{ square: 'h4', color: KEY }],
        say: "When Black fianchettoes with …g6, the Jobava bares its teeth: h4! Before castling, before anything quiet, White lunges the h-pawn at the fianchetto. The threat of h4–h5 to crack open the h-file straight at Black's king is the whole reason to meet …g6 this way — aggression Black rarely expects from a London.",
        sayShort: 'h4! — lunge at the fianchetto.',
      },
      {
        id: 'g6-deep',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'h4', 'h5', 'Nf3', 'O-O', 'Ne5', 'c5', 'Be2', 'Nc6', 'Qd2', 'cxd4', 'exd4', 'Bf5', 'f3', 'Rc8'],
        arrows: [{ from: 'e5', to: 'g6', color: VIS }],
        highlights: [{ square: 'e5', color: KEY }, { square: 'h5', color: SOFT }],
        say: "Black halts the pawn with …h5, but that just hands White the g5-square and a permanent kingside lever. The knight plants on e5 eyeing g6, the queen comes to d2 ready to swing across, and White keeps a pleasant space-and-initiative game. The …g6 setup gets no easy life against the Jobava's early h4.",
        sayShort: 'Ne5 eyes g6; h5 leaves holes.',
      },
    ],
  },
  'pro-naroditsky-jobava-london::vs ...c5': {
    openingId: 'pro-naroditsky-jobava-london',
    sources: ['https://lichess.org/study/N3XOjphc', 'concept:pos-center'],
    title: 'Jobava — vs ...c5 (4.e4!)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'c5-e4',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c5', 'e4'],
        highlights: [{ square: 'e4', color: KEY }],
        say: "Black's sharpest anti-Jobava is ...c5, the Steinitz-style hit at the centre. Naroditsky doesn't defend — he attacks: e4! He throws the centre wide open at once. Now Black is forced to start trading, and every exchange tears another line open for White's pieces; hold still instead, and White simply pours out his development while Black stays cramped.",
        sayShort: '...c5? — answer e4, rip the centre open.',
      },
      {
        id: 'c5-e4-deep',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c5', 'e4', 'Nxe4', 'Nxe4', 'dxe4', 'dxc5', 'Qa5+', 'c3', 'Qxc5', 'Qa4+', 'Nc6', 'Qxe4', 'g6', 'Nf3', 'Bg7', 'Rd1'],
        highlights: [{ square: 'e4', color: KEY }],
        say: "The pawns crash off and Black's checks lead nowhere: Qa4+ and Qxe4 win the pawn straight back, with the queen planted proudly on e4. Black fianchettoes — ...g6 and ...Bg7 — but White is simply faster, Nf3 and Rd1 pouring every piece toward the centre while Black is still getting organized. That's the Jobava's promise made good: rapid development and a lasting pull.",
        sayShort: 'Qxe4 — pawn back, queen centralized, White faster.',
      },
    ],
  },
  'pro-naroditsky-jobava-london::vs ...Bf5': {
    openingId: 'pro-naroditsky-jobava-london',
    sources: ['https://lichess.org/study/N3XOjphc', 'concept:pos-space'],
    title: 'Jobava — vs ...Bf5 (Ne5 & the g4 storm)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'bf5-ne5',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Bf5', 'e3', 'e6', 'Nf3', 'Bd6', 'Ne5'],
        highlights: [{ square: 'e5', color: KEY }],
        say: "The Symmetrical Jobava: Black mirrors White, parking the light bishop on f5 outside the e6-d5 pawn chain. Naroditsky heads straight for the e5-square — Ne5 plants a knight on the board's best outpost, supported and hard to challenge, the springboard for everything that follows.",
        sayShort: '...Bf5? — seize the e5 outpost with Ne5.',
      },
      {
        id: 'bf5-g4-storm',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Bf5', 'e3', 'e6', 'Nf3', 'Bd6', 'Ne5', 'Nfd7', 'g4', 'Bg6', 'h4', 'Bxe5', 'dxe5', 'h5', 'gxh5', 'Bxh5', 'Be2'],
        highlights: [{ square: 'e5', color: KEY }, { square: 'h4', color: SOFT }],
        say: "Then the kingside storm rolls: g4! kicks the bishop and h4 piles in. When the trades clear White owns a cramping pawn on e5 and an open g-file for his rook, the h-pawn on h4 still rolling. Black is solid but boxed in; White's space and the half-open lines are the lasting edge the Symmetrical Jobava promises.",
        sayShort: 'g4-h4 storm; the e5 wedge cramps Black.',
      },
    ],
  },
};
