import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// QGD (BLACK) variation lessons. Student = Black (defending). Keyed EXACTLY
// "qgd::<Exact Variation Name>" (repertoire.json variation names). Spines are
// the masters-backed black-defending lines from PLAN.md; deepest beat ≥20 ply.
// Lead-the-eye: GREEN arrows (vision), YELLOW highlights (named key square),
// SOFT BLUE (context). Orange move-squares auto-painted by the player.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string; moves: string; say: string; sayShort?: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

// ── Tartakower — cure the bad bishop with …b6/…Bb7 ──────────────────────
const TARTAKOWER: LessonScript = {
  openingId: 'qgd', title: 'QGD — Tartakower Variation', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 't1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4',
      say: "The Tartakower — Black's most reliable equalizer, the choice of Spassky and Karpov in world-championship play. After the nudge h6 and Bh4, Black is about to solve the QGD's one chronic problem: the bad light-squared bishop.",
      sayShort: '…h6 Bh4 — set up the Tartakower.', highlights: [H('h6')] }),
    b({ id: 't2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6',
      say: "b6! — the key idea. Black prepares to fianchetto the problem bishop to b7, where it rakes the long diagonal at White's centre instead of rotting behind e6. The QGD's bad bishop becomes Black's best piece.",
      sayShort: '…b6 — fianchetto the bad bishop.', highlights: [H('b7'), H('e6', SOFT)] }),
    b({ id: 't3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 Be2 Bb7 Bxf6 Bxf6',
      say: "Be2, Bb7, and White trades the dark-squared bishops with Bxf6. Black recaptures with the bishop, keeping a flexible, solid structure and the freed light-squared bishop raking the long diagonal. Every Black piece is harmoniously placed.",
      sayShort: '…Bb7, …Bxf6 — solid and flexible.', highlights: [H('b7', SOFT)] }),
    b({ id: 't4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 Be2 Bb7 Bxf6 Bxf6 cxd5 exd5 b4 c6',
      say: "White clarifies with cxd5 exd5 and starts a queenside minority attack with b4; Black holds with c6. The position is rock-solid — the bishop on b7 is superb, the d5-pawn secure, and White's edge is microscopic. This is how you neutralise the Queen's Gambit completely.",
      sayShort: '…c6 — hold; full equality.', highlights: [H('d5'), H('b7', SOFT)] }),
  ],
};

// ── Lasker Defence — …Ne4 forces mass trades to easy equality ───────────
const LASKER: LessonScript = {
  openingId: 'qgd', title: 'QGD — Lasker Defense', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'l1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4',
      say: "The Lasker Defence — Emanuel Lasker's antidote, the simplest equalizer in the QGD. Ne4! The knight jumps into the centre and offers to trade everything off — the bishops, a pair of knights, and all of White's attacking hopes with them.",
      sayShort: "…Ne4 — Lasker's great simplifier.", highlights: [H('e4')] }),
    b({ id: 'l2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7',
      say: "Bxe7 Qxe7 — the dark-squared bishops vanish, and with them the pin and the pressure. Black's position is freed; the cramped feeling that defines the QGD is simply gone.",
      sayShort: '…Qxe7 — bishops off, position freed.', highlights: [H('e7')] }),
    b({ id: 'l3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7 Rc1 c6 Bd3 Nxc3 Rxc3',
      say: "Rc1 c6, then the knights come off too: Nxc3, Rxc3. Black has traded a pair of knights AND the bishops — exactly what a slightly cramped side wants. The board is bare, the structure balanced, the tension gone.",
      sayShort: '…Nxc3 — trade the knights too.', highlights: [H('c6')] }),
    b({ id: 'l4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7 Rc1 c6 Bd3 Nxc3 Rxc3 dxc4',
      say: "dxc4 — Black snaps off the c4-pawn at the end of the trades, and after White recaptures Black is comfortably equal: a sound structure, no weaknesses, nothing for White to play against. Lasker's recipe is to simplify the QGD into an easy, balanced game where Black is never worse.",
      sayShort: '…dxc4 — equal, no weaknesses.', highlights: [H('c4')] }),
  ],
};

