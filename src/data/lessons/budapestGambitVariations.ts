import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Budapest Gambit. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// These are GAMBIT sub-lines that resolve before the middlegame proper, so they
// are `kind: 'roadmap'` (the sanctioned depth-gate opt-out for lessons that
// intentionally stop short) — the curated pgn ends once the pawn is recouped.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];

export const BUDAPEST_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'budapest-gambit::Budapest Gambit: Adler Variation': {
    openingId: 'budapest-gambit', title: 'Budapest — The Adler (3.Nf3)', minutes: 8, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'a1', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5', say: "The Adler — White declines Bf4 and defends the e5-pawn with Nf3 instead. Black develops the bishop actively to …Bc5, aiming straight at f2 near the white king and keeping the pressure on e5. A natural, aggressive set-up.", sayShort: '…Bc5 — active bishop, eye f2.', highlights: [H('c5')] }),
      b({ id: 'a2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5 Nxe5 Nxe5', say: "…Nc6 adds a second attacker on e5, and …Ngxe5 Nxe5 …Nxe5 recoups the gambit pawn, the knight landing actively in the centre. Material is level and Black's pieces are humming.", sayShort: '…Nxe5 — recoup the pawn, centralise.', highlights: [H('e5')] }),
      b({ id: 'a3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5 Nxe5 Nxe5 O-O O-O b3', say: "Both sides castle and White fianchettoes with b3. There is the Adler tabiya: the pawn recouped, the bishop active on c5, the knight strong on e5, and a comfortable, weakness-free game for Black out of the gambit.", sayShort: '…O-O — recouped, active, comfortable.', highlights: [H('e5'), H('c5', SOFT)] }),
    ],
  },

  'budapest-gambit::Budapest Gambit: Fajarowicz Variation': {
    openingId: 'budapest-gambit', title: 'Budapest — The Fajarowicz (3…Ne4)', minutes: 8, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'f1', moves: 'd4 Nf6 c4 e5 dxe5 Ne4', say: "The Fajarowicz — the wildest, trappiest Budapest. Instead of the routine …Ng4, Black leaps …Ne4!?, planting the knight in White's half of the board where it eyes c3, d2 and a host of dark-square tricks. A surprise weapon for the brave.", sayShort: '…Ne4 — the wild central leap.', highlights: [H('e4')] }),
      b({ id: 'f2', moves: 'd4 Nf6 c4 e5 dxe5 Ne4 a3 Nc6 Nf3 d6', say: "a3 prevents …Bb4, but …Nc6 and …d6 keep the e4-knight supported and prepare to win back the e5-pawn. Black plays for piece activity and the initiative, daring White to find the precise refutation that does not exist over the board.", sayShort: '…d6 — support the knight, regain e5.', highlights: [H('d6')] }),
      b({ id: 'f3', moves: 'd4 Nf6 c4 e5 dxe5 Ne4 a3 Nc6 Nf3 d6 exd6 Bxd6 g3', say: "exd6 …Bxd6 recoups the pawn, the bishop developing actively toward the white kingside, and after g3 Black has an easy, dynamic game. There is the Fajarowicz tabiya: a trappy, surprise-laden line where Black's pieces spring out fast and the practical chances are very real.", sayShort: '…Bxd6 — recoup, active and trappy.', highlights: [H('d6')] }),
    ],
  },
};
