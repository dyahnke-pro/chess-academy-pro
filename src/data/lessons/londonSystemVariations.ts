import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
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

export const LONDON_SYSTEM_VARIATION_LESSONS: Record<string, LessonScript> = {
  "london-system::London vs King's Indian": {
  openingId: "london-system",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
  title: "London System — vs the King's Indian Fianchetto",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "k1", moves: "d4 Nf6 Nf3 g6 Bf4", say: "Against the King's Indian and Grünfeld set-ups, the London is utterly unbothered. Black plays g6 to fianchetto; White just builds the same pyramid. The bishop on f4 stakes the dark squares and rakes toward c7 — refusing Black the dark-square play his whole fianchetto is built around.", sayShort: "Bf4 vs g6 — claim the dark squares.", arrows: [A("f4", "c7", ATK)], highlights: [H("f4", KEY)] }),
    b({ id: "k2", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3", say: "Bg7 e3 d6 h3 — the granite London wall. The pawn on d4 is propped by e3 and soon c3, and h3 takes the g4-square away from Black's pieces. The fianchettoed bishop on g7 glares down the long diagonal, but it simply bites on granite.", sayShort: "e3 h3 — the granite London wall.", highlights: [H("g7", KEY), H("d4", SOFT)] }),
    b({ id: "k3", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3 c5 Be2 Qb6 Qc1", say: "c5 Be2 Qb6 Qc1 — Black probes with c5 and lunges with Qb6, hitting the b2-pawn. Qc1 is the calm reply: it defends b2 and keeps the bishop's diagonal intact. As in the main line, the queen sortie finds no real target.", sayShort: "Qc1 — calmly defend b2.", arrows: [A("b6", "b2", ATK)], highlights: [H("b2", KEY)] }),
    b({ id: "k4", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3 c5 Be2 Qb6 Qc1 O-O O-O Nc6 c3 Be6 Nbd2", say: "O-O O-O Nc6 c3 Be6 Nbd2 — both castle and develop, White completing the set-up with c3 and the knight to d2. This is the heart of the variation: a slow manoeuvring battle where White's rock-solid structure and easy development give a comfortable, risk-free game.", sayShort: "c3 Nbd2 — solid, easy development.", highlights: [H("c3", KEY)] }),
    b({ id: "k5", moves: "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 h3 c5 Be2 Qb6 Qc1 O-O O-O Nc6 c3 Be6 Nbd2 cxd4 exd4 Rac8 Re1 Rfe8 Be3", say: "cxd4 exd4 — White recaptures toward the centre, building a broad d4-pawn centre; the rooks contest the central files and Be3 props d4. White's space and harmonious pieces give the comfortable pull that defines the anti-fianchetto London — exactly how Carlsen ground down Vachier-Lagrave.", sayShort: "exd4 Be3 — broad centre, easy pull.", highlights: [H("d4", KEY), H("e3", SOFT)] }),
  ],
},

  "london-system::Jobava London": {
  openingId: "london-system",
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
  title: "London System — The Jobava (Nc3) Attack",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "j1", moves: "d4 d5 Nc3 Nf6 Bf4", say: "The Jobava London — White throws in an early Nc3, the sharpest and most fashionable London of all. The knight eyes the b5-square and supports a quick e4 break, and with Bf4 already out White makes immediate threats against d5 instead of the usual slow build. This is the line Carlsen used to beat Gukesh in 2025.", sayShort: "Nc3 — the aggressive Jobava.", arrows: [A("c3", "b5", INTENT)], highlights: [H("b5", KEY), H("d5", SOFT)] }),
    b({ id: "j2", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6", say: "e6 Nb5! — the knight leaps in, eyeing the c7-fork against the king and rook and provoking concessions; Na6 has to cover c7. Already on move four White has created concrete problems, something the quiet main-line London never does.", sayShort: "Nb5! — threaten the c7-fork.", arrows: [A("b5", "c7", ATK)], highlights: [H("c7", KEY)] }),
    b({ id: "j3", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 Be7 Nf3 O-O", say: "e3 Be7 Nf3 O-O — White calmly completes the London pyramid behind the advanced pieces while both sides finish developing. The structure is the same trusty London; the difference is the extra aggression the early knight has injected.", sayShort: "e3 Nf3 — the pyramid, with bite.", highlights: [H("e3", KEY)] }),
    b({ id: "j4", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 Be7 Nf3 O-O h4 c6 Nc3 Qb6 a3", say: "h4! — the signature Jobava kingside lunge, gaining space and threatening h5 and Bf4-g5 ideas against the king. The knight drops back to c3 and a3 anchors it. This is sharp, attacking chess the slow London simply cannot offer.", sayShort: "h4! — the Jobava kingside lunge.", highlights: [H("h4", KEY)] }),
    b({ id: "j5", moves: "d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 Be7 Nf3 O-O h4 c6 Nc3 Qb6 a3 c5 Ne5 Bd7 Rh3", say: "c5 Ne5 Bd7 Rh3 — Black challenges the centre, White plants the knight on its dream e5-square eyeing f7, and then Rh3 — the rook lift! — swings the rook to the third rank, aiming at the kingside. That is the whole appeal of the Jobava: a familiar London structure carrying a genuine, dangerous attack.", sayShort: "Ne5, Rh3 — the rook lift attacks.", arrows: [A("e5", "f7", ATK)], highlights: [H("f7", KEY), H("h3", SOFT)] }),
  ],
},

  "london-system::London vs Queen's Pawn": {
    openingId: "london-system", title: "London vs …d5 — the Ne5/f4 attacking grip", minutes: 8, orientation: "white",
    sources: ["concept:pos-outpost", "concept:att-kingside-storm", "https://en.wikipedia.org/wiki/London_System"],
    beats: [
      { id: "lq1", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c5", "c3"], say: "The London wall goes up the same way every game: Bf4 before e3, the c3-support, the f3-knight. Black plays the most natural counter — …c5 and …Nc6 against d4. The London player has seen it a thousand times and knows exactly where the game is going.", sayShort: "c3 — the wall, same as always.", highlights: [{ square: "d4", color: "rgba(80,140,255,0.32)" }, { square: "f4", color: "rgba(255,214,0,0.88)" }] },
      { id: "lq2", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c5", "c3", "Nc6", "Nbd2", "Bd6", "Bg3", "O-O"], say: "…Bd6 offers the trade every London player refuses: Bg3! keeps the dark-squared bishop breathing on the b8-h2 diagonal, and if Black ever takes, the h2-recapture opens the rook's file. The bishop is the attack's engine — never hand it over for free.", sayShort: "Bg3 — never trade the engine.", highlights: [{ square: "g3", color: "rgba(255,214,0,0.88)" }] },
      { id: "lq3", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c5", "c3", "Nc6", "Nbd2", "Bd6", "Bg3", "O-O", "Bd3", "Qe7", "Ne5", "Nd7"], say: "Bd3 aims at h7, and Ne5! plants the knight on the square the whole system is named for — supported by d4 and the f4-bishop's ghost on g3, staring at f7 and d7. Black challenges it with …Nd7 immediately, because leaving it there is losing slowly.", sayShort: "Ne5 — the London knight lands.", arrows: [{ from: "d3", to: "h7", color: "rgba(40,185,95,0.92)" }, { from: "e5", to: "f7", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "e5", color: "rgba(255,214,0,0.88)" }] },
      { id: "lq4", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c5", "c3", "Nc6", "Nbd2", "Bd6", "Bg3", "O-O", "Bd3", "Qe7", "Ne5", "Nd7", "f4", "f5", "Ndf3", "Nf6"], say: "f4! reinforces the knight and declares the plan: a stonewall attack with every piece pointing at Black's king. …f5 blocks the bishop's diagonal at the cost of e5 and e6 forever; Ndf3 re-stacks the knights and Black must find …Nf6 just to breathe. The engine likes White — space, the grip, and the kingside plan write themselves from here.", sayShort: "f4 — the stonewall attack is on.", highlights: [{ square: "e5", color: "rgba(255,214,0,0.88)" }, { square: "f4", color: "rgba(80,140,255,0.32)" }] },
    ],
  },

  "london-system::London vs Grunfeld Setup": {
    openingId: "london-system", title: "London vs the Grünfeld setup — punish the early …c5", minutes: 8, orientation: "white",
    sources: ["concept:pos-space", "concept:pos-development", "https://en.wikipedia.org/wiki/London_System"],
    beats: [
      { id: "lg1", moves: ["d4", "Nf6", "Bf4", "g6", "e3", "Bg7", "Nf3", "d5"], say: "Black tries the Grünfeld recipe against the London: fianchetto plus …d5, planning to hit the centre from the flank. The London doesn't mind — Bf4 sits outside the pawn chain and e3 makes the wall airtight.", sayShort: "…d5 — the Grünfeld try; the wall holds.", highlights: [{ square: "f4", color: "rgba(80,140,255,0.32)" }, { square: "d5", color: "rgba(255,214,0,0.88)" }] },
      { id: "lg2", moves: ["d4", "Nf6", "Bf4", "g6", "e3", "Bg7", "Nf3", "d5", "Be2", "O-O", "O-O", "c5", "c3", "Nc6", "Nbd2", "Nd7"], say: "…c5 and …Nc6 build the standard pressure, and …Nd7 unveils the g7-bishop against d4 — Black's whole setup aims at that one square. White's c3 and the e3-pawn hold it twice over; the question is who gets to the queenside first.", sayShort: "…Nd7 — everything aims at d4.", arrows: [{ from: "g7", to: "d4", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "d4", color: "rgba(255,214,0,0.88)" }] },
      { id: "lg3", moves: ["d4", "Nf6", "Bf4", "g6", "e3", "Bg7", "Nf3", "d5", "Be2", "O-O", "O-O", "c5", "c3", "Nc6", "Nbd2", "Nd7", "Qb3", "c4"], say: "Qb3! — the punishing move: the queen hits d5 and b7 at once, and Black's …c4 reply concedes the centre tension to save the pawn — the c5-pressure on d4 is gone for good, traded for a queenside pawn that must now be defended.", sayShort: "Qb3 — hit d5 and b7 together.", arrows: [{ from: "b3", to: "b7", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "c4", color: "rgba(80,140,255,0.32)" }] },
      { id: "lg4", moves: ["d4", "Nf6", "Bf4", "g6", "e3", "Bg7", "Nf3", "d5", "Be2", "O-O", "O-O", "c5", "c3", "Nc6", "Nbd2", "Nd7", "Qb3", "c4", "Qa3", "b5", "b3"], say: "Qa3 slides onto the freshly opened diagonal, leaning on e7, and after …b5 comes b3! — the undermining blow. The c4-pawn that ended Black's central pressure is now itself the target, and every trade on b3 or c4 opens files where only White is ready. The engine's small plus is the honest read: a typical London — nothing flashy, everything comfortable.", sayShort: "b3 — undermine the overreach.", arrows: [{ from: "a3", to: "e7", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "c4", color: "rgba(255,214,0,0.88)" }, { square: "b3", color: "rgba(80,140,255,0.32)" }] },
    ],
  },

  "london-system::London vs Dutch": {
    openingId: "london-system", title: "London vs the Dutch — Ne5 is the whole plan", minutes: 8, orientation: "white",
    sources: ["concept:pos-outpost", "concept:pos-space", "https://en.wikipedia.org/wiki/London_System"],
    beats: [
      { id: "ld1", moves: ["d4", "f5", "Bf4", "Nf6", "e3", "e6", "Nf3", "d5", "Bd3", "Bd6"], say: "Against the Dutch, the London gets better: …f5 weakened e5 on move one, and every White piece heads for that hole. Bd3 takes the b1-h7 diagonal the …f5-pawn no longer guards; …Bd6 offers the standard trade.", sayShort: "Bd3 — f5 gave up e5 forever.", highlights: [{ square: "e5", color: "rgba(255,214,0,0.88)" }, { square: "d3", color: "rgba(80,140,255,0.32)" }] },
      { id: "ld2", moves: ["d4", "f5", "Bf4", "Nf6", "e3", "e6", "Nf3", "d5", "Bd3", "Bd6", "Ne5", "O-O", "Nd2", "Nbd7"], say: "Ne5! — there it is, the knight on the hole the Dutch can never repair. No pawn can ever touch it: …f6 is impossible with the f-pawn on f5, and the knight already stares at f7. Nd2 follows, heading for f3 to stack behind its brother.", sayShort: "Ne5 — the hole, occupied for good.", arrows: [{ from: "e5", to: "f7", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "e5", color: "rgba(255,214,0,0.88)" }] },
      { id: "ld3", moves: ["d4", "f5", "Bf4", "Nf6", "e3", "e6", "Nf3", "d5", "Bd3", "Bd6", "Ne5", "O-O", "Nd2", "Nbd7", "Ndf3", "Ne4", "O-O", "Ndf6"], say: "Ndf3 completes the London's signature knight-stack: one on e5, one guarding it, the g3-retreat still available for the bishop. Black centralises …Ne4 in reply — the Dutch's only active idea — and props it with …Ndf6. Two knights each, but only White's have a pawn hole to live in.", sayShort: "Ndf3 — the knight-stack forms.", highlights: [{ square: "e5", color: "rgba(255,214,0,0.88)" }, { square: "e4", color: "rgba(80,140,255,0.32)" }] },
      { id: "ld4", moves: ["d4", "f5", "Bf4", "Nf6", "e3", "e6", "Nf3", "d5", "Bd3", "Bd6", "Ne5", "O-O", "Nd2", "Nbd7", "Ndf3", "Ne4", "O-O", "Ndf6", "c4", "c6", "c5"], say: "c4 and c5! — with the kingside grip banked, White claims the queenside too. The engine reads a full pawn's worth of pressure (+1.0): the e5-knight, the space on both wings, and Black's light-squared bishop still buried behind its own …f5-pawn. The London against the Dutch is the system at its best — every move natural, every advantage permanent.", sayShort: "c5 — grip both wings; +1.0.", highlights: [{ square: "c5", color: "rgba(255,214,0,0.88)" }, { square: "e5", color: "rgba(80,140,255,0.32)" }] },
    ],
  },

  "london-system::London vs Bf5 Mirror": {
    openingId: "london-system", title: "London vs the …Bf5 copycat — break the mirror with e4", minutes: 8, orientation: "white",
    sources: ["concept:pos-tempo", "concept:pos-development", "https://en.wikipedia.org/wiki/London_System"],
    beats: [
      { id: "lm1", moves: ["d4", "d5", "Bf4", "Bf5", "e3", "e6", "Nf3", "Nf6"], say: "Black copies the London move for move: …Bf5 outside the chain, …e6 behind it. Mirrors flatter — and they lose a tempo every move they hold. White's job is to pick the moment the extra move matters most.", sayShort: "…Bf5 — the copycat; White is a move up.", highlights: [{ square: "f5", color: "rgba(80,140,255,0.32)" }] },
      { id: "lm2", moves: ["d4", "d5", "Bf4", "Bf5", "e3", "e6", "Nf3", "Nf6", "c4", "c6", "Nc3", "Bd6", "Bxd6", "Qxd6"], say: "c4! breaks the symmetry first — the copycat can't mirror this without losing d5. …c6 props the centre, Nc3 adds force, and when …Bd6 offers the trade, White takes: Bxd6 …Qxd6, pulling the black queen to a square where she'll meet tempo-gaining threats.", sayShort: "c4 — the mirror cracks first.", highlights: [{ square: "c4", color: "rgba(255,214,0,0.88)" }, { square: "d6", color: "rgba(80,140,255,0.32)" }] },
      { id: "lm3", moves: ["d4", "d5", "Bf4", "Bf5", "e3", "e6", "Nf3", "Nf6", "c4", "c6", "Nc3", "Bd6", "Bxd6", "Qxd6", "Bd3", "Bxd3", "Qxd3", "Nbd7", "O-O", "O-O"], say: "Bd3 challenges the copycat bishop too — …Bxd3 Qxd3 and the light squares change owners. Notice the pattern: every symmetric trade resolves with WHITE's piece recapturing onto the better square, because the extra tempo decides who recaptures with gain.", sayShort: "Qxd3 — trades favour the mover.", highlights: [{ square: "d3", color: "rgba(255,214,0,0.88)" }] },
      { id: "lm4", moves: ["d4", "d5", "Bf4", "Bf5", "e3", "e6", "Nf3", "Nf6", "c4", "c6", "Nc3", "Bd6", "Bxd6", "Qxd6", "Bd3", "Bxd3", "Qxd3", "Nbd7", "O-O", "O-O", "e4", "dxe4", "Nxe4", "Nxe4", "Qxe4", "Nf6", "Qe2"], say: "e4! — the break lands at last: …dxe4 Nxe4 Nxe4 Qxe4 and the smoke clears on a position the engine calls a steady White plus. Same pawn count, but White's queen owns the centre and the pressure against b7 and the d-file is all one-way. The copycat London: safe for Black on move five, uphill by move fourteen.", sayShort: "e4 — the tempo cashes in.", highlights: [{ square: "e4", color: "rgba(255,214,0,0.88)" }, { square: "b7", color: "rgba(80,140,255,0.32)" }] },
    ],
  },

  "london-system::London: Nh4-f5 Knight Maneuver": {
    openingId: "london-system", title: "London — the Ne5 trade grip (Nd2 move order)", minutes: 8, orientation: "white",
    sources: ["concept:pos-outpost", "concept:pawn-doubled", "https://en.wikipedia.org/wiki/London_System"],
    beats: [
      { id: "ln1", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nd2", "Bd6", "Bg3", "O-O"], say: "The Nd2-first move order: the queenside knight develops before the kingside one, keeping the f3-square flexible. When …Bd6 offers the standard trade, Bg3 declines as always — the London bishop out-waits everyone.", sayShort: "Bg3 — decline, as always.", highlights: [{ square: "g3", color: "rgba(255,214,0,0.88)" }, { square: "d2", color: "rgba(80,140,255,0.32)" }] },
      { id: "ln2", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nd2", "Bd6", "Bg3", "O-O", "Bd3", "c5", "c3", "Nc6", "Ngf3", "Qe7"], say: "Bd3 eyes h7, c3 holds the wall, and Ngf3 completes the shell with both knights connected. Black sets up the …c5/…Nc6/…Qe7 counter — standard and sound. Now White shows the move order's point.", sayShort: "Ngf3 — the shell completes.", arrows: [{ from: "d3", to: "h7", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "c5", color: "rgba(80,140,255,0.32)" }] },
      { id: "ln3", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nd2", "Bd6", "Bg3", "O-O", "Bd3", "c5", "c3", "Nc6", "Ngf3", "Qe7", "Ne5", "Nd7", "Nxc6", "bxc6"], say: "Ne5! lands, …Nd7 challenges — and Nxc6! trades at exactly the right moment: …bxc6 wrecks Black's queenside structure, doubling the c-pawns and leaving the c5-pawn loose in the middle of them. A small, permanent concession extracted from a normal-looking position.", sayShort: "Nxc6 — wreck the queenside.", highlights: [{ square: "c6", color: "rgba(255,214,0,0.88)" }, { square: "c5", color: "rgba(80,140,255,0.32)" }] },
      { id: "ln4", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nd2", "Bd6", "Bg3", "O-O", "Bd3", "c5", "c3", "Nc6", "Ngf3", "Qe7", "Ne5", "Nd7", "Nxc6", "bxc6", "Nf3"], say: "Nf3 — the remaining knight re-takes the e5-route, and the game settles into the shape White wanted: level by the engine's count, but Black's doubled pawns on c6 and c5 need tending every move while White's plans — Ne5 again, a4-a5, the h7-diagonal — cost nothing to maintain. The London grind, distilled.", sayShort: "Nf3 — back to e5; grind on.", highlights: [{ square: "e5", color: "rgba(80,140,255,0.32)" }, { square: "c6", color: "rgba(255,214,0,0.88)" }] },
    ],
  },

  "london-system::London vs Early c5 Challenge": {
    openingId: "london-system", title: "London vs the …c5/…b5 gambit — take and neutralise", minutes: 8, orientation: "white",
    sources: ["concept:pos-center", "concept:pos-space", "https://en.wikipedia.org/wiki/London_System"],
    beats: [
      { id: "lc1", moves: ["d4", "Nf6", "Bf4", "c5", "d5", "b5"], say: "…c5 and …b5!? — Black throws Benko-style pawns at the London, betting White won't know the recipe. The recipe starts with d5: clamp the centre and let the gambit pawns hang where they stand.", sayShort: "d5 — clamp first, count later.", highlights: [{ square: "d5", color: "rgba(255,214,0,0.88)" }, { square: "b5", color: "rgba(80,140,255,0.32)" }] },
      { id: "lc2", moves: ["d4", "Nf6", "Bf4", "c5", "d5", "b5", "f3", "g6", "e4", "Bg7", "Be3", "O-O"], say: "f3 and e4 build the full centre the gambit handed over, and Be3 re-routes the London bishop toward the queenside battle. Black fianchettoes and castles — standard Benko compensation hopes: file pressure and the long diagonal.", sayShort: "e4 — the full centre, gifted.", highlights: [{ square: "e4", color: "rgba(255,214,0,0.88)" }, { square: "e3", color: "rgba(80,140,255,0.32)" }] },
      { id: "lc3", moves: ["d4", "Nf6", "Bf4", "c5", "d5", "b5", "f3", "g6", "e4", "Bg7", "Be3", "O-O", "Bxc5", "d6"], say: "Bxc5! — take the pawn. Half of playing against gambits is the nerve to accept and consolidate. …d6 asks the bishop where it's going, and the answer is the whole point of White's setup.", sayShort: "Bxc5 — take it; nerve, then technique.", highlights: [{ square: "c5", color: "rgba(255,214,0,0.88)" }] },
      { id: "lc4", moves: ["d4", "Nf6", "Bf4", "c5", "d5", "b5", "f3", "g6", "e4", "Bg7", "Be3", "O-O", "Bxc5", "d6", "Bd4", "a6", "c4", "e6", "Qd2", "Nbd7", "Nc3"], say: "Bd4! — the bishop plants itself on the one square that neutralises the g7-bishop, offering the trade that kills Black's compensation at the source. c4 then meets …b5's ambitions head-on, and Qd2 with Nc3 consolidates. The engine's verdict: pawn up, pressure contained. Against Benko ideas, the defender who trades the dark-squared bishops wins the argument.", sayShort: "Bd4 — trade off the compensation.", highlights: [{ square: "d4", color: "rgba(255,214,0,0.88)" }, { square: "c4", color: "rgba(80,140,255,0.32)" }] },
    ],
  },
};
