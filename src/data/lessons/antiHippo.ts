import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Hippo System (Black) — video-grounded Watch build #12 (David 2026-07-15).
// The student plays BLACK against hippo / passive-shuffle White setups (1.e3,
// 1.d3, double fianchetto). Taught system from the two dedicated videos:
// full centre, the c6+Bd6 triangle, the Lopez-style Nd7–f8–g6 reroute, the a5
// clamp, then the h5–h4 storm. Corpus: ~1,500 games vs 1.e3/1.d3 at 66–67.5%
// as Black (data/sources/danielnaroditsky-trees/anti-hippo-*.json) — the blitz
// habits there vary, so this line is TAUGHT (video + engine carry it).
// Engine-verified 2026-07-15: mainline +0.52 for Black at 28 plies;
// gxh4?? Nxh4 runs to +4.5; the d4 break met by …e4 is +2.06. Red-target
// grammar throughout.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Hippopotamus_Defence'];

export const ANTI_HIPPO_LESSON: LessonScript = {
  openingId: 'anti-hippo',
  sources: SRC,
  title: 'Punishing the Hippo',
  minutes: 7,
  orientation: 'black',
  beats: [
    b({ id: 'ahp-1', moves: 'e3 e5 d3 d5',
      say: "The Hippo and its passive cousins: White shuffles pawns to the third rank, fianchettoes somewhere eventually, and dares you to do something about it. Rule one — when your opponent declines the centre, TAKE it. Both pawns, full width. Rule two, and this is the one that decides these games: temper your expectations. You cannot punish a passive setup in the opening. Players lose to the Hippo by charging at the throat and tripping over their own attack. This system wins by patience.",
      sayShort: "They shuffle — you take the centre.",
      highlights: [H('e5', SOFT), H('d5', SOFT)] }),
    b({ id: 'ahp-2', moves: 'e3 e5 d3 d5 b3 Bd6 Bb2 Ne7 g3 O-O Bg2 c6',
      say: "The compact machine: the bishop on d6 guards the e5-pawn, the pawn on c6 guards the d5-pawn — a solid little triangle, the same shape London players build with colors reversed. The knight goes to e7 instead of f6 on purpose: from there it covers d5 a second time, and it's already packing its bags for the kingside. Castle short, always — going long against a slow setup is volunteering for risk you don't need.",
      sayShort: "The c6 triangle — everything guarded.",
      highlights: [H('d6', SOFT), H('c6', SOFT), H('e5', KEY), H('d5', KEY)] }),
    b({ id: 'ahp-3', moves: 'e3 e5 d3 d5 b3 Bd6 Bb2 Ne7 g3 O-O Bg2 c6 h3 Nd7 Ne2 Re8 Nd2 Nf8',
      say: "Now the move that separates this system from routine development: the light-squared bishop STAYS on c8. To f5 it walks into a pawn kick; to e6 it invites a knight to g5 asking for it — and White's h3-pawn may become exactly what that bishop attacks later. Don't develop a piece just to say you did. Meanwhile the rook slides to e8, lining up on the e-file behind its knight — the old master habit of stacking care around the strongpoint before anything happens — and the queenside knight begins the grand tour: d7, then f8, headed for g6, the same maneuver the classical masters used in the Ruy Lopez.",
      sayShort: "Bishop stays home — knight starts the tour.",
      arrows: [A('f8', 'g6')],
      highlights: [H('c8', KEY), H('e8', SOFT), H('e5', KEY)] }),
    b({ id: 'ahp-4', moves: 'e3 e5 d3 d5 b3 Bd6 Bb2 Ne7 g3 O-O Bg2 c6 h3 Nd7 Ne2 Re8 Nd2 Nf8 a3 a5 c3 Nfg6',
      say: "Pawn to a5 is a message: don't you dare castle queenside. If White's king ever heads that way, a4 comes, the b-pawn gets provoked forward, and c5 blasts the whole wing open with the king inside. And if White just shuffles, a4 pries at b3 and hands you the open a-file for free. Then the tour completes — knight to g6, where it does two jobs at once: another defender counted on e5, and an attacker already standing on the kingside before the attack has even been announced.",
      sayShort: "a5 handcuffs — the knight lands on g6.",
      arrows: [A('f8', 'g6')],
      highlights: [H('a5', SOFT), H('g6', SOFT), H('e5', KEY)] }),
    b({ id: 'ahp-5', moves: 'e3 e5 d3 d5 b3 Bd6 Bb2 Ne7 g3 O-O Bg2 c6 h3 Nd7 Ne2 Re8 Nd2 Nf8 a3 a5 c3 Nfg6 O-O h5 c4 h4',
      say: "White castles — and NOW the punishment begins, because now there's an address. The h-pawn marches: h5, then h4, prying directly at the g3-pawn in front of White's king. Here's the trap inside the plan: if White ever captures that pawn, the knight recaptures on h4, hits the g2-bishop, and both knights pour into the light squares — the engine calls that position winning for Black, more than four pawns' worth. So White must let the pawn stand, and the file stays loaded. Notice the c4 stab doesn't worry you either — the e7-knight was covering d5 all along.",
      sayShort: "h5, h4 — pry at the king's cover.",
      arrows: [A('e7', 'd5')],
      highlights: [H('h4', SOFT), H('g3', RED)] }),
    b({ id: 'ahp-6', moves: 'e3 e5 d3 d5 b3 Bd6 Bb2 Ne7 g3 O-O Bg2 c6 h3 Nd7 Ne2 Re8 Nd2 Nf8 a3 a5 c3 Nfg6 O-O h5 c4 h4 g4 Be6',
      say: "White has to lunge g4 to keep the h-file shut — and that lunge concedes the light squares around the king for the rest of the game. NOW the patient bishop finally moves: to e6, where it pressures the g4-pawn it was waiting for and backs up d5. Count the position: every Black piece placed, every White kingside pawn a fixed target, and the engine confirms a comfortable edge with the position still full of play. That's how you beat the Hippo — you don't refute it in the opening. You strangle it in the middlegame.",
      sayShort: "Be6 — targets fixed, squeeze on.",
      arrows: [A('e6', 'g4')],
      highlights: [H('e6', SOFT), H('g4', RED), H('h3', RED)] }),
  ],
};
