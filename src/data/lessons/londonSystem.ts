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

export const LONDON_SYSTEM_LESSON: LessonScript = {
  openingId: "london-system",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
  title: "The London System — A Master Class",
  minutes: 13,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "d4 Nf6 Nf3 d5 Bf4", say: "The London System — White's modern workhorse, the opening Carlsen, So and Gukesh wheel out against the very best. The signature is Bf4: White develops the dark-squared bishop OUTSIDE the pawn chain before e3 ever locks it in. From f4 the bishop already rakes the long b8-h2 diagonal toward c7, and White will reach the same harmonious, solid set-up against almost anything Black tries. It is a SYSTEM, not a memorised line.", sayShort: "Bf4 — the bishop out before e3.", arrows: [A("f4", "c7", ATK)], highlights: [H("f4", KEY)] }),
    b({ id: "qb6", moves: "d4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6", say: "c5 e3 Qb6 — Black's most critical try, the famous poisoned-pawn challenge to the London. The queen jabs at b2, daring White to defend the pawn and lose time. This is the line every London player must know cold, because a careless reply really does drop the b2-pawn.", sayShort: "…Qb6 — the poisoned-pawn jab at b2.", arrows: [A("b6", "b2", ATK)], highlights: [H("b2", KEY)] }),
    b({ id: "nc3", moves: "d4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6 Nc3 c4", say: "Nc3! — the elegant antidote. White ignores the threat and develops with tempo, because the b2-pawn is taboo: after Qxb2 Na4 the queen is trapped in the corner. Black grabs queenside space with c4 instead, but the initiative has already fizzled.", sayShort: "Nc3! — b2 is taboo (…Qxb2 Na4 traps).", highlights: [H("c4", KEY), H("b2", SOFT)] }),
    b({ id: "rb1", moves: "d4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6 Nc3 c4 Rb1 e6 a3", say: "Rb1 quietly tucks the rook behind the b2-pawn, ending the pin once and for all, and a3 takes the b4-square away from Black's pieces. White's position is unflustered and harmonious; the early queen sortie has gained Black nothing but a few tempi spent on the wrong side.", sayShort: "Rb1 a3 — calmly neutralise the queen raid.", highlights: [H("b2", KEY)] }),
    b({ id: "trade", moves: "d4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6 Nc3 c4 Rb1 e6 a3 Bd6 Bxd6 Qxd6 Ne5", say: "Bd6 offers to trade off White's pride and joy; White takes Bxd6 and then plants the knight on e5 — the dream central outpost, eyeing f7 and the whole kingside. A knight on e5 supported by pawns is the engine of countless London attacks.", sayShort: "Ne5 — the knight seizes its dream outpost.", arrows: [A("e5", "f7", ATK)], highlights: [H("e5", KEY), H("f7", SOFT)] }),
    b({ id: "f4", moves: "d4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6 Nc3 c4 Rb1 e6 a3 Bd6 Bxd6 Qxd6 Ne5 O-O Be2 Nc6 f4", say: "O-O Be2 Nc6 f4 — White anchors the e5-knight with f4 and prepares to roll the kingside pawns forward. The knight on e5 is now a permanent thorn that cannot be dislodged, and White has a free hand to expand against Black's king.", sayShort: "f4 — anchor the e5-knight, expand kingside.", highlights: [H("f4", KEY), H("e5", SOFT)] }),
    b({ id: "close", moves: "d4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6 Nc3 c4 Rb1 e6 a3 Bd6 Bxd6 Qxd6 Ne5 O-O Be2 Nc6 f4 a6 O-O", say: "a6 O-O and we reach the London poisoned-pawn tabiya: White owns the dominant e5-knight, the f4-pawn supporting a kingside build-up, and an easy, pleasant game; Black's early queen raid achieved nothing concrete. That is the London in one breath — Bf4 outside the chain, refuse the b2-bait, develop, plant the knight on e5, then expand. The other tabs show its faces against the King's Indian fianchetto and the sharp Jobava with Nc3.", sayShort: "O-O — the comfortable London tabiya.", highlights: [H("e5", KEY), H("f4", SOFT)] }),
  ],
};
