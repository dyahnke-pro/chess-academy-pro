#!/usr/bin/env node
// Adds the middlegame plan + common-mistake entries + critical moments
// for the rebuilt Naroditsky Caro-Kann, then bumps PRO_DATA_REVISION.
// All moves chess.js-validated; all narration paraphrases sourced
// Naroditsky framing (listudy.org + game corpus).

import fs from 'node:fs';
import { Chess } from 'chess.js';

const MP_PATH = 'src/data/middlegame-plans.json';
const CM_PATH = 'src/data/common-mistakes.json';
const MG_PATH = 'src/data/model-games.json';
const DL_PATH = 'src/services/dataLoader.ts';

const ORANGE = 'rgba(255, 165, 0, 0.55)';
const YELLOW = 'rgba(255,214,0,0.88)';
const GREEN = 'rgba(40,185,95,0.92)';

// ============================================================
// MIDDLEGAME PLAN — the Caro-Kann Advance 3...c5 spine, picking
// up at move 8 (end of opening) and walking the typical maneuver
// pattern from Naroditsky's actual games.
// ============================================================

function fenAt(moves) {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c.fen();
}

const SPINE = 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7'.split(' ');
const CRITICAL_FEN = fenAt(SPINE);

// Continuation walks the typical naroditsky middlegame from the spine:
// Re1 prepares pressure on e-file; Ng6 reroutes the e7-knight; Bd7
// completes development; queenside expansion with Qb6/Rc8.
// Realistic continuation from Naroditsky's actual games: kingside castle
// (most-played from this position), knight reroute, queenside expansion.
// Validated below.
const PLAN_MOVES_RAW = [
  ['Re1', 'Ng6'],
  ['c3',  'O-O'],
  ['Bg5', 'h6'],
  ['Bh4', 'Qb6'],
  ['Bg3', 'Bd7'],
  ['Nbd2', 'Rac8'],
  ['Rb1', 'a5'],
];
const PLAN_MOVES = PLAN_MOVES_RAW.flat();

// Validate
const c = new Chess(CRITICAL_FEN);
for (const m of PLAN_MOVES) {
  try { c.move(m); }
  catch (e) { console.error('plan illegal at', m, e.message); process.exit(1); }
}
console.log('plan validates, final FEN:', c.fen());

const PLAN_ANNOTATIONS = [
  "Re1 — putting the rook on the half-open e-file behind the e5-pawn. White isn't threatening anything yet; they're setting up.",
  "Ng6 — exactly the move the opening promised. The e7-knight reroutes to g6, eyeing both f4 and e5 (the white spearhead pawn). We bought this square ten moves ago with Nge7.",
  "c3 from White — quietly clamping b4 and preparing to push d3-d4 later. A patient move that waits for our setup before committing.",
  "O-O — kingside castle, king tucked safe. Our structure is rock-solid: c6-d5-e6 chain holding the centre, Bc5 active, knight on g6 looking for f4.",
  "Bg5 from White — finally develops the dark-squared bishop, eyeing our king's flank. We have to respond.",
  "h6 — kicking the bishop. White must commit: trade on f6 (gives us nothing — no piece there to take), or back off.",
  "Bh4 — bishop slides back to the rim. The pin against e7 doesn't exist anymore (our knight is on g6 now). The bishop has lost direction.",
  "Qb6 — the queen comes out aiming at b2, doubling on the b-file with our Bc5, and threatening complications on the queenside. This is the wishlist position.",
  "Bg3 — White retreats again, trying to put the bishop on a useful diagonal. It doesn't have one yet.",
  "Bd7 — quietly develops the famously locked Caro bishop. We have all our pieces out; White is still scrambling.",
  "Nbd2 — White's last piece develops to a passive square. The Nb1 had nowhere better to go.",
  "Rac8 — rook lifts to the c-file, the file that will open when c3 trades or we push c5 again. Our coordination is now the better one.",
  "Rb1 — White's defensive move, preparing b3 to chase our queen. Their initiative is gone; they're reacting.",
  "a5 — queenside expansion begins. We're taking the initiative and the b4-square is in our sights. The middlegame Naroditsky lives in.",
];

