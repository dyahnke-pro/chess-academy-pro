# Naroditsky video-corpus gap analysis (David 2026-07-15)

**Question:** across Naroditsky's full YouTube corpus, which openings does he
teach that we do NOT yet have as Naroditsky pro-rep content?

**Method (grounded, not guessed):** dumped all **607** video titles from
`@DanielNaroditskyGM` via `yt-dlp --flat-playlist` and tallied opening mentions
by keyword. Counts = # of his videos mentioning that opening = a proxy for how
central it is to his teaching. Caveats: title-keyword matching is approximate —
a title can name the opponent's opening (not his repertoire), "London" over-counts
because it also catches "Jobava London" (which we have), and one-off game titles
count the same as a dedicated theory video. Treat the ranking as a priority
signal, not gospel.

## What we already have (Naroditsky pro-rep — 11 openings, 530 committed game refs)
Alapin Sicilian (31 vids) · Caro-Kann (26) · King's Indian Def (24) ·
Caro-Kann Fantasy (9) · Jobava London (7) · Ruy Lopez (7) · Najdorf (6) ·
Alekhine (6) · Rossolimo (4) · King's Indian Attack (1) · Dragodorf (1, taught not played)

Game references saved + coach-wired: `public/data/pro-game-references.json`
(530 Naroditsky games across the 10 game-backed openings; feeds the coach via
the `playerGames` envelope + `lookup_player_games` tool for opening/middlegame/
endgame teaching). Dragodorf is instructional-only (no game refs — he teaches
it but barely plays it; INSTRUCTIONAL-CONTENT doctrine).

## MISSING — openings he teaches that we don't have from HIM (ranked by teaching emphasis)

### Tier 1 — heavily taught, clear repertoire, highest value
| Opening | Vids | Side he teaches | App status elsewhere |
|---|---|---|---|
| Scotch / Belgrade Gambit | 20 | White | not in app |
| Scandinavian Defense (+ Modern) | 17 | Black | others' pro-rep (Rosen/Samay) |
| French Defense (Rubinstein, Adv. Nimzowitsch; + "how to kill" as White) | 16 | Both | others' pro-rep (Gotham/Caruana/Rosen) |
| Philidor Defense (+ punishing it as White) | 15 | Both | anti-openings only |
| Smith-Morra (declined / how to face) | 15 | Black | anti-opening (anti-smith-morra-black) |
| London / Colle / Torre / Stonewall / Barry (d4 systems) | 16* | White | Jobava London only |

### Tier 2 — real repertoire coverage
| Opening | Vids | Side |
|---|---|---|
| Four Knights / Glek System (g3) | 9 + 8 | White |
| Accelerated Dragon / Maróczy Bind | 8 + 2 | Both |
| Queen's Gambit Declined | 8 | Black |
| Hippo (how to punish) | 7 | White (anti) |
| Vienna Game | 7 | White |
| Grand Prix / Closed Sicilian (anti-Sicilian, White) | 6 + 2 | White |
| English Opening | 5 | White |
| Grünfeld (Fianchetto) | 5 | Black |
| Owen's Defense (how to punish) | 5 | White (anti) |
| King's Gambit | 4 | White (+ anti as Black, already in app) |
| Pirc / Modern (incl. the Bh6/d5 anti-line David flagged) | 3 + 2 | Both |
| Italian Game | 3 | White |
| Nimzo-Larsen | 3 | White |

### Tier 3 — offbeat / "busting unsound gambits" (mostly map to anti-openings)
Danish Gambit (6) · Trompowsky (2) · Bird (2) · Latvian Gambit (2) ·
Nimzo-Indian (2) · Slav (2) · Elephant Gambit (2) · Englund Gambit (2) ·
Bowdler Attack (3) · Sicilian Dragon (1) · Wing Gambit (1) · Ponziani (1) ·
Benoni (1)

## Notes for the build queue
- Several "missing" openings exist in the app **from other pros** (French, Scandi,
  Modern, Pirc) or as **anti-openings** (Smith-Morra, Philidor, Hippo, Owen,
  Danish/Latvian/Elephant/Englund). Those are candidates to **ground in his
  video/games** per `docs/plans/naroditsky-video-grounding.md` rather than build
  net-new.
- Net-new Naroditsky pro-rep candidates (nothing close in app): **Scotch/Belgrade,
  Vienna, Four Knights/Glek, English, Grünfeld, QGD** as his repertoire.
- Every new opening needs the full G9 build INCLUDING game references (STEP 11.5)
  so the coach can teach it from his real games (opening→middlegame→endgame). The
  raw 136k-game chess.com corpus is re-pullable in ~30s
  (`fetch-chesscom.mjs danielnaroditsky`) but is gitignored/ephemeral — only the
  bounded `pro-game-references.json` persists.

## Full corpus reference
607 video titles dumped 2026-07-15 to scratch (not committed — re-pull any time:
`yt-dlp --flat-playlist --print "%(title)s" https://www.youtube.com/@DanielNaroditskyGM/videos`).
