import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const CATALAN_OPENING_LESSON: LessonScript = {
  openingId: "catalan-opening",
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
  title: "The Catalan — A Master Class",
  minutes: 13,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "d4 Nf6 c4 e6 g3 d5 Bg2", say: "The Catalan — d4 and c4 combined with a kingside fianchetto, a favourite weapon of Kramnik, Carlsen and Ding. The soul of the opening is the bishop on g2: it rakes the long light diagonal, bearing down through d5 toward Black's queenside, and it will exert quiet, relentless pressure for the entire game. White accepts a slightly slower setup in return for a long-term positional bind.", sayShort: "Bg2 — the long-diagonal Catalan bishop.", arrows: [A("g2", "d5", ATK)], highlights: [H("g2", KEY)] }),
    b({ id: "dxc4", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6", say: "dxc4 — Black grabs the c4-pawn: the Open Catalan. White is in no hurry to recapture. Black tries to cling to the extra pawn with a6 and a coming ...b5, but in the Catalan that pawn is never truly won — White's lead in development and the g2-bishop's pressure are worth far more than a single pawn.", sayShort: "…dxc4 — the Open Catalan pawn grab.", highlights: [H("c4", KEY), H("a6", SOFT)] }),
    b({ id: "develop", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2", say: "O-O Nc6 e3 Bd7 Qe2 — White simply develops and bides his time, the queen on e2 lining up behind the centre and preparing the pawn-recovery break. There is no panic and no chase: the Catalan player trusts the position, not the material count.", sayShort: "Qe2 — develop calmly, prepare to recover c4.", highlights: [H("e3", KEY), H("c4", SOFT)] }),
    b({ id: "b3", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 b5 b3", say: "b5 b3! — Black props the pawn with b5, and White strikes at its base with b3. This is the standard method: undermine the c4-pawn rather than capture it directly, and the whole queenside structure begins to crack in White's favour.", sayShort: "b3! — strike the base of the c4-pawn.", highlights: [H("b3", KEY), H("c4", SOFT)] }),
    b({ id: "regain", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 b5 b3 cxb3 axb3 Be7 Bb2", say: "cxb3 axb3 Be7 Bb2 — the pawn returns, and now look at what White has built: the half-open a-file pointing at Black's queenside, the two bishops, and the dark-squared bishop joining its partner aiming toward b7. The pawn was only ever borrowed; White collects it with interest.", sayShort: "Bb2 — recover the pawn, bishops eye b7.", highlights: [H("b2", KEY), H("b7", SOFT)] }),
    b({ id: "close", moves: "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 b5 b3 cxb3 axb3 Be7 Bb2 O-O Rc1", say: "O-O Rc1 and we reach the Open Catalan tabiya: White has fully regained the pawn and emerged with the bishop pair, pressure down the c- and a-files, and the famous g2-bishop bearing on the queenside. This is the Catalan in one breath — fianchetto, let Black take c4, undermine and recover it, then squeeze with the two bishops. The other tabs show the solid Closed Catalan and the Slav move-order.", sayShort: "Rc1 — the Open Catalan squeeze.", highlights: [H("c1", KEY)] }),
  ],
};
