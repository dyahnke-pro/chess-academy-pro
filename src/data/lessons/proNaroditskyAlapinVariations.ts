import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky Alapin — per-variation lessons at FULL G9.1 DEPTH.
// Each variation walks the aggregate spine from his real chess.com
// games (game counts cited per ply) + key middlegame inflection +
// endgame structure. Two-register narration on every beat (full `say`
// + ≤8-word `sayShort`). Sources reference the voice corpus at
// data/sources/danielnaroditsky-voice/per-opening/alapin.md.
//
// Spine PGNs are pulled from data/sources/danielnaroditsky-deep/
// alapin-sicilian-<variation>.json. Game-count / score numbers are
// from those files + wider-corpus-endgame-alapin.mjs output. No move
// is invented — every continuation is what the data shows.

const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR',
  'https://www.chess.com/openings/Alapin-Sicilian-Defense',
  'https://en.chessbase.com/post/svitlana-demchenko-silence-the-sicilian-win-with-the-alapin-variation-2-c3',
];

// ============================================================
// 2...d5 Open Variation — 783 games, his second-most-played reply.
// Spine 25 plies. Score 66.3% — his lowest of the major lines because
// Black gets a Scandinavian-like simplification but White still has
// the bishop pair + Nb5 outpost.
// ============================================================
const D5_OPEN: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "2…d5 Open Variation — Nb5 outpost + bishop pair",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd5-open',
      moves: 'e4 c5 c3 d5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: SOFT }],
      say: "2…d5 — Black's most principled try, 783 games of his 2,752-game Alapin corpus. The idea: trade away the e4-pawn before White finishes setup, denying him the queenside-crawl plan that wins 73.8% in the main spine. Black gets a Scandinavian-style game; we accept simplification because the structure still favours us.",
      sayShort: '…d5 — Black\'s principled try.',
    }),
    b({
      id: 'd5-exchange',
      moves: 'e4 c5 c3 d5 exd5 Qxd5',
      arrows: [{ from: 'e4', to: 'd5', color: ATK }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "exd5 Qxd5 — forced sequence. The queen on d5 looks active but it's exposed to a tempo-gaining Nc3 once we develop. Black scored only 33.7% AGAINST him in this line — the queen-out simplification doesn't equalise as cleanly as it looks.",
      sayShort: 'exd5 — queen comes to d5, exposed.',
    }),
    b({
      id: 'd5-d4',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say: "d4 — the move c3 was setting up since move two. Black's c5 is now an isolated soldier; if Black takes with …cxd4 we recapture and have the classical centre. The d4 push doesn't ATTACK anything yet, but it forces Black to commit.",
      sayShort: 'd4 — claim the classical centre.',
    }),
    b({
      id: 'd5-nf6',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3',
      arrows: [{ from: 'g1', to: 'f3', color: VIS }],
      highlights: [{ square: 'f3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Black develops Nf6 attacking nothing in particular. Our Nf3 defends d4 AND prepares Be2/Bc4 — the queen on d5 can't bother us because we haven't put anything on the long diagonal yet. Patience pays off.",
      sayShort: 'Nf3 — develop, defend d4.',
    }),
    b({
      id: 'd5-e6-na3',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3',
      arrows: [{ from: 'b1', to: 'a3', color: VIS }, { from: 'a3', to: 'b5', color: ATK }],
      highlights: [{ square: 'a3', color: KEY }, { square: 'b5', color: SOFT }],
      say: "Na3!? — the move that defines his treatment. Most players develop Nbd2 here; Danya prefers Na3 because the knight is heading to b5 attacking the queen and grabbing the c7 prize square. The knight on a3 isn't passive — it's en route.",
      sayShort: 'Na3 — knight heads for b5.',
    }),
    b({
      id: 'd5-be3',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3',
      arrows: [{ from: 'c1', to: 'e3', color: VIS }],
      highlights: [{ square: 'e3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Be3 supports d4 and adds central pressure. Black's Nc6 hits d4 too; we're balanced. From here Black's options narrow — the cxd4 trade is forced or near-forced, and the Nb5 jump arrives next.",
      sayShort: 'Be3 — reinforce the centre.',
    }),
    b({
      id: 'd5-nb5',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5',
      arrows: [{ from: 'a3', to: 'b5', color: ATK }, { from: 'b5', to: 'd4', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'd4', color: ATK }, { square: 'c7', color: SOFT }, { square: 'd6', color: SOFT }],
      say: "Nb5! — the trip pays off. The knight attacks the d4-pawn AND threatens the c7 + d6 outpost squares. Black has to defend d4 OR move the queen off d5 (where Nbxd4 next would attack her). Either way we're already winning the opening battle.",
      sayShort: 'Nb5 — attack d4, threaten c7.',
    }),
    b({
      id: 'd5-qd7',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7',
      highlights: [{ square: 'd7', color: KEY }],
      say: "Qd7 retreats — the queen blocks Bd7 development, the Bf8 is locked in. White hasn't won material yet but has won three tempi against Black's structure. The next sequence consolidates: Nbxd4 (recapture) + Nxc6 (trade) + bishop pair lives.",
      sayShort: 'Qd7 — queen retreats, tempo gained.',
    }),
    b({
      id: 'd5-recapture',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nbxd4 Be7 Nxc6 Qxc6 Ne5',
      arrows: [{ from: 'f3', to: 'e5', color: ATK }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Nbxd4 / Be7 / Nxc6 / Qxc6 / Ne5 — the trade sequence that opens the position. Both Black knights are off; our knight lands on e5 attacking the queen on c6 AND eyeing f7. Black is technically equal in material but the pieces are uncoordinated.",
      sayShort: 'Ne5 — central outpost, hit the queen.',
    }),
    b({
      id: 'd5-bb5',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nbxd4 Be7 Nxc6 Qxc6 Ne5 Qe4 Bb5+',
      arrows: [{ from: 'f1', to: 'b5', color: ATK }, { from: 'b5', to: 'e8', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'e8', color: ATK }],
      say: "After Qe4 we play Bb5+! — discovered attack the queen no longer defends e4, and the bishop check forces Kf8 (the only block). Black's king sits awkwardly on f8 for the rest of the game. 66.3% score in 783 games here, with the structural edge converting in the R+minor+P endgame (27% of decisive games).",
      sayShort: 'Bb5+ — fix Black\'s king on f8.',
    }),
  ],
};

// ============================================================
// 2...e6 French-style — 344 games, 74.0% score. Black plays a
// French-style …e6/…d5 setup; White cramps with e5 and plays the
// queenside-attack formation. Spine 19 plies.
// ============================================================
const E6_FRENCH: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "2…e6 French-Style — e5 cramp + kingside attack",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e6-open',
      moves: 'e4 c5 c3 e6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "2…e6 — Black plays a French-style setup, 344 games of his Alapin corpus and his second-best-scoring variation at 74.0%. Black prepares …d5 to challenge our centre. Our response is the classical d4 + e5 cramp, transposing into French-Advance structures where we know the plans cold.",
      sayShort: '…e6 — French setup invited.',
    }),
    b({
      id: 'e6-d4',
      moves: 'e4 c5 c3 e6 d4 d5 e5',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "d4 d5 e5 — the move-for-move French Advance with the c3-c4 lever available later. Black's kingside is cramped; the f6-square is permanently denied to a knight. This is exactly the structure his speedrun coverage teaches as winning at amateur level.",
      sayShort: 'e5 — cramp the kingside.',
    }),
    b({
      id: 'e6-nc6',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7',
      arrows: [{ from: 'c8', to: 'd7', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }, { square: 'd7', color: SOFT }],
      say: "Black plays …Nc6 + …Bd7 — slow development typical of French Advance positions. The Bd7 will reroute via b5 or a4 toward kingside. White's plan is faster: Bd3 + O-O + Nbd2 then strike at the right moment.",
      sayShort: '…Bd7 — slow French development.',
    }),
    b({
      id: 'e6-bd3',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3',
      arrows: [{ from: 'f1', to: 'd3', color: VIS }, { from: 'd3', to: 'h7', color: ATK }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: ATK }],
      say: "Bd3 — the kingside attacker's bishop. Aims at h7 once Black castles, and supports the eventual e5-e6 break. Note we DO NOT play Bb5 here — different structure than the d5-open line, different bishop deployment.",
      sayShort: 'Bd3 — kingside attack lined up.',
    }),
    b({
      id: 'e6-cxd4',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say: "Black plays …cxd4 — the standard French-Advance lever. We're about to recapture and the structure becomes asymmetric: White owns the central pawn duo (d4-e5), Black has only the d5 pawn. The cramping pays off the rest of the game.",
      sayShort: '…cxd4 — Black liquidates the c-file.',
    }),
    b({
      id: 'e6-oo',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O',
      arrows: [{ from: 'e1', to: 'g1', color: VIS }],
      highlights: [{ square: 'g1', color: KEY }, { square: 'd4', color: SOFT }],
      say: "O-O! — castle FIRST, recapture later. The d4 pawn is briefly hanging but Black can't win it without disaster: …dxc3 invites Nxc3 with massive activity. He plays the pragmatic king-safety-first approach 32% of the time at this position.",
      sayShort: 'O-O — castle first, recapture later.',
    }),
    b({
      id: 'e6-dxc3',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O dxc3 Nxc3',
      arrows: [{ from: 'b1', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'd5', color: ATK }],
      say: "Black grabs the pawn with …dxc3 and we recapture Nxc3 — now we have the open c-file PLUS the open b-file PLUS a development advantage. The pawn is a small price; the pieces all aim at Black's queenside king or central d5 weakness.",
      sayShort: 'Nxc3 — open lines for activity.',
    }),
    b({
      id: 'e6-a6',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O dxc3 Nxc3 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "Black plays …a6 stopping Nb5 (the move that won in the d5-open line). Without that resource White's queenside attack is slower — but the central pawn duo + open c-file + bishop pair STILL combine into a long-term edge.",
      sayShort: '…a6 — stop Nb5 resources.',
    }),
    b({
      id: 'e6-re1',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O dxc3 Nxc3 a6 Re1',
      arrows: [{ from: 'f1', to: 'e1', color: VIS }],
      highlights: [{ square: 'e1', color: KEY }, { square: 'e6', color: ATK }],
      say: "Re1 — rook to the open e-file, eyes the e6-pawn that's now permanently weak. Combined with Bd3 + Nc3 we have a textbook kingside-attack setup: every piece points at Black's king position once he castles, and the structure says we'll never run out of ideas.",
      sayShort: 'Re1 — e-file for the attack.',
    }),
    b({
      id: 'e6-ng5',
      moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Bd7 Bd3 cxd4 O-O dxc3 Nxc3 a6 Re1 Bc5 Ng5',
      arrows: [{ from: 'f3', to: 'g5', color: ATK }, { from: 'g5', to: 'f7', color: VIS }],
      highlights: [{ square: 'g5', color: KEY }, { square: 'f7', color: ATK }],
      say: "After …Bc5 Black tries to coordinate, but Ng5! threatens Nxf7 + multiple kingside tactics. Black has to give up the bishop pair with …Bxg5 or weaken with …h6. Either way White converts the structural + piece-coordination edge. 74.0% score across 344 games in this exact line.",
      sayShort: 'Ng5 — threats on f7.',
    }),
  ],
};

