import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — French Defense (WHITE) (448 games, 76.3%).
// Main spine = the Winawer Advance with a3/bxc3/h4, walked to a middlegame.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:french-defence',
  'concept:pos-development',
  'https://www.chess.com/openings/French-Defense',
  'https://en.wikipedia.org/wiki/French_Defence',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_FRENCH_WHITE_LESSON: LessonScript = {
  openingId: 'pro-aman-french-white',
  title: "Aman's French — the Winawer Bind",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 e6 d4 d5 Nc3', arrows: [A('b1', 'c3')], highlights: [H('c3'), H('d5')],
      say: "Against the French, White builds the big centre with d4 and develops Nc3 — defending e4 and challenging Black's …d5 head-on. The principled, ambitious approach: meet the French with maximum central presence.",
      sayShort: 'Nc3 — defend e4, challenge d5.' }),
    b({ id: 'bb4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5', highlights: [H('e5')],
      say: "Black pins with the Winawer …Bb4; White pushes e5, grabbing space and locking the centre. The pawn chain d4-e5 cramps Black and shuts in the light-squared bishop — the French bishop's eternal problem.",
      sayShort: 'e5 — lock the centre, gain space.' }),
    b({ id: 'c5', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3', arrows: [A('b2', 'c3')], highlights: [H('c3')],
      say: "Black strikes the chain with …c5 and trades on c3; White recaptures bxc3, accepting doubled pawns in exchange for the bishop pair and a massive pawn centre. This is the Winawer bargain — structure for dynamism.",
      sayShort: 'bxc3 — bishop pair, big centre.' }),
    b({ id: 'ne7', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 h4', highlights: [H('f5'), H('h4')],
      say: "Black develops …Ne7 heading for f5 to hit the centre; White plays the thematic h4 — grabbing kingside space, preparing Rh3 lifts, and stopping …f5 ideas. White's whole plan is a kingside attack while the centre stays locked.",
      sayShort: 'h4 — kingside space and attack.' }),
    b({ id: 'qc7', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 h4 Qc7 Nf3', arrows: [A('g1', 'f3')], highlights: [H('f3'), H('e5')],
      say: "Black pressures the e5-pawn with …Qc7; White develops Nf3 to defend it and prepare the attack. The position is set: White has the bishop pair, the space, and the kingside attacking chances; Black pressures the centre and the doubled pawns. A rich, unbalanced fight.",
      sayShort: 'Nf3 — defend e5, ready the attack.' }),
    b({ id: 'middlegame', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 h4 Qc7 Nf3 b6', highlights: [H('h5'), H('b6'), H('c5')],
      say: "Black expands with …b6 to develop the bishop and pressure the centre from the side. White has reached the classic Winawer middlegame: the bishop pair and a space-gaining kingside attack with h4-h5 to come, against Black's counterplay on the queenside and the doubled c-pawns. Sharp, double-edged, and exactly the unbalanced fight where White's trumps — the two bishops and the attack — give the practical edge.",
      sayShort: '…b6 — the unbalanced Winawer fight.' }),
  ],
};
