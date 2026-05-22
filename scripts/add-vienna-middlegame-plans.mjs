#!/usr/bin/env node
// Vienna masterclass middlegame plans — 5 plans, one per first-class tab.
// Hand-authored annotations grounded against board state (chess.js verifies
// every move; lead-the-eye markers are generated separately by
// scripts/add-leadeye-to-plans.mjs from the annotation text). Mirrors the
// pattern used by add-pirc-middlegame-plans.mjs / add-ruy-*-plans.mjs.
//
// Usage:  node scripts/add-vienna-middlegame-plans.mjs
// Then:   node scripts/add-leadeye-to-plans.mjs   (populates arrows/highlights)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANS_PATH = join(__dirname, '..', 'src', 'data', 'middlegame-plans.json');

/** Replay a PGN through chess.js, return the FEN after move N (0-indexed
 *  plycount, or full when undefined). Throws on illegal moves. */
function fenAfter(pgnTokens, plies) {
  const c = new Chess();
  const limit = plies ?? pgnTokens.length;
  for (let i = 0; i < limit; i++) {
    const m = c.move(pgnTokens[i]);
    if (!m) throw new Error(`illegal move ${pgnTokens[i]} at ply ${i}`);
  }
  return c.fen();
}

/** Build a playable-line object from a setup PGN + a continuation
 *  (the moves that actually play out in the middlegame) + annotations. */
function buildLine({ title, setupPgn, contMoves, annotations }) {
  if (contMoves.length !== annotations.length) {
    throw new Error(`${title}: ${contMoves.length} moves but ${annotations.length} annotations`);
  }
  const setupTokens = setupPgn.trim().split(/\s+/);
  const fen = fenAfter(setupTokens, setupTokens.length);
  // Verify every continuation move is legal from the setup position
  const c = new Chess(fen);
  for (const m of contMoves) {
    const ok = c.move(m);
    if (!ok) throw new Error(`${title}: illegal continuation move ${m}`);
  }
  return {
    title,
    fen,
    moves: contMoves,
    annotations,
    arrows: contMoves.map(() => []),       // populated by add-leadeye-to-plans.mjs
    highlights: contMoves.map(() => []),   // populated by add-leadeye-to-plans.mjs
  };
}

