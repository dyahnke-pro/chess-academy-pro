// Add the verified per-opening `sources` to every masterclass middlegame-plan
// playableLine that lacks one. The source sets are the SAME verified opening
// grounding used for the gems and beat-lessons this session (book corpus where
// the pre-1930s books cover it, else the verified Wikipedia/Chess.com reference,
// plus the concept matching the opening's character). node scripts/add-plan-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const MAP = {
  'ruy-lopez': ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
  'caro-kann': ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  'vienna-game': ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  'italian-game': ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  'kings-gambit': ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  'french-defence': ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
  'scotch-game': ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  'nimzo-indian': ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
  'pirc-defence': ['concept:pos-center', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
  'alekhine-defence': ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
  'benko-gambit': ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
  'scandinavian-defence': ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  'dutch-defence': ['book:dutch-defence', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
  'four-knights-game': ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
  'evans-gambit': ['book:evans-gambit', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  'sicilian-najdorf': ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  'sicilian-dragon': ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  'sicilian-sveshnikov': ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
  'sicilian-alapin': ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
  'catalan-opening': ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
  'english-opening': ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/English_Opening'],
  'reti-opening': ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
  'london-system': ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
  'kings-indian-attack': ['concept:att-kingside-storm', 'concept:pos-development', "https://en.wikipedia.org/wiki/King's_Indian_Attack"],
};

const MC = new Set(Object.keys(JSON.parse(readFileSync('src/data/opening-manifests.json', 'utf8'))).filter((k) => !k.startsWith('_')));
const plans = JSON.parse(readFileSync('src/data/middlegame-plans.json', 'utf8'));
let n = 0; const skipped = new Set();
for (const p of plans) {
  if (!MC.has(p.openingId)) continue;
  const src = MAP[p.openingId];
  if (!src) { skipped.add(p.openingId); continue; }
  for (const l of (p.playableLines || [])) {
    if (!(Array.isArray(l.sources) && l.sources.length)) { l.sources = src; n++; }
  }
}
writeFileSync('src/data/middlegame-plans.json', JSON.stringify(plans, null, 2) + '\n');
console.log(`plan lines sourced: ${n}`);
if (skipped.size) console.log('masterclass openings with NO source map (add them):', [...skipped].join(', '));
