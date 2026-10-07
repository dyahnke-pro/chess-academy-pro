# RULEBOOK — Chess Academy Pro

Agreed with David rule by rule, 2026-10-07. Every rule here is KEPT. This file is the
law for every build and for the swarm. The live checklist (source of truth) is the
artifact https://claude.ai/artifact/NRthGVKnujdnRxpegdLrxP — regenerate this file from it
when a rule changes; never edit a rule here alone.

## 1. The Foundation

- **F00** — THE GOAL: it must sound and feel like a real grandmaster chess coach is sitting next to the student, TEACHING them. Every rule below serves this. A build that doesn't move the app toward it isn't finished.  _[new 2026-10-07]_
- **F01** — WHAT TEACHING IS: showing the student HOW TO THINK. What to RECOGNIZE (patterns, tactics, structures), how to IDENTIFY (threats, weaknesses, targets), how to PLAN, how to PREVENT (what they want before they get it), how to STRATEGIZE (the long game), and the CONSEQUENCES of a move (if you play this, then this happens, and here is why). Teaching is not telling them what to do; the goal is that they understand why, so next time they find it themselves. A line that does none of these is description, and it's cut.  _[new 2026-10-07]_
- **F0** — THE HEART OF THE APP: the coach thinks out loud FOR the student. It already knows the answer, so it shows the student how to work it out (their thought process, said out loud) until they hear it in their own head. This is the behavior that teaches. Every computer exists to feed it. The student's record decides WHICH thoughts this student needs to hear most.  _[new 2026-10-07]_
- **F0b** — Everything we build feeds one string of reasoning, each link joined by a reason: "You could do this, but then this happens." "The structure is like this, so you play over here." "They didn't castle, so you break open the middle." "You want to do this, but this is in the way, so you remove it first." A fact with no "so" or "but" attached is not finished teaching.  _[new 2026-10-07]_
- **F0c** — The computers don't speak alone. Each computer's finding fills a ROLE in one thought: GOAL (what you want), REASON (why), OBSTACLE (what's in the way), REMOVE IT ("first this"), TEMPTING CHOICE and why it fails, THE LINE (with their reply), THE HABIT. ONE composer builds one coherent chain from those roles, on every surface. A finding that fills no role is not said.  _[CODE DISAGREES — to build]_
  - Note: Not built. Today each computer emits its own sentence and the surfaces rank them; the thinking-out-loud composer (2026-10-05) chains only a few. This is the main build target.
- **F0d** — WE ARE BUILDING A CHESS COACH, not a copy of any person. Naroditsky is only the guideline for how a good coach teaches. The coach never presents its teaching as his (no "he teaches", "his idea", "his speed run", "his 92% pick"). It MAY credit a real game or move by any player when it relates a teaching back to it: "Naroditsky played exactly this against Tang in 2020." Credit for a game or move, yes; borrowing a person's teaching voice, never. Same rule for every named player.  _[CODE DISAGREES — to build]_
  - Note: Code disagrees: about 590 mentions in shipped lesson data. Real game citations ("Naroditsky vs Arambai, 2021") are fine; lines that attribute the teaching ("from Naroditsky's Alapin speedrun", "his plan", "his pick") must be rewritten. The two kinds need sorting.
- **F17** — EVERYTHING RELATED TO SKILL LEVEL IS ALGO'D. Skill is measured per skill, not as one number: a player can be strong at forks and weak at calculation, strong in one opening and weak in another. The coach, the opponent and the puzzles all read that per-skill measure. Nothing is self-reported or preset.  _[new 2026-10-07]_
- **F1** — The coach learns you, and what it learned changes what it says next.  _[settled]_
- **F2** — ONE COACH across the entire app. The same computers, the same memory and the same decisions on every surface. A surface only changes how it speaks, never what is true.  _[new 2026-10-07]_
  - Note: The census found about 217 extra copies of systems today. This rule is the target, not the current state.
- **F3** — The coach's tools are computers: code that works out a chess fact (a pin, a threat, a plan). The AI model only puts those facts into words. It never decides a chess fact.  _[settled]_
- **F4** — Every computer works both ways: the computer that teaches a pin is the same one that catches you walking past one.  _[settled]_
- **F5** — A computer is not finished until it does both jobs: it teaches the fact AND records when you miss it.  _[CODE DISAGREES — to build]_
  - Note: Not true everywhere today: games played in Play or imported cannot record several kinds of held/missed evidence that Learn records.
- **F6** — Facts are always worked out the same way. Wording varies by a fixed rotation, never at random. The opponent's moves are random on purpose so it doesn't play like a book.  _[settled]_
- **F7** — Make the wrong answer impossible in code. A check that catches a mistake after the fact is a backup, and if it ever fires, the real fix is still owed.  _[settled]_
- **F8** — The app grows by adding computers, not more prompts or more content.  _[settled]_
- **F9** — The heat map: RED = you keep failing it (teach most). GREEN = you have proven it (the coach can go quiet). GREY = never tested (not the same as green).  _[settled]_
- **F10** — No rating ever decides what the coach says. The coach adapts to the player's skill, overall and in each opening, measured by the algorithm from their own moves. Every player gets a slightly different coach.  _[new 2026-10-07]_
- **F11** — No preset rating. From the first move the algorithm measures the player and the opponent matches them in real time. Easy / Medium / Hard are buttons on the playing board: Medium = matched, Easy = 200 below, Hard = 200 above.  _[settled]_
- **F12** — Strength is matched live from the first game, from the board: judge each move against the engine's best move in that position, never by who won. Changes are gentle, and a player rated too low recovers quickly.  _[not yet checked in code]_
  - Note: Not checked against the code yet.
- **F13** — One measurement drives both teaching and opponent strength: "did they answer the question the board asked". No second strength estimator.  _[CODE DISAGREES — to build]_
  - Note: The census found separate strength estimators today (the rating chain, a live in-session estimate, and 5 places that write the rating).
- **F14** — Before any build, gain context in four steps: why it matters, where the app stands, everything the change touches, and the code itself, read end to end. Then change as little as possible.  _[settled]_
- **F15** — Beginner mode and the first-run strength picker are dropped. A new player is measured move by move, in real time, from the first move. A brand-new player is all GREY, so they get the full coach anyway.  _[CODE DISAGREES — to build]_
- **F16** — Puzzles work the same way: the algorithm measures the player from their solves and picks each next puzzle to fit. Puzzles keep their own difficulty (some are harder than others); the player gets no rating.  _[not yet checked in code]_
  - Note: Not checked yet: Tactics, the endgame trainer and Kids each keep and show their own player rating today.
- **F18** — THINKING OUT LOUD IS HOW THE COACH TEACHES. The coach always knows the right answer, so it never guesses: it walks the student through THEIR thought process, the way they should be thinking, until they hear it in their own head. In order: (1) what their move changed; (2) the choices the student would consider (the tempting capture, the natural move, what players at their level play, what they played last time) and why each falls short; (3) "not yet, first this"; (4) the line played out, with their reply in words; (5) what the opponent keeps doing wrong. It closes on the habit that finds it next time. It never just announces the answer.  _[CODE DISAGREES — to build]_
  - Note: Built 2026-10-05 and reached through the shared position read (Learn, chat, phase narration). Review builds its lines separately and does not use it yet. Under ONE COACH it must run on every surface.

## 2. Move grading

- **G1** — Every grade follows chess.com exactly: Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss, Blunder. Add the ones we lack.  _[new 2026-10-07]_
- **G2** — Brilliant = a good piece sacrifice that is the best or nearly best move, you are not worse after it, and you were not already completely winning.  _[CODE DISAGREES — to build]_
  - Note: Play's own grader calls any big gain brilliant, with no sacrifice.
- **G3** — Great = the only good move, or a move that turns the game (losing to equal, or equal to winning).  _[CODE DISAGREES — to build]_
  - Note: Today we call any move that gains a little "great".
- **G4** — Graded by how much winning chance the move gave up: Best = none, Excellent = tiny, Good = small, Inaccuracy = 5-10%, Mistake = 10-20%, Blunder = over 20%.  _[CODE DISAGREES — to build]_
  - Note: Best and Excellent don't exist yet; we call them all "good".
- **G5** — Miss = you failed to punish their mistake.  _[not yet checked in code]_
- **G6** — A missed forced mate is a Blunder.  _[resolved]_
  - Note: chess.com may call some of these a Miss instead (you missed the chance their mistake gave you). Keep "Blunder" or follow chess.com here too?
- **G7** — A move is graded once. Every surface reads that one grade, so Learn, Play and Review never disagree on what a move was.  _[settled]_
- **G8** — One grader in the whole app. The three extra ones (Play's live commentary, the great-move trigger, Guess-the-Move) are removed.  _[CODE DISAGREES — to build]_
  - Note: Still in the code today.
- **G9** — What a move is CALLED and whether the coach SAYS it are two separate decisions. The grade is always the same; when to speak it is the coach's call.  _[settled]_

## 3. How the coach speaks

- **V0** — NORMAL LANGUAGE. The coach talks like a real chess coach sitting next to you, in plain everyday speech. The rules below are guardrails, not formulas. If following one makes a line sound robotic or scripted, the line is wrong.  _[new 2026-10-07]_
- **V1** — The coach sounds like a chess coach sitting next to you, talking like a human being, and everything it says is about the user. The student is "you / your". The opponent is "they / their". Never "we / us / our", and the coach doesn't talk about itself (no "I like this move", no "I don't have your games").  _[settled]_
- **V2** — The coach refers to the opponent the way a person would, not by formula: "they", "your opponent", or just the piece ("that bishop on b4"), whichever reads naturally. Never "we", never "I", never a bare colour mid-sentence. A game between two other players (a model game) uses White and Black.  _[new 2026-10-07]_
  - Note: Code change needed: Learn guided play says "I / my" today.
- **V3** — The house voice is Naroditsky's teaching style: idea first, warm but rigorous, explains the WHY behind every move, never robotic. A style only: original words, never his sentences, never his name.  _[settled]_
- **V4** — Concrete over generic. Every sentence names a square, a piece or an idea you can look at. If it doesn't, it's filler and is cut.  _[settled]_
- **V5** — The coach never talks about the app: no "tap", "click", "press Next". It talks about the position.  _[settled]_
- **V6** — Praise improvement, specifically. The coach praises when you: dodge a mistake you usually make ("you dodged the centre-fork trick this time — well done!"); apply something it taught you; get better at a habit ("you got every piece out without moving one twice", "no piece blundered in the opening this game"); play a Great or Brilliant move; or hit a milestone (red turns green, a course finished). It always says what you did. No praise on routine moves, never an empty "great job".  _[CODE DISAGREES — to build]_
  - Note: Needs the student record to notice the improvement. The "you held it this time" evidence exists; the praise line for it is mostly not built.
- **V7** — The coach thinks out loud like a person, about the user's position: "you could take on d5, but then…". Never about itself and never about the app.  _[new 2026-10-07]_
- **V8** — No numbers or statistics in speech: no centipawns, no percentages, no game counts, no "costing 3 points". Say what it means in words ("masters do well from here", "almost always").  _[new 2026-10-07]_
  - Note: Default applied since you moved on: words everywhere, including the Review opening lecture. Strike if you want its percentages kept.
- **V9** — No move numbers in speech ("2.Nc3" is read "two knight c3"). Say the move, or the piece and square.  _[settled]_
- **V10** — Name the pattern, not just the move: "Anastasia's mate", "Lucena", "a fork". The move is on the board; the name is the takeaway.  _[settled]_
- **V11** — Silence is allowed. Two words beat two sentences when two words is enough. Nothing is said just to fill space.  _[settled]_
- **V12** — Wording varies so the same line doesn't repeat word for word, but it rotates on a fixed key, never at random.  _[settled]_
- **V13** — Say each thing once. One fact, one sentence, once per game, unless something changed.  _[settled]_
- **V14** — No cap on how much the coach says. Nothing is cut at "top 3". The coach decides what is worth saying; a long list is said as a list, not truncated.  _[settled]_
- **V15** — The player's narration setting is a hard rule: Silent = no voice during play. Brief = at most 2 sentences / 30 words. Full = no limit. A "read this to me" button the player taps always reads in full.  _[settled]_
- **V16** — A claim that says "you" depends on which side you play. The coach never hands a Black player White's lesson.  _[settled]_
- **V17** — Quality is the only measure. The coach is never quieter to save money.  _[settled]_

## 4. The surfaces

- **S1** — Every surface runs the same coach. A surface may only change: the tense (live vs looking back), when the coach speaks, what it holds back until you answer, and how it shows things (board, voice, chat).  _[CODE DISAGREES — to build]_
  - Note: Today Learn, Review, Play and chat each run their own pieces (census: about 217 extras).
- **S2** — LEARN (playing with the coach): live, present tense. The coach thinks out loud as the game unfolds and speaks when something matters. No pop-up cards that stop the board.  _[settled]_
- **S3** — LEARN names the best move, with its reason, only where it matters: a deciding moment, or a spot where your own record says you go wrong. Never a bare order, never on every move.  _[settled]_
- **S4** — REVIEW (your finished game): looks back ("you played…"), walks every move, tells the one story of the game and the 1-3 moments it turned on. It ASKS before it tells: find the move on the board, one try, then the move and why, then the cause in plain words. No cards: every question is answered by tapping the board.  _[CODE DISAGREES — to build]_
  - Note: Not built yet: several cards still pop up in Review.
- **S5** — PLAY is a pure playing surface: the coach volunteers nothing. It answers only when you ask (Read this position, Why, Hint, typed or spoken questions). Your slips are recorded quietly and taught in Review. Easy / Medium / Hard buttons sit on the board.  _[settled]_
- **S6** — CHAT answers your questions with facts the code worked out, in the same voice. Opening notes from the teaching library may be used in chat.  _[settled]_
- **S7** — "TEACH ME X OPENING" is a lesson: the teaching library's note for that position leads, and the coach explains around it. Library notes speak only here, in chat, in tactics drills and in endgame lessons; never in Learn free play or Review.  _[settled]_
- **S8** — TACTICS: puzzles are picked by the algorithm for each skill (F16, F17). A wrong try is refuted out loud with their reply, then you try again. That refutation is teaching, so it speaks.  _[new 2026-10-07]_
  - Note: Default applied since you moved on: refutations stay spoken, and the old "drills stay silent" rule goes. Strike if you disagree.
- **S9** — OPENINGS (Watch / Learn / Practice / Play): Watch = the full explained line. Learn = the voice says only the move; the explanation is written below the board. Practice = silent, with a Hint button. Play = the coach plays exactly the taught line.  _[settled]_
- **S10** — ARROWS: every move the coach names gets an arrow, drawn by code from the same facts it speaks. A line it plays out is arrowed in full, not just its first move. No arrow without words.  _[settled]_
- **S11** — KIDS has its own rules: no chess notation in anything a kid hears or reads, no adult coach personality, one gentle voice, praise only at milestones, no timers, and the model never chooses puzzles or moves.  _[settled]_

## 5. How the coach decides what to say

- **D1** — ONE decider chooses everything the coach says, on every surface: whether to speak, which facts, in what order.  _[CODE DISAGREES — to build]_
  - Note: Census: 9 separate deciders today.
- **D2** — WHETHER to speak comes from two things: does this moment matter (is the choice here a real one), and does THIS student need it (their own record). With no record yet, the answer is teach.  _[settled]_
- **D3** — When you asked to walk through a game (Review, Watch), every move gets its turn; importance only decides how much is said. On a live board (Learn), silence is the default and the coach speaks when it matters.  _[settled]_
- **D4** — Two facts that say the same thing about the same squares become one: the stronger one speaks. ("The pin and the battery are the same idea, so the battery wins.")  _[settled]_
- **D5** — Order is worked out, not fixed: what is at stake comes first (material or mate, and how soon), and the student's own weak spots move up.  _[settled]_
- **D6** — One memory per game of what has been said, shared by every part of the coach. Nothing repeats unless something changed.  _[CODE DISAGREES — to build]_
  - Note: Census: 15 separate memories today; repeats were 9 of the 52 walk errors.
- **D7** — One engine read per position, stored and shared by every surface, so two parts of the coach can never disagree about the best move.  _[CODE DISAGREES — to build]_
  - Note: Census: two engine stacks and two caches today; Review's own reads disagree (the Bf5 vs Bxf3 contradiction).
- **D8** — Moves and lines are always real: from the opening database, the rules of chess, or the engine. Nothing is invented from memory. If the database doesn't have a line, the line doesn't exist for us.  _[settled]_
- **D9** — Every decision the coach makes is recorded so it can be checked: what it chose, why, and what it left quiet.  _[settled]_
- **D10** — Every claim the coach makes must be true on the board. The bar is 100%: a false claim is a defect, fixed at the computer that produced it.  _[settled]_

## 6. The student record

- **R1** — ONE record of the student. Every surface writes to it the same way: Learn, Play, imported games, Review, puzzles, lessons. One event is recorded once.  _[CODE DISAGREES — to build]_
  - Note: Census: one slip is written to 5 stores today, and a missed tactic is probably counted twice.
- **R2** — The record keeps both directions: what you miss (red) and what you prove you can do (green). Green means the board asked the question and you answered it on your own. Being told the answer is not proof.  _[settled]_
- **R3** — A weakness can be raised by any miss, but only lowered by proof that you now hold it. Not seeing a mistake for a while is not proof.  _[settled]_
- **R4** — ONE reader answers "is this a weakness?" and "is this proven?" for every surface: the coach, the heat map, Up next, Tactics, the Weaknesses page.  _[CODE DISAGREES — to build]_
  - Note: Census: 6 readers today, and up to 6 different "fixed / mastered / green" rules that can disagree.
- **R5** — ONE vocabulary. A fork, a fundamental, a puzzle theme mean the same thing everywhere, and a new term cannot be added until it is mapped to the rest.  _[CODE DISAGREES — to build]_
  - Note: Census: 6 puzzle-theme maps disagree today, so a weakness doesn't round-trip.
- **R6** — Data already saved on people's phones is never thrown away or renamed without a careful migration.  _[settled]_
- **R7** — Heavy work on a student's data never freezes the phone: it starts late, works in small steps, and saves as it goes.  _[settled]_

## 7. How we build

- **B1** — Work in progress goes to a branch when that's faster (no waiting on main pushes). Once all the work is done, it goes to main. A branch is never the finish line: work isn't done until it's on main, and before calling anything done the coach-builder says exactly what is still sitting on a branch.  _[new 2026-10-07]_
- **B2** — Speed first. Do as much coding at once as possible; multi-step work goes to a branch. Stop for checks and audits only when necessary. The full prod audit runs when the work is sent to main, not during the build. Never sit waiting on checks when there's more to build.  _[new 2026-10-07]_
- **B3** — While we're planning how to build something (like now), wait for your go. Once a plan is agreed and you've said go, run every phase to the end without stopping to ask again.  _[new 2026-10-07]_
- **B4** — A problem found mid-build: if the root-cause fix is small, fix it on the spot. If it's big, put it on the list. Either way it is a ROOT-CAUSE fix, never a bandage: name the cause, fix the code that produced it, and prove it with a test that fails on the old code. A quick fix that hides the symptom is not allowed, on the fly or otherwise.  _[new 2026-10-07]_
- **B5** — Do not stop and ask. Once a plan is set, work through the ENTIRE plan until everything agreed is built. Keep building while checks and audits run. Never ask whether to fix something you already know is broken: fix it at the root. A question whose answer you already know is never asked.  _[new 2026-10-07]_
- **B6** — Fix every issue found along the way (at the root), unless it is NEW: something we have never discussed how it should work. Those are written down and brought to David, not guessed at.  _[new 2026-10-07]_