const VIENNA_PLANS = [
  // ── Classical (Main) ───────────────────────────────────────────
  {
    id: 'mp-viennagame-classical',
    openingId: 'vienna-game',
    title: 'Classical Vienna: the f5 Outpost Plan',
    criticalPositionFen: fenAfter('e4 e5 Nc3 Nf6 Bc4 Bc5 d3 O-O Nf3 d6 O-O c6 Bb3 Nbd7'.split(/\s+/), 14),
    overview: "The Classical Vienna's middlegame plan: White's c3-knight reroutes via e2 to g3, aiming for the f5 outpost — Lasker's immovable square. The Bb3-Bc2 bishop pivot loads a new diagonal toward h7, and d4 cracks the centre when White is fully coordinated. Patient build, decisive break.",
    pawnBreaks: [
      { move: 'd3-d4', explanation: 'After all minor pieces reach their attacking squares (Ne2-g3 toward f5, Bc2 toward h7), d4 opens the centre at the moment White is best coordinated.', fen: fenAfter('e4 e5 Nc3 Nf6 Bc4 Bc5 d3 O-O Nf3 d6 O-O c6 Bb3 Nbd7 Ne2 Bb6 c3 Nc5 Bc2 Bg4 Ng3 Nh5'.split(/\s+/), 22) },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nc3-e2-g3-f5', explanation: 'The signature Vienna knight reroute. From f5 the knight cannot be chased by a pawn (Lasker) and pressures d6, h6, and the kingside.' },
      { piece: 'Bishop', route: 'Bf1-c4-b3-c2', explanation: 'The Italian-Vienna bishop dance. After Black harasses with c6, the bishop swings to b3 then c2, abandoning the a2-g8 diagonal for the b1-h7 diagonal aimed at h7.' },
    ],
    strategicThemes: [
      'The f5 outpost is the prize the whole middlegame organises around — White spends three tempi to plant a knight there.',
      'The Bc2 reloads on the b1-h7 diagonal, loaded for the moment the centre opens.',
      'Black\'s …c6 and …Nbd7 setup creates the d6-c6 chain; d4 opens lines and exposes that pawn structure.',
    ],
    playableLines: [
      buildLine({
        title: 'Classical: Ne2-g3-f5 maneuver into the d4 break',
        setupPgn: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 O-O Nf3 d6 O-O c6 Bb3 Nbd7',
        contMoves: ['Ne2', 'Bb6', 'c3', 'Nc5', 'Bc2', 'Bg4', 'Ng3', 'Nh5', 'd4'],
        annotations: [
          'Ne2 begins the Vienna knight reroute. The c3-knight steps aside to clear the c-pawn for c3 next, then rides via g3 toward f5 — the immovable outpost.',
          '…Bb6 — Black tucks the bishop back, anticipating c3 + d4 lines that would attack the Bc5.',
          'c3 — the modest pawn move that prepares the d4 break and opens c2 as a future bishop square. Pure Vienna prep.',
          '…Nc5 — Black\'s knight jumps to c5 attacking the Bb3, forcing the bishop to commit to its destination.',
          'Bc2 — the bishop reloads on the b1-h7 diagonal, aimed at h7 once the centre opens. The Italian-Vienna pivot is complete.',
          '…Bg4 — Black pins the f3-knight, preparing his own kingside expansion with Nh5.',
          'Ng3 — the knight reaches g3, one square from the f5 outpost. The Vienna middlegame is fully coordinated.',
          '…Nh5 — Black\'s knight jumps to h5, the typical Vienna kingside-counter-expansion. The f6-knight wants to swing to f4 or contest g3.',
          'd4! — the central break lands. After ten moves of preparation, White cracks the centre at the moment every White piece is optimally placed.',
        ],
      }),
    ],
  },

  // ── Gambit ─────────────────────────────────────────────────────
  {
    id: 'mp-viennagame-gambit',
    openingId: 'vienna-game',
    title: 'Vienna Gambit: Lasker\'s Centre + Bishop Pair',
    criticalPositionFen: fenAfter('e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4'.split(/\s+/), 11),
    overview: 'After the Lasker counter (3…d5) and the central trades, White builds a huge d4-e5 pawn duo and plays for the bishop pair. The Bd3 lines up the b1-h7 diagonal, the c1-bishop will swing out, and Black is left with a structural pawn deficit on the queenside.',
    pawnBreaks: [
      { move: 'd3-d4', explanation: 'Already played. The d4 pawn anchors the centre alongside e5 — the Lasker-recommended setup that converts the gambit\'s tactical risk into a positional grip.', fen: fenAfter('e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4'.split(/\s+/), 11) },
    ],
    pieceManeuvers: [
      { piece: 'Bishop', route: 'Bf1-d3 (aimed at h7)', explanation: 'The Bd3 lines up the b1-h7 diagonal, the Vienna Gambit\'s standard attacking aim. Once the …c5 break opens lines, the bishop becomes decisive.' },
      { piece: 'Bishop', route: 'Bc1 (queen-side, swings out)', explanation: 'White\'s queen-bishop swings out via Be3 or Bg5, completing development and contributing the second half of the bishop pair to the attack.' },
    ],
    strategicThemes: [
      'The Lasker-line d4-e5 centre converts the gambit\'s pawn into a permanent positional bind.',
      'The bishop pair on d3 and c1 (later e3 or g5) aims at the kingside; Black\'s structure has no equivalent firepower.',
      '…c5 is Black\'s only counterplay, opening the long diagonal for his queen-bishop — but it concedes the d4-square and exposes c5 itself.',
    ],
    playableLines: [
      buildLine({
        title: 'Gambit: Lasker centre + Bd3 toward h7',
        setupPgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4',
        contMoves: ['O-O', 'Bd3', 'Nxc3', 'bxc3', 'c5', 'O-O', 'Nc6', 'Re1'],
        annotations: [
          '…O-O — Black hurries his king to safety, conscious that White\'s open f-file and bishop pair will land hard.',
          'Bd3 — the king-bishop occupies d3 with the diagonal aimed at h7. Standard Vienna Gambit development.',
          '…Nxc3 — Black trades the e4-knight, simplifying. The recapture is a key positional moment.',
          'bxc3 — White recaptures with the b-pawn instead of the d-pawn, retaining the big d4-e5 duo and the bishop pair.',
          '…c5 — Black\'s only meaningful break, attacking d4 and freeing his queen-bishop.',
          'O-O — White castles too. The position is settled; both sides are coordinated.',
          '…Nc6 — Black\'s queen-knight finally comes out to challenge d4.',
          'Re1 — the rook slides behind the e-pawn, supporting e5 and lined up against Black\'s king down the e-file.',
        ],
      }),
    ],
  },

  // ── vs 2…Nc6 ───────────────────────────────────────────────────
  {
    id: 'mp-viennagame-vs-nc6',
    openingId: 'vienna-game',
    title: 'vs 2…Nc6: Italian-Vienna Pressure on f7',
    criticalPositionFen: fenAfter('e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 Nf3 d6'.split(/\s+/), 10),
    overview: 'Against 2…Nc6 White chooses the Italian-Vienna setup — Bc4 plus the Vienna f4 lever held in reserve. The Bc4 aims at f7, Bg5 pins the Nf6, and a future Nd5 fork on f6 + c7 lurks. Slow squeeze with sharp tactical undercurrents.',
    pawnBreaks: [
      { move: 'f2-f4', explanation: 'The f4 lever, held in reserve, opens the f-file or shoves the e5-pawn out of the centre when White\'s pieces are ready.', fen: fenAfter('e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 Nf3 d6 O-O O-O'.split(/\s+/), 12) },
    ],
    pieceManeuvers: [
      { piece: 'Bishop', route: 'Bc1-g5 (pins the Nf6)', explanation: 'The queen-bishop swings to g5, pinning the f6-knight against the queen — the same pin Lasker named in his treatise on King\'s Pawn openings.' },
      { piece: 'Knight', route: 'Nc3-d5 (fork on f6 + c7)', explanation: 'Once Black is committed, Nd5 forks the f6-knight and threatens Nxc7+ winning the rook — the classic Italian-Vienna combination.' },
    ],
    strategicThemes: [
      'The Bc4 + Nc3 duo combines the Italian Game\'s f7 pressure with the Vienna\'s flexible knight.',
      'The f4 break is on call — White waits for the optimal moment, often after both sides castle.',
      'The Nd5 fork (Nf6 + c7) is a constant tactical threat; Black\'s …Be6 or …a6 deflate it.',
    ],
    playableLines: [
      buildLine({
        title: 'vs 2…Nc6: Italian-Vienna Bg5 pin + Nd5 fork',
        setupPgn: 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 Nf3 d6',
        contMoves: ['O-O', 'O-O', 'Bg5', 'h6', 'Bh4', 'Be6', 'Nd5', 'Qd7'],
        annotations: [
          'O-O — White castles short, completing kingside development. Both sides head into the middlegame fully coordinated.',
          '…O-O — Black castles too. The position is now classical Italian-Vienna territory.',
          'Bg5 — the queen-bishop pins the f6-knight against the queen. Same pin Lasker prescribed for King\'s Pawn openings.',
          '…h6 — Black puts the question to the bishop, asking it to commit or retreat.',
          'Bh4 — bishop retreats but stays on the diagonal, keeping the pin alive on the now-vulnerable f6-knight.',
          '…Be6 — Black challenges the Bc4 by offering a trade on the a2-g8 diagonal.',
          'Nd5! — the central knight jump. From d5 the knight forks the Nf6 AND threatens Nxc7 winning the rook. Black must defend twice.',
          '…Qd7 — Black sidesteps the queen off d8, unpinning the f6-knight AND defending c7 in one move. White has reached the standard middlegame with a small but enduring edge.',
        ],
      }),
    ],
  },

  // ── Frankenstein-Dracula ───────────────────────────────────────
  {
    id: 'mp-viennagame-frankenstein-dracula',
    openingId: 'vienna-game',
    title: 'Frankenstein-Dracula: Calmer 5…Be7 Middlegame',
    criticalPositionFen: fenAfter('e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7'.split(/\s+/), 10),
    overview: 'The MODERN grandmaster\'s answer to the Frankenstein-Dracula — instead of the wild 5…Nc6 (taught as a weapon lesson), Black plays the calmer 5…Be7. White recovers the pawn cleanly, retains the active queen on f4, and the position settles into a strategic middlegame where White\'s development edge tells.',
    pawnBreaks: [
      { move: 'd2-d4', explanation: 'White builds the centre with d4 after recovering the gambit pawn on e5, claiming control of the centre that Black cannot easily match.', fen: fenAfter('e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7 Qxe5 O-O d4'.split(/\s+/), 13) },
    ],
    pieceManeuvers: [
      { piece: 'Queen', route: 'Qd1-h5-e5-f4 (active centre)', explanation: 'The queen makes a circuit: Qh5 attacks, Qxe5 recovers the pawn, Qf4 settles on an active central square supporting d4 and eyeing the kingside.' },
      { piece: 'Knight', route: 'Ng1-e2 (developing past Qh5)', explanation: 'White\'s king-knight develops to e2 instead of f3, leaving the f3-square clear for the queen\'s retreat after Qf4 and supporting future Ng3 ideas.' },
    ],
    strategicThemes: [
      'The 5…Be7 line is calmer than 5…Nc6 but Black still cedes development time chasing White\'s queen.',
      'White\'s Bb3 + Qf4 + d4 + future Nge2 build a coherent attacking position; Black\'s pieces are awkwardly placed.',
      'The Nd6 knight is misplaced (blocks the d-pawn) and Black needs multiple moves to redeploy it.',
    ],
    playableLines: [
      buildLine({
        title: 'F-D: Calmer 5…Be7 then Qxe5 + d4 centre',
        setupPgn: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7',
        contMoves: ['Qxe5', 'O-O', 'd4', 'Nc6', 'Qf4', 'Na5', 'Bd5', 'Ne8'],
        annotations: [
          'Qxe5! — White recovers the pawn cleanly. The queen on e5 is active, defends nothing critical, and attacks the e7-bishop indirectly.',
          '…O-O — Black castles. The Nd6 is misplaced and blocks the d-pawn but Black accepts that for safety.',
          'd4 — the central pawn pushes forward. White now controls e4-d4-e5 ideas and has space.',
          '…Nc6 — Black develops the queen-knight, attacking the e5-queen and forcing the queen to move.',
          'Qf4 — the queen relocates to an active central square. From f4 she eyes Black\'s kingside and supports d4.',
          '…Na5 — Black\'s knight attacks the Bb3, hoping to trade off White\'s strong attacker.',
          'Bd5 — bishop sidesteps the attack onto a dominant central square instead of being traded. Now Black\'s Na5 looks misplaced too.',
          '…Ne8 — Black reroutes the Nd6 (which was blocking d-pawn ideas) via e8 to f6 or g7. Many moves of Black untangling; White stays a tempo ahead.',
        ],
      }),
    ],
  },

  // ── Paulsen (3.g3) ─────────────────────────────────────────────
  {
    id: 'mp-viennagame-paulsen',
    openingId: 'vienna-game',
    title: 'Paulsen: Nd5 Outpost + Long-Diagonal Bishop',
    criticalPositionFen: fenAfter('e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O O-O'.split(/\s+/), 12),
    overview: 'The Paulsen\'s slow squeeze. The Bg2 rakes the long light diagonal, the c3-knight reroutes via e2 toward d5 or g3, and White waits for the right moment to break with d3-d4 or f2-f4. Mamedyarov\'s favourite Vienna setup, leveraging quiet positional pressure over decades of theory.',
    pawnBreaks: [
      { move: 'd3-d4', explanation: 'The slow d4 break, executed when White\'s pieces are perfectly placed. Opens the long diagonal for the Bg2.', fen: fenAfter('e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O O-O a3 a6 d3 Bg4'.split(/\s+/), 16) },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nc3 (eyes d5)', explanation: 'The c3-knight stares at d5, ready to plant on the outpost once Black plays …c6 or trades the knight away.' },
      { piece: 'Knight', route: 'Nge2 (reroutes via f4 or g3)', explanation: 'The king-knight develops to e2 instead of f3, keeping options to reroute via f4 (attacking) or g3 (supporting) depending on what Black gives.' },
    ],
    strategicThemes: [
      'The Bg2 on the long light diagonal is the Paulsen\'s defining piece, screened by the e4-pawn until the centre opens.',
      'The Nd5 outpost is the dream — once a knight lands there, Black\'s position cracks.',
      'White waits patiently for Black to commit; the Paulsen rewards the player who improves every piece before striking.',
    ],
    playableLines: [
      buildLine({
        title: 'Paulsen: Slow build toward Nd5 outpost',
        setupPgn: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O O-O',
        contMoves: ['a3', 'a6', 'd3', 'Bg4', 'h3', 'Be6', 'Nd5', 'Bb6'],
        annotations: [
          'a3 — modest queenside expansion, preventing …Nb4 and preparing b4 in some lines.',
          '…a6 — Black mirrors the queenside prep, also keeping b5 in reserve.',
          'd3 — White solidifies the centre, locking in the structure. The Bg2 is still screened by e4.',
          '…Bg4 — Black pins the e2-knight, hoping to gain a small structural concession.',
          'h3 — White asks the bishop to decide: take and double White\'s pawns, or retreat.',
          '…Be6 — bishop retreats. The pin is gone; the position settles into pure manoeuvring.',
          'Nd5! — White lands the dream outpost. The knight on d5 attacks Black\'s f6-knight and e7 (covered by the bishop), supported by the e4-pawn and the c-pawn.',
          '…Bb6 — Black\'s bishop tucks away from the knight\'s reach. White has the outpost; the long Paulsen squeeze begins.',
        ],
      }),
    ],
  },
];

function main() {
  const plans = JSON.parse(readFileSync(PLANS_PATH, 'utf-8'));
  const before = plans.length;

  // Validate each new plan's PGN through chess.js before injection
  for (const p of VIENNA_PLANS) {
    if (!p.id || !p.openingId || !p.title) throw new Error(`bad plan: ${JSON.stringify(p).slice(0,80)}`);
  }

  // Remove any existing Vienna plans (so this script is idempotent)
  const filtered = plans.filter((p) => p.openingId !== 'vienna-game');
  const next = [...filtered, ...VIENNA_PLANS];

  writeFileSync(PLANS_PATH, JSON.stringify(next, null, 2) + '\n');
  console.log(`[vienna-plans] wrote ${VIENNA_PLANS.length} Vienna plans (${before} → ${next.length} total).`);
  console.log('[vienna-plans] now run: node scripts/add-leadeye-to-plans.mjs');
}

main();
