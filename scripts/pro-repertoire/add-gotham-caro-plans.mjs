#!/usr/bin/env node
// GothamChess Caro (pro-gothamchess-caro-kann) — middlegame + endgame plans.
// Middlegame plans: anchored at each variation's data-derived position, the
//   playable line PLAYS his most-played cluster continuation (the real plan).
// Endgame plans (id …-endgame): anchored at a REAL Gotham-win final structure
//   (extract: tmp-endgame-anchors-caro.mjs), the line walks his conversion.
// Every move chess.js-validated. The theme gate needs a STUDENT (Black) move
// to land on a declared goal square — self-checked here before writing.
//
// Student = Black. Stats from caro-kann-NOTES.md (1,944-game corpus, 63.2%).
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-caro-kann';
const SRC = [
  'book:caro-kann',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://www.chess.com/member/gothamchess',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

// Each plan: anchor FEN (Black to move unless noted), his continuation, full
// Watch annotations, ≤8-word learn cues, and declared themes whose squares the
// line actually visits.
const PLANS = [
  {
    id: 'mp-progothamchess-caro-exchange-fianchetto',
    title: 'Caro Exchange: the …g6 Fianchetto Wall',
    overview:
      "His most-played answer to the Exchange across 248 games. Instead of the old …Nf6/…Bf5 setup he throws the bishop to g6, planting it on the long diagonal where it stares straight through d4 and rakes the queenside. The knight takes the quiet h6-f5 route so the f-pawn never blocks the bishop. It's a rock-solid wall with no weaknesses — exactly the Caro promise.",
    pawnBreaks: ['…e5 once the pieces are home, hitting the d4-pawn'],
    pieceManeuvers: ['…g6 and …Bf8-g7 fianchetto onto the long diagonal', '…Ng8-h6-f5 reroute keeping the f-pawn free'],
    strategicThemes: ['Fianchetto the dark bishop on the long diagonal', 'Route the knight h6-f5, never blocking the f-pawn', 'A wall with no weaknesses'],
    endgameTransitions: ['The healthy structure outlasts White in the rook ending'],
    anchor: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3',
    cont: ['g6', 'Nf3', 'Nh6', 'O-O', 'Bg7', 'Re1', 'O-O'],
    ann: [
      '…g6 starts the fianchetto — the bishop is heading for g7 and the long diagonal, the best home it ever gets in the Exchange.',
      'Nf3 develops toward the centre.',
      "…Nh6 is the clever route. The knight goes the quiet way to f5; it refuses to sit on f6 where it would block nothing useful and instead keeps the f-pawn free.",
      'White castles.',
      '…Bg7 completes the wall. From g7 the bishop sees all the way to b2, and the whole structure has not a single weakness for White to bite on.',
      'Re1 centralises the rook.',
      '…O-O and Black is fully developed, harmonious, and the …e5 central break is there whenever it suits.',
    ],
    cues: ['g6 — start the fianchetto', 'Nf3 — White develops', 'Nh6 — quiet route to f5', 'White castles', 'Bg7 — the wall is set', 'Re1 — White centralises', 'O-O — fully coordinated'],
  },
  {
    id: 'mp-progothamchess-caro-classical-bd6',
    title: 'Caro Classical: the …Bd6 Setup',
    overview:
      "In the Classical 3.Nc3 dxe4 4.Nxe4 he reaches a doubled-f-pawn structure and develops the dark bishop to d6 in 31% of his games — the dominant plan. The bishop eyes h2, the king tucks away kingside, and the doubled f-pawns turn into a sturdy wall that controls e5 and opens the g-file for an attack of his own.",
    pawnBreaks: ['…f5 expanding on the kingside with the extra f-pawn'],
    pieceManeuvers: ['…Bf8-d6 aiming at the h2-square', '…Rf8-e8 onto the half-open e-file'],
    strategicThemes: ['Develop the bishop to d6 toward h2', 'The doubled f-pawns are a wall, not a weakness', 'Castle and use the half-open files'],
    endgameTransitions: ['The extra central f-pawn supports a healthy ending'],
    anchor: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3',
    cont: ['Bd6', 'Bd3', 'O-O', 'Qc2', 'Re8+', 'Ne2', 'h5'],
    ann: [
      "…Bd6 is his choice in nearly a third of these — the bishop takes dead aim at h2 and the kingside.",
      'Bd3 mirrors, contesting the b1-h7 diagonal.',
      '…O-O tucks the king safely away behind the f-pawn wall.',
      'Qc2 adds to the battery on h7.',
      '…Re8+ slots the rook onto the half-open e-file with check, gaining a tempo to seize the file.',
      'Ne2 blocks.',
      "…h5 grabs kingside space — the doubled f-pawns freed this pawn to advance, and the structure that looked ugly is now a launching pad.",
    ],
    cues: ['Bd6 — aim at h2', 'Bd3 — White mirrors', 'O-O — king to safety', 'Qc2 — battery on h7', 'Re8+ — seize the e-file', 'Ne2 — White blocks', 'h5 — grab kingside space'],
  },
  {
    id: 'mp-progothamchess-caro-fantasy-bd6',
    title: 'Caro vs Fantasy: …Bg4 and …Bd6 Free Development',
    overview:
      "Against the Fantasy 3.f3 — White's attempt at a big centre — he grabs the bishop on g4 BEFORE White blunts it, then develops naturally with …Nd7 and …Bd6. His plan in 24% of these games. White has weakened the king with f3, so Black just develops cleanly and lets that weakness tell. 'Wild positions,' as Levy says, where the simplest sound play wins.",
    pawnBreaks: ['…e5 striking the d4-centre once developed'],
    pieceManeuvers: ['…Bc8-g4 pinning before f3-structure blunts it', '…Bf8-d6 developing toward the weakened kingside'],
    strategicThemes: ['Trade or post the light bishop on g4 early', 'Develop fast — f3 weakened White, not Black', 'Castle and exploit the loosened white king'],
    endgameTransitions: ['White’s f3-weakened structure tells in the ending'],
    anchor: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4',
    cont: ['Nd7', 'O-O', 'Ngf6', 'c3', 'Bd6'],
    ann: [
      '…Nd7 develops and supports the e5-pawn that already cramps White’s centre.',
      'White castles into a position where his own f3-push has loosened the kingside.',
      '…Ngf6 brings the last minor piece out, hitting the e4-pawn.',
      'c3 props up d4.',
      '…Bd6 finishes development beautifully — every Black piece is out, the king will castle next, and White is the one with the weakened structure. Clean, sound, winning chess.',
    ],
    cues: ['Nd7 — support e5', 'White castles', 'Ngf6 — hit e4', 'c3 — White props d4', 'Bd6 — development done'],
  },
  {
    id: 'mp-progothamchess-caro-advance-c5',
    title: 'Caro Advance: the …c5 Botvinnik-Carls Break',
    overview:
      "His sharp answer to the Advance — instead of the slow …Bf5 he hits the centre at once with …c5, the Botvinnik-Carls. White grabs the pawn on c5, Black recaptures with the bishop developing with tempo, and a fight breaks out where Black's lead in piece activity outweighs the pawn structure. 124 games at a healthy score.",
    pawnBreaks: ['…c5 striking the d4-e5 chain at its base'],
    pieceManeuvers: ['…Bf8xc5 recapturing with tempo', '…Ng8-e7-f5/g6 developing the kingside knight'],
    strategicThemes: ['Hit the chain at the base with …c5', 'Recapture developing with tempo', 'Trade structure for piece activity'],
    endgameTransitions: ['Active pieces convert before the pawn count matters'],
    anchor: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6 b4',
    cont: ['Bb6', 'Bd3', 'Nge7', 'O-O', 'Ng6'],
    ann: [
      '…Bb6 retreats the bishop to its best diagonal, still raking toward White’s kingside and f2.',
      'Bd3 develops toward h7.',
      '…Nge7 develops the kingside knight on the flexible route — it’s heading for f5 or g6, not the passive f6.',
      'White castles.',
      '…Ng6 completes the idea, eyeing the f4- and h4-squares and pressuring the e5-spearhead. Black’s pieces are humming while White still has to untangle.',
    ],
    cues: ['Bb6 — best diagonal', 'Bd3 — White aims h7', 'Nge7 — flexible route', 'White castles', 'Ng6 — pressure e5'],
  },
  {
    id: 'mp-progothamchess-caro-two-knights',
    title: 'Caro vs Two Knights/Réti: …Bg4 Trade and …g6',
    overview:
      "Against 2.Nc3 and 2.Nf3 (which transpose), his 602-game plan is …a6 and …Bg4, trading the light bishop on f3 to saddle White with doubled pawns, then fianchettoing with …g6 for a Modern-style setup. The bishop trade is the point: White's structure cracks while Black's stays whole.",
    pawnBreaks: ['…c5 breaking once the bishop is fianchettoed'],
    pieceManeuvers: ['…Bc8-g4xf3 doubling White’s pawns', '…g6 and …Bf8-g7 long-diagonal fianchetto'],
    strategicThemes: ['Trade the light bishop on f3 for doubled pawns', 'Fianchetto for the Modern structure', 'Whole structure vs White’s damaged one'],
    endgameTransitions: ['White’s doubled f-pawns are a long-term endgame target'],
    anchor: 'e4 c6 Nc3 d5 Nf3 a6 d4 Bg4 h3 Bxf3 Qxf3 e6 Bd3 Nf6 e5 Nfd7 Ne2 c5 c3 Nc6 O-O',
    cont: ['g6', 'Bf4', 'Bg7', 'dxc5', 'Nxc5'],
    ann: [
      '…g6 begins the fianchetto — with the light bishop already traded for White’s knight, the dark bishop claims the long diagonal.',
      'Bf4 develops and eyes the queenside.',
      '…Bg7 completes the Modern wall, the bishop biting on the e5-pawn and the long diagonal.',
      'dxc5 grabs the pawn, conceding the centre.',
      "…Nxc5 recaptures with tempo, the knight landing on an active square. Black’s pieces are humming, White is still saddled with the doubled f-pawns from the early …Bxf3, and the long game favours the healthier structure.",
    ],
    cues: ['g6 — fianchetto', 'Bf4 — White develops', 'Bg7 — Modern wall', 'dxc5 — White grabs a pawn', 'Nxc5 — recapture active'],
  },
  {
    id: 'mp-progothamchess-caro-panov',
    title: 'Caro Panov: the …g6 Fianchetto vs the Isolani',
    overview:
      "Against the Panov's c4 — which hands White an isolated d-pawn — his 74-game plan is the fianchetto defence. The bishop goes to g7 to stare down the long diagonal straight at d4, the isolani's blockading square, while the …Nb6-Na5 manoeuvre hunts down White's most active piece, the light-squared bishop on b3. Trade that bishop, blockade the isolani, keep the bishop pair — practically Black scores very well.",
    pawnBreaks: ['…e6 chipping at the d5-isolani once blockaded'],
    pieceManeuvers: ['…Nb6-a5xb3 eliminating White’s active bishop', '…Bg7 raking the long diagonal at d4', '…Nc6-a5 to the b3-trade'],
    strategicThemes: ['Fianchetto to pressure the isolated d-pawn', 'Trade off White’s active light bishop', 'Keep the bishop pair against the isolani'],
    endgameTransitions: ['The bishop pair vs the isolani tells in simplification'],
    anchor: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 g6 cxd5 Nxd5 Bc4 Nb6 Bb3 Bg7 Nf3 O-O O-O',
    cont: ['Nc6', 'd5', 'Na5', 'Re1', 'Nxb3', 'axb3'],
    ann: [
      '…Nc6 develops the knight and adds a second attacker to the d4-pawn, the head of White’s isolated-pawn structure.',
      'd5 pushes the isolani forward to gain space and challenge the c6-knight.',
      '…Na5 begins the key manoeuvre — the knight heads for b3, hunting White’s most active piece, the light-squared bishop.',
      'Re1 centralises.',
      '…Nxb3 strikes: Black eliminates the strong b3-bishop, the one piece that gave White’s isolani-position its bite.',
      'axb3 recaptures, and Black is left with the bishop pair against an isolated, blockaded d-pawn — exactly the structure he hunts in the Panov.',
    ],
    cues: ['Nc6 — pressure d4', 'd5 — isolani advances', 'Na5 — hunt the bishop', 'Re1 — White centralises', 'Nxb3 — trade the active bishop', 'axb3 — bishop pair vs isolani'],
  },
  // ── Endgame plans (id …-endgame) ─────────────────────────────────────────
  {
    id: 'mp-progothamchess-caro-panov-endgame',
    title: 'Caro Panov Endgame: R+B Conversion vs Bortnyk (2780)',
    overview:
      "How the Panov fianchetto cashes in. From his win over GM Mykola Bortnyk (2780), Black reaches a rook-and-bishop ending where the bishop dominates the long diagonal — exactly the piece the …g6/…Bg7 fianchetto put there to pressure the isolani. He centralises the rook, wins White's loose pawns, and the bishop's reach decides. The opening's plan becomes the endgame's engine.",
    pawnBreaks: ['…f4-f3 the passed pawn that the active bishop shepherds'],
    pieceManeuvers: ['…Rook to the d- and c-files invading the back rank', '…light bishop dominating the a8-h1 diagonal to d5/f3'],
    strategicThemes: ['The fianchetto bishop dominates the ending', 'Invade with the rook on the open files', 'Bishop pair vs the isolani converts'],
    endgameTransitions: ['R+B vs R+B where the better bishop wins'],
    anchor: null,
    anchorFen: 'r7/1p3k1p/8/4B3/2b2pPP/4pP1B/1P1bK3/7R w - - 0 32',
    cont: ['Kd1', 'Rd8', 'Kc2', 'Rc8', 'Bxf4', 'Bd5+', 'Kd3', 'Bxf3'],
    ann: [
      'Kd1 — White’s king shuffles, trying to stay near the passed e-pawn.',
      '…Rd8 swings the rook to the open d-file, the first invasion route.',
      'Kc2 sidesteps.',
      '…Rc8+ chases the king and seizes the c-file with tempo.',
      'Bxf4 grabs a pawn but opens the diagonal.',
      '…Bd5+ — there it is: the light bishop spears down the long diagonal with check, the very diagonal the …g6 fianchetto fought for.',
      'Kd3 blocks.',
      '…Bxf3 collects another pawn; the bishop’s reach has decided the ending. This is what the Caro structure was always promising.',
    ],
    cues: ['Kd1 — White shuffles', 'Rd8 — open d-file', 'Kc2 — White sidesteps', 'Rc8+ — seize c-file', 'Bxf4 — White grabs a pawn', 'Bd5+ — the long diagonal!', 'Kd3 — White blocks', 'Bxf3 — bishop decides'],
  },
  {
    id: 'mp-progothamchess-caro-fantasy-endgame',
    title: 'Caro vs Fantasy Endgame: Q+P Squeeze vs Riley (2887)',
    overview:
      "From his win over Riley (2887). The Fantasy's loosened white king follows White all the way into a queen-and-pawn ending. With an extra knight's worth of coordination and a queenside pawn majority, Black manoeuvres the knight to dominate, pushes the b-pawn, and the queen escorts it home. Proof that the f3-weakness is a long-term scar, not a passing one.",
    pawnBreaks: ['…b5-b6 the passed queenside pawn marching home'],
    pieceManeuvers: ['…Nb5-d4-e2-f4-d3 the knight dance dominating White’s king', '…queen escorting the passer'],
    strategicThemes: ['Convert the queenside majority', 'Use the knight to dominate in the Q-ending', 'The f3-scar tells to the very end'],
    endgameTransitions: ['Q+P ending with a passed b-pawn'],
    anchor: null,
    anchorFen: '8/7p/5k2/1n6/1P6/7P/P2K3P/2q5 w - - 0 54',
    cont: ['Kxc1', 'Nd4', 'a3', 'Ne2+', 'Kd1', 'Nf4', 'b5', 'Nd3'],
    ann: [
      'Kxc1 — White must take the queen, entering a king-and-knight race a pawn down.',
      '…Nd4 centralises the knight on its dream square, dominating the white king.',
      'a3 tries to advance.',
      '…Ne2+ jumps in with check, dragging the king back a rank.',
      'Kd1 retreats.',
      '…Nf4 keeps the king pinned to the back while eyeing the kingside pawns.',
      'b5 — the passer starts its march, escorted by the knight.',
      '…Nd3 seals it: the knight blockades and supports, the b-pawn is unstoppable. The Fantasy king never recovered from f3.',
    ],
    cues: ['Kxc1 — White takes the queen', 'Nd4 — dream square', 'a3 — White advances', 'Ne2+ — jump in with check', 'Kd1 — White retreats', 'Nf4 — king stays pinned', 'b5 — the passer marches', 'Nd3 — blockade and win'],
  },
  {
    id: 'mp-progothamchess-caro-d3-endgame',
    title: 'Caro vs d3 Endgame: Q+P Technique vs IMRosen (2688)',
    overview:
      "From his win over IM Eric Rosen (2688). The quiet d3 sideline drifts into a queen-and-pawn ending where Black is the one with the active queen and the extra pawn. He trades the rooks off into a winning queen ending, centralises, and the connected kingside passers plus the active queen finish it. Even White's quietest try meets a clean technical conversion.",
    pawnBreaks: ['…g5-g4 the kingside passers rolling forward'],
    pieceManeuvers: ['…Rd5xd1 trading into the won queen ending', '…Qd5 centralising the queen'],
    strategicThemes: ['Trade rooks into a winning Q-ending', 'Centralise the queen', 'Push the connected passers'],
    endgameTransitions: ['Q+P ending, extra pawn, active queen'],
    anchor: null,
    anchorFen: '4k3/8/1p2p2q/3rP1pP/5p2/8/5PP1/4R1K1 w - - 0 45',
    cont: ['Ra1', 'Qxh5', 'Ra8+', 'Kf7', 'Ra7+', 'Kg6', 'Ra1', 'Rd1+', 'Rxd1', 'Qxd1+'],
    ann: [
      'Ra1 — White’s rook leaves the file, conceding the h5-pawn.',
      '…Qxh5 wins the pawn and connects Black’s kingside majority.',
      'Ra8+ checks.',
      '…Kf7 walks up calmly — the king is a fighting piece in the queen ending.',
      'Ra7+ keeps checking.',
      '…Kg6 and the checks run out; the king has marched to safety beside its pawns.',
      'Ra1 returns.',
      '…Rd1+ offers the rook trade that simplifies straight into the won queen ending.',
      'Rxd1 must oblige.',
      '…Qxd1+ recaptures with check — queen-and-pawns up, active queen, connected passers. Textbook technique against the quiet line.',
    ],
    cues: ['Ra1 — White concedes h5', 'Qxh5 — win and connect', 'Ra8+ — White checks', 'Kf7 — king walks up', 'Ra7+ — more checks', 'Kg6 — king safe', 'Ra1 — White returns', 'Rd1+ — offer the trade', 'Rxd1 — White obliges', 'Qxd1+ — won Q-ending'],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf8'));
const existing = new Set(data.map((p) => p.id));
let failed = 0;
const added = [];

for (const p of PLANS) {
  // Build the anchor FEN: either replay the SAN setup, or use a literal FEN.
  let critFen;
  if (p.anchorFen) {
    critFen = p.anchorFen;
    try { new Chess(critFen); } catch { console.error(`BAD anchorFen ${p.id}`); failed++; continue; }
  } else {
    const c = new Chess();
    let ok = true;
    for (const san of p.anchor.trim().split(/\s+/)) {
      try { c.move(san); } catch { console.error(`ANCHOR ILLEGAL ${p.id}: ${san}`); ok = false; break; }
    }
    if (!ok) { failed++; continue; }
    critFen = c.fen();
  }

  // Validate continuation legality + capture per-move to/color for goal check.
  const probe = new Chess(critFen);
  const moveInfo = [];
  let ok = true;
  for (const san of p.cont) {
    let mv;
    try { mv = probe.move(san); } catch { console.error(`CONT ILLEGAL ${p.id}: ${san} @ ${probe.fen()}`); ok = false; break; }
    moveInfo.push({ to: mv.to, color: mv.color });
  }
  if (!ok) { failed++; continue; }
  if (p.cont.length !== p.ann.length || p.cont.length !== p.cues.length) {
    console.error(`LENGTH mismatch ${p.id}: cont=${p.cont.length} ann=${p.ann.length} cues=${p.cues.length}`); failed++; continue;
  }

  // THEME-GATE self-check: a Black move must land on a declared goal square.
  const SQ = /([a-h][1-8])/g;
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small)\b/i;
  const goals = new Set();
  for (const pb of p.pawnBreaks) if (!COND.test(pb)) (pb.match(SQ) || []).forEach((q) => goals.add(q));
  for (const pm of p.pieceManeuvers) (pm.match(SQ) || []).forEach((q) => goals.add(q));
  const demo = moveInfo.some((mi) => mi.color === 'b' && goals.has(mi.to));
  if (!demo) {
    console.error(`THEME-EMPTY ${p.id}: no Black move lands on a goal square {${[...goals].join(',')}}; black tos=${moveInfo.filter((m) => m.color === 'b').map((m) => m.to).join(',')}`);
    failed++; continue;
  }
  // PROMISE-ending self-check.
  const PROMISE = /\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
  if (PROMISE.test(p.ann[p.ann.length - 1])) { console.error(`PROMISE-ENDING ${p.id}`); failed++; continue; }

  if (existing.has(p.id)) { console.log(`skip existing ${p.id}`); continue; }

  added.push({
    id: p.id,
    openingId: OPENING_ID,
    criticalPositionFen: critFen,
    title: p.title,
    overview: p.overview,
    pawnBreaks: p.pawnBreaks,
    pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes,
    endgameTransitions: p.endgameTransitions,
    playableLines: [
      {
        fen: critFen,
        moves: p.cont,
        annotations: p.ann,
        arrows: p.cont.map(() => []),
        highlights: moveInfo.map((mi) => [{ square: mi.to, color: ORANGE }]),
        learnCues: p.cues,
        title: p.title,
        intro: p.overview,
        sources: SRC,
      },
    ],
  });
}

if (failed > 0) { console.error(`\n${failed} plan(s) failed validation — NOT writing.`); process.exit(1); }

data.push(...added);
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`\nadded ${added.length} pro-Caro plans (${added.filter((p) => p.id.endsWith('-endgame')).length} endgame). total now ${data.length}.`);
