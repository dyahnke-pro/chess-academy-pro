import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — English Opening, PER-VARIATION Watch lessons.
// Board-accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.
// The …e6 and …c5 variation spines are walked a few moves past the short
// repertoire stub into a genuine middlegame (standard English development).

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/English-Opening',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Botvinnik System vs KID-setup — the big centre + g4 storm ──
const BOTVINNIK: LessonScript = {
  openingId: 'pro-gothamchess-english',
  title: 'English — Botvinnik System vs KID-setup',
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'centre',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7',
      arrows: [{ from: 'e2', to: 'e4', color: VIS }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'e4', color: KEY }, { square: 'd4', color: KEY }],
      say:
        "This repertoire's main English — 1,597 games at 62%. Against Black's King's-Indian setup you grab the WHOLE centre: c4, e4, and d4, the Botvinnik wall. Black fianchettoes the bishop to g7, eyeing the long diagonal. You have the space; he has the counterpunch.",
      sayShort: 'c4-e4-d4 — the Botvinnik wall.',
    }),
    b({
      id: 'd5',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5',
      arrows: [{ from: 'd4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "You develop calmly with Be2 and Be3; Black strikes with the standard …e5 break. You answer d5, locking the centre. And that's the whole point — with a closed centre, the game is decided on the WINGS. Black pushes on the queenside; you storm the kingside.",
      sayShort: 'd5 — lock it, play the wings.',
    }),
    b({
      id: 'mg-g4',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4 Na6',
      arrows: [{ from: 'g2', to: 'g4', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'g5', color: SOFT }],
      say:
        "Black grabs queenside space with a5; you answer on the other wing with g4 — the kingside storm is on. Because the centre is bolted shut, this is completely safe: there's no central counter-blow. The plan from here is brutally simple — roll g4-h4-g5-h5 to rip open the files in front of Black's king, lift a rook, and pour everything in. You win the race because you attack the king.",
      sayShort: 'g4 — the kingside avalanche.',
    }),
  ],
};

// ── Symmetric …e5 (English Reversed) — White wins the bishop pair ──
const SYM_E5: LessonScript = {
  openingId: 'pro-gothamchess-english',
  title: 'English — Symmetric …e5 (Reversed Sicilian)',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4',
      highlights: [{ square: 'e5', color: SOFT }, { square: 'b4', color: SOFT }],
      say:
        "Black mirrors you with …e5 — a Reversed Sicilian, where You get the Sicilian's chances with an extra tempo. Everyone develops naturally, and Black pins your knight with Bb4. That pin is about to become a gift.",
      sayShort: '…e5 — the Reversed Sicilian.',
    }),
    b({
      id: 'bishop-pair',
      moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 Bxc3 Qxc3',
      arrows: [{ from: 'b4', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }],
      say:
        "You back the knight with Qc2; Black trades on c3, and you recapture with the queen. Here's the gift: Black gave up his dark-squared bishop, so now You hold the two bishops. The queen sits actively on c3, eyeing both the e5-pawn and the long dark diagonal. A small, permanent structural plus.",
      sayShort: 'Qxc3 — White keeps both bishops.',
    }),
    b({
      id: 'mg-d4',
      moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 Bxc3 Qxc3 Qe7 b3 d5 d4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }, { square: 'e5', color: SOFT }],
      say:
        "You prepare the fianchetto with b3 — but the instant Black strikes with …d5 you answer in the centre with d4, challenging e5 before committing the bishop. The careless Bb2 first would walk into …d4, forking your queen on c3 and handing Black the initiative; meeting …d5 with d4 keeps everything sound. The tension resolves into a balanced, risk-free middlegame where your two bishops and the extra tempo give the pleasant side of equality.",
      sayShort: 'd4 — meet …d5 in the centre.',
    }),
  ],
};

// ── Anti-French …e6 — QID-reversed, the b3/Bb2 pressure setup ──
const ANTI_FRENCH: LessonScript = {
  openingId: 'pro-gothamchess-english',
  title: 'English — Anti-French …e6 (Queen\'s Indian Reversed)',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'c4 e6 Nc3 d5 e3 Nf6 Nf3 Be7 b3',
      arrows: [{ from: 'b2', to: 'b3', color: VIS }],
      highlights: [{ square: 'b3', color: KEY }],
      say:
        "When Black plays …e6 and …d5, the English transposes to a Queen's-Indian-style middlegame — with your colours reversed and a tempo in hand. You develop solidly and prepare the key idea: b3, getting ready to fianchetto the bishop to b2 for long-term pressure.",
      sayShort: 'b3 — prepare the Bb2 fianchetto.',
    }),
    b({
      id: 'bb2',
      moves: 'c4 e6 Nc3 d5 e3 Nf6 Nf3 Be7 b3 O-O Bb2 b6 Be2 Bb7',
      arrows: [{ from: 'b2', to: 'g7', color: VIS }],
      highlights: [{ square: 'b2', color: KEY }, { square: 'b7', color: SOFT }],
      say:
        "Both sides fianchetto their queen's bishops and castle. The two long-diagonal bishops stare at each other across the board, but yours points at Black's king while his points at your solid queenside. You've reached a rich, maneuvering middlegame with a comfortable, risk-free pull.",
      sayShort: 'Bb2 vs Bb7 — the diagonals face off.',
    }),
    b({
      id: 'mg-plan',
      moves: 'c4 e6 Nc3 d5 e3 Nf6 Nf3 Be7 b3 O-O Bb2 b6 Be2 Bb7',
      arrows: [{ from: 'c4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Here's the plan. You keep the tension and pick your moment to release it: cxd5 to open the c-file for your rooks, or a later e4 to challenge the centre and free the Bb2's diagonal. The whole game is about that long diagonal and the half-open c-file. It's slow, it's strategic, and with the extra tempo it's a position where White presses and never risks much. Quintessential English.",
      sayShort: 'cxd5 then e4 — open the bishop.',
    }),
  ],
};