// ============================================================
// 2...d6 Mainline — 173 games, 80.6% score (his BEST scoring line in
// the Alapin). Black plays a Najdorf-avoiding setup, White transposes
// into a KID-reversed structure with the extra tempo. Spine 17 plies.
// ============================================================
const D6_MAINLINE: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "2…d6 Mainline — KID-reversed + slow kingside attack",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd6-open',
      moves: 'e4 c5 c3 d6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'c5', color: SOFT }],
      say: "2…d6 — Black tries to keep options open, refusing to commit to d5 OR Nf6. 173 games here, but his score is 80.6% — the HIGHEST of any Alapin variation. Why? Because Black's quiet treatment lets White set up the dream classical centre without resistance.",
      sayShort: '…d6 — Black plays passively.',
    }),
    b({
      id: 'd6-d4',
      moves: 'e4 c5 c3 d6 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: SOFT }],
      say: "d4 immediately — the dream move. Unlike the d5-open line where d4 has to wait, here Black hasn't challenged the centre so we just claim it. The c3-pawn supports d4 for the rest of the game.",
      sayShort: 'd4 — claim the centre now.',
    }),
    b({
      id: 'd6-cxd4',
      moves: 'e4 c5 c3 d6 d4 cxd4 cxd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "cxd4 cxd4 — Black trades on d4 hoping for simplification. We recapture with the c-pawn (NOT the queen) because that keeps the central pawn duo + opens the c-file for our rook. Two structural advantages from one trade.",
      sayShort: 'cxd4 — open the c-file.',
    }),
    b({
      id: 'd6-nf6',
      moves: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6',
      highlights: [{ square: 'g6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "Black develops …Nf6 + …g6 — committing to a King's Indian-style fianchetto. We've reached a KID-reversed structure where WE have the extra tempo. Every plan that wins for Black in the KID, wins for White here with one move more.",
      sayShort: '…g6 — KID setup, we have +1 tempo.',
    }),
    b({
      id: 'd6-h3',
      moves: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6 h3',
      arrows: [{ from: 'h2', to: 'h3', color: VIS }, { from: 'g4', to: 'g4', color: SOFT }],
      highlights: [{ square: 'h3', color: KEY }],
      say: "h3 — his 18% pick at this position, the highest of any move. The prophylaxis is critical: stops …Bg4 pinning our Nf3 (which we haven't played yet) AND prepares an eventual g4 kingside expansion. Slow but principled.",
      sayShort: 'h3 — prophylaxis + g4 prep.',
    }),
    b({
      id: 'd6-bg7',
      moves: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6 h3 Bg7 Nf3',
      highlights: [{ square: 'g7', color: KEY }, { square: 'f3', color: SOFT }],
      say: "…Bg7 / Nf3 — both sides complete development. Note the bishop on g7 has nothing to attack: our d4-pawn is solidly defended. Bg7 will just be a defensive piece for the rest of the game unless Black breaks with …e5, which we prevent next.",
      sayShort: 'Nf3 — finish development.',
    }),
    b({
      id: 'd6-oo',
      moves: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 g6 h3 Bg7 Nf3 O-O Bd3 Nc6 O-O',
      arrows: [{ from: 'e1', to: 'g1', color: VIS }],
      highlights: [{ square: 'g1', color: KEY }, { square: 'd3', color: SOFT }],
      say: "Bd3 + O-O — system completion. White's setup: pawns c3-d4-e4 (centre), pieces Nf3-Nc3-Bd3-Be3-Qd2 typical, rooks coordinate on c-file + d-file. From here the plan is e4-e5 or d4-d5 once Black overcommits — both pushes win at amateur level. 80.6% score with 173 games tells the story.",
      sayShort: 'O-O — system complete, attack on.',
    }),
  ],
};

