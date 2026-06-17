import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a). Trompowsky is MODERN — narration ideas
// grounded on universal principles (concept corpus) + reputable refs + DB moves.
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const TROMP = 'https://en.wikipedia.org/wiki/Trompowsky_Attack';

export const TROMPOWSKY_ATTACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  'trompowsky-attack::2...Ne4 3.Bf4 Main Line': {
    openingId: 'trompowsky-attack',
    sources: ['concept:pos-space', 'concept:pos-development', TROMP],
    title: '2...Ne4 — The 3.Bf4 Main Line',
    minutes: 9,
    orientation: 'white',
    beats: [
      {
        id: 'tn1',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4'],
        highlights: [{ square: 'f4', color: KEY }, { square: 'e4', color: SOFT }],
        say: "The Trompowsky — 2.Bg5 pins the f6-knight at once, and against the most common reply, Black's 2…Ne4 hitting the bishop, White simply retreats to f4. The bishop stays active on a great diagonal and White has avoided all the doubled-pawn structures. A low-theory, off-beat way to fight for the centre on White's terms.",
        sayShort: 'Bf4 — keep the bishop active.',
      },
      {
        id: 'tn2',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'd5', 'e3', 'c5', 'Bd3', 'Nc6', 'Bxe4', 'dxe4'],
        highlights: [{ square: 'e4', color: KEY }, { square: 'c5', color: SOFT }],
        say: "Black grabs the centre with …d5 and …c5; White challenges the advanced knight with Bd3 and trades it off with Bxe4. After …dxe4 Black is left with a loose, over-extended pawn on e4 — a long-term target — while White's pieces are ready to swarm around it.",
        sayShort: 'Bxe4 dxe4 — leave Black a loose e4-pawn.',
      },
      {
        id: 'tn3',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'd5', 'e3', 'c5', 'Bd3', 'Nc6', 'Bxe4', 'dxe4', 'd5', 'Nb4', 'Nc3', 'e6', 'd6', 'f5', 'a3', 'Nc6'],
        highlights: [{ square: 'd6', color: KEY }, { square: 'f5', color: SOFT }],
        say: "White surges d5 and then the cheeky d6! — a cramping pawn wedge jammed deep in Black's camp — while developing Nc3; Black blocks with …e6 and props the centre with …f5. There is the tabiya: a roughly level but unbalanced fight where White's d6-wedge and easy development hand White the more pleasant, low-theory game — scoring 54% at club.",
        sayShort: 'd6 — the cramping wedge, easy game.',
      },
    ],
  },
  'trompowsky-attack::2...d5 3.Bxf6 Doubled Pawns': {
    openingId: 'trompowsky-attack',
    sources: ['concept:pos-bishop-pair', 'concept:pawn-doubled', TROMP],
    title: '2...d5 — Bxf6 and the Bishop Pair',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'take',
        moves: ['d4', 'Nf6', 'Bg5', 'd5', 'Bxf6', 'exf6'],
        highlights: [{ square: 'f6', color: KEY }, { square: 'f7', color: SOFT }],
        say: "When Black blocks the threat with d5, White cashes in at once: Bxf6. Black recaptures exf6, and the trade has done its work — Black now carries doubled pawns on f6 and f7, and White owns the bishop pair. The doubled pawns are not weak yet, but they are inflexible, and the two bishops give White a small, durable pull in an open position.",
        sayShort: 'Bxf6 exf6 — bishops vs doubled pawns.',
      },
      {
        id: 'build',
        moves: ['d4', 'Nf6', 'Bg5', 'd5', 'Bxf6', 'exf6', 'e3', 'Bd6', 'Bd3', 'O-O', 'Nd2', 'Re8'],
        highlights: [{ square: 'e3', color: SOFT }, { square: 'd6', color: SOFT }],
        say: "Both sides develop naturally. White builds the modest e3/Bd3 set-up; Black places the bishop on d6 and rooks the e-file. White is in no hurry — with the bishop pair he simply wants the position to stay open, keep both bishops breathing, and slowly aim at the half-open lines around Black's doubled pawns.",
        sayShort: 'e3, Bd3 — keep it open for the bishops.',
      },
      {
        id: 'press',
        moves: ['d4', 'Nf6', 'Bg5', 'd5', 'Bxf6', 'exf6', 'e3', 'Bd6', 'Bd3', 'O-O', 'Nd2', 'Re8', 'Ne2', 'c6', 'O-O', 'Nd7', 'c4', 'Nf8', 'Qc2', 'Be6'],
        arrows: [{ from: 'd3', to: 'h7', color: VIS }],
        highlights: [{ square: 'h7', color: KEY }, { square: 'c4', color: SOFT }],
        say: "White completes the plan: Ne2 and c4 to pressure d5, and the battery of Qc2 behind Bd3 trains on h7 and Black's king. Black shores up with c6, reroutes a knight to f8, and develops the light bishop to e6. The position is balanced but easier for White — two bishops, a clean structure, and pressure on both the centre and the kingside. The Trompowsky's bishop-pair plan, delivered without a line of theory.",
        sayShort: 'c4 and Qc2 — pressure centre and h7.',
      },
    ],
  },

  'trompowsky-attack::2...e6 French-Type Structure': {
    openingId: 'trompowsky-attack',
    sources: ['concept:pos-center', 'concept:pos-initiative', TROMP],
    title: '2...e6 — Big Centre and Opposite Castling',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'grab-centre',
        moves: ['d4', 'Nf6', 'Bg5', 'e6', 'e4'],
        highlights: [{ square: 'e4', color: KEY }, { square: 'd4', color: KEY }],
        say: "Against the modest e6, White seizes the moment: e4! Now White has the full d4-e4 pawn centre, and because Black committed to e6 instead of striking with d5, there is nothing to challenge it immediately. The Trompowsky has transposed into an aggressive French-type structure where White is simply a tempo up on the usual lines.",
        sayShort: 'e4 — grab the full big centre.',
      },
      {
        id: 'trade',
        moves: ['d4', 'Nf6', 'Bg5', 'e6', 'e4', 'h6', 'Bxf6', 'Qxf6', 'Nc3', 'd6'],
        highlights: [{ square: 'f6', color: SOFT }, { square: 'd6', color: SOFT }],
        say: "Black questions the bishop with h6; White takes Bxf6 and Black recaptures with the queen. White is happy — he has the bishop pair and a big centre, and the queen on f6 will soon have to move again. Nc3 reinforces e4, Black plays d6 to keep things solid, and now White reveals his plan: this is going to be an opposite-wings attack.",
        sayShort: 'Bxf6 Qxf6 — centre plus the bishops.',
      },
      {
        id: 'storm',
        moves: ['d4', 'Nf6', 'Bg5', 'e6', 'e4', 'h6', 'Bxf6', 'Qxf6', 'Nc3', 'd6', 'Qd2', 'Nd7', 'O-O-O', 'a6', 'f4', 'b5', 'Nf3', 'Bb7', 'Bd3', 'c5'],
        highlights: [{ square: 'f4', color: KEY }, { square: 'h7', color: KEY }],
        say: "Here is the point. Qd2 and O-O-O send the king to the queenside — and now White storms the OTHER wing with f4, intending f5 to rip open Black's king. Black races back with a6, b5 and c5, attacking where White's king sits. It is a pure opposite-castling race, the sharpest face of the Trompowsky: White's f-pawn and the Bd3 battery on h7 against Black's queenside pawns. Whoever lands first wins — and White, with the bishop pair and the head start, usually does.",
        sayShort: "O-O-O then f4 — storm Black’s king.",
      },
    ],
  },

  'trompowsky-attack::Raptor Variation 2...c5': {
    openingId: 'trompowsky-attack',
    sources: ['concept:pos-initiative', 'concept:pos-development', TROMP],
    title: 'Raptor — Gambit the b-Pawn for the Initiative',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'wedge',
        moves: ['d4', 'Nf6', 'Bg5', 'c5', 'd5', 'Qb6'],
        highlights: [{ square: 'd5', color: KEY }, { square: 'b2', color: SOFT }],
        say: "Black challenges the centre with c5; White doesn't take — he rams the pawn home with d5, planting a space-grabbing wedge. Black pounces on the loose b2-pawn with Qb6, daring White to defend it. This is the Raptor: White is about to GIVE UP the b-pawn on purpose, betting that a lead in development and the cramping d5-wedge are worth more than a pawn.",
        sayShort: 'd5 — the wedge; Black eyes b2.',
      },
      {
        id: 'gambit',
        moves: ['d4', 'Nf6', 'Bg5', 'c5', 'd5', 'Qb6', 'Nc3', 'Qxb2', 'Bd2', 'Qb6', 'e4'],
        highlights: [{ square: 'b2', color: KEY }, { square: 'e4', color: KEY }],
        say: "Nc3 develops and ignores the threat; Black grabs the pawn, Qxb2. Then Bd2 covers the queen's escape squares and chases it back to b6 with tempo, and White slams down e4 — a full d5-e4 centre, every piece springing to life, while Black's queen has wasted moves and his kingside is undeveloped. White has a raging initiative for a single wing pawn. This is gambit chess: time is the currency, and White is rich.",
        sayShort: 'e4 — huge centre for the b-pawn.',
      },
      {
        id: 'initiative',
        moves: ['d4', 'Nf6', 'Bg5', 'c5', 'd5', 'Qb6', 'Nc3', 'Qxb2', 'Bd2', 'Qb6', 'e4', 'd6', 'f4', 'e6', 'Bc4', 'exd5', 'exd5', 'a6', 'h3', 'Be7'],
        highlights: [{ square: 'f7', color: KEY }, { square: 'd5', color: SOFT }],
        say: "White just keeps developing with threats — f4 to seize the centre, Bc4 raking at f7, and the d5-pawn cramping everything. Black scrambles to untangle with a6 and Be7, but he is permanently a tempo behind and his king is stuck in the middle. White's pieces are all out, all aimed at the enemy king, and the gambit pawn is a distant memory. The Raptor's lesson: a pawn is nothing next to a roaring initiative.",
        sayShort: 'Bc4 hits f7 — the initiative rolls.',
      },
    ],
  },

  'trompowsky-attack::2...g6 Fianchetto Response': {
    openingId: 'trompowsky-attack',
    sources: ['concept:pawn-doubled', 'concept:pos-bishop-pair', TROMP],
    title: '2...g6 — Wreck the Kingside Before the Fianchetto',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'take-first',
        moves: ['d4', 'Nf6', 'Bg5', 'g6', 'Bxf6', 'exf6'],
        highlights: [{ square: 'f6', color: KEY }, { square: 'g7', color: SOFT }],
        say: "Black heads for a King's-Indian-style fianchetto with g6 — but White strikes FIRST: Bxf6, taking the knight before Black can tuck a bishop on g7 to guard the dark squares. After exf6 Black is left with doubled f-pawns and a permanently weakened dark-square complex, exactly the squares his fianchetto bishop was meant to cover. White has spoiled the King's Indian before it began.",
        sayShort: 'Bxf6 — take before the fianchetto.',
      },
      {
        id: 'centre',
        moves: ['d4', 'Nf6', 'Bg5', 'g6', 'Bxf6', 'exf6', 'c4', 'd5', 'cxd5', 'Qxd5', 'Nc3'],
        arrows: [{ from: 'c3', to: 'd5', color: VIS }],
        highlights: [{ square: 'd5', color: KEY }],
        say: "White claims the centre with c4. Black hits back with d5, but after cxd5 Qxd5 the queen is exposed in the centre, and Nc3 develops with tempo, kicking it. White gains move after move while Black's structure stays broken. The doubled f-pawns can never advance to free the position, so Black's extra central pawn is more burden than asset.",
        sayShort: 'c4 then Nc3 — develop with tempo.',
      },
      {
        id: 'edge',
        moves: ['d4', 'Nf6', 'Bg5', 'g6', 'Bxf6', 'exf6', 'c4', 'd5', 'cxd5', 'Qxd5', 'Nc3', 'Qa5', 'e3', 'Bg7', 'Nf3', 'O-O', 'Be2', 'Rd8', 'O-O', 'Qb4'],
        highlights: [{ square: 'd4', color: KEY }],
        say: "Both sides finish developing — Black does get his bishop to g7 and castles, but the dark squares around his king are forever tender because of those doubled f-pawns. White stands on a healthy d4-pawn, has the safer structure and the simpler game, and can probe the long-term weaknesses at leisure. Against the fianchetto, the Trompowsky's recipe is blunt and effective: take the knight, double the pawns, and play chess.",
        sayShort: 'Bg7 castles, but the dark squares ache.',
      },
    ],
  },

  'trompowsky-attack::Vaganian Gambit 2...Ne4 3.Bf4 c5': {
    openingId: 'trompowsky-attack',
    sources: ['concept:pos-center', 'concept:pos-initiative', TROMP],
    title: 'Vaganian Gambit — f3, e4 and a Pawn Sacrificed',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'd5',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'c5', 'd5', 'Qb6'],
        highlights: [{ square: 'd5', color: KEY }, { square: 'b2', color: SOFT }],
        say: "After Ne4 Bf4, Black lashes out with c5; White answers d5, gaining space, and Black again grabs at the b2-pawn with Qb6. The Vaganian Gambit is White's bold reply: he will offer b2, retreat his bishop, and build a huge centre with f3 and e4 — a pawn for raw central power and the initiative.",
        sayShort: 'd5 — space; Black eyes b2 again.',
      },
      {
        id: 'f3-e4',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'c5', 'd5', 'Qb6', 'Bc1', 'e6', 'f3', 'Nf6', 'e4'],
        highlights: [{ square: 'e4', color: KEY }, { square: 'f3', color: SOFT }],
        say: "Bc1 calmly tucks the bishop home, defending b2 indirectly and unpinning everything. Black tries to open with e6; White plays f3 — kicking the e4-knight back to f6 AND preparing the centre — and then e4. Now White has the full broad centre with d5 and e4, supported by the f3-pawn. Black's early queen sortie has gained nothing, and White's space is overwhelming.",
        sayShort: 'f3 then e4 — build the broad centre.',
      },
      {
        id: 'space',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'c5', 'd5', 'Qb6', 'Bc1', 'e6', 'f3', 'Nf6', 'e4', 'exd5', 'exd5', 'd6', 'Nc3', 'g6', 'Bb5+', 'Bd7'],
        arrows: [{ from: 'b5', to: 'd7', color: VIS }],
        highlights: [{ square: 'd5', color: KEY }, { square: 'd7', color: SOFT }],
        say: "Black tries to free himself with exd5, but after exd5 the wedge simply returns, even stronger. White develops with gain of time — Nc3, then Bb5+ forcing Black to block with Bd7 — and the d5-pawn cramps Black's whole position. White has a textbook space advantage and the easier game for the pawn invested. The Vaganian lesson: in the Trompowsky, central space and development are worth far more than a wing pawn.",
        sayShort: 'Bb5+ develops with check; d5 cramps.',
      },
    ],
  },

  'trompowsky-attack::2...d5 3.Bxf6 gxf6 Recapture': {
    openingId: 'trompowsky-attack',
    sources: ['concept:pawn-doubled', 'concept:pos-development', TROMP],
    title: '2...d5, gxf6 — Endgame Against the Shattered Pawns',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'shatter',
        moves: ['d4', 'Nf6', 'Bg5', 'd5', 'Bxf6', 'gxf6'],
        highlights: [{ square: 'f6', color: KEY }, { square: 'h7', color: SOFT }],
        say: "When Black recaptures with the g-pawn instead — gxf6 — he keeps the centre fluid and opens the g-file for his rook, but at a steep price: his kingside is shattered, with broken pawns on f6, f7 and h7 and no shelter for the king. White's plan writes itself: open the position, trade into an endgame, and grind the weak pawns.",
        sayShort: "gxf6 — Black’s kingside is shattered.",
      },
      {
        id: 'open',
        moves: ['d4', 'Nf6', 'Bg5', 'd5', 'Bxf6', 'gxf6', 'e3', 'c5', 'dxc5', 'e6', 'c4', 'dxc4', 'Qxd8+', 'Kxd8'],
        highlights: [{ square: 'd8', color: KEY }],
        say: "White pries the position open with e3 and c4. The queens come off with check — Qxd8+ Kxd8 — and Black has lost the right to castle, his king stranded on d8 in front of a wrecked pawn shield. This is exactly what White wanted: no queens to create kingside threats against HIM, and a long endgame where Black's broken structure is a permanent liability.",
        sayShort: 'Qxd8+ — into a favourable endgame.',
      },
      {
        id: 'grind',
        moves: ['d4', 'Nf6', 'Bg5', 'd5', 'Bxf6', 'gxf6', 'e3', 'c5', 'dxc5', 'e6', 'c4', 'dxc4', 'Qxd8+', 'Kxd8', 'Bxc4', 'Bxc5', 'Nf3', 'Ke7', 'Nc3', 'Nd7', 'O-O'],
        highlights: [{ square: 'f7', color: KEY }],
        say: "White regains the pawn with Bxc4, the bishop raking toward Black's weak f7, and develops smoothly — Nf3, Nc3, O-O — while Black shuffles his king to e7 to connect the rooks. White has reached the ideal Trompowsky endgame: better pawns, more active pieces, a target on f7, and no risk. From here it is pure technique. The lesson: when Black wrecks his own kingside, don't attack it with pieces — trade queens and win the structure.",
        sayShort: 'Bxc4 — grind the better structure.',
      },
    ],
  },
};
