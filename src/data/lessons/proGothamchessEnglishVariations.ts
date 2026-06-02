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
        "This repertoire's main English — 1,597 games at 62%. Against Black's King's-Indian setup we grab the WHOLE centre: c4, e4, and d4, the Botvinnik wall. Black fianchettoes the bishop to g7, eyeing the long diagonal. We have the space; he has the counterpunch.",
      sayShort: 'c4-e4-d4 — the Botvinnik wall.',
    }),
    b({
      id: 'd5',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5',
      arrows: [{ from: 'd4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "We develop calmly with Be2 and Be3; Black strikes with the standard …e5 break. We answer d5, locking the centre. And that's the whole point — with a closed centre, the game is decided on the WINGS. Black pushes on the queenside; we storm the kingside.",
      sayShort: 'd5 — lock it, play the wings.',
    }),
    b({
      id: 'mg-g4',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4 Na6',
      arrows: [{ from: 'g2', to: 'g4', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'g5', color: SOFT }],
      say:
        "Black grabs queenside space with a5; we answer on the other wing with g4 — the kingside storm is on. Because the centre is bolted shut, this is completely safe: there's no central counter-blow. The plan from here is brutally simple — roll g4-h4-g5-h5 to rip open the files in front of Black's king, lift a rook, and pour everything in. We win the race because we attack the king.",
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
        "Black mirrors us with …e5 — a Reversed Sicilian, where WE get the Sicilian's chances with an extra tempo. Everyone develops naturally, and Black pins our knight with Bb4. That pin is about to become a gift.",
      sayShort: '…e5 — the Reversed Sicilian.',
    }),
    b({
      id: 'bishop-pair',
      moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 Bxc3 Qxc3',
      arrows: [{ from: 'b4', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }],
      say:
        "We back the knight with Qc2; Black trades on c3, and we recapture with the queen. Here's the gift: Black gave up his dark-squared bishop, so now WE hold the two bishops. The queen sits actively on c3, eyeing both the e5-pawn and the long dark diagonal. A small, permanent structural plus.",
      sayShort: 'Qxc3 — White keeps both bishops.',
    }),
    b({
      id: 'mg-bb2',
      moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 Bxc3 Qxc3 Qe7 b3 d5 Bb2 d4',
      arrows: [{ from: 'b2', to: 'g7', color: VIS }],
      highlights: [{ square: 'b2', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "We fianchetto with b3 and Bb2, aiming the bishop straight down the long diagonal at Black's king. Black grabs space with …d5-d4, but that just opens lines for our bishops. Here's the middlegame: the two bishops, the long diagonal, and pressure on Black's over-extended d4-pawn. We trade it off or undermine it, and the bishops do the rest. A clean, low-risk edge with the better pieces.",
      sayShort: 'Bb2 — the bishops rule the long diagonal.',
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
        "When Black plays …e6 and …d5, the English transposes to a Queen's-Indian-style middlegame — with our colours reversed and a tempo in hand. We develop solidly and prepare the key idea: b3, getting ready to fianchetto the bishop to b2 for long-term pressure.",
      sayShort: 'b3 — prepare the Bb2 fianchetto.',
    }),
    b({
      id: 'bb2',
      moves: 'c4 e6 Nc3 d5 e3 Nf6 Nf3 Be7 b3 O-O Bb2 b6 Be2 Bb7',
      arrows: [{ from: 'b2', to: 'g7', color: VIS }],
      highlights: [{ square: 'b2', color: KEY }, { square: 'b7', color: SOFT }],
      say:
        "Both sides fianchetto their queen's bishops and castle. The two long-diagonal bishops stare at each other across the board, but ours points at Black's king while his points at our solid queenside. We've reached a rich, maneuvering middlegame with a comfortable, risk-free pull.",
      sayShort: 'Bb2 vs Bb7 — the diagonals face off.',
    }),
    b({
      id: 'mg-plan',
      moves: 'c4 e6 Nc3 d5 e3 Nf6 Nf3 Be7 b3 O-O Bb2 b6 Be2 Bb7',
      arrows: [{ from: 'c4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Here's the plan. We keep the tension and pick our moment to release it: cxd5 to open the c-file for our rooks, or a later e4 to challenge the centre and free the Bb2's diagonal. The whole game is about that long diagonal and the half-open c-file. It's slow, it's strategic, and with the extra tempo it's a position where White presses and never risks much. Quintessential English.",
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
        "Black mirrors with …c5 — the fully Symmetric English. This repertoire scores a fat 66% here, because symmetry plus an extra tempo just favours White. We fianchetto with g3 and Bg2, pointing the bishop down the long light diagonal toward Black's queenside.",
      sayShort: 'Bg2 — the long-diagonal fianchetto.',
    }),
    b({
      id: 'castle',
      moves: 'c4 c5 Nc3 Nc6 Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 d6',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'd3', color: SOFT }],
      say:
        "Both sides complete the mirror setup and castle. It looks dead symmetric — but we move first, so we get to break the symmetry on OUR terms. Black is always one tempo behind in this race, and that tempo is the whole edge.",
      sayShort: 'O-O — symmetry, but we move first.',
    }),
    b({
      id: 'mg-plan',
      moves: 'c4 c5 Nc3 Nc6 Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 d6',
      arrows: [{ from: 'a2', to: 'a3', color: VIS }],
      highlights: [{ square: 'b4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Here's how we break the mirror first. The main plan is a queenside expansion with a3 and b4, gaining space and opening the b-file for our rooks; an alternative is the central jab d4 or the e4 advance to claim the middle. Whatever we choose, we get there a move ahead of Black, who has to react. Symmetry isn't drawish when you're the one calling the tune.",
      sayShort: 'a3 + b4 — break the symmetry first.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_ENGLISH_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-english::Botvinnik System vs KID-setup': BOTVINNIK,
  'pro-gothamchess-english::Symmetric (…e5)': SYM_E5,
  'pro-gothamchess-english::Anti-French (…e6)': ANTI_FRENCH,
  'pro-gothamchess-english::Symmetric (…c5)': SYM_C5,
};
