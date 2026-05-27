// DRAFT — NOT YET REGISTERED. Spines need DB-canonical move-order alignment so each
// beat anchors >=6 plies in openings-lichess.json (DB orders the London as
// 'd4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6 Nc3' / 'd4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 Be2'). Re-derive
// the move arrays to follow a real DB line for >=6 plies, then re-register (index.ts,
// registry.ts, opening-manifests.json) + run lessonIntegrity. See plan 6f.
import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://lichess.org/video/NKPsysr5Qqw', 'concept:pos-development'];

// The London System — Eric Rosen's white workhorse. White-oriented; spine is
// chess.js + explorer-verified (22-ply main line into the Ne5/f4 attack).
export const PRO_ERICROSEN_LONDON_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-london',
  sources: SRC,
  title: 'The London System — Eric Rosen Master Class',
  minutes: 10,
  orientation: 'white',
  beats: [
    {
      id: 'bishop-out',
      moves: ['d4', 'd5', 'Bf4'],
      arrows: [{ from: 'f4', to: 'c7', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }],
      say: "The London is the system Eric Rosen plays more than anything else — and it starts with a single confident move: Bf4, the bishop out early, before it can ever be locked behind the pawns. From f4 it stares down the long diagonal toward c7 and the heart of Black's queenside. You don't memorize lines here; you learn one harmonious setup and play it against almost everything.",
      sayShort: 'Bf4 — the bishop out early, eyeing c7.',
    },
    {
      id: 'the-system',
      moves: ['d4', 'd5', 'Bf4', 'Nf6', 'Nf3', 'e6', 'e3'],
      highlights: [{ square: 'e3', color: KEY }],
      say: "Here is the whole skeleton: Nf3, then e3 to give the f4-bishop a retreat and free the light bishop. This same structure — d4, Bf4, e3, Nf3, c3, Nbd2, Bd3 — appears against the King's Indian, the …c5 lines, everything. Learn it once; the moves barely change. That is the London's promise: a complete, low-theory system you can play on autopilot and still attack.",
      sayShort: 'e3 — the London skeleton takes shape.',
    },
    {
      id: 'c5-c3',
      moves: ['d4', 'd5', 'Bf4', 'Nf6', 'Nf3', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6'],
      highlights: [{ square: 'c3', color: KEY }],
      say: "Black strikes the centre with c5 and offers a bishop trade with Bd6. c3 is the quiet glue — it props up d4 and builds the solid pawn triangle so Black's c5 break never amounts to anything. White is never worse here; the position is a coiled spring waiting to release on the kingside.",
      sayShort: 'c3 — the pawn triangle absorbs …c5.',
    },
    {
      id: 'bg3-bd3',
      moves: ['d4', 'd5', 'Bf4', 'Nf6', 'Nf3', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }],
      say: "When Black offers the trade, the bishop slides back to g3 — keeping the prized dark-squared bishop and its aim at Black's kingside. Then Bd3 lines the second bishop up on the b1–h7 diagonal, pointed straight at h7. Both bishops now glare at the black king. This battery is the London's attacking soul.",
      sayShort: 'Bg3 then Bd3 — both bishops aim at h7.',
    },
    {
      id: 'ne5',
      moves: ['d4', 'd5', 'Bf4', 'Nf6', 'Nf3', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'b6', 'O-O', 'Bb7', 'Ne5'],
      arrows: [{ from: 'e5', to: 'g6', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }],
      say: "Ne5 — the thematic leap. The knight plants itself on the central outpost, eyeing g6 and f7, daring Black to trade it off and hand White the f-file or a raking recapture. Everything has pointed here: the knight on e5 is the spearhead of the kingside attack the whole setup was building toward.",
      sayShort: 'Ne5 — the knight seizes the outpost.',
    },
    {
      id: 'f4-deep',
      moves: ['d4', 'd5', 'Bf4', 'Nf6', 'Nf3', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'b6', 'O-O', 'Bb7', 'Ne5', 'Ne7', 'f4', 'Nf5'],
      highlights: [{ square: 'f4', color: KEY }],
      say: "f4 cements the knight on e5 and turns the kingside into White's playground. Black scrambles to trade pieces with Ne7-f5, but White's plan is overwhelming and simple: the rook lifts, the queen swings to the kingside, and the bishops on g3 and d3 do the rest. From a quiet system opening, White has built a full-blooded attack — and never had to remember a single forcing line to get here.",
      sayShort: 'f4 — cements e5, the kingside attack rolls.',
    },
  ],
};
