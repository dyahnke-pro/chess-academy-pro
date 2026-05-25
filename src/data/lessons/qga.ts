import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): GREEN arrows = vision, YELLOW
// highlights = a key square the narration names, SOFT BLUE = context. Orange
// move-squares auto-painted by the player. BLACK-oriented (student = Black,
// accepting the QGA). Classical main line — masters-backed (PLAN.md / qga
// repertoire pgn); deepest beat reaches 22 plies.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string; moves: string; say: string; sayShort?: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const QGA_MAIN = 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Qb6 d5 exd5';

export const QGA_LESSON: LessonScript = {
  openingId: 'qga',
  title: "The Queen's Gambit Accepted — A Master Class",
  minutes: 14,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 d5',
      say: "Welcome to the Queen's Gambit Accepted — the most direct, classical way to meet 1.d4. White plays d4, you answer d5, and the stage is set for the oldest debate in chess: do you take the gambit pawn? In the QGA you do — and then hand it straight back for fast, active development.",
      sayShort: '1…d5 — meet d4 head-on.',
      highlights: [H('d5'), H('d4', SOFT)] }),
    b({ id: 'accept', moves: 'd4 d5 c4 dxc4',
      say: "c4 — the gambit; and dxc4, you accept. The crucial point: you are NOT trying to keep this pawn. Clinging to it with an early …b5 is the QGA's oldest trap, punished by a4. Instead you take, develop, and return the pawn on your own terms.",
      sayShort: "…dxc4 — accept, but don't cling.",
      highlights: [H('c4'), H('b5', SOFT)] }),
    b({ id: 'develop', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5',
      say: "White rounds up the pawn with e3 and Bxc4; you develop naturally with Nf6 and e6, then strike — c5! The thematic break, hitting White's d4-pawn and freeing your game. The pawn is back in White's hands, but you have easy, active development and a target in the centre.",
      sayShort: '…c5 — the freeing break, hits d4.',
      highlights: [H('c5'), H('d4', SOFT)] }),
    b({ id: 'expand', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3',
      say: "You castle, then expand on the queenside — a6 and b5, gaining space and chasing the bishop back to b3, where it still eyes f7. Now …b5 is no trap; it's a tempo-gaining land-grab, because your development is already complete. The queenside is yours.",
      sayShort: '…a6, …b5 — gain queenside space.',
      highlights: [H('f7', SOFT)] }),
    b({ id: 'fianchetto', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7',
      say: "Bb7 — and there is the soul of the QGA. The light-squared bishop, so often Black's problem child, here develops actively to b7 and rakes the long diagonal toward e4 and White's centre. This is the piece that makes the QGA so comfortable for Black.",
      sayShort: "…Bb7 — the QGA's soul on the long diagonal.",
      arrows: [A('b7', 'e4', ATK)] }),
    b({ id: 'complete', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Qb6',
      say: "White centralises with Rd1 and Nc3; you finish developing — Nbd7 and Qb6, the queen eyeing the d4-pawn and the half-open b-file. Every black piece is active and purposeful, the position balanced and full of life.",
      sayShort: '…Qb6 — pressure d4; fully active.',
      highlights: [H('d4')] }),
    b({ id: 'break', moves: QGA_MAIN,
      say: "White strikes with d5, and you take — exd5. The centre opens and you stand comfortably equal: the bishop on b7 is superb, your pieces are active, and White's extra space has been neutralised. The QGA delivers exactly what it promises — a sound, dynamic, fully equal game for Black.",
      sayShort: '…exd5 — open centre; equal and active.',
      highlights: [H('d5'), H('b7', SOFT)] }),
    b({ id: 'branch-central', moves: 'd4 d5 c4 dxc4 e4',
      say: "White can grab the whole centre at once with e4 — the Central Variation. Don't be intimidated: you strike back instantly with …e5, hitting d4 and opening lines for your pieces before the big centre can roll. Its own tab covers it.",
      sayShort: 'e4 — the Central; hit back with …e5.',
      highlights: [H('e4'), H('e5', SOFT)] }),
    b({ id: 'branch-smyslov', moves: 'd4 d5 c4 dxc4 Nf3 a6',
      say: "Or play the modern Smyslov move-order — a6 first, preparing …b5 and …Bb7 before committing the king's knight. Flexible, fashionable, and a tab of its own.",
      sayShort: '…a6 — the Smyslov; flexible order.',
      highlights: [H('b5', SOFT)] }),
    b({ id: 'branch-sadler', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4',
      say: "Or pin with …Bg4 — the Sadler, developing the bishop actively outside the pawn chain before …e6, sidestepping any bad-bishop worries entirely. Another tab in this masterclass.",
      sayShort: '…Bg4 — the Sadler; active bishop.',
      highlights: [H('g4')] }),
    b({ id: 'close', moves: QGA_MAIN,
      say: "That is the Queen's Gambit Accepted. Take the pawn, give it back, and play for what matters — fast development, the …c5 break, queenside space, and that wonderful bishop on the long diagonal. Classical, Smyslov, Central, Sadler: every road leads to the same place — a free, active, fully equal game with none of the QGD's cramp. Accept, and play chess.",
      sayShort: '…c5, …Bb7 — accept and play actively.',
      highlights: [H('c5', SOFT)] }),
  ],
};
