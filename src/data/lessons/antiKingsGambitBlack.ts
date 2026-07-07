import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-King's-Gambit (Black): e4 e5 f4 exf4 Nf3 d5 — the Modern Defence. The
// student plays BLACK. Take the f4-pawn, then hit back immediately with ...d5:
// you hand the pawn back for a raking lead in development and the freer game.
// Spine both-sides-sound (build-sound-spine.mjs), engine-verified (+0.77 for
// Black — Black is clearly better).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'];

export const ANTI_KINGS_GAMBIT_BLACK_LESSON: LessonScript = {
  openingId: 'anti-kings-gambit-black',
  sources: SRC,
  title: 'Refuting the King’s Gambit — the ...d5 counter',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'kgb1', moves: 'e4 e5 f4 exf4 Nf3 d5',
      say: "The King's Gambit offers a pawn to blow open the f-file and attack. Don't cling to the extra pawn and get mated — hit back in the centre with d5! This is the Modern Defence: you strike at White's e4-pawn and open lines for YOUR pieces, turning White's own aggression against him.",
      sayShort: "…d5 — counter-strike, don't cling to f4.",
      highlights: [H('d5', ATK), H('e4', SOFT)] }),
    b({ id: 'kgb2', moves: 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5',
      say: "After exd5 you don't rush to recapture with the queen — you develop with Nf6 first, and only then take back on d5 with the knight. Now your pieces are flying out while White still has to justify the pawn he threw in. The initiative is quietly passing to you.",
      sayShort: "…Nf6, …Nxd5 — develop, then recapture.",
      highlights: [H('d5', KEY), H('f6', SOFT)] }),
    b({ id: 'kgb3', moves: 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5 O-O Be6 Qe2 Nc6 d4 Qd6',
      say: "You develop with tempo everywhere: Be6 challenges White's active bishop, Nc6 hits d4, and Qd6 defends the extra f4-pawn while eyeing the kingside. Every piece comes out with a purpose. White has open lines, but you have MORE pieces pointing at them.",
      sayShort: "…Be6, …Nc6 — develop with tempo.",
      highlights: [H('e6', KEY), H('f4', SOFT)] }),
    b({ id: 'kgb4', moves: 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5 O-O Be6 Qe2 Nc6 d4 Qd6 Nc3 O-O-O Nxd5 Bxd5 Bxd5 Qxd5',
      say: "You castle queenside — king safe, rooks connected on the open files — and the trades on d5 leave your queen dominant in the centre. Count it up: you are better developed, safer, and still hold the extra pawn on f4. The King's Gambit's fire has been put out, and you are the one with the winning chances.",
      sayShort: "…Qxd5 — safe, ahead, extra pawn.",
      highlights: [H('d5', KEY), H('f4', SOFT)] }),
  ],
};
