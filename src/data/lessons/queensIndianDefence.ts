import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Queen's Indian Defence. Lead-the-eye §5a.
// Moves from repertoire.json (DB-anchored, G3); prose only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-development', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];

export const QUEENS_INDIAN_DEFENCE_LESSON: LessonScript = {
  openingId: 'queens-indian',
  sources: SRC,
  title: "Queen's Indian Defence — A Master Class",
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 e6 Nf3 b6', say: "The Queen's Indian — the soundest, most solid of the Indian defences. With 3.Nf3 ruling out the Nimzo's …Bb4, Black plays …b6 to fianchetto the light bishop. The whole opening is a fight for one square — e4 — and the light bishop, bound for b7, is Black's chief soldier in that fight.", sayShort: '…b6 — fianchetto, fight for e4.', highlights: [H('b6'), H('e4', SOFT)] }),
    b({ id: 'bb7', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7', say: "White fianchettoes in turn — g3 and Bg2 — and the two light bishops glare at each other down the long diagonal, both contesting e4. …Be7 develops modestly; the QID is about control and structure, not early fireworks.", sayShort: '…Bb7 — contest e4 on the diagonal.', arrows: [A('b7', 'e4')], highlights: [H('b7'), H('e4')] }),
    b({ id: 'ne4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4', say: "Both castle, White develops Nc3, and Black plants …Ne4! — the knight occupies the very square the whole opening is fought over, backed by the b7-bishop. Control of e4 is the strategic prize, and Black has just seized it.", sayShort: '…Ne4 — seize the key square.', highlights: [H('e4')] }),
    b({ id: 'f5', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 f5', say: "Qc2 …Nxc3 Qxc3, and …f5! — the pawn cements Black's grip on e4 and grabs kingside space, a Stonewall-flavoured clamp. The e4-square, contested all opening, is now firmly Black's to use.", sayShort: '…f5 — clamp the e4-square.', highlights: [H('f5'), H('e4')] }),
    b({ id: 'bf6', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 f5 Bf4 Bf6 Qe3 Re8', say: "…Bf6 redeploys the dark bishop to the long diagonal, where it pressures d4 and the b2-square, and …Re8 backs the centre. Both Black bishops now rake the long diagonals — the QID's pieces are perfectly harmonious.", sayShort: '…Bf6 — bishop to the long diagonal.', arrows: [A('f6', 'd4')], highlights: [H('f6'), H('d4')] }),
    b({ id: 'close', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 f5 Bf4 Bf6 Qe3 Re8 Rfd1 a5 Rac1 Na6', say: "…a5 gains queenside space and eyes …a4, and …Na6 develops the last piece toward c5 and b4. There is the Queen's Indian in full: not a sharp attacking machine but a fortress of control — both bishops on the long diagonals, a knight clamping e4, no weaknesses, and a structure Black can press for a win without ever taking a risk. The other tabs show the a3 systems, the …Bb4+ line, and the Miles …Ba6.", sayShort: '…Na6 — finish developing, press on.', highlights: [H('a5'), H('e4', SOFT)] }),
  ],
};
