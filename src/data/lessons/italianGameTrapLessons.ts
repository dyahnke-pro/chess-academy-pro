import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_italian-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
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

import type { PlayableMiddlegameLine } from '../../types';

export const ITALIAN_GAME_TRAP_LESSONS: Record<string, LessonScript> = {
  "legals-mate": {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "Légal's Mate — the Bishop Sacrifice",
  minutes: 4,
  orientation: "white",
  kind: "trap",
  beats: [
    b({ id: "l1", moves: "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4", say: "This is the oldest recorded trap in chess, named for Légal de Kermeur, Philidor's own teacher. Black has played a quiet d6 and then pinned the f3-knight with Bg4. The pin looks strong: the knight seems frozen, because moving it would expose White's queen on d1 to the g4-bishop. Most players believe a pinned piece simply cannot move. The Légal trap punishes exactly that belief.", sayShort: "…Bg4 — the pin that looks unbreakable.", arrows: [A("g4", "f3", ATK)], highlights: [H("g4", KEY), H("f3", SOFT)] }),
    b({ id: "l2", moves: "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5", say: "h3 asks the bishop a question. If Black breaks the pin himself with Bxf3, White simply recaptures and the danger passes. But the greedy, natural human move is Bh5, maintaining the pin and refusing to give up the bishop. That move walks straight into the oldest trick in the book.", sayShort: "h3 Bh5 — Black keeps the pin.", highlights: [H("h5", KEY)] }),
    b({ id: "l3", moves: "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5 Nxe5", say: "Nxe5!! The pinned knight moves anyway — and grabs a pawn. It looks like a blunder hanging the queen, and if Black sees the whole picture he plays Nxe5 declining the queen, staying only a pawn down. But the bait is irresistible: the white queen on d1 sits there for the taking. Most opponents cannot resist.", sayShort: "Nxe5!! — the pinned knight moves and grabs e5.", highlights: [H("e5", KEY), H("d1", SOFT)] }),
    b({ id: "l4", moves: "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5 Nxe5 Bxd1", say: "Bxd1?? Black snatches the queen, certain he has won. He has, in fact, just lost — by force, in two moves. White doesn't recapture the bishop. White plays for mate, and the f7-square, weak since move three, is the door.", sayShort: "…Bxd1?? — the queen grab that loses by force.", highlights: [H("d1", KEY), H("f7", SOFT)] }),
    b({ id: "l5", moves: "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#", say: "Bxf7+ Ke7 Nd5# — checkmate. The bishop checks from f7, the king is forced to e7, and the knight leaps to d5 delivering mate: the king cannot escape, every flight square is covered by the bishop on f7, the knight on d5, and White's own pieces. Three minor pieces and a pawn weave a perfect net while the Black queen looks on, useless, from d1. This is Légal's Mate — the immortal lesson that a pin is only as strong as the tactics it can survive. Whenever you see …Bg4 pinning your knight against an undefended queen, remember: the pin can be an illusion.", sayShort: "Bxf7+ Ke7 Nd5# — the minor pieces mate.", highlights: [H("f7", KEY), H("e7", KEY), H("d5", KEY)] }),
  ],
},

  "fried-liver": {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "The Fried Liver Attack",
  minutes: 5,
  orientation: "white",
  kind: "trap",
  beats: [
    b({ id: "f1", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5", say: "Against the Two Knights, White can play the brazen Ng5 — \"a real duffer's move\" Tarrasch sneered, and yet it is venomous. The knight jumps to g5 and, together with the c4-bishop, double-attacks f7. There is no good way to defend the pawn directly, so Black must counter in the centre.", sayShort: "Ng5 — knight and bishop both hit f7.", arrows: [A("g5", "f7", ATK)], highlights: [H("g5", KEY), H("f7", KEY)] }),
    b({ id: "f2", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5", say: "d5 exd5 — Black hits back in the centre and White grabs the pawn. Now comes the great fork in the road. Black's correct move is Na5!, the Polerio Defence: the knight hits the c4-bishop and chases it away, accepting a pawn deficit for safety. Knowing this move is how Black survives the Fried Liver. The temptation, though, is to recapture the pawn — and that is the slip the whole attack is built to punish.", sayShort: "d5 exd5 Na5 — the safe defence.", arrows: [A("a5", "c4", ATK)], highlights: [H("d5", KEY), H("a5", SOFT)] }),
    b({ id: "f3", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5", say: "Nxd5?! The natural recapture — and the move that earns its German name, the \"Fried Liver,\" because Black's position is about to be cooked. The knight grabs the pawn but now stands on d5 attacked by the c4-bishop, while f7 remains under fire from the g5-knight. White is ready to sacrifice.", sayShort: "…Nxd5?! — the greedy recapture gets cooked.", arrows: [A("g5", "f7", ATK), A("c4", "d5", ATK)], highlights: [H("d5", KEY), H("f7", KEY)] }),
    b({ id: "f4", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+", say: "Nxf7! Kxf7 Qf3+ — the knight sacrifices itself on f7, dragging the king out into the open on the seventh rank, and the queen swings to f3 with check. From f3 she does two jobs at once: she checks the exposed king and she skewers the loose d5-knight down the diagonal. Black is up a knight, but his king is walking and his pieces are hanging.", sayShort: "Nxf7! Kxf7 Qf3+ — drag the king, hit d5.", arrows: [A("f3", "f7", ATK), A("f3", "d5", ATK)], highlights: [H("f7", KEY), H("d5", SOFT)] }),
    b({ id: "f5", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3", say: "Ke6 — the only move. The king must step forward to e6 to defend the pinned d5-knight, because nothing else holds it. And now Nc3 brings the last piece into the assault, piling a third attacker onto the d5-knight and threatening to rip the centre open with the king sitting in the middle of the board. White has sacrificed a knight to lure the king to e6 and aim his whole army at it — at club level this attack is simply winning. The Fried Liver is the reason every Two Knights player must know Na5.", sayShort: "Ke6 Nc3 — the king is hunted.", arrows: [A("c3", "d5", ATK)], highlights: [H("e6", KEY), H("d5", KEY)] }),
  ],
},

  "blackburne-shilling": {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "Watch out: the Blackburne Shilling Gambit",
  minutes: 4,
  orientation: "white",
  kind: "trap",
  beats: [
    b({ id: "b1", moves: "e4 e5 Nf3 Nc6 Bc4 Nd4", say: "Here is a trap to AVOID — set for White, not by White. After Bc4 Black plays the odd-looking Nd4, the Blackburne Shilling Gambit. The knight jumps to the centre and seems to just hang the e5-pawn. Legend says Blackburne won shillings off amateurs with it in the pubs. White's greedy, natural reply loses on the spot.", sayShort: "…Nd4?! — the bait that offers e5.", highlights: [H("d4", KEY), H("e5", SOFT)] }),
    b({ id: "b2", moves: "e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5", say: "Nxe5?? Grab the pawn and the trap snaps shut. Qg5! forks the e5-knight and the g2-pawn at once. White cannot save both, and defending the knight runs into disaster on the kingside. This single queen move is the whole point of Black's gambit.", sayShort: "Nxe5?? Qg5! — the fork that springs the trap.", arrows: [A("g5", "e5", ATK), A("g5", "g2", ATK)], highlights: [H("e5", KEY), H("g2", KEY)] }),
    b({ id: "b3", moves: "e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#", say: "It ends in mate. Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3# — Black's queen storms in on g2, the knight that was sitting on d4 the whole time drops onto f3, and it mates the white king on e1: smothered, checkmate. White is the one who got fried, all for one greedy pawn grab. This is the danger; now learn the cure.", sayShort: "Nf3# — White is mated for one greedy pawn.", arrows: [A("f3", "e1", VIS)], highlights: [H("g2", KEY), H("f3", KEY), H("e1", KEY)] }),
    b({ id: "b4", moves: "e4 e5 Nf3 Nc6 Bc4 Nd4 Nxd4 exd4 c3", say: "Rewind. Against Nd4 the refutation is simple — just don't take the e5-pawn. The cleanest path is Nxd4! exd4 c3, trading off the impudent knight and then challenging the d4-pawn with c3. White stays a healthy step ahead in development with no risk at all. The whole gambit depends on White's greed; decline the bait and Black has simply misplaced his pieces. The rule to lock in: when a knight leaps to d4 offering e5, develop and challenge — never grab.", sayShort: "Nxd4 exd4 c3 — decline the bait, just develop.", highlights: [H("d4", KEY), H("c3", SOFT)] }),
  ],
},
};

export type ItalianTrapKind = 'weapon' | 'warning';
export interface ItalianTrapDef {
  id: string;
  name: string;
  kind: ItalianTrapKind;
  /** Hand-picked tab labels (lower-case) this trap appears on. */
  appliesTo: string[];
}

export const ITALIAN_GAME_TRAP_DEFS: ItalianTrapDef[] = [
  { id: 'legals-mate', name: 'Légal\'s Mate', kind: 'weapon', appliesTo: ['main'] },
  { id: 'fried-liver', name: 'The Fried Liver Attack', kind: 'weapon', appliesTo: ['two knights'] },
  { id: 'blackburne-shilling', name: 'The Blackburne Shilling Gambit', kind: 'warning', appliesTo: ['main'] },
];

export function getItalianTrapsForTab(tabKey: string): ItalianTrapDef[] {
  return ITALIAN_GAME_TRAP_DEFS.filter(
    (t) => t.appliesTo.includes(tabKey) && t.id in ITALIAN_GAME_TRAP_LESSONS,
  );
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export function getItalianTrapPlayableLine(id: string): PlayableMiddlegameLine | null {
  const lesson = ITALIAN_GAME_TRAP_LESSONS[id];
  if (!lesson || lesson.beats.length === 0) return null;
  const lineBeat = lesson.beats[lesson.beats.length - 1];
  const moves = lineBeat.moves;
  const annotations: string[] = moves.map(() => '');
  const arrows: AnnotationArrow[][] = moves.map(() => []);
  const highlights: AnnotationHighlight[][] = moves.map(() => []);
  for (const beat of lesson.beats) {
    if (beat.moves.length > moves.length) continue;
    if (!beat.moves.every((m, i) => m === moves[i])) continue;
    const ply = beat.moves.length - 1;
    annotations[ply] = beat.say;
    if (beat.arrows) arrows[ply] = beat.arrows;
    if (beat.highlights) highlights[ply] = beat.highlights;
  }
  return { fen: START_FEN, moves, annotations, arrows, highlights, title: lesson.title };
}
