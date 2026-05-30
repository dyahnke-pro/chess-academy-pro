#!/usr/bin/env node
// GothamChess Ponziani (pro-gothamchess-ponziani) — middlegame plans.
// Student = WHITE. 3 data-anchored plans from the 82-game corpus, replacing the
// 2 legacy overview-only plans (no playableLines; verified unreferenced).
// Every move chess.js-validated; theme gate self-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-ponziani';
const DELETE_IDS = new Set(['mp-pro-gothamchess-ponziani-center', 'mp-pro-gothamchess-ponziani-piece']);
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Ponziani-Opening',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Ponziani_Opening',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-ponziani-main-qb3',
    title: 'Ponziani Main: the Qb3 + Bb5 Centre Bind',
    overview:
      "His main Ponziani plan across the 40-game main line. After 3.c3 and 4.d4, White grabs the centre with e5, chases the knight to d5, then probes with Qb3 hitting the knight and b7. After …Nb6 and cxd4, White has a strong d4/e5 pawn duo and develops Bb5 to pin and pressure, the classic Ponziani central bind backed by the bishop.",
    pawnBreaks: ['the e5/d4 pawn duo cramping Black'],
    pieceManeuvers: ['Qd1-b3 probing the knight and b7', 'Bf1-b5 the pin on c6', 'the central pawn duo'],
    strategicThemes: ['Build the e5/d4 centre', 'Probe with Qb3', 'Pin and pressure with Bb5'],
    endgameTransitions: ['The space edge favours White in simplification'],
    anchor: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4',
    cont: ['d6', 'Bb5', 'Be6'],
    ann: [
      '…d6 — Black strikes at the e5-pawn to free the position.',
      'Bb5 — White develops with a pin, tying the c6-knight to the defence and adding pressure to the centre.',
      '…Be6 — Black develops and challenges the Qb3. White’s big e5/d4 centre and the active bishop give a pleasant, space-gaining edge from this little-known opening.',
    ],
    cues: ['d6 — Black hits e5', 'Bb5 — pin the knight', 'Be6 — Black challenges the queen'],
  },
  {
    id: 'mp-progothamchess-ponziani-d5-qa4',
    title: 'Ponziani vs 3…d5: the Qa4 Pin + d4 Centre',
    overview:
      "Against the principled 3…d5 counter, his 33-game plan is the critical Qa4 line: the queen pins the c6-knight to defend e5, Bb5 piles on the pin, and after the central exchanges White plays d4 to claim the centre. Black's …f6 weakens the kingside, and White's lead in development and central control give a comfortable game against the main Ponziani antidote.",
    pawnBreaks: ['d2-d4 claiming the centre'],
    pieceManeuvers: ['Qd1-a4 pinning the c6-knight', 'Bf1-b5 doubling the pin', 'Nf3-d2 rerouting after …e4'],
    strategicThemes: ['Pin the knight with Qa4', 'Exploit the weakened …f6', 'Claim the centre with d4'],
    endgameTransitions: ['Black’s kingside weaknesses linger into the ending'],
    anchor: 'e4 e5 Nf3 Nc6 c3 d5 Qa4 f6 Bb5 Ne7 exd5 Qxd5 d4',
    cont: ['e4', 'Nfd2'],
    ann: [
      '…e4 — Black pushes the pawn to gain space and kick the f3-knight.',
      'Nfd2 — White reroutes the knight toward the e4-pawn and the c4/b3 squares, eyeing the over-extended pawn as a target. With Black’s …f6 weakening the king and White’s pieces well-placed, White has the easier, more harmonious game against the 3…d5 counter.',
    ],
    cues: ['e4 — Black gains space', 'Nfd2 — reroute, target e4'],
  },
  {
    id: 'mp-progothamchess-ponziani-nxe4-gambit',
    title: 'Ponziani 4…Nxe4: the dxc6 Gambit Refutation',
    overview:
      "Against the greedy 4…Nxe4, his 14-game forcing line is a sharp gambit refutation. White plays d5 and dxc6, and when Black tries the …Bxf2+ trick, the king walks to e2 and White's Qd5 and cxb7 win material by force, capturing the b7-bishop with Qxb7. The chaos resolves in White's favour — a concrete demonstration that 4…Nxe4 is dubious.",
    pawnBreaks: ['d5 and dxc6 cracking the centre', 'cxb7 winning material'],
    pieceManeuvers: ['Qd1-d5 the central queen', 'Qd5xb7 winning the bishop', 'Rg1 saving the rook'],
    strategicThemes: ['Refute 4…Nxe4 with dxc6', 'Walk the king to safety on e2', 'Win material with Qxb7'],
    endgameTransitions: ['White emerges up material from the forcing line'],
    anchor: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Bc5 dxc6 Bxf2+ Ke2 Bb6 Qd5 Nf2 Rg1 O-O cxb7 Bxb7',
    cont: ['Qxb7', 'e4', 'Nd4'],
    ann: [
      'Qxb7 — White snaps off the bishop, emerging from the wild complications a clear piece to the good.',
      '…e4 — Black lashes out for activity, trying to generate threats against the exposed king.',
      '…Nd4+ — Black checks, but White’s king is safe enough and the extra material decides. The forcing line has refuted 4…Nxe4: White is winning.',
    ],
    cues: ['Qxb7 — win the bishop', 'e4 — Black seeks activity', 'Nd4 — White is up a piece'],
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
