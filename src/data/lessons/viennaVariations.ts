import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision /
// threat / intent), highlights YELLOW (key square called out in narration)
// and SOFT BLUE (secondary context). Move squares are auto-painted orange
// by the LessonPlayer — we don't author those.
const ATK = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
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

// ── The Vienna Gambit (f4) ─────────────────────────────────────
// Spine (locked 2026-05-21): the modern MAIN line is Qf3 — the
// Bardeleben Variation — the trendy Eric Rosen / online weapon that
// hits the e4-knight DIRECTLY with the queen and threatens Qxd5 with
// tempo. The older Nf3 (Breyer/Lasker calm line) is taught as the
// alternative branch. Black's principled reply d5 is the Lasker
// counterstrike — same as it ever was. The Wurzburger Trap and the
// Hamppe sacrifices live in the WEAPONS layer.
const GAMBIT: LessonScript = {
  openingId: 'vienna-game',
  // Idea-grounding (verified against chess-concepts.json passages, not recall):
  // Nf3 + Qe2 development = pos-development; the e5-pawn wedge cramping Black =
  // pos-space; the dxc3 recapture's half-open d-file = pos-open-file; the doubled
  // c-pawns (small lasting debt vs central space) = pawn-doubled. Spine is the
  // masters' main line (Nf3, 52%) — honest balanced terminal, not a forced edge.
  sources: ['book:vienna-game', 'concept:pos-development', 'concept:pos-space', 'concept:pos-open-file', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — The Gambit (f4)',
  minutes: 11,
  orientation: 'white',
  beats: [
    b({ id: 'g1', moves: 'e4 e5 Nc3 Nf6 f4',
      say: "Welcome to the Vienna Gambit, the opening's loudest weapon. After Nc3 Nf6, White rips the centre open with f4, throwing the f-pawn straight at Black's e5-pawn to drag it off its central post. Edward Lasker laid out the logic in *Chess Strategy*: with a pawn already sitting on e4, the f4 break is the natural way to lure that e5-pawn away. That is exactly the move you just saw. The pawn looks like a gift — Black can snatch it with exf4 — but it isn't.",
      sayShort: "f4 — Lasker's lure, pull e5 off-centre.",
      highlights: [H('f4', KEY), H('e5', KEY)] }),
    b({ id: 'g2', moves: 'e4 e5 Nc3 Nf6 f4 d5',
      say: "And here is the principled reply: d5! Black refuses to take the gambit pawn and counters in the centre instead — exactly the same idea on the other side of the board. White's f4 attacked e5; Black's d5 attacks e4 and f4 at once. This is what Lasker called the only fully sound reply, and it is the spine of this variation. The Vienna Gambit Accepted, where Black grabs with exf4 instead, lives on its own page in this masterclass because that is where the named weapons live.",
      sayShort: "d5! — Lasker's counterstrike, hit the centre back.",
      highlights: [H('d5', KEY), H('e4', KEY), H('f4', SOFT)] }),
    b({ id: 'g3', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4',
      say: "Edward Lasker's analysis runs right through this position: he pointed out that after fxe5, Black can recapture with Nxe4 without the slightest trouble in development. That is exactly what happens — fxe5 takes the gambit pawn on the kingside and opens the f-file, and Nxe4 snaps off the e4-pawn that the c3-knight had been guarding. Pawn structures cracked open, knights racing through the centre, and the e4-knight now sits deep in White's territory, begging to be hit.",
      sayShort: "fxe5 Nxe4 — f-file opens, knight grabs e4.",
      highlights: [H('e4', KEY), H('e5', KEY), H('c3', SOFT)] }),
    // ── Gambit Declined MAIN LINE (Nf3) — rebuilt 2026-06-29 ──────────
    // The old spine taught Qf3 (a real but #2 line, 29%) followed by …f5 +
    // …Nc6 — both thin SIDELINES dressed up as "the main line." The masters'
    // main line is Nf3 (52%) → …Be7 Qe2 → …Nxc3 dxc3 → …c5 Bf4 Nc6, a roughly
    // BALANCED game (the …d5 decline equalises; honest terminal −0.28). Qf3 is
    // mentioned as the sharp modern alternative, no longer mislabelled.
    b({ id: 'g4', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3',
      highlights: [H('f3', KEY), H('e5', KEY)],
      say: "Nf3 — the main line, and the most-played move here by a wide margin. No flashy queen sortie: White just develops the king-knight, defends the e5-pawn that cramps Black's centre, and prepares to castle. The e4-knight sits there looking active, but it has no support — White will simply pile pressure on it with Qe2 next, and Black will have to resolve the tension. Sound, patient, and the move the masters trust.",
      sayShort: "Nf3 — the main line, sound development.",
      arrows: [A('f3', 'e5', INTENT)] }),
    b({ id: 'g5', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2',
      highlights: [H('e4', KEY), H('e2', SOFT)],
      say: "Be7, and now the key idea: Qe2. The queen tucks in behind the e-pawn and stares straight up the e-file at the e4-knight, which has nothing to defend it. Black can't comfortably hold the knight where it is, so the tension is about to break. This is why Nf3 needed no rush — the simple Qe2 does the work, pressuring the knight and clearing d1 for a rook all at once.",
      sayShort: "Qe2 — pile up on the loose e4-knight.",
      arrows: [A('e2', 'e4', ATK)] }),
    b({ id: 'g6', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3',
      highlights: [H('e5', KEY), H('c3', SOFT)],
      say: "Nxc3 dxc3 — Black gives up the knight and White recaptures toward the centre. Yes, you've doubled your c-pawns, but look what you got: a half-open d-file your queen and rooks will use, and that e5-pawn still wedged in Black's half of the board, cramping his pieces. The doubled pawns are a small, permanent debt; the central space and open lines are the lasting compensation.",
      sayShort: "dxc3 — recapture toward the centre, open the d-file." }),
    b({ id: 'g7', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6',
      highlights: [H('f4', KEY), H('e5', SOFT)],
      say: "c5 Bf4 Nc6 — Black grabs queenside space with c5, and White completes development with the natural Bf4, the dark-square bishop landing on an active diagonal that guards the e5-pawn and eyes Black's queenside. Both sides finish developing into a normal, fighting middlegame. Be honest with yourself about this position: it is roughly level. The …d5 decline is Black's soundest answer to the Gambit, and with accurate play he equalises. White plays on for activity, not a won game.",
      sayShort: "c5 Bf4 Nc6 — a balanced fighting middlegame." }),
    b({ id: 'g8', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6 O-O-O Be6',
      highlights: [H('c1', KEY), H('d1', SOFT), H('e6', SOFT)],
      say: "O-O-O — White castles long, the king tucking onto c1 and the rook landing on d1, right behind the half-open d-file the dxc3 recapture opened. Black answers Be6, developing and reinforcing d5. This is the practical point of the whole setup: White's pieces find active homes — the rook on the open file, the bishop on f4, the e5-pawn cramping — so even from a level position White has the easier, more natural moves to make.",
      sayShort: "O-O-O — castle long, rook to the open d-file." }),
    b({ id: 'g9', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6 O-O-O Be6 h4 h6 g3 Qd7',
      highlights: [H('e5', KEY), H('h4', SOFT)],
      say: "h4, g3, and the position settles. Here is the honest verdict on the Vienna Gambit Declined: it is balanced. White owns the e5-spike and the easier development; Black is solid and fully equal. You are not memorising a forced win — you are learning a fighting structure where White presses with space and active pieces. If you want the Gambit's real bite, it lives one tab over, in the ACCEPTED line where the named sacrifices wait. And if you crave the sharp modern try here, Qf3 — Eric Rosen's online weapon — is the aggressive #2 alternative: it hits the e4-knight at once, though best play still holds for Black.",
      sayShort: "Balanced — White presses with space and activity." }),
    b({ id: 'g10', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6',
      highlights: [H('f4', SOFT)],
      say: "And one branch you must know — if Black plays the OTHER reply and takes the gambit with exf4, you are no longer in this strategic line. You are in territory that has been studied for two centuries: the Vienna Gambit Accepted. That is where the Wurzburger Trap waits if Black develops too naturally into the old d3 line, where Hamppe-Allgaier and Hamppe-Muzio sacrifices live if Black ALSO played Nc6 instead of Nf6, and where Steinitz himself walked his king to e2 and attacked. The Vienna Gambit has TWO completely different personalities: this strategic Lasker spine, and a tactical jungle one tab away. Learn this calm-but-clinical one first; the named weapons are the reward when Black drifts.",
      sayShort: "exf4 — the Gambit Accepted, where the weapons live." }),
  ],
};

// ── Vienna vs Nc6 ─────────────────────────────────────────────
// Spine: the sharpest reply, f4 — the launchpad for the historical
// Vienna sacrifices (Hamppe-Allgaier, Hamppe-Muzio, Pierce, Steinitz).
// This lesson lays out the strategic landscape and points at the named-
// weapon lessons that teach each individual sacrifice in depth.
const VS_NC6: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — Black plays Nc6',
  minutes: 10,
  orientation: 'white',
  // Intentional roadmap (depth gate opt-out, 2026-05-22). The vs Nc6
  // spine stops at the 11-ply launchpad position (h4 g4 Ng5) because
  // from there it FANS OUT to four full beat lessons in the WEAPONS layer
  // (Hamppe-Allgaier, Hamppe-Muzio, Pierce Gambit, Steinitz Gambit). Each
  // weapon is its own 8-10 beat lesson that runs DEEP into the middlegame
  // /endgame conversion. The roadmap design is the right shape here —
  // forcing a single 20+ ply continuation would have to PICK one weapon's
  // line and lose the others. See viennaTrapLessons.ts.
  kind: 'roadmap',
  beats: [
    b({ id: 'nc6-1', moves: 'e4 e5 Nc3 Nc6',
      say: "At amateur level Black plays Nc6 even more often than Nf6 — almost forty per cent of the time. He defends e5 the classical Ruy way, with the knight, and waits to see what White does. The Vienna meets this with two completely different personalities: one calm, one furious. The calm path is Bc4 — straight back into Italian-Vienna themes. The furious path is f4 — and that is where almost every famous Vienna brilliancy in chess history was played.",
      sayShort: "Nc6 — meet it with Bc4 or f4.",
      highlights: [H('c6', KEY), H('e5', SOFT)] }),
    b({ id: 'nc6-2', moves: 'e4 e5 Nc3 Nc6 f4',
      say: "We take the furious path. f4 — exactly the same lever Lasker described, the side-thrust to lure the e5-pawn away. But against Nc6 the consequences are completely different from the Nf6 Gambit: the c6-knight is on e5's defender's square, so taking …exf4 doesn't expose the knight on e4 the way it does in the Nf6 line. Black almost always accepts the pawn — and that acceptance is the doorway to the Vienna's greatest historical attacks.",
      sayShort: "f4 vs …Nc6 — door to the brilliancies.",
      highlights: [H('f4', KEY)] }),
    b({ id: 'nc6-3', moves: 'e4 e5 Nc3 Nc6 f4 exf4',
      say: "Black accepts: exf4. He has the gambit pawn. But look at White's centre — the e4-pawn now controls d5 and f5 alone, the f-file is wide open in front of White's king-rook, and White's whole army is poised to develop with tempo. The pawn is bait. Steinitz built his entire opening repertoire around the principle: a pawn sacrificed for development and initiative is almost always a sound investment.",
      sayShort: "exf4 — bait taken; the f-file opens.",
      highlights: [H('f4', KEY)] }),
    b({ id: 'nc6-4', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3',
      say: "Nf3 — develop with tempo, eye the kingside. White doesn't waste a move recovering the pawn. He builds. And now Black is at a fork: hold the gambit pawn with …g5 (the greedy try, the one that walks into the Hamppe-Allgaier and Hamppe-Muzio sacrifices) or give it back to neutralise (the safer, less ambitious choice). The amateur usually grabs the pawn AND tries to hold it.",
      sayShort: "Nf3 — develops with tempo; the brilliancy looms.",
      highlights: [H('f3', KEY)] }),
    b({ id: 'nc6-5', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5',
      say: "g5 — Black tries to hold the f4-pawn with his g-pawn. This is the move that creates immortal chess. Edward Lasker noted that lines like this 'lead to the most brilliant complications,' and history bears him out: every important Vienna sacrifice of the nineteenth century launches from approximately this position. The g4-square is about to become a weapon Black thinks is his and isn't.",
      sayShort: "g5 — the greedy hold; immortal chess begins.",
      highlights: [H('g5', KEY), H('f4', SOFT)] }),
    b({ id: 'nc6-6', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5',
      arrows: [{ from: 'g5', to: 'f7', color: ATK }, { from: 'g5', to: 'h7', color: ATK }],
      highlights: [H('f7', KEY), H('g5', KEY)] ,
      say: "Here is the launchpad. h4 g4 Ng5 — White's knight leaps to g5, attacking the soft f7-square AND the h7-pawn, with a fork of devastating threats hanging in the air. From this exact position three of chess history's most famous sacrifices fire: the Hamppe-Allgaier (Nxf7! — the knight sacrifices itself to drag Black's king into the open), the Hamppe-Muzio (a knight sac AND the right to castle in one go), and Steinitz's king-walk attack. Each of those is its own lesson in the Weapons layer.",
      sayShort: "Ng5! — the launchpad for three sacrifices." }),
    b({ id: 'nc6-7', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5',
      say: "If sharp historical attacks aren't your weapon of choice, the calm answer to Nc6 is simply Bc4 — Italian-Vienna pressure on f7, exactly the patient build you saw in the Classical lesson, just with Black's knight on c6 instead of f6. Same Bb3 retreat when Black plays …Na5, same Bc2 pivot, same slow squeeze. The Vienna against Nc6 has two completely opposite personalities, and you choose which one fits the day. Steinitz himself played both — sometimes the violent sacrifice, sometimes the patient grind. The opening lets you decide.",
      sayShort: "Bc4 — the calm alternative, pressure on f7.",
      highlights: [H('c4', SOFT), H('f7', SOFT)] }),
  ],
};

