import type { SublineNarration } from '../../services/sublineLesson';

// THE NARRATION PILOT (WO-COURSE-01 E, 2026-10-27). 25 reply lines written to
// docs/SUBLINE-NARRATION.md from each line's fact sheet, then re-derived claim
// by claim by a second reader who never saw the writer's reasoning; its 14
// flags (a pinned knight credited with an attack, "slightly better" on +0.23,
// "…" on White moves, a cue on the wrong ply) are fixed here. Every arrow is
// checked on its own board when this file is built.

const ARROW = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';

export const SUBLINE_NARRATION_PILOT: Record<string, SublineNarration> = {
  "scotch-game::0::Nf6@5": {
    intro: { say: "…Nf6 — they leave your pawn on d4 alone and hit your e-pawn instead, which has no defender. Don't guard it: take on e5. The pawn captures and attacks the knight on f6 at the same time, so the knight has to move again.", sayShort: "…Nf6 — take on e5, hit the knight." },
    beats: [
      { atMove: 7, say: "…Nxe4 — the knight steps out of the attack by taking your e-pawn, so material is level again. But it stands in the centre with nothing guarding it. The engine's first choice is Qe2, hitting it along the e-file; this line develops with Bc4 instead.", highlights: [{ square: "e4", color: KEY }] },
      { atMove: 8, say: "Bc4 — the bishop aims at f7, a square only their king guards.", sayShort: "Bc4 — aim at f7.", arrows: [{ from: "c4", to: "f7", color: ARROW }], highlights: [{ square: "f7", color: KEY }] },
      { atMove: 10, say: "Castle. Your king is tucked away while theirs is still on e8, and the pawn on e5 keeps their pieces off d6 and f6. The engine rates the end a little better for you. The habit: when they attack a pawn, look first for the capture that attacks something back.", highlights: [{ square: "d6", color: KEY }, { square: "f6", color: KEY }] },
    ],
    sources: ["concept:pos-center", "concept:tac-double-attack", "https://en.wikipedia.org/wiki/Scotch_Game"],
  },
  "scotch-game::1::Nf6@5": {
    intro: { say: "…Nf6 — they leave your pawn on d4 alone and hit your e-pawn instead, which has no defender. Don't guard it: take on e5. The pawn captures and attacks the knight on f6 at the same time, so the knight has to move again.", sayShort: "…Nf6 — take on e5, hit the knight." },
    beats: [
      { atMove: 7, say: "…Nxe4 — the knight steps out of the attack by taking your e-pawn, so material is level again. But it stands in the centre with nothing guarding it. Go after it.", highlights: [{ square: "e4", color: KEY }] },
      { atMove: 8, say: "Qd5 — the queen hits the loose knight on e4 and also eyes f7. The engine's first choice was Qe2, hitting the knight along the e-file.", sayShort: "Qd5 — hit the knight, eye f7.", arrows: [{ from: "d5", to: "e4", color: ARROW }, { from: "d5", to: "f7", color: ARROW }], highlights: [{ square: "e4", color: KEY }, { square: "f7", color: KEY }] },
      { atMove: 10, say: "Bc4 — the engine's choice. The bishop lines up behind your queen on the diagonal to f7, so Qxf7 is now checkmate if they ignore it: the bishop guards the queen there and their king has no square. The engine rates the end a little better for you. The habit: when your queen hits f7, look for a second piece to back it up.", sayShort: "Bc4 — Qxf7 mate is threatened.", arrows: [{ from: "d5", to: "f7", color: ARROW }], highlights: [{ square: "f7", color: KEY }] },
    ],
    sources: ["concept:pos-center", "concept:tac-double-attack", "https://en.wikipedia.org/wiki/Scotch_Game"],
  },
  "ruy-lopez::8::bxc6@7": {
    intro: { say: "…bxc6 — they take back with the b-pawn. Look at what it leaves: doubled pawns on c6 and c7, and the pawn on a6 with no pawn beside it. It is a known mistake, and the known punishment is d4: open the centre now, while none of their minor pieces has left home. It wins no material — the edge is small but lasting.", sayShort: "…bxc6 — doubled pawns; strike with d4." },
    beats: [
      { atMove: 11, say: "…Qf6 offers to trade queens on d4." },
      { atMove: 12, say: "Keep them on: Qa4, the engine's choice, steps aside and points at the weak pawns on a6 and c6.", sayShort: "Qa4 — keep queens, eye a6, c6.", arrows: [{ from: "a4", to: "a6", color: ARROW }, { from: "a4", to: "c6", color: ARROW }], highlights: [{ square: "a6", color: KEY }, { square: "c6", color: KEY }] },
      { atMove: 18, say: "e5 — the engine's choice. The pawn gains space and takes the d6 and f6 squares away from their pieces.", highlights: [{ square: "d6", color: KEY }, { square: "f6", color: KEY }] },
      { atMove: 24, say: "Castle long, the engine's choice: the king goes to c1 and the rook lands on d1, facing the pawn on d7. The line ends with a small edge for you. The habit: when an exchange leaves their pawns doubled and split, open the centre and keep the queens on so those pawns stay targets.", arrows: [{ from: "d1", to: "d7", color: ARROW }], highlights: [{ square: "d7", color: KEY }] },
    ],
    sources: ["concept:pawn-doubled", "concept:pawn-isolated", "concept:pos-center", "https://en.wikipedia.org/wiki/Ruy_Lopez,_Exchange_Variation"],
  },
  "kings-gambit::1::Bg4@7": {
    intro: { say: "…Bg4 — they pin your knight on f3 to your queen. But the bishop does nothing for the pawn on f4: your bishop on c1 already hits it, and nothing guards it. That makes …Bg4 a known mistake. Take the pawn back with Bxf4, the engine's choice, and material is level again.", sayShort: "…Bg4 — f4 is loose; take it." },
    beats: [
      { atMove: 17, say: "…Bxf3 gives up the bishop for your knight." },
      { atMove: 18, say: "gxf3, the engine's choice, takes back toward the centre and opens the g-file for your rooks." },
      { atMove: 26, say: "Rg1 — the engine's choice. The rook takes the half-open g-file and hits the knight on g3.", arrows: [{ from: "g1", to: "g3", color: ARROW }], highlights: [{ square: "g3", color: KEY }] },
      { atMove: 33, say: "…Qa5 pins your knight on c3 to your king on d2." },
      { atMove: 34, say: "Kc1, the engine's choice, steps out of the pin, next to the rook on d1. The line ends with the engine rating you about a pawn better. The habit: when they develop a piece, check whether it still guards the pawn you are attacking.", arrows: [{ from: "a5", to: "c3", color: ARROW }], highlights: [{ square: "c3", color: KEY }] },
    ],
    sources: ["concept:tac-pin", "concept:pos-development", "https://en.wikipedia.org/wiki/King%27s_Gambit"],
  },
  "vienna-game::5::Qe7@7": {
    intro: { say: "…Qe7 — instead of moving the knight your pawn attacks, they hit back at the pawn on e5. Guard it first: Qe2, the engine's choice, defends e5 along the file, and the knight on f6 still has to move. The engine already rates you nearly two pawns better.", sayShort: "…Qe7 — guard e5 with Qe2." },
    beats: [
      { atMove: 9, say: "…Ng8 — the knight goes all the way home." },
      { atMove: 10, say: "d4, the engine's choice, takes the centre and opens your bishop on c1 toward the pawn on f4, which nothing guards.", arrows: [{ from: "c1", to: "f4", color: ARROW }], highlights: [{ square: "f4", color: KEY }] },
      { atMove: 11, say: "…Nc6 hits d4 and e5." },
      { atMove: 12, say: "Nf3, the engine's choice, guards both pawns at once.", arrows: [{ from: "f3", to: "d4", color: ARROW }, { from: "f3", to: "e5", color: ARROW }] },
      { atMove: 13, say: "…d5 — and the pawn has no defender." },
      { atMove: 14, say: "Nxd5, the engine's choice, takes it: material is level again, and the knight now hits their queen on e7 and the pawns on c7 and f4. The engine rates you more than two pawns better. The habit: when they counterattack instead of saving an attacked piece, guard what they hit first — the attacked piece still has to move.", arrows: [{ from: "d5", to: "e7", color: ARROW }, { from: "d5", to: "c7", color: ARROW }], highlights: [{ square: "e7", color: KEY }] },
    ],
    sources: ["concept:pos-tempo", "concept:pos-center", "https://en.wikipedia.org/wiki/Vienna_Game"],
  },
  "kings-gambit::1::Nf6@7": {
    intro: { say: "…Nf6 — the knight hits your pawn on e4, which has no defender. Guard it with Nc3, the engine's choice: the knight develops and defends e4 in one move.", sayShort: "…Nf6 — guard e4 with Nc3." },
    beats: [
      { atMove: 9, say: "…d5 hits e4 a second time." },
      { atMove: 10, say: "Nxd5, the engine's choice: your knight takes the pawn and now hits their knight on f6 and the pawn on f4.", arrows: [{ from: "d5", to: "f6", color: ARROW }, { from: "d5", to: "f4", color: ARROW }], highlights: [{ square: "f6", color: KEY }, { square: "f4", color: KEY }] },
      { atMove: 14, say: "Bd3 — the engine's choice. The bishop develops and clears the way to castle, and your bishop on c1 still eyes the pawn on f4, which nothing guards. The line ends a little better for you. The habit: when they attack a centre pawn early, defend it with a piece that also develops.", arrows: [{ from: "c1", to: "f4", color: ARROW }], highlights: [{ square: "f4", color: KEY }] },
    ],
    sources: ["concept:pos-development", "concept:pos-center", "https://en.wikipedia.org/wiki/King%27s_Gambit"],
  },
  "vienna-game::5::d6@9": {
    intro: { say: "…d6 — they strike at your pawn on e5 at once, and only your knight on f3 guards it. The engine's first choice is Qe2, lining up on the e-file; this line backs e5 with d4, which also opens your bishop on c1 toward f4.", sayShort: "…d6 — they hit e5; back it up." },
    beats: [
      { atMove: 11, say: "…dxe5 takes on e5." },
      { atMove: 12, say: "Qe2, the engine's choice, pins that pawn to their king on the e-file: it cannot take your pawn on d4, it has no defender, and it is attacked three times.", sayShort: "Qe2 — pin the e5 pawn.", arrows: [{ from: "e2", to: "e5", color: ARROW }], highlights: [{ square: "e5", color: KEY }, { square: "e8", color: KEY }] },
      { atMove: 14, say: "Qxe5, the engine's choice, wins the pawn back. Their bishop on e7 is now pinned to the king, and your queen also hits the pawns on f4 and g7, neither of which has a guard. The line ends a little better for you. The habit: when a pawn you want sits on the same file as their king, put your queen or rook on that file — the pin wins it.", arrows: [{ from: "e5", to: "f4", color: ARROW }, { from: "e5", to: "g7", color: ARROW }], highlights: [{ square: "e7", color: KEY }, { square: "f4", color: KEY }, { square: "g7", color: KEY }] },
    ],
    sources: ["concept:tac-pin", "concept:pos-open-file", "https://en.wikipedia.org/wiki/Vienna_Game"],
  },
  "philidor-defence::2::Bg5@8": {
    intro: { say: "Bg5 — they pin your knight on f6 to your queen on d8. The engine's choice is …h6, asking the bishop at once; this line unpins with …Be7 instead.", sayShort: "Bg5 — they pin your knight." },
    beats: [
      { atMove: 9, say: "…Be7 — the bishop steps in between, so the knight on f6 is no longer pinned to the queen, and your king is one move from castling.", highlights: [{ square: "e7", color: KEY }] },
      { atMove: 10, say: "Qd3 brings their queen out." },
      { atMove: 11, say: "Castle: your king leaves the centre. The engine's first choice here was …c5, hitting the knight on d4." },
      { atMove: 13, say: "…Re8 — the engine's choice. The rook takes the e-file behind your bishop and aims at e4 once the bishop moves. The line ends about level. The habit: when a bishop pins your knight to the queen, first ask whether …h6 can question it right away.", highlights: [{ square: "e4", color: KEY }] },
    ],
    sources: ["concept:tac-pin", "concept:pos-development", "https://en.wikipedia.org/wiki/Philidor_Defence"],
  },
  "philidor-defence::3::Bg5@8": {
    intro: { say: "Bg5 — they pin your knight on f6 to your queen on d8. The engine's choice is …h6, asking the bishop at once; this line hits back in the centre with …d5.", sayShort: "Bg5 — they pin your knight." },
    beats: [
      { atMove: 9, say: "…d5 — your pawn hits e4, which nothing guards. The knight on f6 eyes it too, but it is pinned to your queen and cannot take yet.", highlights: [{ square: "e4", color: KEY }] },
      { atMove: 11, say: "…a6 — the engine preferred …Be7, unpinning first; …a6 takes the b5 square away from their bishop on f1 and their knight on d4.", highlights: [{ square: "b5", color: KEY }] },
      { atMove: 12, say: "b3 is another quiet queenside pawn move." },
      { atMove: 13, say: "Now …dxe4 is the engine's choice, and it wins the pawn: you're a pawn up, and the engine rates you clearly better. The habit: when a pawn is loose but the engine waits, look again after each of their quiet moves.", sayShort: "…dxe4 — the loose pawn falls.", highlights: [{ square: "e4", color: KEY }] },
    ],
    sources: ["concept:tac-pin", "concept:pos-development", "https://en.wikipedia.org/wiki/Philidor_Defence"],
  },
  "two-knights-defence::0::exf6@10": {
    intro: { say: "exf6 — they take your knight instead of saving the bishop on c4, which your pawn on d5 attacks. Take the bishop: …dxc4, the engine's choice. You come out a pawn ahead, and the engine rates you about two pawns better.", sayShort: "exf6 — take the bishop: …dxc4." },
    beats: [
      { atMove: 12, say: "c3 hits your pawn on d4." },
      { atMove: 13, say: "The engine's first choice was …Qxf6, taking the pawn on f6; this line pushes on with …d3. The pawn is now passed, with no white pawn left to stop it, and the pawn on c4 and your queen guard it.", arrows: [{ from: "d8", to: "d3", color: ARROW }], highlights: [{ square: "d3", color: KEY }] },
      { atMove: 14, say: "fxg7 forks your rook on h8 and bishop on f8." },
      { atMove: 15, say: "…Bxg7, the engine's choice, removes the pawn and clears the way to castle. You stay a pawn up with a passed pawn on d3, and the engine rates you about two pawns better. The habit: when they capture instead of saving an attacked piece, take the attacked piece first, then count again.", highlights: [{ square: "d3", color: KEY }] },
    ],
    sources: ["concept:pawn-passed", "concept:tac-zwischen", "https://en.wikipedia.org/wiki/Two_Knights_Defense"],
  },
  "benoni-defence::0::Nxd5@8": {
    intro: { say: "Nxd5 — their knight takes your pawn on d5 and now hits your knight on f6. Take it: …Nxd5, the engine's choice.", sayShort: "Nxd5 — take the knight: …Nxd5." },
    beats: [
      { atMove: 10, say: "a3 — they didn't take back, so you're a whole knight up." },
      { atMove: 11, say: "Your knight on d5 was attacked by the pawn on c4 and their queen, with no guard, so …Nf6, the engine's choice, brings it back to f6, out of reach.", sayShort: "…Nf6 — keep the extra knight safe." },
      { atMove: 13, say: "…Nc6 — the engine's choice: develop the other knight. You are a full piece up, and the engine rates it about five pawns. The habit: after every trade, check whether they took back — if not, keep your extra piece safe before anything else." },
    ],
    sources: ["concept:tac-trap", "concept:pos-development", "https://en.wikipedia.org/wiki/Modern_Benoni"],
  },
  "benoni-defence::1::Nxd5@8": {
    intro: { say: "Nxd5 — their knight takes your pawn on d5 and now hits your knight on f6. Take it: …Nxd5, the engine's choice.", sayShort: "Nxd5 — take the knight: …Nxd5." },
    beats: [
      { atMove: 10, say: "a3 — they didn't take back, so you're a whole knight up." },
      { atMove: 11, say: "Your knight on d5 was attacked by the pawn on c4 and their queen, with no guard, so …Nf6, the engine's choice, brings it back to f6, out of reach.", sayShort: "…Nf6 — keep the extra knight safe." },
      { atMove: 12, say: "e4 grabs the centre." },
      { atMove: 13, say: "The engine preferred …Nc6, but …d6 has a job too: it covers e5, so their e-pawn cannot come to e5 to kick your knight off f6 without being taken. You stay a full piece up, and the engine has you winning. The habit: after every trade, check whether they took back — if not, make the extra piece safe first.", highlights: [{ square: "e5", color: KEY }] },
    ],
    sources: ["concept:tac-trap", "concept:pos-development", "https://en.wikipedia.org/wiki/Modern_Benoni"],
  },
  "italian-game::5::d5@7": {
    intro: { say: "…d5 — they strike back in the centre: the pawn hits your bishop on c4 and your pawn on e4 at once. Take it: exd5, the engine's choice.", sayShort: "…d5 — take it with exd5." },
    beats: [
      { atMove: 10, say: "Nxe5 — this line grabs the pawn on e5 at once; the engine preferred to castle first." },
      { atMove: 13, say: "…Be6 guards their knight on d5." },
      { atMove: 14, say: "Nd2, the engine's choice, guards your bishop on c4 and can head for e4. You have an extra pawn on the board, but the engine calls the end about level. The habit: when one pawn hits two of your pieces, look first to capture it.", arrows: [{ from: "d2", to: "c4", color: ARROW }], highlights: [{ square: "c4", color: KEY }] },
    ],
    sources: ["concept:pos-center", "https://en.wikipedia.org/wiki/Two_Knights_Defense"],
  },
  "italian-game::5::Nxd4@7": {
    intro: { say: "…Nxd4 — their knight grabs your d-pawn, but its only guard is the pawn on e5, and only their king guards f7. It is a known mistake, and the known punishment is Bxf7+. The engine's own first choice is the quieter Nxe5; the check is the forcing way, and it wins a pawn.", sayShort: "…Nxd4 — punish it with Bxf7+." },
    beats: [
      { atMove: 10, say: "Nxe5+ — check, and your knight has taken the pawn that guarded their knight on d4. Now your queen on d1 hits that knight, and the check leaves them no time to save it.", sayShort: "Nxe5+ — the d4 knight hangs.", arrows: [{ from: "d1", to: "d4", color: ARROW }], highlights: [{ square: "d4", color: KEY }] },
      { atMove: 12, say: "Qxd4 — the knight falls. You're a pawn up, their king can no longer castle, and the rook on h8 is boxed in behind it.", highlights: [{ square: "h8", color: KEY }] },
      { atMove: 18, say: "Na3 — the engine's choice. Their queen on d5 is pinned to the king on g8 by your queen on c4, and the knight adds a second guard to c4. The line ends with the engine rating you about a pawn better. The habit: when their knight grabs a pawn, ask what guards it — then look for a check that removes that guard.", arrows: [{ from: "a3", to: "c4", color: ARROW }], highlights: [{ square: "d5", color: KEY }, { square: "g8", color: KEY }] },
    ],
    sources: ["concept:pos-center", "concept:tac-discovered", "https://en.wikipedia.org/wiki/Italian_Game"],
  },
  "four-knights-game::1::dxc6@11": {
    intro: { say: "…dxc6 — they take back with the d-pawn, which opens the d-file: your queen on d1 now faces theirs on d8. Watch e4: their knight on f6 hits it, and its only guard, your knight on c3, is pinned to your king by the bishop on b4. Trade queens with check first: Qxd8+, the engine's choice.", sayShort: "…dxc6 — trade queens with check." },
    beats: [
      { atMove: 12, say: "Qxd8+ — their king has to take, so it can never castle." },
      { atMove: 14, say: "f3 — the engine's choice. The pawn guards e4, so the pin on your knight no longer costs you the pawn.", highlights: [{ square: "e4", color: KEY }] },
      { atMove: 16, say: "Be3 develops. The engine preferred Bd2, which also steps between and breaks the pin on c3. With queens off and their king on d8 unable to castle, the line ends a little better for you. The habit: when a pinned piece is the only guard of a pawn, give that pawn a second guard or break the pin.", highlights: [{ square: "d2", color: KEY }] },
    ],
    sources: ["concept:tac-pin", "concept:pos-king-safety", "https://en.wikipedia.org/wiki/Four_Knights_Game"],
  },
  "two-knights-defence::3::Nc3@10": {
    intro: { say: "Nc3 — they offer the knight to your pawn on d4, and it also attacks your knight on e4, which nothing guards. Take it: …dxc3, the engine's choice.", sayShort: "Nc3 — take the knight: …dxc3." },
    beats: [
      { atMove: 14, say: "Qd5+ checks your king and attacks your knight on e4 in the same move." },
      { atMove: 15, say: "…Ke8 is the engine's choice. On the board you're two pieces and a pawn up, but your king can no longer castle and the knight on e4 has no guard, so the engine rates it about level. The habit: when a gambit hands you material, count which of your pieces are loose before taking more.", highlights: [{ square: "e4", color: KEY }] },
    ],
    sources: ["concept:tac-double-attack", "concept:pos-king-safety", "https://en.wikipedia.org/wiki/Scotch_Gambit"],
  },
  "petrov-defence::2::f3@12": {
    intro: { say: "f3 — your knight on f6 was hitting e4, and its only guard was their knight on c3, pinned by your bishop on b4. Now the pawn on f3 guards e4 instead. The engine's choice is to castle; this line hits e4 again with …Qe7.", sayShort: "f3 — e4 is guarded now." },
    beats: [
      { atMove: 13, say: "…Qe7 — your queen joins the knight in hitting e4 along the e-file.", arrows: [{ from: "e7", to: "e4", color: ARROW }], highlights: [{ square: "e4", color: KEY }] },
      { atMove: 14, say: "Bd2 breaks the pin on c3." },
      { atMove: 15, say: "…Nd5, the engine's choice: the knight hits c3 a second time, together with your bishop on b4.", arrows: [{ from: "d5", to: "c3", color: ARROW }, { from: "b4", to: "c3", color: ARROW }], highlights: [{ square: "c3", color: KEY }] },
      { atMove: 17, say: "…cxd5 — the engine's choice. Now your pawn on d5 and your queen on e7 both hit e4, which only the pawn on f3 guards. The line ends about level. The habit: when a pawn is guarded only by a pinned piece, pile up on it.", arrows: [{ from: "e7", to: "e4", color: ARROW }], highlights: [{ square: "e4", color: KEY }] },
    ],
    sources: ["concept:tac-pin", "concept:pos-center", "https://en.wikipedia.org/wiki/Petrov%27s_Defence"],
  },
  "reti-opening::1::b6@13": {
    intro: { say: "…b6 — it opens b7 and a6 for their bishop on c8, which the pawn on e6 shuts in. But the pawn on c6 has lost its b7 neighbour: only the knight on b8 guards it now. Ne5, the engine's choice, hits it.", sayShort: "…b6 — jump in with Ne5." },
    beats: [
      { atMove: 14, say: "Ne5 — the knight attacks c6, and with the knight off f3 your bishop on g2 looks down the long diagonal at d5.", arrows: [{ from: "e5", to: "c6", color: ARROW }, { from: "g2", to: "d5", color: ARROW }], highlights: [{ square: "c6", color: KEY }, { square: "d5", color: KEY }] },
      { atMove: 15, say: "…Ba6 hits your pawn on c4, which their pawn on d5 also attacks, and only your knight guards it." },
      { atMove: 16, say: "cxd5, the engine's choice, removes the target.", highlights: [{ square: "c4", color: KEY }] },
      { atMove: 19, say: "…Nfd7 challenges your knight on e5." },
      { atMove: 20, say: "The engine's choice was the retreat Nd3, keeping things about level; this line plays Nxf7 instead — the knight takes a pawn and hits their queen on d8, and your bishop on f4 now hits the knight on b8. It does not quite pay: the engine rates the end a little better for them. The habit: before a sacrifice on f7, compare it with the quiet retreat — here the retreat kept the game level.", arrows: [{ from: "f7", to: "d8", color: ARROW }, { from: "f4", to: "b8", color: ARROW }], highlights: [{ square: "f7", color: KEY }] },
    ],
    sources: ["concept:pos-outpost", "concept:tac-sacrifice", "https://en.wikipedia.org/wiki/R%C3%A9ti_Opening"],
  },
  "four-knights-game::3::Nb8@11": {
    intro: { say: "…Nb8 — their knight runs all the way home. You're a knight down for a pawn, but every move they spend retreating is a move for you: the engine now rates you about half a pawn better. Push on with e5, the engine's choice, hitting the other knight.", sayShort: "…Nb8 — push e5, hit the knight." },
    beats: [
      { atMove: 13, say: "…Qe7 hits your pawn on e5." },
      { atMove: 14, say: "Qe2, the engine's choice, guards it along the file, and the knight on f6 still has to move.", arrows: [{ from: "e2", to: "e5", color: ARROW }], highlights: [{ square: "e5", color: KEY }, { square: "f6", color: KEY }] },
      { atMove: 15, say: "…Ng8 — the second knight goes home too." },
      { atMove: 16, say: "Nb5 heads for c7, which nothing guards: Nxc7+ would hit their king and the rook on a8 together. The engine preferred Bf4, developing first. Even a knight down for a pawn, the line ends about half a pawn better for you. The habit: in a gambit, count tempi — every retreat they make is a free move for your pawns.", sayShort: "Nb5 — eyeing the fork on c7.", arrows: [{ from: "b5", to: "c7", color: ARROW }], highlights: [{ square: "c7", color: KEY }] },
    ],
    sources: ["concept:pos-tempo", "concept:tac-fork", "https://en.wikipedia.org/wiki/Halloween_Gambit"],
  },
  "petrov-defence::2::Bd2@10": {
    intro: { say: "Bd2 — they break the pin on c3, but the bishop now stands between their queen and the knight on d4. Nothing guards that knight any more: take it, …Nxd4, the engine's choice. The engine rates you nearly three pawns better.", sayShort: "Bd2 — d4 is loose: …Nxd4." },
    beats: [
      { atMove: 12, say: "e5 hits your knight on f6." },
      { atMove: 13, say: "…Ng8, the engine's choice, steps back home, and you keep the extra piece." },
      { atMove: 14, say: "Qg4 hits two things at once: your knight on d4 and the pawn on g7." },
      { atMove: 17, say: "After the trade on c3, …Ne6, the engine's choice, saves the knight and guards g7.", arrows: [{ from: "e6", to: "g7", color: ARROW }], highlights: [{ square: "g7", color: KEY }] },
      { atMove: 23, say: "…h5 — the engine's choice. You are a knight up, and the engine rates you about three pawns better. The habit: when a piece steps in front of a defender, check what just lost its guard." },
    ],
    sources: ["concept:tac-pin", "concept:tac-overloaded", "https://en.wikipedia.org/wiki/Petrov%27s_Defence"],
  },
  "evans-gambit::1::Qf6@15": {
    intro: { say: "…Qf6 — their queen guards f7, where your queen on b3 and bishop on c4 line up, and adds a guard to the pawn on c3. But a queen out this early can be chased: it is a known mistake, and the known punishment is Bg5, developing with an attack on it. The engine's own first choice is e5, hitting the queen with a pawn. Either way the edge is small.", sayShort: "…Qf6 — chase the queen with Bg5." },
    beats: [
      { atMove: 22, say: "e5 — the engine's choice. The pawn hits their knight on f6, so it has to move again.", highlights: [{ square: "f6", color: KEY }] },
      { atMove: 32, say: "Nh4 — the engine's choice. The knight forks their queen on g6 and their bishop on f5, and your bishop on e7 still hits the rook on f8.", sayShort: "Nh4 — fork queen and bishop.", arrows: [{ from: "h4", to: "g6", color: ARROW }, { from: "h4", to: "f5", color: ARROW }, { from: "e7", to: "f8", color: ARROW }], highlights: [{ square: "g6", color: KEY }, { square: "f5", color: KEY }, { square: "f8", color: KEY }] },
      { atMove: 34, say: "Bxf8 — the engine's choice, and the rook falls. The line ends with you up the exchange for two pawns, and the engine rates you a little better. The habit: when their queen comes out early to defend, look for a developing move that attacks it." },
    ],
    sources: ["concept:pos-development", "concept:pos-tempo", "concept:tac-fork", "https://en.wikipedia.org/wiki/Evans_Gambit"],
  },
  "dutch-defence::1::b3@10": {
    intro: { say: "b3 — it opens a road for their dark-squared bishop to a3, where it would face your bishop on d6 and offer to trade it. The engine's choice is to castle now.", sayShort: "b3 — they eye a3; castle." },
    beats: [
      { atMove: 12, say: "c4 hits your pawn on d5." },
      { atMove: 13, say: "The engine's choice here was …Ne4, putting your knight on the square your pawns on d5 and f5 guard; …a5 starts a pawn march on the queenside instead.", arrows: [{ from: "f6", to: "e4", color: ARROW }], highlights: [{ square: "e4", color: KEY }] },
      { atMove: 14, say: "Ne5 takes the same kind of post for them, guarded by the pawn on d4." },
      { atMove: 15, say: "…a4 hits the pawn on b3, but the engine preferred …c5, striking at d4, and the line ends clearly better for them. The habit: when your pawns on d5 and f5 guard e4, that square is your knight's home — use it before pushing side pawns.", highlights: [{ square: "e4", color: KEY }, { square: "e5", color: KEY }] },
    ],
    sources: ["concept:pos-outpost", "concept:pos-weak-squares", "https://en.wikipedia.org/wiki/Dutch_Defence"],
  },
  "schliemann-defence::1::Ng1@10": {
    intro: { say: "Ng1 — your pawn on e4 was hitting their knight, and it goes all the way back home. That costs them time: …Nd4, the engine's choice, hits their queen on e2, the bishop on b5 and the pawn on c2 at once.", sayShort: "Ng1 — jump in with …Nd4." },
    beats: [
      { atMove: 12, say: "Qc4 hits your knight on d4 and the pawn on c7." },
      { atMove: 13, say: "…Qe5, the engine's choice, guards both, and now your queen hits the bishop on b5 and the pawn on f5.", arrows: [{ from: "e5", to: "b5", color: ARROW }, { from: "e5", to: "f5", color: ARROW }], highlights: [{ square: "d4", color: KEY }, { square: "c7", color: KEY }] },
      { atMove: 14, say: "Qc3 hits your knight again." },
      { atMove: 15, say: "…Bb4, the engine's choice, attacks their queen, and if their queen takes the bishop, …Nxc2+ forks their king and queen. The engine rates you more than two and a half pawns better. The habit: when their piece retreats to its home square, look for a move that attacks two things at once.", sayShort: "…Bb4 — hit the queen.", arrows: [{ from: "b4", to: "c3", color: ARROW }], highlights: [{ square: "c2", color: KEY }] },
    ],
    sources: ["concept:tac-fork", "concept:pos-tempo", "https://en.wikipedia.org/wiki/Ruy_Lopez"],
  },
  "sicilian-dragon::1::g4@24": {
    intro: { say: "g4 — they offer a pawn to break open the cover in front of your king: it attacks your pawn on h5. Take it: …hxg4, the engine's choice.", sayShort: "g4 — take the pawn: …hxg4." },
    beats: [
      { atMove: 26, say: "h5 pushes on toward your king." },
      { atMove: 27, say: "…Nxh5, the engine's choice, takes that pawn too: you're two pawns up. Their rook on h1 now looks straight at your knight, which the pawn on g6 guards.", arrows: [{ from: "h1", to: "h5", color: ARROW }], highlights: [{ square: "h5", color: KEY }] },
      { atMove: 28, say: "Bh6 attacks your bishop on g7." },
      { atMove: 29, say: "…Kh7, the engine's choice: now your king and your bishop on g7 both hit their bishop on h6, which only their queen guards. You stay two pawns up, and the engine rates it about half a pawn your way. The habit: when they throw pawns at your castle, take the free ones and count the attackers on every square near your king.", arrows: [{ from: "g7", to: "h6", color: ARROW }], highlights: [{ square: "h6", color: KEY }] },
    ],
    sources: ["concept:att-kingside-storm", "concept:pos-king-safety", "https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation"],
  },
  "trompowsky-attack::6::d6@9": {
    intro: { say: "…d6 — they prop up the pawn on c5 and cover e5, so your e-pawn cannot easily come to e5. The engine's choice now is e4, taking the centre; this line first spends a move on a3.", sayShort: "…d6 — props up c5, covers e5." },
    beats: [
      { atMove: 11, say: "…c4 pushes the pawn deep into your half." },
      { atMove: 12, say: "e4, the engine's choice: the centre is yours, and with the e-pawn off e2 your bishop on f1 sees the pawn on c4, which nothing guards.", arrows: [{ from: "f1", to: "c4", color: ARROW }], highlights: [{ square: "c4", color: KEY }] },
      { atMove: 13, say: "…Qb6 hits your pawn on b2." },
      { atMove: 14, say: "The engine doesn't defend it: Nd2, its choice, attacks c4 a second time and guards e4. The line ends with the engine rating you about a pawn and a half better. The habit: when they push a pawn far up the board, count its defenders.", sayShort: "Nd2 — hit c4 a second time.", arrows: [{ from: "d2", to: "c4", color: ARROW }, { from: "f1", to: "c4", color: ARROW }], highlights: [{ square: "c4", color: KEY }] },
    ],
    sources: ["concept:pos-center", "concept:pos-space", "https://en.wikipedia.org/wiki/Trompowsky_Attack"],
  },
};
