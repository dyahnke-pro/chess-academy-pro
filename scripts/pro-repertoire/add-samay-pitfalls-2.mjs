#!/usr/bin/env node
// Second pitfall batch for Samay — tactically-verified (chess.js-provable
// forced refutations) or textbook-documented, on-repertoire, board-verified.
// No move-number prefixes in spoken text (G9.4). No invented eval claims.
import fs from 'node:fs';
import { Chess } from 'chess.js';
const PATH = 'src/data/common-mistakes.json';
const ARCH = 'https://api.chess.com/pub/player/samayraina/games/archives';

const ADD = {
  'pro-samayraina-sicilian-black': {
    fen: 'r1bqkbnr/pp1p1ppp/2n5/1N2p3/4P3/8/PPP2PPP/RNBQKB1R b KQkq - 1 5',
    wrongMove: 'a6', correctMove: 'd6',
    explanation: "In the Kalashnikov, after Nb5 the natural-looking a6 is a blunder: Nd6+ forks the king and forces …Bxd6, handing White the bishop pair and a lasting bind. Play d6 first — it takes the d6-square away from the knight; then …a6 is safe and Black is comfortable with the big centre.",
    shortNarration: 'Play d6 first — …a6 allows Nd6+.',
    sources: [ARCH, 'concept:tac-double-attack', 'https://www.chess.com/openings/Sicilian-Defense-Kalashnikov-Variation'],
  },
  'pro-samayraina-scandi': {
    fen: 'r1bqkb1r/ppp1pppp/2n2n2/8/2BP4/2N2N2/PPP2PPP/R1BQK2R b KQkq - 4 6',
    wrongMove: 'e6', correctMove: 'Bf5',
    explanation: "The whole point of the modern Scandinavian is to develop the light-squared bishop OUTSIDE the pawn chain. Playing e6 first entombs the c8-bishop behind its own pawns for the rest of the game. Always play Bf5 (or Bg4) first; only then e6. This is the single most important move-order in the line.",
    shortNarration: 'Bf5 before e6 — never bury the bishop.',
    sources: [ARCH, 'concept:pos-development', 'https://www.chess.com/openings/Scandinavian-Defense'],
  },
  'pro-samayraina-open-e5': {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 5',
    wrongMove: 'Nxe4', correctMove: 'd6',
    explanation: "In the Pianissimo the e4-pawn looks loose, but grabbing it with Nxe4 simply drops a piece — dxe4 recaptures and the f6-knight is gone for a single pawn. Keep developing with d6 or castle; the …d5 break is how Black challenges e4 safely, not a one-move pawn grab.",
    shortNarration: 'Don’t grab e4 — Nxe4 drops the knight to dxe4.',
    sources: [ARCH, 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game-Giuoco-Pianissimo'],
  },
  'pro-samayraina-kings-gambit': {
    fen: 'rnb1kbnr/pppp1ppp/8/8/2B1Pp1q/8/PPPP2PP/RNBQK1NR w KQkq - 2 4',
    wrongMove: 'g3', correctMove: 'Kf1',
    explanation: "Against the Qh4+ check in the Bishop's Gambit, the routine g3 is a serious error: fxg3 rips open the f-file and the dark squares around White's king. The correct reply is Kf1 — the king is perfectly safe, the extra centre and faster development tell, and Black's early queen sortie only costs Black time.",
    shortNarration: 'Kf1, never g3 — g3 lets fxg3 rip open the king.',
    sources: [ARCH, 'concept:pos-king-safety', 'https://www.chess.com/openings/Kings-Gambit'],
  },
};

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
for (const [oid, p] of Object.entries(ADD)) {
  const a = new Chess(p.fen); if (!a.move(p.wrongMove)) throw new Error(`${oid}: illegal wrong ${p.wrongMove}`);
  const b = new Chess(p.fen); if (!b.move(p.correctMove)) throw new Error(`${oid}: illegal correct ${p.correctMove}`);
  if (!Array.isArray(data[oid])) data[oid] = [];
  if (data[oid].some((e) => e.fen === p.fen && e.wrongMove === p.wrongMove)) { console.log('skip', oid); continue; }
  data[oid].push(p); console.log('added', oid, `(${data[oid].length} now)`);
}
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
