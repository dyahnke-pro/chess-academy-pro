import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Anti-Sicilian Rossolimo (3.Bb5), WHITE side.
// Levy's whole point: dodge the theory swamp of the Open Sicilian. Pressure the
// c6-knight with Bb5, castle, preserve the bishop with the Bf1 retreat, and meet
// Black's …d5 break by opening the centre and centralising the queen on d4 with
// a small, safe, lasting pull (19 plies, White castled; engine ~ +0.7, G9.3
// Gates A-D). Student = WHITE. Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_ANTI_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-anti-sicilian',
  title: "This repertoire's Anti-Sicilian — the Rossolimo, No Theory Required",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Sicilian_Defence,_Rossolimo_Variation',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 c5 Nf3 Nc6 Bb5',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: SOFT }],
      say:
        "Against the Sicilian, this repertoire refuses to memorise a hundred lines of the Open. Instead — Bb5, the Rossolimo. We train the bishop on the c6-knight, threatening to trade it off and wreck Black's pawns. This one move sidesteps the entire theory swamp and lands us in a position WE understand better than our opponent.",
      sayShort: 'Bb5 — the Rossolimo.',
    }),
    b({
      id: 'e6-castle',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O',
      highlights: [{ square: 'g1', color: SOFT }],
      say:
        "Black plays the solid e6; we just castle. No rush to grab on c6 yet — we get the king tucked away first and keep our options open. Calm, healthy chess: the Sicilian player is the one who has to figure out what's going on.",
      sayShort: 'O-O — king safe first.',
    }),
    b({
      id: 'nge7-re1',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1',
      highlights: [{ square: 'e1', color: SOFT }],
      say:
        "Black develops the knight to e7, sidestepping the doubled pawns that Bxc6 would cause; we lift the rook to e1, backing up the e4-pawn and getting ready to open the centre. Every move has a quiet purpose.",
      sayShort: 'Re1 — support the centre.',
    }),
    b({
      id: 'a6-bf1',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1',
      arrows: [{ from: 'b5', to: 'f1', color: VIS }],
      highlights: [{ square: 'f1', color: KEY }],
      say:
        "Black questions the bishop with a6; we retreat — but all the way to f1, NOT trading on c6. Why keep it? Because this bishop is a long-term asset, and from f1 it'll come back to life the moment the centre opens. Patience over a cheap trade.",
      sayShort: 'Bf1 — keep the bishop.',
    }),
    b({
      id: 'd5',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5',
      arrows: [{ from: 'd7', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say:
        "Black goes for the freeing break, d5; we take, exd5, and after the recapture the centre starts to open. This is exactly what we were waiting for — open lines favour the better-coordinated side, and that's us.",
      sayShort: 'exd5 — crack the centre open.',
    }),
    b({
      id: 'd4',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "Now d4 — we strike in the centre ourselves, challenging Black's c5-pawn and blasting the position open. With our rook already on e1 and our king safe, opening lines is pure profit for us.",
      sayShort: 'd4 — open it on our terms.',
    }),
    b({
      id: 'mg-qxd4',
      moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 cxd4 Nxd4 Nxd4 Qxd4',
      arrows: [{ from: 'd4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "The pieces come off on d4 and our queen recaptures, landing dead-centre. Step back and count the pluses: a safe king, a queen dominating the middle, the bishop on f1 about to re-emerge on a great diagonal, and a structurally healthier position. It's a small edge — but it's the kind of clean, riskless pull this repertoire grinds into a full point. No theory, just a better game.",
      sayShort: 'Qxd4 — a clean, lasting edge.',
    }),
  ],
};
