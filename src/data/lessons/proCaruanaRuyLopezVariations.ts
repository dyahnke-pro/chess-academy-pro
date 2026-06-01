import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Ruy Lopez per-variation Watch lessons. Student = WHITE. Spine
// from his real data (caruana-ruy-lopez-morphy-a6, tree-extended). Board-
// accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const MORPHY_CLOSED: LessonScript = {
  openingId: 'pro-caruana-ruy-lopez', title: 'Ruy Lopez — Morphy …a6 Closed', minutes: 9, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'ba4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4', say: "When Black plays a6, Caruana retreats the bishop to a4, keeping the pin on the long diagonal. This is the Closed Ruy — the deepest, richest battleground in all of chess, where Caruana's preparation is unmatched.", sayShort: 'Ba4 — keep the pin.', arrows: [A('b5', 'a4')], highlights: [H('a4')] }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1', say: "Black develops Nf6 and Be7, both sides preparing to castle, and White brings the rook to e1 to support the e4-pawn. This is the classical Ruy build-up — slow, sound, and full of long-term plans.", sayShort: 'Re1 — support e4.', arrows: [A('f1', 'e1')], highlights: [H('e1')] }),
    b({ id: 'bb3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O', say: "Black gains queenside space with b5, and the bishop retreats to b3 — still on the powerful a2-g8 diagonal, eyeing the f7-square. Both sides complete their kingside castling. The stage is set for the central and queenside maneuvering.", sayShort: 'Bb3 — the a2-g8 diagonal.', arrows: [A('a4', 'b3')], highlights: [H('b3')] }),
    b({ id: 'a4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4', say: "Caruana strikes the queenside with a4 — challenging Black's b5-pawn and opening lines where his pieces are better placed. A modern, aggressive way to fight the Closed Ruy that Caruana has used at the highest level.", sayShort: 'a4 — strike the queenside.', arrows: [A('a2', 'a4')], highlights: [H('a4')] }),
    b({ id: 'mid', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 a5 d6 c3 Rb8 h3', say: "Black locks the queenside with b4, White clamps with a5, and after c3 to prop the centre and h3 to make luft, the position settles into a rich Closed-Ruy middlegame. White has the bishop pair's potential and queenside space; the slow battle of plans begins — Caruana's natural habitat.", sayShort: 'c3, h3 — the rich middlegame.', highlights: [H('a5')] }),
  ],
};

// Berlin Endgame (4.O-O Nxe4) — spine from his 68 real OTB Berlin games.
const BERLIN_ENDGAME: LessonScript = {
  openingId: 'pro-caruana-ruy-lopez', title: 'Ruy Lopez — Berlin Endgame', minutes: 9, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O', say: "Against the Berlin, Caruana castles and invites the famous endgame. He has defended and attacked this structure at the very top, including the World Championship — nobody understands it more deeply.", sayShort: 'O-O — invite the Berlin.', arrows: [A('f1', 'g1')], highlights: [H('g1')] }),
    b({ id: 'nxe4', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5', say: "Black grabs the pawn with the knight, and after d4 and the trade on c6, White recaptures the centre with dxe5. The knight reroutes to f5, eyeing the kingside dark squares — the standard Berlin tabiya.", sayShort: 'dxe5 — reclaim the centre.', arrows: [A('d4', 'e5')], highlights: [H('e5'), H('f5')] }),
    b({ id: 'qtrade', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8', say: "The queens come off with the check on d8, and the black king must recapture, losing the right to castle. This is the soul of the Berlin: an early queenless middlegame where White plays for the better structure and Black for the bishop pair.", sayShort: 'Qxd8+ — the queenless battle.', arrows: [A('d1', 'd8')], highlights: [H('d8')] }),
    b({ id: 'h3', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Bd7 Rd1 Kc8', say: "White plays h3 to deny the knight the g4-square, develops the rook to d1 with tempo on the king, and Black tucks the king to c8. White's healthy kingside majority is the long-term trump.", sayShort: 'Rd1 — tempo on the king.', arrows: [A('f1', 'd1')], highlights: [H('d1')] }),
    b({ id: 'g4', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Bd7 Rd1 Kc8 g4 Ne7 Ng5 Be8', say: "Caruana expands with g4, gaining kingside space and harassing the f5-knight back to e7. The knight jumps to g5 to pressure f7 and e6. White slowly converts the structural edge — the patient Berlin grind that is Caruana's trademark.", sayShort: 'g4 — gain space, press.', arrows: [A('g2', 'g4')], highlights: [H('g4')] }),
  ],
};

// Open Ruy (4…Nf6 5.O-O Nxe4) — spine from his 28 real OTB Open Ruy games.
const OPEN_RUY: LessonScript = {
  openingId: 'pro-caruana-ruy-lopez', title: 'Ruy Lopez — Open Variation', minutes: 9, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nxe4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4', say: "In the Open Ruy, Black snatches the e4-pawn right after castling. It is the most concrete, forcing way to meet the Spanish — and Caruana meets concrete with concrete.", sayShort: 'Nxe4 — the Open Ruy.', highlights: [H('e4')] }),
    b({ id: 'd4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6', say: "White strikes the centre with d4. Black props the knight with b5 and d5 and develops the bishop to e6, reaching the classical Open tabiya: the e5-pawn cramps Black, while Black has free piece play and a strong knight in the centre.", sayShort: 'd4 — strike the centre.', arrows: [A('d2', 'd4')], highlights: [H('d4'), H('e5')] }),
    b({ id: 'nbd2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 Nbd2 Nc5 c3 Be7', say: "Caruana brings the queen's knight to d2 to challenge the strong central knight, Black retreats to c5 to hit the b3-bishop, and c3 shores up the centre while Black completes development. A rich, dynamically balanced middlegame.", sayShort: 'Nbd2 — challenge the centre.', arrows: [A('b1', 'd2')], highlights: [H('d2')] }),
    b({ id: 'bc2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 Nbd2 Nc5 c3 Be7 Bc2', say: "The bishop slides to c2, preserving the powerful light-squared piece and lining up on the long diagonal toward Black's king. White's plan is to reroute the knights and pile slow pressure on the centre.", sayShort: 'Bc2 — eye the kingside.', arrows: [A('b3', 'c2')], highlights: [H('c2')] }),
    b({ id: 'mid', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 Nbd2 Nc5 c3 Be7 Bc2 d4 Nb3 d3', say: "Black grabs space with d4 and pushes d3 to jam White's queenside, but the advanced pawn becomes a long-term weakness. White rounds it up with patient play — the structural battle the Open Ruy always comes down to, where Caruana's technique shines.", sayShort: 'd3 — a long-term weakness.', highlights: [H('d3')] }),
  ],
};

export const PRO_CARUANA_RUY_LOPEZ_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-ruy-lopez::Morphy …a6 Closed': MORPHY_CLOSED,
  'pro-caruana-ruy-lopez::Berlin Endgame': BERLIN_ENDGAME,
  'pro-caruana-ruy-lopez::Open Variation': OPEN_RUY,
};
