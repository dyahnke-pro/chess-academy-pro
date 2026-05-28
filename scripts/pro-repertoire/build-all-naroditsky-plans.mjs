#!/usr/bin/env node
// Build middlegame plans for the OTHER 9 Naroditsky openings (Alapin,
// Najdorf, KID, Alekhine, KIA, Rossolimo, Jobava, Ruy, Fantasy Caro).
// Each opening gets 1 main middlegame plan walked from its
// data-derived spine continuation. Annotations hand-authored per
// opening with the masterclass voice + game-count references.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const MP_PATH = 'src/data/middlegame-plans.json';
const DL = 'src/services/dataLoader.ts';

const ORANGE = 'rgba(255, 165, 0, 0.55)';

const BASE_SOURCES = [
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
  'https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR',
];

// Load all tree files
function loadTree(id) {
  return JSON.parse(fs.readFileSync(`data/sources/danielnaroditsky-trees/${id}.json`, 'utf8'));
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
    if (sorted[0][1].games < 3) break;
    out.push(sorted[0][0]);
    node = sorted[0][1];
  }
  return out;
}

const PLANS = [];

// =========== ALAPIN SICILIAN (white) ============
// Spine from his 2,752 games: e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O
PLANS.push({
  openingId: 'pro-naroditsky-alapin',
  treeId: 'alapin-sicilian',
  id: 'mp-pronaroAlapin-queenside-crawl',
  prefix: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O',
  depth: 10,
  title: "Alapin — a4-a5-a6 queenside crawl",
  overview: "Naroditsky's dominant Alapin middlegame plan from his 2,752-game corpus. After the standard exd6 en-passant + O-O, White launches the queenside crawl: a4 → a5 → a6 cramping Black's pawn structure while keeping the centre flexible. His score in this line is 74% — one of the highest of any opening he plays.",
  pawnBreaks: ["a4 → a5 → a6 queenside expansion","d4 central push when timing allows"],
  pieceManeuvers: ["Bb3 stays on the long diagonal aiming at f7","Nb1 → Nc3 if not already developed","Queen activates flexibly"],
  strategicThemes: ["Queenside cramping vs Black's natural development","Long-diagonal pressure from Bb3"],
  endgameTransitions: ["R+P endings with the queenside passer Black can't easily oppose"],
  sources: ['book:sicilian-alapin', 'https://www.chess.com/openings/Alapin-Sicilian-Defense', ...BASE_SOURCES],
});

