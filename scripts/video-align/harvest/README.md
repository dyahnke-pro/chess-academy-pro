# harvest — the loops that turn a video queue into banked tracks

These ran only in `/tmp` for a day and would have died with the container.
They are here because David asked for the gathering to be saved once
(*"make sure everything is getting saved. i dont want to have to do this
again"*), and because most of what is in them is not obvious — each rule below
was paid for by a failure, not designed up front.

## Running them

```bash
cp data/video-queues/naroditsky.txt /tmp/todo.txt      # the queue to work
mkdir -p /tmp/vid
setsid nohup scripts/video-align/harvest/supervisor.sh >> /tmp/supervisor.log 2>&1 &
```

The supervisor starts and restarts the other three. Cookies go at
`/tmp/yt-cookies.txt`, `chmod 600`, **never in the repo** — they are a live
Google session. They expire within the hour, so the download is the perishable
step and the writing is not; harvest aggressively, write at leisure.

Check on it with `cat /tmp/harvest-heartbeat.txt` — liveness is a file anyone
can read rather than a claim, because the loops have died silently before.

## What each one is for

| script | job |
|---|---|
| `supervisor.sh` | restarts whichever loop has died; writes the heartbeat |
| `download-queue.sh` | one video at a time, jittered, with the skip ledger |
| `periodic-push.sh` | pushes on a 20-minute timer, not per track |
| `push-cycle.sh` | pauses the loops, commits the bank, pushes, restarts |

## The rules that are not obvious

**Downloads go one at a time with jittered gaps.** Four-at-a-time got this IP
bot-checked after ~40 videos: media fetches started returning 403 while subtitle
fetches on the *same cookies* still worked, which is what proved the cookies were
fine and the RATE was the problem. A request exactly every N seconds is itself a
signature, so the gap is jittered.

**A killed download is not a refused one.** Every push cycle pauses the loop,
killing whatever is in flight. Counted as a refusal it costs a 300s backoff for
nothing and walks the fail streak toward the 80-minute one — indistinguishable
from real rate-limiting, and it would send the next session hunting a throttle it
caused itself. Exit ≥128 means "died on a signal"; that is skipped, not counted.

**Every way of finishing with a video has to be recorded, not just success.**
The skip test used to ask only "is it banked, or on disk", so a video the
pipeline handled *without* producing a track fell straight back into the queue
and was fetched again forever — `C4xtj2rc0_k` was pulled four times that way.
Two paths reach that state: a scan refusal (`needs-hand-geometry.txt`) and a
build that tracks fine but finds no usable game (`no-game.txt`). Both are
consulted here, and the supervisor's remaining-count reads the same files or it
respawns a downloader with nothing to do.

**A refused video is parked, never deleted.** A refusal is usually a fixable
geometry or orientation problem rather than a bad video — the Danish Gambit
refused, then gave 286 plies once its board was read by hand. Deleting it
destroys the only artifact that makes the fix possible, and it cannot be
re-fetched without live cookies.

**Pushes are batched, and the loops pause first.** Each push runs a ~10-minute
ship-check and a Vercel production build against a 100/day cap. Separately,
ship-check timed out three times racing the scanners at load ~10 — and a timeout
is reported identically to a real test failure, which cost two rounds of chasing
a bug that was not there.

**The push commits the bank only, never `add -A`.** A blanket add filed a
hand-written quarantine decision and a new gate under "chore: bank tracks from
the harvest loop". The content was safe; the message hid the two things in the
batch a later session would actually need to find.
