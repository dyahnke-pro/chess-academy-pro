import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Jobava London — variation lessons for his 2,170-game
// d4 + Nc3 + Bf4 system. The Bf4 placement (vs the regular London's
// Bd2/Be3) keeps tactical pressure on c7 and the long diagonal.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'https://www.chess.com/openings/Jobava-London-System',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// e6 French Setup — 528g 67.5%
// Black plays French-style ...e6 + ...Nf6 + ...Bd6.
// ============================================================
const E6_FRENCH: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london',
  title: 'e6 French Setup — Bf4 vs Bd6 trade',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e6-open', moves: 'd4 d5 Nc3 e6',
      highlights: [{ square: 'e6', color: KEY }],
      say: "d4 d5 Nc3 e6 — Black plays a French-style setup, supporting d5 with the e6-pawn. The locked centre suits our tactical Jobava style: we don't need the centre to open to attack, the Bf4 + Nc3 combination provides the pressure.",
      sayShort: '…e6 — French setup.',
    }),
    b({
      id: 'e6-bf4', moves: 'd4 d5 Nc3 e6 Bf4',
      highlights: [{ square: 'f4', color: KEY }],
      say: "Bf4 — the bishop on its natural square. Unlike the regular London (Bd2/Be3), the Bf4 is active from move 3, controlling the long diagonal and the c7-square. Black's natural development is now constrained.",
      sayShort: 'Bf4 — active bishop.',
    }),
    b({
      id: 'e6-nf6', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3',
      highlights: [{ square: 'e3', color: SOFT }, { square: 'f6', color: KEY }],
      say: "…Nf6 e3 — Black develops the kingside knight, we play e3 supporting the centre and preparing Nf3 + Bd3. The pawn structure is locked, the middlegame plan is piece coordination + Nb5 ideas.",
      sayShort: 'e3 — support centre.',
    }),
    b({
      id: 'e6-bd6', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'f4', color: SOFT }],
      say: "…Bd6 — Black offers the bishop trade. We have a choice: accept (Bxd6 cxd6, opens the c-file for Black) or decline (Bg3, keeping the bishop active). Most often we trade — the open c-file is fine for our developed Nc3.",
      sayShort: '…Bd6 — bishop trade offer.',
    }),
    b({
      id: 'e6-trade', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6 Bxd6 cxd6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Bxd6 …cxd6 — we accept the trade. Black's pawn structure now has doubled d-pawns (d5 + d6) AND the c-file is half-open for our rook. Long-term structural pressure begins.",
      sayShort: 'Bxd6 cxd6 — doubled d-pawns.',
    }),
    b({
      id: 'e6-develop', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6 Bxd6 cxd6 Nf3 Nc6 Bd3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "Nf3 …Nc6 Bd3 — both develop, we put the bishop on d3 aiming at h7. The classical kingside attack pattern is set up: Bd3 + Qe2 + O-O + Ne5 + f4 — a slow but devastating attack on the locked-in Black king.",
      sayShort: 'Bd3 — kingside attack.',
    }),
  ],
};

