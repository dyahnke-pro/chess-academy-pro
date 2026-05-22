#!/usr/bin/env node
// Populate per-variation keyIdeas (4 each) for the Vienna's first-class
// variations. Hand-authored, grounded in the masterclass lessons.
// Idempotent — overwrites existing keyIdeas on these variations.
//
// Mirrors the pattern of add-ruy-variation-keyideas.mjs / add-pirc-variation-keyideas.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REP_PATH = join(__dirname, '..', 'src', 'data', 'repertoire.json');

// Variation NAME → 4 keyIdeas (student-side plans, the side you actually
// play — White in the Vienna). Grounded in the masterclass lessons.
const KEY_IDEAS = {
  'Vienna Gambit': [
    'Use Lasker\'s f4 lever — pull Black\'s e5-pawn away with a thrust from the side, exactly the principle from Chess Strategy.',
    'After 3...d5 (the principled reply) accept with 4.fxe5 and aim for the giant d4-e5 centre with Nf3, Be7, d4.',
    'Recapture with bxc3 after the knight trade — keep the big centre and the bishop pair instead of regaining the pawn.',
    'The Bd3 lines up the b1-h7 diagonal — when Black plays …c5 the diagonal opens and the bishop becomes decisive.',
  ],
  'Falkbeer Variation': [
    'After 3.Bc4 Nxe4 only 4.Qh5! works — recapturing or developing calmly loses the entire opening edge.',
    'The Nb5 / Nxc7+ raid wins the exchange against the wild 5…Nc6 line — this is the famous Frankenstein-Dracula main line.',
    'Black\'s queen will be chased to f5/h5 — every Black defensive move creates a new weakness for White to exploit.',
    'After Nxa8 White is up the exchange and a pawn; Black has practical compensation but theory says White comes out ahead.',
  ],
  'Frankenstein-Dracula': [
    'The calmer 5…Be7 (instead of 5…Nc6) lets White recover the pawn cleanly with Qxe5 and build a d4 centre.',
    'White\'s queen tour Qh5-Qxe5-Qf4 keeps the queen active throughout the opening; Black wastes time chasing it.',
    'Black\'s Nd6 is misplaced and blocks the d-pawn — Black needs multiple tempi to redeploy it via e8.',
    'White\'s Bb3 + Qf4 + d4 + future Nge2 build a coherent attacking position; Black\'s pieces are awkwardly placed.',
  ],
  'Vienna vs 2...Nc6': [
    'Against 2…Nc6 White has TWO completely different paths: calm Italian-Vienna with 3.Bc4, or sharp 3.f4 leading to the historical sacrifices.',
    'The 3.f4 path opens the doorway to Hamppe-Allgaier (Nxf7), Hamppe-Muzio (O-O sacrifice), Pierce Gambit (d4), and Steinitz\'s king-walk.',
    'In the Bc4 line, the Bg5 pin + Nd5 fork (on Nf6 + c7) is the standard tactical motif — exactly the same as the Italian Game.',
    '2…Nc6 is the most common Black reply at amateur level (39% of replies) — knowing both paths is essential.',
  ],
  'Paulsen Attack': [
    'The fianchettoed Bg2 rakes the long light diagonal — screened by e4 until the centre opens, then decisive.',
    'The Nc3-Nge2 setup keeps both knights flexible — Nge2 can reroute via f4 (attacking) or g3 (supporting).',
    'The Nd5 outpost is the dream — once a knight lands there with the Bg2 supporting, Black\'s position cracks.',
    'No forced lines to memorise — the Paulsen is the GM\'s pragmatic Vienna, leveraging position over tactics. Mamedyarov\'s favourite.',
  ],
};

function main() {
  const data = JSON.parse(readFileSync(REP_PATH, 'utf-8'));
  const vienna = data.find((o) => o.id === 'vienna-game');
  if (!vienna) throw new Error('vienna-game not found in repertoire.json');
  let touched = 0;
  for (const variation of vienna.variations ?? []) {
    const ki = KEY_IDEAS[variation.name];
    if (!ki) continue;
    variation.keyIdeas = ki;
    touched += 1;
    console.log(`  ✓ ${variation.name} — 4 keyIdeas`);
  }
  writeFileSync(REP_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`[vienna-keyideas] populated ${touched} Vienna variations.`);
}

main();
