#!/usr/bin/env node
// Two pieces:
// 1) Strip MOVE-NUMBER prefixes ("1.", "2.", "1...", "2...", "10.")
//    from every Naroditsky narration. They get read aloud as "two e4"
//    / "one dot dot dot c6" by Polly, which breaks listening rhythm.
//    Stats stay — David 2026-05-28: "keep the stats, remove the move
//    count". A "move count" in chess notation is the move-number
//    prefix, not the chess.com game-count statistic.
// 2) Add the Fantasy Variation vs Caro-Kann (white) as a standalone
//    pro-rep entry — scrapped in the earlier rebuild but it's one of
//    his most-played White weapons specifically against the Caro.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const PRO_REP = 'src/data/pro-repertoires.json';
const MODEL_GAMES = 'src/data/model-games.json';
const PRO_MAP = 'src/data/proRepertoireOpeningMap.json';
const DL = 'src/services/dataLoader.ts';
const LESSON_FILES = [
  'src/data/lessons/proNaroditskyCaroKann.ts',
  'src/data/lessons/proNaroditskyCaroKannVariations.ts',
  'src/data/lessons/proNaroditskyAllRemaining.ts',
  'src/data/lessons/proNaroditskyFantasyCaro.ts',
];

// ============================================================
// 1. STRIP MOVE-NUMBER PREFIXES
// ============================================================

// Match digit(s) + 1-3 dots + optional whitespace, only when followed
// immediately by an SAN-like token (uppercase piece, file letter, or
// O-O castling). Examples caught: "1.", "2.", "1...", "10.", "20...".
// Examples preserved: "ECO B22", "3-5 word", "section 2.", "11.O-O-O".
// (the final O-O-O is caught — that's the "11." prefix; correct.)
const MOVE_NUM_PREFIX_RE = /\b\d+\.{1,3}\s*(?=(?:[KQRBN][a-h]?x?[a-h][1-8]|[a-h]x?[a-h]?[1-8]|O-O(?:-O)?))/g;

function scrubMoveNums(text) {
  let out = text.replace(MOVE_NUM_PREFIX_RE, '');
  // Collapse any double-spaces left behind
  out = out.replace(/ {2,}/g, ' ');
  return out;
}

// Files first (TypeScript lesson scripts)
for (const f of LESSON_FILES) {
  if (!fs.existsSync(f)) { console.log(`  ${f}: missing, skipping`); continue; }
  const src = fs.readFileSync(f, 'utf8');
  let modCount = 0;
  // Scrub inside string literals only (heuristic — pattern would be unlikely
  // to legitimately appear outside narration strings, but safer this way)
  const out = src.replace(/"((?:[^"\\]|\\.)*)"/g, (m, body) => {
    if (!MOVE_NUM_PREFIX_RE.test(m)) { MOVE_NUM_PREFIX_RE.lastIndex = 0; return m; }
    MOVE_NUM_PREFIX_RE.lastIndex = 0;  // reset for next match (global flag stickiness)
    const scrubbed = scrubMoveNums(body);
    if (scrubbed !== body) modCount++;
    return '"' + scrubbed + '"';
  });
  if (modCount > 0) {
    fs.writeFileSync(f, out);
    console.log(`  ${f}: scrubbed ${modCount} string literal(s)`);
  } else {
    console.log(`  ${f}: nothing to scrub`);
  }
}

// pro-repertoires.json — scrub narration fields on Naroditsky entries only
const proRep = JSON.parse(fs.readFileSync(PRO_REP, 'utf8'));
let proRepMods = 0;
function scrubObj(obj) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string') {
      if (MOVE_NUM_PREFIX_RE.test(v)) {
        MOVE_NUM_PREFIX_RE.lastIndex = 0;
        const scrubbed = scrubMoveNums(v);
        if (scrubbed !== v) { obj[k] = scrubbed; proRepMods++; }
      } else {
        MOVE_NUM_PREFIX_RE.lastIndex = 0;
      }
    } else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        if (typeof v[i] === 'string') {
          if (MOVE_NUM_PREFIX_RE.test(v[i])) {
            MOVE_NUM_PREFIX_RE.lastIndex = 0;
            const s = scrubMoveNums(v[i]);
            if (s !== v[i]) { v[i] = s; proRepMods++; }
          } else {
            MOVE_NUM_PREFIX_RE.lastIndex = 0;
          }
        } else if (typeof v[i] === 'object' && v[i] !== null) {
          scrubObj(v[i]);
        }
      }
    } else if (typeof v === 'object' && v !== null) {
      scrubObj(v);
    }
  }
}
for (const o of proRep.openings) {
  if (o.playerId === 'naroditsky') scrubObj(o);
}
console.log(`  pro-repertoires.json: scrubbed ${proRepMods} naroditsky narration string(s)`);

