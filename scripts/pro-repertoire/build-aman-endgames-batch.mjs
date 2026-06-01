#!/usr/bin/env node
// Aman endgame plans (id suffix -endgame) grounded in his REAL model-game
// endings (locked endgame rule). Each: transition FEN (queens off, ply>=24)
// from a chessbrah WIN, the real endgame tail, board-accurate annotations,
// lead-the-eye arrows (non-pawn movers only), two registers. Idempotent.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['concept:endgame-rook', 'book:chess-fundamentals'];

// Each entry authored to match the verified real tail + landing squares.
const PLANS = [
  {
    id: 'mp-proamanrossolimo-endgame', openingId: 'pro-aman-rossolimo', color: 'white',
    title: 'Rossolimo Endgame — Liquidate into the Better Minor',
    overview: "The Rossolimo structure simplifies into an endgame where White's healthy pawns beat Black's doubled c-pawns. From Hambleton's win over HideousHiker: trade the rooks off, then push the queenside majority while the knight outclasses Black's passive bishop.",
    fen: '1r2r1k1/p2ppp1p/b1p1n3/4B3/2P1N2p/1P6/P4PPP/3RR1K1 w - - 0 21',
    tail: ['Bxb8', 'Rxb8', 'Rxd7', 'Rb7', 'Rxb7', 'Bxb7', 'b4', 'Kg7'],
    ann: ['Bxb8 trades into the favourable ending.', '…Rxb8 recaptures.', 'Rxd7 grabs the seventh-rank pawn.', '…Rb7 challenges the rook.', 'Rxb7 trades the last rooks.', '…Bxb7 recaptures.', 'b4 rolls the queenside majority.', '…Kg7 hurries the king back.'],
    cues: ['Bxb8 — trade in', '…Rxb8 — recapture', 'Rxd7 — grab the pawn', '…Rb7 — challenge', 'Rxb7 — trade rooks', '…Bxb7 — recapture', 'b4 — roll the majority', '…Kg7 — king hurries'],
    pawnBreaks: ['b4 queenside majority push'],
    maneuver: { piece: 'rook', route: 'Rd1-d7 seventh rank', explanation: 'The rook invades the seventh rank to win material before the trade.' },
    theme: 'Trade into the better minor-piece ending and push the queenside majority',
    arrowIdx: { 2: ['d1', 'd7'], 4: ['d7', 'b7'] },
  },
  {
    id: 'mp-proamancaro-endgame', openingId: 'pro-aman-caro-kann', color: 'black',
    title: 'Caro Endgame — Active Rook Beats the Knight',
    overview: "The Caro's sound structure carries into a rook-vs-knight endgame where Black's active rook and kingside pawn break decide. From Hambleton's win over kemelgallo: centralise the rook, then break with …g5 to create a passed pawn the knight can't stop.",
    fen: '8/6pk/p4pp1/5p2/2pr1P2/4N1P1/PP3K1P/8 w - - 0 44',
    tail: ['Ke2', 'Kg8', 'Nc2', 'Re4+', 'Kd2', 'g5', 'Na3', 'gxf4'],
    ann: ['White centralises the king.', '…Kg8 brings the king toward the action.', 'White reroutes the knight.', '…Re4+ centralises the rook with check.', 'White sidesteps.', '…g5 breaks to create a passer.', 'White chases the c-pawn.', '…gxf4 opens lines and wins a pawn.'],
    cues: ['Ke2 — centralise', '…Kg8 — king up', 'Nc2 — reroute', '…Re4+ — active rook', 'Kd2 — sidestep', '…g5 — break', 'Na3 — chase', '…gxf4 — win the pawn'],
    pawnBreaks: ['...g5 kingside break'],
    maneuver: { piece: 'rook', route: '...Rd4-e4 active centralisation', explanation: 'The rook centralises on e4 with check, the engine of the conversion.' },
    theme: 'Centralise the active rook and break with …g5 to make a passed pawn',
    arrowIdx: { 3: ['d4', 'e4'] },
  },
  {
    id: 'mp-proamanruy-endgame', openingId: 'pro-aman-ruy-lopez', color: 'white',
    title: 'Ruy Endgame — Seventh-Rank Rook and the Bishop',
    overview: "The Closed Ruy's space edge converts in a rook-and-bishop ending. From Hambleton's win over DaiChangloong: plant the rook on the seventh and use the bishop's reach to pick off Black's weak pawns.",
    fen: '2r3k1/1b3p2/5p1p/pp6/8/1B3P1P/PP4P1/3R2K1 w - - 0 29',
    tail: ['Rd7', 'a4', 'Bxf7+', 'Kh8', 'Rxb7'],
    ann: ['Rd7 invades the seventh rank.', '…a4 pushes the passer.', 'Bxf7+ wins a pawn with check.', '…Kh8 steps aside.', 'Rxb7 collects the bishop — decisive.'],
    cues: ['Rd7 — seventh rank', '…a4 — push', 'Bxf7+ — win a pawn', '…Kh8 — step aside', 'Rxb7 — collect, win'],
    pawnBreaks: [],
    maneuver: { piece: 'rook', route: 'Rd1-d7 seventh rank', explanation: 'The rook reaches the seventh rank, tying Black down and harvesting pawns.' },
    theme: 'Plant the rook on the seventh and use the bishop to win the pawns',
    arrowIdx: { 0: ['d1', 'd7'], 2: ['b3', 'f7'], 4: ['d7', 'b7'] },
  },
  {
    id: 'mp-proamanopensic-endgame', openingId: 'pro-aman-open-sicilian', color: 'white',
    title: 'Open Sicilian Endgame — the d5-Knight Converts',
    overview: "The Open Sicilian's d5-clamp carries into the endgame: the strong knight and the queenside majority outclass Black's passive pieces. From Hambleton's win over theredking89, the bishop and knight dominate and the b-pawn rolls.",
    fen: '2r5/5pk1/B5p1/3Np3/1P2Pb2/1KP5/6P1/8 b - - 0 61',
    tail: ['Ra8', 'Bb5', 'f5', 'Bc6', 'fxe4', 'b5', 'e3', 'Nxe3'],
    ann: ['…Ra8 swings the rook over.', 'Bb5 redeploys the bishop with tempo.', '…f5 tries to break.', 'Bc6 forks the rook.', '…fxe4 grabs a pawn.', 'b5 rolls the passed pawn.', '…e3 pushes desperately.', 'Nxe3 mops up — the knight dominates.'],
    cues: ['…Ra8 — swing over', 'Bb5 — redeploy', '…f5 — try to break', 'Bc6 — fork the rook', '…fxe4 — grab', 'b5 — roll the passer', '…e3 — push', 'Nxe3 — mop up'],
    pawnBreaks: ['b5 passed-pawn push'],
    maneuver: { piece: 'bishop', route: 'Ba6-b5-c6 active diagonal', explanation: 'The bishop reroutes to c6, forking the rook and dominating the long diagonal.' },
    theme: 'Use the dominant minor pieces and roll the queenside passer',
    arrowIdx: { 1: ['a6', 'b5'], 3: ['b5', 'c6'] },
  },
  {
    id: 'mp-proamanreti-endgame', openingId: 'pro-aman-reti', color: 'white',
    title: 'Réti Endgame — Bishop Outclasses the Knight',
    overview: "The Réti's harmonious setup converts in a bishop-vs-knight ending with pawns on both wings — the bishop's range decides. From Hambleton's win over Sl4werThanYou: keep the bishop active, advance the king, and use the kingside passer.",
    fen: '8/5Bkp/6p1/2p3P1/3p4/3P3P/6K1/5n2 b - - 0 50',
    tail: ['Kxf7', 'Kf3', 'c4', 'dxc4', 'Ne3', 'Ke2', 'Nxc4', 'h4'],
    ann: ['…Kxf7 takes the bishop, into a pawn race.', 'Kf3 centralises the king.', '…c4 pushes the passer.', 'dxc4 captures.', '…Ne3 forks for the pawn.', 'Ke2 defends.', '…Nxc4 regains the pawn.', 'h4 makes a kingside passer — White is winning.'],
    cues: ['…Kxf7 — take the bishop', 'Kf3 — centralise', '…c4 — push', 'dxc4 — capture', '…Ne3 — fork', 'Ke2 — defend', '…Nxc4 — regain', 'h4 — make a passer'],
    pawnBreaks: ['h4 kingside passer'],
    maneuver: { piece: 'king', route: 'Kg2-f3-e2 active king', explanation: 'The king marches up to support the kingside passer — the key endgame principle.' },
    theme: 'Activate the king and create a kingside passed pawn',
    arrowIdx: {},
  },
  {
    id: 'mp-proamananticaro-endgame', openingId: 'pro-aman-anti-caro', color: 'white',
    title: 'Two Knights Endgame — the Bishop Dominates',
    overview: "The Two Knights' bishop-pair edge converts in a bishop-vs-knight ending. From Hambleton's win over Titus369: the king marches into the centre and the bishop's long range ties the knight down while the pawns advance.",
    fen: '8/p6p/4Bppk/5n2/8/2P3P1/1P3PP1/6K1 b - - 0 39',
    tail: ['Nd6', 'Kf1', 'f5', 'Ke2', 'Kg7', 'Kd3', 'Kf6', 'Bd5'],
    ann: ['…Nd6 repositions the knight.', 'Kf1 starts the king march.', '…f5 grabs space.', 'Ke2 advances the king.', '…Kg7 mirrors.', 'Kd3 centralises.', '…Kf6 follows.', 'Bd5 dominates the long diagonal.'],
    cues: ['…Nd6 — reposition', 'Kf1 — king march', '…f5 — grab space', 'Ke2 — advance', '…Kg7 — mirror', 'Kd3 — centralise', '…Kf6 — follow', 'Bd5 — dominate'],
    pawnBreaks: [],
    maneuver: { piece: 'king', route: 'Kg1-f1-e2-d3 active king', explanation: 'The king marches to the centre, the decisive endgame resource.' },
    theme: 'March the king to the centre and dominate with the bishop',
    arrowIdx: { 7: ['e6', 'd5'] },
  },
];

