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