// ============================================================
// 2...g6 Hyper-Accelerated Dragon — 125 games, 79.6% score. Black
// fianchettoes before committing pieces; White responds with the same
// d4 + Bc4 + Bb3 attacking formation from the main spine. Spine 18 plies.
// ============================================================
const G6_DRAGON: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "2…g6 Hyper-Dragon — d4 + Bb3 attack on the fianchetto",
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'g6-open',
      moves: 'e4 c5 c3 g6',
      highlights: [{ square: 'g6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "2…g6 — Hyper-Accelerated Dragon, 125 games and 79.6% score against him. Black wants the Dragon setup without committing to …d6 first. We don't care — the Alapin structure is the same whatever Black does on move two.",
      sayShort: '…g6 — Dragon setup early.',
    }),
    b({
      id: 'g6-d4',
      moves: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: ATK }],
      say: "d4 cxd4 cxd4 …d5! — Black surprises with a Scandinavian-like central strike. The idea: equalise quickly by trading the d-pawn. We respond exd5 just like in the d5-open line, then transpose into a Panov-style structure.",
      sayShort: '…d5 — Black strikes back.',
    }),
    b({
      id: 'g6-exd5',
      moves: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 exd5 Nf6 Nc3 Nxd5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "exd5 / Nf6 / Nc3 / Nxd5 — the knight on d5 will be chased shortly. We've reached a Panov-Botvinnik style position where d4 is isolated but we have piece activity. This is a fork in his game: 14% pick Nf3, 12% pick Nc3 first.",
      sayShort: 'Nxd5 — knight in the centre.',
    }),
    b({
      id: 'g6-bc4',
      moves: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 exd5 Nf6 Nc3 Nxd5 Bc4',
      arrows: [{ from: 'f1', to: 'c4', color: ATK }, { from: 'c4', to: 'd5', color: VIS }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: ATK }],
      say: "Bc4! — hit the knight on d5 AND eye f7. Same theme as the main spine even though we got here via a totally different move order. Black has to move the knight, and Nb6 (the natural retreat) trades into our hand.",
      sayShort: 'Bc4 — hit d5 AND f7.',
    }),
    b({
      id: 'g6-nb6',
      moves: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 exd5 Nf6 Nc3 Nxd5 Bc4 Nb6 Bb3',
      arrows: [{ from: 'c4', to: 'b3', color: VIS }],
      highlights: [{ square: 'b3', color: KEY }],
      say: "…Nb6 / Bb3 — the bishop slides to the SAME diagonal we use in the main spine. Same aim, same long-term piece, same plan. The Alapin's identity is HOW the pieces end up coordinated, not the specific move order.",
      sayShort: 'Bb3 — bishop on the diagonal.',
    }),
    b({
      id: 'g6-bg7',
      moves: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 exd5 Nf6 Nc3 Nxd5 Bc4 Nb6 Bb3 Bg7 Nf3 O-O',
      highlights: [{ square: 'g7', color: KEY }, { square: 'g1', color: SOFT }],
      say: "…Bg7 / Nf3 / …O-O — both sides complete development. The position resembles a Panov-Botvinnik with the colours swapped: White owns the centre with the isolated d-pawn that's NOT a weakness in piece-active positions. From here White's middlegame plan is Bg5 + Qd2 + Rd1 + central play.",
      sayShort: 'O-O — system complete.',
    }),
  ],
};

