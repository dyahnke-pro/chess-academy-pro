import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Pirc: the Austrian Attack (e4 d6 d4 Nf6 Nc3 g6 f4) — main-line master
// class. The student plays WHITE. The most ambitious anti-Pirc: a huge e4-d4-f4
// pawn front backing a kingside attack. When Black counters in the centre with
// ...c5/...c4/...b5, accurate grabs (Bxc4, Nxb5) leave White a clean pawn up.
// Spine both-sides-sound (build-sound-spine.mjs), engine-verified (+0.81 White).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence,_Austrian_Attack'];

export const ANTI_PIRC_AUSTRIAN_LESSON: LessonScript = {
  openingId: 'anti-pirc-austrian',
  sources: SRC,
  title: 'The Austrian Attack — f4 and a big centre',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'aus1', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4',
      say: "The Austrian Attack is the sharpest, most bloodthirsty answer to the Pirc — and it starts with f4. Look at what you've got: a towering pawn front on e4, d4 AND f4. This isn't some quiet space edge to nurse; it's a launch pad. Those pawns are going to roll with e5 or f5, and your pieces come pouring in at Black's fianchettoed king.",
      sayShort: "f4 — the big e4-d4-f4 front.",
      highlights: [H('e4', KEY), H('d4', KEY), H('f4', KEY)] }),
    b({ id: 'aus2', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3',
      say: "Now bring the attackers out: Nf3 supports the centre and eyes g5 and e5, O-O tucks your king away, and Bd3 trains the bishop down the b1-h7 diagonal, straight at Black's castled king. Everything — and I mean everything — points kingside. The Pirc player has to conjure central counterplay fast, or he simply gets steamrolled.",
      sayShort: "Nf3, Bd3 — pieces aim kingside.",
      highlights: [H('d3', KEY)] }),
    b({ id: 'aus3', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5',
      say: "Black hits your centre with …c5; you push right past — d5 — keeping the front intact and grabbing even more space. And notice: his knight's stranded on a6, and that …c5 thrust has only loosened HIS position, not yours. Your centre stands tall, and the attack is coming.",
      sayShort: "d5 — push past, keep the front.",
      highlights: [H('d5', KEY), H('c5', SOFT)] }),
    b({ id: 'aus4', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 c4 Bxc4 b5',
      say: "Black lunges …c4 to hit your bishop, then …b5 to hit it again — but here's where accuracy pays off. You just take: Bxc4 pockets the pawn, and after …b5 you're ready to gobble that one too. See what happened? His queenside pawns charged forward and turned into targets, not attackers.",
      sayShort: "Bxc4 — take the pawn, stay accurate.",
      highlights: [H('c4', ATK), H('b5', ATK)] }),
    b({ id: 'aus5', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 c4 Bxc4 b5 Nxb5 Nxe4 Qe1 Nac5',
      say: "Nxb5 collects the second pawn; Black's only shot is …Nxe4, but Qe1 calmly holds everything and wins it straight back. When the smoke clears, you're a clean pawn up, the big centre still towering, the safer king. His whole counterattack spent itself into thin air — and that's the Austrian Attack, paid in full.",
      sayShort: "Nxb5, Qe1 — a clean pawn up.",
      highlights: [H('b5', ATK), H('e4', SOFT)] }),
  ],
};
