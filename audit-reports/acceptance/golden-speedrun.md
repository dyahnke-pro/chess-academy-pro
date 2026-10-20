# Golden speedrun — Naroditsky, Master Class: Three Knights Game

Video: [DO28z1MTaC8](https://www.youtube.com/watch?v=DO28z1MTaC8) — "Master Class | Three Knights Game | Chess Speedrun | Grandmaster Naroditsky". He plays Black. Written 2026-10-20T15:36:51.286Z.

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
- MUST COVER (turn): Nf6 attacks the e4 pawn — any of: `e4`
- MUST COVER (turn): names the opening: Petrov / Three Knights — any of: `Three Knights`, `Petrov`, `Petroff`, `Russian`
- MUST COVER (after reply): their Nc3 guards e4 — any of: `[e4]`, `guard`, `defend`, `protect`, `cover`, `support`

### 3...Bc5 → 4.Bc4
- MUST COVER (turn): e5 is left to be taken (Nxe5 is possible) — any of: `e5`
- MUST COVER (after reply): their Bc4 aims at f7 / e5 still hangs — any of: `f7`, `e5`
- ⚠️ d22: Bc5 costs about 1 pawn (Nxe5 is White's best, +0.96; Nc6 was level). He plays it on purpose for the trick. An honest "it costs" here is not counted against the app.

### 4...d6 → 5.O-O
- MUST COVER (turn): d6 defends the e5 pawn — any of: `[e5]`, `defend`, `guard`, `protect`, `support`, `hold`, `back`

### 5...Bg4 → 6.d3
- MUST COVER (turn): Bg4 pins the knight on f3 (to the queen) — any of: `pin`
- MUST COVER (turn): before h3 takes the square away *(soft — reported, not decisive)* — any of: `h3`, `before`, `while you can`

### 6...Nc6 → 7.Be3
- MUST COVER (turn): the threat …Nd4 on the pinned f3 knight — any of: `d4`, `pinned`
- MUST COVER (after reply): their Be3 covers d4 / challenges your c5 bishop — any of: `d4`, `c5`

### 7...Bb6 → 8.h3
- MUST COVER (turn): Bb6 avoids the trade on c5 that spoils the pawns / axb6 opens the a-file — any of: `c5`, `a-file`, `doubled`, `structure`
- MUST COVER (after reply): their h3 attacks your bishop on g4 — any of: `g4`, `your bishop`
- ⚠️ d22: …Nd4 was better by 0.6. Under the verdict bar; not counted either way.

### 8...Bh5 → 9.Kh2
- MUST COVER (turn): Bh5 keeps the pin on f3 — any of: `pin`, `f3`
- MUST COVER (after reply): their Kh2 prepares g4 / the rook to g1 (the g-file) — any of: `g-file`, `g4`, `g1`

### 9...O-O → 10.Qd2
- MUST COVER (turn): castling: the king is safe — any of: `castl`, `your king`
- MUST COVER (after reply): their Qd2 idea: recapture on f3 with the g-pawn and use the g-file — any of: `g-file`, `f3`, `kingside pawns`, `structure`

### 10...Bxf3 → 11.gxf3
- MUST COVER (turn): Bxf3 damages their kingside pawn structure for good — any of: `doubled`, `structure`, `weak`, `permanent`, `broken`, `damage`, `wreck`, `kingside pawns`
- MUST COVER (after reply): their gxf3 opens the g-file toward your king — any of: `g-file`

### 11...Nh5 → 12.Rg1
- MUST COVER (turn): Nh5 starts kingside play (eyes f4) — any of: `kingside`, `f4`
- MUST COVER (after reply): their Rg1 aims down the g-file at g7 / your king — any of: `g-file`, `g7`
- MUST COVER (after reply): a real decision point: slow down / weigh the options (engine: Kh8 best by 1.5) — any of: `slow down`, `critical`, `decision`, `only move`, `take your time`, `think`

### 12...Qf6 → 13.Rg4
- MUST COVER (turn): Qf6 hits the f3 pawn — any of: `f3`
- MUST COVER (after reply): their Rg4 leaves f3 / heads for g7 on the g-file — any of: `f3`, `g-file`, `g7`, `doubl`
- ⚠️ d22: Kh8 was better by 1.5 — Qf6 is an engine mistake he plays on purpose. An honest verdict here is not counted against the app; praise as "the best move" would be false.

### 13...Qxf3 → 14.Rag1
- MUST COVER (turn): Qxf3 wins the f3 pawn — any of: `f3`, `pawn`
- MUST COVER (after reply): their Rag1 doubles: the threat on g7 / your king — any of: `g7`, `g-file`, `doubl`
- ⚠️ d22: Kh8 first was better by 1.2. An honest verdict is not counted against the app.

## Where I am unsure

- **Naming his own options.** He names the moves he is considering (…Bc5 at move 3, …Nd4 at move 6, …Bxf3 before he plays it). The app's locked rule (C2) holds the student's move until asked, so the app is checked for the IDEA (e5 loose, the pinned f3 knight, the damaged kingside pawns), not the move, and a leak of the move actually played next counts against it.
- **The four engine disagreements** (3…Bc5 ~1.0, 7…Bb6 ~0.6, 12…Qf6 ~1.5, 13…Qxf3 ~1.2 pawns at d22): he teaches practical spice, not engine moves. The app may say these cost something; that is not scored as "something he wouldn't say".
- **Word counts** are the distilled notes, not his live speech (the transcript pull was blocked).
- The `soft` timing item at 5…Bg4 (before h3) is reported but I would not fail the app on it alone.
