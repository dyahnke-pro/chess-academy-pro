#!/usr/bin/env node
// 3 missing Caro plans (Advance Bf5, Panov, d3 Sideline). Each
// hand-authored per STEP 9 + STEP 9 Rule 1 (anchored AT or PAST the
// opening terminus) + structural-teaching rule. Continuations pulled
// verbatim from extract-middlegame-past-spine-caro-missing stdout
// — no composed moves (§1b show-your-work).

import { Chess } from 'chess.js';

const KEY = 'rgba(255, 165, 0, 0.55)';

function fenAfter(sans) {
  const c = new Chess();
  for (const m of sans) c.move(m);
  return c.fen();
}

const PLANS = [
  // ============ Advance Bf5 — middlegame conversion ============
  // Spine 11 plies: e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3
  // Past-spine continuation (vs ThunderrPanda 2968): Nc6 dxc5 Nge7 c3 Ng6 b4 Ngxe5 Nxe5
  {
    id: 'mp-pronarocaro-advance-bf5-piece-storm', openingId: 'pro-naroditsky-caro-kann',
    title: 'Advance Bf5 — knight-storm conversion',
    overview: "Past the Be3 anchor, Black's plan is piece pressure on the centre. KEY SQUARES: e7 (knight transit), g6 (knight delivery), e5 (the pawn target). PIECE ROUTE: Nge7 → Ng6 → Nxe5 — three-step knight maneuver that wins the central pawn while White is still developing. PAWN BREAK: dxc5 by White creates the trade-down.",
    setupSans: ['e4','c6','d4','d5','e5','Bf5','Nf3','e6','Be2','c5','Be3'],
    moves: ['Nc6','dxc5','Nge7','c3','Ng6','b4','Ngxe5','Nxe5'],
    annotations: [
      "...Nc6 — Black develops the queen's knight, joining the pressure on d4 AND eyeing the future b4-and-e5 routes.",
      "dxc5 — White grabs the pawn rather than allow a complete trade. The c5-pawn is loose but White's pieces aren't ready to defend it long-term.",
      "...Nge7 — KEY SQUARE e7. The king's knight comes out behind the bishop, heading for g6 to attack the e5-pawn. This is the THREE-STEP KNIGHT ROUTE that defines the Advance Bf5 plan.",
      "c3 — White consolidates the d4-square AND supports a b4 push to keep the c5-pawn.",
      "...Ng6 — KEY SQUARE g6. The knight reaches the second waypoint, threatening e5 directly.",
      "b4 — White locks the c5-pawn into the queenside structure.",
      "...Ngxe5! — KEY SQUARE e5. The knight finally delivers — Black wins back the central pawn AND opens dynamic play. The structural conversion is on.",
      "Nxe5 — White is forced to recapture; the central tension is dissolved and Black has equal material plus an active position.",
    ],
    learnCues: ['...Nc6 — develop', 'dxc5 — grab', '...Nge7 — route start', 'c3 — consolidate', '...Ng6 — waypoint', 'b4 — lock', '...Ngxe5 — deliver', 'Nxe5 — forced'],
    pawnBreaks: ['dxc5 + Ngxe5 trade-down sequence'],
    pieceManeuvers: ['Nge7 → Ng6 → Nxe5 three-step delivery'],
    strategicThemes: ['Knight-storm vs Bf5 setup', 'Central pawn recapture'],
    endgameTransitions: ['Equal-material active middlegame'],
    sourceGame: 'https://www.chess.com/game/live/4751136199',
  },

  // ============ Panov — slow middlegame plan ============
  // Spine 22 plies ends at Bg7
  // Past-spine (vs Mykola-Bortnyk 2912): h3 O-O O-O Rad8 a3 Qc7 b4 a6
  {
    id: 'mp-pronarocaro-panov-queenside-coordination', openingId: 'pro-naroditsky-caro-kann',
    title: 'Panov — d8 + c7 coordination vs White queenside expansion',
    overview: "Past the Bg7 anchor, the middlegame is a positional battle. KEY SQUARES: d8 (rook centralization), c7 (queen redeployment). PAWN BREAK: a6 prevents White's b5 expansion. STRATEGIC THEME: Black coordinates against White's slow b4-c5 queenside expansion. PIECE COORDINATION: ...Rad8 + ...Qc7 + ...a6 — three-move setup that holds the structure.",
    setupSans: ['e4','c6','d4','d5','exd5','cxd5','c4','Nf6','Nc3','Nc6','Bg5','Be6','Be2','Qa5','c5','Ne4','Bd2','Nxd2','Qxd2','g6','Nf3','Bg7'],
    moves: ['h3','O-O','O-O','Rad8','a3','Qc7','b4','a6'],
    annotations: [
      "h3 — White prepares the g4 storm OR simply secures the f3-knight from a future ...Bg4 pin.",
      "...O-O — KEY SQUARE g8. Black castles, completing king safety on the kingside.",
      "O-O — White castles short, signaling a slow positional plan over a kingside attack.",
      "...Rad8 — KEY SQUARE d8. The rook centralizes, eyeing the d-file pressure point AND coordinating with the queen.",
      "a3 — White prepares b4 to expand the queenside, supporting the c5-pawn.",
      "...Qc7 — KEY SQUARE c7. The queen reroutes from a5 to c7, where it defends the queenside AND eyes the b8-h2 diagonal.",
      "b4 — White's queenside expansion arrives. The c5-pawn is supported AND White threatens b5 chasing the c6-knight.",
      "...a6! — PAWN BREAK a6. Black PREVENTS b5 by anchoring the c6-knight. The structural battle is settled — Black has equal positional play.",
    ],
    learnCues: ['h3 — prepare', '...O-O — king safe', 'O-O — slow plan', '...Rad8 — centralize', 'a3 — prepare b4', '...Qc7 — reroute', 'b4 — expand', '...a6 — prevent b5'],
    pawnBreaks: ['a6 anti-b5 anchor'],
    pieceManeuvers: ['Qa5 → Qc7 reroute', 'Ra8 → Rad8 centralization'],
    strategicThemes: ['Queenside structural defense', 'Anti-expansion coordination'],
    endgameTransitions: ['Equal R+min+P slow grind'],
    sourceGame: 'https://www.chess.com/game/live/21693583601',
  },

  // ============ d3 Sideline — bishop trade + central pressure ============
  // Spine 25 plies ends at dxe4 (Black recapture)
  // Past-spine (vs anon102030 2782): Bg4 h3 Bxf3 Bxf3 Bc5 Bc3 Qb6 Qe2
  {
    id: 'mp-pronarocaro-d3-bishop-trade-pressure', openingId: 'pro-naroditsky-caro-kann',
    title: 'd3 Sideline — bishop trade + central pressure conversion',
    overview: "Past the dxe4 anchor in the slow d3 KIA-like Caro, Black presses with light-square activity. KEY SQUARES: g4 (bishop deployment), f3 (the trade target), c5 (dark-squared bishop activity), b6 (queen pressure point). PIECE ROUTE: Bc8-Bg4-Bxf3 — bishop sacrifice for the dynamic light-square play. PAWN BREAK: none structural here; the plan is pure piece activity.",
    setupSans: ['e4','c6','d3','d5','Nd2','e5','g3','Bd6','Bg2','Nf6','Ngf3','O-O','O-O','Re8','b3','a5','a4','Na6','Bb2','Nb4','Re1','dxe4','Nxe4','Nxe4','dxe4'],
    moves: ['Bg4','h3','Bxf3','Bxf3','Bc5','Bc3','Qb6','Qe2'],
    annotations: [
      "...Bg4 — KEY SQUARE g4. Black's light-squared bishop hits the f3-knight, threatening to damage White's kingside structure.",
      "h3 — White challenges the bishop, forcing a decision.",
      "...Bxf3! — KEY SQUARE f3. Black trades the bishop pair for structural concessions, gaining active piece play in return.",
      "Bxf3 — White recaptures with the long-diagonal bishop, accepting the trade.",
      "...Bc5 — KEY SQUARE c5. Black's dark-squared bishop joins the centre, eyeing the diagonal toward f2 AND the e3-pressure square.",
      "Bc3 — White's bishop reroutes to defend the d4-square AND coordinate with the queen.",
      "...Qb6! — KEY SQUARE b6. The queen joins the centralized attack, pressuring f2 AND eyeing the b-file. This is the COORDINATION CHAIN that defines the d3-Sideline middlegame.",
      "Qe2 — White's queen comes out to support the kingside AND eye the e-file. The position is dynamically balanced.",
    ],
    learnCues: ['...Bg4 — pin', 'h3 — challenge', '...Bxf3 — trade', 'Bxf3 — recapture', '...Bc5 — centre', 'Bc3 — reroute', '...Qb6 — join', 'Qe2 — coordinate'],
    pawnBreaks: ['Bxf3 light-square sacrifice'],
    pieceManeuvers: ['Bc8 → Bg4 → Bxf3 bishop sacrifice', 'Bd6 → Bc5 dark-square activation', 'Qd8 → Qb6 attack join'],
    strategicThemes: ['Bishop trade for activity', 'Piece-coordination centre attack'],
    endgameTransitions: ['Dynamic R+min+P middlegame'],
    sourceGame: 'https://www.chess.com/game/live/3157899797',
  },
];

