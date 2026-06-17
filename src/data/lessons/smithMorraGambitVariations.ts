import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Smith-Morra variation lessons (white). Data spines (sm__accepted-d6 / alapin-decl
// / push-decl, masters/strong corpus, G3). Each reaches a sound ≥20-ply position
// (engine ≥ +0.1 white). Keyed `${openingId}::${variationName}` matching the
// gambits.json variations[] names. Board claims verified against the line.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'];

export const SMITH_MORRA_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'smith-morra-gambit::Classical Defence (…d6 & …e6)': {
    openingId: 'smith-morra-gambit', sources: SRC, title: 'Smith-Morra — Classical Defence', minutes: 9, orientation: 'white',
    beats: [
      b({ id: 'c1', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6', say: "Black sets up the solid Classical wall — …d6 and …e6, a little Scheveningen box. White develops in the ideal Morra fashion: Bc4 on the a2-g8 diagonal, knight on f3, and castling next.", sayShort: 'Bc4 — the ideal Morra bishop.', highlights: [H('c4'), H('e6')] }),
      b({ id: 'c2', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Be7 Qe2', say: "O-O and Qe2 — the signature Morra queen lift. The queen steps off the d-file so the rook can take it, and eyes the e6/f7 squares behind Black's modest setup.", sayShort: 'Qe2 — clear the d-file for the rook.', highlights: [H('e2')] }),
      b({ id: 'c3', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Be7 Qe2 Nf6 Rd1 e5', say: "Rd1 plants the rook on the open d-file, dead opposite Black's d6-pawn — the pin and the pressure are constant. …e5 grabs space but concedes the d5-square forever.", sayShort: 'Rd1 — the open d-file vs d6.', arrows: [A('d1', 'd6')], highlights: [H('d1'), H('d6'), H('d5')] }),
      b({ id: 'c4', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Be7 Qe2 Nf6 Rd1 e5 Be3 O-O Rac1 Bg4', say: "Be3 and Rac1 complete the dream: BOTH rooks landing on c1 and d1, the half-open files, both bishops out, the queen active. White is a pawn down and stands fully comfortably — the open files and the d5-hole are lasting compensation.", sayShort: 'Rac1 — both rooks on the open files.', highlights: [H('c1'), H('d1'), H('d5')] }),
    ],
  },
  'smith-morra-gambit::Alapin Declined (2…Nf6)': {
    openingId: 'smith-morra-gambit', sources: SRC, title: 'Smith-Morra — Alapin Declined', minutes: 9, orientation: 'white',
    beats: [
      b({ id: 'a1', moves: 'e4 c5 d4 cxd4 c3 Nf6', say: "Instead of grabbing on c3, Black declines with …Nf6, hitting e4 — an Alapin-style refusal of the gambit.", sayShort: '…Nf6 — decline, hit e4.', highlights: [H('e4')] }),
      b({ id: 'a2', moves: 'e4 c5 d4 cxd4 c3 Nf6 e5 Nd5 Nf3 Nc6 cxd4', say: "e5! kicks the knight to d5, and after Nf3 …Nc6 cxd4 White has simply transposed into a comfortable Alapin Sicilian — the e5-pawn cramps Black and the centre is White's.", sayShort: 'e5 — gain space, transpose to Alapin.', highlights: [H('e5'), H('d5')] }),
      b({ id: 'a3', moves: 'e4 c5 d4 cxd4 c3 Nf6 e5 Nd5 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5 Nxe5', say: "Bc4 hits the d5-knight, …Nb6 retreats, and Bb5 pins the c6-knight to the king. After the trade on e5 White's pieces hum — the knight dominates the central e5-square, both bishops are out and biting, and the rooks are ready for the c- and d-files. This is the Morra's bargain even when Black declines: White's army reaches its best squares a tempo or two before Black's, and that head start IS the compensation.", sayShort: 'Nxe5 — knight dominates the centre.', highlights: [H('e5'), H('b5')] }),
      b({ id: 'a4', moves: 'e4 c5 d4 cxd4 c3 Nf6 e5 Nd5 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7 Nxd7 Qxd7 Nc3 e6 O-O Be7', say: "The minor pieces come off and White castles into a comfortable Alapin — and note the quiet triumph here: in this declined line White never even sacrificed the pawn. White simply owns the freer position — a strong d4-pawn holding the centre, smoother development, and the half-open c-file waiting for a rook. A risk-free edge, the gambit's mere threat earning the better game.", sayShort: 'O-O — risk-free space and the c-file.', highlights: [H('d4', 'rgba(80,140,255,0.32)')] }),
    ],
  },
  'smith-morra-gambit::d3 Return Declined': {
    openingId: 'smith-morra-gambit', sources: SRC, title: 'Smith-Morra — d3 Return', minutes: 8, orientation: 'white',
    beats: [
      b({ id: 'd1', moves: 'e4 c5 d4 cxd4 c3 d3', say: "The safest decline: …d3, handing the pawn straight back rather than letting White's pieces loose. White is happy — the gambit is declined, and a normal, good position remains.", sayShort: '…d3 — return the pawn safely.', highlights: [H('d3')] }),
      b({ id: 'd2', moves: 'e4 c5 d4 cxd4 c3 d3 Bxd3 Nc6 c4', say: "Bxd3 recaptures the pawn, and c4! clamps the centre — a Maróczy Bind, the c4-e4 pawns locking down d5. White trades the gambit idea for a big, durable space advantage.", sayShort: 'c4 — clamp with the Maróczy Bind.', highlights: [H('c4'), H('d5')] }),
      b({ id: 'd3', moves: 'e4 c5 d4 cxd4 c3 d3 Bxd3 Nc6 c4 g6 Nc3 Bg7 Nf3 d6 O-O Nf6', say: "Black fianchettoes and develops; White builds naturally with Nc3, Nf3 and O-O. The c4-e4 pawn duo squeezes Black, who has no easy break.", sayShort: 'O-O — the c4-e4 squeeze.', highlights: [H('c4'), H('e4')] }),
      b({ id: 'd4', moves: 'e4 c5 d4 cxd4 c3 d3 Bxd3 Nc6 c4 g6 Nc3 Bg7 Nf3 d6 O-O Nf6 h3 O-O Be3 Nd7 Rc1 Nde5', say: "h3, Be3 and Rc1 finish development with the rook on the half-open c-file. White is a clear pawn for nothing — no, BETTER: the c4-e4 Bind hands White a lasting space edge worth more than the returned pawn.", sayShort: 'Rc1 — bind plus the c-file.', highlights: [H('c4'), H('e4'), H('c1')] }),
    ],
  },
};