// ============================================================
// 2...Nc6 — 116 games, 86.2% score (one of his highest!). Black goes
// for the symmetric Sicilian without …d6 commitment. White transposes
// into a position resembling the d5-open after a forced d5 exchange.
// Spine 20 plies.
// ============================================================
const NC6_LINE: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "2…Nc6 Line — d5 exchange + Nc3 setup",
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nc6-open',
      moves: 'e4 c5 c3 Nc6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "2…Nc6 — 116 games, 86.2% score. The highest-scoring of all his Alapin replies. Black develops a knight without committing the centre yet. We respond with d4 immediately because the position transposes favourably regardless of what Black does next.",
      sayShort: '…Nc6 — Black\'s 86% loss line.',
    }),
    b({
      id: 'nc6-d4',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "d4 / …cxd4 / cxd4 / …d5 / exd5 / …Qxd5 — Black tries the same Scandinavian-style simplification as in the d5-open line, but via a different move order. We end up in a similar structure, except now Black has committed the Nc6 — which limits his options later.",
      sayShort: '…Qxd5 — Scandi simplification.',
    }),
    b({
      id: 'nc6-nf3',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6 Nc3',
      arrows: [{ from: 'b1', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'd5', color: ATK }],
      say: "Nf3 / …e6 / Nc3 — tempo on the queen! Unlike the d5-open line where Na3 was the move, here Nc3 gains tempo directly (the queen on d5 has to move because the knight attacks it). Black retreats with …Qd8 — losing a tempo right out of the opening.",
      sayShort: 'Nc3 — gain a tempo on the queen.',
    }),
    b({
      id: 'nc6-qd8',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6 Nc3 Qd8',
      highlights: [{ square: 'd8', color: KEY }],
      say: "…Qd8 — the only safe square. Now Black's queen is exactly where it started, with two pawn-trade tempi lost. White's pieces are on c3 and f3, Black's queen is back home. This is why the line scores 86.2% — Black's structural disadvantage is severe.",
      sayShort: '…Qd8 — back to start, tempi lost.',
    }),
    b({
      id: 'nc6-bd3',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6 Nc3 Qd8 Bd3 Nf6 O-O Be7 a3',
      arrows: [{ from: 'f1', to: 'd3', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'a3', color: SOFT }],
      say: "Bd3 / Nf6 / O-O / Be7 / a3 — we develop classically and prepare b4 expansion. With Black's queen passive on d8, the bishop pair, and an isolated d4-pawn that's NOT a weakness here (Black's c8-bishop is locked in by …e6), White converts in the long endgame. 33.7% of decisive games here reach R+minor+P — the Alapin's signature endgame.",
      sayShort: 'a3 — prepare b4 expansion.',
    }),
  ],
};

