#!/usr/bin/env node
// Sicilian Kan data layers for Aman: pro-repertoires.json entry + model games.
// Reads the corpus scan (/tmp/aman-model-games.json). Idempotent.
import fs from 'node:fs';

const ID = 'pro-aman-sicilian-kan';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];

const REPERTOIRE = {
  id: ID, playerId: 'aman', eco: 'B42', name: 'Sicilian Kan / Taimanov (Aman)',
  color: 'black', style: 'Flexible, Positional',
  pgn: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6 f4 Nbd7',
  overview: "Aman Hambleton's crown jewel — the Sicilian with 2...e6, the single most-played line in his entire 35,000-game library (2,006 games, 74.8%). The whole appeal is flexibility and low theory: 2...e6 keeps the choice open between the Kan's …a6 and the Taimanov's …Nc6, building a small, springy structure instead of memorizing forced lines. The signature move is 4...a6, slamming the door on Nb5 and clearing the way for …b5, the queenside expansion that powers Black's whole plan. With …Qc7, …Bb7 and the …b5/…d5 breaks, Black plays where Black is strong while White attacks the kingside. This is the Building-Habits philosophy made into an opening: sound structure first, then outplay.",
  keyIdeas: [
    'Play …a6 to stop Nb5 and prepare the …b5 queenside expansion.',
    'Develop …Qc7 (Bastrikov) to eye e5 and the half-open c-file.',
    'Build the small …e6/…d6 centre, then break with …b5 or …d5.',
    'Race on the queenside while White attacks the king — play where you are strong.',
  ],
  traps: [],
  warnings: ['Black expands on the queenside, White storms the kingside — castle and complete development before opening lines, or the f4-f5 push arrives first.'],
  trapLines: [], warningLines: [],
  sources: ['book:sicilian', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Kan-Variation', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'Open Kan (Bd3 + f4)', pgn: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6 f4 Nbd7',
      explanation: 'His main line (127 games at this exact spine, 78%). White grabs kingside space with f4; Black completes with …Nbd7 and strikes …b5, racing on the queenside while White attacks the king.',
      sources: ['book:sicilian', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Kan-Variation'] },
    { name: 'Taimanov (...Nc6)', pgn: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Be2 Nf6 O-O Bb4',
      explanation: 'His best-scoring Kan branch (200 games, 81%). …Nc6 pressures the d4-knight; the active …Bb4 pins c3 and pressures e4, handing Black the bishop pair if White breaks the pin.',
      sources: ['book:sicilian', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Taimanov-Variation'] },
    { name: 'Maróczy Bind (5.c4)', pgn: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4 Qc7 Nc3 Nf6 Be2 d6 O-O b6 Be3 Bb7 f3 Nbd7 Qd2',
      explanation: '189 games, 73%. Against the c4 clamp, Black sets up the hedgehog — …d6, …b6, …Bb7, …Nbd7 — coiled and patient, waiting to uncoil with …b5 or …d5.',
      sources: ['book:sicilian', 'concept:pawn-structure', 'https://www.chess.com/openings/Sicilian-Defense-Kan-Variation-Maroczy-Bind'] },
    { name: 'vs Alapin (2.c3)', pgn: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Na3 Bxb3 Qxb3 Qd7 Rd1',
      explanation: '211 games, 73%. Meet the Alapin with …Nf6 hitting e4, …Nd5 outpost, and the freeing …d5 break — into a dead-equal, open game.',
      sources: ['book:sicilian', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation'] },
  ],
};

const VAR_LABEL = { 'open-main': 'Open Kan', 'taimanov-nc6': 'Taimanov', 'maroczy-c4': 'Maróczy Bind', 'alapin-c3': 'Alapin' };
const VAR_STORY = {
  'open-main': 'the …b5 queenside race against the f4 kingside storm — Black pushes where Black is strong and gets there first',
  'taimanov-nc6': 'the …Nc6 / …Bb4 plan, pinning the knight and pressing e4 into an active, fighting middlegame',
  'maroczy-c4': 'the hedgehog against the bind — patient …b6/…Bb7 pressure, then uncoiling with a pawn break',
  'alapin-c3': 'the …Nf6/…Nd5/…d5 equalizer that frees Black’s pieces and dissolves White’s space',
};
function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }

const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'black',
    overview: `Hambleton's ${VAR_LABEL[vk]} in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VAR_STORY[vk]}. A clean model of the plan working against a strong opponent.` });
});

const repPath = 'src/data/pro-repertoires.json';
const rep = JSON.parse(fs.readFileSync(repPath, 'utf8'));
rep.openings = rep.openings.filter((x) => x.id !== ID);
rep.openings.push(REPERTOIRE);
if (rep.players && !rep.players.some((p) => p.id === 'aman')) {
  rep.players.push({ id: 'aman', name: 'Aman Hambleton', title: 'GM', rating: 2560, style: 'Universal, Principle-first', description: "Chessbrah co-founder and Building Habits teacher — a universal, principle-first repertoire built from 35,000+ of his chess.com games, teaching sound structure and good habits over memorized theory.", imageInitials: 'AH' });
}
fs.writeFileSync(repPath, JSON.stringify(rep, null, 2) + '\n');

const mgPath = 'src/data/model-games.json';
const mg = JSON.parse(fs.readFileSync(mgPath, 'utf8'));
fs.writeFileSync(mgPath, JSON.stringify([...mg.filter((x) => x.openingId !== ID), ...models], null, 2) + '\n');

console.log(`pro-repertoires: added ${ID} (${REPERTOIRE.variations.length} variations); model-games: ${models.length}`);
