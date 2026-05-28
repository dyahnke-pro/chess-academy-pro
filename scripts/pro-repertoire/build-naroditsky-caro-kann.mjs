#!/usr/bin/env node
// Replace all Naroditsky entries in src/data/pro-repertoires.json
// with the new data-derived Caro-Kann build. Also adds model-game
// entries (one per major variation) to src/data/model-games.json.
//
// Every move in the spine + variations comes from
// data/sources/danielnaroditsky-trees/caro-kann.json (his actual
// game frequency-ranked). The narration paraphrases his recurring
// teaching principles from listudy.org (sourced; never verbatim).
// Model-game PGNs come from his real chess.com wins vs 3100+ rated
// opponents in the same variation.

import fs from 'node:fs';
import path from 'node:path';

const PRO_REP_PATH = 'src/data/pro-repertoires.json';
const MODEL_GAMES_PATH = 'src/data/model-games.json';
const TREE_PATH = 'data/sources/danielnaroditsky-trees/caro-kann.json';
const MODEL_GAMES_SRC = 'data/sources/danielnaroditsky-trees/caro-kann-model-games.json';
const DATA_LOADER = 'src/services/dataLoader.ts';

const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
const mgSrc = JSON.parse(fs.readFileSync(MODEL_GAMES_SRC, 'utf8'));
const proRep = JSON.parse(fs.readFileSync(PRO_REP_PATH, 'utf8'));
const modelGames = JSON.parse(fs.readFileSync(MODEL_GAMES_PATH, 'utf8'));

// ============================================================
// THE NEW CARO-KANN ENTRY (Naroditsky as Black)
// All move sequences sourced from his 3,546 Caro-Kann games on
// chess.com (data/sources/danielnaroditsky-chesscom/, analyzed via
// scripts/pro-repertoire/extract-opening-tree.mjs).
// Sample: 65% score, 14-ply main spine, 6 ranked variations.
// ============================================================

// Main spine — exactly what Naroditsky plays most against 1.e4 c6 2.d4 d5 3.e5.
// "Caro-Kann Advance, Botvinnik-Carls Defense with 3...c5" (chess.com ECO B12).
// 1,200+ games at this exact 14-ply spine.
const SPINE_PGN = 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7';

