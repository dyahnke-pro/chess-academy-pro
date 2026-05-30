#!/usr/bin/env node
// GothamChess Closed Sicilian / Nc3 (pro-gothamchess-closed-sicilian) — plans.
// Student = WHITE. His aggressive Nc3 + d4 + Qxd4 + O-O-O opposite-castling
// attack (333 games). 4 data-anchored plans, deleting legacy overview-only
// plans. chess.js-validated; theme self-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-closed-sicilian';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Sicilian-Defense-Closed-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Sicilian_Defence,_Closed',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const data0 = JSON.parse(readFileSync(PATH, 'utf8'));
const LEGACY = data0
  .filter((p) => p.openingId === OPENING_ID && !(p.playableLines && p.playableLines[0] && p.playableLines[0].moves))
  .map((p) => p.id);
const DELETE_IDS = new Set(LEGACY);

const PLANS = [
  {
    id: 'mp-progothamchess-closedsic-d6-oppositecastle',
    title: 'vs …d6: the Qd2 + O-O-O Opposite-Castle Attack',
    overview:
      "His signature against the …d6 Sicilian across 73 games. After d4 and Qxd4, White sets up the aggressive opposite-side-castling attack: Qd2, b3 and Bb2 train the bishop on the long diagonal, f4 grabs space, and O-O-O commits to a kingside pawn storm. With both sides castling on opposite wings, it becomes a race — and White's g3-h4-g4 storm against Black's king is the whole point.",
    pawnBreaks: ['f2-f4 the kingside space', 'g3 supporting the f4-g4 storm'],
    pieceManeuvers: ['Qd2 + O-O-O the opposite-castle setup', 'Bc1-b2 the long-diagonal bishop', 'Kb1 the prophylactic king tuck'],
    strategicThemes: ['Castle opposite with O-O-O', 'Train the Bb2 on the long diagonal', 'Storm the kingside with g3-f4-g4'],
    endgameTransitions: ['Keep attacking — opposite castling means win the race'],
    anchor: 'e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6 Qd2 g6 b3 Bh6 f4 Nf6 Bb2 O-O O-O-O',
    cont: ['e5', 'g3', 'Re8', 'Kb1'],
    ann: [
      '…e5 — Black strikes in the centre, trying to open lines before White’s storm arrives.',
      'g3 — White reinforces the f4-pawn and prepares the g4-h4 pawn storm against Black’s king.',
      '…Re8 — Black brings the rook to the centre.',
      'Kb1 — the prophylactic king tuck, the final preparation before the storm. With the Bb2 raking the long diagonal and the kingside pawns set to roll, White’s attack on Black’s king is faster — exactly what the opposite-castle setup is built for.',
    ],
    cues: ['e5 — Black opens the centre', 'g3 — support f4, prep the storm', 'Re8 — Black centralises', 'Kb1 — tuck the king, then storm'],
  },
  {
    id: 'mp-progothamchess-closedsic-e6-oooattack',
    title: 'vs …e6: Qd3 + Bf4 + O-O-O Attack',
    overview:
      "Against the …e6 setup, his 59-game plan is the rapid O-O-O attack: d4 and Qxd4, then Qd3 and Bf4 develop with pressure, and O-O-O commits to the kingside assault. After Nge2 completes development, White is ready to roll the g- and h-pawns at Black's king. The early queen trade on d4 hasn't slowed White down — the initiative and the attacking setup carry the day.",
    pawnBreaks: ['the kingside pawn storm', 'e5 a central clamp'],
    pieceManeuvers: ['Qd1-d3 the active queen', 'Bc1-f4 developing with pressure', 'Ng1-e2 completing development'],
    strategicThemes: ['Develop with Qd3 and Bf4', 'Castle opposite with O-O-O', 'Attack the king on the kingside'],
    endgameTransitions: ['Keep attacking — opposite castling is a race'],
    anchor: 'e4 c5 Nc3 e6 d4 cxd4 Qxd4 Nc6 Qd3 Nf6 Bf4 Bb4 O-O-O',
    cont: ['O-O', 'Nge2', 'e5', 'Bg5'],
    ann: [
      '…O-O — Black castles kingside, directly into White’s attacking intentions.',
      'Nge2 — White completes development, the knight heading toward g3 and the kingside.',
      '…e5 — Black strikes back in the centre, seeking counterplay.',
      'Bg5 — White pins the f6-knight, increasing the pressure on Black’s kingside. With pieces aimed at the castled king and the pawns set to storm, White has a dangerous attacking initiative — the early Qxd4 has cost nothing.',
    ],
    cues: ['O-O — Black castles into it', 'Nge2 — develop toward the king', 'e5 — Black counters', 'Bg5 — pin, increase pressure'],
  },
  {
    id: 'mp-progothamchess-closedsic-g6-nd5',
    title: 'vs …g6: the Nd5 Outpost + Bg5 Bind',
    overview:
      "Against the …g6 Dragon-like setup, his 29-game plan uses the strong Nd5 outpost. After d4 and Qxd4, White plays Qd3, c3, and plants the knight on d5 — the dominant central square. The Bg5 pin adds pressure, and when Black trades on d5, the recapture exd5 gives White a protected passed pawn and a space bind. A positional squeeze against the fianchetto.",
    pawnBreaks: ['e4xd5 creating the protected passed pawn', 'c3 supporting d4'],
    pieceManeuvers: ['Nc3-d5 the dominant outpost', 'Bc1-g5 the pin', 'Qd1-d3 the centralised queen'],
    strategicThemes: ['Plant the Nd5 outpost', 'Pin with Bg5', 'Win a space bind with exd5'],
    endgameTransitions: ['The passed d5-pawn is an endgame asset'],
    anchor: 'e4 c5 Nc3 g6 d4 cxd4 Qxd4 Nf6 Nf3 Nc6 Qd3 d6 Nd5 Bg7 c3 O-O',
    cont: ['Bg5', 'Nxd5', 'exd5'],
    ann: [
      'Bg5 — White pins the f6-knight, increasing the pressure on the d5-outpost and the kingside.',
      '…Nxd5 — Black trades off the dominant knight, the only way to relieve the bind.',
      'exd5 — White recaptures, gaining a protected passed pawn on d5 and a space advantage. The Nd5-outpost has converted into a permanent structural edge — White squeezes from a position of strength against the fianchetto setup.',
    ],
    cues: ['Bg5 — pin, pressure d5', 'Nxd5 — Black relieves the bind', 'exd5 — protected passed pawn'],
  },
  {
    id: 'mp-progothamchess-closedsic-bb5-bg5',
    title: 'Bb5 vs …Nc6: Trade, Qxd4 + Bg5 Initiative',
    overview:
      "The Bb5 line where Black plays …Nd4. After the knight trades on b5 and White recaptures, the d4 break and Qxd4 reach an open position with a slight lead in development. Bg5 pins the f6-knight and O-O-O sets up the attack. White's pieces are the more active, and the early queen on d4 controls key central squares — a comfortable, initiative-keeping handling of the Bb5 Sicilian.",
    pawnBreaks: ['d4 opening the centre'],
    pieceManeuvers: ['Bc1-g5 the pin', 'Qd4 the centralised queen', 'O-O-O setting up the attack'],
    strategicThemes: ['Open the centre with d4', 'Pin with Bg5', 'Keep the initiative with the active queen'],
    endgameTransitions: ['The active pieces favour White in simplification'],
    anchor: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4 cxd4 Qxd4 Nf6',
    cont: ['Bg5', 'e6', 'O-O-O'],
    ann: [
      'Bg5 — White pins the f6-knight, the active developing move that increases central and kingside pressure.',
      '…e6 — Black solidifies, opening the dark bishop.',
      'O-O-O — White castles queenside, connecting the rooks and setting up the kingside attack. The centralised queen on d4, the Bg5 pin, and the active pieces give White a pleasant, initiative-keeping game from the Bb5 Sicilian.',
    ],
    cues: ['Bg5 — pin the knight', 'e6 — Black solidifies', 'O-O-O — connect, set up the attack'],
  },
];

