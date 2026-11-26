# Card — `matingNet` / `queenlessMate` / `everyMate` / `mateLine` / `detectForcedMatingSequence` (mate)

## A. Identity
- `src/services/matingNet.ts:113` `matingNet(fen, student)` (+ `netAround` :55). Registry `boardComputers.ts:7810`, kind `king-read`, `skill: missed-your-mate | missed-their-mate`.
- `src/services/queenlessMate.ts:21` `queenlessMate(fen, student)`. Registry `:7789`, kind `method`, `namesStudentMove` when the mate is the student's.
- `src/services/everyMate.ts:22` `everyMate(fenBefore, san)` + `everyMateLine` (:46). Registry `:7149`, kind `two-jobs` (census).
- `src/services/lineCalc.ts:176` `mateLine(fen, lineUci, side, firstSan?)`. Registry `:4800` (`mateLine`, kind `point`): fires only when the student PLAYED the engine's move (:4805) and its line mates. Also `moveThreat.ts:88`, `decisiveReason.ts:436` build mate lines for their own sentences.
- `src/services/reviewForcedSequence.ts:34` `detectForcedMatingSequence(sans, evalsAfter)` — the game's final checking run (Review, kind `forced`).
- Census: matingNet 25/14; queenlessMate 13/5; everyMate 2/2; mateLine 7/7 (Review); detectForcedMatingSequence 1/1.