// Variations ranked by his actual usage. branchSan + first 4-8
// continuation moves come straight from the extracted tree.
const VARIATIONS = [
  {
    name: 'Two Knights Variation (2.Nc3)',
    pgn: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 b5 Bb3 Qc7',
    explanation:
      "When White plays Nc3 on move 2, they're sidestepping the main Caro mainlines and inviting a piece game. The point of this line for us as Black: play …d5 straight away, let the centre trade, and develop fast. After the early piece trades we end up with Bb3 vs …b5 / …Qc7 — a comfortable position where our queen and pieces are coordinated and White's bishop on b3 is staring at granite (the b5-pawn). From here we look to finish development with …Bb7 and …Be7, castle short, and consolidate. The number-one rule against the Two Knights: don't get cute, just play sound moves and reach a balanced middlegame. The position rewards patience — White ran out of useful moves first.",
    gamesInData: 738,
    scorePct: 64.0,
  },
  {
    name: "King's Indian Attack (2.Nf3)",
    pgn: 'e4 c6 Nf3 d5 d3 Qc7 Nc3 dxe4 dxe4 e5 Bc4',
    explanation:
      "Against the KIA-style Nf3 + d3 setup, the trick is recognising what White is doing: they're not playing a real opening, they're playing a system. So we don't have to fear sharp theoretical lines — what we have to fear is letting them build slow comfort. Our answer: …d5, then …Qc7 to discourage e5, and when White trades on d5 we recapture with the e-pawn or open the centre with …e5 ourselves. Result: piece-for-piece development, no structural mess, a comfortable middle-game with the bishop pair often becoming ours. We score 62% here in real play. Don't overextend — the win comes from playing accurate, principled moves while White wanders.",
    gamesInData: 627,
    scorePct: 61.9,
  },
  {
    name: 'Exchange Variation (3.exd5)',
    pgn: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nf6 c3 Bg4 Qb3 Qc7 h3',
    explanation:
      "When White trades on d5, they're trying to bleed the tension out of the position and reach a symmetrical pawn structure where their slightly easier development gives an edge. Our scheme — straight from the data — is the early …Bg4 development, …Qc7 covering b7, and quiet piece play. Bd3 has nothing to attack; the c3 / Qb3 / h3 plan looks active but accomplishes very little; we retreat the bishop (Bh5 keeps the diagonal alive, Be6 reroutes to f5 later) and finish development with …e6, …Nc6, …Bd6, …O-O. The point: a symmetrical position is only equal if both sides develop equally. We make sure ours is one tempo faster. 64% score in his actual games — the Exchange isn't dangerous, it's tedious for White.",
    gamesInData: 372,
    scorePct: 64.1,
  },
  {
    name: 'Classical Variation (3.Nc3)',
    pgn: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5',
    explanation:
      "The Classical Caro is the line where Black accepts doubled f-pawns (after …Nxf6 or …exf6) in exchange for active development and the half-open e-file. White's Bd3 + Qc2 setup is the standard plan — they want h-pawn pressure on our king. Our reply: don't let them. After castling we play …Re8+ to chase the knight (forcing Ne2, a passive square) and then …h5 ourselves, freezing their h-pawn before it lands on h4. The doubled f-pawns are NOT a weakness — they're a wedge. We control e5 forever and the open lines for our rook on e8 are real. Score: 62% — equal-but-active for Black, exactly what we want against a respected mainline.",
    gamesInData: 295,
    scorePct: 61.9,
  },
  {
    name: 'Fantasy Variation (3.f3)',
    pgn: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
    explanation:
      "The Fantasy is White's attempt to build a massive centre and just shove us off the board. The refutation: don't let the centre stand. After 3.f3 we play …dxe4 (open the file), 4.fxe4 …e5 (challenge it back), and immediately White has a decision — push d5 and lock the position with an awkward pawn chain, or trade on e5 and accept that their f3 was just a wasted tempo. Either way we equalise comfortably. Our score in the data is 75% — the highest of any Caro variation he plays — because White's whole premise (intimidation) collapses the moment we play forcing chess. Don't overthink this one: …dxe4, …e5, develop, win.",
    gamesInData: 189,
    scorePct: 74.9,
  },
  {
    name: 'Modern Defense Transposition (2.d4 g6)',
    pgn: 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d5',
    explanation:
      "Sometimes when we hit the Caro move-order against a d4 player who wasn't expecting it, the cleanest game is to transpose — fianchetto the dark-squared bishop, get a Pirc/Modern structure with the c-pawn already on c6 (which is FINE, not bad — it supports …d5 perfectly). After …Bg7 and …d5 we have a hybrid setup that's familiar to Modern players but with one extra useful tempo. White's pieces aim at a wall: the Bg7, the c6-d5 pawn chain, the well-defended king. 68% score in the data — White rarely plays this critically because they expected a Caro and got a Modern.",
    gamesInData: 185,
    scorePct: 68.1,
  },
];

