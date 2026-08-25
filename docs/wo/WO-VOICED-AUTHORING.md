# WO-VOICED-AUTHORING — move-by-move voiced narration authoring (parallel shard)

**Owner note (David):** hand this ONE doc to up to 4 sessions, each with a
DIFFERENT shard letter (A/B/C/D). Shards are disjoint — no two sessions touch
the same video, so they never collide. Session c28ca97f is separately
re-authoring the 147 already-voiced files; these shards are the 292 videos that
have NO voiced narration yet.

**Pick your shard:** you were assigned **shard-`<A|B|C|D>`**. Everywhere below,
substitute your letter. Your id list is `docs/wo/voiced-shards/shard-<X>.txt`
(73 videos).

---

## What's wrong and what "done" means

The voiced narrations were authored sparsely — a handful of hand-picked beats
per video, most moves left silent. **David's standard: mirror the teacher move
by move.** Every move that carries teaching about the position gets an original,
board-true spoken line — the idea behind the move, the plan, the threat, the
subtlety, AND the hypothetical / what-if lines he walks ("if Black takes,
then…"). Only genuinely non-position chatter (greetings, results-talk, "we'll
have plenty after the game") is left blank.

This is **G0/G3 translation, not invention**: the model REWORDS the teacher's
own transcript (reference only, never quoted) anchored to a code-computed board.
It adds ZERO chess content of its own — if he didn't say a piece is pinned, the
line doesn't say it's pinned. Two hard gates run inline and drop any line that
can't be made clean:
- **board-truth** — no "the knight on f5" unless f5 holds a knight on THAT move's
  board (hypothetical/typical sentences exempt — that's how the what-if lines
  survive);
- **no-verbatim** — no 8-word span may match his transcript (plagiarism guard,
  locked 2026-07-02);
- plus the depersonalization ban (no teacher/channel/"speedrun") and the
  move-number-prefix ban ("Nc3", never "2.Nc3").

**A dropped line is silence, never a lie** — that is the correct failure per
David's "no false narrations, ever" rule. Coverage still jumps from ~5 beats to
30+ moves per video.

## The voice (house register — apply to every line)

Naroditsky's instructive register, stripped of philosophy: concept-first, facts
then the point, warm but rigorous. Present-tense live teaching as the demo game
unfolds — "White develops the knight, eyeing the centre; Black answers with…,
and the tension builds." NOT the user's own game, so no "you blundered", no "the
best move was". It is a STYLE (depersonalized — never name him). See CLAUDE.md
"THE NARODITSKY HOUSE VOICE" + "TWO DISTINCT NARRATION REGISTERS" (use the
IN-GAME / WATCH register, not the post-game-review register).

## Setup (once)

```bash
# 1. Branch off the tooling branch (it carries author-video/author-all/recover-
#    bank/verify-shard + the shard lists; main doesn't have them yet). Direct
#    push to main is classifier-blocked; you'll open a PR.
git fetch origin claude/gem-teaching-learn-coach-1oe5pw
git checkout -B claude/voiced-shard-<X> origin/claude/gem-teaching-learn-coach-1oe5pw

# 2. Live DeepSeek key — the session env copy is stale (401). Pull from Vercel:
T="team_EG9m215w9cQHWilBOPnOtIFS"; P="prj_qYJMwF1apaxdp6sIZzcvZMz9BcZN"
EID=$(curl -s "https://api.vercel.com/v10/projects/$P/env?teamId=$T" -H "Authorization: Bearer $VERCEL_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);(j.envs||j).forEach(e=>{if(e.key==='DEEPSEEK_KEY')console.log(e.id)})})")
export DEEPSEEK_KEY=$(curl -s "https://api.vercel.com/v1/projects/$P/env/$EID?teamId=$T&decrypt=true" -H "Authorization: Bearer $VERCEL_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).value))")
# sanity: should print 200
curl -s -o /dev/null -w "%{http_code}\n" https://api.deepseek.com/chat/completions -H "authorization: Bearer $DEEPSEEK_KEY" -H "content-type: application/json" -d '{"model":"deepseek-chat","max_tokens":5,"messages":[{"role":"user","content":"ping"}]}'

# 3. Recover your shard's bank transcripts (they're gitignored — live in 09120f6):
node scripts/voiced-authoring/recover-bank.mjs docs/wo/voiced-shards/shard-<X>.txt
```

## Author your shard (move by move)

```bash
node scripts/voiced-authoring/author-all.mjs --ids-file docs/wo/voiced-shards/shard-<X>.txt --concurrency 4
```

This runs `scripts/voiced-authoring/author-video.mjs` per video: it hands the
WHOLE move timeline (each move's played SAN, the exact piece placement after it,
and the raw transcript around it) to the model and asks for a spoken line on
every position-relevant move, then gates + repairs (up to 3x) each line, then
writes `data/video-narration-voiced/<id>.json` preserving the bank's
`{ply,t,fen,line}` exactly.

- It creates a NEW voiced file per video (these are all un-voiced today).
- `openingName` is carried from the bank title (best-effort). If a video has no
  title it ships blank — that is FINE: the corpus notes are position-keyed
  (`opening:null`), so a blank label does not affect free-play/review delivery.
  Leave opening-detection refinement to the integration WO.
- Re-runs are idempotent (rewrite in place). If a video's output looks thin,
  re-run just it: `node scripts/voiced-authoring/author-video.mjs <id>`.

## Verify (must pass before you commit)

```bash
node scripts/voiced-authoring/verify-shard.mjs docs/wo/voiced-shards/shard-<X>.txt
```
Must print `fidelity fails 0 | board-truth fails 0`. Fidelity 0 proves every
file mirrors its bank; board-truth 0 proves no false present-tense piece-on-
square claim slipped. If either is non-zero, the named file/idx is the offender
— re-run that video and re-verify.

**Spot-check 3 of your videos by eye** against the transcript (this is the real
quality bar, David 2026-05-19 "PLAYWRIGHT/audit must be INTERACTIVE"):
```bash
node -e "const v=require('./data/video-narration-voiced/<id>.json'),b=require('./data/video-narration/<id>.json');v.moves.forEach((m,i)=>{if(m.spoken)console.log('#'+i+' ['+ (m.line||[]).join(' ')+']\n  SAID: '+(b.moves[i].said||'').replace(/\s+/g,' ').slice(0,140)+'\n  OURS: '+m.spoken+'\n')})"
```
Confirm: each idea traces to something he actually said at that position; the
hypothetical lines are present; nothing names a piece that isn't on the board.

## Commit + PR (never push to main directly)

```bash
git add data/video-narration-voiced/
git commit -m "feat(voiced): move-by-move narration authoring, shard <X>"
git push -u origin claude/voiced-shard-<X>
```
Open a **draft PR** titled `voiced narration — shard <X> (move-by-move)`. Body:
video count, total authored moves, verify-shard output. Do NOT rebuild the
derived artifacts (`voiced-walkthroughs.json` / `voiced-matchups.json` /
`voiced-teachings.json`) — those are global single files rebuilt ONCE by the
integration WO after all shard PRs land, so rebuilding per-shard would collide.

## Do / Don't

- DO capture EVERY position-relevant line, including hypotheticals and subtle
  points. Length is uncapped — match his depth.
- DO leave a move blank when the transcript there is pure chatter.
- DON'T quote him. DON'T add analysis he didn't give. DON'T name a piece on an
  empty square as present fact. DON'T write move numbers.
- DON'T touch another shard's ids or the 147 already-voiced files.
- DON'T rebuild the derived JSON or wire anything — that's WO-VOICED-BAKE-TIER1.
