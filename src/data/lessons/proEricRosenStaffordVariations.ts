import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Stafford Gambit, PER-VARIATION Watch lessons (Black). Each
// spine is a line from his real chess.com corpus walked to a middlegame; each
// has a verified student-WIN model game. Two registers per beat (G5/G9.4): full
// `say` + ≤8-word `sayShort`, no move-number prefixes in spoken text. Green
// vision arrows only (never from a pawn); orange move-squares auto-painted.
// Variation NAMES here must match pro-repertoires.json exactly (the
// `${openingId}::${name}` lesson key — G9.3 Gate A).

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const OID = 'pro-ericrosen-stafford';
const SRC = [
  'concept:pos-initiative',
  'concept:att-kingside-storm',
  'https://www.chess.com/openings/Stafford-Gambit',
  'https://lichess.org/study/34oRtfLM',
  'https://api.chess.com/pub/player/imrosen/games/archives',
];

// ── 5.Nc3 — White develops the knight; we trade into an open h-file ──
// Spine from his win vs alicanelia29 (2787). After Bxg4 hxg4 the h-file is
// pried open for the rook; Be3 Bxe3 fxe3 wrecks White's kingside pawns.
const FIVE_KNIGHTS: LessonScript = {
  openingId: OID,
  title: 'Stafford — 5.Nc3 develops, the h-file opens',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nc3', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3',
      arrows: [A('c8', 'h3'), A('d8', 'd1')],
      highlights: [{ square: 'c3', color: KEY }],
      say: "Instead of d3, White develops the knight to c3. It is a sensible move, but it does nothing about our two open lines — the d-file and the c8-to-h3 diagonal. We carry on with the same plan: bishop to c5, then storm the kingside.",
      sayShort: '…vs Nc3 — same plan, open lines.',
    }),
    b({
      id: 'bc5h5', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 Be2 h5',
      arrows: [A('c5', 'f2'), A('h8', 'h3')],
      highlights: [{ square: 'f2', color: KEY }, { square: 'h5', color: KEY }],
      say: "Bishop to c5 aims at f2, and h5 again prepares the knight jump while opening the rook's file. White tucks the bishop on e2, but the h-pawn is already telling us where the game will be decided.",
      sayShort: '…Bc5, …h5 — load the kingside.',
    }),
    b({
      id: 'ng4trade', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 Be2 h5 d3 Ng4 Bxg4 hxg4',
      arrows: [A('h8', 'h2')],
      highlights: [{ square: 'g4', color: KEY }, { square: 'h2', color: KEY }],
      say: "Knight to g4, and this time White trades it off with Bxg4. We recapture with the h-pawn — and that is exactly what we wanted. The h-file is now wide open with our rook already sitting on it, and the pawn on g4 cramps White's kingside. The bishop trade did White no favours.",
      sayShort: '…hxg4 — the h-file cracks open.',
    }),
    b({
      id: 'be3', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 Be2 h5 d3 Ng4 Bxg4 hxg4 Be3 Bxe3 fxe3',
      arrows: [A('d8', 'd6')],
      highlights: [{ square: 'e3', color: KEY }, { square: 'f2', color: SOFT }],
      say: "White offers a bishop trade with Be3; we take it, and after fxe3 White's kingside pawns are a shattered mess on e3 and g3 with the king still in the middle. The queen comes to d6, ready to lift to the h-file or h2, and Black is doing all the attacking despite being a pawn down.",
      sayShort: '…Bxe3 — shatter the white pawns.',
    }),
    b({
      id: 'qd6', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 Be2 h5 d3 Ng4 Bxg4 hxg4 Be3 Bxe3 fxe3 Qd6',
      arrows: [A('d6', 'h2'), A('h8', 'h2')],
      highlights: [{ square: 'd6', color: KEY }, { square: 'h2', color: KEY }],
      say: "This is the picture to remember: the queen on d6 and the rook on the h-file both point at h2, White's pawns are wrecked, and the king cannot find a safe home. This repertoire converted this exact structure against a 2787. The pawn was never the point — the king is.",
      sayShort: '…Qd6 — queen and rook hunt h2.',
    }),
  ],
};

