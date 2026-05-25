import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Slav Defence. Lead-the-eye §5a. Moves from
// repertoire.json (DB-anchored, G3); prose only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-development', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Slav_Defense'];

export const SLAV_DEFENCE_LESSON: LessonScript = {
  openingId: 'slav-defence',
  sources: SRC,
  title: 'Slav Defence — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 d5 c4 c6', say: "The Slav — Black supports the d5-pawn with …c6 instead of …e6. The whole point of this move-order over the Queen's Gambit Declined: the light-squared bishop keeps its diagonal open and can develop actively to f5 or g4 before being shut in. Solidity without the bad bishop.", sayShort: '…c6 — guard d5, keep the bishop free.', highlights: [H('c6'), H('d5')] }),
    b({ id: 'dxc4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4', say: "After developing the knights, Black takes …dxc4. Black does not cling to the pawn for its own sake — the capture clears d5 and gains time to get the light bishop out before playing …e6, the exact problem the QGD never solves.", sayShort: '…dxc4 — clear d5, free the bishop.', highlights: [H('c4'), H('d5', SOFT)] }),
    b({ id: 'bf5', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5', say: "a4 stops …b5 from holding the pawn, and Black plays the defining Slav move: …Bf5! The light bishop steps outside the pawn chain to its best diagonal before …e6 locks it in. This is the move the whole Slav is built around.", sayShort: '…Bf5 — the good bishop, out at last.', highlights: [H('f5')] }),
    b({ id: 'bb4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4', say: "Now …e6 can be played with a clear conscience — the bishop is already outside — and …Bb4 pins the c3-knight, adding pressure to the centre. Black has solved the structural problem of the Queen's Gambit before it ever arose.", sayShort: '…Bb4 — pin c3, the bishop is already free.', arrows: [A('b4', 'c3')], highlights: [H('c3'), H('e6', SOFT)] }),
    b({ id: 'bg6', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6', say: "Black castles-to-be with …Nbd7, and when White prepares e4 the bishop steps back to …Bg6 — safe on the b1–h7 diagonal, where the coming e4–e5 advance cannot trap it. Prophylaxis: the bishop sidesteps the threat before it lands.", sayShort: '…Bg6 — sidestep e4, keep the bishop.', highlights: [H('g6'), H('d7', SOFT)] }),
    b({ id: 'e4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O', say: "White finally builds the big centre with e4 and Black castles into safety. White has more space, but Black has no weaknesses, the better bishop already developed, and the …c5 and …e5 breaks in reserve to chip at the centre.", sayShort: '…O-O — safe, the centre is in the cross-hairs.', highlights: [H('e4')] }),
    b({ id: 'close', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O Bg5 h6 Bh4', say: "Bg5 pins, and …h6 puts the question to the bishop. There is the Slav in full: the rock-solid c6/e6 pawn wall, the good light bishop developed outside it on g6, and a fully sound position where White's extra space is balanced by Black's flawless structure. The other tabs show the sharp Geller Gambit and the Schlechter fianchetto.", sayShort: '…h6 — solid wall, good bishop, fully equal.', highlights: [H('h6'), H('g6', SOFT)] }),
  ],
};
