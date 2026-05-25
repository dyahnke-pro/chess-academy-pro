import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Petrov (Russian) Defence. Lead-the-eye
// §5a: GREEN arrows (non-pawn origin, clear sight-line, named endpoint), YELLOW
// highlights (named key square), SOFT BLUE (secondary). Moves come from the
// repertoire.json main line (DB-anchored, G3); prose only is authored.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PETROV_DEFENCE_LESSON: LessonScript = {
  openingId: 'petrov-defence',
  sources: ['book:petrov-defence', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
  title: 'Petrov Defence — A Master Class',
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'e4 e5 Nf3 Nf6', say: "The Petrov, or Russian Game — Black's most reliable equalising weapon for 180 years. After 1.e4 e5 2.Nf3, instead of defending the e5-pawn, Black counter-attacks with 2…Nf6, hitting e4. Symmetry is the whole idea: whatever White threatens against e5, Black mirrors against e4.", sayShort: '…Nf6 — counter-attack e4, mirror White.', arrows: [A('f6', 'e4')], highlights: [H('e4'), H('e5', SOFT)] }),
    b({ id: 'd6', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6', say: "Nxe5 grabs the pawn — and here is the one move-order point every Petrov player must know: NOT 3…Nxe4 at once, but 3…d6 first. The pawn jabs the e5-knight and forces it to retreat before Black recaptures. Snatching on e4 immediately walks into Qe2 and an awkward pin.", sayShort: '…d6 first — kick the knight, then recapture.', highlights: [H('d6'), H('e5')] }),
    b({ id: 'nxe4', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4', say: "Nf3 retreats, and only now …Nxe4 restores the material. The pawn count is level, the structure is symmetric, and Black has the position he wanted: nothing to defend, no weaknesses, and a knight as active as White's on e4.", sayShort: '…Nxe4 — restore material, symmetric and sound.', highlights: [H('e4')] }),
    b({ id: 'd5', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5', say: "d4 stakes out the centre; Black answers …d5, the key move. The pawn on d5 is a steel support for the e4-knight — it can never be chased away by f3, and Black's centre is every bit as solid as White's.", sayShort: '…d5 — anchor the e4-knight, equal centre.', highlights: [H('d5'), H('e4')] }),
    b({ id: 'develop', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7', say: "Bd3 eyes the e4-knight; Black develops naturally — …Nc6 brings the queenside knight out hitting d4, then …Be7 prepares to castle. No tricks, no rush: the Petrov player completes development and lets the symmetry do the work.", sayShort: '…Nc6, …Be7 — develop, press d4.', arrows: [A('c6', 'd4')], highlights: [H('d4'), H('e4', SOFT)] }),
    b({ id: 'nb4', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4', say: "c4 strikes at the d5-anchor; Black hits back with …Nb4, jumping at the strong d3-bishop. Trading that bishop removes White's most dangerous attacker — the one aimed at h7 — so White retreats it rather than allow the swap.", sayShort: '…Nb4 — harass the d3-bishop, ease the attack.', arrows: [A('b4', 'd3')], highlights: [H('d3'), H('d5', SOFT)] }),
    b({ id: 'bf5', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5', say: "Be2 sidesteps, Black castles into safety, and after Nc3 the light bishop swings to …Bf5 — developed actively outside the pawn chain, covering the key e4-square and the b1–h7 diagonal. Every black piece has a job; nothing is passive.", sayShort: '…Bf5 — active bishop, guard e4.', arrows: [A('f5', 'e4')], highlights: [H('f5'), H('e4')] }),
    b({ id: 'trade', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5 a3 Nxc3 bxc3 Nc6', say: "a3 prods the b4-knight, and Black resolves the tension with …Nxc3. The recapture bxc3 leaves White with doubled, isolated c-pawns — a long-term structural target — while …Nc6 brings the knight back to its best post, eyeing d4 again.", sayShort: '…Nxc3 — saddle White with doubled c-pawns.', arrows: [A('c6', 'd4')], highlights: [H('c3'), H('d4', SOFT)] }),
    b({ id: 'close', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5 a3 Nxc3 bxc3 Nc6 Bf4 Na5', say: "Bf4 develops with tempo; …Na5 lunges at the c4-pawn, the front pawn of White's damaged complex. There is the Petrov in full: dead-level material, a symmetric centre long since neutralised, and the only structural imbalance — the doubled c-pawns — running in Black's favour. Equalise first, then outplay. The other tabs show White's sharper tries: the Steinitz 3.d4, the Three Knights, the dxc3 Italian and Kaufmann attacks, and the natural 5.Bd3 line.", sayShort: '…Na5 — hit c4, Black holds the edge.', arrows: [A('a5', 'c4')], highlights: [H('c4'), H('a5')] }),
  ],
};
