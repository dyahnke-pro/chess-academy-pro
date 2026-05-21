// Adds per-variation `keyIdeas` (student-side = BLACK plans) to the Pirc
// Defence's 8 variations in repertoire.json. These were empty, so every
// tab fell back to the generic opening-level four. Ideas only — plans
// the student plays — no FENs, no invented theory; the moves referenced
// (...c5, ...e5, ...Na6-c7, ...b5, ...f5, ...Qa5) are the standard,
// mainstream plans of each system, already present in the variation pgns.
//
// Run: node scripts/add-pirc-variation-keyideas.mjs
// Then bump BASE_DATA_REVISION in src/services/dataLoader.ts.

import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'src/data/repertoire.json';

const KEY_IDEAS = {
  'Austrian Attack': [
    "Don't fear the big e4-d4-f4 centre — strike its base with ...c5 before White rolls f4-f5 forward.",
    'Reroute the knight ...Na6-c7 to support the ...b5 break.',
    'When White locks with d5, switch wings: load the b-file with ...Rb8, ...b6, ...Bb7 and break with ...b5.',
    "It's a race — counter on the queenside as fast as White attacks your king; never just sit and defend.",
  ],
  'Classical System': [
    'Equalise with the classical scheme: ...c6 and ...Nbd7 to prepare the freeing ...e5 break.',
    'Time ...e5 to challenge d4 head-on; after dxe5 dxe5 the open d-file gives easy play.',
    'Put the queen on e7 to back the e5-pawn and connect the rooks.',
    "Reroute the knight toward the f4 outpost — active pieces are your answer to White's quiet setup.",
  ],
  '150 Attack': [
    'Meet the blunt plan with speed: ...c6 launches your ...b5-b4 counter-storm before the h-pawn arrives.',
    'Allow the Bh6 trade — your dark squares get airier, but the counterplay arrives in time.',
    'Strike first with ...Qa5, hitting c3 and backing the queenside pawns.',
    "Castle into the race knowing it's mutual: your b-pawn at his king versus his h-pawn at yours.",
  ],
  'Byrne Variation': [
    'White castles long — attack the king with ...c6 and ...b5-b4 at full speed.',
    "Be ready to sacrifice the f6-knight to crack open White's queenside cover.",
    'Rip the centre open with ...d5 so the g7-bishop and heavy pieces pour toward c3.',
    "In opposite-side castling, don't defend — race; whoever's storm lands first wins.",
  ],
  'Lion Variation': [
    'Skip the fianchetto: ...e5 steers into a solid Philidor-like structure, dodging Austrian theory.',
    'Build flexibly with ...Nbd7, ...Be7 and ...c6 — keep every option open.',
    'Fianchetto the light-squared bishop to b7 to pressure the long diagonal.',
    'Coil for ...b6 and queenside expansion; centralise a knight on e5 when White trades.',
  ],
  'Fianchetto System': [
    "Against White's quiet fianchetto, play for the centre: ...e5 and ...Nc6 to hit d4.",
    'When White locks with d5, reroute ...Ne7 toward the f5 blockade square.',
    "Win the kingside with the ...f5 break — get there before White's f4.",
    'Use your space to open lines for the g7-bishop and the rooks.',
  ],
  'Czech Defence': [
    'Choose the compact ...c6 setup over the fianchetto to sidestep the sharpest Austrian lines.',
    'Pin the c3-knight with ...Qa5 to freeze the centre and prepare ...e5.',
    'Challenge the centre directly with ...e5; pin its defender with ...Bg4.',
    "Trade to loosen White's grip, then strike with ...c5 — aim for a sound, harmonious game.",
  ],
  'Austrian Attack with e5 c5': [
    'When White lunges e5, retreat the knight to d7 (not the rim) — keep it active and pressing e5.',
    'Hit the base of the chain with ...c5 — an advanced pawn no longer defends what it left behind.',
    "Don't blockade the centre; undermine it — the overextended pawns become targets.",
    'Trust the hypermodern idea: meet brute force with a precise central counter-punch.',
  ],
};

const data = JSON.parse(readFileSync(PATH, 'utf8'));
const arr = Array.isArray(data) ? data : (data.openings ?? data.repertoire ?? null);
if (!arr) throw new Error('unexpected repertoire.json shape');
const pirc = arr.find((e) => e.id === 'pirc-defence');
if (!pirc) throw new Error('pirc-defence not found');

let updated = 0;
for (const v of pirc.variations ?? []) {
  const ideas = KEY_IDEAS[v.name];
  if (!ideas) { console.warn(`  no key ideas authored for variation "${v.name}"`); continue; }
  v.keyIdeas = ideas;
  updated++;
}
const missing = Object.keys(KEY_IDEAS).filter((n) => !(pirc.variations ?? []).some((v) => v.name === n));
if (missing.length) throw new Error(`authored ideas for variations not in repertoire: ${missing.join(', ')}`);

writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Pirc per-variation key ideas: set on ${updated}/${(pirc.variations ?? []).length} variations.`);
console.log('REMEMBER: bump BASE_DATA_REVISION in src/services/dataLoader.ts so seeded devices reconcile.');
