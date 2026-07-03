import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
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

// The Glek System — Four Knights with 4.g3, promoted to a standalone masterclass
// (David 2026-07-03: "a complex enough opening to stand alone"). The main pill
// is the classical 4...Bc5 line: fianchetto, castle, trade off the dark-squared
// bishops with Be3, recapture toward the centre with fxe3, then reroute the
// knight Nh4 → f5. Every move is the most-played masters continuation; the
// narration teaches the IDEA behind each in the Naroditsky house register.
export const GLEK_SYSTEM_LESSON: LessonScript = {
  openingId: "glek-system",
  sources: ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
  title: "The Glek System — A Master Class",
  minutes: 12,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6", say: "We start from the most natural position in chess — the Four Knights. Both sides develop the knights to their best squares and nothing is committed. The classical answer here is the Spanish bishop to b5, but the Glek System takes a very different, modern road: instead of the old pin, White will fianchetto the light-squared bishop on g2. It blends a King's Indian Attack idea into an open game and gives White a flexible, hard-to-crack setup that grandmaster Mamedyarov has ridden to many wins.", sayShort: "Four knights out — the Glek road begins.", highlights: [H("g2", SOFT)] }),
    b({ id: "g3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3", say: "g3 — the Glek System itself, named for the grandmaster who made it respectable. This little pawn move announces the whole plan: the bishop is coming to g2, where it will rake the long light diagonal all the way to Black's queenside. It is calm on the surface, but behind that calm sits a concrete idea — build slowly, then turn a placid centre into a kingside attack. It is a clean, low-risk weapon that scores at every level, from club play to grandmaster speed chess — you never get mated in the opening, and Black almost always drifts.", sayShort: "g3 — the modern Glek fianchetto.", highlights: [H("g3", KEY)] }),
    b({ id: "bc5bg2", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2", say: "Black's most popular reply is Bc5, developing actively and eyeing f2, and White completes the fianchetto with Bg2. That bishop on g2 is the soul of the system. For now its own knight on f3 stands in front of it, but the moment that knight reroutes, the bishop will glare straight down the long diagonal at Black's centre and queenside. White's structure is solid and his plans stay flexible.", sayShort: "Bg2 — the fianchettoed bishop's home.", highlights: [H("g2", KEY), H("f3", SOFT)] }),
    b({ id: "tabiya", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O", say: "Both sides build calmly — d6 and d3 prop the centre pawns, a6 gives the bishop a retreat, and both castle into safety. Notice that Black plays …d6 before castling: that is not just development, it is essential — castling first walks straight into the fork trick Nxe5 and d4, which we punish elsewhere. This is the Glek tabiya: a closed, manoeuvring centre on e4 and e5, White's king snug behind the fianchetto. No contact yet, no forcing line — a positional system where White knows the plan and Black often does not.", sayShort: "O-O — the calm Glek tabiya.", highlights: [H("e4", KEY), H("e5", SOFT)] }),
    b({ id: "be3", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O h3 h6 Be3 Bxe3 fxe3", say: "h3 and h6 make luft, then White offers the trade of dark-squared bishops with Be3, and after Bxe3 recaptures toward the centre — fxe3. The point hides in that recapture. It opens the f-file for the rook and builds a broad pawn front on e3 and e4. White has quietly swapped the symmetrical calm for a small space edge and, more importantly, an open file to attack down.", sayShort: "fxe3 — open the f-file, build the centre.", highlights: [H("e3", KEY), H("e4", SOFT)] }),
    b({ id: "nh4f5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O h3 h6 Be3 Bxe3 fxe3 Ne7 Nh4 c6", say: "Now the plans crystallise. Black reroutes with Ne7 toward the centre, while White's knight hops to h4 heading for the dream square, f5 — an outpost where the knight cannot be chased by a pawn and dominates Black's kingside. Combined with the open f-file and the g2-bishop, White's quiet system has produced a real, lasting initiative. That patient build-up, from a handshake to a kingside bind, is the whole charm of the Glek.", sayShort: "Nh4 — knight heads for the f5 outpost.", arrows: [A("h4", "f5", INTENT)], highlights: [H("f5", KEY)] }),
  ],
};
