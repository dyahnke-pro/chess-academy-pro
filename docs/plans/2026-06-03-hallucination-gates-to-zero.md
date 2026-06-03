# Drive coach hallucinations toward 0 (2026-06-03)

Goal (David): get hallucinations as close to 0 as the architecture allows.
Tiers: (1) pre-authored = literal 0; (2) invert generation + complete
verifier = near-0; (3) verified-or-silent policy. The gates are the net
wherever the LLM still authors prose.

## The streaming hole + the 7 ungated paths the sweep found

The spine's `groundCoachReply` gates the FINAL returned text. But
streaming-TTS surfaces hand sentences to Polly AS THEY ARRIVE, before the
final-text gate runs — so the spoken stream is ungated even when the
stored text is clean. The systematic fix is a per-sentence spoken gate at
each streaming dispatcher.

| # | Surface | Path | Fix | Status |
|---|---|---|---|---|
| 1 | coachMoveCommentary → CoachGamePage | spine (stored ✓) + streams to Polly | per-sentence spoken gate at dispatcher | pending |
| 2 | usePhaseNarration | spine + streams to speakForced | per-sentence spoken gate | pending |
| – | usePositionNarration | direct + streams | per-sentence board gate | DONE (1c91e9c) |
| 3 | middlegamePlanner.narratePvLine | getCoachChatResponse, display | groundCoachReply per annotation (per-move fen) | pending |
| 5 | walkthroughLlmNarrator | getCoachChatResponse, per-move fen, cached | groundCoachReply per move | pending |
| 4 | openingSectionNarrator | getCoachChatResponse, NO board | player-stat gate only | pending |
| 6 | coachFeatureService reports | getCoachCommentary, non-board | player-stat gate only | pending |
| 7 | puzzlesFamilyFallbackNotify | spine, navigation msg | n/a (no chess claim) | skip |

## Phases
- **A. Streaming spoken gate** — `gateSpokenSentence(sentence, fen)` in
  coachAnswerGates; wire usePhaseNarration + CoachGamePage dispatcher;
  refactor usePositionNarration onto it. (#1, #2)
- **B. Non-streaming ungated paths** — groundCoachReply into
  middlegamePlanner (#3), walkthroughLlmNarrator (#5, per-move fen),
  player-stat gate into openingSectionNarrator (#4) + coachFeatureService (#6).
- **C. Tactic gate audit→DROP** + **Stockfish EVAL gate** — eval claims
  checked against the IN-CONTEXT engine eval (evalCp already in liveState;
  no new Stockfish call in the gate); drop contradicted sentences.
- **D. Idea-source gate (frontier)** — bind plan/strategic claims to a DB
  line or book passage; drop unsourced. Hard NLP; v1 narrow.
- **Content program (not a code task)** — widen pre-authored masterclass
  coverage so high-traffic asks bypass the LLM at runtime = literal 0.

## Decisions
- Keep the redundant crude player-stat refusal (David: redundancy is fine).
- Factual player NAME allowed; only ungrounded STAT dropped.
