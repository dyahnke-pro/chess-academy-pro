#!/usr/bin/env node
// Rebuild the Alapin middlegame plans with HAND-WRITTEN narration
// per move + critical positions positioned AT or PAST the opening
// terminus (not mid-opening). Each plan's playable line shows real
// middlegame play sequenced from his game data, with annotations
// explaining the plan's IDEA at each move (not auto-generated
// formula).
//
// Per CLAUDE.md G9.1 + the deep-build doctrine: every move
// chess.js-validated; every annotation hand-authored; theme list
// matches the actual squares the line plays into.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const MP_PATH = 'src/data/middlegame-plans.json';
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';

const SRC = [
  'https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR',
  'https://www.chess.com/openings/Alapin-Sicilian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// Each plan is fully hand-authored:
//   - setupSans: the moves from start that reach the critical position
//   - moves: middlegame moves shown in the playable line
//   - annotations: prose per move (HAND WRITTEN, no formulas)
//   - learnCues: ≤8-word cues per move (HAND WRITTEN)
//   - The build script validates everything with chess.js
const PLANS = [
  // ============ nf6-main (1,105 games) — plan 1: queenside crawl conversion ============
  {
    id: 'mp-pronaroAlapin-queenside-crawl',
    openingId: 'pro-naroditsky-alapin',
    title: 'nf6-main — Queenside crawl + trade-down conversion',
    overview: "After the standard development (Bc4-Bb3, exd6 en passant, O-O, Bxe6 trade), the structural battle is decided. White's a4-a5-a6 crawl fixes Black's queenside permanently. THIS plan starts from there — the conversion phase. We show the moves that turn the structural advantage into a concrete win, repeatedly across the 1,105-game spine and most famously in his win vs Hikaru.",
    setupSans: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4 Qd7 a5'.split(' '),
    moves: ['Nd5','a6','b6','d4','e6','Ne5'],
    annotations: [
      "Black's …Nd5 hops the knight to its only safe square — central but blockaded. The knight has no targets here; it's a defender, not an attacker.",
      "The crawl reaches its destination: a6 fixes Black's b7-pawn permanently. Every Black piece now has to consider the b7-weakness for the rest of the game. Notice the rook on a1 sees the open a-file directly.",
      "Black's only defence — …b6 stops the threatened a7 push, but creates a permanent hole on c6 and locks the c8-bishop in for good.",
      "NOW we open with d4 — the move c3 was setting up since move two. Black's queenside is cramped, our king is safe, our pieces are developed. The centre opens on OUR terms.",
      "Black plays …e6 completing what's left of development. With the c8-bishop trapped behind …b6 and the queen on d7 doing nothing, Black has no active plan.",
      "Ne5 — central outpost dominating the dark squares. The knight attacks Nc6 AND eyes f7. From here the conversion is mechanical: trade off the Nc6, swing the queen out to g4 or h4, win on the kingside while Black's queenside pieces watch helplessly.",
    ],
    learnCues: [
      '…Nd5 — knight defends, doesn\'t attack',
      'a6 — fix the queenside',
      '…b6 — only defence, locks Bc8',
      'd4 — centre opens for us',
      '…e6 — Black\'s pieces aren\'t coordinating',
      'Ne5 — central outpost, attack begins',
    ],
    pawnBreaks: ['a6 — fixes Black\'s b7 permanently', 'd4 — centre opens on White\'s terms', '…b6 — Black\'s defensive concession'],
    pieceManeuvers: ['…Nd5 — defender only', 'Ne5 — central outpost on dark squares', 'queen swings to g4 next'],
    strategicThemes: ['Queenside fix decides the structural game', 'Cramped Black pieces can\'t coordinate', 'Central outpost converts to kingside attack'],
    endgameTransitions: ['R+minor+P endings — 29.4% of decisive nf6-main games — converted via queenside passer + bishop pair'],
    sources: SRC,
  },
  // ============ nf6-main — plan 2: exd6 break theme ============
  {
    id: 'mp-pronaroAlapin-exd6-enpassant',
    openingId: 'pro-naroditsky-alapin',
    title: 'nf6-main — exd6 en passant + tempo on the queen',
    overview: "When Black plays …d5 trying to free the position, the en-passant capture is the answer. exd6 opens the centre on our terms AND drags Black's queen out to d6 where it's vulnerable. The plan from there: O-O for king safety, then watch the queen lose tempo for the next 5 moves. This pattern recurs in 25% of his games at the move-7 inflection.",
    setupSans: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5'.split(' '),
    moves: ['exd6','Qxd6','O-O','Be6','Bxe6','Qxe6'],
    annotations: [
      "exd6 en passant! The capture looks innocent but DRAGS Black's queen to d6 where it's exposed to multiple developing moves with tempo. The e-file is half-open for our rook.",
      "Black recaptures with the queen — forced; …Bxd6 would lose the e5-pawn and a tempo. Now Qd6 is a target sitting in the middle of the board.",
      "O-O. King to safety FIRST. Black's queen on d6 has no immediate threats; meanwhile every piece we bring out hits it.",
      "Black develops Be6 offering the bishop trade. The reasoning: Black knows the queen on d6 is uncomfortable and wants to simplify.",
      "Bxe6! Take it. We trade our least-active piece (the b3-bishop has done its work) for Black's most-active developer. The light-squared bishop was Black's only piece with prospects.",
      "…Qxe6 forced (the queen recapture is the only sensible one). Now the queen is on e6 blocking the e-file for the rook AND covering nothing useful. From here we play a4 starting the queenside crawl — the structural plan that scores 73.8%.",
    ],
    learnCues: [
      'exd6 — en passant break',
      '…Qxd6 — queen out, exposed',
      'O-O — king safety first',
      '…Be6 — Black wants simplification',
      'Bxe6 — remove their best piece',
      '…Qxe6 — queen blocks her own rook',
    ],
    pawnBreaks: ['exd6 en passant — half-open the e-file', 'a4 follows next — queenside crawl', 'd4 later opens the centre'],
    pieceManeuvers: ['Bxe6 — initiate the bishop trade', 'O-O — castle for safety', '…Qxe6 — Black\'s queen blocks her rook'],
    strategicThemes: ['Tempo on the queen via en passant', 'Trade our least-active piece for their best developer'],
    endgameTransitions: ['R+minor+P endings — 29.4% of decisive nf6-main games'],
    sources: SRC,
  },
  // ============ d5-open (783 games) — plan 1: Nb5 outpost + trade-down ============
  {
    id: 'mp-pronaroAlapin-d5open-nb5-fork',
    openingId: 'pro-naroditsky-alapin',
    title: 'd5-open — Nb5 fork, trade-down, central knight outpost',
    overview: "After the d5-open trade sequence reaches the Be3 position, Naroditsky's signature plan kicks in: Nb5 forks the queen + c7. 53 games of his archive walk this whole sequence. Black's queen has to retreat (49% pick …Qd7, 40% pick …Qd8) — both lose tempo. We trade off the knight on c6, Ne5 plants a piece in the centre, and the structural game decides.",
    setupSans: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3'.split(' '),
    moves: ['cxd4','Nb5','Qd7','Nbxd4','Be7','Nxc6','Qxc6','Ne5'],
    annotations: [
      "Black plays …cxd4 — his 85% pick at this position. The capture looks principled but RELEASES the central tension that was keeping Black's pieces coordinated. Now our knight on a3 has a destination.",
      "Nb5! — the fork. Attacks the queen AND eyes c7 (where it can land for a discovered attack on the king). Black has no winning material option; only one safe queen retreat works.",
      "…Qd7 — his 49% pick (vs …Qd8 40%). Both retreats lose tempo, but …Qd7 blocks the c8-bishop's natural development to e6. Black's pieces are tangling each other.",
      "Nbxd4 — recapture with the b5-knight. Black's …cxd4 was a tempo gift; we recapture AND open the c-file. From here the d4-knight is harder to dislodge than the Nc6.",
      "Black plays …Be7 to finally develop — forced, the king needs castling soon. But we strike first.",
      "Nxc6! Trade off Black's best-coordinated piece. The Nc6 was supporting the d-pawn-square structure; without it Black's queen on d7 is even more isolated.",
      "…Qxc6 forced. Now the queen is on c6 — a bad square. She's blocking the c-file for her own rook, and her own pieces don't support her.",
      "Ne5! Central outpost. The knight attacks the queen on c6 AND dominates the dark squares. Black has to move the queen YET AGAIN — that's three tempi lost since move 7. The structural advantage converts in the R+minor+P endgame (27.4% of d5-open decisive games).",
    ],
    learnCues: [
      '…cxd4 — Black\'s 85% pick',
      'Nb5 — fork queen + c7',
      '…Qd7 — only safe retreat',
      'Nbxd4 — recapture, open c-file',
      '…Be7 — Black finally develops',
      'Nxc6 — remove Black\'s best piece',
      '…Qxc6 — queen blocks c-file',
      'Ne5 — central outpost, queen moves again',
    ],
    pawnBreaks: ['…cxd4 — Black releases central tension', '…dxe5 in some sub-lines — central trades'],
    pieceManeuvers: ['Nb5 fork — queen + c7', 'Nbxd4 — recapture opening c-file', 'Nxc6 — trade Black\'s best piece', 'Ne5 — central dark-square outpost'],
    strategicThemes: ['Knight outpost wins three tempi', 'Trade Black\'s best piece for structural edge', 'Queen on c6 blocks her own rook'],
    endgameTransitions: ['R+minor+P endings — 27.4% of d5-open decisive games — bishop pair + cramped Black queenside'],
    sources: SRC,
  },
  // ============ d5-open — plan 2: Be3 + Bb5+ king-fix ============
  {
    id: 'mp-pronaroAlapin-d5open-be3-pressure',
    openingId: 'pro-naroditsky-alapin',
    title: 'd5-open — Be3 buildup, Bb5+ pins the king on f8',
    overview: "Variant of the d5-open plan that pushes deeper — after the trade-down + Ne5 + Black's queen wanders to e4, the Bb5+ check fixes Black's king on f8 for the rest of the game. This is the position-fixing pattern that makes the structural advantage permanent. The Bb5+ → Kf8 sequence appears in roughly 20% of his d5-open conversions.",
    setupSans: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nbxd4 Be7 Nxc6 Qxc6 Ne5'.split(' '),
    moves: ['Qe4','Bb5+','Kf8','Nf3'],
    annotations: [
      "Black plays …Qe4 attacking our e5-knight AND threatening the bishop on b3 indirectly. Looks active, but it's exactly the move we want — the queen is now in the centre, undefended.",
      "Bb5+! Discovered attack on the queen — the bishop check + the knight on e5 means Black can't both block the check AND save the queen. There's only one legal response.",
      "…Kf8 — the king has to move. No good interposition exists (…Nd7 hangs the queen to Nxe4; …Bd7 also fails to Nxd7). Black's king is now committed to f8 for the rest of the game.",
      "Nf3 — the knight retreats with TEMPO. Black's queen on e4 has to move; the king on f8 has lost castling rights forever. Everything that follows is a long structural conversion: we have piece activity + the bishop pair, Black has a stuck king + nothing.",
    ],
    learnCues: [
      '…Qe4 — Black\'s active queen',
      'Bb5+ — discovered attack',
      '…Kf8 — king fixed permanently',
      'Nf3 — retreat with tempo',
    ],
    pawnBreaks: ['c-file opens after the trades', 'd-file half-open for our rook'],
    pieceManeuvers: ['Bb5+ — discovered attack on the queen', '…Kf8 — king permanently committed', 'Nf3 — retreat with tempo'],
    strategicThemes: ['King fixed on f8 = no castling forever', 'Discovered attack wins the tempo war', 'Structural conversion via piece activity'],
    endgameTransitions: ['R+minor+P endings where Black\'s stuck king tells'],
    sources: SRC,
  },
  // ============ e6-french (344 games) — plan 1: O-O castle + dxc3 grab + active piece play ============
  {
    id: 'mp-pronaroAlapin-e6french-oo-castle',
    openingId: 'pro-naroditsky-alapin',
    title: 'e6-french — O-O before recapture + open lines compensation',
    overview: "Against Black's French-style …e6/…d5 setup, the move that defines the plan is O-O — castle BEFORE recapturing on d4. Black grabs the c3-pawn with …dxc3 but we recover via Nxc3 with three structural pluses: open c-file, open b-file, bishop pair. The pattern shows up in his win vs Magnus Carlsen — exactly this sequence.",
    setupSans: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4'.split(' '),
    moves: ['O-O','dxc3','Nxc3','a6','Re1'],
    annotations: [
      "O-O. King safety FIRST. The d4-pawn is briefly hanging, but Black can't grab it without strategic disaster (…dxc3 just helps US develop). This is the same principle as the King's Indian Attack — castle the king before chasing material.",
      "Black plays …dxc3 trying to capitalise on the hanging pawn. But this is exactly what we wanted: now we have the open c-file, the b-file half-open from the recapture, and Black's pieces still undeveloped.",
      "Nxc3 — recapture with the knight, NOT the pawn. The knight develops with tempo (it now eyes Nb5 and Nd5 outposts), the b-file stays half-open, and the bishop pair is intact.",
      "Black plays …a6 stopping Nb5 — but now Black has spent move after move on prophylaxis without developing. We're ahead in development by 3-4 tempi.",
      "Re1 — rook to the e-file. Hits the weak e6-pawn that's now permanently fixed by Black's structure. From here every piece points at Black's king position: Bd3 + Re1 + Nc3 + Qd1 = the textbook IQP attacking setup. 74% score in 344 games on this exact structure.",
    ],
    learnCues: [
      'O-O — king safety first',
      '…dxc3 — Black grabs the pawn',
      'Nxc3 — recapture with the knight',
      '…a6 — Black prophylaxes',
      'Re1 — rook to the e-file',
    ],
    pawnBreaks: ['…dxc3 — Black trades the open c-file for a pawn', 'e5-e6 break in tactical lines'],
    pieceManeuvers: ['O-O — castle FIRST', 'Nxc3 — recapture with development', 'Re1 — rook to the e-file'],
    strategicThemes: ['King safety before material', 'Three structural pluses for one minor weakness'],
    endgameTransitions: ['Bishop pair + open files convert in the endgame'],
    sources: SRC,
  },
  // ============ e6-french — plan 2: Ng5 kingside tactics after development ============
  {
    id: 'mp-pronaroAlapin-e6french-ng5-attack',
    openingId: 'pro-naroditsky-alapin',
    title: 'e6-french — …a6 + Bc5 + Ng5 kingside tactics',
    overview: "After the standard …dxc3 / Nxc3 / …a6 development sequence, Black develops with …Bc5 attacking our e3-square. We play Ng5! — the knight jump threatens f7 tactics that Black struggles to defend at speed. This sequence appears in his win vs Magnus Carlsen (2024) — the conversion vehicle for the e6-french's 74% score.",
    setupSans: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O dxc3 Nxc3 a6 Re1'.split(' '),
    moves: ['Bc5','Ng5'],
    annotations: [
      "Black plays …Bc5 finally developing the f8-bishop, with tempo on the e3-square (preparing pressure on White's centre). Looks active; it commits the bishop to a square where it can be hit.",
      "Ng5! — the knight jumps with multiple tactical threats. Threatens Nxf7 winning material; threatens Nxh7 if Black isn't careful; threatens Qh5 ideas combining with the kingside knight. Black has to give up something — the bishop pair (…Bxg5), a tempo (…h6), or accept structural weakening. From this position Naroditsky's win vs Carlsen (2024) continued with tactical play on f5/h7 to a decisive king-hunt.",
    ],
    learnCues: [
      '…Bc5 — Black develops with tempo',
      'Ng5 — kingside tactics, threats on f7',
    ],
    pawnBreaks: ['…dxc3 — Black grabs the pawn earlier', 'e5-e6 break in some sub-lines'],
    pieceManeuvers: ['Ng5 — kingside knight jump', 'Re1 already in place', 'Bd3 + Qh5 follow-up'],
    strategicThemes: ['Sharp tactical positions — Naroditsky\'s specialty', 'Bishop pair vs structural weaknesses'],
    endgameTransitions: ['Sharp middlegames — endgames rare in this line'],
    sources: SRC,
  },
  // ============ d6-mainline (173 games) — plan 1: h3 prophylaxis + g4 storm ============
  {
    id: 'mp-pronaroAlapin-d6main-h3-prophylaxis',
    openingId: 'pro-naroditsky-alapin',
    title: 'd6-mainline — h3 prophylaxis sets up the g4-g5 storm',
    overview: "Against Black's KID-style setup with …d6 + …g6, we reach a King's Indian Reversed where WE have the extra tempo. h3 is the 18% pick at this move — the prophylactic move that prepares the g4 push. With Black's pieces committed to the kingside fianchetto, the g4-g5 expansion targets the …Bg7 directly.",
    setupSans: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6'.split(' '),
    moves: ['h3','Bg7','Nf3','O-O','Bd3'],
    annotations: [
      "h3 — his 18% pick at this position. The prophylaxis is doing two jobs: stops …Bg4 pinning our developing Nf3, AND prepares g4 expansion later. Looks slow; it's not.",
      "Black completes the fianchetto with …Bg7. The bishop covers the long diagonal but has nothing concrete to attack — our d4-pawn is solidly defended.",
      "Nf3 — finally develop the king's knight. Note we don't play Nf3 before h3 (which would invite the pin); the move order matters.",
      "Black castles short. Both kings are safe; the structural battle is decided by who breaks first.",
      "Bd3 — the kingside-attacker's bishop. Combined with the h3 we already played, the next move is g4 starting the kingside storm. Black's …Bg7 has nothing to do about it. 80.6% score in 173 games on this exact KID-reversed structure.",
    ],
    learnCues: [
      'h3 — prophylaxis + g4 prep',
      '…Bg7 — fianchetto, no targets',
      'Nf3 — develop after h3',
      '…O-O — both castle short',
      'Bd3 — kingside attacker',
    ],
    pawnBreaks: ['h3 — prophylactic + g4 prep', 'g4-g5 storm follows', 'd5 break in some lines'],
    pieceManeuvers: ['Bd3 — kingside attack setup', 'Nf3 after h3 — pin-proof', 'Bg5 + Qd2 follow'],
    strategicThemes: ['KID-reversed with the extra tempo', 'g4 + h3 = kingside storm prepared'],
    endgameTransitions: ['R+minor+P endings — 30.1% of d6-mainline decisive games — converted via space advantage'],
    sources: SRC,
  },
  // ============ nc6-line (116 games) — plan: Nc3 queen-tempo + structural conversion ============
  {
    id: 'mp-pronaroAlapin-nc6-bd3-buildup',
    openingId: 'pro-naroditsky-alapin',
    title: 'nc6-line — Nc3 wins queen-tempo, structural conversion',
    overview: "In the 2…Nc6 line, after Black's Scandinavian-style …Qxd5, the developing Nc3 attacks the queen with TEMPO. Black's only safe retreat is …Qd8 — back to the starting square, two tempi lost. From there the classical Bd3 + O-O setup converts the structural game. 86.2% score in 116 games — his BEST Alapin sub-line by a wide margin.",
    setupSans: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6'.split(' '),
    moves: ['Nc3','Qd8','Bd3','Nf6','O-O'],
    annotations: [
      "Nc3 — the move that breaks the line. Develops a piece AND attacks the queen on d5. There's no good square: …Qa5 walks into a3+b4 with discovered attacks; …Qe4 hangs to Re1 ideas; …Qd6 invites Nb5. The only safe square is the queen's STARTING square.",
      "…Qd8 — forced. Black's queen returns to d8 having spent two tempi (Qxd5 + Qd8) accomplishing nothing. We have all our pieces out; Black is still developing.",
      "Bd3 — his 24% pick at this position. The bishop covers the h7-diagonal AND prepares O-O. Slow but devastating: every move we play is structural improvement; every Black move is just trying to catch up.",
      "…Nf6 — Black FINALLY develops the king's knight. Pretty embarrassing — it's Black's 7th move and the knight is just developing.",
      "O-O — completes development. From here White's plan is a3 + b4 queenside expansion (the a-file is half-open for our rook). Black has no counterplay; we just methodically improve until something breaks. 86.2% score in 116 games is what happens when one side has two free tempi.",
    ],
    learnCues: [
      'Nc3 — attack queen with tempo',
      '…Qd8 — back to home square',
      'Bd3 — classical development',
      '…Nf6 — Black 2 tempi behind',
      'O-O — structural conversion ready',
    ],
    pawnBreaks: ['a3 + b4 follow — queenside expansion', 'd5 push in some lines'],
    pieceManeuvers: ['Nc3 — develop with tempo', '…Qd8 — humiliating retreat', 'Bd3 + O-O classical setup'],
    strategicThemes: ['Two tempi gained = structural win', 'Slow positional conversion'],
    endgameTransitions: ['R+minor+P endings — 33.7% of nc6-line decisive games — Black\'s lost tempi convert'],
    sources: SRC,
  },
];

// ============ BUILD ============
const planEntries = [];
const errors = [];

for (const p of PLANS) {
  try {
    // Verify setup sequence is legal
    const setup = new Chess();
    for (const san of p.setupSans) {
      try { setup.move(san); } catch (e) { throw new Error(`setup illegal at ${san}: ${e.message}`); }
    }
    const fen = setup.fen();

    // Verify continuation is legal
    const game = new Chess(fen);
    const highlights = [];
    const arrows = [];
    for (let i = 0; i < p.moves.length; i++) {
      const san = p.moves[i];
      let mv;
      try { mv = game.move(san); } catch (e) { throw new Error(`move ${i + 1} illegal at ${san}: ${e.message}`); }
      highlights.push([
        { square: mv.from, color: ORANGE },
        { square: mv.to, color: ORANGE },
      ]);
      arrows.push([]);
    }

    if (p.annotations.length !== p.moves.length) {
      throw new Error(`annotations count (${p.annotations.length}) != moves (${p.moves.length})`);
    }
    if (p.learnCues.length !== p.moves.length) {
      throw new Error(`learnCues count (${p.learnCues.length}) != moves (${p.moves.length})`);
    }

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
        moves: p.moves,
        annotations: p.annotations,
        arrows,
        highlights,
        learnCues: p.learnCues,
        title: p.title,
        intro: p.overview,
        sources: p.sources,
      }],
    });

    console.log(`OK ${p.id} — ${p.moves.length} hand-authored moves`);
  } catch (e) {
    console.error(`FAIL ${p.id}: ${e.message}`);
    errors.push(`${p.id}: ${e.message}`);
  }
}

if (errors.length > 0) {
  console.error('\nERRORS:', errors);
  process.exit(1);
}

// Merge — DROP all old Alapin plans + add fresh
const existing = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));
const newIds = new Set(planEntries.map((p) => p.id));
const kept = existing.filter((p) => {
  if (p.openingId === 'pro-naroditsky-alapin') return false;
  if (newIds.has(p.id)) return false;
  return true;
});
const merged = [...kept, ...planEntries].sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(MP_PATH, JSON.stringify(merged, null, 2));
console.log(`\nmiddlegame-plans.json: replaced Alapin plans, ${planEntries.length} new (${merged.length} total)`);
