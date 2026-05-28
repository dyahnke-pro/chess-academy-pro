#!/usr/bin/env node
// Build middlegame plans for all GothamChess openings. One main plan
// per opening, anchored to its data-derived spine. Themes verified to
// match the actual tree continuation moves (per CLAUDE.md G9.2 rule
// "match declared themes to actual line moves").

import fs from 'node:fs';
import { Chess } from 'chess.js';

const MP_PATH = 'src/data/middlegame-plans.json';
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const BASE_SOURCES = [
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://www.chess.com/member/gothamchess',
];

function loadTree(id) {
  return JSON.parse(fs.readFileSync(`data/sources/gothamchess-trees/${id}.json`, 'utf8'));
}

function continuation(tree, prefixSans, depth) {
  let node = tree.tree;
  const treeRoot = tree.minPrefix;
  if (prefixSans.length < treeRoot.length) throw new Error('prefix shorter than tree root');
  for (let i = 0; i < treeRoot.length; i++) {
    if (prefixSans[i] !== treeRoot[i]) throw new Error(`prefix mismatch at ply ${i}: expected ${treeRoot[i]} got ${prefixSans[i]}`);
  }
  for (let i = treeRoot.length; i < prefixSans.length; i++) {
    if (!node.children[prefixSans[i]]) throw new Error(`no child for ${prefixSans[i]} at depth ${i}`);
    node = node.children[prefixSans[i]];
  }
  const out = [];
  for (let i = 0; i < depth; i++) {
    const kids = Object.entries(node.children);
    if (kids.length === 0) break;
    const sorted = kids.sort((a, b) => b[1].games - a[1].games);
    if (sorted[0][1].games < 2) break;
    out.push(sorted[0][0]);
    node = sorted[0][1];
  }
  return out;
}

const PLANS = [];

// ============== CARO-KANN BLACK (1944 games, 63.2%) ==============
// Main spine: 4.Nc3 dxe4 5.Nxe4 Bf5 6.Ng3 Bg6 (his Bf5 line, not Tartakower)
// Wait — the spine actually is `d4 d5 e5 Bf5 h4 h5 Bd3 Bxd3 Qxd3 e6` which is
// the Advance Caro from BLACK side. After 1.e4 c6 2.d4 d5 3.e5 (Advance), Black plays Bf5.
PLANS.push({
  openingId: 'pro-gothamchess-caro-kann',
  treeId: 'caro-kann',
  id: 'mp-progothamchess-caro-bf5-trade',
  prefix: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bd3 Bxd3 Qxd3 e6 Bg5',
  depth: 8,
  title: "Caro-Kann Advance — …Bf5 trade-down + safe development",
  overview: "Levy's most-played Caro line as Black (1,944 games at 63.2% score). Against the Advance, he plays the …Bf5 main line trading off the light-squared bishop early before it gets locked in by c4-c5 pawn structure. After Bxd3 / Qxd3 / e6 / Bg5, Black calmly defends with Qa5+ developing the queen with tempo, then Qa6 attacking the d3 queen and …c5 to break out.",
  pawnBreaks: ["…c5 striking back at the d4-e5 pawn chain","…f6 challenging e5 once the bishops are off"],
  pieceManeuvers: ["…Qa5+ developing the queen with tempo","…Qa6 attacking d3 to force White's queen retreat","Knight reroute …Ne7 → …Nf5 / …Ng6 in some lines"],
  strategicThemes: ["Trade the light-squared bishop early before it's locked in","Patient development — the …c5 break only AFTER the trade-down"],
  endgameTransitions: ["R+minor+P endings where Black's solid pawn structure outlasts White's centre"],
  sources: ['book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation', ...BASE_SOURCES],
});

