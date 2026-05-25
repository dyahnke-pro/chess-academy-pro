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

export const EVANS_GAMBIT_LESSON: LessonScript = {
  openingId: "evans-gambit",
  sources: ['book:evans-gambit', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  title: "The Evans Gambit — A Master Class",
  minutes: 13,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4", say: "The Evans Gambit — 4.b4!, one of the most romantic weapons in all of chess, the favourite of Morphy and Anderssen and famously revived by Kasparov. White throws away the b-pawn for one purpose: to gain time hitting the c5-bishop, build a massive centre with c3 and d4, and unleash a ferocious attack. The bishop on c4 already glares at f7, the eternal soft spot.", sayShort: "b4! — the romantic Evans Gambit.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY), H("c5", SOFT)] }),
    b({ id: "accept", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4", say: "Bxb4 c3 Ba5 d4! — Black grabs the pawn, White kicks the bishop with tempo and slams d4 into the centre. This is the gambit's whole point: two tempi and a towering pawn centre for the price of a single pawn. Black's pieces get shoved around while White's come pouring out with threats.", sayShort: "c3 d4! — gain the tempo and the centre.", highlights: [H("d4", KEY)] }),
    b({ id: "attack", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 Ng5", say: "exd4 O-O Nge7 Ng5! — White castles straight into the attack and the knight leaps to g5. Now TWO pieces — the c4-bishop and the g5-knight — train their fire on f7. The development lead has become a concrete, screaming threat against the king's most vulnerable square.", sayShort: "O-O Ng5! — pile onto f7.", arrows: [A("c4", "f7", ATK), A("g5", "f7", ATK)], highlights: [H("f7", KEY)] }),
    b({ id: "center", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 Ng5 d5 exd5 Ne5 Qxd4", say: "d5 exd5 Ne5 Qxd4 — Black throws material back to blunt the attack, and White's queen recaptures, centralised on d4, dominating the board and eyeing the knight on e5. Even when Black returns the pawn, White is left with the initiative and the more active pieces — exactly what the gambit was paying for.", sayShort: "Qxd4 — the centralised queen dominates.", arrows: [A("d4", "e5", ATK)], highlights: [H("d4", KEY)] }),
    b({ id: "close", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 Ng5 d5 exd5 Ne5 Qxd4 f6 Re1 Bb6 Qh4 Nxc4 Qxc4", say: "f6 Re1 Bb6 Qh4 Nxc4 Qxc4 — the Evans Accepted tabiya: White has the initiative, the active pieces, and lasting pressure for the pawn. That is the Evans in one breath — sacrifice the b-pawn, seize the centre with c3-d4, and storm f7 and the king. The other tabs show the Declined, the wild Compromised Defence, and Lasker's cool-headed antidote.", sayShort: "Qxc4 — the initiative is worth the pawn.", highlights: [H("f7", KEY)] }),
  ],
};
