#!/usr/bin/env node
/**
 * Adds static modern definitions for every opening in our taxonomy
 * so the Classic Wisdom card can render consistently across ALL
 * openings — not just the 16 the public-domain books covered.
 *
 * Schema addition: chess-concepts.json gets an `openingDefinitions`
 * map: { openingId → { description, character, keyIdeas[] } }.
 *
 * Definitions are universal chess knowledge (opening character,
 * canonical plans) — no copyright concern. The service falls back
 * to these when getOpeningPassages(name) returns [].
 */

import { readFile, writeFile } from 'node:fs/promises';

const PATH = 'src/data/chess-concepts.json';

// Pulled from canonical opening theory — character, family, top plans
const DEFS = {
  'italian-game': {
    description: "The Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4) is the oldest scholastic opening and remains a top-tier weapon at every level. White develops the bishop to its most active diagonal aimed at f7. Modern lines split between the slow Giuoco Pianissimo with c3 + d3 (positional maneuvering) and the sharper 4.d4 lines.",
    character: 'classical positional with tactical chances',
    keyIdeas: ['target the f7 square', 'control the center with c3 + d4', 'develop pieces before pushing pawns'],
  },
  'ruy-lopez': {
    description: "The Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5) — also called the Spanish Game — is the most extensively analyzed opening in chess history. The bishop on b5 pressures the c6-knight, which defends e5. Both sides have a rich set of plans: Berlin Defence trades pieces into endgame imbalances; Marshall Attack sacrifices a pawn for kingside attack; closed lines lead to deep maneuvering on both wings.",
    character: 'strategically deep, all-purpose',
    keyIdeas: ['pressure c6/e5', 'occupy the center with c3 + d4', 'classical d2-d4 push or slow d2-d3 plan'],
  },
  'scotch-game': {
    description: "The Scotch Game (1.e4 e5 2.Nf3 Nc6 3.d4) trades the c-pawn for fast central liquidation and open lines. White's knight comes to d4 with tempo, and play becomes sharp and tactical right out of the opening. Less theoretical than the Ruy Lopez, with crisp middlegame plans.",
    character: 'sharp and open',
    keyIdeas: ['immediate central tension', 'fast development', 'knight outpost on d4'],
  },
  'vienna-game': {
    description: "The Vienna Game (1.e4 e5 2.Nc3) develops the queen's knight first, preparing the King's Bishop's Gambit (f4) or quiet positional play with g3. Flexible enough to transpose into Italian-like positions or surprise gambit play. Modern players use it for the Frankenstein-Dracula chaos or as a sound Closed Sicilian setup with colors reversed.",
    character: 'flexible — quiet or gambit',
    keyIdeas: ['f4 break for kingside attack', 'transposes to Italian / Four Knights', 'g3 for slow positional plans'],
  },
  'kings-gambit': {
    description: "The King's Gambit (1.e4 e5 2.f4) is the most romantic of all openings. White sacrifices the f-pawn for rapid development, an open f-file, and immediate kingside attack. Black accepts with 2…exf4 and faces aggressive Bishop's Gambit (3.Bc4) or Knight's Gambit (3.Nf3) lines. Modern engines have reduced its popularity at the top, but it remains lethal in club play.",
    character: 'aggressive sacrificial attack',
    keyIdeas: ['sacrifice pawn for development', 'open f-file pressure', 'rapid kingside attack'],
  },
  'four-knights-game': {
    description: "The Four Knights Game (1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6) is the most symmetrical opening still played at top level. The classical Spanish-Four-Knights with 4.Bb5 leads to subtle Berlin-type endgames; the Scotch Four Knights with 4.d4 mirrors the Scotch. Often used to avoid sharp Sicilian/French theory while keeping rich positional play.",
    character: 'symmetrical positional',
    keyIdeas: ['classical development', 'mirror-image play', 'transpose to Italian or Scotch'],
  },
  'philidor-defence': {
    description: "Philidor's Defence (1.e4 e5 2.Nf3 d6) protects the e5-pawn with the d-pawn rather than the c-pawn. Solid but passive — Black accepts a slightly cramped position in exchange for an unbreakable pawn chain. Hanham Variation (Nd7) keeps everything flexible; the Improved Hanham steers into King's Indian-like structures.",
    character: 'solid but passive',
    keyIdeas: ['solid pawn chain d6-e5', 'Hanham Variation Nd7', 'aim for ...c6 + ...d5 break'],
  },
  'petrov-defence': {
    description: "The Petrov Defence (1.e4 e5 2.Nf3 Nf6) — also called the Russian Defence — counters White's knight attack with symmetric counter-attack. After 3.Nxe5 d6 4.Nf3 Nxe4, both sides have an open game with equal chances. A favorite drawing weapon at the top level: solid, defensible, and gives little for an aggressive opponent to bite into.",
    character: 'solid drawing weapon',
    keyIdeas: ['symmetric counter-attack', 'open positions with equal chances', 'minimize Black\'s risk'],
  },
  'two-knights-defence': {
    description: "The Two Knights Defence (1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6) invites White's most aggressive try, 4.Ng5 (Fried Liver Attack), which Black answers with the ambitious …d5 5.exd5 Na5. Modern theory considers Black's piece sacrifice resources sufficient. Sharp, tactical, and theory-heavy.",
    character: 'sharp tactical',
    keyIdeas: ['Fried Liver Attack with Ng5', 'piece sacrifice on f7', 'd5 break to unblock'],
  },
  'evans-gambit': {
    description: "The Evans Gambit (1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4) sacrifices a pawn to deflect the bishop on c5, then plays c3 + d4 with a massive center. Capablanca said the Evans gives White an attack 'so violent that Black is hard pressed to defend.' Revived in the 1990s by Kasparov; still a sharp weapon today.",
    character: 'positional gambit',
    keyIdeas: ['sacrifice b-pawn for center', 'c3 + d4 to build pawn center', 'rapid development advantage'],
  },
  'sicilian-najdorf': {
    description: "The Najdorf Sicilian (1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6) is the most popular and respected response to 1.e4 in modern chess. The flexible …a6 prepares either …e5 (gaining central squares) or …e6 (Scheveningen-style). Kasparov and Fischer's main weapon; the English Attack with Bg5/Bg5+f3 remains the critical test.",
    character: 'razor-sharp dynamic',
    keyIdeas: ['flexible …a6 prep', 'English Attack with Bg5/f3', 'Bg5 Main Line and Poisoned Pawn'],
  },
  'sicilian-dragon': {
    description: "The Dragon Sicilian (1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6) flanks Black's king bishop to g7 — the most aggressive Sicilian setup. Both sides castle opposite wings and storm each other's kings. The Yugoslav Attack (Be3 + f3 + Qd2 + O-O-O + h4-h5) is the sharpest white test; tens of thousands of games analyzed to move 25.",
    character: 'opposite-side attacking race',
    keyIdeas: ['g6 + Bg7 fianchetto', 'storm the white king on queenside', 'Yugoslav Attack pawn races'],
  },
  'sicilian-sveshnikov': {
    description: "The Sveshnikov Sicilian (1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5) — also called Lasker-Pelikan — accepts a permanent backward d-pawn and weak d5-square in exchange for active piece play and a strong kingside pawn structure. Black uses the f-file and central piece pressure to compensate.",
    character: 'positional gambit-like compensation',
    keyIdeas: ['accept d6 weakness for active play', 'pressure f-file and dark squares', 'a-pawn break: …a6 + …b5'],
  },
  'sicilian-alapin': {
    description: "The Alapin Sicilian (1.e4 c5 2.c3) sidesteps mainstream Sicilian theory by preparing d4 with c-pawn support. Black's …Nf6 attacks e4 and the position resembles an open game with imbalanced structure. Simpler than Open Sicilian theory but Black has many comfortable equalizing lines.",
    character: 'anti-Sicilian, simpler theory',
    keyIdeas: ['prepare d4 with c3 support', 'avoid mainline Sicilian theory', 'transpose to French / Caro-Kann ideas'],
  },
  'french-defence': {
    description: "The French Defence (1.e4 e6) is a solid asymmetric reply that creates a fixed pawn structure with light-square play for White and dark-square play for Black. Classical with 3.Nc3, Advance with 3.e5 (cramping Black but giving …f6 break later), Tarrasch with 3.Nd2 — each variation has distinct strategic flavors.",
    character: 'structurally fixed positional',
    keyIdeas: ['light-square struggle', 'c5 break for queenside expansion', 'f6 break against Advance'],
  },
  'caro-kann': {
    description: "The Caro-Kann Defence (1.e4 c6) is the most solid response to 1.e4. Black prepares …d5 with pawn support, accepting a slightly passive but rock-solid structure. Classical, Advance, Exchange, and Panov-Botvinnik variations all lead to distinct middlegame plans. Often called the 'drawmaster's weapon' — but Black has resources for full play.",
    character: 'rock-solid positional',
    keyIdeas: ['c6 + d5 pawn anchor', 'develop light bishop outside chain', 'minority attack on queenside'],
  },
  'scandinavian-defence': {
    description: "The Scandinavian Defence (1.e4 d5) — also called Center Counter — challenges White's center immediately. After 2.exd5, Black can recapture with the queen (Qxd5) or play …Nf6 to deflect the d-pawn. Lines with …Qa5 or …Qd6 lead to active piece play with the queen visiting unusual squares early.",
    character: 'unusual but sound',
    keyIdeas: ['immediate central trade', 'Qa5/Qd6 active queen lines', 'avoid the Nf6-deflection mainlines'],
  },
  'alekhine-defence': {
    description: "Alekhine's Defence (1.e4 Nf6) provokes White into building a large pawn center (after 2.e5 Nd5 3.d4) that Black later undermines with …d6, …c5, and …Nc6. Hypermodern philosophy at its sharpest — Black accepts central concession to attack the overextended pawns later.",
    character: 'hypermodern counter-attacking',
    keyIdeas: ['provoke pawn center then attack it', '...d6 + ...c5 + ...Nc6 break-up', 'Modern Variation with 4.Nf3 lines'],
  },
  'pirc-defence': {
    description: "The Pirc Defence (1.e4 d6 2.d4 Nf6 3.Nc3 g6) — closely related to the Modern Defence — sets up a King's Indian-style fianchetto against 1.e4. Black aims for slow maneuvering, …e5 break, or …c6+…b5 expansion. The Austrian Attack (4.f4) is White's most aggressive try.",
    character: 'hypermodern flexible',
    keyIdeas: ['Bg7 fianchetto', 'flexible …e5 / …c5 / …b5 plans', 'Austrian Attack with f4'],
  },
  'queens-gambit': {
    description: "The Queen's Gambit (1.d4 d5 2.c4) is the classical mainline against 1.d4 d5. White offers the c-pawn to deflect Black's d-pawn and gain central control. Black declines (Queen's Gambit Declined), accepts (Queen's Gambit Accepted), or plays the Slav (…c6). One of the most important opening complexes in classical chess theory.",
    character: 'classical strategic',
    keyIdeas: ['fight for central control', 'minority attack ideas', 'transpose into many systems'],
  },
  'qgd': {
    description: "The Queen's Gambit Declined (1.d4 d5 2.c4 e6) keeps the central pawn formation and lets Black develop solidly. Orthodox, Tartakower, Lasker, and Tarrasch defences are all main responses. White's plan is the minority attack on the queenside; Black's is solid play and counter-attack on the c-file.",
    character: 'classical positional',
    keyIdeas: ['minority attack b4-b5', 'classical pawn structure', 'Carlsbad structure middlegames'],
  },
  'qga': {
    description: "The Queen's Gambit Accepted (1.d4 d5 2.c4 dxc4) gives up the center but gains an open game with active piece play. Black plays …e6 + …a6 + …b5 to keep the extra pawn or trades it for fast development. Classical main lines balance White's central control against Black's piece activity.",
    character: 'open and active',
    keyIdeas: ['trade pawn for activity', 'open lines for pieces', 'classical e3 / e4 setups'],
  },
  'slav-defence': {
    description: "The Slav Defence (1.d4 d5 2.c4 c6) protects the d-pawn with the c-pawn, keeping the bishop's diagonal open. More flexible than QGD — Black can play …dxc4 + …b5 (Slav Geller variation), …Bf5 (Czech), or …a6 (Chebanenko). Solid and respected at top level.",
    character: 'solid flexible',
    keyIdeas: ['c6 + d5 pawn anchor', '…Bf5 outside developments', '…dxc4 + …b5 active plans'],
  },
  'semi-slav': {
    description: "The Semi-Slav (1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6) combines the Slav (…c6) with QGD (…e6) to keep maximum flexibility. The Meran (5.e3 Nbd7 6.Bd3 dxc4 7.Bxc4 b5) leads to sharp …b5 + …a6 + …c5 expansion. Played by all world champions.",
    character: 'sharp main-line theory',
    keyIdeas: ['Meran with …b5 + …a6 + …c5', 'sharp Botvinnik with f3 + e4', 'maintain flexible center'],
  },
  'london-system': {
    description: "The London System (1.d4 + 2.Bf4 or 2.Nf3 + 3.Bf4) is the most popular d4 opening today. White develops on auto-pilot — Bf4, e3, Nbd2, c3, Bd3 — and aims for a solid pawn structure. Modern players love it for the easy setup and rich middlegame plans, especially the e4 break.",
    character: 'system-based positional',
    keyIdeas: ['auto-pilot development', 'aim for e4 break', 'kingside maneuvering attack'],
  },
  'catalan-opening': {
    description: "The Catalan Opening (1.d4 Nf6 2.c4 e6 3.g3 + Bg2) combines the Queen's Gambit with kingside fianchetto. The Bg2 bishop pressures the long diagonal toward Black's queenside. Black's main responses are the Open Catalan (…dxc4) and Closed Catalan (…Be7+…O-O). A favorite at world championship level.",
    character: 'positional with long-diagonal pressure',
    keyIdeas: ['Bg2 long diagonal pressure', 'maintain central tension', 'queenside expansion later'],
  },
  'trompowsky-attack': {
    description: "The Trompowsky Attack (1.d4 Nf6 2.Bg5) immediately pins the king's knight. Black usually plays …Ne4 or …d5, and structurally play resembles a London-Tromp hybrid. Hodgson's specialty — a common weapon for players who want to avoid mainstream d4 theory.",
    character: 'anti-Indian system',
    keyIdeas: ['immediate Bg5 pin', 'avoid mainstream theory', 'flexible middlegame play'],
  },
  'kings-indian-defence': {
    description: "The King's Indian Defence (1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 + …d6) lets White build a massive pawn center which Black undermines with …e5 + …f5 (kingside storm) or …c5 (queenside). Fischer and Kasparov's favorite — a fighting reply that aims for kingside attacks. Mar del Plata is the sharpest mainline.",
    character: 'fighting hypermodern',
    keyIdeas: ['…e5 + …f5 kingside storm', 'Mar del Plata pawn race', 'attack the king on opposite wings'],
  },
  'nimzo-indian': {
    description: "The Nimzo-Indian Defence (1.d4 Nf6 2.c4 e6 3.Nc3 Bb4) pins the c3-knight and prepares to inflict structural damage on White (doubled c-pawns after …Bxc3). Pure positional play — Black has the structure and dark-square play; White has the bishop pair and central pawn majority. The deepest opening in modern chess.",
    character: 'pure positional',
    keyIdeas: ['exchange Bb4 for c3-knight', 'doubled c-pawns on White', 'dark-square strategy'],
  },
  'grunfeld-defence': {
    description: "The Grünfeld Defence (1.d4 Nf6 2.c4 g6 3.Nc3 d5) — a hypermodern response to the Queen's Gambit complex. Black gives up the center to attack it later with …c5 + …Nc6 + …Bg7. Sharp tactics, deep theory. Played by Kasparov, Anand, Karjakin, and many top players.",
    character: 'hypermodern sharp',
    keyIdeas: ['give up center to attack it', '…c5 + …Nc6 break', 'fianchetto Bg7 long diagonal pressure'],
  },
  'dutch-defence': {
    description: "The Dutch Defence (1.d4 f5) immediately stakes a claim on the kingside light squares. Stonewall (…d5 + …e6 + …f5 + …c6 + Nbd7 + …Bd6) leads to a fortress-like middlegame; Leningrad (…g6 + …Bg7) is more active. Both lead to attacking play on the kingside.",
    character: 'attacking kingside',
    keyIdeas: ['Stonewall fortress structure', 'Leningrad active fianchetto', 'kingside light-square attack'],
  },
  'benoni-defence': {
    description: "The Benoni Defence (1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6) creates an asymmetric pawn structure with Black accepting a backward d-pawn for queenside space and …b5/…c4 plans. Modern Benoni is sharp and tactical; Czech Benoni is more positional.",
    character: 'sharp asymmetric',
    keyIdeas: ['queenside space with …a6 + …b5', '…f5 break later', 'unbalanced pawn structure'],
  },
  'benko-gambit': {
    description: "The Benko Gambit (1.d4 Nf6 2.c4 c5 3.d5 b5) sacrifices the b-pawn for long-term queenside pressure on the a- and b-files. Black's structural compensation is excellent and lasts well into the endgame. A strategically clear sacrifice that's been a top weapon for decades.",
    character: 'long-term positional sacrifice',
    keyIdeas: ['sacrifice b-pawn', 'queenside file pressure', 'long-term endgame compensation'],
  },
  'queens-indian': {
    description: "The Queen's Indian Defence (1.d4 Nf6 2.c4 e6 3.Nf3 b6) fianchettos the queen's bishop, mirroring White's Catalan-style ideas. Solid and flexible — leads to middlegames with both sides building up gradually. Reuben Fine called it the 'most strategically rich' of the Indian Defences.",
    character: 'flexible positional',
    keyIdeas: ['…Bb7 long-diagonal pressure', 'solid central play', 'flexible middlegame planning'],
  },
  'budapest-gambit': {
    description: "The Budapest Gambit (1.d4 Nf6 2.c4 e5) sacrifices a pawn for rapid piece development. Black plays …Bb4+ and …Nxe5, then aims for active piece play around White's king. Less common than mainline d4 defences but contains real bite, especially in the Fajarowicz Variation (3.dxe5 Ne4).",
    character: 'sacrificial gambit',
    keyIdeas: ['pawn sacrifice for development', 'active piece play', 'Fajarowicz with …Ne4 attack'],
  },
  'old-indian-defence': {
    description: "The Old Indian Defence (1.d4 Nf6 2.c4 d6) develops more conservatively than the King's Indian — Black holds back the king's bishop and aims for slow central buildup. Often used as a transposition tool into Philidor-like structures or as a quiet response to avoid heavy King's Indian theory.",
    character: 'slow positional',
    keyIdeas: ['Philidor-like structures', 'slow central buildup', 'flexible middlegame'],
  },
  'english-opening': {
    description: "The English Opening (1.c4) flank-attacks the center and offers the most transposition options of any opening. White can play it as a Reversed Sicilian (with …e5), Reversed Benoni (with …c5), or pure English (slow maneuvering). Botvinnik's English System and the Symmetrical English are both top-level main lines.",
    character: 'flank attack with transpositions',
    keyIdeas: ['fight for d4 + e4 squares', 'transpose to many openings', 'Reversed Sicilian ideas'],
  },
  'reti-opening': {
    description: "The Réti Opening (1.Nf3 followed by c4 or g3) is a flexible hypermodern system. White delays committing pawns, develops the king's knight first, and aims to dictate the central structure based on Black's choice. Often transposes into King's Indian Attack, Catalan, or English structures.",
    character: 'flexible hypermodern',
    keyIdeas: ['delay central commitment', 'fianchetto Bg2 long diagonal', 'transpose based on Black\'s setup'],
  },
  'kings-indian-attack': {
    description: "The King's Indian Attack (1.Nf3 + g3 + Bg2 + d3 + O-O + Nbd2 + e4) is a system-based setup that mirrors the King's Indian Defence with colors reversed. White builds slowly and aims for the e4-e5 pawn push followed by kingside attack. Easy to learn, hard to play perfectly.",
    character: 'system-based attacking',
    keyIdeas: ['mirror KID with colors reversed', 'e4-e5 push and kingside attack', 'auto-pilot development'],
  },
  'birds-opening': {
    description: "Bird's Opening (1.f4) is the rare flank opening on the kingside, treating the position as a Dutch Defence with colors reversed. White aims for kingside space and attacking chances at the cost of a slightly weakened king position. Henry Bird's signature 19th-century weapon.",
    character: 'flank attack on kingside',
    keyIdeas: ['Dutch with colors reversed', 'kingside space and attack', 'g3 + Bg2 + Nf3 development'],
  },
};

const data = JSON.parse(await readFile(PATH, 'utf-8'));

data.openingDefinitions = DEFS;

await writeFile(PATH, JSON.stringify(data, null, 2) + '\n');

console.log(`added ${Object.keys(DEFS).length} static opening definitions`);
console.log(`openings with EITHER passages or fallback definitions:`);
const ids = new Set([...Object.keys(data.openings), ...Object.keys(DEFS)]);
console.log(`  total covered: ${ids.size}`);
const haveBookPassages = Object.keys(data.openings).filter(id => (data.openings[id] || []).length > 0);
console.log(`  book-passage coverage: ${haveBookPassages.length}`);
console.log(`  fallback definition coverage: ${Object.keys(DEFS).length}`);
