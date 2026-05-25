import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): GREEN arrows = vision / threat
// / intent, YELLOW highlights = a key square the narration names, SOFT BLUE =
// secondary context. Orange move-squares are auto-painted by the player — we
// never author those. Every variation tab's lesson is keyed EXACTLY
// "queens-gambit::<Exact Variation Name>" (the repertoire.json variation name)
// so getVariationLessonScript resolves it. White-oriented (student = White).
// Spines are the masters-backed lines from PLAN.md (scripts/_qg-extend.mjs);
// deepest beat ≥20 plies (lessonDepth gate).
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

// ── Exchange Variation — the Carlsbad minority attack ───────────────────
const EXCHANGE: LessonScript = {
  openingId: 'queens-gambit',
  title: "Queen's Gambit — Exchange Variation",
  sources: ['concept:pawn-minority-attack', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  minutes: 11,
  orientation: 'white',
  beats: [
    b({ id: 'ex0', moves: 'd4 d5 c4 e6 Nc3 Nf6',
      say: "We reach the Queen's Gambit Declined, the central tension on d5 humming. Here White faces a fork in the road. Keep the tension with Bg5 and Nf3 — the Orthodox main line — or resolve it at once. The Exchange Variation takes the second road, the choice of players who prize a clear, long-term plan over memorising sharp theory.",
      sayShort: 'The QGD — White chooses how to fight.',
      highlights: [H('d5')] }),
    b({ id: 'ex1', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5',
      say: "The Exchange begins the moment White plays cxd5 and Black recaptures exd5. White has voluntarily released the central tension — but with purpose. This is the Carlsbad structure, and it hands White one of the most famous plans in all of chess: the minority attack. White's smaller queenside pawn group will march at Black's c6 and d5 to manufacture a weakness.",
      sayShort: 'cxd5 exd5 — the Carlsbad; minority attack.',
      highlights: [H('d5'), H('c6', SOFT)] }),
    b({ id: 'ex2', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7',
      say: "Both sides settle into the standard Carlsbad picture: Bg5 pins, c6 props up d5, e3 frees the bishop, Be7 breaks the pin. The structures look symmetrical — but the PLANS point in opposite directions. White attacks on the queenside with b4 and b5; Black counters in the centre and on the kingside, often with a later f5 or piece play down the e-file.",
      sayShort: 'Bg5, e3 — Carlsbad plans diverge.',
      highlights: [H('d5'), H('b5', SOFT), H('f5', SOFT)] }),
    b({ id: 'ex3', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2',
      arrows: [A('d3', 'h7', ATK)],
      say: "Bd3 and Qc2 — the battery. White lines the bishop and queen on the b1-h7 diagonal, both aiming at h7. This is the kingside half of the idea: while the queenside pawns roll, the Bd3 keeps one eye on Black's king. Black's knight heads to d7 and on to f8, where it will guard the soft light squares around the king.",
      sayShort: 'Bd3, Qc2 — battery aims at h7.',
      highlights: [H('h7'), H('f8', SOFT)] }),
    b({ id: 'ex4', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2 Re8',
      say: "Castles, and now the move that defines White's handling: Nge2, not Nf3. Why the second-best square? Because Nf3 would block the f-pawn — and White WANTS f3 then e4, the central break that backs the whole plan. From e2 the knight can also swing to g3 or f4. Black takes the e-file with Re8 and prepares to defend.",
      sayShort: 'Nge2 — keep f3 free for e4.',
      highlights: [H('e4'), H('f3', SOFT)] }),
    b({ id: 'ex5', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2 Re8 O-O Nf8 f3 Be6',
      say: "The full Carlsbad middlegame. White has castled, played f3 to prepare e4, and Black has finished his defensive setup — the knight rerouted to f8, the bishop on e6 guarding d5. Now the real game: White rolls b4, a4, and b5, hammering at c6. If b5xc6 ever lands, Black is left with a backward pawn on a half-open file for White's rooks to besiege. That single chronic weakness is the whole point of the Exchange — cold, slow, and lethal in a Capablanca endgame.",
      sayShort: 'b4-b5 hits c6 — the minority attack.',
      highlights: [H('c6'), H('b5', SOFT), H('e6', SOFT)] }),
  ],
};

// ── Tartakower Variation — Black frees the bad bishop with …b6/…Bb7 ──────
const TARTAKOWER: LessonScript = {
  openingId: 'queens-gambit',
  title: "Queen's Gambit — Tartakower Variation",
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  minutes: 11,
  orientation: 'white',
  beats: [
    b({ id: 't1', moves: 'd4 d5 c4 e6 Nc3 Be7 Nf3 Nf6 Bg5 h6 Bh4',
      say: "The Tartakower is Black's most respected answer to the Queen's Gambit — Spassky and Karpov leaned on it in world-championship play. It opens with the little nudge h6, asking the bishop its intentions; White keeps the pin with Bh4. Black's whole plan now is to cure the QGD's one chronic disease: the bad light-squared bishop.",
      sayShort: '…h6 Bh4 — the Tartakower; keep the pin.',
      highlights: [H('h6')] }),
    b({ id: 't2', moves: 'd4 d5 c4 e6 Nc3 Be7 Nf3 Nf6 Bg5 h6 Bh4 O-O e3 b6',
      say: "There it is — b6, preparing to fianchetto the problem bishop to b7. Instead of rotting behind e6, Black's light-squared bishop will rake the long diagonal toward a8 and h1, eyeing White's centre. This is the Tartakower's signature, and why it is so solid: the bad bishop becomes a good one.",
      sayShort: '…b6 — fianchetto, cure the bad bishop.',
      highlights: [H('b7'), H('e6', SOFT)] }),
    b({ id: 't3', moves: 'd4 d5 c4 e6 Nc3 Be7 Nf3 Nf6 Bg5 h6 Bh4 O-O e3 b6 Be2 Bb7 Bxf6 Bxf6',
      say: "Be2 develops modestly, Bb7 completes the fianchetto, and White trades the dark-squared bishops with Bxf6, met by Bxf6. White removes a defender and slightly loosens the dark squares around Black's king. The position is balanced — but full of small chances for the better-prepared side.",
      sayShort: 'Be2, Bxf6 — trade the dark bishops.',
      highlights: [H('b7', SOFT)] }),
    b({ id: 't4', moves: 'd4 d5 c4 e6 Nc3 Be7 Nf3 Nf6 Bg5 h6 Bh4 O-O e3 b6 Be2 Bb7 Bxf6 Bxf6 cxd5 exd5 b4 c6',
      say: "Now White clarifies: cxd5 exd5, and the queenside march opens with b4, met by c6. Black has a sound but slightly loose pawn on d5 and a superb bishop on b7; White owns the queenside majority and the same minority-attack dream as the Exchange. The Tartakower is rock-solid, so White's edge is small and technical: outplay, never overpress.",
      sayShort: 'cxd5, b4 — queenside press vs …Bb7.',
      highlights: [H('d5'), H('b7', SOFT)] }),
    b({ id: 't5', moves: 'd4 d5 c4 e6 Nc3 Be7 Nf3 Nf6 Bg5 h6 Bh4 O-O e3 b6 Be2 Bb7 Bxf6 Bxf6 cxd5 exd5 b4 c6',
      say: "From here every White piece has a job: a rook to c1 on the half-open file, the knight rerouting to f4 or via a4 to press c5 and the b6-pawn, the queen supporting the b5 break. Black's counterplay is the d-file and the long diagonal his bishop owns. A patient, manoeuvring middlegame — exactly the kind Capablanca and Karpov won by piling up tiny edges.",
      sayShort: 'Rc1, Nf4 — patient queenside squeeze.',
      highlights: [H('c5'), H('b6', SOFT)] }),
  ],
};

// ── Queen's Gambit Accepted — White's queens-on central break ───────────
const QGA: LessonScript = {
  openingId: 'queens-gambit',
  title: "Queen's Gambit — Accepted",
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
  minutes: 11,
  orientation: 'white',
  beats: [
    b({ id: 'q1', moves: 'd4 d5 c4 dxc4',
      say: "The Queen's Gambit Accepted. Black grabs the c4-pawn — but he can't hold it, and he shouldn't try. The idea is to surrender the centre for a moment, develop fast, and counter-punch with …c5. White's reply is simple and strong: don't chase the pawn around, build the centre and reclaim it on his own terms.",
      sayShort: '…dxc4 — the QGA; don’t chase it.',
      highlights: [H('c5', SOFT)] }),
    b({ id: 'q2', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5',
      say: "White develops naturally — Nf3, e3, then Bxc4, scooping the pawn back with a free tempo as the bishop lands on the active c4 diagonal. Black hits the centre with c5, the thematic break against the d4-pawn. The middle of the board is now the battleground: Black wants to trade off d4 and free his game; White wants to keep his space and ride his lead in development.",
      sayShort: 'Bxc4 c5 — pawn back; centre joins battle.',
      highlights: [H('d4')] }),
    b({ id: 'q3', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3',
      say: "Both sides castle into their plans. Black expands on the queenside with a6 and b5, chasing the bishop, which slips back to b3 — still on the strong diagonal. White's Qe2 is quietly powerful: it connects the rooks and clears d1, loading a rook behind the d4-pawn for the break to come.",
      sayShort: 'Qe2, Bb3 — load up behind d4.',
      highlights: [H('d4'), H('d1', SOFT)] }),
    b({ id: 'q4', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Qb8 d5',
      say: "The pieces complete their posts — Bb7, Rd1, Nbd7, Qb8 — and now White detonates the centre: d5! The long-prepared break, fired the instant his development lead peaks, with the rook already waiting behind it on d1. This is the QGA's defining strategic moment: White's space-and-development edge converts into hard central pressure.",
      sayShort: 'd5! — the central break, fully prepared.',
      highlights: [H('d1', SOFT), H('b7', SOFT)] }),
    b({ id: 'q5', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Qb8 d5 exd5',
      say: "exd5, and the centre cracks open. White stands clearly better: more active pieces, the half-open d-file under his rook, and pressure on the d5-pawn and the e6-square Black just vacated. The QGA handed Black a free, fast game — but the bill comes due here, where White's superior coordination tells. Play on the d-file and the long light diagonal, and squeeze.",
      sayShort: 'exd5 — open centre; White’s edge tells.',
      highlights: [H('d5'), H('e6', SOFT)] }),
  ],
};

// ── Slav Defence Response — White's big-centre main line (a4, e3, e4) ────
const SLAV: LessonScript = {
  openingId: 'queens-gambit',
  title: "Queen's Gambit — Slav Defence",
  sources: ['concept:pawn-chain', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Slav_Defense'],
  minutes: 12,
  orientation: 'white',
  beats: [
    b({ id: 's1', moves: 'd4 d5 c4 c6',
      say: "The Slav Defence — Black supports d5 with c6 instead of e6. The whole point, and the great improvement over the QGD: the light-squared bishop stays free to develop OUTSIDE the pawn chain before …e6 ever locks it in. It is rock-solid; it took the Alekhine–Euwe and Botvinnik matches to map it. White must play accurately to claim an edge.",
      sayShort: '…c6 — the Slav; bishop stays free.',
      highlights: [H('d5')] }),
    b({ id: 's2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5',
      say: "Black develops and grabs c4 with dxc4 — and unlike the QGA, he means to keep it, so White plays a4 to stop …b5 from defending the pawn. And there it is: Bf5, the Slav bishop developed to its dream square, outside the chain, before …e6 is ever played. White will simply regain the pawn and fight for the centre.",
      sayShort: '…Bf5 — free Slav bishop; a4 stops …b5.',
      highlights: [H('b5', SOFT)] }),
    b({ id: 's3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4',
      say: "Now Black plays e6 — but notice, the bishop is ALREADY out on f5, so this costs Black nothing. White recaptures with Bxc4, and Black pins with Bb4. The position is a Nimzo-Indian crossed with a Slav: White has the bishop pair coming and central potential; Black has easy development and no bad pieces.",
      sayShort: 'e3, Bxc4 — pawn back; …Bb4 pins.',
      highlights: [H('f5')] }),
    b({ id: 's4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4',
      say: "White castles, Black brings the knight to d7, and White uncorks the central plan: Qe2 and e4, building the broad d4-e4 pawn centre the Slav permits if Black grows passive. The bishop retreats to g6, dodging the pawns. White now has exactly what the Queen's Gambit always wants — more space and a mobile centre, with every piece in play.",
      sayShort: 'e4 — the big centre the Slav allows.',
      highlights: [H('d4'), H('e4')] }),
    b({ id: 's5', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O Bg5 h6 Bh4',
      say: "Black castles to safety and White completes the bind: Bg5 pins the f6-knight, met by h6 and Bh4 holding the pin. White has reached the ideal Slav middlegame — a broad centre, the bishop pair in hand, pressure on the kingside. Black is solid but cramped, exactly the squeeze the Queen's Gambit promises. Push e5, or play on the c-file, and grind it down.",
      sayShort: 'Bg5 — pin, bind, then e5 break.',
      highlights: [H('f6'), H('e5', SOFT)] }),
  ],
};

// ── Semi-Slav Response — the Meran, met by the solid Anti-Meran Qc2 ──────
const SEMI_SLAV: LessonScript = {
  openingId: 'queens-gambit',
  title: "Queen's Gambit — Semi-Slav",
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
  minutes: 11,
  orientation: 'white',
  beats: [
    b({ id: 'ss1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6',
      say: "The Semi-Slav — Black plays BOTH c6 and e6, the famous triangle. He gets the rock-solid Slav structure, but pays the QGD price again: the light-squared bishop is boxed in on c8 behind e6. In return he gets one of the most dynamic plans in chess — …dxc4 then …b5, grabbing the pawn and expanding on the queenside. This is Meran country, beloved by attackers on both sides.",
      sayShort: '…c6 and …e6 — the Semi-Slav triangle.',
      highlights: [H('c8'), H('b5', SOFT)] }),
    b({ id: 'ss2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6',
      arrows: [A('c2', 'h7', ATK)],
      say: "White builds with e3 and the Anti-Meran move Qc2, sidestepping the sharpest Meran theory for a flexible, solid game. The queen on c2 already rakes the long diagonal toward h7 and watches the c-file. Black develops actively with Bd6, pointing at White's kingside — in the Semi-Slav, Black's DARK-squared bishop is the good one.",
      sayShort: 'e3, Qc2 — the solid Anti-Meran.',
      highlights: [H('h7')] }),
    b({ id: 'ss3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O O-O dxc4 Bxc4 b5',
      say: "Bd3 completes the battery with the queen, both aiming at h7; both sides castle; and the Meran fires: Black takes dxc4 and expands with b5, gaining queenside space and chasing the bishop. White retreats and braces for the coming …c5 break. This is the heart of the Meran — Black's pawns roll on the queenside while White holds the centre and the better-placed pieces.",
      sayShort: '…dxc4 …b5 — the Meran expansion.',
      highlights: [H('h7'), H('c5', SOFT)] }),
    b({ id: 'ss4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O O-O dxc4 Bxc4 b5 Be2 Bb7 Rd1 Qc7',
      say: "The middlegame sets: Be2 sidesteps the pawns, Bb7 finally frees Black's problem bishop onto the long diagonal, Rd1 backs the d-file, Qc7 eyes the c-file and the kingside. The lines are drawn — Black plays …c5 to open the centre for his bishops; White answers with e4 and pieces, banking on superior coordination and the safer king. A rich, double-edged fight where the better-booked side prevails.",
      sayShort: 'Bb7, Rd1 — set for the …c5 break.',
      highlights: [H('c5', SOFT), H('e4', SOFT)] }),
  ],
};

// ── Anti-QGD: Early Bf4 System — the London-flavoured Harrwitz clamp ─────
const ANTI_BF4: LessonScript = {
  openingId: 'queens-gambit',
  title: "Queen's Gambit — Anti-QGD: Early Bf4",
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  minutes: 11,
  orientation: 'white',
  beats: [
    b({ id: 'ab1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4',
      say: "The Anti-QGD with Bf4 — White develops the bishop OUTSIDE the pawn chain before playing e3, sidestepping all the heavy Bg5 main-line theory. It's the healthy London-System idea grafted onto the Queen's Gambit: the bishop on f4 rakes the long dark diagonal toward d6 and e5, ready to support a c5 clamp.",
      sayShort: 'Bf4 — London idea, sidestep the theory.',
      highlights: [H('e5', SOFT), H('d6', SOFT)] }),
    b({ id: 'ab2', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5',
      say: "Black develops calmly — Be7, O-O, Nbd7 — and White plays the thematic clamp: c5! The pawn seizes queenside space and locks the structure, a protected wedge cramping Black. White's plan now is a queenside expansion with b4 and the chain a3-b4-c5, while Black must hit back with …b6 or …e5 to challenge the bind.",
      sayShort: 'c5 — clamp the queenside, gain space.',
      highlights: [H('b4', SOFT), H('e5', SOFT)] }),
    b({ id: 'ab3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4',
      say: "Black challenges the bishop with Nh5, and after Bd3 trades it off: Nxf4, exf4. A key moment — White recaptures toward the centre with the e-pawn, gaining the half-open e-file for his rooks and a strong pawn on f4 that cramps Black and supports an eventual f5 or e5-square play. The bishop is gone, but White's structure has improved.",
      sayShort: 'Nxf4 exf4 — half-open e-file, strong f4.',
      highlights: [H('f5', SOFT), H('e5', SOFT)] }),
    b({ id: 'ab4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 b6 b4 a5 a3 c6',
      arrows: [A('d3', 'h7', ATK)],
      say: "The queenside battle crystallizes. Black undermines the wedge with b6, a5, and c6; White holds the chain with b4 and a3. White has the more pleasant game: the protected c5-pawn cramps Black, the f4-pawn and half-open e-file give central and kingside play, and the bishop on d3 rakes toward h7. A genuinely different Queen's Gambit — no sharp theory, just a healthy space edge to nurse, perfect against an opponent who expected Bg5.",
      sayShort: 'b4, a3 — hold c5; nurse the squeeze.',
      highlights: [H('h7'), H('c5'), H('f4', SOFT)] }),
  ],
};

// Keyed EXACTLY to the repertoire.json variation names (getVariationLessonScript
// looks up `${openingId}::${variation.name}`). "Classical Mainline" is the
// "Main line" pill — taught by QUEENS_GAMBIT_LESSON — so it has no separate
// entry. "Catalan Transposition" is intentionally omitted: the Catalan is its
// own White masterclass (catalan-opening), not a QG tab.
export const QUEENS_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'queens-gambit::Exchange Variation': EXCHANGE,
  'queens-gambit::Tartakower Variation': TARTAKOWER,
  "queens-gambit::Queen's Gambit Accepted": QGA,
  'queens-gambit::Slav Defence Response': SLAV,
  'queens-gambit::Semi-Slav Response': SEMI_SLAV,
  'queens-gambit::Anti-QGD: Early Bf4 System': ANTI_BF4,
};
