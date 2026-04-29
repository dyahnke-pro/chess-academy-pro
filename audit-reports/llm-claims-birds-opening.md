# LLM-Claims Audit — birds-opening

Generated: 2026-04-29T02:39:54.489Z
Model: deepseek-chat
Elapsed: 20.5s
Estimated cost: $0.0000

## Method

1. chess.js replays each move and produces a ground-truth packet
   (piece, from, to, captured, check, mate, castled, …).
2. Haiku extracts every concrete chess claim from the narration
   into structured JSON. **The LLM does not judge accuracy.**
3. A deterministic verifier compares each claim to the ground
   truth. Contradictions are findings.

The board is the only source of truth. The LLM only does language
parsing — turning prose into structured tokens.

## Counts

| | Count |
|---|---:|
| Records audited | 78 |
| Claims extracted | 0 |
| Verified | 0 |
| **Contradicted** | **0** |
| Unverifiable (out of verifier scope) | 0 |
| Extraction errors | 78 |

## Findings

No contradictions detected.
