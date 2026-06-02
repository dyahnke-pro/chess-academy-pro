import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Closed Sicilian / Grand Prix Attack (White). 592 games, 66%.
// His anti-Sicilian: avoid the open theory, play f4 with a kingside attack.
// Two registers; no move-number prefixes in spoken text; green vision arrows only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:att-kingside-storm', 'concept:pos-development', 'https://www.chess.com/openings/Grand-Prix-Attack', 'https://api.chess.com/pub/player/imrosen/games/archives'];

export const PRO_ERICROSEN_CLOSED_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-closed-sicilian', title: "This repertoire's Grand Prix Attack", minutes: 7,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 c5 Nc3 d6 f4',
      arrows: [], highlights: [{ square: 'f4', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The Grand Prix Attack. Against the Sicilian we sidestep all the open theory: Nc3 and then f4, signalling a kingside pawn storm. No memorising twenty moves of Najdorf — just a clear, aggressive plan that scores heavily at club level.",
      sayShort: 'f4 — the kingside storm setup.' }),
    b({ id: 'develop', moves: 'e4 c5 Nc3 d6 f4 Nc6 Nf3 g6 Bc4',
      arrows: [], highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "We develop naturally — Nf3 and the bishop to c4, aiming at f7. Black fianchettoes with g6 for a Dragon-style setup. The bishop on c4 and the f-pawn already telegraph where we are going: straight at Black's king.",
      sayShort: 'Bc4 — eye f7, prep f5.' }),
    b({ id: 'castle', moves: 'e4 c5 Nc3 d6 f4 Nc6 Nf3 g6 Bc4 Bg7 O-O e6',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'f5', color: KEY }],
      say: "We castle and Black plays …e6 to blunt the c4-bishop and prepare …d5. That is fine — it costs Black time and weakens the kingside dark squares. Our attacking scheme rolls on regardless.",
      sayShort: 'O-O — castle, keep the plan.' }),
    b({ id: 'center', moves: 'e4 c5 Nc3 d6 f4 Nc6 Nf3 g6 Bc4 Bg7 O-O e6 d4 Nxd4 Be3',
      arrows: [], highlights: [{ square: 'd4', color: KEY }, { square: 'e3', color: KEY }],
      say: "d4! Now that Black has committed, we strike in the centre too. After the knight trade, Be3 develops with tempo and supports a big centre. We have the classic Grand Prix dream: a space edge, the bishop pair eyeing the kingside, and f4-f5 coming.",
      sayShort: 'd4, Be3 — open the centre.' }),
    b({ id: 'plan', moves: 'e4 c5 Nc3 d6 f4 Nc6 Nf3 g6 Bc4 Bg7 O-O e6 d4 Nxd4 Be3',
      arrows: [A('d1', 'e1')], highlights: [{ square: 'f5', color: KEY }, { square: 'h6', color: SOFT }],
      say: "The attacking blueprint: push f5 to pry open the f-file and hit g6/e6, swing the queen and a rook to the kingside, and look for Bh6 to trade off Black's defensive fianchetto bishop. Against the Sicilian, this repertoire turns a low-theory setup into a direct mating attack.",
      sayShort: 'Plan: f5, Bh6, storm the king.' }),
  ],
};
