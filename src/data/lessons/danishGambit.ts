import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// White-oriented main lesson for the Danish Gambit. Lead-the-eye §5a. Moves walk
// the data spine (danish-gambit ...d5 line, masters/strong corpus, G3 — prose
// only). The romantic TWO-pawn version (4.Bc4 cxb2 5.Bxb2) is a roadmap-tab
// showcase; the DATA main line is Black's best …d5 return, reaching a sound,
// dead-EQUAL IQP middlegame at ply 20 (engine ~0.00). Claims verified.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Danish_Gambit'];

export const DANISH_GAMBIT_LESSON: LessonScript = {
  openingId: 'danish-gambit',
  sources: SRC,
  title: 'Danish Gambit — A Master Class',
  minutes: 10,
  orientation: 'white',
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 d4 exd4 c3',
      say: "The Danish Gambit. After d4 exd4, 3.c3 offers a pawn — and in its wildest form a SECOND, after …dxc3 Bc4 cxb2 Bxb2, for two bishops raking the long diagonals at f7 and g7. Beautiful and dangerous — but a well-prepared opponent has a clean antidote, and that is what this main line teaches. The romantic two-pawn version lives on the Accepted tab.",
      sayShort: 'c3 — offer the gambit pawn.',
      highlights: [H('c3'), H('d4')],
    }),
    b({
      id: 'd5',
      moves: 'e4 e5 d4 exd4 c3 d5',
      say: "…d5! is the great equalizer. Instead of greedily holding the extra pawn, Black hands it straight back to blunt White's attack and free his own pieces. The whole sting of the Danish — those raking bishops — never gets going.",
      sayShort: '…d5 — give the pawn back, defuse.',
      highlights: [H('d5')],
    }),
    b({
      id: 'regain',
      moves: 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4',
      say: "exd5 …Qxd5 cxd4 — the dust settles. Material is level, and White is left with an isolated pawn on d4. That IQP is the whole story now: it gives White space and open lines for the pieces, but it is also a long-term target. A balanced, classical struggle.",
      sayShort: 'cxd4 — level material, an IQP to play.',
      highlights: [H('d4')],
    }),
    b({
      id: 'develop',
      moves: 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Be2',
      say: "…Nc6 and …Bg4 hit the d4-pawn and pin the f3-knight; White calmly develops with Be2, unpinning and preparing to castle. White's lead in development — the gambit's one lasting dividend — keeps the isolated pawn well defended.",
      sayShort: 'Be2 — develop, break the pin.',
      highlights: [H('d4'), H('g4')],
    }),
    b({
      id: 'trades',
      moves: 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Be2 Bb4+ Nc3 Bxf3 Bxf3',
      say: "…Bb4+ develops with check and Nc3 blocks, defending the queenside; Black trades on f3 to soften the pressure on d4. After Bxf3 White's bishop eyes the long diagonal and the d-pawn is firmly held.",
      sayShort: 'Bxf3 — recapture, hold the d4-pawn.',
      highlights: [H('f3'), H('d4')],
    }),
    b({
      id: 'middlegame',
      moves: 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Be2 Bb4+ Nc3 Bxf3 Bxf3 Qc4 Bxc6+ bxc6',
      say: "…Qc4 pressures the d4-pawn, so White trades on c6 — and after …bxc6 Black is left with doubled c-pawns to offset White's isolated d-pawn. The verdict is honest: dead level. The Danish gives no objective edge once Black plays …d5, but White has easy development and a clean, fighting position — a perfectly good game from a 'refuted' gambit.",
      sayShort: 'Bxc6+ — trade, a balanced fight.',
      highlights: [H('d4'), H('c6'), H('c7')],
    }),
  ],
};