// ============================================================
// 2. ADD FANTASY CARO ENTRY
// ============================================================

proRep.openings = proRep.openings.filter((o) => o.id !== 'pro-naroditsky-fantasy-caro');

const FANTASY_SOURCES = [
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
  'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
];

const FANTASY_ENTRY = {
  id: 'pro-naroditsky-fantasy-caro',
  playerId: 'naroditsky',
  eco: 'B12',
  name: 'Fantasy Caro-Kann (Naroditsky)',
  pgn: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3',
  color: 'white',
  style: 'Aggressive, Centre-Building',
  overview:
    "The Fantasy Variation — Naroditsky's aggressive white weapon against the Caro-Kann, scoring 73.4% across 370 chess.com games. After Black plays c6 and d5, we play f3, supporting the e4-pawn from below and committing to a massive pawn centre. The whole opening is a bet: that the broad e4-d4-f3 centre is worth more than the kingside structural concession. Black has a tough decision on every reply, and the most-played French-style e6 setup hands us exactly the kind of middlegame we want — bishop pair, big centre, attacking diagonals.",
  keyIdeas: [
    "The f3 push builds the iron centre. The defining move — supports e4, prevents knight attacks on it, and prepares to advance with e5 later cramping Black's kingside. The pawn looks ugly on f3 but it's doing structural work.",
    "Bishop pair through doubled pawns. When Black pins our queen's knight with Bb4, we kick with a3 and let them trade — bxc3 is fine. We swap structural purity for the bishop pair, which dominates Black's locked-in pieces all game.",
    "The e5 push at the right moment. After the bishop pair lands, the e5 advance is the climax — it cramps Black, opens the diagonal for our light-squared bishop, and the kingside attack writes itself.",
    "The c8-bishop is locked, forever. The Black e6 reply locks Black's Caro bishop behind the pawn chain. Our job is to keep it there — every trade that frees it costs us a tempo, every move that keeps it boxed wins us one.",
  ],
  traps: [
    "If Black plays the careless dxe4 hoping to win the f3-pawn, we have fxe4 and now Black has voluntarily opened the f-file FOR us. Our king-rook lifts to f1 and the kingside attack starts immediately.",
    "After Black's e6 and the Bb4 pin, the natural-looking Bxc3+ trade hands us bxc3 with the bishop pair — most amateur Black players don't realise they're trading their best piece for our worst, and we score heavily once they do.",
  ],
  warnings: [
    "Don't push e5 too early. The pawn break is the climax, not the opening. e5 before our pieces are coordinated lets Black play c5 challenging the centre with tempo on our d4-pawn.",
    "Don't auto-castle short. The kingside structure is weakened by the f3 push — sometimes Bd3, Qe2, and long castling is the right call, especially when Black opts for a queenside expansion plan.",
  ],
  variations: [
    {
      name: 'Black accepts with dxe4',
      pgn: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7',
      explanation:
        "When Black accepts the pawn with dxe4, we recapture with the f-pawn opening the f-file — exactly what we wanted. Black scores 78.4% wins for us across 111 games in this line. Black then tries to challenge our centre with e5 and develop quickly, but the open f-file and our active piece placement give us the initiative through the middlegame.",
      sources: FANTASY_SOURCES,
    },
    {
      name: 'Modern setup with g6',
      pgn: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 dxe4 fxe4',
      explanation:
        "Black plays Modern-style with g6, fianchettoing the bishop and refusing the central commitment (48 games, 76% score). We develop Nc3 plus Be3 plus Bd3 in standard fashion, eventually castling and pushing e5 cramping the Bg7's scope.",
      sources: FANTASY_SOURCES,
    },
    {
      name: 'Qb6 pressure sideline',
      pgn: 'e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 fxe4 e5',
      explanation:
        "The Qb6 sideline tries to hit b2 and disrupt our development (39 games, 73.1% score). We just develop normally with Nc3 and let Black exchange pawns — the queen on b6 ends up exposed and we gain tempo developing pieces with attacks on it.",
      sources: FANTASY_SOURCES,
    },
  ],
  sources: FANTASY_SOURCES,
};
proRep.openings.push(FANTASY_ENTRY);

