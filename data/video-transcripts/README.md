# video-transcripts — the captions, kept

David 2026-08-17: *"everything that we get access to gets saved, this is incase
we need to adjust the narrations you wright, there are often more than one idea
stated after each move, or if something else goes wrong. save it all!"*

A hand-written note captures **one** of the ideas a teacher states at a move.
The transcript is where the others still are, so revising a narration later
means going back to the source that produced it — and without this, that means
re-downloading the video, which is the single step needing live cookies and a
rate limit that is not always granted.

Gzipped: a lesson's VTT is ~450KB raw and ~80KB compressed, against a queue
hundreds of videos long. Read one with `zcat`, or through
`scripts/video-align/at.mjs`, which prints a de-duplicated window around a
timestamp (rolling auto-captions repeat every line several times).

## Reference only — never quoted

Unchanged from the 2026-07-02 plagiarism guard, and worth restating because
storing them makes it easier to forget: the transcript tells you **which**
established idea the teacher is on at a given move. The shipped narration is
original prose teaching that idea. Nothing here is ever lifted verbatim, and
nothing here is ever shipped as narration.

The guard was always about *shipping*, not *storing*. Keeping the source is what
makes a claim checkable afterwards.

## They arrive even when videos cannot

Captions come back fine while media fetches return HTTP 429 — measured
2026-08-17, a subtitle pull on the same cookies that had just been refused three
videos in a row returned 515KB. That is also how we knew the cookies were never
the problem, only the request rate. So the transcript loop is supervised
separately from the video downloader: a rate-limited hour is not a dead hour.
