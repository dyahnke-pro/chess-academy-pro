import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const fenOf = (sans) => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };
const RUY = 'https://www.chess.com/openings/Ruy-Lopez-Opening';
const NAJ = 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation';
const TAI = 'https://www.chess.com/openings/Sicilian-Defense-Taimanov-Variation';
const CK = 'https://www.chess.com/openings/Caro-Kann-Defense';
const IT = 'https://www.chess.com/openings/Italian-Game';

// Engine-verified (studentEval = -rawEval; correct move clearly better). cue ≤8 words.
const P = [
  ['pro-caruana-ruy-lopez', ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'b5'], 'Bxb5', 'Bb3',
    "After …b5 it is tempting to grab the pawn with Bxb5, but it loses a piece to …axb5, when the a8-rook recaptures the bishop. Retreat to b3 instead, keeping the bishop on the strong a2-g8 diagonal and a healthy game.",
    'Bxb5 hangs to …axb5; play Bb3.', ['concept:pos-material', RUY]],
  ['pro-caruana-italian', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'O-O'], 'Bxf7+', 'O-O',
    "The Greek-gift sacrifice Bxf7+ looks tempting, but here it is simply unsound — after …Kxf7 White has no follow-up and is just down a bishop for one pawn. The modern Italian is a slow, strategic game: castle, and build the Pianissimo squeeze instead of sacrificing.",
    'Bxf7+ is unsound here; just castle.', ['concept:pos-material', IT]],
  ['pro-caruana-najdorf', ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'], 'e5', 'a6',
    "Playing …e5 immediately, before …a6, walks into Nb5 — the knight leaps to a strong square hitting d6 and eyeing c7, and Black has no good way to chase it. Always insert …a6 first: it controls b5, and only then is …e5 the principled central break.",
    'Premature …e5 allows Nb5; play …a6 first.', ['concept:pos-development', NAJ]],
  ['pro-caruana-najdorf', ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2'], 'b5', 'e5',
    "The immediate …b5 is loose — it weakens the queenside and lets White hit back with a4 before Black is developed. The principled move is …e5, grabbing the centre and gaining time on the d4-knight. Claim the centre first, then expand on the queenside.",
    'Loose …b5; grab the centre with …e5.', ['concept:pos-center', NAJ]],
  ['pro-caruana-taimanov', ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nc3', 'a6', 'Nxc6', 'bxc6', 'Bd3'], 'e5', 'd5',
    "Locking the centre with …e5 hands White a permanent grip on the d5-square and a fine outpost. The right break is …d5, hitting e4 head-on and freeing Black's game. Strike the centre, don't fix it.",
    "Don't lock with …e5; strike with …d5.", ['concept:pos-center', TAI]],
  ['pro-caruana-caro-kann', ['e4', 'c6', 'd4', 'd5', 'Bd3'], 'g6', 'dxe4',
    "When White plays the loose Bd3 before defending e4, the e4-pawn simply hangs — grab it with …dxe4! After Bxe4 Nf6 Black develops with tempo and is comfortably equal. Don't play a quiet move like …g6 and let White off the hook; punish the inaccuracy.",
    'Bd3 drops e4 — take it with …dxe4.', ['concept:pos-material', CK]],
];

const out = {};
for (const [oid, setup, wrong, correct, explanation, shortN, sources] of P) {
  const fen = fenOf(setup);
  new Chess(fen).move(wrong);
  new Chess(fen).move(correct);
  const wc = shortN.replace(/…/g, '').trim().split(/\s+/).length;
  if (wc > 8) throw new Error('cue too long (' + wc + '): ' + shortN);
  (out[oid] = out[oid] || []).push({ fen, wrongMove: wrong, correctMove: correct, explanation, shortNarration: shortN, sources });
}
const path = 'src/data/common-mistakes.json';
const cm = JSON.parse(readFileSync(path, 'utf8'));
for (const k of Object.keys(cm)) if (k.startsWith('pro-caruana')) delete cm[k];
Object.assign(cm, out);
writeFileSync(path, JSON.stringify(cm, null, 2) + '\n');
console.error('wrote pitfalls for ' + Object.keys(out).length + ' openings, ' + Object.values(out).reduce((a, b) => a + b.length, 0) + ' total');
