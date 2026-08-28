import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// The Belgrade Gambit (Four Knights Scotch, 5.Nd5!?) — video-grounded Watch
// build #2 (David 2026-07-15). The student plays WHITE. A revived surprise
// weapon: the old treatments were close to lost, but the modern engine-checked
// handling (Bd3 setups, calm regains) gives White a fully sound game with
// enormous practical sting — 70.9% across the 158-game corpus
// (data/sources/danielnaroditsky-trees/belgrade.json). Teaching mined from the
// dedicated theory video — paraphrased, never quoted (data/sources/
// danielnaroditsky-voice/per-opening/belgrade-gambit.md). Every line
// chess.js-legal + engine-verified 2026-07-15: mainline +0.03 (level, honest),
// the greedy ...Ne5 regain-attempt REFUTED at +3.68, h6 met by Bf4 (+0.36 —
// the engine settles what the video half-remembered). Red-target grammar.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Belgrade_Gambit'];

export const BELGRADE_GAMBIT_LESSON: LessonScript = {
  openingId: 'belgrade-gambit',
  sources: SRC,
  title: 'The Belgrade Gambit — a buried weapon, revived',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'bg-1', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4',
      say: "Four knights on the board, and then the strike: pawn to d4, hitting e5 and demanding an answer. This is the Four Knights Scotch — solid, classical, and about to turn very sharp. Across 158 games in your grandmaster corpus, the line you're about to learn scores nearly 71 percent — not because it's objectively winning, but because almost nobody on the other side has ever faced it.",
      sayShort: "Four knights, then d4 — strike.",
      highlights: [H('d4', SOFT), H('e5', RED)] }),
    b({ id: 'bg-2', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5',
      say: "Black takes — and instead of recapturing, the knight leaps to d5. This is the Belgrade Gambit, a line most players will see for the first time when it lands on their board. You're a pawn down and completely unbothered: the knight radiates power, hitting the f6-knight and eyeing the fork square on c7, and Black now faces a genuine dilemma — half a dozen playable replies, each with its own trap doors, and the clock already ticking.",
      sayShort: "Nd5 — the Belgrade Gambit lands.",
      arrows: [A('d5', 'f6'), A('d5', 'c7')],
      highlights: [H('d5', SOFT), H('f6', RED), H('c7', RED)] }),
    b({ id: 'bg-3', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Be7 Bd3',
      say: "The modest bishop move is the book's main recommendation — develop, ask the knight what it's doing. And here is where the old gambit died and the new one begins: the original players rushed with the f4-bishop and hurried to grab the pawn back, and got worse positions for it. The modern move is bishop to d3 — quiet, almost unknown, engine-approved. You develop toward the king, keep every regaining resource in reserve, and simply refuse to be provoked.",
      sayShort: "Bd3 — the modern treatment.",
      highlights: [H('d3', SOFT), H('e7', KEY)] }),
    b({ id: 'bg-4', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Be7 Bd3 O-O O-O d6 h3',
      say: "Both sides castle, Black shores up with the d-pawn, and the little pawn move to h3 takes g4 away from every Black piece before it can matter. Count the position: Black still holds the extra pawn on d4, but it's going nowhere — and every White piece points somewhere useful while Black's queenside hasn't moved. The pawn is a loan, not a loss.",
      sayShort: "Castle, h3 — the pawn's a loan.",
      highlights: [H('h3', SOFT), H('g4', KEY), H('d4', RED)] }),
    b({ id: 'bg-5', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Be7 Bd3 O-O O-O d6 h3 Nxd5 exd5',
      say: "Sooner or later Black trades on d5, and this recapture is the position's whole story: the e-pawn takes, and suddenly the c6-knight is attacked and has to move again. This is why the simplifying trade almost always favors White — every exchange on d5 hands you space and a free hit on c6. This simplification has been tried against the line at the very top level — and never fully equalized.",
      sayShort: "exd5 — space, plus a hit on c6.",
      highlights: [H('d5', SOFT), H('c6', RED)] }),
    b({ id: 'bg-6', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Be7 Bd3 O-O O-O d6 h3 Nxd5 exd5 Ne5 Nxd4',
      say: "The knight hops to e5 looking active — and you calmly collect your pawn back with the knight. Be precise with the recapture order: in the variation where Black simplifies early, before anyone castles, this same knight-hop to e5 loses a piece outright to checks down the e-file — the engine puts that refutation at nearly four pawns, and it's waiting in the variations panel. Here, played correctly, material is level again and every trace of Black's opening advantage is gone.",
      sayShort: "Nxd4 — pawn back, position level.",
      highlights: [H('d4', SOFT), H('e5', KEY)] }),
    b({ id: 'bg-7', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Be7 Bd3 O-O O-O d6 h3 Nxd5 exd5 Ne5 Nxd4 Nxd3 Qxd3',
      say: "Knights and bishops come off, the queen recaptures on d3, and let's be honest about what the engine says: dead level. So why does this line score seventy-one percent across 158 corpus games? Because equal and familiar are different things. You know the plans — the d5 wedge, the c4 clamp, the e-file — and your opponent burned their clock surviving an opening they'd never seen. That's what a modern gambit really buys.",
      sayShort: "Qxd3 — level board, unlevel clocks.",
      highlights: [H('d3', SOFT), H('d5', KEY)] }),
    b({ id: 'bg-8', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Be7 Bd3 O-O O-O d6 h3 Nxd5 exd5 Ne5 Nxd4 Nxd3 Qxd3 Bf6 c4 b6 Re1 Re8 Bd2',
      say: "Into the middlegame with a plan in three parts: the c-pawn clamps the queenside and defends the wedge on d5, the rook takes the open e-file — staring at e8 — and the bishop reroutes toward c3 to fight for the long diagonal against Black's f6-bishop. Space, the file, and the better structure to press with. From a 'refuted' gambit, you've reached exactly the kind of position strong players win on technique.",
      sayShort: "c4, Re1, Bd2 — press the wedge.",
      arrows: [A('e1', 'e8'), A('d2', 'c3')],
      highlights: [H('c4', SOFT), H('d5', SOFT), H('e8', RED), H('f6', KEY)] }),
  ],
};