// =========== NAJDORF (black) ============
// His 1,475 Najdorf games — English Attack spine
PLANS.push({
  openingId: 'pro-naroditsky-najdorf',
  treeId: 'najdorf',
  id: 'mp-pronaroNajdorf-opposite-castle-race',
  prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6',
  depth: 10,
  title: "Najdorf — opposite-castle race + queenside trade",
  overview: "His Najdorf English Attack middlegame from 1,475 games. The opposite-side-castling race is on. After 10…h6 forces White's bishop decision, Naroditsky's most-played continuation goes: 11.Bxf6 Bxf6 12.h4 Nb6 13.g5 Bxd4 14.Rxd4 Qc5 — Black trades the d4 knight to relieve White's central pressure while White hammers kingside with h4-g5. 65% score in his games here.",
  pawnBreaks: ["…h6 forcing White's Bg5 decision","…g5 — White's kingside pawn storm","h4 + g5 — White's attacking levers"],
  pieceManeuvers: ["Nbd7 → Nb6 — knight to the queenside","…Bxd4 trading the central knight to relieve attacking pressure","Queen swings to c5 + Bd7 development"],
  strategicThemes: ["Opposite-castled races favour whoever opens lines faster","Black trades pieces to slow White's kingside while staying solid"],
  endgameTransitions: ["Sharp middlegame finishes — endgames are rare in his Najdorf games"],
  sources: ['book:sicilian-najdorf', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', ...BASE_SOURCES],
});

// =========== KID (black) ============
// His 4,432 KID games — Classical mainline spine
PLANS.push({
  openingId: 'pro-naroditsky-kid',
  treeId: 'kid',
  id: 'mp-pronaroKID-mar-del-plata-attack',
  prefix: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4',
  depth: 8,
  title: "KID Mar del Plata — …Nf4 prize-square + …c5",
  overview: "Naroditsky's most-played KID middlegame plan from 4,432 games. The Mar del Plata mainline: after …exd4 + …Re8 + …Nh5 + …Nf4, the knight lands on the prize square attacking Be2. White typically trades with Bxf4, knight re-coordinates, and Black opens the queenside with …c5. 65% score across the whole sample.",
  pawnBreaks: ["…c5 opening the queenside after the …Nf4 exchange","…f5 expanding kingside in some lines"],
  pieceManeuvers: ["Nh5 → Nf4 prize-square outpost — provokes the exchange","Bishop pair coordination via Bg7 + Bf8","Rook to e8 for central pressure"],
  strategicThemes: ["Bg7 + kingside pawn structure dominates","Knight on f4 forces White to trade — restructures the position in Black's favour"],
  endgameTransitions: ["R+minor+P with the Bg7 as the conversion piece"],
  sources: ['book:kings-indian-defence', 'https://www.chess.com/openings/Kings-Indian-Defense', ...BASE_SOURCES],
});

// =========== ALEKHINE (black) ============
// His 2,830 Alekhine games — Modern variation spine
PLANS.push({
  openingId: 'pro-naroditsky-alekhine',
  treeId: 'alekhine',
  id: 'mp-pronaroAlekhine-modern-development',
  prefix: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7',
  depth: 10,
  title: "Alekhine Modern — Bf5 + Nd7 development",
  overview: "Naroditsky's Alekhine Modern Variation plan from 2,830 games — his highest-percentage Black opening at 68.7% score. After the trade-and-clarify on e5, Black develops with Bf5 + Nd7, finishing with …e6/Bd6/O-O to reach a healthy structure with active pieces.",
  pawnBreaks: ["…c5 challenging White's centre","…e6 supporting d5 (the Nd5 retreat target)","…f6 in some lines"],
  pieceManeuvers: ["Bf5 to its active diagonal","Nd7 develops, often heading to Nb6/Nc4","Bishop pair retained from late trades"],
  strategicThemes: ["Provoke White's pawns then undermine the centre","Active piece play vs cramped White position"],
  endgameTransitions: ["Bishop-and-knight endgames where Black's pair dominates"],
  sources: ['book:alekhine-defence', 'https://www.chess.com/openings/Alekhines-Defense', ...BASE_SOURCES],
});

// =========== KIA (white) ============
// His 18,216 KIA games — most-played opening
PLANS.push({
  openingId: 'pro-naroditsky-kia',
  treeId: 'kia',
  id: 'mp-pronaroKIA-classical-attack',
  prefix: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5 e4 Nc6 c3',
  depth: 10,
  title: "KIA — central exchange + queen activation",
  overview: "Naroditsky's most-played opening overall — 18,216 games. The system: develop Nf3 + g3 + Bg2 + O-O + d3 + Nbd2 + e4 every game. After Black challenges with …d5, the central exchange …dxe4 / dxe4 opens lines and the queens activate — Black's queen swings to c7 while White's queen lifts to e2 supporting a kingside buildup. Score: 69.7% across 18k games.",
  pawnBreaks: ["…dxe4 / dxe4 — central exchange opening the position","e4-e5 push when timing allows in later phases"],
  pieceManeuvers: ["Queen lifts via Qe2 to support the kingside","Nh4 reroute to f5 squares in some lines","Bg2 on the long diagonal stays the system anchor"],
  strategicThemes: ["System play — same setup every game means deep pattern knowledge","After …dxe4 exchange the d-file becomes the contested artery"],
  endgameTransitions: ["Often R+minor+P with the Bg2 dominating the long diagonal"],
  sources: ['book:kings-indian-attack', 'https://www.chess.com/openings/Kings-Indian-Attack', ...BASE_SOURCES],
});

// =========== ROSSOLIMO (white) ============
// His 4,151 Anti-Sicilian games — Bb5+ Moscow / Rossolimo Bb5
PLANS.push({
  openingId: 'pro-naroditsky-rossolimo',
  treeId: 'rossolimo',
  id: 'mp-pronaroRossolimo-bishop-reroute',
  prefix: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1 e6 Bf1 b6 c4 Bb7 Nc3',
  depth: 8,
  title: "Rossolimo — Bb5 → Bd3 → Bf1 bishop reroute + Maroczy bind",
  overview: "Naroditsky's Rossolimo/Moscow anti-Sicilian middlegame plan from 4,151 games. After the Bb5+ check disrupts Black's setup, the bishop reroutes via Bd3 back to Bf1, then the c4 + Nc3 setup creates a Maroczy bind structure. 66% score — outplays Sicilian specialists by avoiding their theory.",
  pawnBreaks: ["c4-c5 push if Black plays …d6 / …d5 sequences","b3 + Bb2 setup in some lines"],
  pieceManeuvers: ["Bishop reroute Bb5 → Bd3 → Bf1 (three moves)","Re1 supports e-file pressure","Nc3 finishes development"],
  strategicThemes: ["Sidestep Sicilian theory","Maroczy bind cramps Black's pieces"],
  endgameTransitions: ["R+minor+P endgames where the bind structure carries forward"],
  sources: ['https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation', ...BASE_SOURCES],
});

// =========== JOBAVA LONDON (white) ============
// His 2,170 Jobava London games
PLANS.push({
  openingId: 'pro-naroditsky-jobava-london',
  treeId: 'jobava-london',
  id: 'mp-pronaroJobava-central-queen-attack',
  prefix: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3',
  depth: 8,
  title: "Jobava London — Qxd4 + Qd3 central queen + kingside attack",
  overview: "Naroditsky's Jobava London middlegame plan from 2,170 games. After …c5/cxd4/Qxd4 the queen sits in the centre attacking d8 with tempo, then Qd3 swings to the h7-diagonal supporting an eventual e4 push. The Bf4 (not e3) aiming at c7 plus the central queen creates an aggressive setup. Score: 70.3%.",
  pawnBreaks: ["e4 opening the centre","e5 cramping Black's pieces if the centre stays closed"],
  pieceManeuvers: ["Queen on d3 aiming at h7","Bf4 attacking c7 and the long a1-h8 diagonal","Knight reroute via Nb5 in tactical lines"],
  strategicThemes: ["Bf4 placement (not e3) is the system's identity","Central queen + Bf4 create immediate threats"],
  endgameTransitions: ["R+minor+P endings where the Bf4 + central control wins"],
  sources: ['book:london-system', 'https://www.chess.com/openings/Jobava-London-System', ...BASE_SOURCES],
});

// =========== RUY LOPEZ (white) ============
// His 2,922 Ruy Lopez games — Closed Spanish mainline
PLANS.push({
  openingId: 'pro-naroditsky-ruy-lopez',
  treeId: 'ruy-lopez',
  id: 'mp-pronaroRuyLopez-d4-break',
  prefix: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d4 Nxd4 Nxd4 exd4 e5 Ne8 c3',
  depth: 8,
  title: "Ruy Lopez Closed — …c5 expansion + …d5 break",
  overview: "Naroditsky's Ruy Lopez Closed Spanish plan from 2,922 games. After the d4 break and …Nxd4/Nxd4/exd4 sequence, the most-played continuation is the Marshall-style …c5 + …cxd4 followed by White's c4 cramping, and Black's …d5 central counter. Score: 62.5% — slightly lower than other openings because the Ruy is the most-theoretical opening Black can prepare for.",
  pawnBreaks: ["…c5 expansion + …cxd4 capturing","…d5 central counter-break","White's c4 cramping push"],
  pieceManeuvers: ["Bishop on b3 reroutes to c2 via the Bb3-Bc2 manoeuvre","Knight reroute via …Nc7 to support …d5","Queen on h5 in tactical lines"],
  strategicThemes: ["Patient build then central crack","After the central trade, pawn structure decides — …c5/…d5 challenges White's bind"],
  endgameTransitions: ["R+minor+P with the slight space advantage converting"],
  sources: ['book:ruy-lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', ...BASE_SOURCES],
});

// =========== FANTASY CARO (white) ============
// His 370 Fantasy Caro games. Main line: 5...dxe4 6.fxe4 e5 (Black's
// central counter), then Naroditsky's plan is Nf3 + Bc4 + O-O + c3.
PLANS.push({
  openingId: 'pro-naroditsky-fantasy-caro',
  treeId: 'fantasy-caro',
  id: 'mp-pronaroFantasyCaro-bishop-pair-attack',
  prefix: 'e4 c6 d4 d5 f3 dxe4 fxe4',
  depth: 8,
  title: "Fantasy Caro — Bc4, c3, weather Black's …e5",
  overview: "Naroditsky's Fantasy Variation as White, from 370 games at 73.4% score (111 of those branched on 5...dxe4 at 78% score). After fxe4 recaptures, Black challenges the centre with …e5 and the plan is: Nf3 holding the d-pawn, Bc4 targeting f7, fast castling, then c3 reinforcing d4 against the central tension. The whole structure rests on the big e4+d4 centre — collapse it and Black equalises; hold it and White owns the squares.",
  pawnBreaks: ["c3 reinforcing d4 against Black's …e5","d4 stays — the central anchor"],
  pieceManeuvers: ["Bc4 targeting f7 — the Fantasy bishop's diagonal","Nf3 holds the centre and eyes e5","Fast O-O for king safety"],
  strategicThemes: ["Central tension favours the side that holds the centre","Bc4 + Nf3 coordinate against f7 and e5"],
  endgameTransitions: ["R+minor+P with the central pawn-couple as the conversion piece"],
  sources: ['https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation', ...BASE_SOURCES],
});

// =========== BUILD ============
const treeCache = {};
function getTree(id) { if (!treeCache[id]) treeCache[id] = loadTree(id); return treeCache[id]; }

const planEntries = [];
for (const p of PLANS) {
  const tree = getTree(p.treeId);
  const prefixSans = p.prefix.split(/\s+/).filter(Boolean);
  let moves;
  try {
    moves = continuation(tree, prefixSans, p.depth);
  } catch (e) {
    console.log(`SKIP ${p.id}: ${e.message}`);
    continue;
  }
  // Validate the full prefix + moves play legally
  const c = new Chess();
  try {
    for (const m of prefixSans) c.move(m);
    const fen = c.fen();
    for (const m of moves) c.move(m);
    // Build per-move annotations (data-driven — auto-generate from the moves)
    // Each annotation: "<move> — <auto-description based on the move>"
    // Auto-cues: short version
    const annotations = [];
    const cues = [];
    const cReplay = new Chess(fen);
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const mover = cReplay.turn();
      const mv = cReplay.move(m);
      const sideName = mover === (tree.color === 'white' ? 'w' : 'b') ? 'our' : "opponent's";
      const moveDesc = autoDescribe(mv, mover === 'w' ? 'White' : 'Black');
      annotations.push(`${m} — ${moveDesc}`);
      cues.push(`${m} — ${shortCue(mv, mover === 'w' ? 'White' : 'Black')}`);
    }
    const arrows = moves.map(() => []);
    const highlights = moves.map((m, i) => {
      const c2 = new Chess(fen);
      for (let j = 0; j < i; j++) c2.move(moves[j]);
      const mv = c2.move(m);
      return mv ? [{ square: mv.from, color: ORANGE }, { square: mv.to, color: ORANGE }] : [];
    });
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
      playableLines: [{
        fen,
        moves,
        annotations,
        arrows,
        highlights,
        learnCues: cues,
        title: p.title,
        intro: p.overview.slice(0, 200),
        sources: p.sources,
      }],
    });
    console.log(`OK ${p.id} (${moves.length} moves)`);
  } catch (e) {
    console.log(`FAIL ${p.id}: ${e.message}`);
  }
}

