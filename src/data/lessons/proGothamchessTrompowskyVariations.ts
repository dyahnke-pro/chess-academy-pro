import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Trompowsky Attack, PER-VARIATION Watch lessons.
// Board-accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.
// ACCURACY NOTE: in these lines White does NOT hold a bishop-pair edge — in the
// …e6 main White's plan is to TRADE the dark bishop for the f4 storm; in the …g6
// line White trades on f6 and BLACK keeps the two bishops. Narration reflects the
// real board, not the stale "bishop pair" framing.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:queens-gambit',
  'https://www.chess.com/openings/Trompowsky-Attack',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Main line vs …e6 — the Bh4 pin into the f4 storm ──
const MAIN_E6: LessonScript = {
  openingId: 'pro-gothamchess-trompowsky',
  title: 'Trompowsky — Main Line vs …e6',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4',
      arrows: [{ from: 'h4', to: 'd8', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'd8', color: SOFT }],
      say:
        "Levy's #1 most-played Trompowsky — 1,823 games. Against …e6 we develop Nd2 and, when Black puts the question with h6, keep the bishop alive on h4. Because e6 vacated the e7-square, the bishop on h4 now pins the f6-knight to the queen down the long diagonal. The knight is glued in place.",
      sayShort: 'Bh4 — pin f6 to the queen.',
    }),
    b({
      id: 'setup',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: SOFT }],
      say:
        "Black builds the centre and breaks the pin with Be7; we develop calmly — e3, Bd3 aiming at h7, c3 buttressing d4 — and Black castles. We've reached a quiet maneuvering middlegame. But don't be fooled by the calm: a storm is coming.",
      sayShort: 'Bd3, c3 — into the middlegame.',
    }),
    b({
      id: 'mg-plan',
      moves: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O',
      arrows: [{ from: 'f2', to: 'f4', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }, { square: 'f6', color: SOFT }],
      say:
        "Here's the middlegame plan, and it's the Trompowsky's hidden teeth. We play Bxf6 to trade our dark-squared bishop for the knight, then roll the f-pawn forward with f4 and f5, prying open lines toward Black's king. We're not playing for the bishop pair — we give a bishop AWAY — we're playing for a direct kingside pawn storm. The quietest opening on the board becomes an attack.",
      sayShort: 'Bxf6 then f4-f5 — storm the king.',
    }),
  ],
};

// ── Vaganian Attack (…Ne4) — the sharp h4 gambit, White ~ +1.9 ──
const VAGANIAN: LessonScript = {
  openingId: 'pro-gothamchess-trompowsky',
  title: 'Trompowsky — Vaganian Attack (…Ne4)',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'ne4-h4',
      moves: 'd4 Nf6 Bg5 Ne4 h4 c5 d5',
      arrows: [{ from: 'h2', to: 'h4', color: VIS }],
      highlights: [{ square: 'h4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Black's sharpest try — Ne4, jumping at our bishop. We don't retreat; we play the wild h4! It defends the g5-bishop and prepares to open the h-file. When Black hits the centre with c5, we slam the door with d5, grabbing space and keeping the position as messy as possible. This is a knife fight, and Levy lives for it.",
      sayShort: 'h4 + d5 — keep it sharp.',
    }),
    b({
      id: 'open-h',
      moves: 'd4 Nf6 Bg5 Ne4 h4 c5 d5 Qb6 Nd2 Nxg5 hxg5',
      arrows: [{ from: 'h1', to: 'h8', color: VIS }],
      highlights: [{ square: 'h1', color: KEY }],
      say:
        "Black grabs the bishop on g5; we recapture with the h-pawn — hxg5 — and now the h-file is wide open with our rook already sitting behind it, staring down at Black's king that can never safely castle kingside. The bishop we 'lost' bought us an open attacking file.",
      sayShort: 'hxg5 — rip open the h-file.',
    }),
    b({
      id: 'mg-e4',
      moves: 'd4 Nf6 Bg5 Ne4 h4 c5 d5 Qb6 Nd2 Nxg5 hxg5 Qxb2 g6 fxg6 Ngf3 d6 e4',
      arrows: [{ from: 'e2', to: 'e4', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: KEY }, { square: 'b2', color: SOFT }],
      say:
        "Black greedily snatches the b2-pawn with his queen; we don't care — we develop and build a giant d5-e4 pawn centre with the open h-file aimed at the king. The engine confirms White is clearly better here, around plus-two: the lead in development and the attack are worth far more than the pawn. Black's queen is stranded on b2 while our whole army points at his king. Pure Trompowsky chaos, and we're winning it.",
      sayShort: 'e4 — big centre, winning attack.',
    }),
  ],
};

