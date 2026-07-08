import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Smith-Morra (Black): e4 c5 d4 cxd4 c3 dxc3 Nxc3 — main-line master class.
// The student plays BLACK. Accept the gambit pawn, then build the solid
// ...a6/...e6/...Nge7 wall that blunts White's development lead — the classic
// "accept and consolidate" recipe. White has real compensation, so be honest:
// it is roughly level, with Black holding the extra pawn under control. Spine
// both-sides-sound (build-sound-spine.mjs), engine-verified (-0.21 for Black).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'];

export const ANTI_SMITH_MORRA_BLACK_LESSON: LessonScript = {
  openingId: 'anti-smith-morra-black',
  sources: SRC,
  title: 'Against the Smith-Morra — accept and consolidate',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'smb1', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3',
      say: "The Smith-Morra offers a pawn for fast development and open lines. You accept — grabbing on d4 and c3 — because the pawn is real and White's comp is manageable IF you know the plan. And be clear-eyed here: after Nxc3 White's a pawn down but ahead in development, so this is honestly about level. Your entire job now is to defuse the initiative and hang onto that pawn.",
      sayShort: "…dxc3 — take the pawn, know the plan.",
      highlights: [H('c3', SOFT)] }),
    b({ id: 'smb2', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6',
      say: "Now the famous consolidating wall goes up, brick by brick. …e6 blunts the c4-bishop's stare at f7; …a6 denies White's pieces the b5-square and prepares …b5 to gain space and kick the bishop; …Nc6 develops toward the middle. Every single move quietly takes a punch out of White's attack before it can even land.",
      sayShort: "…e6, …a6 — the consolidating wall.",
      highlights: [H('e6', KEY), H('a6', KEY)] }),
    b({ id: 'smb3', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Bg5 f6',
      say: "…Nge7 is the key subtlety: the knight develops WITHOUT blocking your e6-pawn, and it can't be pinned — everything …Nf6 would get wrong. When White tries Bg5 to provoke a weakness, …f6 just shoos the bishop off. Your dark squares hold, and that extra pawn stays firmly in your pocket.",
      sayShort: "…Nge7, …f6 — solid, unpinnable setup.",
      highlights: [H('e7', KEY)] }),
    b({ id: 'smb4', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Bg5 f6 Be3 b5 Be2 Bb7 Rc1 Nc8',
      say: "You expand with …b5 and fianchetto …Bb7, seizing the long diagonal, then reroute the knight toward d6 to plug every last hole. White's development lead has been completely absorbed — you've weathered the whole storm with the extra pawn intact and the safer king. And now the pawn does the talking. Patience beats the gambit every time.",
      sayShort: "…b5, …Bb7 — absorbed, up a pawn.",
      highlights: [H('b5', ATK), H('b7', SOFT)] }),
  ],
};
