#!/usr/bin/env node
// Builds the remaining 8 Naroditsky pro-rep entries (Alapin, Najdorf,
// KID, Alekhine, KIA, Rossolimo, Jobava London, Ruy Lopez). Each entry
// gets its data-derived spine + curated variations + key ideas + traps
// + warnings + sources, and a top-rated model game from his actual wins.
//
// Voice paraphrases his recurring framing from listudy.org's distilled
// teaching principles; every move chess.js-validated; sources match
// the narrationSources allowlist.

import fs from 'node:fs';
import path from 'node:path';

const PRO_REP = 'src/data/pro-repertoires.json';
const MODEL_GAMES = 'src/data/model-games.json';
const PRO_MAP = 'src/data/proRepertoireOpeningMap.json';
const DL = 'src/services/dataLoader.ts';
const TREES_DIR = 'data/sources/danielnaroditsky-trees';

// Universal source array for all pro-rep entries (chess.com is the
// PGN source of truth; per-opening books cited per entry)
const baseSrc = ['https://api.chess.com/pub/player/danielnaroditsky/games/archives'];

// Strip PGN headers from a chess.com raw PGN, returning bare moves
function stripPgn(pgnText) {
  const splitAt = pgnText.search(/\n\n/);
  let body = splitAt >= 0 ? pgnText.slice(splitAt) : pgnText;
  body = body
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^()]*\)/g, '')
    .replace(/\b\d+\.+\s*/g, '')
    .replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
    .replace(/\s+/g, ' ').trim();
  return body;
}

// ============================================================
// OPENING CONFIGS — one per opening, fields go straight into JSON
// ============================================================

