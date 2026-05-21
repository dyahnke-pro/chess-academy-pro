// Adds per-variation `keyIdeas` (student-side = White plans) to the 7
// first-class Ruy variation tabs, so each tab's Understand zone matches
// the main line's care instead of borrowing the main-line key ideas.
// Prose only — no chess moves invented (the lines are already in the DB).
//
// Run: node scripts/add-ruy-variation-keyideas.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'src/data/repertoire.json';

// name-substring matcher → key ideas (White's plan in that variation).
const KEY_IDEAS = [
  {
    test: /berlin/i,
    ideas: [
      'Choose your weapon: the queenless Berlin endgame (Bxc6, dxe5, Qxd8+) for a risk-free pull, or d3 (Anti-Berlin) to keep queens on.',
      'Your one structural trump is the clean kingside pawn majority — pressing only ever comes from threatening to make a passed pawn.',
      "Restrain Black's f5-knight blockade, then pry with h3-g4 or f4 at the right moment.",
      "Probe Black's doubled c-pawns and the king stuck in the centre — the long-term targets.",
    ],
  },
  {
    test: /open ruy/i,
    ideas: [
      'Strike the centre at once with d4 — your lead in development more than pays for the e4-pawn.',
      "Pressure the e6/d5 light squares: the b3-bishop plus Ng5 hunt Black's defending e6-bishop.",
      'Reroute with c3 and Nbd2-b3 to clamp d4 and challenge the active c5/e4 knight.',
      "Trade on e6 to open the f-file when it exposes Black's king.",
    ],
  },
  {
    test: /marshall attack/i,
    ideas: [
      "Decline it with the Anti-Marshall (8.a4 or 8.h3) if you'd rather not memorise the main lines.",
      'If you accept, return the pawn with d4 and blunt the storm with g3, Be3, and Qd3/Qf3.',
      "Black's compensation is a lasting initiative, not the pawn — survive it and the extra pawn tells.",
      'The light squares around your king (g2, f3, h3) are the battleground once g3 is played.',
    ],
  },
  {
    test: /exchange/i,
    ideas: [
      "Trade on c6 to give Black doubled c-pawns, then steer for the endgame — Fischer's recipe.",
      'Your clean kingside majority can make a passed pawn; the crippled black queenside cannot.',
      'Happily trade queens — the structural edge is most dangerous in the ending.',
      "Black's bishop pair and open lines are the compensation; consolidate before the position opens.",
    ],
  },
  {
    test: /breyer/i,
    ideas: [
      'Build the full c3/d4 centre and probe the queenside with a4 before Black completes the regroup.',
      'Tour the queen-knight Nbd2-f1-g3 toward the f5-outpost — the engine of your kingside play.',
      'Lock with d5 when Black plays ...c5; the game becomes patient two-winged manoeuvring.',
      "Lasker's rule: a knight that settles on f5 can't be repelled — fight for that square.",
    ],
  },
  {
    test: /chigorin/i,
    ideas: [
      'Retreat the bishop to c2 and keep it — never allow ...Nxb3 to trade off the Spanish bishop.',
      "Black's a5-knight is offside; press while it spends moves rerouting back into play.",
      'Roll the kingside with Nbd2-f1-g3 and f4 once the c3/d4 centre is set.',
      'Lock with d5 to gain space and define the two-winged battle.',
    ],
  },
  {
    test: /zaitsev/i,
    ideas: [
      'Hold the central tension; meet ...exd4 with cxd4 and keep the b1-h7 diagonal alive for the bishop.',
      'The signature plan after d5 is the Ra3 rook lift, swinging across the third rank into a kingside attack.',
      "Mind the d5 timing — release it too early and Black's ...c5/...Nd7 outposts equalise.",
      'A theory-heavy line — know the move-order cold, the way Karpov did.',
    ],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
const ruy = data.find((o) => o.id === 'ruy-lopez');
if (!ruy) throw new Error('ruy-lopez not found');

let patched = 0;
for (const v of ruy.variations) {
  const m = KEY_IDEAS.find((k) => k.test.test(v.name));
  if (m && !v.keyIdeas) {
    v.keyIdeas = m.ideas;
    patched++;
    console.log(`[keyIdeas] ${v.name} (${m.ideas.length})`);
  }
}

if (patched > 0) {
  writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nPatched ${patched} variation(s).`);
} else {
  console.log('Nothing to patch.');
}
