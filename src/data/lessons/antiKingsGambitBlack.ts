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
  title: 'Meeting the King’s Gambit — the ...d5 counter',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'kgb1', moves: 'e4 e5 f4 exf4 Nf3 d5',
      say: "The King's Gambit offers a pawn to rip open the f-file and attack — and it's a REAL, sound opening, not something you 'refute.' So the goal isn't to punish it, it's to neutralise it cleanly. Instead of clutching the extra pawn and getting mated, you punch back in the centre with …d5, hitting e4 and throwing open lines for YOUR pieces. This is the Modern Defence — the simplest road to a safe, comfortable game.",
      sayShort: "…d5 — neutralise it cleanly.",
      highlights: [H('d5', ATK), H('e4', SOFT)] }),
    b({ id: 'kgb2', moves: 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5',
      say: "After exd5, don't rush to snatch it back with the queen — develop with …Nf6 first, and only THEN recapture on d5 with the knight. Now your pieces are flying out while White's still stuck trying to justify the pawn he threw in. Quietly, move by move, the initiative is changing hands.",
      sayShort: "…Nf6, …Nxd5 — develop, then recapture.",
      highlights: [H('d5', KEY), H('f6', SOFT)] }),
    b({ id: 'kgb3', moves: 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5 O-O Be6 Qe2 Nc6 d4 Qd6',
      say: "You develop with tempo everywhere: …Be6 challenges White's active bishop, …Nc6 hits d4, …Qd6 guards the extra f4-pawn while eyeing the kingside. Every piece comes out doing a job. White's got open lines, sure — but you've got MORE pieces pointed down them.",
      sayShort: "…Be6, …Nc6 — develop with tempo.",
      highlights: [H('e6', KEY), H('f4', SOFT)] }),
    b({ id: 'kgb4', moves: 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5 O-O Be6 Qe2 Nc6 d4 Qd6 Nc3 O-O-O Nxd5 Bxd5 Bxd5 Qxd5',
      say: "You castle queenside — king safe, rooks connected — and the trades on d5 leave your queen sitting proud in the centre. Add it up: fully developed, safe king, not a weakness in sight. And be honest about the verdict: with best play the King's Gambit isn't busted — but you've taken away all its fire and reached an easy, pleasant game where only Black can press. That's exactly what a sound defence is supposed to deliver.",
      sayShort: "…Qxd5 — safe, easy, pleasant game.",
      highlights: [H('d5', KEY), H('f4', SOFT)] }),
  ],
};
