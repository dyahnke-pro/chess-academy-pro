import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://lichess.org/study/HnDkcRZY', 'concept:pos-development', 'concept:pos-pawn-island'];

// GothamChess's Caro-Kann (1.e4 c6). His #1 black signature — 1,504 games in
// his dump, top win vs 3293. Three full lichess studies + this lesson grounds
// in his real Classical Nc3 / dxe4 / Bf5 mainline (24-ply line anchors the
// FULL 24 plies in HIS DATABASE).
export const PRO_GOTHAMCHESS_CARO_KANN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-caro-kann',
  sources: SRC,
  title: 'The Caro-Kann — GothamChess Master Class',
  minutes: 9,
  orientation: 'black',
  beats: [
    {
      id: 'bf5',
      moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
      arrows: [{ from: 'f5', to: 'e4', color: VIS }],
      highlights: [{ square: 'f5', color: KEY }],
      say: "Gotham's #1 Black weapon — Levy plays this 1,504 times in his dump AND he TEACHES it in three separate Caro-Kann lichess studies. The Caro-Kann's signature: ...c6 prepares ...d5, then after the central trade Black develops the light-squared bishop OUTSIDE the pawn chain with Bf5. This is the move the French cannot play and is exactly why the Caro is the solid French replacement Gotham loves — the bishop gets out before ...e6 traps it.",
      sayShort: '...Bf5 — bishop out before ...e6.',
    },
    {
      id: 'bg6-h4',
      moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6'],
      highlights: [{ square: 'g6', color: KEY }],
      say: "White chases with Ng3 hitting the bishop; Black retreats to g6, where the bishop is awkwardly placed but very safe. White launches h4, daring ...h5 — but Black plays ...h6, refusing to commit and forcing White to decide between h5 (chasing the bishop) and a slower setup. Patience wins this race.",
      sayShort: '...Bg6 then ...h6 — patient, no commitments.',
    },
    {
      id: 'e6-trade',
      moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6'],
      arrows: [{ from: 'h7', to: 'd3', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "White finally commits to h5 chasing the bishop to h7, then offers the trade with Bd3. Black takes — ...Bxd3 Qxd3 — and ...e6 completes the classic Caro structure: c6/d5/e6 pyramid, all pieces developed, no weaknesses, the dark squares fine. White has more space but Black is rock-solid.",
      sayShort: '...Bxd3 then ...e6 — Caro pyramid locked in.',
    },
    {
      id: 'deep',
      moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Bd2', 'Ngf6', 'O-O-O', 'Be7'],
      highlights: [{ square: 'e7', color: KEY }, { square: 'e6', color: SOFT }],
      say: "White castles long with O-O-O signalling an opposite-side attack — but Black is fully ready: ...Ngf6 and ...Be7 finish development, and with the c6/d5/e6 pyramid covering the central files, Black's own queenside attack will arrive at least as fast. The Caro's promise: solid structure + active piece play, never a bad position.",
      sayShort: '...Be7 done — opposite castling, attack ready.',
    },
  ],
};