fs.writeFileSync(PRO_REP, JSON.stringify(proRep, null, 2) + '\n');
console.log(`  pro-repertoires.json: added fantasy-caro entry (${proRep.openings.length} total openings)`);

// Add model game
const modelGames = JSON.parse(fs.readFileSync(MODEL_GAMES, 'utf8'));
const cleaned = modelGames.filter((g) => g.openingId !== 'pro-naroditsky-fantasy-caro');
modelGames.length = 0;
modelGames.push(...cleaned);

const mgPath = 'data/sources/danielnaroditsky-trees/fantasy-caro-model-games.json';
if (fs.existsSync(mgPath)) {
  const mg = JSON.parse(fs.readFileSync(mgPath, 'utf8'));
  const spineCand = mg.candidates.find((c) => c.id === 'spine');
  if (spineCand && spineCand.games.length > 0) {
    const g = spineCand.games[0];
    const yearMatch = g.pgn.match(/\[Date "(\d{4})\.\d{2}\.\d{2}"\]/);
    const year = yearMatch ? Number(yearMatch[1]) : null;
    const splitAt = g.pgn.search(/\n\n/);
    let body = splitAt >= 0 ? g.pgn.slice(splitAt) : g.pgn;
    body = body
      .replace(/\{[^}]*\}/g, '')
      .replace(/\([^()]*\)/g, '')
      .replace(/\b\d+\.+\s*/g, '')
      .replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
      .replace(/\s+/g, ' ').trim();

    modelGames.push({
      id: 'mg-pro-naroditsky-fantasy-caro',
      openingId: 'pro-naroditsky-fantasy-caro',
      white: g.studentColor === 'white' ? 'Daniel Naroditsky' : g.opponent,
      black: g.studentColor === 'black' ? 'Daniel Naroditsky' : g.opponent,
      whiteElo: g.studentColor === 'white' ? g.studentRating : g.opponentRating,
      blackElo: g.studentColor === 'black' ? g.studentRating : g.opponentRating,
      result: '1-0',
      year,
      event: `chess.com ${g.timeClass} (${g.date})`,
      pgn: body,
      sourceUrl: g.url,
      studentSide: 'white',
      overview:
        "Naroditsky's Fantasy Variation against Nihal Sarin (3204) — a clean kingside attack with the doubled-pawn bishop pair handling everything classical theory says shouldn't work. Demonstrates the e5 push at the right moment and the diagonal attack once Black's c8-bishop stays locked.",
      criticalMoments: [],
      middlegameTheme: 'Centre Build + Bishop Pair Attack',
      lessonSummary:
        "The Fantasy isn't bluff — when Black plays the standard French-style setup, our bishop pair and big centre add up to a real attacking middlegame. This game shows the conversion.",
    });
    console.log(`  model-games.json: added fantasy-caro entry vs ${g.opponent} (${g.opponentRating})`);
  }
}
fs.writeFileSync(MODEL_GAMES, JSON.stringify(modelGames, null, 2) + '\n');

// Map to caro-kann masterclass for source-gating
const proMap = JSON.parse(fs.readFileSync(PRO_MAP, 'utf8'));
proMap.map['pro-naroditsky-fantasy-caro'] = 'caro-kann';
fs.writeFileSync(PRO_MAP, JSON.stringify(proMap, null, 2) + '\n');
console.log('  proRepertoireOpeningMap: added fantasy-caro → caro-kann');

// Bump revision
const today = new Date().toISOString().slice(0, 10);
const dl = fs.readFileSync(DL, 'utf8');
const updated = dl.replace(/const PRO_DATA_REVISION = '[^']+';/, `const PRO_DATA_REVISION = '${today}-fantasy-and-movenum-scrub';`);
if (updated !== dl) fs.writeFileSync(DL, updated);
console.log('  bumped PRO_DATA_REVISION');

console.log('\nDone.');
