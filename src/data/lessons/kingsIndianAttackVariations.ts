import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): YELLOW highlights (a key square
// the narration names), SOFT BLUE (secondary context). Move squares are
// auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const KINGS_INDIAN_ATTACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  "kings-indian-attack::KIA vs KID-Style Response": {
  openingId: "kings-indian-attack",
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
  title: "King's Indian Attack — vs the ...g6 Response",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "k1", moves: "Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 e5", say: "When Black mirrors the fianchetto with ...g6 and stakes the centre with ...e5, the King's Indian Attack changes gears. The solid ...g6 shield blunts the usual kingside storm, so White turns instead to the centre and the queenside — the system's great strength is exactly this flexibility.", sayShort: "…g6 …e5 — Black takes the solid route.", highlights: [H("e5", KEY)] }),
    b({ id: "k2", moves: "Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 e5 e4 Nc6 c3 h6 b4", say: "e4 Nc6 c3 h6 b4 — White stakes the centre with e4 and expands on the queenside with c3 and b4. Against the rock-solid ...g6 setup this is the right idea: grab space on the side where Black is not looking, rather than batter the well-defended king.", sayShort: "e4 b4 — stake the centre, expand queenside.", highlights: [H("e4", KEY), H("b4", SOFT)] }),
    b({ id: "k3", moves: "Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 e5 e4 Nc6 c3 h6 b4 Be6 b5 Ne7 d4", say: "Be6 b5 Ne7 d4! — White gains more queenside room with b5 and then breaks in the centre with d4, opening lines for the fianchettoed bishop and the rooks. This central break against the KID structure is how White converts the space edge into real activity.", sayShort: "b5 d4! — gain space, then break the centre.", highlights: [H("d4", KEY)] }),
    b({ id: "k4", moves: "Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 e5 e4 Nc6 c3 h6 b4 Be6 b5 Ne7 d4 exd4 cxd4 Qd7 Qe2", say: "exd4 cxd4 Qd7 Qe2 — White recaptures toward the centre, building a broad d4-and-e4 pawn duo with the bishops and rooks springing to life. The KID-style KIA tabiya: White owns the central space and the more active pieces, a comfortable and flexible pull — the universal system delivering once again.", sayShort: "cxd4 — the broad d4/e4 centre, easy pull.", highlights: [H("d4", KEY), H("e4", SOFT)] }),
  ],
},
};
