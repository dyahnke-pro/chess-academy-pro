#!/usr/bin/env node
// Pull 2 model games per Alapin variation from the picker output.
// Hand-author overviews per game (≥40 chars, NOT templated) so they
// pass isNarratedModelGame and surface in the variation tabs.

import fs from 'node:fs';

const MG_PATH = 'src/data/model-games.json';
const PICKER = 'data/sources/danielnaroditsky-trees/alapin-sicilian-model-games.json';

function stripPgn(pgn) {
  const i = pgn.search(/\n\n/);
  let body = i >= 0 ? pgn.slice(i) : pgn;
  body = body.replace(/\{[^}]*\}/g, '');
  let prev; do { prev = body; body = body.replace(/\([^()]*\)/g, ''); } while (body !== prev);
  body = body.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return body.split(/\s+/).filter(Boolean).join(' ');
}

// Per-game overviews — hand-authored. Each ties the game to the
// specific variation's themes from the spine lessons.
const GAME_OVERVIEWS = {
  // Main spine (Nf6 line)
  'https://www.chess.com/game/live/86332706223':
    "Naroditsky vs Jospem (3106) — main Alapin spine in action. Watch the textbook Bc4-Bb3 development sequence, the exd6 en-passant break, the queenside crawl with a4-a5-a6. Conversion in the R+minor+P endgame against a 3100-rated opponent.",
  'https://www.chess.com/game/live/86333289349':
    "Naroditsky vs Jospem (3098), same day rematch — another textbook Alapin grind. Same opponent learnt nothing from game one; same structural conversion. The Alapin's score of 73.8% across 2,752 games comes from games exactly like this.",
  // d5-open variation
  'https://www.chess.com/game/live/29619592137':
    "Naroditsky vs Hikaru (3263!) — Alapin d5-open masterclass against the World Bullet Champion. The Na3-Nb5 outpost wins tempi, the central trades open the position, and Hikaru can't equalise from the Scandinavian-style queen-out simplification. Pure positional crush.",
  'https://www.chess.com/game/live/144366155614':
    "Naroditsky vs Firouzja (3257!) — another top-30 player Alapin loss. The d5-open structure converts into the same R+min+P endgame that 27.4% of his d5-open decisive games reach. Firouzja's queen on d5 is the structural target Danya hunts.",
  // 4...d6 sub-line (Bc4 gambit)
  'https://www.chess.com/game/live/112143011955':
    "Naroditsky vs HansOnTwitch (3161) — the Bc4-Bb5+ gambit signature treatment per Gordima's distillation. The e6 + exf7+ break dismantles Black's king cover, the Qa4+ → Qxc4+ recovery wins back material. 70.3% score across 394 games proves this works.",
  'https://www.chess.com/game/live/125439540057':
    "Naroditsky vs Lembke407 (3145) — the same Bc4-gambit treatment in a different game. Watch the king-hunt mechanism: pawn sacrifice, check sequence, material recovery, exposed king on g8. Sharp tactical play exactly where the Alapin's complications favour him.",
  // e6 French-style
  'https://www.chess.com/game/live/121033869997':
    "Naroditsky vs Magnus Carlsen (3297!) — Alapin e6-French line vs the World Champion. The O-O castle-before-recapture move sets up the Ng5 tactics. Even Magnus can't navigate the IQP structure with his king exposed and the bishop pair locked in.",
  'https://www.chess.com/game/live/140001670907':
    "Naroditsky vs Konavets (3166) — the same e6-French structure converted differently. dxc5 grabs material in the open position, Black's pieces can't coordinate, and the structural advantage carries the endgame. 74% score in this variation.",
  // 4...e6 sub-line (IQP)
  'https://www.chess.com/game/live/105406898825':
    "Naroditsky vs GMWSO (Wesley So, 3169) — Alapin 4...e6 sub-line vs a top 20 player. The Qe2 + Rd1 + Nc3 buildup arrives, the bxc3 doubled-pawn structure gives the open b-file PLUS the bishop pair. Wesley grinds for equality, doesn't get it.",
  // d6-mainline
  'https://www.chess.com/game/live/111462008203':
    "Naroditsky vs Bigfish1995 (3115) — the 2...d6 mainline at 80.6% score (his highest Alapin variation). The KID-reversed setup with h3 prophylaxis and Bd3 + O-O slow buildup eventually wins via positional accumulation.",
  // g6-dragon
  'https://www.chess.com/game/live/29541643139':
    "Naroditsky vs Hikaru (3263) — same day as the d5-open win, this time the Hyper-Dragon. The Bc4-Bb3 Panov-style treatment reaches the SAME middlegame structure as the main spine but via 2...g6. Same plan, same conversion, same result against Hikaru.",
  // Nc6-line
  'https://www.chess.com/game/live/126031227605':
    "Naroditsky vs Firouzja (3222) — Alapin Nc6-line at 86.2% score (his BEST Alapin variation). The Nc3 tempo on the queen forces …Qd8 retreat, Black loses two tempi structurally, conversion in the R+minor+P endgame that 33.7% of decisive games here reach.",
};

const picks = JSON.parse(fs.readFileSync(PICKER, 'utf8'));
const newGames = [];

let idx = 0;
for (const cand of picks.candidates) {
  for (const g of (cand.games || [])) {
    const result = g.pgn?.match(/\[Result "([^"]+)"\]/)?.[1];
    const isWin = (g.studentColor === 'white' && result === '1-0') || (g.studentColor === 'black' && result === '0-1');
    if (!isWin) continue;
    const overview = GAME_OVERVIEWS[g.url];
    if (!overview) continue; // only ship games with hand-authored overviews

    const white = g.pgn.match(/\[White "([^"]+)"\]/)?.[1] || 'GothamChess';
    const black = g.pgn.match(/\[Black "([^"]+)"\]/)?.[1] || '?';
    const whiteElo = parseInt(g.pgn.match(/\[WhiteElo "([^"]+)"\]/)?.[1] || '0');
    const blackElo = parseInt(g.pgn.match(/\[BlackElo "([^"]+)"\]/)?.[1] || '0');
    const date = g.pgn.match(/\[Date "([^"]+)"\]/)?.[1] || '';
    const year = parseInt(date.slice(0, 4)) || 2024;

    newGames.push({
      id: `mg-pro-naroditsky-alapin-${idx++}`,
      openingId: 'pro-naroditsky-alapin',
      white,
      black,
      whiteElo,
      blackElo,
      result,
      year,
      event: g.timeClass === 'bullet' ? 'Chess.com bullet Game' : 'Chess.com blitz Game',
      pgn: stripPgn(g.pgn),
      sourceUrl: g.url,
      overview,
      criticalMoments: [],
      middlegameTheme: 'Alapin Sicilian (Naroditsky)',
      lessonSummary: overview,
      studentSide: g.studentColor,
    });
  }
}

const existing = JSON.parse(fs.readFileSync(MG_PATH, 'utf8'));
// Drop old Alapin games
const kept = existing.filter((g) => g.openingId !== 'pro-naroditsky-alapin');
const merged = [...kept, ...newGames];
fs.writeFileSync(MG_PATH, JSON.stringify(merged, null, 2));
console.log(`Added ${newGames.length} Alapin model games, total ${merged.length}.`);
for (const g of newGames) {
  console.log(`  ${g.id}: ${g.white} vs ${g.black} (${g.result}, ${g.studentSide} wins, ${g.year})`);
}
