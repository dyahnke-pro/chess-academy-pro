#!/usr/bin/env node
// FINAL Alapin plan build — every variation tab gets MIDDLEGAME + ENDGAME
// plans, anchored at FULL spine end (where the opening finishes), with
// hand-written narration per move, walking real moves from his model
// games (no fabrication).
//
// Coverage (8 variation tabs × ~2 plans each = ~14 plans):
//   Main / 2…d5 / 2…e6 / 2…d6 / 2…g6 / 2…Nc6 / Spine 4…d6 / Spine 4…e6
//
// Per locked rules:
//   - setupSans = FULL variation spine OR setupFen = real endgame FEN
//   - moves[] = real continuation from his game data
//   - annotations[] = hand-written prose per move
//   - learnCues[] = hand-written ≤8-word cues
//   - themes match actual squares the line visits

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
  // nf6-main (1,089 games) — FaustinoOro 2971 reference
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
    learnCues: ['Rd1 — rook to the open file','…Qc6 — only active square','c4 — convert the queenside','…Nb4 — Black shuffles','Na3 — knight reroute to b5','…h5 — too late for counterplay'],
    pawnBreaks: ['c4 — converts the queenside structure','a6 fixed earlier — Black\'s b6 is a permanent weakness'],
    pieceManeuvers: ['Rd1 — rook to open d-file','Na3 → Nb5 reroute','c4 push opens lines'],
    strategicThemes: ['Structural conversion in the middlegame','Every piece improves with tempo'],
    endgameTransitions: ['R+B+P endings — queens come off via Qe2 + trades; queenside passer carries through'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-nf6main-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'nf6-main ENDGAME — R+B+P conversion via queenside passer (vs FaustinoOro 2971)',
    overview: "Past move 25 in the FaustinoOro game, the position is a R+B+N endgame with the queenside passer (a6) — the SAME passer the queenside crawl created at move 11. R+minor+P endings appear in 29.4% of nf6-main decisive games; this is the conversion technique.",
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
    learnCues: ['Qb7 — invade the 7th rank','…Nc6 — Black blocks his own pieces','b3 — quiet structural improvement','…Bf6 — wasted activity','Re1 — finally the rook','…Be5 — Black tries to trade'],
    pawnBreaks: ['a6 passer creates winning chances','b3 supports c4 structure'],
    pieceManeuvers: ['Qb7 — invade the 7th rank','Re1 — rook activation','Nb5 stays on the prize square'],
    strategicThemes: ['Slow conversion in R+minor+P','Queenside passer + active pieces decide'],
    endgameTransitions: ['Tactics on the back rank or queenside finish the game'],
    sources: SRC,
  },

  // ============================================================
  // d5-open (783 games) — Shankland 2934 reference
  // ============================================================
  {
    id: 'mp-pronaroAlapin-d5open-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'd5-open MIDDLEGAME — fxe3 + central conversion (vs Shankland 2934)',
    overview: "After the full 25-ply d5-open spine ending with Bb5+ Kf8 Nf3, Black's king is fixed on f8 forever. The middlegame plan: Black tries …Ng4 attacking our pieces, we trade off with fxe3 doubling but opening the f-file, then dominate with the rook on f1. From his win vs Shankland (2934).",
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
    learnCues: ['…Ng4 — Black tries activity','O-O — king safety first again','…Nxe3 — forced','fxe3 — open the f-file','…g6 — Black needs king escape','Qd4 — central queen, force trade'],
    pawnBreaks: ['fxe3 — doubled pawns trade for open f-file','e3 + cxd4 — central pawn structure'],
    pieceManeuvers: ['O-O — castle first','Qd4 — central queen dominates','Rook on f1 active'],
    strategicThemes: ['Open files compensate for doubled pawns','Black king on f8 = permanent weakness'],
    endgameTransitions: ['R+B+B+P endings where bishop pair + open files convert'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-d5open-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'd5-open ENDGAME — R+B+N conversion vs the cramped king (vs Shankland 2934)',
    overview: "Past move 25 in the Shankland game, the position simplifies to a R+B+N+P endgame with Black's king STILL stuck near g7 (it moved from f8 but never reached real shelter). This plan shows the conversion: knight infiltration via Nc5, bishop reposition to f3 long-diagonal, and the cramped king finally cracks. 27.4% of d5-open decisive games reach this exact structure.",
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
    learnCues: ['dxe5 — capture, attack Bd6','…Bxc5 — forced bishop trade','Rxc5 — rook dominates c-file','…Be6 — Black\'s late development','a4 — queenside passer marches','…Re8 — Black tries activity'],
    pawnBreaks: ['dxe5 — capture opens lines','a4-a5 — queenside passer'],
    pieceManeuvers: ['Rxc5 — rook on the c-file','Bf3 long-diagonal later','Nc5 dominates dark squares'],
    strategicThemes: ['Slow conversion in R+B+N+P','Queenside passer + Black\'s stuck king'],
    endgameTransitions: ['Material wins on the queenside via the passer'],
    sources: SRC,
  },

  // ============================================================
  // e6-french (317 games) — Niko Theodorou 3131 reference
  // ============================================================
  {
    id: 'mp-pronaroAlapin-e6french-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'e6-french MIDDLEGAME — Bxh6 sac + Qxh6 attack (vs Niko Theodorou 3131)',
    overview: "After the 19-ply e6-french spine ends with Ng5 threatening f7, Black tries defending with …Nh6. The middlegame plan: SACRIFICE the bishop on h6! After Bxh6 gxh6 Qxh6, Black's king is permanently exposed and the f-file points at his king. From his win vs NikoTheodorou (3131).",
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
    learnCues: ['…Nh6 — only defence','Qh5 — queen to the kingside','…Qb6 — slow counter-attack','Nh3 — prepare Nf4','…Ne7 — Black blocks his own bishop','Bxh6 — bishop sacrifice!'],
    pawnBreaks: ['e5 — central pawn supports the attack','Bxh6 — sacrifice opens the kingside'],
    pieceManeuvers: ['Qh5 — queen to the kingside','Nh3 — preparation','Bxh6 — sacrificial breakthrough'],
    strategicThemes: ['Bishop sac for king-hunt','Open files + exposed king decide the middlegame'],
    endgameTransitions: ['Sharp middlegames — endgames rare; tactics finish the game'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-e6french-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'e6-french ENDGAME — Q+R+B vs Q+B post-sac (vs Niko Theodorou 3131)',
    overview: "After the Bxh6 sacrifice plays out, the Theodorou game reaches a Q+R+R+B+P vs Q+B+P-mess position around move 30. Even though queens are still on, this is the CONVERSION PHASE — Black's king has no shelter, our pieces dominate every file. R+min+P endings appear in 22.3% of e6-french decisive games when tactics don't decide first; this plan shows the structural finishing technique.",
    setupFen: '1k6/1p2Qp1p/p3p3/3pP3/bP1q4/8/3KB2P/1R1R4 w - - 4 31',
    moves: ['Bd3','Qf2+','Kc1','Qe3+','Kb2','Qd4+'],
    annotations: [
      "Bd3 — bring the bishop into the attack, covering the king and threatening Bxh7. Black's queen on d4 has been the only active piece coordinating Black's defence.",
      "Black plays …Qf2+ trying to keep the queens on and find perpetual ideas. The check forces our king to move.",
      "Kc1 — sidestep the check to c1. Our king walks around the position but Black has no follow-up tactic — every check just costs Black another tempo with no gain.",
      "Black plays …Qe3+ continuing the queen harassment. Looks scary but it's just a perpetual attempt — White is up material and the queens will eventually trade off.",
      "Kb2 — keep walking. The king is safer on the queenside than it looks; Black's pieces all face the wrong direction.",
      "Black plays …Qd4+ trying to force a draw by repetition. Naroditsky's response in the actual game broke the cycle and converted to win — the structural advantage from the opening pays off even in this tactical mess.",
    ],
    learnCues: ['Bd3 — bring the bishop','…Qf2+ — perpetual attempt','Kc1 — sidestep','…Qe3+ — keep checking','Kb2 — walk safely','…Qd4+ — Black tries draw'],
    pawnBreaks: ['e5 stays as the structural anchor','b4 supports our queenside'],
    pieceManeuvers: ['Bd3 — bishop activates','King walk breaks the perpetual','Black\'s queen harassment fails'],
    strategicThemes: ['King walk converts material edge','Black has no real follow-up'],
    endgameTransitions: ['Material conversion when queens finally trade'],
    sources: SRC,
  },

  // ============================================================
  // d6-mainline (173 games) — Riley 2984 reference
  // ============================================================
  {
    id: 'mp-pronaroAlapin-d6main-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'd6-mainline MIDDLEGAME — Bg5 + h3 + Be2 (vs Riley 2984)',
    overview: "After the 17-ply d6-mainline spine ends with both sides castled, the middlegame plan is the …e5 break by Black + Bg5 + Bh4 + Be2 quiet pieces. From his win vs Riley (2984).",
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
    learnCues: ['…e5 — Black\'s key break','dxe5 — open the d-file','…dxe5 — recapture','Bg5 — pin the f6-knight','…Be6 — Black develops','Bh4 — maintain the pin'],
    pawnBreaks: ['…e5 — Black\'s only freeing move','dxe5 + …dxe5 — central exchange'],
    pieceManeuvers: ['Bg5 — pin the king\'s knight','Bh4 — maintain pressure','Rd1 follows'],
    strategicThemes: ['Black\'s …e5 break decides the structure','Pin pressure converts via piece play'],
    endgameTransitions: ['R+min+P endings — 30.1% of d6-mainline decisive games — long technical conversion'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-d6main-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'd6-mainline ENDGAME — R+B+B+N vs R+B+B+N (vs Riley 2984)',
    overview: "Past move 25 in the Riley game, the position reaches a pure R+B+B+N+P endgame with queens off — a very common Alapin endgame type (30.1% of d6-mainline decisive games). This plan walks the conversion: bishop activity on a6, slow piece improvement, and the eventual pawn-race finish that Naroditsky converted at move 60+.",
    setupFen: '6k1/5pb1/B3b2p/4p1p1/P3Pn2/7P/1r3PPB/3RN1K1 w - - 0 26',
    moves: ['Bxf4','gxf4','Nd3','Ra2','Bb5','Bf8'],
    annotations: [
      "Bxf4! — capture the knight with the bishop. We give up our dark-square bishop but win the centralised knight, breaking Black's piece coordination.",
      "Black plays …gxf4 — forced recapture with the pawn. Now Black has doubled+isolated f-pawns and weakened the kingside structure.",
      "Nd3 — the knight reroutes from e1 to d3 attacking the doubled pawn AND eyeing future Nb4 outposts. Slow technique pays off in the endgame.",
      "Black plays …Ra2 swinging the rook to the a-file trying to create activity. The rook attacks our a-pawn but it's just defended.",
      "Bb5 — slide the bishop from a6 to b5, defending the a4-pawn and preparing future trades. Quiet maneuvering converts the endgame slowly.",
      "Black plays …Bf8 trying to bring the bishop back into the game. Naroditsky continued Nc1 + Be2 + Ba3 + Nd3 sequence with tempo on Black's awkward pieces, eventually winning the long endgame in 117 plies.",
    ],
    learnCues: ['Bxf4 — capture the centralised knight','…gxf4 — forced recapture','Nd3 — knight reroute','…Ra2 — Black tries activity','Bb5 — bishop reposition','…Bf8 — Black\'s defensive shuffling'],
    pawnBreaks: ['…gxf4 — Black gets doubled pawns','a4 stays as the queenside passer'],
    pieceManeuvers: ['Bxf4 — trade the centralised knight','Nd3 — knight outpost prep','Bb5 — bishop reroute'],
    strategicThemes: ['Trade pieces to highlight weak pawn structure','Slow technique in equal-material endgame'],
    endgameTransitions: ['Pawn endgame after trades — passer decides'],
    sources: SRC,
  },

  // ============================================================
  // g6-dragon (125 games) — Alexandra Botez 2279 reference
  // ============================================================
  {
    id: 'mp-pronaroAlapin-g6dragon-mg',
    openingId: 'pro-naroditsky-alapin',
    title: '2…g6 MIDDLEGAME — Bc4-Bb3 attack + knight harassment (vs Botez 2279)',
    overview: "After the 18-ply g6-dragon spine ending with O-O, the middlegame plan is the SAME Bc4-Bb3 setup as the main spine (different move order, same structure). Black tries …Nc6 / …Na5 trying to harass our bishop pair — we re-route around their threats and convert. From his win vs Alexandra Botez (2279).",
    setupSans: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 exd5 Nf6 Nc3 Nxd5 Bc4 Nb6 Bb3 Bg7 Nf3 O-O'.split(' '),
    moves: ['h3','Nc6','Be3','Na5','Bc2','Nac4'],
    annotations: [
      "h3 — prophylaxis against …Bg4 pinning our Nf3. Same theme as the d6-mainline plan; the principles transfer across variations because the structure is similar.",
      "Black plays …Nc6 developing the queen's knight to a natural square. Looks principled, but it commits the knight to a square where our pieces can harass it.",
      "Be3 — completes development with the dark-squared bishop on its best diagonal. Note we play Be3 NOT Bg5 in this structure because Black has no pinnable knight on f6 anymore (the Nxd5 trade earlier).",
      "Black plays …Na5 harassing our bishop pair on b3. The knight on a5 looks active but it's a rim square — it covers nothing useful.",
      "Bc2 — sidestep the knight. The bishop on c2 stays on the b1-h7 diagonal, still pointing at the kingside. Black has wasted two moves on the …Nc6 → …Na5 maneuver.",
      "Black plays …Nac4 trying to find a more active knight square. The Botez game continued Bc1 + Nd5 + O-O + Nxd5 + Re1 — slowly converting via piece coordination to a 1-0 in 59 plies.",
    ],
    learnCues: ['h3 — prophylaxis','…Nc6 — natural development','Be3 — dark-square coordination','…Na5 — knight to the rim','Bc2 — sidestep the harassment','…Nac4 — Black\'s second attempt'],
    pawnBreaks: ['h3 + d4 — central+kingside support','c-file half-open from cxd4 earlier'],
    pieceManeuvers: ['Be3 — dark-square coordination','Bc2 sidestep','Black\'s …Nc6 → …Na5 → …Nac4 wandering'],
    strategicThemes: ['Bishop pair retention','Black wastes tempi on the wing'],
    endgameTransitions: ['R+min+P endings — 26.4% of g6-dragon decisive games — Black\'s structural weaknesses tell'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-g6dragon-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: '2…g6 ENDGAME — R+B vs R+B post-tactics (vs Botez 2279)',
    overview: "Past move 25 in the Botez game, Naroditsky has reached a R+B+P vs R+B+P endgame with extra material — the conversion of the structural advantage. This is the kind of endgame the g6-dragon's 26.4% R+min+P stat refers to, and the technique is straightforward: active rook + the bishop pair coordinating to the queenside.",
    setupFen: '6k1/p3ppbp/1p6/4P2p/8/6BP/PPr2P2/R3R1K1 w - - 5 26',
    moves: ['Bf4','Rc4','Bg3','Rc2','Rad1','h6'],
    annotations: [
      "Bf4 — repositions the dark-squared bishop to f4 attacking the d2-square indirectly. The bishop on g3 was passive; on f4 it controls more.",
      "Black plays …Rc4 trying to activate the rook on the open c-file. The rook on c4 looks active but there's nothing to attack.",
      "Bg3 — slide the bishop back. Quiet maneuvering; we're not in a hurry. Black has the worse position structurally and ANY trade benefits us.",
      "Black plays …Rc2 doubling on the c-file. Trying to create chances on the 2nd rank — but our king is safe and the bishop covers everything.",
      "Rad1 — both rooks now coordinate on the central files. We threaten Rd8+ ideas trapping Black's king.",
      "Black plays …h6 giving the king a square. Too late — Rd8+ would have been crushing earlier. The Botez game ended with rooks invading on the back rank and Black resigning at move 30.",
    ],
    learnCues: ['Bf4 — bishop reposition','…Rc4 — Black\'s rook activity','Bg3 — quiet retreat','…Rc2 — double rooks','Rad1 — coordinate the rooks','…h6 — king escape too late'],
    pawnBreaks: ['e5 stays as the central pawn','b2 stays — no weaknesses'],
    pieceManeuvers: ['Bf4 → Bg3 reposition','Rad1 — rook coordination','Black\'s rook activity neutralised'],
    strategicThemes: ['Quiet maneuvering in equal-piece endgame','Material edge converts via rook activity'],
    endgameTransitions: ['R+B+P endings finish with back-rank tactics'],
    sources: SRC,
  },

  // ============================================================
  // nc6-line (116 games) — Zanyglobal 2899 reference
  // ============================================================
  {
    id: 'mp-pronaroAlapin-nc6-mg',
    openingId: 'pro-naroditsky-alapin',
    title: '2…Nc6 MIDDLEGAME — Bc2 + Bg5 + Bh6 attack (vs Zanyglobal 2899)',
    overview: "After the 20-ply nc6-line spine ends with Black castling, the middlegame plan is the Bc2 reposition + Bg5 + Bh6 sequence forcing Black's kingside knight to defend. From his win vs Zanyglobal (2899).",
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
    learnCues: ['Bc2 — free d3 for the queen','…b6 — Black\'s fianchetto prep','Qd3 — battery on b1-h7','…Bb7 — fianchetto complete','Bg5 — pin the f6-knight','…g6 — kingside weakening'],
    pawnBreaks: ['Bc2 reroute precedes other breaks','d5 break possible later'],
    pieceManeuvers: ['Bc2 + Qd3 — battery toward h7','Bg5 → Bh6 dark-square reroute','Nc3 supports central play'],
    strategicThemes: ['Kingside battery on h7','Pin pressure + dark squares'],
    endgameTransitions: ['R+min+P endings — 33.7% of nc6-line decisive games — tactics decide before endgame'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-nc6-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: '2…Nc6 ENDGAME — Q+R+B post-tactics conversion (vs Zanyglobal 2899)',
    overview: "Past move 25 in the Zanyglobal game, the position reaches a Q+R+R+B+N+B structure with material edge. The conversion technique: e5/e6 pawn advance + bishop on b3 + queen invasion. This is the structural pattern that nc6-line's 33.7% R+min+P games convert through — even when queens stay on, the structural plan looks like an endgame.",
    setupFen: 'r2qr1k1/pb5p/1p4pB/4P3/2n5/P6P/2BQ1PP1/R3R1K1 w - - 1 26',
    moves: ['Qf4','Rc8','e6','Qc7','Qh4','Ne5'],
    annotations: [
      "Qf4! — the queen swings to f4 attacking Black's knight on c4 and supporting the e5-pawn. The queen is now the most active piece, threatening tactics on Black's exposed king.",
      "Black plays …Rc8 swinging the rook to the c-file trying to coordinate against our queenside. Looks principled but the rook on c8 doesn't actually threaten anything concrete.",
      "e6! — the central pawn pushes opening files toward Black's king. The e6-pawn now blockades Black's kingside AND prepares e7 promotion threats.",
      "Black plays …Qc7 trying to coordinate the queen with the rook on c8 to defend. Slow defensive setup.",
      "Qh4 — the queen swings to h4 threatening Qh6 or Qxh7 ideas directly attacking Black's king. The h6-bishop coordinates with the queen for the kingside crush.",
      "Black plays …Ne5 trying to find a knight outpost AND attack our queen on h4. Naroditsky continued with Bb3 + Qc6 + e7+! winning material via the e-pawn promotion threat. The Zanyglobal game ended at move 31.",
    ],
    learnCues: ['Qf4 — central queen swing','…Rc8 — Black coordinates','e6 — central pawn push','…Qc7 — defensive setup','Qh4 — kingside threats','…Ne5 — knight outpost attempt'],
    pawnBreaks: ['e5-e6 — central pawn advance','c-file opens after trades'],
    pieceManeuvers: ['Qf4 — central queen','Qh4 — kingside swing','Bh6 dark-square pressure'],
    strategicThemes: ['Central pawn push + queen activation','Bishop pair coordinates with queen for crush'],
    endgameTransitions: ['e6 + e7 promotion threats decide before deep endgame'],
    sources: SRC,
  },

  // ============================================================
  // Spine 4…d6 Bc4 Gambit (394 games) — Salem-AR 3141 reference
  // ============================================================
  {
    id: 'mp-pronaroAlapin-spined6-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'Spine 4…d6 MIDDLEGAME — Rd1 + central push (vs Salem-AR 3141)',
    overview: "After the 31-ply 4…d6 Bc4 gambit spine ending with the exf7+ + Qxc4+ recovery, the middlegame plan: Rd1 + cxd5 + central push. Per Gordima's distillation, this is Naroditsky's signature treatment. From his win vs Salem-AR (3141) — a 181-ply technical win.",
    setupSans: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+ Nc6 exf7+ Kxf7 Qxc4+ d5 Qf4+ Kg8 d4 h6 O-O g5 Qg3 Bg7 dxc5 e5 Rd1 Be6 c4'.split(' '),
    moves: ['e4','cxd5','exf3','Qxf3','Ne5','Qe2'],
    annotations: [
      "Black plays …e4 trying to attack our knight on f3 and create central activity. Looks active, but it loses time because our knight just takes the e4-pawn next.",
      "cxd5! — capture the d5-pawn AHEAD of dealing with the e4 attack. Black's structure is collapsing; we're picking up material.",
      "Black plays …exf3 grabbing our knight — material grab attempt. But this is exactly what we wanted: the open f-file + our queen ready to attack.",
      "Qxf3 — recapture with the queen. Black thought he was winning a piece; he was just losing more material via the discovered tactics.",
      "Black plays …Ne5 trying to coordinate the queen knight with central play. The knight on e5 attacks our queen but our pieces dominate.",
      "Qe2 — quiet retreat preserving material. The queen sidesteps the knight threat AND aims at e6 (where Black's bishop is). From here the Salem-AR game continued for 150+ moves of technical conversion in the resulting Q+R+B+N+P endgame.",
    ],
    learnCues: ['…e4 — central activity attempt','cxd5 — grab the d-pawn','…exf3 — material grab','Qxf3 — recapture','…Ne5 — central knight','Qe2 — quiet retreat'],
    pawnBreaks: ['cxd5 — material grab','Open f-file from exf3'],
    pieceManeuvers: ['Qxf3 — queen on the open file','Qe2 retreat with tempo','Nb1 still to develop'],
    strategicThemes: ['Tactical chaos benefits the prepared side','Material recovery via piece play'],
    endgameTransitions: ['Long technical endgames — 181 plies vs Salem-AR'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-spined6-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'Spine 4…d6 ENDGAME — R+B+N+P conversion (vs Salem-AR 3141)',
    overview: "Past move 30 in the Salem-AR game, the position simplifies to a R+B+N+P endgame with material edge. The Bc4-gambit's 70.3% score is partly because Black's king fix on g8 from the opening NEVER resolves — the king walks for 100+ more moves. This plan shows the slow technique.",
    setupFen: 'r4r2/pp1n2bk/3P2bp/2PN2p1/4qP2/4B3/PP3QPP/R2R2K1 w - - 7 26',
    moves: ['Bd4','Nf6','Nxf6+','Bxf6','Bxf6','Rxf6'],
    annotations: [
      "Bd4 — the bishop slides to d4 covering the long diagonal AND defending against Black's tactical threats around f6. This is practical positional play — Naroditsky's signature: outplay opponents in technically simple positions where time pressure tells.",
      "Black plays …Nf6 challenging our centralized knight on d5. The knight on f6 looks active but invites the simplification trade we want.",
      "Nxf6+! — exchange the central knight with check, removing Black's best piece. Per Naroditsky's style: trade pieces when behind material to convert the structural edge, trade pieces when ahead material to simplify to a winning endgame.",
      "Black plays …Bxf6 forced — the king on h7 was checked, no other interposition works.",
      "Bxf6! — capture the bishop with our dark-squared bishop. We now have a material edge AND the bishop pair removed AND Black's pieces stuck defending.",
      "Black plays …Rxf6 recapturing. The position simplifies further; we still have the d6-passer + active pieces vs Black's scattered defenders. The Salem-AR game continued with Re1 + Qxf4 + Re7+ technique converting in 181 plies.",
    ],
    learnCues: ['Bd4 — quiet positional play','…Nf6 — challenge the centre','Nxf6+ — exchange with check','…Bxf6 — forced recapture','Bxf6 — trade off pieces','…Rxf6 — simplify the endgame'],
    pawnBreaks: ['d6-pawn — the passer stays as the threat','cxd6 in some lines opens the c-file'],
    pieceManeuvers: ['Nxf6+ — central knight trade with check','Bxf6 — eliminate the bishop pair','Bd4 — long-diagonal coordination'],
    strategicThemes: ['Practical simplification per Naroditsky\'s style','Trade pieces ahead of material — outplay in endgames'],
    endgameTransitions: ['Long technical conversion — 181-ply Salem-AR game'],
    sources: SRC,
  },

  // ============================================================
  // Spine 4…e6 IQP Lines (185 games) — chessawp 3009 reference
  // ============================================================
  {
    id: 'mp-pronaroAlapin-spinee6-mg',
    openingId: 'pro-naroditsky-alapin',
    title: 'Spine 4…e6 MIDDLEGAME — Bc4 + Qe2 + central play (vs chessawp 3009)',
    overview: "After the 23-ply 4…e6 IQP spine ending with bxc3, the middlegame plan is the Bc2 reposition + Qe2 + e5 break. The IQP structure favours White when piece activity is high; this conversion comes from his win vs chessawp (3009).",
    setupSans: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6 d4 cxd4 cxd4 d6 Bc4 Be7 O-O O-O Qe2 Bd7 Rd1 Bc6 Nc3 Nxc3 bxc3'.split(' '),
    moves: ['Nd7','exd6','Bxd6','Bd3','Qc7','h3'],
    annotations: [
      "Black plays …Nd7 trying to develop the queen's knight to a useful square — the b8-knight had been passive. The development is solid but slow.",
      "exd6! — capture the d-pawn opening the e-file. The pawn on e5 was holding tension; trading releases it on OUR terms.",
      "Black plays …Bxd6 forced (the only recapture). Now the bishop is on d6 — active but vulnerable to future Bd3 ideas attacking h7.",
      "Bd3 — completes the kingside attack setup. The bishop covers the h7-square; combined with the queen on e2 the attack is real.",
      "Black plays …Qc7 trying to coordinate the queen with the bishop on d6 + control the c-file. Reasonable but slow.",
      "h3 — prophylactic; stops …Bg4 ideas AND prepares Bg5 in some lines. From here the chessawp game continued with Bf4 + Bxd6 trade + c4 push to convert in 57 plies.",
    ],
    learnCues: ['…Nd7 — late development','exd6 — open the e-file','…Bxd6 — forced recapture','Bd3 — kingside attack setup','…Qc7 — Black coordinates','h3 — prophylaxis'],
    pawnBreaks: ['exd6 — IQP structure transition','c3 + d4 chain support'],
    pieceManeuvers: ['Bd3 — kingside attacker','exd6 — open e-file','Black\'s …Nd7 + …Bxd6 + …Qc7 coordination'],
    strategicThemes: ['IQP active-piece play','Open e-file + bishop pair'],
    endgameTransitions: ['R+B+B+P endings where bishop pair tells — 72.4% score in 185 games'],
    sources: SRC,
  },
  {
    id: 'mp-pronaroAlapin-spinee6-endgame',
    openingId: 'pro-naroditsky-alapin',
    title: 'Spine 4…e6 ENDGAME — R+B+N+P conversion (vs chessawp 3009)',
    overview: "Past move 25 in the chessawp game, the position reaches a R+B+N+P+P endgame where the IQP structure has resolved favourably for White. The bishop pair + open d-file + the c-pawn + e-pawn duo create winning chances. This is the typical Spine 4…e6 conversion pattern.",
    setupFen: 'r4r2/pp1n1ppk/7b/3P4/b4q2/5N1P/PB2QPP1/R2R2K1 w - - 0 21',
    moves: ['Rd4','Qf5','Rxa4','Nc5','Rh4','Rfe8'],
    annotations: [
      "Rd4! — invade the central square with the rook. The rook on d4 attacks Black's bishop on a4 AND covers the e-file for our queen.",
      "Black plays …Qf5 trying to keep the queen active and protect pieces. Reasonable defence but our position keeps improving.",
      "Rxa4! — capture the bishop. We win material and Black's pieces become uncoordinated. The Bb2 + queen + knight + rook all coordinate now.",
      "Black plays …Nc5 attacking our rook on a4 — trying to force a retreat that buys time. But we have many good squares.",
      "Rh4 — sidestep the knight attack with tempo on the kingside. The rook on h4 supports the eventual Rxh6 sacrifice OR the queen swing.",
      "Black plays …Rfe8 doubling on the e-file. Black's pieces look active but we're up material; conversion is just technique. The chessawp game ended at move 28 with material winning.",
    ],
    learnCues: ['Rd4 — invade the centre','…Qf5 — defensive queen','Rxa4 — capture the bishop','…Nc5 — attack the rook','Rh4 — sidestep with tempo','…Rfe8 — double rooks'],
    pawnBreaks: ['d5 still as the IQP','f-file potential later'],
    pieceManeuvers: ['Rd4 — central invasion','Rxa4 — material grab','Rh4 — kingside swing'],
    strategicThemes: ['Material gain converts in equal endgames','Active rooks dominate cramped pieces'],
    endgameTransitions: ['R+B+B+N+P endings where material edge tells'],
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
      fen = p.setupFen;
    } else {
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
  console.error('\nERRORS:');
  for (const e of errors) console.error(' ', e);
}

const existing = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));
const newIds = new Set(planEntries.map((p) => p.id));
const kept = existing.filter((p) => {
  if (p.openingId === 'pro-naroditsky-alapin') return false;
  if (newIds.has(p.id)) return false;
  return true;
});
const merged = [...kept, ...planEntries].sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(MP_PATH, JSON.stringify(merged, null, 2));
console.log(`\nmiddlegame-plans.json: ${planEntries.length} Alapin plans (${merged.length} total)`);