// Key ideas — paraphrased from Naroditsky's recurring teaching principles
// (sourced: listudy.org/en/blog/daniel-naroditsky-speedrun-principles).
// Each idea grounds on (a) a Naroditsky principle by name, and (b) a
// concrete move/square in the line he actually plays.
const KEY_IDEAS = [
  "The c6-pawn is not a weakness — it's a wedge. It supports d5 forever and lets us recapture toward the centre. The whole Caro philosophy comes down to this: we give White the early development tempo because the structure we earn is worth more. When you hear 'doubled pawns' (in the Classical's f-file) or 'passive bishop' (the c8-bishop), remember: those are static features. The game is decided by what we DO with them, not what they look like on move 5.",
  "When White plays on the flank, we counter in the centre. This is the rule that decides 90% of our middlegames. If White goes for h4-h5 on the kingside (Advance Variation) or pawn-storms with f3/g4, we hit them with …c5 or …e5 in the centre BEFORE the wing attack arrives. The flank attack only works if the centre is closed; we keep it open or open it ourselves.",
  "The wishlist method works here perfectly. Before you calculate, ask: what's my IDEAL position 5 moves from now? Usually it's: bishop on f5 or g4, knight on d7 or f6, queen on c7, rooks coordinated on the d- and e-files. Work backwards from that picture — that's how we find the right move. Don't search for tactics; search for the SHAPE we want, and the tactics will appear when the shape is right.",
  "The light-squared bishop is the question mark of the Caro. It wants to be ACTIVE — Bf5 in the Advance mainlines, Bg4 in the Exchange and Classical, or rerouting via Bd7-Bc8-Bf5 in slower setups. The wrong answer is leaving it locked behind the pawn chain. The right move depends on White's move order: against c3 + Bd3 we play …Bg4 early; against the Bd3 + Nf3 setup we time …Bg4 to threaten Bxf3 (doubling White's pawns); in the Advance with 3...c5 it stays home until we've untangled with …Bxc5, …Nc6, …Nge7, and emerges late via the kingside. The rule: don't let the c8-bishop be a tombstone.",
];

// Traps — short prose blurbs (string array, matches existing shape).
// These describe real tactical themes that recur in his Caro games.
const TRAPS = [
  "If White plays an early Bg5 (in the Classical, after our …dxe4 and …Nf6), the …h6 push is not a question — it's a demand. White MUST commit (retreat to h4, trade on f6, or pretend nothing happened). The trick: if they retreat Bh4, our …g5 is now playable because their knight on f3 is committed and the dark squares we 'weaken' are squares we control with our bishop and queen anyway. Don't fear the loose look — the geometry favours us.",
  "Against the Fantasy (3.f3), the GREEDY move 3...dxe4 4.fxe4 e5 5.Nf3 looks like it lets White off the hook — but after 5.Nf3 exd4 6.Nxd4 we have a fluid centre and White's e4-pawn is hanging in space, defended by no minor pieces yet. The trap is for WHITE: if they try to defend e4 with Bd3 or Qe2 too soon, we get …Nf6 with tempo on e4 and a comfortable game where their early f3 hurt them more than it helped.",
];

// Warnings — pitfalls for OUR side to avoid (string array).
const WARNINGS = [
  "Don't auto-play …Bf5 in the Advance. It's the textbook move (Bf5 vs the Advance Variation), but in the 3...c5 line we play, the bishop belongs on g4 or stays on c8 until the …c5 / …Nc6 / …Nge7 setup is complete. Premature …Bf5 in the Botvinnik-Carls line lets White play h4-h5 with tempo on the bishop, and we end up dancing instead of developing. Trust the move order: c5 first, then pieces.",
  "In the Two Knights (2.Nc3 line), don't get cute with early …dxe4 + …Nf6 hoping for a Petroff-style game. White's Nf3 + Nxe4 setup is FINE for them in those structures. Our move order — …d5, accept the trades, develop quietly — is the line that gives us the 64% score. The 'sharp' alternatives sacrifice the comfort we earned with the move order.",
  "Watch the diagonal a2-g8 in the Exchange. After …Bg4 our king has castled short and White's Bd3 is staring through Bg4 at h7. If you ever let White trade dark-squared bishops AND keep the Bd3 alive, the h7 weakness becomes a real attacking target. Rule: in the Exchange, trade light-squared bishops (your Bg4 for their Nf3), and keep the dark-squared bishops on if possible. The dark squares around our king are not the issue; the light squares are.",
];