const data = data0.filter((p) => !DELETE_IDS.has(p.id));
const deleted = data0.length - data.length;
const existing = new Set(data.map((p) => p.id));
let failed = 0;
const added = [];

for (const p of PLANS) {
  const c = new Chess();
  let ok = true;
  for (const san of p.anchor.trim().split(/\s+/)) {
    try { c.move(san); } catch { console.error(`ANCHOR ILLEGAL ${p.id}: ${san}`); ok = false; break; }
  }
  if (!ok) { failed++; continue; }
  const critFen = c.fen();
  const probe = new Chess(critFen);
  const moveInfo = [];
  for (const san of p.cont) {
    let mv;
    try { mv = probe.move(san); } catch { console.error(`CONT ILLEGAL ${p.id}: ${san} @ ${probe.fen()}`); ok = false; break; }
    moveInfo.push({ to: mv.to, color: mv.color });
  }
  if (!ok) { failed++; continue; }
  if (p.cont.length !== p.ann.length || p.cont.length !== p.cues.length) { console.error(`LENGTH ${p.id}`); failed++; continue; }

  const SQ = /([a-h][1-8])/g;
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later|protected)\b/i;
  const goals = new Set();
  for (const pb of p.pawnBreaks) if (!COND.test(pb)) (pb.match(SQ) || []).forEach((q) => goals.add(q));
  for (const pm of p.pieceManeuvers) (pm.match(SQ) || []).forEach((q) => goals.add(q));
  const demo = moveInfo.some((mi) => mi.color === 'w' && goals.has(mi.to));
  if (!demo) { console.error(`THEME-EMPTY ${p.id}: goals {${[...goals].join(',')}}; white tos=${moveInfo.filter((m) => m.color === 'w').map((m) => m.to).join(',')}`); failed++; continue; }
  const PROMISE = /\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
  if (PROMISE.test(p.ann[p.ann.length - 1])) { console.error(`PROMISE-ENDING ${p.id}`); failed++; continue; }
  if (existing.has(p.id)) { console.log(`skip existing ${p.id}`); continue; }

  added.push({
    id: p.id, openingId: OPENING_ID, criticalPositionFen: critFen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{
      fen: critFen, moves: p.cont, annotations: p.ann,
      arrows: p.cont.map(() => []),
      highlights: moveInfo.map((mi) => [{ square: mi.to, color: ORANGE }]),
      learnCues: p.cues, title: p.title, intro: p.overview, sources: SRC,
    }],
  });
}

if (failed > 0) { console.error(`\n${failed} plan(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`deleted ${deleted} legacy, added ${added.length} new. total now ${data.length}.`);
