# Naroditsky video grounding for the anti-openings (David 2026-07-07)

**David's directive:** "I want to get as close to teaching this video as possible
without breaking the law." + "Try to find Naroditsky YouTube videos of each
opening to help with the narrations and sublines."

## The legal line (CLAUDE.md plagiarism guard, David 2026-07-02)
Chess LINES and IDEAS are public-domain — you cannot copyright "…d5 answers the
King's Gambit" or a move sequence. His SENTENCES are his. So:
- **DO** teach his recommended lines + the ideas he teaches at each move.
- **DO** pull the transcript (yt-dlp, works here) to learn WHICH ideas he
  teaches where — reference only, kept in gitignored `data/sources/naroditsky-
  voice/transcripts/`, never committed, never quoted.
- **NEVER** copy his wording. All narration is ORIGINAL prose ("translation,
  not invention"). Zero verbatim lifting.

## Pipeline (proven working)
```
yt-dlp --write-auto-sub --skip-download --sub-format vtt --sub-langs en \
  -o "data/sources/naroditsky-voice/transcripts/<slug>.%(ext)s" "<url>"
```
Then parse the VTT (strip timestamps/tags, dedupe), extract his recommended
line + per-move ideas, verify the line is engine-sound (build-sound-spine /
_engine-eval), and author ORIGINAL narration teaching his line + ideas.

## Per-opening video map (found; pull + integrate per the pipeline)
| opening | Naroditsky video | status |
|---|---|---|
| anti-kings-gambit-black | "Crushing the King's Gambit \| GM Naro's Opening Lab" (zEytN1zSTEE) | ✅ pulled + lesson calibrated |
| anti-alapin-black | "Dominate With the Alapin Sicilian" (G_V3C8LQ_ik) / "Sicilian-Alapin Theory Speedrun" (ktoa6lk6qNk) / "Exploiting Common Mistakes: Alapin, Advance French" (0LxFKZyaD-I) | to pull |
| anti-french-advance | "Exploiting Common Mistakes: Alapin, Advance French" (0LxFKZyaD-I) | to pull |
| anti-caro-fantasy | "Master Class \| Caro–Kann \| Chess Speedrun" (4GIsh7cTsHc) — Caro coverage | to pull (Fantasy is a White anti-Caro; his Caro video is Black's side — cross-ref ideas only) |
| anti-smith-morra-black | "Tactical Paths to 2000 \| Smith-Morra, Nimzo, Alapin, London" (vtY88mBc088) | to pull |
| anti-nimzo-qc2 | same (vtY88mBc088 — Nimzo) | to pull |
| anti-london-black | same (vtY88mBc088 — London) | to pull + REBUILD (current seed −1.65, unsound) |
| anti-scandinavian | "DYI Speedrun - Alapin, Scandi, Najdorf" (rgLTiUZAWQY) | to pull |
| (others) | search his channel @DanielNaroditskyGM | to find |

Channel: https://www.youtube.com/@DanielNaroditskyGM/videos

## KG findings (first integration — the template)
Video: "Crushing the King's Gambit". Naroditsky's key points (paraphrased,
NOT quoted):
- The KG is NOT refuted — with best play White gets only a small pull; the goal
  is clean neutralisation, not "busting". → **calibrated my lesson's overclaim**
  ("Refuting… winning chances" → "Meeting… easy, pleasant game, not busted").
- His recommendation vs 3.Nf3: the **…d5 Modern** — undermine the centre,
  develop fast (…Nc6, …Be6), exploit White's weak e/f pawns, the bishop eyes d5.
  My engine line was already the …d5 Modern — narration refined to his ideas.
- He rejects 3…g5 (clinging to the pawn) as "playing into White's hands"; notes
  3…Nf6 (Schallopp) as a solid alt.

## Rollout (continuation — quality over speed, per "no garbage")
For each opening with a video: pull transcript → extract his line + ideas →
engine-verify his line is sound → rebuild the Watch lesson (main + variations)
+ sublines to teach HIS repertoire in original prose → gate → ship. This is the
new standard for the whole anti-opening set (and matches the house Naroditsky
voice already locked for the repertoire).

## Transcripts pulled (available for the rollout, gitignored)
- `kings-gambit.en.vtt` — Opening Lab (mainline; KG lesson calibrated ✅)
- `alapin-advfrench.en.vtt` — covers anti-alapin-black + anti-french-advance
- `smithmorra-nimzo-london.en.vtt` — covers anti-smith-morra-black, anti-nimzo-qc2, anti-london-black

The Alapin/Advance-French and Smith-Morra/Nimzo/London videos are EXPLOITATION-
focused speedruns (common mistakes / tactical paths) — ideal source for the GEMS
and sublines layer (how the side punishes a common blunder). Use Opening-Lab
videos (like the KG one) for clean mainline Watch narration; mine the speedruns
for the punishing lines. Next session: extract each recommended line, engine-
verify sound, rebuild the Watch (main + variations) + gems in original prose.
