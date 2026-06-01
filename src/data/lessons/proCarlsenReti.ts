import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Réti / King's-Indian-Attack, WHITE. 1,113 games (online +
// OTB), 80%. His flexible 1.Nf3 hypermodern: g3, Bg2, O-O and a slow build,
// keeping every transposition open. Main line = the KIA vs …d5. Variations cover
// the Réti-into-c4 vs …Nf6, the …c5 Symmetric, …g6 and the …e6 Catalan.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening', 'https://www.chess.com/openings/Reti-Opening', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_RETI_LESSON: LessonScript = {
  openingId: 'pro-carlsen-reti',
  title: "Carlsen's Réti — the Flexible Fianchetto",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'Nf3 d5 g3 Nf6 Bg2', arrows: [A('g2', 'b7')], highlights: [H('g2')], say: "The Nf3 move-order is the most flexible move in chess, and the fianchetto is its soul — g3 and Bg2. The bishop owns the long light diagonal toward b7 and a8, pressuring Black's queenside from afar. White commits to nothing and keeps every transposition in hand. This is Carlsen's universal, low-risk weapon.", sayShort: 'Bg2 — the long-diagonal weapon.' }),
    b({ id: 'oo', moves: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3', highlights: [H('d3')], say: "White castles and plays the restrained d3 — the King's-Indian-Attack setup. No early central clash; White will reroute the knight to d2, play e4 in one go, and expand on the kingside. Slow, harmonious, and built to outplay rather than out-prepare.", sayShort: 'd3 — the KIA, e4 to come.' }),
    b({ id: 'e4', moves: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4', arrows: [A('e4', 'd5')], highlights: [H('e4')], say: "Nbd2 and then the central thrust e4 — White finally challenges in the centre on his own terms. The fianchettoed bishop springs to life, and White gains kingside space for the classic KIA attack with e5, Nf1-g3 and a pawn storm. Black is solid, but White holds the initiative.", sayShort: 'e4 — strike, the bishop wakes.' }),
  ],
};

const RETI_C4: LessonScript = {
  openingId: 'pro-carlsen-reti', title: 'Réti into c4 vs …Nf6', minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c4', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4', highlights: [H('c4'), H('e4')], say: "When Black fianchettoes, White grabs the full centre with c4 and e4 — transposing into a big-centre system a tempo up on a King's Indian. White gets exactly the space and structure he wants, with the move order denying Black his sharpest setups.", sayShort: 'c4, e4 — seize the centre.' }),
    b({ id: 'd4', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O Be2 e5', highlights: [H('d4'), H('e5')], say: "White builds the full d4/e4 centre and develops naturally. When Black strikes with …e5, White has a comfortable, classical King's-Indian-with-colours-reversed where his extra space and tempo tell. A pleasant strategic battle on White's terms.", sayShort: 'd4 — the big centre, a tempo up.' }),
  ],
};

const SYMMETRIC_C5: LessonScript = {
  openingId: 'pro-carlsen-reti', title: 'vs …c5 Symmetric', minutes: 5, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7', arrows: [A('g2', 'b7')], highlights: [H('g2')], say: "Against …c5, White fianchettoes into a Symmetric English / Réti. The Bg2 again rakes the long diagonal, and White's flexible setup lets him choose between d4 to open the centre or a slow manoeuvring game. No theory, just understanding.", sayShort: 'Bg2 — symmetric, but a tempo up.' }),
    b({ id: 'd4', moves: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7 c4 e6 Nc3 Nge7 d4', arrows: [A('d4', 'c5')], highlights: [H('d4')], say: "White expands with c4 and Nc3, then opens with d4 at the right moment. The position resembles a Maroczy or symmetrical English where White's extra tempo and central control give a small, lasting pull — Carlsen's bread and butter.", sayShort: 'c4, d4 — open with the edge.' }),
  ],
};

const CATALAN_E6: LessonScript = {
  openingId: 'pro-carlsen-reti', title: 'vs …e6 (Catalan)', minutes: 5, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'Nf3 e6 g3 d5 Bg2 Nf6 O-O Be7 d3', highlights: [H('d3')], say: "Against …e6 and …d5, White can play the restrained d3 KIA or transpose to a Catalan with c4. The Bg2 bishop and the flexible centre give White a slow, pressing game. Black is solid, but White always has the easier plan.", sayShort: 'd3/c4 — KIA or Catalan.' }),
    b({ id: 'nbd2', moves: 'Nf3 e6 g3 d5 Bg2 Nf6 O-O Be7 d3 O-O Nbd2 c5 e4', arrows: [A('e4', 'd5')], highlights: [H('e4')], say: "The signature KIA build — Nbd2 and e4, gaining kingside space and freeing the fianchettoed bishop. White heads for the e5 advance and a kingside attack with Nf1-g3, h4 and the pieces pouring in. A model attacking blueprint Carlsen executes flawlessly.", sayShort: 'e4 — the KIA kingside attack.' }),
  ],
};

export const PRO_CARLSEN_RETI_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-reti::Réti into c4 vs …Nf6': RETI_C4,
  'pro-carlsen-reti::vs …c5 Symmetric': SYMMETRIC_C5,
  'pro-carlsen-reti::vs …e6 (Catalan)': CATALAN_E6,
};
