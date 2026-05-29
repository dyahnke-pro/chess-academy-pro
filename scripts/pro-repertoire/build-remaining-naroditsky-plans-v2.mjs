#!/usr/bin/env node
// Round 2 plans for the 6 remaining Naroditsky openings — 2nd MG plan
// variant per variation. Total 18 plans, each anchored at the variation's
// spine end + walks a sub-theme different from the v1 plan. All moves
// chess.js-validated; FENs derived from existing spine PGNs (no archive
// scanning).

import { Chess } from 'chess.js';

const ORANGE = 'rgba(255, 165, 0, 0.55)';

function fenAfter(sans) { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); }
function highlightsFromMoves(setupSans, moves) {
  const c = new Chess();
  for (const s of setupSans) c.move(s);
  const out = [];
  for (const san of moves) {
    const m = c.move(san);
    out.push([{ square: m.from, color: ORANGE }, { square: m.to, color: ORANGE }]);
  }
  return out;
}

const SRC_BY_OPENING = {
  'pro-naroditsky-kia': ['https://www.chess.com/openings/Kings-Indian-Attack', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-rossolimo': ['https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-najdorf': ['https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-alekhine': ['https://www.chess.com/openings/Alekhines-Defense', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-ruy-lopez': ['book:ruy-lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-jobava-london': ['https://www.chess.com/openings/Jobava-London-System', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
};

const PLANS = [
  // ============ KIA — 3 variations ============
  {
    id: 'mp-pronaroKIA-symmetric-e5push', openingId: 'pro-naroditsky-kia',
    title: 'KIA Symmetric — e5 central push',
    overview: "Past the Nh4 reroute, an alternative to the kingside attack is the central e5 push. The e5 cramps Black's kingside knight and opens lines for the central pieces, leaving Black with a passive structure.",
    setupSans: ['Nf3','g6','g3','Bg7','Bg2','d6','O-O','Nf6','d3','O-O','Nbd2','e5','e4','Nc6','c3','Re8','a4','a5','Nh4'],
    moves: ['Nd7','Nc4','b6','f4'],
    annotations: [
      "...Nd7 — Black redirects the knight as before.",
      "Nc4 — our second knight comes to the central outpost. From c4 the knight hits the b6/a5 squares AND supports a coming Nce3 or Nc4-Ne3-Nd5 reroute.",
      "...b6 — Black supports against Nc4-Nb6 hop AND prepares Bb7 fianchetto.",
      "f4 — kingside expansion begins. The f4 supports e5 push AND opens the f-file for our rook eventually. The slow squeeze continues.",
    ],
    learnCues: ['...Nd7 reroute', 'Nc4 outpost', '...b6 support', 'f4 — expansion'],
    pawnBreaks: ['f4 + e5 kingside squeeze'],
    pieceManeuvers: ['Nh4-Nc4-Ne3 KIA reroute'],
    strategicThemes: ['Central + kingside squeeze'],
    endgameTransitions: ['R+B+N positional grind'],
  },
  {
    id: 'mp-pronaroKIA-reti-nc4', openingId: 'pro-naroditsky-kia',
    title: 'KIA Reti — Nc4 + queen lift',
    overview: "Alternative to the Nh4 plan after the dxe4 exchange: the Nc4 setup + queen lift to e2 building a slow central attack on the queenside.",
    setupSans: ['Nf3','d5','g3','Nf6','Bg2','c5','O-O','Nc6','d3','e6','Nbd2','Bd6','e4','dxe4','dxe4','O-O','Re1'],
    moves: ['Qe7','Nc4','Bd7','Qe2'],
    annotations: [
      "...Qe7 — Black activates the queen to e7 supporting development.",
      "Nc4 — our knight to the central outpost attacking Bd6.",
      "...Bd7 — Black redirects the bishop sideways (e7 is blocked by the queen) consolidating but conceding tempo.",
      "Qe2 — queen comes out supporting the e-file rook AND preparing Nfd2-Nf1-Ng3 reroute. The position is slowly squeezing Black's pieces.",
    ],
    learnCues: ['...Qe7 — queen out', 'Nc4 outpost', '...Bd7 sideways', 'Qe2 — slow squeeze'],
    pawnBreaks: ['c3-c4 queenside expansion'],
    pieceManeuvers: ['Nc4 + Qe2 stack'],
    strategicThemes: ['Slow central + queenside squeeze'],
    endgameTransitions: ['R+B+N with structural edge'],
  },
  {
    id: 'mp-pronaroKIA-pirc-nh4', openingId: 'pro-naroditsky-kia',
    title: 'KIA Pirc — Nh4 + f4 kingside attack',
    overview: "Alternative to the queenside expansion plan: the Nh4 reroute + f4 kingside attack pattern. The d5 lock makes this a Reversed KID kingside fight.",
    setupSans: ['Nf3','d6','g3','g6','Bg2','Bg7','O-O','Nf6','d4','O-O','c4','e5','Nc3','Nbd7','d5','a5','e4'],
    moves: ['Nc5','Nh4','c6','f4'],
    annotations: [
      "...Nc5 — Black's knight to the prize square (Reversed Mar del Plata).",
      "Nh4 — our knight reroutes toward f5 starting the kingside attack.",
      "...c6 — Black supports d5 and prepares queenside expansion as a counter to our attack.",
      "f4 — kingside push begins. The race is on: our kingside attack vs Black's queenside expansion, exact mirror of the regular KID we play as Black.",
    ],
    learnCues: ['...Nc5 prize', 'Nh4 reroute', '...c6 support', 'f4 — race begins'],
    pawnBreaks: ['f4 kingside storm'],
    pieceManeuvers: ['Nh4-Nf5 reroute'],
    strategicThemes: ['Reversed KID kingside race'],
    endgameTransitions: ['R+B+N with attacking pieces'],
  },

  // ============ ROSSOLIMO — 3 variations ============
  {
    id: 'mp-pronaroRoss-nc6-b4push', openingId: 'pro-naroditsky-rossolimo',
    title: 'Rossolimo proper — b4 queenside expansion',
    overview: "Alternative to the Maroczy bind plan: the b4 queenside push gaining space and constraining Black's pieces.",
    setupSans: ['e4','c5','Nf3','Nc6','Bb5','e6','O-O','Nge7','Re1','a6','Bf1','d5','exd5','Nxd5','d3','Nf6','Nbd2','Be7','c4'],
    moves: ['O-O','b4','b6','Bb2'],
    annotations: [
      "...O-O — Black castles, both kings safe.",
      "b4 — White's queenside expansion. The b4 gains space AND prepares b5 chasing the Nc6 knight.",
      "...b6 — Black defends against b5 push.",
      "Bb2 — completes the queenside fianchetto. The Bb2 + c4 + b4 setup is the standard Rossolimo queenside structure.",
    ],
    learnCues: ['...O-O safe', 'b4 expansion', '...b6 defend', 'Bb2 fianchetto'],
    pawnBreaks: ['b4-b5 queenside expansion'],
    pieceManeuvers: ['Bb2 long diagonal'],
    strategicThemes: ['Queenside space + bishop pair'],
    endgameTransitions: ['R+B+N with queenside passer'],
  },
  {
    id: 'mp-pronaroRoss-e6-ne5', openingId: 'pro-naroditsky-rossolimo',
    title: 'Taimanov — Ne5 central outpost',
    overview: "Alternative to the Maroczy bind: the Ne5 central outpost + bishop pair attack on Black's structure.",
    setupSans: ['e4','c5','Nf3','e6','d4','cxd4','Nxd4','a6','Bd3','Nf6','O-O','Qc7','c4','Nc6','Nc3','Bc5','Nb3'],
    moves: ['Be7','Be3','d6','f4'],
    annotations: [
      "...Be7 — Black redirects to a safer square.",
      "Be3 — White's dark-square bishop develops.",
      "...d6 — Black supports the centre and prepares full development.",
      "f4 — the kingside attack begins. The f4 supports e5 push AND opens lines toward Black's king. Maroczy bind + kingside attack = double-edged middlegame.",
    ],
    learnCues: ['...Be7 safe', 'Be3 develop', '...d6 support', 'f4 — attack'],
    pawnBreaks: ['e4-e5 + f4-f5 kingside'],
    pieceManeuvers: ['Ne5 outpost ideas'],
    strategicThemes: ['Maroczy + kingside attack'],
    endgameTransitions: ['R+B+N attacking pieces'],
  },
  {
    id: 'mp-pronaroRoss-bd7-attack', openingId: 'pro-naroditsky-rossolimo',
    title: 'Bxd7+ Trade — Bf4 + Ne5 attack',
    overview: "Alternative to the slow positional plan: the Bf4 + Ne5 active attack setup. The Bf4 covers c7 AND the central outpost on e5 dominates dark squares.",
    setupSans: ['e4','c5','Nf3','d6','Bb5+','Bd7','Bxd7+','Qxd7','O-O','Nf6','Re1','Nc6','c4','g6','Nc3','Bg7','d3','O-O','Bf4'],
    moves: ['Rfe8','Ne5','Nxe5','Bxe5'],
    annotations: [
      "...Rfe8 — Black coordinates the rook on the e-file.",
      "Ne5 — our knight to the central outpost.",
      "...Nxe5 — Black trades the centralised knight.",
      "Bxe5 — White recaptures with the bishop, keeping piece pressure on the centre. The Bg7 trade is coming and the bishop pair conversion plan continues.",
    ],
    learnCues: ['...Rfe8 coordinate', 'Ne5 outpost', '...Nxe5 trade', 'Bxe5 — central'],
    pawnBreaks: ['c4-c5 queenside lock'],
    pieceManeuvers: ['Ne5 + Bf4 dark-square pressure'],
    strategicThemes: ['Central + bishop pair attack'],
    endgameTransitions: ['R+B+B vs R+B+N structural'],
  },

  // ============ NAJDORF — 3 variations ============
  {
    id: 'mp-pronaroNaj-english-bxh6', openingId: 'pro-naroditsky-najdorf',
    title: 'English Attack — Black short-castles + counter-race',
    overview: "Alternative to the b5 race: Black castles short and races queenside with ...a5-a4. The race is sharper but Black has more development tempo.",
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Be7','Qd2','Nbd7','O-O-O','O-O'],
    moves: ['Kb1','a5','Nd5','Bxd5'],
    annotations: [
      "Kb1 — White's prophylactic king move.",
      "...a5! Black's queenside race begins from a different angle (a-pawn first, no early b5).",
      "Nd5 — White's central outpost attempts to disrupt.",
      "...Bxd5 — Black trades the bishop for the central knight, opening the e-file AND clearing the d-file for the rook. The race continues.",
    ],
    learnCues: ['Kb1 prophylactic', '...a5 race', 'Nd5 outpost', '...Bxd5 trade'],
    pawnBreaks: ['...a5-a4-a3 queenside'],
    pieceManeuvers: ['...Bxd5 central trade'],
    strategicThemes: ['Mutual race with opposite castling'],
    endgameTransitions: ['Sharp R+B+N open files'],
  },
  {
    id: 'mp-pronaroNaj-classical-nb6', openingId: 'pro-naroditsky-najdorf',
    title: 'Be2 Classical — Nbd7-Nb6 reroute',
    overview: "Alternative to the central trade: the slow Nbd7-Nb6 reroute aiming for the queenside expansion plan in a positional game.",
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2','e5','Nb3','Be7','Be3','O-O','Qd2','Be6','O-O'],
    moves: ['Nbd7','Nd5','Nxd5','exd5'],
    annotations: [
      "...Nbd7 — Black redirects toward Nb6.",
      "Nd5 — White's central outpost attempts.",
      "...Nxd5 — Black trades, simplifying.",
      "exd5 — White recaptures with the e-pawn, fixing d5 as a strong outpost square. Now the central pawn structure favours Black slightly.",
    ],
    learnCues: ['...Nbd7 reroute', 'Nd5 outpost', '...Nxd5 trade', 'exd5 fix'],
    pawnBreaks: ['...f5 break'],
    pieceManeuvers: ['...Nbd7-Nb6 reroute'],
    strategicThemes: ['Positional Najdorf middlegame'],
    endgameTransitions: ['R+B+N with central control'],
  },
  {
    id: 'mp-pronaroNaj-adams-counter', openingId: 'pro-naroditsky-najdorf',
    title: 'Adams Attack — central counter with ...d5',
    overview: "Alternative to the defusing trade: the active ...d5 central counter-strike when White's setup is incomplete.",
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','h3','e5','Nde2','h5','Bg5'],
    moves: ['Nc6','Bxf6','gxf6','Qd2'],
    annotations: [
      "...Nc6 — Black develops the queen knight to a more active square (instead of ...Be6).",
      "Bxf6 — White trades, hoping to disrupt our king position.",
      "...gxf6 — Black recaptures with the g-pawn, opening the g-file for the rook AND keeping the bishop pair.",
      "Qd2 — White's queen prepares O-O-O. The Adams Attack race begins with Black having the half-open g-file.",
    ],
    learnCues: ['...Nc6 active', 'Bxf6 disrupt', '...gxf6 — open g-file', 'Qd2 prep O-O-O'],
    pawnBreaks: ['...d5 central counter'],
    pieceManeuvers: ['...gxf6 open g-file'],
    strategicThemes: ['Open-file race'],
    endgameTransitions: ['Open-file R+B+N attacking'],
  },

  // ============ ALEKHINE — 3 variations ============
  {
    id: 'mp-pronaroAlek-twoknights-trade', openingId: 'pro-naroditsky-alekhine',
    title: 'Two Knights — d3 + Bg5 with central trade',
    overview: "Alternative to the equal Four Knights: the central trade with the bishop pin offering simplification.",
    setupSans: ['e4','Nf6','Nc3','e5','Nf3','Nc6','Bb5','Bb4','O-O','O-O','d3','d6','Bg5'],
    moves: ['Bxc3','bxc3','h6','Bh4'],
    annotations: [
      "...Bxc3 — Black breaks the pin's potential by trading on c3.",
      "bxc3 — White recaptures, doubled c-pawns are a permanent structural concession.",
      "...h6 — Black asks the bishop the question.",
      "Bh4 — bishop retreats to h4, still pinning the f6-knight but the structural damage is done.",
    ],
    learnCues: ['...Bxc3 trade', 'bxc3 doubled', '...h6 ask', 'Bh4 retreat'],
    pawnBreaks: ['...d5 central break'],
    pieceManeuvers: ['...Bxc3 structural trade'],
    strategicThemes: ['Doubled c-pawns + bishop pair'],
    endgameTransitions: ['R+B+P with structural edge for Black'],
  },
  {
    id: 'mp-pronaroAlek-modern-nb4', openingId: 'pro-naroditsky-alekhine',
    title: 'Modern Main — ...Nb4 active piece play',
    overview: "Alternative to the IQP blockade plan: the active ...Nb4 maneuver targeting c2 and forcing White's bishop to a less active square.",
    setupSans: ['e4','Nf6','e5','Nd5','d4','d6','c4','Nb6','exd6','exd6','Nc3','Nc6','Be3','Be7','Nf3','O-O','Be2'],
    moves: ['Bf5','O-O','Nb4','Rc1'],
    annotations: [
      "...Bf5 — Black's light-square bishop comes to active life.",
      "O-O — White castles, completing development.",
      "...Nb4 — Black's knight to b4, attacks c2-square and ties down White's pieces.",
      "Rc1 — White's rook defends c2 indirectly. The position favours Black: bishop pair, active knight, no structural concessions.",
    ],
    learnCues: ['...Bf5 active', 'O-O safe', '...Nb4 active', 'Rc1 defend'],
    pawnBreaks: ['...d5 IQP setup'],
    pieceManeuvers: ['...Nb4 + ...Bf5 piece attack'],
    strategicThemes: ['Active pieces over IQP'],
    endgameTransitions: ['R+B+N with bishop pair'],
  },
  {
    id: 'mp-pronaroAlek-quiet-d5break', openingId: 'pro-naroditsky-alekhine',
    title: 'Modern Quiet — ...d5 central break',
    overview: "Alternative to the active ...Nb4: the central ...d5 break opening lines for the rook and bishop pair.",
    setupSans: ['e4','Nf6','e5','Nd5','d4','d6','Nf3','Nb6','Be2','Bf5','O-O','e6','c4','Nc6','Nc3','Be7'],
    moves: ['Be3','O-O','Qd2','d5'],
    annotations: [
      "Be3 — White's dark-square bishop develops.",
      "...O-O — Black castles, completing development.",
      "Qd2 — White's queen prepares Rad1.",
      "...d5 — Black's central break. The d5 challenges the c4-pawn AND opens lines for Black's bishop pair.",
    ],
    learnCues: ['Be3 develop', '...O-O safe', 'Qd2 prep', '...d5 break'],
    pawnBreaks: ['...d5 central break'],
    pieceManeuvers: ['...d5 open lines'],
    strategicThemes: ['Bishop pair + open centre'],
    endgameTransitions: ['R+B+P open structure'],
  },

  // ============ RUY LOPEZ — 3 variations ============
  {
    id: 'mp-pronaroRuy-berlin-bd2', openingId: 'pro-naroditsky-ruy-lopez',
    title: 'Berlin Endgame — Bd2 + Rad1 maneuver',
    overview: "Alternative to the Nc3-Nd5 outpost plan: the slow Bd2 development + queenside expansion in the Berlin endgame.",
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4','d4','Nd6','Bxc6','dxc6','dxe5','Nf5','Qxd8+','Kxd8','Rd1+','Ke8','Nc3'],
    moves: ['h6','Bd2','Be7','Be3'],
    annotations: [
      "...h6 — Black's prophylactic move, prevents future Bg5 ideas.",
      "Bd2 — White's bishop develops calmly.",
      "...Be7 — Black completes minor piece development.",
      "Be3 — bishop redeploys to the central diagonal, supporting central squares AND preparing the queenside expansion. The slow Berlin squeeze continues.",
    ],
    learnCues: ['...h6 wait', 'Bd2 develop', '...Be7 finish', 'Be3 — central'],
    pawnBreaks: ['c4 queenside expansion'],
    pieceManeuvers: ['Rad1 double on open file'],
    strategicThemes: ['Berlin endgame slow squeeze'],
    endgameTransitions: ['R+B+N vs R+B+N positional'],
  },
  {
    id: 'mp-pronaroRuy-d3-flank', openingId: 'pro-naroditsky-ruy-lopez',
    title: 'd3 Closed — Italian Nf1-Ng3-Nh5 attack',
    overview: "Alternative to the slow d4 push: the Italian-style Nf1-Ng3 reroute + Nh5 kingside attack.",
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','d3','b5','Bb3','Bc5','c3','d6','Nbd2','O-O','h3','Be6','Re1','h6','Nf1'],
    moves: ['Re8','Ng3','Nd7','Nh4'],
    annotations: [
      "...Re8 — Black coordinates the rook centrally.",
      "Ng3 — White's knight to g3, the Italian-style square aiming at the kingside.",
      "...Nd7 — Black redirects the knight to support the kingside.",
      "Nh4 — White's other knight to h4, preparing Nh4-Nf5 attacking ideas. The Italian attack pattern.",
    ],
    learnCues: ['...Re8 coordinate', 'Ng3 reroute', '...Nd7 defend', 'Nh4 attack'],
    pawnBreaks: ['Nf5 + g4 attack'],
    pieceManeuvers: ['Nbd2-Nf1-Ng3-Nh5 Italian reroute'],
    strategicThemes: ['Slow kingside attack'],
    endgameTransitions: ['R+B+N attacking pieces'],
  },
  {
    id: 'mp-pronaroRuy-steinitz-e5push', openingId: 'pro-naroditsky-ruy-lopez',
    title: 'Steinitz Defense — e5 push converting',
    overview: "Alternative to the slow Bc2 plan: the e5 push cramping Black's pieces and creating a passed pawn.",
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','d6','c3','Bd7','d4','g6','O-O','Bg7','Nbd2','Nf6','Re1'],
    moves: ['O-O','d5','Ne7','c4'],
    annotations: [
      "...O-O — Black castles.",
      "d5 — White locks the centre, gaining queenside space and freeing the c4-pawn for queenside expansion.",
      "...Ne7 — Black's knight retreats to a safer square.",
      "c4 — White's queenside push gains more space, prepares Nbd2-Nf1-Ng3 reroute toward kingside attack. The locked structure favours White's space advantage.",
    ],
    learnCues: ['...O-O safe', 'd5 lock', '...Ne7 retreat', 'c4 — gain space'],
    pawnBreaks: ['d5 + e5 central push'],
    pieceManeuvers: ['e4-e5 cramp'],
    strategicThemes: ['Central cramp + queenside space'],
    endgameTransitions: ['Closed position with space edge'],
  },

  // ============ JOBAVA LONDON — 3 variations ============
  {
    id: 'mp-pronaroJob-french-qg4', openingId: 'pro-naroditsky-jobava-london',
    title: 'French Setup — Qg4 kingside attack',
    overview: "Alternative to the slow attack: the Qg4 kingside attack via Bd3 + Qg4 + h-pawn storm.",
    setupSans: ['d4','d5','Nc3','e6','Bf4','Nf6','e3','Bd6','Bxd6','cxd6','Nf3','Nc6','Bd3','O-O','O-O','Re8'],
    moves: ['Qd2','h6','Rfe1','Bd7'],
    annotations: [
      "Qd2 — White's queen connects the rooks.",
      "...h6 — Black's prophylactic move.",
      "Rfe1 — White's rook supports the central files.",
      "...Bd7 — Black develops the light-square bishop.",
    ],
    learnCues: ['Qd2 connect', '...h6 wait', 'Rfe1 central', '...Bd7 develop'],
    pawnBreaks: ['e4 break + f4-f5 attack'],
    pieceManeuvers: ['Qd2 + Re1 central stack'],
    strategicThemes: ['Slow central + kingside attack'],
    endgameTransitions: ['R+B+N positional'],
  },
  {
    id: 'mp-pronaroJob-slav-rad1', openingId: 'pro-naroditsky-jobava-london',
    title: 'Slav Style — Rad1 + Ne5 stack',
    overview: "Alternative to the early bishop trade: the Rad1 + Ne5 setup building central pressure.",
    setupSans: ['d4','d5','Nc3','c6','Bf4','Nf6','e3','Bf5','Nf3','e6','Bd3','Bxd3','Qxd3','Nbd7','O-O','Be7'],
    moves: ['Rad1','O-O','Ne5','Nxe5'],
    annotations: [
      "Rad1 — White doubles on the d-file.",
      "...O-O — Black castles.",
      "Ne5 — our knight to the central outpost.",
      "...Nxe5 — Black trades the centralised knight.",
    ],
    learnCues: ['Rad1 double', '...O-O safe', 'Ne5 outpost', '...Nxe5 trade'],
    pawnBreaks: ['e4 central break'],
    pieceManeuvers: ['Rad1 + Ne5 central stack'],
    strategicThemes: ['Central pressure + kingside attack'],
    endgameTransitions: ['R+B+N attacking pieces'],
  },
  {
    id: 'mp-pronaroJob-a6c5-rad1', openingId: 'pro-naroditsky-jobava-london',
    title: 'a6 with ...c5 — Rad1 central control',
    overview: "Alternative to the simple Bd3 attack: the Rad1 setup grabbing central files.",
    setupSans: ['d4','d5','Nc3','Nf6','Bf4','a6','e3','e6','Nf3','c5','dxc5','Bxc5','Bd3','Nc6','O-O'],
    moves: ['O-O','Qd2','Qa5','a3'],
    annotations: [
      "...O-O — Black castles.",
      "Qd2 — White's queen connects the rooks AND prepares Bg5 or kingside attack ideas.",
      "...Qa5 — Black's queen activates with queenside threats.",
      "a3 — White's prophylactic move, prevents ...Bb4 ideas AND prepares b4 kicking the c5-bishop.",
    ],
    learnCues: ['...O-O safe', 'Qd2 connect', '...Qa5 active', 'a3 prevent'],
    pawnBreaks: ['e4 central break'],
    pieceManeuvers: ['Rad1 central rook'],
    strategicThemes: ['Central control + queenside defense'],
    endgameTransitions: ['R+B+N positional'],
  },
];

const out = [];
const skipped = [];
for (const p of PLANS) {
  let fen; try { fen = fenAfter(p.setupSans); } catch (e) { console.error('SKIP ' + p.id + ': setup ' + e.message); skipped.push(p.id); continue; }
  const c = new Chess(fen);
  let ok = true;
  for (const san of p.moves) {
    try { c.move(san); }
    catch (e) { console.error('SKIP ' + p.id + ': illegal ' + san + ' (' + e.message + ')'); skipped.push(p.id); ok = false; break; }
  }
  if (!ok) continue;
  if (p.annotations.length !== p.moves.length || p.learnCues.length !== p.moves.length) { console.error('SKIP ' + p.id + ': arr mismatch'); skipped.push(p.id); continue; }
  const highlights = highlightsFromMoves(p.setupSans, p.moves);
  const arrows = p.moves.map(() => []);
  const SRC = SRC_BY_OPENING[p.openingId];
  out.push({
    id: p.id, openingId: p.openingId, criticalPositionFen: fen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ fen, moves: p.moves, annotations: p.annotations, arrows, highlights, learnCues: p.learnCues, title: p.title, intro: p.overview, sources: SRC }],
  });
}

console.error('Built ' + out.length + ' plans; skipped ' + skipped.length);
console.log(JSON.stringify(out, null, 2));
