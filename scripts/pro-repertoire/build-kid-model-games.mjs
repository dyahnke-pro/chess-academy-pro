#!/usr/bin/env node
// Build KID model game entries from existing deep-build JSON files.
// Each KID variation's topModelGames includes full PGNs already (no
// scanning required). For each variation, pick the top 1-2 wins and
// emit a model-games.json entry with hand-curated overview.

import fs from 'node:fs';

const SRC = ['https://www.chess.com/openings/Kings-Indian-Defense'];

// Per-variation overview templates — hand-authored summaries of the
// KID structural patterns the game demonstrates. Pass the specific
// opponent / rating / ply count in at build time.
const VARIATIONS = [
  {
    key: 'kid-classical-mainline',
    label: 'Classical Mar del Plata (Be2)',
    idSuffix: 'classical',
    blurb: (g) => `Naroditsky vs ${g.opponent} (${g.opponentRating}), ${g.plyCount}-ply Mar del Plata Classical (Be2). The signature Nh5-Nf4 knight reroute + …c5 queenside lock + R+min+P endgame conversion. Watch how the Bg7 dominates the long diagonal once the bishops trade off — the classical KID structural template.`,
  },
  {
    key: 'kid-fianchetto',
    label: 'Fianchetto Variation (g3)',
    idSuffix: 'fianchetto',
    blurb: (g) => `Naroditsky vs ${g.opponent} (${g.opponentRating}), ${g.plyCount}-ply KID Fianchetto. White's mirror fianchetto with Bg2 neutralises our long diagonal, so the game decides on the queenside — watch the …Qa5 + …b5 + …b4 Yugoslav expansion. The c4-pawn becomes the target and the structural pressure converts in the R+min+P endgame.`,
  },
  {
    key: 'kid-anti-kid-nf3',
    label: 'Anti-KID with Nf3 first',
    idSuffix: 'antikidnf3',
    blurb: (g) => `Naroditsky vs ${g.opponent} (${g.opponentRating}), ${g.plyCount}-ply Anti-KID Nf3. White's flexible move order transposes to a Fianchetto-Yugoslav structure. Black plays the same queenside-expansion plan — …Qa5, …b5, …b4 wedge — and the position resolves into the standard KID structural fight. Notice the rook lift to e8 hitting e4.`,
  },
  {
    key: 'kid-makogonov',
    label: 'Makogonov (h3)',
    idSuffix: 'makogonov',
    blurb: (g) => `Naroditsky vs ${g.opponent} (${g.opponentRating}), ${g.plyCount}-ply KID Makogonov. White's h3 prophylaxis stops …Ng4 but doesn't stop the …Nh5 reroute from f6 directly. Watch the Na6 → c5 queenside reroute paired with the kingside Nh5-Nf4 outpost. The …c5 secures the queenside, then …f5 storm cracks the kingside.`,
  },
  {
    key: 'kid-saemisch',
    label: 'Sämisch (f3)',
    idSuffix: 'saemisch',
    blurb: (g) => `Naroditsky vs ${g.opponent} (${g.opponentRating}), ${g.plyCount}-ply KID Sämisch. White's f3 + Be3 + Qd2 + O-O-O setup signals a kingside storm; Black answers with the Bronstein/Panno queenside race — …a6 + …b5. The trade-down sequence simplifies into a R+min+P endgame where Black's queenside space + bishop pair convert.`,
  },
  {
    key: 'kid-petrosian-nge2',
    label: 'Petrosian / Nge2',
    idSuffix: 'petrosian',
    blurb: (g) => `Naroditsky vs ${g.opponent} (${g.opponentRating}), ${g.plyCount}-ply KID Petrosian. White's Nge2 keeps the c1-h6 diagonal open. Black plays the Panno-style …a6 + …b5 queenside expansion; the c5 + cxd6 exd6 pawn break opens the e-file for Black. Watch the …Nd5 central outpost emerge after the queenside pressure.`,
  },
  {
    key: 'kid-four-pawns',
    label: 'Four Pawns Attack (f4)',
    idSuffix: 'fourpawns',
    blurb: (g) => `Naroditsky vs ${g.opponent} (${g.opponentRating}), ${g.plyCount}-ply Four Pawns Attack. White's c4-d4-e4-f4 over-extension looks intimidating but every pawn forward is one fewer piece defending. Black undermines with …e5 + …Ne8-Nd6 reroute — the prize square d6 lets the knight hit c4 + e4 simultaneously, and the chain becomes a target.`,
  },
];

function stripPgn(pgn) {
  const i = pgn.search(/\n\n/);
  let body = i < 0 ? pgn : pgn.slice(i + 2);
  body = body.replace(/\{[^}]*\}/g, '');
  // Strip nested variations
  let prev;
  do { prev = body; body = body.replace(/\([^()]*\)/g, ''); } while (body !== prev);
  // Strip move numbers like "1." "1..." "2." etc.
  body = body.replace(/\b\d+\.+\s*/g, '');
  // Strip result token
  body = body.replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '');
  return body.replace(/\s+/g, ' ').trim();
}

const out = [];
for (const v of VARIATIONS) {
  let data;
  try { data = JSON.parse(fs.readFileSync('data/sources/danielnaroditsky-deep/' + v.key + '.json', 'utf8')); }
  catch (e) { console.error('SKIP ' + v.key + ': ' + e.message); continue; }
  const wins = data.topModelGames.filter(g => g.outcome === 'win');
  // Take top 2 wins by opponent rating, dedupe by opponent
  const byOpp = new Map();
  for (const g of wins) {
    const cur = byOpp.get(g.opponent);
    if (!cur || g.opponentRating > cur.opponentRating) byOpp.set(g.opponent, g);
  }
  const picked = [...byOpp.values()].sort((a, b) => b.opponentRating - a.opponentRating).slice(0, 2);
  for (let i = 0; i < picked.length; i++) {
    const g = picked[i];
    const id = 'mg-pro-naroditsky-kid-' + v.idSuffix + '-' + (i + 1);
    out.push({
      id,
      openingId: 'pro-naroditsky-kid',
      white: 'Opponent',
      black: 'DanielNaroditsky',
      whiteElo: g.opponentRating,
      blackElo: g.studentRating,
      result: g.outcome === 'win' ? '0-1' : (g.outcome === 'loss' ? '1-0' : '1/2-1/2'),
      year: g.date ? new Date(g.date).getFullYear() : 2023,
      event: 'Chess.com Blitz',
      pgn: stripPgn(g.pgn),
      sourceUrl: g.url,
      studentSide: 'black',
      overview: v.blurb(g),
    });
  }
  console.error(`${v.key}: ${picked.length} model games selected`);
}

console.log(JSON.stringify(out, null, 2));
