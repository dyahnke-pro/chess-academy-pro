import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Semi-Slav Defence (Anti-Moscow / sharp
// …g5 main). Lead-the-eye §5a. Moves from repertoire.json (DB-anchored, G3);
// prose only.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'];

export const SEMI_SLAV_LESSON: LessonScript = {
  openingId: 'semi-slav',
  sources: SRC,
  title: 'Semi-Slav Defence — A Master Class',
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6', say: "The Semi-Slav — Black plays BOTH …c6 and …e6, the most solid and most combative answer to the Queen's Gambit at once. The pawns form an unbreakable wall, yet the position is loaded with dynamic potential: the price is a temporarily boxed-in light bishop, and the whole struggle is about freeing it on Black's terms.", sayShort: '…e6 — the …c6/…e6 wall, solid and sharp.', highlights: [H('c6'), H('e6')] }),
    b({ id: 'dxc4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4', say: "Bg5 pins, …h6 questions the bishop, Bh4 keeps the pin — and Black grabs the pawn with …dxc4. This is the sharp Anti-Moscow: Black takes on c4 and intends to hold the pawn with …b5, daring White to prove the sacrifice of the centre is worth it.", sayShort: '…dxc4 — grab it, intend …b5.', highlights: [H('c4')] }),
    b({ id: 'g5', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4 e4 g5', say: "e4 builds the big centre, and Black lashes out with …g5! — the defining Semi-Slav thrust, hitting the h4-bishop and grabbing kingside space. It looks reckless, but it is deeply analysed theory: Black returns the bishop's diagonal for queenside space and the extra pawn.", sayShort: '…g5 — hit the bishop, seize space.', highlights: [H('g5'), H('h4')] }),
    b({ id: 'b5', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4 e4 g5 Bg3 b5', say: "Bg3 retreats, and …b5 clamps the queenside, defending the extra c4-pawn and gaining a huge wedge of space. Black now has a protected extra pawn and a pawn avalanche on the queenside; White has the centre and the initiative. The race is on.", sayShort: '…b5 — clamp, hold the extra pawn.', highlights: [H('b5'), H('c4', SOFT)] }),
    b({ id: 'bb7', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4 e4 g5 Bg3 b5 Be2 Bb7', say: "Be2 develops, and …Bb7 develops the Semi-Slav's problem piece — the light bishop, once buried behind …e6, now loaded on the long diagonal behind the c6-pawn, ready to fire at the e4-centre the instant …c5 opens the road. The whole point of the …dxc4/…b5 plan was to free this bishop.", sayShort: '…Bb7 — the problem bishop, loaded.', highlights: [H('b7'), H('e4', SOFT)] }),
    b({ id: 'nbd7', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4 e4 g5 Bg3 b5 Be2 Bb7 O-O Nbd7 Ne5 Bg7', say: "Black castles long is in the air; …Nbd7 develops and challenges White's coming Ne5, and after Ne5 …Bg7 the dark bishop takes the long diagonal too, both bishops now bearing on the e4-centre. Black's pieces are coming alive while the extra pawn sits safely on c4.", sayShort: '…Bg7 — both bishops rake the centre.', highlights: [H('g7'), H('e4', SOFT)] }),
    b({ id: 'close', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4 e4 g5 Bg3 b5 Be2 Bb7 O-O Nbd7 Ne5 Bg7 Nxd7 Nxd7 Bd6 a6 a4 b4 Bxb4 Qb6 Ba3 Qxd4', say: "The forcing sequence runs its course: trades on d7, Bd6 and a4 pry at the queenside, but Black holds with …a6 and …b4, and after Bxb4 …Qb6 Ba3 …Qxd4 Black snatches the central pawn back with a strong queen and the extra material. There is the sharp Semi-Slav in full — a razor-edged battle of White's initiative against Black's extra pawn and roaring bishops. The other tabs show the positional Meran, the famous Botvinnik, the calm Moscow, and the Stoltz.", sayShort: '…Qxd4 — grab the centre, material in hand.', highlights: [H('d4'), H('b4', SOFT)] }),
  ],
};
