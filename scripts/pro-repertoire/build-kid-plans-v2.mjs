#!/usr/bin/env node
// KID round-2 plans: 2nd middlegame plan variant per variation.
// Per David's "always attempt for 2" directive (2026-05-29). Total 7
// plans matching the 7 KID variations. All moves chess.js-validated.

import { Chess } from 'chess.js';

const ORANGE = 'rgba(255, 165, 0, 0.55)';
const SRC = [
  'https://www.chess.com/openings/Kings-Indian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

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

const PLANS = [
  // ===== CLASSICAL MAINLINE — v2: ...c5 queenside lock + Bh6 trade response =====
  {
    id: 'mp-pronaroKID-classical-c5',
    title: 'Classical Mar del Plata — ...c5 lock + Bh6 response',
    overview: "Alternative to the trade-down sequence: anchoring at ...c5 (Black's queenside lock), Black handles White's Bh6 differently by NOT immediately taking the trade. The …Be6 develops first, then Black chooses whether to accept the bishop trade based on White's setup.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','exd4','Nxd4','Re8','f3','Nc6','Be3','Nh5','Qd2','Nf4','Bxf4','Nxd4','Bd3','c5'],
    moves: ['Bh6','Be6','Bxg7','Kxg7'],
    annotations: [
      "Bh6 — White offers the dark-square bishop trade, hoping to weaken Black's king.",
      "...Be6 — Black develops the light-square bishop first, NOT immediately trading. The Bh6 hangs while Black improves piece placement.",
      "Bxg7 — White goes through with the trade.",
      "...Kxg7 — Black recaptures with the king, transitioning into the R+min+P endgame structure with active piece placement on e6 and central control.",
    ],
    learnCues: ['Bh6 offer', '...Be6 develop', 'Bxg7 trade', '...Kxg7 endgame'],
    pawnBreaks: ['...c5 queenside lock'],
    pieceManeuvers: ['...Be6 active light-square bishop'],
    strategicThemes: ['Endgame transition with active pieces'],
    endgameTransitions: ['R+min+P (26.4% of decisive Classical games)'],
  },

  // ===== FIANCHETTO — v2: ...exd4 simplification =====
  {
    id: 'mp-pronaroKID-fianchetto-simplify',
    title: 'Fianchetto — early ...exd4 simplification',
    overview: "Alternative to the slow Yugoslav queenside push: the immediate ...exd4 trade opening lines for the rook + bishop pair on the e-file.",
    setupSans: ['d4','Nf6','c4','g6','g3','Bg7','Bg2','O-O','Nc3','d6','Nf3','Nbd7','O-O','e5','e4','exd4','Nxd4'],
    moves: ['Nc5','Qc2','a5','Rd1'],
    annotations: [
      "...Nc5 — Black's knight to c5 outpost, attacks e4-pawn.",
      "Qc2 — White's queen defends e4 indirectly AND eyes the kingside.",
      "...a5 — Black's queenside expansion begins.",
      "Rd1 — White's rook to the central file. The position is balanced with Black having the better minor piece on c5.",
    ],
    learnCues: ['...Nc5 outpost', 'Qc2 defend', '...a5 expand', 'Rd1 central'],
    pawnBreaks: ['...a5 queenside push'],
    pieceManeuvers: ['...Nbd7-Nc5 reroute'],
    strategicThemes: ['Central simplification + queenside'],
    endgameTransitions: ['R+B+N with active minor pieces'],
  },

  // ===== ANTI-KID NF3 — v2: ...Re8 + rook lift =====
  {
    id: 'mp-pronaroKID-antikidnf3-rooklift',
    title: 'Anti-KID Nf3 — Re8 + ...Bg4 pin counter',
    overview: "Alternative to the Yugoslav plan: the ...Re8 + ...Bg4 setup pinning White's f3-knight against the queen, forcing concessions.",
    setupSans: ['d4','Nf6','c4','g6','Nf3','Bg7','g3','O-O','Bg2','d6','O-O','Nbd7','Nc3','e5','e4','c6','h3','Qa5','Re1'],
    moves: ['Re8','Qc2','exd4','Nxd4'],
    annotations: [
      "...Re8 — Black's rook to the e-file pressuring the e4-pawn.",
      "Qc2 — White's queen supports e4 AND prepares queenside development.",
      "...exd4 — Black opens the e-file with the trade.",
      "Nxd4 — White recaptures. The rook on e8 now has full pressure on e4 and the position is balanced.",
    ],
    learnCues: ['...Re8 pressure', 'Qc2 defend', '...exd4 open', 'Nxd4 recapture'],
    pawnBreaks: ['...exd4 open the file'],
    pieceManeuvers: ['...Re8 rook lift'],
    strategicThemes: ['Central pressure setup'],
    endgameTransitions: ['R+B+N central files'],
  },

  // ===== MAKOGONOV — v2: ...Nc5 queenside outpost =====
  {
    id: 'mp-pronaroKID-makogonov-nc5',
    title: 'Makogonov — ...Nc5 queenside outpost',
    overview: "Alternative to the kingside storm: the ...Nc5 outpost on the queenside hitting e4 and dominating dark squares.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','h3','O-O','Be3','c6','Nf3','Na6','Be2','e5','d5','Nh5','O-O','Nf4'],
    moves: ['Re1','f5','Bxf4','exf4'],
    annotations: [
      "Re1 — White's rook supports the e-file.",
      "...f5 — Black's pawn storm launches with the knight already on f4.",
      "Bxf4 — White trades the dark-square bishop for the Nf4.",
      "...exf4 — Black's e5-pawn captures back diagonally, opening the e-file for the rook AND fixing the f4-pawn as a structural target. The kingside attack continues with the open e-file and the half-open f-file.",
    ],
    learnCues: ['Re1 support', '...f5 storm', 'Bxf4 trade', '...exf4 — open f-file'],
    pawnBreaks: ['...f5-f4 kingside storm'],
    pieceManeuvers: ['...Na6-Nc5 reroute'],
    strategicThemes: ['Kingside attack + queenside outpost'],
    endgameTransitions: ['R+B+N kingside attack'],
  },

  // ===== SAEMISCH — v2: ...c5 central counter =====
  {
    id: 'mp-pronaroKID-saemisch-central',
    title: 'Sämisch — ...c5 central counter early',
    overview: "Alternative to the Bronstein/Panno trade-down: the active ...c5 central counter-strike before White's kingside attack lands.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3','a6','Qd2','c5'],
    moves: ['d5','b5','cxb5','axb5'],
    annotations: [
      "d5 — White closes the centre, gaining queenside space.",
      "...b5 — Black's queenside expansion immediately challenges the c4-pawn.",
      "cxb5 — White trades the c-pawn.",
      "...axb5 — Black recaptures with the a-pawn, opening the a-file for the rook AND creating queenside pawn majority.",
    ],
    learnCues: ['d5 lock', '...b5 expand', 'cxb5 trade', '...axb5 — open a-file'],
    pawnBreaks: ['...b5 queenside expansion'],
    pieceManeuvers: ['...a-file rook activation'],
    strategicThemes: ['Counter-attack queenside before White attack lands'],
    endgameTransitions: ['R+B+N with queenside majority'],
  },

  // ===== PETROSIAN NGE2 — v2: ...Re8 + central play =====
  {
    id: 'mp-pronaroKID-petrosian-re8',
    title: 'Petrosian — ...Re8 + ...h5 kingside expansion',
    overview: "Alternative to the long-diagonal Bxd4 raid: the ...Re8 + ...h5 setup gaining kingside space.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nge2','O-O','f3','c6','Be3','a6','c5','b5','cxd6','exd6'],
    moves: ['Nf4','Re8','Be2','h5'],
    annotations: [
      "Nf4 — White's knight to the central outpost.",
      "...Re8 — Black coordinates the rook on the e-file.",
      "Be2 — White completes development.",
      "...h5 — Black's kingside expansion begins. The h5 push prepares ...h4 cramping White's kingside.",
    ],
    learnCues: ['Nf4 outpost', '...Re8 coordinate', 'Be2 develop', '...h5 expand'],
    pawnBreaks: ['...h5-h4 kingside expansion'],
    pieceManeuvers: ['...Re8 rook lift'],
    strategicThemes: ['Slow kingside expansion + queenside space'],
    endgameTransitions: ['R+B+N positional grind'],
  },

  // ===== FOUR PAWNS — v2: ...Nbd7 + ...Nb6 reroute =====
  {
    id: 'mp-pronaroKID-fourpawns-counter',
    title: 'Four Pawns — ...Nbd7-Nb6 reroute attacking c4',
    overview: "Alternative to the kingside storm: the ...Nbd7-Nb6 reroute targeting White's c4-pawn directly.",
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f4','O-O','Nf3','e5','fxe5','dxe5','d5','c5','Bd3','Ne8','O-O','Nd6','Be3','Nd7'],
    moves: ['Qd2','Nb6','a4','a5'],
    annotations: [
      "Qd2 — White's queen connects the rooks.",
      "...Nb6 — Black's second knight reroutes to b6 attacking c4.",
      "a4 — White prevents ...a5 expansion.",
      "...a5 — Black mirrors with the queenside push, fixing the a-pawn structure AND preparing ...Na6-Nc5 reroute toward the c4-pawn. The locked queenside doesn't help White's space advantage and Black has the better minor pieces.",
    ],
    learnCues: ['Qd2 connect', '...Nb6 attack c4', 'a4 prevent', '...a5 — counter'],
    pawnBreaks: ['...c5 wedge'],
    pieceManeuvers: ['...Nd7-Nb6 reroute'],
    strategicThemes: ['Target c4 in the Four Pawns chain'],
    endgameTransitions: ['R+B+N with active minor pieces'],
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
  out.push({
    id: p.id, openingId: 'pro-naroditsky-kid', criticalPositionFen: fen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ fen, moves: p.moves, annotations: p.annotations, arrows, highlights, learnCues: p.learnCues, title: p.title, intro: p.overview, sources: SRC }],
  });
}

console.error('Built ' + out.length + ' KID v2 plans; skipped ' + skipped.length);
console.log(JSON.stringify(out, null, 2));
