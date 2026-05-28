#!/usr/bin/env node
// Build middlegame + endgame plans for pro-naroditsky-caro-kann
// per G9.2. Plans use REAL most-played continuations pulled from
// the actual game tree (data/sources/danielnaroditsky-trees/
// caro-kann.json) — NEVER invented sequences. chess.js validates
// every move. Annotations + learn cues hand-authored on top of
// data-extracted moves.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const MP_PATH = 'src/data/middlegame-plans.json';
const DL = 'src/services/dataLoader.ts';
const TREE = JSON.parse(fs.readFileSync('data/sources/danielnaroditsky-trees/caro-kann.json', 'utf8'));

const ORANGE = 'rgba(255, 165, 0, 0.55)';

const CARO_SOURCES = [
  'book:caro-kann',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR',
];

// Walk the tree to the given prefix, then collect the most-played
// continuation N moves deep, picking the top child at each ply.
// minGames: refuse to extend if fewer than this many games on the path.
function continuation(prefixSans, depth, minGames = 3) {
  let node = TREE.tree;
  // Walk past the openingPrefix (e4 c6) which is the tree's root
  const treeRoot = TREE.minPrefix; // ['e4', 'c6']
  if (prefixSans.length < treeRoot.length) throw new Error('prefix too short');
  for (let i = 0; i < treeRoot.length; i++) {
    if (prefixSans[i] !== treeRoot[i]) throw new Error('prefix mismatch at ply ' + i);
  }
  for (let i = treeRoot.length; i < prefixSans.length; i++) {
    if (!node.children[prefixSans[i]]) throw new Error('no child for ' + prefixSans[i] + ' at depth ' + i);
    node = node.children[prefixSans[i]];
  }
  // Now walk the most-played continuation
  const out = [];
  for (let i = 0; i < depth; i++) {
    const kids = Object.entries(node.children);
    if (kids.length === 0) break;
    const sorted = kids.sort((a, b) => b[1].games - a[1].games);
    if (sorted[0][1].games < minGames) break;
    out.push(sorted[0][0]);
    node = sorted[0][1];
  }
  return out;
}

const PLANS = [];

// Per-plan helper — accepts a prefix string, walks the tree for the
// most-played continuation, attaches the hand-authored annotations.
function plan(id, prefix, depth, annotations, cues, meta) {
  const prefixSans = prefix.split(/\s+/).filter(Boolean);
  const moves = continuation(prefixSans, depth);
  if (moves.length === 0) {
    console.log('  SKIP ' + id + ' (no continuation found at depth ' + depth + ')');
    return;
  }
  PLANS.push({ id, prefix, prefixSans, moves, annotations: annotations.slice(0, moves.length), cues: cues.slice(0, moves.length), ...meta });
}

// ===========================================================
// ADVANCE c5 (Botvinnik-Carls)
// ===========================================================
const ADVANCE = 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7';

plan('mp-pronarocaro-advance-knight-reroute', ADVANCE, 10, [
  "White's Nbd2 starts the reroute Nb1 → Nd2 → Nb3 aiming at our Bc5.",
  "Ng6 — the prize-square reroute begins. Our Nge7 leaves the back rank, heading toward f4.",
  "Nb3 — White's knight attacks our bishop.",
  "Bb6 — bishop retreats one square, staying on the a7-g1 diagonal.",
  "Re1 — White lifts the rook behind the e-pawn.",
  "Qc7 — queen joins the queenside coordination on the c-file.",
  "a4 — White expands queenside, threatening a5.",
  "a6 — block the advance, claim b5 forever.",
  "Bg5 — White's dark-squared bishop activates.",
  "Nf4 — the knight LANDS on the prize square. Conversion to attack begins.",
], [
  "Nbd2 — reroute toward b3.",
  "Ng6 — to f4, the prize square.",
  "Nb3 — White hits the bishop.",
  "Bb6 — sidestep, keep diagonal.",
  "Re1 — White consolidates.",
  "Qc7 — c-file coordination.",
  "a4 — White expands.",
  "a6 — block, claim b5.",
  "Bg5 — White dark bishop active.",
  "Nf4 — land the prize square.",
], {
  title: "Advance — Ng6 → Nf4 knight reroute",
  overview: "The most-played knight-reroute plan from his Advance Caro games. The Nge7 → Ng6 → Nf4 three-move sequence lands on the prize square attacking Bd3 and pressuring White's centre.",
  pawnBreaks: ["…f6 challenging e5 once the knight is established","…b5 expanding under cover of Nf4"],
  pieceManeuvers: ["Nge7 → Ng6 → Nf4 in three moves","Queen lifts to c7 then to b6/a5 if needed","Bishop pair coordination from b6"],
  strategicThemes: ["The knight on f4 ties down the Bd3","Light-square outposts dominate the kingside"],
  endgameTransitions: ["After the Nf4 / Bd3 trade, the bishop+knight endgame favors Black's solid pawn chain"],
});

