import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Vienna variation tabs — keyed `pro-naroditsky-vienna::<name>`. White,
// DB-anchored, chess.js-verified to 20+ plies.
export const PRO_NARODITSKY_VIENNA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-vienna::Copycat 2...Nc6': {
    openingId: 'pro-naroditsky-vienna',
    sources: SRC,
    title: 'Vienna — Copycat 2…Nc6',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'copy-f4',
        moves: ['e4', 'e5', 'Nc3', 'Nc6', 'f4', 'exf4', 'Nf3', 'g5'],
        highlights: [{ square: 'f4', color: KEY }, { square: 'g5', color: SOFT }],
        say: "When Black copies with 2…Nc6, White still fires the gambit: f4, and after exf4 Nf3 Black tries to hold the extra pawn with g5. That pawn grab is greedy — it loosens the kingside fatally, and White is about to blow the position open with a sacrifice.",
        sayShort: 'f4 gambit; …g5 over-extends.',
      },
      {
        id: 'copy-deep',
        moves: ['e4', 'e5', 'Nc3', 'Nc6', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O', 'gxf3', 'Qxf3', 'Qf6', 'Nd5', 'Qd4+', 'Kh1', 'Qxc4', 'Nxc7+', 'Kd8', 'Nxa8'],
        highlights: [{ square: 'c7', color: KEY }],
        say: "Bc4 and O-O offer the knight; after gxf3 Qxf3 White has a raging attack down the f-file for the piece. Then the killer: Nd5 hits the queen and threatens the fork, and after the queen runs the knight forks king and rook on c7, winning the rook on a8. Black grabbed pawns and pieces; White grabbed the initiative and the exchange — and the king hunt is just beginning.",
        sayShort: 'Nd5 then Nxc7+ — fork and grab the rook.',
      },
    ],
  },
  'pro-naroditsky-vienna::Frankenstein-Dracula 3.Bc4': {
    openingId: 'pro-naroditsky-vienna',
    sources: SRC,
    title: 'Vienna — Frankenstein-Dracula 3.Bc4',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'fd-qh5',
        moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Nxe4', 'Qh5'],
        arrows: [{ from: 'h5', to: 'f7', color: VIS }],
        highlights: [{ square: 'f7', color: KEY }],
        say: "If Black grabs the e4-pawn with Nxe4, White uncorks the Frankenstein-Dracula: Qh5, hitting the e4-knight and threatening mate on f7 at the same time. The queen sortie looks crude but it's venomous — Black must scramble to deal with two threats at once.",
        sayShort: 'Qh5 — hit the knight and threaten f7 mate.',
      },
      {
        id: 'fd-deep',
        moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Nxe4', 'Qh5', 'Nd6', 'Bb3', 'Be7', 'Nf3', 'Nc6', 'Nxe5', 'Nxe5', 'Qxe5', 'O-O', 'O-O', 'Bf6', 'Qf4', 'Bg5'],
        arrows: [{ from: 'b3', to: 'f7', color: VIS }],
        highlights: [{ square: 'e5', color: KEY }, { square: 'f7', color: SOFT }],
        say: "Black defends with Nd6 to block the f7-threat; White retreats the bishop to b3, still raking f7, regains the pawn on e5 with the better game, and keeps the initiative. The wild queen raid settles into a comfortable edge — White's pieces are active and Black has spent the whole opening defending. Sound and dangerous, the Vienna way.",
        sayShort: 'Bb3 keeps f7; regain e5, White better.',
      },
    ],
  },
};
