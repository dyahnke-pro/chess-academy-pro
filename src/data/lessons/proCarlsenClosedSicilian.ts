import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Closed Sicilian / Grand Prix, WHITE. 285 games (online +
// OTB), 76%. His anti-Sicilian sidestep: skip the Open theory, play Nc3 and f4,
// and aim a kingside attack with f4-f5. Main line = the Grand Prix with f4 and
// the Bc4 build. Variations cover …d6, …e6 and the …Nc6 set-ups.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Closed', 'https://www.chess.com/openings/Closed-Sicilian', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_CLOSED_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-carlsen-closed-sicilian',
  title: "This repertoire's Closed Sicilian — the Grand Prix f4 Attack",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 c5 Nc3 Nc6 f4', highlights: [H('f4'), H('c5')], say: "Against the Sicilian, this repertoire sometimes skips the Open and plays the Grand Prix — Nc3 and f4. No memorising twenty moves of Najdorf theory: White grabs kingside space and sets up a direct attack with f4-f5 against Black's king. Simple, aggressive, and dangerous at every level.", sayShort: 'f4 — the Grand Prix attack.' }),
    b({ id: 'g6', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 a3', highlights: [H('g6'), H('a3')], say: "Black fianchettoes to challenge the centre, and White plays the useful a3 — preparing to expand and keeping the b4-square in reserve. White's plan is clear and thematic: castle, then roll the f-pawn forward to crack open the kingside.", sayShort: 'Nf3, a3 — build for f4-f5.' }),
    b({ id: 'bc4', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 a3 d6 Bc4 e6 O-O', arrows: [A('c4', 'f7')], highlights: [H('c4')], say: "The bishop goes to c4, eyeing f7 and the a2-g8 diagonal, and White castles. Everything points at the kingside. With the centre stable and the pieces aimed at Black's king, White is ready for the d3, Qe1-h4 and f5 attacking plan that defines the Grand Prix.", sayShort: 'Bc4, O-O — aim at f7.' }),
    b({ id: 'd3', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 a3 d6 Bc4 e6 O-O Nge7 d3', highlights: [H('d3'), H('f4')], say: "d3 props the centre and frees the queen to swing to e1 and h4 for the attack. White's setup is complete and harmonious; the f4-f5 break will pry open lines toward Black's king. This is the kind of clear, attacking middlegame this repertoire converts with ease.", sayShort: 'd3 — finish, then f5 storms.' }),
  ],
};

const VS_D6: LessonScript = {
  openingId: 'pro-carlsen-closed-sicilian', title: 'vs …d6', minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd6', moves: 'e4 c5 Nc3 d6 f4 g6 Nf3 Bg7 Bb5+', arrows: [A('b5', 'e8')], highlights: [H('b5')], say: "Against an early …d6, White inserts the useful Bb5+ before Black is ready, forcing a concession — …Bd7 or …Nc6 — and gaining a tempo for the f4-f5 plan. A small but annoying check that disrupts Black's coordination.", sayShort: 'Bb5+ — disrupt with a tempo.' }),
    b({ id: 'a4', moves: 'e4 c5 Nc3 d6 f4 g6 Nf3 Bg7 Bb5+ Bd7 a4', highlights: [H('a4')], say: "After …Bd7, White plays a4 to clamp the queenside and keep the bishop's options open. White has gained space on both wings and keeps the f4-f5 attacking idea in reserve. A pleasant, flexible position with the easier game.", sayShort: 'a4 — clamp, keep f5 in hand.' }),
  ],
};

const VS_E6: LessonScript = {
  openingId: 'pro-carlsen-closed-sicilian', title: 'vs …e6', minutes: 5, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c5 Nc3 e6 g3 d5', highlights: [H('e6'), H('d5')], say: "Against the …e6 set-up, White switches to a fianchetto — g3 and Bg2 — a King's-Indian-Attack flavour. If Black plays …d5, White keeps the tension and presses on the light squares with the long-diagonal bishop. Flexible and strategically rich.", sayShort: 'g3 — the KIA fianchetto.' }),
    b({ id: 'bg2', moves: 'e4 c5 Nc3 e6 g3 d5 Bg2 Nf6 Nge2 Be7 O-O O-O', arrows: [A('g2', 'b7')], highlights: [H('g2')], say: "White completes the King's-Indian-Attack: Bg2, Nge2, O-O. The fianchettoed bishop eyes the queenside light squares, and White will reroute the knight and play for e4-e5 with a kingside attack. A slow build where White's harmony tells.", sayShort: 'Bg2, O-O — the KIA build.' }),
  ],
};

const BB5_NC6: LessonScript = {
  openingId: 'pro-carlsen-closed-sicilian', title: 'Bb5 vs …Nc6', minutes: 5, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 c5 Nc3 Nc6 Bb5', arrows: [A('b5', 'c6')], highlights: [H('c6')], say: "A Rossolimo flavour inside the Closed Sicilian — Bb5, pressuring the c6-knight. White is ready to take on c6 to damage Black's structure or retreat and keep the bishop pair. A clean, low-theory way to fight for an edge.", sayShort: 'Bb5 — pressure c6.' }),
    b({ id: 'nf3', moves: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 a6 Bd3 Nf6 O-O d6', highlights: [H('d4'), H('d3')], say: "Black jumps to d4 to challenge the bishop; White develops Nf3 and drops the bishop to d3, keeping it on the attacking diagonal. White retains a small, comfortable space edge and the flexible structure he wants against the Sicilian.", sayShort: 'Nf3, Bd3 — keep the edge.' }),
  ],
};

export const PRO_CARLSEN_CLOSED_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-closed-sicilian::vs …d6': VS_D6,
  'pro-carlsen-closed-sicilian::vs …e6': VS_E6,
  'pro-carlsen-closed-sicilian::Bb5 vs …Nc6': BB5_NC6,
};