// ===========================================================
// TWO KNIGHTS (2.Nc3)
// ===========================================================
const TWO_KNIGHTS = 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2';

plan('mp-pronarocaro-twoknights-b5-coord', TWO_KNIGHTS, 10, [
  "b5 — kick the bishop to b3. Queenside expansion begins.",
  "Bb3 — bishop retreats, staring at granite (the b5-pawn).",
  "Qc7 — queen activates on the c-file.",
  "a4 — White probes the queenside.",
  "b4 — push through the queenside, gaining space.",
  "Nbd1 — White reroutes the queen-knight.",
  "a5 — clamp the queenside shut.",
  "c4 — White tries the central break.",
  "Bd6 — finally develop the dark-squared bishop, aimed at h2.",
  "d4 — White pushes the c-pawn through. We're well-coordinated.",
], [
  "b5 — kick the bishop.",
  "Bb3 — bishop on granite.",
  "Qc7 — c-file queen.",
  "a4 — White probes.",
  "b4 — expansion through.",
  "Nbd1 — White reroutes.",
  "a5 — clamp queenside.",
  "c4 — White central break.",
  "Bd6 — dark bishop active.",
  "d4 — White's pawn push.",
], {
  title: "Two Knights — b5 + Qc7 queenside coordination",
  overview: "The dominant Two Knights middlegame plan from his 743-game corpus. The b5 push kicks the bishop to b3 and starts the queenside expansion; Qc7 + later …Bd6 coordinate the position. From here Black holds long-term structural advantages.",
  pawnBreaks: ["…b4 expanding further","…a5 clamping White's queenside"],
  pieceManeuvers: ["Bishop fianchetto Bb7 in some lines","Queen to c7 then often Qb6","Rook lifts to c8"],
  strategicThemes: ["Queenside space + bishop pair compensation","White's pieces have nowhere to go after the queenside clamp"],
  endgameTransitions: ["Often reaches R+minor+P with the queenside majority converting"],
});

// ===========================================================
// KIA / RÉTI (2.Nf3)
// ===========================================================
const KIA = 'e4 c6 Nf3 d5 d3 Qc7 Nc3 dxe4 dxe4 e5 Bc4';