// ── Frankenstein-Dracula ────────────────────────────────────────
// The wildest line in the Vienna. After Bc4 Black plays …Nxe4? thinking
// it's a safe pawn-grab; White answers Qh5! and the game enters a
// forced sequence that ends with the Nxa8 raid — White wins the
// exchange, Black gets compensation in piece activity. Famous for a
// reason. Note: the calmer Be7 sub-line absorbs into a branch beat
// (David's Falkbeer-merge call, 2026-05-21).
// Vienna Gambit — the Qf3 treatment of the declined main (3…d5). Made the
// PRIMARY declined tab per David 2026-07-17: online it is the most-played 5th
// move (Lichess 42% vs Nf3 26%), and unlike the LEVEL Nf3 line it keeps White a
// genuine pull — Stockfish 16 holds +0.58→+0.72 from move 10 into the move-14
// middlegame (both sides castled queenside). Masters still prefer Nf3 (52%), so
// the framing is HONEST: Qf3 is the modern online main + the sharper edge, Nf3
// the classical main on its own (existing) tab. Spine engine+DB-grounded
// (G3-legal); every board claim verified with chess.js against the live board.
const GAMBIT_QF3: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-initiative', 'concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — The Gambit: Qf3',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'qf1', moves: 'e4 e5 Nc3 Nf6 f4',
      say: "The Vienna Gambit — f4, hurling the f-pawn at e5 to drag it off the centre, with the knight already developed on c3 and ready for the fight.",
      sayShort: "f4 — the gambit thrust.",
      highlights: [H('f4', KEY), H('e5', KEY)] }),
    b({ id: 'qf2', moves: 'e4 e5 Nc3 Nf6 f4 d5',
      say: "…d5! is the principled decline — Black refuses the pawn and counter-strikes in the centre, hitting e4 right back. This is the main declined line, and the reply you will meet most.",
      sayShort: "…d5 — the declined counter-strike.",
      highlights: [H('d5', KEY), H('e4', KEY)] }),
    b({ id: 'qf3', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4',
      say: "fxe5 …Nxe4 — both sides snatch a central pawn. White owns the cramping e5-wedge; Black's knight sits deep on e4. Now the fork in the road: the classical Nf3, or the move most players reach for online today — Qf3.",
      sayShort: "fxe5 …Nxe4 — mutual central grabs.",
      highlights: [H('e5', KEY), H('e4', KEY)] }),
    b({ id: 'qf4', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3',
      say: "Qf3! The queen leaps straight out to hit the e4-knight and eye f7 — by far the most-played try in online play these days, and the sharper one. Where the classical Nf3 settles into a level game, Qf3 keeps White a genuine pull.",
      sayShort: "Qf3 — hit the knight, eye f7.",
      arrows: [A('f3', 'e4', INTENT)], highlights: [H('f3', KEY), H('e4', KEY), H('f7', SOFT)] }),
    b({ id: 'qf5', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3',
      say: "…Nxc3 dxc3 — Black trades the knight off, and White recaptures toward the centre. The c-pawns are doubled, but the d-file swings half-open for a rook on d1 and the e5-pawn stays as a cramping wedge.",
      sayShort: "dxc3 — half-open the d-file, keep e5.",
      highlights: [H('e5', KEY), H('d1', SOFT)] }),
    b({ id: 'qf6', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3 Be6 Bf4 Be7 O-O-O',
      say: "Bf4 supports the e5-wedge, and O-O-O! — White castles queenside, the rook landing on the d-file with the king tucked safely to c1. Every piece points toward Black.",
      sayShort: "O-O-O — castle onto the d-file.",
      highlights: [H('c1', KEY), H('e5', SOFT)] }),
    b({ id: 'qf7', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3 Be6 Bf4 Be7 O-O-O c6 Qg3 g6 Nf3 Qa5',
      say: "Qg3 swings the queen toward the kingside and Nf3 completes the development behind the e5-pawn. Black plays …c6 and …Qa5 to fuss at White's king — but the engine already reads White the better: the e5-wedge, the d-file, and the freer pieces outweigh the gambit pawn.",
      sayShort: "Qg3, Nf3 — develop with the pull.",
      highlights: [H('e5', KEY), H('g3', SOFT)] }),
    b({ id: 'qf8', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3 Be6 Bf4 Be7 O-O-O c6 Qg3 g6 Nf3 Qa5 Kb1 Nd7 Nd4 O-O-O',
      say: "Kb1 first — tucking the king off the c-file, out of the way of …Qa5, before pressing. …Nd7 develops, and Nd4! centralises the knight, hitting c6 and leaning on the e6-bishop. Black castles queenside too, so both kings sit on the same wing and it becomes a maneuvering fight where White's space and the e5-wedge do the talking.",
      sayShort: "Nd4 — centralise, press e6.",
      arrows: [A('d4', 'e6', ATK)], highlights: [H('e5', KEY), H('d4', KEY)] }),
    b({ id: 'qf9', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 dxc3 Be6 Bf4 Be7 O-O-O c6 Qg3 g6 Nf3 Qa5 Kb1 Nd7 Nd4 O-O-O Be2 Qc7 Bg4 Nc5',
      say: "Be2, and then Bg4! — the bishop swings across to join the d4-knight in pressuring the e6-bishop, two pieces bearing down on it. Black tucks the queen to c7 and jumps …Nc5, but White has finished developing with the e5-wedge and the pressure intact. Stockfish reads a steady plus — a comfortable, pleasant edge for White, and exactly why Qf3 is the line to reach for.",
      sayShort: "Bg4 — double up on e6.",
      arrows: [A('g4', 'e6', ATK)], highlights: [H('e6', KEY), H('e5', SOFT)] }),
  ],
};