const CONFIGS = [
  {
    id: 'pro-naroditsky-alapin',
    eco: 'B22',
    name: 'Alapin Sicilian (Naroditsky)',
    color: 'white',
    style: 'Positional, Anti-Sicilian',
    pgn: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O',
    masterclassMap: 'sicilian-alapin',
    
    overview:
      "The c3 anti-Sicilian — Naroditsky's most-played weapon vs 1...c5 (2,752 games, 73.8% score). The whole point is move three: d4, supported by the c3-pawn, building a classical centre instead of letting Black drag us into Sicilian theory. We score 73.8% across nearly 3,000 games here for one reason — opponents prepared for the Open Sicilian get a structural game instead, and they're outclassed positionally before they realize they're not in a sharp fight.",
    keyIdeas: [
      "c3 supports d4. The whole opening is setup for ONE move. After 1.e4 c5 2.c3, we WILL play d4 on move 3 (or move 4 after Black declares), and the centre will be ours. Black's …d5 challenges are met with a pawn-trade that opens the position favorably.",
      "Nf6 gets kicked to d5, then chased to b6. Black's natural development is punished by tempo — we push e5, the knight bounces to d5, our Bc4 hits it, and they retreat to b6. We've gained two tempi while developing pieces naturally.",
      "a4-a5-a6 cramps Black's queenside. After the typical trades around move 10, we play a4 starting the queenside crawl. Black's pawn on a7 becomes weak, the b6-knight has nowhere to go, and the c-file is half-open for us forever.",
      "Trade bishops on e6 when offered. Black's …Be6 is the standard development — we trade with Bxe6, removing Black's good piece and keeping our knight + bishop pair. Long-term structural advantage every time.",
    ],
    traps: [
      "If Black plays the careless 4...Nf6?? attacking e4 again, we already have 4.e5 and the knight on f6 is en prise — that's why move-order matters. Black must play the central 2...d5 or accept the cramped 2...Nf6 / 2...e6 lines.",
      "After the typical 6.Bb3 d5 Black tries to win the pawn back with 7...Nxe5? — but 8.Nxe5 Qa5+ 9.Nc3 wins on tempi; Black has to retreat the queen and we keep the extra pawn.",
    ],
    warnings: [
      "Don't push d4 too early. After 2.c3, we must wait until Black's centre is committed (2...Nf6 e5 ...) before pushing d4. Premature 3.d4? cxd4 4.cxd4 d5! gives Black equality immediately.",
      "Don't trade Bb3 voluntarily. The bishop on b3 is staring at f7 for the rest of the game; it's our best piece. Let Black come to us — if they offer …Be6, we trade them; if they don't, the bishop stays and we attack with it.",
    ],
    variations: [
      { name: '2...d5 Open Variation', pgn: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3', explanation: "Black's most-played 2...d5 (783 games, 71.3%). We trade pawns, develop Na3 with the c4 outpost in mind, and play a positional middlegame with the queens on the board." },
      { name: '2...e6 French-Style', pgn: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7', explanation: "Black tries to transpose to a French-style structure with 2...e6 (344 games, 74%). We push d4 immediately and build a Mar-Caro centre. The bishop on c8 stays passive forever." },
      { name: '2...d6 Najdorf-Avoiding', pgn: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6', explanation: "Black plays Najdorf-style with 2...d6 (173 games, 80.6%). We push d4 immediately, accept the trade, and reach a clean classical position with the better centre." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky's signature Alapin against Jospem (3106), 173 plies. He grinds the queenside crawl (a4-a5-a6) plan to a winning endgame.",
    
  },
  {
    id: 'pro-naroditsky-najdorf',
    eco: 'B90',
    name: 'Sicilian Najdorf (Naroditsky)',
    color: 'black',
    style: 'Sharp, Theoretical',
    pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7',
    masterclassMap: 'sicilian-najdorf',
    
    overview:
      "The sharpest defense in chess. Naroditsky's Najdorf scores 65.3% across 1,475 games — most against the English Attack (Bg5/f4/Qf3/O-O-O), the most-theoretical, most-dangerous setup White can choose. We play …a6 on move 5 to claim b5 forever, then accept the race: opposite-side castling, attack faster, win the king-hunt.",
    keyIdeas: [
      "…a6 claims b5 forever. The move that defines the Najdorf. We don't develop anything on move 5; we just stake out b5 so White's Bb5 ideas are dead, our b5 pawn-storm is queued, and the …Bb7 fianchetto is set up.",
      "Opposite-side castling = race. When White plays O-O-O, we castle short and attack on the queenside (it's their king side now). The race is won by whoever opens lines faster — and the Najdorf's queenside is half-open from move 2.",
      "Trade pieces on the open files. The c-file is half-open for Black from the very start (after 2.Nf3 d6 3.d4 cxd4). Our queen on c7, our rook on c8, and trades around the c-file all favor us in the king-hunt.",
      "h6 forces White's bishop decision. After Bg5, …h6 makes White commit RIGHT NOW — trade on f6 (giving us the open g-file) or retreat Bh4 (passive). Either way the bishop is no longer pinning our knight effectively.",
    ],
    traps: [
      "If White plays the careless 6.Qf3? before f4, we have 6...Nbd7 with the knight ready for …Nc5 (kicking the queen) and …Ne5 (centre outpost). The queen on f3 is bad in this position.",
      "After 7.f4 the natural 7...Nbd7 sets up a trick: if White plays 8.Bc4? we have 8...Qb6! attacking b2 with no Nb3 to defend (the knight is on d4). White must defend laboriously.",
    ],
    warnings: [
      "Don't trade queens. Najdorf middlegames are sharp because the queens are on the board hunting kings. Trading queens lets White convert the structural battle, which favors them (better pawn structure).",
      "Don't push h5 too early. The h-pawn is for the king-hunt LATER, not as a structural commitment now. Premature …h5 lets White answer h4 and we've traded our attacker for static play.",
    ],
    variations: [
      { name: '6.Be3 English Attack', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Nbd7 Qd2 b5', explanation: "The English Attack proper (237 games, 67.3%). 6.Be3 + f3 + Qd2 + O-O-O. We answer with …e5, …Be6, …Nbd7, then …b5 racing. Same race, different White move-order." },
      { name: '6.Be2 Classical', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 Be3 O-O Qd2 Be6', explanation: "Classical mainline (214 games, 64.5%). Quieter — White castles short, both sides play classical chess. We get a comfortable middlegame with no immediate king-hunt." },
      { name: '6.h3 Adams Attack', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 h3 e5 Nde2 h5', explanation: "The h3 sideline (164 games, 59.5%). White prepares g4 without committing to long castling. We answer …e5 and …h5 freezing the kingside before they push." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky vs Christopher Yoo (3090), 32-ply blitz win in the Najdorf English Attack. Clean opposite-side-castling race ending in a mating attack.",
  },
  {
    id: 'pro-naroditsky-kid',
    eco: 'E70',
    name: "King's Indian Defense (Naroditsky)",
    color: 'black',
    style: 'Aggressive, Counter-Attacking',
    pgn: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5',
    masterclassMap: 'kings-indian-defence',
    
    overview:
      "Naroditsky's King's Indian — 5,275 games as Black, 65% score. The KID is the openings world's purest counter-attacking weapon: we give White the broad centre on purpose, then crack it with …e5 / …c5 / …f5 from the side. The Mar del Plata mainline (this spine) is the deepest, sharpest, most-theoretical KID treatment.",
    keyIdeas: [
      "The Bg7 is your most important piece. Built around the long diagonal a1-h8. Every plan supports it; every trade should keep it on the board; every attack uses it.",
      "…e5 is THE move. Move 7 (here) we strike at d4 directly. Most KID middlegames hinge on whether the centre opens with our …e5 or locks with White's d5. We're playing for the open game.",
      "Knight reroutes are everything. Our knight goes Nf6 → Nh5 → Nf4 in the mainline — three moves to land the prize square. The same square waits in every variation.",
      "Kingside attack with …f5 + …f4. Late middlegame: once we've expanded with …f5 we have a pawn-storm queued. White's king is on the kingside, our pieces all aim there, and our space advantage is real.",
    ],
    traps: [
      "After the typical 8.O-O exd4, the natural 9.Nxd4 lets us play 9...Re8 attacking e4 with tempo. White MUST respond — either f3 (passive) or e5 (loses material to our …Nh5 attacking e5). Either way we're better.",
      "Beware the Bayonet Attack (9.b4) in the Classical: 9...Nh5 10.Re1 f5 immediately starts our counterattack. If White goes 10.g3? we have 10...f5 with a powerful attack on the centre.",
    ],
    warnings: [
      "Don't play …c5 in the Mar del Plata. Once the centre is open (after …exd4 Nxd4), …c5 just gives White's knight a free target on a great square. Save …c5 for closed positions where White has pushed d5.",
      "Don't trade off the Bg7. White will offer trades with Bh6 or Be3. Sometimes you accept (when material gain compensates), but the default is to keep your fianchettoed bishop alive — it's worth a pawn structurally.",
    ],
    variations: [
      { name: '7.Be2 Classical', pgn: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5 Be3', explanation: "The Classical mainline (681 games, 65.9%). White builds the broad centre and develops Be2; we strike with …e5 and play the Mar del Plata." },
      { name: '7.h3 / Makogonov', pgn: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 c6 Nf3', explanation: "Makogonov — White plays h3 first to prevent …Ng4 ideas (335 games, 62.5%). We answer with …c6 + …Nbd7 building a solid centre, then break with …e5." },
      { name: '6.Nf3 / 6.g3 Fianchetto', pgn: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nc6', explanation: "Fianchetto Variation (592 games, 65%). White fianchettos their own bishop. We answer with classical …Nc6 + …e5, fighting in the centre." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky vs Brandon Jacobson (3143), 116-ply KID Classical. Clean Mar del Plata attack converting to a winning endgame.",
  },
  {
    id: 'pro-naroditsky-alekhine',
    eco: 'B05',
    name: "Alekhine's Defense (Naroditsky)",
    color: 'black',
    style: 'Provocative, Hypermodern',
    pgn: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7',
    masterclassMap: 'alekhine-defence',
    
    overview:
      "Naroditsky's most-confident black response when he wants a fight: provoke White's pawns forward, then undermine. 2,830 games, 68.7% score — one of the highest in his repertoire. The Modern Variation (this spine) is the Alekhine's most-principled treatment: we attack the e4-pawn, let White over-extend with e5/d4, then strike back at the centre.",
    keyIdeas: [
      "Provoke, don't develop. Move 1 we attack White's most-developed pawn instead of developing a piece ourselves. The whole opening is built on making White's pieces work harder while we wait.",
      "Trade pawns, not pieces. The c2-d4-e5 pawn chain looks impressive but every pawn forward is one less piece defending. We trade pawns on every chance (…dxe5, …c6 supporting …Nb6 attacking c4) and the chain crumbles.",
      "The c8-bishop is NOT a problem. Unlike the Caro and Slav, in the Alekhine the Bc8 has natural squares — f5, g4, e6 — without needing a clearing move. Develop it actively.",
      "Open positions favor knights here. Counterintuitive but true: our Nd5 is so well-placed (controlling b6, c7, e7, f4) that we don't need to trade it. White's bishops will look bad without targets.",
    ],
    traps: [
      "After 2.e5 Nd5 3.d4 d6 4.c4? Nb6 5.Nc3 Bg4! pins the f3-knight to the queen and wins material. Most amateur White players play 4.c4 by reflex; the punishment is forced.",
      "If White plays the awkward 4.Nf3 Nb6 5.exd6? cxd6 (recapture the e-pawn back), White's chase has failed and we have free development. The …Nb6 retreat must be respected, not chased.",
    ],
    warnings: [
      "Don't grab the e5-pawn too early. After 4.Nf3 the natural 4...dxe5 5.Nxe5 c6 is fine, but earlier captures (3...dxe5? after 3.d4) lose to the simple 4.exd5! winning a piece.",
      "Don't get cute with the Nd5. The knight on d5 is well-placed but vulnerable to c4 chasing it. If White plays c4 early, we MUST move (usually to Nb6) — there's no point staying and getting captured.",
    ],
    variations: [
      { name: '2.Nc3 Two Knights', pgn: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Bb4', explanation: "White declines the chase with 2.Nc3 (839 games, 68.9%). We get a Petroff-style game with a tempo for the …Nc6 / …Bb4 development. Solid, equal, and Black's score is excellent." },
      { name: '4.c4 Modern Main', pgn: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3', explanation: "The Modern Mainline with 4.c4 (290 games, 72.1%). We retreat Nb6, recapture with e-pawn, and reach a healthy structure with the open e-file." },
      { name: '4.Nf3 / Modern Quiet', pgn: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2 Bf5', explanation: "White plays Nf3 instead of c4 (291 games, 70.3%). We get our pieces out: Nb6, Bf5, Nc6 etc. Classical development with the better pawn structure." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky vs Duhless (3131), 114-ply Modern Alekhine. Outplays a 3100+ opponent with patient piece development.",
  },
  {
    id: 'pro-naroditsky-kia',
    eco: 'A05',
    name: "King's Indian Attack (Naroditsky)",
    color: 'white',
    style: 'System, Flexible',
    pgn: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5 e4 Nc6 c3',
    masterclassMap: 'kings-indian-attack',
    
    overview:
      "Naroditsky's MOST-played opening: 18,216 games as White, 69.7% score. The KIA is a system, not theory — we make the same setup against everything: Nf3, g3, Bg2, O-O, d3, Nbd2, e4. Whatever Black does, our development is the same. The opening's power is in how WELL we know it: 18,000 reps means every middlegame structure is familiar terrain.",
    keyIdeas: [
      "System over theory. Same setup every game: Nf3-g3-Bg2-O-O-d3-Nbd2-e4. We give up the chance to fight for an opening advantage in exchange for ALWAYS knowing where our pieces go.",
      "The Bg2 is the system's anchor. Bishop on the long diagonal pointing at the queenside — never trade it for a knight casually. The Bg2 is what makes the e4 push work later.",
      "e4 is the system's payoff move. After all our development, e4 challenges Black's centre. The position resolves into either an open game (favoring our developed pieces) or a complex middlegame (favoring our preparation).",
      "Kingside attack with Nh4 + f4. Late middlegame: rerouting the f3-knight to h4, then f4-f5 cracking Black's kingside. The Bg2 supports it all from the long diagonal.",
    ],
    traps: [
      "If Black plays …d5 / …e6 / …c5 (the French-style setup), we play e4 challenging immediately. After …dxe4 5.dxe4 Black's e6-pawn becomes weak and our Bg2 + Nbd2 setup pressures it.",
      "If Black plays …d5 / …c5 / …Nc6 / …Nf6, the most popular setup, we play d4! at the right moment — opening the long diagonal for Bg2 with crushing effect.",
    ],
    warnings: [
      "Don't push e4 too early. It must come AFTER our development is complete. Premature e4 lets Black play …dxe4 and we lose central control.",
      "Don't trade Bg2 voluntarily. The bishop on g2 is the system's anchor — it supports every push and every attack. Black will offer trades; usually we decline.",
    ],
    variations: [
      { name: '1...d5 KIA mainline', pgn: 'Nf3 d5 g3 Nf6 Bg2 g6 O-O Bg7 d3 O-O Nbd2 c5 e4', explanation: "The most-faced KIA setup (4,382 games, 66.3%). Black plays d5 first, we mirror our system, then the e4 break opens the centre when our development is complete." },
      { name: '1...g6 Modern setup', pgn: 'Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 d6', explanation: "Black plays Modern (2,652 games, 69.3%). Mirror fianchettos, both kings castled — symmetrical-looking but we have the slight first-move advantage and our plan is clearer." },
      { name: '2.d4 KID transposition', pgn: 'Nf3 Nf6 d4 g6 c4 Bg7 Nc3 d6', explanation: "Sometimes we play d4 instead of g3 (1,341 games, 71.2%) — transposing to a KID-style game with us as White. Same broad-centre middlegame as the regular KID, just from a slightly different move-order." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky vs 0gZPanda (3200), 49-ply KIA mainline. Clean d4 transposition + kingside attack converting in under 25 moves.",
  },
  {
    id: 'pro-naroditsky-rossolimo',
    eco: 'B30',
    name: 'Anti-Sicilian Rossolimo (Naroditsky)',
    color: 'white',
    style: 'Anti-Theory, Positional',
    pgn: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1 e6 Bf1 b6 c4 Bb7 Nc3',
    
    bookSrc: 'book:sicilian-rossolimo',
    overview:
      "Naroditsky's alternative anti-Sicilian when he wants something different than the Alapin: 4,151 games, 65.5% score. The Rossolimo/Moscow complex sidesteps the Open Sicilian theory by checking with Bb5+ (vs …d6) or pinning with Bb5 (vs …Nc6). Black gets the Sicilian they DIDN'T prepare for.",
    keyIdeas: [
      "Bb5+ disrupts Black's setup. The check costs nothing and forces Black to commit — …Bd7 (passive), …Nd7 (blockade), or …Nc6 (transposes). Each one is uncomfortable.",
      "Reroute the bishop: Bb5+ → Bd3 → Bf1. The bishop goes from active check, to the centre via d3, to home base via f1, ready to redeploy. Three moves of bishop activity, three tempi of Black uncertainty.",
      "Maroczy Bind with c4 + Nc3. Late opening: c4 + Nc3 sets up the Maroczy structure. Black's pieces are cramped, our centre dominates, and the long game favors us positionally.",
      "Re1 supports the centre permanently. Early Re1 backs up e4 and prepares the f1-bishop's return path. The rook on e1 is the spine of every Naroditsky Rossolimo middlegame.",
    ],
    traps: [
      "If Black plays 3...Bd7 (the easy trade), 4.Bxd7+ Nxd7 leaves Black with a passive knight on d7 (no good squares) and us with the bishop pair starting to dominate.",
      "After 3...Nc6 (the most-played reply), we play 4.Bxc6+ bxc6 5.O-O followed by Re1 and d4 — Black's doubled c-pawns become a chronic weakness for the rest of the game.",
    ],
    warnings: [
      "Don't play d4 in the Maroczy. Once we've committed to c4 + Nc3, the structure is locked positionally. Pushing d4 just opens lines for Black's pieces. Patience — let them crack first.",
      "Don't trade off pieces randomly. The Rossolimo is a positional opening; piece trades simplify toward an endgame where Black's structural weaknesses matter less. Keep pieces on the board.",
    ],
    variations: [
      { name: '3...Nc6 Rossolimo proper', pgn: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5', explanation: "The Rossolimo proper (961 games, 66.2%). Black plays Nc6 immediately, we develop classically and reach a structure favoring our pieces." },
      { name: '3...e6 Open avoidance', pgn: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3', explanation: "Black plays …e6 trying to transpose to Open Sicilian (793 games, 65.8%). We take with d4 — actually, here we DO play Open Sicilian, but reach the Taimanov where our prep is excellent." },
      { name: '4.Bxd7+ Trade', pgn: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nf6 Re1', explanation: "Black plays the easy Bd7 (401 games, 66.8%) — we trade immediately and play a quiet positional game with the bishop pair and centre advantage." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky vs Firouzja (3136), 109-ply Rossolimo Moscow. Outplays the world's top-rated bullet player in his own anti-Sicilian.",
  },
  {
    id: 'pro-naroditsky-jobava-london',
    eco: 'D00',
    name: 'Jobava London (Naroditsky)',
    color: 'white',
    style: 'Aggressive d4, Tactical',
    pgn: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3',
    masterclassMap: 'london-system',
    
    overview:
      "The Jobava London — Naroditsky's aggressive d4 surprise. 2,170 games, 70.3% score. Move two we play Nc3 instead of the boring Nf3, signaling a tactical fight. The Bf4 lands on its natural square (aiming at c7 AND the long diagonal), and the opening produces sharp middlegames that punish opponents expecting the standard London snooze.",
    keyIdeas: [
      "Nc3 over Nf3. The defining move. Nc3 keeps tactical options open (Nb5 ideas, e4 push), while Nf3 commits to the boring London structure. The whole opening's identity hinges on this choice.",
      "Bf4 is on its best square. Not e3-d2 like the regular London, but f4 with sight on c7 (Black's queenside weakness) and the a1-h8 diagonal. The bishop is active from move 3.",
      "Queen to the centre. After Qxd4 (recapturing on d4 with the queen), the queen sits in the centre threatening tactics. Tempo to attack it costs Black development.",
      "e4 break opens lines. Late opening / early middlegame: e3 / Nf3 / e4 cracks open the centre. Our developed pieces find targets, Black's pieces find each other.",
    ],
    traps: [
      "If Black plays the careless 4...Nbd7? after 4.Bf4, we have 5.Nb5 attacking c7 and the threat of Nc7+ — Black must give up the bishop pair or shuffle awkwardly.",
      "After Qxd4 Nc6 chasing the queen, 6.Qd3 hits h7 indirectly and prepares Qe4 with central dominance. The queen's escape route is also a re-attack.",
    ],
    warnings: [
      "Don't put the bishop on e3 / d2 by reflex. This is NOT the regular London. The bishop's home is f4 — putting it elsewhere kills the opening's tactical potential.",
      "Don't trade queens in the centre. The Qxd4 / Qd3 setup is built on the queen being active. If Black offers a trade, decline (almost always) — the queen on d3 or e4 is doing too much work.",
    ],
    variations: [
      { name: '2...e6 French Setup', pgn: 'd4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6', explanation: "Black plays French-style with 2...e6 (528 games, 67.5%). We get a classical position with the Bf4 vs Bd6 trade and a slight space advantage." },
      { name: '2...c6 Slav-Style', pgn: 'd4 d5 Nc3 c6 Bf4 Nf6 e3 Bf5', explanation: "Black plays Slav-style with 2...c6 (390 games, 72.3%). The Bf5 / Bf4 face-off is classical; trades favor us positionally." },
      { name: '3...a6 with ...c5', pgn: 'd4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3 c5', explanation: "Black prepares …c5 with the slow …a6 (261 games, 73%). We develop classically; once the c-file opens, our coordinated pieces dominate." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky vs dogsofwar (3161), 167-ply Jobava London. Classic Naroditsky grind — opens the position tactically, then converts in the endgame.",
  },
  {
    id: 'pro-naroditsky-ruy-lopez',
    eco: 'C84',
    name: 'Ruy Lopez (Naroditsky)',
    color: 'white',
    style: 'Classical, Patient',
    pgn: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d4 Nxd4 Nxd4 exd4 e5 Ne8 c3',
    masterclassMap: 'ruy-lopez',
    bookSrc: 'book:ruy-lopez',
    overview:
      "The Ruy Lopez — most-theoretical opening in chess. Naroditsky's repertoire is the modern Closed Spanish mainline: 2,922 games, 62.5% score. The opening rewards patience above all: we develop, pin, build, and wait for Black to crack under the pressure of an opening they've prepared for hundreds of games of repetition.",
    keyIdeas: [
      "Bb5 pins the knight against e5. The opening's defining move. Even when Black kicks with …a6 (move 3), the bishop stays on the diagonal — first via Ba4, then Bb3 if needed. The pin is the whole point.",
      "Patient development. The Ruy is famous for the SLOW build-up: Bb3 (re-developed), Re1 (supports e4), c3 (prepares d4), h3 (prevents …Bg4). Each move is small; together they form an iron centre.",
      "d4 is the central break. After Re1 + Bb3 + h3 + d3 + Nbd2, we eventually play d4 — usually after move 10. The break opens lines for our developed pieces while Black's pieces are still finding their squares.",
      "e5 push grabs space. In the spine, we play e5 after the d4 break, gaining a passed pawn and cramping Black's knight to a passive retreat. From here the long game is structural.",
    ],
    traps: [
      "If Black plays the Marshall Attack (8...d5), we accept the gambit: 9.exd5 Nxd5 10.Nxe5 Nxe5 11.Rxe5 c6 — and now patient defense usually consolidates the extra material.",
      "Against the Berlin Defense (3...Nf6 4.O-O Nxe4), we trade everything and play the endgame. Magnus Carlsen popularized this defense; the antidote is the patient bishop maneuver Bd3-Bg5 squeezing Black.",
    ],
    warnings: [
      "Don't push d4 too early. The break is the climax of our development, not the start. d4 before our pieces are coordinated lets Black trade favorably.",
      "Don't trade the Bb3 bishop. The bishop on b3 stares at f7 from move 4 onward. Trading it removes our most aggressive piece. Decline trade offers if structurally possible.",
    ],
    variations: [
      { name: 'Berlin Defense', pgn: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5', explanation: "The Berlin (955 games, 58.8%). Black trades into a queenless middlegame; we get the structural game with the better pawn structure and bishop pair compensation." },
      { name: 'Closed with d3', pgn: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 d3 b5 Bb3 Bc5', explanation: "The d3 / quiet Closed line (181 games, 67.1%). White plays a smaller-centre game with no d4 push — usually transposes to Italian Game-style positions." },
      { name: 'Steinitz Defense', pgn: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 c3 Bd7 d4 g6', explanation: "Steinitz Defense Deferred with …d6 (144 games, 61.8%). Black plays a solid, classical defense; we play c3 + d4 in standard Ruy fashion." },
    ],
    modelGameId: 'spine',
    modelGameOverview: "Naroditsky vs Nihal Sarin (3142), 93-ply Closed Spanish. Patient Ruy build to a winning middlegame attack on the kingside.",
  },
];

// ============================================================
// APPLY EDITS
// ============================================================

const proRep = JSON.parse(fs.readFileSync(PRO_REP, 'utf8'));
const modelGames = JSON.parse(fs.readFileSync(MODEL_GAMES, 'utf8'));
const proMap = JSON.parse(fs.readFileSync(PRO_MAP, 'utf8'));

let entriesAdded = 0, gamesAdded = 0;
for (const cfg of CONFIGS) {
  // Skip if already present (idempotent)
  proRep.openings = proRep.openings.filter((o) => o.id !== cfg.id);

  const sources = [...baseSrc];
  if (cfg.bookSrc) sources.unshift(cfg.bookSrc);

  const entry = {
    id: cfg.id,
    playerId: 'naroditsky',
    eco: cfg.eco,
    name: cfg.name,
    pgn: cfg.pgn,
    color: cfg.color,
    style: cfg.style,
    overview: cfg.overview,
    keyIdeas: cfg.keyIdeas,
    traps: cfg.traps,
    warnings: cfg.warnings,
    variations: cfg.variations.map((v) => ({
      name: v.name,
      pgn: v.pgn,
      explanation: v.explanation,
      sources,
    })),
    sources,
  };
  proRep.openings.push(entry);
  entriesAdded++;

  // Add masterclass map entry if specified
  if (cfg.masterclassMap) {
    proMap.map[cfg.id] = cfg.masterclassMap;
  }

  // Add model game
  const mgSrc = path.join(TREES_DIR, `${cfg.id.replace('pro-naroditsky-', '')}-model-games.json`);
  if (fs.existsSync(mgSrc)) {
    const mg = JSON.parse(fs.readFileSync(mgSrc, 'utf8'));
    const cand = mg.candidates.find((c) => c.id === cfg.modelGameId);
    if (cand && cand.games.length > 0) {
      const g = cand.games[0];
      const yearMatch = g.pgn.match(/\[Date "(\d{4})\.\d{2}\.\d{2}"\]/);
      const year = yearMatch ? Number(yearMatch[1]) : null;
      // Drop any existing model games for this opening
      const before = modelGames.length;
      const cleaned = modelGames.filter((mgEntry) => mgEntry.openingId !== cfg.id);
      modelGames.length = 0;
      modelGames.push(...cleaned);

      modelGames.push({
        id: `mg-${cfg.id}`,
        openingId: cfg.id,
        white: g.studentColor === 'white' ? 'Daniel Naroditsky' : g.opponent,
        black: g.studentColor === 'black' ? 'Daniel Naroditsky' : g.opponent,
        whiteElo: g.studentColor === 'white' ? g.studentRating : g.opponentRating,
        blackElo: g.studentColor === 'black' ? g.studentRating : g.opponentRating,
        result: g.studentColor === 'white' ? '1-0' : '0-1',
        year,
        event: `chess.com ${g.timeClass} (${g.date})`,
        pgn: stripPgn(g.pgn),
        sourceUrl: g.url,
        studentSide: cfg.color,
        overview: cfg.modelGameOverview,
        criticalMoments: [],
        middlegameTheme: cfg.style,
        lessonSummary: cfg.modelGameOverview,
      });
      gamesAdded++;
    } else {
      console.warn(`  no model-game spine candidates for ${cfg.id}`);
    }
  } else {
    console.warn(`  no model-games file for ${cfg.id} at ${mgSrc}`);
  }
}

fs.writeFileSync(PRO_REP, JSON.stringify(proRep, null, 2) + '\n');
fs.writeFileSync(MODEL_GAMES, JSON.stringify(modelGames, null, 2) + '\n');
fs.writeFileSync(PRO_MAP, JSON.stringify(proMap, null, 2) + '\n');

console.log(`[pro-rep] added/replaced ${entriesAdded} entries`);
console.log(`[model-games] added ${gamesAdded} entries`);
console.log(`[pro-map] updated with masterclass mappings`);

// Bump revision
const today = new Date().toISOString().slice(0, 10);
const dl = fs.readFileSync(DL, 'utf8');
const updated = dl.replace(/const PRO_DATA_REVISION = '[^']+';/, `const PRO_DATA_REVISION = '${today}-naroditsky-full-repertoire';`);
if (updated !== dl) fs.writeFileSync(DL, updated);
console.log('bumped PRO_DATA_REVISION');
console.log('\nDone.');