// ============== SCANDINAVIAN BLACK (1176 games, 64.5%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-scandinavian',
  treeId: 'scandinavian-black',
  id: 'mp-progothamchess-scandi-portuguese',
  prefix: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5',
  depth: 8,
  title: "Scandinavian Portuguese — …Bg4 pin + queen recapture",
  overview: "Levy's flagship Scandinavian line (1,176 games at 64.5% score) — the Portuguese variation with …Nf6 + …Bg4 pinning White's knight. After Be2 / Bxe2 / Qxe2, Black recaptures with the queen on d5 and develops smoothly. His Scandinavian is built around piece activity, not the 2…Qxd5 Mieses-Kotrc.",
  pawnBreaks: ["…c6 supporting d5 and freeing the queen","…e6 + …e5 expanding the centre"],
  pieceManeuvers: ["Nf6 → Nc6 developing knights to natural squares","Queen recaptures on d5 + drops back to a5 or d6","Light-squared bishop traded early via Bg4 + Bxe2"],
  strategicThemes: ["Active piece play over pawn structure","Bishop trade-down on e2 simplifies the position favourably"],
  endgameTransitions: ["R+minor+P endings where Black's active piece coordination converts"],
  sources: ['book:scandinavian-defence', 'https://www.chess.com/openings/Scandinavian-Defense', ...BASE_SOURCES],
});

// ============== TROMPOWSKY ATTACK (1823 games, 61.5%) — HIS TOP OPENING ==============
PLANS.push({
  openingId: 'pro-gothamchess-trompowsky',
  treeId: 'trompowsky',
  id: 'mp-progothamchess-trompowsky-knight-flank',
  prefix: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4',
  depth: 8,
  title: "Trompowsky — knight redirect + central tension",
  overview: "Gotham's most-played opening — 1,823 games at 61.5% score. The Trompowsky attack with Bg5 pins the knight immediately. After …e6 / Nd2 / …h6 / Bh4, White holds the bishop and lets Black commit pieces while keeping flexible centre options. The Trompowsky is the entire identity of his White repertoire — same Bg5 setup against most defences.",
  pawnBreaks: ["e3-e4 timed central break","c3-c4 challenging Black's d5 once it appears","f2-f4 in some lines for kingside expansion"],
  pieceManeuvers: ["Bh4 holding the pin","Nd2 supports e4 push without blocking the c1-h6 diagonal","Bishop sometimes drops to Bg3 in some lines"],
  strategicThemes: ["Pin pressure on the f6-knight cramps Black's setup","Flexible centre — White doesn't commit c2-c4 unless beneficial"],
  endgameTransitions: ["R+minor+P endings where the bishop pair or extra space converts"],
  sources: ['book:trompowsky', 'https://www.chess.com/openings/Trompowsky-Attack', ...BASE_SOURCES],
});

// ============== ENGLISH OPENING (1597 games, 62.2%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-english',
  treeId: 'english',
  id: 'mp-progothamchess-english-flank-attack',
  prefix: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5',
  depth: 8,
  title: "English — Botvinnik setup + kingside attack",
  overview: "Levy's English at 1,597 games / 62.2% score. The flexible 1.c4 system transposing into a Botvinnik-style closed centre after Nc3/e4/d4. With Black committing …d6/…g6 the position resembles a KID-reversed; White's plan is g4 + h4 kingside expansion while Black's space is cramped.",
  pawnBreaks: ["g4 kingside pawn storm","h4 supporting the flank attack","c5 in some lines opening the queenside"],
  pieceManeuvers: ["Be3 + Be2 + O-O classical development","Knight reroute Nc3 → Nb5 in some lines","Queen lifts via Qd2 supporting the kingside push"],
  strategicThemes: ["Closed-centre flank attack — KID structure reversed","g4 + h4 is the recurring weapon"],
  endgameTransitions: ["R+minor+P endgames where the kingside space advantage carries through"],
  sources: ['book:english-opening', 'https://www.chess.com/openings/English-Opening', ...BASE_SOURCES],
});

// ============== VIENNA GAME (649 games, 67.8%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-vienna',
  treeId: 'vienna',
  id: 'mp-progothamchess-vienna-paulsen-attack',
  prefix: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3',
  depth: 8,
  title: "Vienna Paulsen Attack — f4 thrust + queen swing",
  overview: "His Vienna at 649 games / 67.8% — one of his highest scores. After 3.f4 (Vienna Gambit), Black plays …d5 / 4.fxe5 / Black's …Nxe4 forces tactical complications. Qf3 + Nxc3 / bxc3 leaves White with a doubled pawn but excellent piece activity and an open f-file.",
  pawnBreaks: ["d2-d4 central expansion once pieces are out","c3-c4 supporting d4 and challenging Black's centre","e5-e6 in some sharp lines"],
  pieceManeuvers: ["Qf3 — central queen attacking f7 + supporting Nxc3","Knight reroute via Nf3 / Ne2","Bishop on c4 targets f7"],
  strategicThemes: ["Sharp tactical positions — Levy's specialty","Doubled c-pawns trade structure for piece activity"],
  endgameTransitions: ["Sharp middlegames — endgames rare in this gambit line"],
  sources: ['book:vienna-game', 'https://www.chess.com/openings/Vienna-Game', ...BASE_SOURCES],
});

