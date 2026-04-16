# Scripted-Move Audit Suite

Three audits that scan every **scripted move** in the app (opening
annotations main + sublines + traps + warnings, middlegame plans,
common-mistakes, checkpoint quizzes, repertoire PGNs) for data-quality
bugs.

## Running

### All three in parallel

```bash
node scripts/run-audits.mjs --all
```

### Individually

```bash
# Fast, no keys/internet needed — scans ~43k records in seconds
node scripts/audit-structural.mjs

# Uses Lichess cloud-eval (free but requires internet access). Rate-
# limited; budget ~15–20 min for the full corpus.
node scripts/audit-engine.mjs

# Uses Anthropic or DeepSeek to compare each annotation's text to the
# actual board state. EXPENSIVE — defaults to a 200-record stratified
# sample. Requires ANTHROPIC_API_KEY or DEEPSEEK_API_KEY.
node scripts/audit-llm.mjs
```

### Tuning

| Env var | Default | Applies to |
|---|---|---|
| `AUDIT_ENGINE_LIMIT` | unlimited | engine — cap records scanned |
| `AUDIT_ENGINE_RPS` | 8 | engine — request rate |
| `AUDIT_ENGINE_MAIN_ONLY` | — | engine — only main-line annotations |
| `AUDIT_LLM_SAMPLE` | 200 | llm — sample size (0 = all, *very* pricey) |
| `AUDIT_LLM_RPS` | 3 | llm — request rate |
| `AUDIT_LLM_MODEL` | provider-default | llm — override model id |

## Reports

Each run writes to `audit-reports/`:

- `structural.json` / `structural.md`
- `engine.json` / `engine.md`
- `llm.json` / `llm.md`

The markdown files are meant to be skim-able; the JSON is for
programmatic follow-up.

## What each audit covers

### Structural (`audit-structural.mjs`)
- Bare / empty annotations ("", "Nxd5", "10. Nxd5")
- Known filler phrases from the generic-pattern list
- Illegal moves (PGN won't parse)
- SAN vs. chess.js replay drift at same index
- Illegal arrows (`arrow.from`→`to` not a legal move in the position)
- Templated-phrase clusters (any 120-char phrase used ≥ 25× — candidate
  for a new filler regex)
- Classification ↔ annotation-text sanity

### Engine (`audit-engine.mjs`)
- Each scripted move must not drop ≥ 300cp versus Lichess cloud eval's
  best move at that position — catches broken PGNs like the user's
  "Black hangs the queen, White doesn't take" Catalan line.

### LLM (`audit-llm.mjs`)
- Does each annotation **factually** describe the move and resulting
  position? (Catches "bishop develops" on a knight move, captures that
  didn't happen, wrong-opening name drops.)
