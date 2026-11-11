// Pirc Defense (the pro repertoire) — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet: masters' percentages,
// engine lines at a fixed depth, the board after each move. The student plays
// Black. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). One story runs through every line: let them build the big
// center, put the bishop on g7, and hit the center from the side. The
// masterclass Pirc (pircDefence*) is a separate course and is untouched.
//
// Pass two (2026-11-11): every beat re-read against the teaching computers' facts
// and each move's verdict line; the arrow deriver run over every beat (no arrow
// drawn for the wrong side). Lines the sheet does not show, each read with
// Stockfish at depth 20 before it was taught: f4 before Nc3 met by …Nxe4 (a
// pawn); e5 at once after …Bg7 met by …Nfd7; dxc5 after …c5 met by …Qa5 and
// …Qxc5; d5 against the pinned c6 knight met by …a6 (the only move); …Nxc5
// after they castle met by Qd5 (a piece); …Nd4 after d5 met by Nxd4 (a piece);
// …Na5 after d5 met by b4 (the knight for a pawn); …fxe6 met by e5; Qxd5 met
// by …Nxd5 (about two pawns worse for them); e5 after …Nbd7 met by …dxe5 (a
// pawn); g5 at once after …Bg7 met by …Nh5; castling into h5. The three
// closing plans were read the same way.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7', 'Nf3', 'c5', 'Bb5+', 'Nc6', 'e5', 'Nd7', 'dxc5', 'dxe5', 'fxe5', 'Qa5', 'O-O', 'Ndxe5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — just under half of all master games start this way, and it's the engine's first choice. The pawn grabs the center and covers d5 and f5. In the Pirc you let them have that center, and then you go after it.", "e4 — they take the center."],
  ["…d6 — only about three masters in a hundred. So why this? The pawn covers e5 and c5, and those are the two squares your counterpunch comes from later: a pawn you push to either one now has support. It also opens the diagonal for your bishop on c8. That's the Pirc's idea: let them build a big center, and then hit it from the side. They are a little better.", "…d6 — covers e5 and c5."],
  ["d4 — almost every master accepts the invitation: two pawns side by side on d4 and e4. Neither one is under attack yet. That's about to change.", "d4 — the full center."],
  ["…Nf6 — eight masters in ten. The knight develops with a hit on e4, and nothing guards that pawn yet. So their next move has to deal with it.", "…Nf6 — hits e4."],
  ["Nc3 — nine masters in ten. Why not push the f-pawn first and build the big center right away? Because e4 was hanging: after f4, …Nxe4 just wins a pawn. So the knight guards e4 first, and only then can more pawns come forward. Now it's your choice how to set up.", "Nc3 — guards e4 before f4."],
  ["…g6 — about half the masters, and this is the Pirc. The pawn makes room for your bishop on g7, on the long diagonal that runs straight through d4. About a third of the masters put a pawn on e5 instead and fight for the center at once. This is the patient way: let them build, then hit back from the side.", "…g6 — the bishop goes to g7 next."],
  ["f4 — the Austrian Attack, about one master in four, and the engine's first choice. Now three pawns stand side by side on d4, e4 and f4, and the new one covers e5: they're getting ready to push the e-pawn there and kick your knight off f6. They are a little better. This is the sharpest answer to the Pirc, and it means you can't sit still.", "f4 — the Austrian Attack; e5 next."],
  ["…Bg7 — nearly every master. The bishop reaches the long diagonal, though your own knight on f6 stands in front of it for now. And if they push to e5 right away? Then …Nfd7: the knight steps back, the diagonal opens, and their pawn on e5 is hit three times, by the bishop, the knight and your pawn on d6.", "…Bg7 — long diagonal; e5 meets …Nfd7."],
  ["Nf3 — nine masters in ten. The knight guards d4 and e5. Now the big question: do you castle first, or hit the center right now?", "Nf3 — guards d4 and e5."],
  ["…c5 — the engine's first choice, though seven masters in ten castle first. Here's the counterpunch: the pawn hits d4 from the side. But can't they just take it? Let them. After dxc5 you play …Qa5, pinning their knight on c3 to the king. Now the pawn on e4 has no real guard, so they have to spend a move on it, and your queen takes the pawn back on c5. Remember that queen move. It comes back.", "…c5 — hits d4; dxc5 meets …Qa5."],
  ["Bb5+ — just over half the masters; about a third take on c5 at once. Why check first? The capture will still be there later, so they save it. First they make you block, on d7 or c6, and a knight that blocks there stands in a pin, between the bishop on b5 and your king.", "Bb5+ — check first; c5 can wait."],
  ["…Nc6 — only about three masters in a hundred; nearly all of them block with …Bd7. The knight blocks and hits d4 a second time. But look at the price: it's pinned to your king by the bishop on b5, and a pinned piece is a target. The move to fear is d5, a pawn hitting a knight that can't move. You'd have to answer …a6 and chase the bishop, just to win a piece back for the knight. They are a little better.", "…Nc6 — blocks, hits d4; but pinned."],
  ["e5 — about one master in ten, and good news for you. Remember the push you were afraid of, their d-pawn hitting your pinned knight? The engine prefers it, by more than a pawn. They push the other pawn instead: it hits your knight on f6 and the pawn on d6, so the knight has to move. It's about level now.", "e5 — hits f6; d5 was stronger."],
  ["…Nd7 — the engine's choice. Why not take on e5 first? …dxe5, dxe5 just hits the knight again, about half a pawn worse. So the knight steps back, and from d7 it does two things. It shields your king, so the knight on c6 isn't pinned any more. And it makes four attackers on e5, with the pawn on d6, the other knight, and the bishop on g7 now that f6 is clear, against three defenders.", "…Nd7 — unpins c6; four hit e5."],
  ["They take on c5, the capture they were saving since the check. The pawn hits d6. But look what it left behind: it was one of the three guards of e5, and on c5 nothing guards it. Two targets for you now.", "dxc5 — hits d6, but unguarded."],
  ["…dxe5 — the engine's choice. Your pawn takes on e5 and hits f4. Count what's left of their center: the d-pawn has wandered off to c5, the e-pawn is gone, and only f4 still stands.", "…dxe5 — hits f4; the center crumbles."],
  ["fxe5 — the engine's choice. They take back, and you're a pawn down for the moment. But look at that pawn on e5: it's isolated now, with no pawn on either side to help it, and only the knight on f3 guards it, against your two knights and your bishop. And the pawn on c5 has no guard at all.", "fxe5 — e5 is isolated, c5 loose."],
  ["…Qa5 — the engine's choice, and the queen move you saw earlier. Why not take on e5 at once? Because your knight on d7 is all that stands between the two queens: when it leaves, they trade on d8 with check, your king has to take back, and it never castles. So the queen steps off the d-file first, and with a pin: their knight on c3 can't move while the king sits on e1. From a5 it hits the bishop on b5 too.", "…Qa5 — pins c3, keeps queens on."],
  ["They castle, and with the king off e1 the knight on c3 is free again. Now you can win a pawn back, and there are two on offer. Careful with the one on c5: …Nxc5 runs into Qd5, hitting that knight and the one on c6, which is pinned again the moment d7 is empty. That costs a piece.", "O-O — the pin ends; avoid …Nxc5."],
  ["…Ndxe5 — the engine's choice, and this is the pawn to take: material is level. Your knight lands in the center and hits the one on f3. The price is the old pin: with nothing on d7, your knight on c6 is pinned again by the bishop on b5. It's about level. Your plan for the middlegame: when they trade knights on e5, take back with the bishop and castle, and that bishop stands in the center aimed at their knight on c3.", "…Ndxe5 — level; bishop to e5, castle."],
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
    ["Be2 — six masters in ten, the quiet setup. Why not a more active square? On b5 your c-pawn would simply kick the bishop away. On e2 it's out of reach, and f1 is clear so they can castle.", "Be2 — quiet; castling next."],
    ["You castle, like nearly every master. Your king tucks in behind the bishop on g7 and the pawns on f7, g6 and h7. Now, how do you hit their center?", "…O-O — safe behind the fianchetto."],
    ["O-O — they castle too. Both kings are safe, and their pawns on d4 and e4 still have the center to themselves. Your move to change that.", "O-O — both kings safe."],
    ["…Nc6 — about one master in ten; the favourite is the quiet pawn move to c6. The knight hits d4 straight away. The catch is d5: their pawn can push there and kick it, and then the knight needs a new square.", "…Nc6 — hits d4; d5 can kick it."],
    ["d5 — six masters in ten, and the engine's first choice. The pawn kicks your knight on c6 and grabs space. Where does the knight go?", "d5 — kicks the knight."],
    ["…Nb8 — eight masters in ten, and the engine's choice. Go through the squares. On d4 the knight just hangs: your bishop on g7 would guard it, but your own knight on f6 is in the way. On a5 their b-pawn traps it. So it goes all the way home, and that's fine: it comes out again through d7, and their pawn on d5 is now something for …e6 to hit.", "…Nb8 — back home, then d7."],
    ["Bg5 — about one master in ten. The bishop hits your knight on f6. It isn't a pin yet: your e7 pawn stands between the knight and your queen on d8. Keep that in mind for your next move.", "Bg5 — hits f6; e7 shields d8."],
    ["…e5 — only about seven masters in a hundred; most play …c6 or …h6 here. You take your share of the center, but here's the catch: the pawn has left e7, so now the bishop on g5 really does pin your knight on f6 to the queen. And the pawn stands right next to their pawn on d5, which can take it en passant.", "…e5 — creates the pin on f6."],
    ["dxe6 — the engine's first choice. They take en passant, and the pawn on e6 hits f7. It's loose, though: you take back.", "dxe6 — en passant, hits f7."],
    ["…Bxe6 — the engine's choice. Why the bishop and not the f-pawn? Because of the pin: after …fxe6 their e-pawn pushes on and hits your knight on f6, which can't step away without losing the queen. So the bishop takes, and it lands on an open diagonal, aimed all the way at a2. The pin on f6 is still there, though.", "…Bxe6 — takes back, aims at a2."],
    ["Re1 — the rook comes to the e-file, but it's a slip: the engine prefers Nd4, hitting your bishop on e6, by more than half a pawn. Now it's about level, and you have a free move to do something about that pin.", "Re1 — a slip; Nd4 was the move."],
    ["…Nc6 — and here you slip back. The knight comes out and covers e5, but the pin is still on. The engine prefers …h6, hitting the bishop on g5 to get rid of it, by more than half a pawn. They are a little better.", "…Nc6 — a slip; …h6 first."],
    ["Nd5 — and they return the favour. From d5 the knight hits c7 and piles onto your pinned knight on f6, but the engine prefers Qd2, by more than half a pawn. Why is this a slip? Your bishop on e6 can simply take the knight. It's about level.", "Nd5 — a slip; take it."],
    ["…Bxd5 — you take the knight before it does any damage. And look at e4 now: the knight that guarded it is gone, and the rook on e1 can't see past its own bishop, so your bishop on d5 hits a pawn with no guard at all. They have to take back.", "…Bxd5 — removes the knight; e4 hangs."],
    ["exd5 — the engine's first choice. Why the pawn and not the queen? Because that pin on f6 is only a pin to your queen. If their queen takes on d5, your knight takes the queen first, and the engine rates that about two pawns worse for them. So the pawn takes back, and it hits your knight on c6 again. That knight keeps getting chased.", "exd5 — kicks the knight again."],
    ["…Ne7 — the engine's choice, and the knight does two jobs from e7. It stands between your queen and the knight on f6, so the pin is gone at last. And it hits d5, where your other knight is aimed too: two attackers on a pawn that only their queen guards. It's about level. Your plan for the middlegame: …h6 to push the bishop back, then …Nf5 and …Re8 to fight for the open e-file.", "…Ne7 — ends the pin, hits d5."],
  ],
  '150 Attack (Be3 + f3)': [
    ["Be3 — about one master in five. The bishop guards d4 and looks down the diagonal to h6, and Qd2 usually comes next. That's the 150 Attack's idea: queen and bishop lined up toward h6, ready to trade off your bishop once it reaches g7.", "Be3 — aims at h6."],
    ["…c6 — about six masters in ten. A quiet move with a plan: the pawn covers b5 and d5, and it gets your queenside ready to roll with …b5. If they're going to attack on one wing, you start on the other.", "…c6 — gets …b5 ready."],
    ["f3 — about one master in eight; half of them play Qd2 here. The pawn props up e4 and takes g4 away from your pieces. And it has a second job: with a pawn on f3 behind it, their g-pawn can march. Remember that.", "f3 — props up e4."],
    ["…b5 — about half the masters, and the engine's first choice. The pawn grabs space and threatens to keep going: one more step, to b4, would hit the knight on c3, one of the guards of e4.", "…b5 — …b4 is coming."],
    ["a3 — the answer: now if …b4, the a-pawn takes, and the knight on c3 stays where it is.", "a3 — stops …b4."],
    ["…Nbd7 — why the knight before the bishop? Because of e5: their pawn was ready to push there and chase your knight off f6. Now that square is covered twice, by this knight and the pawn on d6, and the push would only lose a pawn. Later the knight heads on to b6.", "…Nbd7 — covers e5 first; b6 later."],
    ["g4 — here comes the storm, and this is what f3 was for. The pawn means to go on to g5 and kick your knight off f6.", "g4 — the storm begins."],
    ["…Bg7 — the engine's choice: the bishop takes the long diagonal at last. But what about g5, the push they just set up? No problem yet: …Nh5, and your knight is out of the pawn's reach.", "…Bg7 — long diagonal; g5 meets …Nh5."],
    ["h4 — the engine's choice. Now two pawns are coming, and look where they're aimed: the side your king would castle to. This one wants to go on to h5 and pry the file open.", "h4 — the h-pawn joins the storm."],
    ["…h5 — the engine's choice. Why not just castle? Because their h-pawn would run on to h5 and open the file in front of your king. So you stop it dead: it can't get past your pawn. And your pawn hits g4, so now they have to decide what to do there.", "…h5 — hits g4, blocks h4."],
    ["g5 — the engine's choice. The pawn kicks your knight on f6, and this time h5 is taken: your own pawn stands there. So where does the knight go?", "g5 — kicks the knight."],
    ["…Nh7 — the engine's choice, and by a lot: …Ng8 is about a pawn worse, and …Nxe4 just gives the knight for a pawn after fxe4. On h7 the knight hits g5 straight back.", "…Nh7 — hits g5 back."],
    ["f4 — the engine's choice. The pawn guards g5 again, and now look at their kingside pawns: e4, f4, g5 and h4, all rolling forward.", "f4 — guards g5; the pawns roll."],
    ["…Nb6 — the knight reaches b6, where it eyes c4 and a4, and by stepping off d7 it lets your bishop on c8 out. They are a little better. Your plan for the middlegame: castle, push …a5 on the queenside, and look at g4. Their pawns have run past it, so no pawn of theirs can ever cover it again, and your bishop can settle there.", "…Nb6 — eyes c4; frees the c8 bishop."],
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
