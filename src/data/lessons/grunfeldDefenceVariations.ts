import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Grünfeld Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies (lessonDepth gate). Fianchetto/Neo-Grünfeld anchor
// <20p in the curated pgn, so they fold into the main rather than ship thin.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'];

export const GRUNFELD_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'grunfeld-defence::Fianchetto Variation': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Fianchetto Variation', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'gf1', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 d5', say: "The Grünfeld against White's quiet Fianchetto set-up. Black develops …Bg7 onto the long diagonal and immediately challenges the centre with …d5 — the Grünfeld's defining idea. Rather than occupy the centre, Black invites White to build it, then attacks it with pieces and pawns.", sayShort: '…d5 — challenge the centre at once.', highlights: [H('d5', KEY), H('g7', SOFT)] }),
      b({ id: 'gf2', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 d5 Bg2 dxc4 Na3 c3 bxc3 c5', say: "Black snatches …dxc4, and after Na3 plays the cheeky …c3! — fixing White's queenside pawns into a target before they can be useful. Then …c5 strikes the d4-pawn. The whole queenside is now under pressure, and White's structure is damaged.", sayShort: '…c3, …c5 — damage and strike the centre.', highlights: [H('c5', KEY)] }),
      b({ id: 'gf3', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 d5 Bg2 dxc4 Na3 c3 bxc3 c5 O-O O-O Rb1 Nc6 Ne5 Nd5', say: "Both sides castle and the pieces flood out: White centralises with Ne5 and probes the b-file with Rb1, while Black develops …Nc6 hitting the centre and reroutes …Nd5, blockading and dominating the key central square. There is the Fianchetto tabiya: the g7-bishop on the long diagonal, knights swarming the centre, and White's damaged queenside as a target — exactly the active, counter-attacking game the Grünfeld promises. It scores 54% for Black at club level.", sayShort: '…Nc6, …Nd5 — knights swarm the centre.', highlights: [H('d5', KEY), H('c6', SOFT)] }),
    ],
  },
  'grunfeld-defence::Exchange Variation: Main Line': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Exchange Main Line', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'gem1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7', say: "The Grünfeld in its purest form. Black invites White to build a giant pawn centre — c3, d4 and e4 — then fianchettoes the bishop to g7 and takes dead aim at it down the long diagonal. The whole opening is a wager: is that big centre a strength, or just a target waiting to be torn down?", sayShort: '…Bg7 — aim at the big centre.', arrows: [A('g7', 'd4')], highlights: [H('d4'), H('e4', SOFT)] }),
      b({ id: 'gem2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5', say: "…c5 strikes the base of the centre, and …Qa5 swings the queen out to press the weakened c3-pawn and pin White's plans. Black's pieces flow toward the centre with purpose — every one of them is trained on White's proud but brittle pawns.", sayShort: '…c5, …Qa5 — hit the centre and c3.', highlights: [H('c5'), H('c3')] }),
      b({ id: 'gem3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1 cxd4 cxd4', say: "Black castles and trades on d4 — …cxd4 cxd4 — and now White's centre is reduced to the lone d4-e4 duo, with no c-pawn to support it. The proud phalanx has become a pair of targets, and every black piece is pointed straight at them.", sayShort: '…cxd4 — strip the centre to targets.', highlights: [H('d4'), H('e4', SOFT)] }),
      b({ id: 'gem4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1 cxd4 cxd4 Qxd2+ Nxd2 Rd8 d5 e6 Bc4 exd5 Bxd5 Nc6', say: "The queens come off, and Black goes to work on the pawns: …Rd8 hits down the d-file, …e6 challenges the d5-pawn, and after the exchanges …Nc6 brings the last piece to bear. There is the Exchange Grünfeld endgame — Black's bishop on g7, knight on c6 and rook on d8 swarming White's centre. The bargain pays off: fully equal, and far easier to play with the activity all on Black's side.", sayShort: '…Nc6 — swarm the centre, easy game.', highlights: [H('c6'), H('d8', SOFT)] }),
    ],
  },

  'grunfeld-defence::Exchange: Be3 Qa5 Qd2 with Rc1': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — Exchange with …Qa5 and …Nc6', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'bq1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7', say: "The Exchange Grünfeld again, but this time Black keeps the queens on for a sharper fight. Same philosophy: let White erect the c3-d4-e4 centre, then assault it. The g7-bishop is the spearhead, raking the long diagonal at the pawn front.", sayShort: '…Bg7 — the spearhead on the long diagonal.', arrows: [A('g7', 'd4')], highlights: [H('d4'), H('e4', SOFT)] }),
      b({ id: 'bq2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5', say: "…c5 hits the base, …Qa5 presses the c3-pawn and ties White down. The queen on a5 is a typical Grünfeld nuisance — it eyes c3, supports the queenside, and keeps White's pieces busy with defence instead of attack.", sayShort: '…Qa5 — press c3, tie White down.', highlights: [H('c5'), H('c3')] }),
      b({ id: 'bq3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 Nc6 Rc1 cxd4 cxd4', say: "…Nc6 piles a second attacker onto d4, and after …cxd4 cxd4 White is left nursing the isolated d4-e4 pair with queens still on the board. Black has the bishop on g7, the knight on c6 and the queen on a5 all converging on the centre — active, dynamic, and fully equal. The Grünfeld promise delivered.", sayShort: '…Nc6, …cxd4 — converge on the centre.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
    ],
  },

  'grunfeld-defence::Taimanov Variation (f3)': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Taimanov (Bc4/Ne2)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'tm1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7', say: "Whatever White's exact set-up, the Grünfeld idea never changes: concede the big centre, fianchetto to g7, and attack. Here White will deploy the bishop actively to c4 and the knight to e2, bracing the d4 and e4 pawns — but the long diagonal still belongs to Black.", sayShort: '…Bg7 — the constant Grünfeld idea.', arrows: [A('g7', 'd4')], highlights: [H('d4'), H('e4', SOFT)] }),
      b({ id: 'tm2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O', say: "Bc4 and Ne2 support the centre, but Black hits it anyway — …c5 at the base, …Nc6 developing with a hit on d4, and …O-O for safety. White's pieces are committed to defending the pawns; Black's are committed to winning them.", sayShort: '…c5, …Nc6 — strike and develop.', highlights: [H('c5'), H('c6')] }),
      b({ id: 'tm3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O cxd4 cxd4 Bd7 Rc1 Rc8', say: "…cxd4 opens lines, …Bd7 develops, and …Rc8 seizes the half-open c-file, pointing at White's c-pawn and the queenside. There is the Taimanov tabiya: the d4-e4 centre under siege from the g7-bishop and the c6-knight, the c-file in Black's hands. Sharp, double-edged, and the practical results favour the well-prepared Black player.", sayShort: '…Rc8 — seize the c-file, besiege the centre.', highlights: [H('c8'), H('d4', SOFT)] }),
    ],
  },
  'grunfeld-defence::Russian System (Qb3)': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Russian System (Qb3)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'r1', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4', say: "The Russian System — White sidesteps the doubled c-pawns of the Exchange by regaining the pawn with Qb3 and Qxc4. A restrained, positional approach: White keeps a clean structure but spends time with the queen, which Black will exploit.", sayShort: 'Qxc4 — White regains it cleanly.', highlights: [H('c4')] }),
      b({ id: 'r2', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Nc6', say: "Black castles, White builds the broad e4-centre, and …Nc6 — the Prins move — immediately pressures the d4-pawn, refusing to let White's centre settle. The g7-bishop and the knight already gang up on d4.", sayShort: '…Nc6 — pressure d4 at once.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
      b({ id: 'r3', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Nc6 Be2 Nd7 Be3 Nb6', say: "…Nd7 reroutes the knight to …Nb6, hitting the c4-queen and eyeing the c4- and d5-squares. The harassment of White's exposed queen gains Black the tempi to mass against the centre.", sayShort: '…Nb6 — harass the queen, eye c4.', highlights: [H('b6')] }),
      b({ id: 'r4', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Nc6 Be2 Nd7 Be3 Nb6 Qd3 f5', say: "Qd3 retreats, and …f5! the Grünfeld counterpunch — striking directly at the e4-centre and opening lines on the kingside. There is the Russian System tabiya: Black's pieces swarming White's centre, the f5-break cracking it open, full dynamic equality from a defence.", sayShort: '…f5 — crack open the e4-centre.', highlights: [H('f5'), H('e4')] }),
    ],
  },

  'grunfeld-defence::Bc4 Classical': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Classical Bc4', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'bc1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5', say: "The Classical Bc4 — White develops the bishop aggressively, aiming at f7 and supporting the centre. Black answers in pure Grünfeld style: …c5, striking the base of the d4/e4 duo while the g7-bishop glares down the long diagonal.", sayShort: '…c5 — strike the centre, Bc4 lines.', highlights: [H('c5'), H('d4', SOFT)] }),
      b({ id: 'bc2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6', say: "Ne2 supports d4 and Black castles, then …Nc6 piles onto the d4-pawn. The knight on c6 and the bishop on g7 form the classic Grünfeld battery against White's centre.", sayShort: '…Nc6 — battery on d4 with the bishop.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
      b({ id: 'bc3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6 Be3 Bg4 f3 Na5', say: "…Bg4 develops with a tactical pin on the e2-knight, and …Na5 attacks the c4-bishop — Black harasses White's pieces while keeping the pressure on the centre. White's f3 weakens the king, setting up the coming fireworks.", sayShort: '…Na5 — hit the c4-bishop.', arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4')] }),
      b({ id: 'bc4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6 Be3 Bg4 f3 Na5 Bxf7+ Rxf7 fxg4 Rxf1+ Kxf1 cxd4 cxd4 Qd6', say: "Bxf7+ is White's famous try — but after …Rxf7 fxg4 …Rxf1+ Kxf1 …cxd4 cxd4 …Qd6 the smoke clears with Black perfectly placed: the d4-pawn isolated and weak, the queen active on d6, and a comfortable game. There is the Bc4 tabiya — the sharpest White try defused, the centre still Black's target.", sayShort: '…Qd6 — smoke clears, d4 is weak.', highlights: [H('d4'), H('d6')] }),
    ],
  },

  'grunfeld-defence::Exchange: Nf3 c5 Rb1 (Modern)': {
    openingId: 'grunfeld-defence', title: 'Grünfeld — The Modern Rb1 Exchange', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'rb1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1', say: "The Modern Rb1 — White's flexible 21st-century Exchange, lifting the rook off the long diagonal and eyeing the b7-pawn. It dodges the …Qa5 pin of the old main line. Black continues with the same plan: hit the centre.", sayShort: 'Rb1 — the modern rook lift.', highlights: [H('b7', SOFT)] }),
      b({ id: 'rb2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+', say: "Black castles, trades …cxd4 cxd4 to isolate the d-pawn, and checks with …Qa5+! — the zwischenzug picks up a vital tempo and lets the queen swing into White's loosened queenside.", sayShort: '…Qa5+ — check, win the tempo.', highlights: [H('a5'), H('d4')] }),
      b({ id: 'rb3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2', say: "Bd2 blocks, and …Qxa2! snatches the a-pawn — a well-known grab that is fully sound here, the queen raiding deep into White's camp while White has nothing immediate. Black is simply a pawn up.", sayShort: '…Qxa2 — snatch the pawn, sound.', highlights: [H('a2')] }),
      b({ id: 'rb4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2 O-O Bg4 Rxb7 Bxf3 Bxf3', say: "White castles and grabs b7, but …Bg4 and …Bxf3 trade off a defender of the d4-pawn, leaving Black with the extra pawn and pressure on the isolani. There is the Modern Rb1 tabiya: a pawn to the good with the familiar Grünfeld pressure on d4 — White's modern subtlety gives nothing away.", sayShort: '…Bxf3 — a pawn up, press d4.', highlights: [H('f3'), H('g4', SOFT)] }),
    ],
  },
};
