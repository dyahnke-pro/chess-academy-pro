import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
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

export const RETI_OPENING_LESSON: LessonScript = {
  openingId: "reti-opening",
  title: "The Réti Opening — A Master Class",
  minutes: 12,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "Nf3 d5 c4 e6 g3", say: "The Réti — Nf3 and c4 with a kingside fianchetto, the hypermodern opening named for Richard Réti, who used it to hand Capablanca his first loss in eight years. White does NOT rush to occupy the centre with pawns; instead he controls it from afar with the fianchettoed bishop and pressures d5 from the flank, inviting Black to overextend.", sayShort: "g3 — the hypermodern Réti fianchetto.", highlights: [H("g3", KEY), H("d5", SOFT)] }),
    b({ id: "dbl", moves: "Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2", say: "Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 — the double fianchetto, the signature Réti structure. Both bishops rake the long diagonals: g2 cuts across to Black's queenside, and the dark-squared bishop on b2 stares down the long dark diagonal toward f6 and the kingside. White builds a flexible, pressure-based position with no committal pawns in the centre.", sayShort: "Bb2 — the double-fianchetto Réti.", arrows: [A("b2", "f6", VIS)], highlights: [H("g2", KEY), H("b2", SOFT)] }),
    b({ id: "center", moves: "Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6 e3 b6 Nc3 Bb7", say: "Nc6 e3 b6 Nc3 Bb7 — both sides complete the hypermodern setup, Black mirroring with his own queenside fianchetto on b7. The position is a tense, manoeuvring battle of long-diagonal bishops where the timing of the central break, not brute force, decides everything.", sayShort: "Bb7 — both fianchetto, the tension builds.", highlights: [H("b7", KEY)] }),
    b({ id: "break", moves: "Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6 e3 b6 Nc3 Bb7 cxd5 Nxd5 Nxd5 Qxd5 d4", say: "cxd5 Nxd5 Nxd5 Qxd5 d4! — there it is. With every piece ideally placed, White finally strikes in the centre. That is the Réti philosophy in one move: prepare patiently from the flanks, then break with d4 exactly when it gains the most, opening lines for the two raking bishops. The other tab shows the ...Bf5 Anti-Slav.", sayShort: "d4! — the patient central break, at last.", highlights: [H("d4", KEY)] }),
  ],
};