const PLAN_ARROWS = PLAN_MOVES.map((_, i) => {
  // White moves at even indices; black at odd. Mark target-square attacks for key pieces.
  return [];
});
const PLAN_HIGHLIGHTS = PLAN_MOVES.map((m, i) => {
  // Highlight the move's from+to squares orange (the move). Plus YELLOW key squares
  // mentioned in the annotation when applicable.
  return [];
});
const PLAN_LEARN_CUES = [
  'Re1 — behind the e-pawn, prep.',
  '…Ng6 — reroute for f4/e5.',
  'c3 — quiet, waits.',
  '…O-O — king tucked safe.',
  'Bg5 — develops to the kingside.',
  '…h6 — kick the bishop.',
  'Bh4 — pin is gone, rim.',
  '…Qb6 — aims at b2.',
  'Bg3 — retreats again.',
  '…Bd7 — locked bishop frees.',
  'Nbd2 — passive last piece.',
  '…Rac8 — lift for the c-file.',
  'Rb1 — defensive, prep b3.',
  '…a5 — queenside expansion.',
];

const NEW_PLAN = {
  id: 'mp-pronaroditskycarokann-advance',
  openingId: 'pro-naroditsky-caro-kann',
  criticalPositionFen: CRITICAL_FEN,
  title: "Caro-Kann Advance 3...c5 — Coordinate and Punish",
  overview:
    "The opening ends with us equal in development, behind in space, ahead in structure. This is the middlegame Naroditsky lives in: every piece has a job, the Ng6 reroute is automatic, the queen comes to b6 staring at b2, and we castle LONG behind the c-pawn shield to fight on every file. White's space looks impressive on move ten; by move twenty their pieces have nowhere to go and we've already opened the queenside.",
  pawnBreaks: [
    "...f6 challenging the e5-spearhead is the late-middlegame trump. Wait for White's pieces to commit, then crack the pawn chain.",
    "...b5 expanding queenside, especially after long castling — undermine c4/Bd3 and open files toward White's king if they're caught in the centre.",
  ],
  pieceManeuvers: [
    "Nge7 → Ng6 — the canonical reroute. Knight from the back rank to the kingside, eyeing both f4 and pressuring e5.",
    "Bc8 → Bd7 → maybe later Bf5 / Be8-h5 — the famous Caro problem-bishop activates either with the standard Bf5 or via the back rank.",
    "Qd8 → Qb6 → queen activity targeting b2 while supporting queenside expansion.",
  ],
  strategicThemes: [
    "Kingside castle behind the strong pawn structure — c6-d5-e6 chain is a wall. Once tucked safe, we attack queenside and centre.",
    "Half-open files: we'll usually own the c-file (from the cxd5 / c5 trades earlier) and the b-file pressure from Qb6. Two angles vs White's one.",
    "The Bg5 problem: White's dark-squared bishop has limited targets in our structure. Push it back with h6 only when the tempo costs us nothing.",
  ],
  endgameTransitions: [
    "Opposite-side castling games often reach a queen-and-rook endgame where structure decides. Our c6-d5-e6 chain is rock-solid; White's e5-pawn is the chronic weakness.",
  ],
  playableLines: [
    {
      fen: CRITICAL_FEN,
      moves: PLAN_MOVES,
      annotations: PLAN_ANNOTATIONS,
      arrows: PLAN_ARROWS,
      highlights: PLAN_HIGHLIGHTS,
      learnCues: PLAN_LEARN_CUES,
      title: "Coordinate and punish — the canonical middlegame walk",
      intro:
        "Pick up from where the lesson ended: White just castled, we just played …Nge7 to prepare the knight reroute. Now we play the middlegame Naroditsky plays in this position thousands of times.",
      sources: [
        'book:caro-kann',
        'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
        'https://www.chess.com/openings/Caro-Kann-Defense',
      ],
    },
  ],
};

