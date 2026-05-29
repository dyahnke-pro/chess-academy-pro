#!/usr/bin/env node
// Build 1 middlegame plan per variation for the 6 remaining Naroditsky
// openings (KIA, Rossolimo, Najdorf, Ruy, Alekhine, Jobava). Each plan
// is short (3-4 moves) anchored at the end of the variation's spine
// PGN from pro-repertoires.json. All moves chess.js-validated.

import { Chess } from 'chess.js';

const ORANGE = 'rgba(255, 165, 0, 0.55)';

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
  // ===== KIA =====
  {
    id: 'mp-pronaroKIA-symmetric-attack',
    openingId: 'pro-naroditsky-kia',
    title: 'KIA vs Symmetric — Nh4 + f4 kingside attack',
    overview: 'Past the symmetric setup, the KIA kingside attack pattern begins: Nh4 reroutes the knight toward f5, f4 expands the pawn front, and the Bg2 supports the central squares.',
    setupSans: ['Nf3','g6','g3','Bg7','Bg2','d6','O-O','Nf6','d3','O-O','Nbd2','e5','e4','Nc6','c3','Re8','a4','a5','Nh4'],
    moves: ['Nd7','Nf5','gxf5','exf5'],
    annotations: [
      "...Nd7 — Black reroutes the f6-knight to give the bishop on g7 more breathing room. Standard defensive move in the KIA symmetric structure.",
      "Nf5 — our knight lands on the prize square. From f5 it pressures the kingside, hits the g7-bishop indirectly, and supports a coming f4 push.",
      "...gxf5 — Black takes the knight with the g-pawn, opening the g-file but accepting a damaged kingside.",
      "exf5 — we recapture with the e-pawn, fixing the f5-pawn AND keeping pressure on the kingside files. The structural conversion runs from here.",
    ],
    learnCues: ['...Nd7 reroute', 'Nf5 prize square', '...gxf5 take', 'exf5 — fix the pawn'],
    pawnBreaks: ['f4-f5 kingside expansion'],
    pieceManeuvers: ['Nh4 → Nf5 KIA reroute'],
    strategicThemes: ['Kingside attack with locked centre'],
    endgameTransitions: ['R+B+P with structural pressure'],
  },
  {
    id: 'mp-pronaroKIA-reti-attack',
    openingId: 'pro-naroditsky-kia',
    title: 'KIA vs Reti d5 — Re1 + Nc4 central pressure',
    overview: "Past the dxe4 dxe4 trade, White's pieces have natural squares for central play. The Re1 + Nc4 setup pressures the d5 + e6 squares, and the Bg2 dominates the long diagonal.",
    setupSans: ['Nf3','d5','g3','Nf6','Bg2','c5','O-O','Nc6','d3','e6','Nbd2','Bd6','e4','dxe4','dxe4','O-O','Re1'],
    moves: ['Qc7','Nc4','Be7','Nh4'],
    annotations: [
      "...Qc7 — Black activates the queen, prepares queenside expansion with ...b5.",
      "Nc4 — our knight comes to the central outpost attacking the d6-bishop. Forces Black to declare what to do.",
      "...Be7 — Black retreats the bishop to a safer square. The bishop is less active but the position remains balanced.",
      "Nh4 — the second knight reroutes toward f5, building a kingside attack while the c4-knight controls the central squares.",
    ],
    learnCues: ['...Qc7 — queen out', 'Nc4 — outpost', '...Be7 retreat', 'Nh4 — reroute'],
    pawnBreaks: ['e4-e5 central expansion'],
    pieceManeuvers: ['Nc4 + Nh4 dual reroute'],
    strategicThemes: ['Central control + kingside pressure'],
    endgameTransitions: ['R+B+N with active pieces'],
  },
  {
    id: 'mp-pronaroKIA-kid-transposition',
    openingId: 'pro-naroditsky-kia',
    title: 'KIA vs Pirc — Reversed KID central plan',
    overview: "Past the locked centre with d5, the position becomes a Reversed KID where we have the extra tempo. The plan: queenside expansion with b4 + Nb3 + a4-a5.",
    setupSans: ['Nf3','d6','g3','g6','Bg2','Bg7','O-O','Nf6','d4','O-O','c4','e5','Nc3','Nbd7','d5','a5','e4'],
    moves: ['Nc5','b3','b6','a3'],
    annotations: [
      "...Nc5 — Black plants the knight on the prize square (Reversed Mar del Plata). The Nc5 hits e4 and threatens to maneuver into the queenside.",
      "b3 — solidifies the queenside, prepares a3 + b4 expansion.",
      "...b6 — Black supports the Nc5 and prepares a queenside structure of his own.",
      "a3 — first wave of the queenside expansion. Next a4 + b4 chases the c5-knight and gains space.",
    ],
    learnCues: ['...Nc5 prize square', 'b3 solidify', '...b6 support', 'a3 expand'],
    pawnBreaks: ['b4 queenside expansion'],
    pieceManeuvers: ['a3 + b4 chase the Nc5'],
    strategicThemes: ['Reversed KID with extra tempo'],
    endgameTransitions: ['R+B+P with queenside space'],
  },

  // ===== ROSSOLIMO =====
  {
    id: 'mp-pronaroRoss-nc6-maroczy',
    openingId: 'pro-naroditsky-rossolimo',
    title: 'Rossolimo proper — Maroczy bind conversion',
    overview: "After the central trade exd5 Nxd5 d3, the Maroczy-style structure favours us. The plan: complete development with Nbd2, then push c4 locking the queenside.",
    setupSans: ['e4','c5','Nf3','Nc6','Bb5','e6','O-O','Nge7','Re1','a6','Bf1','d5','exd5','Nxd5','d3'],
    moves: ['Nf6','Nbd2','Be7','c4'],
    annotations: [
      "...Nf6 — Black reroutes the d5-knight back to its natural square. Standard development.",
      "Nbd2 — our second knight develops to the KIA-like square, supports e4 and prepares Ne4 jumps.",
      "...Be7 — Black completes development, prepares O-O.",
      "c4 — the Maroczy bind locks in. The c4 + Nc3 setup is one of the strongest structural advantages in chess; long game conversion follows.",
    ],
    learnCues: ['...Nf6 reroute', 'Nbd2 develop', '...Be7 setup', 'c4 — Maroczy'],
    pawnBreaks: ['c4 queenside lock'],
    pieceManeuvers: ['Nbd2 → Ne4 central outpost'],
    strategicThemes: ['Maroczy bind structural edge'],
    endgameTransitions: ['R+B+N with cramping squares'],
  },
  {
    id: 'mp-pronaroRoss-e6-taimanov',
    openingId: 'pro-naroditsky-rossolimo',
    title: 'Taimanov transposition — Maroczy bind via c4',
    overview: "Past the Qc7 setup, the c4 + Nc3 Maroczy bind structure dominates. The plan: complete development with Be3 + O-O, then expand with f3 + g4 attacking ideas.",
    setupSans: ['e4','c5','Nf3','e6','d4','cxd4','Nxd4','a6','Bd3','Nf6','O-O','Qc7','c4','Nc6','Nc3'],
    moves: ['Bc5','Nb3','Be7','Be3'],
    annotations: [
      "...Bc5 — Black develops the bishop actively, hitting the d4-knight.",
      "Nb3 — knight retreats to b3, defending and freeing the queen's path.",
      "...Be7 — Black reorganises with the bishop on e7 (more flexible than c5).",
      "Be3 — completes development. The position is a textbook Maroczy bind with all pieces coordinated for the central + queenside pressure.",
    ],
    learnCues: ['...Bc5 develop', 'Nb3 retreat', '...Be7 reorganise', 'Be3 finish'],
    pawnBreaks: ['c4-c5 queenside expansion'],
    pieceManeuvers: ['Nb3 + Nd5 central control'],
    strategicThemes: ['Maroczy bind + bishop pair'],
    endgameTransitions: ['Closed structure conversion'],
  },
  {
    id: 'mp-pronaroRoss-bd7-conversion',
    openingId: 'pro-naroditsky-rossolimo',
    title: 'Bxd7+ Trade — slow bishop pair conversion',
    overview: "Past the trade with Bxd7+ and the Maroczy bind setup, the bishop pair is the structural edge. The plan: slow piece coordination + Nd5 outpost + queenside expansion.",
    setupSans: ['e4','c5','Nf3','d6','Bb5+','Bd7','Bxd7+','Qxd7','O-O','Nf6','Re1','Nc6','c4','g6','Nc3','Bg7','d3'],
    moves: ['O-O','Bf4','e5','Bg5'],
    annotations: [
      "...O-O — Black completes development.",
      "Bf4 — our dark-square bishop develops actively, eyes the d6-square.",
      "...e5 — Black challenges the centre.",
      "Bg5 — bishop reroutes to g5 pinning the f6-knight. The pin restricts Black's mobility and prepares Nd5 outpost ideas.",
    ],
    learnCues: ['...O-O complete', 'Bf4 active', '...e5 challenge', 'Bg5 — pin'],
    pawnBreaks: ['e4-e5 central break'],
    pieceManeuvers: ['Bf4 + Nd5 outpost'],
    strategicThemes: ['Bishop pair + central control'],
    endgameTransitions: ['R+B+B vs R+B+N — structural'],
  },

  // ===== NAJDORF =====
  {
    id: 'mp-pronaroNaj-english-race',
    openingId: 'pro-naroditsky-najdorf',
    title: 'English Attack — queenside race conversion',
    overview: "Past the O-O-O Nb6 race position, Black's queenside attack accelerates: ...b4 wedge + ...a5-a4 expansion. The race is decided by which side opens lines first.",
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Nbd7','Qd2','b5','O-O-O','Nb6'],
    moves: ['Kb1','b4','Nd5','Nbxd5'],
    annotations: [
      "Kb1 — White's prophylactic king move, getting off the c1-diagonal.",
      "...b4 — the queenside expansion lands. The pawn hits the c3-knight and opens the b-file for our rook.",
      "Nd5 — White's knight tries the central outpost. Forces a trade or retreat.",
      "...Nbxd5 — Black takes the central piece. The trade opens lines AND removes White's best central attacker, leaving the queenside race in our favour.",
    ],
    learnCues: ['Kb1 prophylactic', '...b4 wedge', 'Nd5 outpost try', '...Nbxd5 trade'],
    pawnBreaks: ['...b4 + ...a4 queenside'],
    pieceManeuvers: ['...Nb6-Nbxd5 central trade'],
    strategicThemes: ['Race in opposite-side castling'],
    endgameTransitions: ['Open lines + active queen'],
  },
  {
    id: 'mp-pronaroNaj-classical-development',
    openingId: 'pro-naroditsky-najdorf',
    title: 'Be2 Classical — queenside maneuver',
    overview: "Past the classical development phase, both sides settle into positional play. The plan from here: queenside expansion with ...Nbd7-Nb6-b5 + ...Rfc8 for c-file pressure.",
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2','e5','Nb3','Be7','Be3','O-O','Qd2','Be6'],
    moves: ['O-O','Nbd7','Nd5','Nxd5'],
    annotations: [
      "O-O — White castles short, both kings safe.",
      "...Nbd7 — Black develops the queen knight to its KIA-like square, preparing ...Nb6 reroute.",
      "Nd5 — White tries the central outpost.",
      "...Nxd5 — Black takes the central piece, equalising piece activity. The position remains balanced with slight Black structural edge.",
    ],
    learnCues: ['O-O safe', '...Nbd7 develop', 'Nd5 outpost', '...Nxd5 equalise'],
    pawnBreaks: ['...b5 queenside push'],
    pieceManeuvers: ['...Nbd7-Nb6 reroute'],
    strategicThemes: ['Positional Najdorf middlegame'],
    endgameTransitions: ['R+B+N with structural balance'],
  },
  {
    id: 'mp-pronaroNaj-adams-defense',
    openingId: 'pro-naroditsky-najdorf',
    title: 'Adams Attack — defensive consolidation',
    overview: "Past the Bxf6 Qxf6 trade, the Adams Attack has been defused. The plan: develop pieces calmly, then strike with ...d5 or ...b5 once setup is complete.",
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','h3','e5','Nde2','h5','Bg5','Be6','Bxf6','Qxf6'],
    moves: ['Nd5','Bxd5','exd5','Nd7'],
    annotations: [
      "Nd5 — White's knight to the central outpost, attacking the queen on f6.",
      "...Bxd5 — Black trades the bishop for the central knight. The trade opens the central files.",
      "exd5 — White recaptures with the e-pawn, fixing the d5 outpost.",
      "...Nd7 — Black develops the queen knight, preparing ...Nb6 reroute toward c4 or a4.",
    ],
    learnCues: ['Nd5 outpost', '...Bxd5 trade', 'exd5 recapture', '...Nd7 develop'],
    pawnBreaks: ['...b5 queenside'],
    pieceManeuvers: ['...Nd7-Nb6 reroute'],
    strategicThemes: ['Defuse and consolidate'],
    endgameTransitions: ['R+B+N structural game'],
  },

  // ===== ALEKHINE =====
  {
    id: 'mp-pronaroAlek-twoknights-equality',
    openingId: 'pro-naroditsky-alekhine',
    title: 'Two Knights — equal Four Knights game',
    overview: "Past the symmetric castling, the position is a balanced Four Knights game. Both sides develop calmly; the middlegame is decided by small tactical opportunities and patient maneuvering.",
    setupSans: ['e4','Nf6','Nc3','e5','Nf3','Nc6','Bb5','Bb4','O-O','O-O'],
    moves: ['d3','d6','Bg5','Bxc3'],
    annotations: [
      "d3 — White plays a small central move, prepares Nd5 ideas.",
      "...d6 — Black mirrors, supports the e5-pawn.",
      "Bg5 — White develops the dark-square bishop with a pin on f6.",
      "...Bxc3 — Black breaks the pin's potential by trading on c3. The bxc3 recapture damages White's structure permanently.",
    ],
    learnCues: ['d3 small move', '...d6 mirror', 'Bg5 pin', '...Bxc3 trade'],
    pawnBreaks: ['symmetric central play'],
    pieceManeuvers: ['...Bxc3 structural trade'],
    strategicThemes: ['Equal Four Knights game'],
    endgameTransitions: ['R+B+N with even structure'],
  },
  {
    id: 'mp-pronaroAlek-modern-development',
    openingId: 'pro-naroditsky-alekhine',
    title: 'Modern Main — IQP positional game',
    overview: "Past the Be7 + O-O development, the position is an Isolated Queen Pawn (White has the IQP on d4). Black's plan: blockade the d5-square with the knight, exploit White's weak pawn.",
    setupSans: ['e4','Nf6','e5','Nd5','d4','d6','c4','Nb6','exd6','exd6','Nc3','Nc6','Be3','Be7','Nf3','O-O'],
    moves: ['Be2','Bf5','O-O','Re8'],
    annotations: [
      "Be2 — White develops the bishop quietly, supports kingside.",
      "...Bf5 — Black's c8-bishop comes to active life, pressures the c2-square.",
      "O-O — White castles, completing development.",
      "...Re8 — Black's rook to the e-file, supports central play and the eventual ...Nd5 blockade.",
    ],
    learnCues: ['Be2 quiet', '...Bf5 active', 'O-O safe', '...Re8 central'],
    pawnBreaks: ['...d5 IQP blockade'],
    pieceManeuvers: ['...Nb6-Nd5 blockade square'],
    strategicThemes: ['IQP structural conversion'],
    endgameTransitions: ['R+B+N with weak White d-pawn'],
  },
  {
    id: 'mp-pronaroAlek-modernquiet-conversion',
    openingId: 'pro-naroditsky-alekhine',
    title: 'Modern Quiet — classical Bf5 + ...Nc6 conversion',
    overview: "Past the c4 + ...Nc6 development, Black's pieces have natural squares. The plan: complete development with ...Be7 + ...O-O, then break with ...f6 or ...d5.",
    setupSans: ['e4','Nf6','e5','Nd5','d4','d6','Nf3','Nb6','Be2','Bf5','O-O','e6','c4','Nc6'],
    moves: ['Nc3','Be7','d5','Nb4'],
    annotations: [
      "Nc3 — White develops the queen's knight.",
      "...Be7 — Black completes kingside development.",
      "d5 — White pushes the d-pawn trying to lock the centre.",
      "...Nb4 — Black's knight to b4 attacks the d-pawn AND eyes c2 outposts. Active piece play.",
    ],
    learnCues: ['Nc3 develop', '...Be7 complete', 'd5 push', '...Nb4 active'],
    pawnBreaks: ['...f6 break'],
    pieceManeuvers: ['...Nc6-Nb4 outpost'],
    strategicThemes: ['Active piece play in closed structure'],
    endgameTransitions: ['R+B+N with structural balance'],
  },

  // ===== RUY LOPEZ =====
  {
    id: 'mp-pronaroRuy-berlin-endgame',
    openingId: 'pro-naroditsky-ruy-lopez',
    title: 'Berlin Endgame — patient conversion',
    overview: "Past the Rd1+ check, the Berlin Endgame is the structural fight. White's plan: develop pieces patiently, control central files, slowly convert the structural edge.",
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4','d4','Nd6','Bxc6','dxc6','dxe5','Nf5','Qxd8+','Kxd8','Rd1+'],
    moves: ['Ke8','Nc3','h6','h3'],
    annotations: [
      "...Ke8 — Black's king to e8, the most flexible defensive square.",
      "Nc3 — White develops the queen knight, prepares Nd5 outpost ideas.",
      "...h6 — Black plays a useful waiting move, prevents future Bg5 pins.",
      "h3 — White mirrors with h3, preparing g4 for later kingside expansion.",
    ],
    learnCues: ['...Ke8 safe', 'Nc3 develop', '...h6 wait', 'h3 prep g4'],
    pawnBreaks: ['g4 kingside expansion'],
    pieceManeuvers: ['Nc3-Nd5 outpost'],
    strategicThemes: ['Slow Berlin endgame squeeze'],
    endgameTransitions: ['R+B+N vs R+B+N structural'],
  },
  {
    id: 'mp-pronaroRuy-d3-positional',
    openingId: 'pro-naroditsky-ruy-lopez',
    title: 'd3 Closed — Italian-style positional game',
    overview: "Past the h3 setup, the closed positional middlegame begins. The plan: slow development with Nbd2 + Nf1-Ng3 reroute, then break with d4 at the right moment.",
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','d3','b5','Bb3','Bc5','c3','d6','Nbd2','O-O','h3'],
    moves: ['Be6','Re1','h6','Nf1'],
    annotations: [
      "...Be6 — Black develops the bishop, offers a trade with Bb3.",
      "Re1 — White's rook to the central file, supports e4.",
      "...h6 — Black plays a useful waiting move, prevents future Bg5 pin ideas.",
      "Nf1 — White's knight reroutes toward g3 (Italian-style), preparing the kingside attack.",
    ],
    learnCues: ['...Be6 offer', 'Re1 central', '...h6 prophylactic', 'Nf1 → Ng3'],
    pawnBreaks: ['d4 central break'],
    pieceManeuvers: ['Nbd2 → Nf1 → Ng3 KIA-like reroute'],
    strategicThemes: ['Closed positional game'],
    endgameTransitions: ['R+B+N with central control'],
  },
  {
    id: 'mp-pronaroRuy-steinitz-d4',
    openingId: 'pro-naroditsky-ruy-lopez',
    title: 'Steinitz Defense — d4 central break conversion',
    overview: "Past the Nbd2 development, the central break d4 has set the tone. The plan: complete development with Bb3 + Re1, then push e5 cramping Black's pieces.",
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','d6','c3','Bd7','d4','g6','O-O','Bg7','Nbd2'],
    moves: ['Nf6','Re1','O-O','Bc2'],
    annotations: [
      "...Nf6 — Black develops the king's knight finally.",
      "Re1 — White's rook to the central file.",
      "...O-O — Black completes development with kingside castling.",
      "Bc2 — White reroutes the bishop to c2 supporting d3 + the long-diagonal for a later kingside attack.",
    ],
    learnCues: ['...Nf6 develop', 'Re1 central', '...O-O safe', 'Bc2 reroute'],
    pawnBreaks: ['e4-e5 cramp', 'd4-d5 lock'],
    pieceManeuvers: ['Ba4 → Bb3 → Bc2 — the Spanish bishop dance'],
    strategicThemes: ['Slow Ruy conversion'],
    endgameTransitions: ['R+B+N + central control'],
  },

  // ===== JOBAVA LONDON =====
  {
    id: 'mp-pronaroJob-french-attack',
    openingId: 'pro-naroditsky-jobava-london',
    title: 'e6 French Setup — Bd3 kingside attack',
    overview: "Past the bishop trade Bxd6 cxd6, the Black structure has doubled d-pawns and a half-open c-file for us. The plan: Bd3 + Qe2 + O-O + Ne5 + f4 — classical kingside attack.",
    setupSans: ['d4','d5','Nc3','e6','Bf4','Nf6','e3','Bd6','Bxd6','cxd6','Nf3','Nc6','Bd3'],
    moves: ['O-O','O-O','h6','h3'],
    annotations: [
      "...O-O — Black castles kingside.",
      "O-O — White castles.",
      "...h6 — Black plays a prophylactic move, prevents future Bg5 pin ideas.",
      "h3 — White mirrors with the prophylactic h3, preparing g4 expansion later. The closed middlegame position favours White's slightly better piece coordination.",
    ],
    learnCues: ['...O-O safe', 'O-O safe', '...h6 wait', 'h3 prep g4'],
    pawnBreaks: ['f4-f5 kingside attack'],
    pieceManeuvers: ['Bd3 + Qe2 + Ne5 attack stack'],
    strategicThemes: ['Classical kingside attack vs locked Black king'],
    endgameTransitions: ['R+B+N with kingside pressure'],
  },
  {
    id: 'mp-pronaroJob-slav-trade',
    openingId: 'pro-naroditsky-jobava-london',
    title: 'Slav Style — Qd3 attack + Ne5 outpost',
    overview: "Past the Bxd3 Qxd3 bishop trade, the queen on d3 supports a coming kingside attack. The plan: Ne5 outpost + queenside expansion via b4 + central break with e4.",
    setupSans: ['d4','d5','Nc3','c6','Bf4','Nf6','e3','Bf5','Nf3','e6','Bd3','Bxd3','Qxd3','Nbd7','O-O'],
    moves: ['Be7','Ne5','Nxe5','Bxe5'],
    annotations: [
      "...Be7 — Black develops the bishop, preparing kingside castling.",
      "Ne5 — our knight to the central outpost, attacks the Nd7 and dominates the kingside.",
      "...Nxe5 — Black trades the centralised knight.",
      "Bxe5 — we recapture with the bishop, keeping the central piece presence and the kingside attack potential.",
    ],
    learnCues: ['...Be7 setup', 'Ne5 outpost', '...Nxe5 trade', 'Bxe5 recapture'],
    pawnBreaks: ['e4 central break'],
    pieceManeuvers: ['Ne5 + Bd3-Qd3 attack stack'],
    strategicThemes: ['Central + kingside pressure'],
    endgameTransitions: ['R+B+N with structural pressure'],
  },
  {
    id: 'mp-pronaroJob-a6c5-bd3',
    openingId: 'pro-naroditsky-jobava-london',
    title: 'a6 with ...c5 — Bd3 kingside attack',
    overview: "Past the dxc5 Bxc5 sequence, the Bd3 attack is set up. The plan: O-O + Qe2 + Ne5 + f4 — the Jobava's signature attacking middlegame.",
    setupSans: ['d4','d5','Nc3','Nf6','Bf4','a6','e3','e6','Nf3','c5','dxc5','Bxc5','Bd3'],
    moves: ['Nc6','O-O','O-O','Qe2'],
    annotations: [
      "...Nc6 — Black develops the queen knight.",
      "O-O — White castles.",
      "...O-O — Black castles.",
      "Qe2 — prepares Ne5 + f4 kingside attack. The Bd3 + Qe2 stacks against h7.",
    ],
    learnCues: ['...Nc6 develop', 'O-O', '...O-O', 'Qe2 prep attack'],
    pawnBreaks: ['f4-f5 attack'],
    pieceManeuvers: ['Bd3 + Qe2 + Ne5 stack'],
    strategicThemes: ['Classical kingside attack'],
    endgameTransitions: ['R+B+N with attack pieces'],
  },
];