const FRANKENSTEIN_DRACULA: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — The Frankenstein-Dracula',
  minutes: 12,
  orientation: 'white',
  beats: [
    b({ id: 'fd-1', moves: 'e4 e5 Nc3 Nf6 Bc4',
      say: "The Frankenstein-Dracula begins quietly enough: Bc4, the Italian-Vienna bishop pointing at f7, exactly as in the Classical lesson. But what follows is the wildest known line in the entire Vienna repertoire, born when Black makes one ambitious choice on his third move.",
      sayShort: "Bc4 — quiet start; the next choice decides chaos.",
      highlights: [H('c4', SOFT), H('f7', SOFT)] }),
    b({ id: 'fd-2', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4',
      say: "Nxe4! Black grabs the e4-pawn, reasoning that the c3-knight is pinned to the f1-h3 diagonal by the Bc4 (if Nxe4, then …Bxc4 takes White's bishop too). On the surface it looks safe — a free pawn, a developed knight on e4. In reality, Black has just walked into the deepest forced sequence in the Vienna's repertoire.",
      sayShort: "Nxe4 — the pawn-grab that only looks free.",
      highlights: [H('e4', KEY)] }),
    b({ id: 'fd-3', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5',
      say: "Qh5! The bombshell. White's queen leaps to h5 with TWO threats at once: capture the e4-knight, and — far worse — checkmate on f7 next move (Qxf7#). The h5-e5 diagonal hits the knight; the h5-f7 diagonal mates the king. Black's e4-knight cannot move because Qxf7 mates. Black has exactly one defensive move that meets both threats, and it isn't pretty.",
      sayShort: "Qh5! — hits the knight, threatens Qxf7 mate.",
      arrows: [A('h5', 'f7', ATK), A('h5', 'e5', ATK)],
      highlights: [H('f7', KEY), H('e4', SOFT), H('e5', SOFT)] }),
    b({ id: 'fd-4', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6',
      say: "Nd6 is forced — the only move that defends f7 AND saves the knight. The knight retreats from e4 to d6, blocking the queen's path to f7 and dodging the c3-knight's attack. Black has rescued the knight. He's lost three tempi in the process, but materially he is still up a pawn.",
      sayShort: "Nd6 — the only move, blocking Qxf7.",
      highlights: [H('d6', KEY), H('f7', SOFT)] }),
    b({ id: 'fd-5', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3',
      say: "Bb3 — White slides the bishop one square back. This isn't just dodging the …Nxc4 threat that Black would land next; it RELOADS the bishop on the b3-f7 diagonal, where it once again stares at f7 from a square Black can no longer reach. The threats keep regenerating, exactly the way Frankenstein keeps coming back.",
      sayShort: 'Bb3 — bishop reloads on f7. The threats regenerate.',
      arrows: [A('b3', 'f7', ATK)],
      highlights: [H('f7', KEY)] }),
    b({ id: 'fd-6', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6',
      say: "Now Black has a real choice. The classical move is Nc6 — the ambitious one, developing AND defending e5. This is the line that walks straight into the Nxa8 raid you're about to see. The calmer Be7 develops more conservatively, blocks the queen-bishop diagonal, and avoids the pyrotechnics — it's the path the modern grandmaster picks if he doesn't want to memorise a forced waterfall. Both moves exist in master practice; the Nxa8 main line is famous because it's UNFORGETTABLE.",
      sayShort: "Nc6 — the wild path; …Be7 stays calm.",
      highlights: [H('c6', KEY), H('e7', SOFT)] }),
    b({ id: 'fd-7', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5',
      say: "Here it comes. Nb5! — the c3-knight leaps to attack c7 with check ideas, threatening Nxc7+ which would win the rook on a8. Black plays …g6 to chase the queen away from h5, but White answers Qf3 — the queen pivots to attack f7 from a new diagonal. Black plays …f5 to block the queen, but this is exactly what White wanted — every Black pawn move is a future weakness. The position is dripping with tactics.",
      sayShort: "Nb5 hits c7 — each defence makes a weakness.",
      arrows: [A('b5', 'c7', ATK)],
      highlights: [H('c7', KEY), H('f7', KEY), H('f5', SOFT)] }),
    b({ id: 'fd-8', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8',
      say: "The famous raid lands. Qd5 — queen attacks f5 AND the c-file — Black plays …Qe7 to defend. And now Nxc7+! Kd8 Nxa8! The knight gobbles the rook on a8 and immediately needs Black to play …b6 to escape being trapped. Steinitz-era players called this the most dramatic mini-combination in chess: two captures in a row, a queen-trap-then-rook-raid that turns the whole opening into a tactical demonstration. White is up the exchange and a pawn in raw material.",
      sayShort: "Nxc7+ then Nxa8 — the Frankenstein raid.",
      highlights: [H('a8', KEY), H('c7', KEY), H('b6', SOFT)] }),
    b({ id: 'fd-9', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8 b6',
      say: "But the knight on a8 is trapped — Black plans …b6 and …Bb7 to win it back, and theory says Black has practical compensation despite the material deficit. So the verdict on the Frankenstein-Dracula main line is sharp but technically equal — White wins the exchange, Black wins activity. Yet at the board, against a player who hasn't memorised this exact 20-move sequence, the line is utterly winning practically. Adams played it as White and was happy to be there. The Frankenstein-Dracula is theory-soaked, but every move from move 4 onward has ONE answer — and if Black doesn't know it, the line is just won.",
      sayShort: "…b6, Bb7 traps a8 — practice favours White.",
      highlights: [H('a8', SOFT), H('b7', SOFT)] }),
    // ── DEEP — Frankenstein-Dracula structural closer (fd-10) ──────
    // Authored 2026-05-22. Same 20p position as fd-9 — depth-narration
    // teaching the resulting material balance and the four-or-five-move
    // race that converts it.
    b({ id: 'fd-10', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8 b6',
      say: "What does the position PRODUCE? Count the material first. White has won a ROOK (the a8-rook) plus a PAWN (the c7-pawn) for a KNIGHT — that's the exchange plus a pawn, roughly two points of material in raw count. Black's compensation is concrete: the Na8 is dead in the corner, and …b6 followed by …Bb7 will recover that knight inside four moves. But here's the WHOLE POINT of the line — in those four moves of Black hunting the trapped knight, White develops freely. Castle long. Bring the king-knight out via g1-e2-g3 or e2-d4. Stack rooks on the d-file and the open c-file (the c-file is half-open after Nxc7+ took the c7-pawn). By the time Black's bishop arrives on b7 and the knight is recovered, White has finished development with a 7-piece army aimed at Black's king on d8 — a king that has no castling rights, no pawn shield on the kingside (Black pushed g6 + f5), and rooks not yet connected. Bobby Fischer dismissed the whole line as a tactical curiosity. Mamedyarov plays the Black side AS Black and tolerates the trapped knight as the price of admission. Theory says equal. Master practice says White wins more often than not. Amateur practice says: if Black doesn't have all 20 moves memorised in order, the line is just won.",
      sayShort: "Up the exchange and a pawn — practically winning.",
      highlights: [H('a8', KEY), H('c7', SOFT), H('b6', SOFT), H('b7', SOFT), H('d8', SOFT)] }),
  ],
};