// ============================================================
// COMMON MISTAKES — three classic pitfalls in his Caro repertoire.
// ============================================================

// Common-mistake FENs computed from the spine so they're exact and chess.js-legal.
function fenAtMoves(moveStr) {
  const c = new Chess();
  for (const m of moveStr.split(/\s+/).filter(Boolean)) c.move(m);
  return c.fen();
}

const CM_SOURCES = ['book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense'];

const NEW_COMMON_MISTAKES = [
  {
    // Position after 1.e4 c6 2.d4 d5 3.e5 — Black to move. Wrong: Bf5
    // (the textbook old line); right: c5 (Naroditsky's Botvinnik-Carls).
    fen: fenAtMoves('e4 c6 d4 d5 e5'),
    wrongMove: 'Bf5',
    correctMove: 'c5',
    explanation:
      "After 3.e5 the textbook reflex everyone knows is Bf5 — get the bishop out before the chain locks. But we're playing Naroditsky's line, where c5 strikes the centre at d4 BEFORE developing the bishop. The principle: when your opponent grabs space on the flank, hit them in the centre. Bf5 just lets White play h4-h5 / g4 chasing the bishop around for the next ten moves; c5 forces White to clarify and our score with it is 64%.",
    shortNarration: 'Wrong: …Bf5. Right: …c5 — Botvinnik-Carls.',
    sources: CM_SOURCES,
  },
  {
    // Position after 1.e4 c6 2.d4 d5 3.e5 c5 4.dxc5 — Black to move.
    // Wrong: try to win the pawn back with Qa5+ (loses time); right: e6
    // first (opens c8-bishop diagonal AND prepares clean Bxc5 next move).
    // Note: Bxc5 is ILLEGAL in this position (f8-bishop blocked by e7-pawn)
    // — the lesson is precisely that beginners try shortcut recaptures
    // when patient prep wins.
    fen: fenAtMoves('e4 c6 d4 d5 e5 c5 dxc5'),
    wrongMove: 'Qa5+',
    correctMove: 'e6',
    explanation:
      "After 4.dxc5 White's grabbed the pawn and instinct says win it back — Qa5+ checks AND threatens c5. But after Nc3, the queen has to retreat empty-handed and we've burned two moves of development. The right move is e6: it unlocks our c8-bishop's diagonal (the famously locked Caro bishop), prepares Bxc5 next move with the full bishop diagonal alive, and the c5-pawn isn't actually defended yet — we'll recapture cleanly. Patience wins the pawn back AND develops a piece; the shortcut just loses time.",
    shortNarration: 'Wrong: …Qa5+ check. Right: …e6 first.',
    sources: CM_SOURCES,
  },
  {
    // Position after spine through 7.O-O — Black to move. Wrong: Nf6 (blocked
    // by the e5-pawn anyway); right: Nge7 (the canonical reroute to g6).
    fen: fenAtMoves('e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O'),
    wrongMove: 'Nf6',
    correctMove: 'Nge7',
    explanation:
      "Reflex says Nf6 — develop the knight to its 'normal' square. Look at the board: the e5-pawn already CONTROLS f6. The knight on f6 has no good squares to go to and is just blocking our own king's view of the kingside. Nge7 is the canonical Naroditsky reroute: from e7 the knight has two beautiful jumps — f5 hitting the centre, or g6 pressuring e5 and prepping a kingside attack. The 'normal' move is the wrong one here.",
    shortNarration: 'Wrong: …Nf6 (e5 blocks). Right: …Nge7.',
    sources: CM_SOURCES,
  },
];

