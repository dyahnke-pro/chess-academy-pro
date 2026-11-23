# CARD — `allowedClause` (what the move let them do)

## A. Identity
`src/services/costReason.ts:341` `allowedClause(r: CostReason, studentWB)` → string; renderer `renderAllowedClause` (`teachingSentence.ts:394`). Registry entry **`moveAllows`** (`boardComputers.ts:6168`): calls `costReason` itself (`:6173`) with `after: {source: 'deep'}` and `against`, then this renderer. Census 65/63 (lesson only), kind `consequence`.

## B. Facts
- **B1** "lets you play …Nxf3+, winning a queen for a knight" / "walks into mate: you play Rxf3#" / untrusted: "lets you play fxe6" (first move only, when it is x/+/#).
- **B2 dropped:** the whole `CostReason` is in hand — `motif`, `blowPlies`, `ledger`, `netForWinner`, `mate`, `trust` — only the words survive; `won` text.
- **B3** — **this is a SECOND door to the same cause**: `errorWhy` (`inaccuracyCall.ts:1287` `allowedReason`) reads the same `costReason` 'allowed' for the same move, with `source: 'record'` instead of `'deep'`. Two producers of "what the move allowed" (census: 63 Learn lines "It lets you play …" beside errorWhy's Review "It let you play …"). Untrusted lines say a bare move with no why ("It lets you play hxg6." — 4 of 10 census samples) — a named move without a reason.
- **B4 gates:** `costCp ≥ 100` (costReason), `kind === 'allowed'` only (`:342`), untrusted → only x/+/# first move (`teachingSentence.ts:396`), trusted non-mate needs `won`.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | motif (dropped) | — |
| CONSEQUENCE | yes | the clause | bare untrusted move has none |
| BETTER MOVE + JOB | no | — | (errorWhy's) |
| HABIT | no | — | — |

## D. Lesson recipes
All lessons are errorWhy's E10/E11 (`allowed-tactic` per motif, `allowed-capture`, `allowed-mate`) — this computer is a renderer of that cause, not a second source. One row of its own:

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AC1 | consequence | S/O | untrusted line, first move only | | — | silent (a named move with no why is not a consequence) | | | silent | `!trust.name` → nothing | H |

## E. Mistake link
Identical to errorWhy `allowed-*` both seats.

## F. Build changes
1. Delete the `moveAllows` registry entry (`boardComputers.ts:6168-6185`) as a speaking lane; Learn reads the allowed reason from `errorWhy.cause` (one door, the "Unity!" rule, `inaccuracyCall.ts:1080`). If the `'deep'` source matters, pass the deep read into errorWhy's `secondReads`/lines instead.
2. `renderAllowedClause :396` — the untrusted bare-move branch returns null (AC1).

## G. Proof boards
- Census: "It lets you play …Nxf3+, winning a queen for a knight." (`boards-1.jsonl:2225`, vc-1Rejj6niwvo-19); bare: "It lets you play fxe6." (`boards-3.jsonl:1049`), "It lets you play hxg6." (`lines-1.jsonl:3584`).
- errorWhy's twin on Review: "Their e5 was a blunder … It let you play Bb6, which lands on the b6 outpost" (`lines-1.jsonl:207`).

## H. Open questions
None (the merge is a root-cause cleanup, the behaviour is unchanged).