// ── Paulsen (g3) ─────────────────────────────────────────────
// The modern grandmaster's choice. At amateur level only 4% of Vienna
// players reach for the fianchetto, but at the very top it's the most
// popular reply to Nf6 (35.1%). Carlsen, Caruana, Mamedyarov all
// play it. The pitch: slow squeeze from a distance, no theory race,
// pure positional Vienna.
const PAULSEN: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'concept:end-two-bishops', 'concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — The Paulsen (g3)',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'p1', moves: 'e4 e5 Nc3 Nf6 g3',
      say: "g3 — the Paulsen Variation, named for Louis Paulsen who pioneered fianchetto systems in the 19th century. At amateur level it's almost never seen, but at the very top of chess today it's the MOST popular White reply to Nf6 — more popular than the Gambit and the Classical combined. Carlsen, Caruana, Mamedyarov, So have all leaned on it. The pitch is the opposite of the Gambit's fury: a slow squeeze from a distance, no theory race, no memorisation, just patient positional Vienna.",
      sayShort: "g3 — the modern elite's Vienna, slow squeeze.",
      highlights: [H('g3', KEY)] }),
    b({ id: 'p2', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2',
      say: "Black develops the king-bishop to c5, eyeing f2 — the natural reply — and White fianchettoes with Bg2. The g2-bishop now rakes the long light diagonal from a corner of the board, looking through White's own e4-pawn toward the d5 outpost where a knight might one day plant. For now the diagonal is screened by White's own centre pawn, but every later pawn break that clears e4 unleashes the bishop instantly.",
      sayShort: 'Bg2 — fianchetto, the long diagonal loaded toward d5.',
      highlights: [H('d5', KEY), H('e4', SOFT)] }),
    b({ id: 'p3', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2',
      say: "The Vienna knight-maneuver returns, exactly as in the Classical: Nge2! White re-routes his king-knight via e2 toward g3 or f4, keeping every option open. Same Nc3-Ne2 dance you saw in the Classical lesson, but now with a fianchettoed bishop already supporting the centre from below. The Paulsen IS the Classical Vienna with the g2-bishop swapped in for the Bc4.",
      sayShort: "Nge2 — the Vienna reroute, now behind Bg2.",
      arrows: [A('e2', 'g3', INTENT)] }),
    b({ id: 'p4', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O',
      say: "Black brings out the queen-knight to c6, White castles short, and the position settles into a quiet maneuvering battle. No central commitment yet from either side. The Vienna's c3-knight still backs e4, the fianchettoed bishop quietly cooks on the long diagonal, and the king-knight on e2 stares at three different forward squares (c3-trade, g3-reroute, f4-attack). White has flexibility; Black has solidity. The fight is over who improves their pieces faster.",
      sayShort: "Both castle — the race to improve pieces.",
      highlights: [H('e4', SOFT)] }),
    b({ id: 'p5', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3',
      say: "White's setup completes: …a4 to gain queenside space and stop a future …Na5, d3 to solidify, and the position has reached its canonical Paulsen middlegame structure. White's plan: Nd5 at the right moment (the long-diagonal bishop supports it), and slow expansion on either wing depending on where Black commits. Black's plan: develop solidly, contest the d5 outpost, and pray for an opening of the long diagonals where his own bishop-pair might shine.",
      sayShort: "Setup done — Nd5 the dream, slow expansion.",
      arrows: [A('c3', 'd5', INTENT)],
      highlights: [H('d5', KEY)] }),
    // ── Paulsen spine: Nd5 jump → the sound trade line (p7→p9) ─────
    // Re-spined 2026-06-29: the old p8→p10 walked …Nxd5 exd5 …Bd7 Be3,
    // where Be3 quietly throws away a tactic — after exd5 the d5-pawn
    // FORKS the c6-knight and e6-bishop, so dxc6 wins material (Be3
    // concedes ~3.5 vs best), and the "quiet squeeze" narration mis-
    // characterised a tactical position. Replaced with the genuinely
    // quiet line …Bg4 h3 Bxe2 Nxf6+ Qxf6 Qxe2 Nd4 (Stockfish-best both
    // sides, terminal +0.49): Black trades to relieve the cramp, White
    // keeps the bishop pair + space — the real small-edge Paulsen squeeze.
    b({ id: 'p7', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3 Be6 Nd5',
      say: "Black develops the queen-bishop: Be6, eyeing the d5-outpost AND the long diagonal that the Bg2 has been claiming. And now White strikes: Nd5! — the knight finally lands on the dream square the whole opening has been pointing at since move three. The c3-knight became this knight, and the Bg2 backs it down the long diagonal. Black must decide how to meet it — trade it off, or challenge it — but planting the knight on d5 is the Paulsen's whole positional point: patient setup, then the central jump the slow maneuvering was always building toward.",
      sayShort: "Nd5! — the knight lands on the dream square.",
      highlights: [H('e6', KEY), H('d5', KEY)] }),
    b({ id: 'p8', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3 Be6 Nd5 Bg4 h3 Bxe2 Nxf6+ Qxf6 Qxe2',
      say: "Black does the right thing against a squeeze — he trades pieces to breathe. Bg4 hits the e2-knight, and after h3 the bishop takes it, Bxe2. White recaptures cleverly: Nxf6+ first, forcing Qxf6, and only then Qxe2 to collect the bishop. When the dust settles White has parted with a knight but kept BOTH bishops — the long-range pair that thrives in exactly this kind of half-open position the trades have created. That is the Paulsen's quiet dividend: no knockout, just the bishop pair and a shade more space.",
      sayShort: "Trades clear — White keeps the two bishops.",
      highlights: [H('e2', KEY)] }),
    b({ id: 'p9', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3 Be6 Nd5 Bg4 h3 Bxe2 Nxf6+ Qxf6 Qxe2 Nd4',
      say: "Black claims a square in return — Nd4, the knight leaping to its own outpost and hitting the queen on e2. And here is the honest truth about the Paulsen: the position is near-level. White's two bishops and the extra central space are a pull worth playing for, not a winning advantage. You are not here for fireworks — you are here to grind a small, durable edge with the long-range pieces, move after patient move. That is exactly why the modern elite reaches for it.",
      sayShort: "…Nd4 — Black's outpost; White grinds a small edge.",
      highlights: [H('d4', KEY), H('e2', SOFT)] }),
    b({ id: 'p6', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3',
      say: "Why is the Paulsen the modern grandmaster's choice when amateurs rarely see it? Two reasons. First, the FORCED LINES are extremely short — there is no fifteen-move memorised waterfall like the Frankenstein-Dracula. The student of the Paulsen only needs to understand the structure, not memorise the moves. Second, the Vienna Gambit at the very top has been worked out so thoroughly that even Black has computer-verified equalising paths; the Paulsen sidesteps all that prep, the e4-pawn unchallenged for now and the long diagonal aimed at the centre. Treat the Paulsen as the Vienna's grown-up form: less spectacle, more solidity. Mamedyarov has built half his Vienna career on it.",
      sayShort: "The Paulsen — no theory, Mamedyarov's pick.",
      highlights: [H('e4', SOFT)] }),
  ],
};

