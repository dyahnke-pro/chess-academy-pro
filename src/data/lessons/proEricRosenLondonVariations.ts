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

// London variation tabs — keyed `pro-ericrosen-london::<name>`. Lines are
// chess.js + explorer-verified to 20+ plies; arrows sight-line-checked.
export const PRO_ERICROSEN_LONDON_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-ericrosen-london::Standard Setup vs ...d5': {
    openingId: 'pro-ericrosen-london',
    sources: SRC,
    title: 'London vs …d5 — The Standard Plan',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'std-structure',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'Nf3', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6'],
        highlights: [{ square: 'c3', color: KEY }],
        say: "Against the solid …d5/…e6/…c5 setup, White just builds the system and stays unhurried. c3 holds the centre; the only question Black poses is the Bd6 trade offer, and White has a tidy answer that keeps the good bishop.",
        sayShort: 'Build the system; c3 holds.',
      },
      {
        id: 'std-deep',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'Nf3', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'b6', 'O-O', 'Bb7', 'Ne5', 'Ne7', 'f4', 'Nf5'],
        highlights: [{ square: 'e5', color: KEY }, { square: 'h7', color: SOFT }],
        say: "Bg3 saves the bishop, the light bishop aims at h7, and the knight plants on e5 with f4 behind it as the spearhead. Black's …Ne7–f5 fights for the light squares, but White's attack writes itself — rook lift, queen to the kingside, both bishops firing. The standard plan, every time.",
        sayShort: 'Knight on e5 + f4, bishop on h7 — attack rolls.',
      },
    ],
  },
  "pro-ericrosen-london::vs King's Indian Setup": {
    openingId: 'pro-ericrosen-london',
    sources: SRC,
    title: 'London vs the King’s Indian',
    minutes: 5,
    orientation: 'white',
    beats: [
      {
        id: 'kid-c4',
        moves: ['d4', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nf3', 'O-O', 'Be2', 'd6', 'O-O', 'Nbd7', 'h3', 'Re8', 'c4'],
        arrows: [{ from: 'f4', to: 'd6', color: VIS }],
        highlights: [{ square: 'c4', color: KEY }],
        say: "When Black fianchettoes with …g6 and …Bg7, the accelerated 2.Bf4 move order pays off — the bishop is already outside the pawn chain. White grabs a broad centre with c4, and the f4-bishop keeps pressure on the d6-pawn that anchors Black's whole King's Indian setup.",
        sayShort: 'c4 — grab the centre vs the fianchetto.',
      },
      {
        id: 'kid-deep',
        moves: ['d4', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nf3', 'O-O', 'Be2', 'd6', 'O-O', 'Nbd7', 'h3', 'Re8', 'c4', 'e5', 'dxe5', 'dxe5', 'Nxe5', 'Nxe5'],
        arrows: [{ from: 'f4', to: 'e5', color: VIS }],
        highlights: [{ square: 'e5', color: KEY }],
        say: "Black tries to free himself with …e5. White trades cleanly in the centre and lands a knight on e5; when Black takes it, the f4-bishop recaptures with gain, leaving White comfortably placed with the bishop pair pointed at the long diagonal. No theory, just clean central play.",
        sayShort: 'Trade on e5 — comfortable, bishop pair.',
      },
    ],
  },
  'pro-ericrosen-london::vs ...c5 Defense': {
    openingId: 'pro-ericrosen-london',
    sources: SRC,
    title: 'London vs …c5 — The Queen-Trade',
    minutes: 5,
    orientation: 'white',
    beats: [
      {
        id: 'c5-qb3',
        moves: ['d4', 'd5', 'Bf4', 'c5', 'e3', 'Nc6', 'Nf3', 'Nf6', 'c3', 'Qb6', 'Qb3'],
        arrows: [{ from: 'b3', to: 'b6', color: VIS }],
        highlights: [{ square: 'b6', color: KEY }],
        say: "Black hits the centre early with …c5 and probes the b2-pawn by swinging the queen to b6. The clean reply is Qb3 — meeting it on b6 up the file and offering the trade. Defending passively is what Black wants; instead White neutralizes the probe and heads for a safe, pleasant game.",
        sayShort: 'Qb3 — meet the queen on b6, offer the trade.',
      },
      {
        id: 'c5-deep',
        moves: ['d4', 'd5', 'Bf4', 'c5', 'e3', 'Nc6', 'Nf3', 'Nf6', 'c3', 'Qb6', 'Qb3', 'c4', 'Qxb6', 'axb6', 'Nbd2', 'b5', 'Be2', 'b4', 'O-O', 'Bf5'],
        highlights: [{ square: 'c4', color: KEY }],
        say: "After the queens come off, Black grabs space with …c4 and …b5–b4, but White's c3 triangle is rock-solid and the doubled b-pawns give Black nothing. It's a balanced, risk-free endgame where White simply develops, castles, and plays the better structure. The London absorbs the …c5 aggression and hands it back as a comfortable ending.",
        sayShort: 'Queens off — solid, risk-free endgame.',
      },
    ],
  },
};