// ── 5.e5 — White grabs space; the knight finds e4 and the queen hits f2 ──
// Spine from his win vs IljaJoke (2480). Sharper, lower-scoring — taught honestly.
const SPACE_GRAB: LessonScript = {
  openingId: OID,
  title: 'Stafford — 5.e5 space grab, …Ne4 and …Qh4',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e5', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5',
      arrows: [A('f6', 'e4')],
      highlights: [{ square: 'e5', color: KEY }, { square: 'e4', color: SOFT }],
      say: "White plays the most ambitious move, e5, kicking our knight and grabbing space. But the pawn that advances is also a pawn that can be surrounded — and the square it leaves behind, e4, becomes a perfect home for our knight.",
      sayShort: '…vs e5 — space now, target later.',
    }),
    b({
      id: 'ne4', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4',
      arrows: [A('e4', 'f2'), A('e4', 'g3')],
      highlights: [{ square: 'e4', color: KEY }],
      say: "The knight jumps into e4 — a dream outpost in the centre, where it cannot be hit by a pawn and eyes f2 and g3. From here it supports every kingside idea we have.",
      sayShort: '…Ne4 — the central outpost.',
    }),
    b({
      id: 'qh4', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4 d4 Qh4',
      arrows: [A('h4', 'f2'), A('h4', 'd4')],
      highlights: [{ square: 'h4', color: KEY }, { square: 'f2', color: KEY }],
      say: "White expands with d4, and the queen flies to h4 — hitting f2 and pinning the air around White's king. The same f2 pressure as the main line, just reached by a different road.",
      sayShort: '…Qh4 — straight at f2 again.',
    }),
    b({
      id: 'f6', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4 d4 Qh4 Qf3 f6',
      arrows: [],
      highlights: [{ square: 'f6', color: KEY }, { square: 'e5', color: KEY }],
      say: "White defends with Qf3, so we strike at the head of the advanced pawn with f6. The e5-pawn was White's pride; now it is a target, and prying it loose opens the f-file and the centre right next to White's stranded king.",
      sayShort: '…f6 — undermine the e5-pawn.',
    }),
    b({
      id: 'bb4', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4 d4 Qh4 Qf3 f6 Nc3 Bb4',
      arrows: [A('b4', 'c3')],
      highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: KEY }],
      say: "When White finally develops with Nc3, the bishop pins it from b4. Every piece is in the attack, the e5-pawn is falling, and White still has not castled. Be honest: this line scores a touch lower for this repertoire, so play it for the initiative, not for a guaranteed win — but the practical pressure is real.",
      sayShort: '…Bb4 — pin, and pile in.',
    }),
  ],
};

// ── 4.Nf3 retreat — the equalizing decline; we just regain the pawn ──
// Spine from his win vs RestartingChess (2796). Honest: this is the quiet,
// roughly equal Petroff — Black is comfortable, no gambit fireworks needed.
const KNIGHT_RETREAT: LessonScript = {
  openingId: OID,
  title: 'Stafford — 4.Nf3 retreat, the quiet equalizer',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nf3', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nf3',
      arrows: [A('f6', 'e4')],
      highlights: [{ square: 'f3', color: KEY }, { square: 'e4', color: KEY }],
      say: "Sometimes White takes on e5 and then, seeing the Stafford coming, simply retreats the knight to f3 rather than grabbing a second time on c6. This is the safe choice — and it lets us calmly take back the pawn.",
      sayShort: '…vs Nf3 — the safe retreat.',
    }),
    b({
      id: 'nxe4', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nf3 Nxe4',
      highlights: [{ square: 'e4', color: KEY }],
      say: "We recapture on e4. Material is level again, both sides have a knight in the centre, and we have the easy, harmonious development that the Petroff is famous for. No gambit, no risk — just a comfortable, equal game where our pieces come out naturally.",
      sayShort: '…Nxe4 — pawn back, equal game.',
    }),
    b({
      id: 'd5', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nf3 Nxe4 Nc3 d5',
      arrows: [],
      highlights: [{ square: 'd5', color: KEY }],
      say: "When White challenges with Nc3, we support the strong knight with d5 — a wall of central pawns and a knight White cannot easily dislodge. This is textbook, solid, and exactly how to neutralise a White player who refuses the gambit.",
      sayShort: '…d5 — prop the centre knight.',
    }),
    b({
      id: 'develop', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nf3 Nxe4 Nc3 d5 Bb5 Bb4 O-O O-O',
      arrows: [A('b4', 'c3'), A('c8', 'g4')],
      highlights: [{ square: 'b4', color: KEY }, { square: 'g8', color: SOFT }],
      say: "We pin with Bb4, both sides castle, and the position is dead level with chances for both. The lesson here is restraint: when White declines the gambit correctly, do not force the attack — just develop, equalise, and outplay them later. This repertoire beat a 2796 from exactly this calm structure.",
      sayShort: '…Bb4, castle — equal and easy.',
    }),
  ],
};

