Skeptic's report on the Danya plan. Two caveats first. The two hand-walk reports you named are not in this container (`audit-reports/` is gitignored), so I read their summaries in OUTLINE §000 instead. I also sampled one video file in `data/video-narration-voiced/`.

**1. The three biggest flaws**

- **The plan adds computers when the problem is volume.** The plan itself says Learn "piles 5–8 facts on one move" and he says one. Yet L2–L9 each add at least one new fact source to every ply. Each hand-walk found 30–40 flags, almost all extra or misframed lines, not missing ideas. Every new computer adds more of those. *Better:* finish L1 (subsumption, "one thread per move") and prove density dropped before any new computer ships. The two I would allow are the ones that remove speech: stakes ("doesn't matter, taste") and rule→exception, because it replaces a principle line.

- **L0 scores word overlap on a skewed answer key.** Three problems:
  - The voiced files are LLM rewrites (`voice: danya-dna`, `rewrittenAt`), not his words. Running "structure detectors on both texts" scores prose against prose, which is the scraping habit CLAUDE.md bans.
  - Beats bundle plies (`line: [Bb2, Nc6, Nf3]` is one beat). So "silent where he was silent" is undefined per ply.
  - The easiest way to raise the score is to speak the FEN-keyed voiced note, which is Goodhart. It is also the corpus-in-Learn move David just banned.

  *Better:* hand-label about 200 in-game plies from 20 videos once: spoke yes/no, which idea (the lead fact kind), and critical yes/no. Score our `coach-decision` rows (the facts that survived and the lead kind) against those labels. That compares computed facts, not text.

- **His games are the wrong distribution.** He is 2700+ playing weak opponents, so in his seat nearly every move is good. Learn talks most after student mistakes, and L0 never exercises that path. A month of "matching him" would tune only the good-move branch. *Better:* also score the opponent seat (his narration of their slips), and keep the rated-walk games (1380, Blumenfeld) as a second set.

**What would waste a month:** building L2–L9 against an unvalidated score. It rises as coverage grows while the coach gets louder.

**Simplest thing that would feel like a coach:** silence on routine plies and one idea on the rest. When a move does speak, it says one fact plus its reason, and the ranker's other survivors wait behind a tap on "why?". That is the ranker deciding, not a cap.

**2. What I'd do first instead**

Pull the `coach-decision` rows from one Learn replay of five of his games and report two numbers: facts spoken per ply, and share of silent plies. Put them beside a 5-video hand count of his. If ours is 5 and his is about 1.2, L1 is the whole next month and L2–L9 wait.

**3. Question for the coach brains**

When the ranker keeps five facts on a ply, what decides the one that leads, other than "biggest centipawn stake"? He leads with the idea that serves the game's thesis, not the biggest number. Do we have any thesis-relevance term, or is `planArc` / causal-chain linkage the only candidate?