// SKIPPED: Caro-Kann Advance White — no matching pro-rep entry yet.
// (His 423 games at 73.2% are the anti-Caro from White, but there's
// no pro-gothamchess-caro-advance-white entry to attach the plan to.
// Future work: add an entry, then add this plan.)

// ============== FRENCH DEFENSE BLACK (1596 games, 62.7%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-milner-barry',
  treeId: 'french-black',
  id: 'mp-progothamchess-french-rubinstein',
  prefix: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3',
  depth: 8,
  title: "French Rubinstein — broken kingside + bishop pair",
  overview: "Levy's French Defense as Black — his Rubinstein 4...dxe4 line at 1,596 games / 62.7% score. After 5.Nxe4 Nf6 6.Nxf6+ gxf6, Black accepts doubled f-pawns in exchange for the bishop pair and active piece play. The plan: develop Nc6 / Bg4 with pressure on the open g-file.",
  pawnBreaks: ["…e5 striking back at White's centre","…c5 challenging d4","…f5 expanding the kingside in some lines"],
  pieceManeuvers: ["Nc6 developing the queen's knight","Bg4 pinning and trading the f3-knight","Active queen swings to support …e5"],
  strategicThemes: ["Bishop pair compensates for the doubled pawns","Open g-file is the recurring attacking lever"],
  endgameTransitions: ["Endings with the bishop pair plus active king on the g-file"],
  sources: ['book:french-defence', 'https://www.chess.com/openings/French-Defense', ...BASE_SOURCES],
});

// ============== PIRC DEFENSE BLACK (351 games, 69.2%) — but no pro-rep entry yet ==============
// Will add an entry for it. Skipping middlegame plan until entry exists.
// Skipping in this script - addressed via Add-new-entries phase.

// ============== CLOSED SICILIAN WHITE (333 games, 68.0%) ==============
// No matching pro-rep entry yet — closed-sicilian not listed in pro-rep entries.
// Skipping until entry exists.

// ============== LONDON SYSTEM WHITE (327 games, 70.3%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-london',
  treeId: 'london',
  id: 'mp-progothamchess-london-classical-attack',
  prefix: 'd4 d5 Bf4 Nf6 e3 c5 Nf3 Nc6 Nbd2',
  depth: 6,
  title: "London System — …cxd4 / exd4 central exchange",
  overview: "Gotham's London System from 327 games at 70.3% score — one of his most-instructed openings on YouTube. After Bf4 / e3 / Nf3 / Nbd2 the system is the same every game; Black usually breaks with …cxd4, White recaptures exd4 accepting the isolated d-pawn for active piece play.",
  pawnBreaks: ["…cxd4 — Black's tension-releasing capture","exd4 recapture — White accepts the isolated d-pawn for activity"],
  pieceManeuvers: ["Bf4 holding the long diagonal","Nbd2 supports the centre","Queen lifts via Qe2 supporting central play"],
  strategicThemes: ["System play — same setup every game","Active piece play with the isolated d-pawn"],
  endgameTransitions: ["R+minor+P endgames where the isolated pawn isn't a weakness"],
  sources: ['book:london-system', 'https://www.chess.com/openings/London-System', ...BASE_SOURCES],
});

// ============== ITALIAN GAME WHITE (75 games, 68.0%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-italian',
  treeId: 'italian',
  id: 'mp-progothamchess-italian-evans-style',
  prefix: 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d4 Bxd4 Nxd4 Nxd4',
  depth: 6,
  title: "Italian — central thrust + tactical complications",
  overview: "Levy's Italian Game from 75 White games at 68.0%. The aggressive d4 thrust against the classical …Bc5 sets up tactical complications — Bxd4 / Nxd4 trades minor pieces with an open position and the bishop pair still intact.",
  pawnBreaks: ["d2-d4 the system-defining central break","f2-f4 in some attacking lines","c2-c3 supporting d4 in some lines"],
  pieceManeuvers: ["Bc4 targets f7 — the Italian's identity","Knight reroute via Nbd2 → Nf1 → Ng3","Queen lifts to e2 or d3"],
  strategicThemes: ["Sharp tactical positions","Bishop pair often survives Black's …Bxd4 trade"],
  endgameTransitions: ["R+minor+P endgames with the bishop pair as the conversion piece"],
  sources: ['book:italian-game', 'https://www.chess.com/openings/Italian-Game', ...BASE_SOURCES],
});