// ── 3.Nc3 Four Knights decline — his BEST scorer (68%): the …Bc5 setup ──
// Spine from his win vs wonderfultime (3165). White never takes on e5; we go
// straight for the Italian-style …Bc5, eyeing f2, and trade the dark bishops.
const FOUR_KNIGHTS: LessonScript = {
  openingId: OID,
  title: 'Stafford — 3.Nc3 Four Knights, the …Bc5 weapon',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nc3', moves: 'e4 e5 Nf3 Nf6 Nc3',
      arrows: [A('f8', 'c5')],
      highlights: [{ square: 'c3', color: KEY }, { square: 'c5', color: SOFT }],
      say: "The cleanest way for White to dodge the gambit is to never take on e5 at all — Nc3, the Four Knights. We do not copy with the symmetric knight move; we play in Stafford spirit and develop the bishop straight toward f2. This is this repertoire's highest-scoring line of the whole complex.",
      sayShort: '…vs Nc3 — Bc5, not symmetry.',
    }),
    b({
      id: 'bc5', moves: 'e4 e5 Nf3 Nf6 Nc3 Bc5 Bc4 d6',
      arrows: [A('c5', 'f2'), A('c4', 'f7')],
      highlights: [{ square: 'f2', color: KEY }, { square: 'd6', color: SOFT }],
      say: "Bishop to c5 — pointed at f2, exactly as in the gambit. White mirrors with Bc4 aiming at our f7, and we shore it up with d6, opening a path for our own light bishop. The position is balanced and rich, an Italian-style middlegame where we know the f2 ideas and our opponent often does not.",
      sayShort: '…Bc5, …d6 — Italian with bite.',
    }),
    b({
      id: 'develop', moves: 'e4 e5 Nf3 Nf6 Nc3 Bc5 Bc4 d6 h3 Nc6 d3 a6',
      arrows: [],
      highlights: [{ square: 'c6', color: KEY }, { square: 'a6', color: SOFT }],
      say: "White plays the prophylactic h3 to deny our knight the g4-square, so we develop normally — knight to c6, a6 to keep the white bishop out of b5. Both sides are fully developed and the game is even; from here it is a fight, not a forced attack.",
      sayShort: '…Nc6, …a6 — develop and fight.',
    }),
    b({
      id: 'trade', moves: 'e4 e5 Nf3 Nf6 Nc3 Bc5 Bc4 d6 h3 Nc6 d3 a6 Be3 h6 O-O Bxe3 fxe3',
      arrows: [A('c8', 'e6')],
      highlights: [{ square: 'e3', color: KEY }, { square: 'f7', color: SOFT }],
      say: "When White offers the dark-squared bishops with Be3, we trade — and after fxe3 it is WHITE's pawns that end up doubled and weak on e3 and the kingside, while Black's structure stays clean. This repertoire ground this structure down against a 3165. The Four Knights is sound, equal, and his most reliable scorer.",
      sayShort: '…Bxe3 — double the white pawns.',
    }),
  ],
};

// ── 4.d4 — White returns the pawn; …Nxe5/…Nxe4 and the knight tours ──
// Spine from his win vs AlmasRakhmatullaev (2982). White recaptures with d4
// instead of Nxc6; Black regains the pawn with an active knight and an early lead.
const PAWN_RETURNED: LessonScript = {
  openingId: OID,
  title: 'Stafford — 4.d4, White gives the pawn back',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd4', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 d4',
      arrows: [A('c6', 'e5')],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: KEY }],
      say: "Here White grabs on e5 but, instead of trading on c6, props the knight with d4. White is trying to keep the extra pawn and stay solid — but the knight on e5 is now loose, and we hit it at once.",
      sayShort: '…vs d4 — the e5-knight is loose.',
    }),
    b({
      id: 'nxe5', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 d4 Nxe5 dxe5 Nxe4',
      arrows: [A('e4', 'f2'), A('e4', 'c3')],
      highlights: [{ square: 'e4', color: KEY }],
      say: "We take the knight, White recaptures with the pawn, and then we snap up the e4-pawn with our own knight. Material is level, and our knight sits proudly in the centre on e4 — active, central, and impossible to chase with a pawn.",
      sayShort: '…Nxe4 — level, knight on e4.',
    }),
    b({
      id: 'nc5', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 d4 Nxe5 dxe5 Nxe4 Bd3 Nc5',
      arrows: [A('c5', 'd3')],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd3', color: KEY }],
      say: "White develops the bishop to d3 to challenge our knight, so the knight hops to c5, attacking it. Wherever White's bishop goes we are happy — we have equalised effortlessly and our pieces are the more active.",
      sayShort: '…Nc5 — hit the d3-bishop.',
    }),
    b({
      id: 'd6', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 d4 Nxe5 dxe5 Nxe4 Bd3 Nc5 O-O Nxd3 Qxd3 d6',
      arrows: [],
      highlights: [{ square: 'd6', color: KEY }, { square: 'e5', color: KEY }],
      say: "We trade the knight for the good bishop, castle is met, and then d6 strikes at the e5-pawn — White's last bit of central pride. The pawn falls or White concedes the centre, and Black emerges comfortable to better. This repertoire used this to beat a 2982; declining the gambit with d4 simply hands us an easy game.",
      sayShort: '…d6 — break the e5-pawn, equalise.',
    }),
  ],
};

export const PRO_ERICROSEN_STAFFORD_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Five Knights (5.Nc3)`]: FIVE_KNIGHTS,
  [`${OID}::Space Grab (5.e5)`]: SPACE_GRAB,
  [`${OID}::Knight Retreat (4.Nf3)`]: KNIGHT_RETREAT,
  [`${OID}::Four Knights Decline (3.Nc3)`]: FOUR_KNIGHTS,
  [`${OID}::Pawn Returned (4.d4)`]: PAWN_RETURNED,
};
