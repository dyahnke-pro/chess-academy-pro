# The Engine-Fused Narration Standard — LOCKED (David 2026-08-26)

**The system that narrates a real game in the house teaching voice, grounded in
board-computer truth.** Built to narrate the sparse Naroditsky videos, and —
locked well — to narrate **other players' games in his teaching style**. The app
depends on it, so it is held to one rule above all: **it never says anything the
board doesn't support.**

> One-line model: **real game (video-align spine) + thin/absent video note +
> DNA voice + Stockfish-computed per-move truth → honest, move-by-move teaching
> in the house register.** The moves are real (chess.js-legal); the facts are
> computed (Stockfish + chess.js + the openings DB); the agent only phrases them.
> Nothing is invented, and nothing is dressed up (G0/G3).

Read `docs/DNA-outline.md` (the voice) and `docs/voiced-narration-pipeline.md`
(where the files go) first — this doc adds the **engine-grounding + honesty**
layer on top of them.

---

## 1. The three inputs (and what each is allowed to contribute)

| Input | Supplies | May NOT supply |
|---|---|---|
| **The video** (`data/video-narration/<id>.json` bank: `ply,t,fen,line,said`) | the real move spine; the human teaching ideas (read `said` for comprehension) | shipped words — `said` is verbatim, plagiarism-guarded, **never copied** |
| **The DNA outline** | the register — concept-first, present-tense watch voice, no "you", no praise, one clipped spark, teach-both | chess facts |
| **The board computer** (`scripts/voiced-authoring/fuse-engine.mjs`) | per-ply truth: eval (mover POV), engine best move + PV, cpLoss, move label, critical-swing flag, forcing/material read, opening name | voice |

The narration is the **fusion**: the video's idea, carried in the DNA voice, with
the engine's concrete *why* — and, where the video is silent (the sparse case),
the engine + the opening DB carry the beat alone.

## 2. The board-computer packet (run this first, every time)

```bash
SF_DEPTH=18 node scripts/voiced-authoring/fuse-engine.mjs <id>          # readable
SF_DEPTH=18 node scripts/voiced-authoring/fuse-engine.mjs <id> --json   # audit-reports/engine-packets/<id>.json
```
Per forward ply it emits, board-true: `opening` (longest DB prefix), `mover`,
`san`, `capture/check`, `evalAfter` (mover POV), `best` SAN, `pv` (played out),
`cpLoss`, `label` (`book|best|good|inaccuracy|mistake|blunder`), `critical`
(|swing| ≥ 1.0), `forcingLine`/`pvWinsMaterial` (the tactic, played out), and the
raw `said` (comprehension only). OCR/rewind artifacts (illegal from the running
position) are skipped and counted, never crashed on.

**Every board claim a narration makes must trace to a packet field, the video
note, or chess.js — never to memory.** The engine cannot play chess wrong for
us; we can. That is the whole point of the grounding.

## 3. The five honesty rules (what makes it a GOOD standard)

These are what stop the system from manufacturing a fake masterclass out of a
messy game — the failure that would break trust when it runs on other players.

