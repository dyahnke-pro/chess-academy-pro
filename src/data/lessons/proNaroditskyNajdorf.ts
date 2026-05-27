import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Naroditsky's Najdorf Sicilian (Black, B90). chess.js + explorer-verified,
// deeply DB-anchored. Black-oriented.
export const PRO_NARODITSKY_NAJDORF_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  sources: SRC,
  title: 'The Najdorf Sicilian — Naroditsky Master Class',
  minutes: 11,
  orientation: 'black',
  beats: [
    {
      id: 'a6-soul',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
      highlights: [{ square: 'b5', color: KEY }],
      say: "The Najdorf — the Sicilian of Fischer and Kasparov, and the line Naroditsky trusts with the black pieces. Its soul is the tiny move a6. It looks like nothing, but it denies every white piece the b5-square and quietly prepares Black's own b5 expansion. Black commits to nothing yet, keeping maximum flexibility until White reveals his setup.",
      sayShort: '…a6 — deny b5, keep all options open.',
    },
    {
      id: 'e5-center',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Against the calm Be2, Black strikes with e5, hitting the d4-knight and seizing the centre. It concedes the d5-square — yes — but that's the Najdorf bargain: Black accepts one static hole and gets dynamic piece play and the centre in return. The whole opening is a bet that activity beats structure.",
      sayShort: '…e5 — grab the centre, accept the d5 hole.',
    },
    {
      id: 'cover-d5',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6'],
      arrows: [{ from: 'e6', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "Now Black smothers the d5-square with pieces. The light bishop comes to e6 covering d5, the knights reroute toward it, and what looked like a permanent weakness becomes a square White can never safely occupy. This is the Najdorf craft — every piece has a job, and that job is d5.",
      sayShort: '…Be6 — pieces blanket the d5-square.',
    },
    {
      id: 'queenside-deep',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6', 'f4', 'exf4', 'Bxf4', 'Nc6'],
      arrows: [{ from: 'c6', to: 'd4', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White tries to pry the centre with f4; Black trades and develops the knight to c6, hitting d4 and eyeing the dark squares. From here the plans are clear: Black plays on the queenside with b5–b4 and the half-open c-file while White looks kingside. It's a race — and the Najdorf player is the one who has calculated it a hundred times before.",
      sayShort: '…Nc6 — develop, then race on the queenside.',
    },
  ],
};
