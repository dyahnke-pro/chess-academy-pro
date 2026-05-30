#!/usr/bin/env node
// GothamChess Caro-Kann Advance, White side (pro-gothamchess-caro-advance-white).
// Student = WHITE. Well-supported (423 games, 299 wins). 4 data-anchored plans,
// replacing the 1 legacy plan if it lacks playableLines. chess.js-validated.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-caro-advance-white';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

// Delete any legacy overview-only plans (no playableLines) for this opening.
const data0 = JSON.parse(readFileSync(PATH, 'utf8'));
const LEGACY = data0
  .filter((p) => p.openingId === OPENING_ID && !(p.playableLines && p.playableLines[0] && p.playableLines[0].moves))
  .map((p) => p.id);
const DELETE_IDS = new Set(LEGACY);

const PLANS = [
  {
    id: 'mp-progothamchess-caroadv-bf5-c4break',
    title: 'Advance vs …Bf5: the h4-Space + c4 Break',
    overview:
      "His signature Advance plan across 379 games. After the aggressive h4-h5 gains kingside space and Bg5 pins, White trades the light bishops and strikes the centre with c4. The Nd2-e2 reroute supports the break and eyes the f4- and g3-squares, while the e5-wedge cramps Black. White gets a space advantage on both wings — the modern, ambitious Advance Caro.",
    pawnBreaks: ['c2-c4 the central break', 'h4-h5 the kingside space gain'],
    pieceManeuvers: ['Bc1-g5 the pin', 'Nb1-d2-e2 the reroute', 'the e5-wedge cramping Black'],
    strategicThemes: ['Gain space with h4-h5', 'Break the centre with c4', 'Cramp Black with the e5-wedge'],
    endgameTransitions: ['The two-wing space edge carries into the ending'],
    anchor: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7 c4',
    cont: ['Nf5', 'Ne2'],
    ann: [
      '…Nf5 — Black centralises the knight, eyeing d4 and the kingside.',
      'Ne2 — White reroutes the knight toward f4 and g3, supporting the c4-break and the e5-wedge. With kingside space from h4-h5 and the central c4-lever, White has a pleasant space advantage on both wings — exactly the position the Advance aims for.',
    ],
    cues: ['Nf5 — Black centralises', 'Ne2 — reroute, support the break'],
  },
  {
    id: 'mp-progothamchess-caroadv-c5-dxc5',
    title: 'Advance vs …c5: dxc5 + Quick Development',
    overview:
      "Against the …c5 break, his 240-game plan grabs the pawn with dxc5 and develops quickly to hold it (or return it for a lead in development). After …e6 and …Bxc5, White plays a3 and b4 to gain queenside space and harass the bishop, then Bd3 and O-O complete a harmonious setup. The e5-wedge stays as a cramping asset against Black's French-like structure.",
    pawnBreaks: ['b2-b4 the queenside space gain', 'a3 supporting b4'],
    pieceManeuvers: ['d4xc5 grabbing the pawn', 'Bf1-d3 the kingside bishop', 'Nf3 supporting the centre'],
    strategicThemes: ['Grab the pawn with dxc5', 'Gain queenside space with a3-b4', 'Keep the e5-wedge'],
    endgameTransitions: ['The space edge favours White in simplification'],
    anchor: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6 Bd3 Nge7',
    cont: ['b4', 'Bb6'],
    ann: [
      'b4 — White gains queenside space with tempo, kicking the c5-bishop and clamping the queenside.',
      '…Bb6 — the bishop retreats to a safe diagonal. With queenside space, the e5-wedge cramping Black, and a harmonious setup coming with Bd3 and O-O, White has the comfortable, space-gaining game against the …c5 break.',
    ],
    cues: ['b4 — gain space with tempo', 'Bb6 — the bishop retreats'],
  },
  {
    id: 'mp-progothamchess-caroadv-h6-g4space',
    title: 'Advance vs …h6: the g4 Space Grab + c4',
    overview:
      "When Black tries …h6 to question the bishop, his 52-game plan is the maximalist g4! — grabbing huge kingside space and chasing the light-squared bishop to passivity. Then c4 strikes the centre and h5 cements the space. After the central exchanges, White's space on both wings and the cramping e5-pawn give a dominating positional bind against the …h6 sideline.",
    pawnBreaks: ['g2-g4 the kingside space grab', 'c2-c4 the central break'],
    pieceManeuvers: ['Bf1xc4 recapturing actively', 'Nb1-c3 supporting the centre', 'the e5/g4 space duo'],
    strategicThemes: ['Grab space with g4', 'Strike the centre with c4', 'Bind Black with space on both wings'],
    endgameTransitions: ['The space bind wins the long game'],
    anchor: 'e4 c6 d4 d5 e5 Bf5 h4 h6 g4 Bd7 c4 e6 Nc3 Ne7 h5',
    cont: ['dxc4', 'Bxc4', 'Nd5'],
    ann: [
      '…dxc4 — Black grabs the pawn, releasing the central tension.',
      'Bxc4 — White recaptures actively, the bishop eyeing d5 and f7.',
      '…Nd5 — Black centralises the knight, blockading. But with massive space from g4 and h5, the e5-wedge cramping, and active pieces, White has a dominating positional bind — the …h6 try has only loosened Black’s kingside.',
    ],
    cues: ['dxc4 — Black releases tension', 'Bxc4 — recapture actively', 'Nd5 — Black blockades, White binds'],
  },
  {
    id: 'mp-progothamchess-caroadv-qxd4-punish',
    title: 'Advance: Punishing the …Qxd4 Pawn-Grab',
    overview:
      "When Black greedily grabs the d4-pawn with …Qxd4, White punishes with rapid development: Nf3 hits the queen, Bxf5 removes the light bishop, and c4 opens lines with a huge lead in development. The black queen gets chased around while White's pieces pour out — a concrete demonstration that grabbing the d4-pawn is too risky against the Advance.",
    pawnBreaks: ['c2-c4 opening lines with tempo'],
    pieceManeuvers: ['Ng1-f3 hitting the d4-queen', 'Bd3xf5 removing the bishop', 'the development lead for the pawn'],
    strategicThemes: ['Hit the queen with Nf3', 'Trade with Bxf5', 'Open lines with c4 for the development lead'],
    endgameTransitions: ['Keep attacking — the development lead is the compensation'],
    anchor: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Qxd4 Nf3',
    cont: ['Qg4', 'Bxf5', 'Qxf5', 'c4'],
    ann: [
      '…Qg4 — the queen slides to safety, but she has cost Black tempo after tempo.',
      'Bxf5 — White removes the light-squared bishop, a key defender, with gain of time.',
      '…Qxf5 — Black recaptures, the queen still wandering.',
      'c4 — White strikes the centre, opening lines while the lead in development is enormous. The …Qxd4 pawn-grab has handed White a raging initiative for the pawn — the greedy queen sortie is punished.',
    ],
    cues: ['Qg4 — the queen flees', 'Bxf5 — remove the bishop, gain time', 'Qxf5 — the queen wanders', 'c4 — open lines, big lead'],
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
data.push(...added);
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`deleted ${deleted} legacy (${[...DELETE_IDS].join(',') || 'none'}), added ${added.length} new. total now ${data.length}.`);
