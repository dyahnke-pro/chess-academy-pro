// One-off: author 8 pro-own model games with FENs computed from real PGNs.
import fs from 'fs';
import { Chess } from 'chess.js';
import { fetchChesscomGame } from './fetch-chesscom-game.mjs';

const KEY = 'rgba(255,214,0,0.88)';
const EROSEN = 'https://www.chess.com/member/imrosen';
const GOTHAM = 'https://www.chess.com/member/gothamchess';
const DANYA = 'https://www.chess.com/member/danielnaroditsky';

const SPECS = [
  {
    gameId: '168161971860', openingId: 'pro-ericrosen-london', studentSide: 'white',
    id: 'mg-pro-ericrosen-london-b2grab', event: 'Chess.com Blitz',
    sources: [EROSEN, 'concept:pos-development'],
    overview:
      "Eric Rosen with White, showing the London answer to Black's most testing try — …c5 and …Qb6 hitting b2. Rosen ignores the grab: 6.dxc5 Qxb2 7.Rb1 chases the queen, and the two tempi Black spends grabbing a pawn become a crushing lead in development. With the centre rolling forward (e4-e5) and the queen still homeless, Rosen builds a kingside attack that ends with a bishop sacrifice winning the queen outright.",
    middlegameTheme: 'The …Qb6/…Qxb2 pawn-grab refuted by rapid development and a central break.',
    lessonSummary: "Don't fear the b2-grab — Rb1, develop with tempo, and let the centre and the open b-file do the work.",
    moments: [
      { moveNumber: 7, color: 'white', sq: 'b1', concept: 'Greed Punished',
        annotation: "Rb1 — the whole point. Black's queen has to scramble back from b2, and every tempo she loses is a tempo White pours into the centre and the open b-file. The pawn meant nothing; the time means everything." },
      { moveNumber: 25, color: 'white', sq: 'f7', concept: 'The Bishop Sacrifice',
        annotation: "Bf7+ rips the king into the open. After …Kxf7 the queen check on g7 wins Black's queen on c7 — the development lead Rosen banked on move 7 finally collects." },
    ],
  },
  {
    gameId: '124562322039', openingId: 'pro-gothamchess-london', studentSide: 'white',
    id: 'mg-pro-gothamchess-london-bishoptrade', event: 'Chess.com Blitz',
    sources: [GOTHAM, 'concept:pos-bishop-pair'],
    overview:
      "Levy Rozman with the London, against the …Bf5 setup club players reach for to free their bad bishop. He doesn't allow it: Nd4 then Nxf5 trades the knight for that bishop, leaving Black with a passive piece and a weak d5-pawn. Once the pawn falls to Qxd5, it's a clean technical grind — the London's harmonious pieces converting a structural edge into a won middlegame.",
    middlegameTheme: 'Trade off the …Bf5, win the d5-pawn, convert the structural edge.',
    lessonSummary: 'Exchange the bishop that frees Black, target the central pawn, and grind — the London rewards patience over fireworks.',
    moments: [
      { moveNumber: 8, color: 'white', sq: 'f5', concept: 'Trading the Rival Bishop',
        annotation: "Nxf5 — the London move. Black developed the light bishop outside the pawn chain to escape its bad-bishop fate; White trades it off and leaves Black with the worse minor piece and a brittle centre." },
      { moveNumber: 14, color: 'white', sq: 'd5', concept: 'The d5-Pawn Falls',
        annotation: "Qxd5 collects the central pawn. With the better bishop gone and the structure cracked, Black has no compensation — from here it's pure technique." },
    ],
  },
  {
    gameId: '146201636750', openingId: 'pro-gothamchess-scandinavian', studentSide: 'black',
    id: 'mg-pro-gothamchess-scandinavian-qa5', event: 'Chess.com Blitz',
    sources: [GOTHAM, 'concept:pawn-passed'],
    overview:
      "Levy Rozman with the Black side of his Scandinavian, the …Qa5 main line. White throws the whole kitchen sink — g4, h4, h5 — at the light-squared bishop, but the …Bf5-g6 retreat weathers it and Black emerges with a sound structure. The game becomes a long technical battle that Black steers into a king-and-pawn race, and a passed pawn promotes to settle it. The lesson: the Scandinavian's solidity outlasts the attack.",
    middlegameTheme: 'Survive the kingside pawn-storm with …Bg6, then out-technique White in the endgame.',
    lessonSummary: 'The …Qa5 Scandinavian is built to absorb aggression — tuck the bishop on g6, trade down, and win the resulting endgame.',
    moments: [
      { moveNumber: 8, color: 'black', sq: 'g6', concept: 'Weathering the Storm',
        annotation: "…Bg6 — the bishop steps out of the g4-h5 pawn-storm and keeps eyeing the b1-h7 diagonal. White's flank pawns look menacing, but they're also weaknesses for later; Black's pieces stay coordinated." },
      { moveNumber: 58, color: 'black', sq: 'g1', concept: 'The Passed Pawn Queens',
        annotation: "…g1=Q. The long grind pays off — Black's passed pawn costs White the rook to stop it, and a new queen ends the game. The Scandinavian's solidity converted into a winning endgame." },
    ],
  },
  {
    gameId: '143451496330', openingId: 'pro-naroditsky-fantasy-caro', studentSide: 'white',
    id: 'mg-pro-naroditsky-fantasy-caro-f7sac', event: 'Chess.com Blitz',
    sources: [DANYA, 'concept:tac-sacrifice'],
    overview:
      "Naroditsky's Fantasy Variation in full flow — 3.f3 builds the broad e4/d4 centre, and when Black grabs space with …e5 and …exd4, Danya pounces. Ng5 and a knight sacrifice on f7 tear open the king: 9.Nxf7 Rxf7 10.Bxf7+ Kxf7 11.Qh5+ and the queen harvests the loose pieces. By move 12 White is up material with Black's king stranded in the centre, and the conversion is clinical.",
    middlegameTheme: 'The big f3-centre, then a sacrifice on f7 to exploit the exposed king.',
    lessonSummary: 'Build the centre with f3, and when Black overreaches in the open position, the f7-sacrifice is the punishment.',
    moments: [
      { moveNumber: 9, color: 'white', sq: 'f7', concept: 'The f7 Sacrifice',
        annotation: "Nxf7 — the thematic blow. Black's king has no shelter once the f7-pawn goes; the rook recapture only drags the king onto the open files where the queen waits." },
      { moveNumber: 12, color: 'white', sq: 'c5', concept: 'Material Recouped, King Exposed',
        annotation: "Qxc5 — the dust settles with White up material and Black's king marooned on g8 with no pawns in front of it. The sacrifice was an investment; this is the dividend." },
    ],
  },
  {
    gameId: '141818605004', openingId: 'pro-naroditsky-grunfeld', studentSide: 'black',
    id: 'mg-pro-naroditsky-grunfeld-d4pressure', event: 'Chess.com Blitz',
    sources: [DANYA, 'concept:pawn-passed'],
    overview:
      "Naroditsky with the Grünfeld he teaches, against the Exchange Variation's big centre. The whole point of the opening is on display: Black lets White build the e4/d4 pawn duo, then chips at it — …c5, …Bg4 pinning the f3-knight, …cxd4 — until the centre is a target, not a strength. When it cracks, Black's pieces pour into White's position, win the b- and a-pawns, and race a passed a-pawn home to promote.",
    middlegameTheme: 'Provoke the big centre, undermine it with …c5 and …Bg4, then counterattack on the queenside.',
    lessonSummary: 'The Grünfeld bargain: hand White the centre, then prove it overextended — pressure d4, win material, and queen the passer.',
    moments: [
      { moveNumber: 11, color: 'black', sq: 'g4', concept: 'Pressure on d4',
        annotation: "…Bg4 pins the knight that guards d4 — the Grünfeld's signature lever. White's proud centre is suddenly a liability, and the pawns on c3/d4 become the things Black plays against." },
      { moveNumber: 34, color: 'black', sq: 'a1', concept: 'The Counterattack Queens',
        annotation: "…a1=Q. The queenside counterplay the Grünfeld promises arrives in full — the a-pawn that survived every White attempt finally promotes, and the game is over." },
    ],
  },
  {
    gameId: '143878546808', openingId: 'pro-naroditsky-jobava-london', studentSide: 'white',
    id: 'mg-pro-naroditsky-jobava-nb5', event: 'Chess.com Blitz',
    sources: [DANYA, 'concept:pos-initiative'],
    overview:
      "Naroditsky's Jobava London — d4, Nc3 and Bf4, the aggressive cousin of the classical London. The early Nb5 jab pokes at c7 and d6 and yanks Black's pieces to awkward squares before they're developed. Danya keeps the initiative with Na4 to win the bishop pair, presses on the d-file and the light squares, and slowly squeezes a higher-rated opponent until the position collapses in a long queen ending.",
    middlegameTheme: 'The aggressive Nb5/Na4 knight tour, the bishop pair, and a long initiative on the light squares.',
    lessonSummary: 'The Jobava trades the London quiet life for an early initiative — Nb5 and Na4 keep Black off balance from move four.',
    moments: [
      { moveNumber: 4, color: 'white', sq: 'b5', concept: 'The Jobava Jab',
        annotation: "Nb5 — the move that separates the Jobava from the sleepy London. It hits c7 and d6, forces …Na6 to a rotten square, and White is already dictating before Black has a piece out." },
      { moveNumber: 12, color: 'white', sq: 'a4', concept: 'Winning the Bishop Pair',
        annotation: "Na4 chases the queen and forks the c5-point; the knight trade nets White the bishop pair and a lasting pull on the light squares. Small edges, relentlessly pressed." },
    ],
  },
  {
    gameId: '144060025627', openingId: 'pro-naroditsky-scotch', studentSide: 'white',
    id: 'mg-pro-naroditsky-scotch-be3', event: 'Chess.com Blitz',
    sources: [DANYA, 'concept:pos-development'],
    overview:
      "Naroditsky's Scotch — 3.d4 blows the centre open immediately. Against …Bc5 he plays the principled Be3, offering to trade the active bishop and straighten his development. The middlegame trades into a same-coloured endgame where White's better king and more active rook and knight grind Black down on the kingside, the g-pawn rolls to g6, and the rook delivers mate on e6. A model of converting a small opening edge.",
    middlegameTheme: 'Open the centre, neutralise …Bc5 with Be3, and convert a development edge into a winning endgame.',
    lessonSummary: 'The Scotch opens the game on move three — trade into a better endgame and let activity do the rest.',
    moments: [
      { moveNumber: 6, color: 'white', sq: 'e3', concept: 'Be3 Challenges the Bishop',
        annotation: "Be3 — offering to trade Black's active …Bc5. White is happy to swap the dark-squared bishops: it leaves him a touch better developed with the half-open position favouring his pieces." },
      { moveNumber: 47, color: 'white', sq: 'e6', concept: 'Rook Delivers Mate',
        annotation: "Re6 is mate. The endgame edge — better king, more active rook, the g6-pawn cramping Black — funnels into a mating net. The Scotch's small opening plus, banked all the way to checkmate." },
    ],
  },
  {
    gameId: '142771511888', openingId: 'pro-naroditsky-vienna', studentSide: 'white',
    id: 'mg-pro-naroditsky-vienna-gambit', event: 'Chess.com Blitz',
    sources: [DANYA, 'concept:att-kingside-storm'],
    overview:
      "Naroditsky's Vienna Gambit. After 3.f4 Black takes on f4, and 5.e5 punches a pawn into Black's face, gaining space and kicking the f6-knight to the rim. White castles into a powerful centre, throws in e6 to crack the kingside, and Qxh5+ collects the offside knight. With a clean extra piece and the safer king, Danya converts against a strong opponent.",
    middlegameTheme: 'The Vienna Gambit space grab with e5, then e6 and Qxh5+ to exploit the loose kingside.',
    lessonSummary: 'The Vienna Gambit trades a pawn for a roaring initiative — e5 and e6 pry open Black before he can develop.',
    moments: [
      { moveNumber: 5, color: 'white', sq: 'e5', concept: 'The Space Punch',
        annotation: "e5 — the gambit's energy. The pawn shoves the f6-knight to h5 on the rim and seizes the centre; Black is already cramped and his best piece is parked uselessly on the edge." },
      { moveNumber: 13, color: 'white', sq: 'h5', concept: 'The Attack Lands',
        annotation: "Qxh5+ — the e6 break did its job, the kingside is open, and the queen scoops the stranded h5-knight with check. A clean piece up with the safer king; the gambit pawn was a bargain." },
    ],
  },
];

