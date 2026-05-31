import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// White-oriented main lesson for the Vienna Gambit. Lead-the-eye §5a. Moves
// walk the data spine (vi__main-nf3, masters/strong corpus, G3 — prose only)
// through the critical 3…d5 main line — NOT the short 4…exf4 accepted line, which
// resolves in 9 plies (that stays on a variation tab). The d5 main reaches a
// sharp, roughly EQUAL middlegame at ply 22 (engine 0.00): opposite-side
// castling, White storming the kingside, Black the queenside. Claims verified.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/Vienna_Game'];

export const VIENNA_GAMBIT_LESSON: LessonScript = {
  openingId: 'vienna-gambit',
  sources: SRC,
  title: 'Vienna Gambit — A Master Class',
  minutes: 11,
  orientation: 'white',
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nc3 Nf6 f4',
      say: "The Vienna Gambit. After 2.Nc3 Nf6, White strikes with 3.f4 — the King's-Gambit idea a move later, hurling the f-pawn at e5 to rip open the f-file and the centre. With the knight already on c3, White is ready for the fight.",
      sayShort: 'f4 — strike at e5, open the f-file.',
      highlights: [H('f4'), H('e5')],
    }),
    b({
      id: 'd5',
      moves: 'e4 e5 Nc3 Nf6 f4 d5',
      say: "The critical reply is …d5! — not grabbing on f4, but counter-striking in the centre. Black refuses to be steamrolled and hits e4 right back. This is the main line, and the only fully respected antidote; the timid 3…exf4 is left for another tab.",
      sayShort: '…d5 — counter-strike the centre.',
      highlights: [H('d5'), H('e4')],
    }),
    b({
      id: 'grabs',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4',
      say: "fxe5 …Nxe4 — both sides snatch a pawn in the centre. White owns a strong, cramping pawn on e5; Black has a knight planted on e4. The position is sharp and balanced, exactly the double-edged brawl the Vienna is after.",
      sayShort: 'fxe5 …Nxe4 — mutual central grabs.',
      highlights: [H('e5'), H('e4')],
    }),
    b({
      id: 'recapture',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3',
      say: "Nf3 and Qe2 develop with pressure on the e4-knight, and after …Nxc3 dxc3 White recaptures toward the centre. The c-pawns are doubled, yes — but White has opened the d-file, kept the e5-pawn as a cramping wedge, and gained the half-open f-file pointing at f7.",
      sayShort: 'dxc3 — open the d-file, keep the e5 wedge.',
      highlights: [H('e5'), H('d1'), H('f7')],
    }),
    b({
      id: 'develop',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6',
      say: "Black expands with …c5 and …Nc6; White develops the bishop to f4, eyeing the b8-h2 diagonal and supporting the e5-pawn. Every white piece points toward the kingside and the centre.",
      sayShort: 'Bf4 — support e5, eye the kingside.',
      highlights: [H('f4'), H('e5')],
    }),
    b({
      id: 'castle',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6 O-O-O Be6',
      say: "O-O-O! White castles QUEENSIDE — the signal for a race. The two kings will sit on opposite wings, so both players throw their pawns at the enemy king with no fear of opening their own. The Vienna becomes a pure attacking sprint.",
      sayShort: 'O-O-O — opposite castling, the race is on.',
      highlights: [H('c1'), H('e6')],
    }),
    b({
      id: 'middlegame',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6 O-O-O Be6 h4 h6 g3 Qa5',
      say: "And here is the Vienna's battleground. White rolls the kingside pawns with h4 and g3 to pry open Black's castled position, while Black answers …Qa5 to swarm White's queenside king. The engine calls it dead level — but it is a knife-fight, decided by who lands the first blow. That is exactly the game the Vienna player wants.",
      sayShort: 'h4 — storm the kingside, race the attacks.',
      highlights: [H('h4'), H('e5'), H('c1')],
    }),
  ],
};
