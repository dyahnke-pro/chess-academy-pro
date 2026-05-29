#!/usr/bin/env node
// Author 10 Caro endgame plans (one per variation). Each anchored at a
// REAL R+min+P entry FEN from a Naroditsky win as Black against
// 2200+ opposition. Moves pulled verbatim from
// extract-endgame-positions-caro stdout — no composed moves.
// IDs end in '-endgame' → render in EndgamePlansSection.

import { Chess } from 'chess.js';

const KEY = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  // === Two Knights — penguingm1 3354
  {
    id: 'mp-pronarocaro-two-knights-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: 'r3kb1r/p2n1ppp/2b5/4p3/2P5/3P4/PP3PPP/R1B1R1K1 b kq - 2 16',
    title: 'Two Knights — d4 break R+min+P (vs penguingm1 3354)',
    overview: "R+min+P from his win over penguingm1 (3354) past Two Knights move 16. KEY SQUARES: e7 (bishop development), d4 (PAWN BREAK), f6 (light-square bishop activity). PAWN BREAK: d4 cracks White's queenside. PIECE ROUTE: Bf8-Be7-Bf6 — long-diagonal pressure that gradually overwhelms White's passive setup.",
    moves: ['Be7','d4','exd4','b3','Kd8','Rd1','Bf6','Bb2'],
    annotations: [
      "...Be7 — KEY SQUARE e7. Black completes development AND prepares Bf6 long-diagonal pressure.",
      "d4 — White's break attempt to release the position.",
      "...exd4! — PAWN BREAK d4. Black takes, opening lines for the bishops AND fixing White's structure.",
      "b3 — White tries to consolidate the queenside.",
      "...Kd8 — KEY ROUTE: the king prepares to centralize in this endgame, a hallmark Naroditsky technique.",
      "Rd1 — White brings the rook to the d-file pressure point.",
      "...Bf6! — KEY SQUARE f6. The long-diagonal bishop dominates AND eyes the b2-h8 line; Black's pieces are coordinated.",
      "Bb2 — White's bishop joins the long diagonal too; the position is in a structural fight Black has the better pieces in.",
    ],
    learnCues: ['...Be7 — develop', 'd4 — break', '...exd4 — take', 'b3 — consolidate', '...Kd8 — centralize', 'Rd1 — file', '...Bf6 — dominate', 'Bb2 — contest'],
    pawnBreaks: ['exd4 release'],
    pieceManeuvers: ['Bf8 → Be7 → Bf6 long-diagonal route', 'Ke8 → Kd8 centralization'],
    strategicThemes: ['Two-bishop long-diagonal pressure', 'King centralization technique'],
    endgameTransitions: ['R+B+B vs R+B+N winning grind'],
    sourceGame: 'https://www.chess.com/game/live/14973992515',
  },

  // === Classical — 0gZPanda 2995
  {
    id: 'mp-pronarocaro-classical-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: 'r5k1/pp4pp/2p3n1/3p4/5r2/2NP3P/PPP2P2/4R1RK w - - 0 21',
    title: 'Classical — R+N king-hunt sacrifice (vs 0gZPanda 2995)',
    overview: "R+min+P from his win over 0gZPanda (2995) in Classical move 21. KEY SQUARES: f3 (rook lift target), h3 (White's weak pawn), f4 (knight infiltration). PIECE COORDINATION: Rf4 + Raf8 + Nf4 — three-piece sacrifice attack on White's king. TACTICAL THEME: Rxh3+ Kxh3 Nf4+ — the rook sac wins by exposing the king.",
    moves: ['Re2','Raf8','Nd1','Rf3','Kh2','Rxh3+','Kxh3','Nf4+'],
    annotations: [
      "Re2 — White's rook tries the second rank, defending and threatening to invade.",
      "...Raf8! — KEY ROUTE: the second rook joins the kingside attack, loading the f-file.",
      "Nd1 — White's knight tries to defend f2 by reroute.",
      "...Rf3! — KEY SQUARE f3. The rook lift threatens h3 AND sets up the mating sacrifice.",
      "Kh2 — White's king tries to step out of the attack line.",
      "...Rxh3+!! — KEY SACRIFICE. The rook gives itself for the h-pawn, exposing the king to mortal danger.",
      "Kxh3 — forced; White must accept.",
      "...Nf4+! — KEY SQUARE f4. The discovered knight check wins material with mate threats; this is the cashing-in moment.",
    ],
    learnCues: ['Re2 — defend', '...Raf8 — load', 'Nd1 — reroute', '...Rf3! — lift', 'Kh2 — step', '...Rxh3+!! — sac', 'Kxh3 — forced', '...Nf4+ — collect'],
    pawnBreaks: ['Rxh3+ + Nf4+ king-hunt sequence'],
    pieceManeuvers: ['Ra8 → Raf8 second-rook lift', 'Rf4 → Rf3 → Rxh3 sacrifice path', 'Ng6 → Nf4 infiltration'],
    strategicThemes: ['Active-piece R+N king hunt', 'Rook sacrifice for mating attack'],
    endgameTransitions: ['Mating attack in R+N+P endgame'],
    sourceGame: 'https://www.chess.com/game/live/140991658989',
  },

  // === Exchange — Genghis_K 3212
  {
    id: 'mp-pronarocaro-exchange-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: '4kb1r/5ppp/5n2/8/3p4/5P2/PP1K1P1P/n1B4R w k - 0 17',
    title: 'Exchange — King race in R+min+P (vs Genghis_K 3212)',
    overview: "R+min+P endgame from his win over Genghis_K (3212) in the Exchange. KEY SQUARES: d5 (knight infiltration), d7 (king centralization), e7 (bishop development). PIECE COORDINATION: King + minor piece race — Black's centralized king AND active pieces gradually overwhelm White. The position is dynamically unbalanced (Black has a knight on a1 from a sacrifice that pays off positionally).",
    moves: ['Kd3','Kd7','Bg5','Be7','Rxa1','Rb8','b3','Nd5'],
    annotations: [
      "Kd3 — White's king centralizes, joining the endgame battle.",
      "...Kd7 — KEY SQUARE d7. Black mirrors with king centralization — both kings are now in the centre.",
      "Bg5 — White's bishop activates, pinning the knight on f6.",
      "...Be7 — KEY SQUARE e7. Black's bishop comes out, breaking the pin AND completing development.",
      "Rxa1 — White grabs the queenside knight that was trapped behind enemy lines.",
      "...Rb8 — KEY ROUTE: Black's rook activates to the b-file, eyeing White's queenside.",
      "b3 — White tries to fortify the queenside.",
      "...Nd5! — KEY SQUARE d5. The knight finds the strong central outpost; Black's piece activity decides.",
    ],
    learnCues: ['Kd3 — centralize', '...Kd7 — mirror', 'Bg5 — pin', '...Be7 — unpin', 'Rxa1 — collect', '...Rb8 — activate', 'b3 — fortify', '...Nd5 — outpost'],
    pawnBreaks: ['Rb8 + Nd5 piece activity'],
    pieceManeuvers: ['Ke8 → Kd7 king centralization', 'Bf8 → Be7 development', 'Nf6 → Nd5 outpost'],
    strategicThemes: ['King-race endgame', 'Central outpost domination'],
    endgameTransitions: ['R+B+N winning conversion'],
    sourceGame: 'https://www.chess.com/game/live/9781077479',
  },

  // === Advance c5 — Firouzja2003 3291
  {
    id: 'mp-pronarocaro-advance-c5-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: '2rr2k1/p6p/5pp1/4P3/2p5/1P1p3P/P4nP1/1B1R2K1 w - - 0 36',
    title: 'Advance c5 — passed-pawn race vs Firouzja2003 3291',
    overview: "Sharp R+min+P/passed-pawn endgame from his win over Firouzja (3291) in the Advance c5 line. KEY SQUARES: c4 (passed pawn), d3 (passed pawn), a4 (rook activation). PAWN BREAK: bxc4 trade-down opening the queenside. PIECE COORDINATION: rook + knight + two passed pawns — Black's central pawn duo decides.",
    moves: ['Kxf2','fxe5','bxc4','e4','Ke3','Rxc4','a3','Ra4'],
    annotations: [
      "Kxf2 — White grabs Black's knight; the material count balances.",
      "...fxe5! — PAWN BREAK. Black opens the e-file AND advances the central pawn structure.",
      "bxc4 — White is forced to trade the queenside, conceding the c-file.",
      "...e4! — KEY SQUARE e4. The pawn advances, restricting White's pieces AND supporting the d3-pawn.",
      "Ke3 — White's king tries to blockade the central pawns.",
      "...Rxc4 — KEY SQUARE c4. Black wins the c-pawn AND activates the rook on the open file.",
      "a3 — White tries to defend the queenside structurally.",
      "...Ra4! — KEY SQUARE a4. The rook hits the a-pawn AND threatens to invade; the conversion is on.",
    ],
    learnCues: ['Kxf2 — grab', '...fxe5 — open', 'bxc4 — forced', '...e4 — restrict', 'Ke3 — blockade', '...Rxc4 — win pawn', 'a3 — defend', '...Ra4 — invade'],
    pawnBreaks: ['fxe5 + e4 advance', 'Ra4 a-pawn attack'],
    pieceManeuvers: ['Rc8 → Rxc4 → Ra4 rook raid'],
    strategicThemes: ['Passed-pawn duo conversion', 'Active-rook invasion'],
    endgameTransitions: ['R+P pawn-race winning ending'],
    sourceGame: 'https://www.chess.com/game/live/9041843929',
  },

  // === Advance Bf5 — spicycaterpillar 3218
  {
    id: 'mp-pronarocaro-advance-bf5-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: '3r1rk1/1p2nppp/1pn3b1/4P3/5P2/1N2B3/PP2B1PP/R4RK1 b - - 2 16',
    title: 'Advance Bf5 — knight raid (vs spicycaterpillar 3218)',
    overview: "R+min+P from his win over spicycaterpillar (3218) in the Bf5 line past move 16. KEY SQUARES: d5 (knight outpost), b4 (queenside hop), a2 (pawn target), c1 (raid square). PIECE ROUTE: Ne7-Nd5 / Nc6-Nb4-Nxa2 — knight raid pattern that wins a pawn AND ties down White's pieces.",
    moves: ['Nd5','Kf2','Ncb4','Rad1','Nxa2','Bd4','Bc2','Nc1'],
    annotations: [
      "...Nd5! — KEY SQUARE d5. Black's knight finds the central outpost behind the e5-pawn.",
      "Kf2 — White's king walks toward the centre, joining the endgame.",
      "...Ncb4 — KEY SQUARE b4. The second knight reroutes to attack the a2-pawn.",
      "Rad1 — White's rook centralizes, eyeing the d-file.",
      "...Nxa2! — KEY SQUARE a2. Knight raid wins a pawn; Black is ahead in the pawn count.",
      "Bd4 — White tries to centralize the bishop and challenge the d5-knight.",
      "...Bc2 — KEY SQUARE c2. The light-squared bishop infiltrates White's queenside.",
      "...Nc1! — KEY SQUARE c1. The first knight delivers, raiding White's back rank.",
    ],
    learnCues: ['...Nd5! — outpost', 'Kf2 — centre', '...Ncb4 — reroute', 'Rad1 — centralize', '...Nxa2 — raid', 'Bd4 — challenge', '...Bc2 — infiltrate', '...Nc1 — back rank'],
    pawnBreaks: ['Nxa2 queenside raid'],
    pieceManeuvers: ['Ne7 → Nd5 outpost', 'Nc6 → Nb4 → Nxa2 raid', 'Bg6 → Bc2 → diagonal infiltration', 'Nd5 → Nc1 raiding finish'],
    strategicThemes: ['Two-knight raid', 'Light-square infiltration'],
    endgameTransitions: ['R+B+N+P queenside-dominant conversion'],
    sourceGame: 'https://www.chess.com/game/live/32164211761',
  },

  // === Fantasy — 0gZPanda 3168
  {
    id: 'mp-pronarocaro-fantasy-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: '5rk1/5ppp/1pn5/4PP2/8/3BKP2/P6P/8 w - - 0 26',
    title: 'Fantasy — passed-pawn race in R+B+N (vs 0gZPanda 3168)',
    overview: "R+min+P from his win over 0gZPanda (3168) in the Fantasy past move 26. KEY SQUARES: a8 (rook lift), a3 (check route), b4 (knight infiltration), e6 (passed-pawn target). PAWN BREAK: fxe6 White's last-ditch try fails. STRATEGIC THEME: active-piece blockade beats passed pawns.",
    moves: ['f4','Ra8','Bc4','Ra3+','Ke4','Nb4','e6','fxe6'],
    annotations: [
      "f4 — White prepares the kingside pawn structure for the f5+e6 break.",
      "...Ra8! — KEY ROUTE: Black's rook activates on the open a-file, ready to slip behind.",
      "Bc4 — White's bishop tries to challenge.",
      "...Ra3+! — KEY SQUARE a3. The rook check forces the king off its post AND threatens the back rank.",
      "Ke4 — White's king runs to the centre, looking for activity.",
      "...Nb4! — KEY SQUARE b4. Black's knight infiltrates the queenside, hitting both White's bishop AND the king's escape.",
      "e6 — White makes the desperate central break, hoping to create complications.",
      "...fxe6 — Black calmly takes; the pawn was lost AND Black's pieces dominate.",
    ],
    learnCues: ['f4 — prepare', '...Ra8 — activate', 'Bc4 — challenge', '...Ra3+ — check', 'Ke4 — run', '...Nb4 — infiltrate', 'e6 — desperate', '...fxe6 — calmly'],
    pawnBreaks: ['fxe6 cash-in'],
    pieceManeuvers: ['Rf8 → Ra8 → Ra3+ rook activation', 'Nc6 → Nb4 infiltration'],
    strategicThemes: ['Active-rook + knight queenside takeover', 'Passed-pawn blockade'],
    endgameTransitions: ['R+B+N → won R+P endgame'],
    sourceGame: 'https://www.chess.com/game/live/80635362607',
  },

  // === KIA-Reti — Firouzja2003 3166
  {
    id: 'mp-pronarocaro-kia-reti-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: '7k/p5p1/1p2P2p/2p2p1P/5P2/1P1r1BPK/P7/8 w - - 0 39',
    title: 'KIA Reti — pawn-up rook end (vs Firouzja2003 3166)',
    overview: "R+B vs R+B endgame from his win over Firouzja (3166) past move 39 in the KIA Reti setup. KEY SQUARES: e7 (passed-pawn target), e3 (rook centralization), f5 (Black's pawn anchor). PAWN BREAK: White's e6-pawn marches but Black's defense holds. STRATEGIC THEME: counterplay AND king activity beat passed pawns.",
    moves: ['Bc6','Re3','Bd7','Kg8','e7','Rxe7','Bxf5','Kf7'],
    annotations: [
      "Bc6 — White's bishop attempts to support the e6-pawn AND eye Black's queenside.",
      "...Re3! — KEY SQUARE e3. Black's rook drops to the third rank, hitting both White's queenside pawns AND the bishop.",
      "Bd7 — White's bishop retreats to defend the e6-pawn directly.",
      "...Kg8 — KEY ROUTE: Black's king walks toward the centre, joining the endgame.",
      "e7 — White's passed pawn marches; the decisive moment.",
      "...Rxe7! — KEY SQUARE e7. Black calmly takes the pawn; the passer is dead.",
      "Bxf5 — White's bishop activates with a tempo, hitting f5.",
      "...Kf7 — KEY ROUTE: the king continues centralizing, supporting the rook. Black's structure holds.",
    ],
    learnCues: ['Bc6 — support', '...Re3 — drop', 'Bd7 — retreat', '...Kg8 — walk', 'e7 — march', '...Rxe7 — collect', 'Bxf5 — tempo', '...Kf7 — support'],
    pawnBreaks: ['Rxe7 passer kill'],
    pieceManeuvers: ['Rd3 → Re3 rook activation', 'Kh8 → Kg8 → Kf7 king walk'],
    strategicThemes: ['Active-rook + king-walk defense', 'Passed-pawn blockade'],
    endgameTransitions: ['R+B vs R+B equal-material conversion'],
    sourceGame: 'https://www.chess.com/game/live/4185749179',
  },

  // === Modern transposition — Mykola-Bortnyk 3079
  {
    id: 'mp-pronarocaro-modern-trans-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: '6k1/5p2/6p1/8/3Nr2p/8/P3N3/3K4 w - - 0 45',
    title: 'Modern transposition — N+N vs R+P endgame (vs Mykola-Bortnyk 3079)',
    overview: "Exotic N+N vs R+P endgame from his win over Mykola-Bortnyk (3079) past move 45. KEY SQUARES: g4 (rook centralization), e1 (rook check), a4 (rook raid). PIECE COORDINATION: Re4 + Kg8 + h-pawn — Black's rook + king + passed pawn beat the two knights through technique. STRATEGIC THEME: rook activity decides over knight coordination.",
    moves: ['Nf3','h3','Ke1','Rg4','Kf1','Ra4','Neg1','g5'],
    annotations: [
      "Nf3 — White's knight tries to coordinate, defending the kingside.",
      "...h3! — PAWN BREAK. Black advances the passed pawn, creating immediate threats.",
      "Ke1 — White's king centralizes to defend.",
      "...Rg4 — KEY SQUARE g4. The rook activates on the g-file, supporting the h-pawn.",
      "Kf1 — White's king continues centralizing.",
      "...Ra4! — KEY SQUARE a4. Rook switches flanks, hitting the a-pawn AND threatening to invade.",
      "Neg1 — White's knight tries to defend the kingside.",
      "...g5 — KEY ROUTE: the g-pawn advances, supporting the h-pawn's promotion path. The decisive march is on.",
    ],
    learnCues: ['Nf3 — coordinate', '...h3 — advance', 'Ke1 — defend', '...Rg4 — support', 'Kf1 — centralize', '...Ra4 — switch', 'Neg1 — defend', '...g5 — march'],
    pawnBreaks: ['h3 + g5 passed-pawn march'],
    pieceManeuvers: ['Re4 → Rg4 → Ra4 rook switch'],
    strategicThemes: ['R+P vs N+N conversion', 'Passed-pawn march technique'],
    endgameTransitions: ['R+P winning vs N+N'],
    sourceGame: 'https://www.chess.com/game/live/143767813533',
  },

  // === Panov — Mykola-Bortnyk 3144
  {
    id: 'mp-pronarocaro-panov-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: 'r2r2k1/pb3ppp/3bpn2/8/8/1PB2N2/1P3PPP/RN3RK1 b - - 8 16',
    title: 'Panov — IQP conversion to R+min+P (vs Mykola-Bortnyk 3144)',
    overview: "R+min+P from his win over Mykola-Bortnyk (3144) past Panov move 16. KEY SQUARES: e4 (knight outpost), c5 (knight infiltration), d3 (knight delivery). PIECE ROUTE: Nf6-Ne4-Nc5-Nd3 — four-step knight maneuver that exploits the post-IQP structural weakness. STRATEGIC THEME: piece activity beats compact structure.",
    moves: ['Ne4','Nbd2','Nc5','b4','Nd3','Rad1','Rac8','Nd4'],
    annotations: [
      "...Ne4! — KEY SQUARE e4. Black's knight finds the central outpost behind the bishop.",
      "Nbd2 — White's knight tries to challenge the e4-outpost.",
      "...Nc5! — KEY SQUARE c5. The knight reroutes, hitting White's queenside AND the bishop on c3.",
      "b4 — White tries to chase the knight.",
      "...Nd3! — KEY SQUARE d3. Knight delivers to the third rank, blockading AND threatening the f2-pawn.",
      "Rad1 — White's rook centralizes, defending d3 indirectly.",
      "...Rac8 — KEY ROUTE: Black's rook joins the queenside attack on the c-file.",
      "Nd4 — White centralizes the knight; the position is tactically rich but Black has the initiative.",
    ],
    learnCues: ['...Ne4 — outpost', 'Nbd2 — challenge', '...Nc5 — reroute', 'b4 — chase', '...Nd3 — deliver', 'Rad1 — centralize', '...Rac8 — file', 'Nd4 — centre'],
    pawnBreaks: ['Nc5 + Nd3 queenside infiltration'],
    pieceManeuvers: ['Nf6 → Ne4 → Nc5 → Nd3 four-step route'],
    strategicThemes: ['Post-IQP piece activity', 'Three-rank knight infiltration'],
    endgameTransitions: ['R+B+N piece-dominant conversion'],
    sourceGame: 'https://www.chess.com/game/live/5829325701',
  },

  // === d3-sideline — 0gZPanda 3107
  {
    id: 'mp-pronarocaro-d3-sideline-endgame', openingId: 'pro-naroditsky-caro-kann',
    fen: '5r2/p4pkp/6p1/4rbP1/5N2/2P4P/1P3PB1/3R2K1 w - - 0 30',
    title: 'd3 Sideline — bishop reign R+B vs R+N (vs 0gZPanda 3107)',
    overview: "R+min+P from his win over 0gZPanda (3107) past d3 Sideline move 30. KEY SQUARES: e1 (rook check), e4 (bishop activation), g2 (bishop trade). PAWN BREAK: h4 White's last try fails. STRATEGIC THEME: active rook + bishop coordination beats White's defensive setup.",
    moves: ['h4','Rfe8','Rd4','Re1+','Kh2','Be4','Kg3','Bxg2'],
    annotations: [
      "h4 — White tries to anchor the g5-pawn AND fix the structure.",
      "...Rfe8 — KEY ROUTE: Black's second rook joins the e-file battery, doubling the pressure.",
      "Rd4 — White's rook centralizes, trying to challenge Black's pieces.",
      "...Re1+! — KEY SQUARE e1. Check from the back rank, forcing the king to the corner.",
      "Kh2 — White's king is pushed back.",
      "...Be4! — KEY SQUARE e4. The bishop activates centrally, eyeing the long diagonal AND coordinating with the rook.",
      "Kg3 — White's king tries to centralize for activity.",
      "...Bxg2! — KEY SQUARE g2. Bishop trade. Material balance turns decisively in Black's favor.",
    ],
    learnCues: ['h4 — anchor', '...Rfe8 — double', 'Rd4 — centralize', '...Re1+ — check', 'Kh2 — pushed', '...Be4 — activate', 'Kg3 — centre', '...Bxg2 — collect'],
    pawnBreaks: ['Re1+ + Bxg2 sequence'],
    pieceManeuvers: ['Rf8 → Rfe8 doubling', 'Re5 → Re1+ back-rank', 'Bf5 → Be4 → Bxg2 diagonal trade'],
    strategicThemes: ['Two-rook back-rank attack', 'Bishop-trade conversion'],
    endgameTransitions: ['R+B → won R+P endgame'],
    sourceGame: 'https://www.chess.com/game/live/61452581479',
  },
];

const out = [];
for (const p of PLANS) {
  const c = new Chess(p.fen);
  let ok = true;
  for (const san of p.moves) {
    try { c.move(san); }
    catch (e) { console.error('SKIP ' + p.id + ': illegal ' + san + ' (' + e.message + ')'); ok = false; break; }
  }
  if (!ok) continue;
  if (p.annotations.length !== p.moves.length || p.learnCues.length !== p.moves.length) {
    console.error('SKIP ' + p.id + ': arr mismatch'); continue;
  }
  const replay = new Chess(p.fen);
  const highlights = p.moves.map(san => {
    const m = replay.move(san);
    return [{ square: m.from, color: KEY }, { square: m.to, color: KEY }];
  });
  const arrows = p.moves.map(() => []);
  const SRC = ['https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives', p.sourceGame];
  out.push({
    id: p.id, openingId: p.openingId, criticalPositionFen: p.fen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ fen: p.fen, moves: p.moves, annotations: p.annotations, arrows, highlights, learnCues: p.learnCues, title: p.title, intro: p.overview, sources: SRC }],
  });
}
console.error('Built ' + out.length + ' / ' + PLANS.length + ' Caro endgame plans');
console.log(JSON.stringify(out, null, 2));