const out = [];
for (const p of PLANS) {
  let fen; try { fen = fenAfter(p.setupSans); } catch (e) { console.error('SKIP ' + p.id + ': setup ' + e.message); continue; }
  const c = new Chess(fen);
  let ok = true;
  for (const san of p.moves) {
    try { c.move(san); }
    catch (e) { console.error('SKIP ' + p.id + ': illegal ' + san + ' (' + e.message + ')'); ok = false; break; }
  }
  if (!ok) continue;
  if (p.annotations.length !== p.moves.length || p.learnCues.length !== p.moves.length) {
    console.error('SKIP ' + p.id + ': arr mismatch'); continue;
  }
  // Highlights from move target squares
  const replay = new Chess(fen);
  const highlights = p.moves.map(san => {
    const m = replay.move(san);
    return [{ square: m.from, color: KEY }, { square: m.to, color: KEY }];
  });
  const arrows = p.moves.map(() => []);
  const SRC = ['https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives', p.sourceGame];
  out.push({
    id: p.id, openingId: p.openingId, criticalPositionFen: fen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ fen, moves: p.moves, annotations: p.annotations, arrows, highlights, learnCues: p.learnCues, title: p.title, intro: p.overview, sources: SRC }],
  });
}
console.error('Built ' + out.length + ' / ' + PLANS.length + ' Caro missing plans');
console.log(JSON.stringify(out, null, 2));
