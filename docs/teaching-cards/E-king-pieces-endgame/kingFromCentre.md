# Card — `kingFromCentre` (the rule of thumb: the further from the centre, the safer)

## A. Identity
- `src/services/kingWalk.ts:256` `kingFromCentre(fenBefore, san, who)`. Registry `boardComputers.ts:3341`, kind `nugget`, NOT_ENDING, `key: 'rule:king-from-centre'` (said once a game), `proof: NO_PROOF.method`. Learn (`LEARN`), lesson, review, play, chat.
- Census: 8 fired / 6 said (held beside-mate 1, same-idea 1).

## B. Facts
- **B1**: `{ key, text, squares: [m.to] }` — the rule sentence only.
- **B2 dropped**: `m.from` (d/e/f) and `m.to` (a/b/c/g/h) (:266) — the walk itself; whether the king had castling rights (not read here; `castleByHand` knows).
- **B3 cheap**: the INVERSE fact the mistake turn needs — `towardCentre`: a king move from a/b/c/g/h to d/e/f with the enemy queen on (same two lines of chess.js, mirrored); `openLinesAt(to)` — open/half-open files and diagonals through the king's new square (findOpenFiles + slider rays) = the consequence; `cornerReach` — enemy pieces that reach the corner square vs the centre square in one move (count).
- **B4 gates**: not castling (:257); king move (:263); enemy queen on (:265); from d/e/f to a/b/c/g/h (:266).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | the text IS a rule with its reason ("the centre is where the lines open first") | it fires on a GOOD move (praise), never on the mistake |
| CONSEQUENCE | partly | "the corner is harder for their pieces to reach" | specific: which lines open at the centre square |
| BETTER MOVE + JOB | no | — | errorWhy better move (a king step to the corner, or castling) |
| HABIT | no | — | record `king-stuck-center` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KC1 | KNOW (mistake: king to the centre) | S | `towardCentre`, queens on, student's king move cost | to, lines | "The further the king is from the centre, the safer it is: on {to} it stands where the lines open first." / "A king in the middle is in the way of every line that opens." | "The {file}-file and the {diag} diagonal both run through {to}." (openLinesAt) | "{best} kept the king on {from}." | "Before a king move in the middlegame, ask: is it heading for the corner or the centre?" | "Your king walked into the centre with their queen on the board." | queens off; endgame | C towardCentre |
| KC2 | KNOW (their king to centre) | O | their king move toward centre, cost | — | "Their king walked into the centre: open lines toward it." | — | — | — | after their move: "Their king walked into the centre." | — | C |
| KC3 | praise (today's fire) | S good move | gate as today | — | (EARNED_PRAISE only — no mistake → Learn silent under WO-LEARN-MISTAKES-ONLY; Review keeps the rule) | — | — | — | silent | — | H |
| KC4 | phase: endgame (the flip) | both | endgame | — | handled by `kingActivityGap`: "In the endgame the rule flips: bring the king to the centre." | | | | | NOT_ENDING gate here | — |
| KC5 | exception | — | queens off in a middlegame | — | silent (gate :265) | | | | | | |
| — | record | — | RED/GREY full · AMBER "King toward the centre — the lines open there." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `weakened-king-safety` / `king-stuck-center` (shelter gap includes `inCenter`, `positionalReason.ts:159`) on a king move → KC1.
- Opponent: KC2.
- Today's fire (KC3) is never a mistake turn: Review/chat only.

## F. Build changes
1. `kingWalk.ts:256` — add `kingTowardCentre(fenBefore, san, who)` (the mirror gate) returning `{from, to, lines}`; expose `from`/`to` on both.
2. Pure `openLinesAt(fen, sq)` (findOpenFiles + diagonal scan) for KC1's consequence.
3. Recipe KC1/KC2 → `mistakeLesson.ts` (cause `positional:king-stuck-center` with a king move). The rule sentence (:269) becomes the LESSON stem source; the Learn praise firing is removed by the mistake-only gate.

## G. Proof boards
- Today's fire: `lines-1.jsonl#1275` (a good walk to the corner — must be SILENT in Learn under the new gate; guard).
- KC1: no saved king-to-centre mistake row in the census (the computer only reads the good direction) — owed: find one in `g-*.jsonl` once KC1 exists.

## H. Open questions
- None.