// ── Exchange — active …Bf5, trade queens, fight the minority attack ─────
const EXCHANGE: LessonScript = {
  openingId: 'qgd', title: 'QGD — Exchange Variation', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'e1', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5',
      say: "When White takes the Exchange route with cxd5 exd5, Black gets the Carlsbad structure — and the key is to refuse to be passive. White will attack the queenside with the minority attack; Black answers with active piece play and a kingside pawn storm.",
      sayShort: 'exd5 — Carlsbad; meet it actively.', highlights: [H('d5')] }),
    b({ id: 'e2', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Bf5',
      say: "Bg5, c6, e3 — and the critical move: Bf5! Black develops the light-squared bishop OUTSIDE the pawn chain to an active post, the very piece that suffers in the QGD. Getting this bishop out is half of Black's battle in the Exchange won.",
      sayShort: '…Bf5 — the bad bishop, activated.', highlights: [H('f5')] }),
    b({ id: 'e3', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Bf5 Qf3 Bg6 Bxf6 Qxf6 Qxf6 gxf6',
      say: "White probes with Qf3; Black calmly retreats Bg6 and accepts the queen trade after Bxf6 Qxf6 Qxf6 gxf6. The doubled f-pawns look ugly, but they hand Black the half-open g-file and a rock-solid centre — a fully playable, double-edged structure.",
      sayShort: '…gxf6 — open g-file, solid centre.', highlights: [H('g6', SOFT)] }),
    b({ id: 'e4', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Bf5 Qf3 Bg6 Bxf6 Qxf6 Qxf6 gxf6 Nf3 Nd7 Nh4 Be7',
      say: "Nf3, Nd7, Nh4 hitting the bishop, Be7 — and Black is fully developed with an active game. The minority attack will come, but Black's bishop pair, the g-file, and the strong d5-pawn supply full counterplay. Black is not defending here — Black is fighting.",
      sayShort: '…Be7 — developed, full counterplay.', highlights: [H('d5')] }),
  ],
};

// ── Ragozin — …Bb4 Nimzo-style pin, active counterplay ──────────────────
const RAGOZIN: LessonScript = {
  openingId: 'qgd', title: 'QGD — Ragozin Variation', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'r1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4',
      say: "The Ragozin — Black plays Bb4, pinning the c3-knight in pure Nimzo-Indian style. Instead of the passive Be7, the bishop comes out swinging, pressuring the centre and ready to trade itself for White's knight to damage the structure.",
      sayShort: '…Bb4 — the Ragozin; Nimzo-style pin.', arrows: [A('b4', 'c3', ATK)] }),
    b({ id: 'r2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 h6 Bxf6 Qxf6',
      say: "Bg5 h6 Bxf6 Qxf6 — Black recaptures with the queen, gaining the bishop pair and a free, active game while the queen eyes d4. No cramped QGD here; Black's pieces breathe from the start.",
      sayShort: '…Qxf6 — bishop pair, active queen.', arrows: [A('f6', 'd4', ATK)] }),
    b({ id: 'r3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 h6 Bxf6 Qxf6 e3 O-O Rc1 dxc4 Bxc4 c5',
      say: "Black develops, castles, and breaks: dxc4 then c5! Striking at White's centre and opening the position for the bishop pair. Black has seized the initiative — the Ragozin is the QGD for players who want to fight, not just hold.",
      sayShort: '…c5 — strike the centre, seize initiative.', highlights: [H('c5'), H('c4', SOFT)] }),
    b({ id: 'r4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 h6 Bxf6 Qxf6 e3 O-O Rc1 dxc4 Bxc4 c5 O-O cxd4 Ne4 Qe7',
      say: "O-O cxd4, and after Ne4 Black plays Qe7 — fully mobilised, active pieces, a comfortable game. Black has solved the opening with energy rather than patience: equal chances in a lively middlegame, the bishop pair pointing at White's king.",
      sayShort: '…Qe7 — active, equal chances.', highlights: [H('d4', SOFT)] }),
  ],
};

// ── Vienna — sharp …dxc4 + …Bb4, wreck White's queenside pawns ──────────
const VIENNA: LessonScript = {
  openingId: 'qgd', title: 'QGD — Vienna Variation', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'v1', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 dxc4',
      say: "The Vienna Variation — the sharpest, most ambitious QGD. Black grabs the c4-pawn with dxc4 and intends to HOLD the initiative, not merely equalise. This is the QGD for the tactically fearless.",
      sayShort: '…dxc4 — the sharp Vienna grab.', highlights: [H('c4')] }),
    b({ id: 'v2', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 dxc4 e4 Bb4 Bg5 c5',
      say: "White builds the big centre with e4; Black hits back at once — Bb4 pinning, then c5 striking at d4. The position detonates. Black trades activity and structural damage for White's central pawns.",
      sayShort: '…c5 — blast the centre open.', highlights: [H('c5'), H('d4', SOFT)] }),
    b({ id: 'v3', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 dxc4 e4 Bb4 Bg5 c5 Bxc4 cxd4 Nxd4 Bxc3+ bxc3',
      say: "Bxc4 cxd4 Nxd4, and Black plays Bxc3+! bxc3 — shattering White's queenside pawns into doubled, isolated targets. Black has handed over the bishop pair to inflict permanent structural damage on c3.",
      sayShort: "…Bxc3+ — wreck White's pawns.", highlights: [H('c3')] }),
    b({ id: 'v4', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 dxc4 e4 Bb4 Bg5 c5 Bxc4 cxd4 Nxd4 Bxc3+ bxc3 Qa5 Bb5+ Bd7 Bxf6 gxf6',
      say: "Qa5 pressures the crippled c3-pawn, Bb5+ Bd7, and Bxf6 gxf6 — a wild, double-edged position. Black has the better structure against White's central space and active pieces. Dynamic equality with real chances for both — the fighting Vienna.",
      sayShort: '…Qa5 — hit the crippled c-pawn.', arrows: [A('a5', 'c3', ATK)] }),
  ],
};