// ============================================================
// Nf6 spine sub-branch — Black's 4...d6 deep variation. 394 games,
// 70.3% (his data) but this is where the WILD lines live. Gambit
// sequence with exf7+! Bb5+ → Bc4 transposition (Gordima's
// distillation: "his Alapin's distinguishing trick").
// ============================================================
const NF6_D6_SUB: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "Spine 4…d6 sub-line — exf7+ gambit + Bc4 transposition",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd6sub-open',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6',
      highlights: [{ square: 'd6', color: KEY }],
      say: "Inside the main 2…Nf6 spine — Black's 4…d6 attempt to challenge the e5-pawn. 394 games on this branch, 70.3% score for him. Per Gordima's distillation, this is where Naroditsky's UNIQUE Alapin treatment lives — the Bb5+ → Bc4 transposition that distinguishes his version from textbook Alapin.",
      sayShort: '…d6 — challenge the e5-pawn.',
    }),
    b({
      id: 'd6sub-bc4',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4',
      arrows: [{ from: 'f1', to: 'c4', color: ATK }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: ATK }],
      say: "Bc4! — hit the knight on d5 AND aim at f7. Black expected dxe5 transposition into safe territory; we ignore the e5-pawn entirely and develop attacking. The whole gambit complex rests on Black mishandling the tactical sequence.",
      sayShort: 'Bc4 — ignore e5, attack instead.',
    }),
    b({
      id: 'd6sub-nb6',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6',
      arrows: [{ from: 'e5', to: 'e6', color: ATK }],
      highlights: [{ square: 'e6', color: KEY }],
      say: "After …Nb6 the e-pawn pushes forward — e6!! The pawn touches f7 and Black has to react. This is the gambit's signature: we sacrifice the bishop or pawn to crack open the king position before Black can develop.",
      sayShort: 'e6 — break Black\'s structure.',
    }),
    b({
      id: 'd6sub-nxc4',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+',
      arrows: [{ from: 'd1', to: 'a4', color: VIS }],
      highlights: [{ square: 'a4', color: KEY }, { square: 'e8', color: ATK }],
      say: "…Nxc4 grabs the bishop, but we play Qa4+! — the check that wins material back. Black has to block with Nc6 (the only reasonable interposition), and now the position is wide open.",
      sayShort: 'Qa4+ — recover the material.',
    }),
    b({
      id: 'd6sub-exf7',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+ Nc6 exf7+',
      arrows: [{ from: 'e6', to: 'f7', color: ATK }],
      highlights: [{ square: 'f7', color: KEY }, { square: 'e8', color: ATK }],
      say: "exf7+! — the pawn sacrifices itself to drag Black's king out. After …Kxf7 Black's king is permanently exposed on f7 and the queen check on c4 wins back the original bishop, plus the king-exposure compensation.",
      sayShort: 'exf7+ — break the king cover.',
    }),
    b({
      id: 'd6sub-qxc4',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+ Nc6 exf7+ Kxf7 Qxc4+',
      arrows: [{ from: 'a4', to: 'c4', color: ATK }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: ATK }],
      say: "Qxc4+ — material recovered, king exposed, two attacking files open. White has lost zero material in the tactical sequence and Black has lost the right to castle. From here Black has to find precise defence; his rating bucket usually doesn't.",
      sayShort: 'Qxc4+ — even material, exposed king.',
    }),
    b({
      id: 'd6sub-d5',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+ Nc6 exf7+ Kxf7 Qxc4+ d5 Qf4+ Kg8 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'g8', color: SOFT }],
      say: "After …d5 / Qf4+ / Kg8 / d4 — White opens the centre and Black's king sits on g8 without a normal pawn shield (the f7-pawn is gone, the e7-pawn next to fall). The d4 push tells the rest of the story: every White piece floods the board, Black drowns.",
      sayShort: 'd4 — flood the open centre.',
    }),
    b({
      id: 'd6sub-rd1',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+ Nc6 exf7+ Kxf7 Qxc4+ d5 Qf4+ Kg8 d4 h6 O-O g5 Qg3 Bg7 dxc5 e5 Rd1 Be6 c4',
      arrows: [{ from: 'f1', to: 'd1', color: VIS }],
      highlights: [{ square: 'd1', color: KEY }, { square: 'c4', color: ATK }],
      say: "The continuation Rd1 + dxc5 + c4 — White's pawn duo controls the central squares and the rook on d1 pins down Black's coordination. 70.3% score in 394 games tells you Black can't navigate this complexity at amateur level. The whole gambit relies on Black missing one precise reply.",
      sayShort: 'Rd1 + c4 — convert the complications.',
    }),
  ],
};

