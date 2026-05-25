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

export const ENGLISH_OPENING_LESSON: LessonScript = {
  openingId: "english-opening",
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/English_Opening'],
  title: "The English Opening — A Master Class",
  minutes: 13,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "c4 e5 Nc3 Nf6 Nf3 Nc6 g3", say: "The English — 1.c4, the flexible, positional flank opening of Botvinnik and Kramnik. When Black answers in the centre with e5, White treats it as a reversed Sicilian: a Sicilian Dragon played with an extra tempo and the colours flipped. g3 prepares the kingside fianchetto, and the bishop will rake the long diagonal while White presses on the queenside, exactly as Black does in the Dragon — only a move ahead.", sayShort: "g3 — the reversed-Dragon fianchetto.", highlights: [H("g3", KEY), H("e5", SOFT)] }),
    b({ id: "d5", moves: "c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6", say: "d5 cxd5 Nxd5 Bg2 Nb6 — Black strikes in the centre and White recaptures, completing the fianchetto. The bishop on g2 is the soul of the English, bearing down the long light diagonal toward Black's queenside. With the extra tempo, White's reversed-Dragon setup is simply a better version of a known, respected system.", sayShort: "Bg2 — the long-diagonal English bishop.", highlights: [H("g2", KEY)] }),
    b({ id: "castle", moves: "c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7", say: "O-O Be7 — White castles into safety, the g2-bishop already eyeing the long diagonal. Nothing is forced here; the English is a manoeuvring opening where small advantages accumulate, and White's plan is thematic: expand on the queenside where the play naturally flows.", sayShort: "O-O — safe king, manoeuvring game.", highlights: [H("g2", KEY)] }),
    b({ id: "expand", moves: "c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 a3 O-O b4", say: "a3 O-O b4 — the reversed-Dragon plan in action. White gains queenside space with a3 and b4, preparing to roll the pawns forward with b5. This is the exact mirror of Black's Dragon queenside attack — but White, a tempo up, gets there first.", sayShort: "a3 b4 — the queenside pawn expansion.", highlights: [H("b4", KEY)] }),
    b({ id: "close", moves: "c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 a3 O-O b4 Be6 Rb1 f6 d3", say: "Be6 Rb1 f6 d3 — White lines the rook up on the b-file behind the b4-pawn, props the centre with d3, and prepares b5 to crack open Black's queenside. That is the reversed Sicilian in essence: a Dragon with an extra move, pressing on the wing where your majority lies. The other tabs show the Symmetrical double-fianchetto and the sharp Mikenas Attack.", sayShort: "Rb1 — back the b-pawn, prepare b5.", arrows: [A("b1", "b4", VIS)], highlights: [H("b4", KEY)] }),
  ],
};
