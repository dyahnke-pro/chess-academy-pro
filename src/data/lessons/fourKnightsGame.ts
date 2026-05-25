import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
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

export const FOUR_KNIGHTS_GAME_LESSON: LessonScript = {
  openingId: "four-knights-game",
  sources: ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
  title: "The Four Knights Game — A Master Class",
  minutes: 13,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6", say: "Welcome to the Four Knights — the most natural opening in all of chess. e4 e5, then both sides simply develop their knights to their best squares: Nf3 and Nc6, Nc3 and Nf6. No pawn is hung, no bishop is committed, nothing is forced. It looks like a handshake. But this calm symmetry hides a deep truth Steinitz, Tarrasch and Lasker all knew: in a perfectly balanced position, the player who breaks the symmetry at the right moment wins. That is the whole art of the Four Knights.", sayShort: "Four knights out — the classical battlefield.", arrows: [A("f3", "e5", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "bb5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5", say: "Bb5 — the Spanish Four Knights, the line Kramnik revived at the very top. The bishop borrows the Ruy Lopez idea: it pins nothing yet, but it leans on the c6-knight that guards e5. White makes the first tiny asymmetry and quietly prepares the d3-d4 central break. This is the showcase main line, and it asks Black a real question on move four.", sayShort: "Bb5 — the Spanish, pressuring c6.", arrows: [A("b5", "c6", ATK)], highlights: [H("c6", KEY)] }),
    b({ id: "bb4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4", say: "Bb4 — Black mirrors. The bishop pins the c3-knight exactly as White pins on the other wing, and the symmetry returns. This copycat defence is solid and sound, but it carries the danger of all symmetry: someone must blink first. Whoever finds the right moment to stop copying and strike will hold the advantage.", sayShort: "…Bb4 — Black mirrors, pinning c3.", arrows: [A("b4", "c3", ATK)], highlights: [H("c3", KEY)] }),
    b({ id: "castle", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O", say: "O-O O-O — both kings tuck into safety and the mirror still holds. Everything is developed harmoniously, the centre is locked at e4 and e5, and the position radiates calm. Now White must begin the slow work of creating an imbalance, because nothing falls into your lap in a symmetrical position — you have to build the advantage yourself.", sayShort: "O-O O-O — both castle, symmetry holds.", highlights: [H("e4", KEY), H("e5", SOFT)] }),
    b({ id: "d3d6", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6", say: "d3 d6 — each side props the centre pawn and opens a diagonal for the dark-squared bishop. We have reached the classical Four Knights tabiya: a quiet, fully-developed, near-symmetrical battlefield. The pawn on d3 looks modest, but it supports a future d4 break that will be the lever White uses to crack the position open at the right moment.", sayShort: "d3 d6 — prop the centre, prepare d4.", highlights: [H("d3", KEY), H("d4", SOFT)] }),
    b({ id: "bg5", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5", say: "Bg5 — the first move that breaks the spell. White pins the f6-knight, and Black simply cannot copy: an answering Bg4 would let White take on f6 and wreck Black's kingside pawns. The symmetry is broken on White's terms. This little pin is the start of the plan — pressure f6, provoke a concession, and emerge with the two bishops.", sayShort: "Bg5 — pin f6, break the symmetry.", arrows: [A("g5", "f6", ATK)], highlights: [H("f6", KEY)] }),
    b({ id: "metger", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7", say: "Bxc3 bxc3 Qe7 — the Metger Unpin, Black's main defence. Black trades on c3 to saddle White with doubled c-pawns, then plays Qe7 to break the g5-pin: the queen now backs the knight on f6, so White can no longer win it. White has accepted a structural blemish, but look closely: the doubled pawns control extra central squares, and White now owns the bishop pair in a position that will soon open. That is the bargain of the Spanish Four Knights — structure for the two bishops.", sayShort: "Bxc3 bxc3 Qe7 — the Metger Unpin.", arrows: [A("e7", "f6", VIS)], highlights: [H("c3", KEY), H("f6", SOFT)] }),
    b({ id: "re1nd8", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7 Re1 Nd8", say: "Re1 Nd8 — both sides reroute. White lifts the rook to e1, backing the e4-pawn and the coming central break, while Black begins the famous Metger manoeuvre: the c6-knight steps back to d8, heading for e6 to challenge the g5-bishop and the d4-square. It looks slow, but every Four Knights middlegame is a manoeuvring battle — the side that improves its worst piece fastest takes over.", sayShort: "Re1 Nd8 — reroute the knight toward e6.", arrows: [A("e1", "e4", VIS)], highlights: [H("e4", KEY), H("e6", SOFT)] }),
    b({ id: "d4", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7 Re1 Nd8 d4", say: "d4! Now it comes. With the bishop pair in hand and pieces ideally placed, White strikes the centre. The d4-break is the recurring idea of the whole opening: open lines for the two bishops, where they will outgun Black's bishop-and-knight in the increasingly open position. The quiet symmetrical game has turned into a fight for the centre — and White struck first.", sayShort: "d4! — open the centre for the bishops.", highlights: [H("d4", KEY)] }),
    b({ id: "ne6", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7 Re1 Nd8 d4 Ne6", say: "Ne6 — the Metger knight arrives, hitting the g5-bishop and planting itself on a fine central square. White will retreat the bishop and keep the tension. The position is rich and roughly balanced, but White's trumps are clear and durable: the two bishops and the half-open b-file from the doubled pawns, aimed straight at Black's queenside.", sayShort: "…Ne6 — the knight hits the bishop.", arrows: [A("e6", "g5", ATK)], highlights: [H("e6", KEY), H("g5", SOFT)] }),
    b({ id: "close", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7 Re1 Nd8 d4 Ne6 Bc1 c5", say: "Bc1 c5 and we reach the Spanish Four Knights middlegame. White has the bishop pair and a flexible centre; Black challenges with c5 to fight for d4 and untangle. That is the Four Knights in one breath — develop naturally, refuse to copy forever, break the symmetry with Bg5 and d4, and let the two bishops do the talking. The other tabs show its other faces: the open Scotch Four Knights, Glek's modern fianchetto, the tricky Italian fork-trick, and Rubinstein's bold Nd4 counter. The Halloween Gambit, 4.Nxe5, is fun but objectively dubious — admire it, don't trust it.", sayShort: "Bc1 c5 — the bishop pair, an open centre.", highlights: [H("d4", KEY), H("c5", SOFT)] }),
  ],
};
