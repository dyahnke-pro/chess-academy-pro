import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
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

export const LONDON_SYSTEM_VARIATION_LESSONS: Record<string, LessonScript> = {
  "london-system::London vs King's Indian": {
  openingId: "london-system",
  title: "London System — vs the King's Indian Fianchetto",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "k1", moves: "d4 Nf6 Nf3 g6 Bf4", say: "Against the King's Indian and Grünfeld set-ups, the London is utterly unbothered. Black plays g6 to fianchetto; White just builds the same pyramid. The bishop on f4 stakes the dark squares and rakes toward c7 — refusing Black the dark-square play his whole fianchetto is built around.", sayShort: "Bf4 vs g6 — claim the dark squares.", arrows: [A("f4", "c7", ATK)], highlights: [H("f4", KEY)] }),
    b({ id: "k2", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3", say: "Bg7 e3 d6 h3 — the granite London wall. The pawn on d4 is propped by e3 and soon c3, and h3 takes the g4-square away from Black's pieces. The fianchettoed bishop on g7 glares down the long diagonal, but it simply bites on granite.", sayShort: "e3 h3 — the granite London wall.", highlights: [H("g7", KEY), H("d4", SOFT)] }),
    b({ id: "k3", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3 c5 Be2 Qb6 Qc1", say: "c5 Be2 Qb6 Qc1 — Black probes with c5 and lunges with Qb6, hitting the b2-pawn. Qc1 is the calm reply: it defends b2 and keeps the bishop's diagonal intact. As in the main line, the queen sortie finds no real target.", sayShort: "Qc1 — calmly defend b2.", arrows: [A("b6", "b2", ATK)], highlights: [H("b2", KEY)] }),
    b({ id: "k4", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3 c5 Be2 Qb6 Qc1 O-O O-O Nc6 c3 Be6 Nbd2", say: "O-O O-O Nc6 c3 Be6 Nbd2 — both castle and develop, White completing the set-up with c3 and the knight to d2. This is the heart of the variation: a slow manoeuvring battle where White's rock-solid structure and easy development give a comfortable, risk-free game.", sayShort: "c3 Nbd2 — solid, easy development.", highlights: [H("c3", KEY)] }),
    b({ id: "k5", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3 c5 Be2 Qb6 Qc1 O-O O-O Nc6 c3 Be6 Nbd2 cxd4 exd4 Rac8 Re1 Rfe8 Be3", say: "cxd4 exd4 — White recaptures toward the centre, building a broad d4-pawn centre; the rooks contest the central files and Be3 props d4. White's space and harmonious pieces give the comfortable pull that defines the anti-fianchetto London — exactly how Carlsen ground down Vachier-Lagrave.", sayShort: "exd4 Be3 — broad centre, easy pull.", highlights: [H("d4", KEY), H("e3", SOFT)] }),
  ],
},

  "london-system::Jobava London": {
  openingId: "london-system",
  title: "London System — The Jobava (Nc3) Attack",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "j1", moves: "d4 d5 Nc3 Nf6 Bf4", say: "The Jobava London — White throws in an early Nc3, the sharpest and most fashionable London of all. The knight eyes the b5-square and supports a quick e4 break, and with Bf4 already out White makes immediate threats against d5 instead of the usual slow build. This is the line Carlsen used to beat Gukesh in 2025.", sayShort: "Nc3 — the aggressive Jobava.", arrows: [A("c3", "b5", INTENT)], highlights: [H("b5", KEY), H("d5", SOFT)] }),
    b({ id: "j2", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6", say: "e6 Nb5! — the knight leaps in, eyeing the c7-fork against the king and rook and provoking concessions; Na6 has to cover c7. Already on move four White has created concrete problems, something the quiet main-line London never does.", sayShort: "Nb5! — threaten the c7-fork.", arrows: [A("b5", "c7", ATK)], highlights: [H("c7", KEY)] }),
    b({ id: "j3", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 Be7 Nf3 O-O", say: "e3 Be7 Nf3 O-O — White calmly completes the London pyramid behind the advanced pieces while both sides finish developing. The structure is the same trusty London; the difference is the extra aggression the early knight has injected.", sayShort: "e3 Nf3 — the pyramid, with bite.", highlights: [H("e3", KEY)] }),
    b({ id: "j4", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 Be7 Nf3 O-O h4 c6 Nc3 Qb6 a3", say: "h4! — the signature Jobava kingside lunge, gaining space and threatening h5 and Bf4-g5 ideas against the king. The knight drops back to c3 and a3 anchors it. This is sharp, attacking chess the slow London simply cannot offer.", sayShort: "h4! — the Jobava kingside lunge.", highlights: [H("h4", KEY)] }),
    b({ id: "j5", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 Be7 Nf3 O-O h4 c6 Nc3 Qb6 a3 c5 Ne5 Bd7 Rh3", say: "c5 Ne5 Bd7 Rh3 — Black challenges the centre, White plants the knight on its dream e5-square eyeing f7, and then Rh3 — the rook lift! — swings the rook to the third rank, aiming at the kingside. That is the whole appeal of the Jobava: a familiar London structure carrying a genuine, dangerous attack.", sayShort: "Ne5, Rh3 — the rook lift attacks.", arrows: [A("e5", "f7", ATK)], highlights: [H("f7", KEY), H("h3", SOFT)] }),
  ],
},
};
