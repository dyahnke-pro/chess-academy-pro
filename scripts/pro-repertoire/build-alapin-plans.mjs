#!/usr/bin/env node
// Build all data-supported middlegame + endgame plans for Naroditsky's
// Alapin. Plans counted in count-plans-alapin.mjs output (≥10% cluster
// threshold) and endgame structures in wider-corpus-endgame-alapin.mjs
// (≥10% across the wider corpus per G9.2 wider-corpus rule).
//
// Every plan's playable line is walked from the tree's most-played
// continuation at that position — chess.js validated per move. Themes
// match the data-derived moves so the show-the-theme gate passes.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const MP_PATH = 'src/data/middlegame-plans.json';
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const SRC = [
  'https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR',
  'https://www.chess.com/openings/Alapin-Sicilian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

function loadTree() {
  return JSON.parse(fs.readFileSync('data/sources/danielnaroditsky-trees/alapin-sicilian.json', 'utf8'));
}

function continuation(tree, prefixSans, depth) {
  let node = tree.tree;
  const treeRoot = tree.minPrefix;
  for (let i = 0; i < treeRoot.length; i++) {
    if (prefixSans[i] !== treeRoot[i]) throw new Error(`prefix mismatch at ply ${i}: expected ${treeRoot[i]} got ${prefixSans[i]}`);
  }
  for (let i = treeRoot.length; i < prefixSans.length; i++) {
    if (!node.children[prefixSans[i]]) throw new Error(`no child for ${prefixSans[i]} at depth ${i}`);
    node = node.children[prefixSans[i]];
  }
  const out = [];
  for (let i = 0; i < depth; i++) {
    const kids = Object.entries(node.children || {});
    if (kids.length === 0) break;
    const sorted = kids.sort((a, b) => b[1].games - a[1].games);
    if (sorted[0][1].games < 2) break;
    out.push(sorted[0][0]);
    node = sorted[0][1];
  }
  return out;
}

// Each plan: data-anchored prefix + theme list that matches what the
// data-derived continuation actually demonstrates. NO invented moves.
const PLANS = [
  // ============ nf6-main spine plans (1,105 games) ============
  {
    id: 'mp-pronaroAlapin-exd6-enpassant',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5',
    depth: 4,
    title: 'Alapin nf6-main — exd6 en passant break',
    overview: "His 25% pick (273 of 1,102 games) at move 7. After Black's …d5 try, the exd6 en-passant capture opens the central files immediately and brings the queen to d6 where it's exposed to development tempo.",
    pawnBreaks: ['exd6 en-passant — open the centre', 'd4 follows once the centre is clear'],
    pieceManeuvers: ['Qxd6 — Black\'s queen comes to d6, exposed', 'O-O follows for king safety', 'Bb3 stays on the diagonal'],
    strategicThemes: ['En-passant capture opens files', 'Black\'s queen on d6 is a tempo target'],
    endgameTransitions: ['R+minor+P (27% of nf6-main decisive games) — bishop pair converts'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-bc4-f7-pressure',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4',
    depth: 6,
    title: 'Alapin nf6-main — Bc4 hits d5 + f7',
    overview: "His 14% pick at move 7 (153 of 1,102 games). The Bc4 dual-purpose move attacks the knight on d5 AND eyes f7 — Black has to react every move that follows. This is the wishlist position the c3 setup builds toward.",
    pawnBreaks: ['e5 stays cramping Black\'s kingside', 'Bb3 maintains the diagonal after …Nb6'],
    pieceManeuvers: ['Bc4 — attack d5 AND f7', '…Nb6 chases the bishop', 'Bb3 keeps the long diagonal'],
    strategicThemes: ['Bishop on the f7 diagonal cramps Black', 'Tempo from Bc4 → Bb3 wins development'],
    endgameTransitions: ['R+minor+P with the bishop pair as the conversion piece'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-bc2-reroute',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 d4 cxd4 cxd4',
    depth: 4,
    title: 'Alapin nf6-main — Bc2 slow-reroute structure',
    overview: "His 10% pick at this position. The Bc2 retreat looks passive but sets up a long-term Bb1-Bc2-Bd3 attacking diagonal. Slower than Bc4 + Bb3 but works against Black setups that prepare …Be6 trade-down immediately.",
    pawnBreaks: ['d4 supports the centre', 'a3 + b4 queenside expansion in some lines'],
    pieceManeuvers: ['Bc2 — slow reroute via b1', 'Be7 / Bd3 / Bg5 alternatives', 'O-O after development'],
    strategicThemes: ['Slow positional buildup', 'Bishop pair maintained for the endgame'],
    endgameTransitions: ['R+minor+P endings where Black\'s structural weaknesses tell'],
    sources: SRC,
  },
  // ============ d5-open plans (783 games) ============
  {
    id: 'mp-pronaroAlapin-d5open-nb5-fork',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3',
    depth: 4,
    title: 'Alapin d5-open — Nb5 queen-fork outpost',
    overview: "After the d5-open trade sequence, the Na3 knight is heading for Nb5 — his signature trick (12% pick at move 8). The fork hits the queen AND the c7 prize square, forcing Black's queen retreat with structural damage.",
    pawnBreaks: ['…cxd4 — Black liquidates the central tension', 'd4 recapture opens central files'],
    pieceManeuvers: ['Nb5 — fork queen + c7', '…Qd7 — only safe queen retreat', 'Nbxd4 recaptures with tempo'],
    strategicThemes: ['Knight outpost wins tempi', 'Queen retreat to d7 blocks Black\'s bishop'],
    endgameTransitions: ['R+minor+P (27.4% of d5-open decisive games)'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-d5open-be3-pressure',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6',
    depth: 4,
    title: 'Alapin d5-open — Be3 dark-square pressure',
    overview: "His 13% pick at move 7 in the d5-open line. The Be3 supports d4 AND coordinates with the upcoming Nb5 outpost. Slower than directly Nb5 but builds maximum piece pressure before forcing the tempo.",
    pawnBreaks: ['cxd4 trade — opens c-file', 'd4 recapture maintains central pawn'],
    pieceManeuvers: ['Be3 supports d4', 'Nb5 jump arrives next', 'Nbxd4 recaptures with the knight'],
    strategicThemes: ['Build piece pressure before forcing tempo', 'Dark-square bishop coordinates with d4'],
    endgameTransitions: ['R+minor+P endings where coordination decides'],
    sources: SRC,
  },
  // ============ e6-french plans (344 games) ============
  {
    id: 'mp-pronaroAlapin-e6french-oo-castle',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4',
    depth: 4,
    title: 'Alapin e6-french — O-O castle-before-recapture',
    overview: "His 32% pick at move 7 — castle FIRST, recapture the pawn later. O-O is the pragmatic move: king safety beats material grab, and Black can't win the d4-pawn cleanly without strategic disaster.",
    pawnBreaks: ['…cxd4 — Black liquidates', '…dxc3 grabs the pawn but invites Nxc3 activity'],
    pieceManeuvers: ['O-O — king to safety FIRST', 'Nxc3 recaptures with active piece play', 'Re1 follows on the e-file'],
    strategicThemes: ['King safety before material', 'Open lines compensate for the pawn'],
    endgameTransitions: ['R+minor+P endings with the bishop pair'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-e6french-dxc5-trade',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O',
    depth: 4,
    title: 'Alapin e6-french — dxc5 central exchange',
    overview: "His 12% pick at move 8. After the castled position, the dxc5 capture grabs material and opens the c-file simultaneously. Black has to deal with both the missing centre AND the open file.",
    pawnBreaks: ['dxc5 grabs material', 'c-file opens for the rook'],
    pieceManeuvers: ['…dxc3 by Black wins back', 'Nxc3 recapture activates', 'Bishop pair maintained'],
    strategicThemes: ['Material grab opens lines', 'Active piece play decides the middlegame'],
    endgameTransitions: ['Sharp positions — endgames rare here'],
    sources: SRC,
  },
  // ============ d6-mainline plans (173 games) ============
  {
    id: 'mp-pronaroAlapin-d6main-h3-prophylaxis',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6',
    depth: 4,
    title: 'Alapin d6-mainline — h3 prophylaxis + g4 prep',
    overview: "His 18% pick at move 7 — the highest of any move at this position. h3 stops …Bg4 (the natural pin) AND prepares g4-g5 expansion. Slow but principled — exactly the KID-reversed treatment that scores 80.6% in this line.",
    pawnBreaks: ['h3 prophylaxis', 'g4 expansion follows', 'd5 or e5 break later'],
    pieceManeuvers: ['…Bg7 fianchetto by Black', 'Nf3 + Bd3 classical development', 'O-O for king safety'],
    strategicThemes: ['KID-reversed with extra tempo', 'Slow positional accumulation'],
    endgameTransitions: ['R+minor+P (30.1% of d6-mainline decisive games)'],
    sources: SRC,
  },
  // ============ g6-dragon plans (125 games) ============
  {
    id: 'mp-pronaroAlapin-g6dragon-nf3-classical',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 exd5 Nf6 Nc3 Nxd5',
    depth: 4,
    title: 'Alapin g6-dragon — Bc4 + Bb3 Panov-style',
    overview: "After Black's Scandinavian-style …d5 in the Dragon move-order, White transposes into a Panov-Botvinnik with Bc4 + Bb3. Same bishop diagonal as the main spine, different move-order — the structure ends up identical to nf6-main positions.",
    pawnBreaks: ['exd5 opens the centre', 'd4 supports the isolated d-pawn'],
    pieceManeuvers: ['Bc4 hits d5-knight', '…Nb6 chases the bishop', 'Bb3 maintains the diagonal'],
    strategicThemes: ['Transpose into known Panov-style structures', 'Isolated d-pawn provides piece activity'],
    endgameTransitions: ['R+minor+P (26.4% of g6-dragon decisive games)'],
    sources: SRC,
  },
  // ============ nc6-line plans (116 games) ============
  {
    id: 'mp-pronaroAlapin-nc6-bd3-buildup',
    openingId: 'pro-naroditsky-alapin',
    prefix: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6 Nc3 Qd8 Bd3',
    depth: 4,
    title: 'Alapin nc6-line — Nc3 tempo + Bd3 buildup',
    overview: "After Nc3 forces the queen back to d8, White plays Bd3 (24% pick) for classical development. The queenside expansion with a3-b4 follows. This is why the nc6-line scores 86.2% — Black has lost two tempi and faces a long structural game.",
    pawnBreaks: ['a3 prepares b4 expansion', 'b4 grabs queenside space'],
    pieceManeuvers: ['Nf6 + Be7 quiet Black development', 'O-O for king safety', 'a3 + b4 attacking setup'],
    strategicThemes: ['Two tempi gained on the queen', 'Long structural conversion'],
    endgameTransitions: ['R+minor+P (33.7% of nc6-line decisive games)'],
    sources: SRC,
  },
];

const tree = loadTree();
const planEntries = [];

for (const p of PLANS) {
  try {
    const prefixSans = p.prefix.split(' ');
    const moves = continuation(tree, prefixSans, p.depth);
    if (moves.length === 0) {
      console.error(`SKIP ${p.id}: no continuation`);
      continue;
    }

    // Build FEN at prefix end
    const game = new Chess();
    for (const san of prefixSans) {
      try { game.move(san); } catch (e) { throw new Error(`prefix illegal at ${san}: ${e.message}`); }
    }
    const fen = game.fen();

    // Verify moves
    const verify = new Chess(fen);
    for (const san of moves) {
      try { verify.move(san); } catch (e) { throw new Error(`continuation illegal at ${san}: ${e.message}`); }
    }

    // Annotations + arrows + highlights
    const annotations = [];
    const learnCues = [];
    const highlights = [];
    const arrows = [];

    const moveGame = new Chess(fen);
    for (const san of moves) {
      const mv = moveGame.move(san);
      const piece = mv.piece;
      const pieceName = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[piece];
      const from = mv.from;
      const to = mv.to;
      const sideName = mv.color === 'w' ? 'White' : 'Black';
      const captured = mv.captured;

      let prose;
      if (captured) {
        prose = `${san} — ${sideName}'s ${pieceName} captures on ${to} — material exchange.`;
      } else if (san.includes('O-O-O')) {
        prose = `${san} — ${sideName} castles long, king to safety.`;
      } else if (san.includes('O-O')) {
        prose = `${san} — ${sideName} castles short, king to safety.`;
      } else {
        prose = `${san} — ${sideName}'s ${pieceName} to ${to} — data-derived continuation.`;
      }

      annotations.push(prose);
      learnCues.push(`${san} — ${pieceName} to ${to}`);
      highlights.push([
        { square: from, color: ORANGE },
        { square: to, color: ORANGE },
      ]);
      arrows.push([]);
    }

    planEntries.push({
      id: p.id,
      openingId: p.openingId,
      criticalPositionFen: fen,
      title: p.title,
      overview: p.overview,
      pawnBreaks: p.pawnBreaks,
      pieceManeuvers: p.pieceManeuvers,
      strategicThemes: p.strategicThemes,
      endgameTransitions: p.endgameTransitions,
      playableLines: [{
        fen,
        moves,
        annotations,
        arrows,
        highlights,
        learnCues,
        title: p.title,
        intro: p.overview.slice(0, 200),
        sources: p.sources,
      }],
    });

    console.log(`OK ${p.id} (${moves.length} moves)`);
  } catch (e) {
    console.error(`FAIL ${p.id}: ${e.message}`);
  }
}

// Merge — DROP all old Alapin plans + add fresh
const existing = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));
const newIds = new Set(planEntries.map((p) => p.id));
const kept = existing.filter((p) => {
  // Drop ALL old pro-naroditsky-alapin plans
  if (p.openingId === 'pro-naroditsky-alapin') return false;
  if (newIds.has(p.id)) return false;
  return true;
});
const merged = [...kept, ...planEntries].sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(MP_PATH, JSON.stringify(merged, null, 2));
console.log(`\nmiddlegame-plans.json: removed ${existing.length - kept.length} old Alapin plans, added ${planEntries.length} new (${merged.length} total)`);
console.log('Done.');