// ============================================================
// Nf6 spine sub-branch — Black's 4...e6. 185 games, 72.4%. Quieter
// reply than 4...d6 — Black plays a French-style …e6 within the main
// Nf6 spine. White transposes into IQP structures. Spine 23 plies.
// ============================================================
const NF6_E6_SUB: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "Spine 4…e6 sub-line — IQP structure + central control",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e6sub-open',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Inside the 2…Nf6 spine — Black's quieter 4…e6 setup. 185 games and 72.4% score for him. Black defends the d5-knight with e6 and prepares solid development. We respond with d4 entering a Panov-Botvinnik-like IQP structure.",
      sayShort: '…e6 — solid defence of d5-knight.',
    }),
    b({
      id: 'e6sub-d4',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6 d4 cxd4 cxd4 d6 Bc4',
      arrows: [{ from: 'f1', to: 'c4', color: ATK }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: ATK }],
      say: "d4 cxd4 cxd4 …d6 / Bc4 — the c-file opens, the bishop comes to its prize square aiming at f7. The d4-pawn is technically isolated but Black can't attack it without giving up the c-file or the king position.",
      sayShort: 'Bc4 — bishop on the f7 diagonal.',
    }),
    b({
      id: 'e6sub-be7',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6 d4 cxd4 cxd4 d6 Bc4 Be7 O-O O-O',
      highlights: [{ square: 'e7', color: KEY }, { square: 'g8', color: SOFT }],
      say: "…Be7 / O-O / O-O — both sides castle quietly. The position is a textbook IQP middlegame: White has central control + active pieces + open files; Black has a solid structure + the isolated-d-pawn target. Plans diverge from here.",
      sayShort: 'O-O — both castle, IQP middlegame.',
    }),
    b({
      id: 'e6sub-qe2',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6 d4 cxd4 cxd4 d6 Bc4 Be7 O-O O-O Qe2',
      arrows: [{ from: 'd1', to: 'e2', color: VIS }],
      highlights: [{ square: 'e2', color: KEY }, { square: 'e6', color: ATK }],
      say: "Qe2 — the queen activates supporting the e-file rook (next move) and aiming at e6. From this position the central pawn break Qe2 + Rd1 + d5! is the long-term winning idea — Black can't stop it without weakening his king.",
      sayShort: 'Qe2 — set up the central break.',
    }),
    b({
      id: 'e6sub-bd7',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6 d4 cxd4 cxd4 d6 Bc4 Be7 O-O O-O Qe2 Bd7 Rd1',
      arrows: [{ from: 'a1', to: 'd1', color: VIS }],
      highlights: [{ square: 'd1', color: KEY }, { square: 'd4', color: SOFT }],
      say: "…Bd7 / Rd1 — Black develops the queen's bishop, we put the rook on the d-file supporting d4 AND preparing d5 break. The structure favours White because EVERY plan (d5 push, Bg5 pin, Ne5 outpost) increases White's pressure while Black's plans (…b5, …Bc6, …Nb6) just shuffle pieces.",
      sayShort: 'Rd1 — rook for the break.',
    }),
    b({
      id: 'e6sub-bc6',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6 d4 cxd4 cxd4 d6 Bc4 Be7 O-O O-O Qe2 Bd7 Rd1 Bc6 Nc3',
      arrows: [{ from: 'b1', to: 'c3', color: VIS }, { from: 'c3', to: 'd5', color: ATK }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'd5', color: ATK }],
      say: "…Bc6 / Nc3 — Black redirects the bishop, we develop the queen knight finally hitting the d5-knight. The whole position rests on Black mismanaging one exchange. 72.4% score across 185 games.",
      sayShort: 'Nc3 — finally hit the d5-knight.',
    }),
    b({
      id: 'e6sub-nxc3',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 e6 d4 cxd4 cxd4 d6 Bc4 Be7 O-O O-O Qe2 Bd7 Rd1 Bc6 Nc3 Nxc3 bxc3',
      arrows: [{ from: 'b2', to: 'c3', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'b1', color: SOFT }],
      say: "…Nxc3 / bxc3 — the knight trade gives us doubled c-pawns but ALSO the open b-file PLUS the bishop pair. Three structural pluses for one minor weakness. The endgame favours White; the middlegame favours White. The line just works.",
      sayShort: 'bxc3 — three pluses for one minus.',
    }),
  ],
};

export const PRO_NARODITSKY_ALAPIN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-alapin::2…d5 Open Variation': D5_OPEN,
  'pro-naroditsky-alapin::2…e6 French-Style': E6_FRENCH,
  'pro-naroditsky-alapin::2…d6 Mainline': D6_MAINLINE,
  'pro-naroditsky-alapin::2…g6 Hyper-Dragon': G6_DRAGON,
  'pro-naroditsky-alapin::2…Nc6 Line': NC6_LINE,
  'pro-naroditsky-alapin::Spine 4…d6 Bc4 Gambit': NF6_D6_SUB,
  'pro-naroditsky-alapin::Spine 4…e6 IQP Lines': NF6_E6_SUB,
};
