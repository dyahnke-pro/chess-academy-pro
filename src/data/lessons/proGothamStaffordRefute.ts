import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-development', 'concept:pos-material', 'https://en.wikipedia.org/wiki/Petrov%27s_Defense'];

// GothamChess Stafford Refutation (1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 — the
// Stafford gambit setup is met with Nxc6 dxc6 + d3/Be2/O-O sober
// development). Levy plays this 3 wins in his dump (top vs 2668, game
// 110071862503). The "how to NOT die in the Stafford" antidote — refuse
// the wild attacking ideas, return material when sensible, walk away
// with a pawn and a clean structure.
export const PRO_GOTHAMCHESS_STAFFORD_REFUTE_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-stafford-refute',
  sources: SRC,
  title: 'Refuting the Stafford — GothamChess Master Class',
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'nxe5-nc6',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6'],
      highlights: [{ square: 'c6', color: KEY }],
      say: "Levy teaches the antidote to the Stafford Gambit — and plays it himself (3 wins in his dump, top opponent 2668). After 2...Nf6 3.Nxe5 Nc6 — the Stafford's whole setup — White is at the critical fork. Greedy ideas like 4.Nxc6 dxc6 5.e5 or 4.d4 invite tactical fireworks. Levy chooses the calm path: simplify, decline the trap, keep the structure clean.",
      sayShort: '3...Nc6 — the Stafford setup, time to defuse.',
    },
    {
      id: 'd3',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3'],
      arrows: [{ from: 'd2', to: 'd3', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }],
      say: "Nxc6 dxc6 d3! — the disarming move. Instead of grabbing the second pawn with Nxc6 followed by e5 (which the Stafford lines all weaponise), Levy plays d3 — quietly defending e4 and refusing the bait. The pawn is extra, the structure is fine, and all the Stafford's attacking ideas (...Qd7/...Bg4/...O-O-O) have nothing to target.",
      sayShort: 'd3 — disarm the gambit, decline the second pawn.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be2', 'Ng4', 'Bxg4'],
      arrows: [{ from: 'e2', to: 'g4', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }],
      say: "From his real win vs 2668: Black tries the standard Stafford piece play with ...Bc5 and ...Ng4 (looking for ...Nxf2 fireworks). Levy just trades: Bxg4! takes the knight. Black has no compensation for the lost piece, the gambit has fizzled, and White is up clean material with a sound structure. The whole gambit defused in 7 moves.",
      sayShort: 'Bxg4 — take the knight, gambit fizzles, won.',
    },
  ],
};
