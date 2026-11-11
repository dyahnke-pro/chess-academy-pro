// Trompowsky Attack — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=trompowsky-attack`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Standard: docs/OPENING-WATCH-BEATS.md.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'd5', 'e3', 'c5', 'Bd3', 'Nf6', 'c3', 'Nc6', 'Nd2', 'Bg4', 'Ngf3', 'e6', 'O-O', 'Rc8', 'Qa4', 'Nd7', 'Ne5', 'Ndxe5', 'Bxe5', 'Qd7', 'Bg3', 'Bh5', 'dxc5', 'Bxc5', 'Qh4', 'Bg6', 'Bxg6', 'fxg6', 'Nf3', 'Be7', 'Qf4', 'Bf6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — the queen's pawn takes the center and opens the diagonal for the bishop on c1. That bishop is the star of this opening: it comes out before either knight.", 'd4 — center, and the c1-bishop is free.'],
  ['…Nf6 — the most common answer, about six games in ten among masters. The knight develops and keeps watch on e4, so you cannot simply follow up with e4.', '…Nf6 — develops and watches e4.'],
  ['Bg5 — the move the opening is named for. Most masters play c4 or Nf3 here; you bring the bishop out first, ready to take on f6 and leave them with doubled pawns. With no c4 and no Nf3 on the board, the King\'s Indian, Nimzo and Grünfeld setups they prepared do not fit.', 'Bg5 — Bxf6 next would double their pawns.'],
  ['…Ne4 — they dodge the doubled pawns by jumping forward, and the knight hits your bishop on g5. It is the most popular reply among masters, just ahead of …d5 and …e6.', '…Ne4 — dodges and hits the bishop.'],
  ['Bf4 — the bishop steps back to an open diagonal, where it eyes c7. Bh4 is the other retreat, but on h4 the bishop sits on the rim and …g5 chases it again; masters choose Bf4 about eight times in ten.', 'Bf4 — open diagonal, eyes c7.'],
  ['…d5 — the solid choice: the pawn guards the knight on e4 and takes its share of the center. The sharper …c5 is played even more often by masters, and it has a tab of its own.', '…d5 — guards the knight, solid center.'],
  ['e3 — quiet and sturdy. It opens a road for the bishop on f1 and gives your d4 pawn a second guard. Masters choose it most often here; f3, to kick the knight, is the other main try.', 'e3 — solid center, frees the f1-bishop.'],
  ['…c5 — they hit your d4 pawn from the side, the standard way to challenge a d4 center. You keep the tension and finish your development first.', '…c5 — strikes at d4 from the side.'],
  ['Bd3 — the bishop develops with a threat: it hits the knight on e4, and that knight is the only piece guarding their c5 pawn.', 'Bd3 — hits the knight guarding c5.'],
  ['…Nf6 — the knight retreats and covers e4 again, keeping your e-pawn at home. The price: their pawn on c5 now has no guard at all.', '…Nf6 — retreats, leaves c5 loose.'],
  ['c3 — instead of grabbing on c5, you give d4 a pawn behind it, so any capture there is met by a recapture and your center stays put. Moving the c-pawn also opens the d1–a4 diagonal for your queen.', 'c3 — props up d4, opens a4.'],
  ['…Nc6 — natural development, and a second piece aimed at your d4 pawn. With c3 in place, d4 stands firm.', '…Nc6 — develops, adds pressure on d4.'],
  ['Nd2 — the queen\'s knight goes to d2, because your c-pawn already stands on c3. From d2 it supports a later e4 and leaves f3 for the other knight.', 'Nd2 — behind the pawns, eyes e4.'],
  ['…Bg4 — the bishop comes out actively, and with your king\'s knight still at home it looks straight through e2 at your queen on d1.', '…Bg4 — eyes your queen on d1.'],
  ['Ngf3 — the knight develops and blocks the bishop\'s line to your queen. Now it is pinned to the queen, but that is harmless for now: later it will jump to e5 and hit the bishop itself.', 'Ngf3 — develops and blocks the bishop.'],
  ['…e6 — the pawn opens a road for the bishop on f8 and gives d5 extra support. Their light-squared bishop is already outside the pawn chain on g4, so this costs them nothing.', '…e6 — solid, frees the f8-bishop.'],
  ['Castle. Your king is safe and the rook comes toward the center, ready for an e4 or c4 break later.', 'O-O — king safe, rook joins.'],
  ['…Rc8 — the rook goes to the c-file, where their c5 pawn and your c3 pawn face each other. If the file opens, the rook is already there.', '…Rc8 — rook to the c-file.'],
  ['Qa4 — the queen uses the diagonal that c3 opened and pins the knight on c6 to their king. A pinned knight cannot take back on anything, so the pressure on c6 is real.', 'Qa4 — pins the knight on c6.'],
  ['…Nd7 — the second knight steps between c6 and their king, so the c6 knight is free again. From d7 it also guards their c5 pawn.', '…Nd7 — breaks the pin, guards c5.'],
  ['Ne5 — the pinned knight on f3 jumps into the center with tempo. It attacks their bishop on g4, which has no guard, and hits both knights on c6 and d7 as well.', 'Ne5 — hits the loose bishop on g4.'],
  ['…Ndxe5 — they take your knight at once, and their knight on e5 now hits your bishop on d3. But taking with the d7 knight reopens the pin: the knight on c6 is stuck to their king again.', '…Ndxe5 — takes, but c6 is pinned again.'],
  ['Bxe5 — take back with the bishop, not the pawn: after dxe5, …c4 would hit your bishop on d3. On e5 the bishop pins their g7 pawn to the rook on h8 and stares at their kingside.', 'Bxe5 — bishop recaptures, pins g7.'],
  ['…Qd7 — the queen steps in front of their king, so the knight on c6 is no longer pinned to it, and the queen guards the knight as well.', '…Qd7 — unpins c6 for good.'],
  ['Bg3 — the bishop steps back before …f6 can kick it. On g3 it is out of reach and still covers d6.', 'Bg3 — safe square, still eyes d6.'],
  ['…Bh5 — the bishop backs off to h5. Nothing attacks it there yet, but it has no guard, and that will matter in two moves. The engine prefers …c4, gaining space with tempo on your bishop.', '…Bh5 — retreats, but without a guard.'],
  ['dxc5 — here the move order matters. Taking on c5 clears your own pawn off d4, which opens the fourth rank for your queen: next, Qh4 hits the loose bishop on h5.', 'dxc5 — opens the fourth rank for Qh4.'],
  ['…Bxc5 — they take back, and the bishop now aims at your e3 pawn. The bishop on h5 is still without a guard.', '…Bxc5 — recaptures, eyes e3.'],
  ['Qh4 — the queen slides across the open fourth rank and attacks the bishop on h5. Castling now would simply drop it to Qxh5.', 'Qh4 — attacks the loose bishop.'],
  ['…Bg6 — the bishop finds a safe square and offers a trade with your bishop on d3.', '…Bg6 — safe square, offers a trade.'],
  ['Bxg6 — take the trade. Whichever pawn takes back, they are left with doubled g-pawns, and the usual recapture with the f-pawn takes the guard away from their e6 pawn.', 'Bxg6 — trade, doubles their g-pawns.'],
  ['…fxg6 — the natural recapture. It opens the f-file for their rook, but e6 is now a weakness that only pieces can guard.', '…fxg6 — f-file opens, e6 weakens.'],
  ['Nf3 — the knight comes back to the center, aiming at e5 and g5. With their f-pawn gone from f7, no pawn of theirs can ever challenge a knight on e5.', 'Nf3 — heads for the e5 outpost.'],
  ['…Be7 — the bishop retreats with a threat to your queen on h4, and taking it is out of the question: the bishop on e7 is guarded three times.', '…Be7 — hits your queen on h4.'],
  ['Qf4 — the queen sidesteps and lands where it covers e5, the square your knight is heading for.', 'Qf4 — sidesteps, covers e5.'],
  ['…Bf6 — the bishop takes the long diagonal toward your c3 pawn and prepares …e5 to free their game. Your plan for the middlegame: keep e5 under control with your pieces, and their weak e6 pawn and doubled g-pawns stay long-term targets.', '…Bf6 — eyes c3, wants …e5.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

export const TROMPOWSKY_ATTACK_WATCH: WatchCourse = {
  openingId: 'trompowsky-attack',
  title: 'Trompowsky Attack',
  orientation: 'white',
  sources: ['concept:pos-development', 'concept:pos-outpost', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
  lines: [
    { tab: null, moves: MAIN },
  ],
  beats,
};