// ── Symmetric …c5 — the double-fianchetto symmetric English ──
const SYM_C5: LessonScript = {
  openingId: 'pro-gothamchess-english',
  title: 'English — Symmetric …c5 (Double Fianchetto)',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'c4 c5 Nc3 Nc6 Nf3 g6 g3 Bg7 Bg2',
      arrows: [{ from: 'f1', to: 'g2', color: VIS }],
      highlights: [{ square: 'g2', color: KEY }],
      say:
        "Black mirrors with …c5 — the fully Symmetric English. This repertoire scores a fat 66% here, because symmetry plus an extra tempo just favours White. You fianchetto with g3 and Bg2, pointing the bishop down the long light diagonal toward Black's queenside.",
      sayShort: 'Bg2 — the long-diagonal fianchetto.',
    }),
    b({
      id: 'castle',
      moves: 'c4 c5 Nc3 Nc6 Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 d6',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'd3', color: SOFT }],
      say:
        "Both sides complete the mirror setup and castle. It looks dead symmetric — but you move first, so you get to break the symmetry on Your terms. Black is always one tempo behind in this race, and that tempo is the whole edge.",
      sayShort: 'O-O — symmetry, but you move first.',
    }),
    b({
      id: 'mg-plan',
      moves: 'c4 c5 Nc3 Nc6 Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 d6',
      arrows: [{ from: 'a2', to: 'a3', color: VIS }],
      highlights: [{ square: 'b4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Here's how you break the mirror first. The main plan is a queenside expansion with a3 and b4, gaining space and opening the b-file for your rooks; an alternative is the central jab d4 or the e4 advance to claim the middle. Whatever you choose, you get there a move ahead of Black, who has to react. Symmetry isn't drawish when you're the one calling the tune.",
      sayShort: 'a3 + b4 — break the symmetry first.',
    }),
  ],
};

// ── vs …c6 (Slav-style) — the b3/Bb2 wall against the c6-d5 block ──
const C6_SLAV: LessonScript = {
  openingId: 'pro-gothamchess-english',
  title: 'English — vs …c6 (Slav-style)',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'wall',
      moves: 'c4 c6 Nc3 d5 e3 Nf6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: KEY }],
      say:
        "The Slav-style …c6 — his second-most-common English reply, 145 corpus games and 80 wins against it. Black props d5 with c6 and waits for you to over-extend. You don't oblige: e3, knight to c3, and the position stays calm while you choose your structure at leisure.",
      sayShort: 'c6-d5 — the Slav wall. Stay calm.',
    }),
    b({
      id: 'b3-wall',
      moves: 'c4 c6 Nc3 d5 e3 Nf6 Nf3 e6 b3 Nbd7 Bb2',
      highlights: [{ square: 'b2', color: KEY }, { square: 'e6', color: SOFT }, { square: 'd7', color: SOFT }],
      say:
        "Both knights out, then the quiet heart of the setup: b3 and bishop to b2. The bishop sits behind its own knight for now — that's fine; this wall is about flexibility, not fireworks. Black completes the triangle with e6 and puts the second knight on d7. Notice what you have NOT played: no d4. The centre stays fluid, and Black must commit first.",
      sayShort: 'b3 and Bb2 — the flexible wall.',
    }),
    b({
      id: 'e5-met',
      moves: 'c4 c6 Nc3 d5 e3 Nf6 Nf3 e6 b3 Nbd7 Bb2 e5 Qc2 a6 h3',
      arrows: [{ from: 'f3', to: 'd4', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: KEY }, { square: 'g4', color: SOFT }],
      say:
        "Black commits: the e-pawn marches on to e5, claiming the centre he was offered, and a6 keeps his queenside flexible. Your answers are quiet moves with teeth — the queen steps to c2, off the d-file and watching the e4-square, and h3 takes g4 away from Black's pieces before any pin lands. Now study that proud e5-pawn: the moment it pushes to e4, it stops guarding d4 — and your knight jumps straight into the hole. The middlegame plan picks up from exactly this position.",
      sayShort: 'e5 met calmly — watch the d4 hole.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_ENGLISH_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-english::Botvinnik System vs KID-setup': BOTVINNIK,
  'pro-gothamchess-english::Symmetric (…e5)': SYM_E5,
  'pro-gothamchess-english::Anti-French (…e6)': ANTI_FRENCH,
  'pro-gothamchess-english::Symmetric (…c5)': SYM_C5,
  'pro-gothamchess-english::vs …c6 (Slav-style)': C6_SLAV,
};