// ============================================================
// c6 Slav-Style — 390g 72.3%
// Black plays ...c6 supporting d5 from the queenside.
// ============================================================
const C6_SLAV: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london',
  title: 'c6 Slav-Style — Bf5 vs Bf4 standoff',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'c6-open', moves: 'd4 d5 Nc3 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "d4 d5 Nc3 c6 — Black plays Slav-style, supporting d5 with the c-pawn. The setup is solid but passive. We continue with our Jobava system development: Bf4 + e3 + Nf3 + Bd3.",
      sayShort: '…c6 — Slav setup.',
    }),
    b({
      id: 'c6-bf4', moves: 'd4 d5 Nc3 c6 Bf4 Nf6 e3 Bf5',
      highlights: [{ square: 'f4', color: SOFT }, { square: 'f5', color: KEY }],
      say: "Bf4 …Nf6 e3 …Bf5 — both bishops come out actively. The Bf5 vs Bf4 standoff is the variation's defining moment. The trade (Bxf5 or …Bxf4) eventually happens, but the position around it favours White's piece coordination.",
      sayShort: '…Bf5 — bishop standoff.',
    }),
    b({
      id: 'c6-nf3', moves: 'd4 d5 Nc3 c6 Bf4 Nf6 e3 Bf5 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Nf3 — develop the king knight. We're not in a hurry to trade bishops; we just complete development. The Bf5 might prove vulnerable to our Nh4 attacking ideas later.",
      sayShort: 'Nf3 — develop.',
    }),
    b({
      id: 'c6-bd3', moves: 'd4 d5 Nc3 c6 Bf4 Nf6 e3 Bf5 Nf3 e6 Bd3',
      highlights: [{ square: 'd3', color: KEY }, { square: 'f5', color: SOFT }],
      say: "…e6 Bd3 — Black supports the bishop, we offer a trade. The Bd3 vs Bf5 trade either happens (simplifying favorably for us) or Black declines and we follow up with Nh4 attacking the bishop.",
      sayShort: 'Bd3 — bishop trade.',
    }),
    b({
      id: 'c6-castle', moves: 'd4 d5 Nc3 c6 Bf4 Nf6 e3 Bf5 Nf3 e6 Bd3 Bxd3 Qxd3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "…Bxd3 Qxd3 — Black trades, we recapture with the queen. The queen on d3 is centralised and supports a coming kingside attack. From here e4 break or queenside expansion are both options.",
      sayShort: 'Qxd3 — queen centralised.',
    }),
    b({
      id: 'c6-finish', moves: 'd4 d5 Nc3 c6 Bf4 Nf6 e3 Bf5 Nf3 e6 Bd3 Bxd3 Qxd3 Nbd7 O-O',
      highlights: [{ square: 'g1', color: KEY }],
      say: "…Nbd7 O-O — both develop and castle. The middlegame plan: Ne5 outpost + queenside expansion via b4-b5 + central break with e4. The Jobava's classical themes converge into a winning structure.",
      sayShort: 'O-O — finish setup.',
    }),
  ],
};

// ============================================================
// a6 with ...c5 — 261g 73.0% (his BEST scoring variation)
// Black prepares ...c5 with the slow ...a6 move order.
// ============================================================
const A6_C5: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london',
  title: 'a6 with ...c5 — slow Black expansion',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'a6-open', moves: 'd4 d5 Nc3 Nf6 Bf4 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "After Bf4, Black plays …a6 preparing a slow …c5 + …Nc6 expansion. The …a6 is a strange opening move; Black wants flexibility to play …b5 or …c5 later. The slowness gives us free development time.",
      sayShort: '…a6 — slow expansion.',
    }),
    b({
      id: 'a6-e3', moves: 'd4 d5 Nc3 Nf6 Bf4 a6 e3',
      highlights: [{ square: 'e3', color: KEY }],
      say: "e3 — support the centre, prepare Nf3 + Bd3. The pawn move looks small but completes our pawn structure for the Jobava middlegame attack.",
      sayShort: 'e3 — solid pawn move.',
    }),
    b({
      id: 'a6-e6', moves: 'd4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3',
      highlights: [{ square: 'e6', color: SOFT }, { square: 'f3', color: KEY }],
      say: "…e6 Nf3 — Black supports the centre with e6, we develop the knight. The position resembles a Bf4 / Bf5 setup but Black's …a6 is wasted because there's no Nb5 threat to defend.",
      sayShort: 'Nf3 — develop.',
    }),
    b({
      id: 'a6-c5', moves: 'd4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "…c5 — Black finally pushes the c-pawn. The position now resolves with central tension. We answer by taking on c5 (opening lines) or by ignoring it (keeping the tension).",
      sayShort: '…c5 — central tension.',
    }),
    b({
      id: 'a6-dxc5', moves: 'd4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3 c5 dxc5 Bxc5',
      highlights: [{ square: 'c5', color: KEY }],
      say: "dxc5 …Bxc5 — we take, Black recaptures with the bishop. The bishop on c5 looks active but exposes Black to Nb5 attacks. The …a6 was supposed to prevent this, but now we have Bd3 + Qd2 + O-O-O attacking ideas.",
      sayShort: 'dxc5 — open the position.',
    }),
    b({
      id: 'a6-bd3', moves: 'd4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3 c5 dxc5 Bxc5 Bd3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "Bd3 — the kingside attacker's diagonal. From here the Bd3 + Qe2 + O-O + Ne5 attack pattern works against Black's exposed king position. The Jobava's signature attacking middlegame.",
      sayShort: 'Bd3 — kingside attack.',
    }),
  ],
};

export const PRO_NARODITSKY_JOBAVA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-jobava-london::e6 French Setup': E6_FRENCH,
  'pro-naroditsky-jobava-london::c6 Slav-Style': C6_SLAV,
  'pro-naroditsky-jobava-london::a6 with ...c5': A6_C5,
};
