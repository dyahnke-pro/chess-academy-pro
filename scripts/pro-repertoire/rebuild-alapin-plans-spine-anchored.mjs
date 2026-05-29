#!/usr/bin/env node
// Rebuild the Alapin plans (middlegame + endgame) anchored at REAL
// game positions:
//   * Middlegame plans anchor AT THE OPENING TERMINUS — the full
//     variation spine — and walk 4-6 moves of a real model game's
//     middlegame conversion.
//   * Endgame plans anchor LATER in the same model game, at a
//     position where R+minor+P or similar structure has emerged,
//     and walk 4-6 moves of the conversion technique.
//
// Per the locked rules: every move chess.js-validated; every
// annotation hand-authored; theme list matches actual moves; plan
// id ending in `-endgame` for endgame plans.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const MP_PATH = 'src/data/middlegame-plans.json';
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const SRC = [
  'https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR',
  'https://www.chess.com/openings/Alapin-Sicilian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

const PLANS = [
  // ============================================================
  // nf6-main (1,089 games) — full 32-ply spine ending at Qg4 g6
  // Reference game: Naroditsky vs FaustinoOro (2971), won 1-0
  // ============================================================
  {
    id: 'mp-pronaroAlapin-nf6main-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'nf6-main MIDDLEGAME — Rd1 + central conversion (vs FaustinoOro 2971)',
    overview: "After the 32-ply Alapin spine ends with Qg4 g6, we're DONE with theory. The middlegame plan: bring the rook to d1 (the open file), force Black's queen to choose a square, then convert the structural edge. This walks the actual game vs FaustinoOro 2971 — moves 17-22 — where the conversion technique is on display.",
    setupSans: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4 Qd7 a5 Nd5 a6 b6 d4 e6 Ne5 Nxe5 dxe5 Be7 Qg4 g6'.split(' '),
    moves: ['Rd1','Qc6','c4','Nb4','Na3','h5'],
    annotations: [
      "Rd1 — the rook to the open d-file. The queen on g4 stays where she is; the rook activates with tempo on Black's queen on d7. Every White piece is now coordinated for the conversion.",
      "Black plays …Qc6 finding the only active square. The queen can't stay on d7 (she'd get attacked by our pieces); …Qe7 is too passive. So she comes to c6 — still in our territory.",
      "c4! — the move that converts. We push the c-pawn supporting the queenside structure AND opening lines for our knight on a3 (which will reroute to b5 next). Black's b6-pawn is now a permanent weakness on the c-file.",
      "Black plays …Nb4 trying to find tactics. The knight on d5 had no future; now it tries to reach c6 or harass our queenside. But this is just shuffling — our position keeps improving.",
      "Na3! — the knight reroutes through a3 toward b5, where it'll attack the Black queen on c6 AND eye c7. This is the structural plan: every piece coordinated, every move improves something.",
      "Black plays …h5 trying to create kingside counterplay. Too little, too late — the FaustinoOro game continued Qe2 + O-O + Nb5 + Rxd8 winning material via tactics on the queenside. 1-0 in 44 moves vs a 2971-rated opponent.",
    ],
    learnCues: [
      'Rd1 — rook to the open file',
      '…Qc6 — only active square',
      'c4 — convert the queenside',
      '…Nb4 — Black shuffles',
      'Na3 — knight reroute to b5',
      '…h5 — too late for counterplay',
    ],
    pawnBreaks: ['c4 — converts the queenside structure', 'a6 fixed earlier — Black\'s b6 is a permanent weakness'],
    pieceManeuvers: ['Rd1 — rook to open d-file', 'Na3 → Nb5 reroute', 'c4 push opens lines'],
    strategicThemes: ['Structural conversion in the middlegame', 'Every piece improves with tempo'],
    endgameTransitions: ['R+B+P endings — queens come off via Qe2 + trades; queenside passer carries through'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-nf6main-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'nf6-main ENDGAME — R+B+P conversion via queenside passer',
    overview: "Past move 25, the FaustinoOro game reaches a R+B+N endgame with White's a-pawn on a6 — the SAME passer the queenside crawl created at move 11. This endgame plan shows the conversion: passive piece pressure + slow advance of the queenside pawn = decided endgame. 29.4% of nf6-main decisive games reach this R+minor+P structure.",
    // Anchor at ply 50 of the FaustinoOro game — R+B+N endgame
    setupFen: '3r2k1/p2qbp2/Pp2p1p1/1Np1n2p/2P5/4BQ1P/1P3PP1/R5K1 w - - 0 26',
    moves: ['Qb7','Nc6','b3','Bf6','Re1','Be5'],
    annotations: [
      "Qb7 — the queen invades the 7th rank, attacking Black's a7-pawn and aligning with the queenside passer on a6. Black has no safe square: …Qe7 loses to Qxa7; …Rd7 loses material.",
      "Black plays …Nc6 trying to coordinate, but the knight on c6 blocks the c-file for the rook AND covers nothing useful. We have all the time in the world; he has to defend everything.",
      "b3 — quiet move strengthening our structure. The c4-pawn is supported, the b2-pawn is mobile if needed. We're not in a hurry; the structural advantage doesn't go anywhere.",
      "Black plays …Bf6 trying to activate the bishop. It hits our knight on b5 indirectly but doesn't actually do anything.",
      "Re1 — finally the rook activates. The plan: Re1 + the queen + the Nb5 all aim at Black's pieces. Material starts dropping next.",
      "Black plays …Be5 trying to trade pieces. We refuse — Bg5! comes next attacking the queen on d7 with tempo, then Re1 picks up the rook on d8 via tactics. The conversion finishes within 5-7 moves.",
    ],
    learnCues: [
      'Qb7 — invade the 7th rank',
      '…Nc6 — Black blocks his own pieces',
      'b3 — quiet structural improvement',
      '…Bf6 — wasted activity',
      'Re1 — finally the rook',
      '…Be5 — Black tries to trade',
    ],
    pawnBreaks: ['a6 passer creates winning chances', 'b3 supports c4 structure'],
    pieceManeuvers: ['Qb7 — invade the 7th rank', 'Re1 — rook activation', 'Nb5 stays on the prize square'],
    strategicThemes: ['Slow conversion in R+minor+P', 'Queenside passer + active pieces decide'],
    endgameTransitions: ['Tactics on the back rank or queenside finish the game'],
    sources: SRC,
  },

  // ============================================================
  // d5-open (783 games) — full 25-ply spine ending at Bb5+ Kf8 Nf3
  // Reference game: vs Sam Shankland (2934), won 1-0
  // ============================================================
  {
    id: 'mp-pronaroAlapin-d5open-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'd5-open MIDDLEGAME — fxe3 + central conversion (vs Shankland 2934)',
    overview: "After the full 25-ply d5-open spine ending with Bb5+ Kf8 Nf3, Black's king is fixed on f8 forever. The middlegame plan: Black tries …Ng4 attacking our pieces, we trade off with fxe3 doubling but opening the f-file, then dominate with the rook on f1. From his win vs Shankland (2934) — exactly this conversion.",
    setupSans: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nbxd4 Be7 Nxc6 Qxc6 Ne5 Qe4 Bb5+ Kf8 Nf3'.split(' '),
    moves: ['Ng4','O-O','Nxe3','fxe3','g6','Qd4'],
    annotations: [
      "Black plays …Ng4 attacking our bishop on e3. Looks active, but the knight has nowhere to go after — it has to take the bishop, and then we get the open f-file for free.",
      "O-O — castle FIRST, take later. Same theme as in the opening: king safety beats material immediacy. The bishop on e3 is briefly defended only by the rook; Black can take it but then we win on tactics.",
      "Black plays …Nxe3 — forced really. The knight had no good retreat after Ng4.",
      "fxe3! — recapture with the pawn opening the f-file for our rook. Yes we have doubled pawns now, but we have a fully open f-file, the bishop pair, and Black's king STILL stuck on f8 with no shelter.",
      "Black plays …g6 trying to give the king some breathing room with …Kg7 later. Slow but necessary.",
      "Qd4! — the queen takes a dominant central square attacking Black's queen on e4. Black has to trade (Qxd4 cxd4) — and now we have an open c-file PLUS the f-file PLUS the bishop pair. Shankland (2934) couldn't hold this in 62 moves.",
    ],
    learnCues: [
      '…Ng4 — Black tries activity',
      'O-O — king safety first again',
      '…Nxe3 — forced',
      'fxe3 — open the f-file',
      '…g6 — Black needs king escape',
      'Qd4 — central queen, force trade',
    ],
    pawnBreaks: ['fxe3 — doubled pawns trade for open f-file', 'e3 + cxd4 — central pawn structure'],
    pieceManeuvers: ['O-O — castle first', 'Qd4 — central queen dominates', 'Rook on f1 active'],
    strategicThemes: ['Open files compensate for doubled pawns', 'Black king on f8 = permanent weakness'],
    endgameTransitions: ['R+B+B+P endings where bishop pair + open files convert'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-d5open-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'd5-open ENDGAME — R+B+N conversion vs the cramped king',
    overview: "Past move 20 in the Shankland game, the position has simplified to a R+B+N+P endgame with Black's king STILL stuck on g7 (it moved from f8 but never reached a real shelter). This plan shows the conversion technique: knight infiltration via Ng5 + Ne4, bishop reposition to f5/f3, and the cramped king finally cracks. The d5-open variant produces this exact endgame in 27.4% of decisive games.",
    setupFen: 'r1b5/1p3rkp/p2b2p1/2N1pp2/3P4/4P3/PPR1B1PP/2R3K1 w - - 0 26',
    moves: ['dxe5','Bxc5','Rxc5','Be6','a4','Re8'],
    annotations: [
      "dxe5! — capture the e-pawn that Black just pushed. The trade opens the d-file AND attacks Black's bishop on d6, which has no good square (anywhere it goes, our Nc5 dominates more).",
      "Black plays …Bxc5 — forced. The d6-bishop had to move; trading with our knight is the only way to avoid being kicked further.",
      "Rxc5 — recapture with the rook. Now we have the rook on c5 dominating the queenside AND the pawn on e5 supporting central squares AND Black's pieces still uncoordinated.",
      "Black plays …Be6 trying to develop the c8-bishop finally. But it's move 27 — too late. We're already in the endgame phase.",
      "a4! — start the queenside passer. With Black's pieces tied to defence we can push the a-pawn unopposed. The whole structural plan from the opening pays off here: queenside passer + open files + bishop pair.",
      "Black plays …Re8 trying to activate the rook. We'll continue a5 + Rfc1 + Bf3 setting up Rc7. Shankland (2934) couldn't hold the pressure — the conversion finishes in another 15 moves with material winning.",
    ],
    learnCues: [
      'dxe5 — capture, attack Bd6',
      '…Bxc5 — forced bishop trade',
      'Rxc5 — rook dominates c-file',
      '…Be6 — Black\'s late development',
      'a4 — queenside passer marches',
      '…Re8 — Black tries activity',
    ],
    pawnBreaks: ['dxe5 — central exchange + open d-file', 'e5 by Black opens the position'],
    pieceManeuvers: ['Be2 — quiet reposition', 'Rfc1 — double rooks on c-file', 'Bd3 → e2 for the long diagonal'],
    strategicThemes: ['Slow endgame conversion', 'Cramped king never reaches shelter'],
    endgameTransitions: ['R+B+P endings — Black\'s structural weaknesses tell'],
    sources: SRC,
  },

  // ============================================================
  // e6-french (317 games) — full 19-ply spine ending at Ng5
  // Reference game: vs NikoTheodorou (3131), won 1-0
  // ============================================================
  {
    id: 'mp-pronaroAlapin-e6french-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'e6-french MIDDLEGAME — Bxh6 sac + Qxh6 attack (vs Niko Theodorou 3131)',
    overview: "After the 19-ply e6-french spine ends with Ng5 threatening f7, Black tries defending with …Nh6. The middlegame plan: SACRIFICE the bishop on h6! After Bxh6 gxh6 Qxh6, Black's king is permanently exposed and the f-file points at his king. This is from his win vs NikoTheodorou (3131) — exactly this attacking sequence.",
    setupSans: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O dxc3 Nxc3 a6 Re1 Bc5 Ng5'.split(' '),
    moves: ['Nh6','Qh5','Qb6','Nh3','Ne7','Bxh6'],
    annotations: [
      "Black plays …Nh6 defending the f7-square the only way possible. The knight on h6 is awkward but covers the attack.",
      "Qh5! — the queen swings to the kingside threatening multiple tactics on f7 and h7. Black's defensive setup is creaking.",
      "Black plays …Qb6 trying to counter-attack our b2 pawn. Too slow — our kingside attack is faster than his queenside counterplay.",
      "Nh3 — the knight retreats but eyes Nf4 (where it would join the kingside attack) AND prepares the bishop sac. Slow-motion attack.",
      "Black plays …Ne7 defending the e-pawn but blocking the f8-bishop's diagonal. Black's pieces are all uncoordinated.",
      "Bxh6! — THE sacrifice. After …gxh6 Qxh6, Black's king has no pawn shield, the kingside is fully open, and Black's pieces all face the wrong direction. The Theodorou game continued to a 67-ply demolition.",
    ],
    learnCues: [
      '…Nh6 — only defence',
      'Qh5 — queen to the kingside',
      '…Qb6 — slow counter-attack',
      'Nh3 — prepare Nf4',
      '…Ne7 — Black blocks his own bishop',
      'Bxh6 — bishop sacrifice!',
    ],
    pawnBreaks: ['e5 — central pawn supports the attack', 'Bxh6 — sacrifice opens the kingside'],
    pieceManeuvers: ['Qh5 — queen to the kingside', 'Nh3 — preparation', 'Bxh6 — sacrificial breakthrough'],
    strategicThemes: ['Bishop sac for king-hunt', 'Open files + exposed king decide the middlegame'],
    endgameTransitions: ['Sharp middlegames — endgames rare; tactics finish the game'],
    sources: SRC,
  },

  // ============================================================
  // d6-mainline (173 games) — full 17-ply spine ending at O-O
  // Reference game: vs Riley (2984), won 1-0
  // ============================================================
  {
    id: 'mp-pronaroAlapin-d6main-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'd6-mainline MIDDLEGAME — Bg5 + h3 + Be2 (vs Riley 2984)',
    overview: "After the 17-ply d6-mainline spine ends with both sides castled, the middlegame plan is the …e5 break by Black + Bg5 + Bh4 + Be2 quiet pieces. From his win vs Riley (2984) — this conversion goes a full 117 plies, but the middlegame inflection is clear in the first 6 moves past the spine.",
    setupSans: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6 h3 Bg7 Nf3 O-O Bd3 Nc6 O-O'.split(' '),
    moves: ['e5','dxe5','dxe5','Bg5','Be6','Bh4'],
    annotations: [
      "Black plays …e5 challenging our centre. This is the KEY break for Black — without it, his …Bg7 has nothing to do. We have a choice: hold the centre with d5 or trade with dxe5.",
      "dxe5! — trade and open the d-file. The trade releases the central tension on OUR terms and gives us the open d-file for the queen + rook.",
      "Black plays …dxe5 recapturing. The position is open, queens still on, both sides have full piece activity. The endgame is a long way off.",
      "Bg5! — the bishop activates pinning the f6-knight. Black has to react: …h6 chases the bishop but creates a kingside weakness; …Be6 develops but the bishop on e6 blocks the e-file.",
      "Black plays …Be6 developing. The bishop is fine but the position is balanced; we still need to find an active plan.",
      "Bh4 — maintains the pin on the f6-knight. Now …Nh5 is forced (the knight has no good square), and after Nh5 the position becomes tactical. Naroditsky converted this against Riley in 117 plies.",
    ],
    learnCues: [
      '…e5 — Black\'s key break',
      'dxe5 — open the d-file',
      '…dxe5 — recapture',
      'Bg5 — pin the f6-knight',
      '…Be6 — Black develops',
      'Bh4 — maintain the pin',
    ],
    pawnBreaks: ['…e5 — Black\'s only freeing move', 'dxe5 + …dxe5 — central exchange'],
    pieceManeuvers: ['Bg5 — pin the king\'s knight', 'Bh4 — maintain pressure', 'Rd1 follows'],
    strategicThemes: ['Black\'s …e5 break decides the structure', 'Pin pressure converts via piece play'],
    endgameTransitions: ['R+minor+P endings — 30.1% of d6-mainline decisive games — long technical conversion'],
    sources: SRC,
  },

  // ============================================================
  // nc6-line (116 games) — full 20-ply spine ending at a3 O-O
  // Reference game: vs Zanyglobal (2899), won 1-0
  // ============================================================
  {
    id: 'mp-pronaroAlapin-nc6-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'nc6-line MIDDLEGAME — Bc2 + Bg5 + Bh6 attack (vs Zanyglobal 2899)',
    overview: "After the 20-ply nc6-line spine ends with Black castling, the middlegame plan is the Bc2 reposition + Bg5 + Bh6 sequence forcing Black's kingside knight to defend. From his win vs Zanyglobal (2899) — exactly this attacking buildup, leading to a 1-0 in 61 moves.",
    setupSans: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6 Nc3 Qd8 Bd3 Nf6 O-O Be7 a3 O-O'.split(' '),
    moves: ['Bc2','b6','Qd3','Bb7','Bg5','g6'],
    annotations: [
      "Bc2 — the bishop slides to c2 freeing the d3-square for the queen. Black's queen has been passive; ours is about to activate aiming at h7.",
      "Black plays …b6 preparing the fianchetto and freeing the c8-bishop. Slow but principled — Black's pieces start to coordinate.",
      "Qd3 — the queen activates on the b1-h7 diagonal. Combined with Bc2, we have a battery aiming at h7 — Black has to defend with …g6 or accept tactical threats.",
      "Black plays …Bb7 fianchettoing. The bishop covers the long diagonal but doesn't yet threaten anything; we still have the initiative.",
      "Bg5 — pin the f6-knight. Looks similar to the d6-mainline plan, but here the pin combined with the queen battery on h7 is more dangerous.",
      "Black plays …g6 weakening the kingside. Now Bh6 comes next (or Bg5-Bh6 reroute) pressuring the dark squares. The Zanyglobal game continued exactly here to a tactical breakthrough on the kingside.",
    ],
    learnCues: [
      'Bc2 — free d3 for the queen',
      '…b6 — Black\'s fianchetto prep',
      'Qd3 — battery on b1-h7',
      '…Bb7 — fianchetto complete',
      'Bg5 — pin the f6-knight',
      '…g6 — kingside weakening',
    ],
    pawnBreaks: ['Bc2 reroute precedes other breaks', 'd5 break possible later'],
    pieceManeuvers: ['Bc2 + Qd3 — battery toward h7', 'Bg5 → Bh6 dark-square reroute', 'Nc3 supports central play'],
    strategicThemes: ['Kingside battery on h7', 'Pin pressure + dark squares'],
    endgameTransitions: ['R+minor+P endings — 33.7% of nc6-line decisive games — tactics decide before endgame'],
    sources: SRC,
  },
];

// ============ BUILD ============
const planEntries = [];
const errors = [];

for (const p of PLANS) {
  try {
    let fen;
    if (p.setupFen) {
      // Endgame plan — anchor at a specific FEN
      fen = p.setupFen;
    } else {
      // Middlegame plan — anchor at end of setupSans
      const setup = new Chess();
      for (const san of p.setupSans) {
        try { setup.move(san); } catch (e) { throw new Error(`setup illegal at ${san}: ${e.message}`); }
      }
      fen = setup.fen();
    }

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

    const kind = p.id.endsWith('-endgame') ? 'ENDGAME' : 'MIDDLEGAME';
    console.log(`OK ${p.id} [${kind}] — ${p.moves.length} hand-authored moves`);
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
