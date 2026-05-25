import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_scotch-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const SCOTCH_GAME_VARIATION_LESSONS: Record<string, LessonScript> = {
  "scotch-game::Scotch: Mieses Variation 4...Nf6 (e5 Push)": {
  openingId: "scotch-game",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  title: "Scotch Game — The Mieses Variation",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "mi1", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6", say: "The Mieses is the sharpest, most modern Scotch — the line Kasparov used to put the whole opening back on the map. Black answers Nf6, developing with a hit on the e4-pawn instead of pinning the knight. White must react, and the choice that follows defines the variation.", sayShort: "…Nf6 — the modern Mieses, hitting e4.", arrows: [A("f6", "e4", ATK)], highlights: [H("e4", KEY)] }),
    b({ id: "mi2", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5", say: "Nxc6 bxc6 e5! The point. White trades the proud knight to damage Black's pawns — the doubled c-pawns appear — and then thrusts e5, kicking the f6-knight away and seizing a big space advantage in the centre. Black's structure is compromised; White's pawn on e5 is a thorn.", sayShort: "Nxc6, e5! — wreck the pawns, gain space.", highlights: [H("e5", KEY), H("c6", SOFT)] }),
    b({ id: "mi3", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7", say: "Qe7 — Black's best. Rather than retreat the knight to a sad square, Black pins the e5-pawn to the king down the e-file, forcing White to spend a move propping it. This counterpunch is why the Mieses is so sharp: Black accepts the wrecked structure in return for active, annoying piece play.", sayShort: "…Qe7 — pin the e5-pawn, fight back.", arrows: [A("e7", "e5", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "mi4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4", say: "Qe2 defends the e5-pawn and unpins, Nd5 hops the knight to a fine central square, and c4! challenges it at once. White uses the space to gain tempo, kicking the knight and clamping the queenside. The plan is to keep expanding while Black's doubled c-pawns sit as a long-term target.", sayShort: "Qe2, c4 — defend e5, kick the d5-knight.", highlights: [H("d5", KEY), H("e5", SOFT)] }),
    b({ id: "mi5", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6 b3", say: "Ba6 is the thematic pin — the bishop rakes the a6-f1 diagonal and pressures the c4-pawn, daring White to weaken. b3 calmly props c4 and prepares to fianchetto the dark-squared bishop to a3, where it will hit Black's queen and dark squares. White keeps untangling without conceding the space edge.", sayShort: "…Ba6 b3 — pin meets a calm prop.", arrows: [A("a6", "c4", ATK)], highlights: [H("c4", KEY)] }),
    b({ id: "mi6", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6 b3 g6 Ba3 d6", say: "g6 prepares to fianchetto and blunt White's light squares, Ba3 spears the queen on e7 down the a3-f8 diagonal, and d6 strikes at the e5-spearhead to free the position. We've reached the Mieses tabiya: White enjoys more space and the healthier pawns; Black has the bishop pair and active pieces. A genuinely double-edged modern battleground — exactly why Kasparov trusted it.", sayShort: "Ba3 d6 — space vs the bishop pair.", highlights: [H("e7", KEY), H("d6", SOFT)] }),
  ],
},

  "scotch-game::Scotch Gambit (4.Bc4)": {
  openingId: "scotch-game",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  title: "Scotch Game — The Scotch Gambit",
  minutes: 10,
  orientation: "white",
  beats: [
    b({ id: "sg1", moves: "e4 e5 Nf3 Nc6 d4 exd4 Bc4", say: "The Scotch Gambit — pure romance. Instead of recapturing on d4, White plays Bc4, leaving the pawn alive and slamming the bishop onto the f7-diagonal. The idea is speed: White develops with threats and counts on a lead in development to outweigh a single pawn. The d4-pawn can wait; the initiative cannot.", sayShort: "Bc4 — gambit the pawn, aim at f7.", arrows: [A("c4", "f7", ATK)], highlights: [H("c4", KEY), H("f7", KEY)] }),
    b({ id: "sg2", moves: "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5", say: "Nf6 e5! White doesn't defend e4 — he pushes past it, attacking the f6-knight and grabbing space. Black hits back with d5, the only good move: it forks the c4-bishop and shields the knight. The centre is a tangle of tension, and both sides must play precisely.", sayShort: "e5 d5 — push past, Black forks the bishop.", highlights: [H("e5", KEY), H("d5", KEY)] }),
    b({ id: "sg3", moves: "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4", say: "Bb5 sidesteps the fork and pins the c6-knight; Ne4 grabs an active outpost; and Nxd4 — White finally collects the gambit pawn back, the knight returning to its beloved central square. Material is level again, but White has gained time and a grip on the centre. The 'gambit' was really just a clever move-order to reach a comfortable Scotch.", sayShort: "Bb5, Nxd4 — pin, then regain the pawn.", arrows: [A("b5", "c6", ATK)], highlights: [H("d4", KEY), H("c6", SOFT)] }),
    b({ id: "sg4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O", say: "Bd7 unpins and Bxc6 bxc6 trades into the familiar doubled c-pawns — White's recurring Scotch dividend — before O-O brings the king to safety. White has emerged from the sharp gambit skirmish with the sounder structure and a fully coordinated position, exactly the practical edge the line is built to produce.", sayShort: "Bxc6, O-O — doubled pawns, king safe.", highlights: [H("c6", KEY)] }),
    b({ id: "sg5", moves: "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 Be3 Bxd4", say: "Bc5 develops with a hit on the d4-knight, Be3 defends and offers a trade, and Bxd4 takes it. We've reached the Scotch Gambit tabiya: roughly level material, but White owns the better structure thanks to Black's tripled-up c-pawns and the open lines from the early skirmish. The romantic gambit has matured into a clean, pressable middlegame — the modern verdict on a 19th-century idea.", sayShort: "Bc5 Bxd4 — the tabiya: White presses the structure.", highlights: [H("d4", KEY)] }),
  ],
},

  "scotch-game::Scotch Four Knights (4...Nf6 5.Nc3 Bb4 6.Nxc6 bxc6 7.Bd3 d5)": {
  openingId: "scotch-game",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  title: "Scotch Game — The Four Knights",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "fk1", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3", say: "Against Nf6, White can also play the solid Nc3, defending the e4-pawn and transposing into Scotch Four Knights territory. This is the choice for a player who wants a sound, classical battle rather than the sharp space-grab of the Mieses. Symmetrical development, a clear structure, a long strategic game.", sayShort: "Nc3 — the solid Four Knights, guarding e4.", arrows: [A("c3", "e4", VIS)], highlights: [H("c3", KEY), H("e4", SOFT)] }),
    b({ id: "fk2", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5", say: "Bb4 pins the c3-knight, Nxc6 bxc6 hands Black the doubled c-pawns again, and after Bd3 Black frees himself with d5, the classic central freeing break. Black accepts the slightly worse structure to get rapid development and a compact, solid centre. White will play to prove the doubled pawns matter.", sayShort: "Bb4, d5 — pin, then Black's freeing break.", arrows: [A("b4", "c3", ATK)], highlights: [H("d5", KEY), H("c6", SOFT)] }),
    b({ id: "fk3", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O", say: "exd5 cxd5 O-O O-O — the centre clears and both sides castle. Black has rebuilt a healthy-looking centre with the d5-pawn, but the queenside pawns remain split. The position is solid and near-symmetrical; this is the quiet, manoeuvring face of the Scotch, where small structural facts decide the game over many moves.", sayShort: "exd5 O-O — clear the centre, both castle.", highlights: [H("d5", KEY)] }),
    b({ id: "fk4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5", say: "Bg5 develops with a pin on the f6-knight, increasing the pressure on the d5-pawn and the dark squares. This is the standard plan against the isolated-from-its-brother d5-pawn: pile up on it, trade the defenders, and make the structural weakness tell. Quiet moves, deep purpose.", sayShort: "Bg5 — pin f6, lean on the d5-pawn.", arrows: [A("g5", "f6", ATK)], highlights: [H("f6", KEY)] }),
    b({ id: "fk5", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6 Ne2 Bd6 Ng3 h6", say: "c6 braces d5, Ne2 reroutes the knight toward greener pastures, Bd6 eyes the kingside, and Ng3 lands the knight where it pressures f5 and supports a kingside build-up; h6 makes luft. We've reached the Four Knights tabiya: a balanced, classical middlegame where White probes the hanging d5-pawn and the knight heads for f5. Patience and structure, the strategic heart of the Scotch.", sayShort: "Ne2-g3 — reroute the knight toward f5.", highlights: [H("g3", KEY), H("f5", SOFT)] }),
  ],
},

  "scotch-game::Scotch: Kasparov's Nb3 Line (4...Bc5 5.Nb3)": {
  openingId: "scotch-game",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  title: "Scotch Game — Kasparov's Nb3 Line",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "kb1", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3", say: "Kasparov's own favourite. Against Bc5, instead of defending the knight with Be3, White simply retreats it: Nb3. The point is to sidestep the pin and the trades entirely — the knight nudges the c5-bishop and White keeps a flexible, fully intact position. It's the highest-level treatment of the Classical Scotch.", sayShort: "Nb3 — Kasparov's retreat, dodge the pin.", arrows: [A("b3", "c5", ATK)], highlights: [H("c5", KEY)] }),
    b({ id: "kb2", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6 Nc3 Nf6", say: "Bb6 tucks the bishop onto the safe a7-g1 diagonal, and Nc3 Nf6 sees both sides complete natural development around the e4-pawn. White has avoided every early trade and kept all his pieces — a small, durable edge in flexibility that a great technician can squeeze for fifty moves.", sayShort: "Bb6, Nc3 Nf6 — quiet, flexible development.", arrows: [A("c3", "e4", VIS)], highlights: [H("b6", KEY), H("e4", SOFT)] }),
    b({ id: "kb3", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6 Nc3 Nf6 Qe2 d6 Be3", say: "Qe2 connects the plan — White intends long castling — d6 props the centre, and Be3 offers to trade the dark-squared bishops on b6. Removing Black's good bishop suits White's setup, and the queen on e2 already looks toward the kingside and the coming pawn storm.", sayShort: "Qe2 Be3 — prep O-O-O, offer the bishop trade.", arrows: [A("e3", "b6", VIS)], highlights: [H("b6", KEY)] }),
    b({ id: "kb4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6 Nc3 Nf6 Qe2 d6 Be3 Bxe3 Qxe3 O-O O-O-O", say: "Bxe3 Qxe3 O-O O-O-O — and the battle lines are drawn. White castles queenside and the rook on d1 lines up against the d6-pawn and the half-open d-file. With the kings on opposite wings, this becomes a race: White storms the kingside with his pawns, Black the queenside. Sharp, rich, and exactly the fighting chess Kasparov wanted from a 'quiet' opening.", sayShort: "O-O-O — opposite castling, the race begins.", arrows: [A("d1", "d6", VIS)], highlights: [H("d6", KEY)] }),
    b({ id: "kb5", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6 Nc3 Nf6 Qe2 d6 Be3 Bxe3 Qxe3 O-O O-O-O Be6 f3", say: "Be6 develops and challenges the b3-knight's outpost on c5, and f3 anchors e4 and signals the coming g4-g5 pawn storm against Black's king. We've reached the Nb3 tabiya: opposite-side castling, mutual attacks, White a half-step ahead with the more natural pawn-storm. This is why a World Champion chose the Scotch — the 'simple' opening hides the sharpest of middlegames.", sayShort: "Be6 f3 — anchor e4, prepare the g-pawn storm.", arrows: [A("b3", "c5", INTENT)], highlights: [H("e6", KEY), H("f3", SOFT)] }),
  ],
},

  "scotch-game::Scotch: 4...Qh4 (Steinitz Variation)": {
  openingId: "scotch-game",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  title: "Scotch Game — The Steinitz Qh4",
  minutes: 10,
  orientation: "white",
  beats: [
    b({ id: "st1", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4", say: "The Steinitz Variation — Black's most provocative try: Qh4, lunging the queen out to attack the e4-pawn and eye f2. It looks aggressive, but bringing the queen out this early breaks every opening rule, and White has a crushing refutation that exploits the lady's exposure.", sayShort: "…Qh4 — the provocative early queen sortie.", arrows: [A("h4", "e4", ATK)], highlights: [H("h4", KEY), H("e4", SOFT)] }),
    b({ id: "st2", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nb5", say: "Nb5! The knight leaps in with a double threat — Nxc7+ forking the king and the a8-rook, and a general grip on the dark squares around Black's uncastled king. Black must deal with the c7 fork immediately, and the only way also drops a tempo. The queen sortie is already backfiring.", sayShort: "Nb5! — threatens the Nxc7+ fork.", arrows: [A("b5", "c7", ATK)], highlights: [H("c7", KEY)] }),
    b({ id: "st3", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nb5 Bb4+ Bd2 Qxe4+ Be2", say: "Bb4+ Bd2 Qxe4+ Be2 — Black checks, then grabs the e4-pawn with another queen move, but this is exactly what White wants. The pawn is a poisoned snack: Black has now moved the queen three times and a bishop, developed nothing else, and still can't castle. White blocks with Be2, completing a piece of development while Black's army sleeps.", sayShort: "Bb4+ Qxe4+ Be2 — Black grabs a poisoned pawn.", highlights: [H("e4", KEY), H("e2", SOFT)] }),
    b({ id: "st4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nb5 Bb4+ Bd2 Qxe4+ Be2 Kd8 O-O", say: "Kd8! — the only move. Black cannot castle and must walk the king to d8 by hand to escape the pins and threats. O-O and the contrast is stark: White's king is tucked safely away, every White piece is ready to pour out, and Black's king sits exposed in the centre with the queenside still undeveloped. A pawn means nothing against this.", sayShort: "…Kd8 O-O — Black's king is stuck, White's safe.", highlights: [H("d8", KEY)] }),
    b({ id: "st5", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nb5 Bb4+ Bd2 Qxe4+ Be2 Kd8 O-O Bxd2 Nxd2 Qg6", say: "Bxd2 Nxd2 Qg6 — Black trades the dark-squared bishops and retreats the overworked queen to g6, finally trying to consolidate. But the b5-knight still eyes the c7-fork, the king is stranded on d8, and White is massively ahead in development for a single pawn. This is the Steinitz verdict: the early queen raid hands White a near-winning lead.", sayShort: "Bxd2 Qg6 — Black consolidates a step too late.", arrows: [A("b5", "c7", ATK)], highlights: [H("c7", KEY), H("g6", SOFT)] }),
    b({ id: "st6", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nb5 Bb4+ Bd2 Qxe4+ Be2 Kd8 O-O Bxd2 Nxd2 Qg6 Nf3 Nf6", say: "Nf3 redeploys the knight toward the e5- and g5-outposts where it will harass the stranded king, and Nf6 finally develops a Black piece. We reach the Steinitz tabiya: White a step from converting a huge development lead against a king that never reached safety. The lesson is timeless Steinitz himself would have loved — punish the premature queen with rapid development, not greed.", sayShort: "Nf3 Nf6 — the tabiya: convert the dev lead.", arrows: [A("f3", "e5", INTENT)], highlights: [H("f6", KEY), H("e5", SOFT)] }),
  ],
},
};
