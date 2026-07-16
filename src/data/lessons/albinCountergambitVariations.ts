import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Albin Countergambit. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Sharp gambit lines that resolve before the middlegame → `kind: 'roadmap'`.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Albin_Countergambit'];

export const ALBIN_COUNTERGAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'albin-countergambit::Fianchetto Variation': {
    openingId: 'albin-countergambit', title: 'Albin — The Fianchetto (g3): Regain the Pawn', minutes: 10, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'f1', moves: 'd4 d5 c4 e5 dxe5 d4', say: "The d4-wedge is planted. White's most respected modern answer is the Fianchetto: g3 and Bg2, undermining the wedge from the long diagonal rather than confronting it head-on. Black's modern answer is calmer than the old storms — develop, regain the pawn, and equalise.", sayShort: '…d4 — the wedge vs the g3 plan.', highlights: [H('d4')] }),
      b({ id: 'f2', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3', say: "Nf3 prepares the fianchetto and …Nc6 develops, hitting the e5-pawn and supporting the d4-wedge. White will challenge d4 along the diagonal — and Black's next move is the modern star of the whole variation.", sayShort: '…Nc6 — develop, hit e5.', arrows: [A('c6', 'e5')], highlights: [H('e5')] }),
      b({ id: 'f3', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Nge7', say: "…Nge7! — the move that modernised the Albin. The knight heads for g6, where it will attack the e5-pawn a second time and simply win it back. No gambling, no king-race — Black collects what the gambit lent.", sayShort: '…Nge7 — headed for g6.', arrows: [A('e7', 'g6')], highlights: [H('e7'), H('g6', SOFT)] }),
      b({ id: 'f4', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Nge7 Bg2 Ng6', say: "Bg2 completes the fianchetto on the long diagonal, and …Ng6 arrives on schedule: the e5-pawn is attacked twice and cannot be held. The knight tour cost two tempi and buys the gambit pawn back with full development.", sayShort: '…Ng6 — e5 attacked twice.', arrows: [A('g6', 'e5')], highlights: [H('g6'), H('e5')] }),
      b({ id: 'f5', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Nge7 Bg2 Ng6 O-O Ngxe5 Nxe5 Nxe5', say: "White castles; …Ngxe5 collects the gambit pawn, and after the knight trade on e5 material is level. The wedge on d4 still cramps White's queenside — the Albin's whole promise, delivered without risk.", sayShort: '…Nxe5 — the pawn is home.', highlights: [H('e5'), H('d4', SOFT)] }),
      b({ id: 'f6', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Nge7 Bg2 Ng6 O-O Ngxe5 Nxe5 Nxe5 b3 c5 Bb2 Be7', say: "b3 and Bb2 besiege the d4-wedge from the long dark diagonal; …c5 guards it and …Be7 gets on with development. Black defends the wedge exactly as long as it is convenient — it has already done its job of cramping White for fifteen moves.", sayShort: '…Be7 — guard d4, develop.', highlights: [H('c5'), H('d4'), H('b2', SOFT)] }),
      b({ id: 'f7', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Nge7 Bg2 Ng6 O-O Ngxe5 Nxe5 Nxe5 b3 c5 Bb2 Be7 e3 Nc6 Bxc6+ bxc6 exd4 cxd4 Qxd4 Qxd4 Bxd4 O-O Re1', say: "e3 finally levers the wedge, …Nc6 keeps a defender on d4, and when Bxc6+ damages the pawns …bxc6 recaptures toward the centre. The wedge trades itself away, the queens come off on d4, and Black calmly castles. White keeps an extra pawn on paper; the engine calls the position a quarter-pawn — Black's two bishops and cleaner development are that real. The Albin's best modern showing: a gambit that ends nearly level with all the play still ahead.", sayShort: '…O-O — nearly level, two bishops.', highlights: [H('d4'), H('c6')] }),
    ],
  },

  'albin-countergambit::Lasker Trap': {
    openingId: 'albin-countergambit', title: 'Albin — The Lasker Trap', minutes: 7, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'l1', moves: 'd4 d5 c4 e5 dxe5 d4 e3', say: "The Lasker Trap — the most famous trap in the Albin. White tries to dissolve the annoying wedge with the natural-looking 4.e3? — and walks straight into disaster. The trap is named after Emanuel Lasker, who showed its venom.", sayShort: '4.e3 — the move that walks into the trap.', highlights: [H('e3')] }),
      b({ id: 'l2', moves: 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3', say: "…Bb4+! checks first, and after Bd2 comes the key blow …dxe3! — Black opens lines toward f2 and the white king. The capture looks like it just trades pawns, but it is the trigger for a spectacular combination.", sayShort: '…dxe3 — the trigger, open lines at f2.', highlights: [H('e3'), H('f2')] }),
      b({ id: 'l3', moves: 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3 Bxb4 exf2+ Ke2 fxg1=N+', say: "If White grabs the bishop with Bxb4??, then …exf2+ Ke2 …fxg1=N+! — the famous underpromotion to a knight, with check! The new knight forks the king and wins material. There is the Lasker Trap: the underpromotion every Albin player dreams of springing. (Stronger White players sidestep it with Be2 instead of grabbing — but the threat alone is worth knowing.)", sayShort: '…fxg1=N+ — the underpromotion fork!', highlights: [H('g1')] }),
    ],
  },

  'albin-countergambit::Spassky Variation': {
    openingId: 'albin-countergambit', title: 'Albin — The Spassky (4.e4)', minutes: 10, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 's1', moves: 'd4 d5 c4 e5 dxe5 d4 e4', say: "The Spassky Variation — White grabs maximum central space with 4.e4, the most principled try. But the d4-wedge still cramps White, and the broad e4/e5 pawn front becomes a target as much as a strength. Black plays for piece pressure against it.", sayShort: '4.e4 — White grabs space; the wedge holds.', highlights: [H('e4'), H('d4', SOFT)] }),
      b({ id: 's2', moves: 'd4 d5 c4 e5 dxe5 d4 e4 Nc6 f4', say: "…Nc6 develops and hits the e5-pawn; White doubles down with f4, raising a massive e4-f4 wall behind the e5-pawn. The centre looks crushing — but it is over-extended, and the d4-wedge sitting in its midst gives Black a permanent foothold.", sayShort: '…Nc6, f4 — the big e4-f4 front.', arrows: [A('c6', 'e5')], highlights: [H('e4'), H('f4'), H('e5')] }),
      b({ id: 's3', moves: 'd4 d5 c4 e5 dxe5 d4 e4 Nc6 f4 f6 exf6 Nxf6', say: "…f6! strikes at the broad front before it can roll forward; after exf6 Nxf6 the knight develops with tempo and the once-proud pawn wall has been dismantled. Black's pieces pour out onto an open board.", sayShort: '…f6 — strike the centre, develop.', highlights: [H('f6')] }),
      b({ id: 's4', moves: 'd4 d5 c4 e5 dxe5 d4 e4 Nc6 f4 f6 exf6 Nxf6 Bd3 Bb4+', say: "Bd3 develops toward the kingside and …Bb4+ checks with gain of tempo, dragging out a white piece while Black completes mobilising. There is the Spassky middlegame: White kept extra central space, but it is loose, and Black's lead in development plus the d4-wedge give full compensation and a sharp, double-edged fight.", sayShort: '…Bb4+ — develop with check, full comp.', highlights: [H('d3'), H('b4'), H('d4')] }),
    ],
  },
};
