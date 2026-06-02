import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — English Opening, WHITE side. His Botvinnik
// setup: c4/Nc3/e4/d4 builds the big centre, Black plays a King's-Indian setup,
// White locks with d5 and storms the kingside with g4-h4. Opening reaches a
// castled, closed-centre middlegame by move 8 (G9.3 Gate B). Student = WHITE.
// Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_ENGLISH_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-english',
  title: "This repertoire's English — the Botvinnik Centre and Kingside Storm",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-strategy',
    'https://www.chess.com/openings/English-Opening',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/English_Opening',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'c4 Nf6 Nc3 g6',
      highlights: [{ square: 'c4', color: SOFT }],
      say:
        "The English — c4. A flank opening, but this repertoire plays it with a punch. Black heads for a King's-Indian set-up with g6, planning to fianchetto. Fine — we're going to grab the whole centre and play for a kingside attack.",
      sayShort: 'c4 — the flank opening.',
    }),
    b({
      id: 'e4',
      moves: 'c4 Nf6 Nc3 g6 e4 d6',
      highlights: [{ square: 'e4', color: KEY }],
      say:
        "e4 — the Botvinnik idea. We seize the big centre with pawns on c4 and e4. This turns the quiet English into a proper space-grabbing system. Black plays d6, settling into a King's-Indian shell.",
      sayShort: 'e4 — grab the big centre.',
    }),
    b({
      id: 'd4',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: KEY }],
      say:
        "d4 — now we have the full c4-d4-e4 pawn wall, a commanding centre. Black fianchettoes the bishop to g7, eyeing the long diagonal. We have the space; he has the counterpunch. The fight is about who breaks where.",
      sayShort: 'd4 — the full centre wall.',
    }),
    b({
      id: 'develop',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say:
        "We develop calmly — Be2 and Be3 — and castle is coming. Black strikes the centre with e5, the standard King's-Indian break, hitting our d4-pawn. This is the critical moment: how we meet …e5 decides the whole character of the game.",
      sayShort: "e5 — Black's KID break.",
    }),
    b({
      id: 'd5',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: SOFT }],
      say:
        "d5 — we lock the centre. With the pawns frozen on d5-d6 and e4-e5, neither side can break through the middle. And that's the whole point: in a closed centre, the game is decided on the WINGS. Black will push on the queenside; we storm the kingside. We're aiming straight at his king.",
      sayShort: 'd5 — lock the centre, play the wings.',
    }),
    b({
      id: 'a5-g4',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4',
      arrows: [{ from: 'g4', to: 'g5', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'g5', color: SOFT }],
      say:
        "Black grabs queenside space with a5; we answer on the other wing — g4! The kingside pawn storm is on. Because the centre is locked, this is completely safe: there's no central counter, so we just roll the pawns at Black's king.",
      sayShort: 'g4 — the kingside storm.',
    }),
    b({
      id: 'h4',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4 Na6 h4',
      arrows: [{ from: 'h4', to: 'h5', color: VIS }],
      highlights: [{ square: 'h4', color: KEY }],
      say:
        "Black reroutes the knight to a6, heading for c5; we keep storming with h4. The plan is brutally simple: g4, h4, then g5 and h5 to rip open the g- and h-files in front of Black's king. The fianchettoed king is about to lose its pawn cover.",
      sayShort: 'h4 — keep the pawns rolling.',
    }),
    b({
      id: 'mg-f3',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4 Na6 h4 Nc5 f3',
      highlights: [{ square: 'f3', color: KEY }, { square: 'g5', color: SOFT }],
      say:
        "Black posts the knight on c5; we play f3 — propping up the g4-pawn and preparing g5 without allowing any …Ng4 nonsense. Everything is set for the breakthrough. This is the Botvinnik English in full flow: a locked centre and a one-sided kingside avalanche.",
      sayShort: 'f3 — prepare the g5 break.',
    }),
    b({
      id: 'mg-summary',
      moves: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4 Na6 h4 Nc5 f3',
      highlights: [{ square: 'g5', color: KEY }, { square: 'h5', color: KEY }],
      say:
        "Here's the middlegame in one picture. The centre is bolted shut, so it's a race of wings — and ours runs straight at the king. Push g5 and h5 to crack open the kingside, lift a rook to g1 or h1, and pour everything in. Black's queenside play is slower and aimed at our well-defended flank. White attacks the king; that's the faster race, and it's why this is this repertoire's English.",
      sayShort: 'g5/h5 — crack the king open.',
    }),
  ],
};
