# video-pending — scanned lessons that do not yet have hand-written notes

David 2026-08-17: *"make sure everything is getting saved. i dont want to have to
do this again. the gathering of the corpus."*

**Why this exists.** The videos (~50MB each) and the occupancy grids (~800KB each)
live in `/tmp`, and this container is rebuilt from scratch every session — so an
unscanned video is one session away from being a re-download, and re-downloading
needs YouTube cookies that expire within the hour. The TRACK is the expensive
part made cheap: ~15KB of moves, timestamps and FENs, and it is everything needed
to write notes later. Grids and video are not needed again once a track exists.

**Why it is separate from `data/video-tracks/`.** That directory is the shipped
corpus and every entry there must carry hand-written notes (gated in
`videoTrackIntegrity.test.ts`, per the standard that pulling a line IS the
commitment to write it). Staging the machine output here keeps the gathering
durable without weakening that rule or letting un-noted builds look shipped.

**The flow:** scan -> track lands here -> notes are hand-written -> the track
moves to `data/video-tracks/` with its notes attached. A track that has sat here
a long time is a debt, not an archive.

---

## STATUS 2026-08-21 — the 19 left here are FINISHED, not backlogged

The distil pass moved 13 tracks out with 74 new hand-written notes. What remains
falls into two classes, and neither should be written over:

**2 hand-verdicted MISTRACKED** — `CXvo1dMF1Qs` (titled a Benko, tracked a
different game entirely) and `nkDlJMpLezk` (titled an Alapin, tracked Slav
lines). Their `titleCheck.verdict` records the hand judgement. Writing prose
over a bad track satisfies the letter of "every pulled line gets notes" while
destroying exactly what that rule protects. `map-openings --write` preserves a
standing verdict rather than overwriting it; do not clear these by re-running it.

**17 whose remaining on-line anchors carry no teaching.** Every position they
settle on that sits on a taught line either already has a note from another
lesson, or is a generic opener (`e4 c5`, `e4 e5 Nf3`) with banter or chess
history spoken over it rather than teaching. Empty > generic > invented.

**Before concluding a track is spent, run `node scripts/video-align/note-anchors.mjs
<videoId>`** — it prints every anchor, whether one already has a note, and the
timestamp to read the captions at. The repertoire changes; a track with nothing
to say today can have anchors tomorrow if a taught line is extended into it.
