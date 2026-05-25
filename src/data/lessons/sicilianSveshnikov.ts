import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_svesh-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
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

export const SICILIAN_SVESHNIKOV_LESSON: LessonScript = {
  openingId: "sicilian-sveshnikov",
  title: "The Sicilian Sveshnikov — A Master Class",
  minutes: 9,
  orientation: "black",
  beats: [
    b({ id: "svesh-born", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5", say: "The Sveshnikov — once dismissed as anti-positional, now a main weapon at every level. With e5 Black kicks the d4-knight and stakes a bold claim: I will accept a hole on d5 and a backward d-pawn, and in return I take the bishop pair, piece activity, and the thundering f5 break.", sayShort: "e5 — claim activity for the d5 hole.", highlights: [H("e5", KEY), H("d5", SOFT)] }),
    b({ id: "nb5", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6", say: "The knight leaps to b5, eyeing the d6 and c7 squares, and Black must spend a move on d6 to deny it. This is the price of e5 — a slightly loose d6-pawn — but the b5-knight has nowhere stable to land and will soon be chased to the rim.", sayShort: "d6 stops the knight hitting c7.", arrows: [A("b5", "c7", ATK), A("b5", "d6", ATK)] }),
    b({ id: "chase", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5", say: "Bg5 pins the f6-knight and leans on d5; Black calmly plays a6, chasing the b5-knight to the miserable a3-square, then b5 grabs queenside space and pens the offside knight in. With each move Black's pieces come alive.", sayShort: "a6 and b5 — chase the knight to a3.", highlights: [H("a3", KEY), H("b5", KEY)] }),
    b({ id: "nd5", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6", say: "White plants the knight on the d5-hole — the position's defining feature. But Black is unfazed: after the bishops trade on f6, the dark-squared bishop sits on f6 raking toward White's queenside, and Black owns the bishop pair with a clear plan.", sayShort: "Nd5 lands; the f6-bishop eyes the dark squares.", highlights: [H("d5", KEY), H("f6", KEY)] }),
    b({ id: "plan", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2 Bg5", say: "White supports the centre with c3 and reroutes the knight to c2 to fight for the dark squares; Black castles and swings the bishop to g5, preparing the f5 break. The battle is set: White nurses the d5-outpost, Black strikes with f5 and unleashes the two bishops.", sayShort: "Bg5 and f5 — Black's bishops and break.", highlights: [H("g5", KEY), H("f5", SOFT)] }),
    b({ id: "verdict", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2 Bg5", say: "This is the Sveshnikov's bargain: hand White the d5-square, and in return take the bishop pair, the half-open c-file, and the thundering f5 break. For decades it was called unsound; today it is one of Black's most trusted answers to the king's-pawn, precisely because the activity outweighs the hole.", sayShort: "Activity and f5 outweigh the d5 hole.", highlights: [H("d5", KEY), H("f5", SOFT)] }),
  ],
};