const SRC_BY_OPENING = {
  'pro-naroditsky-kia': ['https://www.chess.com/openings/Kings-Indian-Attack', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-rossolimo': ['https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-najdorf': ['https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-alekhine': ['https://www.chess.com/openings/Alekhines-Defense', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-ruy-lopez': ['book:ruy-lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-jobava-london': ['https://www.chess.com/openings/Jobava-London-System', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
};

const out = [];
const skipped = [];
for (const p of PLANS) {
  let fen;
  try { fen = fenAfter(p.setupSans); }
  catch (e) {
    console.error('SKIP plan ' + p.id + ': setup illegal — ' + e.message);
    skipped.push(p.id);
    continue;
  }
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
  if (p.annotations.length !== p.moves.length || p.learnCues.length !== p.moves.length) {
    console.error('SKIP plan ' + p.id + ': arr length mismatch');
    skipped.push(p.id);
    continue;
  }
  const highlights = highlightsFromMoves(p.setupSans, p.moves);
  const arrows = p.moves.map(() => []);
  const SRC = SRC_BY_OPENING[p.openingId];
  out.push({
    id: p.id,
    openingId: p.openingId,
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
console.error('Built ' + out.length + ' plans; skipped ' + skipped.length);
console.log(JSON.stringify(out, null, 2));