## B. Facts
- **B1**: `MatingNet` (:21) `side`, `king`, `flights[]`, `cover[]` (piece → squares, each named once), `mate` (SAN), `mateFrom/To`, `text`, `squares`. `QueenlessMate` `side`, `mate`, `text`, `squares`. `EveryMate` `played`, `others[]`. `MateLine` `sans`, `plies`, `quiet`, `taken` (flight squares the quiet first move takes), `text`. `ForcedMatingRun` `startPly`, `length`.
- **B2 dropped**: matingNet — `lifted` board's reason a flight is covered "through the king's square" (:63-70) not marked; whether the net is the student's MOVE (made) vs the null-move threat (`mateThreatsAgainst`, :72) is not distinguished in the output; all mates (`mates[]`) but `mates[0]` dropped. queenlessMate — own mate vs threatened mate path (:30 vs :44) is not a field. mateLine — `first.check/capture` (:192) in prose only. detectForcedMatingSequence — the proof kind per ply (mate eval vs only reply, :80-81) dropped.
- **B3 cheap**: `escapeMove` for the DEFENDER: a legal move that gives the king a flight / removes the mate (play each legal move, re-run `mateThreatsAgainst`) — the better move and its job ("h3 gave the king h2"); `allowedBy`: compare `netAround(fenBefore)` null vs `netAround(fenAfter)` — the student's move that built the net against themselves; `missedMate`: on a student's costly move, `c.moves().find('#')` on fenBefore (mate in one missed) — chess.js only.
- **B4 gates**: matingNet — game not over, every flight own-occupied or covered (:63-70), a mate in one exists for the attacker now or by null move (:72-73). queenlessMate — no queens at all (:24), a mate in one for either side (:27/:42). everyMate — the played move mates (:33) and another distinct move mates (:38-41). mateLine registry — played == best (:4805), line ends in mate by side, ≥3 plies (:208). detectForced — game ends in mate (:42), run ≥3 plies proven (:86).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | queenlessMate is a real habit-lesson ("Run the checkmate check every move, queens or not"); matingNet's close ("Find your king a square before anything else"); everyMate ("When one mate is there, check for another") | matingNet's lead is a board census of covers |
| CONSEQUENCE | yes | "They threaten Rg3, checkmate" (their mate named) | — |
| BETTER MOVE + JOB | no | — | `escapeMove` (B3) |
| HABIT | partly | the habit is in the text (queenlessMate, everyMate) | record `missed-your-mate` / `missed-their-mate` exists (`skill`) — tie it to RED/GREY |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | CONSEQ (allowed mate) | S defender | costReason allowed, mate:true, matingNet for student's king after the move | king, mate | "A king with no square is one check from mate: on {king} every flight is covered, and {mate} ends it." / "Luft is the cheapest defence: give the king a square before the net closes." | "{mate} is checkmate." | "{escape} gave your king {sq}." (once past) | "Every move, ask: if they check me, where does my king go?" | "That let them mate: {mate}." (their move named) | net existed before (`allowedBy` false → it's a missed-defence, M2) | H + C allowedBy, escapeMove |
| M2 | PREV (missed their mate threat) | S defender | net/threat on fenBefore, student's move didn't stop it | — | "When they threaten mate, nothing else matters: find your king a square first." | "{mate} follows." | "{escape}" | M1 | "They had mate ready, and your move didn't stop it." | — | H |
| M3 | RECOG (missed mate) | S attacker | `missedMate` on fenBefore (chess.js mate in one) or costReason missed mate:true | — | "Checks first: a mate in one beats every other move on the board." / "Their king had no square — that's the moment to look for mate." | "It was mate on the spot." | "{mate} was mate." (once past) | "Before any move, look at every check you have." | "Their king had no square — that was the moment for mate." (said only when `pastBetterNameable` is true; while the mate is still on the board it is the student's next move → silent) | mate still playable (pointer) | C |
| M4 | KNOW (queenless) | both | queens off + mate (queenlessMate) on a mistake | — | "The queens being off doesn't make the king safe: rooks and minor pieces mate too." | as M1/M3 | as M1/M3 | "Run the checkmate check every move, queens or not." | "No queens, and still a mate." | — | H |
| M5 | CALC (quiet mate) | S attacker missed | mateLine on bestSan, `quiet` | taken | "The strongest move isn't always a check: a quiet move that takes the king's last square sets up mate." | — | "{quiet move} took {taken} from their king." | "When their king has one square, look for the quiet move that takes it." | "A quiet move that took the king's last square set up mate there." (same naming guard as M3) | mate line still playable | C (run mateLine on bestSan) |
| M6 | KNOW (more mates) | S | everyMate on the student's mate | — | Review only: "When one mate is there, look for the others." (a mate is never a mistake) | | | | silent in Learn | | H |
| M7 | evaluate (forced run) | both | detectForcedMatingSequence | — | Review only: "From here every move was a check, and the king never had a safe square." | | | | | | H |
| M8 | both seats habit | O | opponent missed the student's net (their mistake) | — | silent in Learn unless the student is then mated (M1) | | | | | | |
| — | phase | — | M4 covers endgames | | | | | | | | |
| — | record | — | `skill` missed-your-mate / missed-their-mate: RED/GREY full · AMBER "That allowed mate." · GREEN silent | | | | | | | | |

## E. Mistake link
- `costReason` `allowed` + `mate:true` (seat you) → M1 (net built by the move) / M2 (net existed); `missed` + `mate:true` → M3/M5; queens off → M4 as the lesson stem. `whyItFailed` none (mate outranks it).
- M6/M7 Review only (no mistake).

## F. Build changes
1. `matingNet.ts:21` — add `made: 'on-move' | 'threat'` and `mates: string[]`; add pure `escapeMove(fen, defender)` returning the moves that leave no mate-in-one.
2. `queenlessMate.ts:9` — add `kind: 'own' | 'threat'`.
3. Registry `:4800` — keep the played==best read for Review; add a mistake read: `mateLine(fenBefore, bestLineUci, me)` when played ≠ best and the line mates (M3/M5), `namesStudentMove` held until past.
4. Recipes M1–M5 → `mistakeLesson.ts` under `allowed+mate`, `missed+mate`, `missed+mate:quiet`. matingNet's cover census (:132-147) is removed from Learn's turn.

## G. Proof boards
- M1/M4 shape (student's king): `lines-2.jsonl#3430` "No queens, and still a mate threat against you: Re1."
- M3 (net on their king): `lines-0.jsonl#346` "Their king on g8 has no square to go to. Your bishop covers g7 and h8."; `lines-0.jsonl#4301` (king b3).
- M5: `lines-0.jsonl#4324` "No check yet — the quiet Rc7 comes first: it takes c4 from their king, and Rc3 is mate."
- M6: `lines-0.jsonl#4357` (Qc3 and Qg8, Rc3, Rh3). M7: `lines-1.jsonl#6481`.
- Guard: `lines-0.jsonl#335` held `beside-mate` (a mate already said).

## H. Open questions
- M3 in Learn: "There was a mate there." — say it even when the student's move still won (cost under the mistake bar because the position stayed won)?
