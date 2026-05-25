import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): GREEN arrows = vision / threat
// / intent, YELLOW highlights = a key square the narration names, SOFT BLUE =
// secondary context. Orange move-squares are auto-painted by the player.
// BLACK-oriented (student = Black, defending the QGD).
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
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

// The Orthodox / Capablanca spine — the "Main line" pill, from BLACK's side.
// Black declines, holds d5, and equalises with the Capablanca Freeing
// Maneuver (…Nd5), then the …e5 break frees the bad bishop. Masters-backed
// (PLAN.md QGD spine table); the deepest beat reaches 24 plies.
const QGD_MAIN = 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3';

export const QGD_LESSON: LessonScript = {
  openingId: 'qgd',
  title: "The Queen's Gambit Declined — A Master Class",
  minutes: 14,
  orientation: 'black',
  beats: [
    b({
      id: 'open',
      moves: 'd4 d5',
      highlights: [H('d5'), H('d4', SOFT)],
      say: "Welcome to the Queen's Gambit Declined — Black's most trusted, most classical answer to 1.d4. White opens d4 and you reply d5, planting your own pawn in the centre and refusing to give an inch. From the very first move the QGD's promise is simple: a rock-solid position that the strongest defenders in history — Lasker, Capablanca, Karpov — leaned on to neutralise White and equalise.",
      sayShort: '1…d5 — meet d4 in the centre.',
    }),
    b({
      id: 'decline',
      moves: 'd4 d5 c4',
      highlights: [H('c4'), H('d5', SOFT)],
      say: "White offers the c-pawn — the Queen's Gambit. But you will DECLINE it. Grabbing on c4 hands White the centre and a free tempo to reclaim the pawn; instead you hold d5 and make White prove his initiative is worth anything at all. The c4-pawn is no real gift, and you simply don't need it.",
      sayShort: 'c4 offered — decline; hold d5.',
    }),
    b({
      id: 'declined',
      moves: 'd4 d5 c4 e6',
      highlights: [H('e6'), H('d5', SOFT), H('c8')],
      say: "e6 — the move that names the defence. It buttresses d5 with a second pawn, so your centre becomes unbreakable. The price is honest: it shuts your light-squared bishop in on c8 for a while. But that bishop gets freed later, and a sound centre is worth far more than one temporarily sleepy piece. Soundness first — that is the whole QGD philosophy.",
      sayShort: '…e6 — buttress d5; soundness first.',
    }),
    b({
      id: 'the-pin',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5',
      arrows: [A('g5', 'f6', ATK)],
      highlights: [H('d5', SOFT)],
      say: "White develops Nc3, hitting d5, and you guard it naturally with Nf6. Then Bg5 — the pin, tying your f6-knight to the queen behind it. It looks annoying, but it is easily met, and every classical defender knows exactly how.",
      sayShort: 'Bg5 pins f6 — easily met.',
    }),
    b({
      id: 'unpin',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7',
      highlights: [H('e7'), H('f6', SOFT)],
      say: "Be7 — break the pin the classical way, the bishop stepping in front of the queen so your f6-knight is free once more. Solid and unhurried. Now you just finish developing; White has no way to punish so sound a setup.",
      sayShort: '…Be7 — unpin; free the f6-knight.',
    }),
    b({
      id: 'develop',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7',
      highlights: [H('d7'), H('e5', SOFT)],
      say: "Both sides develop. You castle into safety, White brings out his king-knight, and you choose Nbd7 — the flexible square. The knight supports a future e5 break and stays out of your own bishop's way. Your position is compact, harmonious, and very hard to attack.",
      sayShort: 'O-O, …Nbd7 — compact and ready.',
    }),
    b({
      id: 'orthodox',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6',
      highlights: [H('c6'), H('d5', SOFT)],
      say: "White lines his rook up on the c-file with Rc1. You answer c6 — the Orthodox setup — reinforcing d5 a third time and opening an escape square for your queen. Notice you are not being passive; every move shores up the very point White keeps attacking. He pushes, you hold.",
      sayShort: '…c6 — the Orthodox; hold d5 again.',
    }),
    b({
      id: 'release',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4',
      highlights: [H('c4')],
      say: "The instant White commits his bishop to d3, you strike: dxc4! Releasing the central tension at the perfect moment, you win a tempo by forcing the bishop to move again to recapture on c4. Timing is everything here — capture too early and you only help White develop; capture now and you gain the move for free.",
      sayShort: '…dxc4 — release with a tempo.',
    }),
    b({
      id: 'freeing',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5',
      arrows: [A('d5', 'c3', ATK)],
      say: "And here is the heart of Black's whole defence: Nd5 — the Capablanca Freeing Maneuver. Cramped for space, you plant the knight in the centre to force exchanges, because the side with less room always wants pieces off the board. It strikes White's knight on c3 and offers a wholesale liquidation. This one idea is how the QGD equalises.",
      sayShort: "…Nd5 — Capablanca's freeing maneuver.",
    }),
    b({
      id: 'trades',
      moves: QGD_MAIN,
      highlights: [H('e5', SOFT)],
      say: "White trades the dark-squared bishops with Bxe7, you recapture, both sides finish castling, and the knights come off — Nxc3, Rxc3. Look at what you've achieved: pieces traded, the cramp relieved, a sound and level position. White's much-vaunted initiative has evaporated. This is equality, earned the classical way — and the freeing break to e5 is next.",
      sayShort: 'Bxe7, …Nxc3 — traded to equality.',
    }),
    b({
      id: 'the-break',
      moves: `${QGD_MAIN} e5`,
      highlights: [H('e5'), H('e6', SOFT)],
      say: "And the freeing break arrives: e5! The pawn you prepared all along strikes at White's centre, opens lines for your pieces, and — crucially — frees the light-squared bishop that …e6 had shut in. The QGD's one liability is cured by its own thematic break. Black is fully equal, comfortable, and ready to play for the win.",
      sayShort: '…e5! — the freeing break; equal.',
    }),
    b({
      id: 'branch-lasker',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4',
      highlights: [H('e4')],
      say: "Black has an even more direct equaliser: the Lasker Defence, Ne4. The knight jumps to e4, offering to trade everything off at once — the bishops, a pair of knights, and any attacking pretensions White had. Emanuel Lasker used it to take the sting out of the QGD entirely. Its own tab walks the line.",
      sayShort: '…Ne4 — the Lasker; trade it all off.',
    }),
    b({
      id: 'branch-tartakower',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6',
      highlights: [H('b7')],
      say: "Or solve the bad bishop at its source — b6, the Tartakower, fianchettoing the problem piece to b7 where it rakes the long diagonal instead of rotting behind e6. Spassky and Karpov made this the choice of champions. A whole tab covers it.",
      sayShort: '…b6 — the Tartakower; free the bishop.',
    }),
    b({
      id: 'branch-cambridge',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5',
      arrows: [A('a5', 'c3', ATK)],
      say: "And for a counterpunch, the Cambridge Springs: after Nbd7 and c6, Black uncorks Qa5 — the queen swings out to skewer White's knight on c3 down the diagonal and set tricks against d4. Suddenly Black is the one attacking. It has its own tab too.",
      sayShort: '…Qa5 — Cambridge Springs counterattack.',
    }),
    b({
      id: 'close',
      moves: QGD_MAIN,
      highlights: [H('d5', SOFT), H('e5', SOFT)],
      say: "That is the Queen's Gambit Declined. You decline the pawn, plant your own on d5, and build a fortress White cannot crack. Trade with the Capablanca maneuver, free your bishop with the e5 break, and you have neutralised the first player's entire advantage. Orthodox, Lasker, Tartakower, Cambridge Springs — four roads to the same destination: a sound, equal game where Black is never worse and often plays for the win. The defence of world champions, and now yours.",
      sayShort: 'Decline, trade, …e5 — full equality.',
    }),
  ],
};
