// Build the Sicilian Dragon model game from the committed pro-games cache —
// a REAL Black win in a Yugoslav Dragon (Dubov, "Duhless", beats a 3008 with
// the classic opposite-castling queenside attack). studentSide 'black'.
// criticalMoments are hand-authored at two keystones (FENs taken from a
// chess.js replay so they're reachable). Merges into model-games.json.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const raw = JSON.parse(fs.readFileSync('docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json', 'utf-8'));
let game = null;
for (const val of Object.values(raw.pros)) {
  for (const g of (Array.isArray(val) ? val : Object.values(val))) {
    if (g && g.sourceUrl && g.sourceUrl.includes('119574003505')) game = g;
  }
}
if (!game) throw new Error('source game not found in cache');

const c = new Chess();
c.loadPgn(game.pgn);
const history = c.history();

// Clean numbered movetext.
const r = new Chess();
let pgn = '';
history.forEach((m, i) => { if (i % 2 === 0) pgn += `${i / 2 + 1}. `; pgn += `${r.move(m).san} `; });
pgn = pgn.trim();

// FEN after a given ply count.
function fenAfter(ply) { const cc = new Chess(); for (let i = 0; i < ply; i++) cc.move(history[i]); return cc.fen(); }

const entry = {
  id: 'mg-sicilian-dragon-dubov-2024',
  openingId: 'sicilian-dragon',
  white: 'dropstoneDP',
  black: 'Daniil Dubov',
  whiteElo: game.whiteRating ?? 3008,
  blackElo: game.blackRating ?? 3128,
  result: '0-1',
  year: 2024,
  event: 'chess.com blitz',
  pgn,
  overview: "A model Yugoslav Dragon: Dubov, with the black pieces, shows the opening's whole point against a 3000-rated opponent. Both sides castle on opposite wings, and Black's queenside attack — Qa5, Rc8, and a rolling b-pawn — crashes through before White's kingside push can land.",
  criticalMoments: [
    {
      moveNumber: 12,
      color: 'black',
      fen: fenAfter(24),
      annotation: "Black castles into the storm and instantly hits back: Qa5 swings the queen to the attack while the h-pawn is already racing down. This is the Dragon's bargain — both kings will be hunted, and Black means to arrive first.",
      concept: 'Opposite-side castling race',
    },
    {
      moveNumber: 23,
      color: 'black',
      fen: fenAfter(46),
      annotation: "b5 throws fuel on the queenside fire, prising open lines at White's king. White's f5 push looks menacing, but Black's attack down the c-file and the b-pawn is the faster one — exactly why the Dragon scores.",
      concept: 'Queenside pawn storm arrives first',
    },
  ],
  middlegameTheme: "Opposite-side castling: Black's c-file and b-pawn attack races White's h- and f-pawn storm.",
  lessonSummary: "The Dragon in one game: trade efficiently, train every piece on White's king, and win the race down the queenside.",
  studentSide: 'black',
};

// Validate the criticalMoment FENs are reachable (defensive).
for (const cm of entry.criticalMoments) {
  if (!cm.fen || cm.fen.split(' ').length < 4) throw new Error('bad cm fen');
}

const path = 'src/data/model-games.json';
const existing = JSON.parse(fs.readFileSync(path, 'utf-8')).filter((g) => g.id !== entry.id);
fs.writeFileSync(path, JSON.stringify([...existing, entry], null, 2) + '\n');
console.log(`merged model game ${entry.id} (${history.length} plies, result ${entry.result}, studentSide ${entry.studentSide})`);
