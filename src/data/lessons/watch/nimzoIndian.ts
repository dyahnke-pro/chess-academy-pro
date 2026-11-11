// The Nimzo-Indian Defence — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet
// (`LESSON_FACTS=1 LESSON_IDS=nimzo-indian`): masters' percentages, engine
// lines at a fixed depth, the board after each move. The student plays Black.
// Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register
// (§2a). One story runs through every line: …Bb4 pins the knight on c3, the
// piece that backs up e4; you give that bishop for the knight when it costs
// them something (doubled c-pawns, or moves spent with the queen), and the
// game turns on e4, the doubled pawn on c4, and where your light-squared
// bishop finds its diagonal (a6 or b7).
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'O-O', 'a3', 'Bxc3+', 'Qxc3', 'd5', 'Nf3', 'dxc4', 'Qxc4', 'b6', 'Bg5', 'Ba6', 'Qa4', 'c5', 'dxc5', 'bxc5', 'Rc1', 'Qb6', 'Bxf6', 'gxf6', 'Rc2', 'Rd8', 'e3', 'Bxf1', 'Rxf1', 'Nd7', 'Ke2', 'Rab8', 'Rd1', 'Ne5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — the queen's pawn takes a square in the middle, and their bishop on c1 can come out. A bit over a third of master games start here; e4 is the more common first move. Against d4, the Nimzo-Indian is built around one square: e4. Keep an eye on who controls it.", 'd4 — the center; e4 is the battleground.'],
  ["…Nf6, the answer of six masters in ten; about a quarter play …d5, and the engine rates the two about the same. Why the knight first? It covers e4 and d5 without committing a single pawn, so their e-pawn can't step up to e4 for free.", '…Nf6 — the knight covers e4 and d5.'],
  ["c4, seven masters in ten. The pawn grabs space and covers d5 ahead of time. And watch for the plan behind it: a knight to c3, and then e4 with support.", 'c4 — space, and d5 covered.'],
  ["…e6, just over half the masters; a third fianchetto with …g6 instead, the King's Indian road. The pawn opens a diagonal for your bishop on f8, and that bishop is about to become the star of this opening. The price is the bishop on c8, shut in behind e6. Remember it: getting that piece out is a job for later.", '…e6 — the f8 bishop is free.'],
  ["Nc3 — four masters in ten play it, Nf3 is a little more common, and the engine prefers g3. The knight guards e4, so they're one move from pushing it with support. But it also allows the move that gives your opening its name.", 'Nc3 — guards e4; e4 is coming.'],
  ["…Bb4 — here's the Nimzo-Indian, the choice of over eight masters in ten and the engine's first pick. The bishop pins the knight on c3 to their king on e1. Why does that matter? A pinned knight can't move, so it can't take anything on e4: its guard there no longer counts. And there's a second idea behind it. You can take on c3 with check, and if a pawn takes back, their c-pawns are doubled. That's the bargain you're offering: your bishop for their knight, in return for e4 and a weaker pawn structure. Every line ahead is their answer to this pin.", '…Bb4 — the pin on c3.'],
  ["Qc2 — the Classical, about a third of masters; the Rubinstein's e3 is a little more common, and the engine rates them the same. Here's their answer to the pin: if you take on c3, the queen takes back, and no pawns get doubled. And from c2 the queen watches e4, so the pinned knight isn't the only guard there anymore.", 'Qc2 — the queen will recapture on c3.'],
  ["…O-O — just over half the masters castle here; about one in five strike with …d5 or …c5 instead, and the engine rates …d5 a hair higher. Is there any hurry? No. The pin on c3 is still on, and your king is safe on g8. If they push e4 now, …d5 hits it right away.", '…O-O — king safe, pin kept.'],
  ["a3 — two masters in three put the question at once. The pawn hits your bishop on b4, and nothing guards it. So: retreat, or take?", 'a3 — the bishop is asked.'],
  ["…Bxc3+ — every master takes, with check. A retreat to e7 or d6 comes out about a pawn worse by the engine's count: two moves spent to reach a square the bishop could have reached in one. So the bishop goes for the knight, and they get the bishop pair. What do you get back? Time. Their queen is about to move a second time, and none of their other pieces has left home.", '…Bxc3+ — trade, and gain time.'],
  ["Qxc3 — the point of Qc2: the queen takes back, and their pawns stay whole. Take stock. They have the two bishops and a clean structure. You have a castled king and a lead in development. Now use it.", 'Qxc3 — no doubled pawns.'],
  ["…d5 — the engine's first choice, though six masters in ten prefer …b6 here. The pawn hits c4, and only their queen guards it. Strike now, while their pieces are still at home: open lines favor the side that's ahead in development.", '…d5 — hits c4, opens lines.'],
  ["Nf3 — the knight finally comes out, the engine's top choice, guarding d4 and e5. Their c4 pawn still has only the queen behind it.", 'Nf3 — develops, guards d4.'],
  ["…dxc4 — you give up your center pawn, so why? Because the queen has to come to c4 to take back, and c4 is a square you can hit. Remember the bishop on c8, shut in behind e6? It's about to show you how.", '…dxc4 — lure the queen to c4.'],
  ["Qxc4 — material is level, and the queen hits c7 and e6. Both are guarded: your queen covers c7, and the bishop on c8 and the f-pawn cover e6.", 'Qxc4 — level; it hits c7 and e6.'],
  ["…b6, the engine's choice. It opens a second door for the bishop on c8: from a6 it will hit their queen on c4. And the pawn on b6 covers c5, ready to back up …c5 later.", '…b6 — …Ba6 is coming.'],
  ["Bg5 — the bishop develops with a pin of its own: your knight on f6 is now pinned to your queen on d8. But look at the queen on c4. Nothing guards it.", 'Bg5 — pins the f6 knight.'],
  ["…Ba6 — and there's the point of …dxc4 and …b6. The bishop comes out with a hit on the queen on c4, so it has to move again. Notice what stands behind the queen on that diagonal, too: the e2 pawn, and the bishop on f1. Keep that in mind.", '…Ba6 — hits the queen, with tempo.'],
  ["Qa4 — the queen steps away and hits your bishop on a6. The knight on b8 guards it, so you don't have to react, and …b6 has already prepared your next break.", 'Qa4 — hits a6; the knight guards it.'],
  ["…c5 — the pawn hits d4, backed by the one on b6. Why now? Their king is still on e1 and the bishop on f1 hasn't moved, so opening the center suits you. The engine likes …h6 first a touch more, putting the question to the bishop on g5; that's the Classical tab.", '…c5 — hits d4, opens the center.'],
  ["dxc5 — they take, the engine's first choice. The pawn on c5 hits your b6 pawn, but it has no guard of its own, so you simply take it back.", 'dxc5 — a loose pawn on c5.'],
  ["…bxc5 — take back at once; …h6 or …Bb7 first costs half a pawn or more. Now look at the b-file: it's half-open for your rooks, with their b2 pawn standing on it. The price is your c5 pawn. No pawn of yours stands beside it anymore, so pieces will have to guard it.", '…bxc5 — the b-file opens.'],
  ["Rc1 — the rook goes straight at c5, which has no guard at all. The engine slightly prefers Rd1, the move the Classical tab shows. So how do you hold c5?", 'Rc1 — hits the loose c5 pawn.'],
  ["…Qb6 — one move, three jobs. The queen guards c5, it hits their b2 pawn, which has no guard, and it steps off d8, so your knight on f6 isn't pinned anymore.", '…Qb6 — guards c5, hits b2.'],
  ["Bxf6 — the pin is gone, so the bishop cashes in, the engine's first choice. You can only take back with the g-pawn: your queen no longer covers f6, and leaving it means a knight down. And while it stands on f6, the bishop also guards b2.", 'Bxf6 — takes the knight; g-pawn recaptures.'],
  ["…gxf6 — the only recapture. Your kingside pawns are broken now, doubled on the f-file, and they are a little better. But their pair of bishops is down to one, and your queen hits b2 again: nothing guards it.", '…gxf6 — doubled f-pawns; b2 hangs again.'],
  ["Rc2 — the engine's choice by far: the rook guards b2 sideways and keeps hitting c5. Your queen covers c5, so it holds. Now, what do you do with your rooks?", 'Rc2 — guards b2, hits c5.'],
  ["…Rd8 — take the open file. Neither side has a d-pawn anymore, and your rook gets there first. The engine rates it level with …Nc6.", '…Rd8 — first to the open d-file.'],
  ["e3 — they finally free the bishop on f1, the engine's top choice. But remember your bishop on a6? With the e-pawn gone from e2, it looks straight at f1.", 'e3 — frees f1; your a6 bishop sees it.'],
  ["…Bxf1 — trade it off, the engine's choice. Why? Their two bishops were their reward for the trade on c3, and now both are gone. And whichever piece takes back, their king can't castle anymore.", '…Bxf1 — their bishop pair is gone.'],
  ["Rxf1 — the rook takes back, the engine's first choice. The king can't: Kxf1 runs into …Rd1+, your rook checking down the open file you just took. So their king will have to find safety on foot.", 'Rxf1 — Kxf1 allows …Rd1+.'],
  ["…Nd7 — your last piece comes out, and it guards c5 a second time. From d7 it can jump to e5, or go to g6 by way of f8. The engine rates …Nc6 slightly higher.", '…Nd7 — develops, second guard on c5.'],
  ["Ke2 — with castling gone, the king steps off the back rank so the rook on f1 can come over to d1. The engine rates it level with Qg4+. A king on e2 with queens on the board isn't comfortable, but there's no other home for it.", 'Ke2 — clears the first rank for a rook.'],
  ["…Rab8 — the other rook takes the b-file, lined up behind your queen against b2. Both your rooks now stand on files with no pawn of yours on them, d8 and b8. They are still a little better.", '…Rab8 — the b-file, behind the queen.'],
  ["Rd1 — the rook challenges your d-file, and look at your knight on d7: their queen and this rook both hit it, and only your rook on d8 guards it. Two attackers, one defender. The knight has to do something.", 'Rd1 — two hits on the d7 knight.'],
  ["…Ne5 — the knight jumps away and hits their knight on f3. But the engine much prefers …Nf8. After …Ne5, they take on e5, trade rooks on d1, and your f-pawn takes back, leaving your e-pawns doubled; that's why they are clearly better here. Your plan from here: work with your heavy pieces, a rook back on the d-file and your queen against b2, while pieces, not pawns, keep guarding c5.", '…Ne5 — hits f3; …Nf8 was better.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move nothing earlier shares. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Classical Variation (4.Qc2)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'O-O', 'a3', 'Bxc3+', 'Qxc3', 'd5', 'Nf3', 'dxc4', 'Qxc4', 'b6', 'Bg5', 'Ba6', 'Qa4', 'h6', 'Bh4', 'c5', 'dxc5', 'bxc5', 'Rd1', 'Qb6'],
  'Rubinstein System (4.e3)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5', 'Nf3', 'c5', 'O-O', 'dxc4', 'Bxc4', 'Nbd7', 'Qe2', 'b6', 'Rd1', 'Bb7', 'd5', 'Bxc3'],
  'Huebner Variation (4.e3 c5)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'c5', 'Bd3', 'Nc6', 'Nf3', 'Bxc3+', 'bxc3', 'd6', 'O-O', 'e5', 'Nd2', 'O-O', 'Nb3', 'Re8'],
  'Leningrad Variation (4.Bg5)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Bg5', 'h6', 'Bh4', 'c5', 'd5', 'd6', 'e3', 'Bxc3+', 'bxc3', 'e5', 'Bd3', 'Nbd7', 'Ne2', 'Qe7', 'O-O', 'g5', 'Bg3'],
  'Kasparov Variation (4.Nf3)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Nf3', 'c5', 'g3', 'cxd4', 'Nxd4', 'O-O', 'Bg2', 'd5', 'cxd5', 'Nxd5', 'Qb3', 'Qa5', 'Bd2', 'Nc6', 'Nxc6', 'bxc6', 'O-O', 'Bxc3', 'bxc3', 'Ba6', 'Rfd1', 'Qc5'],
  'Saemisch Variation (4.a3)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3', 'c5', 'e3', 'Nc6', 'Bd3', 'O-O', 'Ne2', 'b6', 'e4', 'Ne8', 'O-O', 'Ba6', 'f4'],
  '4.f3 (Aggressive Center)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'f3', 'd5', 'a3', 'Bxc3+', 'bxc3', 'c5', 'cxd5', 'exd5', 'e3', 'c4', 'Nh3', 'Bxh3', 'gxh3', 'Nc6', 'Bg2', 'Na5'],
  'Fischer Variation (4.e3 b6)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'b6', 'Bd3', 'Bb7', 'Nf3', 'O-O', 'O-O', 'd5', 'cxd5', 'exd5', 'a3', 'Bd6', 'b4', 'Nbd7', 'Qb3', 'a5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Classical Variation (4.Qc2)': [
    ["…h6 — the engine's first choice here: ask the bishop on g5 a question before you break. Their knight on f3 guards it, so it isn't loose. The question is simply: take on f6, or step back and keep the pin?", '…h6 — question the g5 bishop.'],
    ["Bh4 — the bishop keeps the pin on your knight; the engine rates this level with Bxf6. Your king has gained a spare square on h7, and now the break comes.", 'Bh4 — the pin stays on f6.'],
    ["…c5 — the same break as in the main line, and the engine's top choice. The pawn hits d4, backed by the one on b6, while their king is still sitting on e1.", '…c5 — the break, now with …h6 in.'],
    ["dxc5 — the same capture as before, the engine's first choice: the pawn lands on c5 with no guard of its own, so you take it back.", 'dxc5 — a loose pawn on c5.'],
    ["…bxc5 — take back with the b-pawn; …Bb7 or …Qd7 instead costs close to a pawn. Again the b-file opens for you, and again c5 stands alone, so pieces will guard it.", '…bxc5 — the half-open b-file again.'],
    ["Rd1 — this time the rook takes the open d-file, and it hits your queen on d8 straight down it. The queen has to move, and remember, your knight on f6 is pinned to it. So where does the queen go?", 'Rd1 — the rook hits your queen.'],
    ["…Qb6 — the engine's first choice, the same square as in the main line, doing the same three jobs: it guards c5, hits the b2 pawn, which has no guard, and steps off the pin. It's about level. Your plan from here: if they take on f6, recapture with the g-pawn, trade your bishop for theirs on f1 once e2 moves, and bring the knight out to c6.", '…Qb6 — off the pin, onto b2.'],
  ],
  'Rubinstein System (4.e3)': [
    ["e3 — the Rubinstein, four masters in ten and the engine's first choice. They simply develop: the pawn guards d4 and opens the road for their bishop on f1. And they aren't afraid of doubled pawns. If you take on c3, a pawn takes back, and that pawn on c3 guards d4 too.", 'e3 — develop; doubled pawns are fine.'],
    ["…O-O — six masters in ten castle and keep every option open, and the engine agrees. You still hold the pin on c3, and you haven't decided yet which pawns go to the center.", '…O-O — castle, keep the options.'],
    ["Bd3 — two masters in three develop the bishop here, where it aims at your h7 pawn. That pawn has two guards, the knight on f6 and your king.", 'Bd3 — the bishop aims at h7.'],
    ["…d5 — seven masters in ten, the engine's first choice. The pawn hits c4, and the timing matters: their bishop has just stepped onto d3, so if you take on c4 later, it has to move a second time to take back.", '…d5 — hits c4; the bishop guards it.'],
    ["Nf3 — six masters in ten develop the knight, guarding d4 and e5. Both sides are nearly done developing; the fight now is about the center.", 'Nf3 — guards d4 and e5.'],
    ["…c5 — two masters in three add a second hit on their center: this pawn strikes d4, while the one on d5 hits c4. The e3 pawn and the knight hold d4, so nothing falls yet, but the pressure is building.", '…c5 — two pawns against their center.'],
    ["Castle — over nine masters in ten do. With their king gone from e1, the knight on c3 isn't pinned anymore, so it's free to move.", 'O-O — the pin on c3 is gone.'],
    ["…dxc4 — about a third of masters take now, while more develop with …Nc6 first; the engine prefers the capture. And here's the timing paying off: the pawn hits the bishop on d3, so it has to move again to take back.", '…dxc4 — the bishop moves again.'],
    ["Bxc4 — every master takes back, and material is level. The bishop now aims at your e6 pawn, which your f-pawn and the bishop on c8 guard.", 'Bxc4 — level; it aims at e6.'],
    ["…Nbd7 — a third of masters play it, and the knight adds a second guard to c5. But four in ten take on d4 first, and the engine prefers that: settle the center before they find time for a3 against your bishop.", '…Nbd7 — guards c5; …cxd4 was better.'],
    ["Qe2 — half the masters move the queen here, and it does something quiet but useful: it clears d1 for a rook. The plan is Rd1, and then the push d5. The engine likes a3 a little more.", 'Qe2 — clears d1; Rd1 and d5 next.'],
    ["…b6 — six masters in ten, preparing …Bb7 for the bishop on c8. The pawn also gives c5 a third guard.", '…b6 — …Bb7 next, c5 propped.'],
    ["Rd1 — six masters in ten, the engine's first choice. The rook lines up behind the d4 pawn, and that tells you what's coming: d5, breaking open the center.", 'Rd1 — behind the d-pawn; d5 next.'],
    ["…Bb7 — the bishop arrives on the long diagonal and hits the knight on f3. The engine rates …cxd4 a little higher, taking their d-pawn off before it can push. Now it pushes.", '…Bb7 — hits f3; d5 is coming.'],
    ["d5 — there's the push, the engine's top choice. The pawn hits e6, and if it takes there, the new pawn on e6 would hit your knight on d7. You have to decide how to meet it.", 'd5 — the push; it hits e6.'],
    ["…Bxc3 — you hand over the bishop for the knight, and when the b-pawn takes back, their queenside pawns are split. But the engine prefers …b5 first, hitting the bishop on c4, and after …Bxc3 they are a little better. Your plan from here: when they take on e6, recapture with the f-pawn, then bring a knight to d5 and play against the lone pawns on a2 and c3.", '…Bxc3 — split their pawns; …b5 was better.'],
  ],
  'Huebner Variation (4.e3 c5)': [
    ["…c5 — the Hübner, about one master in five. You hit d4 at once and leave your king in the center for now; the engine rates castling a touch higher. Here's the idea: a whole structure of pawns on c5, d6 and e5, with their doubled c-pawns stuck in front of it.", '…c5 — the Hübner; hits d4.'],
    ["Bd3 — half the masters develop the bishop toward your h7 pawn. Four in ten play Ne2 instead, so that a knight, not a pawn, can take back on c3.", 'Bd3 — aims at h7.'],
    ["…Nc6 — six masters in ten, the engine's first choice. Count the hits on d4: your knight and the c5 pawn. Count the guards: just the e3 pawn, because their own bishop on d3 blocks the queen. Two against one, so they have to do something about d4.", '…Nc6 — two hits on d4.'],
    ["Nf3 — about half the masters guard d4 this way, and now it's two against two. The engine prefers a3, putting the question to your bishop first. Without it, the timing of the trade on c3 is yours.", 'Nf3 — guards d4; a3 was better.'],
    ["…Bxc3+ — eight masters in ten take now, with check, the engine's first choice, and here's the point of the Hübner. After bxc3 their c-pawns are doubled, and look at the front one, on c4: no pawn of theirs can ever guard it again. That's your target for the rest of the game.", '…Bxc3+ — doubled pawns; c4 is the target.'],
    ["bxc3 — every master takes back; a king move would leave them a piece down. They have the two bishops and a lot of pawns in the center. But your c5 pawn has no guard now, so first things first.", 'bxc3 — the bishop pair, doubled pawns.'],
    ["…d6 — every master plays it, and the engine agrees. The pawn guards c5 and gets ready for …e5. Look at the squares: c5, d6, and soon e5. Your pawns go on dark squares, the color of the bishop you just gave away.", '…d6 — guards c5, prepares …e5.'],
    ["Castle — half the masters do. Pushing e4 at once is the other main try, and the engine rates it a little higher. Their king is safe, and the center is still undecided.", 'O-O — their king tucked away.'],
    ["…e5 — nearly nine masters in ten, the engine's first choice, and the setup is complete: pawns on c5, d6 and e5. Now d4 is hit three times and guarded three times. If it pushes on to d5, the center locks, and both of their c-pawns are stuck where they stand.", '…e5 — c5, d6, e5: the setup.'],
    ["Nd2 — half the masters bring the knight back. From d2 it guards c4 and e4, the two squares this structure is about, and it can go on to b3.", 'Nd2 — guards c4 and e4.'],
    ["…O-O — the engine's first choice: castle before anything else. Your king is safe, and the rook joins the game.", '…O-O — king safe.'],
    ["Nb3 — the knight hits your c5 pawn, which d6 guards. Only about one master in twelve plays this, and the engine prefers Rb1; after Nb3 you are a little better. Why? Look at what the knight just left. On d2 it guarded e4. Now only the bishop on d3 watches that square.", 'Nb3 — hits c5, but leaves e4.'],
    ["…Re8 — the rook backs up the e5 pawn, but it's slow. The engine much prefers …e4 right now: with the knight gone from d2, the pawn steps to e4 and hits the bishop on d3. After …Re8, they get time for f3 to stop it, and it's about level. Your plan from here: send the knight to a5, where it hits the doubled pawn on c4 and the knight on b3.", '…Re8 — slow; …e4 hit the bishop.'],
  ],
  'Leningrad Variation (4.Bg5)': [
    ["Bg5 — the Leningrad, about one master game in fifty. The bishop pins your knight on f6 to your queen on d8, so now both sides have a pinned knight. The engine prefers e3; after Bg5 it's about level.", 'Bg5 — a pin for a pin.'],
    ["…h6 — half the masters ask the bishop at once; four in ten strike first with …c5, and the engine prefers that. The pawn hits the bishop on g5, and nothing guards it. Take on f6, or keep the pin from h4?", '…h6 — asks the bishop; …c5 was preferred.'],
    ["Bh4 — nearly every master keeps the pin, the engine's first choice. But notice where the bishop lives now: on the edge of the board, where a later …g5 could chase it again.", 'Bh4 — keeps the pin, from the edge.'],
    ["…c5 — eight masters in ten, and the engine rates it level with …g5. The pawn hits d4, and only their queen guards it, so they have to decide about the center right now.", '…c5 — hits d4 right away.'],
    ["d5 — nineteen masters in twenty push past your pawn. It grabs space and hits e6, which your d- and f-pawns guard. The engine prefers e3, simply guarding d4. And both pins are still on the board: their knight on c3 to their king, your knight on f6 to your queen.", 'd5 — space, and a hit on e6.'],
    ["…d6 — four masters in ten, a hair more than the trade on c3. The pawn covers c5 and e5, and it opens the road for your bishop on c8, which now guards e6.", '…d6 — c5 supported, …e5 next.'],
    ["e3 — over nine masters in ten, the engine's first choice. It opens the road for their bishop on f1. Now it's time to cash in your own pin.", 'e3 — frees the f1 bishop.'],
    ["…Bxc3+ — about two masters in three take now, and the engine rates it level with …g5. After bxc3 their c-pawns are doubled, the same prize as in the Hübner: the front one, on c4, can never be guarded by a pawn again.", '…Bxc3+ — doubled pawns, c4 fixed.'],
    ["bxc3 — every master takes back. Their pawns are doubled, but they have the two bishops, and your knight on f6 is still pinned.", 'bxc3 — two bishops, doubled pawns.'],
    ["…e5 — the engine's first choice, and your setup is complete: pawns on c5, d6 and e5, all on dark squares, the color of the bishop you traded away. With the pawns on d5 and d6 blocking each other, the center is closing, and closed centers suit knights better than bishops.", '…e5 — the dark-square chain is complete.'],
    ["Bd3 — natural, but the engine doesn't like it: Nf3 was its choice, and after Bd3 you are a little better. Why? The bishop stands right where your e-pawn can hit it. …e4 would chase it away with tempo.", 'Bd3 — walks into …e4; Nf3 was better.'],
    ["…Nbd7 — the knight develops and backs up e5. But the engine wants …e4 right now, hitting the bishop on d3. You are still a little better.", '…Nbd7 — backs e5; …e4 was stronger.'],
    ["Ne2 — the knight comes out, but the engine prefers Qc2, and you are a little better. And …e4 is still there for you: the bishop on d3 still stands where that pawn would hit it.", 'Ne2 — …e4 is still on.'],
    ["…Qe7 — a slip, about a pawn worse than …e4, which would have hit the bishop on d3. The queen steps off d8 but stays on the h4 bishop's diagonal, so your knight on f6 is still pinned, now to e7. After …Qe7 it's only about level.", '…Qe7 — a slip; …e4 was the move.'],
    ["Castle — and now it's their turn to slip. The engine wanted Ng3; after castling you are clearly better. Why? Their king has just gone to the side where your pawns are about to march: …g5 hits the bishop on h4, and …h5 and …h4 can chase it again.", 'O-O — castles into …g5; Ng3 was better.'],
    ["…g5 — the engine's first choice. The pawn hits the bishop on h4, and nothing guards it. Your own king is still on e8, so these pawn moves cost you nothing in safety. The storm only points one way.", '…g5 — hits the loose h4 bishop.'],
    ["Bg3 — the only sensible retreat; anything else drops the bishop. From g3 it hits your e5 pawn, which has three guards. You are clearly better. Your plan from here: …h5 and then …h4, chasing this bishop again and pushing your pawns at their castled king.", 'Bg3 — forced back; …h5 next.'],
  ],
  'Kasparov Variation (4.Nf3)': [
    ["Nf3 — about one master in twelve plays it, and the engine rates it just behind e3. The knight develops and guards d4, and for now they leave the pin on c3 alone.", 'Nf3 — develops, ignores the pin.'],
    ["…c5 — about three masters in ten hit d4 right away; a few more play …b6. The engine prefers simply castling, and after …c5 they are a little better.", '…c5 — hits d4; castling was preferred.'],
    ["g3 — the Kasparov setup, seven masters in ten and the engine's first choice. The pawn makes room for a bishop on g2, on the long diagonal toward your queenside.", 'g3 — the bishop is going to g2.'],
    ["…cxd4 — just under half the masters take, and the engine rates it level with …Ne4 and …Nc6. The new pawn on d4 hits the pinned knight on c3, so they have to take it right away.", '…cxd4 — hits the pinned knight.'],
    ["Nxd4 — every master takes back with the knight. It lands in the center and hits your e6 pawn, which your d- and f-pawns guard.", 'Nxd4 — centralized, hits e6.'],
    ["…O-O — just over half the masters castle now, and the engine agrees. Your king is safe before the center opens.", '…O-O — king safe first.'],
    ["Bg2 — nearly every master plays it. The bishop takes the long diagonal: it hits b7, and your b-pawn is pinned to the rook on a8 behind it.", 'Bg2 — the long diagonal; b7 is pinned.'],
    ["…d5 — nineteen masters in twenty, the engine's first choice. The pawn hits c4, which has no guard, and it blocks the long diagonal for the moment.", '…d5 — hits c4, blocks the diagonal.'],
    ["cxd5 — about six masters in ten take; the engine rates castling about the same. The pawn hits e6, so you take back. But with which piece?", 'cxd5 — which piece takes back?'],
    ["…Nxd5 — every master takes with the knight, and the engine agrees; …exd5 costs about half a pawn. Now count on c3: your knight and your bishop hit it, and only the b2 pawn guards it.", '…Nxd5 — two hits on c3.'],
    ["Qb3 — six masters in ten, the engine's first choice. The queen guards c3 and hits two of your pieces: the bishop on b4 and the knight on d5. The bishop's only guard is that knight, so the knight is tied down.", 'Qb3 — hits b4 and d5 at once.'],
    ["…Qa5 — about a quarter of masters play it. The queen guards the bishop on b4 and lines up behind it against c3. The engine prefers …Nc6, which is a little more common, and after …Qa5 they are a little better.", '…Qa5 — guards b4, adds to the pin.'],
    ["Bd2 — nearly every master plays it, and the engine agrees. The bishop steps onto d2, between the knight and their king, so the knight on c3 is no longer pinned.", 'Bd2 — the pin is broken.'],
    ["…Nc6 — the engine's first choice. The knight hits their knight on d4, which has no guard, so they have to deal with it right away.", '…Nc6 — hits the loose d4 knight.'],
    ["Nxc6 — they trade, the engine's top choice, and the knight on c6 hits your queen on a5, your bishop on b4 and the a7 pawn. Nothing guards it, so you take it with the b-pawn, the only one that can. Anything else loses your queen.", 'Nxc6 — forks queen and bishop; take back.'],
    ["…bxc6 — the b-pawn takes back, and it's the only good move. The new pawn on c6 gives your knight on d5 another guard, and the b-file is half-open for your rooks.", '…bxc6 — c6 props the d5 knight.'],
    ["Castle — the engine's pick, and their king is safe on g1. Your bishop and knight still both hit c3.", 'O-O — king safe on g1.'],
    ["…Bxc3 — now, and the engine agrees: you give the bishop for the knight at last. Their best recapture is with the b-pawn, and then their pawns on a2 and c3 will have no neighbors.", '…Bxc3 — give the bishop, split their pawns.'],
    ["bxc3 — the engine likes this recapture best. Taking with the bishop is a little less good, and Bxd5 just loses material. They keep the bishop pair, but the pawns on a2 and c3 now stand alone, and they are a little better.", 'bxc3 — the bishop pair, two lone pawns.'],
    ["…Ba6 — the move the engine wants. Your last bishop finds its diagonal: it hits the e2 pawn, which has no guard, and pins it to the rook on f1.", '…Ba6 — hits e2, pins it to f1.'],
    ["Rfd1 — the engine's top choice. The rook steps off f1, so the pin is gone, and it lines up on the d-file behind their own bishop.", 'Rfd1 — out of the pin, onto d1.'],
    ["…Qc5 — the engine's first choice. The queen hits c3 and f2, and the f2 pawn is pinned to their king on g1. It's about level. Your plan from here: if e4 kicks your knight, answer with …Bc4 against their queen and then …Nb6, and keep pressing the lone pawn on c3.", '…Qc5 — hits c3 and the pinned f2.'],
  ],
  'Saemisch Variation (4.a3)': [
    ["a3 — the Sämisch, a rare choice among masters: the pawn hits your bishop on b4 at once, and nothing guards it. They're inviting the trade, doubled pawns and all, for the two bishops. The engine prefers e3.", 'a3 — the bishop is asked at once.'],
    ["…Bxc3+ — every master takes; retreating to e7 costs about a pawn. After bxc3 they'll have the two bishops and doubled c-pawns, and that's the whole fight of this line.", '…Bxc3+ — take; retreating costs a pawn.'],
    ["bxc3 — the only recapture; anything else just loses material. Their c-pawns are doubled on c3 and c4, and the c4 pawn can never be guarded by a pawn again. In return they have the two bishops, and the pawn on c3 now guards d4.", 'bxc3 — doubled pawns, two bishops.'],
    ["…c5 — about half the masters hit d4 right away, and the engine rates it close to …b6. The plan is simple: pressure d4, and fix the doubled pawns where they stand.", '…c5 — hits d4, fixes c4.'],
    ["e3 — about half the masters guard d4 with the pawn, and the engine agrees; four in ten play f3 instead, aiming straight for e4.", 'e3 — guards d4.'],
    ["…Nc6 — four masters in ten play it, adding a second hit on d4. The engine prefers …d5, and after …Nc6 it's still about level.", '…Nc6 — more pressure on d4.'],
    ["Bd3 — nine masters in ten, the engine's first choice. The bishop aims at your h7 pawn and gets ready for castling. They are a little better.", 'Bd3 — the bishop points at h7.'],
    ["…O-O — about four masters in ten castle here, and the engine rates it level with …d6 and …b6. Your king is safe before their center starts moving.", '…O-O — castle before e4 comes.'],
    ["Ne2 — three masters in four develop the knight here, the engine's first choice. Why not f3? From e2 the knight guards d4 and leaves the f-pawn free to move up and support e4.", 'Ne2 — guards d4, f-pawn stays free.'],
    ["…b6 — eight masters in ten, the engine's first choice. It opens the way for your bishop to a6, where it will hit the doubled pawn on c4, and it gives c5 a guard.", '…b6 — …Ba6 against c4 next.'],
    ["e4 — seven masters in ten. There's the big center: pawns on c3, c4, d4 and e4. And it carries a threat: e5, hitting your knight on f6.", 'e4 — the big center; e5 threatens f6.'],
    ["…Ne8 — nineteen masters in twenty, the engine's first choice. Why go backward? The knight steps away before e5 can hit it, and it clears the f-pawn: …f5 is your counter against that center.", '…Ne8 — dodges e5, frees …f5.'],
    ["Castle — two masters in three do, and the engine agrees. Both kings are safe, and now it's a race: their kingside pawns against your pressure on c4.", 'O-O — both kings safe.'],
    ["…Ba6 — almost every master plays it, the engine's first choice. The bishop hits the doubled pawn on c4, which only their bishop on d3 guards, and the target you've been building toward is finally under fire.", '…Ba6 — hits c4, the doubled pawn.'],
    ["f4 — three masters in four push it, the engine's first choice. The threat is f5, opening lines toward your king. It's about level. Your plan from here: block it with …f5, then pile on c4 with …Na5 and a rook on c8.", 'f4 — f5 is coming; meet it with …f5.'],
  ],
  '4.f3 (Aggressive Center)': [
    ["f3 — about one master in eleven. There's no hiding the idea: the pawn covers e4, so e4 comes next, with a pawn behind it. The engine prefers e3; after f3 it's about level.", 'f3 — e4 is coming next.'],
    ["…d5 — about half the masters, the engine's first choice. Strike before e4 lands: your pawn now covers e4 too, and it hits c4, which has no guard.", '…d5 — covers e4, hits c4.'],
    ["a3 — nearly every master plays it. The pawn hits your bishop on b4, and nothing guards it. Their c4 pawn is loose too, but first, the bishop.", 'a3 — hits the b4 bishop.'],
    ["…Bxc3+ — eight masters in ten take, and the engine rates it level with …Be7, the other road. You hand over the bishop pair, and after bxc3 their c-pawns are doubled.", '…Bxc3+ — the bishop for doubled pawns.'],
    ["bxc3 — every master takes back; Kf2 or Bd2 would cost them material. Look at the board: five of their pawns have moved, and not one of their pieces is out.", 'bxc3 — five pawn moves, no pieces out.'],
    ["…c5 — about eight masters in ten, and the engine rates it level with castling. The pawn hits d4. Strike at the center while their pieces are still at home.", '…c5 — another hit on the center.'],
    ["cxd5 — nineteen masters in twenty take now. The pawn on d5 hits e6, and it has no guard of its own, so you'll take it. The question is how.", 'cxd5 — how do you take back?'],
    ["…exd5 — about a quarter of masters take with the pawn; three in four use the knight. The engine prefers the pawn, and here's why: your pawn on d5 keeps covering e4, the square f3 was built for. With a knight on d5, their e-pawn could come to e4 and hit it.", '…exd5 — the pawn keeps covering e4.'],
    ["e3 — nearly every master plays it, the engine's first choice. The pawn guards d4 and opens the road for the bishop on f1. Their e4 plan has slowed down; now it's about development.", 'e3 — guards d4, frees the bishop.'],
    ["…c4 — about a quarter of masters push here. It grabs space and fixes their pawn on c3, but it lets go of the pressure on d4. The engine prefers castling; after …c4 they are a little better, and its line goes g4 next, a pawn push on the other side.", '…c4 — space, but castling was better.'],
    ["Nh3 — the knight develops to the edge, where your bishop on c8 hits it. The engine wanted g4; after Nh3 it's about level. Do you take it?", 'Nh3 — on the rim, hit by c8.'],
    ["…Bxh3 — yes, and the engine agrees. You give your light-squared bishop for the knight, and after gxh3 their kingside pawns are wrecked: doubled on the h-file, with a gap on g2. You are a little better.", '…Bxh3 — wreck their kingside pawns.'],
    ["gxh3 — they must take back, or they're simply a piece down. Their h-pawns are doubled, and the bishop on f1 now has g2 to come out to.", 'gxh3 — doubled h-pawns.'],
    ["…Nc6 — the knight develops and hits d4. But the engine much prefers …Nh5: with the knight off f6, your queen's road to h4 opens, and …Qh4+ checks their king. After …Nc6 it's about level.", '…Nc6 — hits d4; …Nh5 was stronger.'],
    ["Bg2 — the engine's first choice. The bishop comes out on the square the g-pawn left, and it guards the h3 pawn. It's about level.", 'Bg2 — develops, guards h3.'],
    ["…Na5 — the knight heads for b3, a square no pawn of theirs can ever attack, and your c4 pawn guards it. From b3 it would hit the rook on a1 and the bishop on c1. The engine prefers castling first, and it's about level. Your plan from here: castle, plant the knight on b3, and keep their queenside clamped with the pawn on c4.", '…Na5 — heading for the hole on b3.'],
  ],
  'Fischer Variation (4.e3 b6)': [
    ["…b6 — about one master in seven. Instead of the center, you go for the long diagonal: the bishop on c8 is headed for b7, where it will watch e4. The engine rates castling a touch higher.", '…b6 — the bishop is headed for b7.'],
    ["Bd3 — about a quarter of masters; six in ten play Ne2 instead. The engine likes Bd3 best. The bishop aims at h7 and covers e4.", 'Bd3 — aims at h7, covers e4.'],
    ["…Bb7 — almost every master plays it, the engine's first choice. Look down the diagonal: the bishop hits g2, which has no guard, and the rook on h1 stands right behind it. So …Bxg2 is already a threat.", '…Bb7 — hits g2; h1 behind it.'],
    ["Nf3 — three masters in four play it, the engine's first choice. The knight steps into your bishop's path, so g2 is safe again, and the knight itself is well guarded.", 'Nf3 — blocks the diagonal; g2 safe.'],
    ["…O-O — over half the masters castle; about three in ten jump in with …Ne4 first. The engine prefers castling. Your king is safe, and the pin on c3 is still on.", '…O-O — castled, the pin still on.'],
    ["Castle — nineteen masters in twenty do, the engine's first choice. With the king off e1, their knight on c3 is free. They are a little better.", 'O-O — the c3 knight is free.'],
    ["…d5 — about four masters in ten, as many as …c5. Now you claim the center with a pawn too, and it hits c4.", '…d5 — claims the center, hits c4.'],
    ["cxd5 — about two masters in three take now, the engine's first choice. The pawn hits e6, and you take back with the pawn.", 'cxd5 — the pawns trade.'],
    ["…exd5 — every master takes with the pawn. Your pawn on d5 stands firm in the center, and the e-file is half-open for your rook. The price: your bishop on b7 now looks straight into its own pawn on d5.", '…exd5 — center pawn, half-open e-file.'],
    ["a3 — about half the masters ask the bishop now; the engine rates Ne5 a little higher. Nothing guards your bishop on b4. Take on c3, or step back?", 'a3 — the b4 bishop is asked.'],
    ["…Bd6 — the engine's first choice, just ahead of …Bxc3. Why not trade? Their c-pawn is already gone, so bxc3 wouldn't leave them doubled pawns. So you keep the bishop, and from d6 it aims at h2, next to their king.", '…Bd6 — keep the bishop, aim at h2.'],
    ["b4 — the pawn grabs space, the engine's first choice, and b5 may follow, taking c6 away from your c-pawn and your knight.", 'b4 — space; b5 may follow.'],
    ["…Nbd7 — your last minor piece develops, covering e5 and c5. The engine rates …Re8, a rook on the half-open file, a little higher.", '…Nbd7 — develops, covers e5 and c5.'],
    ["Qb3 — the queen hits your d5 pawn, and the engine rates it about level with Nb5. Your bishop on b7 and knight on f6 guard d5, so it holds.", 'Qb3 — hits d5; it holds.'],
    ["…a5 — the pawn hits b4, but it's a slip: b5 just steps past it and takes c6 away from your c-pawn. The engine wanted …Re8 or …c6, which props up d5, and after …a5 they are a little better. Your plan from here: put a knight on e4, where your d5 pawn guards it, and trade it for their knight on c3 when the moment comes.", '…a5 — a slip; b5 steps past.'],
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

export const NIMZO_INDIAN_WATCH: WatchCourse = {
  openingId: 'nimzo-indian',
  title: 'The Nimzo-Indian Defence — A Master Class',
  orientation: 'black',
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