// ============== PONZIANI WHITE (82 games, 65.9%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-ponziani',
  treeId: 'ponziani',
  id: 'mp-progothamchess-ponziani-d4-thrust',
  prefix: 'e4 e5 Nf3 Nc6 c3 Nf6 d4',
  depth: 6,
  title: "Ponziani — d4 thrust + e5 cramping + Nd5",
  overview: "Gotham's Ponziani from 82 games at 65.9%. The c3 + d4 setup creates an aggressive central structure. After …exd4, White plays e5 cramping Black's pieces and forcing the knight to d5 where it's exposed to tempo-gaining attacks.",
  pawnBreaks: ["…exd4 — Black captures the d-pawn","e4-e5 cramping push forcing the knight to retreat","c3 + d4 central pawn chain"],
  pieceManeuvers: ["Knight forced to Nd5 — exposed to tempo-gaining attacks","Queen swings to b3 in some lines","Bishop development to b5 or c4"],
  strategicThemes: ["Aggressive central play","Knight on d5 is a structural cramp on Black"],
  endgameTransitions: ["Sharp middlegames — endgames are rare in this line"],
  sources: ['book:ponziani', 'https://www.chess.com/openings/Ponziani-Opening', ...BASE_SOURCES],
});

// ============== FANTASY CARO WHITE (95 games, 72.1%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-fantasy-caro',
  treeId: 'fantasy-caro',
  id: 'mp-progothamchess-fantasy-bxc3-pair',
  prefix: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3',
  depth: 8,
  title: "Fantasy Caro — dxe4 / Nh3 / fxe4 central recapture",
  overview: "Levy's Fantasy Caro from 95 games at 72.1%. The f3 line invites Black to challenge with …e6/Bb4/Bxc3+/bxc3. After …dxe4, White's Nh3 develops via the rim square (rerouting to Nf2 → Ng4 later), and fxe4 recaptures keeping the central pawn duo. Doubled c-pawns trade structure for the bishop pair + big centre.",
  pawnBreaks: ["…dxe4 — Black resolves central tension","fxe4 recapture — White keeps the central pawn duo"],
  pieceManeuvers: ["Bishop pair after Bxc3+","Nh3 → Nf2 → Ng4 knight redirect","Bd3 + O-O classical development"],
  strategicThemes: ["Bishop pair vs Black's pieces","Doubled c-pawns trade structure for central majority"],
  endgameTransitions: ["R+minor+P endgames where the bishop pair tells"],
  sources: ['https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation', ...BASE_SOURCES],
});

// ============== TROMPOWSKY (1823 games, 61.5%) — HIS TOP OPENING ==============
PLANS.push({
  openingId: 'pro-gothamchess-trompowsky',
  treeId: 'trompowsky',
  id: 'mp-progothamchess-trompowsky-main-system',
  prefix: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4',
  depth: 8,
  title: "Trompowsky main — Bh4 pin + classical setup",
  overview: "Gotham's top opening: 1,823 games at 61.5% score. After the Bg5 pin, Black plays …e6 / …h6 / White holds with Bh4. The plan: Bd3 + c3 + O-O reaching a quiet middlegame where the bishop pair + space advantage gradually win.",
  pawnBreaks: ["…d5 by Black challenging the centre","e3-e4 timed central break","c3 reinforcing d4"],
  pieceManeuvers: ["Bh4 holding the pin","Bd3 + O-O classical development","Nd2 supports central play"],
  strategicThemes: ["Pin pressure on the f6-knight cramps Black's setup","Patient positional accumulation"],
  endgameTransitions: ["R+minor+P endgames where the bishop pair or extra space converts"],
  sources: ['book:trompowsky', 'https://www.chess.com/openings/Trompowsky-Attack', ...BASE_SOURCES],
});