1. **Never contradict the engine.** A move the packet labels `mistake`/`blunder`
   is narrated AS one ("this looks tempting, but the eval swings a pawn — the
   machine wanted X"), or the beat stays quiet. **Never praise a move the engine
   condemns.** A `best`/`good` move may be affirmed; a bad one may not.
2. **Teach both lines** (locked 2026-07-19). The move played + the engine's
   preferred, stated honestly ("dangerous at human speed; the engine prefers X").
   The `best`/`pv` fields are exactly this.
3. **Honest coverage — match the register to the material, empty > generic >
   invented** (David's cardinal rule). A clean instructive game earns rich
   move-by-move teaching. A blitz/bullet time-scramble of mutual blunders does
   NOT — narrate its real teachable moments (the opening, the genuine turning
   point the packet's `critical` flags) truthfully and stay quiet on the noise.
   Do not fabricate a lesson where the game is a scramble.
4. **Board-truth is absolute** (the DNA gate). Only name a piece on a square the
   `fen` really has it on; a destination/plan ("the knight heads for f5") is
   fine. The forcing-line tactic is described by playing the `pv` out, not by
   asserting a pin/fork the packet didn't find.
5. **Depersonalized, no verbatim, no move-numbers, no interface talk** (DNA
   rules ride in full). The register is a STYLE — it applies to any player's game
   without naming the player, channel, or that it's a demo.
6. **The calculator GROUNDS, it does not dictate — read which flags are truly
   one-sided** (locked 2026-08-26, Kramnik ply 45). The `PositionFacts` threat
   probe (`docs/plans/2026-08-26-position-facts-calculator.md`) is a null-move
   heuristic: "if you passed, the opponent wins X." When the flagged piece sits
   in a MUTUAL attack the mover can resolve by capturing first (two queens eyeing
   each other, mover to move), it is a **trade tension, not a one-sided hanging
   piece** — narrating "your queen is hanging, you must save it" OVERSTATES it.
   The hand-author reads the board and keeps the accurate framing ("ducking the
   trade"), never the heuristic's naive one. This is the same discipline as
   "don't overstate the why" — the engine facts are the raw material, judgment
   about which are one-sided is the author's job. (Kramnik ply 34, by contrast,
   IS a true one-sided must-recapture — the bishop on g7 takes the f8-rook next
   if it's left — so "no choice" is honest there.)

## 4. Register by material (the triage the engine drives)

Read the packet's shape before writing a word:

- **Clean instructive game** (few big swings, one side outplays the other on
  sound moves) → the full house treatment: name the opening early, the *why* on
  most plies, structural beats (anchor → plan → target), the tactic played out
  when the packet flags a forcing line. This is the Four Knights / masterclass
  register.
- **Sharp but sound** (a real gambit/sac the engine confirms) → play the line
  out, name the compensation honestly, mark the critical moment.
- **Messy scramble** (many `critical` blunders both sides, `skipped` beats high)
  → honest, sparser commentary: the opening, the real turning points, "both sides
  are throwing punches here" — never a fabricated clean lesson. Some sparse
  videos are mostly this; that is fine, and honesty is the deliverable.
- **Not a teachable game at all** (pure banter/odds handicap with no instructive
  arc) → narrate only what is real and minimal; flag it, do not invent.

## 5. Author + gate (same chokepoint + gates as the DNA corpus)

1. Recover the bank, run the packet (§2), read it against `inspect.mjs <id>`.
2. Author per-ply `spoken` in the DNA voice through the `build()` chokepoint
   (`scripts/voiced-authoring/lib.mjs`) so `{ply,t,fen,line}` copy from the bank.
   Add `voice: "danya-dna"` — the register is identical whatever the source.
3. Gate before commit:
   - `node scripts/voiced-authoring/verify-shard.mjs <ids>` — **board-truth 0 /
     fidelity 0 / missing 0** (the hard gate).
   - **Engine-honesty eyeball**: re-read each `spoken` beside its packet row — no
     beat praises a move the packet labels `mistake`/`blunder`; every board fact
     matches a field. (Keep the `--json` packet in the PR as the evidence trail.)
4. Rebuild the derived files (`build-voiced-{walkthroughs,matchups,teachings}.mjs`)
   and commit the voiced sources + derived JSON together (pipeline §2–4).

## 6. Why this generalizes to other players

Nothing above mentions Naroditsky. The move spine comes from any video's
align-bank; the voice is a depersonalized STYLE; the truth comes from Stockfish +
chess.js + the openings DB, which know nothing about who is playing. Point the
same three-input fusion at a Carlsen or a club game and it produces the same
honest, house-voice teaching — because the grounding, not the source, is what the
narration rests on. That is the standard the app depends on.
