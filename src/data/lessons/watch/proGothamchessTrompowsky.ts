// Trompowsky Attack (the pro repertoire) — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet: masters' percentages,
// engine lines at a fixed depth, the board after each move. The student plays
// White. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). The last five tabs are lines taught for this opening in the
// repertoire's videos; where each of the others went is recorded in
// docs/levy-lines/decisions/pro-gothamchess-trompowsky.json.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'Bg5', 'e6', 'Nd2', 'h6', 'Bh4', 'd5', 'e3', 'Be7', 'Bd3', 'b6', 'c3', 'O-O', 'Bxf6', 'Bxf6', 'f4', 'Ba6', 'Qe2', 'Bxd3', 'Qxd3', 'c5', 'Ngf3', 'Nc6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ['d4 — just over a third of master games start here; e4 is a little more common. The pawn takes the center and opens the diagonal for your bishop on c1. Keep your eye on that bishop: in this opening it comes out on the very next move.', 'd4 — center, and a road for c1.'],
  ["…Nf6 — about six masters in ten. The knight develops and covers e4 and d5, so your e-pawn can't simply join d4 on e4. Now comes the question this whole opening asks: what if you go straight at that knight?", '…Nf6 — covers e4 and d5.'],
  ["Bg5 — and that's the Trompowsky. Only about one master in twenty-five plays it; seven in ten play c4. So why this? Because it asks a question right away: the bishop hits the knight on f6, and they have to decide right now. Let you take it, and if a pawn has to take back, their pawns are doubled. Or spend a move dealing with the bishop. Either way, you've stepped off the main road before they've built any of their usual setups.", 'Bg5 — straight at the knight on f6.'],
  ["…e6 — about a quarter of masters. Look what it changes: the e-pawn steps off the diagonal, so their queen on d8 now guards f6. If you take there, the queen takes back and their pawns stay whole. The price is a pin: the knight on f6 can't move without your bishop taking the queen.", '…e6 — the queen now guards f6.'],
  ["Nd2 — about one master in five; more than half push e4 instead. Why the knight, and why d2? On d2 it backs up e4, and it stays off c3, so your c-pawn can go there later.", 'Nd2 — backs up e4, leaves c3 free.'],
  ["…h6 — more than half the masters ask at once: the pawn hits your bishop on g5, and nothing guards it. Take on f6, or keep the pin?", '…h6 — the bishop on g5 is hit.'],
  ['Bh4 — the bishop is hit, so where does it go? Take on f6, and the queen takes back with their pawns still whole. Drop back to f4, and …Nh5 chases it again. So it steps back along the same diagonal, as nineteen masters in twenty do, and the engine agrees. The knight on f6 stays pinned to the queen on d8, and the bishop can still cash in on f6 later, at the moment it does the most.', 'Bh4 — keeps the pin on f6.'],
  ["…d5 — about a quarter of masters; most play …c5. The pawn grabs the center and covers e4, so your e-pawn won't get there easily. It's about level.", '…d5 — center pawn, covers e4.'],
  ["e3 — the pawn props up d4 and opens the road for your bishop on f1. And notice: your other bishop is already outside the pawns, on h4, so this pawn shuts nothing in. It's the London's move order: bishop out first, e3 second.", 'e3 — props up d4, frees f1.'],
  ["…Be7 — the bishop steps in between, and the pin is over: if the knight on f6 moves now, your bishop meets the bishop on e7, not the queen. It also gets them one move from castling.", '…Be7 — breaks the pin.'],
  ["Bd3 — the engine's first choice. Where does this bishop belong? On d3, pointing down the diagonal at h7, right next to where their king is about to go.", 'Bd3 — aimed at h7.'],
  ['…b6 — their bishop on c8 is shut in behind the e6 pawn, so they give it another way out, to b7 or a6. Remember that second square: from a6 the bishop challenges yours on d3, and this line is heading exactly there.', '…b6 — a way out for c8.'],
  ["c3 — the triangle is complete: c3, d4 and e3. Now d4 has two pawns behind it, so if they ever trade on d4, a pawn takes back and your center stays whole.", 'c3 — c3, d4, e3: the triangle.'],
  ["…O-O — they castle, right into the corner your bishop on d3 points at. The engine prefers …Bb7 first, and now you are a little better. So look at your other bishop on h4: it's staring at the knight on f6, and that knight guards h7 and h5, right next to their king.", '…O-O — castled; f6 guards h7.'],
  ["Now's the moment: you take on f6. You give up the bishop, but the knight that guarded h7 and h5, and could jump to e4, is gone. They have to take back, and it matters which piece does it. You are a little better.", 'Bxf6 — removes the guard of h7.'],
  ["…Bxf6 — the bishop takes back; …gxf6 would have wrecked their king's cover. Now they have both bishops, and the one on f6 hits d4, but your pawns on c3 and e3 hold it. You are a little better.", '…Bxf6 — two bishops; f6 hits d4.'],
  ["f4 — the engine's first choice, and the full Stonewall: pawns on c3, d4, e3 and f4. Look at e5: two of your pawns cover it, so no piece of theirs can settle there, and it's a home for your knight later. You are a little better.", 'f4 — the Stonewall; e5 is yours.'],
  ["…Ba6 — remember …b6? Here's why: the bishop on a6 hits your bishop on d3, the one pointing at h7, and nothing guards it. Do you defend it, or trade first?", '…Ba6 — goes after the bishop on d3.'],
  ["Qe2 — the queen guards the bishop on d3. You could have traded on a6 instead and pulled their knight to the edge of the board. Guarding has a price: your bishop now stands between their bishop on a6 and your queen, so it's pinned. It's about level.", 'Qe2 — guards d3, but pinned.'],
  ['…Bxd3 — they take, and now their bishop on d3 hits your queen on e2. You take back.', '…Bxd3 — the bishops come off.'],
  ["Qxd3 — the only way to take back, and look where the queen lands: on d3, still aimed down the diagonal at h7. The light-squared bishops are gone, and so is their bishop pair. It's about level.", 'Qxd3 — back on the h7 diagonal.'],
  ["…c5 — there's their pawn break, and it's the engine's first choice: the pawn hits d4 from the side. Do you take it? No. This is what the triangle is for: if they trade on d4, a pawn takes back and your center stays whole. It's about level.", '…c5 — hits d4 from the side.'],
  ["Ngf3 — the last knight comes out, and look at what it covers: d4 gets another guard, and e5 is now covered three times. It's about level.", 'Ngf3 — guards d4, covers e5.'],
  ["…Nc6 — the knight adds a hit on d4: with the c5 pawn and the bishop on f6, that's three. Count your side: the pawns on c3 and e3, the knight on f3 and the queen on d3. Four guards, so d4 holds, and it's about level. Your plan for the middlegame: push g4 to grab space on the kingside, and play a3 to keep their knight off b4.", '…Nc6 — d4: three hits, four guards.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const E6 = 'Main line vs …e6';
const RAPTOR = 'Vaganian Attack (…Ne4)';
const D5 = '…d5 system';
const G6 = '…g6 fianchetto';
const BIG_CENTER = 'Big Center vs …e6';
const BF4_C5 = 'Bf4 vs …Ne4 and …c5';
const BF4_D5 = 'Bf4 vs …Ne4 and …d5';
const GAMBIT = 'b2 Gambit vs …Qb6';
const WALL = 'c4 and e4 vs …d6';

const TAB_LINES: Record<string, string[]> = {
  [E6]: ['d4', 'Nf6', 'Bg5', 'e6', 'Nd2', 'h6', 'Bh4', 'd5', 'e3', 'Be7', 'Bd3', 'b6', 'c3', 'O-O', 'Qe2', 'a5', 'Ngf3', 'c5', 'Ne5', 'Nfd7', 'Bxe7'],
  [RAPTOR]: ['d4', 'Nf6', 'Bg5', 'Ne4', 'h4', 'c5', 'd5', 'Qb6', 'Nd2', 'Nxg5', 'hxg5', 'Qxb2', 'g6', 'fxg6', 'Ngf3', 'd6', 'e4', 'Qf6', 'e5', 'dxe5', 'Rb1', 'e6', 'Bb5+', 'Bd7'],
  [D5]: ['d4', 'Nf6', 'Bg5', 'd5', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'Qb6', 'Qb3', 'c4', 'Qc2', 'Bg4', 'Bxf6', 'gxf6', 'e4', 'e6', 'Be2', 'Rg8', 'Bxg4', 'Rxg4', 'g3', 'dxe4'],
  [G6]: ['d4', 'Nf6', 'Bg5', 'g6', 'Bxf6', 'exf6', 'e3', 'Bg7', 'g3', 'O-O', 'Bg2', 'f5', 'Ne2', 'Nc6', 'O-O', 'd6', 'c4', 'Ne7', 'Nbc3', 'c6', 'b4', 'Rb8', 'a4', 'Be6'],
  [BIG_CENTER]: ['d4', 'Nf6', 'Bg5', 'e6', 'e4', 'h6', 'Bxf6', 'Qxf6', 'Nc3', 'c5', 'Nf3', 'cxd4', 'e5', 'Qd8', 'Qxd4', 'Nc6', 'Qe3', 'Qb6', 'Qxb6', 'axb6', 'Bb5'],
  [BF4_C5]: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'c5', 'f3', 'Qa5+', 'c3', 'Nf6', 'd5', 'e6', 'e4', 'exd5', 'exd5', 'd6', 'Qd2', 'Be7', 'Na3', 'Nbd7', 'Nc4'],
  [BF4_D5]: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'd5', 'e3', 'c5', 'Bd3', 'cxd4', 'Bxe4', 'dxe4', 'exd4', 'g6', 'Nc3', 'Bg7', 'Nge2', 'Nc6', 'd5', 'Ne5', 'Nxe4'],
  [GAMBIT]: ['d4', 'Nf6', 'Bg5', 'c5', 'd5', 'Qb6', 'Nc3', 'Qxb2', 'Bd2', 'Qb6', 'e4', 'd6', 'f4', 'Qd8', 'Nf3', 'a6', 'a4', 'e6', 'Bc4', 'exd5', 'Nxd5'],
  [WALL]: ['d4', 'Nf6', 'Bg5', 'c5', 'd5', 'd6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'h6', 'Bf4', 'e6', 'dxe6', 'Bxe6', 'Qxd6', 'Nc6', 'Qxc5', 'Nd7', 'Qa3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  [E6]: [
    ["Qe2 — this time you don't take on f6 yet. The queen steps up to e2, where it guards your bishop on d3, and it clears d1, so castling long becomes possible. You are a little better.", 'Qe2 — guards d3, frees d1.'],
    ['…a5 — they grab space on the queenside: the pawn covers b4, and it can step on to a4 later. You are a little better.', '…a5 — queenside space; a4 is next.'],
    ['Ngf3 — the last minor piece comes out, guarding d4 and covering e5, the square it wants next. You are a little better.', 'Ngf3 — guards d4, covers e5.'],
    ["…c5 — the pawn hits d4 from the side, but d4 has three guards: the pawns on c3 and e3 and the knight on f3. It's about level.", '…c5 — hits d4; three guards hold it.'],
    ["Ne5 — the knight jumps into e5, where the d4 pawn guards it. Look at what it sees from there: f7, right next to their king, and c6, a square no pawn of theirs can cover now that the b-pawn stands on b6. It's about level.", 'Ne5 — sees f7 and c6.'],
    ["…Nfd7 — the knight steps aside to challenge yours on e5, and look what that uncovers: the two dark bishops now face each other, and yours on h4 has no guard, because the knight that covered it from f3 is now on e5. So don't wait: castle here, and …Bxh4 just wins a piece. It's about level.", '…Nfd7 — now the h4 bishop hangs.'],
    ["Bxe7 — so you take first, and it's the engine's first choice. Remember the bishop that kept the pin from h4? It cashes in here, on e7, not on f6: it hits their queen and the rook on f8, so they have to take back. It's about level. Your plan for the middlegame: trade knights on d7, then push g4 for space on the kingside.", 'Bxe7 — the dark bishops come off.'],
  ],
  [RAPTOR]: [
    ['…Ne4 — the masters\' most common answer, about three in ten. Rather than wait to be pinned, the knight jumps forward, hits your bishop on g5, and nothing guards it. Where does the bishop go?', '…Ne4 — jumps at the bishop on g5.'],
    ['h4 — do you have to move the bishop? No: h4 guards it with a pawn. This is the Raptor. If they take on g5, the h-pawn takes back, and your rook on h1 gets the half-open h-file. Eight masters in ten retreat with Bf4 instead; h4 is the sharp road.', 'h4 — guards g5: the Raptor.'],
    ['…c5 — about half the masters leave the knight where it is and hit d4 from the side. And notice the second job: the pawn has cleared the way for their queen, and b6 is the square it wants, with your b2 pawn in its sights.', '…c5 — hits d4, frees the queen.'],
    ["d5 — the engine's first choice. Rather than trade, the pawn steps past: it grabs space and covers c6 and e6, two squares their pieces would like. About four masters in ten push; a little more than half take on c5. It's about level.", 'd5 — space; c6 and e6 covered.'],
    ["…Qb6 — six masters in ten, and there's the queen move the c-pawn made room for. It goes straight for b2, which nothing guards now that your bishop has left c1. So: do you defend b2, or let it go?", '…Qb6 — goes after b2.'],
    ['Nd2 — the tempting move is f3, kicking the knight. But then …Qxb2, and after you take the knight, their queen takes your rook on a1. So the knight comes out instead, as almost nine masters in ten play: it hits the knight on e4, which nothing guards. And b2 is poisoned for now: if the queen takes it, Nxe4 wins a knight for a pawn.', 'Nd2 — hits the loose knight on e4.'],
    ['…Nxg5 — they take the bishop, and now the knight on g5 hangs to your h-pawn. The engine prefers …h6, and after the capture you are a little better.', '…Nxg5 — takes; hxg5 is coming.'],
    ["hxg5 — there's the point of h4: the pawn takes back, and your rook on h1 now looks straight up the h-file at h7. b2 is still hanging, and it's about level.", 'hxg5 — the rook sees h7.'],
    ['…Qxb2 — now they can take it: the knight that hung on e4 is gone, so nothing punishes the capture. The queen on b2 hits your rook on a1 and the pawns on a2 and c2. Your queen guards the rook, but look how far their queen is from its own king. You are a little better.', '…Qxb2 — grabs b2, hits a1.'],
    ["g6 — a pawn sacrifice to tear open their kingside: the pawn hits f7 and h7. Take with the h-pawn, and your rook on h1 takes the rook on h8. It's the engine's first choice, and you are a little better.", 'g6 — hits f7 and h7.'],
    ["…fxg6 — not the h-pawn: the f-pawn takes, so the h7 pawn stays put and your rook still can't reach h8. The engine prefers …Qf6 first. Their kingside is in pieces, and even two pawns down, you are clearly better.", '…fxg6 — not the h-pawn.'],
    ["Ngf3 — the engine's first choice. The knight comes out toward e5 and g5, and look at the board: their queen is far away on b2 and their kingside pawns are broken. Even two pawns down, you are a little better.", 'Ngf3 — develops toward e5 and g5.'],
    ["…d6 — it opens the diagonal for their bishop on c8, but it's a real mistake: the engine prefers …e6, by more than a pawn. Look at the square it leaves behind: with the pawns gone from d7 and f7, no pawn of theirs can ever cover e6 again. You are clearly better.", '…d6 — a mistake; …e6 was needed.'],
    ['e4 — the center pawn joins in: it opens the diagonal for your bishop on f1, and the pawn itself is ready to push on to e5. And if they develop with …Nd7, your knight jumps to g5, heading for that hole on e6. You are clearly better.', 'e4 — e5 is next.'],
    ['…Qf6 — the queen hurries back to defend, and from f6 it hits your rook on a1 and the knight on f3. Both are guarded, and the move is a mistake: the engine prefers …Nd7. Look where the queen has put itself: right in the path of your e-pawn. You are winning.', '…Qf6 — back to defend, a mistake.'],
    ["e5 — the engine's first choice: the pawn hits the queen on f6 and the pawn on d6 at once. Can the queen just take it? No: your knight on f3 guards e5 and takes the queen. So their best is to take with the d-pawn, and that's a third pawn you give up on purpose: every capture is a move they don't spend developing. You are winning.", 'e5 — hits the queen and d6.'],
    ["…dxe5 — they take, and you're three pawns down. So what do you have for them? Look at their king on e8: the pawns from f7 and d7 are gone, and the diagonal from b5 to e8 is wide open. You are winning.", '…dxe5 — three pawns, but e8 is open.'],
    ['Rb1 — the rook takes the half-open b-file and hits b7, which only the bishop on c8 guards. So that bishop is tied down: the moment it leaves c8, the pawn on b7 falls. You are winning.', 'Rb1 — the b-file; hits b7.'],
    ["…e6 — the pawn hits d5, which nothing guards. But don't save the pawn: remember that open diagonal to e8?", '…e6 — hits d5; the diagonal is open.'],
    ['Bb5+ — there it is: the bishop checks the king on e8 down that open diagonal. You are winning.', 'Bb5+ — check down the open diagonal.'],
    ["…Bd7 — they block with the bishop, and now it's pinned to the king on e8 by your bishop on b5. You are winning. Your plan for the middlegame: Ne4 hits their queen, and once it steps to f5, Bd3 lines up behind your knight, so the knight's next jump uncovers an attack on the queen, against a king that never found a safe home.", '…Bd7 — blocks, and is pinned.'],
  ],
  [D5]: [
    ['…d5 — about a quarter of masters. The pawn takes the center and covers e4. Notice what it leaves alone: if you take on f6, a pawn has to take back, and their pawns get doubled.', '…d5 — center pawn; Bxf6 stays possible.'],
    ['e3 — about four masters in ten play it, and just as many take on f6 at once. The pawn props up d4 and opens the road for your bishop on f1, while the bishop on g5 stays outside the chain.', 'e3 — props up d4; bishop stays outside.'],
    ["…c5 — half the masters, and the engine's first choice. The pawn hits d4 from the side, and nothing guards it on c5. Should you take? Not yet: after dxc5, …Ne4 hits your bishop on g5, trades it off, and the pawn comes back to them anyway. So build the triangle and let them decide.", '…c5 — hits d4 from the side.'],
    ['c3 — two masters in three take on f6 first; about one in five plays this. Now d4 has two pawns behind it, and with c2 empty, your queen has a road to b3. Keep that in mind.', 'c3 — solid d4; a road to b3.'],
    ['…Nc6 — a second hit on d4. Count the guards: the pawns on c3 and e3, and your queen on d1. It holds. And their pawn on c5 is still loose.', '…Nc6 — a second hit on d4.'],
    ["Nd2 — the engine's first choice. The knight covers e4 and c4, and it leaves the f3 square for the other knight.", 'Nd2 — covers e4 and c4.'],
    ['…Qb6 — there\'s the queen\'s question: it hits b2, and nothing guards that pawn now that your bishop has left c1. Remember the road to b3?', '…Qb6 — hits the unguarded b2.'],
    ["Qb3 — the engine's first choice. Queen meets queen: b2 is guarded now, and their queen is tied down too, because it's the only piece guarding the pawn on c5. And if they trade on b3, your a-pawn takes back.", 'Qb3 — guards b2, offers the trade.'],
    ["…c4 — the loose pawn solves its own problem: it steps forward, where the d5 pawn guards it, and it kicks your queen on the way. It's about level. Where does the queen go?", '…c4 — kicks the queen.'],
    ["Qc2 — not back to d1: then …Qxb2 just wins the pawn. On c2 the queen keeps guarding b2, and it looks all the way down the diagonal at h7. Trading queens on b6 was the other way; this keeps them on. It's about level.", 'Qc2 — guards b2, looks at h7.'],
    ["…Bg4 — the bishop comes out, but it's a mistake: the engine prefers …e5, and now you are a little better. Why? The bishop on g4 has exactly one guard, the knight on f6, and your bishop on g5 can take that knight.", '…Bg4 — guarded only by the f6 knight.'],
    ["Bxf6 — the engine's first choice: you take the knight that was the only guard of two things, the bishop on g4 and the pawn on d5. A pawn has to take back, their structure gets damaged, and e4 comes next. You are a little better.", 'Bxf6 — g4 and d5 lose their guard.'],
    ['…gxf6 — the g-pawn takes. Now their pawns on f7 and f6 are doubled, the h7 pawn stands alone, and in return their rook gets the half-open g-file. You are a little better.', '…gxf6 — doubled f-pawns, half-open g-file.'],
    ["e4 — the engine's first choice, the central break: the pawn hits d5, and with the knight on f6 gone, nothing guards it. And if they take on e4? Then their pawn on c4 loses its guard, and Nxc4 picks it up. You are a little better.", 'e4 — hits the unguarded d5.'],
    ["…e6 — the engine's choice: the pawn props up d5. You are still a little better.", '…e6 — props up d5.'],
    ["Be2 — the engine's first choice, and here's why the knight on f6 mattered: the bishop on g4 has lost its guard, and your bishop on e2 hits it, and c4 too. You are a little better.", 'Be2 — goes after the loose g4 bishop.'],
    ['…Rg8 — the rook takes the half-open g-file and guards the bishop on g4. They could have traded bishops on e2 instead; this way the rook is ready to take back on g4 itself, where it will look at your pawn on g2. You are clearly better.', '…Rg8 — guards g4 from the g-file.'],
    ["Bxg4 — the engine's first choice: you take anyway, and the rook takes back. The trade clears e2 for your knight on g1, the one minor piece still at home. You are clearly better.", 'Bxg4 — trade off the bishop.'],
    ['…Rxg4 — the rook on g4 now hits your pawns on e4 and g2, and nothing guards g2. You are clearly better.', '…Rxg4 — hits e4 and g2.'],
    ['g3 — the pawn steps up to g3, where the pawns on f2 and h2 guard it. The engine prefers taking on d5 first, opening the center, and after g3 you are a little better.', 'g3 — two pawns guard it there.'],
    ["…dxe4 — they take on e4, and for the moment you're a pawn down. But look at c4: nothing guards it, and your knight on d2 hits it. You are a little better. Your plan for the middlegame: Nxc4 wins the pawn back; when their queen comes over to hit the knight, it drops back to e3 and hits their rook on g4, and their broken pawns on f7, f6 and h7 stay targets.", '…dxe4 — but c4 is loose.'],
  ],
  [G6]: [
    ['…g6 — about one master in twenty. Their bishop heads for g7, but look at f6 now: if you take there, only the e-pawn can take back, and their pawns get doubled.', '…g6 — the bishop heads for g7.'],
    ["Bxf6 — eight masters in ten take at once. Your bishop on f6 hits the rook on h8, so they have to take back, and only the e-pawn can. That's the trade this line is built on: you give the bishop for the knight, and in return their f-pawns get doubled. It's about level.", 'Bxf6 — doubles their f-pawns.'],
    ['…exf6 — every master takes this way. The f-pawns are doubled, but they get something too: their bishop on f8 can come out, and they have the two bishops against your bishop and two knights.', '…exf6 — doubled pawns, two bishops.'],
    ["e3 — six masters in ten. The pawn props up d4, and it clears e2 for your knight on g1. Why would the knight go there and not to f3? You'll see once your own bishop reaches the long diagonal.", 'e3 — props up d4, clears e2.'],
    ['…Bg7 — the bishop takes the long diagonal, though for now its own pawn on f6 stands in the way.', '…Bg7 — behind its own f6 pawn.'],
    ['g3 — you mirror them: your bishop is heading for g2, where it will look down the long diagonal at b7.', 'g3 — the bishop heads for g2.'],
    ['…O-O — their king tucks in behind the pawns on f7, g6 and h7.', '…O-O — the king tucks in.'],
    ["Bg2 — the engine's first choice. The bishop lands on the long diagonal and hits b7, and that pawn is pinned to the rook on a8 behind it.", 'Bg2 — hits b7, pinned to a8.'],
    ["…f5 — the front f-pawn steps up, and two things change. It covers e4, so your e-pawn won't be pushing there. And their bishop on g7 now sees the long diagonal all the way to d4, a pawn with two guards, your pawn on e3 and the queen on d1.", '…f5 — the bishop on g7 wakes up.'],
    ["Ne2 — here's the answer: the knight goes to e2, not to f3, so the long diagonal stays open for your bishop on g2. From e2 it guards d4, and it can come to f4 later.", "Ne2 — keeps the g2 bishop's diagonal open."],
    ['…Nc6 — the knight does two jobs: it hits d4, and it steps onto the long diagonal, so your bishop on g2 no longer reaches b7. Count the guards on d4: the pawn on e3, the knight on e2 and the queen on d1, against the knight and the bishop on g7. It holds, and you are a little better.', '…Nc6 — a second hit on d4.'],
    ['O-O — you castle, and your king sits behind the bishop on g2 and the pawns on f2, g3 and h2. You are a little better.', 'O-O — your king is safe.'],
    ['…d6 — a modest step that opens the diagonal for their bishop on c8. You are a little better.', '…d6 — frees the bishop on c8.'],
    ["c4 — the engine's first choice. The pawn takes d5 away from their pieces and gets your queenside moving. You are a little better.", 'c4 — covers d5; the queenside moves.'],
    ['…Ne7 — the knight steps back, and that reopens the long diagonal: your bishop on g2 hits b7 again, pinned to the rook on a8.', '…Ne7 — the b7 pin returns.'],
    ["Nbc3 — the engine's first choice: the last knight comes out to c3, covering d5 and b5. You are a little better.", 'Nbc3 — covers d5 and b5.'],
    ['…c6 — the pawn covers d5 and b5, the two squares your knight on c3 was looking at, and it shuts the diagonal your bishop on g2 was using against b7.', '…c6 — covers d5 and b5.'],
    ["b4 — the engine's first choice. Your queenside pawns get moving: c4 and b4 side by side, grabbing space on the queenside. You are a little better.", 'b4 — the queenside pawns roll.'],
    ["…Rb8 — the rook steps off the a8 corner and stands behind the b-pawn.", '…Rb8 — the rook backs up b7.'],
    ['a4 — another pawn joins: a4 and b4 side by side, and the b-pawn is ready to push on into their queenside. You are a little better.', 'a4 — a4 and b4; b5 is coming.'],
    ['…Be6 — the bishop hits c4, and nothing guards it yet. You are a little better. Your plan for the middlegame: Qb3 guards c4 and joins the queenside, the a-pawn pushes on for more space where your pawns are already further up the board, and a rook comes to c1.', '…Be6 — hits the loose c4 pawn.'],
  ],
  [BIG_CENTER]: [
    ['e4 — more than half the masters grab the whole center at once: the Big Center. Is the pawn on e4 hanging? The knight on f6 hits it, but that knight is pinned: take on e4, and your bishop takes the queen on d8.', 'e4 — the Big Center; e4 is safe.'],
    ['…h6 — more than eight masters in ten. The pawn hits your bishop on g5, which nothing guards. And if it drops back to e3 or f4, the pin breaks and the knight takes on e4. So what now?', '…h6 — the pin is challenged.'],
    ["Bxf6 — every master takes. The bishop goes, but so does the knight that hit e4, and your two center pawns stay. It's about level.", 'Bxf6 — keeps both center pawns.'],
    ["…Qxf6 — every master takes back with the queen. Now it hits d4 and f2, and both are guarded. But their queen is out early on f6, and you'll gain time on it later.", '…Qxf6 — the queen is out early.'],
    ['Nc3 — four masters in ten. The knight guards e4 and covers d5, the square their …d5 break wants.', 'Nc3 — guards e4, covers d5.'],
    ["…c5 — they hit d4 at once, but it's a real mistake: the engine prefers the quiet …a6, by about a pawn, and now you are clearly better. Why? Because e5 is coming, and it hits the queen on f6.", '…c5 — a mistake; e5 is coming.'],
    ["Nf3 — the natural move: the knight guards d4 again. But it's a slip. The engine wanted the e-pawn pushed at once, hitting the queen on f6, by more than a pawn. Now they get to trade on d4 first, and it's about level.", 'Nf3 — guards d4; e5 was stronger.'],
    ["…cxd4 — they take, and the pawn on d4 hits your knight on c3. It's about level.", '…cxd4 — hits the knight on c3.'],
    ["e5 — your knight on c3 is attacked, and there's a pawn on d4 to take back. Do neither yet. Take with the knight, and …Bc5 hits it; take with the queen, and the queens come off. So the bigger threat comes first: the pawn hits the queen on f6, it has to move, and then you take on d4. It's the engine's first choice.", 'e5 — hits the queen on f6.'],
    ["…Qd8 — the queen goes all the way home, and the pawn on d4 is left with no guard. But notice the road the queen has from d8 now: out to b6. You'll see it again.", '…Qd8 — back home; d4 is loose.'],
    ["Qxd4 — the engine's first choice: the material is level again, and your queen sits in the middle of the board, hitting a7 and d7.", 'Qxd4 — level material, a central queen.'],
    ['…Nc6 — with a gain of time: the knight hits your queen on d4 and the pawn on e5.', '…Nc6 — hits your queen and e5.'],
    ["Qe3 — the queen steps back to e3 and keeps guarding e5, alongside the knight on f3. It's about level.", 'Qe3 — keeps guarding e5.'],
    ["…Qb6 — there's the road from d8: the queen offers a trade and hits b2, which nothing guards. So who takes first? If you let them take on e3, your f-pawn has to take back, and you're left with doubled e-pawns. It's about level.", '…Qb6 — offers the trade, hits b2.'],
    ["Qxb6 — the engine's first choice: you take first, so it's their pawns that get doubled, not yours, and b2 is no longer in danger. It's about level.", 'Qxb6 — the queens come off.'],
    ["…axb6 — the a-pawn takes back. Their b-pawns are doubled, but the rook on a8 gets the half-open a-file and looks straight at a2. It's about level.", '…axb6 — doubled b-pawns, half-open a-file.'],
    ["Bb5 — the engine's first choice. Where does this bishop belong? On b5: with their a-pawn now on b6 and their c-pawn traded off, no pawn can ever chase it away. And it hits the knight on c6, the piece that attacks your e5 pawn. With the queens off, it's about level. Your plan for the middlegame: a4 backs up the bishop on b5, castle long so a rook takes the d-file, and Rhe1 stands behind the e5 pawn.", 'Bb5 — hits the knight on c6.'],
  ],
  [BF4_C5]: [
    ['Bf4 — eight masters in ten simply step back. The bishop gets out of the knight\'s reach onto an open diagonal, where it hits c7. And look at the knight on e4: it stands in the middle of the board with nothing guarding it.', 'Bf4 — out of reach, hits c7.'],
    ["…c5 — six masters in ten hit d4 from the side; about a third give the knight a pawn behind it instead. Notice the diagonal this opens: their queen can now come to a5, with check. It's about level. So how do you deal with that knight?", '…c5 — hits d4; the knight is alone.'],
    ["f3 — eight masters in ten, and the engine's first choice: the pawn hits the knight on e4, which nothing guards, so it has to move again. And if they ignore it and take on d4? Then fxe4, and you've won a knight for a pawn. It's about level.", 'f3 — kicks the loose knight.'],
    ["…Qa5+ — there's the check the c-pawn made room for: before the knight moves, the queen checks your king on e1 along the diagonal. How do you block it?", '…Qa5+ — check first.'],
    ["c3 — with a pawn, and it's the engine's first choice. Why not Bd2? Because the knight takes it, the queens come off, and …cxd4 wins your d4 pawn. The c3 pawn is pinned to your king for now, but it doesn't need to move. It's about level.", 'c3 — blocks; Bd2 loses d4.'],
    ['…Nf6 — the knight finally goes home. Count its trip: from f6 to e4 and back to f6, three moves to end where it started. You are a little better.', '…Nf6 — three moves, back on f6.'],
    ["d5 — the engine's first choice. The pawn steps past c5 and grabs space: it covers c6 and e6, and their own d-pawn can never get to d5 now. And with f3 already played, e4 is next. You are a little better.", 'd5 — space; e4 comes next.'],
    ['…e6 — they hit d5 at once, with the pawn and the knight on f6 together, and only your queen guards it. So e4 has to come now.', '…e6 — d5 is hit twice.'],
    ["e4 — the engine's first choice: the pawn guards d5, so if they take there, a pawn takes back. That's the wedge: d5, backed by e4, with f3 behind it.", 'e4 — backs up d5.'],
    ["They take on d5, the engine's choice, and now a pawn of theirs stands there, hitting your pawn on e4. Which piece takes back?", '…exd5 — the trade on d5.'],
    ["exd5 — the pawn takes back, not the queen: on d5 the queen would simply be taken by the knight on f6. So the wedge stays, covering c6 and e6. And notice the e-file: it's wide open now, with both kings still on it. It's about level.", 'exd5 — the d5 wedge stays.'],
    ["…d6 — the engine's first choice, and they have to: leave it, and your own pawn pushes on to d6, shutting in their bishop on f8. Now the pawn is stopped, and their other bishop, on c8, has a diagonal. You are a little better.", '…d6 — stops d5, frees c8.'],
    ['Qd2 — the queen steps up to d2 and does two jobs: it guards d5 down the d-file, and it stands between their queen on a5 and your king, so the pawn on c3 is no longer pinned. You are a little better.', 'Qd2 — guards d5, shields the king.'],
    ['…Be7 — the bishop develops, shuts the open e-file in front of their king, and clears the way to castle. You are a little better.', '…Be7 — ready to castle.'],
    ['Na3 — the knight goes to the edge, but only on its way to c4, where it will hit their queen and the d6 pawn. You are a little better.', 'Na3 — heading for c4.'],
    ["…Nbd7 — the last knight develops and covers e5, so your bishop on f4 can't use that square. It's about level.", '…Nbd7 — covers e5.'],
    ['Nc4 — there it is: the knight hits the queen on a5, which nothing guards, and the d6 pawn, which your bishop on f4 hits too. You are a little better. Your plan for the middlegame: once the queen steps back, g4 grabs space on the kingside and your king castles long; if …b5 chases the knight, it drops back to e3.', 'Nc4 — hits the queen and d6.'],
  ],
  [BF4_D5]: [
    ["…d5 — about a third of masters, and the engine's first choice: the pawn guards the knight on e4, so it's no longer alone in the middle of the board.", '…d5 — the knight gets a guard.'],
    ['e3 — six masters in ten. The pawn props up d4 and opens the road for your bishop on f1, which is heading for d3 to challenge that knight.', 'e3 — frees f1 for Bd3.'],
    ["…c5 — the pawn hits d4 from the side. But count its guards on c5: just one, the knight on e4. It's about level.", '…c5 — hits d4.'],
    ["Bd3 — where does this bishop belong? On d3, and look what it hits: the knight on e4, the one guard of the c5 pawn. So they have a problem to solve right away. And there's a second idea behind it: take the knight, and the pawn that takes back lands on e4, far from home, where it becomes a target.", 'Bd3 — hits the knight on e4.'],
    ["…cxd4 — they solve the c5 problem by trading the pawn off: now it stands on d4, hitting your e3 pawn. So which capture comes first, the pawn or the knight? It's about level.", '…cxd4 — hits e3.'],
    ["Bxe4 — first the knight: the bishop takes it, and the pawn on d5 takes back. The pawn on d4 can wait a move; nothing of theirs guards it yet. It's about level.", 'Bxe4 — first the knight.'],
    ["…dxe4 — and there's the structure you were after: their pawn on e4, far from home, doubled in front of the one on e7, with no pawn to guard it.", '…dxe4 — a lonely pawn on e4.'],
    ["exd4 — you take back, so the material is even again, and it's about level. Now the hunt starts: that pawn on e4 is the target.", 'exd4 — level; e4 is the target.'],
    ["…g6 — their bishop heads for g7, where it will hit d4. It's about level.", '…g6 — the bishop heads for g7.'],
    ["Nc3 — the hunt begins: the knight hits e4 straight away, and nothing guards that pawn. Notice it couldn't come here a move earlier, while their pawn still stood on d4 and covered c3. It's about level.", 'Nc3 — hits the loose e4 pawn.'],
    ["…Bg7 — they don't defend e4; they hit back at d4. Now the bishop on g7 and the queen on d8 both attack it, and only your queen on d1 guards it.", '…Bg7 — d4 is hit twice.'],
    ["Nge2 — why not take on e4 at once? Because after Nxe4, their queen takes on d4, the queens come off, and their bishop lands on d4. So first the knight comes to e2 and gives d4 a second guard. It's the engine's first choice.", 'Nge2 — d4 gets a second guard.'],
    ['…Nc6 — a third hit on d4: the knight joins the bishop on g7 and the queen on d8, against your two guards.', '…Nc6 — three hits on d4.'],
    ["d5 — three against two, so d4 can't stay where it is. The pawn steps forward and hits the knight on c6, so they have to move it again. And e4 still hangs; taking it can wait one more move.", 'd5 — steps out, hits the knight on c6.'],
    ["…Ne5 — the knight jumps to the center, and e4 is still hanging. It's about level.", '…Ne5 — e4 still hangs.'],
    ["Nxe4 — and there it is: the pawn that landed on e4 finally falls, and you're a pawn up. It's about level. Your plan for the middlegame: hold the extra pawn. When …Bf5 hits your knight on e4, the other knight comes to g3 to guard it, and when …Nc4 goes after b2, b3 chases it away.", 'Nxe4 — the e4 pawn falls.'],
  ],
  [GAMBIT]: [
    ["…c5 — about one master in eight, and the engine's first choice. The pawn hits d4 at once, and nothing guards it on c5. Push past, or take on f6?", '…c5 — hits d4 right away.'],
    ["d5 — the engine's first choice; about four masters in ten push past, and a few more take on f6 first. The pawn grabs space and covers c6 and e6, and the structure is a Benoni now: your pawn on d5 against theirs on c5.", 'd5 — space; c6 and e6 covered.'],
    ['…Qb6 — about a third of masters go straight for b2, which nothing guards now that your bishop has left c1. The engine prefers a quiet step with their d-pawn instead, and after …Qb6 you are a little better. So: guard the pawn, or let it go?', '…Qb6 — goes after b2.'],
    ['Nc3 — nearly nine masters in ten let it go, and so does the engine. The knight comes out, backs up d5 and covers e4, and if their queen takes on b2, it will be a long way from home. This is the Poisoned Pawn Variation. You are a little better.', 'Nc3 — let b2 go, and develop.'],
    ["…Qxb2 — about eight masters in ten grab it, and it comes with a real threat: the queen hits your knight on c3, which nothing guards. If it takes there, it's check, and the rook on a1 falls next. You are a little better.", '…Qxb2 — hits the loose knight on c3.'],
    ["Bd2 — every master plays it: the bishop drops back to guard the knight on c3. And the rook on a1? Your queen guards it, so taking it costs them their queen. Now it's their queen that has to watch out: Rb1 is coming, hitting it down the b-file. You are a little better.", 'Bd2 — guards c3; Rb1 is coming.'],
    ["…Qb6 — every master pulls the queen back before Rb1 comes. They're a pawn up, but their queen has spent three moves winning it. You are a little better.", '…Qb6 — the queen runs back.'],
    ["e4 — nearly every master builds the center: e4 now, f4 next. That's your payment for b2. It's about level.", 'e4 — the center is your payment.'],
    ["…d6 — the engine's first choice. Why this pawn? Your e-pawn was ready to run on to e5 and hit the knight on f6, and now that square is covered. It also opens the diagonal for their bishop on c8. You are a little better.", '…d6 — covers e5, frees c8.'],
    ["f4 — the engine's first choice: e4 and f4 stand side by side, and with the f-pawn behind it, e5 is coming. You are a little better.", 'f4 — e5 is coming.'],
    ["…Qd8 — the queen goes all the way home, where it backs up d6 against e5. Count its moves: four, and it's back where it started, with one pawn to show for them.", '…Qd8 — four moves, back home.'],
    ["Nf3 — the engine's first choice: the knight supports e5, the push your center has been building toward, and brings you a move closer to castling. You are a little better.", 'Nf3 — backs up e5.'],
    ['…a6 — the pawn takes b5 away from your knight and bishop, and it gets …b5 ready. You are a little better.', '…a6 — …b5 is coming.'],
    ['a4 — the pawn covers b5, so …b5 is off the table for now. You are a little better.', 'a4 — stops …b5.'],
    ["…e6 — the engine's first choice: the pawn hits d5. Your pawn on e4 and the knight on c3 guard it, against the e6 pawn and the knight on f6. You are a little better.", '…e6 — hits d5.'],
    ["Bc4 — the engine's first choice: the bishop adds a third guard to d5, and it hits a6 as well. You are a little better.", 'Bc4 — a third guard for d5.'],
    ['They take on d5, and their pawn there hits your bishop on c4, which nothing guards, and the e4 pawn too. So you take back at once. But with which piece? You are a little better.', '…exd5 — hits the bishop on c4.'],
    ["The knight takes back, and it's the engine's first choice. On d5 it stands on an outpost no pawn of theirs can ever challenge, and it hits the knight on f6. You're a pawn down, and your e4 pawn has lost its guard, but you are a little better. Your plan for the middlegame: Ng5 brings the other knight toward f7, you castle, and if the knights trade on d5, your bishop takes back there, in the middle of the board.", 'Nxd5 — takes back; an outpost on d5.'],
  ],
  [WALL]: [
    ["…d6 — the engine's first choice, though only about one master in ten plays it. The pawn stops yours on d5 from going any further and opens the diagonal for their bishop on c8.", '…d6 — stops the d5 pawn.'],
    ['c4 — nine masters in ten develop with Nc3 here. This is the plan move instead: the pawn guards d5, the first brick of a wall across the center.', 'c4 — guards d5, starts the wall.'],
    ["…g6 — their bishop heads for g7, a Benoni setup. In the handful of master games here, they asked your bishop the question first, with …h6 or …Ne4. It's about level.", '…g6 — a Benoni setup.'],
    ["Nc3 — the engine's first choice. They didn't ask the bishop the question, so now the knight covers e4: their knight can't jump there any more, and your e-pawn can. It also guards d5 again. It's about level.", 'Nc3 — guards d5, covers e4.'],
    ['…Bg7 — all five master games that reach here play it. The bishop takes the long diagonal, and it guards the knight on f6: take there now, and the bishop takes back with their pawns still whole. You are a little better.', '…Bg7 — onto the long diagonal.'],
    ["e4 — the engine's first choice, and there's the wall: pawns on c4, d5 and e4. Between them they cover b5, c6, e6 and f5, squares their pieces would like. It's about level.", 'e4 — c4, d5, e4: the wall.'],
    ['…h6 — about four masters in ten. The pawn hits your bishop on g5, which nothing guards, and taking on f6 gets you nothing now that their bishop takes back. So where does it go?', '…h6 — the bishop on g5 is hit.'],
    ["Bf4 — the engine's first choice: the bishop steps back to f4, where it hits d6 and h6. Both are guarded for now, but keep your eye on d6. You are a little better.", 'Bf4 — hits d6 and h6.'],
    ['…e6 — they hit d5 at once, trying to break the wall. Do you hold it with a pawn? No: take, and look at what it does to d6.', '…e6 — hits d5.'],
    ["dxe6 — the engine's first choice. After they take back, no pawn can guard d6 any more: the pawns that could, from c7 and e7, have both moved on. You are a little better.", 'dxe6 — d6 loses its pawn guards.'],
    ['…Bxe6 — they take back with the bishop, which now hits c4. But look at d6: only their queen guards it, while your queen on d1 and your bishop on f4 both hit it. You are a little better.', '…Bxe6 — but d6 is hit twice.'],
    ["The queen takes on d6 — the engine's first choice. If they trade queens, your bishop takes back and you've simply won a pawn. And from d6 the queen hits the bishop on e6, the knight on b8 and the c5 pawn, which nothing guards. You are a little better.", 'Qxd6 — wins the d6 pawn.'],
    ['…Nc6 — the knight develops, but it leaves c5 hanging: nothing guards that pawn, and your queen on d6 hits it. You are a little better.', '…Nc6 — but c5 is left hanging.'],
    ["Qxc5 — the engine's first choice: a second pawn, and your queen on c5 now hits a7 and the knight on c6. You are a little better.", 'Qxc5 — a second pawn.'],
    ["…Nd7 — the engine's first choice: the knight hits your queen on c5, which nothing guards, so it has to move again. You are a little better.", '…Nd7 — hits the queen on c5.'],
    ["Qa3 — the engine's first choice: the queen steps away to a3, where it still hits a7. And look at f8: the queen covers it, so they can't castle short for now. You're two pawns up and a little better. Your plan for the middlegame: when …Bf8 hits the queen, Bd6 blocks and offers to trade bishops, and with fewer pieces left, your two extra pawns count for more.", 'Qa3 — two pawns up; f8 covered.'],
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

export const PRO_GOTHAMCHESS_TROMPOWSKY_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-trompowsky',
  title: "This repertoire's Trompowsky — vs …e6 and the f4 Storm",
  orientation: 'white',
  sources: [
    'book:queens-gambit',
    'concept:pos-development',
    'concept:pawn-doubled',
    'https://www.chess.com/openings/Trompowsky-Attack',
    'https://en.wikipedia.org/wiki/Trompowsky_Attack',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
