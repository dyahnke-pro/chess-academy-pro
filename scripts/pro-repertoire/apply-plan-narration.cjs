// Generic applier: deepen a batch of pro-rep middlegame plans to their grounded
// real 8-ply line + authored narration. Auto-builds orange dest highlights,
// green vision arrows (specified moves), per-opening sources, title/intro/overview.
// Input: a per-plan narration object (see openings/*.cjs). Patches middlegame-plans.json.
const fs = require('fs');
const { Chess } = require('chess.js');

const PLANS_PATH = 'src/data/middlegame-plans.json';
const GROUNDED = JSON.parse(fs.readFileSync('scripts/pro-repertoire/grounded/plan-lines.json', 'utf8'));
const GREEN = 'rgba(40,185,95,0.92)';
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const YELLOW = 'rgba(250, 204, 21, 0.55)';

// per-opening source bundle (resolvable per narrationSources allowlist)
const SRC = {
  'pro-gothamchess-italian': ['book:chess-fundamentals', 'https://www.chess.com/openings/Italian-Game', 'https://en.wikipedia.org/wiki/Italian_Game', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-vienna': ['book:chess-fundamentals', 'https://www.chess.com/openings/Vienna-Game', 'https://en.wikipedia.org/wiki/Vienna_Game', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-london': ['book:chess-fundamentals', 'https://www.chess.com/openings/London-System', 'https://en.wikipedia.org/wiki/London_System', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-english': ['book:chess-fundamentals', 'https://www.chess.com/openings/English-Opening', 'https://en.wikipedia.org/wiki/English_Opening', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-trompowsky': ['book:chess-fundamentals', 'https://www.chess.com/openings/Trompowsky-Attack', 'https://en.wikipedia.org/wiki/Trompowsky_Attack', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-french-defense': ['book:chess-fundamentals', 'https://www.chess.com/openings/French-Defense', 'https://en.wikipedia.org/wiki/French_Defence', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-fantasy-caro': ['book:chess-fundamentals', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-scandinavian': ['book:chess-fundamentals', 'https://www.chess.com/openings/Scandinavian-Defense', 'https://en.wikipedia.org/wiki/Scandinavian_Defense', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-ponziani': ['book:chess-fundamentals', 'https://www.chess.com/openings/Ponziani-Opening', 'https://en.wikipedia.org/wiki/Ponziani_Opening', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-qgd': ['book:chess-fundamentals', 'https://www.chess.com/openings/Queens-Gambit-Declined', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-pirc-defense': ['book:chess-fundamentals', 'https://www.chess.com/openings/Pirc-Defense', 'https://en.wikipedia.org/wiki/Pirc_Defence', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-closed-sicilian': ['book:chess-fundamentals', 'https://www.chess.com/openings/Closed-Sicilian', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Closed_Variation', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-caro-kann': ['book:chess-fundamentals', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-naroditsky-kid': ['book:chess-fundamentals', 'https://www.chess.com/openings/Kings-Indian-Defense', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-alapin': ['book:chess-fundamentals', 'https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation', 'https://en.wikipedia.org/wiki/Alapin_Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-caro-kann': ['book:chess-fundamentals', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-gothamchess-anti-sicilian': ['book:chess-fundamentals', 'https://www.chess.com/openings/Sicilian-Defense', 'https://en.wikipedia.org/wiki/Sicilian_Defence', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-kia': ['book:chess-fundamentals', 'https://www.chess.com/openings/Kings-Indian-Attack', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-stafford-refute': ['book:chess-fundamentals', 'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-gothamchess-milner-barry': ['book:chess-fundamentals', 'https://www.chess.com/openings/French-Defense-Advance-Variation', 'https://en.wikipedia.org/wiki/French_Defence', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
  'pro-naroditsky-alekhine': ['book:chess-fundamentals', 'https://www.chess.com/openings/Alekhines-Defense', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-jobava-london': ['book:chess-fundamentals', 'https://www.chess.com/openings/Jobava-London-System', 'https://en.wikipedia.org/wiki/London_System', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-kia': ['book:chess-fundamentals', 'https://www.chess.com/openings/Kings-Indian-Attack', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-rossolimo': ['book:chess-fundamentals', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Rossolimo_Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-najdorf': ['book:chess-fundamentals', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-ruy-lopez': ['book:chess-fundamentals', 'https://www.chess.com/openings/Ruy-Lopez', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-fantasy-caro': ['book:chess-fundamentals', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
};
const PLAYER = (op) => (op.includes('naroditsky') ? 'Naroditsky' : 'GothamChess');

function apply(narr) {
  const raw = JSON.parse(fs.readFileSync(PLANS_PATH, 'utf8'));
  const plans = Array.isArray(raw) ? raw : raw.plans;
  let applied = 0; const errs = [];
  for (const [planId, n] of Object.entries(narr)) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) { errs.push(`${planId}: plan not found`); continue; }
    const gr = GROUNDED[planId];
    if (!gr || !gr.fen) { errs.push(`${planId}: no grounded line`); continue; }
    if (n.annotations.length !== gr.moves.length || n.cues.length !== gr.moves.length) {
      errs.push(`${planId}: narration length ${n.annotations.length}/${n.cues.length} != ${gr.moves.length} moves`); continue;
    }
    // verify legality + build per-move from/to + dest squares
    const c = new Chess(gr.fen); const dests = []; const froms = [];
    let legal = true;
    for (const m of gr.moves) { const r = c.move(m); if (!r) { legal = false; break; } dests.push(r.to); froms.push(r.from); }
    if (!legal) { errs.push(`${planId}: illegal move in grounded line`); continue; }
    const arrows = gr.moves.map((_, i) => (n.greenArrowIdx || []).includes(i) ? [{ from: froms[i], to: dests[i], color: GREEN }] : []);
    const highlights = gr.moves.map((_, i) => [{ square: dests[i], color: ORANGE }]);
    const pl = {
      fen: gr.fen, moves: gr.moves.slice(),
      annotations: n.annotations.slice(), learnCues: n.cues.slice(),
      arrows, highlights,
      title: n.title, intro: n.intro,
      sources: SRC[plan.openingId] || ['book:chess-fundamentals', 'https://api.chess.com/pub/player/gothamchess/games/archives'],
    };
    plan.criticalPositionFen = gr.fen;
    plan.playableLines = [pl];
    if (n.overview) plan.overview = n.overview;
    if (n.pawnBreaks) plan.pawnBreaks = n.pawnBreaks;
    if (n.pieceManeuvers) plan.pieceManeuvers = n.pieceManeuvers;
    if (n.strategicThemes) plan.strategicThemes = n.strategicThemes;
    if (n.endgameTransitions) plan.endgameTransitions = n.endgameTransitions;
    applied++;
  }
  fs.writeFileSync(PLANS_PATH, JSON.stringify(raw, null, 2) + '\n');
  return { applied, errs };
}
module.exports = { apply, GROUNDED, GREEN, ORANGE, YELLOW, PLAYER };