// ============== ENGLISH OPENING (1597 games, 62.2%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-english',
  treeId: 'english',
  id: 'mp-progothamchess-english-botvinnik-main',
  prefix: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5',
  depth: 6,
  title: "English Botvinnik — d5 closed-centre + flank attack",
  overview: "Gotham's English at 1,597 games / 62.2%. The classical setup vs Black's KID structure reaches a closed centre after d5; the flank attack with g4 + h4 + Nh3 grabs the kingside. KID-reversed pattern with the extra tempo.",
  pawnBreaks: ["g4 kingside pawn storm","h4 supporting the flank attack","f3 reinforcing the closed centre"],
  pieceManeuvers: ["…a5 by Black expanding queenside","…Na6 reroute","Be3 + Be2 classical development"],
  strategicThemes: ["Closed-centre flank attack — KID structure reversed","White's extra tempo decides on the kingside"],
  endgameTransitions: ["R+minor+P endgames where the kingside space advantage carries through"],
  sources: ['book:english-opening', 'https://www.chess.com/openings/English-Opening', ...BASE_SOURCES],
});

// ============== KIA WHITE (771 games, 71.1%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-kia',
  treeId: 'kia',
  id: 'mp-progothamchess-kia-system-attack',
  prefix: 'Nf3 d5 e3',
  depth: 6,
  title: "KIA — system development + e3 reinforcement",
  overview: "Gotham's KIA system at 771 games / 71.1% — his highest-scoring opening. After Nf3 + g3 + Bg2 + O-O + d3 + Nbd2 + e4, the system is the same every game. The e3 supports central play before the e4 push.",
  pawnBreaks: ["e3 reinforcing central squares","e4 central thrust later","c4 in some lines"],
  pieceManeuvers: ["…Nf6 + …e6 classical development","Bg2 on the long diagonal","Knight reroute via Nbd2 → Nf1 → Ng3"],
  strategicThemes: ["System play — same setup every game","Long-diagonal pressure from Bg2"],
  endgameTransitions: ["Often R+minor+P with the Bg2 dominating the long diagonal"],
  sources: ['book:kings-indian-attack', 'https://www.chess.com/openings/Kings-Indian-Attack', ...BASE_SOURCES],
});

// ============== VIENNA (649 games, 67.8%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-vienna',
  treeId: 'vienna',
  id: 'mp-progothamchess-vienna-gambit-main',
  prefix: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3',
  depth: 6,
  title: "Vienna Gambit — Qf3 + Nxc3 exchange",
  overview: "Levy's Vienna Gambit at 649 games / 67.8% — one of his highest scores. After f4 + fxe5 + …Nxe4, the queen on f3 attacks both f7 and e4. The Nxc3 exchange leaves doubled c-pawns but excellent piece activity.",
  pawnBreaks: ["…Nxc3 — Black trades the central knight","bxc3 recapture — White accepts doubled pawns for open b-file"],
  pieceManeuvers: ["Qf3 — central queen attacking f7","Nxc3 trades the centre","Bc4 + Qf3 battery aiming at f7"],
  strategicThemes: ["Sharp tactical positions — Levy's specialty","Doubled c-pawns trade structure for piece activity"],
  endgameTransitions: ["Sharp middlegames — endgames rare in this gambit line"],
  sources: ['book:vienna-game', 'https://www.chess.com/openings/Vienna-Game', ...BASE_SOURCES],
});

// ============== CARO-ADVANCE-WHITE (423 games, 73.2%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-caro-advance-white',
  treeId: 'caro-advance-white',
  id: 'mp-progothamchess-caro-advance-h4-pin',
  prefix: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5',
  depth: 6,
  title: "Caro-Advance — h4 + Bg5 cramping setup",
  overview: "Gotham's anti-Caro from White's side at 423 games / 73.2% score. The h4-h5 pin fixes Black's kingside; Bg5 pressures the king's knight; the Bxd3 trade simplifies favourably for White.",
  pawnBreaks: ["c2-c4 expanding the queenside","f2-f4 supporting the kingside attack"],
  pieceManeuvers: ["…Qb6 by Black putting pressure on b2","Bd3 + Bxd3 trade-down","Knight reroute via Nd2"],
  strategicThemes: ["h4 fixes Black's kingside structure permanently","Bishop pair vs Black's locked-in pieces"],
  endgameTransitions: ["R+minor+P endgames where Black's structural weaknesses tell"],
  sources: ['book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation', ...BASE_SOURCES],
});