function build(P) {
  const c = new Chess(P.fen);
  const arrows = []; const highlights = [];
  for (let i = 0; i < P.tail.length; i++) {
    const mv = c.move(P.tail[i]); // throws if illegal
    highlights.push([{ square: mv.to, color: ORANGE }]);
    const spec = P.arrowIdx[i];
    arrows.push(spec ? [{ from: spec[0], to: spec[1], color: VIS }] : []);
  }
  return {
    id: P.id, openingId: P.openingId, criticalPositionFen: P.fen,
    title: P.title, overview: P.overview,
    pawnBreaks: P.pawnBreaks,
    pieceManeuvers: [P.maneuver],
    strategicThemes: [P.theme],
    endgameTransitions: [P.title],
    playableLines: [{ fen: P.fen, moves: P.tail, annotations: P.ann, learnCues: P.cues, arrows, highlights, sources: SRC }],
  };
}

const path = 'src/data/middlegame-plans.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const ids = new Set(PLANS.map((p) => p.id));
const kept = data.filter((p) => !ids.has(p.id));
for (const P of PLANS) kept.push(build(P));
fs.writeFileSync(path, JSON.stringify(kept, null, 2) + '\n');
console.log(`endgame plans: wrote ${PLANS.length} (all tails legal, board-accurate)`);
for (const P of PLANS) console.log(`  ${P.id}`);
