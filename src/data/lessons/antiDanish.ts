import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Danish Gambit (Black) — video-grounded Watch build (David 2026-07-15).
// The student plays BLACK. The dedicated Opening-Lab video's promise,
// paraphrased: neutralize the initiative, take everything White offers, and
// get away with it. Corpus: 51 games @ 61.8% as Black (data/sources/
// danielnaroditsky-trees/anti-danish-black.json). Engine-verified 2026-07-15:
// the full acceptance with Bb4+ and the central ...d5 counter runs to +1.01
// FOR BLACK at 24 plies (a full pawn, converted); the practical ...d5 takeout
// alternative forces a dead-level endgame that is far easier for Black to
// play. Red-target grammar; orientation black.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Danish_Gambit'];

export const ANTI_DANISH_LESSON: LessonScript = {
  openingId: 'anti-danish',
  sources: SRC,
  title: 'Demolishing the Danish Gambit',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'adn-1', moves: 'e4 e5 d4 exd4 c3',
      say: "The Danish Gambit has terrorized e4-e5 players for a century and a half: White offers pawn after pawn for raging open lines, and unprepared players lose in fifteen moves. Take it seriously — this is a real opening, not a gimmick. But here's the deal this lesson makes with you: learn the moves that matter, and you will take everything White offers and get away with it. Start by accepting: the pawn on c3 is yours.",
      sayShort: "The Danish — take it seriously.",
      highlights: [H('c3', RED), H('d4', KEY)] }),
    b({ id: 'adn-2', moves: 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2',
      say: "Take, and when the bishop comes flying out to c4 — the most common recapture order by miles — take AGAIN. Yes, really: the second pawn on b2. Now look at White's dream: both bishops raking the board, the b2-bishop staring down the long diagonal at g7, the c4-bishop at f7. Two full pawns for all that firepower. The next two moves decide whether that firepower ever fires.",
      sayShort: "Take both — now hold on.",
      arrows: [A('b2', 'g7'), A('c4', 'f7')],
      highlights: [H('b2', SOFT), H('g7', RED), H('f7', RED)] }),
    b({ id: 'adn-3', moves: 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 Bb4+',
      say: "The first move that matters: bishop to b4, CHECK. The check is the point — White must spend a tempo answering, and the natural block with the knight puts it on a square where it blocks White's own c-file pressure. You develop with tempo out of a position where White paid two pawns for tempo. Every check you give in this opening is a refund on White's investment.",
      sayShort: "Bb4 check — develop with refund.",
      arrows: [A('b4', 'e1')],
      highlights: [H('b4', SOFT), H('e1', RED)] }),
    b({ id: 'adn-4', moves: 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 Bb4+ Nc3 Nf6 e5 d5',
      say: "White blocks, you develop the knight — and when the e-pawn lunges at it, the second move that matters: pawn to d5, the central counter-strike. This one move hits the c4-bishop and opens your own queen's path — and notice that White's eager e5 push just plugged the b2-bishop's long diagonal with its own pawn. The engine's verdict on this position: Black is simply a pawn better — a full point of advantage — because both white bishops just lost their targets in a single move.",
      sayShort: "d5 — one move, both bishops blunted.",
      highlights: [H('d5', SOFT), H('c4', RED), H('b2', RED)] }),
    b({ id: 'adn-5', moves: 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 Bb4+ Nc3 Nf6 e5 d5 exf6 Qxf6',
      say: "White wins the knight back — and your queen recaptures, arriving actively on f6, ready to castle long behind your extra pawns. Count the wreckage of White's gambit: the attack never landed, the queens are active on YOUR terms, and you still hold the extra pawn. From here the corpus games convert methodically: consolidate, trade pieces not pawns, and let the material speak.",
      sayShort: "Qxf6 — extra pawn, your terms.",
      highlights: [H('f6', SOFT), H('d5', KEY)] }),
  ],
};
