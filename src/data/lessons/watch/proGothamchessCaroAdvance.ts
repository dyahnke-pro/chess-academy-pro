// The Advance Variation against the Caro-Kann, for White (the pro repertoire) —
// the Watch course, one beat a move (WO-OPENINGS-REWRITE-01). Written from the
// fact sheet: masters' percentages, engine lines at a fixed depth, the board
// after each move. The student plays White. Standard:
// docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register (§2a). The
// last two tabs are lines taught for this opening in the repertoire's videos;
// where each of the others went is recorded in
// docs/levy-lines/decisions/pro-gothamchess-caro-advance-white.json.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h5', 'Bg5', 'Qb6', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Nd2', 'Ne7', 'c4', 'Nf5', 'Ne2', 'dxc4', 'Nxc4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — close to half of all master games start with it, and the engine likes it best. The pawn takes a central square and opens two roads at once: one for your queen, one for the bishop on f1.", 'e4 — the center, two roads open.'],
  ["…c6, the Caro-Kann, fewer than one master in ten. Why such a quiet move? It's preparation. When …d5 comes, the c-pawn will be there to take back on d5. And unlike …e6, it doesn't shut in their bishop on c8. Keep an eye on that bishop: this whole course is about where it goes.", '…c6 — the Caro-Kann, …d5 next.'],
  ["d4, eight masters in ten. Two pawns side by side on e4 and d4, and nothing of theirs can touch them yet. So what was …c6 for? You're about to see it.", 'd4 — two pawns in the center.'],
  ["…d5, almost every master. There's the point of …c6: the pawn hits e4, and nothing guards it. So what do you do with that pawn? Guard it with a knight, trade it on d5, or push it past. This course pushes.", '…d5 — hits e4; push, trade or guard?'],
  ["e5, the Advance, and the most popular choice here, four masters in ten. Why push instead of guarding? On e5 the pawn steps past their d5 pawn, so there's no trade in the center. It takes f6 away from their knight on g8, and it gives you space on the kingside. Compare it with the Advance French: there, …e6 has already locked their light-squared bishop behind the pawns. Here …c6 kept that road open, so they'll bring the bishop out to f5 first, and only then play …e6. Their other plan is …c5, hitting d4, the base of your chain. Everything that follows is about that bishop and that break.", 'e5 — the Advance: space, no trade.'],
  ["…Bf5, nearly eight masters in ten: there's the bishop, out in front of the pawn chain before …e6 closes the door behind it. From f5 it hits c2. Now the question: can you make that bishop regret coming out?", '…Bf5 — the bishop gets out first.'],
  ["h4: two masters in ten play it, where half play Nf3. The pawn is heading for h5, and with g4 to follow, your pawns could start chasing the bishop on f5 around the board. So they usually stop it right away.", 'h4 — the pawns go after f5.'],
  ["…h5, seven masters in ten: stop the pawn in its tracks. But look at the price. Their h-pawn can never go back to h6, so g5 becomes a hole that pawn can never cover again. Which of your pieces would love that square?", '…h5 — blocks the pawn; g5 is a hole.'],
  ["Bg5: straight into the hole. The bishop lands where their h-pawn can't chase it, and it pins the e7 pawn to their queen on d8. But it's a rare move, six masters in a hundred. More than half play Bd3, and the engine prefers c4. Here's the cost: the bishop has left c1, so nothing guards b2 now. Watch what their queen does with that. It's about level.", 'Bg5 — into the hole; b2 left bare.'],
  ["…Qb6, almost every master, and there it is. The queen hits b2, which nothing guards, and d4, which only your queen on d1 guards. They are a little better. So how do you deal with b2?", '…Qb6 — hits b2 and d4.'],
  ["Bd3, nearly every master, and the engine agrees: don't defend, hit back. The bishop goes straight at theirs on f5, which nothing guards. Look at the price, though. On d3 the bishop cuts your queen off from d4, so both d4 and b2 are hanging now. Saving the pawn with b3, or bringing the bishop back to c1, is about a third of a pawn worse. If they grab d4, Nf3 hits the queen and you're ahead in development, a pawn down. They are a little better.", 'Bd3 — hit the f5-bishop, offer pawns.'],
  ["…Bxd3: they trade bishops instead of grabbing a pawn. The engine prefers …Qxd4. Now their bishop on d3 hits c2, so it has to be taken back. With what?", '…Bxd3 — the trade; …Qxd4 was better.'],
  ["Qxd3, the engine's choice. The queen takes back and guards d4 again. Taking with the c-pawn instead leaves d4 bare, and their queen takes it: about a pawn worse. And b2? Still hanging. Hold that thought.", 'Qxd3 — guards d4 again.'],
  ["…e6, the engine's choice: the pawn props up d5 and opens the road for their bishop on f8. Why not …Qxb2 first? Because then your pawn goes to e6 and hits f7, with their kingside pieces still at home. It's about level.", '…e6 — solid; b2 still waits.'],
  ["Nd2, the engine's choice. Why d2 and not c3? Because your c-pawn needs to stay free: c4, hitting d5, is your break. From d2 the knight covers c4 and b3, so if they ever take on c4, it can take back.", 'Nd2 — keeps the c-pawn free for c4.'],
  ["…Ne7: the knight heads for f5, the square their bishop left, where it will hit d4. The engine prefers …c5, hitting d4 with a pawn first, the Caro's natural break. After …Ne7 you are a little better.", '…Ne7 — heading for f5.'],
  ["c4 — there's your break. Their break is …c5 against d4; yours is c4 against d5, the front of their chain. The pawn hits d5, and now they have to decide: hold it, or trade on c4. You are a little better.", 'c4 — your break, hitting d5.'],
  ["…Nf5: the knight arrives and hits d4 and h4. Count d4: their queen and knight against your queen alone. The engine prefers …Qxb2, finally taking the pawn. You are a little better.", '…Nf5 — hits d4 and h4.'],
  ["Ne2, the engine's choice: the other knight comes to guard d4, so now it's two against two. Your king is still in the middle, but with both knights out, castling is one move away.", 'Ne2 — d4 guarded twice.'],
  ["…dxc4: they trade on c4, and the pawn hits your queen. But look what it gives up: d5, the pawn that held their center. The engine prefers …Nd7, and now you are clearly better. Take back with the knight or the queen?", '…dxc4 — hits the queen, gives up d5.'],
  ["Nxc4, with the knight, and look at it: it hits the queen on b6. It also guards b2, the pawn that's been hanging since your bishop left c1, and it eyes d6, a square your e5 pawn guards too. Taking with the queen is about a pawn worse. You are clearly better. Your plan for the middlegame: when their queen checks on b4, block with Bd2, castle, and bring the other knight to c3.", 'Nxc4 — hits the queen, guards b2.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Main line (vs …Bf5)': ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h5', 'Bg5', 'Qb6', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Nd2', 'Ne7', 'c4', 'Nd7', 'Ngf3', 'Nf5', 'O-O'],
  'vs …c5 (Botvinnik-Carls)': ['e4', 'c6', 'd4', 'd5', 'e5', 'c5', 'dxc5', 'e6', 'a3', 'Bxc5', 'Nf3', 'Nc6', 'Bd3', 'Nge7', 'b4', 'Bb6', 'Bb2', 'Ng6', 'O-O', 'Nf4', 'c4', 'O-O', 'Nc3', 'Nxd3'],
  'Bd3 Bishop Trade': ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h5', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Nf3', 'Qa5+', 'Nbd2', 'Ne7', 'O-O', 'Qa6', 'Qc3', 'Nf5', 'Nb3'],
  'Qg4 vs …c5': ['e4', 'c6', 'd4', 'd5', 'e5', 'c5', 'dxc5', 'e6', 'a3', 'Bxc5', 'Qg4', 'Ne7', 'Bd3', 'O-O', 'Nf3', 'Ng6', 'O-O', 'Nc6', 'Qh5', 'Bd7', 'Nc3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Main line (vs …Bf5)': [
    ["…Nd7: this time the knight from b8 comes first, and it hits e5, the head of your chain. Right now only your d4 pawn guards it. You are a little better.", '…Nd7 — hits e5.'],
    ["Ngf3, the engine's choice: the last knight comes out and guards e5 and d4, the two pawns their pieces are aiming at. Now only castling is left.", 'Ngf3 — guards e5 and d4.'],
    ["…Nf5: the other knight arrives and hits d4 and h4. Count them: your queen and the knight on f3 guard d4, and the knight, the bishop on g5 and the rook guard h4. Everything holds.", '…Nf5 — hits d4 and h4; both hold.'],
    ["You castle, the engine's choice, and the king is safe on g1. You are a little better. Your plan for the middlegame: if their bishop comes to e7 to trade off yours, take it, then a rook to c1 behind your c4 pawn. And keep an eye on b2: their queen on b6 still hits it.", 'O-O — king safe; b2 still watched.'],
  ],
  'vs …c5 (Botvinnik-Carls)': [
    ["…c5, about two masters in ten: no bishop move, the break at once. This is the Botvinnik-Carls. The pawn hits d4, the base of your chain, and nothing guards it on c5. So do you guard d4, or take?", '…c5 — the break at once, hits d4.'],
    ["dxc5, more than six masters in ten: take it. You're a pawn up, but notice what changed. Your e5 pawn has lost its backup on d4, and nothing guards it now. The engine prefers Nf3 first, and after dxc5 it's about level.", 'dxc5 — a pawn up; e5 stands alone.'],
    ["…e6, seven masters in ten: the pawn opens the diagonal from f8, so their bishop now hits c5, which nothing guards. You can't hold the extra pawn for long. So what's the most useful thing to do with this move?", '…e6 — the f8-bishop hits c5.'],
    ["a3, more than four masters in ten: let the pawn go, but get something for it. When their bishop takes on c5, b4 will hit it, with a3 backing the pawn up. It's a plan you may know from the Advance French: a3, then b4 and space on the queenside. It's about level.", 'a3 — b4 comes next.'],
    ["…Bxc5, about three masters in four: the pawn comes back and material is level, though the engine prefers …Qc7. The bishop now hits f2, which only your king guards. You are a little better.", '…Bxc5 — material level, hits f2.'],
    ["Nf3: first things first. The e5 pawn lost its support when your d-pawn left, so the knight guards it before their pieces get there. It's about level.", 'Nf3 — guards the lonely e5.'],
    ["…Nc6: the knight hits e5, which your knight on f3 guards. The engine prefers …Ne7, on its way to g6, and after …Nc6 you are a little better.", '…Nc6 — hits e5.'],
    ["Bd3: the bishop aims at h7. But here the engine wants b4 right now. The pawn kicks the bishop off c5, and b5 next would hit the knight on c6, the piece hitting e5. After Bd3 it's only about level.", 'Bd3 — aims at h7; b4 was better.'],
    ["…Nge7: the other knight comes out, heading for g6, where it will hit e5 a second time. The engine prefers …f6, going at e5 with a pawn at once. You are a little better.", '…Nge7 — heading for g6.'],
    ["b4, the engine's choice: there's the kick. The pawn hits the bishop on c5, which nothing guards, with a3 behind it. It gains space on the queenside and clears b2 for your other bishop.", 'b4 — kicks the c5-bishop.'],
    ["…Bb6, the engine's choice: the bishop steps back but keeps its diagonal toward f2. Remember that: when you castle, the f2 pawn will stand in front of your king with this bishop aimed at it.", '…Bb6 — still aimed at f2.'],
    ["Bb2: the bishop goes to the long diagonal and adds a guard to e5. Count it: your knight and bishop guard e5, and only their knight on c6 hits it.", 'Bb2 — a second guard on e5.'],
    ["…Ng6, the engine's choice: the second knight hits e5. Two attackers, two defenders, so the pawn holds. You are a little better.", '…Ng6 — e5 hit twice, guarded twice.'],
    ["You castle, and the king is safe on g1. But notice the bishop on b6: your f2 pawn is now pinned in front of your king. You are a little better.", 'O-O — castled; f2 is pinned.'],
    ["…Nf4, the engine's choice: the knight jumps at your bishop on d3 and the g2 pawn. It wants to trade off the bishop that aims at their kingside. You are a little better.", '…Nf4 — hits the d3-bishop.'],
    ["c4, the engine's choice: don't run with the bishop, hit d5 instead. If they take on d3, the queen takes back, and meanwhile the pawn attacks their center.", 'c4 — hits d5, ignores the knight.'],
    ["…O-O, the engine's choice: their king tucks away on g8, and the tension stays: your c4 pawn against d5, their knight against your bishop.", '…O-O — their king goes short.'],
    ["Nc3: the last knight comes out and adds a second hit on d5. But the engine much prefers c5: push past, kick the bishop on b6 off its diagonal, and the pin on f2 is gone with it. After Nc3 you are a little better.", 'Nc3 — hits d5; c5 was better.'],
    ["…Nxd3: they take the bishop, and for a moment the knight on d3 hits b2, b4, e5 and f2. Only your queen can take it back. The engine prefers …f6, and after …Nxd3 you are clearly better. Your plan for the middlegame: Qxd3, and if they take on c4, the queen takes back there. Your knights head for the center, while their bishop on c8 is still hemmed in by its own pawns on b7 and e6.", '…Nxd3 — take back with the queen.'],
  ],
  'Bd3 Bishop Trade': [
    ["Bd3, more than half the masters: no bishop on g5 this time. Bd3 goes straight at their bishop on f5, which nothing guards. Why trade? That bishop is the piece …c6 was played to free, their one minor piece outside the pawn chain. And your own bishop stays home on c1, so b2 stays guarded. You are a little better.", 'Bd3 — offer the bishop trade.'],
    ["…Bxd3, nearly every master: they take. Their bishop on d3 hits c2, so take it back.", '…Bxd3 — they take on d3.'],
    ["Qxd3, every master: the queen takes back and guards d4. From d3 it also looks down the diagonal through f5, g6 and h7, the one their bishop used to stand on. You are a little better.", 'Qxd3 — guards d4, light squares open.'],
    ["…e6, the engine's choice: the pawn props up d5 and opens the road for the bishop on f8. It's an Advance French structure now, but with one difference: the light-squared bishop that is usually stuck inside their chain is already off the board. It's about level.", '…e6 — a French chain, no bad bishop.'],
    ["Nf3, the engine's choice: the knight guards e5 and d4, and it covers g5, the hole their h-pawn left behind. It's about level.", 'Nf3 — guards e5 and d4, covers g5.'],
    ["…Qa5 check, the engine's choice: the queen checks your king on e1 and hits a2, which your rook on a1 guards. So what blocks the check?", '…Qa5+ — check, and hits a2.'],
    ["Nbd2, the engine's choice: the knight blocks the check and develops at once. It's pinned to your king for a move, but castling frees it. c3 or Nc3 instead are about a third of a pawn worse. It's about level.", 'Nbd2 — block and develop.'],
    ["…Ne7: the knight heads for f5, the square their bishop used to stand on, where it will hit d4 and h4. It's about level.", '…Ne7 — heading for f5.'],
    ["You castle, the engine's choice. The king is safe on g1, and the knight on d2 is free again. You are a little better.", 'O-O — king safe, the pin is gone.'],
    ["…Qa6, the engine's choice: the queen hits your queen on d3 and offers a trade. Do you have to take? No.", '…Qa6 — offers the queen trade.'],
    ["Qc3: no trade. The queen steps aside to c3, where it hits c6 and still guards d4. The engine slightly prefers c4, hitting d5, and it's about level.", 'Qc3 — no trade, hits c6.'],
    ["…Nf5: the knight arrives and hits d4 and h4. Both hold: your queen and the knight on f3 guard d4, and the knight guards h4 too. You are a little better.", '…Nf5 — hits d4 and h4.'],
    ["Nb3, the engine's choice: the knight gives d4 a third guard and covers a5 and c5. And look what it uncovers: with d2 empty, your bishop on c1 can finally come out. It's about level. Your plan for the middlegame: Bg5, into the hole their h-pawn left, and a4 if they push …a5.", 'Nb3 — frees the c1-bishop for g5.'],
  ],
  'Qg4 vs …c5': [
    ["Qg4: go straight at the kingside. The queen hits g7, which nothing guards now that their bishop has left f8, and it hits e6 as well. The quieter b4 or Nf3 are a touch stronger, and it's about level.", 'Qg4 — hits the loose g7.'],
    ["…Ne7, the engine's choice: they leave g7 alone and develop, the knight heading for g6 or f5. It's about level.", '…Ne7 — develops, g7 left alone.'],
    ["Bd3, the engine's choice: the bishop joins the queen against their kingside, aimed at h7, which only their rook on h8 guards.", 'Bd3 — aimed at h7.'],
    ["…O-O: their king goes short, right into the line of your queen. Now g7 is pinned to their king on g8, though the king itself guards it. It's about level.", '…O-O — g7 pinned to the king.'],
    ["Nf3, the engine's choice: the knight comes out and guards e5. It will need to: their knights are coming to g6 and c6.", 'Nf3 — guards e5.'],
    ["…Ng6: the knight hits e5, and it stands between your queen and g7, so the queen no longer sees that pawn. It's about level.", '…Ng6 — hits e5, shields g7.'],
    ["You castle, and the king goes to g1. Notice the bishop on c5: your f2 pawn is now pinned in front of your king, so keep that diagonal in mind.", 'O-O — castled; f2 is pinned.'],
    ["…Nc6, the engine's choice: the second knight hits e5. Count it: two knights against your knight on f3. So what helps e5?", '…Nc6 — e5 hit twice.'],
    ["Qh5, the engine's choice: the queen hits the knight on g6, together with your bishop on d3, and from h5 it guards e5 along the fifth rank. Two against two again. It's about level.", 'Qh5 — hits g6, guards e5.'],
    ["…Bd7, the engine's choice: the last minor piece leaves c8, heading for e8, where it guards f7. It's about level.", '…Bd7 — heading for e8.'],
    ["Nc3: the last knight comes out and hits d5. The engine prefers Nbd2, and after Nc3 it's about level. Your plan for the middlegame: the knight on c3 reroutes through e2 toward f4, then b4 kicks their bishop off c5 and Bb2 lines up behind the e5 pawn.", 'Nc3 — hits d5; Nbd2 was better.'],
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

export const PRO_GOTHAMCHESS_CARO_ADVANCE_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-caro-advance-white',
  title: "This repertoire's Caro-Kann Advance — the h4 Main Line",
  orientation: 'white',
  sources: [
    'book:caro-kann',
    'concept:pos-center',
    'concept:pos-development',
    'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation',
    'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
