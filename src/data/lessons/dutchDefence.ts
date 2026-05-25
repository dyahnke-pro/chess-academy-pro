import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Dutch Defence (Leningrad). Lead-the-eye §5a.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const DUTCH_DEFENCE_LESSON: LessonScript = {
  openingId: 'dutch-defence',
  title: 'The Dutch Defence — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 f5', say: "The Dutch Defence — 1…f5, the most aggressive answer to 1.d4. Black stakes an immediate claim on the kingside and the e4-square, refusing the quiet, symmetrical lives of the Queen's-pawn openings. The Dutch is for players who want to attack: Black plays for a kingside pawn storm and a direct assault on the white king.", sayShort: '…f5 — grab kingside space, fight for e4.', highlights: [H('f5'), H('e4', SOFT)] }),
    b({ id: 'leningrad', moves: 'd4 f5 g3 Nf6 Bg2 g6', say: "g3 Nf6 Bg2 g6 — the Leningrad Dutch. Black fianchettoes the bishop to g7, blending the King's Indian setup with the …f5 thrust. The bishop heads to g7 to rake the long diagonal while the f-pawn spearheads a kingside attack. It is the sharpest, most ambitious Dutch system.", sayShort: '…g6 — the Leningrad, KID with …f5.', highlights: [H('g6')] }),
    b({ id: 'oo', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O', say: "…Bg7 lands on the long diagonal and both sides castle. Black's king is safe behind the fianchetto, the g7-bishop eyes d4 and the centre, and the stage is set for the thematic Leningrad plans: …d6, …Qe8, and a central or kingside break.", sayShort: '…Bg7, O-O — fianchetto, king safe.', highlights: [H('d4')] }),
    b({ id: 'qe8', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8', say: "c4 d6, and then the signature Leningrad move: …Qe8! The queen steps off the d-file, eyeing a swing to h5 or g6 to power the kingside attack, while clearing d8 and supporting the central …e5 break. This quiet-looking move is the engine of Black's whole plan.", sayShort: '…Qe8 — reroute the queen toward the kingside.', highlights: [H('e8'), H('h5', SOFT)] }),
    b({ id: 'na6', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6', say: "d5 grabs central space; Black develops …Na6, heading for c5 or c7 to support the breaks. With the centre fixed, the game splits into the two Dutch races — White on the queenside, Black on the kingside — and Black's attack, fuelled by the f-pawn and the rerouted queen, is the more dangerous.", sayShort: '…Na6 — reroute the knight, prep the breaks.', highlights: [H('c5', SOFT)] }),
    b({ id: 'c6', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Bd7 b4 c6 dxc6 bxc6', say: "Rb1 and b4 begin White's queenside play; Black strikes back in the centre with …c6, and after dxc6 bxc6 the position opens. Black has the half-open b-file, a mobile centre, and the kingside attack still loaded — the dynamic Leningrad battle in full swing.", sayShort: '…c6 — strike the centre, open lines.', highlights: [H('c6')] }),
    b({ id: 'close', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Bd7 b4 c6 dxc6 bxc6 a3 Nc7 Bb2 Ne6 c5 d5 Ne5 d4 Na4 Ng4 Nf3 Rd8 Nxd4 Nxd4', say: "The play sharpens: Black reroutes the knight to e6, strikes with …d5–d4, and trades blows in the centre while the kingside attack simmers. There is the Leningrad Dutch middlegame — the fianchettoed bishop, the advancing f-pawn, and the rerouted queen all pointing at White's king, while the centre stays fluid and double-edged. That's the Dutch: grab the kingside and attack the king. The other tabs show its other faces — the Stonewall fortress, the flexible Classical, the Ilyin-Zhenevsky, and the …e5 break.", sayShort: '…d4 — the double-edged Leningrad battle.', highlights: [H('d4')] }),
  ],
};
