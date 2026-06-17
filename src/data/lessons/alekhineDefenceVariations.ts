import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for Alekhine's Defence. Lead-the-eye §5a.
// DB-anchored + masters-extended ≥20 plies.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const ALEKHINE_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'alekhine-defence::Modern Variation': {
    openingId: 'alekhine-defence', title: "Alekhine — The Modern Variation", minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    beats: [
      b({ id: 'am1', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4', say: "Alekhine's whole idea in one move: 1…Nf6 dares White to chase the knight with pawns, building a big centre that Black will then attack as a target. In the Modern main line White develops calmly with Nf3, and Black pins it with …Bg4 — getting the light-squared bishop active OUTSIDE the pawn chain before …e6, the key to a healthy game.", sayShort: '…Bg4 — pin first, the good bishop out.', highlights: [H('g4', KEY)] }),
      b({ id: 'am2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O', say: "White grows the centre, gaining space and kicking the knight back to b6 with c4. Both sides castle. Black has deliberately let White build a broad pawn front of c4, d4 and e5 — not out of weakness, but because that imposing centre is also overextended and will become the object of attack.", sayShort: '…Nb6, …O-O — let the big centre overreach.', highlights: [H('b6', KEY)] }),
      b({ id: 'am3', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 d5 c5 Bxf3 Bxf3 Nc4', say: "Now the counterstrike. White lunges c5 to gain more space, but Black trades …Bxf3 to remove the centre's defender, then springs …Nc4! — the knight leaps into the hole, hitting the e3-bishop and the b2-pawn and clamping White's queenside. The overextended pawns are suddenly the ones under fire.", sayShort: '…Bxf3, …Nc4! — knight into the hole.', highlights: [H('c4', KEY)] }),
      b({ id: 'am4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 d5 c5 Bxf3 Bxf3 Nc4 Bf4 b6 b3 Na5', say: "White props up with Bf4, Black undermines the c5-wedge with …b6, and after b3 the knight reroutes to a5, eyeing the holes around White's queenside. There is the Modern tabiya: White's broad centre on c5, d4 and e5 looks commanding but is rigid and over-stretched, and Black has clear targets and active pieces. A respected, sound line that scores 55% for Black at club level.", sayShort: '…b6, …Na5 — undermine the wedge.', highlights: [H('a5', KEY), H('b6', SOFT), H('c5', SOFT)] }),
    ],
  },
  'alekhine-defence::Two Pawns Attack': {
    openingId: 'alekhine-defence', title: "Alekhine — The Two Pawns Attack", minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    beats: [
      b({ id: 'a2p1', moves: 'e4 Nf6 e5 Nd5 c4 Nb6 d4 d6', say: "The Two Pawns Attack — White grabs c4 and d4 to bully the knight back to b6. It looks aggressive, but Black strikes back at once with …d6, challenging the e5-spearhead before White's centre can roll forward. Don't let the pawns settle.", sayShort: '…d6 — hit the e5-spearhead at once.', highlights: [H('d6', KEY), H('e5', SOFT)] }),
      b({ id: 'a2p2', moves: 'e4 Nf6 e5 Nd5 c4 Nb6 d4 d6 exd6 cxd6 Nc3 g6 Nf3 Bg7 Be3 O-O', say: "…exd6 …cxd6 trades off White's spearhead and defuses the space advantage; Black fianchettoes …Bg7 onto the long diagonal and castles. The imposing centre is gone, and Black has an easy, harmonious position.", sayShort: '…Bg7 — fianchetto, the big centre defused.', highlights: [H('g7', KEY), H('d6', SOFT)] }),
      b({ id: 'a2p3', moves: 'e4 Nf6 e5 Nd5 c4 Nb6 d4 d6 exd6 cxd6 Nc3 g6 Nf3 Bg7 Be3 O-O Be2 Nc6 O-O Bg4 b3 e5', say: "Black develops …Nc6 and …Bg4, pinning the f3-knight, then strikes the centre with …e5! There is the Two Pawns tabiya: White's pawns are neutralised, Black has the active g7-bishop, the g4-pin and the …e5 break in — a sound, comfortable game that scores 50% at club across nearly 20,000 games. The aggressive-looking attack, fully equalised.", sayShort: '…e5 — strike; comfortable equality.', highlights: [H('e5', KEY), H('g4', SOFT)] }),
    ],
  },
  'alekhine-defence::Four Pawns Attack': {
    openingId: 'alekhine-defence', title: "Alekhine — The Four Pawns Attack", minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    beats: [
      b({ id: 'fp1', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4', say: "The Four Pawns Attack — White's most ambitious try, grabbing the maximum centre with pawns on c4, d4, e5 and f4. It looks terrifying, but it is exactly what the Alekhine wants: the most over-extended centre there is, and the most to tear down.", sayShort: 'f4 — the maximal centre; the biggest target.', highlights: [H('e5'), H('f4'), H('d4', SOFT)] }),
      b({ id: 'fp2', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6', say: "…dxe5 fxe5 and …Nc6 — Black undermines immediately. The trade opens lines and …Nc6 hits the d4-centre. Every white pawn advance is now a weakness Black can target.", sayShort: '…Nc6 — undermine and hit the centre.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'fp3', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6', say: "Be3 props the centre; Black develops the light bishop actively to …Bf5 (outside the chain) and plays …e6. The pieces swarm out toward White's pawns — no bad bishop, no passive setup, just pressure.", sayShort: '…Bf5 — active bishop, pile on the centre.', highlights: [H('f5')] }),
      b({ id: 'fp4', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6 Nf3 Bb4 Rc1 O-O', say: "…Bb4 pins the c3-knight, adding to the pressure, and Black castles to safety. White's grand centre is now surrounded — every pawn from c4 to e5 is under fire.", sayShort: '…Bb4 — pin and surround the centre.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
      b({ id: 'fp5', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6 Nf3 Bb4 Rc1 O-O Bd3 f6', say: "Bd3 challenges the f5-bishop, and Black breaks with …f6! — striking the e5-spearhead directly. The Four Pawns centre, so proud a few moves ago, now cracks open under fire from every black piece. There is the tabiya: over-extension punished, exactly the Alekhine promise.", sayShort: '…f6 — crack the e5-spearhead open.', highlights: [H('f6'), H('e5')] }),
    ],
  },

  'alekhine-defence::Exchange Variation': {
    openingId: 'alekhine-defence', title: "Alekhine — The Exchange Variation", minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    beats: [
      b({ id: 'ex1', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6', say: "The Exchange — White trades the e5-spearhead with exd6, settling for a calm, slightly spacious structure rather than the big centre. Black recaptures …exd6, opening the e-file and reaching an easy, harmonious position with no weaknesses.", sayShort: '…exd6 — open the e-file, easy game.', highlights: [H('d6')] }),
      b({ id: 'ex2', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nf3 Be7 Be2 O-O O-O Nc6', say: "Black develops smoothly — …Be7, castle, …Nc6 hitting d4. White has a little extra space, but Black has free, active pieces and clear plans. The Exchange is comfortable equality, and Black plays for the better-coordinated army.", sayShort: '…Nc6 — develop freely, press d4.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'ex3', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nf3 Be7 Be2 O-O O-O Nc6 Nc3 Bf5 b3 Bf6', say: "…Bf5 develops the light bishop actively, and …Bf6 redeploys the other bishop to pressure d4 and the long diagonal. Every black piece finds an active post — White's space means little when Black is this well-coordinated.", sayShort: '…Bf5, …Bf6 — pieces to active posts.', arrows: [A('f6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'ex4', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nf3 Be7 Be2 O-O O-O Nc6 Nc3 Bf5 b3 Bf6 Be3 d5', say: "…d5! The freeing break. Black strikes the centre, opens lines for the active bishops, and equalises fully. There is the Exchange tabiya: no weaknesses, every piece active, and the …d5 break achieved — a comfortable game where Black is never worse.", sayShort: '…d5 — the freeing break, full equality.', highlights: [H('d5')] }),
    ],
  },

  'alekhine-defence::Chase Variation': {
    openingId: 'alekhine-defence', title: "Alekhine — The Chase Variation", minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    beats: [
      b({ id: 'ch1', moves: 'e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5', say: "The Chase — White hunts the knight with c4 and c5, gaining space but spending tempo after tempo on one piece. The knight calmly returns to d5, and White has advanced pawns far up the board with nothing behind them. Black will punish the wasted time.", sayShort: '…Nd5 — let White chase and over-reach.', highlights: [H('d5'), H('c5', SOFT)] }),
      b({ id: 'ch2', moves: 'e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5 d4 d6 cxd6 exd6', say: "d4 d6, and after cxd6 exd6 the over-extended pawns are liquidated. White's space grab has evaporated, leaving Black a free, open position with the e-file and easy development — all because White chased instead of developing.", sayShort: '…exd6 — liquidate the over-reach.', highlights: [H('d6')] }),
      b({ id: 'ch3', moves: 'e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5 d4 d6 cxd6 exd6 Nf3 dxe5 dxe5 Bb4+', say: "…dxe5 dxe5 trades again, and …Bb4+ develops with check — gaining yet another tempo, the very thing White squandered chasing the knight. Black is now the side with the initiative.", sayShort: '…Bb4+ — develop with check, gain tempo.', highlights: [H('b4')] }),
      b({ id: 'ch4', moves: 'e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5 d4 d6 cxd6 exd6 Nf3 dxe5 dxe5 Bb4+ Bd2 O-O Bc4 Nc6 O-O Bg4', say: "Black castles, develops …Nc6 hitting e5, and pins the f3-knight with …Bg4. There is the Chase tabiya: White's e5-pawn is weak and surrounded, Black has the bishop pair pointed at the centre, and the tempi White wasted chasing the knight have all flowed to Black. Provocation rewarded.", sayShort: '…Bg4 — pin, surround the weak e5-pawn.', arrows: [A('g4', 'f3')], highlights: [H('f3'), H('e5', SOFT)] }),
    ],
  },

  'alekhine-defence::Scandinavian Transposition': {
    openingId: 'alekhine-defence', title: "Alekhine — The …dxe5 Simplification", minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    beats: [
      b({ id: 'st1', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5', say: "The simplifying line — Black resolves the central tension early with …dxe5. Rather than keep the complex Alekhine middlegame, Black heads for a clean, simplified position where White's space edge is minimal and there is nothing to attack.", sayShort: '…dxe5 — simplify, defuse the centre.', highlights: [H('e5')] }),
      b({ id: 'st2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 Nd7 Nxd7 Bxd7', say: "…Nd7 challenges the e5-knight, and after Nxd7 Bxd7 the pieces come off. Black has developed the light bishop for free and reached a sound, easy structure — the simplification has taken all the sting out of White's setup.", sayShort: '…Bxd7 — trade down, bishop developed free.', highlights: [H('d7')] }),
      b({ id: 'st3', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 Nd7 Nxd7 Bxd7 c4 Nf6 Nc3 e6 Be2 c5', say: "c4 Nf6, and after …e6 Black strikes the centre with …c5, challenging d4. Black is fully developed with a sound structure and active piece play — White's extra space has been neutralised by the early trades.", sayShort: '…c5 — strike d4, fully equal.', highlights: [H('c5'), H('d4', SOFT)] }),
      b({ id: 'st4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 Nd7 Nxd7 Bxd7 c4 Nf6 Nc3 e6 Be2 c5 d5 exd5 cxd5 Bd6', say: "d5 exd5 cxd5, and …Bd6 develops the bishop to its best diagonal, eyeing the kingside. There is the simplified tabiya: a clean position with no weaknesses, active bishops, and easy equality. When Black wants a quiet, safe Alekhine, this is the road.", sayShort: '…Bd6 — active bishop, safe equality.', highlights: [H('d6')] }),
    ],
  },

  'alekhine-defence::Voronezh Variation': {
    openingId: 'alekhine-defence', title: "Alekhine — The Voronezh (…g6 Fianchetto)", minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    beats: [
      b({ id: 'vo1', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 cxd6', say: "The Voronezh — Black recaptures …cxd6 (not …exd6), keeping the e-pawn home and opening the c-file. The plan is a King's-Indian-style fianchetto: …g6, …Bg7, and a central counterstrike with …e5. A modern, dynamic treatment.", sayShort: '…cxd6 — open the c-file, prep fianchetto.', highlights: [H('d6')] }),
      b({ id: 'vo2', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 cxd6 Nc3 g6 Be3 Bg7', say: "…g6 and …Bg7 fianchetto the bishop onto the long diagonal, bearing down on d4 and the centre. Black sets up like a King's Indian: solid king, a sniper on g7, and a central break loaded for later.", sayShort: '…Bg7 — fianchetto, eye the centre.', arrows: [A('g7', 'd4')], highlights: [H('d4')] }),
      b({ id: 'vo3', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 cxd6 Nc3 g6 Be3 Bg7 Rc1 O-O b3 e5', say: "Black castles and strikes with …e5! — the thematic central break, challenging d4 and freeing the position. With the g7-bishop already raking the long diagonal, opening the centre plays straight into Black's hands.", sayShort: '…e5 — the central break, free the bishop.', highlights: [H('e5'), H('d4', SOFT)] }),
      b({ id: 'vo4', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 cxd6 Nc3 g6 Be3 Bg7 Rc1 O-O b3 e5 d5 h6 Nf3 Bg4', say: "d5 closes the centre, but Black plays …h6 and …Bg4, pinning the f3-knight and pressuring the d5-pawn. There is the Voronezh tabiya: a King's-Indian structure where Black has the fianchettoed bishop, the …f5 break coming, and active piece play. Carlsen himself beat Aronian from exactly this dynamic Black setup.", sayShort: '…Bg4 — pin, press d5, KID-style play.', arrows: [A('g4', 'f3')], highlights: [H('f3'), H('d5', SOFT)] }),
    ],
  },
};
