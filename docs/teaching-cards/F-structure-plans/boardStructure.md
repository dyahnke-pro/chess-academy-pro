# Card — `boardStructure` (family F)

### A. Identity
- `boardStructure(fen, student)` — `src/services/structureReads.ts:167-178`: a COMPOSITE of seven standing reads, each a `StructureRead` with a required proof:
  - `keyPawn` (`pawnJudgement.ts:112-138`) — their pawn P is the only pawn guard of Q, and Q falls without P (proven by removing P and counting);
  - `secondWeakness` (`pawnJudgement.ts:82-107`, from move 12) — a weak pawn held in balance + a second weak pawn ≥3 files away;
  - `maskedWeakness` (`squareJudgement.ts:209-250`) — their weak squares hidden behind a covering piece a pawn push can chase;
  - `restriction` (`squareJudgement.ts:41-70`) — your pawns wall their bishop's long diagonal;
  - `pieceBlocksOwnPawn` (`squareJudgement.ts:125-160`) — their piece in front of its own pawn, so no pawn can back up a square you hit;
  - `fileEntryCovered` (`squareJudgement.ts:282-310`) — let them open a file: every entry square is covered;
  - `mirroredAsymmetry` (`pawnJudgement.ts:383-425`) — your pawn can still guard m, theirs never can guard m2: a hole for them.
- Adapter `registry:structureBoard` (`boardComputers.ts:~3255-3265`), kind `judgement` (lesson/review) / `structure-plan` (chat). Census: 393 / 341 said.

### B. Facts
- **B1** `StructureRead[]` {act, text, squares, proof, key, heldForm?} — `STRUCTURE_ROLE` marks every act 'teach' (`structureJudgementKit.ts`).
- **B2 dropped**: keyPawn — the attackers on Q (`qAttackers`, :121) are in the proof only; secondWeakness — `pressureCount` (attackers/defenders of p1, :89) in the proof only; maskedWeakness — the push SAN (named in text, held in Learn); restriction — the wall square only.
- **B3 cheap**: the DIFF across the student's move — a read that APPEARS for the opponent (`boardStructure(fenAfter, them)`) = the student's move gave them a key pawn / a hole / a masked weakness; and a student read that DISAPPEARS = the student's move threw away an asset (e.g. moved the pawn that kept the hole).
- **B4 gates**: per read (keyPawn: P attacked, Q's only pawn guard P, Q safe now and lost without P; secondWeakness: move ≥ 12, p1 balanced and not one attacker short, p2 ≥3 files away and aimable; mirroredAsymmetry …).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | each act's text carries the rule ("if f7 drops, g6 goes with it"; "two weaknesses far apart are too many to hold") | — |
| CONSEQUENCE | yes | — | — |
| BETTER MOVE + JOB | no | — | the move (engine best) that uses/keeps it |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BS1 | key pawn — S missed it | S | keyPawn read on fenBefore (S to move), best move attacks P, S's move didn't, cost ≥ inaccuracy | P, Q | "Find the pawn that holds the others: their f7 guards g6, and if f7 drops, g6 goes with it." | | best (past) | "Look for the one pawn that holds their structure together." | after | | H |
| BS2 | key pawn — S created one for them | S | B3: keyPawn appears for O after S's move | | "Your pawn on f2 is now the only guard of g3 — lose it and g3 goes too." | | best | | after | | C |
| BS3 | second weakness | S | secondWeakness fires; S kept hitting p1 (cost ≥ inaccuracy) | p1, p2 | "Don't rush a pawn that holds: make a second weakness on the other wing — their pieces can't guard both." | | best (the lever on p2) | "When one weakness holds, look for a second." | after | | H |
| BS4 | mirrored hole | S | mirroredAsymmetry for O after S's move (S's pawn move gave them the asymmetry) | | "A pawn can never move back: your c-pawn left, so c4 is a hole you can't guard again." | | best | "Before a pawn move, ask which square it stops guarding." | after | | C |
| BS5 | restriction / blocked pawn / file entry / masked | either | standing | | (existing texts) | | | | Review/chat | | H |
| BS6 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- BS1/BS3: `no-plan` / `missed-weak-target`. BS2/BS4: `created-pawn-weakness` / `outpost-conceded`. Seat S; O versions in Review.

### F. Build changes
1. New `boardStructureDiff(fenBefore, fenAfter, student)` — reads appearing for the opponent / disappearing for the student (B3); the mistake trigger for BS2/BS4.
2. Type `qAttackers` (keyPawn) and `pressureCount` (secondWeakness) on the read.
3. Learn: the standing reads leave Learn's before-move path; recipes BS1–BS4 after the move.

### G. Proof boards
- **Ran** on David's board after 9.Bxf6 Bxf6: `[]` (no standing structure judgement — the move's lesson is the colour complex, findColorComplexWeakness card).
- `vc-_X7t6o3o6JM-18` keyPawn "Their f7 pawn is the key pawn: it guards g6…"; `vc-_X7t6o3o6JM-22` pieceBlocksOwnPawn; `vc--4hTQEnwa7s-17` restriction; `vc--9fPYlSEkJ0-20` / `vc--rqPeGKVPbA-11` mirroredAsymmetry.

### H. Open questions
- none.
