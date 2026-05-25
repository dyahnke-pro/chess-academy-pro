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

export const RETI_OPENING_VARIATION_LESSONS: Record<string, LessonScript> = {
  "reti-opening::Reti: Anti-Slav": {
  openingId: "reti-opening",
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
  title: "Réti — The Anti-Slav (...Bf5)",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "as1", moves: "Nf3 d5 c4 c6 g3 Nf6 Bg2 Bf5", say: "Against a Slav-like ...c6, Black develops his light-squared bishop actively to f5 before ...e6 can shut it in — the Anti-Slav Réti. White's plan is clear: challenge the centre with cxd5 and lean on the d5-pawn and the queenside with a quick Qb3 and the g2-bishop.", sayShort: "…Bf5 — the active Anti-Slav bishop.", highlights: [H("f5", KEY), H("d5", SOFT)] }),
    b({ id: "as2", moves: "Nf3 d5 c4 c6 g3 Nf6 Bg2 Bf5 cxd5 cxd5 Qb3 Qb6 Qxb6 axb6", say: "cxd5 cxd5 Qb3 Qb6 Qxb6 axb6 — White invites the queen trade with Qb3, which hits both the b6-square and the d5-pawn. After the swap Black is saddled with doubled b-pawns, a small but permanent structural weakness on the queenside that White will play against for the rest of the game.", sayShort: "Qb3 — trade into Black's doubled b-pawns.", highlights: [H("b6", KEY), H("d5", SOFT)] }),
    b({ id: "as3", moves: "Nf3 d5 c4 c6 g3 Nf6 Bg2 Bf5 cxd5 cxd5 Qb3 Qb6 Qxb6 axb6 Nc3 Nc6 d3 e6 O-O Bc5 Bf4 O-O", say: "Nc3 Nc6 d3 e6 O-O Bc5 Bf4 O-O — White develops harmoniously, the dark-squared bishop landing on f4 to rake toward c7 and the weak queenside. This is the Anti-Slav verdict: White has the healthier structure and easy pressure on the doubled b-pawns, a pleasant, risk-free endgame edge — exactly how Giri beat Aronian.", sayShort: "Bf4 — press c7 and the doubled pawns.", arrows: [A("f4", "c7", ATK)], highlights: [H("c7", KEY)] }),
  ],
},
};