// ── Cambridge Springs — …Qa5 counterattack ──────────────────────────────
const CAMBRIDGE: LessonScript = {
  openingId: 'qgd', title: 'QGD — Cambridge Springs', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'cs1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5',
      say: "The Cambridge Springs — Black's great counterattacking weapon. After Nbd7 and c6, out swings Qa5! The queen lines up on the c3-knight, eyes the Bg5, and sets up the threat of …Ne4 forking the pinned pieces. Black flips from defence to offence.",
      sayShort: '…Qa5 — the Cambridge Springs counter.', arrows: [A('a5', 'c3', ATK)] }),
    b({ id: 'cs2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5 Nd2 Bb4 Qc2 O-O',
      say: "White defends with Nd2, unpinning; Black develops Bb4, keeping the pressure, and after Qc2 castles. Black has comfortable, active development with the …Ne4 break still in reserve — a far cry from passive defence.",
      sayShort: '…Bb4 — keep up the pressure.', highlights: [H('e4', SOFT)] }),
    b({ id: 'cs3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5 Nd2 Bb4 Qc2 O-O Be2 c5 O-O cxd4 Nb3 Qb6',
      say: "Be2, and Black breaks with c5! Striking d4, opening the position for the active pieces. After O-O cxd4 Nb3, the queen swings to b6, hitting d4 and eyeing the queenside. Black has a free, aggressive game with the initiative — exactly what the Cambridge Springs promises.",
      sayShort: '…c5, …Qb6 — free, aggressive game.', highlights: [H('d4', SOFT)] }),
  ],
};

// ── Bf4 QGD — trade the strong f4-bishop, undermine the c5 clamp ────────
const BF4: LessonScript = {
  openingId: 'qgd', title: 'QGD — Bf4 System', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'bf1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4',
      say: "When White develops the bishop to f4 outside the pawn chain — the London-flavoured Bf4 QGD — Black has a clean plan: trade that bishop off. It is White's most active piece, so removing it takes the sting out of the whole setup.",
      sayShort: 'Bf4 — plan to trade it off.', highlights: [H('f4')] }),
    b({ id: 'bf2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5',
      say: "Black develops solidly and White clamps with c5, grabbing queenside space. Don't fear the wedge — Black undermines it with …b6 and chases the bishop with …Nh5. The counterplay is clear and concrete.",
      sayShort: 'c5 clamp — undermine with …b6.', highlights: [H('c5'), H('b6', SOFT)] }),
    b({ id: 'bf3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4',
      say: "Nh5! attacking the f4-bishop, and after Bd3 Black trades: Nxf4, exf4. The bishop is gone. White's recapture leaves him a doubled f-pawn and a half-open e-file, but Black has removed White's best piece and can target the doubled pawns and the c5-wedge.",
      sayShort: '…Nxf4 — trade off the strong bishop.', highlights: [H('f4')] }),
    b({ id: 'bf4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 b6 b4 a5 a3 c6',
      say: "b6, b4, a5, a3, c6 — the queenside battle. Black chips at the c5-pawn with b6 and c6 while challenging b4 with a5. With the powerful bishop traded off and clear targets, Black has fully equalised against the system — no theory needed, just a sound plan.",
      sayShort: '…c6 — chip at c5; equalised.', highlights: [H('c5'), H('b4', SOFT)] }),
  ],
};

export const QGD_VARIATION_LESSONS: Record<string, LessonScript> = {
  'qgd::Tartakower Variation': TARTAKOWER,
  'qgd::Lasker Defense': LASKER,
  'qgd::Exchange Variation': EXCHANGE,
  'qgd::Ragozin Variation': RAGOZIN,
  'qgd::Vienna Variation': VIENNA,
  'qgd::Cambridge Springs': CAMBRIDGE,
  'qgd::Bf4 QGD': BF4,
};
