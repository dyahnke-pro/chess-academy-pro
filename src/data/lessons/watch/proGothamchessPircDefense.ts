// Pirc Defense (the pro repertoire) — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet: masters' percentages,
// engine lines at a fixed depth, the board after each move. The student plays
// Black. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). One story runs through every line: let them build the big
// center, put the bishop on g7, and hit the center from the side. The
// masterclass Pirc (pircDefence*) is a separate course and is untouched.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7', 'Nf3', 'c5', 'Bb5+', 'Nc6', 'e5', 'Nd7', 'dxc5', 'dxe5', 'fxe5', 'Qa5', 'O-O', 'Ndxe5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — just under half of all master games start this way, and it's the engine's first choice. The pawn grabs the center and covers d5 and f5. In the Pirc you let them have that center, and then you go after it.", "e4 — they take the center."],
  ["…d6 — only about three masters in a hundred, and the engine prefers …c5 or …e5, by about a quarter of a pawn. So why this? The pawn covers e5 and c5 and opens the diagonal for your bishop on c8, and it keeps your plans hidden: they can't tell yet where your pieces are going. The Pirc's idea is to let them build a big center and then hit it from the side. They are a little better.", "…d6 — flexible; covers e5 and c5."],
  ["d4 — almost every master accepts the invitation: two pawns side by side on d4 and e4. Neither one is under attack yet. That's about to change.", "d4 — the full center."],
  ["…Nf6 — eight masters in ten. The knight develops with a hit on e4, and nothing guards that pawn yet. So their next move has to deal with it.", "…Nf6 — hits e4."],
  ["Nc3 — nine masters in ten. The knight guards e4, and the center stands. Now it's your choice how to set up.", "Nc3 — guards e4."],
  ["…g6 — about half the masters, and this is the Pirc. The pawn makes room for your bishop on g7, on the long diagonal that runs straight through d4. The engine prefers a pawn on e5, hitting the center right away, but …g6 is the plan: let them build, then hit back from the side.", "…g6 — the bishop goes to g7 next."],
  ["f4 — the Austrian Attack, about one master in four, and the engine's first choice. Now three pawns stand side by side on d4, e4 and f4, and f4 backs up e5: they're getting ready to push e5 and kick your knight off f6. They are clearly better. This is the sharpest answer to the Pirc, and it means you can't sit still.", "f4 — the Austrian Attack; e5 next."],
  ["…Bg7 — nearly every master. The bishop reaches the long diagonal, though your own knight on f6 stands in front of it for now. Castling is one move away.", "…Bg7 — on the long diagonal."],
  ["Nf3 — nine masters in ten. The knight guards d4 and e5. Now the big question: do you castle first, or hit the center right now?", "Nf3 — guards d4 and e5."],
  ["…c5 — the engine's first choice, though seven masters in ten castle first. Here's the counterpunch: the pawn hits d4 from the side, at the base of their big center. Their queen and knight guard it, but now they have to decide: take, push past, or check.", "…c5 — hits d4 from the side."],
  ["Bb5+ — just over half the masters, and the engine's first choice: check first. You have to block, on d7 or c6, and whatever blocks will stand in a pin, between the bishop on b5 and your king.", "Bb5+ — check first."],
  ["…Nc6 — only about three masters in a hundred; nearly all of them block with …Bd7, and the engine prefers that too. The knight blocks and hits d4 a second time. But it's pinned now, to your king, by the bishop on b5, and that's the risk: d5 would hit the pinned knight, and the engine rates that push as their best answer, more than a pawn in their favour. They are a little better.", "…Nc6 — blocks, hits d4; but pinned."],
  ["e5 — about one master in ten, and good news for you: the engine rates d5 more than a pawn better, and even dxc5 is better than this. The pawn hits your knight on f6 and the pawn on d6, so the knight has to move. They're pushing too far, and it's about level now.", "e5 — hits f6; d5 was stronger."],
  ["…Nd7 — the engine's choice. Why not take on e5 first? …dxe5, dxe5 just hits the knight again, and the engine rates that about half a pawn worse. So the knight steps back to d7, and it hits e5 at once. And look what it uncovers: with f6 empty, your bishop on g7 now looks straight at e5 too.", "…Nd7 — hits e5; frees the g7 bishop."],
  ["dxc5 — they take on c5, and the pawn hits d6. But nothing guards it there: that's a pawn you can win back.", "dxc5 — hits d6, but unguarded."],
  ["…dxe5 — the engine's choice. Your pawn takes on e5 and hits f4. Count what's left of their center: the d-pawn has wandered off to c5, the e-pawn is gone, and only f4 still stands.", "…dxe5 — hits f4; the center crumbles."],
  ["fxe5 — the engine's choice. They take back, and you're a pawn down for the moment. But look at their pawns on c5 and e5: no pawn of theirs guards either one.", "fxe5 — they're a pawn up, for now."],
  ["…Qa5 — the engine's choice. The queen pins their knight on c3 to the king on e1, and from a5 it hits the bishop on b5 and the pawn on a2. Now they're the ones untangling, and the pawns on c5 and e5 are still there to be won back.", "…Qa5 — pins c3, hits b5."],
  ["O-O — they castle, and with the king off e1 the knight on c3 is free again. But it cost them the move: your knight takes back e5.", "O-O — the c3 pin is gone."],
  ["…Ndxe5 — the engine's choice, and the pawn is back: material is level. Your knight lands in the center and hits the one on f3, while your other knight is still pinned on c6 by the bishop on b5. It's about level. Your plan for the middlegame: when they trade on e5, take back with the bishop and castle, and that bishop stands on e5 aimed at their knight on c3.", "…Ndxe5 — level; bishop to e5, castle."],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line (or an earlier tab) doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Austrian Attack (f4)': ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7', 'Nf3', 'c5', 'Bb5+', 'Nc6', 'e5', 'Nd7', 'dxc5', 'dxe5', 'fxe5', 'Qa5', 'O-O', 'Ndxe5'],
  'Classical (Nf3 setup)': ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Nf3', 'Bg7', 'Be2', 'O-O', 'O-O', 'Nc6', 'd5', 'Nb8', 'Bg5', 'e5', 'dxe6', 'Bxe6', 'Re1', 'Nc6', 'Nd5', 'Bxd5', 'exd5', 'Ne7'],
  '150 Attack (Be3 + f3)': ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'c6', 'f3', 'b5', 'a3', 'Nbd7', 'g4', 'Bg7', 'h4', 'h5', 'g5', 'Nh7', 'f4', 'Nb6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The main line's own moves: every beat is already written above.
  'Austrian Attack (f4)': [],
  'Classical (Nf3 setup)': [
    ["Nf3 — the Classical, about one master in four. No pawn storm this time: the knight develops and guards d4 and e5, and they're aiming for a calmer game.", "Nf3 — calm development; guards d4."],
    ["…Bg7 — nearly every master. The bishop takes its place on g7, on the long diagonal, and castling is next.", "…Bg7 — the fianchetto."],
    ["Be2 — six masters in ten, the quiet setup: the bishop clears f1 so they can castle. The engine slightly prefers Be3.", "Be2 — quiet; castling next."],
    ["…O-O — nearly every master. Your king tucks in behind the bishop on g7 and the pawns on f7, g6 and h7. Now, how do you hit their center?", "…O-O — safe behind the fianchetto."],
    ["O-O — they castle too. Both kings are safe, and their pawns on d4 and e4 still have the center to themselves. Your move to change that.", "O-O — both kings safe."],
    ["…Nc6 — about one master in ten. The knight hits d4 straight away, but it stands where their d-pawn can push and kick it. The engine prefers …e5, hitting d4 with a pawn instead, and the masters' favourite is …c6.", "…Nc6 — hits d4; d5 can kick it."],
    ["d5 — six masters in ten, and the engine's first choice. The pawn kicks your knight on c6 and grabs space. Where does the knight go?", "d5 — kicks the knight."],
    ["…Nb8 — eight masters in ten, and the engine's choice. Back home looks like a waste of time, but on b8 the knight is safe, and it comes out again through d7. And their pawn on d5 has stepped ahead of e4, so …e6 can hit it.", "…Nb8 — back home, then d7."],
    ["Bg5 — about one master in ten. The bishop hits your knight on f6. It isn't a pin yet: your e7 pawn stands between the knight and your queen on d8. Keep that in mind for your next move.", "Bg5 — hits f6; e7 shields d8."],
    ["…e5 — only about seven masters in a hundred, and the engine rates it about a third of a pawn worse than …Bg4 or …Nbd7. Here's the catch: the pawn leaves e7, so now the bishop on g5 pins your knight on f6 to the queen. And the pawn steps right next to their pawn on d5, which can take it en passant.", "…e5 — creates the pin on f6."],
    ["dxe6 — the engine's first choice. They take en passant, and the pawn on e6 hits f7. It's loose, though: you take back.", "dxe6 — en passant, hits f7."],
    ["…Bxe6 — the engine's choice; …fxe6 would be worse. The bishop takes back and lands on an open diagonal, aimed all the way at a2. But the pin on f6 is still there.", "…Bxe6 — takes back, aims at a2."],
    ["Re1 — the rook takes the e-file, but it's a slip: the engine wanted Nd4, hitting your bishop on e6, and rates Re1 more than half a pawn worse. Now it's about level.", "Re1 — a slip; Nd4 was the move."],
    ["…Nc6 — and here you slip back. The knight comes out, but the engine wanted …h6, hitting the bishop on g5 to get rid of the pin; …Nc6 costs about two-thirds of a pawn, and now they are clearly better.", "…Nc6 — a slip; …h6 first."],
    ["Nd5 — and they return the favour. The knight jumps to d5 and hits c7 and your pinned knight on f6, but the engine wanted Qd2, and Nd5 costs more than half a pawn. Your bishop on e6 can simply take it. It's about level.", "Nd5 — a slip; take it."],
    ["…Bxd5 — you take the knight before it does any damage. The engine slightly prefers …Ne5, but this is simple. Now your bishop on d5 hits e4 and a2, and they have to take back.", "…Bxd5 — removes the knight."],
    ["exd5 — the engine's first choice. The pawn takes back and hits your knight on c6 again. This knight keeps getting chased.", "exd5 — kicks the knight again."],
    ["…Ne7 — the knight steps to e7 and hits d5 at once. Look at that pawn: no pawn of theirs guards it right now, so it's a target. It's about level. Your plan for the middlegame: …h6 to break the pin on f6, then …Nf5 and …Re8 to fight for the e-file.", "…Ne7 — hits d5; …h6 next."],
  ],
  '150 Attack (Be3 + f3)': [
    ["Be3 — about one master in five. The bishop guards d4 and looks down the diagonal to h6, and Qd2 usually comes next. That's the 150 Attack's idea: queen and bishop lined up toward h6, ready to trade off your bishop once it reaches g7.", "Be3 — aims at h6."],
    ["…c6 — about six masters in ten. A quiet move with a plan: the pawn covers b5 and d5, and it gets your queenside ready to roll with …b5. If they're going to attack on one wing, you start on the other.", "…c6 — gets …b5 ready."],
    ["f3 — about one master in eight. The pawn props up e4 and takes g4 away from your pieces, and it lets their g-pawn march later. The engine prefers Nf3, by about a fifth of a pawn.", "f3 — props up e4."],
    ["…b5 — about half the masters, and the engine's first choice. The pawn grabs space and threatens to keep going: …b4 would hit the knight on c3, one of the guards of e4.", "…b5 — …b4 is coming."],
    ["a3 — the answer: now if …b4, the a-pawn takes, and the knight on c3 stays where it is.", "a3 — stops …b4."],
    ["…Nbd7 — the knight develops toward b6, where it can watch c4 and a4.", "…Nbd7 — heading for b6."],
    ["g4 — here comes the storm. The pawn is heading for g5, to kick your knight off f6.", "g4 — the storm begins."],
    ["…Bg7 — the engine's choice: the bishop takes the long diagonal. Notice where their pawns are heading: g4 and soon h4, the side where your king would castle.", "…Bg7 — long diagonal."],
    ["h4 — the engine's choice. The h-pawn joins in, so when g5 comes, h4 is right behind it.", "h4 — backs up g5."],
    ["…h5 — the engine's choice. The pawn hits g4, and it stops their h-pawn dead: it can't get past h5. Castling here instead would be almost a third of a pawn worse.", "…h5 — hits g4, blocks h4."],
    ["g5 — the engine's choice. The pawn kicks your knight on f6. Where does it go?", "g5 — kicks the knight."],
    ["…Nh7 — the engine's choice, and by a lot: …Ng8 is about a pawn worse, and …Nxe4 just gives the knight for a pawn after fxe4. On h7 the knight hits g5 straight back.", "…Nh7 — hits g5 back."],
    ["f4 — the engine's choice. The pawn guards g5 again, and now look at their kingside pawns: e4, f4, g5 and h4, all rolling forward.", "f4 — guards g5; the pawns roll."],
    ["…Nb6 — the knight reaches b6, where it eyes c4 and a4. They are a little better. Your plan for the middlegame: …a5 and …b4, opening lines on the queenside while their pawns are busy on the other wing.", "…Nb6 — eyes c4; …a5 and …b4."],
  ],
};

/** File a tab's beats on the first moves it doesn't share with what is already written. */
for (const [tab, moves] of Object.entries(TAB_LINES)) {
  const own = TAB_BEATS[tab] ?? [];
  let k = 0;
  while (k < moves.length && beats[moves.slice(0, k + 1).join(' ')]) k += 1;
  if (own.length !== moves.length - k) throw new Error(`${tab}: ${own.length} beats for ${moves.length - k} unshared moves`);
  own.forEach(([say, sayShort], i) => { beats[moves.slice(0, k + i + 1).join(' ')] = { say, sayShort }; });
}

export const PRO_GOTHAMCHESS_PIRC_DEFENSE_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-pirc-defense',
  title: "This repertoire's Pirc — Let Them Build It, Then Knock It Down",
  orientation: 'black',
  sources: ['concept:pos-center', 'https://www.chess.com/openings/Pirc-Defense', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
