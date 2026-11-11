// Schliemann Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=schliemann-defence`):
// masters' percentages, the settled engine verdict for each move, the board
// after it, and what the teaching computers found there. Standard:
// docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register (§2a).
// The student plays Black. It is a gambit, so the price is said in the sheet's
// own words: after …f5 they are a little better. One story runs through every
// line: …f5 goes after the pawn on e4 and clears the f-file; the knight on c6
// is the one guard of e5 and the piece their bishop leans on; and your king
// stays in the middle longer than is comfortable (the h5–e8 diagonal, the
// e-file, the b5–e8 diagonal), which is why a piece up can still be only level.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f5', 'Nc3', 'fxe4', 'Nxe4', 'd5', 'Nxe5', 'dxe4', 'Nxc6', 'Qg5', 'Qe2', 'Nf6', 'f4', 'Qxf4', 'Ne5+', 'c6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["They open with e4, the masters' most common first move, a little under half their games. Keep your eye on that pawn: in the Schliemann, e4 is what your whole opening goes after.", "e4 — the pawn you'll go after."],
  ["…e5 — you meet them pawn for pawn. The Sicilian, …c5, is the masters' most common answer, but this is the road you need: the Schliemann grows out of the Ruy Lopez, which starts with a pawn on e5.", '…e5 — pawn for pawn in the center.'],
  ['Nf3, more than nine masters in ten, and it comes with a threat: the knight hits your pawn on e5, and nothing guards it yet. So your next move has a job to do.', 'Nf3 — develops, hits e5.'],
  ['…Nc6, the choice of more than eight masters in ten: the knight guards e5 and develops in the same move. Remember that job. This knight is the only guard your e-pawn has, and their very next move goes after it.', '…Nc6 — guards e5, develops.'],
  ["Bb5 — the Ruy Lopez, about two masters in three. The bishop goes after your knight on c6, the one guard of e5. Nothing falls yet, with pawns on b7 and d7 behind the knight. Most masters now play …a6. You won't.", 'Bb5 — the Ruy Lopez, pressure on c6.'],
  ['And here it is: …f5, the Schliemann, also called the Jänisch Gambit. About seven masters in ten play …a6 here, the main road of the Ruy Lopez. You leave it at once: your f-pawn hits their pawn on e4, and nothing guards it. What are you after? If the pawns trade on e4, the f-file opens for your rook, pointing at f2 beside their king. If they take on f5, your e-pawn runs to e4 and kicks the knight off f3. Now the honest part. Only about three master games in a hundred go this way. Your pawn on f5 has no guard either, and with f7 empty the diagonal from h5 to your king on e8 is open. After …f5 they are a little better. What you get is a fight on your terms, right away.', '…f5 — the Schliemann: strike at e4.'],
  ['Nc3, about half the masters: the knight gives e4 the guard it was missing. Three other tries, d3, d4 and taking on f5, each have their own tab. Now your pawn on f5 is the loose one. Defend it, or take first?', 'Nc3 — develops, guards e4.'],
  ["Take first. …fxe4, more than eight masters in ten and the engine's first choice. If you keep the tension with …Nf6, exf5 just takes your loose pawn. Now the f-file is clear of your pawns: a road for a rook toward f2.", '…fxe4 — trade pawns, open the f-file.'],
  ['Nxe4, and just about every master takes back this way. The material is level again, and their knight stands in the middle of the board. Now the big decision: develop with …Nf6, or hit that knight with …d5?', 'Nxe4 — level again, a central knight.'],
  ['…d5 — the sharp choice, about four masters in ten. The pawn hits their knight on e4, which has no guard. Six in ten play …Nf6, and the engine prefers …Nf6 too. Why? With d7 empty, their bishop on b5 now pins your knight on c6 to your king. And that knight was the one guard of e5.', '…d5 — kicks e4, but c6 gets pinned.'],
  ["Do they save the knight on e4? No. Nxe5, eight masters in ten and the engine's first choice. Your pawn on e5 falls, because its one guard, the knight on c6, is pinned and can't take back. They are a pawn up and clearly better. But their knight on e4 is still hanging.", "Nxe5 — takes e5; c6 can't recapture."],
  ["…dxe4 — every master takes the knight, the engine's first choice by a distance. You're up a knight for a pawn, but only for a moment: your knight on c6 is pinned and hit twice. And notice: with their knight gone from e4, g5 is open for your queen.", '…dxe4 — takes the knight, frees g5.'],
  ['Nxc6 — nearly every master. The knight takes your pinned knight and lands with a hit on your queen on d8. Can you just recapture? …bxc6 runs into Bxc6+: check, and the bishop hits your rook on a8 too. So the queen moves. But where?', 'Nxc6 — hits your queen on d8.'],
  ["Where does the queen go? …Qg5, more than eight masters in ten and the engine's first choice. Remember g5? From there the queen hits two loose things at once: the bishop on b5, along the fifth rank, and the pawn on g2. And that bishop is the only guard of their knight on c6. They are still a little better.", '…Qg5 — hits b5 and g2 at once.'],
  ["Qe2, almost every master. One move, two jobs: the queen guards the bishop on b5 and hits your pawn on e4, which has no guard. Why not f4 at once, hitting your queen? With the bishop loose you'd just answer …Qxb5. Remember f4, though.", 'Qe2 — guards b5, hits e4.'],
  ['…Nf6 — every master plays it. The knight develops and guards the pawn on e4. Why not e7? There it would stand in the way of your bishop on f8. And look at g2: still loose, with your queen pointing right at it.', '…Nf6 — develops, guards e4.'],
  ["And there's f4, about three masters in four. The pawn hits your queen on g5, and now it works, because the bishop on b5 has its guard. With f2 empty, their queen on e2 also guards g2. But nothing guards the pawn on f4.", 'f4 — hits your queen; the pawn is loose.'],
  ["Take it. …Qxf4 is the engine's first choice: the queen escapes by capturing the pawn that attacked it, and the material is level again. But keep an eye on their knight on c6. All this time it has stood between their bishop on b5 and your king.", '…Qxf4 — takes the pawn, material level.'],
  ["Ne5+ — and there's the point of that knight. It steps off c6, and the bishop behind it on b5 is suddenly checking your king on e8: a discovered check. But look at e5: nothing guards the knight there, and your queen on f4 is hitting it. It's about level.", 'Ne5+ — discovered check from the bishop.'],
  ["…c6 — the engine's first choice, and really the only good one. The pawn blocks the check and hits the bishop on b5, while your queen still hits the loose knight on e5. Why not block with …Nd7? Because the knight on f6 keeps their queen out of h5: move it, and Qh5+ picks off the rook on h8. They are a little better. Your plan: when d4 guards the knight and opens their bishop's line to your queen, step out with …Qh4+ and settle on h3, then develop with …Be6.", '…c6 — blocks the check, hits b5.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Schönemann Attack': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f5', 'd4', 'fxe4', 'Nxe5', 'Nxe5', 'dxe5', 'c6', 'Nc3', 'cxb5', 'Nxe4', 'd5', 'exd6', 'Nf6', 'O-O', 'Nxe4'],
  'Jänisch Gambit Accepted': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f5', 'exf5', 'e4', 'Qe2', 'Qe7', 'Bxc6', 'dxc6', 'Nd4', 'Nh6', 'g4', 'g6', 'Nc3', 'gxf5', 'gxf5', 'Bg7'],
  'Dyckhoff Variation': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f5', 'd3', 'fxe4', 'dxe4', 'Nf6', 'O-O', 'Bc5', 'Nc3', 'd6', 'Bg5', 'O-O', 'Nd5', 'Be6', 'Nxf6+', 'gxf6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Schönemann Attack': [
    ['d4 — the Schönemann Attack, about four master games in a hundred. A blow in the center: the d-pawn joins the knight on f3 against e5, now hit twice and guarded once. But unlike Nc3 or d3, it leaves e4 with no guard at all. Who takes first?', 'd4 — hits e5, leaves e4 loose.'],
    ["You do. …fxe4, nearly every master and the engine's first choice: you take the loose pawn and hit their knight on f3. Why not take on d4? Then their e-pawn pushes past to e5, out of your f-pawn's reach.", '…fxe4 — takes e4, hits the knight.'],
    ["Nxe5, seven masters in ten: the knight escapes by taking on e5, and the material is level again. Backed by the d4 pawn, it hits your knight on c6 a second time, next to the bishop. It's about level.", 'Nxe5 — level again, a second hit on c6.'],
    ["Trade it off. …Nxe5, more than nine masters in ten and the engine's first choice. The d4 pawn will take back. But notice: with your knight gone from c6, their bishop on b5 sees all the way to d7, and that pawn is pinned to your king.", '…Nxe5 — trade off the central knight.'],
    ["dxe5 — the pawn takes back, and the material is level. Look at the e-pawns: theirs on e5, yours on e4, each in the other's half of the board. And their queen on d1 now looks down the d-file at d7, the same pawn their bishop is pinning.", 'dxe5 — level; two pieces aim at d7.'],
    ["…c6 — the engine's first choice, and nothing else comes close. One pawn move, three jobs. It hits the bishop on b5, which has no guard. It shuts the diagonal to your king, so d7 is no longer pinned. And it prepares …d5. So where does their bishop go?", '…c6 — hits the bishop, unpins d7.'],
    ["Nc3 — nowhere. They leave the bishop where it is, and it's the engine's first choice. Why not retreat? Because after Ba4 or Bc4 you play …Qa5+, and the queen hits their king and the pawn on e5 at once. So they hit your unguarded pawn on e4 and offer you the bishop.", 'Nc3 — hits e4, offers the bishop.'],
    ["Take it. …cxb5 is the engine's first choice, and you're a piece up. So why is it only about level? Look at your back rank: every piece you have left is on its starting square. And their knight on c3 hits two unguarded pawns, e4 and b5.", '…cxb5 — takes the bishop; a piece up.'],
    ["Nxe4 — they take the pawn on e4, so you're up a bishop for a pawn. But look at this knight. It's looking at d6, where it would give check, and their pawn on e5 already guards that square. What do you do about it?", 'Nxe4 — takes e4; the knight wants d6.'],
    ['…d5 — the pawn hits their knight on e4, which has no guard. Does the knight have to run? No. Your pawn has just stepped past their pawn on e5, so that pawn can take it en passant on d6. But then their pawn leaves e5, where it was covering f6.', '…d5 — hits the knight; en passant comes.'],
    ["exd6 — en passant, the engine's first choice by a distance. You're up a bishop for two pawns. But look where their pawn landed: d6, a passed pawn two steps from queening, guarded by the knight on e4 and their queen. And …Bxd6 runs into Nxd6+, which gives the piece straight back.", 'exd6 — en passant; a passed pawn on d6.'],
    ["…Nf6 — the engine's first choice. Why couldn't the knight go here before? Their pawn on e5 would have taken it. That pawn is on d6 now, so f6 is safe, and your knight hits their knight on e4, which nothing guards.", '…Nf6 — develops, hits the knight on e4.'],
    ["They castle, and leave the knight on e4 hanging. A blunder? No. Their rook has come to f1, one step from the e-file, where your king still stands. They're betting that open lines against your king are worth more than a knight. You are a little better.", 'O-O — king safe; the knight is left hanging.'],
    ["…Nxe4 — you take it, and now you're two pieces up for two pawns. And it's about level. That's the lesson of this line: material isn't everything while your king sits in the middle. Their rook comes to e1 and pins your knight on e4 to your king, and the pawn on d6 is still there. Your plan: guard the pinned knight with …Bf5, back the bishop up with …Qc8, and meet Qh5+ with …g6.", '…Nxe4 — two pieces up, still level.'],
  ],
  'Jänisch Gambit Accepted': [
    ["exf5 — the gambit accepted. Only about one master game in a hundred goes this way, and the engine prefers d3. Why? With their pawn gone from e4, nothing stops your e-pawn from running forward. You're a pawn down, and it's already about level.", 'exf5 — accepted; your e-pawn is free.'],
    ["…e4 — almost every master, and the engine's first choice. The pawn hits the knight on f3, and where can it go? Your knight on c6 covers d4 and e5, and your queen covers g5 and h4. That leaves the long way home, to g1. Unless they find a trick.", '…e4 — kicks the knight on f3.'],
    ["Qe2 — here's the trick, a bit over half the masters and the engine's first choice. The knight stays. Their queen pins your pawn on e4 to your king on e8, so it can't take on f3, and attacks it too. The attacker has become the target.", 'Qe2 — pins your e4 pawn, hits it.'],
    ["…Qe7 — every master, and the engine's first choice. Your queen steps in front of your king and fixes both problems: the pawn on e4 has a guard, and it isn't pinned anymore. So the threat to take on f3 is alive again.", '…Qe7 — guards e4, breaks the pin.'],
    ["Bxc6 — and it's all about the knight on f3. It's attacked again, and the square it wants is d4, which your knight on c6 covers. So they take that knight off first, and you have to spend your move taking back. Which pawn takes?", 'Bxc6 — clears d4 for the knight.'],
    ["…dxc6 — the engine's first choice, ahead of taking with the b-pawn. Why the d-pawn? With d7 empty, your bishop on c8 looks straight at f5, their extra pawn, and nothing guards it. You've also kept both bishops. You're still a pawn down, and you are a little better.", '…dxc6 — opens the bishop onto f5.'],
    ['Nd4 — the knight finally moves, to the square they cleared for it, and it guards the pawn on f5 just in time. It also looks at e6, a square no pawn of yours can cover anymore. Keep e6 in mind.', 'Nd4 — guards f5, looks at e6.'],
    ["…Nh6 — a knight on the rim, and it's the engine's first choice. Why not the natural f6? Because of the job: from h6 the knight hits f5, and from f6 it wouldn't. Count that pawn now: bishop and knight attack it, and only their knight on d4 guards it.", '…Nh6 — a second attacker on f5.'],
    ["g4 — a second guard for f5, so it's two against two. But think about what this costs them. The g-pawn has left their king's side, and your knight on h6 is looking right at it, with only their queen on e2 holding it.", 'g4 — a second guard for f5.'],
    ["…g6 — the engine's first choice, and it's a pawn break: your g-pawn attacks f5, three attackers against two guards. And a second idea: with g7 empty, your bishop on f8 can come to the long diagonal and look straight at their knight on d4. You are a little better.", '…g6 — a third attacker on f5.'],
    ['Nc3 — they stop adding guards to f5 and counterattack: the knight joins their queen against your pawn on e4. Two attackers, and only your queen on e7 guards it. So if you take on f5, does e4 fall? Look at which pawn would be taking, and where it lands.', 'Nc3 — a second attacker on e4.'],
    ["…gxf5 — the engine's first choice, and one capture does two jobs. You take the gambit pawn back, so the material is level. And your pawn now stands on f5, right beside e4, guarding it: two attackers, two guards. It's about level.", '…gxf5 — pawn back, and e4 is guarded.'],
    ["gxf5 — they take back, and they're a pawn up again. But look at f5: hit twice, by your bishop and your knight, and guarded only by the knight on d4. Take it right away? …Nxf5 is playable, but it lets their queen in with check on h5. There's another way to ask.", 'gxf5 — a pawn up again; f5 hit twice.'],
    ["…Bg7 — the engine's first choice. Don't take the pawn. Go after its guard: the bishop hits the knight on d4, which nothing guards, and that knight is the only thing holding f5. If they grab e4 with either piece, …Bxd4 takes the knight. You're a pawn down, and you are a little better. Your plan: if their knight jumps into e6, trade it off with the bishop from c8, castle queenside, and bring the knight from h6 to f5.", '…Bg7 — hits d4, the guard of f5.'],
  ],
  'Dyckhoff Variation': [
    ["d3 — the quiet answer, about four masters in ten. The pawn guards e4 and opens the diagonal for their bishop on c1. They're declining the fight and asking what your f-pawn was for. It's still loose on f5, so take first again.", 'd3 — quietly guards e4.'],
    ["…fxe4 — nearly nine masters in ten, and the engine's first choice. The same idea as always: trade the f-pawn off, so the f-file belongs to your rook. They'll take your pawn on e4 back with the d-pawn.", '…fxe4 — trade, open the f-file.'],
    ['dxe4 — just about every master takes back with the pawn. Material is level, with a pawn on e4 facing a pawn on e5. The difference is beside them: you have the f-file, and they have the d-file, where their queen now looks at d7.', 'dxe4 — level; f-file against d-file.'],
    ['…Nf6 — the knight develops with a hit on their pawn on e4, and since the d-pawn has taken back, nothing guards it. Why f6 and not e7? On e7 the knight would block your bishop on f8. So how will they hold e4?', '…Nf6 — develops, hits e4.'],
    ["They don't hold it at all. They castle, the engine's first choice, and e4 still has no guard. Is the pawn free? No: after …Nxe4, Qe2 hits the knight right away, with your king still at home on e8. So leave it, and keep developing.", "O-O — e4 left alone; don't grab it."],
    ["…Bc5 — the engine's first choice. On d6 the bishop would block your d-pawn. On c5 it looks down the diagonal at f2, the pawn beside their castled king. But doesn't this leave e5 short of guards? Yes: they can take on c6, and after you recapture, Nxe5 wins a pawn. You let them. You'd castle with both bishops, a rook on the f-file and a bishop already pointing at f2. It's about level.", '…Bc5 — aims at f2, clears castling.'],
    ['Nc3 — they turn the pawn down and develop: the knight guards e4 at last, and from c3 it can jump to d5 later. Now your own e-pawn is the question. Its only guard is still the knight on c6, the piece their bishop has leaned on since Bb5.', 'Nc3 — guards e4, heads for d5.'],
    ['…d6 — now a pawn guards e5, so it no longer hangs on the knight alone. The price is the one …d5 paid in the main line: with d7 empty, their bishop on b5 pins the knight on c6 to your king. Why not …Nd4 first? Because Nxe5 just takes the pawn the knight left behind.', '…d6 — guards e5, frees the bishop.'],
    ["Bg5 — their last minor piece comes out with a pin: your knight on f6 can't move without exposing the queen on d8 behind it. Now both your knights are pinned, one to your king, the other to your queen. Which pin can you break right away?", 'Bg5 — pins the knight on f6.'],
    ["…O-O — the engine's first choice. The king leaves e8, and the pin on c6 is gone, just like that. The rook lands on f8 and adds a guard to the pinned knight on f6. And it stands on the f-file, the one your gambit pawn cleared.", '…O-O — unpins c6, rook to the f-file.'],
    ["Nd5 — the knight jumps in and piles onto the pinned piece: bishop and knight both hit f6 now. That's how to use a pin: don't take right away, add attackers. Can your knight escape by capturing on e4 or d5? No: either way it leaves your queen on d8 to their bishop. So f6 stays, held by your queen, your rook and the g7 pawn.", 'Nd5 — piles onto the pinned knight.'],
    ["…Be6 — the engine's first choice. Your last minor piece comes out with a job: it hits the knight on d5. You can't unpin f6 yet, so you challenge the piece leaning on it. If they trade on f6, you'll take back with the g-pawn. You'll see why in a moment.", '…Be6 — last piece out, hits d5.'],
    ["Nxf6+ — they cash in the pin: the knight takes on f6 with check, so you have to recapture right now. Three things can take back: the queen, the rook, or the g-pawn. Two of them step straight into the line of their bishop on g5. Which one doesn't?", 'Nxf6+ — trades knights with check.'],
    ["…gxf6 — the pawn, and it's the engine's first choice. …Qxf6 just loses the queen to Bxf6, and a rook on f6 would be pinned to your queen exactly as the knight was. The pawn takes back and hits the bishop on g5. Your king's cover is thinner, but pawns on d6 and f6 now both hold e5, and the g-file has opened toward their king on g1. They are a little better. Your plan: when the bishop goes to h6 and hits your rook, step it to f7, tuck your king on h8, put a rook on the g-file, and get ready for the …d5 break.", '…gxf6 — the pawn; hits the bishop.'],
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

export const SCHLIEMANN_DEFENCE_WATCH: WatchCourse = {
  openingId: 'schliemann-defence',
  title: 'Schliemann Defence — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-initiative', 'concept:pos-center', 'concept:tac-pin', 'concept:tac-discovered', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Schliemann_Defense'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