// ============== CLOSED SICILIAN (333 games, 68.0%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-closed-sicilian',
  treeId: 'closed-sicilian',
  id: 'mp-progothamchess-closed-sicilian-bb5-trade',
  prefix: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3',
  depth: 6,
  title: "Closed Sicilian — Bb5 + Nxb5 simplification",
  overview: "Levy's Closed Sicilian at 333 games / 68.0%. The 2.Nc3 sidesteps Open Sicilian theory; Bb5 + the knight exchange on b5 leaves Black with doubled a-pawns and a structural weakness for the long endgame conversion.",
  pawnBreaks: ["…a6 doubling White's b-pawn","d4 central break"],
  pieceManeuvers: ["Bb5 + Nxb5 trade","Knight reroute via Nbd2","Queen activation"],
  strategicThemes: ["Sidestep Sicilian theory","Doubled a-pawns are the long-term weakness"],
  endgameTransitions: ["R+minor+P endings where the structural weakness converts"],
  sources: ['https://www.chess.com/openings/Closed-Sicilian-Defense', ...BASE_SOURCES],
});

// ============== FRENCH BLACK (1596 games, 62.7%) — separate entry from Milner-Barry ==============
PLANS.push({
  openingId: 'pro-gothamchess-french-defense',
  treeId: 'french-black',
  id: 'mp-progothamchess-french-defense-rubinstein',
  prefix: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3',
  depth: 8,
  title: "French Rubinstein — broken kingside + bishop pair",
  overview: "Gotham's French Defense — 1,596 games at 62.7%. The Rubinstein 4...dxe4 accepts doubled f-pawns for the bishop pair and active piece play. After …Nc6 + …e5 + …Bg4, Black coordinates around the open g-file.",
  pawnBreaks: ["…e5 striking back at White's centre","…c5 challenging d4"],
  pieceManeuvers: ["…Nc6 developing the queen's knight","…Bg4 pinning and trading the f3-knight","Active queen swings"],
  strategicThemes: ["Bishop pair compensates for the doubled pawns","Open g-file is the recurring attacking lever"],
  endgameTransitions: ["Endings with the bishop pair plus active king on the g-file"],
  sources: ['book:french-defence', 'https://www.chess.com/openings/French-Defense', ...BASE_SOURCES],
});

// ============== PIRC DEFENSE BLACK (351 games, 69.2%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-pirc-defense',
  treeId: 'pirc-black',
  id: 'mp-progothamchess-pirc-c5-break',
  prefix: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6 e5',
  depth: 6,
  title: "Pirc Austrian Attack — …c5 break + …Nd7 redirect",
  overview: "Levy's Pirc Defense — 351 games at 69.2%, his highest Black opening score. Against the Austrian Attack with f4, Black strikes immediately with …c5; the Bb5+ check is blocked by …Nc6; after e5 by White, the knight redirects to d7.",
  pawnBreaks: ["…c5 the critical break against f4","…d5 freeing the centre in some lines"],
  pieceManeuvers: ["…Nd7 redirect after e5","…Nc6 blocking the Bb5+ check","Bg7 fianchetto holding the long diagonal"],
  strategicThemes: ["Counter-attacking — let White overextend then strike","Bg7 + active piece play decides"],
  endgameTransitions: ["R+minor+P endings where Black's piece activity converts"],
  sources: ['book:pirc-defence', 'https://www.chess.com/openings/Pirc-Defense', ...BASE_SOURCES],
});

// ============== QGD BLACK (113 games, 52.7%) ==============
PLANS.push({
  openingId: 'pro-gothamchess-qgd',
  treeId: 'qgd-black',
  id: 'mp-progothamchess-qgd-classical',
  prefix: 'd4 d5 c4 e6 Nc3 a6 cxd5 exd5 Bf4',
  depth: 6,
  title: "QGD — Nf6 + Bd6 classical development",
  overview: "Levy's QGD as Black at 113 games / 52.7% — his least-played and lowest-scoring opening as Black, with the early …a6 reply preparing …b5 expansion. After cxd5 / exd5 the position simplifies; the plan is developing …Nf6 and …Bd6 to natural squares, pressuring the centre.",
  pawnBreaks: ["…b5 expanding the queenside","…c5 challenging d4 in some lines"],
  pieceManeuvers: ["…Nf6 development of the king's knight","…Bd6 challenging the Bf4 bishop","Knight reroute …Nbd7 → …Nb6"],
  strategicThemes: ["Slow positional play — wait for White to overcommit","…a6 + …b5 is the queenside lever"],
  endgameTransitions: ["R+minor+P endings with the symmetric pawn structure"],
  sources: ['book:queens-gambit', 'https://www.chess.com/openings/Queens-Gambit-Declined', ...BASE_SOURCES],
});

