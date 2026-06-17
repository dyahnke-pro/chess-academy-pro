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
  "kings-indian-attack::KIA vs French Structure": {
    openingId: "kings-indian-attack",
    sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
    title: "KIA — vs a French Structure",
    minutes: 10,
    orientation: "white",
    beats: [
      b({ id: "kf1", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 Nc6 g3", say: "The King's Indian Attack against a French-style …e6/…d5 — White declines to fight for the centre with d4 and instead plays a reversed King's Indian: d3, Nd2, Ngf3 and the g3 fianchetto. One complete, low-theory plan that works against almost anything Black builds.", sayShort: "g3 — the reversed-KID system.", highlights: [H("d3", KEY)] }),
      b({ id: "kf2", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 Nc6 g3 dxe4 dxe4 Bc5 Bg2 e5 O-O O-O", say: "Black trades …dxe4 and stakes the centre with …e5; White fianchettoes and castles. The structure is now a reversed King's Indian, and White's plan is crystal clear — Nc4 to pressure e5, then expansion on the wings.", sayShort: "…e5 — Black takes the centre.", highlights: [H("e5", KEY)] }),
      b({ id: "kf3", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 Nc6 g3 dxe4 dxe4 Bc5 Bg2 e5 O-O O-O c3 a5 Qc2 b6 Nc4 Ba6", say: "White prepares with c3 and Qc2, then leaps Nc4 — hitting the e5-pawn and heading for d6; Black answers …b6 and …Ba6 to challenge it. There is the tabiya: a balanced reversed-KID where White has the clearer plan — pressure on e5, the knight tour, and kingside expansion behind the fianchetto. Easy, system-based play.", sayShort: "Nc4 — pressure e5, the clear plan.", highlights: [H("c4", KEY), H("e5", SOFT)] }),
    ],
  },
  "kings-indian-attack::KIA: Botvinnik Setup": {
    openingId: "kings-indian-attack",
    sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
    title: "KIA — The Botvinnik Setup",
    minutes: 10,
    orientation: "white",
    beats: [
      b({ id: "kb1", moves: "Nf3 d5 g3 c5 Bg2 Nc6 O-O e5 d3", say: "The KIA Botvinnik setup — White fianchettoes and lets Black build a broad pawn centre with …d5, …c5 and …e5. The flexible d3 keeps the powder dry: White's plan is to lock the centre with e4 and then manoeuvre on the wings behind the wall.", sayShort: "Bg2, d3 — invite the big centre.", highlights: [H("g2", KEY)] }),
      b({ id: "kb2", moves: "Nf3 d5 g3 c5 Bg2 Nc6 O-O e5 d3 Nf6 Nbd2 Be7 e4 d4 Nc4", say: "White slams the door with e4; Black clamps with …d4, and White springs Nc4 — the knight hits e5 and eyes the juicy d6- and b6-squares. With the centre locked, White has all the time in the world to manoeuvre.", sayShort: "e4, Nc4 — lock the centre, reroute.", highlights: [H("c4", KEY), H("d4", SOFT)] }),
      b({ id: "kb3", moves: "Nf3 d5 g3 c5 Bg2 Nc6 O-O e5 d3 Nf6 Nbd2 Be7 e4 d4 Nc4 Qc7 a4 O-O Nh4 Be6 b3 a6", say: "White grabs queenside space with a4 and b3 and swings Nh4 toward the f5-outpost — the classic KIA kingside lever. There is the Botvinnik tabiya: the locked centre, knights aimed at both wings, and a clean plan that scores 56% at club. A pleasant, low-theory pull.", sayShort: "Nh4, a4 — both wings, the KIA squeeze.", highlights: [H("h4", KEY), H("a4", SOFT)] }),
    ],
  },
  "kings-indian-attack::KIA: Fischer Attack": {
    openingId: "kings-indian-attack",
    sources: ['concept:att-kingside-storm', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
    title: "KIA — The Fischer Attack",
    minutes: 10,
    orientation: "white",
    beats: [
      b({ id: "fi1", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O", say: "The Fischer Attack — Bobby Fischer's favourite KIA handling against …e6/…d5. White builds the fianchetto system and both sides castle, but White has one ruthless plan in mind: a direct pawn storm against the black king.", sayShort: "O-O — set up the Fischer storm.", highlights: [H("d5", SOFT)] }),
      b({ id: "fi2", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1", say: "White fires the defining advance e5! — the space-gaining wedge that cramps Black and shoves the f6-knight back to d7 — then begins the famous Nf1-g3/h2 reroute toward the kingside. Black expands on the other wing with …b5.", sayShort: "e5, Nf1 — the wedge and the reroute.", highlights: [H("e5", KEY)] }),
      b({ id: "fi3", moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7 Nf1 a5 h4 b4", say: "White launches the storm with h4 — heading for h5 and the knight for f5 — while Black races on the queenside with …a5-b4. There is the Fischer tabiya: opposite-wing pawn storms where White's attack, fed by the e5-wedge and the h-pawn, crashes into the king first. Sharp and plan-rich, scoring 51% at club.", sayShort: "h4 — the kingside storm rolls.", highlights: [H("h4", KEY), H("e5", SOFT)] }),
    ],
  },
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