plan('mp-pronarocaro-kia-b5-expansion', KIA, 10, [
  "b5 — queenside expansion. Now we own b5 forever.",
  "Bb3 — bishop retreats to b3.",
  "h6 — preventive move freezing kingside committal from White.",
  "a4 — White probes the queenside.",
  "Bb7 — bishop fianchettoes. The Bb7 + c6-d5 chain dominates.",
  "axb5 — White trades pawns.",
  "cxb5 — recapture. The c-file is now open AND the d-file remains open.",
  "Re1 — White's rook activates.",
  "Bd6 — develop the dark-squared bishop. Opening setup complete.",
  "Nh4 — White's last development move.",
], [
  "b5 — queenside expansion.",
  "Bb3 — bishop on granite.",
  "h6 — freeze kingside.",
  "a4 — White probes.",
  "Bb7 — fianchetto bishop.",
  "axb5 — trade pawns.",
  "cxb5 — open two files.",
  "Re1 — White e-file.",
  "Bd6 — dark bishop.",
  "Nh4 — both developed.",
], {
  title: "KIA — b5 expansion + Bb7 fianchetto",
  overview: "The most-played KIA middlegame plan. The b5 push starts queenside expansion; Bb7 fianchetto plus the c6-d5 chain dominates the long diagonal. White's KIA setup never gets off the ground.",
  pawnBreaks: ["…b4 expanding further","…h5/h6 freezing kingside","…f5 in some lines"],
  pieceManeuvers: ["Bb7 fianchetto","Knight reroute via Nbd7","Queen on c7 ties everything together"],
  strategicThemes: ["The Bb7 + c6-d5 setup is rock-solid","White's KIA is too cramped to fight"],
  endgameTransitions: ["Often middlegame finishes; when endgames happen, R+minor+P with structural advantage"],
});

// ===========================================================
// EXCHANGE (3.exd5)
// ===========================================================
const EXCHANGE = 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3';

plan('mp-pronarocaro-exchange-bg4-pin', EXCHANGE, 10, [
  "Bg4 — develop the problem-bishop to an active diagonal. The pin pressure is set up.",
  "Qb3 — White attacks b7.",
  "Qc7 — quietly defends and prepares queenside coordination.",
  "h3 — White challenges the bishop.",
  "Bh5 — bishop retreats keeping the diagonal alive.",
  "Ne2 — White develops the king-knight.",
  "e6 — supporting d5, completing the structural base.",
  "Bxe2 — Black trades for the knight if White offers.",
  "Bxe2 — White recaptures with the queen-knight bishop.",
  "Bd6 — Black develops the dark-squared bishop. Equal but Black has slightly more comfortable pieces.",
], [
  "Bg4 — pin setup.",
  "Qb3 — White attacks b7.",
  "Qc7 — quiet defence.",
  "h3 — challenge bishop.",
  "Bh5 — keep diagonal.",
  "Ne2 — White develops.",
  "e6 — support d5.",
  "Bxe2 — trade.",
  "Bxe2 — recapture.",
  "Bd6 — dark bishop.",
], {
  title: "Exchange — Bg4 pin + structural pressure",
  overview: "The Exchange Caro middlegame plan that capitalizes on the symmetrical structure. Bg4 develops the problem-bishop with bite — pinning toward White's queen and threatening doubled f-pawns if the trade happens.",
  pawnBreaks: ["…e6 supporting d5","…e5 if the position opens up","Queenside b5 push"],
  pieceManeuvers: ["Bg4 pin","Queen on c7 covers b7","Knight via Nbd7 or Nc6"],
  strategicThemes: ["Develop one tempo faster than the symmetrical position allows","Bishop pair often emerges from trades"],
  endgameTransitions: ["Often R+minor+P or pure R+P with structural edge"],
});

// ===========================================================
// CLASSICAL TARTAKOWER
// ===========================================================
const CLASSICAL = 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5';