// Auto-describer for moves — keeps annotations short but data-grounded.
function autoDescribe(mv, sideName) {
  if (!mv) return 'move';
  const piece = pieceName(mv.piece);
  const action = mv.captured ? `captures on ${mv.to}` : `to ${mv.to}`;
  const flag = mv.flags || '';
  if (flag.includes('k')) return `${sideName} castles kingside, king safe.`;
  if (flag.includes('q')) return `${sideName} castles queenside, opposite-side play.`;
  if (mv.promotion) return `${sideName}'s pawn promotes to ${pieceName(mv.promotion)}.`;
  if (mv.captured) return `${sideName}'s ${piece} captures on ${mv.to} — material exchange.`;
  return `${sideName}'s ${piece} ${action} — typical play at this position.`;
}
function shortCue(mv, sideName) {
  if (!mv) return 'move';
  if ((mv.flags || '').includes('k')) return 'castle short';
  if ((mv.flags || '').includes('q')) return 'castle long';
  return `${pieceName(mv.piece)} to ${mv.to}`;
}
function pieceName(p) { return { p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king' }[p] || p; }

// Apply
const mpRaw = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));
const existing = Array.isArray(mpRaw) ? mpRaw : (mpRaw.plans || []);
const cleaned = existing.filter((p) => !p.id.startsWith('mp-pronaro') || p.id.startsWith('mp-pronarocaro-'));
const updated = [...cleaned, ...planEntries];
fs.writeFileSync(MP_PATH, JSON.stringify(updated, null, 2) + '\n');
console.log(`middlegame-plans.json: removed ${existing.length - cleaned.length} old, added ${planEntries.length} new (${updated.length} total)`);

const today = new Date().toISOString().slice(0, 10);
const dl = fs.readFileSync(DL, 'utf8');
const newDl = dl.replace(/const PRO_DATA_REVISION = '[^']+';/, `const PRO_DATA_REVISION = '${today}-naroditsky-all-plans';`);
if (newDl !== dl) fs.writeFileSync(DL, newDl);
console.log('Done.');
