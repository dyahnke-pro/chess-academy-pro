import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_italian-content.json (validated against the gate
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

export const ITALIAN_GAME_LESSON: LessonScript = {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "The Italian Game — A Master Class",
  minutes: 14,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "e4 e5", say: "Welcome to the oldest analysed opening in chess. The Italian Game was written down in Damiano's 1512 treatise and polished by Greco a century later — and it begins the way every classical fight begins: e4 meets e5, two pawns claiming the centre, neither giving ground. The Italian's whole personality grows from one question that's about to be asked: which piece points at f7, the one square in front of Black's king that only the king itself defends.", sayShort: "e4 e5 — the classical centre, eyes on f7.", highlights: [H("e4", KEY), H("e5", KEY)] }),
    b({ id: "nf3", moves: "e4 e5 Nf3", say: "Nf3 — develop a piece and attack something. The king-knight leaps out and immediately pressures the e5-pawn, forcing Black to react. This is the move that separates the Italian and the Ruy from the quieter openings: White doesn't shuffle, he asks Black a question on move two. Defend e5, or lose it.", sayShort: "Nf3 — develop and hit e5 at once.", arrows: [A("f3", "e5", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "nc6", moves: "e4 e5 Nf3 Nc6", say: "Black answers the most natural defence: Nc6. The queen-knight comes to its best square and props up e5 a second time. Now the fight for the centre is fully joined, and White makes the move that names the opening.", sayShort: "…Nc6 — defends e5, the fight is joined.", arrows: [A("c6", "e5", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "bc4", moves: "e4 e5 Nf3 Nc6 Bc4", say: "Bc4 — the Italian bishop, and the move the whole opening is named for. From c4 it stares straight down the longest light diagonal at f7. Remember why f7 matters: it's the only square near Black's king defended by nothing but the king himself. Every plan in the Italian, slow or violent, eventually comes back to pressure on this square.", sayShort: "Bc4 — the Italian bishop drills into f7.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY)] }),
    b({ id: "bc5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5", say: "Bc5 — the Giuoco Piano, the \"quiet game.\" Black mirrors, aiming his own bishop at f2 exactly as White's bishop aims at f7. The position is symmetrical and both sides point at the other's weak f-pawn. Symmetry is a standing invitation: whoever breaks it first, in his own favour, takes the initiative. White's tool for breaking it is a pawn break in the centre.", sayShort: "…Bc5 — the Giuoco Piano mirror; break it first.", arrows: [A("c5", "f2", ATK)], highlights: [H("f2", KEY), H("f7", SOFT)] }),
    b({ id: "c3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3", say: "c3 — modest, and the foundation of the entire classical plan. The pawn does one job: it prepares d4. White wants to build the broad centre — pawns on d4 and e4 side by side — and c3 is the brace that will support that d4 push the moment it advances. Patience first: build the centre, then fight in it.", sayShort: "c3 — the brace that prepares the d4 break.", highlights: [H("d4", KEY)] }),
    b({ id: "nf6", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6", say: "Nf6 develops with a threat — the knight attacks the e4-pawn — and forces White to commit. There's no more time for slow moves; the centre tension has to be resolved. So White plays the break the whole opening has been preparing.", sayShort: "…Nf6 — hits e4 and forces the break.", arrows: [A("f6", "e4", ATK)], highlights: [H("e4", KEY)] }),
    b({ id: "d4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4", say: "d4! The break lands. The pawn that c3 was bracing storms forward, attacking the e5-pawn and the c5-bishop's support at once. This is the central detonation Capablanca taught was the heart of every sound attack: no assault succeeds without control of the centre, and White is seizing it. Black must capture.", sayShort: "d4! — the prepared break detonates the centre.", arrows: [A("f3", "e5", ATK)], highlights: [H("d4", KEY), H("e5", KEY)] }),
    b({ id: "exd4-cxd4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4", say: "exd4 cxd4 — and there it is: White's pawns stand abreast on d4 and e4, the classical broad centre. This duo cramps Black, controls the key central squares, and gives every White piece a clear line forward. But the d4-pawn is also a target, and Black strikes at it immediately with a check.", sayShort: "exd4 cxd4 — the broad d4-e4 centre stands.", highlights: [H("d4", KEY), H("e4", KEY)] }),
    b({ id: "bb4-bd2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2", say: "Bb4+ checks, and after Bd2 Bxd2+ Nbxd2 the bishops come off. This is the Greco Attack, the calm heart of the Giuoco Piano. Notice White recaptured with the queen-knight: it lands on d2 heading for the kingside, and crucially it adds a second defender to the e4-pawn — because Black's next blow falls right there.", sayShort: "Bb4+ Bd2 — trade off; Nd2 reinforces e4.", arrows: [A("d2", "e4", VIS)], highlights: [H("e4", KEY)] }),
    b({ id: "d5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5", say: "d5! Black's freeing break, and the standard equalising idea in these positions. The pawn hits the e4-centre and opens lines for Black's pieces before White can use the space. After exd5 Nxd5 the smoke clears: White is left with an isolated d4-pawn, and the middlegame becomes a classic battle — White's central pawn and freer pieces against Black's pressure on the lone d-pawn.", sayShort: "…d5! — Black frees up; White gets the isolani.", highlights: [H("d5", KEY), H("e4", SOFT)] }),
    b({ id: "castle", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O Re1", say: "O-O O-O Re1 — both kings reach safety and White's rook swings to the open e-file, pointing straight down at Black's king on e8. This is the dividend of the isolated d-pawn structure: the pawn may be a long-term weakness, but in return White gets open lines and active pieces for the middlegame, and the e-file is the first highway.", sayShort: "O-O O-O Re1 — rook seizes the open e-file.", arrows: [A("e1", "e8", VIS)], highlights: [H("e8", KEY)] }),
    b({ id: "isolani-play", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O Re1 Nb6 Bb3 Nxd4 Nxd4 Qxd4 Qc2", say: "Nb6 nudges the bishop, which slides to b3 staying on its f7 diagonal — the same reroute the Ruy Lopez bishop makes. Black grabs the isolated d-pawn with Nxd4 Nxd4 Qxd4, but this is the trade White wanted: after Qc2 the queen unveils the b3-bishop's aim at f7 and lines up its own battery on the b1-h7 diagonal toward h7. White has given a pawn for a raging initiative against the Black king.", sayShort: "Bb3, Qc2 — aim at f7 and h7.", arrows: [A("b3", "f7", ATK), A("c2", "h7", VIS)], highlights: [H("f7", KEY), H("h7", KEY)] }),
    b({ id: "initiative", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O Re1 Nb6 Bb3 Nxd4 Nxd4 Qxd4 Qc2 c6 Ne4 Bf5 Rad1", say: "c6 shores up the light squares, but White keeps pouring pieces toward the king: Ne4 jumps into the centre eyeing f6 and d6, Bf5 pins it to the queen, and Rad1 brings the last rook to the d-file, hitting the Black queen on d4. Every White piece now has a job near the centre or the king — this is the Italian's promise paying off: surrender the structure, collect the initiative. The isolated-pawn middlegame is dynamic, not passive.", sayShort: "Ne4, Rad1 — every piece swarms the centre.", arrows: [A("e4", "f6", INTENT), A("d1", "d4", VIS)], highlights: [H("d4", KEY), H("f5", SOFT)] }),
    b({ id: "close", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O Re1 Nb6 Bb3 Nxd4 Nxd4 Qxd4 Qc2 c6 Ne4 Bf5 Rad1 Bxe4 Rxe4 Qf6 Qe2 c5", say: "And that is the classical Italian Game. One idea runs through all of it: develop fast, brace with c3, break with d4, and when the centre opens, throw every piece at f7 and the king. Black equalises the structure with …d5 and wins the isolated pawn — but White trades it for an initiative that never quite lets go. The other tabs in this masterclass are the Italian's other faces: the slow modern d3 squeeze, the violent Evans Gambit, the sharp Two Knights, and the exchange-sacrifice Møller. Different speeds, one target: the f7-square you've watched the whole game.", sayShort: "Build, break d4, swarm f7 — the Italian's soul.", highlights: [H("f7", SOFT), H("d4", SOFT)] }),
  ],
};
