import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Vienna Gambit, WHITE side. The opening spine
// runs to the Rb1 lever (where the main middlegame plan picks up — Gate C), then
// the lesson plays the plan's opposite-castling attack to a clear middlegame
// (23 plies, G9.3 Gate B). Student plays WHITE. Board-accurate, two registers.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_VIENNA_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-vienna',
  title: "GothamChess's Vienna Gambit — Rb1 and the Opposite-Castle Attack",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Vienna-Game-Vienna-Gambit',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Vienna_Game',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nc3',
      highlights: [{ square: 'c3', color: SOFT }],
      say:
        "The Vienna — e4 e5 Nc3. It looks like a quiet developing move, but it's the doorway to one of Levy's favourite gambits. We develop the knight and keep the f-pawn free to come crashing forward.",
      sayShort: 'Nc3 — the Vienna doorway.',
    }),
    b({
      id: 'gambit',
      moves: 'e4 e5 Nc3 Nf6 f4',
      highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "f4 — the Vienna Gambit. We hurl the f-pawn at e5, opening the f-file toward Black's king before he's anywhere near ready. This is the move that makes the Vienna dangerous: a pawn offered for a roaring initiative.",
      sayShort: 'f4 — the gambit punch.',
    }),
    b({
      id: 'd5',
      moves: 'e4 e5 Nc3 Nf6 f4 d5',
      highlights: [{ square: 'd5', color: SOFT }],
      say:
        "Black's correct reply is d5, counter-striking in the centre rather than grabbing the pawn. Good defence — but now we get to show the point of the whole line.",
      sayShort: 'd5 — Black counter-strikes.',
    }),
    b({
      id: 'fxe5',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4',
      highlights: [{ square: 'e5', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "fxe5 takes toward the centre and chases the f6-knight, which jumps to e4 grabbing a pawn. Don't panic about the material — we have a forcing sequence that turns the tables.",
      sayShort: 'fxe5 — chase the knight.',
    }),
    b({
      id: 'qf3',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3',
      arrows: [{ from: 'f3', to: 'e4', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'f7', color: SOFT }],
      say:
        "Qf3 — the heart of the line. The queen hits the e4-knight and leans down the open f-file toward f7 at the same time. Black has to react, and every way he does leaves us with the initiative.",
      sayShort: 'Qf3 — hit the knight and f7.',
    }),
    b({
      id: 'bxc3',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'b1', color: SOFT }],
      say:
        "Black trades the knight on c3; we recapture with the b-pawn. This is no concession — it opens the b-file for our rook and builds a broad pawn-mass on c3 and d-file. The half-open b-file is about to matter a lot.",
      sayShort: 'bxc3 — open the b-file.',
    }),
    b({
      id: 'c5-qg3',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3',
      arrows: [{ from: 'g3', to: 'g7', color: VIS }],
      highlights: [{ square: 'g7', color: KEY }],
      say:
        "Black grabs space with c5; we reroute the queen to g3, where it eyes g7 and supports the e5-pawn, then develop the knight to f3. Our whole army is swinging toward Black's kingside while he's still sorting out his pieces.",
      sayShort: 'Qg3 — swing toward g7.',
    }),
    b({
      id: 'rb1',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1',
      arrows: [{ from: 'b1', to: 'b7', color: VIS }],
      highlights: [{ square: 'b7', color: KEY }],
      say:
        "Black develops with Be6; we plant the rook on b1, the half-open file, pressing straight down on b7. This is where the opening hands off to the middlegame — and the plan picks up from this exact position.",
      sayShort: 'Rb1 — press the b-file.',
    }),
    b({
      id: 'mg-pin',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1 Qd7 Bb5',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }],
      say:
        "Black connects with Qd7; we pin the c6-knight with Bb5 — tying down the defender of d4 and e5 and adding another attacker to the queenside pile-up. Notice the pattern: every piece we move adds to the pressure.",
      sayShort: 'Bb5 — pin the knight.',
    }),
    b({
      id: 'mg-opposite',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1 Qd7 Bb5 O-O-O O-O',
      highlights: [{ square: 'c8', color: SOFT }, { square: 'g1', color: SOFT }],
      say:
        "Black castles long, straight into the teeth of our b-file rook; we castle short, tucking our king to safety. Opposite-side castling — and that means a race. The good news: our attack is already rolling and his has barely started.",
      sayShort: 'opposite castling — a race we lead.',
    }),
    b({
      id: 'mg-d4',
      moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1 Qd7 Bb5 O-O-O O-O Be7 d4',
      arrows: [{ from: 'd4', to: 'c5', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "And the centre erupts: d4. We strike at c5, open lines toward Black's king on c8, and bring the whole army to life — the rook on b1, the bishop on b5, the queen on g3. This is the Vienna Gambit's dream: a pawn invested back at the start, repaid now with a winning attack. From here, you're the one playing for mate.",
      sayShort: 'd4 — the centre erupts.',
    }),
  ],
};
