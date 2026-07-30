# Chessbrah (Aman Hambleton) — voice / teaching corpus

Farmed 2026-07-30. What lives here, and what you may do with it.

## Layout

| Path | Committed? | What it is |
|---|---|---|
| `transcripts/` | NO (gitignored) | 207 raw auto-caption pulls, ~1.06M words |
| `digests/` | NO (gitignored) | auto-ranked teaching windows per series |
| `per-opening/*.md` | YES | hand-curated idea notes — the durable artifact |
| `chessbrah-teaching-principles.md` | YES | the cross-opening "habits" ladder |

## Regenerate

```bash
node scripts/pro-repertoire/fetch-youtube-transcripts.mjs chessbrah --channel @chessbrah --throttle 3000 \
  --include "Learn Chess by BUILDING HABITS|BUILDING HABITS for BULLET|How to WIN with the QUEEN.S GAMBIT|Colle Zukertort|How to WIN every game with 1\. b4|Grandmaster Teaches The London|Building Repertoires Opening Speedrun|Hambleton.s English Speedrun|Let Aman Cook|Aman.s Attacking Speedrun|Taimanov|Stonewall|Grandmaster explains" \
  --exclude "Hansen|GM Eric|Eric.s|Hippo|Bird Speedrun|No Castle|NO QUEEN|Botez|Titled|Arena Kings|Bullet Brawl"
node scripts/pro-repertoire/mine-transcript-ideas.mjs chessbrah --per-video 10
```

The exclusions matter: the channel is co-hosted, and Eric Hansen's series (Bird,
Hippo, No Castle, his bullet/blitz speedruns) are entertainment, not instruction —
measured teaching density is roughly a third of Aman's, with long stretches of
off-topic banter. The "Botez Gambit" and "NO QUEEN" runs are handicap gimmicks.
Only Aman's instructional series belong in this corpus.

## 🚨 Two hard rules for anyone using these notes

**1. REFERENCE ONLY — never quote.** Same guard as every other transcript source
(David 2026-07-02). The corpus tells you WHICH established ideas he teaches at a
given point; the ideas themselves are public-domain chess understanding, and all
shipped narration is ORIGINAL prose. Nothing here is quoted into the app, and the
raw pulls never enter the repo.

**2. EVERY MOVE IN THESE NOTES IS UNVERIFIED.** Auto-captions mangle chess
notation badly and consistently — "Brook" for rook, "M3"/"95" for a real square,
"time onov" for Taimanov, "the heon" for the h-pawn. A move sequence read off a
caption is a rumour, not data. G3 is unchanged: moves come from
`openings-lichess.json`, the player's own game tree, or the explorer, validated by
chess.js, with tactical claims engine-checked. Treat every line below as a lead to
verify, never as a source to author from.

## Why this corpus exists (the gap it fills)

The nine `pro-aman-*` openings already in `pro-repertoires.json` were built from
his **game** corpus — Caro-Kann, Nimzo, Réti, Rossolimo, Sicilian Kan, Open
Sicilian, French, Ruy, anti-Caro. Almost none of them is what he **teaches**. His
instructional catalog is built on systems: London, Colle-Zukertort, Queen's Gambit,
Stonewall, 1.b4, English. Under the INSTRUCTIONAL-CONTENT doctrine (G9.1 step 8) a
taught line is first-class even when the pro doesn't play it in rated games — so
these are real build candidates, and each one is flagged below with how much of its
own game data exists to back it.
