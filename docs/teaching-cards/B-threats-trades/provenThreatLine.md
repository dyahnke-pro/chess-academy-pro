# provenThreatLine — the proof behind "this costs you a piece"

## A. Identity
- File: `src/services/threatProof.ts` (142 lines): `threatProof(fen, student, squares)` (31–103), `provenThreatLine(line, fen, student, squares)` (105–117), `threatStakes` (119–136), `looseClaims` (138–142).
- Registry: `boardComputers.ts` `threatCost` (2763–2775, computer `provenThreatLine`, kind `threat`, seat `student`) — wraps a warning written by ANOTHER surface (the threat lane, `trapped`, 2754) with its proof; also used for the threat-answer proof (2784).
- Reach: learn door, review, chat, tapped, tactics (lesson no). Census: 4 review lines (2 said, 2 held `in-flux`): "Careful — your knight on e5 is hanging. Nothing guards it, so they can take it. Nxe5 — they win a knight."

## B. Facts
- **B1** a `Proof`: `kind` line (mate) | count (material), `exact: true`, `short`, `full`, `line {fen, sans:[capture]}`, `squares`. Words include the count ("attacked twice, guarded once") or the net ("trades their pawn for your bishop, and you come out behind even after you take back").
- **B2 dropped:** `hits` (attacker count, 44) and `named.defenders` go into words only; `cheaper` (54) is a boolean in prose; the ledger `free` (51) — its full settled exchange — is reduced to `describeProofResult`.
- **B3 cheap:** expose `{ attackers: hits, defenders, cheaperAttacker, net: named.value, mate: san | null }` as fields — every number is already computed.
- **B4 gates:** null when the flip is illegal (32); mate threat first (35–44); a named piece among `squares` with an attacker (45–46); a legal capture of it (48). No cp gate (it proves a warning someone else decided to say).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — (it is a proof, not a lesson) | — |
| CONSEQUENCE | yes | `short` / `full` ("Rxa1 — they win a rook") | — |
| BETTER MOVE + JOB | no | — | — |
| HABIT | no | — | — |

## D. Lesson recipes
This computer is the **CONSEQUENCE slot** for the threat recipes of `computeMustDefend` (MD1–MD6), `theirTarget` (TT1–TT3) and `detectNewThreat` (NT3). It carries no lesson of its own; its numbers carry two:

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PT1 | calculate (count) | S | count proof, attackers > defenders ≥ 1 | attackers, defenders | (MD2's lesson) | "It's attacked {n} times and guarded {m}: {capture} wins it." | — | — | consequence slot | a cheaper attacker (PT2 instead) | C (B3 fields) |
| PT2 | knowledge (cheaper attacker) | S | `cheaper` | attacker, target | (MD3's lesson) | "{capture} trades their {attacker} for your {target}, and taking back doesn't make it even." | — | — | consequence slot | — | H |
| PT3 | mate | S | kind line (mate) | mate san | (NT2's lesson) | "{mate} is mate." | — | — | consequence slot | — | H |

Not applicable as a standalone lesson: every angle — it proves another computer's claim. Listed once: recognize / identify / plan / strategize / phase / record belong to the computer whose warning it proves.

## E. Mistake link
- The consequence of student **allowed** `hanging_piece` (MD4/MD5), the ignored threat (MD1, TT1), the mate threat (NT2). Opponent seat: the consequence of MD6 (their loose piece) when called with their colour.

## F. Build changes
1. `threatProof` (31): return `ProofFacts = { attackers, defenders, cheaper, net, mateSan, captureSan }` beside the `Proof` (B3), so `mistakeLesson`'s CONSEQUENCE stem is filled from fields and the "nothing guards it" said-twice repair in `provenThreatLine` (108–113) — a text regex — goes away.
2. Delete the regex dedupe at 108–113 once F1 lands (the recipe decides which half to say; the proof never needs to read the sentence).
3. Keep `threatStakes` (one exchange computer for stakes and words — the rule it was built on).

## G. Proof boards
- Census: lines-2.jsonl:3116 (knight on e5, "Nxe5 — they win a knight"), lines-2.jsonl:5092 ("Rxa1 — they win a knight back": a recapture called a win "back" — the guard case where the proof sits on a trade in progress; the in-flux veto held two others: lines-0.jsonl:2389, lines-1.jsonl:5023).
- Run boards it would prove: the `computeMustDefend` MD1 board g chesscom-1012441262 ply 16 (queen f3, 2 guards, cheaper bishop — PT2 "trades their bishop for your queen").

## H. Open questions
- none.
