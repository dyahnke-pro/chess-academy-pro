#!/usr/bin/env node
// GothamChess Stafford Gambit Refutation (pro-gothamchess-stafford-refute).
// Student = WHITE (refuting Black's gambit). 2 plans anchored on the entry's
// theory-validated variation PGNs + his games (he always plays d3, the
// refutation). Replaces 2 legacy overview-only plans. chess.js-validated.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-stafford-refute';
const DELETE_IDS = new Set(['mp-pro-gothamchess-stafford-refute-attack', 'mp-pro-gothamchess-stafford-refute-dev']);
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Stafford-Gambit',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Petrov%27s_Defence',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-stafford-consolidate',
    title: 'Stafford Refuted: d3 + Be2, Trade Off the Attack',
    overview:
      "The refutation he plays every time. Black gambits a pawn for a dangerous-looking attack, but White stays calm: d3 blunts the bishop, Be2 prepares to trade off Black's attacking pieces, and when Black lunges …Ng4, White simply takes it. After the queens come off, White is a clean pawn up with no weaknesses — the Stafford's traps only work if White panics. Trade, consolidate, and win the endgame.",
    pawnBreaks: ['d3 blunting the attack', 'g3 securing the kingside'],
    pieceManeuvers: ['Bf1-e2 preparing to trade the attackers', 'Be2xg4 removing the attacking knight', 'the consolidating queen trade'],
    strategicThemes: ['Stay calm against the gambit', 'Trade off the attacking pieces', 'Convert the extra pawn'],
    endgameTransitions: ['The extra pawn wins the simplified ending'],
    anchor: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2',
    cont: ['Ng4', 'Bxg4', 'Qh4', 'g3'],
    ann: [
      '…Ng4 — Black lunges the knight at f2 and h2, the typical Stafford attacking try.',
      'Bxg4 — White calmly removes the attacker; there is no need to fear the gambit.',
      '…Qh4 — Black throws the queen at the kingside, hunting for a trap.',
      'g3 — White blunts the queen and trades everything off. Once the attackers are gone, White is a clean pawn up with a safe king — the Stafford refuted by simple, calm consolidation.',
    ],
    cues: ['Ng4 — the Stafford lunge', 'Bxg4 — calmly take the attacker', 'Qh4 — Black hunts a trap', 'g3 — blunt the queen, consolidate'],
  },
  {
    id: 'mp-progothamchess-stafford-e5space',
    title: 'Stafford 4…dxc6 5.e5: the Space Wedge',
    overview:
      "The ambitious refutation: instead of d3, White pushes e5 immediately to kick the f6-knight and grab a central space wedge. After …Ne4, White plays d4 to build a broad pawn centre and develop with Be3, keeping the extra pawn and a space advantage while Black's knight on e4 sits without support. A more aggressive way to punish the Stafford.",
    pawnBreaks: ['e4-e5 the space wedge', 'd3-d4 building the centre'],
    pieceManeuvers: ['Bc1-e3 supporting the centre', 'the e5/d4 pawn duo', 'Nb1-d2 challenging the e4-knight'],
    strategicThemes: ['Kick the knight with e5', 'Build the d4 centre', 'Keep the extra pawn and the space'],
    endgameTransitions: ['The extra pawn and space win the long game'],
    anchor: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5',
    cont: ['Ne4', 'd4', 'Bc5', 'Be3'],
    ann: [
      '…Ne4 — the knight jumps forward, the only active square after the e5-push.',
      'd4 — White builds the big pawn centre, the e5/d4 duo cramping Black and supporting the advance.',
      '…Bc5 — Black develops, hitting the d4-pawn.',
      'Be3 — White defends d4 and develops with tempo. With the extra pawn, the central space wedge, and the better structure, White has a comfortable, ambitious game against the Stafford.',
    ],
    cues: ['Ne4 — the only active square', 'd4 — build the centre', 'Bc5 — Black hits d4', 'Be3 — defend, develop with tempo'],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf8'));
const before = data.length;
const kept = data.filter((p) => !DELETE_IDS.has(p.id));
const deleted = before - kept.length;
const existing = new Set(kept.map((p) => p.id));
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
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later)\b/i;
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
kept.push(...added);
writeFileSync(PATH, JSON.stringify(kept, null, 2) + '\n');
console.log(`deleted ${deleted} legacy, added ${added.length} new. total now ${kept.length}.`);