plan('mp-pronarocaro-classical-kingside-storm', CLASSICAL, 10, [
  "O-O — White finally castles.",
  "h4 — Black continues the kingside pawn storm from h5. The h-pawn punches deeper, freezing White's kingside committal moves and preparing future …h3 cracks.",
  "Nf4 — White's knight to the prize square. Defensive — blocks the h-pawn's path and parks on a strong central outpost.",
  "Nd7 — knight finally develops, the start of the three-move reroute via f8 to g6.",
  "Re1 — White's rook matches ours on the e-file.",
  "Nf8 — knight to f8, the prize-square setup continues.",
  "Bf4 — White's bishop joins the kingside defense.",
  "Ng6 — our knight reaches its target square. The Nd7-Nf8-Ng6 reroute is complete.",
  "Nxg6 — White trades knights to remove our attacker.",
  "fxg6 — recapture toward the centre. Doubled f-pawns become a wedge; the h-pawn structure plus open g-file converge on the kingside.",
], [
  "O-O — castle.",
  "h4 — push the storm.",
  "Nf4 — White blocks.",
  "Nd7 — reroute begins.",
  "Re1 — matched.",
  "Nf8 — to prize square.",
  "Bf4 — White defends.",
  "Ng6 — reroute complete.",
  "Nxg6 — trade knights.",
  "fxg6 — wedge structure.",
], {
  title: "Classical Tartakower — kingside pawn storm + Nd7-Nf8-Ng6 reroute",
  overview: "The dominant Classical Tartakower plan. Per the third-party Naroditsky teaching source (TheChessLobster), he calls Bd6 'a very natural developing move' three times in his Tartakower masterclass. The kingside pawn storm (…h5-h4) combines with the Nd7-Nf8-Ng6 knight reroute (mirroring the Advance Caro pattern) for a coordinated attack.",
  pawnBreaks: ["…h5-h4 — kingside pawn storm freezing White's structure","…h3 cracking open the kingside in some lines","…f5 once the structural setup is complete"],
  pieceManeuvers: ["Nd7 → Nf8 → Ng6 reroute","Queen lifts via Qd6 or Qf6","Bishop pair stays active"],
  strategicThemes: ["Doubled f-pawns become an asset through the half-open e-file","Kingside attack converges on h2/g3 squares"],
  endgameTransitions: ["R+minor+P with the doubled f-pawns becoming a passed pawn lever"],
});

// ===========================================================
// FANTASY (3.f3)
// ===========================================================
const FANTASY = 'e4 c6 d4 d5 f3';

plan('mp-pronarocaro-fantasy-central-break', FANTASY, 10, [
  "dxe4 — the forcing reply. White's centre crumbles.",
  "fxe4 — White recaptures, opening the f-file. White's kingside is wrecked from move 4.",
  "e5 — central counter. Hit the d4-pawn directly.",
  "Nf3 — White develops normally.",
  "Bg4 — pin the f3-knight, double the pressure.",
  "Bc4 — White develops.",
  "Nd7 — develop the knight, prepare …Ngf6.",
  "O-O — White castles.",
  "Ngf6 — develop the kingside knight.",
  "c3 — White consolidates.",
], [
  "dxe4 — force the decision.",
  "fxe4 — White structure cracked.",
  "e5 — counter the centre.",
  "Nf3 — White develops.",
  "Bg4 — pin the knight.",
  "Bc4 — White develops.",
  "Nd7 — knight reroutes.",
  "O-O — White castles.",
  "Ngf6 — knight develops.",
  "c3 — White consolidates.",
], {
  title: "Fantasy — central break refutation (the 75% plan)",
  overview: "The dominant Fantasy refutation plan. After the f3 wasted tempo, dxe4 + fxe4 + e5 cracks open the centre. Black's bishop pair + active pieces vs White's wrecked kingside structure converts at 75% — his highest-scoring Caro variation.",
  pawnBreaks: ["…b5 once attack is firing","…c5 in some lines"],
  pieceManeuvers: ["Bg4 pin","Knight via Nd7 then Ngf6","Bishop pair coordination"],
  strategicThemes: ["f2 is the permanent weakness from f3","White's pieces have no good squares"],
  endgameTransitions: ["Most games end mid-board; when endgames happen, R+minor+P or Q+P with material edge"],
});

// ===========================================================
// MODERN TRANSPOSITION (2.d4 g6)
// ===========================================================
const MODERN = 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5 h3';

