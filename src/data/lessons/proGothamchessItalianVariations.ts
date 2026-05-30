import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Italian Game, PER-VARIATION Watch lessons.
// Each variation walks its deep repertoire spine to a middlegame with board-
// accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Italian-Game',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

// ── Giuoco Piano c3-d4 — the main line into the Isolated Queen's Pawn ──
const GIUOCO: LessonScript = {
  openingId: 'pro-gothamchess-italian',
  title: 'Italian — Giuoco Piano c3-d4 (the IQP Attack)',
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6',
      arrows: [{ from: 'c2', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "The Giuoco Piano — the 'Quiet Game' that's anything but. Bishops out to c4 and c5, then c3, and the whole point of that little pawn move is to build a big centre with d4 next. Black develops Nf6, hitting our e4-pawn. Now we strike.",
      sayShort: 'c3 — prepare the d4 break.',
    }),
    b({
      id: 'd4',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "d4 — we blast the centre open. After the trades on d4, we recapture with the c-pawn and stand with a proud pawn on d4 and a bishop raking toward f7. Black throws in Bb4-check to disrupt us, but that just helps us complete development.",
      sayShort: 'd4 — open the centre.',
    }),
    b({
      id: 'trades',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5',
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "We block the check with Bd2, trade the dark-squared bishops, and recapture with the knight. Black hits the centre with d5; we take, and after the recapture we're left with an isolated pawn on d4. That isolated pawn isn't a weakness here — it's an engine of attack.",
      sayShort: 'the IQP appears on d4.',
    }),
    b({
      id: 'castle',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'd4', color: KEY }],
      say:
        "Both sides castle, and here's the classic Isolated Queen's Pawn middlegame. The d4-pawn gives us space and, more importantly, the e5- and c5-outposts and a half-open e-file. Our pieces get active squares; Black has to blockade. In the IQP, the side WITH the pawn attacks — and that's us.",
      sayShort: 'O-O — the IQP middlegame.',
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O',
      arrows: [{ from: 'd4', to: 'd5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'c5', color: KEY }],
      say:
        "The plan writes itself. Bring a rook to e1 down the half-open file, post a knight on e5, swing the queen and bishop toward Black's king, and at the right moment push d5 to rip the position open. The isolated pawn's job is to die gloriously, opening lines for an attack. This is dynamic, attacking chess — exactly why the 'Quiet Game' is a fighting weapon.",
      sayShort: 'Re1, Ne5, d5 — attack the king.',
    }),
  ],
};

// ── Slow Italian d3 — the Giuoco Pianissimo maneuvering battle ──
const SLOW: LessonScript = {
  openingId: 'pro-gothamchess-italian',
  title: 'Italian — Slow Italian d3 (Giuoco Pianissimo)',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd3',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6',
      highlights: [{ square: 'd3', color: KEY }],
      say:
        "When you don't want the IQP fireworks, there's the calm d3 — the Giuoco Pianissimo, the 'very quiet game.' We build the Italian formation behind a closed centre, castle, and settle in for a long maneuvering battle. No early contact; just slowly improving every piece.",
      sayShort: 'd3 — the quiet build.',
    }),
    b({
      id: 'c3-a4',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7',
      arrows: [{ from: 'a2', to: 'a4', color: VIS }],
      highlights: [{ square: 'c3', color: SOFT }, { square: 'a4', color: KEY }],
      say:
        "c3 prepares a future d4 break; a4 grabs queenside space and stops Black's …b5 from kicking our bishop. Black tucks the bishop back to a7, keeping it on the strong a7-g1 diagonal. Both sides are jockeying for the better version of the same structure.",
      sayShort: 'a4 — stop …b5, gain space.',
    }),
    b({
      id: 're1-nbd2',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7 Re1 O-O Nbd2 Be6',
      arrows: [{ from: 'd2', to: 'f1', color: SOFT }],
      highlights: [{ square: 'd2', color: KEY }],
      say:
        "Re1 supports the centre; Nbd2 begins the signature maneuver — the knight heads for f1 and then g3 or e3, joining the kingside. Black challenges our good bishop with Be6. This is pure positional chess: whoever improves their pieces to better squares wins the day.",
      sayShort: 'Nbd2 — reroute toward g3.',
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7 Re1 O-O Nbd2 Be6',
      arrows: [{ from: 'd3', to: 'd4', color: VIS }],
      highlights: [{ square: 'g3', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "Here's the middlegame plan. Finish the knight's journey to g3, where it eyes the f5- and h5-squares; decide whether to trade the light bishops on e6 or keep yours; and prepare the central break d4 once your pieces are ideally placed. It's slow, it's strategic, and it's deeply principled — Levy grinds these out by simply out-maneuvering opponents who don't have a plan.",
      sayShort: 'Nf1-g3 then d4 — out-maneuver.',
    }),
  ],
};

// ── Evans Gambit — the 200-year-old pawn sac for a crushing centre ──
const EVANS: LessonScript = {
  openingId: 'pro-gothamchess-italian',
  title: 'Italian — Evans Gambit (a Pawn for the Centre)',
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'b4',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5',
      arrows: [{ from: 'b2', to: 'b4', color: VIS }],
      highlights: [{ square: 'b4', color: KEY }],
      say:
        "Captain Evans's 1820 invention — still terrifying 200 years later. b4! We throw a pawn at the bishop. After Black takes, c3 hits the bishop AGAIN with tempo and prepares the big centre. We're spending a pawn to buy two free moves and a pawn duo. That's the Evans bargain.",
      sayShort: 'b4 — the gambit punch.',
    }),
    b({
      id: 'd4',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4',
      arrows: [{ from: 'c3', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: KEY }],
      say:
        "d4 — and there's the dividend. We castle for safety and recapture with the c-pawn, planting a monster e4-d4 pawn centre. Yes, we're down a pawn. But look at that centre and our development lead: Black is cramped and underdeveloped, exactly the Evans dream.",
      sayShort: 'cxd4 — the big centre.',
    }),
    b({
      id: 'nc3-bg4',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 Nc3 Bg4',
      arrows: [{ from: 'g4', to: 'f3', color: SOFT }],
      highlights: [{ square: 'b6', color: SOFT }, { square: 'f3', color: SOFT }],
      say:
        "Black retreats the bishop to b6, where it bites on our d4-pawn, and develops Bg4 to pin our knight. We bring the last knight to c3, completing development and eyeing the d5-square. Every piece we own is in the game; Black is still untangling.",
      sayShort: 'Nc3 — finish developing.',
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 Nc3 Bg4',
      arrows: [{ from: 'e4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'f7', color: KEY }],
      say:
        "Here's the Evans middlegame. We have a roaring centre and a development lead for one pawn. The plan: push d5 to gain space and open lines, swing the queen and rooks toward Black's king, and target the eternal weak spot, f7. The bishop on c4 already stares at it. A pawn is nothing when you get to play for mate — and that's what the Evans hands you.",
      sayShort: 'd5 and pile onto f7.',
    }),
  ],
};

export const PRO_GOTHAMCHESS_ITALIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-italian::Giuoco Piano c3-d4': GIUOCO,
  'pro-gothamchess-italian::Slow Italian d3': SLOW,
  'pro-gothamchess-italian::Evans Gambit': EVANS,
};
