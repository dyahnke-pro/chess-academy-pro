#!/usr/bin/env node
// Add missing pro-rep entries for GothamChess's most-played openings
// that don't have entries yet: Trompowsky (1823 games), English (1597),
// Vienna (649), Caro-Advance-White (423), Closed Sicilian (333), Pirc
// (351), French-as-Black (1596), KIA (771). Per G9.2 STEP 10: each entry
// gets data-derived pgn, hand-authored overview/keyIdeas/variations.

import fs from 'node:fs';

const PRO_PATH = 'src/data/pro-repertoires.json';

const BASE_SOURCES_WHITE = ['concept:pos-development', 'concept:pos-center'];
const BASE_SOURCES_BLACK = ['concept:pos-development', 'concept:pos-center'];
const CHESSCOM_ARCHIVE = 'https://api.chess.com/pub/player/gothamchess/games/archives';

const NEW_ENTRIES = [
  {
    id: 'pro-gothamchess-trompowsky',
    playerId: 'gothamchess',
    eco: 'A45',
    name: 'Trompowsky Attack (GothamChess)',
    pgn: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O',
    color: 'white',
    style: 'Aggressive, Pinning',
    overview: "Gotham's TOP opening — 1,823 games at 61.5% score, more than any other system he plays. The Trompowsky attack with 2.Bg5 pins Black's f6-knight immediately, asking Black to commit to a defence before learning where the rest of White's pieces are going. This is Levy's content engine: every Trompowsky tactical melee, every 'why this opening is GENIUS' video, every speedrun grind happens here. The trade-off: Black has many equalising paths if they know them; the strength is depth in middlegame play that Black usually doesn't have. At amateur level, this means 60%+ win rates by knowing one extra plan in the structures it produces.",
    keyIdeas: [
      "Bg5 pins the f6-knight and asks Black to commit FIRST. The whole opening's identity rests on this pin and the threat to double Black's pawns.",
      "Bh4 holds the pin against …h6. Don't retreat to f4 if you can avoid it — the dark-squared bishop on h4 has more attacking potential than on e3 + f4.",
      "Nd2 develops without blocking the c1-h6 diagonal. The c3-d4-e3 pawn pyramid gets built later; piece play comes first.",
      "e3-e4 is the late-middlegame trick. After everyone's developed and Black thinks they're solid, the e4 push opens the position with all White's pieces aimed at the kingside.",
    ],
    traps: [
      "If Black plays an early …Ne4 (Vaganian-style attack on the bishop), retreat Bh4 — the knight on e4 has no real support and gets chased away with h4 + Nd2-Nxe4.",
    ],
    warnings: [
      "Don't trade your Bg5 bishop too early. The whole point of the Trompowsky is keeping that bishop active against the f6-knight — trading it makes the …e6 / …d5 structure pleasant for Black.",
      "After …Ne4, don't play Bf4 letting Black trade the bishop on e3 — it concedes the bishop pair and Black's better.",
    ],
    variations: [
      {
        name: 'Main line vs …e6',
        pgn: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O',
        explanation: "Gotham's #1 most-played Trompowsky line — 1,823 games of his career. After …e6 the position becomes a quiet manoeuvring game where White's bishop pair plus space advantage gradually wins. The bishop on h4 holds the diagonal; the d4-e3-c3 pyramid covers all central squares; piece play decides.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Trompowsky-Attack', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Vaganian Attack (…Ne4)',
        pgn: 'd4 Nf6 Bg5 Ne4 h4 c5 d5 Qb6 Nd2 Nxg5 hxg5',
        explanation: "Black's sharpest reply — the Vaganian Attack chases the bishop with …Ne4 to capture and trade. The h4 reply opens the h-file for the rook; the d5 push grabs space; even after the exchange on g5 the doubled g-pawn is a kingside attacking weapon. Sharp positions favouring the side with the initiative — Levy's territory.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Trompowsky-Attack-Vaganian-Gambit', CHESSCOM_ARCHIVE],
      },
      {
        name: '…d5 system',
        pgn: 'd4 Nf6 Bg5 d5 e3 c5 c3 Nc6 Nd2 Qb6 Qb3',
        explanation: "Black's solid …d5 + …c5 reply forming a Slav-like structure. The Qb3 swing meets Black's …Qb6 pin attempt, often offering a queen trade that simplifies into a slight White edge. Patient positional play favouring whoever knows the typical pawn structure.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Trompowsky-Attack', CHESSCOM_ARCHIVE],
      },
      {
        name: '…g6 fianchetto',
        pgn: 'd4 Nf6 Bg5 g6 Bxf6 exf6 e3 Bg7 g3 O-O Bg2',
        explanation: "When Black fianchettoes with …g6, White trades on f6 doubling Black's pawns. The …gxf6 recapture is more common than …exf6 because it keeps the Bg7 on the long diagonal. White's plan is g3 + Bg2 mirroring Black's fianchetto and gradually outplaying in a quiet middlegame.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Trompowsky-Attack', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Trompowsky-Attack', CHESSCOM_ARCHIVE],
  },
  {
    id: 'pro-gothamchess-english',
    playerId: 'gothamchess',
    eco: 'A20',
    name: 'English Opening (GothamChess)',
    pgn: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4 Na6',
    color: 'white',
    style: 'Flexible, Strategic',
    overview: "Gotham's #2 most-played opening — 1,597 games at 62.2% score. The English (1.c4) is the flexible flank opening that transposes into almost any opening White wants: Botvinnik System, Karpov-style positional play, or a King's Indian reversed. Against Black's …Nf6/…g6 setup, Levy plays the classical setup with Nc3 + e4 + d4 reaching a KID-with-an-extra-tempo structure. The plan: g4-g5 kingside expansion while Black is cramped on the queenside.",
    keyIdeas: [
      "1.c4 is the ultimate move-order tool. You can transpose into the Queen's Gambit, the English, the Reti, or stay in pure English structures — pick based on what Black commits to.",
      "Against …Nf6/…g6, set up the classical attack: Nc3 + e4 + d4 + Be2/Be3 reaching a KID-reversed structure with the extra tempo for the kingside attack.",
      "g4 + h4 is the recurring weapon. With Black's pieces tied to the queenside (…a5, …Na6), White's flank attack arrives faster than Black's counterplay.",
      "Closed-centre flank attack — the same idea as the KID just with colors reversed. You're playing for the kingside crush; Black needs to break in the centre fast or get steamrolled.",
    ],
    traps: [
      "If Black plays …e5 too early without preparation, White's d4 + d5 push gains massive space and the e5-pawn becomes a weakness, often winning the pawn outright in tactical lines.",
    ],
    warnings: [
      "Don't commit Bg2 unless you're going symmetric. Against Black's KID setup, the Be2 (classical) is more aggressive — Bg2 just lets Black trade bishops.",
      "Don't play g4 before O-O. Castling first preserves king safety; the g4 push is a luxury you only play when your own king is tucked away.",
    ],
    variations: [
      {
        name: 'Botvinnik System vs KID-setup',
        pgn: 'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Be2 O-O Be3 e5 d5 a5 g4 Na6',
        explanation: "Gotham's main English line — 1,597 games at 62.2%. After Nc3 + e4 + d4 + Be2 + Be3, Black's …e5 closes the centre and White's g4 begins the kingside attack. Black's …Na6 develops the queen's knight to a square where it eyes b4 and c5, but is far from the kingside where the action will be.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/English-Opening', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Symmetric (…e5)',
        pgn: 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 Bxc3 Qxc3',
        explanation: "Black's mirror reply with …e5 produces a true English-Reversed structure. After …Bb4 / Qc2 / …Bxc3 / Qxc3, White has the bishop pair and a tempo from the English structure, often pressuring c-file weaknesses.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/English-Opening', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Anti-French (…e6)',
        pgn: 'c4 e6 Nc3 d5 e3 Nf6 Nf3 Be7 b3',
        explanation: "When Black plays …e6 + …d5, the English transposes into a Queen's Indian-style middlegame. White's b3 + Bb2 fianchetto + Nf3 gives a long-term pressure setup against Black's …d5 pawn.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/English-Opening', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Symmetric (…c5)',
        pgn: 'c4 c5 Nc3 Nc6 Nf3 g6',
        explanation: "Symmetric English with both sides playing c-pawns. Levy's score here is 66.5% — high because the symmetric structure favours White's tempo. Plans depend on Black's setup; flexible piece play is the key.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/English-Opening', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/English-Opening', CHESSCOM_ARCHIVE],
  },
  {
    id: 'pro-gothamchess-vienna',
    playerId: 'gothamchess',
    eco: 'C28',
    name: 'Vienna Game (GothamChess)',
    pgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3',
    color: 'white',
    style: 'Aggressive, Tactical',
    overview: "Gotham's Vienna at 649 games / 67.8% — one of his highest score rates. The 2.Nc3 + 3.f4 (Vienna Gambit) is the sharpest of his 1.e4 systems. After Black's …d5 reply and the fxe5 / Nxe4 / Qf3 forcing sequence, White trades pieces and ends up with doubled c-pawns but excellent piece activity and an open f-file aimed at f7.",
    keyIdeas: [
      "f4 is the system-defining move — the Vienna Gambit. It commits to the kingside fight before Black has fully developed.",
      "Qf3 is the central queen attacking f7 and supporting Nxc3. Don't be afraid to trade — after bxc3, the open b-file becomes a real attacking lever.",
      "After Nxc3 / bxc3, you have doubled pawns but the bishop pair PLUS an open b-file PLUS an open f-file. That's three tempo advantages for one structural weakness — usually worth it.",
      "The Bc4 + Qf3 battery aiming at f7 is the killer setup. If Black mishandles development, mate threats appear early.",
    ],
    traps: [
      "Against the Bxf7+ sacrifice in some lines (e.g., when Black plays …Nf6 without preparing …d5), the king is exposed and Qh5+ wins material with concrete forced lines.",
    ],
    warnings: [
      "Don't play f4 if Black has already played …d5 and …Bg4 pinning your Nf3 — you'd lose tempo on the centre. The Vienna Gambit timing matters.",
      "Doubled c-pawns are a real weakness in pure endgames. Don't trade queens early without piece activity to compensate.",
    ],
    variations: [
      {
        name: 'Vienna Gambit Main Line',
        pgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1',
        explanation: "The textbook Vienna Gambit at 649 games. The Rb1 lift puts the rook on the open b-file, eyeing b7. Combined with the bishop pair, this is a long-term initiative play — Black's defence requires precise piece coordination.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Vienna-Game', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Vienna Quiet (Bc4 + d3)',
        pgn: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3 Bg4 Na4',
        explanation: "When Black plays …Nc6 + …Bc5 instead of …d5, White transposes to a quieter setup with Bc4 + d3 + f4. The Na4 manoeuvre attacks Bc5 — Black must decide between trading or retreating, both giving White structural plans.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Vienna-Game', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Vienna with …Nc6 + …Bc5',
        pgn: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3',
        explanation: "When Black plays the classical …Nc6 + …Bc5 setup instead of …d5, White transposes to a quieter Bc4 + d3 + f4 structure. The Nf3 development with Nf3 + king-side castling sets up a positional middlegame where White's space advantage and bishop pair gradually convert.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Vienna-Game', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Vienna-Game', CHESSCOM_ARCHIVE],
  },
  {
    id: 'pro-gothamchess-kia',
    playerId: 'gothamchess',
    eco: 'A07',
    name: "King's Indian Attack (GothamChess)",
    pgn: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1',
    color: 'white',
    style: 'Systematic, Universal',
    overview: "Gotham's KIA at 771 games / 71.1% — one of his highest scores across any opening. The King's Indian Attack is the ultimate system: Nf3 + g3 + Bg2 + O-O + d3 + Nbd2 + e4 happens against literally anything Black plays. You learn five middlegame plans once and play them in every game — pattern recognition advantage at amateur level is massive.",
    keyIdeas: [
      "Same setup every game: Nf3 + g3 + Bg2 + O-O + d3 + Nbd2 + e4. Pattern recognition beats opening theory at amateur level.",
      "e4-e5 is the central thrust. Once your pieces are out, this push grabs space and cramps Black's kingside.",
      "Nbd2 → Nf1 → Ng3 reroute is the classical attacking knight maneuver. Combined with f4-f5, this creates a kingside attack from any starting position.",
      "Bg2 on the long diagonal aims at b7 and Black's queenside. Don't trade it unless you get tangible compensation.",
    ],
    traps: [],
    warnings: [
      "Don't rush e4 — wait until your knight is on d2 and the d3 pawn supports it. Premature e4 gets challenged.",
      "Don't trade the Bg2 bishop without strong compensation — it's the system's strongest piece.",
    ],
    variations: [
      {
        name: 'vs …d5 + …c5',
        pgn: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1',
        explanation: "The standard KIA vs French-style structure. After e4 the d-file becomes contested; White's plan is e4-e5 + Nh4 + f4-f5 for a kingside attack. 71.1% score across 771 games — Levy's most consistent winning weapon.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Kings-Indian-Attack', CHESSCOM_ARCHIVE],
      },
      {
        name: 'vs Sicilian (KIA vs …c5 + …Nf6)',
        pgn: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7 d3 Nf6 Nbd2 d6 e4',
        explanation: "Against a Sicilian-style setup, the KIA reaches a Closed Sicilian-with-an-extra-tempo. The e4 push goes through; Nh4 + f4-f5 attacks the kingside.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Kings-Indian-Attack', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Kings-Indian-Attack', CHESSCOM_ARCHIVE],
  },
  {
    id: 'pro-gothamchess-caro-advance-white',
    playerId: 'gothamchess',
    eco: 'B12',
    name: 'Caro-Kann Advance (GothamChess, White)',
    pgn: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7',
    color: 'white',
    style: 'Sharp, Space',
    overview: "Gotham's anti-Caro from White's side — 423 games at 73.2% score, one of his BEST-scoring lines. The 3.e5 Advance grabs space immediately; the h4 thrust fixes Black's kingside structure with …h5; then Bg5 pins the king's knight and Bd3 + queen on d3 sets up the queenside-castle attack. Sharp, principled, hard to defend at speed.",
    keyIdeas: [
      "3.e5 (Advance) is the principled choice — grab space and cramp Black's kingside.",
      "h4-h5 is the structural commitment. Once Black plays …h5 in response, Black's pawn structure is fixed for the rest of the game.",
      "Bg5 pins the king's knight + targets the e7 square. Combined with Qd3 + Nd2 + O-O-O, the position is set up for a kingside attack.",
      "The c8-bishop trade via …Bxd3 / Qxd3 simplifies favourably — White's queen sits on a strong central square and Black has no bishop to coordinate with.",
    ],
    traps: [],
    warnings: [
      "Don't play h4 if Black hasn't played …Bf5 yet — the move is committal and creates a target if mistimed.",
      "Don't castle short in this structure — the kingside is committed (h4), so O-O-O is the natural choice for an attacking middlegame.",
    ],
    variations: [
      {
        name: 'Main line (vs …Bf5)',
        pgn: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 e6 Nd2 Ne7',
        explanation: "Gotham's main anti-Caro line — 423 games at 73.2%. After fixing the kingside with h4, the bishop trade on d3 leaves White with central control and queenside attacking potential. Sharp structural commitment that punishes imprecise defence.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation', CHESSCOM_ARCHIVE],
      },
      {
        name: 'vs …c5 (Botvinnik-Carls)',
        pgn: 'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6 Bd3',
        explanation: "When Black plays …c5 instead of …Bf5, the Botvinnik-Carls structure arises. The c-pawn trade simplifies; the …Bxc5 recapture by Black coordinates with development. White's plan is rapid Bd3 + O-O + active piece play.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation', CHESSCOM_ARCHIVE],
  },
  {
    id: 'pro-gothamchess-closed-sicilian',
    playerId: 'gothamchess',
    eco: 'B23',
    name: 'Closed Sicilian (GothamChess)',
    pgn: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4 cxd4 Qxd4',
    color: 'white',
    style: 'Anti-Theoretical, Solid',
    overview: "Gotham's Closed Sicilian — 333 games at 68.0%. The 2.Nc3 sidestep avoids 90% of Sicilian theory, taking Black out of their preparation. After Bb5 the typical exchange sequence simplifies into a quiet middlegame where White's better pawn structure usually decides.",
    keyIdeas: [
      "2.Nc3 — the entire point is to avoid Open Sicilian theory. Black's home-prep advantage goes away.",
      "Bb5 + the knight exchange on b5 leaves Black with doubled a-pawns and a structural weakness.",
      "After the queen recaptures on d4, the central queen is well-placed and Black has to spend tempo solving it.",
      "Long-term positional play with the better pawn structure — converted in the endgame.",
    ],
    traps: [],
    warnings: [
      "Don't aim for the Grand Prix-style f4 attack against …e6 setups — they're set up to defend it. Stay in pure Closed Sicilian channels.",
    ],
    variations: [
      {
        name: 'Closed Sicilian Main',
        pgn: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 Nxb5 Nxb5 a6 Nc3 d6 d4 cxd4 Qxd4',
        explanation: "The 2.Nc3 spine reaching a positional middlegame. The doubled a-pawn on Black's side is the long-term weakness that decides — Black's defence must keep pieces active or get slowly outplayed.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Closed-Sicilian-Defense', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Closed-Sicilian-Defense', CHESSCOM_ARCHIVE],
  },
  {
    id: 'pro-gothamchess-french-defense',
    playerId: 'gothamchess',
    eco: 'C11',
    name: 'French Defense (GothamChess, Black)',
    pgn: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 Bg2 Bg4',
    color: 'black',
    style: 'Solid, Counter-attacking',
    overview: "Gotham's French Defense as Black — 1,596 games at 62.7%. The Rubinstein 4...dxe4 line is Levy's main French weapon. After Nxe4 / …Nf6 / Nxf6+ / …gxf6, Black accepts doubled f-pawns in exchange for the bishop pair and active piece play. The open g-file becomes a real attacking lever.",
    keyIdeas: [
      "4...dxe4 — the Rubinstein. Accept the doubled pawns; you'll get them back in piece activity.",
      "…gxf6 recapture (not …exf6) keeps the f6-pawn supporting …e5 — the critical central counter.",
      "The bishop pair compensates for the structural weakness. Use it actively, especially the dark-squared bishop on the long diagonal.",
      "…e5 is the central counter-break. Once it lands, Black's pieces coordinate and the doubled pawns matter less.",
    ],
    traps: [],
    warnings: [
      "Don't recapture with …exf6 — you'd lock in the bishop pair AND lose the central counter-break.",
      "Don't try to defend the doubled pawns passively — the whole point is dynamic piece play; sitting and waiting gives White a structural win.",
    ],
    variations: [
      {
        name: 'Rubinstein Main Line',
        pgn: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 Bg2 Bg4 h3 Bxf3',
        explanation: "The textbook Rubinstein. After …gxf6 + …Nc6 + …e5 + …Bg4, Black has active piece play and the bishop pair. The …Bxf3 trade removes White's best defender. 62.7% score across 1,596 games.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/French-Defense', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Tarrasch (Nd2)',
        pgn: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 d5 Nb4 c4 Bf5',
        explanation: "Against the Tarrasch 3.Nd2 instead of 3.Nc3, Black follows the same Rubinstein recipe. After the d5 push by White, the …Nb4 manoeuvre eyes the c2 square and the …Bf5 development pressures the centre.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/French-Defense', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Exchange (exd5 lines)',
        pgn: 'e4 e6 d4 d5 exd5 exd5 Nf3 Bd6 Bd3 Bg4',
        explanation: "Against the Exchange variation 3.exd5, Black recaptures with …exd5 reaching a symmetric IQP-style structure. The …Bd6 + …Bg4 development pressures the f3-knight and prepares …Nc6.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/French-Defense-Exchange-Variation', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/French-Defense', CHESSCOM_ARCHIVE],
  },
  {
    id: 'pro-gothamchess-pirc-defense',
    playerId: 'gothamchess',
    eco: 'B07',
    name: 'Pirc Defense (GothamChess, Black)',
    pgn: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6 e5 Nd7',
    color: 'black',
    style: 'Hypermodern, Counter-attacking',
    overview: "Gotham's Pirc Defense as Black — 351 games at 69.2% score, one of his BEST-scoring Black openings. The Pirc invites White to overextend in the centre, then strikes back with …c5 to dynamite the structure. The Austrian Attack with f4 is the most aggressive try; Levy meets it with …c5 and …Nd7 keeping the position fluid.",
    keyIdeas: [
      "…d6 + …Nf6 + …g6 + …Bg7 — the Pirc setup. Let White overextend in the centre; the fianchetto bishop covers everything.",
      "…c5 is the critical break against the Austrian Attack (f4). Don't delay it — the longer White holds the centre, the worse Black's position becomes.",
      "The Bb5+ check is annoying but manageable — block with …Nc6 and let White waste time on the pin.",
      "After e5 by White (the Austrian Attack break), …Nd7 keeps the knight flexible — heading to b6 or back to f6 depending on the position.",
    ],
    traps: [],
    warnings: [
      "Don't play …c5 too early in the Bb5+ lines — block with …Nc6 first, then …c5 when timing is right.",
      "Don't trade the Bg7 bishop early — it's the structural anchor of the whole defence.",
    ],
    variations: [
      {
        name: 'Austrian Attack (f4)',
        pgn: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6 e5 Nd7',
        explanation: "The sharpest Austrian Attack with f4. Black's …c5 strikes immediately; the Bb5+ check is annoying but the …Nc6 block + …Nd7 redirect handles it. 69.2% score across 351 games.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Pirc-Defense', CHESSCOM_ARCHIVE],
      },
      {
        name: 'Classical (Nf3 setup)',
        pgn: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O Nc6',
        explanation: "Against the classical setup with Nf3 + Be2, Black completes development with …O-O + …Nc6. The position is balanced; play centres on whoever creates the first weakness in their opponent's position.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Pirc-Defense', CHESSCOM_ARCHIVE],
      },
      {
        name: '150 Attack (Be3 + f3)',
        pgn: 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 f3 b5',
        explanation: "The 150 Attack with Be3 + f3 preparing queenside castling and a kingside pawn storm. Black meets it with …c6 + …b5 expanding the queenside, racing toward White's king.",
        sources: ['concept:pos-development', 'https://www.chess.com/openings/Pirc-Defense', CHESSCOM_ARCHIVE],
      },
    ],
    trapLines: [],
    warningLines: [],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Pirc-Defense', CHESSCOM_ARCHIVE],
  },
];

const data = JSON.parse(fs.readFileSync(PRO_PATH, 'utf8'));
const existing = new Set(data.openings.map((o) => o.id));
const newOnly = NEW_ENTRIES.filter((e) => !existing.has(e.id));
const updated = NEW_ENTRIES.filter((e) => existing.has(e.id));

console.log(`Adding ${newOnly.length} new entries, updating ${updated.length}.`);

for (const e of NEW_ENTRIES) {
  const i = data.openings.findIndex((o) => o.id === e.id);
  if (i >= 0) {
    data.openings[i] = e;
    console.log(`  UPDATE ${e.id}`);
  } else {
    data.openings.push(e);
    console.log(`  ADD ${e.id}`);
  }
}

fs.writeFileSync(PRO_PATH, JSON.stringify(data, null, 2));
console.log(`\npro-repertoires.json: total openings = ${data.openings.length}`);
console.log('Done.');