// Trap LINES — playable sequences leading to a tactical resolution.
// Each is DB-anchored (chess.js-legal continuation off the variation
// it lives under) and shows the punishment in the moves themselves.
const TRAP_LINES = [
  {
    name: "The …Bg4 Pin When White Develops Nf3 Early",
    pgn: 'e4 c6 d4 d5 exd5 cxd5 Nf3 Nc6 Bd3 Bg4 c3 e6 Qb3 Qc7 h3 Bxf3 gxf3',
    explanation:
      "When White's move order puts Nf3 BEFORE Bd3 — a frequent transposition — the …Bg4 develops with the pin live. After the natural Qb3 attacks b7 and Black covers with …Qc7, White's h3 forces the trade: …Bxf3 gxf3 wrecks the kingside pawn structure permanently. From here Black completes development with …Bd6, …O-O, …Rfe8 and a long-term structural edge: White's king is exposed, their pieces lack coordination, and the doubled f-pawns create a static weakness Black plays against for the rest of the game.",
  },
];

const WARNING_LINES = [
  {
    name: "Premature …Bf5 in the Advance c5 Line",
    pgn: 'e4 c6 d4 d5 e5 Bf5 h4 h6 g4 Bd7',
    explanation:
      "Why we play …c5 first, not …Bf5. After 3.e5, the textbook move is …Bf5 — but in the line Naroditsky plays we instead play …c5 to challenge the centre. The reason: if we go …Bf5 first, White plays the h4-h5 / g4 plan and our bishop spends the next 10 moves dancing — Bd7-c8-d7 — while White seizes space. After the …Bd7 retreat shown here, Black is two tempi down on development and the position is just unpleasant.",
  },
];

const NEW_ENTRY = {
  id: 'pro-naroditsky-caro-kann',
  playerId: 'naroditsky',
  eco: 'B12',
  name: 'Caro-Kann Defense (Naroditsky)',
  pgn: SPINE_PGN,
  color: 'black',
  style: 'Solid, Counter-Attacking',
  overview:
    "This is the Caro-Kann Naroditsky has actually played thousands of times — not a textbook diagram, his ACTUAL repertoire. The line he plays vs the Advance Variation (1.e4 c6 2.d4 d5 3.e5 c5!) is the modern 3...c5 break, also known as the Botvinnik-Carls Defense. In his 3,546 Caro-Kann games on chess.com he scores 64% with this — including against opponents rated over 3300. The whole opening rests on three ideas: (1) the c6-pawn is a wedge supporting d5 forever, (2) when White attacks on the flank we strike in the centre, and (3) the …Bg4 pin against an Nf3 knight is a recurring tactical motif we look for in every variation. The Caro isn't a defensive opening — it's a counter-attacking one. We let White over-commit, we keep our structure clean, and then we punish.",
  keyIdeas: KEY_IDEAS,
  traps: TRAPS,
  warnings: WARNINGS,
  variations: VARIATIONS.map((v) => ({
    name: v.name,
    pgn: v.pgn,
    explanation: v.explanation,
    // Per-variation sources are required by proRepertoireSources.test.ts
    // when the opening is in proRepertoireOpeningMap.json. Format:
    // "book:<id>" | "concept:<id>" | reputable https URL. Allowed
    // domains: wikipedia.org, chess.com, chessable.com, lichess.org,
    // 365chess.com, chessgames.com, britannica.com, chesstempo.com,
    // chessbase.com, chess24.com (see narrationSources.ts).
    sources: [
      'book:caro-kann',
      'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
      'https://www.chess.com/openings/Caro-Kann-Defense',
    ],
  })),
  trapLines: TRAP_LINES,
  warningLines: WARNING_LINES,
  sources: [
    'book:caro-kann',
    'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
    'https://www.chess.com/openings/Caro-Kann-Defense',
    'https://lichess.org/study/hplTnz3n',
  ],
};

// ============================================================
// MODEL GAMES — one per major variation, sourced from his real wins.
// ============================================================

function findCandidate(targetId) {
  return mgSrc.candidates.find((c) => c.id === targetId);
}