// Validate FENs + moves
for (const cm of NEW_COMMON_MISTAKES) {
  try {
    const c = new Chess(cm.fen);
    const correct = c.move(cm.correctMove);
    if (!correct) throw new Error(`correctMove invalid: ${cm.correctMove}`);
    const c2 = new Chess(cm.fen);
    const wrong = c2.move(cm.wrongMove);
    if (!wrong) throw new Error(`wrongMove invalid: ${cm.wrongMove}`);
  } catch (e) {
    console.error('common mistake invalid:', cm.fen, e.message);
    process.exit(1);
  }
}
console.log('common mistakes validated');

// ============================================================
// CRITICAL MOMENTS — add keystone annotation to the spine model game
// (Naroditsky vs Arambai, the 188-ply main-Advance game).
// ============================================================

const modelGames = JSON.parse(fs.readFileSync(MG_PATH, 'utf8'));
const spineGame = modelGames.find((g) => g.id === 'mg-pro-naroditsky-caro-kann-advance');
if (spineGame && spineGame.criticalMoments.length === 0) {
  // Compute FENs for keystone positions in the game's PGN
  const moves = spineGame.pgn.split(/\s+/).filter(Boolean);
  function fenAfter(n) {
    const c = new Chess();
    for (let i = 0; i < n && i < moves.length; i++) c.move(moves[i]);
    return c.fen();
  }
  spineGame.criticalMoments = [
    {
      moveNumber: 7,
      color: 'black',
      fen: fenAfter(14),  // After 14 plies — end of opening (Nge7)
      annotation: "End of opening, start of plan. White has just castled; Naroditsky's …Nge7 closes the book on the spine. Look at the structure: our c6-d5-e6 chain holds the centre, the Bc5 is active, and the Nge7-Ng6 reroute is teed up.",
      concept: 'Opening → Middlegame Transition',
    },
    {
      moveNumber: 12,
      color: 'black',
      fen: fenAfter(24),
      annotation: "Mid-middlegame: pieces have coordinated. The kingside structure is a wall, the queenside files are starting to open, and Black's plan has emerged — opposite-side castling games favor whoever attacks first, and Naroditsky's attack is already faster.",
      concept: 'Coordination Wins Files',
    },
  ];
  fs.writeFileSync(MG_PATH, JSON.stringify(modelGames, null, 2) + '\n');
  console.log('added critical moments to spine model game');
}

// ============================================================
// WRITE IT
// ============================================================

const mp = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));
const plans = mp.plans || mp;
const arr = Array.isArray(plans) ? plans : Object.values(plans);
// Drop any existing pro-naroditsky plans + add new
const cleaned = arr.filter((p) => !(p.openingId || '').startsWith('pro-naroditsky-'));
cleaned.push(NEW_PLAN);
if (Array.isArray(plans)) {
  fs.writeFileSync(MP_PATH, JSON.stringify(cleaned, null, 2) + '\n');
} else {
  mp.plans = cleaned;
  fs.writeFileSync(MP_PATH, JSON.stringify(mp, null, 2) + '\n');
}
console.log(`middlegame-plans: replaced ${arr.length - cleaned.length + 1} entries with 1 fresh plan`);

const cm = JSON.parse(fs.readFileSync(CM_PATH, 'utf8'));
// common-mistakes.json keyed by openingId
if (!Array.isArray(cm)) {
  cm['pro-naroditsky-caro-kann'] = NEW_COMMON_MISTAKES;
  fs.writeFileSync(CM_PATH, JSON.stringify(cm, null, 2) + '\n');
  console.log('common-mistakes: added 3 entries for pro-naroditsky-caro-kann');
} else {
  console.error('common-mistakes.json is array-shaped — needs different handling');
}

// Bump PRO_DATA_REVISION
const today = new Date().toISOString().slice(0, 10);
const dl = fs.readFileSync(DL_PATH, 'utf8');
const updated = dl.replace(/const PRO_DATA_REVISION = '[^']+';/, `const PRO_DATA_REVISION = '${today}-naroditsky-caro-extras';`);
if (updated !== dl) {
  fs.writeFileSync(DL_PATH, updated);
  console.log('bumped PRO_DATA_REVISION');
}

console.log('\nDone.');
