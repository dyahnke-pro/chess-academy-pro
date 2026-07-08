import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Scandinavian (1.e4 d5 2.exd5 Qxd5) — main-line master class. The student
// plays WHITE. Black recaptures with the queen early, so White develops with
// tempo (Nc3 hits the queen), builds a big centre for free, and emerges with the
// bishop pair and a lead in development. Spine is both-sides-sound
// (build-sound-spine.mjs) to a middlegame, engine-verified (+0.60 White).
// chess.js-legal. Arrows: non-pawn pieces, clear sight-line. Highlights: named
// squares.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];

/** Main line vs 2...Qxd5 3.Nc3 Qa5: develop with tempo, build the d4 centre,
 *  chase the loose pieces with Ne4/Ng3, and bank the bishop pair + development
 *  lead — a clean, low-maintenance edge. */
export const ANTI_SCANDINAVIAN_LESSON: LessonScript = {
  openingId: 'anti-scandinavian',
  sources: SRC,
  title: 'Beating the Scandinavian — develop with tempo',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'sca1', moves: 'e4 d5 exd5 Qxd5 Nc3',
      say: "Here's the whole story of the Scandinavian in a single move. Black snatches your e-pawn — but look what it costs him: the queen is already out on d5, and Nc3 doesn't just develop, it develops WITH tempo, hitting the queen. Every move Black now spends babysitting that queen to safety is a move you spend building. Lodge that idea in your head; the entire line runs on it.",
      sayShort: "Nc3 — develop and hit the queen.",
      arrows: [A('c3', 'd5')], highlights: [H('d5', ATK), H('c3', KEY)] }),
    b({ id: 'sca2', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4',
      say: "The queen scurries to a5, and now you just… build. d4 plants the big centre, Nf3 comes out as naturally as breathing, and Bc4 rakes the diagonal straight at f7 — the softest square in Black's camp. And notice: Black has to burn a whole move on c6 purely to give that queen a bolt-hole. There's the tempo gift again — you're a clean move ahead with more space, and you paid nothing for it.",
      sayShort: "d4, Nf3, Bc4 — build for free.",
      arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', ATK)] }),
    b({ id: 'sca3', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6',
      say: "Bf5 is a genuinely good move — Black gets the bishop outside the pawn chain BEFORE e6 locks it in, very natural. You answer with Bd2, and it's quietly doing two jobs at once: unpinning the c3-knight and clearing the road to castle long. Black shores up with e6. Nothing forcing here — but every piece you own is quietly pointed at Black's slightly loose army.",
      sayShort: "Bd2 — unpin, ready to castle long.",
      highlights: [H('d2', KEY), H('f5', SOFT)] }),
    b({ id: 'sca4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Ne4 Qd8 Ng3',
      say: "Now you start harrying. Ne4 pokes the f6-knight and shoos the queen all the way home to d8 — there goes another tempo — and then Ng3 wheels around and hits the f5-bishop. This is the Scandinavian squeeze in miniature: piece by piece, you gain time, your knights find better squares, and Black's pieces keep getting nudged onto worse ones. Nothing dramatic — just relentless.",
      sayShort: "Ne4, Ng3 — chase with tempo.",
      arrows: [A('e4', 'f6'), A('g3', 'f5')], highlights: [H('e4', KEY), H('f6', ATK), H('f5', ATK)] }),
    b({ id: 'sca5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Ne4 Qd8 Ng3 Bg4 c3 Nbd7 h3 Bxf3',
      say: "The bishop slides to g4 and pins your f3-knight; you calmly prop the centre with c3, finish developing, and pop the question with h3. When Black concedes with Bxf3, you take back with the queen and pocket the bishop pair. Now tally it all up: two bishops, a broad centre, more space, a safer king. You never did a single flashy thing — you just kept collecting, move after move. That's how you beat the Scandinavian.",
      sayShort: "h3 — win the bishop pair, comfortable edge.",
      highlights: [H('f3', KEY), H('d4', SOFT)] }),
  ],
};
