import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
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

export const KINGS_INDIAN_ATTACK_LESSON: LessonScript = {
  openingId: "kings-indian-attack",
  title: "The King's Indian Attack — A Master Class",
  minutes: 13,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "e4 e6 d3 d5 Nd2", say: "The King's Indian Attack — White sets up a King's Indian formation with the colours reversed and an extra tempo. d3, Nd2, g3, Bg2, O-O: a universal system you can wheel out against the French, the Sicilian, the Caro and more. The whole plan points one way — the e4-e5 thrust and a kingside attack on the castled black king.", sayShort: "d3 Nd2 — the King's Indian Attack setup.", highlights: [H("e4", KEY)] }),
    b({ id: "setup", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1", say: "Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 — the full KIA pyramid is built, the rook on e1 backing the coming e5-push. Black grabs queenside space with c5, but White serenely ignores the wing and looks toward the kingside, where the real action will be.", sayShort: "Bg2 O-O Re1 — the KIA pyramid, eyeing e5.", highlights: [H("e5", KEY)] }),
    b({ id: "wedge", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1", say: "b5 e5! Nd7 Nf1 — there it is, the e5-wedge. The pawn cramps Black and shuts the door on his pieces, and the knight begins its signature journey: Nf1-h2-g4, the famous KIA attacking reroute heading for the kingside. Black plays on the queenside; the game becomes a race.", sayShort: "e5! Nf1 — the wedge; knight reroutes to g4.", highlights: [H("e5", KEY), H("g4", SOFT)] }),
    b({ id: "attack", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1 a5 h4 b4 N1h2", say: "a5 h4 b4 N1h2 — both sides storm. White's h4 and the knight on h2 prepare g4-g5 and a direct assault, the knight eyeing the g4-square. Black's queenside pawns roll the other way. This is the KIA's soul: an opposite-wing race where White's attack, aimed straight at the king, almost always arrives first.", sayShort: "h4 Nh2 — prep g4-g5, storm the king.", arrows: [A("h2", "g4", INTENT)], highlights: [H("h4", KEY)] }),
    b({ id: "close", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1 a5 h4 b4 N1h2 a4 a3 bxa3", say: "a4 a3 bxa3 — the queenside opens, but White's pieces already swarm the kingside. That is the King's Indian Attack tabiya: the e5-wedge, the Nh2-g4 maneuver, and h4-g4-g5 storming the king. A universal system with one clear, attacking plan — exactly how Giri overran Nakamura. The other tab shows the ...g6 KID-style response.", sayShort: "the e5-wedge and kingside storm decide.", highlights: [H("e5", KEY)] }),
  ],
};
