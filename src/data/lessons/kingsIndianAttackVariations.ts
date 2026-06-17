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
  "kings-indian-attack::KIA vs QGD-Style Response": {
    openingId: "kings-indian-attack",
    sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
    title: "KIA — vs a QGD-Style Setup",
    minutes: 10,
    orientation: "white",
    beats: [
      b({ id: "kq1", moves: "Nf3 d5 g3 c5 Bg2 Nc6 O-O Nf6 d3 e6", say: "The King's Indian Attack — a complete system White can play against almost anything: Nf3, g3, the fianchetto on g2, and d3. Here Black sets up a Queen's-Gambit-style centre with …d5 and …e6. White isn't fighting for the centre yet; the whole plan is to castle, build, and storm the kingside later.", sayShort: "Bg2 — the flexible KIA system.", highlights: [H("g2", KEY)] }),
      b({ id: "kq2", moves: "Nf3 d5 g3 c5 Bg2 Nc6 O-O Nf6 d3 e6 Nbd2 Be7 e4 O-O Re1 b6 e5", say: "White completes the setup with Nbd2 and Re1, then fires the signature advance: e4-e5! The pawn clamps down on the kingside and gains space, the move that launches every KIA attack. Black is solid but suddenly cramped on the side where White wants to play.", sayShort: "e5 — the KIA space-gaining clamp.", highlights: [H("e5", KEY)] }),
      b({ id: "kq3", moves: "Nf3 d5 g3 c5 Bg2 Nc6 O-O Nf6 d3 e6 Nbd2 Be7 e4 O-O Re1 b6 e5 Nd7 Nf1 Bb7 Bf4", say: "The e5-pawn shoves the knight back to d7, and White begins the famous knight journey — Nd2-f1, heading for g3 or h2 to join the attack — while Bf4 reinforces the e5-spearhead. There is the KIA tabiya: kingside space, the e5-wedge, and the classic plan of Nf1-g3 and f4-f5 to crash through. A low-theory system that scores 60% at club level.", sayShort: "Nf1, Bf4 — reroute the knight, attack.", highlights: [H("f4", KEY), H("e5", SOFT)] }),
    ],
  },
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
