#!/usr/bin/env node
// Add a second pitfall to three Samay openings — each a FAMOUS, documented,
// unambiguous intermediate mistake that is ON his exact repertoire line, in the
// same practical-advice vein as the existing entries (no engine eval claim;
// the recommendation is established theory + sourced). Every FEN + both moves
// are chess.js-verified. Conservative by design: only openings where the
// mistake is textbook-clear are touched (no engine available in this container
// to verify subtler eval calls — those route to the punish-gem/CI path).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const ARCH = 'https://api.chess.com/pub/player/samayraina/games/archives';

const ADD = {
  'pro-samayraina-scandi': {
    fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3',
    wrongMove: 'Qe5+',
    correctMove: 'Qd8',
    explanation:
      "After 3.Nc3 the queen must retreat, and the check 3...Qe5+? is the wrong way to do it — it looks active but White just blocks with Be2 or Nge2 gaining a tempo, then hounds the queen with d4 and the rooks while Black loses move after move. Samay tucks the queen home with the modern 3...Qd8 (3...Qa5 is the other main): a small space concession for a rock-solid, well-mapped structure.",
    shortNarration: 'Retreat with Qd8 — never the Qe5+ check.',
    sources: [ARCH, 'concept:pos-development', 'https://www.chess.com/openings/Scandinavian-Defense'],
  },
  'pro-samayraina-italian': {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5',
    wrongMove: 'd4',
    correctMove: 'd3',
    explanation:
      "In the Giuoco Piano the natural-looking d4 hands Black easy equality with the fork trick: exd4, cxd4, Bb4 check, then Nxe4! and Black regains the pawn with a free game. Samay plays the Pianissimo d3 instead — the slow squeeze, keeping the centre intact and the bishop on c4 aimed at f7. At club level the quiet build-up scores better than the premature break.",
    shortNarration: 'Play d3, the Pianissimo — d4 lets the fork trick free Black.',
    sources: [ARCH, 'concept:pos-initiative', 'https://www.chess.com/openings/Italian-Game-Giuoco-Pianissimo'],
  },
  'pro-samayraina-ruy': {
    fen: 'r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 w - - 1 9',
    wrongMove: 'd4',
    correctMove: 'h3',
    explanation:
      "Rushing d4 in the Closed Ruy walks into the reply Bg4, pinning the f3-knight against the queen and piling pressure on the d4-point before White is ready. That is exactly why h3 is almost automatic here — Samay's prophylactic move takes the g4-square away first, and only then does he prepare d4 under his own terms. A quiet tempo now saves a headache later.",
    shortNarration: 'h3 first — stop the Bg4 pin before you push d4.',
    sources: [ARCH, 'concept:pos-development', 'https://www.chess.com/openings/Ruy-Lopez-Closed'],
  },
};

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
for (const [openingId, p] of Object.entries(ADD)) {
  const c = new Chess(p.fen);
  if (!c.move(p.wrongMove)) throw new Error(`${openingId}: illegal wrongMove ${p.wrongMove}`);
  const c2 = new Chess(p.fen);
  if (!c2.move(p.correctMove)) throw new Error(`${openingId}: illegal correctMove ${p.correctMove}`);
  if (!Array.isArray(data[openingId])) data[openingId] = [];
  if (data[openingId].some((e) => e.fen === p.fen && e.wrongMove === p.wrongMove)) {
    console.log(`skip (exists) ${openingId}`);
    continue;
  }
  data[openingId].push(p);
  console.log(`added ${openingId} (${data[openingId].length} pitfalls now)`);
}
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
