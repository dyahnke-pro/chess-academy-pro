// Rewrites the Capablanca–Marshall 1918 model game's criticalMoments into
// a graceful, story-driven narration (David 2026-05-21): model-game
// narration reinforces the LESSON THEORY at key moments (not move-by-move)
// and pauses to appreciate the BEAUTY of the game. Moments fire at the
// viewer's convention (moveNumber = ceil(plyIndex/2), color by parity);
// FENs computed by chess.js from the real game. G3-safe (real moves).
//
// Run: node scripts/narrate-capablanca-marshall.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';

// Keyed by ply index (1-based half-move count after the move is played).
const MOMENTS = [
  {
    ply: 16, // 8...d5
    annotation:
      "The Marshall Attack is born — right here, in 1918. Black hurls the d-pawn forward and offers e5. The pawn is not the point: Marshall had kept this idea secret for years, saving it for Capablanca himself. This is the gambit's whole soul — give up a pawn to tear the centre open and aim every piece at the white king.",
    concept: 'Gambit for the initiative',
    highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: KEY }],
  },
  {
    ply: 26, // 13...Ng4
    annotation:
      "Feel the initiative gather. The knight springs to g4, the queen is coming to h4, and within a few moves a wave of black pieces will be breaking over the white king. This is what the pawn bought — overwhelming activity. The position itself looks like a storm about to land.",
    concept: 'Overwhelming initiative — the price of the pawn',
    highlights: [{ square: 'g4', color: ATK }, { square: 'g2', color: SOFT }],
    arrows: [{ from: 'g4', to: 'f2', color: ATK }],
  },
  {
    ply: 27, // 14.Qf3
    annotation:
      "And here is the move that decides the game — Qf3. Capablanca, meeting this storm for the very first time, finds the one square that does everything at once: it shields g2, it plugs the f-file, it stares straight back down the board. This is the only-move defense made flesh — no panic, no fear, just the exact square. Pure ice.",
    concept: 'The only-move defense (the lesson, in the wild)',
    highlights: [{ square: 'f3', color: KEY }, { square: 'g2', color: SOFT }],
    arrows: [{ from: 'f3', to: 'g2', color: ATK }],
  },
  {
    ply: 31, // 16.Re2
    annotation:
      "Marshall throws in everything — ...Nxf2, smashing at the king. Most players would flinch. Capablanca answers with the quietest move on the board, Re2, calmly stepping the rook to safety and defence. Meet violence with precision, never with fear — that is the whole art of defending the Marshall.",
    concept: 'Precision under fire — return material, not nerve',
    highlights: [{ square: 'e2', color: KEY }, { square: 'f2', color: ATK }],
  },
  {
    ply: 39, // 20.Ke2
    annotation:
      "Now watch the white king. It walks — out to f1, then e2 — straight through the middle of the attack, because Capablanca has calculated to the end and knows there is no mate. The king becomes a soldier, strolling through fire. There is a strange, cold beauty in that fearlessness.",
    concept: 'The king as a fighting piece',
    highlights: [{ square: 'e2', color: KEY }],
  },
  {
    ply: 51, // 26.Bd5
    annotation:
      "The storm has blown itself out. Bd5 centralises the bishop and the truth is laid bare: the attack is spent, and White stands with extra material and a safe king. The Marshall's bargain — a pawn for an initiative — has come due, and the initiative has nothing left to spend.",
    concept: 'When the attack burns out, material decides',
    highlights: [{ square: 'd5', color: KEY }],
  },
  {
    ply: 73, // 37.b8=Q+
    annotation:
      "The final flourish: the humble b-pawn marches home and becomes a queen, with check. Capablanca has not merely survived the most feared weapon of his age — he has turned it into a won game. The Marshall Attack lost its own debut, refuted by the calmest mind in chess. That is the beauty of defense: the storm passes, and the quiet player is the one still standing.",
    concept: 'Refutation complete — calm outlasts the storm',
    highlights: [{ square: 'b8', color: KEY }],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
const games = Array.isArray(data) ? data : data.games;
const g = games.find((x) => /marshall/i.test(x.black ?? '') && /capablanca/i.test(x.white ?? ''));
if (!g) throw new Error('Capablanca-Marshall game not found');

const c = new Chess();
const tokens = (g.pgn ?? '').trim().split(/\s+/).filter(Boolean);
const fenAtPly = {};
tokens.forEach((san, i) => {
  if (!c.move(san)) throw new Error(`illegal ${san} at ${i}`);
  fenAtPly[i + 1] = c.fen(); // 1-based ply
});

g.criticalMoments = MOMENTS.map((m) => {
  const fen = fenAtPly[m.ply];
  if (!fen) throw new Error(`no FEN at ply ${m.ply}`);
  const moveNumber = Math.ceil(m.ply / 2);
  const color = m.ply % 2 === 1 ? 'white' : 'black';
  return {
    moveNumber,
    color,
    fen,
    annotation: m.annotation,
    concept: m.concept,
    ...(m.arrows ? { arrows: m.arrows } : {}),
    ...(m.highlights ? { highlights: m.highlights } : {}),
  };
});

writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${g.criticalMoments.length} graceful critical moments for ${g.white} vs ${g.black} ${g.year}`);
g.criticalMoments.forEach((m) => console.log(`  ${m.moveNumber}${m.color === 'white' ? '.' : '...'} — ${m.concept}`));
