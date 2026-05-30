#!/usr/bin/env node
// GothamChess Italian Game (pro-gothamchess-italian) — middlegame plans.
// Student = WHITE. Thin corpus (75 games) — only Two-Knights + Evans have
// robust plan data beyond the existing d4-main plan, so we add exactly those 2
// (don't fabricate) and DELETE the 2 legacy overview-only plans that lack
// playableLines (verified unreferenced; they violate the lead-the-eye standard).
// Every move chess.js-validated; theme gate self-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-italian';
const DELETE_IDS = new Set(['mp-pro-gothamchess-italian-center', 'mp-pro-gothamchess-italian-kside']);
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Italian-Game',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Italian_Game',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-italian-twoknights-kside',
    title: 'Italian Two Knights: the f4-f5 Kingside Attack',
    overview:
      "His most-played Italian middlegame across the 67-game Two Knights line. After the central trades on d4, White pins with Bg5 and rolls the f-pawn: f4 grabs space, f5 cramps Black and clamps the e6-square, opening lines toward the king. With the bishop on g5 pinning the f6-knight and the f-pawn storming, White generates a direct kingside initiative.",
    pawnBreaks: ['f4-f5 the kingside storm', 'f4 grabbing space'],
    pieceManeuvers: ['Bc1-g5 pinning the f6-knight', 'Bg5-h4 keeping the pin', 'the f-pawn roller toward f5'],
    strategicThemes: ['Pin the f6-knight with Bg5', 'Storm with f4-f5', 'Open lines toward the king'],
    endgameTransitions: ['The kingside space lingers as an asset'],
    anchor: 'e4 e5 Nf3 Nc6 Bc4 Nf6 O-O Bc5 d4 Bxd4 Nxd4 Nxd4 Bg5 d6 f4',
    cont: ['Qe7', 'f5', 'h6', 'Bh4'],
    ann: [
      '…Qe7 — Black connects the pieces and eyes the e-file.',
      'f5 — the storm. White clamps the e6-square, gains kingside space, and opens lines toward Black’s king.',
      '…h6 — Black questions the g5-bishop.',
      'Bh4 — White keeps the pin on the f6-knight; the f5-wedge and the pinned knight give White a strong, lasting kingside initiative.',
    ],
    cues: ['Qe7 — Black eyes the e-file', 'f5 — clamp e6, storm', 'h6 — Black questions the bishop', 'Bh4 — keep the pin, press on'],
  },
  {
    id: 'mp-progothamchess-italian-evans-bigcenter',
    title: 'Evans Gambit: the d4 Big-Centre Initiative',
    overview:
      "The Evans Gambit, his sharpest Italian weapon. White sacrifices the b-pawn with b4 to deflect the bishop, then plays c3 and d4 to build a big pawn centre with a lead in development. After …Bxb4 c3 Ba5 d4, White's centre rolls forward and the open lines give a dangerous attacking initiative — the classic romantic gambit, a pawn for a raging position.",
    pawnBreaks: ['d4 building the big centre', 'c3 supporting d4'],
    pieceManeuvers: ['Nb1-c3 developing toward the centre', 'O-O tucking the king away', 'the c3/d4 pawn duo'],
    strategicThemes: ['Sacrifice b4 to deflect the bishop', 'Build the c3/d4 big centre', 'A lead in development for the pawn'],
    endgameTransitions: ['Keep attacking — the development lead is the compensation'],
    anchor: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4',
    cont: ['exd4', 'O-O', 'd6', 'cxd4', 'Bb6', 'Nc3'],
    ann: [
      '…exd4 — Black grabs the centre pawn, the principled acceptance.',
      'O-O — White castles, prioritising development and king safety over recapturing immediately.',
      '…d6 — Black props the centre and opens the light bishop.',
      'cxd4 — White rebuilds the big pawn centre, the e4/d4 duo dominating the board.',
      '…Bb6 — the bishop retreats to a safe diagonal.',
      'Nc3 — White completes development; the big centre, open lines, and lead in development give a powerful initiative for the gambit pawn.',
    ],
    cues: ['exd4 — Black takes the centre', 'O-O — castle, develop first', 'd6 — Black props the centre', 'cxd4 — rebuild the big centre', 'Bb6 — the bishop retreats', 'Nc3 — complete development, attack'],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf8'));

// 1. Delete the legacy overview-only plans (verified unreferenced outside data).
const before = data.length;
const kept = data.filter((p) => !DELETE_IDS.has(p.id));
const deleted = before - kept.length;

// 2. Add the new data-anchored playable plans.
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
console.log(`deleted ${deleted} legacy plan(s), added ${added.length} new. total now ${kept.length}.`);