const STANLEY: LessonScript = {
  openingId: 'vienna-game',
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna — The Stanley Variation',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'st1', moves: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6', say: "The Stanley Variation — White marries the Vienna's Nc3 with the Italian bishop on c4. It is a calm, solid system: d3 braces the centre and White develops harmoniously, aiming for a slow build-up rather than an early skirmish. Low theory, no risk.", sayShort: 'Bc4 — the calm Vienna-Italian system.', highlights: [H('c4', KEY)] }),
    b({ id: 'st2', moves: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 Nf3 O-O O-O Bg4 h3 Bh5 Bg5', say: "Both sides castle and develop symmetrically; White pins the f6-knight with Bg5 while Black pins back with …Bg4-h5. A quiet, manoeuvring middlegame where small positional improvements decide the game.", sayShort: 'Bg5 — pin and manoeuvre.', highlights: [H('g5', KEY), H('h5', SOFT)] }),
    b({ id: 'st3', moves: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 Nf3 O-O O-O Bg4 h3 Bh5 Bg5 h6 Bh4 Nbd7 Nd5 c6 Nxf6+ Nxf6', say: "White probes the d5-square with the knight, but …c6 meets it and the knights come off on f6. There is the Stanley tabiya: a calm, balanced, low-theory middlegame where White has an easy, risk-free game with simple plans and the safer structure — a sound system to reach a playable position every time.", sayShort: 'Nxf6 — simplify to a balanced game.', highlights: [H('f6', KEY), H('c6', SOFT)] }),
  ],
};

const VGA: LessonScript = {
  openingId: 'vienna-game',
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna — The Gambit Accepted',
  minutes: 7,
  orientation: 'white',
  kind: 'roadmap',
  beats: [
    b({ id: 'vg1', moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5', say: "The Vienna Gambit Accepted: White plays f4 and, after …exf4, strikes with e5 — kicking the f6-knight and grabbing the centre. White gives up the f4-pawn for a big lead in space and development, the classic gambit bargain that powers the Vienna's attacking reputation.", sayShort: 'e5 — gambit the pawn, seize the centre.', highlights: [H('e5', KEY), H('f4', SOFT)] }),
    b({ id: 'vg2', moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8 Nf3 d5 d4 g5 h4 g4', say: "The knight is driven home to …Ng8, and White erects the big centre with d4 while Black grabs kingside space with …g5; White hits straight back with h4, prising the kingside open. From this launchpad White's broad centre and initiative fan out into the sharp Vienna attacking lines — well worth a pawn.", sayShort: 'd4, h4 — big centre, prise the kingside.', highlights: [H('d4', KEY)] }),
  ],
};

const COPYCAT: LessonScript = {
  openingId: 'vienna-game',
  sources: ['concept:pos-development', 'concept:att-greek-gift', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna — Punishing the Copycat',
  minutes: 7,
  orientation: 'white',
  kind: 'roadmap',
  beats: [
    b({ id: 'cp1', moves: 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4', say: "The Copycat trap — when Black mindlessly mirrors White move for move, White shatters the symmetry with Qg4!, swinging out to hit g7 and daring Black to keep copying. This is the one move Black cannot safely mirror, and the punishment for trying is severe.", sayShort: 'Qg4! — break the mirror, hit g7.', arrows: [A('g4', 'g7', ATK)], highlights: [H('g7', KEY)] }),
    b({ id: 'cp2', moves: 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1 Kf8 Nh3 Qd4 d3', say: "Black copies with …Qf6, but Nd5 sets the trap: the greedy …Qxf2+ runs into Kd1 and Nh3, and the queen is chased to d4 while White develops with tempo. There is the verdict — Black's queen raid is repelled, White is winning with a commanding lead in development and the knight dominating d5. The lesson: never copy into an attack.", sayShort: 'Nd5 — trap the copying queen.', highlights: [H('d5', KEY), H('d4', SOFT)] }),
  ],
};

export const VIENNA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'vienna-game::Stanley Variation': STANLEY,
  'vienna-game::Vienna Gambit Accepted': VGA,
  'vienna-game::Copycat Variation': COPYCAT,
  'vienna-game::Vienna Gambit: Qf3': GAMBIT_QF3,
  'vienna-game::Vienna Gambit': GAMBIT,
  'vienna-game::Vienna vs 2...Nc6': VS_NC6,
  // Frankenstein-Dracula tab (the wild Nxa8 main line). The mislabeled
  // "Falkbeer Variation" duplicate tab + its calmer …Be7-subline twin were
  // removed 2026-06-25 (audit: Falkbeer isn't a Vienna line, and the two
  // tabs shared this one lesson). One correctly-named F-D tab remains.
  'vienna-game::Frankenstein-Dracula': FRANKENSTEIN_DRACULA,
  'vienna-game::Paulsen Attack': PAULSEN,
};