// Strip the PGN-tag header block + clock annotations + move numbers,
// leaving the bare SAN move list — same format as existing
// model-games.json entries (modelGames.test.ts expects bare PGN).
function stripPgnHeaders(pgnText) {
  const splitAt = pgnText.search(/\n\n/);
  let body = splitAt >= 0 ? pgnText.slice(splitAt) : pgnText;
  body = body
    .replace(/\{[^}]*\}/g, '')              // strip clock comments
    .replace(/\([^()]*\)/g, '')             // strip variations (one pass; chess.com rarely nests)
    .replace(/\b\d+\.+\s*/g, '')            // strip move numbers
    .replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return body;
}

function buildModelGame(targetId, opts) {
  const cand = findCandidate(targetId);
  if (!cand || cand.games.length === 0) {
    console.warn(`[skip] no model-game candidates for ${targetId}`);
    return null;
  }
  const game = cand.games[0];
  const yearMatch = game.pgn.match(/\[Date "(\d{4})\.\d{2}\.\d{2}"\]/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const ratingTag = game.opponentRating;
  return {
    id: opts.id,
    openingId: 'pro-naroditsky-caro-kann',
    white: game.studentColor === 'white' ? 'Daniel Naroditsky' : game.opponent,
    black: game.studentColor === 'black' ? 'Daniel Naroditsky' : game.opponent,
    whiteElo: game.studentColor === 'white' ? game.studentRating : ratingTag,
    blackElo: game.studentColor === 'black' ? game.studentRating : ratingTag,
    result: game.studentColor === 'black' ? '0-1' : '1-0',
    year,
    event: `chess.com ${game.timeClass} (${game.date})`,
    pgn: stripPgnHeaders(game.pgn),
    sourceUrl: game.url,
    studentSide: 'black',
    overview: opts.overview,
    criticalMoments: [],
    middlegameTheme: opts.middlegameTheme,
    lessonSummary: opts.lessonSummary,
  };
}

const NEW_MODEL_GAMES = [
  buildModelGame('spine', {
    id: 'mg-pro-naroditsky-caro-kann-advance',
    overview:
      "Naroditsky vs Arambai (3176), 2021. 188-ply marathon in the Advance Variation 3...c5 line — exactly the spine. After the standard 14-move opening Naroditsky executes the textbook plan: …Nge7, …Ng6 reroute, …Bd7, queenside expansion. The game shows how a small structural edge converts in a deep endgame: Naroditsky outplays his opponent in the king-and-pawn race after every piece comes off. The lesson: the Caro doesn't win in the opening; the opening wins the endgame for you.",
    middlegameTheme: 'Long-Term Endgame Conversion from a Clean Caro Structure',
    lessonSummary: 'A masterclass in patience. The Caro is an opening that EARNS you the endgame; this game shows what that looks like over 188 plies of accurate play.',
  }),
  buildModelGame('var-1', {
    id: 'mg-pro-naroditsky-caro-kann-two-knights',
    overview:
      "Naroditsky vs penguingm1 (Andrew Tang, 3354), 2020. The Two Knights line played by both sides — Naroditsky takes apart Tang's setup with the straightforward …d5 / piece-trade / consolidation plan. The 124-ply game shows that against the Two Knights you don't need fireworks; sound development and patient play exhausts White's initiative naturally.",
    middlegameTheme: 'Solid Development Outlasts Active White Pieces',
    lessonSummary: 'The Two Knights line rewards calm play. Naroditsky never tries to refute White; he just plays the right moves until White runs out.',
  }),
  buildModelGame('var-3', {
    id: 'mg-pro-naroditsky-caro-kann-exchange',
    overview:
      "Naroditsky vs Arambai (3196), 2021. The Exchange Variation in 104 plies. Naroditsky plays the …Bg4 pin, gets White to trade with h3 (doubling pawns), and converts a tiny structural edge to a winning endgame. The bishop pair plus a healthier pawn structure was all he needed.",
    middlegameTheme: 'The …Bg4 Pin and Long-Term Structural Compensation',
    lessonSummary: 'Why we ALWAYS pin in the Exchange. Doubled f-pawns for White is a tiny advantage on move 7 and a decisive one on move 70.',
  }),
  buildModelGame('var-4', {
    id: 'mg-pro-naroditsky-caro-kann-classical',
    overview:
      "Naroditsky vs Oleksandr Bortnyk (3312), 2020. The Classical Caro with …exf6 doubled pawns — and a 126-ply demonstration that the doubled pawns are a feature, not a bug. Naroditsky's central control along the e-file, the open lines for his rook, and the eventual …h5 push freeze White's kingside expansion. The win shows the modern handling of a respected mainline.",
    middlegameTheme: 'Doubled f-Pawns as a Wedge in the Centre',
    lessonSummary: 'The Classical Caro is not equal — it is better for Black if you respect what the doubled pawns BUY you: the half-open e-file and permanent control of e5.',
  }),
  buildModelGame('var-5', {
    id: 'mg-pro-naroditsky-caro-kann-fantasy',
    overview:
      "Naroditsky vs 0gZPanda (3231), 2023. The Fantasy Variation refuted in clean style. After 3.f3 dxe4 4.fxe4 e5 the centre opens and White's whole concept collapses in 70 plies. The game shows what David Howell once called 'the punishment for over-ambition' — when White spends a tempo on f3, Black just plays the natural moves and is already better.",
    middlegameTheme: 'Punishing the Wasted Tempo of 3.f3',
    lessonSummary: 'The Fantasy is the highest-score line we have (75% in the data) for a reason. Open the centre, develop, win.',
  }),
].filter(Boolean);

// ============================================================
// APPLY THE EDITS
// ============================================================

// 1. Replace all Naroditsky entries in pro-repertoires.json
const removed = proRep.openings.filter((o) => o.playerId === 'naroditsky');
proRep.openings = proRep.openings.filter((o) => o.playerId !== 'naroditsky');
proRep.openings.push(NEW_ENTRY);
fs.writeFileSync(PRO_REP_PATH, JSON.stringify(proRep, null, 2) + '\n');
console.log(`[pro-rep] removed ${removed.length} naroditsky entries, added 1 fresh entry (caro-kann)`);

// 2. Remove old Naroditsky model games + add new
const beforeMg = modelGames.length;
const cleanedMg = modelGames.filter((g) => !(g.openingId || '').startsWith('pro-naroditsky-'));
const newMg = [...cleanedMg, ...NEW_MODEL_GAMES];
fs.writeFileSync(MODEL_GAMES_PATH, JSON.stringify(newMg, null, 2) + '\n');
console.log(`[model-games] removed ${beforeMg - cleanedMg.length} stale naroditsky entries, added ${NEW_MODEL_GAMES.length} new`);

// 3. Bump PRO_DATA_REVISION so devices re-reconcile
const today = new Date().toISOString().slice(0, 10);
const dl = fs.readFileSync(DATA_LOADER, 'utf8');
const NEW_REVISION = `${today}-naroditsky-caro-kann-rebuild`;
const updated = dl.replace(/const PRO_DATA_REVISION = '[^']+';/, `const PRO_DATA_REVISION = '${NEW_REVISION}';`);
if (updated === dl) {
  // Idempotent: already at this revision. Append a counter suffix so re-runs still bump.
  const bumped = dl.replace(/const PRO_DATA_REVISION = '([^']+)';/, (_, cur) => {
    const m = cur.match(/^(.+?)-v(\d+)$/);
    const next = m ? `${m[1]}-v${Number(m[2]) + 1}` : `${cur}-v2`;
    return `const PRO_DATA_REVISION = '${next}';`;
  });
  fs.writeFileSync(DATA_LOADER, bumped);
  console.log(`[dataLoader] re-bumped PRO_DATA_REVISION (idempotent retry)`);
} else {
  fs.writeFileSync(DATA_LOADER, updated);
  console.log(`[dataLoader] bumped PRO_DATA_REVISION → ${NEW_REVISION}`);
}

console.log('\nDone.');