plan('mp-pronarocaro-modern-trade-and-develop', MODERN, 10, [
  "dxe4 — Black trades pawns.",
  "Nxe4 — White recaptures.",
  "Nf6 — attack the e4-knight.",
  "Nxf6+ — White trades.",
  "exf6 — recapture with the e-pawn, keeping the Bg7's diagonal intact.",
  "c3 — White's preparatory move.",
  "O-O — Black castles.",
  "Bd3 — White develops.",
  "Re8 — rook to the e-file. Half-open file activates the rook.",
  "Qc2 — White builds the standard battery.",
], [
  "dxe4 — trade pawns.",
  "Nxe4 — recapture.",
  "Nf6 — attack knight.",
  "Nxf6+ — trade.",
  "exf6 — keep diagonal.",
  "c3 — White prep.",
  "O-O — Black castles.",
  "Bd3 — White bishop.",
  "Re8 — rook to e-file.",
  "Qc2 — White battery.",
], {
  title: "Modern transposition — Nf6 trade + structural conversion",
  overview: "The Modern Transposition's main plan from his 185-game corpus. The Nf6 attack on the e4-knight forces trades; exf6 (not gxf6) keeps the Bg7's long diagonal alive. From here Black has the dominant bishop + half-open e-file.",
  pawnBreaks: ["…dxe4 trades pawns and opens the e-file","…exf6 keeps the Bg7's diagonal alive"],
  pieceManeuvers: ["Nf6 attack on the e4-knight","Re8 activates the rook on the half-open e-file","Bg7 dominates the long diagonal"],
  strategicThemes: ["Bg7 + structured pawns","White's slightly easier development can't be converted"],
  endgameTransitions: ["R+minor+P often with the Bg7 as the conversion piece"],
});

// ===========================================================
// VALIDATE + APPLY
// ===========================================================

console.log('Validating ' + PLANS.length + ' plans...');
let validated = 0, failed = 0;
for (const p of PLANS) {
  try {
    const c = new Chess();
    for (const m of p.prefixSans) c.move(m);
    p.criticalPositionFen = c.fen();
    for (const m of p.moves) c.move(m);
    validated++;
    console.log('  OK ' + p.id + ' (' + p.moves.length + ' moves)');
  } catch (e) {
    console.log('  FAIL ' + p.id + ': ' + e.message);
    failed++;
  }
}
console.log('legality: ' + validated + ' pass / ' + failed + ' fail');
if (failed > 0) { console.log('Aborting.'); process.exit(1); }

const planEntries = PLANS.map((p) => {
  const arrows = [];
  const highlights = [];
  const c = new Chess(p.criticalPositionFen);
  for (const m of p.moves) {
    const mr = c.move(m);
    arrows.push([]);
    highlights.push(mr ? [
      { square: mr.from, color: ORANGE },
      { square: mr.to, color: ORANGE },
    ] : []);
  }
  return {
    id: p.id,
    openingId: 'pro-naroditsky-caro-kann',
    criticalPositionFen: p.criticalPositionFen,
    title: p.title,
    overview: p.overview,
    pawnBreaks: p.pawnBreaks,
    pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes,
    endgameTransitions: p.endgameTransitions,
    playableLines: [{
      fen: p.criticalPositionFen,
      moves: p.moves,
      annotations: p.annotations,
      arrows,
      highlights,
      learnCues: p.cues,
      title: p.title,
      intro: p.overview.slice(0, 200),
      sources: CARO_SOURCES,
    }],
  };
});

const mpRaw = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));
const existing = Array.isArray(mpRaw) ? mpRaw : (mpRaw.plans || []);
const cleaned = existing.filter((p) => p.openingId !== 'pro-naroditsky-caro-kann');
const updated = [...cleaned, ...planEntries];
fs.writeFileSync(MP_PATH, JSON.stringify(updated, null, 2) + '\n');
console.log('middlegame-plans.json: removed ' + (existing.length - cleaned.length) + ' old + added ' + planEntries.length + ' new (' + updated.length + ' total)');

const today = new Date().toISOString().slice(0, 10);
const dl = fs.readFileSync(DL, 'utf8');
const newDl = dl.replace(/const PRO_DATA_REVISION = '[^']+';/, `const PRO_DATA_REVISION = '${today}-caro-plans-real-games';`);
if (newDl !== dl) fs.writeFileSync(DL, newDl);
console.log('Done.');