async function main() {
  const path = './src/data/model-games.json';
  const games = JSON.parse(fs.readFileSync(path, 'utf8'));
  const byId = new Map(games.map((g) => [g.id, g]));

  for (const spec of SPECS) {
    const fetched = await fetchChesscomGame(spec.gameId);
    // Build (moveNumber:color) -> {fen, san} replay map.
    const chess = new Chess();
    let moveNo = 1;
    const fenAt = new Map();
    for (const san of fetched.sans) {
      const turn = chess.turn();
      chess.move(san);
      const color = turn === 'w' ? 'white' : 'black';
      fenAt.set(`${moveNo}:${color}`, chess.fen());
      if (turn === 'b') moveNo += 1;
    }

    const criticalMoments = spec.moments.map((m) => {
      const fen = fenAt.get(`${m.moveNumber}:${m.color}`);
      if (!fen) throw new Error(`${spec.id}: no move at ${m.moveNumber}:${m.color}`);
      return {
        moveNumber: m.moveNumber, color: m.color, fen,
        annotation: m.annotation, concept: m.concept,
        highlights: [{ square: m.sq, color: KEY }],
      };
    });

    const game = {
      id: spec.id, openingId: spec.openingId,
      white: fetched.white, black: fetched.black,
      whiteElo: fetched.whiteElo, blackElo: fetched.blackElo,
      result: fetched.result, year: fetched.year, event: spec.event,
      studentSide: spec.studentSide,
      pgn: fetched.pgn, sources: spec.sources,
      overview: spec.overview, middlegameTheme: spec.middlegameTheme,
      lessonSummary: spec.lessonSummary, criticalMoments,
    };
    byId.set(spec.id, game);
    console.log(`authored ${spec.id} (${fetched.plies}p, ${fetched.result})`);
  }

  fs.writeFileSync(path, JSON.stringify([...byId.values()], null, 2) + '\n');
  console.log('wrote', path);
}
main().catch((e) => { console.error(e); process.exit(1); });
