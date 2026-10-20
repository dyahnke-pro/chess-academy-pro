# Golden speedrun — Naroditsky, Master Class: Three Knights Game

Video: [DO28z1MTaC8](https://www.youtube.com/watch?v=DO28z1MTaC8) — "Master Class | Three Knights Game | Chess Speedrun | Grandmaster Naroditsky". He plays Black. Written 2026-10-20T16:00:23.671Z.

**Source.** The per-move coverage comes from this video's distilled notes in the voiced corpus (`data/video-narration-voiced/DO28z1MTaC8.json`, each ply tagged with its video time). The yt-dlp transcript pull was refused today (bot check, then HTTP 429), so word counts are the distilled notes' length — his spoken commentary runs longer. Every item below is our wording; no sentence of his is copied.

**Engine.** Every position checked with chess.js and Stockfish 16 (d18; d22 on the disputed moves). Four of his twelve moves are not the engine's first choice — he plays for practical chances. Where the engine disagrees it is marked; an honest verdict from the app there is not counted against it.

**The game:** `e4 e5 Nf3 Nf6 Nc3 Bc5 Bc4 d6 O-O Bg4 d3 Nc6 Be3 Bb6 h3 Bh5 Kh2 O-O Qd2 Bxf3 gxf3 Nh5 Rg1 Qf6 Rg4 Qxf3 Rag1`

**Scored per student move:** each MUST COVER idea (some sentence in that window says it — checks in `golden-speedrun.json`), plus the app's own MUST NOTs (no next-move leak, no repeat, no stat, no false piece-on-square). "Turn" = from the student's move to their next move; "after reply" = after the opponent's answer.

| # | his move (time) | what he covers | their reply (time) | what he covers | ~words |
|---|---|---|---|---|---|
| 1 | 2...Nf6 (0:38) | Nf6 hits e4 straight away — the Petrov setup, chosen to steer toward a sharp, offbeat line. | 3.Nc3 (0:40) | Nc3 guards e4 and declines the sharp lines: the Three Knights. | 40 |
| 2 | 3...Bc5 (1:29) | Bc5: active development that leaves e5 to be taken — he invites them to grab it (a gambit in spirit). | 4.Bc4 (1:31) | Bc4: they develop toward f7 instead of taking; e5 is still loose (Nxe5 and Nxf7 is in the air). | 32 |
| 3 | 4...d6 (2:01) | d6 defends e5. He weighs Nc6 (into a Four Knights) against d6 and says it hardly matters. | 5.O-O (2:05) | O-O: they castle. He asks how to make their development awkward. | 60 |
| 4 | 5...Bg4 (2:37) | Bg4 pins the f3 knight to the queen now, before h3 can stop it — timing. | 6.d3 (2:41) | d3: quiet; he says nothing about it. | 38 |
| 5 | 6...Nc6 (2:43) | Nc6 develops and threatens …Nd4: a second attacker on the pinned f3 knight (passing costs White about 1.3 pawns, d16). | 7.Be3 (2:46) | Be3 covers d4, so …Nd4 can be met by Bxd4 keeping their pawns; it also offers to trade on c5. He weighs …Nd4 and keeps the tension instead. | 57 |
| 6 | 7...Bb6 (3:30) | Bb6 keeps the bishop so Bxc5 dxc5 cannot spoil his pawns; if Bxb6 axb6 the doubled pawns do not matter and the a-file opens. | 8.h3 (3:44) | h3 asks the bishop on g4 to decide (the pawn attacks it). | 58 |
| 7 | 8...Bh5 (3:49) | Bh5 keeps the pin. If they push g4 there is a piece sacrifice on g4 to consider — but it is not automatic. | 9.Kh2 (4:06) | Kh2: an odd move; he reads it as preparing Rg1 and g4 — play on the g-file. | 60 |
| 8 | 9...O-O (4:31) | O-O: just castle; nothing wild is needed. | 10.Qd2 (4:38) | Qd2: their idea is …Bxf3 gxf3 with the king on h2 off the g-file and Rg1 down the open file. Engine: a slip (about 1.1, d22) — it lets you damage their kingside pawns. | 63 |
| 9 | 10...Bxf3 (5:12) | Bxf3: give the bishop to wreck their kingside pawns — the damage is permanent and worth it if you watch the g-file. | 11.gxf3 (5:18) | gxf3: their pawns are broken for good, but the g-file opens; his plan: kingside play (…Nh5) plus prophylaxis. | 69 |
| 10 | 11...Nh5 (6:02) | Nh5: stake a claim on the kingside so they cannot run you over (the knight eyes f4). | 12.Rg1 (6:08) | Rg1: the rook on the open g-file pins g7 and aims at your king (a real threat: passing costs about 3 pawns, d16). His decision: the reflex Kh8 or activate the queen — f6 or h4, and only one makes a threat. | 66 |
| 11 | 12...Qf6 (6:56) | Qf6: the queen goes where it does something — it hits f3; on h4 it would do nothing without a light-squared bishop to attack h3. | 13.Rg4 (6:59) | Rg4: they ignore the attack on f3 and go for the g-file (doubling against g7 next). | 43 |
| 12 | 13...Qxf3 (7:21) | Qxf3: having put the queen on f6, take the pawn — be consistent. | 14.Rag1 (7:25) | Rag1: they double on the g-file; the threats on g7 are now serious and must be met at once (he plays Kh8 next). | 75 |

## Checkable items per move

### 2...Nf6 → 3.Nc3
- MUST COVER (turn): Nf6 attacks the e4 pawn
  - same sentence: `e4` + one of `(?:attack|attacks|attacked|attacking|hits?|hitting|pressure|pressures|threat|threatens?|threatening|eyes?|eyeing|aims?|aiming|targets?|goes after|go after|bears? down on|bearing down on|x-ray)`
  - controls — pass: “Your knight on f6 attacks the pawn on e4.” “The knight hits e4 right away.” · fail: “Their pawn on e4 is defended by the knight on c3.” “They push e4 to claim the centre.”
- MUST COVER (turn): names the opening: Petrov / Three Knights
  - same sentence: one of 4 relation words
  - controls — pass: “It's the Three Knights Game.” · fail: “Three knights are out.”
- MUST COVER (after reply): their Nc3 guards e4
  - same sentence: `e4` + one of `(?:guard|guards|guarded|guarding|defend|defends|defended|defending|protect|protects|protected|support|supports|cover|covers|covering|holds?|backs? up)`
  - controls — pass: “Their knight on c3 guards e4.” “Nc3 defends the pawn on e4.” · fail: “Your knight attacks e4.” “e4 is loose for a moment.”

### 3...Bc5 → 4.Bc4
- MUST COVER (turn): e5 is left to be taken (Nxe5 is possible)
  - same sentence: `e5` + one of `(?:loose|undefended|unguarded|unprotected|hangs?|hanging|en prise|can be taken|free|grab|grabs|snatch|take it|takes it|take that pawn|for the taking|nothing (?:defends|guards|protects)|isn't (?:defended|guarded|protected)|not (?:defended|guarded|protected))` / `(?:knight|they) (?:can )?takes? (?:on )?e5` / `gambit`
  - controls — pass: “The bishop to c5 leaves your pawn on e5 unguarded.” “Your pawn on e5 is loose now.” “Their knight can take on e5.” “Nothing defends e5, so they can grab it.” · fail: “Your pawn on e5 holds the centre.” “d6 defends e5.”
- MUST COVER (after reply): their Bc4 aims at f7 / e5 still hangs
  - same sentence: `f7` + one of `(?:attack|attacks|attacked|attacking|hits?|hitting|pressure|pressures|threat|threatens?|threatening|eyes?|eyeing|aims?|aiming|targets?|goes after|go after|bears? down on|bearing down on|x-ray)` **or** `e5` + one of `(?:loose|undefended|unguarded|unprotected|hangs?|hanging|en prise|can be taken|free|grab|grabs|snatch|take it|takes it|take that pawn|for the taking|nothing (?:defends|guards|protects)|isn't (?:defended|guarded|protected)|not (?:defended|guarded|protected))` / `takes? (?:on )?e5`
  - controls — pass: “Their bishop on c4 aims at f7.” “Your pawn on e5 still hangs.” · fail: “Your king guards f7.” “Your pawn on e5 is solid.”
- ⚠️ d22: Bc5 costs about 1 pawn (Nxe5 is White's best, +0.96; Nc6 was level). He plays it on purpose for the trick. An honest "it costs" here is not counted against the app.

### 4...d6 → 5.O-O
- MUST COVER (turn): d6 defends the e5 pawn
  - same sentence: `e5` + one of `(?:guard|guards|guarded|guarding|defend|defends|defended|defending|protect|protects|protected|support|supports|cover|covers|covering|holds?|backs? up)`
  - controls — pass: “d6 defends the pawn on e5.” “Your pawn on d6 guards e5.” · fail: “Their knight attacks e5.” “Your pawn on e5 is loose.”

### 5...Bg4 → 6.d3
- MUST COVER (turn): Bg4 pins the knight on f3 (to the queen)
  - same sentence: `pin(?:s|ned|ning)?` + one of `f3` / `knight`
  - controls — pass: “Your bishop on g4 pins their knight on f3 to the queen.” · fail: “Your bishop on g4 attacks the knight on f3.” “There is a pin on the e-file.”
- MUST COVER (turn): before h3 takes the square away *(soft — reported, not decisive)*
  - same sentence: `h3` + one of 7 relation words
  - controls — pass: “Pin it now, before h3 stops it.” · fail: “Their pawn on h3 is weak.”

### 6...Nc6 → 7.Be3
- MUST COVER (turn): the threat …Nd4 on the pinned f3 knight
  - same sentence: `d4` + one of 9 relation words **or** `pinned` + one of `f3` / `knight`
  - controls — pass: “Your knight can jump to d4, a second hit on the pinned knight.” “The pinned knight on f3 is under more pressure now.” · fail: “The knight bears down on d4, holding back their d-pawn.” “Their pawn guards d4.” “Their knight on d4 is strong.”
- MUST COVER (after reply): their Be3 covers d4 / challenges your c5 bishop
  - same sentence: `d4` + one of 4 relation words **or** `c5` + one of 6 relation words
  - controls — pass: “Their bishop on e3 covers d4.” “Their bishop on e3 challenges your bishop on c5.” · fail: “Your bishop on c5 is active.” “You could play to d4 later.”

### 7...Bb6 → 8.h3
- MUST COVER (turn): Bb6 avoids the trade on c5 that spoils the pawns / axb6 opens the a-file
  - same sentence: `c5` + one of 7 relation words **or** `a-file` + one of `open` **or** `doubled` + one of 5 relation words **or** `(?:pawn )?structure` + one of 6 relation words
  - controls — pass: “Bb6 keeps the bishop so a trade on c5 cannot spoil your pawns.” “If they take, axb6 opens the a-file.” · fail: “It's level, so make chances: one move here creates an imbalance — doubled pawns for them — and the quiet move keeps it level.” “The bishop bears down on c5, keeping their bishop off it, d4, holding back their d-pawn, and e3, attacking their bishop there.” “Your bishop was on c5.” “The a-file is closed.”
- MUST COVER (after reply): their h3 attacks your bishop on g4
  - same sentence: `g4` + one of 9 relation words **or** `your bishop` + one of 6 relation words
  - controls — pass: “Their h3 attacks your bishop on g4.” “h3 asks your bishop on g4 to decide.” · fail: “Your bishop on g4 pins the knight.” “g4 is a good square.”
- ⚠️ d22: …Nd4 was better by 0.6. Under the verdict bar; not counted either way.

### 8...Bh5 → 9.Kh2
- MUST COVER (turn): Bh5 keeps the pin on f3
  - same sentence: `pin(?:s|ned|ning)?` + one of 6 relation words
  - controls — pass: “Bh5 keeps the pin on the knight on f3.” · fail: “Your bishop retreats to h5.” “The knight on f3 is strong.”
- MUST COVER (after reply): their Kh2 prepares g4 / the rook to g1 (the g-file)
  - same sentence: `g-file` + one of 8 relation words **or** `g4` + one of 7 relation words **or** `g1` + one of `rook`
  - controls — pass: “Their king on h2 prepares the push g4.” “They want the rook on g1 and the g-file.” · fail: “Their king steps to h2.” “Your bishop was on g4.”

### 9...O-O → 10.Qd2
- MUST COVER (turn): castling: the king is safe
  - same sentence: `castl` + one of 5 relation words **or** `your king` + one of `safe` / `shelter` / `tucked`
  - controls — pass: “Castling gets your king safe.” “Your king is safe on g8.” · fail: “They castled.” “Your king is in the centre.”
- MUST COVER (after reply): their Qd2 idea: recapture on f3 with the g-pawn and use the g-file
  - same sentence: `g-file` + one of 8 relation words **or** `f3` + one of 9 relation words **or** `(?:kingside pawns|pawn structure|structure)` + one of 7 relation words
  - controls — pass: “After a trade on f3 they take back with the g-pawn and use the g-file.” “Their queen move lets you damage their kingside pawns.” · fail: “Their knight on f3 is pinned.” “The g-file is closed.”

### 10...Bxf3 → 11.gxf3
- MUST COVER (turn): Bxf3 damages their kingside pawn structure for good
  - same sentence: `(?:doubled|structure|damage\w*|wreck\w*|ruin\w*|spoil\w*|broken|permanent\w*|weaken\w*)` + one of 8 relation words
  - controls — pass: “Taking on f3 leaves them with doubled pawns.” “That damages their kingside pawns for good.” · fail: “Then three things: where is their weakness, which of your pieces is worst, where is your pawn break?” “You take on f3.” “Their knight on f3 was pinned.”
- MUST COVER (after reply): their gxf3 opens the g-file toward your king
  - same sentence: `g-file` + one of 9 relation words
  - controls — pass: “That opens the g-file toward your king.” · fail: “The g-file is closed.”

### 11...Nh5 → 12.Rg1
- MUST COVER (turn): Nh5 starts kingside play (eyes f4)
  - same sentence: `kingside` + one of 9 relation words **or** `f4` + one of 8 relation words
  - controls — pass: “Nh5 starts your kingside play.” “The knight on h5 eyes f4.” · fail: “Their kingside is weak.” “Their bishop covers f4.”
- MUST COVER (after reply): their Rg1 aims down the g-file at g7 / your king
  - same sentence: `g-file` + one of 7 relation words **or** `g7` + one of `(?:attack|attacks|attacked|attacking|hits?|hitting|pressure|pressures|threat|threatens?|threatening|eyes?|eyeing|aims?|aiming|targets?|goes after|go after|bears? down on|bearing down on|x-ray)` / `pin` / `pinned`
  - controls — pass: “Their rook on g1 aims down the g-file at your king.” “Their rook pins your pawn on g7.” · fail: “Your pawn on g7 guards f6.” “The g-file is closed for now.”
- MUST COVER (after reply): a real decision point: slow down / weigh the options (engine: Kh8 best by 1.5)
  - same sentence: one of 8 relation words
  - controls — pass: “Slow down — this is a critical moment.” · fail: “They think the rook belongs on g1.”

### 12...Qf6 → 13.Rg4
- MUST COVER (turn): Qf6 hits the f3 pawn
  - same sentence: `f3` + one of 5 relation words
  - controls — pass: “Your queen on f6 hits the pawn on f3.” · fail: “Their pawn on f3 guards e4.” “Your bishop took on f3.”
- MUST COVER (after reply): their Rg4 leaves f3 / heads for g7 on the g-file
  - same sentence: `f3` + one of 12 relation words **or** `g-file` + one of 6 relation words **or** `g7` + one of `(?:attack|attacks|attacked|attacking|hits?|hitting|pressure|pressures|threat|threatens?|threatening|eyes?|eyeing|aims?|aiming|targets?|goes after|go after|bears? down on|bearing down on|x-ray)` / `doubl` / `pile`
  - controls — pass: “Their rook on g4 leaves f3 to be taken.” “They double on the g-file against g7.” · fail: “Their pawn on f3 is defended.” “Their rook is on g4.”
- ⚠️ d22: Kh8 was better by 1.5 — Qf6 is an engine mistake he plays on purpose. An honest verdict here is not counted against the app; praise as "the best move" would be false.

### 13...Qxf3 → 14.Rag1
- MUST COVER (turn): Qxf3 wins the f3 pawn
  - same sentence: `f3` + one of 9 relation words
  - controls — pass: “Your queen takes the pawn on f3.” “You win the pawn on f3.” · fail: “Your queen on f3 is active.” “Their pawn on f3 is weak.”
- MUST COVER (after reply): their Rag1 doubles: the threat on g7 / your king
  - same sentence: `g7` + one of 6 relation words **or** `g-file` + one of 7 relation words
  - controls — pass: “Their two rooks form a battery on the file, bearing down on your pawn on g7.” “Both their rooks now hit g7.” “They double rooks on the g-file against your king.” · fail: “Your pawn on g7 is solid.” “The g-file is quiet.”
- ⚠️ d22: Kh8 first was better by 1.2. An honest verdict is not counted against the app.

## Where I am unsure

- **Naming his own options.** He names the moves he is considering (…Bc5 at move 3, …Nd4 at move 6, …Bxf3 before he plays it). The app's locked rule (C2) holds the student's move until asked, so the app is checked for the IDEA (e5 loose, the pinned f3 knight, the damaged kingside pawns), not the move, and a leak of the move actually played next counts against it.
- **The four engine disagreements** (3…Bc5 ~1.0, 7…Bb6 ~0.6, 12…Qf6 ~1.5, 13…Qxf3 ~1.2 pawns at d22): he teaches practical spice, not engine moves. The app may say these cost something; that is not scored as "something he wouldn't say".
- **Word counts** are the distilled notes, not his live speech (the transcript pull was blocked).
- The `soft` timing item at 5…Bg4 (before h3) is reported but I would not fail the app on it alone.
