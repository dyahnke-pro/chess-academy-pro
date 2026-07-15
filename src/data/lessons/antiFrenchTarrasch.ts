import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-French: the Tarrasch (3.Nd2) — video-grounded Watch build #4 (David
// 2026-07-15). The student plays WHITE. The lifetime line of the corpus
// player: 2,361 real games at 65.6% — the biggest anti-opening corpus in the
// set (data/sources/danielnaroditsky-trees/anti-french-white.json). Teaching
// mined from the dedicated videos — paraphrased, never quoted (data/sources/
// danielnaroditsky-voice/per-opening/anti-french-tarrasch.md). Every line
// chess.js-legal + engine-verified 2026-07-15: the …c5 open main +0.03 at 24
// plies (honest: level board, venomous practice), the …Nf6 closed line +0.40
// at 25 plies. Red-target grammar throughout.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'];

export const ANTI_FRENCH_TARRASCH_LESSON: LessonScript = {
  openingId: 'anti-french-tarrasch',
  sources: SRC,
  title: 'The Tarrasch — venom without the theory',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'aft-1', moves: 'e4 e6 d4 d5 Nd2',
      say: "Against the French you stand at a famous crossroads. The main move, knight to c3, walks into a jungle of theory — the Winawer pin, the Classical, thousands of memorized moves. The Exchange is drawish. So play the move that sidesteps all of it: knight to d2. The Tarrasch. Same squares controlled, but no bishop pin to worry about — there's nothing on this knight for Black to attack. Two thousand three hundred corpus games, sixty-six percent. A lifetime weapon, not a surprise trick.",
      sayShort: "Nd2 — the Tarrasch, no pin.",
      highlights: [H('d2', SOFT), H('b4', RED), H('e4', KEY)] }),
    b({ id: 'aft-2', moves: 'e4 e6 d4 d5 Nd2 c5 Ngf3',
      say: "Black's modern main move strikes at your centre immediately with the c-pawn — and you just keep developing. The king's knight comes to f3, defending d4 and refusing to be hurried. This is the Tarrasch temperament in one move: no grabbing, no lunging, every piece to a natural square while the tension does the work.",
      sayShort: "Ngf3 — develop, hold the tension.",
      arrows: [A('f3', 'd4')],
      highlights: [H('f3', SOFT), H('c5', KEY), H('d4', KEY)] }),
    b({ id: 'aft-3', moves: 'e4 e6 d4 d5 Nd2 c5 Ngf3 cxd4 Nxd4',
      say: "When Black releases the tension, recapture with the KNIGHT — not the queen, not a pawn. The knight lands on a beautiful central post, and notice what Black's third move bought him: an open c-file, yes, but also a backward-leaning structure where the e6-pawn walls in his own light-squared bishop. That bishop is the French player's lifelong regret, and this whole system is designed to never let it breathe.",
      sayShort: "Nxd4 — knight to the post.",
      highlights: [H('d4', SOFT), H('c8', RED), H('e6', KEY)] }),
    b({ id: 'aft-4', moves: 'e4 e6 d4 d5 Nd2 c5 Ngf3 cxd4 Nxd4 Nc6 Bb5',
      say: "The knight comes to c6 to challenge your centralized piece — so pin the question to it. Bishop to b5, hitting the knight that just moved and threatening to wreck the queenside structure the moment Black relaxes. Black has to spend a move on the bishop block, and you're already ahead in the only currency that matters this early: useful moves made.",
      sayShort: "Bb5 — pin the question.",
      arrows: [A('b5', 'c6')],
      highlights: [H('b5', SOFT), H('c6', RED)] }),
    b({ id: 'aft-5', moves: 'e4 e6 d4 d5 Nd2 c5 Ngf3 cxd4 Nxd4 Nc6 Bb5 Bd7 Nxc6 bxc6 Bd3',
      say: "Trade on c6 and watch the pawn structure change character: the a-pawn is cut adrift and the recaptured pawn on c6 becomes a target for the rest of the game. Then swing the bishop back to d3, re-aimed at the kingside for the middlegame ahead. You've converted the opening into exactly the kind of position this system wants: clean development, a structural target that can't run away, and not one line of sharp theory required to get here.",
      sayShort: "Nxc6, Bd3 — a target for life.",
      highlights: [H('d3', SOFT), H('c6', RED)] }),
    b({ id: 'aft-6', moves: 'e4 e6 d4 d5 Nd2 c5 Ngf3 cxd4 Nxd4 Nc6 Bb5 Bd7 Nxc6 bxc6 Bd3 Bd6 O-O Qc7 h3 Nf6 c4 O-O Qc2',
      say: "Both sides finish developing, the little h-pawn move takes g4 away before anything can use it — the same quiet prophylaxis you've seen across this whole repertoire — and then the c-pawn strikes at the centre from the side. The engine calls this position level, and that's the honest truth about the Tarrasch: it doesn't promise a forced edge. It promises a game where you know the plans — press the c-file, trade toward the weak pawns, aim the bishop at the king — and your opponent is remembering someone else's notes. Sixty-six percent over two thousand games says that's a great trade.",
      sayShort: "h3, c4 — your plans, their notes.",
      highlights: [H('c4', SOFT), H('c6', RED), H('g4', KEY)] }),
  ],
};