// ── …d5 system — the Slav-like structure, Qb3 neutralizes ──
const D5_SYSTEM: LessonScript = {
  openingId: 'pro-gothamchess-trompowsky',
  title: 'Trompowsky — …d5 System',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'd4 Nf6 Bg5 d5 e3 c5 c3 Nc6',
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }],
      say:
        "Black answers solidly with d5 and c5, building a Slav-like structure. We keep it simple: e3 and c3, a rock for our centre, with the bishop on g5 still leaning on the f6-knight. No fireworks here — just a healthy, slightly-better position to outplay from.",
      sayShort: 'e3, c3 — solid centre.',
    }),
    b({
      id: 'qb6-qb3',
      moves: 'd4 Nf6 Bg5 d5 e3 c5 c3 Nc6 Nd2 Qb6 Qb3',
      arrows: [{ from: 'd1', to: 'b3', color: VIS }],
      highlights: [{ square: 'b3', color: KEY }, { square: 'b6', color: SOFT }],
      say:
        "Black tries to stir things up with Qb6, eyeing our b2-pawn and the d4-point. We answer with Qb3 — calmly defending b2 and facing his queen down. We're even offering a queen trade, which would dissolve all of Black's activity and leave us a pleasant, riskless endgame.",
      sayShort: 'Qb3 — neutralise the queen.',
    }),
    b({
      id: 'mg-plan',
      moves: 'd4 Nf6 Bg5 d5 e3 c5 c3 Nc6 Nd2 Qb6 Qb3',
      arrows: [{ from: 'b3', to: 'b6', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "Here's the middlegame: a solid, Slav-like structure where we've taken the sting out of Black's only active idea. If queens come off on b6, we head to a comfortable endgame; if they stay on, we finish developing with Bd3 and Ngf3 and play on the slightly better structure. It's the unglamorous, high-percentage Trompowsky — no risk, steady pressure.",
      sayShort: 'trade or build — steady edge.',
    }),
  ],
};

// ── …g6 fianchetto — Bxf6 doubles the pawns, play vs the structure ──
const G6_FIANCHETTO: LessonScript = {
  openingId: 'pro-gothamchess-trompowsky',
  title: 'Trompowsky — …g6 Fianchetto',
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'bxf6',
      moves: 'd4 Nf6 Bg5 g6 Bxf6 exf6',
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'f7', color: SOFT }],
      say:
        "When Black fianchettoes with g6, we strike immediately — Bxf6, trading our bishop for the knight to damage Black's structure. Here Black recaptures with the e-pawn, leaving doubled f-pawns on f6 and f7 and a half-open e-file. We've given up a bishop, but we've handed Black a permanent structural weakness.",
      sayShort: 'Bxf6 — double the pawns.',
    }),
    b({
      id: 'fianchetto',
      moves: 'd4 Nf6 Bg5 g6 Bxf6 exf6 e3 Bg7 g3 O-O Bg2',
      arrows: [{ from: 'f1', to: 'g2', color: VIS }],
      highlights: [{ square: 'g2', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "We set up our own fianchetto — g3 and Bg2 — pointing the bishop at the long light diagonal and the centre. Black has the two bishops as compensation, but his doubled f-pawns can never advance cleanly, and the light squares around them are ours to occupy.",
      sayShort: 'Bg2 — eye the light squares.',
    }),
    b({
      id: 'mg-plan',
      moves: 'd4 Nf6 Bg5 g6 Bxf6 exf6 e3 Bg7 g3 O-O Bg2',
      arrows: [{ from: 'g2', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'f5', color: SOFT }],
      say:
        "Here's the middlegame. The story is structure versus bishops: we develop with Ne2 and castle, blockade the light squares with a knight on d5 or f4, and grind against Black's crippled pawns. Black will try to open the position for his bishops; we keep it controlled and play on the lasting weakness. A clean, strategic edge from move three.",
      sayShort: 'blockade d5/f4 — grind the pawns.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_TROMPOWSKY_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-trompowsky::Main line vs …e6': MAIN_E6,
  'pro-gothamchess-trompowsky::Vaganian Attack (…Ne4)': VAGANIAN,
  'pro-gothamchess-trompowsky::…d5 system': D5_SYSTEM,
  'pro-gothamchess-trompowsky::…g6 fianchetto': G6_FIANCHETTO,
};
