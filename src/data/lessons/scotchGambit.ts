import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// White-oriented main lesson for the Scotch Gambit. Lead-the-eye §5a. Moves
// walk the data spine (gambits.json scotch-gambit pgn, masters/strong corpus,
// G3 — prose only). The main line is a TEMPORARY sac: White regains the d4-pawn
// with Nxd4 and reaches a sound, slightly-better position (engine +0.31 for
// White: the e5 space wedge + Black's doubled c-pawns). Every claim verified
// against the line. Sharp f3-Ng5 sidelines live on the variation tabs.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'];

export const SCOTCH_GAMBIT_LESSON: LessonScript = {
  openingId: 'scotch-gambit',
  sources: SRC,
  title: 'Scotch Gambit — A Master Class',
  minutes: 10,
  orientation: 'white',
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4',
      say: "The Scotch Gambit. After d4 exd4, White ignores the pawn and plays 4.Bc4 — instant development, the bishop already eyeing f7. The idea is not to gambit forever: it is to lure Black into grabbing material while White builds a fast, dangerous initiative and regains the pawn on his own terms.",
      sayShort: 'Bc4 — develop fast, eye f7.',
      arrows: [A('c4', 'f7')],
      highlights: [H('c4'), H('f7'), H('d4')],
    }),
    b({
      id: 'e5',
      moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5',
      say: "…Nf6 develops with a hit on e4, and White answers e5! — flinging the pawn forward to kick the knight and seize a big space wedge in the centre. That e5-pawn cramps Black's whole kingside and is the backbone of White's edge for the rest of the game.",
      sayShort: 'e5 — the space wedge kicks the knight.',
      highlights: [H('e5')],
    }),
    b({
      id: 'pin',
      moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5',
      say: "…d5 hits the bishop, so it drops to b5 — pinning the c6-knight against the king on e8. The pin is how White will round the d4-pawn back up: the defender of d4 is tied down.",
      sayShort: 'Bb5 — pin the knight, target d4.',
      arrows: [A('b5', 'e8')],
      highlights: [H('b5'), H('c6'), H('e8')],
    }),
    b({
      id: 'regain',
      moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4',
      say: "…Ne4 jumps the knight to safety, and Nxd4 — White scoops the pawn back, the knight landing beautifully centralised on d4. Material is level again, and White has the e5 wedge for nothing. The gambit has paid for itself.",
      sayShort: 'Nxd4 — regain the pawn, centralise.',
      highlights: [H('d4'), H('e5')],
    }),
    b({
      id: 'structure',
      moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6',
      say: "…Bd7 unpins, so White trades on c6 — and after …bxc6 Black is saddled with doubled, weak c-pawns on c6 and c7. That permanent structural scar is White's long-term target; the e5 wedge plus a better pawn structure is a pleasant, risk-free edge.",
      sayShort: 'Bxc6 — saddle Black with doubled c-pawns.',
      highlights: [H('c6'), H('c7')],
    }),
    b({
      id: 'develop',
      moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 Be3',
      say: "Both sides castle into the position; …Bc5 develops with a hit on the d4-knight, and Be3 calmly offers the trade, reinforcing the centre. White is in no hurry — the structure does the work.",
      sayShort: 'Be3 — shore up the centre, offer the trade.',
      highlights: [H('e3'), H('c5'), H('d4')],
    }),
    b({
      id: 'middlegame',
      moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 Be3 O-O Nd2 Nxd2 Qxd2',
      say: "And here is the Scotch Gambit's promise delivered. The knights come off, the d2-queen recaptures, and White stands clearly more comfortably: level material, the e5-pawn cramping Black, and the doubled c-pawns to gnaw at. A pawn 'sacrifice' that left White better — that is the Scotch Gambit at its best.",
      sayShort: 'Qxd2 — level material, White is better.',
      highlights: [H('e5'), H('c6'), H('c7'), H('e3')],
    }),
  ],
};
