import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Benko Gambit. Lead-the-eye §5a. DB-anchored.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const BENKO_GAMBIT_LESSON: LessonScript = {
  openingId: 'benko-gambit',
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
  title: 'The Benko Gambit — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 c5 d5 b5', say: "The Benko Gambit — the most positionally sound pawn sacrifice in chess. After 1.d4 Nf6 2.c4 c5 3.d5, Black strikes with 3…b5!, offering the b-pawn. In return Black gets something permanent: the half-open a- and b-files, lasting pressure on White's queenside, and an opening that practically plays itself. You don't get the pawn back quickly — you get a grip that lasts the whole game.", sayShort: '…b5 — the gambit; buy lasting queenside pressure.', highlights: [H('b5')] }),
    b({ id: 'axb5', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6', say: "cxb5 a6 — Black offers the second pawn too. The point is to prise open the a- and b-files for the rooks. White can take (the Fully Accepted) or decline; either way Black gets the files and the long-term initiative that defines the Benko.", sayShort: '…a6 — prise open the a- and b-files.', highlights: [H('a6'), H('b5', SOFT)] }),
    b({ id: 'bxa6', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6', say: "bxa6 Bxa6 — Black recaptures with the bishop, developing it to the superb a6-f1 diagonal where it eyes White's king and rook. The a- and b-files are open for Black's rooks, and that structure — open files plus the fianchetto to come — IS the Benko's compensation, worth far more than a pawn.", sayShort: '…Bxa6 — bishop to the great diagonal.', highlights: [H('a6')] }),
    b({ id: 'g6', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6', say: "Nc3 d6 and e4 force the bishop trade Bxf1 Kxf1 — Black happily gives the bishop for White's, leaving White's king stuck on f1 unable to castle short comfortably. Then …g6 begins the fianchetto: the dark-squared bishop is heading to g7, the heart of the Benko setup.", sayShort: '…g6 — start the fianchetto; king stuck.', highlights: [H('f1'), H('g6', SOFT)] }),
    b({ id: 'bg7', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O Nf3 Nbd7', say: "…Bg7 fianchettoes onto the long diagonal, raking toward d4 and b2, and Black castles and develops …Nbd7. The Benko machine is assembled: the g7-bishop, the knights heading for the queenside, and the rooks about to swing to a8 and b8 behind the open files. Every piece has an automatic, purposeful post.", sayShort: '…Bg7, …Nbd7 — assemble the Benko machine.', highlights: [H('d4')] }),
    b({ id: 'qa5', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O Nf3 Nbd7 Re1 Qa5', say: "…Qa5 swings the queen to the queenside, pressuring c3 and the a-file. This is the signature Benko regrouping: queen on a5, rooks coming to a8 and b8, the bishop on g7 — all aimed at White's queenside pawns on a2 and b2. White is permanently tied down to defence.", sayShort: '…Qa5 — pile onto the queenside.', highlights: [H('a5'), H('a2', SOFT)] }),
    b({ id: 'close', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O Nf3 Nbd7 Re1 Qa5 Bf4', say: "Bf4 hits the d6-pawn, but Black is exactly where he wants to be: the rooks will double on the a- and b-files, the queen and bishop bear down on the queenside, and White spends the whole game defending a2 and b2 while Black presses. There is the Benko in one breath — sacrifice a pawn for the open files and a grip that never lets go. The other tabs show how Black handles White's tries: the Declined, the Zaitsev where White clings to the pawn, and the Half-Accepted.", sayShort: '…the Benko grip: open files, lasting pressure.', highlights: [H('a2'), H('b2', SOFT)] }),
  ],
};
