import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): GREEN arrows = vision, YELLOW
// highlights = a key square the narration names, SOFT BLUE = context. Orange
// move-squares auto-painted by the player. WHITE-oriented (student = White).
// Open Catalan main line — masters-backed (catalan-opening repertoire pgn);
// deepest beat 21 plies.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const CAT_MAIN = 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4 b5 Qc2 Bb7 Bd2 Nc6 Nc3';

export const CATALAN_OPENING_LESSON: LessonScript = {
  openingId: 'catalan-opening',
  title: 'The Catalan Opening — A Master Class',
  minutes: 14,
  orientation: 'white',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 e6 g3',
      say: "Welcome to the Catalan — the signature 1.d4 weapon of Kramnik and Carlsen, who have won countless games from positions the engine calls dead equal. White builds a Queen's Gambit with a twist: after d4, c4, and the quiet g3, White prepares to fianchetto the king's bishop. That bishop is the soul of the whole opening.",
      sayShort: 'g3 — preparing the Catalan fianchetto.',
      highlights: [H('g3')] }),
    b({ id: 'the-bishop', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2',
      say: "Black stakes a claim with d5, and White plays Bg2 — the Catalan bishop. From g2 it rakes the entire long diagonal toward d5, c6, b7 and a8, pressuring Black's queenside from the very start. This one bishop generates the Catalan's famous long-term squeeze.",
      sayShort: 'Bg2 — the Catalan bishop, long diagonal.',
      arrows: [A('g2', 'd5', ATK)] }),
    b({ id: 'gambit', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4',
      say: "Black often grabs the c-pawn — dxc4, the Open Catalan. But White is in no hurry to recapture. That is the whole point of the Catalan gambit: while Black spends moves holding or returning the pawn, White's fianchettoed bishop and central space build a lasting initiative. The pawn comes back; the pressure stays.",
      sayShort: '…dxc4 — the Open Catalan; let it go.',
      highlights: [H('c4')] }),
    b({ id: 'recover', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4',
      say: "Qc2 and Qxc4 — White regains the pawn with the queen, never disturbing the great bishop on g2. This is the Catalan's efficiency: the queen does the pawn-grabbing while the bishop keeps raking the long diagonal. Material is level again, and White has kept every positional trump.",
      sayShort: 'Qxc4 — regain the pawn, keep the bishop.',
      highlights: [H('c4'), H('g2', SOFT)] }),
    b({ id: 'expand', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4 b5 Qc2 Bb7',
      say: "Black expands with b5 and meets White's bishop with one of his own — Bb7. The two light-squared bishops face off down the long diagonal. But White's is the better-placed: behind it sits more central space and easier development, while the Bb7 merely bites on the solid d4-pawn.",
      sayShort: '…b5, …Bb7 — the bishops face off.',
      highlights: [H('d4', SOFT)] }),
    b({ id: 'squeeze', moves: CAT_MAIN,
      say: "White completes development — Bd2 and Nc3 — reaching the ideal Catalan middlegame. The position looks quiet, even equal; but White's pieces are a touch more active, his bishop a touch better, his space a touch greater, the pressure aimed all the way down to b7 and a8. This is how Carlsen wins: a tiny, permanent pull on the long diagonal, squeezed for fifty moves. The Catalan is positional water-torture.",
      sayShort: 'Bd2, Nc3 — the long Catalan squeeze.',
      highlights: [H('b7', SOFT), H('a8', SOFT)] }),
    b({ id: 'branch-closed', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6',
      say: "Black can decline to take and play solidly — the Closed Catalan, with c6 and Nbd7, building a Slav-like wall. The c6-pawn temporarily blunts White's bishop, so White switches plans: prepare the central e4 break to blow the position open and unleash the Bg2. Its own tab walks the line.",
      sayShort: '…c6 — the Closed Catalan; prepare e4.',
      highlights: [H('c6'), H('e4', SOFT)] }),
    b({ id: 'branch-open-a6', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6',
      say: "Or Black tries to keep the extra pawn — dxc4 then a6, the sharp Open Catalan with …a6, bracing …b5 to hold the booty. White strikes back with a4 and Ne5, regaining the pawn with interest as the Bg2 roars to life on the long diagonal. A whole tab.",
      sayShort: '…dxc4 …a6 — a4 and Ne5 hit back.',
      highlights: [H('c4'), H('b5', SOFT)] }),
    b({ id: 'branch-qa4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Bd7',
      say: "And the simplest recovery of all — against an early …dxc4 with …Bd7, White plays Ne5, hunting the loose c4-pawn down with the fianchettoed pieces and often snapping it back at once with Qa4 ideas. Covered in its own tab.",
      sayShort: '…Bd7 — Ne5 and Qa4 recover the pawn.',
      highlights: [H('c4'), H('e5', SOFT)] }),
    b({ id: 'close', moves: CAT_MAIN,
      say: "That is the Catalan — the Queen's Gambit fused with a fianchetto. Offer the c-pawn, regain it without ever moving the great bishop, and settle into a long, grinding squeeze: more space, the long diagonal, the better minor piece. Open, Closed, Declined — every road keeps that bishop on g2 staring down at a8. Master the squeeze, and you'll win games from positions that look dead equal, exactly the way the world champions do.",
      sayShort: 'One bishop on g2 — the endless squeeze.',
      highlights: [H('g2', SOFT), H('a8', SOFT)] }),
  ],
};
