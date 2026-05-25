import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision / threat /
// intent), YELLOW highlights (a key square the narration names), SOFT blue
// (secondary context). Orange move-squares are auto-painted by the player.
const VIS = 'rgba(40,185,95,0.92)';
const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// Every spine below was walked along the most-played master (or, for the
// sharp gambits, amateur) move at each ply against the live explorer
// (2026-05-25) — DB-anchored, no invented theory (G3). Keys EXACTLY match
// repertoire.json's kings-gambit variation names (lessons/index lookup).
export const KINGS_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ───────────────────────── Classical 3...g5 (4.Bc4) ─────────────────────
  'kings-gambit::King\'s Knight Gambit Classical': {
    openingId: 'kings-gambit',
    title: "King's Gambit — Classical (3…g5)",
    minutes: 11,
    orientation: 'white',
    beats: [
      {
        id: 'hold',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'],
        highlights: [{ square: 'g5', color: KEY }, { square: 'f4', color: KEY }],
        say: "The Classical King's Gambit. Black takes the pawn and then — greedily, defiantly — props it with g5. The pawn chain f4-g5 dares White to win the pawn back, and for two centuries White's answer has been to ignore it and play for the attack. This is the old main line, the one Morphy and Anderssen played, and it is the most combative way for Black to meet the gambit.",
        sayShort: '…g5 — Black holds the pawn, dares White.',
      },
      {
        id: 'bishop',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4'],
        arrows: [{ from: 'c4', to: 'f7', color: ATK }],
        highlights: [{ square: 'f7', color: KEY }],
        say: "Bc4 — straight to the most sensitive square in the position, f7. White ignores the pawn on f4 entirely and develops with threats. With the diagonal clear all the way to f7, every piece White brings out now points at Black's uncastled king. The pawn can wait; the king cannot.",
        sayShort: 'Bc4 — ignore the pawn, aim at f7.',
      },
      {
        id: 'challenge',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'Bg7', 'h4'],
        highlights: [{ square: 'g5', color: KEY }, { square: 'f4', color: SOFT }],
        say: "Black fianchettoes with Bg7 to defend the g5-f4 chain along the long diagonal — and White immediately challenges it with h4, prodding the g5-pawn before Black can settle. This is the modern way to meet 3…g5: don't sacrifice on impulse, lean on the chain and develop a broad centre behind it.",
        sayShort: 'h4 — challenge the g5-pawn at once.',
      },
      {
        id: 'centre',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'Bg7', 'h4', 'h6', 'd4', 'd6'],
        highlights: [{ square: 'd4', color: KEY }, { square: 'g5', color: SOFT }],
        say: "Black props the g5-pawn once more with h6, and White builds the broad centre with d4 while Black holds with d6. The recurring King's Gambit theme: trade the wing pawn for a commanding centre. White is a pawn down but has more space and the freer development — exactly the trade the gambit was played to reach.",
        sayShort: 'd4 — build the centre behind the chain.',
      },
      {
        id: 'prep',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'Bg7', 'h4', 'h6', 'd4', 'd6', 'c3', 'Nc6', 'O-O'],
        highlights: [{ square: 'c3', color: KEY }, { square: 'f1', color: SOFT }],
        say: "c3 braces the d4-pawn and quietly prepares queenside expansion, Black develops with Nc6, and White castles — the rook settling on f1 behind the half-open file. White has finished the gambit's job: every piece is out, the king is safe, and the centre is his.",
        sayShort: 'c3, O-O — brace d4, finish development.',
      },
      {
        id: 'expand',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'Bg7', 'h4', 'h6', 'd4', 'd6', 'c3', 'Nc6', 'O-O', 'Qe7', 'b4', 'Bd7', 'Na3'],
        highlights: [{ square: 'b4', color: KEY }],
        say: "Now White turns to the other wing. b4 grabs queenside space and the knight reroutes via a3, heading for c2 to overprotect the centre and eye the d4-e5 squares. While Black fusses over the kingside pawn, White expands where he is strongest. The pawn deficit is a distant memory beside the space and activity.",
        sayShort: 'b4, Na3 — expand and reroute on the queenside.',
      },
      {
        id: 'battle',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'Bg7', 'h4', 'h6', 'd4', 'd6', 'c3', 'Nc6', 'O-O', 'Qe7', 'b4', 'Bd7', 'Na3', 'g4', 'Ne1', 'f3'],
        highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: KEY }],
        say: "Black commits to the kingside storm: g4 pushes the knight back and f3 rams a pawn into White's castled position. White answers calmly — Ne1 reroutes the knight and the pawn on f3 will be rounded up at leisure. The position is double-edged and roughly balanced: Black's pawn-storm against White's centre and queenside space. This is the real Classical — not a forced win, but a rich, two-sided fight where the better-developed side with the centre holds the trumps.",
        sayShort: 'Ne1 — sidestep the storm; a double-edged fight.',
      },
    ],
  },

  // ───────────────────────── Fischer Defence 3...d6 ───────────────────────
  'kings-gambit::Fischer Defense': {
    openingId: 'kings-gambit',
    title: "King's Gambit — Fischer Defence (3…d6)",
    minutes: 11,
    orientation: 'white',
    beats: [
      {
        id: 'd6',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6'],
        highlights: [{ square: 'd6', color: KEY }, { square: 'e5', color: SOFT }],
        say: "Fischer's Defence — 3…d6. After Bobby Fischer lost a King's Gambit to Spassky he wrote a famous article, 'A Bust to the King's Gambit,' and this quiet pawn move was his recommendation. The point is subtle: Black still intends …g5 to hold the gambit pawn, but first he covers e5 and slams the door on the Bc4 tricks that crash through to f7. It is the most respected antidote of all.",
        sayShort: '…d6 — Fischer’s cool, pawn-holding antidote.',
      },
      {
        id: 'centre',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5'],
        highlights: [{ square: 'd4', color: KEY }, { square: 'g5', color: SOFT }],
        say: "White answers the most natural way — d4 — seizing the centre while Black plays the move his last turn prepared: g5, finally clamping down on f4. We have the familiar King's Gambit tension: Black a pawn up with a kingside chain, White with the bigger centre and the development lead. Now White goes to work on that chain.",
        sayShort: 'd4 …g5 — centre versus the held pawn.',
      },
      {
        id: 'pry',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4', 'Ng1'],
        highlights: [{ square: 'h4', color: KEY }, { square: 'g4', color: SOFT }, { square: 'g1', color: SOFT }],
        say: "h4 — prying at the chain from the other side. Black pushes g4, and now comes the move that looks absurd and is in fact correct: Ng1, retreating the knight all the way home. It seems to throw away development, but the knight is only passing through — it will re-route via e2, from where it both eyes the f4-pawn and clears the f-file. Ugly square, beautiful idea.",
        sayShort: 'h4 g4 Ng1 — retreat to re-route the knight.',
      },
      {
        id: 'reroute',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4', 'Ng1', 'Bh6', 'Nc3', 'c6', 'Nge2'],
        arrows: [{ from: 'e2', to: 'f4', color: ATK }],
        highlights: [{ square: 'f4', color: KEY }, { square: 'e2', color: SOFT }],
        say: "Black defends the chain with Bh6, White brings out Nc3 and Black props with c6 — and there it is: Nge2, the knight arriving on e2 exactly as planned, attacking the f4-pawn and ready to leap to g3. Every White piece is now aimed at recovering the gambit pawn under the best possible circumstances, with the centre already in hand.",
        sayShort: 'Nge2 — the knight lands, hits f4.',
      },
      {
        id: 'recover',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4', 'Ng1', 'Bh6', 'Nc3', 'c6', 'Nge2', 'Qf6', 'g3', 'fxg3', 'Nxg3'],
        highlights: [{ square: 'g3', color: KEY }],
        say: "Qf6 defends, but White breaks anyway: g3! fxg3 Nxg3 — the knight reaches g3, the gambit pawn is gone, and White has untangled with a dominant centre and harmonious pieces. The whole manoeuvre from move five — Ng1 to e2 to g3 — was a patient, ugly-looking journey to this clean, fully-developed position. Fischer's defence is sound, but White emerges with an easy game.",
        sayShort: 'g3, Nxg3 — recover the pawn, fully untangled.',
      },
      {
        id: 'structure',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4', 'Ng1', 'Bh6', 'Nc3', 'c6', 'Nge2', 'Qf6', 'g3', 'fxg3', 'Nxg3', 'Bxc1', 'Rxc1', 'Qh6', 'Bd3', 'Ne7'],
        highlights: [{ square: 'e4', color: KEY }],
        say: "The dark-squared bishops come off — Bxc1 Rxc1 — and after Qh6 White develops the last bishop to d3, completing the build behind the e4-pawn, while Black untangles with Ne7. Material is level, the structure looks symmetrical, but White has more space, the safer king, and the more active pieces. This is the modern verdict on Fischer's defence: fully playable for Black, but White gets a pleasant, risk-free edge — exactly what a gambiteer is happy to settle for.",
        sayShort: 'Bd3 — level material, lasting White pull.',
      },
    ],
  },

  // ───────────────────── Falkbeer Counter-Gambit 2...d5 ───────────────────
  'kings-gambit::Falkbeer Counter-Gambit': {
    openingId: 'kings-gambit',
    title: "King's Gambit — Falkbeer Counter-Gambit (2…d5)",
    minutes: 10,
    orientation: 'white',
    beats: [
      {
        id: 'counter',
        moves: ['e4', 'e5', 'f4', 'd5'],
        highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: KEY }],
        say: "The Falkbeer Counter-Gambit. Instead of taking the f4-pawn, Black strikes the centre with d5, hitting the e4-pawn — meeting a gambit with a gambit. The idea is principled: don't grovel for the extra pawn, hit back in the middle before White is organised. White must handle this energetically or Black seizes the initiative for free.",
        sayShort: '…d5 — counter the gambit in the centre.',
      },
      {
        id: 'wedge',
        moves: ['e4', 'e5', 'f4', 'd5', 'exd5', 'e4'],
        highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: SOFT }],
        say: "White takes — exd5 — and Black, true to the gambit spirit, pushes e4 rather than recapture. The pawn on e4 is a wedge: it cramps White, denies the f3-square to the king's knight, and gives Black easy, flowing development. This is the real Falkbeer — Black is down a pawn but the e4-pawn buys time and space. White's task is to undermine it.",
        sayShort: '…e4 — the cramping wedge, not a recapture.',
      },
      {
        id: 'undermine',
        moves: ['e4', 'e5', 'f4', 'd5', 'exd5', 'e4', 'd3', 'Nf6', 'dxe4', 'Nxe4'],
        highlights: [{ square: 'd3', color: KEY }, { square: 'e4', color: SOFT }],
        say: "d3 — the modern refutation. White attacks the wedge at its root. After Nf6 developing against the d5-pawn, White takes — dxe4 Nxe4 — and the cramping pawn is gone. This quiet exchange is what tamed the Falkbeer: trade off the e4-pawn and Black's compensation evaporates, leaving White simply up a clean pawn with a sound position.",
        sayShort: 'd3, dxe4 — uproot the wedge, keep the pawn.',
      },
      {
        id: 'develop',
        moves: ['e4', 'e5', 'f4', 'd5', 'exd5', 'e4', 'd3', 'Nf6', 'dxe4', 'Nxe4', 'Nf3', 'Bc5', 'Qe2', 'Bf5', 'Nc3'],
        arrows: [{ from: 'e2', to: 'e4', color: ATK }],
        highlights: [{ square: 'e4', color: KEY }],
        say: "Now White develops with gain of time. Nf3 comes out — the f3-square is free again now the wedge is gone — Bc5 and Bf5 develop Black's pieces, but Qe2 pins and pressures the knight on e4, and Nc3 piles on. Black's active pieces look nice, but they are activity to compensate for a missing pawn, and White is the one asking the questions.",
        sayShort: 'Qe2, Nc3 — develop, pressure the e4-knight.',
      },
      {
        id: 'liquidate',
        moves: ['e4', 'e5', 'f4', 'd5', 'exd5', 'e4', 'd3', 'Nf6', 'dxe4', 'Nxe4', 'Nf3', 'Bc5', 'Qe2', 'Bf5', 'Nc3', 'Qe7', 'Be3', 'Bxe3', 'Qxe3', 'Nxc3', 'Qxe7+', 'Kxe7'],
        highlights: [{ square: 'e7', color: KEY }],
        say: "The pieces come off in a forced sequence: Qe7 Be3 Bxe3 Qxe3 Nxc3, and the queens are traded — Qxe7+ Kxe7. The dust settles on an endgame where White is a healthy pawn up and Black's king sits awkwardly on e7, having lost the right to castle. The Falkbeer is a noble idea, but against the d3 antidote it simply leaves Black a pawn short. White trades into the ending and grinds.",
        sayShort: 'Qxe7+ Kxe7 — trade into a pawn-up ending.',
      },
    ],
  },

  // ─────────────────────── Declined 2...Bc5 (Classical) ───────────────────
  'kings-gambit::King\'s Gambit Declined': {
    openingId: 'kings-gambit',
    title: "King's Gambit Declined (2…Bc5)",
    minutes: 10,
    orientation: 'white',
    beats: [
      {
        id: 'decline',
        moves: ['e4', 'e5', 'f4', 'Bc5'],
        arrows: [{ from: 'c5', to: 'g1', color: ATK }],
        highlights: [{ square: 'g1', color: KEY }, { square: 'f4', color: SOFT }],
        say: "The Classical Declined. Rather than grab the f4-pawn, Black develops the bishop to c5, planting it on the a7-g1 diagonal pointed straight at White's king. This is a clever practical choice: the bishop stops White from castling kingside comfortably and keeps the …Qh4+ check in reserve, since White can no longer answer it with g3. Black declines the pawn to keep White's king in the centre.",
        sayShort: '…Bc5 — decline; the bishop pins the king home.',
      },
      {
        id: 'build',
        moves: ['e4', 'e5', 'f4', 'Bc5', 'Nf3', 'd6', 'c3', 'Nf6', 'd4'],
        highlights: [{ square: 'd4', color: KEY }, { square: 'c3', color: SOFT }],
        say: "White develops Nf3, Black props the centre with d6 and Nf6, and White prepares the big push with c3 and then d4. The plan is classical: build a broad pawn centre, gain space, and use it to chase the annoying c5-bishop and open lines. Declining the pawn keeps the position closed for a moment, but White's space advantage is real.",
        sayShort: 'c3, d4 — build the centre, gain space.',
      },
      {
        id: 'gain-tempo',
        moves: ['e4', 'e5', 'f4', 'Bc5', 'Nf3', 'd6', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb6', 'Nc3', 'O-O'],
        highlights: [{ square: 'b6', color: KEY }, { square: 'd4', color: SOFT }],
        say: "Black strikes at the centre with exd4, White recaptures cxd4, and the d4-pawn gains a tempo by shooing the bishop to b6. White completes development with Nc3 while Black castles. White now has the broad d4-e4 centre, more space, and a clear plan: roll the kingside pawns and open the f-file the declined gambit kept shut.",
        sayShort: 'cxd4 — recapture, kick the bishop, keep space.',
      },
      {
        id: 'break',
        moves: ['e4', 'e5', 'f4', 'Bc5', 'Nf3', 'd6', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb6', 'Nc3', 'O-O', 'e5', 'dxe5', 'fxe5'],
        highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
        say: "e5 — the breakthrough. White throws the centre pawn forward, and after dxe5 fxe5 the f-file finally rips open with the rook on f1 bearing down on f6 and f7. The e5-pawn cramps Black and the long-delayed kingside attack arrives. This is the reward for declining: the pawn White kept now becomes a battering ram, and the f-file the gambit was always about opens at last.",
        sayShort: 'e5, fxe5 — the centre breaks, f-file opens.',
      },
      {
        id: 'fight',
        moves: ['e4', 'e5', 'f4', 'Bc5', 'Nf3', 'd6', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb6', 'Nc3', 'O-O', 'e5', 'dxe5', 'fxe5', 'Nd5', 'Bg5', 'Nxc3', 'bxc3', 'Qd5'],
        highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
        say: "Black fights back in the centre: Nd5 hits the loose pieces, Bg5 develops with a gain of tempo, and after Nxc3 bxc3 Qd5 Black centralises the queen to hold things together. The position is sharp and roughly balanced — but it is exactly the kind of open, central middlegame the King's Gambit player wants, with the e5-pawn cramping Black, attacking chances on the kingside, and the more natural plan. Declining the gambit does not avoid the fight; it only delays it.",
        sayShort: '…Qd5 — Black centralises; the fight is open.',
      },
    ],
  },

  // ───────────────────────── Bishop's Gambit 3.Bc4 ────────────────────────
  'kings-gambit::Bishop\'s Gambit (3.Bc4)': {
    openingId: 'kings-gambit',
    title: "King's Gambit — Bishop's Gambit (3.Bc4)",
    minutes: 10,
    orientation: 'white',
    beats: [
      {
        id: 'bc4',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Bc4'],
        arrows: [{ from: 'c4', to: 'f7', color: ATK }],
        highlights: [{ square: 'f7', color: KEY }],
        say: "The Bishop's Gambit — 3.Bc4 instead of Nf3. White develops the bishop to its best square, eyeing f7, at once and deliberately allows the check …Qh4+. Why invite it? Because after Kf1 the king is safe enough, White hasn't blocked the f-file with a knight, and the black queen on h4 becomes a target White can chase with tempo. It is the most aggressive of all King's Gambit move-orders.",
        sayShort: 'Bc4 — develop first, invite the check.',
      },
      {
        id: 'declined-check',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Bc4', 'Nf6'],
        arrows: [{ from: 'f6', to: 'e4', color: ATK }],
        highlights: [{ square: 'e4', color: KEY }],
        say: "Most often Black declines the check and develops with Nf6, hitting the e4-pawn. This is the modern main line — Black plays soundly rather than chasing White's king. White's bishop already sits on its dream diagonal, and now White must defend e4 while keeping the initiative the gambit promised.",
        sayShort: '…Nf6 — decline the check, hit e4.',
      },
      {
        id: 'defend-e4',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Bc4', 'Nf6', 'Nc3', 'c6', 'Bb3', 'd5'],
        arrows: [{ from: 'b3', to: 'd5', color: ATK }],
        highlights: [{ square: 'd5', color: KEY }, { square: 'f7', color: SOFT }],
        say: "Nc3 defends e4 and develops. Black expands with c6 and d5, and White tucks the bishop back to b3 — keeping it on the killer diagonal, refusing to be chased off f7. The pawn break …d5 is Black's standard freeing move in this structure, and White meets it head-on, content to keep the bishop aimed at the king.",
        sayShort: 'Nc3, Bb3 — guard e4, keep the diagonal.',
      },
      {
        id: 'centre',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Bc4', 'Nf6', 'Nc3', 'c6', 'Bb3', 'd5', 'exd5', 'cxd5', 'd4', 'Bd6', 'Nge2'],
        arrows: [{ from: 'e2', to: 'f4', color: ATK }],
        highlights: [{ square: 'd4', color: KEY }, { square: 'f4', color: SOFT }],
        say: "exd5 cxd5 d4 — White builds the broad centre once more, and Bd6 defends the f4-pawn. Out comes Nge2, heading for the f4-pawn and the g3-square, the same re-routing idea you saw in the Fischer Defence. White's set-up is harmonious: bishop on b3, knights converging on f4, pawns in the centre. The gambit pawn is about to come home.",
        sayShort: 'd4, Nge2 — centre built, knight hits f4.',
      },
      {
        id: 'recover',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Bc4', 'Nf6', 'Nc3', 'c6', 'Bb3', 'd5', 'exd5', 'cxd5', 'd4', 'Bd6', 'Nge2', 'O-O', 'Bxf4', 'Bxf4', 'Nxf4'],
        arrows: [{ from: 'f4', to: 'd5', color: ATK }],
        highlights: [{ square: 'f4', color: KEY }, { square: 'd5', color: SOFT }],
        say: "Both sides castle and the gambit pawn is recovered: Bxf4 Bxf4 Nxf4, with the knight landing on f4 eyeing the d5-pawn and the kingside. Material is level, the position is open and roughly balanced, but White has the old attacking diagonal, active knights, and the kind of free-flowing game the Bishop's Gambit was played to reach. The check Black never took has cost him nothing — and White has a comfortable, attacking middlegame.",
        sayShort: 'Nxf4 — pawn back, open attacking game.',
      },
      {
        id: 'fight',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Bc4', 'Nf6', 'Nc3', 'c6', 'Bb3', 'd5', 'exd5', 'cxd5', 'd4', 'Bd6', 'Nge2', 'O-O', 'Bxf4', 'Bxf4', 'Nxf4', 'Re8+', 'Nfe2', 'Ng4'],
        highlights: [{ square: 'e8', color: KEY }, { square: 'g4', color: SOFT }],
        say: "Black generates counterplay — Re8+ drives the knight back to e2, and Ng4 jumps in looking for tricks against f2 and the king. The position is double-edged, and that is the point: the Bishop's Gambit trades a pawn for an open, piece-active battle where White's lead in development and bishop diagonal give him the practical pull. Sharp chess, exactly what you came here for.",
        sayShort: '…Ng4 — Black seeks tricks; the game stays sharp.',
      },
    ],
  },

  // ───────────────────────── Kieseritzky 5.Ne5 ────────────────────────────
  'kings-gambit::Kieseritzky Gambit': {
    openingId: 'kings-gambit',
    title: "King's Gambit — Kieseritzky Gambit (5.Ne5)",
    minutes: 11,
    orientation: 'white',
    beats: [
      {
        id: 'g5-h4',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4'],
        highlights: [{ square: 'g5', color: KEY }],
        say: "Against the greedy …g5, the most principled answer of all is h4 — attacking the pawn chain immediately, before Black can build it up with Bg7 and h6. White will not let the chain settle. This thrust is the gateway to the Kieseritzky, the soundest of the sharp King's Gambit lines and the one modern theory respects most.",
        sayShort: 'h4 — hit the chain before it settles.',
      },
      {
        id: 'ne5',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5'],
        arrows: [{ from: 'e5', to: 'g4', color: ATK }, { from: 'e5', to: 'f7', color: ATK }],
        highlights: [{ square: 'e5', color: KEY }, { square: 'f7', color: SOFT }],
        say: "Black pushes g4 to kick the knight — and instead of retreating, White leaps forward: Ne5! The Kieseritzky knight. From e5 it is a monster: it attacks the g4-pawn, eyes f7 and d7, and dominates the centre from the very square the gambit vacated. This single advanced knight is the engine of White's whole attack. It cannot be chased by a pawn and refuses to leave.",
        sayShort: 'Ne5 — leap forward; the knight dominates.',
      },
      {
        id: 'central-break',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'Bc4', 'd5', 'exd5', 'Bd6'],
        highlights: [{ square: 'd5', color: KEY }, { square: 'f7', color: SOFT }],
        say: "Nf6 develops and hits e4; White plays Bc4, and Black strikes the centre with d5. After exd5 Bd6 the position bristles: White has a passed d5-pawn, the bishop boring at f7, and the e5-knight planted in Black's face, while Bd6 lines up against the e5-knight. Every piece is loaded. This is the critical tabiya of the Kieseritzky.",
        sayShort: 'Bc4 …d5 — both strike; the position loads up.',
      },
      {
        id: 'centre-pawn',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'Bc4', 'd5', 'exd5', 'Bd6', 'd4', 'Nh5', 'O-O', 'O-O'],
        highlights: [{ square: 'd4', color: KEY }, { square: 'h5', color: SOFT }],
        say: "d4 braces the e5-knight with a pawn and completes the centre; Nh5 defends the f4-pawn and eyes g3; and both kings finally castle. The smoke is clearing into a position where White has a vast centre and the dominant knight, while Black clings to the extra pawn with pieces on the rim. White's structure and the e5-outpost are worth more than the pawn.",
        sayShort: 'd4, O-O — brace the knight, finish the centre.',
      },
      {
        id: 'exchange-sac',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'Bc4', 'd5', 'exd5', 'Bd6', 'd4', 'Nh5', 'O-O', 'O-O', 'Rxf4', 'Nxf4', 'Bxf4', 'Qxh4'],
        highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: SOFT }],
        say: "And the King's Gambit signature returns: Rxf4! White gives up the exchange to demolish the f4-pawn — after Nxf4 Bxf4 the bishop lands beautifully on f4 and the knight still dominates e5, while …Qxh4 grabs a pawn but walks into White's initiative. For the exchange White has the e5-knight, the broad centre, the bishop pair, and a black king with no shelter. Once more the lesson holds: in the King's Gambit, material is fuel for the attack.",
        sayShort: 'Rxf4 — exchange sac; the bishop and knight swarm.',
      },
    ],
  },

  // ───────────────────────── Muzio Gambit (roadmap) ───────────────────────
  'kings-gambit::Muzio Gambit': {
    openingId: 'kings-gambit',
    title: "King's Gambit — Muzio Gambit (5.O-O)",
    minutes: 9,
    orientation: 'white',
    kind: 'roadmap',
    beats: [
      {
        id: 'setup',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4'],
        arrows: [{ from: 'c4', to: 'f7', color: ATK }],
        highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: SOFT }],
        say: "The most outrageous sacrifice in chess begins quietly. Black holds the pawn with g5 and, after Bc4, pushes g4 to win the knight on f3 — it is attacked and seemingly must move. Most openings would retreat. The Muzio does not — and the bishop on c4 already stares at f7.",
        sayShort: '…g4 — hits the knight; White won’t budge.',
      },
      {
        id: 'the-sac',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O'],
        highlights: [{ square: 'f7', color: KEY }, { square: 'f3', color: SOFT }],
        say: "O-O!! White castles and simply abandons the knight on f3. This is the Muzio Gambit: a whole piece offered for the open f-file, a colossal lead in development, and a direct line to f7. The rook on f1 already glares down the file. White is betting that an exposed king and three idle black pieces are worth more than a knight.",
        sayShort: 'O-O — castle, give up the whole knight.',
      },
      {
        id: 'collect',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O', 'gxf3', 'Qxf3', 'Qf6'],
        arrows: [{ from: 'c4', to: 'f7', color: ATK }],
        highlights: [{ square: 'f7', color: KEY }],
        say: "Black takes the knight — gxf3 — and White recaptures with the queen, Qxf3 — and now the bishop on c4 glares at f7 while the queen and rook load the open file. Black scrambles to defend with Qf6. White has a queen, rook and bishop all trained on the king for the price of one knight. The attack plays itself.",
        sayShort: 'Qxf3 — queen and rook storm the f-file.',
      },
      {
        id: 'second-sac',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O', 'gxf3', 'Qxf3', 'Qf6', 'e5', 'Qxe5', 'Bxf7+', 'Kxf7', 'd4'],
        highlights: [{ square: 'f7', color: KEY }, { square: 'e5', color: SOFT }],
        say: "e5 deflects the queen, and then the second thunderbolt: Bxf7+!! — a second sacrifice, dragging the king into the open after Kxf7. White follows with d4, gaining time on the queen and opening even more lines. The black king stands naked on f7 with White's entire army converging. This is the romantic King's Gambit at its most extreme — and at the board, against a human, it is terrifying to face.",
        sayShort: 'Bxf7+ — second sac, drag the king out.',
      },
      {
        id: 'verdict',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O', 'gxf3', 'Qxf3', 'Qf6', 'e5', 'Qxe5', 'Bxf7+', 'Kxf7', 'd4', 'Qf5', 'g4', 'Qg6'],
        highlights: [{ square: 'g6', color: KEY }, { square: 'f7', color: SOFT }],
        say: "After Qf5 g4 Qg6 the queen is harried to the edge while White keeps developing with check and threat. Be honest about the verdict: with precise defence the engines say Black survives a piece up — the Muzio is not objectively sound. But this is the line you play to win games, not to satisfy a computer — the king on f7 never finds rest. Across the board, the open king and the relentless initiative win far more often than they lose. Know the Muzio, and you have a weapon that turns a quiet evening into a brawl.",
        sayShort: 'Qg6 — harry the queen, keep the attack rolling.',
      },
    ],
  },

  // ───────────────────────── Allgaier Gambit (roadmap) ────────────────────
  'kings-gambit::Allgaier Gambit': {
    openingId: 'kings-gambit',
    title: "King's Gambit — Allgaier Gambit (5.Ng5)",
    minutes: 9,
    orientation: 'white',
    kind: 'roadmap',
    beats: [
      {
        id: 'setup',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4'],
        highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: SOFT }],
        say: "The Allgaier shares the Kieseritzky's start — …g5, h4, g4 attacking the knight — but instead of the calm Ne5, White chooses violence. The knight is attacked on f3 and, rather than the sound retreat to e5, it lunges forward to hunt the king directly.",
        sayShort: '…g4 — the knight is attacked; White lunges.',
      },
      {
        id: 'ng5',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ng5'],
        arrows: [{ from: 'g5', to: 'f7', color: ATK }],
        highlights: [{ square: 'f7', color: KEY }, { square: 'g5', color: SOFT }],
        say: "Ng5 — the Allgaier knight, diving straight at f7. It threatens to crash through immediately, and Black's most testing reply is h6, kicking the knight and asking White to prove the sacrifice. White obliges in the most direct way imaginable.",
        sayShort: 'Ng5 — dive at f7, daring …h6.',
      },
      {
        id: 'nxf7',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ng5', 'h6', 'Nxf7'],
        arrows: [{ from: 'f7', to: 'h8', color: ATK }],
        highlights: [{ square: 'f7', color: KEY }],
        say: "Nxf7! — the knight grabs f7 and eyes the h8-rook, and after Kxf7 the black king is hauled out into the open on move six. White has given a knight to strip away the king's shelter and force it to march. This is even more committal than the Muzio: there is no taking it back, only attack.",
        sayShort: 'Nxf7 — sacrifice the knight, expose the king.',
      },
      {
        id: 'hunt',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ng5', 'h6', 'Nxf7', 'Kxf7', 'Qxg4', 'Qf6', 'Bc4+', 'Ke8'],
        arrows: [{ from: 'c4', to: 'f7', color: ATK }],
        highlights: [{ square: 'e8', color: KEY }, { square: 'f7', color: SOFT }],
        say: "Qxg4 regains a pawn and brings the queen into the hunt; after Qf6 White checks with Bc4+, driving the king back to e8. White is throwing every piece forward with tempo, refusing to let the king find shelter on f7 or anywhere. The practical pressure on a defender who has to find only-moves under fire is enormous.",
        sayShort: 'Bc4+ — check, drive the king back.',
      },
      {
        id: 'verdict',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ng5', 'h6', 'Nxf7', 'Kxf7', 'Qxg4', 'Qf6', 'Bc4+', 'Ke8', 'O-O', 'Qd4+', 'Kh1', 'Qxc4'],
        highlights: [{ square: 'c4', color: KEY }, { square: 'e8', color: SOFT }],
        say: "And here is the honest reckoning. White castles, but Black defends accurately — Qd4+ Kh1 Qxc4 — returning some material to blunt the attack and keeping the extra piece. Objectively the Allgaier is unsound: with the king tucked back on e8, best defence leaves Black on top. This is a surprise weapon for fast time controls and unprepared opponents, where the exposed king and the initiative do real damage. Play it knowing exactly what it is: a gamble, thrilling and dangerous, that the King's Gambit has always been willing to make.",
        sayShort: '…Qxc4 — Black defends; know the gamble you take.',
      },
    ],
  },
};