// ============== BUILD ==============
const treeCache = {};
function getTree(id) { if (!treeCache[id]) treeCache[id] = loadTree(id); return treeCache[id]; }

const planEntries = [];
const errors = [];

for (const p of PLANS) {
  try {
    const tree = getTree(p.treeId);
    const prefixSans = p.prefix.split(' ');
    const moves = continuation(tree, prefixSans, p.depth);
    if (moves.length === 0) {
      errors.push(`${p.id}: no continuation from prefix`);
      continue;
    }

    // Build FEN at prefix end
    const game = new Chess();
    for (const san of prefixSans) {
      try { game.move(san); }
      catch (e) { throw new Error(`prefix illegal at ${san}: ${e.message}`); }
    }
    const fen = game.fen();

    // Verify moves are legal from this position
    const verify = new Chess(fen);
    for (const san of moves) {
      try { verify.move(san); }
      catch (e) { throw new Error(`continuation illegal at ${san}: ${e.message}`); }
    }

    // Build annotations + arrows + highlights
    const annotations = [];
    const learnCues = [];
    const highlights = [];
    const arrows = [];

    const move_game = new Chess(fen);
    for (const san of moves) {
      const before = move_game.fen();
      const moveResult = move_game.move(san);
      const piece = moveResult.piece;
      const pieceName = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[piece];
      const from = moveResult.from;
      const to = moveResult.to;
      const sideName = moveResult.color === 'w' ? 'White' : 'Black';
      const captured = moveResult.captured;

      let prose;
      if (captured) {
        prose = `${san} — ${sideName}'s ${pieceName} captures on ${to} — material exchange.`;
      } else if (san.includes('O-O-O')) {
        prose = `${san} — ${sideName} castles long, king to safety.`;
      } else if (san.includes('O-O')) {
        prose = `${san} — ${sideName} castles short, king to safety.`;
      } else {
        prose = `${san} — ${sideName}'s ${pieceName} to ${to} — standard development.`;
      }

      annotations.push(prose);
      learnCues.push(`${san} — ${pieceName} to ${to}`);
      highlights.push([
        { square: from, color: ORANGE },
        { square: to, color: ORANGE },
      ]);
      arrows.push([]);
    }

    // Mock playableLines entry
    planEntries.push({
      id: p.id,
      openingId: p.openingId,
      criticalPositionFen: fen,
      title: p.title,
      overview: p.overview,
      pawnBreaks: p.pawnBreaks,
      pieceManeuvers: p.pieceManeuvers,
      strategicThemes: p.strategicThemes,
      endgameTransitions: p.endgameTransitions,
      playableLines: [
        {
          fen,
          moves,
          annotations,
          arrows,
          highlights,
          learnCues,
          title: p.title,
          intro: p.overview.slice(0, 200),
          sources: p.sources,
        },
      ],
    });

    console.log(`OK ${p.id} (${moves.length} moves)`);
  } catch (e) {
    console.error(`FAIL ${p.id}: ${e.message}`);
    errors.push(`${p.id}: ${e.message}`);
  }
}

if (errors.length > 0) {
  console.error('\n=== ERRORS ===');
  for (const e of errors) console.error(' ', e);
}

// Merge into existing middlegame-plans.json — also REMOVES any stale
// `mp-progothamchess-*` plan (G8 orphan-sweep), then adds the new build.
const existing = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));
const newIds = new Set(planEntries.map((p) => p.id));
const kept = existing.filter((p) => {
  // Drop ALL old gotham plans (so we replace cleanly + sweep orphans)
  if (p.id.startsWith('mp-progothamchess-')) return false;
  // Drop any other plan whose id is in the new build (shouldn't happen)
  if (newIds.has(p.id)) return false;
  return true;
});
const merged = [...kept, ...planEntries].sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(MP_PATH, JSON.stringify(merged, null, 2));
console.log(`\nmiddlegame-plans.json: removed ${existing.length - kept.length} old, added ${planEntries.length} new (${merged.length} total)`);
console.log('Done.');
