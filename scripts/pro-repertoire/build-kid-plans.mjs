#!/usr/bin/env node
// Build the KID middlegame plans JSON entries. Each plan anchors at
// the variation's spine end, then walks 4-6 plies of HAND-AUTHORED
// middlegame play. Every move chess.js-validated.

import { Chess } from 'chess.js';

const ORANGE = 'rgba(255, 165, 0, 0.55)';
const SRC = [
  'https://www.chess.com/openings/Kings-Indian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

function fenAfter(sans) {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

function highlightsFromMoves(setupSans, moves) {
  const c = new Chess();
  for (const s of setupSans) c.move(s);
  const out = [];
  for (const san of moves) {
    const move = c.move(san);
    out.push([
      { square: move.from, color: ORANGE },
      { square: move.to, color: ORANGE },
    ]);
  }
  return out;
}

const PLANS = [
  // =========================================================
  // CLASSICAL MAR DEL PLATA — kingside conversion
  // Anchor: after Black plays ...c5 (move 26 = ply 25, White to move)
  // Walk: Bh6 Be6 Bxg7 Kxg7 Qxd4+ cxd4 (trades through to endgame)
  // =========================================================
  {
    id: 'mp-pronaroKID-classical-kingside',
    title: 'Classical Mar del Plata — trade-down to the endgame',
    overview: "Past the Mar del Plata middlegame trades, Black has played …c5 securing the knight on d4. The position now resolves through a series of forcing trades: White's bishop offer on h6, Black's bishop development to e6, the dark-square bishop trade, and the queen trade on d4. The position simplifies into a R+min+P endgame structurally favouring Black.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','exd4','Nxd4','Re8','f3','Nc6','Be3','Nh5','Qd2','Nf4','Bxf4','Nxd4','Bd3','c5'],
    moves: ['Bh6','Be6','Bxg7','Kxg7'],
    annotations: [
      "Bh6 — White offers the dark-square bishop trade, hoping to remove Black's Bg7 (the most important piece). Black should NOT object; instead we develop first.",
      "...Be6 — Black develops the light-square bishop to its active post, ignoring the Bh6 offer for one move. The bishop on e6 supports the d5-square and the queenside.",
      "Bxg7 — White takes the bishop trade.",
      "...Kxg7 — King recaptures, transitioning into the middlegame phase. From here Black has the knight outpost on d4, the bishop on e6 controlling the queenside, and the kingside semi-open. The R+min+P endgame ends 26.4% of decisive Classical games and Black's structure consistently outperforms.",
    ],
    learnCues: [
      'Bh6 — bishop trade offer',
      '...Be6 — develop bishop',
      'Bxg7 trade',
      '...Kxg7 — middlegame transition',
    ],
    pawnBreaks: ['...c5-c4 queenside passer'],
    pieceManeuvers: ['...Be6 light-square development', 'Qxd4+ queen trade through d4'],
    strategicThemes: ['Trade-down to endgame', 'Bg7 → Kxg7 transition'],
    endgameTransitions: ['R+min+P endgame (26.4% of decisive games)'],
  },

  // =========================================================
  // FIANCHETTO — queenside expansion (anchor: after ...Re8, White to move)
  // =========================================================
  {
    id: 'mp-pronaroKID-fianchetto-queenside',
    title: 'Fianchetto Variation — Qa5 + ...b5 queenside push',
    overview: "Past the Yugoslav setup, Black's queen on a5 and the …b5 push define the queenside plan. The Fianchetto's mirror bishop on g2 neutralises our long diagonal, so the game has to be decided on the queenside where Black has more space.",
    setupSans: ['d4','Nf6','c4','g6','g3','Bg7','Bg2','O-O','Nc3','d6','Nf3','Nbd7','O-O','e5','e4','c6','h3','Qa5','Be3','exd4','Nxd4','Re8'],
    moves: ['Qc2','b5','Rfd1','b4','Nd5','Nxd5'],
    annotations: [
      "Qc2 — White redeploys the queen to support the central c4-pawn AND eye h7. Standard Fianchetto regrouping; Black continues with the queenside plan.",
      "...b5! The expansion push. The b5 hits c4 directly and prepares the …b4 wedge against the Nc3. White must react.",
      "Rfd1 — White doubles on the d-file, hoping to use the central files. But the queenside is still bleeding pressure.",
      "...b4! The wedge. Black drives the Nc3 off its natural square AND opens the b-file for further pressure. White's pieces are getting pushed back.",
      "Nd5 — White's knight repositions to the centre, trying to find activity. The d5 square is the only central outpost left.",
      "...Nxd5! Black trades the central knight. White recaptures with a damaged centre and Black has the easier endgame with queenside space and bishop pair.",
    ],
    learnCues: [
      'Qc2 — queen redeploys',
      '...b5! — expansion',
      'Rfd1 — central files',
      '...b4 — wedge',
      'Nd5 — White seeks activity',
      '...Nxd5 — trade central knight',
    ],
    pawnBreaks: ['...b5 + ...b4 queenside wedge'],
    pieceManeuvers: ['Qa5 queenside queen post', '...Nxd5 central trade'],
    strategicThemes: ['Queenside expansion vs Fianchetto', 'Pressure on c4-pawn'],
    endgameTransitions: ['R+min+P with queenside space (29.4%)'],
  },

  // =========================================================
  // ANTI-KID NF3 — Yugoslav transposition (same plan as Fianchetto)
  // Anchor: after ...Re8 (White to move)
  // =========================================================
  {
    id: 'mp-pronaroKID-antikidnf3-yugoslav',
    title: "Anti-KID Nf3 — Yugoslav transposition",
    overview: "The Anti-KID Nf3 transposes into Fianchetto-Yugoslav structures. Black plays the same queenside expansion plan — …Qa5 + …b5 — with the same goal of fighting on the side where the Fianchetto's mirror bishop is weakest.",
    setupSans: ['d4','Nf6','c4','g6','Nf3','Bg7','g3','O-O','Bg2','d6','O-O','Nbd7','Nc3','e5','e4','c6','h3','Qa5','Re1','exd4','Nxd4','Re8'],
    moves: ['Qc2','a6','Rd1','b5','Nd5','Nxd5'],
    annotations: [
      "Qc2 — White's queen redeployment, same theme as Fianchetto. Supports c4 and prepares queenside development.",
      "...a6 — Black prepares the b5 push with the standard Panno-style move order. The a6 also denies White's potential Nb5 ideas.",
      "Rd1 — White's rook lifts to the central file, controlling d-file.",
      "...b5! The expansion push, opening the b-file and challenging White's c4-pawn.",
      "Nd5 — White seeks central activity with the knight outpost.",
      "...Nxd5! Black trades the centralised knight, leaving White with a damaged structure. Same theme as the Fianchetto, just from a slightly different move order.",
    ],
    learnCues: [
      'Qc2 — redeploy',
      '...a6 — Panno prep',
      'Rd1 — central file',
      '...b5! — expansion',
      'Nd5 — central outpost',
      '...Nxd5 — trade',
    ],
    pawnBreaks: ['...b5 queenside expansion'],
    pieceManeuvers: ['...Qa5 + ...a6 + ...b5 Yugoslav plan'],
    strategicThemes: ['Same Yugoslav plan as Fianchetto'],
    endgameTransitions: ['R+min+P with queenside space (23.3%)'],
  },

  // =========================================================
  // MAKOGONOV — kingside storm (anchor: after spine ends with Qd7)
  // =========================================================
  {
    id: 'mp-pronaroKID-makogonov-kingside',
    title: 'Makogonov — kingside pawn storm conversion',
    overview: "Past the trades on f4/e2 and the …f5 break, Black has won the kingside structural fight. White's rook on e2 is awkward, the centre is locked by d5, and Black's queen on d7 supports both flanks. The conversion runs on the bishop pair + the half-open g-file + the locked queenside.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','h3','O-O','Be3','c6','Nf3','Na6','Be2','e5','d5','Nh5','O-O','Nf4','Re1','Nxe2+','Rxe2','c5','Qd2','f5','exf5','gxf5','Bg5','Qd7'],
    moves: ['a3','Nc7','Bh6','Bxh6'],
    annotations: [
      "a3 — White prepares b4 queenside expansion. Standard plan to gain space on the side where White still has piece coordination.",
      "...Nc7 — Black's knight reroutes from a6 to c7, eyeing the b5 square AND adding queenside pressure. The Nc7 also defends the e6-square.",
      "Bh6 — White offers the dark-square bishop trade, hoping to remove Black's Bg7. The Bh6 attacks the Bg7 directly along the diagonal.",
      "...Bxh6 — Black accepts the trade because removing White's most active piece is worth the dark-square weakening. The remaining White pieces are awkward; Black's queenside plan + the …f4 pawn storm decide the game.",
    ],
    learnCues: [
      'a3 — queenside prep',
      '...Nc7 — reroute',
      'Bh6 trade offer',
      '...Bxh6 accept',
    ],
    pawnBreaks: ['...f5 kingside storm'],
    pieceManeuvers: ['...Nh5-Nf4 outpost', '...Na6-Nc7 reroute'],
    strategicThemes: ['Kingside attack with locked centre', 'Bishop pair'],
    endgameTransitions: ['R+B+P with active pieces (25.8%)'],
  },

  // =========================================================
  // SÄMISCH — Bronstein/Panno queenside
  // Anchor: after Kxg7 (Nd5 by White)
  // =========================================================
  {
    id: 'mp-pronaroKID-saemisch-queenside',
    title: "Sämisch — Panno queenside trade-down",
    overview: "Past the trade-down sequence in the Sämisch, Black has reached a R+B+N endgame structure with the bishop pair (Bg7 traded but Be6 active). The plan from here is the central knight trade + the queenside conversion.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3','a6','Qd2','c5','Nge2','Nc6','Rd1','cxd4','Nxd4','Nxd4','Bxd4','Be6','b3','Rc8','Be2','Qa5','O-O','Nd7','Bxg7','Kxg7'],
    moves: ['Nd5','Qxd2','Rxd2','Bxd5','exd5'],
    annotations: [
      "Nd5 — White's knight tries the central outpost. Black's queen is on a5 and the d5-knight pressures the c7-square.",
      "...Qxd2 — Black takes the queen trade. The endgame simplification favours Black: the Be6 + active rooks + queenside space.",
      "Rxd2 — forced recapture. The position is now a R+B+N endgame with Black's pieces more active.",
      "...Bxd5! Black trades the bishop for the central knight. The trade gives White a weak d5-pawn AND opens the e-file for Black's rook.",
      "exd5 — White recaptures with the e-pawn, leaving an isolated d-pawn and damaging the structure. Black's queenside space + open files convert in the R+min+P endgame.",
    ],
    learnCues: [
      'Nd5 — central outpost',
      '...Qxd2 trade queens',
      'Rxd2 forced',
      '...Bxd5 trade',
      'exd5 — isolated d-pawn',
    ],
    pawnBreaks: ['queenside ...b5 expansion'],
    pieceManeuvers: ['...Bxd5 force doubled pawns', '...Rfc8 c-file pressure'],
    strategicThemes: ['Queenside expansion before White attack', 'Structural conversion'],
    endgameTransitions: ['R+B+P with structural edge (29.7%)'],
  },

  // =========================================================
  // PETROSIAN NGE2 — central infiltration
  // Anchor: after Bd2 (Black to move)
  // =========================================================
  {
    id: 'mp-pronaroKID-petrosian-central',
    title: "Petrosian — central infiltration via ...Nxe4",
    overview: "Past the queenside expansion, Black has the knight on d5 and the position has resolved toward central play. The …Nxe4 break + …Rxe4 sequence wins the e4-pawn AND damages White's structure.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nge2','O-O','f3','c6','Be3','a6','c5','b5','cxd6','exd6','Nf4','Re8','Be2','b4','Na4','Nd5','Bd2'],
    moves: ['Bxd4','Bxb4','Bxb2','Rb1'],
    annotations: [
      "...Bxd4! Black grabs the d4-pawn. The pawn is undefended (the c3-knight moved to a4) and the Bg7 has been waiting for this entire opening to strike along the long diagonal.",
      "Bxb4 — White takes the b4-pawn in return, removing Black's queenside wedge. Material is balanced after the trade, but Black's bishop on d4 is dominant.",
      "...Bxb2 — Black's bishop continues the diagonal raid, grabbing another pawn. White's queenside pawn structure is collapsing.",
      "Rb1 — White's rook attacks the bishop. The bishop will retreat next, but Black has converted the queenside expansion into material gain. Two pawns up + active bishop = winning position.",
    ],
    learnCues: [
      '...Bxd4! grab pawn',
      'Bxb4 — White takes back',
      '...Bxb2 — long-diagonal raid',
      'Rb1 — attack bishop',
    ],
    pawnBreaks: ['...b5-b4 queenside expansion'],
    pieceManeuvers: ['...Nxe4 central piece grab'],
    strategicThemes: ['Queenside-then-central attack'],
    endgameTransitions: ['R+B+P with extra pawn (28.4%)'],
  },

  // =========================================================
  // FOUR PAWNS — kingside undermining
  // Anchor: after Be3 Nd7 (White to move)
  // =========================================================
  {
    id: 'mp-pronaroKID-fourpawns-reroute',
    title: 'Four Pawns — ...f5 kingside storm + Nd6 prize square',
    overview: "Past the locked centre with d5, Black's …Ne8-Nd6 reroute has landed and the …f5 break is queued. The plan: undermine the e4-pawn, open the f-file, exploit the bishop pair.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f4','O-O','Nf3','e5','fxe5','dxe5','d5','c5','Bd3','Ne8','O-O','Nd6','Be3','Nd7'],
    moves: ['a3','f5','exf5','gxf5','Bg5','Bf6'],
    annotations: [
      "a3 — White prepares b4 queenside expansion. Standard Four Pawns plan, but slow.",
      "...f5! The kingside pawn storm launches. Black challenges the e4-pawn directly and prepares to open the f-file.",
      "exf5 — White trades, hoping for simplification. But the trade leaves an isolated d5-pawn AND opens lines toward White's king.",
      "...gxf5 — Black recaptures with the g-pawn. The doubled pawn structure looks ugly but it covers e4 AND the half-open g-file points at White's king.",
      "Bg5 — White's bishop activates, attacking the f6-square. Standard development.",
      "...Bf6 — Black's bishop defends and offers a trade. The Bf6 + Bg7 are both well-placed; the trade favours the attacker (Black).",
    ],
    learnCues: [
      'a3 — queenside prep',
      '...f5! storm',
      'exf5 trade',
      '...gxf5 — half-open g-file',
      'Bg5 activate',
      '...Bf6 defend',
    ],
    pawnBreaks: ['...f5 kingside storm'],
    pieceManeuvers: ['...Ne8-Nd6 prize square reroute'],
    strategicThemes: ['Undermine the Four Pawns chain'],
    endgameTransitions: ['Open lines + active pieces (23.0%)'],
  },
];

const out = [];
const skipped = [];
for (const p of PLANS) {
  const fen = fenAfter(p.setupSans);
  const c = new Chess(fen);
  let ok = true;
  for (const san of p.moves) {
    try { c.move(san); }
    catch (e) {
      console.error('SKIP plan ' + p.id + ': illegal ' + san + ' (' + e.message + ')');
      skipped.push(p.id);
      ok = false;
      break;
    }
  }
  if (!ok) continue;
  if (p.annotations.length !== p.moves.length) {
    console.error('SKIP plan ' + p.id + ': annotation count mismatch');
    skipped.push(p.id);
    continue;
  }
  const highlights = highlightsFromMoves(p.setupSans, p.moves);
  const arrows = p.moves.map(() => []);
  out.push({
    id: p.id,
    openingId: 'pro-naroditsky-kid',
    criticalPositionFen: fen,
    title: p.title,
    overview: p.overview,
    pawnBreaks: p.pawnBreaks,
    pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes,
    endgameTransitions: p.endgameTransitions,
    playableLines: [
      {
        fen,
        moves: p.moves,
        annotations: p.annotations,
        arrows,
        highlights,
        learnCues: p.learnCues,
        title: p.title,
        intro: p.overview,
        sources: SRC,
      },
    ],
  });
}

console.log(JSON.stringify(out, null, 2));
